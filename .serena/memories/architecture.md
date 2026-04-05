# Architecture Overview

Clean Architecture with 3 core layers + presentation:
- `packages/core/src/domain/` — Business logic, no external deps
- `packages/core/src/application/` — Use cases, port interfaces
- `packages/core/src/infrastructure/` — DB, agents, services
- `src/presentation/` — CLI, TUI, Web UI

## Decomposed Services (Phase 3, 2026-04-03)
Former god classes are now **facades** delegating to focused sub-services:
- InteractiveSessionService → SessionStateManager, SessionBootSequence, TurnExecutor, ChatStateBuilder, SubscriberNotifier
- GitPrService → BranchDiscoveryService, PrCreationService, DiffAnalyzerService, CiStatusService, MergeStrategyService
- FeatureCreateDrawer → PromptSection, WorkflowOptionsSection, ParentFeatureCombobox, RepositoryCombobox + useFeatureCreateForm

## Presentation Boundaries
- Infrastructure utilities via `src/presentation/web/lib/core-utils.ts`
- Settings via `resolve<LoadSettingsUseCase>('LoadSettingsUseCase')` — never `getSettings()` directly
- `dev-server.ts` is bootstrap code — direct infrastructure OK

## DI Registration Patterns
- tsyringe with constructor injection
- Container modules in `packages/core/src/infrastructure/di/modules/`
- 8 domain modules: database, repositories, services, agents, notifications, use-cases, interactive, web-tokens
- **Services:** `registerSingleton<IInterface>('StringToken', Impl)` in `services.module.ts` — resolved by string token
- **Use cases:** `registerSingleton(UseCase)` in `use-cases.module.ts` — resolved by class constructor token
- **Server actions:** Use `resolve<T>('StringToken')` from `@/lib/server-container`
- **New ports:** Must add barrel export to `ports/output/services/index.ts`

## Tool Metadata System
- JSON files in `packages/core/src/infrastructure/services/tool-installer/tools/` are auto-discovered by filename
- Tags: strict union `('ide' | 'cli-agent' | 'vcs' | 'terminal' | 'shell')[]`
- Helpers: `getIdeEntries()`, `getTerminalEntries()`, `getShellEntries()`
- 21 tool definitions: 5 IDEs, 4 CLI agents, 2 VCS, 5 terminals, 4 shells, 1 system terminal

## Environment Detection (2026-04-04)
- `IEnvironmentDetectorService` port + `EnvironmentDetectorServiceImpl`
- Detects: `$SHELL`, `$EDITOR/$VISUAL`, `$TERM_PROGRAM` (with `$TERM` fallback for Alacritty/Kitty)
- `InitializeSettingsUseCase` uses detected defaults on first-time init
- Settings dropdowns show availability badges ("Installed"/"Not Installed")
- Agent picker shows availability badges and disables unavailable agents

## Testing
- Shared factories: `tests/factories/` (Feature, AgentRun, Repository, AgentSession)
- Settings factory: `createDefaultSettings(overrides?)` from domain — accepts optional `{ defaultEditor?, shellPreference?, terminalPreference? }`
- Storybook mocks: new server actions MUST have mocks in `.storybook/mocks/app/actions/`
- i18n parity: adding keys to `en/web.json` requires all 7 other locale files or tests fail
- TypeSpec dates: all 31 fields are `Date` objects (emitter patched)
- 5,755+ tests across 399+ files

## Security
- Localhost-only proxy at `src/presentation/web/proxy.ts` (renamed from middleware.ts in Next.js 16)
- Web API routes string-token DI via `web-tokens.module.ts` (Turbopack can't resolve .js→.ts imports)
- Canonical path-containment helper at `src/presentation/web/lib/path-sanitizers.ts` — `realpathOrNull`, `isWithinRoot`, `realpathWithinAllowedRoots` (+ async variants). Every route/server action that touches a user-influenced filesystem path MUST route through these helpers. Inline `realpath + startsWith` is banned — prior copies caused 8 CodeQL `js/path-injection` alerts and a TOCTOU bug in `api/directory/list/route.ts`.
- Display-vs-physical path split: routes that RETURN paths to the client keep `displayPath` (user-typed, echoed in response) and `physicalPath` (realpath-sanitized, used for every filesystem sink). Mismatching them causes 404s on macOS where `/tmp` resolves to `/private/tmp` via symlink. See `api/directory/list/route.ts` for the canonical implementation.
- 26 CodeQL alerts (2 critical command-injection, 10 high path-injection/ReDoS/incomplete-sanitization, 14 medium) closed in commits `e5467f11` + `a6ac80be`. `.github/workflows/ci.yml` and `pr-check.yml` use top-level `permissions: {}` deny-all with per-job least-privilege overrides.
