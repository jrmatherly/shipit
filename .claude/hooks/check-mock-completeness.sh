#!/bin/bash
# PostToolUse hook: Warn when a test mock appears to be missing interface methods.
#
# Warns (non-blocking) when:
# - A test file imports a port interface AND defines a mock with fewer methods
#
# Heuristic-based — may have false positives. Use /mock-factory for precise fixes.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check test files
if [[ "$FILE_PATH" != *.test.ts ]] && [[ "$FILE_PATH" != *.spec.ts ]]; then
  exit 0
fi

# Find port interface imports in this test file
INTERFACE_IMPORT=$(grep -oP "from\s+['\"].*ports/output.*/(\K[^'\"]+)" "$FILE_PATH" 2>/dev/null | head -1)
if [ -z "$INTERFACE_IMPORT" ]; then
  exit 0
fi

# Resolve the interface file path
INTERFACE_FILE=$(grep -rn "from.*ports/output" "$FILE_PATH" 2>/dev/null | head -1 | grep -oP "(?<=from\s['\"])[^'\"]+")
if [ -z "$INTERFACE_FILE" ]; then
  exit 0
fi

# Try to find the actual interface file
RESOLVED=""
for BASE in "packages/core/src/application" "packages/core/src"; do
  CANDIDATE=$(find "$BASE" -name "*.interface.ts" -path "*ports/output*" 2>/dev/null | head -1)
  if [ -n "$CANDIDATE" ]; then
    # Match based on the import path
    IFACE_NAME=$(grep -oP "I[A-Z]\w+" "$FILE_PATH" 2>/dev/null | grep -v "import" | head -1)
    if [ -n "$IFACE_NAME" ]; then
      RESOLVED=$(grep -rl "export interface $IFACE_NAME" packages/core/src/application/ports/output/ 2>/dev/null | head -1)
    fi
    break
  fi
done

if [ -z "$RESOLVED" ] || [ ! -f "$RESOLVED" ]; then
  exit 0
fi

# Count interface methods (lines matching method signatures)
IFACE_METHODS=$(grep -cP "^\s+\w+\s*\(" "$RESOLVED" 2>/dev/null || echo 0)

# Count mocked methods (vi.fn() assignments in the test)
MOCK_METHODS=$(grep -cP "\w+:\s*vi\.fn\(\)" "$FILE_PATH" 2>/dev/null || echo 0)

if [ "$IFACE_METHODS" -gt 0 ] && [ "$MOCK_METHODS" -gt 0 ] && [ "$MOCK_METHODS" -lt "$IFACE_METHODS" ]; then
  echo "WARNING: Mock in $(basename "$FILE_PATH") may be incomplete."
  echo "Interface has ~$IFACE_METHODS methods but mock defines ~$MOCK_METHODS."
  echo "Run /mock-factory to generate a complete mock factory."
fi

exit 0
