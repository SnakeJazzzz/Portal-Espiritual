#!/usr/bin/env bash
# Bloquea borrados (Write con content vacío) sobre archivos críticos.
# Modificar OK. Borrar requiere que el humano lo haga manualmente.

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

if [[ "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""')

if [[ -n "$CONTENT" ]]; then
  exit 0
fi

PROTECTED_PATTERNS=(
  "src/config/services.ts"
  "src/components/StarField.tsx"
  "src/components/constellation/"
  "src/components/CelestialBorder.tsx"
  "public/"
  "src/app/globals.css"
)

for PATTERN in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$PATTERN"* ]]; then
    cat >&2 <<MSG
BLOCKED: Attempt to clear/delete protected file: $FILE_PATH

This file is part of the project's critical visual identity or
source-of-truth configuration. Modifying is OK; clearing/deleting
must be done manually by the human.

If you really need to remove this file, ask the human first.
MSG
    exit 2
  fi
done

exit 0
