# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

`@shipit-ai/cli` — Autonomous AI Native SDLC Platform (forked from shep-ai/shep). Repo: `jrmatherly/shipit`. Users run `shipit-ai` in a repo to gather requirements via AI, generate plans, and execute implementation autonomously.

## Spec Workflow

**All feature work MUST begin with `/shep-kit:new-feature`.** See [spec-driven-workflow](./docs/development/spec-driven-workflow.md).

`/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → /shep-kit:implement → /shep-kit:commit-pr`

Specs live in `specs/NNN-feature-name/`. **Edit YAML only — Markdown is auto-generated.**

## Commands

| Command              | Purpose                         |
| -------------------- | ------------------------------- |
| `pnpm build`         | Build CLI only (fast, for dev)  |
| `pnpm build:release` | Build CLI + web (CI/packaging)  |
| `pnpm test`          | Run all tests                   |
| `pnpm test:unit`     | Unit tests only                 |
| `pnpm test:int`      | Integration tests only          |
| `pnpm test:e2e`      | CLI + Web e2e (Vitest + Playwright) |
| `pnpm lint:fix`      | Fix lint issues                 |
| `pnpm validate`      | lint:fix + format + typecheck + tsp (modifies files) |
| `pnpm dev:cli`       | Run CLI locally (ts-node)       |
| `pnpm dev:web`       | Start Next.js dev server        |
| `pnpm tsp:codegen`   | Compile TypeSpec + format output |
| `pnpm dev:storybook` | Start Storybook dev server       |
| `pnpm build:storybook` | Build Storybook for CI         |

**Pre-commit hooks:** Commits automatically run `pnpm generate` (TypeSpec codegen) and auto-stage generated files before lint-staged. Expect additional staged changes after commit.

**Test frameworks:** Vitest (unit/integration/CLI e2e) + Playwright (web e2e). **Node >= 22** required.

## Architecture

Clean Architecture — three core layers in `packages/core/src/`, plus presentation at repo root (dependencies point inward):

- `packages/core/src/domain/` — Core business logic, no external deps
- `packages/core/src/application/` — Use cases, output port interfaces
- `packages/core/src/infrastructure/` — External concerns: DB, agents, services
- `src/presentation/` — CLI, TUI, Web UI (separate from core package)

Repositories expose `findByIds()` and `listActive()` batch methods — prefer these over N+1 query patterns in polling and listing code.

See [clean-architecture](./docs/architecture/clean-architecture.md). Sub-directory CLAUDE.md files: `src/CLAUDE.md` (cross-platform rules), `src/presentation/web/CLAUDE.md` (web dev/prod modes, SSE architecture).

### Decomposed Services (Phase 3)

Several former god classes are now **facades** delegating to focused sub-services. Don't add logic to the facade — find the right sub-service:
- `InteractiveSessionService` → SessionStateManager, SessionBootSequence, TurnExecutor, ChatStateBuilder, SubscriberNotifier
- `GitPrService` → BranchDiscoveryService, PrCreationService, DiffAnalyzerService, CiStatusService, MergeStrategyService
- `FeatureCreateDrawer` → PromptSection, WorkflowOptionsSection, ParentFeatureCombobox, RepositoryCombobox + useFeatureCreateForm hook

### Presentation Layer Boundaries

- Infrastructure utilities accessed via `src/presentation/web/lib/core-utils.ts` (re-exports `isProcessAlive`, `computeWorktreePath`, `getShipitAiHomeDir`, `createDeploymentLogger`, `IS_WINDOWS`)
- Settings reads use `resolve<LoadSettingsUseCase>('LoadSettingsUseCase')` via DI — never import `getSettings()` directly
- `dev-server.ts` is bootstrap code — direct infrastructure access is correct there

## Security

- All web API routes go through localhost-only middleware (`src/presentation/web/middleware.ts`) — rejects non-localhost requests
- File-serving routes use `realpath()` before path containment checks to prevent symlink traversal
- Upload routes block `.env` files and extensionless files
- 500 errors use `apiError()` from `@/lib/api-helpers` — never expose raw `error.message` to clients

## Tooling

- **DI:** tsyringe (constructor injection with decorators)
- **pnpm patches:** Use `pnpm patch <pkg> → edit file → pnpm patch-commit <dir>` to create patches. Never hand-write patch files or edit node_modules directly — the lockfile won't match and CI fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Always commit `pnpm-lock.yaml` alongside patch changes.
- **Serena MCP:** Onboarded — use for semantic symbol navigation, find references, code overview
- **Code Review Graph:** Built — use for impact analysis, flow tracing, PR review context
- **IDE workflow linter:** `secrets.*` and dynamic `env.*` (set via `$GITHUB_ENV`) references in GitHub Actions workflows show "context access might be invalid" — these are false positives from static analysis.

## CI Patterns

- **Idempotent PR comments:** Use `peter-evans/find-comment@v4` + `create-or-update-comment@v5` with hidden HTML marker (`<!-- tag -->`) and `comment-id` + `edit-mode: replace`. The `comment-tag` input does NOT exist on this action.

## CI/CD Publishing

- **npm publishing:** Uses OIDC trusted publishing (no NPM_TOKEN). Requires `id-token: write` permission + `--provenance` flag. Trusted publisher configured on npmjs.com for `jrmatherly/shipit` → `ci.yml`.
- **Releases:** `RELEASE_TOKEN` (fine-grained PAT) required for semantic-release to push version commits. Scoped to `jrmatherly/shipit` with contents:write, issues:write, pull-requests:write.
- **gh CLI accounts:** Two accounts configured — `jrmatherly` (repo owner, needed for admin ops like deleting workflow runs) and `Jason-Matherly_aarons` (default active). Switch with `gh auth switch --user <name>`, always switch back after admin ops.

## Rules

Additional rules auto-loaded from `.claude/rules/`: [cicd.md](.claude/rules/cicd.md), [code-quality.md](.claude/rules/code-quality.md), [commit-conventions.md](.claude/rules/commit-conventions.md), [integrity.md](.claude/rules/integrity.md), [operational-discipline.md](.claude/rules/operational-discipline.md).

## Cross-Document Consistency

CLAUDE.md is the canonical reference. When updating commands, paths, scopes, or rules here, also update:
- `AGENTS.md` — generic agent instructions (`CURSOR.md` symlinks here)
- `CONTRIBUTING.md` — human contributor guide (Node version, pnpm version, directory paths)
- `CONTRIBUTING-AGENTS.md` — AI agent contributor guide (commit scopes, directory paths, co-author line)
- `.serena/memories/` — Serena onboarding memories (commands, checklist)

## Mandatory Rules

- **MANDATORY — TDD**: Write failing tests FIRST (RED → GREEN → REFACTOR). Every plan phase must define explicit TDD cycles. See [tdd-guide](./docs/development/tdd-guide.md).
- **MANDATORY — TypeSpec-first**: Domain models defined in `tsp/`. Run `pnpm tsp:codegen` to generate `packages/core/src/domain/generated/output.ts`. Never edit generated files. Emitter patched via `patches/@typespec-tools__emitter-typescript@0.3.0.patch` to map `utcDateTime` → `Date`. See [typespec-guide](./docs/development/typespec-guide.md).
- **MANDATORY — Agent resolution**: No component may hardcode an agent type. All resolution flows through `IAgentExecutorProvider`. See [AGENTS.md](./AGENTS.md).
- **MANDATORY — Storybook stories**: Every web UI component MUST have a colocated `.stories.tsx` file. Not yet enforced by pre-commit hooks — self-enforce.
- **MANDATORY — Spec-driven**: All features start with `/shep-kit:new-feature`. No implementation without a spec.
- **MANDATORY — Own every failure**: You are the ONLY developer. Every test failure, CI failure, and security scan failure is YOUR responsibility. NEVER use the words "unrelated", "pre-existing", or "not our changes". See [integrity rules](./.claude/rules/integrity.md).

## Commit Format

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

| Types | feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert |
| Scopes (recommended) | specs, shep-kit, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci |

Scopes are enforced at warning level by commitlint — commits succeed but prefer using listed scopes.

## Key Docs

| Topic                          | Doc                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Architecture overview          | [docs/architecture/overview.md](./docs/architecture/overview.md)                       |
| Domain models + field listings | [docs/api/domain-models.md](./docs/api/domain-models.md)                               |
| Repository pattern + DI        | [docs/architecture/repository-pattern.md](./docs/architecture/repository-pattern.md)   |
| Agent system                   | [docs/architecture/agent-system.md](./docs/architecture/agent-system.md)               |
| Settings service               | [docs/architecture/settings-service.md](./docs/architecture/settings-service.md)       |
| TypeSpec guide                 | [docs/development/typespec-guide.md](./docs/development/typespec-guide.md)             |
| Testing guide                  | [docs/development/tdd-guide.md](./docs/development/tdd-guide.md)                       |
| Implementation patterns        | [docs/development/implementation-guide.md](./docs/development/implementation-guide.md) |
| CI/CD + Docker                 | [docs/development/cicd.md](./docs/development/cicd.md)                                 |
| Adding agents                  | [docs/development/adding-agents.md](./docs/development/adding-agents.md)               |
| CLI architecture               | [docs/cli/architecture.md](./docs/cli/architecture.md)                                 |
| TUI architecture               | [docs/tui/architecture.md](./docs/tui/architecture.md)                                 |
| Web UI architecture            | [docs/ui/architecture.md](./docs/ui/architecture.md)                                   |
| pnpm workspaces + setup        | [docs/development/setup.md](./docs/development/setup.md)                               |
| Tech debt remediation plan     | [.scratchpad/plans/technical-debt-remediation-plan.md](./.scratchpad/plans/technical-debt-remediation-plan.md) |
| Security middleware            | [src/presentation/web/middleware.ts](./src/presentation/web/middleware.ts)              |

## Naming Conventions (Post-Rename)

- npm scope: `@shipit-ai/` — binary: `shipit-ai` — data dir: `~/.shipit-ai/`
- Env vars: `SHIPIT_AI_*` prefix (e.g. `SHIPIT_AI_HOME`), Next.js: `NEXT_PUBLIC_SHIPIT_AI_*`
- TypeSpec namespace: `ShipitAI.Domain` — `@module ShipitAI.*`
- LocalStorage: `shipit-ai-*` prefix — DOM events: `shipit-ai:*` prefix
- CSS classes: `shipit-ai-*` prefix — test IDs: `data-testid="shipit-ai-*"`
- Container registry: `ghcr.io/jrmatherly/shipit`
- E2E test target repo: `jrmatherly/shipped`
- `/shep-kit` skill names: **kept as-is** (internal developer workflow, not user-facing)

## Tech Debt

Active remediation plan: [`.scratchpad/plans/technical-debt-remediation-plan.md`](./.scratchpad/plans/technical-debt-remediation-plan.md) (74 findings across 5 dimensions). Phases 0-3 complete (security, quick wins, architecture repair, god class decomposition). Phase 4 (test coverage) in progress (6/8 done). Check the plan before starting new work that touches affected areas.

## Testing Patterns

- **Shared factories:** Use `import { createMockFeature, createMockAgentRun, createMockRepository, createMockAgentSession } from '@tests/factories/index.js'` — don't create inline mock factories
- **Settings factory:** Use `createDefaultSettings()` from `@shipit-ai/core/domain/factories/settings-defaults.factory` for Settings mocks
- **DI mocking:** Mock `@/lib/server-container` with `vi.mock('@/lib/server-container', () => ({ resolve: ... }))` for server action tests
- **TypeSpec dates:** All 31 date/timestamp fields are `Date` objects (not strings). Use `new Date('...')` in test mocks, not ISO strings.

## Working Practices
### 1. Self-Improvement Loop
- After ANY correction from the user: update `LESSONS.md` (project root) with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
- Keep lessons short and concise

### 2. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it
