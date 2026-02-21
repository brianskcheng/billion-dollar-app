# Architecture – Billion Dollar App

Single source of truth for agents. See [WORKFLOWS.md](WORKFLOWS.md) for user flows.

---

## Stack

- Next.js 14 App Router, TypeScript
- Supabase: Auth, Postgres, RLS
- Stripe: Checkout, webhooks
- Gmail / Microsoft Graph: send, read (via `lib/email-provider.ts`)
- OpenAI: outreach generation
- Apify: lead search (Google Maps)
- Vercel Cron: send-due (10 min), check-replies (30 min)

---

## Folder Map

| Path | Purpose |
|------|---------|
| `app/` | Routes (page.tsx) and API (route.ts) |
| `app/api/` | API handlers; use `lib/` for logic |
| `app/auth/callback/` | OAuth callback; persists provider tokens |
| `lib/` | Supabase clients, Stripe, Gmail, Outlook, OpenAI, Apify, auth, validation, prompts |
| `components/` | React UI (Tailwind) |
| `supabase/migrations/` | Schema SQL |

---

## Key Tables

| Table | Purpose |
|-------|---------|
| profiles | User profile; plan, niche, company_name; id = auth.users.id |
| integrations_google | Gmail OAuth tokens (user_id, refresh_token, email) |
| integrations_microsoft | Outlook OAuth tokens |
| leads | user_id, company_name, email, status (new, queued, emailed, replied, …) |
| campaigns | name, value_prop, offer, status (draft, running, …) |
| campaign_leads | Join; sequence_step, next_send_at, state (pending, sent, replied) |
| messages | direction (outbound/inbound), subject, body_text, provider_message_id, thread_id |
| events_email | type (reply_detected, open, click) |

All tables with `user_id`: RLS `auth.uid() = user_id`.

---

## API Contract (condensed)

| Method | Route | Input | Output |
|--------|-------|-------|--------|
| POST | /api/leads/search | `{ query, limit? }` | leads array |
| POST | /api/ai/generate | `{ leadId, campaignId?, step? }` | `{ subject, body_text }` |
| POST | /api/email/send | `{ messageId, subject?, body_text? }` | `{ ok }` |
| POST | /api/campaigns/create | `{ name }` | `{ id }` |
| POST | /api/campaigns/[id]/leads | `{ leadId }` | 200 |
| POST | /api/campaigns/[id]/start | - | 200 |
| POST | /api/stripe/checkout | - | `{ url }` or `{ error }` |

---

## Conventions

- **Auth**: `requireAuth(supabase)` from `lib/auth.ts`; returns 401 if no user
- **Body validation**: Zod schemas in `lib/validation.ts`; use `parseBody(schema, request)`
- **Email**: `getActiveIntegration(supabase, userId)` from `lib/email-provider.ts`; returns gmail or microsoft; `sendEmail(integration, from, to, subject, bodyText)`
- **RLS**: All user-scoped tables use `auth.uid() = user_id`
- **New features**: Create folder per feature; follow existing route shape
