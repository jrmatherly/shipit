# Project Overview

**Name:** `@shipit-ai/cli` (forked from shep-ai/shep, current: v1.169.0 on npm)
**Display Name:** ShipIT AI (uppercase IT)
**Purpose:** Autonomous AI Native SDLC Platform. Users run `shipit-ai` in a repo to gather requirements via AI, generate plans, and execute implementation autonomously.
**License:** MIT
**Repository:** https://github.com/jrmatherly/shipit.git
**Platform:** Node.js / TypeScript (ES2022, ESM)
**Package Manager:** pnpm (workspace monorepo)

## Workspaces
- `.` — Root package (main CLI)
- `packages/core` — Core package (domain, application, infrastructure layers)
- `src/presentation/web` — Web UI package (`@shipit-ai/web`)

## Entry Points
- **CLI binary:** `shipit-ai` → `dist/src/presentation/cli/index.js`
- **Web UI:** Next.js 16 app in `src/presentation/web/`
- **Storybook:** Component explorer for web UI (v10.3.4)

## Key Technologies
- **TypeScript 6.0.2** (strict mode, experimentalDecorators + emitDecoratorMetadata for tsyringe)
- pnpm workspaces
- **TypeSpec 1.10.0** for domain model generation (via patched `@typespec-tools/emitter-typescript@0.3.0`)
- **Vitest 4.1.x** for unit/integration testing
- Playwright for E2E testing
- ESLint 9 (flat config) + Prettier (single-quote)
- **Next.js 16.2.2** (web UI)
- React 19 + **Tailwind CSS 4.2.2**
- **Storybook 10.3.4** (consolidated packages: `storybook` core + `@storybook/react-vite` + `@storybook/addon-a11y` + `@storybook/addon-docs`)
- **Vite 8.0.3** (Rolldown bundler)
- **jsdom 29.0.1**
- tsyringe (dependency injection)
- better-sqlite3 (local persistence)
- Husky + commitlint (conventional commits)
- semantic-release (automated releases, OIDC trusted publishing)

## Toolchain State (2026-04-05/06)
- Phase C complete: TS 5.9 → 6.0, Storybook 8.6 → 10.3, Vite 7 → 8.0, jsdom 28 → 29
- Phase D complete: TypeSpec 0.60 → 1.10 with patched emitter (asset-emitter import swap + Date mapping)
- Two security-alert remediation passes complete: Dependabot (ajv ReDoS, @anthropic-ai/sdk sandbox escape) via scoped `pnpm.overrides`; CodeQL (26 alerts across 7 clusters — command injection, path injection, polynomial ReDoS, incomplete sanitization, stack-trace exposure, missing workflow permissions, shell-command-from-env) via commits `e5467f11` + `a6ac80be`
- Canonical path-containment helper extracted to `src/presentation/web/lib/path-sanitizers.ts` (`realpathOrNull`, `isWithinRoot`, `realpathWithinAllowedRoots` + async variants); TOCTOU gap closed in `api/directory/list/route.ts`
- All 5,920 unit tests (419 files) + 578 integration tests passing
- Dev UI (`pnpm dev:cli ui`) verified working
- **Feature 083 (Plugin Marketplace)** merged to main: 93 files, ~5,300 lines, first HTTP client in project, feature-flagged behind `featureFlags.plugins`
- **Stitch Editorial Design Refresh** (2026-04-05/06): Major visual overhaul adopting Stitch developer portal aesthetic — shadcn tokens swapped to Stitch palette, Inter font, `.editorial-shadow` / `.glass-blur` utility classes, 7 local tool SVGs, sidebar brandmark, editorial tab treatment via CSS attribute selectors (hydration-safe). 30+ files, ~1200 lines changed. Prototype source: `.scratchpad/stitch/shipit-developer-portal/`
