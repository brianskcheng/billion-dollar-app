# Commands & Prompts – Copy-Paste Reference

Consolidated profile: [docs/PROMPTS_PROFILE.md](PROMPTS_PROFILE.md)

## Plan Execution

**Implement attached plan:**
```
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
```

**Implement plan by path:**
```
Implement the plan at @c:\Users\brian\.cursor\plans\[PLAN_NAME].plan.md

Do NOT edit the plan file. Use existing todos. Mark in_progress as you work.
```

---

## Subagent Prompts (mcp_task)

**Parallel E2E – Auth:**
```
In billion-dollar-app: npm run dev must be running. Run node e2e-workflows-parallel.mjs --group=auth. Log pass/fail to debug-session-log.md.
```

**Parallel E2E – Leads:**
```
In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=leads. If Apify fails, add to skipped-bugs-for-review.md. Log result.
```

**Parallel E2E – Campaigns:**
```
In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=campaigns. Log pass/fail.
```

**Parallel E2E – Inbox:**
```
In billion-dollar-app: Run node e2e-workflows-parallel.mjs --group=inbox. Log pass/fail.
```

**Overnight debug kickoff:**
```
Execute the Overnight Debug Plan for billion-dollar-app. Run fully autonomously until the app is debugged. No user input available.

PLAN FILE: c:\Users\brian\.cursor\plans\debug_session_plan_6ac2acce.plan.md

EXECUTION RULES:
1. Apply Phase 2 fixes first
2. Spawn Wave 1 agents in parallel
3. After Wave 1: spawn Wave 2 E2E agents in parallel
4. For failed flows: FixFailures agent, re-run E2E
5. Skip unclearable bugs; add to skipped-bugs-for-review.md
6. Write progress to debug-session-log.md
7. When done: "DEBUG SESSION COMPLETE" and verification table
```

**Thorough workflow debug kickoff:**
```
Execute the Thorough User Workflow Debug Plan.

PLAN: c:\Users\brian\.cursor\plans\user_workflow_setup_and_error_handling_4e585c3b.plan.md

RULES:
1. Spawn Phase 1 agents in PARALLEL (all 4 at once)
2. Skip bugs >15 min or 3 attempts; log to skipped-bugs-for-review.md
3. Phase 2 browser agents in PARALLEL (all 5 at once)
4. Phase 3: revisit each skipped bug
5. Phase 4: final E2E run, update logs
6. Do NOT ask for user input
```

---

## Terminal Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run test` | Smoke (lint + build + health) |
| `npm run test:e2e` | Sequential E2E |
| `npm run test:e2e:parallel` | Parallel E2E |
| `node e2e-workflows-parallel.mjs --group=auth` | Single group |

---

## Quick Prompts

**Push to GitHub:**
```
Prepare for push to GitHub. Stage changes, show diff. Do not commit – I will commit manually.
```

**Analyze workflows:**
```
Analyse codebase - find all user workflows - test and report back with updated docs and readme
```

**Architecture review:**
```
From the perspective of a world-leading senior developer, does the current architecture look good - deep analysis of codebase, research what's good out there, draw conclusions, list action items in plan
```

**Use parallel agents:**
```
Use multiple agents in parallel to streamline workflow
```

**Clean directory:**
```
Clean up directory - remove redundancies, ensure files are grouped and referenced properly, delete old md's - write new md's for own reference like a developer would
```

**Scaffold new feature:**
```
Scaffold a new [feature name] feature. Create folder, route, and follow existing patterns. See docs/ARCHITECTURE.md.
```

**Plan from idea:**
```
Create a plan for: [vague idea]. Explore codebase, list steps and files. Do not implement yet.
```

**Parallel build (4 agents):**
```
Split this into 4 independent tasks and spawn 4 agents in parallel via mcp_task. Each gets a focused prompt. Aggregate and verify.
```

**Full verification pass:**
```
Run npm run test and npm run test:e2e:parallel. Fix any failures. Report final status.
```

---

## Specialist Agent Prompts (mcp_task)

Use with mcp_task; replace `[Task]` or `[area]`:

| Role | Prompt stub |
|------|--------------|
| Frontend | In billion-dollar-app: focus on UI in app/ and components/. [Task]. Follow Tailwind + existing patterns. |
| Backend | In billion-dollar-app: focus on API routes in app/api/ and lib/. [Task]. Use Zod, RLS, existing auth. |
| Test | In billion-dollar-app: add or fix tests for [area]. Run npm run test when done. |
| Docs | In billion-dollar-app: update docs/ (WORKFLOWS, ARCHITECTURE, SETUP_*) for [change]. |
