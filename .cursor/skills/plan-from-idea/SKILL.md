---
name: plan-from-idea
description: Creates a structured plan from a vague request. Use when the user gives an unclear request like "add admin export" or "improve leads page" and no plan exists.
---

# Plan From Idea

## Workflow

1. Explore codebase for relevant areas (routes, components, API)
2. Produce plan: goal, steps, files to touch, dependencies
3. Save to `.cursor/plans/` or present for user to attach
4. **Do NOT implement** until user explicitly says "implement"

## Plan Structure

```markdown
# [Feature Name] Plan

## Goal
[One sentence]

## Steps
1. [Step with file path]
2. ...

## Files to touch
| Area | Files |

## Dependencies
- [Env, migrations, external services]
```

## Trigger

User says "create a plan for", "plan for", "how would we add", or describes something without "implement" or "do it".
