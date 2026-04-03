---
name: use-case-tdd
description: Scaffold a new use case with TDD RED-GREEN-REFACTOR cycle, DI registration, and test file
user_invocable: true
---

# Use Case TDD Scaffold

Scaffold a new use case class following strict TDD discipline: write the failing test first, then implement minimally, then refactor.

## When to Use

- When adding a new business operation to the application layer
- When a presentation layer needs new functionality (the use case is the API boundary)
- When refactoring business logic out of a presentation layer into a proper use case

## Prerequisites

Before starting, identify:
1. **Use case name** — What operation does it perform? (e.g., `CreateFeature`, `ListAgentRuns`)
2. **Input** — What data does it need? (types from domain or simple primitives)
3. **Output** — What does it return? (domain entities, DTOs, or void)
4. **Dependencies** — Which port interfaces does it need? (repositories, services)

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Use case file | `kebab-case.ts` | `create-feature.ts` |
| Use case class | `PascalCaseUseCase` | `CreateFeatureUseCase` |
| Test file | `kebab-case.test.ts` | `create-feature.test.ts` |
| Use case dir | `packages/core/src/application/use-cases/` | — |
| Test dir | `tests/unit/application/use-cases/` | — |
| DI token | Interface name string | `'IFeatureRepository'` |

## Step 1: RED — Write Failing Tests First

Create the test file **before** the implementation:

```typescript
// tests/unit/application/use-cases/create-feature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFeatureUseCase } from '@/application/use-cases/create-feature';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface';

describe('CreateFeatureUseCase', () => {
  let useCase: CreateFeatureUseCase;
  let mockFeatureRepo: IFeatureRepository;

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByIds: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      listActive: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new CreateFeatureUseCase(mockFeatureRepo);
  });

  describe('execute', () => {
    it('should create a feature with valid input', async () => {
      const input = { name: 'my-feature', repoPath: '/tmp/repo' };

      await useCase.execute(input);

      expect(mockFeatureRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'my-feature' }),
      );
    });

    it('should throw if name is empty', async () => {
      const input = { name: '', repoPath: '/tmp/repo' };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw if feature already exists', async () => {
      mockFeatureRepo.findById.mockResolvedValue({ id: '1', name: 'existing' });
      const input = { name: 'existing', repoPath: '/tmp/repo' };

      await expect(useCase.execute(input)).rejects.toThrow();
    });
  });
});
```

Run the test — it MUST fail (the use case doesn't exist yet):

```bash
pnpm test:single tests/unit/application/use-cases/create-feature.test.ts
```

Confirm you see import/compilation errors. This is RED.

## Step 2: GREEN — Minimal Implementation

Create the use case with just enough code to pass all tests:

```typescript
// packages/core/src/application/use-cases/create-feature.ts
import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../ports/output/repositories/feature-repository.interface';

export interface CreateFeatureInput {
  name: string;
  repoPath: string;
}

@injectable()
export class CreateFeatureUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepository: IFeatureRepository,
  ) {}

  async execute(input: CreateFeatureInput): Promise<void> {
    if (!input.name) {
      throw new Error('Feature name is required');
    }

    const existing = await this.featureRepository.findById(input.name);
    if (existing) {
      throw new Error(`Feature "${input.name}" already exists`);
    }

    await this.featureRepository.create({
      name: input.name,
      repoPath: input.repoPath,
    });
  }
}
```

Run the test again — all tests MUST pass:

```bash
pnpm test:single tests/unit/application/use-cases/create-feature.test.ts
```

This is GREEN.

## Step 3: Register in DI Container

Add the binding in `packages/core/src/infrastructure/di/container.ts`:

```typescript
import { CreateFeatureUseCase } from '@/application/use-cases/create-feature';

container.register(CreateFeatureUseCase, { useClass: CreateFeatureUseCase });
```

Use cases are typically registered as themselves (not behind an interface) since they're the API boundary.

## Step 4: REFACTOR

Now clean up:

- Extract input/output types to separate files if they're complex
- Move validation logic to domain value objects if it's reusable
- Extract domain logic to domain services if it's not use-case-specific
- Check if a mock factory exists for the dependencies — if not and 3+ tests mock it, create one with `/mock-factory`

## Step 5: Verify

```bash
pnpm test:single tests/unit/application/use-cases/create-feature.test.ts  # Tests pass
pnpm typecheck                                                              # Types clean
pnpm lint:fix                                                               # Lint clean
```

## Checklist

- [ ] Test file created BEFORE implementation (RED phase)
- [ ] Tests cover: happy path, validation errors, edge cases
- [ ] Use case uses `@injectable()` and `@inject()` decorators
- [ ] All dependencies are port interfaces (no infrastructure imports)
- [ ] DI container binding added
- [ ] Input/output types defined (inline or separate file)
- [ ] `pnpm typecheck` passes
- [ ] All tests pass
