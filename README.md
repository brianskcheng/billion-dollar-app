# Billion Dollar App

Next.js 14 app for lead generation and outreach campaigns. Uses Supabase (auth/db), Stripe (billing), Gmail (send/inbox), OpenAI (content), and Apify (lead search).

## Quick Start

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill required vars
3. `npm run dev` – app at http://localhost:3000

## Env Vars

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client key (or use `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/cron key |
| `OPENAI_API_KEY` | OpenAI for generated content |
| `APIFY_API_TOKEN` | Apify for lead search |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Gmail OAuth |
| `NEXT_PUBLIC_SITE_URL` | Base URL (e.g. http://localhost:3000) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | Stripe billing |
| `CRON_SECRET` | Protect cron endpoints |

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
- `supabase/migrations/` – DB schema
- `scripts/` – Smoke test and utilities

## Routes

- `/`, `/login`, `/signup` – Public
- `/dashboard` – Main hub
- `/leads` – Search and manage leads
- `/campaigns` – Create and run campaigns
- `/inbox` – Gmail replies

## Vercel Cron

- `/api/cron/send-due` – Every 10 min
- `/api/cron/check-replies` – Every 30 min

## Supabase Troubleshooting

**"Fetch failed" or 502 from `/api/health`**

1. **URL:** Must match Project ID from Dashboard > Settings > General. Format: `https://YOUR_PROJECT_ID.supabase.co`
2. **Keys:** Copy from Dashboard > Project Settings > API Keys. Use the copy button (do not type manually).
3. **New vs legacy:** App supports both. For new keys use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_...) and `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_...). For legacy use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (eyJ... JWT) and `SUPABASE_SERVICE_ROLE_KEY` (eyJ... service_role JWT) from the Legacy tab.
4. **Truncated key:** If key length is under ~50 chars, re-copy from the dashboard. Full keys are longer.
5. **Check `/api/health`** – returns `debug.keyLen` and `debug.hint` when config may be wrong.
