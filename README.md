# Recall AI

Meeting intelligence that records your calls, transcribes them, translates the
transcript into 100+ languages, and pushes the follow-ups into the tools your
team already uses.

A bot joins your Zoom / Google Meet / Microsoft Teams calls, records them, and
then Google Gemini produces a summary, the key decisions and a clean action-item
list — delivered by email and searchable forever.

---

## What's in this release

| Area | What changed |
|---|---|
| **AI** | Migrated from OpenAI to **Google Gemini** (`gemini-3.6-flash` + `gemini-embedding-001`). The free tier is enough to run the whole app. |
| **Integrations** | Added **Notion, Linear, Salesforce and HubSpot** alongside the existing Jira, Asana, Trello and Slack. |
| **Search** | Full-text search across transcripts and summaries, with date-range, preset-range, duration and participant filters. |
| **Translation** | Transcripts and summaries in **100+ languages** via the Google Cloud Translation API, cached per meeting. |
| **Workspaces** | Multi-workspace support with **role-based access** (Owner / Admin / Member / Viewer) and email invites. |
| **Design** | Full Cooldock-inspired redesign — dark glassmorphic surfaces, a floating dock rail, bento widget grids. |
| **Quality** | Type errors and lint errors now **fail the build** (they were silenced before). 119 unit tests added. |

---

## Feature list

- Auto-joins meetings from your Google Calendar; toggle the bot off per meeting
- Recording playback with a custom audio player
- Gemini-generated summaries, key decisions, topics and action items
- Chat with a single meeting or across your entire meeting history (RAG over Pinecone)
- Full-text search with date, duration and participant filters
- Transcript translation into 100+ languages with a searchable dropdown
- Push action items to Notion, Linear, Jira, Asana, Trello, Salesforce, HubSpot or Slack
- Team workspaces with role-based access and 7-day email invites
- Summary emails after every meeting
- Custom bot name and avatar
- Razorpay subscriptions with per-plan usage limits

---

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Clerk ·
Prisma + PostgreSQL · Google Gemini · Pinecone · Google Cloud Translation ·
Razorpay · Slack Bolt · AWS Lambda + S3 · Vitest

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Then fill in `.env`. Every variable is documented inline. The minimum set to get
the app running locally:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Any Postgres — [Neon](https://neon.tech) has a free tier |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — free |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk dashboard](https://clerk.com) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in development |
| `OAUTH_STATE_SECRET` | `openssl rand -hex 32` |

Everything else (Pinecone, translation, Razorpay, the eight integrations) can be
added later — features degrade gracefully when their keys are missing.

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

If you have meetings recorded before this release, backfill the new search
columns once:

```bash
npx tsx scripts/backfill-meeting-search.ts
```

### 4. Run it

```bash
npm run dev
```

---

## Important: Pinecone index dimensions

`gemini-embedding-001` returns **3072-dimension** vectors by default. The app
truncates them to **768** (via Matryoshka scaling) to keep the vector index
small and cheap, and L2-normalises the result so cosine similarity stays
accurate. The old OpenAI `text-embedding-3-small` produced 1536.

If you are upgrading an existing deployment you must **create a new Pinecone
index** with `dimension = 768` and `metric = cosine`, and point
`PINECONE_INDEX_NAME` at it. Mixing dimensions fails at query time. Re-index
existing meetings by calling `POST /api/rag/process` for each one.

To use full 3072-dimension embeddings instead, set
`GEMINI_EMBEDDING_DIMENSIONS=3072` and size your index to match.

---

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build — fails on type or lint errors
npm run start        # serve the production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (119 tests)
npm run test:watch   # Vitest in watch mode
npm run db:push      # push the Prisma schema
npm run db:studio    # Prisma Studio
```

---

## Integration setup

Each integration uses OAuth. Register a callback URL of the form
`{NEXT_PUBLIC_APP_URL}/api/integrations/{platform}/callback`.

| Platform | Register at | Notes |
|---|---|---|
| Notion | notion.so/my-integrations | Create a **public** integration. Share at least one page with it so databases can be created. |
| Linear | linear.app/settings/api/applications/new | Scopes: `read`, `write`, `issues:create` |
| Salesforce | Setup → App Manager → New Connected App | Scopes: `api`, `refresh_token`, `offline_access`, `id`. Use `https://test.salesforce.com` for sandboxes. |
| HubSpot | developers.hubspot.com | Scopes must match `HUBSPOT_SCOPES` exactly or the callback fails. |
| Jira | developer.atlassian.com | Needs `offline_access` for refresh tokens. |
| Asana | app.asana.com/0/my-apps | |
| Trello | trello.com/power-ups/admin | Uses an API key + client-side token flow. |
| Slack | api.slack.com/apps | Installed via `/api/slack/install`. |

Notion, Linear, Trello and Slack tokens do not expire. Jira, Asana, Salesforce
and HubSpot tokens are refreshed automatically five minutes before expiry.

---

## Project structure

```
app/
  api/                  route handlers
    integrations/       OAuth + setup + action-item dispatch per platform
    meetings/           list, search, participants, translate
    workspaces/         CRUD, members, invites, active workspace
    webhooks/           MeetingBaaS, Clerk, Razorpay
  home/                 dashboard
  search/               search + filter UI
  meeting/[meetingId]/  transcript, summary, action items, translation
  workspaces/           workspace management + invite acceptance
  components/landing/   marketing page sections

lib/
  gemini.ts             Gemini chat + embeddings (with retry/backoff)
  ai-processor.ts       transcript → summary / decisions / action items
  rag.ts                chunk, embed, retrieve
  translation.ts        Google Cloud Translation with batching
  languages.ts          100+ language catalogue
  meeting-filters.ts    pure date / duration / participant filter logic
  integrations/         one client per platform + shared dispatcher
  workspace/            RBAC matrix + workspace service

tests/                  Vitest suites for the pure logic above
scripts/                one-off maintenance scripts
```

---

## Testing

```bash
npm run typecheck && npm run lint && npm run test
```

The suites cover the logic that is easy to get subtly wrong and expensive to
debug in production:

- **`meeting-filters.test.ts`** — date presets (including the "last week means
  the previous Mon–Sun, not a rolling 7 days" distinction), duration bands,
  query-string round-tripping, pagination clamping
- **`rbac.test.ts`** — the permission matrix, role hierarchy invariants, and the
  rules preventing an admin from demoting a peer or anyone from acting on an owner
- **`translation.test.ts`** — request batching against Google's segment and
  character limits, transcript shape normalisation, round-tripping
- **`gemini.test.ts`** — JSON extraction from fenced/prose-wrapped model output,
  retry behaviour on 429/5xx versus immediate failure on 4xx
- **`oauth-state.test.ts`** — HMAC state signing, tamper and replay rejection,
  token expiry windows

---

## License

MIT
