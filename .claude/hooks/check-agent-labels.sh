#!/bin/bash
# PostToolUse hook: Warn when a file containing AGENT_LABELS is modified.
# Reminds to check consistency across the 5+ locations where agent labels are defined.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check TypeScript files
if [[ "$FILE_PATH" != *.ts ]] && [[ "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Check if the edited file contains AGENT_LABELS
if ! grep -q "AGENT_LABELS" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

# Find all files with AGENT_LABELS
LABEL_FILES=$(grep -rl "AGENT_LABELS" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | sort)
COUNT=$(echo "$LABEL_FILES" | grep -c '.' 2>/dev/null || echo 0)

if [ "$COUNT" -gt 1 ]; then
  echo "WARNING: AGENT_LABELS is defined in $COUNT files. Verify labels are consistent across:"
  echo "$LABEL_FILES" | sed 's/^/  /'
  echo ""
  echo "Known label drift: 'cursor' has been labeled 'Cursor', 'Cursor CLI', and 'Cursor Agent' in different files."
fi

exit 0
