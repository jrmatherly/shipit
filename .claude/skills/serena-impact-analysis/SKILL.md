---
name: serena-impact-analysis
description: Analyze the blast radius of port interface changes using Serena and Code Review Graph MCP tools
user_invocable: true
---

# Serena Interface Impact Analysis

Analyze the full blast radius when modifying a port interface, producing a layer-by-layer change checklist before you touch any code.

## When to Use

- Before adding, removing, or renaming methods on a port interface
- Before changing method signatures (parameters, return types) on any interface in `packages/core/src/application/ports/output/`
- When planning a refactor that touches multiple layers
- After a TypeSpec change that will ripple into port interfaces

## Steps

### 1. Identify the Interface

Use Serena to locate the interface definition:

```
find_symbol(name: "IFeatureRepository", type: "interface")
```

Record the `relative_path` and `name_path` from the result.

### 2. Find All Implementors (Infrastructure Layer)

Use Serena to find classes that implement the interface:

```
find_referencing_symbols(
  name: "IFeatureRepository",
  relative_path: "packages/core/src/application/ports/output/repositories/feature-repository.interface.ts"
)
```

Filter results to `packages/core/src/infrastructure/` — these are the concrete implementations that must be updated.

### 3. Find All Consumers (Application Layer)

Search for use cases and services that inject the interface:

```
search_for_pattern(
  pattern: "@inject.*IFeatureRepository",
  relative_path: "packages/core/src/application/"
)
```

These are the use cases whose behavior may change.

### 4. Find Presentation Consumers

Check if any presentation code references the interface or its consumers:

```
search_for_pattern(
  pattern: "IFeatureRepository|FeatureRepository",
  relative_path: "src/presentation/"
)
```

### 5. Get Impact Radius via Code Review Graph

Use the code-review-graph for a full dependency tree:

```
get_impact_radius_tool(
  symbol: "IFeatureRepository",
  file_path: "packages/core/src/application/ports/output/repositories/feature-repository.interface.ts"
)
```

This reveals transitive dependencies the grep-based search may miss.

### 6. Find Affected Tests

```
search_for_pattern(
  pattern: "IFeatureRepository|mockFeatureRepository|createMockFeatureRepository",
  relative_path: "tests/"
)
```

### 7. Check for Centralized Mock Factory

```
find_file(name: "mock-feature-repository.helper.ts", relative_path: "tests/helpers/")
```

If a factory exists, updating it propagates to all tests. If not, each test file needs individual updates (consider running `/mock-factory` first).

### 8. Generate Change Checklist

Produce a checklist grouped by layer:

```markdown
## Impact Checklist for IFeatureRepository Changes

### Domain (auto-generated — usually no action)
- [ ] TypeSpec source: `tsp/domain/*.tsp` (if types changed)
- [ ] Regenerate: `pnpm tsp:codegen`

### Application (port definition)
- [ ] Interface: `packages/core/src/application/ports/output/repositories/feature-repository.interface.ts`
- [ ] Use cases consuming this interface:
  - [ ] `packages/core/src/application/use-cases/create-feature.ts`
  - [ ] `packages/core/src/application/use-cases/list-features.ts`
  - [ ] ... (list all from step 3)

### Infrastructure (implementation)
- [ ] Repository: `packages/core/src/infrastructure/repositories/sqlite-feature-repository.ts`
- [ ] DI container: `packages/core/src/infrastructure/di/container.ts` (if new bindings)

### Presentation (thin layer — usually no action)
- [ ] CLI commands referencing affected use cases
- [ ] Web API routes referencing affected use cases

### Tests
- [ ] Mock factory: `tests/helpers/mock-feature-repository.helper.ts`
- [ ] Unit tests: (list all from step 6)
- [ ] Integration tests: (list all from step 6)
```

### 9. Verify After Changes

```bash
pnpm typecheck          # All types resolve
pnpm test:unit          # All mocks satisfy interfaces
pnpm test:int           # Infrastructure implementations work
```

## Example: Adding `findByIds()` to IFeatureRepository

**Before:** Interface has `findById(id)` but no batch method.

1. **Serena** finds the interface at `packages/core/src/application/ports/output/repositories/feature-repository.interface.ts`
2. **Referencing symbols** reveals `SqliteFeatureRepository` (1 implementor), 8 use cases injecting it
3. **Impact radius** shows 33 test files mocking the interface
4. **Checklist** generated: 1 interface + 1 implementation + 0 use cases (new method, no existing callers) + 33 test mocks + 1 mock factory
5. **Execution:** Add method to interface → implement in SQLite repo → update mock factory → run tests
6. **Total files touched:** 3 (interface, implementation, mock factory) instead of 36 (if no factory existed)
