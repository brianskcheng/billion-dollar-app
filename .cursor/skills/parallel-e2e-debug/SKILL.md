---
name: parallel-e2e-debug
description: Runs E2E workflow tests in parallel and handles unclearable bugs. Use when debugging workflows, running E2E tests, or when the user wants parallel agent execution for testing.
---

# Parallel E2E Debug

## Commands

- **Full parallel run**: `npm run test:e2e:parallel`
- **Single group**: `node e2e-workflows-parallel.mjs --group=auth|leads|campaigns|inbox`

## Skip Rule

If a bug takes >15 min or 3 fix attempts: skip and log to `skipped-bugs-for-review.md`:

| Flow | Issue | Why Skipped |

Also skip: OAuth consent (needs human), external API down, missing env

## Revisit

After fixes, revisit each skipped bug once. If still blocked: append "Retried – still blocked" to that row.

## Parallel Agent Invocation (mcp_task)

Launch 4 agents with:
- `--group=auth`
- `--group=leads`
- `--group=campaigns`
- `--group=inbox`

Prerequisite: `npm run dev` running on localhost:3000
