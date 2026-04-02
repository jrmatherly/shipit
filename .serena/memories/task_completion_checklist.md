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

## 6. Storybook (if web components changed)
- Ensure `.stories.tsx` file exists for any new/modified web component
- Run `pnpm dev:storybook` to verify stories render correctly

## 7. Commit
- Use conventional commit format: `<type>(<scope>): <subject>`
- Husky pre-commit hooks will run automatically
- commitlint validates commit message format
