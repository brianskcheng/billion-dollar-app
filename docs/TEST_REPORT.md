# Workflow Test Report

Test checklist for all user workflows. Run `npm run dev` before testing.

---

## Public Routes (No Auth)

| Flow | Test | Result | Notes |
|------|------|--------|-------|
| Landing | GET / loads | Pass | Marketing copy, links to signup/login |
| Login page | GET /login loads | Pass | Email/password form |
| Signup page | GET /signup loads | Pass | Registration form |

---

## Auth Redirects (Unauthenticated)

| Flow | Test | Result | Notes |
|------|------|--------|-------|
| Dashboard | GET /dashboard | Pass | Redirects to /login |
| Leads | GET /leads | Pass | Redirects to /login |
| Campaigns | GET /campaigns | Pass | Redirects to /login |
| Inbox | GET /inbox | Pass | Redirects to /login |
| Admin | GET /admin | Pass | Redirects to /login |

---

## API Health

| Flow | Test | Result | Notes |
|------|------|--------|-------|
| Health | GET /api/health | Pass | Returns ok, supabase status; requires Supabase URL + keys |

---

## Authenticated Workflows (Require Login)

| Flow | Test | Depends On | Notes |
|------|------|------------|-------|
| Login | Submit valid creds | Supabase | Redirects to /dashboard |
| Signup | Submit email/password | Supabase | Creates profile; redirects to /dashboard |
| Dashboard | Load /dashboard | Session | Shows nav, Gmail status, upgrade CTA |
| Gmail connect | Click Connect Gmail | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI | OAuth flow; may need manual consent |
| Lead search | /leads, enter query, Find Leads | APIFY_API_TOKEN | Apify Google Maps search |
| Campaign create | /campaigns, New campaign | - | POST /api/campaigns/create |
| Add lead | Add lead ID or Pick from leads | Leads exist | POST /api/campaigns/[id]/leads |
| Generate + Send | Click Generate+Send on lead | Gmail, OPENAI_API_KEY | AI generate + email send |
| Inbox | /inbox | Gmail, cron check-replies | Lists reply_detected events |
| Admin | /admin | role=admin or ADMIN_EMAIL | Non-admins redirect to /dashboard |
| Upgrade | Upgrade to Pro | Stripe keys | Stripe Checkout |

---

## Cron (Manual)

| Flow | Test | Depends On | Notes |
|------|------|------------|-------|
| send-due | GET /api/cron/send-due?secret=CRON_SECRET | CRON_SECRET, running campaigns, Gmail | Sends due campaign emails |
| check-replies | GET /api/cron/check-replies?secret=CRON_SECRET | CRON_SECRET, Gmail, sent messages | Detects replies in Gmail |

---

## Smoke Test

```bash
npm run test
```

Runs: lint, build, health check. Requires .env.local with Supabase configured.
