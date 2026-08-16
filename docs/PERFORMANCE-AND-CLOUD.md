# Performance & cloud guide

Written against the code as it stands after this release. Items are ordered by
**impact ÷ effort** — the top of each section is where to start.

---

## 1. What already got fixed in this release

Worth knowing so you don't redo it:

| Change | Why it matters |
|---|---|
| Added 4 composite DB indexes on `Meeting` | The past-meetings and search queries were doing sequential scans. `@@index([userId, meetingEnded, startTime desc])` turns the dashboard query into an index-only range scan. |
| Denormalised `durationMinutes`, `participantNames`, `transcriptText` | Filtering used to require parsing JSON per row in application code. Now Postgres does it, and it can use an index. |
| Lazy Prisma client (`lib/db.ts`) | The client is no longer constructed at module import. Serverless cold starts that never touch the DB skip engine initialisation entirely. |
| Email + vector indexing run via `Promise.allSettled` | These were sequential and a failing email aborted the RAG indexing. Now they run concurrently and fail independently. |
| Translation caching (`TranscriptTranslation`) | A re-read of a Spanish transcript costs one indexed DB lookup instead of a paid Google API call. |
| Embedding batching (100 per request) | A 300-segment transcript went from 300 HTTP calls to 3. |
| `optimizePackageImports` for `lucide-react` / `date-fns` | These are barrel files. Without this, importing one icon pulled a large chunk of the library into the client bundle. |
| Debounced + abortable search (280 ms) | Typing "quarterly" fired 9 queries and could render stale results out of order. Now it fires one, and in-flight requests are aborted. |
| Immutable cache headers on `/_next/static` | Content-hashed assets are now cached for a year instead of revalidated. |

---

## 2. Highest-impact things left to do

### 2.1 Add a Postgres full-text index (biggest single win)

`/api/meetings/search` currently uses `contains: { mode: 'insensitive' }`, which
compiles to `ILIKE '%term%'`. **No index can serve that** — it's a full scan of
every transcript. It's fine at hundreds of meetings and painful at tens of
thousands.

Add a generated `tsvector` column and a GIN index:

```sql
ALTER TABLE "Meeting"
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce("transcriptText", '')), 'C')
  ) STORED;

CREATE INDEX meeting_search_idx ON "Meeting" USING GIN (search_vector);
```

Then swap the `OR + contains` block for a raw query:

```ts
const rows = await prisma.$queryRaw`
  SELECT id, title, summary, "startTime", "durationMinutes",
         ts_rank(search_vector, websearch_to_tsquery('english', ${query})) AS rank
  FROM "Meeting"
  WHERE "userId" = ${userId}
    AND search_vector @@ websearch_to_tsquery('english', ${query})
  ORDER BY rank DESC
  LIMIT ${take} OFFSET ${skip}
`
```

You also get relevance ranking and stemming ("meet" matches "meeting") for free.
Expect roughly 50–200× on a large table.

### 2.2 Cache the dashboard and search responses

Every dashboard load hits Postgres. Add a small cache layer — Upstash Redis is
the least-effort option on serverless:

```ts
const cacheKey = `meetings:${userId}:${queryString}`
const cached = await redis.get(cacheKey)
if (cached) return NextResponse.json(cached)
// …query…
await redis.set(cacheKey, result, { ex: 60 })
```

Invalidate on the meeting webhook. A 60-second TTL is usually invisible to users
and removes most read traffic.

### 2.3 Move meeting processing off the request path

`/api/webhooks/meetingbaas` currently does transcription analysis, embedding and
emailing inside the webhook request. On a long meeting that's 30–60 seconds, and
Vercel's Hobby tier caps functions at 60 s — the webhook can time out and
MeetingBaaS will retry, causing duplicate work.

Enqueue instead:

```ts
// webhook: persist, then hand off
await prisma.meeting.update({ /* raw transcript */ })
await qstash.publishJSON({ url: `${APP_URL}/api/jobs/process-meeting`, body: { meetingId } })
return NextResponse.json({ ok: true })   // responds in ~50ms
```

Upstash QStash, Inngest or an SQS + Lambda pair all work. This also gives you
automatic retries with backoff, which the current inline `try/catch` doesn't.

### 2.4 Stream the chat responses

`chatWithAI` waits for the full Gemini response before returning anything, so
the user stares at a spinner for 3–8 seconds. Gemini supports streaming:

```ts
const result = await model.generateContentStream({ contents })
return new Response(
  new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        controller.enqueue(new TextEncoder().encode(chunk.text()))
      }
      controller.close()
    }
  })
)
```

Time-to-first-token drops to a few hundred milliseconds. This is the single
biggest *perceived* performance improvement available.

### 2.5 Paginate and virtualise long transcripts

A two-hour meeting is ~1,500 segments. `TranscriptDisplay` renders them all,
which is ~1,500 DOM nodes and a visibly janky scroll. Use `@tanstack/react-virtual`
to render only what's on screen:

```tsx
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80,
  overscan: 8
})
```

---

## 3. Database

**Connection pooling is mandatory on serverless.** Each Lambda/Edge instance
opens its own Prisma connection; a traffic spike will exhaust Postgres's
`max_connections`. Use PgBouncer in transaction mode (Neon and Supabase both
provide a pooled URL):

```env
DATABASE_URL="postgres://...pooler.../db?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://...direct.../db"   # migrations only
```

**Select only what you need.** `/api/meetings/search` already uses an explicit
`select`, but `/api/meetings/past` returns whole rows — including the `transcript`
JSON blob, which can be megabytes. Narrow it:

```ts
select: { id: true, title: true, startTime: true, endTime: true,
          durationMinutes: true, transcriptReady: true, summary: true }
```

**Watch for N+1s.** Prisma's `include` is fine, but any `.map(async …)` over
results that queries again is an N+1. There aren't any today — keep it that way.

**Archive old transcripts.** `transcriptText` and `transcript` dominate table
size. After 12 months, move them to S3 and keep a pointer. Your working set
stays in RAM and every query gets faster.

---

## 4. Gemini cost and latency

**The free tier limits are per-minute, not just per-day.** `gemini-2.0-flash`
allows ~15 requests/minute on the free tier. `withRetry` in `lib/gemini.ts`
handles 429s with exponential backoff, but if five meetings end simultaneously
you'll serialise behind retries. Options, cheapest first:

1. Queue meeting processing (§2.3) and rate-limit the worker to ~10 req/min.
2. Enable billing — paid Flash is inexpensive and the limits jump substantially.

**Truncate aggressively.** `ai-processor.ts` caps input at 120k characters. Even
though Flash has a 1M-token window, latency scales with input. For very long
meetings, consider map-reduce: summarise in 30-minute chunks, then summarise the
summaries. Faster and usually *better* quality.

**Use context caching for repeat questions.** If users chat repeatedly about the
same meeting, Gemini's context caching lets you pay for the transcript tokens
once rather than on every turn.

**Cache embeddings.** `processTranscript` re-embeds everything if it runs twice.
Guard on the existing `ragProcessed` flag before re-running.

---

## 5. Frontend

**Analyse the bundle before optimising it:**

```bash
npm i -D @next/bundle-analyzer
ANALYZE=true npm run build
```

Likely findings and fixes:

- **Recharts / heavy widgets** — `next/dynamic` with `ssr: false`
- **`react-h5-audio-player`** — only needed on the meeting page; dynamic-import it
- **Clerk** — already code-split, leave it alone

**Convert static pages to Server Components.** The landing page sections are all
`'use client'` but only `HeroSection` and `CTASection` actually need
interactivity (they use `useUser`). Dropping `'use client'` from
`FeaturesSection`, `IntegrationsSection`, `HowItWorksSection`, `StatsSection`,
`MoreFeaturesSection` and `Footer` removes their JS from the client bundle
entirely — probably 30–40 KB gzipped for zero behaviour change.

**Add `loading.tsx` files.** `app/home/loading.tsx`, `app/search/loading.tsx`
etc. let Next stream a skeleton immediately instead of blocking on the client
fetch.

**Be careful with `backdrop-filter`.** The glass effect is beautiful and it is
the most expensive thing the compositor does. It's fine at the current density;
if you add glass to list items (hundreds on screen), scrolling will stutter on
low-end machines. Keep blur on containers, not on repeated rows.

**Watch `useWorkspaces`.** It's called from both `AppSidebar` and
`WorkspaceSwitcher`, so `/api/workspaces` is fetched twice per page load. Lift it
into a context provider (like `UsageContext`) or use SWR/React Query with a
shared key.

---

## 6. Cloud & deployment

### Recommended architecture

```
                    ┌──────────────────────────────┐
   Users ─────────► │  Vercel (Next.js app + API)  │
                    └───────┬──────────────┬───────┘
                            │              │
                 ┌──────────▼───┐   ┌──────▼──────────┐
                 │ Neon Postgres│   │ Upstash Redis   │
                 │ (pooled)     │   │ (cache + rate   │
                 └──────────────┘   │  limiting)      │
                                    └─────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
  ┌─────▼─────┐      ┌──────▼──────┐      ┌──────▼──────┐
  │ Pinecone  │      │ Gemini API  │      │ QStash queue│
  │ (vectors) │      │             │      │ → job route │
  └───────────┘      └─────────────┘      └─────────────┘
        │
  ┌─────▼──────────────────┐
  │ S3 + CloudFront        │
  │ (recordings, avatars)  │
  └────────────────────────┘
```

### Hosting options

| Option | Good for | Watch out for |
|---|---|---|
| **Vercel** (recommended) | Zero-config Next.js, edge CDN, preview deploys | 60 s function cap on Hobby (10 s on Edge); bandwidth costs on video |
| **AWS (ECS Fargate / App Runner)** | Long-running jobs, you're already on Lambda + S3 | You own the CDN, TLS and scaling config |
| **Railway / Render** | Simplest all-in-one, Postgres included | Fewer edge locations |
| **Self-hosted Docker** | Full control, predictable cost | You own everything |

Given the codebase already uses AWS Lambda for calendar sync and S3 for avatars,
**Vercel for the app + your existing AWS for background jobs and storage** is the
path of least resistance.

### Region placement

Put the app and the database **in the same region**. A cross-region Prisma query
adds 70–150 ms *per query*, and a dashboard load makes several. If you deploy to
`iad1` on Vercel, use a `us-east-1` Neon instance.

### Recordings belong on a CDN

MP4s served directly from S3 are slow and expensive in egress. Put CloudFront in
front of the bucket and serve signed URLs. If you add transcoding later, HLS
with adaptive bitrate is worth it.

### Serverless-specific gotchas in this codebase

1. **`maxDuration`** — set on the translate and webhook routes. Anything doing
   Gemini work needs it; the default is 10 s.
2. **Prisma binary targets** — add `binaryTargets = ["native", "rhel-openssl-3.0.x"]`
   to the generator block if you deploy to AWS Lambda.
3. **No in-memory state** — every instance is cold and isolated. The
   translation cache correctly lives in Postgres; keep it that way.
4. **Webhook idempotency** — MeetingBaaS retries on non-2xx. The handler is
   guarded by `meeting.processed`, but under concurrent retries two instances can
   both read `processed = false`. Add a DB-level guard:
   `updateMany({ where: { id, processed: false }, data: { processed: true } })`
   and only continue if `count === 1`.

### Cost estimate (~1,000 meetings/month)

| Service | Tier | Est. monthly |
|---|---|---|
| Vercel | Pro | $20 |
| Neon Postgres | Launch | $19 |
| Pinecone | Starter | $0–25 |
| Gemini | Free tier, or paid Flash | $0–15 |
| Google Translate | $20 per 1M chars | $10–40 |
| Upstash Redis | Pay-as-you-go | ~$5 |
| S3 + CloudFront | 500 GB egress | ~$45 |
| Clerk | Free ≤10k MAU | $0 |
| **Total** | | **~$100–170** |

Recording storage and egress is the dominant cost, not AI. If margins get tight,
look at S3 lifecycle rules (Glacier after 90 days) before you look at the AI bill.

---

## 7. Observability

You cannot optimise what you cannot see. In rough priority order:

1. **`@vercel/speed-insights`** — real Core Web Vitals, one line to add
2. **Sentry** — the codebase currently `console.error`s and moves on; in
   production those messages go nowhere useful
3. **Prisma slow-query logging**:
   ```ts
   log: [{ emit: 'event', level: 'query' }]
   prisma.$on('query', e => { if (e.duration > 300) console.warn('slow', e.query, e.duration) })
   ```
4. **Gemini token accounting** — log `usageMetadata` per call so cost is
   attributable per user and per feature

---

## 8. Security hardening

Beyond performance, worth doing before you have real users:

- **Encrypt integration tokens at rest.** `UserIntegration.accessToken` is stored
  in plaintext. A database dump leaks every connected Notion, Salesforce and
  HubSpot account. Encrypt with AES-256-GCM using a `KMS`-held key, or use
  Postgres `pgcrypto`.
- **Rate-limit the public routes.** `/api/rag/chat-all` and the translation route
  call paid APIs and are reachable by any authenticated user. Upstash's
  `@upstash/ratelimit` is a few lines.
- **Verify webhook signatures.** The Clerk and Razorpay webhooks verify; the
  MeetingBaaS one does not — anyone who learns a `bot_id` can post a fake
  transcript. Add a shared-secret header check.
- **Scope the S3 bucket.** Bot avatars should be served via CloudFront with the
  bucket itself private.

---

## Quick wins checklist

Roughly ascending effort:

- [ ] Drop `'use client'` from the 6 static landing sections
- [ ] Narrow the `select` in `/api/meetings/past`
- [ ] Add `loading.tsx` to `/home`, `/search`, `/workspaces`
- [ ] Share `useWorkspaces` through a context so it fetches once
- [ ] Add `@vercel/speed-insights` and Sentry
- [ ] Add the Postgres GIN full-text index
- [ ] Add Redis caching on the search and dashboard routes
- [ ] Stream the Gemini chat responses
- [ ] Move webhook processing onto a queue
- [ ] Virtualise the transcript list
- [ ] Encrypt integration tokens at rest
