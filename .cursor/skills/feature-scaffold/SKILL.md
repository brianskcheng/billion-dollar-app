---
name: feature-scaffold
description: Scaffolds new features following existing patterns. Use when the user says "add feature", "new route", "scaffold X", or describes a feature without a plan.
---

# Feature Scaffold

## Before Starting

1. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. Identify which area: app route, API route, lib service, component

## Conventions

- **API routes**: `app/api/[area]/[action]/route.ts`; use `requireAuth`, `parseBody` (Zod), return `NextResponse.json`
- **Pages**: `app/[feature]/page.tsx`; use `getUser()` and redirect if unauthenticated
- **Lib**: `lib/[service].ts`; no route logic, pure functions
- **Components**: `components/` or `components/[feature]/` for feature-specific UI
- **RLS**: All tables with user_id use `auth.uid() = user_id`

## Output

- List files created
- Manual steps if any (migrations, env vars)
- Run `npm run test` after scaffolding
