---
name: mock-updater
description: Orchestrate parallel subagents to update all mock implementations when a port interface changes
user_invocable: true
---

# Parallel Mock Updater

When a port interface changes, this skill orchestrates parallel subagents to update every mock implementation across the test suite.

## When to Use

- After adding, removing, or changing a method on a port interface
- After `pnpm typecheck` reveals mock type errors across multiple test files
- When the `check-mock-completeness` hook warns about incomplete mocks
- After running `/serena-impact-analysis` and seeing many test files in the blast radius

## Steps

### 1. Identify the Interface Change

Determine what changed on the port interface:

```bash
# See the diff
git diff packages/core/src/application/ports/output/
```

Record:
- **Interface name**: e.g., `IFeatureRepository`
- **Interface file**: e.g., `packages/core/src/application/ports/output/repositories/feature-repository.interface.ts`
- **Added methods**: e.g., `findByIds(ids: string[]): Promise<Feature[]>`
- **Removed methods**: e.g., (none)
- **Changed signatures**: e.g., (none)

### 2. Check for Centralized Mock Factory

```bash
ls tests/helpers/mock-*.helper.ts
```

If a factory exists for this interface (e.g., `tests/helpers/mock-feature-repository.helper.ts`):
- **Update the factory only** — all consumers inherit the fix automatically
- Skip to Step 6 (Verify)

If no factory exists, check mock duplication count:

```bash
grep -rl "vi\.fn()" tests/ | xargs grep -l "IFeatureRepository" | wc -l
```

If count >= 5, **strongly recommend** creating a factory first with `/mock-factory` — it's a one-time investment that makes all future updates trivial.

### 3. Find All Affected Test Files

```bash
grep -rl "IFeatureRepository\|mockFeatureRepo\|featureRepository.*vi\.fn" tests/ | sort
```

Save this list. Group into batches of ~5 files per subagent.

### 4. Read the Current Interface

Read the full interface to know what methods each mock must implement:

```bash
cat packages/core/src/application/ports/output/repositories/feature-repository.interface.ts
```

### 5. Deploy Parallel Update Subagents

For each batch of test files, deploy a subagent using the Agent tool. Each subagent gets:
- The complete interface definition
- Its assigned list of files (max 5)
- The specific change (which methods to add/remove/modify)

**Deployment pattern:**

```
Agent(
  description: "Update mocks batch 1",
  name: "mock-update-1",
  prompt: "Update mock objects in these test files to match the current IFeatureRepository interface.

The interface now has these methods:
- create(feature: Feature): Promise<void>
- findById(id: string): Promise<Feature | null>
- findByIds(ids: string[]): Promise<Feature[]>  ← NEW
- list(): Promise<Feature[]>
- listActive(): Promise<Feature[]>
- update(feature: Feature): Promise<void>
- delete(id: string): Promise<void>

Files to update:
1. /Users/.../tests/unit/application/use-cases/create-feature.test.ts
2. /Users/.../tests/unit/application/use-cases/list-features.test.ts
3. /Users/.../tests/unit/application/use-cases/delete-feature.test.ts

For each file:
- Find the mock object (usually in beforeEach or at describe scope)
- Add: findByIds: vi.fn().mockResolvedValue([])
- Do NOT change existing mock return values or test assertions
- Only add the missing method with a sensible default"
)
```

Deploy all batches in a **single message** with multiple Agent tool calls for true parallelism:

```
// In a single response, call Agent multiple times:
Agent(name: "mock-update-1", prompt: "Update files 1-5...")
Agent(name: "mock-update-2", prompt: "Update files 6-10...")
Agent(name: "mock-update-3", prompt: "Update files 11-15...")
```

### 6. Verify

After all subagents complete:

```bash
# Type check — all mocks must satisfy the interface
pnpm typecheck

# Run unit tests — no regressions
pnpm test:unit

# Double-check no files were missed
grep -rl "IFeatureRepository" tests/ | xargs grep -L "findByIds" 2>/dev/null
```

### 7. Consider Creating a Factory

If you just updated 10+ files individually, create a centralized factory to prevent this pain next time:

```
/mock-factory
```

Then refactor all test files to use it. Future interface changes will only require updating one file.

## Decision Tree

```
Interface changed
├── Factory exists? → Update factory only → Verify → Done
├── < 5 mocks? → Update manually → Verify → Done
└── >= 5 mocks?
    ├── Create factory first (/mock-factory) → Update factory → Refactor tests → Verify → Done
    └── Urgent? Deploy parallel subagents → Verify → Create factory later
```

## Batching Guidelines

| Mock count | Strategy |
|-----------|----------|
| 1-4 | Update manually (no subagents needed) |
| 5-15 | 2-3 subagents, ~5 files each |
| 16-30 | 4-6 subagents, ~5 files each |
| 30+ | Create factory FIRST, then single factory update |
