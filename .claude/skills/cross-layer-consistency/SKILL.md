---
name: cross-layer-consistency
description: Deploy parallel subagents to verify consistency across all Clean Architecture layers
user_invocable: true
---

# Cross-Layer Consistency Checker

Deploy 5 parallel verification subagents to audit consistency across every layer of the Clean Architecture stack.

## When to Use

- After a large refactor touching multiple layers
- Before a release to verify architectural integrity
- When onboarding to the project to understand current health
- After merging a feature branch with many changes
- As a periodic health check (monthly recommended)

## Architecture Layers Under Verification

```
┌─────────────────────────────────────────────┐
│  Presentation (CLI / TUI / Web)             │  src/presentation/
├─────────────────────────────────────────────┤
│  Application (Use Cases + Port Interfaces)  │  packages/core/src/application/
├─────────────────────────────────────────────┤
│  Infrastructure (Repos + DI + Services)     │  packages/core/src/infrastructure/
├─────────────────────────────────────────────┤
│  Domain (Generated Models + Value Objects)  │  packages/core/src/domain/
├─────────────────────────────────────────────┤
│  TypeSpec Source                             │  tsp/
└─────────────────────────────────────────────┘
```

## Deployment: 5 Parallel Subagents

Deploy all 5 in a **single message** for maximum parallelism. Each subagent produces a findings table.

### Subagent 1: TypeSpec ↔ Domain Consistency

```
Agent(
  description: "Verify TypeSpec-domain consistency",
  name: "consistency-typespec",
  prompt: "Verify TypeSpec and domain layer consistency in the shipit project.

Checks to perform:
1. Run: pnpm tsp:codegen
2. Check if any files changed: git diff --name-only packages/core/src/domain/generated/
   - If changes exist, report them as STALE GENERATED OUTPUT
3. Search for hand-written types in packages/core/src/domain/ that duplicate generated types:
   grep -rn 'interface\|type\|enum' packages/core/src/domain/ --include='*.ts' | grep -v generated/ | grep -v node_modules
4. Cross-reference with generated output to find conflicts
5. Check that no file outside domain/generated/ imports from generated with a relative path (should use @domain/generated/*)

Report format:
| Check | Status | Details |
|-------|--------|---------|
| Generated output fresh | OK/STALE | list changed files |
| No hand-written duplicates | OK/WARN | list conflicts |
| Import paths correct | OK/WARN | list violations |"
)
```

### Subagent 2: Port Interface ↔ Infrastructure Consistency

```
Agent(
  description: "Verify port-infrastructure consistency",
  name: "consistency-ports",
  prompt: "Verify every port interface has an infrastructure implementation and DI binding.

Steps:
1. List all port interfaces:
   find packages/core/src/application/ports/output -name '*.interface.ts' | sort
2. For each interface, extract the interface name (grep 'export interface')
3. For each interface name, search for implementations:
   grep -rn 'implements InterfaceName' packages/core/src/infrastructure/
4. For each interface name, search for DI registration:
   grep -rn 'InterfaceName' packages/core/src/infrastructure/di/
5. Flag any interface with:
   - No implementation found
   - No DI container binding
   - Multiple implementations without clear selection

Report format:
| Interface | Implementation | DI Binding | Status |
|-----------|---------------|------------|--------|
| IFeatureRepository | SqliteFeatureRepository | OK | OK |
| ISomeService | (none) | (none) | MISSING |"
)
```

### Subagent 3: Use Case ↔ Port Dependency Consistency

```
Agent(
  description: "Verify use case DI consistency",
  name: "consistency-usecases",
  prompt: "Verify all use case @inject() tokens have matching port interfaces and DI bindings.

Steps:
1. List all use cases:
   find packages/core/src/application/use-cases -name '*.ts' | grep -v '.test.' | sort
2. For each use case, extract @inject('TokenName') tokens:
   grep -oP \"@inject\('([^']+)'\)\" each-file
3. For each token, verify:
   a. A matching interface exists in ports/output/
   b. The token is registered in the DI container
   c. The injected type matches the interface
4. Check that no use case imports directly from infrastructure:
   grep -rn 'from.*infrastructure/' packages/core/src/application/use-cases/

Report format:
| Use Case | Token | Interface Exists | DI Bound | Direct Infra Import |
|----------|-------|-----------------|----------|-------------------|
| CreateFeatureUseCase | IFeatureRepository | OK | OK | None |"
)
```

### Subagent 4: Presentation ↔ Use Case Consistency

```
Agent(
  description: "Verify presentation layer consistency",
  name: "consistency-presentation",
  prompt: "Verify presentation layers only use use cases and domain types (no infrastructure leaks).

Steps:
1. Check for infrastructure imports in presentation:
   grep -rn 'from.*infrastructure/' src/presentation/ | grep -v 'import type' | grep -v 'di/container' | grep -v 'server-container'
2. Check that presentation files import use cases, not raw repositories:
   grep -rn 'Repository' src/presentation/ | grep -v 'import type' | grep -v node_modules | grep -v '.next'
3. Verify each CLI command maps to a use case (not direct service calls):
   grep -rn 'new.*UseCase\|inject.*UseCase\|UseCase' src/presentation/cli/
4. Verify web API routes use use cases:
   grep -rn 'UseCase' src/presentation/web/app/api/

Report format:
| Check | Status | Violations |
|-------|--------|-----------|
| No infra imports | OK/WARN | list files |
| CLI uses use cases | OK/WARN | list direct calls |
| Web uses use cases | OK/WARN | list direct calls |"
)
```

### Subagent 5: Test ↔ Implementation Consistency

```
Agent(
  description: "Verify test coverage consistency",
  name: "consistency-tests",
  prompt: "Verify test files exist for use cases and mock shapes match current interfaces.

Steps:
1. List all use cases and check for corresponding test files:
   For each file in packages/core/src/application/use-cases/*.ts:
     Check if tests/unit/application/use-cases/<name>.test.ts exists
2. For test files that import port interfaces, count mock methods vs interface methods:
   For each test importing from ports/output/:
     - Count methods in the interface file (grep -cP '^\s+\w+\s*\(' interface-file)
     - Count vi.fn() calls in the mock (grep -cP 'vi\.fn\(\)' test-file)
     - Flag if mock count < interface count
3. Check for test files with no assertions:
   grep -rL 'expect(' tests/unit/ | head -20

Report format:
| Use Case | Test File | Exists | Mock Shape | Status |
|----------|-----------|--------|-----------|--------|
| CreateFeatureUseCase | create-feature.test.ts | OK | 7/7 methods | OK |
| ListFeaturesUseCase | (none) | MISSING | N/A | MISSING |"
)
```

## Merging Results

After all 5 subagents complete, produce a unified report:

```markdown
# Cross-Layer Consistency Report

**Date:** YYYY-MM-DD
**Commit:** <short-hash>

## Summary
| Dimension | Status | Issues |
|-----------|--------|--------|
| TypeSpec ↔ Domain | OK/WARN/FAIL | count |
| Ports ↔ Infrastructure | OK/WARN/FAIL | count |
| Use Cases ↔ Ports | OK/WARN/FAIL | count |
| Presentation ↔ Use Cases | OK/WARN/FAIL | count |
| Tests ↔ Implementation | OK/WARN/FAIL | count |

## Critical Issues (FAIL)
- (list any blocking issues)

## Warnings (WARN)
- (list non-blocking inconsistencies)

## Recommended Actions
1. (prioritized fix list)
```

## Severity Definitions

| Level | Meaning | Action |
|-------|---------|--------|
| **FAIL** | Broken dependency chain — code won't compile or runtime error | Fix immediately |
| **WARN** | Inconsistency that works now but creates risk | Fix in current sprint |
| **OK** | Consistent across layers | No action needed |
