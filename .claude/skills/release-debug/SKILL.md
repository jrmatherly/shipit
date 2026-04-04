---
name: release-debug
description: Diagnose semantic-release and npm publish failures from the latest CI release job
---

# Release Failure Debugger

Diagnose why the Release or Dev Release job failed in CI.

## Steps

1. Find the latest CI/CD run on main:
```bash
gh run list --branch main --limit 3 --json databaseId,status,conclusion,name
```

2. Identify the Release job and check if it failed:
```bash
gh run view <ID> --json jobs --jq '[.jobs[] | select(.name | test("Release")) | {name, conclusion, steps: [.steps[] | select(.conclusion == "failure") | .name]}]'
```

3. Get the Release job logs and save them:
```bash
gh run view <ID> --job <JOB_ID> --log 2>&1 | tee /tmp/release-log.txt | tail -30
```

4. Search for common failure patterns:
```bash
# npm auth failures
grep -n "ENEEDAUTH\|EOTP\|E403\|E401\|EINVALIDNPMTOKEN" /tmp/release-log.txt

# Semantic-release errors
grep -n "ENOSLACKHOOK\|SemanticReleaseError\|AggregateError" /tmp/release-log.txt

# npm/node version issues
grep -n "npm: \|Node.js v\|MODULE_NOT_FOUND" /tmp/release-log.txt

# OIDC issues
grep -n "OIDC\|id-token\|token exchange" /tmp/release-log.txt

# Git push failures (branch protection)
grep -n "protected branch\|push.*rejected\|Permission denied" /tmp/release-log.txt
```

5. Cross-reference with known gotchas from CLAUDE.md CI/CD Publishing section.

## Common Root Causes Checklist

- **ENEEDAUTH**: Check Node version is 24 in publish job (npm >= 11.5.1 needed for OIDC). Check no `registry-url` in Release job's setup-node.
- **ENOSLACKHOOK**: Slack plugin loaded without `SLACK_WEBHOOK` env var. Check `release.config.mjs` conditional.
- **Version reset to 1.0.0**: No git tags exist. Run `git ls-remote --tags origin 'refs/tags/v*'` and create missing tag.
- **MODULE_NOT_FOUND**: Don't use `npm install -g npm@latest` on Node 22 — use Node 24 instead.
- **Push rejected**: Check `RELEASE_TOKEN` secret exists and has contents:write permission. Check branch protection has `enforce_admins: false`.
- **OIDC token exchange failed**: Check `id-token: write` permission in workflow job.
