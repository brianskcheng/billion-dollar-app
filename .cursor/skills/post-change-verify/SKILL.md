---
name: post-change-verify
description: Runs verification after code edits. Use after any change that affects app behavior (routes, lib, components).
---

# Post-Change Verify

## When to Run

After edits to: `app/api/*`, `lib/*`, `app/**/page.tsx`, `components/*`

## Actions

1. **API/lib changed**: Run `npm run test` (smoke: lint, build, health)
2. **E2E-relevant change** (auth, workflows): Optionally run `npm run test:e2e` or `npm run test:e2e:parallel`
3. Report pass/fail
4. If fail: fix before marking done; do not leave broken

## Skip

- Docs-only changes
- Comments, formatting
- User explicitly says "skip tests"
