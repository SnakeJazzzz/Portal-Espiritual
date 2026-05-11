#!/usr/bin/env bash
# Bloquea rm -rf con paths absolutos fuera del repo/tmp.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if ! echo "$COMMAND" | grep -qE '\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*[fF]|-[a-zA-Z]*[fF][a-zA-Z]*[rR]|-rf|-fr|--recursive\s+--force|--force\s+--recursive)\b'; then
  exit 0
fi

if echo "$COMMAND" | grep -qE '\brm\s+(-\S+\s+)*/'; then
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
  TARGETS=$(echo "$COMMAND" | grep -oE '(^|[[:space:]])/[^[:space:];|&]*' | tr -d ' ')

  for TARGET in $TARGETS; do
    if [[ "$TARGET" == "$REPO_ROOT"* ]] \
       || [[ "$TARGET" == /tmp/* ]] \
       || [[ "$TARGET" == /var/tmp/* ]] \
       || [[ "$TARGET" == /var/folders/* ]]; then
      continue
    fi

    cat >&2 <<MSG
BLOCKED: 'rm -rf' on absolute path outside the project.

Target: $TARGET
Repo: $REPO_ROOT

Absolute-path recursive deletes are forbidden by project policy.
If you need to delete something outside the repo, do it yourself.
MSG
    exit 2
  done
fi

exit 0
