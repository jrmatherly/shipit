# Task Completion Checklist

When a coding task is completed, run through these steps:

## 1. Type Check
```bash
pnpm typecheck
```

## 2. Lint & Format
```bash
pnpm lint:fix
pnpm format
```

## 3. Run Tests
```bash
pnpm test:unit      # Always run unit tests
pnpm test:int       # Run if infrastructure/integration changes
pnpm test:e2e       # Run if CLI/web behavior changed
```

## 4. TypeSpec (if domain models changed)
```bash
pnpm tsp:compile    # Regenerate domain types
```

## 5. Full Validation (recommended before commits)
```bash
pnpm validate       # lint:fix + format + typecheck + tsp:compile
```

## 5a. Coverage Thresholds (enforced by vitest)
Tests must meet these minimum coverage gates:
- Lines: 40% | Functions: 35% | Branches: 30% | Statements: 40%

## 6. Storybook (if web components changed)
- Ensure `.stories.tsx` file exists for any new/modified web component
- Run `pnpm dev:storybook` to verify stories render correctly

## 7. Commit
- Use conventional commit format: `<type>(<scope>): <subject>`
- Husky pre-commit hooks run automatically:
  1. `pnpm generate` (TypeSpec + JSON schema generation)
  2. `git add` generated files (apis/json-schema/, domain/generated/)
  3. `lint-staged`: per-file ESLint + Prettier + typecheck on TS; tsp:compile on .tsp
- commitlint validates commit message format
- Pre-commit may produce generated file changes requiring a follow-up commit
