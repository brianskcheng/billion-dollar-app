---
name: parallel-splitter
description: Splits multi-part work into independent tasks and spawns parallel agents. Use when the user requests work that can be divided (e.g. "add export to campaigns and leads").
---

# Parallel Splitter

## When to Use

User requests work that clearly splits into 2+ independent tasks:
- "Add X to A and B" (A and B are separate areas)
- "Fix issues in [list of unrelated areas]"
- "Implement [plan] with [N] steps" where steps have no order dependency

## Workflow

1. Split into independent tasks (each touch different files, no shared state mid-task)
2. Spawn agents via `mcp_task` with focused prompts (one task per agent)
3. Launch all agents in parallel (single invocation, multiple tool calls)
4. Aggregate results
5. Run verification (`npm run test`)

## Prompt Template per Agent

```
In billion-dollar-app: [Specific task with file paths]. Follow docs/ARCHITECTURE.md. Report done with summary of changes.
```

## Do NOT Split When

- Task B depends on Task A output
- Shared files would conflict (e.g. both edit same route)
- Single logical unit (e.g. one API + one UI that calls it)
