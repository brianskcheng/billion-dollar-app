# User Workflows – Billion Dollar App

All user-facing workflows, their dependencies, and flow diagrams.

---

## 1. App Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page – links to Sign up and Log in |
| `/signup` | New user registration (email/password via Supabase Auth) |
| `/login` | User sign-in; redirects to `/dashboard` on success |
| `/dashboard` | Main hub – Gmail status, upgrade CTA, links to Leads/Campaigns/Inbox |
| `/leads` | Lead discovery via Apify Google Maps search |
| `/campaigns` | Create campaigns, add leads, Generate+Send outreach, start campaigns |
| `/inbox` | Replies from leads (detected via Gmail) |
| `/admin` | Admin panel (user count); visible only when `role=admin` or `ADMIN_EMAIL` matches |

---

## 2. API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Health check; validates Supabase configuration |
| POST | `/api/auth/logout` | Signs out; redirects to `/login` |
| GET | `/api/google/oauth/connect` | Redirects to Google OAuth; starts Gmail connect |
| GET | `/api/google/oauth/callback` | OAuth callback; stores tokens; redirects with `gmail_connected` or `gmail_error` |
| POST | `/api/leads/search` | Apify Google Maps search; creates leads; requires `query`, optional `limit` |
| GET | `/api/leads/list` | Returns user leads (id, email, company_name) for pickers |
| POST | `/api/campaigns/create` | Creates draft campaign; requires `name` |
| GET | `/api/campaigns/[id]/leads` | Returns leads in campaign |
| POST | `/api/campaigns/[id]/leads` | Adds lead to campaign; requires `leadId` |
| POST | `/api/campaigns/[id]/start` | Sets campaign to `running`; requires Gmail |
| POST | `/api/ai/generate` | Generates outreach with OpenAI; creates message; requires `leadId`, optional `campaignId`, `step` |
| POST | `/api/email/send` | Sends queued message via Gmail; requires `messageId`, optional `subject`, `body_text` |
| POST | `/api/stripe/checkout` | Creates Stripe Checkout session for Pro |
| POST | `/api/stripe/webhook` | Handles Stripe webhooks |
| GET | `/api/cron/send-due` | Cron: sends due campaign emails (`?secret=CRON_SECRET`) |
| GET | `/api/cron/check-replies` | Cron: detects Gmail replies and creates `reply_detected` events |

---

## 3. Workflow Flows

### 3.1 Auth

```
/ (landing)
  ├─ Get started → /signup
  └─ Log in → /login

/signup
  ├─ Submit → Supabase signUp → /dashboard
  └─ Link → /login

/login
  ├─ Submit → Supabase signInWithPassword → /dashboard
  └─ Link → /signup
```

Post-login: shared nav (Dashboard, Leads, Campaigns, Inbox, Admin if admin).

### 3.2 Gmail Connect

```
Connect Gmail (nav)
  → GET /api/google/oauth/connect
  → Redirect to Google OAuth
  → User consents
  → GET /api/google/oauth/callback?code=...
  → Stores tokens in integrations_google
  → Redirect /dashboard?gmail_connected=1 | ?gmail_error=...
```

Required for: email send, campaign start.

### 3.3 Lead Discovery

```
/dashboard → /leads
  → Enter search (e.g. "recruitment agencies london") + limit
  → Find Leads → POST /api/leads/search
  → Apify search → leads inserted → table updates
  → Add to campaign → /campaigns?lead={id}
```

### 3.4 Manual Outreach (Generate + Send)

```
/campaigns
  → New campaign → POST /api/campaigns/create
  → Add leads:
      - From /leads "Add to campaign" → /campaigns?lead={id}
      - Pick from leads → GET /api/leads/list
      - Enter Lead ID manually
  → Generate + Send → GenerateOutreachModal
      → POST /api/ai/generate
      → Review subject/body
      → Send → POST /api/email/send
```

Requires: Gmail connected.

### 3.5 Automated Campaign (Cron)

```
/campaigns
  → Create campaign + add leads
  → Start → POST /api/campaigns/[id]/start
  → Status: running

Background (cron):
  → GET /api/cron/send-due
  → Finds due campaign_leads
  → AI generates email
  → Sends via Gmail
  → Updates next_send_at, sequence_step
  → GET /api/cron/check-replies
  → Detects replies in Gmail threads
  → Inserts events_email (reply_detected)
```

### 3.6 Inbox (Replies)

```
/inbox
  → Lists reply_detected events
  → Lead + subject per row
```

Driven by `/api/cron/check-replies`.

### 3.7 Upgrade (Stripe)

```
/dashboard (plan !== "pro")
  → Upgrade to Pro
  → POST /api/stripe/checkout
  → Stripe Checkout
  → Webhook → profiles.plan = pro
```

### 3.8 Admin

```
Admin (role or ADMIN_EMAIL)
  → Nav link Admin
  → /admin
  → Non-admins → redirect /dashboard
  → User count
```

---

## 4. Dependencies

| Workflow | Depends On |
|----------|------------|
| Send email | Gmail, plan limits (trial, monthly) |
| Start campaign | Gmail |
| Generate + Send | Gmail, valid lead |
| Cron send-due | Gmail per user, running campaigns |
| Cron check-replies | Gmail, sent messages with thread_id |
| Inbox | Gmail; cron for reply detection |
| Add lead | Leads from search |
| Upgrade | Stripe keys, webhook |

---

## 5. Auth Flow

- Middleware: updates session; unauthenticated → `/login` (except `/`, `/login`, `/signup`)
- Authenticated on `/login` or `/signup` → redirect `/dashboard`
- Pages: `getUser()` → redirect if no user
- Admin: `profile.role === "admin"` or `ADMIN_EMAIL` match
