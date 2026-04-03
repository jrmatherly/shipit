---
name: mock-factory
description: Generate centralized mock factories for port interfaces, reducing duplicate mocks across 30+ test files
user_invocable: true
---

# Mock Factory Generator

Generate a centralized mock factory function for a given port interface, to be placed in `tests/helpers/`.

## When to Use

- When creating a new port interface that tests will need to mock
- When you notice the same mock object pattern duplicated across 3+ test files
- After adding a method to an existing interface and needing to update all mocks

## Steps

1. **Identify the interface**: Read the target interface from `packages/core/src/application/ports/output/`
2. **Find existing mocks**: Use Serena `find_referencing_symbols` or grep to find all test files that mock this interface
3. **Generate the factory**: Create a factory function in `tests/helpers/` that:
   - Returns a complete mock implementing all interface methods with `vi.fn()`
   - Accepts optional overrides for any method
   - Uses reasonable defaults (empty arrays for list methods, null for find methods)

## Factory Template

```typescript
import { vi } from 'vitest';
import type { IExampleRepository } from '@shipit-ai/core/application/ports/output/repositories/example-repository.interface';

export function createMockExampleRepository(
  overrides: Partial<Record<keyof IExampleRepository, ReturnType<typeof vi.fn>>> = {}
): IExampleRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

## File Naming

- Factory file: `tests/helpers/mock-{interface-name}.helper.ts`
- Example: `IFeatureRepository` → `tests/helpers/mock-feature-repository.helper.ts`
- An existing pattern exists at `tests/helpers/mock-repository.helper.ts` (for MockSettingsRepository)

## After Generating

1. Show the list of test files currently duplicating this mock (from step 2)
2. Offer to refactor them to use the new factory
3. Run `pnpm typecheck` to verify all mocks satisfy the interface

## Key Interfaces That Need Factories (by duplication count)

| Interface | Files duplicating mock | Priority |
|-----------|----------------------|----------|
| `IFeatureRepository` | ~33 | HIGH |
| `IAgentRunRepository` | ~15 | HIGH |
| `IWorktreeService` | ~15 | HIGH |
| `IGitPrService` | ~10 | MEDIUM |
| `IPhaseTimingRepository` | ~8 | MEDIUM |
| `IRepositoryRepository` | ~6 | MEDIUM |
| `ISettingsRepository` | Already has factory | Done |
