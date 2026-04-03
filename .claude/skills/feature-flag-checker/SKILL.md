---
name: feature-flag-checker
description: Verify feature flags are consistently wired across all Clean Architecture layers (TypeSpec through presentation)
user_invocable: true
---

# Feature Flag Wiring Checker

Verify that a feature flag is consistently defined and wired across every layer of the Clean Architecture stack.

## When to Use

- After adding a new feature flag or configuration option
- When a flag works in one presentation layer but not another
- During code review to verify cross-layer consistency
- When auditing all flags for completeness

## Layers to Verify

A fully-wired feature flag touches 6 layers:

| Layer | Location | What to check |
|-------|----------|---------------|
| 1. TypeSpec | `tsp/` | Enum value or model property defined |
| 2. Domain | `packages/core/src/domain/generated/output.ts` | Generated correctly |
| 3. Settings | Settings repository + service | Persisted and retrievable |
| 4. Use Case | `packages/core/src/application/use-cases/` | Conditional logic reads flag |
| 5. Presentation | `src/presentation/cli/` or `web/` or `tui/` | User can toggle the flag |
| 6. Tests | `tests/` | Both flag states covered |

## Steps

### 1. Identify the Flag

Get the flag name. Example: `autoApprove` (auto-approve plans without user confirmation).

### 2. Check TypeSpec Definition

```bash
grep -rn "autoApprove" tsp/
```

Expected: Property or enum value in a TypeSpec model. If missing, the flag was never properly defined — start here.

### 3. Check Generated Domain Output

```bash
grep -n "autoApprove" packages/core/src/domain/generated/output.ts
```

Expected: Property appears in the generated interface/type. If missing after TypeSpec has it, run:
```bash
pnpm tsp:codegen
```

### 4. Check Settings Wiring

```bash
# Settings repository interface
grep -rn "autoApprove" packages/core/src/application/ports/output/repositories/settings.repository.interface.ts

# Settings repository implementation
grep -rn "autoApprove" packages/core/src/infrastructure/repositories/

# Settings service or use case
grep -rn "autoApprove" packages/core/src/application/
```

Expected: The flag is readable/writable through the settings port interface.

### 5. Check Use Case Consumption

```bash
grep -rn "autoApprove" packages/core/src/application/use-cases/
```

Expected: At least one use case reads the flag and branches behavior. If no use case references it, the flag has no effect.

### 6. Check Presentation Exposure

```bash
# CLI
grep -rn "autoApprove\|auto-approve\|auto_approve" src/presentation/cli/

# TUI
grep -rn "autoApprove\|auto-approve" src/presentation/tui/

# Web
grep -rn "autoApprove\|auto-approve" src/presentation/web/
```

Expected: At least one presentation layer exposes the flag to users (CLI arg, web settings panel, TUI option).

### 7. Check Test Coverage

```bash
# Tests that reference the flag
grep -rn "autoApprove" tests/

# Tests for both states
grep -rn "autoApprove.*true\|autoApprove.*false" tests/
```

Expected: Tests cover both `true` and `false` states of the flag.

### 8. Generate Gap Report

Produce a table summarizing the wiring status:

```markdown
## Feature Flag Wiring Report: `autoApprove`

| Layer | Status | File(s) | Notes |
|-------|--------|---------|-------|
| TypeSpec | OK | `tsp/domain/settings.tsp:15` | Property on Settings model |
| Domain (generated) | OK | `output.ts:234` | Auto-generated |
| Settings repository | OK | `settings.repository.interface.ts:8` | Read/write methods |
| Settings implementation | OK | `sqlite-settings-repository.ts:45` | SQLite persistence |
| Use case | OK | `execute-phase.ts:23` | Skips approval when true |
| CLI presentation | OK | `run.ts:34` | `--auto-approve` flag |
| Web presentation | MISSING | — | No settings UI toggle |
| TUI presentation | MISSING | — | No TUI option |
| Unit tests (true) | OK | `execute-phase.test.ts:56` | Covers auto-approve path |
| Unit tests (false) | OK | `execute-phase.test.ts:78` | Covers manual approval path |
```

### 9. Fix Gaps

For each MISSING entry:
- **TypeSpec**: Add property to the appropriate model in `tsp/`, run `pnpm tsp:codegen`
- **Settings**: Add to the repository interface and implementation
- **Use case**: Add conditional logic or create a new use case
- **Presentation**: Add UI control (CLI arg, web toggle, TUI option)
- **Tests**: Add test cases for both flag states

## Quick Audit: All Flags

To audit all flags at once, find all boolean properties in settings:

```bash
# From TypeSpec
grep -n "boolean" tsp/domain/settings.tsp

# From generated output
grep -B2 "boolean" packages/core/src/domain/generated/output.ts | grep -A2 "interface.*Settings"
```

Then run steps 2-8 for each flag found.
