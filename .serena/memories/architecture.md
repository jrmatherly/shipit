# Architecture

## Clean Architecture (4 layers, dependencies point inward)

All core logic lives in `packages/core/src/`:

1. **`domain/`** — Core business logic, no external deps
   - `generated/` — TypeSpec-generated models (NEVER edit manually)
   - `errors/` — Domain error types
   - `factories/` — Entity factories
   - `value-objects/` — Value object definitions
   - `lifecycle-gates.ts` — Lifecycle gate logic

2. **`application/`** — Use cases and port interfaces
   - `use-cases/` — Application use cases (the ONLY entry point for presentation layers)
   - `ports/` — Output port interfaces (implemented by infrastructure)
   - `services/` — Application-level services

3. **`infrastructure/`** — External concerns
   - `di/` — Dependency injection container setup (tsyringe)
   - `repositories/` — Repository implementations
   - `persistence/` — Database layer (better-sqlite3)
   - `services/` — Infrastructure services (agents, tools, etc.)

4. **Presentation** (`src/presentation/`):
   - `cli/` — Command-line interface
   - `tui/` — Terminal UI
   - `web/` — Next.js web application

## Key Rules
- Presentation layers are THIN — UI only, no business logic
- Use cases are the API boundary between presentation and core
- No direct infrastructure imports in application or presentation
- All agent interactions go through `IAgentExecutorProvider` (no hardcoded agent types)
- Path aliases:
  - `@shipit-ai/core` / `@shipit-ai/core/*` → `packages/core/src/`
  - `@/application/*`, `@/infrastructure/*`, `@/domain/*` → core layer shortcuts
  - `@domain/generated/*` → `packages/core/src/domain/generated/`
  - `@/app/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/types/*` → web layer shortcuts
  - `@/*` → `src/*`, `@cli/*` → `src/*`
  - `@tests/*` → `tests/*`
