---
name: ci-status
description: Show CI/CD pipeline status for current branch with job details and failure diagnostics
---

# CI Status Dashboard

Show a concise CI/CD status summary for the current branch.

## Steps

1. Get the current branch:
```bash
BRANCH=$(git branch --show-current)
```

1. List all recent workflow runs on this branch:
```bash
gh run list --branch "$BRANCH" --limit 5 --json databaseId,status,conclusion,name,createdAt,event
```

1. For each run that is `in_progress` or `failure`:
   - Show job-level status:
   ```bash
   gh run view <ID> --json jobs --jq '[.jobs[] | {name, status, conclusion}]'
   ```
   - For failed jobs, show the failing step:
   ```bash
   gh run view <ID> --json jobs --jq '[.jobs[] | select(.conclusion == "failure") | {name, steps: [.steps[] | select(.conclusion == "failure") | .name]}]'
   ```

2. Present a table summarizing:
   - Run name, status, conclusion
   - Which jobs passed/failed/in-progress
   - For failures: which step failed

3. If any runs are in progress, offer to watch them:
   ```bash
   gh run watch <ID> --exit-status
   ```

## Important

- A single push can trigger MULTIPLE workflow runs — always check all of them
- Never claim "CI passed" until every run shows `completed` + `success`
- After `gh run watch` completes, always verify with `gh run list` — watch exit code alone is unreliable
