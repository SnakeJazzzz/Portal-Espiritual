#!/usr/bin/env bash
# Bloquea git push --force / -f / --force-with-lease en cualquier rama.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if ! echo "$COMMAND" | grep -qE '\bgit\s+push\b'; then
  exit 0
fi

if echo "$COMMAND" | grep -qE '(--force|--force-with-lease|\s-[a-zA-Z]*f[a-zA-Z]*\b|\spush\s+\S+\s+\+)'; then
  cat >&2 <<MSG
BLOCKED: 'git push --force' (or equivalent).

Force pushes rewrite remote history and can erase commits permanently.
If you genuinely need to force push (rare), do it yourself from your
shell after confirming what will be lost.

Alternatives:
  git push                  # normal push, no force
  git revert <commit>       # create a new commit that undoes
MSG
  exit 2
fi

exit 0
