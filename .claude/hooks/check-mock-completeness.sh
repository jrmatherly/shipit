#!/bin/bash
# PostToolUse hook: Warn when a test mock appears to be missing interface methods.
#
# Warns (non-blocking) when:
# - A test file imports a port interface AND defines a mock with fewer methods
#
# Heuristic-based — may have false positives. Use /mock-factory for precise fixes.
# Uses only POSIX-compatible grep (no -P flag) for macOS compatibility.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check test files
if [[ "$FILE_PATH" != *.test.ts ]] && [[ "$FILE_PATH" != *.spec.ts ]]; then
  exit 0
fi

# Find port interface imports — extract the interface name from import lines
# Matches: import type { IFoo } from '...ports/output/...'
IFACE_NAME=$(grep -E "from.*ports/output" "$FILE_PATH" 2>/dev/null \
  | grep -oE "I[A-Z][a-zA-Z0-9]+" \
  | head -1)

if [ -z "$IFACE_NAME" ]; then
  exit 0
fi

# Find the interface file by searching for its export declaration
RESOLVED=$(grep -rl "export interface $IFACE_NAME" packages/core/src/application/ports/output/ 2>/dev/null | head -1)

if [ -z "$RESOLVED" ] || [ ! -f "$RESOLVED" ]; then
  exit 0
fi

# Count interface methods (lines with method signature pattern: "  methodName(")
IFACE_METHODS=$(grep -cE "^[[:space:]]+[a-zA-Z_][a-zA-Z0-9_]*[[:space:]]*\(" "$RESOLVED" 2>/dev/null || echo 0)

# Count mocked methods (vi.fn() assignments in the test)
MOCK_METHODS=$(grep -cE "[a-zA-Z_][a-zA-Z0-9_]*:[[:space:]]*vi\.fn\(\)" "$FILE_PATH" 2>/dev/null || echo 0)

if [ "$IFACE_METHODS" -gt 0 ] && [ "$MOCK_METHODS" -gt 0 ] && [ "$MOCK_METHODS" -lt "$IFACE_METHODS" ]; then
  echo "WARNING: Mock in $(basename "$FILE_PATH") may be incomplete."
  echo "Interface $IFACE_NAME has ~$IFACE_METHODS methods but mock defines ~$MOCK_METHODS."
  echo "Run /mock-factory to generate a complete mock factory."
fi

exit 0
