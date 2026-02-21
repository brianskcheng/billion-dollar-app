# Prompts Profile – Rules, Skills, Subagents, Commands

One reference for all project instructions. Paste sections where needed.

---

## Global Rules (paste to Cursor Settings > Rules or ~/.cursor/rules/)

```
- Report like a manager. Big picture first, concise. Details only when asked
- No emojis
- No auto git commit. User runs commits manually
- Do not generate BAT/PS1 files
- Do not auto-add debug/summary docs unless requested
- Avoid redundant code; stacked errors
- Use mcp_task for parallel agents when tasks are independent
- Default to parallel: for multi-step tasks, prefer spawning 2-4 agents over sequential execution
- Verify after change: run npm run test (or relevant subset) after code edits that touch routes/lib
- Prefer plan first: for non-trivial requests, create or reference a plan before implementation
- Do only what you can automate; user handles manual checks
- New features: create dedicated folder, store all new files there
- Repetition detection: when the user repeats requests or workflows, surface it and suggest adding a skill, rule, or command. Ask before creating.
```

---

## Project Rules (paste to .cursor/rules/project.mdc)

```
- Architecture reference: before implementing features, read docs/WORKFLOWS.md and docs/ARCHITECTURE.md
- Scaffold location: new features go in app/[feature]/, lib/, components/ per existing structure
- E2E: npm run test:e2e:parallel (groups: auth, leads, campaigns, inbox)
- Plans: c:\Users\brian\.cursor\plans\
- Docs: docs/WORKFLOWS.md, docs/ARCHITECTURE.md, docs/TEST_REPORT.md, docs/SETUP_*.md
- OAuth: same Google/Microsoft credentials in Supabase and .env
```

---

## Skills (in .cursor/skills/)

| Skill | Path | When to use |
|-------|------|-------------|
| plan-executor | `.cursor/skills/plan-executor/` | Implementing plans; "execute the plan" |
| parallel-e2e-debug | `.cursor/skills/parallel-e2e-debug/` | E2E testing, parallel groups, skip-bug workflow |
| workflow-debug-autonomous | `.cursor/skills/workflow-debug-autonomous/` | Overnight/autonomous debug sessions |
| feature-scaffold | `.cursor/skills/feature-scaffold/` | "Add feature", "scaffold X", new route |
| plan-from-idea | `.cursor/skills/plan-from-idea/` | Vague request; create plan, do not implement |
| post-change-verify | `.cursor/skills/post-change-verify/` | After code edits; run tests |
| parallel-splitter | `.cursor/skills/parallel-splitter/` | Multi-part work; split and spawn agents |

---

## Subagent Prompts (mcp_task)

**E2E groups:**
```
--group=auth   | In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=auth. Log pass/fail.
--group=leads  | In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=leads. Log result.
--group=campaigns | In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=campaigns. Log pass/fail.
--group=inbox  | In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=inbox. Log pass/fail.
```

**Specialist roles (replace [Task] or [area]):**
```
Frontend | In billion-dollar-app: focus on UI in app/ and components/. [Task]. Follow Tailwind + existing patterns.
Backend  | In billion-dollar-app: focus on API routes in app/api/ and lib/. [Task]. Use Zod, RLS, existing auth.
Test     | In billion-dollar-app: add or fix tests for [area]. Run npm run test when done.
Docs     | In billion-dollar-app: update docs/ (WORKFLOWS, ARCHITECTURE, SETUP_*) for [change].
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000) |
| `npm run test` | Smoke (lint + build + health) |
| `npm run test:e2e` | Sequential E2E |
| `npm run test:e2e:parallel` | Parallel E2E |
| `node e2e-workflows-parallel.mjs --group=auth` | Single E2E group |

---

## Quick Prompts (copy-paste)

| Action | Prompt |
|--------|--------|
| Implement plan | Implement the plan as specified, it is attached. Do NOT edit the plan file. Use existing todos. Mark in_progress as you work. |
| Push to GitHub | Prepare for push to GitHub. Stage changes, show diff. Do not commit – I will commit manually. |
| Scaffold feature | Scaffold a new [feature name] feature. Create folder, route, follow existing patterns. See docs/ARCHITECTURE.md. |
| Plan from idea | Create a plan for: [vague idea]. Explore codebase, list steps and files. Do not implement yet. |
| Parallel build | Split this into 4 independent tasks and spawn 4 agents in parallel via mcp_task. Each gets a focused prompt. Aggregate and verify. |
| Full verify | Run npm run test and npm run test:e2e:parallel. Fix any failures. Report final status. |
| Architecture review | From the perspective of a world-leading senior developer, does the current architecture look good - deep analysis, conclusions, action items in plan. |
| Use parallel agents | Use multiple agents in parallel to streamline workflow. |

---

Full prompt details: [docs/COMMANDS.md](COMMANDS.md)
