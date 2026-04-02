# Project Overview

**Name:** `@shepai/cli` (v1.164.1)
**Purpose:** Autonomous AI Native SDLC Platform. Users run `shep` in a repo to gather requirements via AI, generate plans, and execute implementation autonomously.
**License:** MIT
**Repository:** https://github.com/shep-ai/shep.git
**Platform:** Node.js / TypeScript (ES2022, ESM)
**Package Manager:** pnpm (workspace monorepo)

## Workspaces
- `.` — Root package (main CLI)
- `packages/core` — Core package (domain, application, infrastructure layers)
- `src/presentation/web` — Web UI package (`@shepai/web`)

## Entry Points
- **CLI binary:** `shep` → `dist/src/presentation/cli/index.js`
- **Web UI:** Next.js app in `src/presentation/web/`
- **Storybook:** Component explorer for web UI

## Key Technologies
- TypeScript (strict mode, decorators enabled)
- pnpm workspaces
- TypeSpec for domain model generation
- Vitest for unit/integration testing
- Playwright for E2E testing
- ESLint 9 (flat config) + Prettier
- Next.js (web UI)
- React + Tailwind CSS v4
- Storybook 8.x
- tsyringe (dependency injection)
- better-sqlite3 (local persistence)
- Husky + commitlint (conventional commits)
- semantic-release (automated releases)
