#!/bin/bash
# PostToolUse hook: Detect Clean Architecture layer boundary violations.
#
# Warns (non-blocking) when:
# - Presentation layer (src/presentation/) imports from infrastructure
# - Application layer (packages/core/src/application/) imports from infrastructure
#
# Allowed exceptions:
# - DI container bootstrap files
# - Type-only imports (import type)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check TypeScript files
if [[ "$FILE_PATH" != *.ts ]] && [[ "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

VIOLATIONS=""

# Check presentation → infrastructure violations
if [[ "$FILE_PATH" == */presentation/* ]]; then
  # Look for infrastructure imports (excluding type-only imports and DI container)
  VIOLATIONS=$(grep -n "from.*infrastructure/" "$FILE_PATH" 2>/dev/null | \
    grep -v "import type" | \
    grep -v "di/container" | \
    grep -v "server-container" || true)
fi

# Check application → infrastructure violations
if [[ "$FILE_PATH" == */application/* ]]; then
  VIOLATIONS=$(grep -n "from.*infrastructure/" "$FILE_PATH" 2>/dev/null | \
    grep -v "import type" || true)
fi

if [ -n "$VIOLATIONS" ]; then
  echo "WARNING: Clean Architecture layer violation detected in $(basename "$FILE_PATH")."
  echo "Presentation/Application layers should not import from infrastructure."
  echo ""
  echo "Violations:"
  echo "$VIOLATIONS"
  echo ""
  echo "Fix: Use dependency injection via port interfaces instead of direct infrastructure imports."
  echo "See: .claude/rules/code-quality.md"
fi

exit 0
