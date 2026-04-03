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

## Security

- All web API routes go through localhost-only middleware (`src/presentation/web/middleware.ts`) — rejects non-localhost requests
- File-serving routes use `realpath()` before path containment checks to prevent symlink traversal
- Upload routes block `.env` files and extensionless files
- 500 errors use `apiError()` from `@/lib/api-helpers` — never expose raw `error.message` to clients

## Tooling

- **DI:** tsyringe (constructor injection with decorators)
- **Serena MCP:** Onboarded — use for semantic symbol navigation, find references, code overview
- **Code Review Graph:** Built — use for impact analysis, flow tracing, PR review context

## Mandatory Rules

- **MANDATORY — TDD**: Write failing tests FIRST (RED → GREEN → REFACTOR). Every plan phase must define explicit TDD cycles. See [tdd-guide](./docs/development/tdd-guide.md).
- **MANDATORY — TypeSpec-first**: Domain models defined in `tsp/`. Run `pnpm tsp:codegen` to generate `packages/core/src/domain/generated/output.ts`. Never edit generated files. See [typespec-guide](./docs/development/typespec-guide.md).
- **MANDATORY — Agent resolution**: No component may hardcode an agent type. All resolution flows through `IAgentExecutorProvider`. See [AGENTS.md](./AGENTS.md).
- **MANDATORY — Storybook stories**: Every web UI component MUST have a colocated `.stories.tsx` file. Commits without stories will be rejected.
- **MANDATORY — Spec-driven**: All features start with `/shep-kit:new-feature`. No implementation without a spec.
- **MANDATORY — Own every failure**: You are the ONLY developer. Every test failure, CI failure, and security scan failure is YOUR responsibility. NEVER use the words "unrelated", "pre-existing", or "not our changes". See [integrity rules](./.claude/rules/integrity.md).

## Commit Format

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

| Types | feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert |
| Scopes | specs, shep-kit, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci |

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

Active remediation plan: [`.scratchpad/plans/technical-debt-remediation-plan.md`](./.scratchpad/plans/technical-debt-remediation-plan.md) (74 findings across 5 dimensions). Phase 0 (Security) and Phase 1 (Quick Wins) are complete. Check the plan before starting new work that touches affected areas.

## General
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
