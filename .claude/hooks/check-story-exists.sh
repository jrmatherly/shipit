#!/bin/bash
# PostToolUse hook: Warn if a web component .tsx file lacks a colocated .stories.tsx file.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check .tsx files under web components (not .stories.tsx, .test.tsx, or ui/ primitives)
if [[ "$FILE_PATH" == */presentation/web/components/*.tsx ]] && \
   [[ "$FILE_PATH" != *.stories.tsx ]] && \
   [[ "$FILE_PATH" != *.test.tsx ]] && \
   [[ "$FILE_PATH" != */components/ui/* ]]; then

  STORY_FILE="${FILE_PATH%.tsx}.stories.tsx"
  if [ ! -f "$STORY_FILE" ]; then
    echo "WARNING: Component $(basename "$FILE_PATH") has no colocated .stories.tsx file."
    echo "Project rules require every web UI component to have a Storybook story."
    echo "Expected: $STORY_FILE"
  fi
fi

exit 0
