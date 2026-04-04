#!/bin/bash
# PostToolUse hook: Surface related test file when editing source code.
# Maps src/.../<name>.ts → tests/.../<name>.test.ts and reports it if found.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only trigger for TypeScript source files (not tests, stories, generated, or config)
if [[ "$FILE_PATH" != *.ts ]] && [[ "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi
if [[ "$FILE_PATH" == *.test.ts ]] || [[ "$FILE_PATH" == *.test.tsx ]]; then
  exit 0
fi
if [[ "$FILE_PATH" == *.stories.tsx ]] || [[ "$FILE_PATH" == *.d.ts ]]; then
  exit 0
fi
if [[ "$FILE_PATH" == */generated/* ]] || [[ "$FILE_PATH" == */node_modules/* ]]; then
  exit 0
fi

# Extract the base name without extension
BASENAME=$(basename "$FILE_PATH" | sed 's/\.\(ts\|tsx\)$//')

# Search for matching test files
TEST_FILE=$(find tests/ -name "${BASENAME}.test.ts" -o -name "${BASENAME}.test.tsx" 2>/dev/null | head -1)

# Also check colocated test files (same directory as source)
if [ -z "$TEST_FILE" ]; then
  DIR=$(dirname "$FILE_PATH")
  for ext in test.ts test.tsx; do
    CANDIDATE="${DIR}/${BASENAME}.${ext}"
    if [ -f "$CANDIDATE" ]; then
      TEST_FILE="$CANDIDATE"
      break
    fi
  done
fi

if [ -n "$TEST_FILE" ] && [ -f "$TEST_FILE" ]; then
  echo "INFO: Related test found: $TEST_FILE"
  echo "Run: pnpm test:single $TEST_FILE"
fi

exit 0
