#!/usr/bin/env bash
# Bloquea git commit / git add / git push cuando estás en main o master.
# El sitio auto-deploya desde main a Vercel. Un commit accidental = producción rota.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if ! echo "$COMMAND" | grep -qE '\bgit\s+(commit|add|push|merge|rebase|reset\s+--hard)\b'; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  cat >&2 <<MSG
BLOCKED: Write operation on '$BRANCH' branch.

Portal Espiritual auto-deploys from main to Vercel production.
Direct writes to main are forbidden by project policy.

Required action:
  git checkout -b feature/your-feature-name

Then retry the operation on the feature branch.
MSG
  exit 2
fi

exit 0
