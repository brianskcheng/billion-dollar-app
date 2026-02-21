# Billion Dollar App

Next.js 14 app for lead generation and outreach campaigns. Uses Supabase (auth/db), Stripe (billing), Gmail or Outlook (send/inbox), OpenAI (content), and Apify (lead search).

## Quick Start

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill required vars
3. Run migrations in Supabase: `001_initial_schema.sql`, `002_admin_role.sql`, `003_integrations_microsoft.sql`
4. In Supabase Dashboard: Authentication > URL Configuration, add `http://localhost:3000/auth/callback` to Redirect URLs (for Sign in with Google/Microsoft)
5. `npm run dev` – app at http://localhost:3000

## Documentation

- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) – All user workflows, flows, dependencies
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md) – Workflow test checklist
- [docs/SETUP_GMAIL.md](docs/SETUP_GMAIL.md) – One Google OAuth app (Supabase + .env)
- [docs/SETUP_MICROSOFT.md](docs/SETUP_MICROSOFT.md) – One Azure OAuth app (Supabase + .env)
- [docs/SETUP_APIFY.md](docs/SETUP_APIFY.md) – Apify token for lead search
- [docs/SETUP_OPENAI.md](docs/SETUP_OPENAI.md) – OpenAI API key for AI outreach
- [docs/SETUP_STRIPE.md](docs/SETUP_STRIPE.md) – Stripe billing (Upgrade to Pro)

## Env Vars

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client key (or use `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/cron key |
| `OPENAI_API_KEY` | OpenAI for generated content |
| `APIFY_API_TOKEN` | Apify for lead search |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Same as Supabase Google provider |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI` | Same as Supabase Azure provider |
| `NEXT_PUBLIC_SITE_URL` | Base URL (e.g. http://localhost:3000) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | Stripe billing |
| `CRON_SECRET` | Protect cron endpoints |
| `ADMIN_EMAIL` | Optional; email that gets admin access |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Smoke test (lint + build + health check) |

## Folder Structure

- `app/` – Routes and API handlers (Next.js App Router)
- `lib/` – Supabase clients, Stripe, Gmail, OpenAI, Apify, limits, prompts
- `components/` – React components
- `docs/` – Workflows, test report
- `supabase/migrations/` – DB schema
- `scripts/` – Smoke test and utilities

## Routes

- `/`, `/login`, `/signup` – Public
- `/dashboard` – Main hub
- `/leads` – Search and manage leads
- `/campaigns` – Create and run campaigns
- `/inbox` – Email replies
- `/admin` – Admin panel (role or ADMIN_EMAIL)

## Vercel Cron

- `/api/cron/send-due` – Every 10 min
- `/api/cron/check-replies` – Every 30 min

Cron endpoints require `CRON_SECRET` in production. Pass `?secret=<CRON_SECRET>` when calling.

## Supabase Troubleshooting

**"Fetch failed" or 502 from `/api/health`**

1. **URL:** Must match Project ID from Dashboard > Settings > General. Format: `https://YOUR_PROJECT_ID.supabase.co`
2. **Keys:** Copy from Dashboard > Project Settings > API Keys. Use the copy button (do not type manually).
3. **New vs legacy:** App supports both. For new keys use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_...) and `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_...). For legacy use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (eyJ... JWT) and `SUPABASE_SERVICE_ROLE_KEY` (eyJ... service_role JWT) from the Legacy tab.
4. **Truncated key:** If key length is under ~50 chars, re-copy from the dashboard. Full keys are longer.
5. **Check `/api/health`** – returns `debug.keyLen` and `debug.hint` when config may be wrong.
