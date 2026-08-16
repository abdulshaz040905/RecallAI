# Where to get every environment variable

Verified August 2026. Work top to bottom — **Tier 1 is all you need to see the app run.**

---

## Tier 1 — required to boot (about 15 minutes)

Without these five, nothing starts. Everything below Tier 1 is optional and the
related feature just stays switched off.

| Variable | Cost |
|---|---|
| `DATABASE_URL` | Free |
| `GEMINI_API_KEY` | Free |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Free ≤10k users |
| `NEXT_PUBLIC_APP_URL` | — |
| `OAUTH_STATE_SECRET` | — |

### `DATABASE_URL` — Postgres

Easiest free option is **Neon**:

1. Go to <https://neon.tech> → sign up with GitHub or Google
2. **Create project** → pick a region close to you → Create
3. On the dashboard, **Connection string** → copy the **Pooled connection**
4. Paste it in; it looks like:
   ```
   postgresql://neondb_owner:npg_xxxx@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

Supabase (Settings → Database → Connection string → *Transaction* mode) and a
local `postgresql://postgres:postgres@localhost:5432/recallai` both work too.

### `DIRECT_URL` — optional

Only needed if your host uses connection pooling (Neon and Supabase do). Same
dashboard, copy the **Direct/unpooled** connection string. Prisma uses it for
schema pushes while the app uses the pooled one. Safe to leave blank locally.

### `GEMINI_API_KEY` — the AI

1. Go to <https://aistudio.google.com/apikey>
2. Sign in with any Google account
3. **Create API key** → pick or create a Google Cloud project
4. Copy it — starts with `AIza...`

No credit card. Free tier is roughly 10 requests/minute and 1,500/day, which is
plenty for personal use.

> **Do not** set `GEMINI_CHAT_MODEL=gemini-2.0-flash` — that model was shut down
> in March 2026. The defaults in the code (`gemini-3.6-flash` and
> `gemini-embedding-001`) are current.

### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — login

1. Go to <https://clerk.com> → sign up → **Create application**
2. Name it, pick sign-in methods (Email + Google is a good default)
3. You land on **API Keys** — copy both:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → starts `pk_test_...`
   - `CLERK_SECRET_KEY` → starts `sk_test_...`

These are **not** free-form strings — the publishable key is a base64-encoded
domain. A placeholder makes the middleware throw and every route 404s.

### `CLERK_WEBHOOK_SECRET` — syncs users into your database

Skippable at first, but users won't be written to Postgres without it, so most
pages will be empty.

1. Clerk dashboard → **Webhooks** → **Add Endpoint**
2. URL: `https://your-domain.com/api/webhooks/clerk`
   (locally, run `ngrok http 3000` and use the ngrok URL)
3. Subscribe to `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** — starts `whsec_...`

### `NEXT_PUBLIC_APP_URL`

- Local: `http://localhost:3000`
- Production: `https://your-domain.com`

No trailing slash. Every OAuth callback and invite link is built from this.

### `OAUTH_STATE_SECRET`

Any random 32+ character string. Generate one:

```bash
openssl rand -hex 32
# Windows PowerShell:
# -join ((48..57)+(97..102) | Get-Random -Count 64 | % {[char]$_})
```

Never commit it. Changing it invalidates in-flight OAuth flows (harmless).

---

## Tier 2 — the core product features

### `MEETING_BAAS_API_KEY` — the bot that joins calls

Without this there is no recording, so no transcripts, summaries or action
items. This is the one paid dependency with no free-forever tier.

1. Go to <https://meetingbaas.com> → sign up
2. Dashboard → **API Keys** → create one → copy it
3. `MEETING_BAAS_WEBHOOK_URL` = `https://your-domain.com/api/webhooks/meetingbaas`
   (locally use your ngrok URL — MeetingBaaS must be able to reach you)

### `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — calendar sync

Lets the bot auto-join meetings from your calendar. Same Google Cloud project as
your Gemini key is fine.

1. <https://console.cloud.google.com> → select your project
2. **APIs & Services → Library** → search "Google Calendar API" → **Enable**
3. **APIs & Services → OAuth consent screen** → External → fill in app name and
   your email → add scope `.../auth/calendar.readonly` → add yourself under
   **Test users**
4. **Credentials → Create Credentials → OAuth client ID** → *Web application*
5. Authorised redirect URI:
   `http://localhost:3000/api/auth/google/callback`
6. Copy the Client ID and Client Secret
7. `GOOGLE_REDIRECT_URI` = the exact same URI you entered in step 5

While the consent screen is in "Testing", only listed test users can connect.

### `PINECONE_API_KEY` / `PINECONE_INDEX_NAME` — chat with your meetings

Powers "chat with this meeting" and cross-meeting search. Skip it and the rest
of the app still works.

1. <https://app.pinecone.io> → sign up (free Starter tier)
2. **API Keys** → Create → copy
3. **Indexes → Create index**:
   - Name: anything, e.g. `recall-ai` → this is `PINECONE_INDEX_NAME`
   - **Dimensions: 768**
   - **Metric: cosine**
   - Serverless, AWS, `us-east-1`

**768 is not optional** — it must match `GEMINI_EMBEDDING_DIMENSIONS`. A
1536-dim index left over from OpenAI will fail on every query.

### `GOOGLE_TRANSLATE_API_KEY` — the 100+ languages feature

1. <https://console.cloud.google.com> → same project
2. **APIs & Services → Library** → "Cloud Translation API" → **Enable**
   (requires billing enabled on the project, though the free tier still applies)
3. **Credentials → Create Credentials → API key** → copy
4. Click **Restrict key** → API restrictions → select *Cloud Translation API*

Free for the first 500,000 characters/month, then $20 per million. A one-hour
meeting transcript is roughly 50,000 characters, so ~10 free translations a
month. The app caches every translation, so re-reading one costs nothing.

### `GMAIL_USER` / `GMAIL_APP_PASSWORD` — summary emails and workspace invites

Needs an **App Password**, not your normal Gmail password:

1. Enable 2-Step Verification: <https://myaccount.google.com/security>
2. Go to <https://myaccount.google.com/apppasswords>
3. Create one named "Recall AI" → copy the 16-character code
4. `GMAIL_USER` = your full Gmail address
5. `GMAIL_APP_PASSWORD` = the 16 characters (spaces are fine)

App Passwords only appear after 2FA is on. `RESEND_API_KEY` is an alternative
if you'd rather use Resend (<https://resend.com>, 3,000 emails/month free).

---

## Tier 3 — the eight integrations

Each one is independent. Skip any you don't use; that card just shows
"Connect" and does nothing.

**Every redirect URI follows the same pattern:**
```
{NEXT_PUBLIC_APP_URL}/api/integrations/{platform}/callback
```
So locally, Notion's is `http://localhost:3000/api/integrations/notion/callback`.

### Notion

1. <https://www.notion.so/my-integrations> → **New integration**
2. Type: **Public** (Internal integrations can't do OAuth)
3. Fill in name, logo, and the required company/privacy URLs
4. Redirect URI: `{APP_URL}/api/integrations/notion/callback`
5. Capabilities: read + insert + update content
6. Copy **OAuth client ID** and **OAuth client secret**

⚠️ After connecting in-app, open Notion → the page you want to use → `···` →
**Connections** → add your integration. Notion shows the app *nothing* until
you explicitly share a page or database with it.

### Linear

1. <https://linear.app/settings/api/applications/new>
2. Name + icon, Callback URL: `{APP_URL}/api/integrations/linear/callback`
3. Copy **Client ID** and **Client secret**

Scopes are requested by the app (`read`, `write`, `issues:create`) — nothing to
configure.

### Salesforce

1. Setup (gear icon) → **App Manager** → **New Connected App**
2. Fill in name and contact email
3. Tick **Enable OAuth Settings**
4. Callback URL: `{APP_URL}/api/integrations/salesforce/callback`
5. Selected OAuth Scopes — add all four:
   - Manage user data via APIs (`api`)
   - Perform requests at any time (`refresh_token`, `offline_access`)
   - Access the identity URL service (`id`)
6. Untick "Require Proof Key for Code Exchange (PKCE)"
7. Save, **wait 10 minutes** (Salesforce genuinely needs this), then
   **Manage Consumer Details** to reveal the key and secret
8. `SALESFORCE_CLIENT_ID` = Consumer Key, `SALESFORCE_CLIENT_SECRET` = Consumer Secret
9. `SALESFORCE_LOGIN_URL` = `https://login.salesforce.com`
   (or `https://test.salesforce.com` for a sandbox)

A free Developer Edition org: <https://developer.salesforce.com/signup>

### HubSpot

1. <https://developers.hubspot.com> → create a developer account
2. **Apps → Create app**
3. **Auth** tab → Redirect URL: `{APP_URL}/api/integrations/hubspot/callback`
4. Scopes — add exactly these three:
   - `oauth`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
5. Copy **Client ID** and **Client secret**

⚠️ The scopes on the app and the `HUBSPOT_SCOPES` env var must match exactly, in
the same set. Mismatched scopes are the single most common HubSpot OAuth
failure. Leave `HUBSPOT_SCOPES` commented out unless you change the app's scopes.

### Jira (Atlassian)

1. <https://developer.atlassian.com/console/myapps/> → **Create → OAuth 2.0 integration**
2. **Permissions** → Jira API → Add → Configure → enable:
   `read:jira-work`, `write:jira-work`, `manage:jira-project`,
   `manage:jira-configuration`, `read:jira-user`
3. **Authorization** → OAuth 2.0 → Callback URL:
   `{APP_URL}/api/integrations/jira/callback`
4. **Settings** → copy Client ID and Secret

`offline_access` is requested by the app and is what makes token refresh work.

### Asana

1. <https://app.asana.com/0/my-apps> → **Create new app**
2. OAuth → Redirect URL: `{APP_URL}/api/integrations/asana/callback`
3. Copy Client ID and Client Secret

### Trello

Trello uses an API key plus a client-side token flow, not standard OAuth.

1. <https://trello.com/power-ups/admin> → **New** → create a Power-Up
2. Open it → **API Key** tab → **Generate a new API key**
3. Add `{APP_URL}` to **Allowed origins**
4. Set **both** env vars to the same key:
   ```
   TRELLO_API_KEY="your-key"
   NEXT_PUBLIC_TRELLO_API_KEY="your-key"
   ```

The duplicate is intentional — the browser needs it to run the token flow. It's
a public identifier, not a secret.

### Slack

1. <https://api.slack.com/apps> → **Create New App** → From scratch
2. **OAuth & Permissions** → Redirect URLs → add
   `{APP_URL}/api/slack/oauth`
3. **Bot Token Scopes**: `chat:write`, `channels:read`, `groups:read`, `users:read`
4. **Event Subscriptions** (optional, for the Slack bot):
   Request URL `{APP_URL}/api/slack/events`, subscribe to `app_mention`
5. **Basic Information** → App Credentials → copy:
   - Client ID → `SLACK_CLIENT_ID`
   - Client Secret → `SLACK_CLIENT_SECRET`
   - Signing Secret → `SLACK_SIGNING_SECRET`
6. **Install to Workspace** → **OAuth & Permissions** → copy the
   *Bot User OAuth Token* (`xoxb-...`) → `SLACK_BOT_TOKEN`

---

## Tier 4 — billing and file storage

### Razorpay

Only needed if you want paid plans. Without it the app treats everyone as free
tier and the pricing buttons return a configuration error.

1. <https://dashboard.razorpay.com> → sign up, then switch the toggle in the
   top-right to **Test Mode**. Everything below happens in test mode.
2. **Settings → API Keys → Generate Test Key**:
   - Key Id → `RAZORPAY_KEY_ID` (`rzp_test_...`)
   - Key Secret → `RAZORPAY_KEY_SECRET`
3. **Subscriptions → Plans → New Plan** — create three monthly INR plans:

   | Plan     | Amount   | Billing cycle |
   | -------- | -------- | ------------- |
   | Starter  | ₹99     | Monthly       |
   | Pro      | ₹199   | Monthly       |
   | Premium  | ₹299   | Monthly       |

   Copy each plan id (`plan_...`) into `RAZORPAY_STARTER_PLAN_ID`,
   `RAZORPAY_PRO_PLAN_ID` and `RAZORPAY_PREMIUM_PLAN_ID`. These stay
   server-side. The amounts in `lib/billing/plans.ts` are display-only; the
   plan you create in the dashboard is what actually gets charged, so keep the
   two in sync.
4. **Settings → Webhooks → Add New Webhook**:
   - URL: `{APP_URL}/api/webhooks/razorpay`
   - Events: `subscription.activated`, `subscription.charged`,
     `subscription.halted`, `subscription.cancelled`, `subscription.completed`
   - Set a secret → `RAZORPAY_WEBHOOK_SECRET`

Razorpay has no equivalent of the Stripe CLI, so for local testing expose your
dev server with a tunnel and point the webhook at that URL:

```bash
ngrok http 3000
# then set the webhook URL to https://<id>.ngrok-free.app/api/webhooks/razorpay
```

**Test card:** `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1111`.

### AWS S3 — custom bot avatars

Only used for uploading a custom avatar for the meeting bot.

1. <https://console.aws.amazon.com/s3> → **Create bucket**
   - Name → `AWS_S3_BUCKET_NAME`
   - Region → `AWS_REGION` (e.g. `us-east-1`)
   - Uncheck "Block all public access" (avatars must be readable)
2. **IAM → Users → Create user** → attach `AmazonS3FullAccess`
   (or a policy scoped to just this bucket)
3. Select the user → **Security credentials → Create access key** →
   *Application running outside AWS*
4. Copy both values into `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

---

## The absolute minimum `.env` to see it run

```dotenv
DATABASE_URL="postgresql://...your neon string..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GEMINI_API_KEY="AIza..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
OAUTH_STATE_SECRET="...openssl rand -hex 32..."

NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/home"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/home"
```

Then:

```bash
npx prisma db push
npm run dev
```

You'll get the landing page, sign-up, and an empty dashboard. Add
MeetingBaaS + Google Calendar when you want real meetings flowing through.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Every route 404s, edge runtime error | Clerk keys are placeholders or malformed |
| `Invalid URL` / `ERR_INVALID_URL` | `NEXT_PUBLIC_APP_URL` isn't a full URL with protocol |
| `PrismaClientInitializationError` | `DATABASE_URL` wrong, or you didn't run `prisma db push` |
| Gemini 404 "model not found" | You overrode the model with a retired one (`gemini-2.0-flash`) |
| Gemini 429 | Free-tier rate limit; the app retries with backoff, or enable billing |
| Pinecone "dimension mismatch" | Index isn't 768 — recreate it |
| OAuth "redirect_uri_mismatch" | The URI in the provider must match `{APP_URL}/api/integrations/{platform}/callback` character for character |
| OAuth callback fails silently | `OAUTH_STATE_SECRET` changed mid-flow, or the state expired (10 min) |
| Notion connects but shows no databases | You haven't shared a page with the integration in Notion |
| Emails never arrive | Using your Gmail password instead of an App Password |

---

## Security

- `.env` is gitignored — keep it that way. `.env.example` is the only one committed.
- Anything named `NEXT_PUBLIC_*` is **shipped to the browser**. Never put a
  secret behind that prefix. `NEXT_PUBLIC_TRELLO_API_KEY` is public by design.
- Rotate `OAUTH_STATE_SECRET`, `CLERK_SECRET_KEY` and `RAZORPAY_KEY_SECRET` if
  they're ever committed or pasted somewhere shared.
- Use separate keys for development and production everywhere.
