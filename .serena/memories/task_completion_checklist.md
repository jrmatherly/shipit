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
pnpm test:unit      # Always run unit tests (5,755 tests)
pnpm test:int       # Run if infrastructure/integration changes (578 tests)
pnpm test:e2e       # Run if CLI/web behavior changed
```

## 4. TypeSpec (if domain models changed)
```bash
pnpm tsp:codegen    # Compile TypeSpec + format generated output
```
**Note:** Use `tsp:codegen` not `tsp:compile` — the latter skips the prettier step and leaves `output.ts` in a drifted double-quote state.

## 5. Full Validation (recommended before commits)
```bash
pnpm validate       # lint:fix + format + typecheck + tsp:codegen
```
As of commit `bf44c27e` (2026-04-04), `pnpm validate` ends with `tsp:codegen` (not `tsp:compile`), so `output.ts` stays in the committed format after validation.

## 5a. Coverage Thresholds (enforced by vitest)
Tests must meet these minimum coverage gates:
- Lines: 40% | Functions: 35% | Branches: 30% | Statements: 40%

## 6. Editorial Design Token Verification (if UI styles changed)
- Verify `.editorial-shadow` renders correctly (subtle layered shadow, not default shadcn `shadow`)
- Verify `.glass-blur` renders correctly (semi-transparent backdrop blur in both light and dark)
- Check Stitch alias tokens (`--color-midnight`, `--color-sky`, `--color-surface-*`) haven't drifted from `globals.css` definitions
- Spot-check in Storybook: Card, ToolCard, Drawer components should reflect editorial palette
- If tokens look wrong, compare `globals.css` values against `.scratchpad/stitch/shipit-developer-portal/` prototype

## 7. Storybook (if web components changed)
- Ensure `.stories.tsx` file exists for any new/modified web component
- Run `pnpm dev:storybook` to verify stories render correctly
- As of Storybook 10: story `Meta`/`StoryObj` types come from `@storybook/react-vite`, not `@storybook/react` (which is removed)
- Test utilities (`fn`, `expect`, `within`, `userEvent`, `waitFor`) come from `storybook/test` (bare `storybook` package, not `@storybook/test`)

## 8. Commit
- Use conventional commit format: `<type>(<scope>): <subject>`
- Husky pre-commit hooks run automatically:
  1. `pnpm generate` (TypeSpec codegen via `tsp:codegen`)
  2. `git add` generated files (apis/json-schema/, domain/generated/)
  3. `lint-staged`: per-file ESLint + Prettier + typecheck on TS; tsp:compile on .tsp
- commitlint validates commit message format
- Pre-commit may produce generated file changes requiring a follow-up commit

## 9. Smoke Test Dev UI (before pushing dep upgrades)
```bash
pnpm dev:cli ui     # Should start and report "Server ready at http://localhost:4050"
```
This is the canary for import/module-resolution issues — especially relevant for TypeSpec or Vite upgrades.
