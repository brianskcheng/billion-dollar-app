---
name: workflow-debug-autonomous
description: Runs fully autonomous debug sessions with no user input. Use when the user wants overnight debugging, autonomous workflow testing, or "debug fully until done".
---

# Autonomous Workflow Debug

## Execution Rules

1. Run fully autonomously; no user input available
2. Write progress to `debug-session-log.md`
3. Write skipped bugs to `skipped-bugs-for-review.md`
4. When done: add "DEBUG SESSION COMPLETE" and verification table to debug-session-log
5. Skip flows that need missing env; log clearly

## Wave Structure (typical)

1. **Wave 1 (parallel)**: FixBugs, EnvSetup
2. **Wave 2 (parallel)**: E2E-Auth, E2E-Leads, E2E-Campaigns, E2E-GenerateSend, E2E-Inbox, E2E-Gmail
3. **Wave 3**: FixFailures for each failed flow; CronTest
4. Revisit skipped bugs
5. Final E2E run and log updates

## Skip Criteria

Add to skipped-bugs-for-review.md when:
- Blocked by external service (Apify, OAuth consent)
- Requires user input or secrets not in env
- Ambiguous or risky guesswork
- Low-impact, non-blocking
