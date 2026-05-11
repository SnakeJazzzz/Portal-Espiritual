#!/usr/bin/env bash
# Bloquea git commit / git add / git push / merge / rebase / reset --hard cuando:
#  (a) la rama actual es main o master, O
#  (b) el comando incluye 'git checkout main/master' antes de un write.
# Razón: el sitio auto-deploya desde main a Vercel. Un commit accidental = producción rota.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Si el comando no contiene ninguna operación git que escriba, permitir.
if ! echo "$COMMAND" | grep -qE '\bgit\s+(commit|add|push|merge|rebase|reset\s+--hard)\b'; then
  exit 0
fi

# CASE A: el comando intenta cambiar a main/master inline (mismo bash call).
# Cubre: `git checkout main && ...`, `git switch main; ...`, etc.
if echo "$COMMAND" | grep -qE '\bgit\s+(checkout|switch)\s+(main|master)\b'; then
  cat >&2 <<MSG
BLOCKED: Compound command attempts to switch to main/master and perform a write.

Command: $COMMAND

Portal Espiritual auto-deploys from main to Vercel production.
Switching to main + writing in a single command bypasses branch protection.

If you genuinely need to operate on main, do it as separate steps and
ask the human first. Most likely you want to stay on a feature branch.
MSG
  exit 2
fi

# CASE B: la rama actual ya es main/master.
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  cat >&2 <<MSG
BLOCKED: Write operation on '$BRANCH' branch.

Command: $COMMAND

Portal Espiritual auto-deploys from main to Vercel production.
Direct writes to main are forbidden by project policy.

Required action:
  git checkout -b feature/your-feature-name

Then retry the operation on the feature branch.
MSG
  exit 2
fi

exit 0
