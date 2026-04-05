# Suggested Commands

## Development
| Command | Purpose |
|---------|---------|
| `pnpm dev:cli` | Run CLI locally via tsx |
| `pnpm dev:cli ui` | Start web UI via CLI (port 4050, production-mode bootstrap) |
| `pnpm dev:web` | Start Next.js dev server directly (port 3000, dev-mode) |
| `pnpm dev` | Alias for `dev:web` |
| `pnpm dev:storybook` | Start Storybook on port 6006 |
| `pnpm cli` | Direct CLI invocation |

## Building
| Command | Purpose |
|---------|---------|
| `pnpm build` | Build CLI only (fast, for dev) |
| `pnpm build:cli` | Explicit CLI build |
| `pnpm build:release` | Build CLI + web (CI/packaging) |
| `pnpm build:web` | Build web UI only |
| `pnpm build:web:prod` | Production web build |
| `pnpm build:storybook` | Build static Storybook |

## Testing
| Command | Purpose |
|---------|---------|
| `pnpm test` | Run all tests (unit + integration + e2e) |
| `pnpm test:unit` | Unit tests only (vitest, ~5,755 tests across 399 files) |
| `pnpm test:int` | Integration tests only (vitest, ~578 tests) |
| `pnpm test:e2e` | E2E tests (builds CLI first, then runs vitest e2e + playwright) |
| `pnpm test:e2e:cli` | CLI E2E tests only |
| `pnpm test:e2e:tui` | TUI E2E tests only |
| `pnpm test:e2e:web` | Web E2E tests only (playwright) |
| `pnpm test:e2e:scripts` | Script E2E tests |
| `pnpm test:manual` | Run manual test suites |
| `pnpm test:manual:watch` | Manual tests in watch mode |
| `pnpm test:single <path>` | Run a single test file |
| `pnpm test:watch` | Watch mode |

## Code Quality
| Command | Purpose |
|---------|---------|
| `pnpm lint` | Run ESLint (zero warnings) |
| `pnpm lint:fix` | Fix lint issues |
| `pnpm lint:web` | Lint web workspace only |
| `pnpm lint:web:fix` | Fix web lint issues |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |
| `pnpm format:web` | Format web workspace |
| `pnpm format:web:check` | Check web formatting |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm typecheck:web` | Typecheck web workspace only |
| `pnpm validate` | Full validation: lint:fix + format + typecheck + **tsp:codegen** (writes files) |

## TypeSpec
| Command | Purpose |
|---------|---------|
| `pnpm tsp:codegen` | **Preferred.** Compile TypeSpec + run prettier on `packages/core/src/domain/generated/`. This is what produces the committed form of `output.ts`. |
| `pnpm tsp:compile` | Compile TypeSpec only (runs all emitters from tspconfig.yaml). **Leaves `output.ts` in drifted double-quote form** — do not use standalone; prefer `tsp:codegen`. |
| `pnpm tsp:format` | Format .tsp source files |
| `pnpm tsp:watch` | Watch mode for TypeSpec compilation |

## Specs
| Command | Purpose |
|---------|---------|
| `pnpm spec:validate` | Validate spec YAML files |
| `pnpm spec:generate-md` | Generate Markdown from spec YAML |

## Workspace devDeps Gotcha
- Use `pnpm add -Dw <pkg>` (with `-w` flag) for root devDeps in this monorepo. Without `-w`, pnpm errors out.
- Use `pnpm --filter @shipit-ai/<workspace> add <pkg>` for workspace-scoped deps.

## Dev Server Recovery
- If `pnpm dev:cli ui` reports "Another next dev server is already running" against a dead PID: `rm -rf src/presentation/web/.next` clears Next.js's cached process state.
