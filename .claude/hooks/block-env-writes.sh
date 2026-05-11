#!/usr/bin/env bash
# Bloquea cualquier write/edit sobre archivos .env*
# Razón: vamos a tener STRIPE_SECRET_KEY, RESEND_API_KEY, etc.
# Un agente que sobreescriba .env.local puede leakear o invalidar credenciales.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

if [[ "$BASENAME" =~ ^\.env(\..+)?$ ]] || [[ "$BASENAME" == ".envrc" ]]; then
  cat >&2 <<MSG
BLOCKED: Write to environment file '$FILE_PATH'.

.env files contain secrets (API keys, DB creds). They are never edited
by Claude — only by you in your local shell or in the Vercel dashboard.

If you need a new env var, tell the human the variable name and what
value it should have. The human will set it.
MSG
  exit 2
fi

exit 0
