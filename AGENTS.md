# AGENTS.md

Guidance for AI coding agents (Cursor, Windsurf, Copilot, etc.) working in this repository.

## Project

`@shipit-ai/cli` — Autonomous AI Native SDLC Platform. Users run `shipit-ai` in a repo to gather requirements via AI, generate plans, and execute implementation autonomously.

## Spec Workflow

**All feature work MUST begin with a spec.** See [spec-driven-workflow](./docs/development/spec-driven-workflow.md).

Specs live in `specs/NNN-feature-name/`. **Edit YAML only — Markdown is auto-generated.**

## Commands

| Command               | Purpose                             |
| --------------------- | ----------------------------------- |
| `pnpm build`          | Build CLI only (fast, for dev)      |
| `pnpm build:release`  | Build CLI + web (CI/packaging)      |
| `pnpm test`           | Run all tests                       |
| `pnpm test:unit`      | Unit tests only                     |
| `pnpm test:int`       | Integration tests only              |
| `pnpm test:e2e`       | CLI + Web e2e (Vitest + Playwright) |
| `pnpm lint:fix`       | Fix lint issues                     |
| `pnpm validate`       | lint:fix + format + typecheck + tsp (modifies files) |
| `pnpm dev:cli`        | Run CLI locally (ts-node)           |
| `pnpm dev:web`        | Start Next.js dev server            |
| `pnpm tsp:codegen`    | Compile TypeSpec + format output    |
| `pnpm dev:storybook`  | Start Storybook dev server          |
| `pnpm build:storybook`| Build Storybook for CI              |

## Architecture

Clean Architecture — three core layers in `packages/core/src/`, plus presentation at repo root (dependencies point inward):

- `packages/core/src/domain/` — Core business logic, no external deps
- `packages/core/src/application/` — Use cases, output port interfaces
- `packages/core/src/infrastructure/` — External concerns: DB, agents, services
- `src/presentation/` — CLI, TUI, Web UI (separate from core package)

See [clean-architecture](./docs/architecture/clean-architecture.md).

### Decomposed Services

Several former god classes are now **facades** delegating to focused sub-services. Don't add logic to the facade — find the right sub-service:
- `InteractiveSessionService` → SessionStateManager, SessionBootSequence, TurnExecutor, ChatStateBuilder, SubscriberNotifier
- `GitPrService` → BranchDiscoveryService, PrCreationService, DiffAnalyzerService, CiStatusService, MergeStrategyService
- `FeatureCreateDrawer` → PromptSection, WorkflowOptionsSection, ParentFeatureCombobox, RepositoryCombobox + useFeatureCreateForm hook

## Security

- All web API routes go through localhost-only proxy (`src/presentation/web/proxy.ts`) — rejects non-localhost requests
- Path containment via `src/presentation/web/lib/path-sanitizers.ts` — every route/server action touching a user-influenced filesystem path MUST use `realpathOrNull` / `isWithinRoot` / `realpathWithinAllowedRoots` (+ async variants). Never inline `realpath + startsWith`. Routes that return paths to clients keep `displayPath` (user-typed) vs `physicalPath` (realpath-sanitized) separate.
- Upload routes block `.env` files and extensionless files
- 500 errors use `apiError()` from `@/lib/api-helpers` — never expose raw `error.message` to clients

## Mandatory Rules

- **MANDATORY — TDD**: Write failing tests FIRST (RED → GREEN → REFACTOR). Every plan phase must define explicit TDD cycles. See [tdd-guide](./docs/development/tdd-guide.md).
- **MANDATORY — TypeSpec-first**: Domain models defined in `tsp/`. Run `pnpm tsp:codegen` to generate `packages/core/src/domain/generated/output.ts`. Never edit generated files. See [typespec-guide](./docs/development/typespec-guide.md).
- **MANDATORY — Agent resolution**: No component may hardcode an agent type. All resolution flows through `IAgentExecutorProvider`. See [agent-system](./docs/architecture/agent-system.md).
- **MANDATORY — Storybook stories**: Every web UI component MUST have a colocated `.stories.tsx` file. Not yet enforced by pre-commit hooks — self-enforce.
- **MANDATORY — Spec-driven**: All features start with a spec. No implementation without a spec.

## Commit Format

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

| Types | feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert |
| Scopes (recommended) | specs, shipit-kit, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci |

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

## Testing Patterns

- **Shared factories:** Use `import { createMockFeature, createMockAgentRun, createMockRepository, createMockAgentSession } from '@tests/factories/index.js'` — don't create inline mock factories
- **Settings factory:** Use `createDefaultSettings()` from `@shipit-ai/core/domain/factories/settings-defaults.factory` for Settings mocks
- **DI mocking:** Mock `@/lib/server-container` with `vi.mock('@/lib/server-container', () => ({ resolve: ... }))` for server action tests
- **TypeSpec dates:** All 31 date/timestamp fields are `Date` objects (not strings). Use `new Date('...')` in test mocks, not ISO strings.

**Test frameworks:** Vitest (unit/integration/CLI e2e) + Playwright (web e2e). **Node >= 22** required.

## Tech Debt

Active remediation plan: [`.scratchpad/plans/technical-debt-remediation-plan.md`](./.scratchpad/plans/technical-debt-remediation-plan.md) (74 findings across 5 dimensions). Phases 0-3 complete (security, quick wins, architecture repair, god class decomposition). Phase 4 (test coverage) in progress (6/8 done). Check the plan before starting new work that touches affected areas.

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
