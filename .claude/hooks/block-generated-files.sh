#!/bin/bash
# PreToolUse hook: Block edits to auto-generated files.
# These files are produced by TypeSpec codegen — edit the .tsp sources instead.

FILE_PATH="$CLAUDE_FILE_PATH"

if [[ "$FILE_PATH" == *"/domain/generated/"* ]]; then
  echo "BLOCKED: This file is auto-generated from TypeSpec."
  echo "Edit the .tsp source files in tsp/ instead, then run: pnpm tsp:codegen"
  exit 2
fi
