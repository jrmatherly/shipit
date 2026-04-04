# Session Summary — 2026-04-04

## Completed Work

### CI/CD Pipeline Fixes (4 commits, pushed early session)
- Fixed semantic-release Slack webhook crash (conditional plugin load in release.config.mjs)
- Added cancel-in-progress to all GitHub Actions workflows
- Fixed OIDC trusted publishing: Node 24 for publish jobs (npm 11.x required), removed registry-url from Release job setup-node, removed redundant --provenance flag
- Fixed version reset to v1.0.0 (deleted ghost tag, created v1.164.1 tag baseline)
- Published @shipit-ai/cli@1.164.2 via OIDC successfully

### Branch Protection
- Configured main branch: 11 required status checks, force push blocked, deletion blocked
- enforce_admins: false for RELEASE_TOKEN PAT to push release commits

### Brand Standardization (3 commits, ~250 files)
- Wave 2: "Shep"/"Shipit AI" → "ShipIT"/"ShipIT AI" in 97 source files + 7 locale translation files
- Wave 3: Lowercase "shep" → "shipit-ai" in 66 presentation layer files (CLI commands, Storybook fixtures, path strings)
- Fixed double "AI" in 7 non-English translation locales ("ShipIT AI AI CLI" → "ShipIT AI CLI")
- Brand display name is "ShipIT" (not "Shipit")

### Logo & Favicon Replacement
- Old sheep SVG logo replaced with brain PNG icon (cropped from shipit-v2-logo.png)
- Brain icon at 28px with cyan drop-shadow and dark:brightness-125 for sidebar visibility
- SVG brain icon created for favicon (transparent, gradient colors)
- PNG favicons generated at 16, 32, 180, 192, 512px
- File renamed: shep-logo.tsx → shipit-ai-logo.tsx

### UI Bug Fixes
- Codex CLI icon: SVG fill changed from currentColor to OpenAI brand green (#10a37f)
- GitHub CLI warning banner: now conditional on checkToolStatus() — hidden when gh is installed
- Features sidebar section: hidden when no features exist (cleaner UX for fresh installs)

### DI Registration Fix
- PollAgentEventsUseCase string token registered in web-tokens.module.ts
- Fixed SSE /api/agent-events poll errors in dev mode

### Next.js Migration
- middleware.ts → proxy.ts (deprecated "middleware" convention renamed to "proxy")
- Function export renamed: middleware() → proxy()

### Pre-existing Type/Test Fixes
- InitializeSettingsUseCase constructor: 5 test files updated for new envDetector parameter
- TerminalType.Iterm2 → ITerm2 casing fix
- ToolInfo tags union: added 'shell'
- ESLint import type warning fixed

### Documentation Audit
- Cross-referenced 7 docs against project config: CLAUDE.md, AGENTS.md, CONTRIBUTING.md, CONTRIBUTING-AGENTS.md, README.md, CHANGELOG.md, LESSONS.md
- Fixed: NPM_TOKEN → OIDC, architecture layers, co-author format, supported agents list, ghost v1.0.0 changelog, commit-conventions release types
- Updated commit-conventions.md: refactor/perf/revert trigger patch releases

### Developer Tooling
- /ci-status skill: quick CI pipeline dashboard
- /release-debug skill: diagnose npm publish failures
- run-related-tests.sh hook: PostToolUse hook surfacing related test files on edit
- Registered hook in .claude/settings.json

## Key Patterns Established
- Brand display name: "ShipIT" (uppercase IT), binary: "shipit-ai"
- Node 24 for publish jobs (OIDC requires npm >= 11.5.1)
- No registry-url in semantic-release Release job (conflicts with OIDC auth)
- Provenance automatic with OIDC — no --provenance flag needed
- middleware.ts renamed to proxy.ts for Next.js 16
- Use perl (not sed) for word-boundary replacements on macOS

## Current State
- @shipit-ai/cli@1.164.2 published on npm
- 5,719+ unit tests, 578 integration tests passing
- 12,841 code review graph nodes, 131,703 edges
- CI/CD fully operational with OIDC trusted publishing

## Remaining Work
- P4-4: Test 18 CLI commands (16h)
- P4-6: E2E tests for critical user journeys (16h)
- Phase 5: Dependency modernization (76h)
- TypeSpec @doc() annotations still use "Shipit AI" (needs tsp pass)
