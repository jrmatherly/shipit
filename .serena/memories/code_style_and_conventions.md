# Code Style and Conventions

## Language & Module System
- TypeScript with strict mode enabled
- ES2022 target, ESNext modules (ESM — `"type": "module"`)
- Decorators enabled (experimentalDecorators + emitDecoratorMetadata) for tsyringe DI

## Formatting & Linting
- **Prettier** for formatting (run via `pnpm format`)
- **ESLint 9** flat config with typescript-eslint, react, react-hooks, next, tailwindcss, storybook plugins
- Zero warnings policy (`--max-warnings 0`)

## Naming Conventions
- Files: kebab-case (e.g., `agent-executor-provider.ts`)
- Interfaces: `I` prefix (e.g., `IAgentExecutorProvider`)
- Classes: PascalCase
- Functions/methods: camelCase
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for config objects
- Enums: PascalCase (defined in TypeSpec)

## Commit Messages
- Conventional Commits format: `<type>(<scope>): <subject>`
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Scopes: specs, shipit-kit, cli, tui, web, api, domain, agents, deployment, tsp, deps, config, dx, release, ci
- Subject: lowercase, imperative, no period, ≤72 chars
- Enforced by commitlint + husky

## Design Patterns
- **Clean Architecture**: strict layer separation, dependencies point inward
- **Dependency Injection**: tsyringe container, constructor injection
- **Repository Pattern**: data access abstracted behind interfaces
- **Use Case Pattern**: all business operations exposed as use case classes
- **Port/Adapter**: infrastructure implements port interfaces defined in application layer
- **TypeSpec-first**: domain models defined in `.tsp` files, generated to TypeScript

## Mandatory Practices
- **TDD**: RED → GREEN → REFACTOR cycle for all features
- **Storybook stories**: every web UI component must have a colocated `.stories.tsx`
- **Spec-driven development**: all features start with a spec in `specs/NNN-feature-name/`
- No magic values, no singletons outside infrastructure bootstrapping
- No direct infrastructure imports from application or presentation layers
