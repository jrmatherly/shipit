#!/bin/bash
# PostToolUse hook: Warn when en/web.json is edited and other locales are missing keys.
# Prevents the common mistake of adding i18n keys to English only, which causes
# 7 translation-completeness test failures.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only trigger for English web translation file
if [[ "$FILE_PATH" != *translations/en/web.json ]]; then
  exit 0
fi

EN_FILE="translations/en/web.json"
if [ ! -f "$EN_FILE" ]; then
  exit 0
fi

EN_KEYS=$(jq -r '[paths(scalars)] | map(join(".")) | .[]' "$EN_FILE" 2>/dev/null | sort)
HAS_MISSING=false

for lang in ar de es fr he pt ru; do
  LANG_FILE="translations/$lang/web.json"
  if [ ! -f "$LANG_FILE" ]; then
    continue
  fi
  LANG_KEYS=$(jq -r '[paths(scalars)] | map(join(".")) | .[]' "$LANG_FILE" 2>/dev/null | sort)
  MISSING=$(comm -23 <(echo "$EN_KEYS") <(echo "$LANG_KEYS"))
  if [ -n "$MISSING" ]; then
    if [ "$HAS_MISSING" = false ]; then
      echo "WARNING: New i18n keys in en/web.json are missing from other locales."
      echo "Translation-completeness tests will FAIL unless all 8 locale files have identical keys."
      echo ""
      HAS_MISSING=true
    fi
    COUNT=$(echo "$MISSING" | wc -l | tr -d ' ')
    echo "  $lang/web.json: $COUNT missing key(s)"
    echo "$MISSING" | head -3 | sed 's/^/    /'
    if [ "$COUNT" -gt 3 ]; then
      echo "    ... and $((COUNT - 3)) more"
    fi
  fi
done

exit 0
