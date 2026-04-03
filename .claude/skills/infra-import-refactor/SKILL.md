---
name: infra-import-refactor
description: Refactor direct infrastructure imports into port interfaces with dependency injection
user_invocable: true
---

# Infrastructure Import Refactoring Assistant

Guide the refactoring of direct infrastructure imports in application/presentation layers into proper port interfaces with tsyringe dependency injection.

## When to Use

- When `check-layer-violations.sh` hook flags an infrastructure import
- When you notice `from.*infrastructure/` imports in application or presentation code
- During tech debt cleanup of Clean Architecture violations
- Before adding new functionality to code that has existing violations

## Steps

### 1. Find All Violations

Scan for direct infrastructure imports in forbidden layers:

```bash
# Application layer violations
grep -rn "from.*infrastructure/" packages/core/src/application/ | grep -v "import type" | grep -v "di/container"

# Presentation layer violations
grep -rn "from.*infrastructure/" src/presentation/ | grep -v "import type" | grep -v "di/container" | grep -v "server-container"
```

### 2. Categorize Each Violation

For each import, determine the category:

| Category | Description | Action |
|----------|-------------|--------|
| **A: Needs new port** | No existing interface covers this service | Create interface + adapter |
| **B: Has port, not wired** | Interface exists but consumer uses direct import | Switch to DI injection |
| **C: Type-only** | Only types are imported, no runtime dependency | Convert to `import type` |

### 3. Category C — Convert to Type-Only Import

Simplest fix. Change:
```typescript
// BEFORE (violation)
import { SomeType } from '@/infrastructure/services/some-service';

// AFTER (clean)
import type { SomeType } from '@/infrastructure/services/some-service';
```

Type-only imports are allowed since they're erased at runtime and don't create a dependency.

### 4. Category B — Wire Existing Port Interface

If a port interface already exists in `packages/core/src/application/ports/output/`:

```typescript
// BEFORE (violation)
import { GitService } from '@/infrastructure/services/git-service';

export class SomeUseCase {
  private gitService = new GitService();
}

// AFTER (clean)
import type { IGitPrService } from '../ports/output/services/git-pr-service.interface';

@injectable()
export class SomeUseCase {
  constructor(
    @inject('IGitPrService') private readonly gitPrService: IGitPrService,
  ) {}
}
```

### 5. Category A — Create New Port Interface

#### 5a. Define the interface

Create in `packages/core/src/application/ports/output/services/` or `repositories/`:

```typescript
// packages/core/src/application/ports/output/services/my-service.interface.ts
export interface IMyService {
  doSomething(input: SomeInput): Promise<SomeOutput>;
}
```

**Naming conventions:**
- File: `kebab-case.interface.ts`
- Interface: `I` prefix + PascalCase (e.g., `IMyService`)
- Location: `services/` for stateless operations, `repositories/` for data persistence

#### 5b. Make the infrastructure class implement it

```typescript
// packages/core/src/infrastructure/services/my-service.ts
import { injectable } from 'tsyringe';
import type { IMyService } from '@/application/ports/output/services/my-service.interface';

@injectable()
export class MyService implements IMyService {
  async doSomething(input: SomeInput): Promise<SomeOutput> {
    // existing implementation
  }
}
```

#### 5c. Register in DI container

Add to `packages/core/src/infrastructure/di/container.ts`:

```typescript
container.register<IMyService>('IMyService', { useClass: MyService });
```

#### 5d. Update the consumer

```typescript
@injectable()
export class SomeUseCase {
  constructor(
    @inject('IMyService') private readonly myService: IMyService,
  ) {}
}
```

### 6. Update Tests

For each refactored consumer, update its test to inject a mock:

```typescript
const mockMyService: IMyService = {
  doSomething: vi.fn().mockResolvedValue(expectedOutput),
};

const useCase = new SomeUseCase(mockMyService);
```

Consider using `/mock-factory` if the interface is used in 3+ test files.

### 7. Verify

```bash
pnpm typecheck                    # Types resolve
pnpm test:unit                    # Tests pass with mocks
pnpm validate                     # Full validation

# Verify no violations remain
grep -rn "from.*infrastructure/" packages/core/src/application/ | grep -v "import type" | grep -v "di/container"
grep -rn "from.*infrastructure/" src/presentation/ | grep -v "import type" | grep -v "di/container" | grep -v "server-container"
```

## Example: Refactoring a FileSystem Import

**Before** — presentation layer directly imports infrastructure:
```typescript
// src/presentation/cli/commands/init.ts
import { FileSystemService } from '@/infrastructure/services/file-system-service';
const fs = new FileSystemService();
const exists = await fs.directoryExists(path);
```

**After** — proper port interface with DI:
```typescript
// 1. New interface
// packages/core/src/application/ports/output/services/file-system-service.interface.ts
export interface IFileSystemService {
  directoryExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}

// 2. Infrastructure implements it
// packages/core/src/infrastructure/services/file-system-service.ts
@injectable()
export class FileSystemService implements IFileSystemService { ... }

// 3. DI registration
container.register<IFileSystemService>('IFileSystemService', { useClass: FileSystemService });

// 4. Use case wraps the operation
// packages/core/src/application/use-cases/check-directory.ts
@injectable()
export class CheckDirectoryUseCase {
  constructor(
    @inject('IFileSystemService') private readonly fs: IFileSystemService,
  ) {}
  async execute(path: string): Promise<boolean> {
    return this.fs.directoryExists(path);
  }
}

// 5. Presentation uses the use case
// src/presentation/cli/commands/init.ts
const exists = await checkDirectoryUseCase.execute(path);
```
