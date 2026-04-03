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

## DI
- tsyringe with constructor injection
- Container modules in `packages/core/src/infrastructure/di/modules/`
- 8 domain modules: database, repositories, services, agents, notifications, use-cases, interactive, web-tokens

## Testing
- Shared factories: `tests/factories/` (Feature, AgentRun, Repository, AgentSession)
- Settings factory: `createDefaultSettings()` from domain
- TypeSpec dates: all 31 fields are `Date` objects (emitter patched)
- 5677 tests across 395 files
