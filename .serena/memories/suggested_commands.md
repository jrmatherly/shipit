# Suggested Commands

## Development
| Command | Purpose |
|---------|---------|
| `pnpm dev:cli` | Run CLI locally via tsx |
| `pnpm dev:web` | Start Next.js dev server |
| `pnpm dev:storybook` | Start Storybook on port 6006 |

## Building
| Command | Purpose |
|---------|---------|
| `pnpm build` | Build CLI only (fast, for dev) |
| `pnpm build:release` | Build CLI + web (CI/packaging) |
| `pnpm build:web` | Build web UI only |
| `pnpm build:storybook` | Build static Storybook |

## Testing
| Command | Purpose |
|---------|---------|
| `pnpm test` | Run all tests (unit + integration + e2e) |
| `pnpm test:unit` | Unit tests only (vitest) |
| `pnpm test:int` | Integration tests only (vitest) |
| `pnpm test:e2e` | E2E tests (builds CLI first, then runs vitest e2e + playwright) |
| `pnpm test:e2e:web` | Web E2E tests only (playwright) |
| `pnpm test:single <path>` | Run a single test file |
| `pnpm test:watch` | Watch mode |

## Code Quality
| Command | Purpose |
|---------|---------|
| `pnpm lint` | Run ESLint (zero warnings) |
| `pnpm lint:fix` | Fix lint issues |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm validate` | All checks: lint:fix + format + typecheck + tsp:compile |

## TypeSpec
| Command | Purpose |
|---------|---------|
| `pnpm tsp:compile` | Compile TypeSpec → generates `packages/core/src/domain/generated/output.ts` |
| `pnpm tsp:codegen` | Compile + format generated code |
| `pnpm tsp:format` | Format .tsp files |
| `pnpm tsp:watch` | Watch mode for TypeSpec compilation |

## Specs
| Command | Purpose |
|---------|---------|
| `pnpm spec:validate` | Validate spec YAML files |
| `pnpm spec:generate-md` | Generate Markdown from spec YAML |

## System Utils (macOS/Darwin)
| Command | Purpose |
|---------|---------|
| `git` | Version control |
| `ls` | List directory contents |
| `find` | Find files |
| `grep` | Search file contents |
| `cat` | Read files |
| `pbcopy` / `pbpaste` | Clipboard (macOS) |
