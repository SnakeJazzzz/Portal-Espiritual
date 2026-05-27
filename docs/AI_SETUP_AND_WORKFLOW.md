# Portal Espiritual — AI Setup & Workflow

> **Propósito:** documentar qué está instalado, dónde, y cómo trabajamos
> con Claude Code en este proyecto. Si algo se rompe o un nuevo developer
> entra al proyecto, este es el manual de recovery.

---

## Setup local (one-time per machine)

### Claude Code

- Versión actual: 2.1.126+ (verificar con `claude --version`)
- Update: `brew upgrade claude-code`
- Healthcheck: `claude doctor`
- Modelo: confirmar con `/model` dentro de una sesión (debe ser Opus 4.7)

### Plugins (user-scope, viven en `~/.claude/`)

- **Superpowers** (obra/superpowers-marketplace) — instalado en el sistema
  de desarrollo personal. Provee: brainstorming, plan-writing,
  subagent-driven execution, code review, worktree management.

### Personal CLAUDE.md (`~/.claude/CLAUDE.md`)

Vive en máquina del developer, **no en el repo**. Contiene preferencias
personales (stack, comunicación, hard rules). Ya configurado.

### MCPs instalados a project-scope

Verificar con `claude mcp list` desde la raíz del proyecto:

```
context7  https://mcp.context7.com/mcp       ✓ Connected
stripe    https://mcp.stripe.com             ! Needs authentication
vercel    https://mcp.vercel.com             ! Needs authentication
```

GitHub MCP fue intentado pero requería suscripción Copilot — removido.

**OAuth de Stripe y Vercel se dispara la primera vez que un agente los
invoque dentro de Claude Code.** Eso es normal y seguro.

---

## Setup en el repo (one-time per project)

Todo lo siguiente vive en `main` y es parte del repo. No tocar a mano
sin razón.

### Hooks de seguridad (`.claude/hooks/`)

5 scripts bash que se ejecutan antes de cada tool use de Claude Code:

| Hook | Bloquea |
|------|---------|
| `block-main-writes.sh` | `git commit/add/push/merge/rebase/reset --hard` en `main`/`master`, incluyendo comandos compuestos `git checkout main && ...` |
| `block-env-writes.sh` | Cualquier write a archivos `.env*` |
| `block-rm-rf-absolute.sh` | `rm -rf` con paths absolutos fuera del repo, `/tmp`, `/var/tmp` |
| `block-force-push.sh` | `git push --force` o `--force-with-lease` en cualquier rama |
| `block-source-data-deletes.sh` | Writes vacíos sobre `src/config/services.ts`, `src/components/StarField.tsx`, `src/components/constellation/`, `src/components/CelestialBorder.tsx`, `src/app/globals.css`, `public/` |

**Configuración:** `.claude/settings.json` define qué hook se ejecuta
para qué tipo de tool call.

### CLAUDE.md (raíz del repo)

Contexto persistente cargado en cada sesión de Claude Code. ~60 líneas.
Cubre stack, convenciones, caveats, y referencia al estado actual del
proyecto.

---

## Cómo se trabaja: el workflow

Detalle completo en `AI_DEVELOPMENT_WORKFLOW.md` (ping-pong pattern,
Superpowers commands, patterns que funcionaron y no en Phase 6). Resumen
de las fases:

### A. Setup
Done. Este documento.

### B. Design (per project/feature)

1. **B1** — Repo con safety harness ✓ (ya está)
2. **B2** — Proyecto CLAUDE.md ✓ (ya está)
3. **B3** — Brainstorming con `/superpowers:brainstorming`
   - Output: design doc en `docs/superpowers/specs/`
4. **B4** — Plan-writing con `/superpowers:writing-plans`
   - Output: task plan en `docs/superpowers/plans/` con TDD baked in
5. **B5** — Plan review (el paso más importante)
   - Leer el plan completo, no solo el summary
   - Buscar: vertical slices, arquitectura proporcional, TDD honesto, failure modes
6. **B6** — Pre-execution corrections
   - Si el design phase produjo contexto inaccurate, corregir antes de ejecutar

### C. Execute (per task)

1. **C1** — Sprint vs Gate triage
   - Cada task se clasifica explícitamente en el plan
   - **Sprint** = self-verifiable, low cost, loud failures
   - **Gate** = arquitectural, real-world data, design judgment, silent failures
2. **C2** — Subagent-driven mode con `/superpowers:subagent-driven-development`
   - Cada task es fresh subagent context
   - Subagent: lee plan → escribe failing test → escribe código → corre tests → commit
3. **C3** — Review de Gates
   - Ver el diff real, no el summary
   - Mirar tests, no solo implementación
   - Verificar contra numbers reales cuando aplique
4. **C4** — Human test en vertical-slice boundaries
   - Plan los human tests en advance
   - Bound time: 10-15 min sessions
5. **C5** — Cuando el plan está mal: amend el plan file, no improvise

### D. Review (end of feature)

1. **D1** — Code review por subagent en fresh context con
   `/superpowers:requesting-code-review`
2. **D2** — Final human test (manual QA checklist del plan)
3. **D3** — Merge a `main` con `--no-ff`

### E. Retrospective

Antes del próximo proyecto: qué funcionó, qué fue fricción, qué patrones
repetidos merecen skill nueva.

---

## Reglas operacionales en este proyecto

### Git

- **Nunca commit directo a `main`.** El hook bloquea, pero la disciplina
  evita siquiera intentarlo.
- Feature branches con prefijo:
  - `feature/*` para features
  - `fix/*` para bugs
  - `chore/*` para infra/setup
  - `docs/*` para documentación
- Conventional Commits siempre (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Merges con `--no-ff` (preserva historia de la rama)
- Sin force push

### Branches con vida útil

- Una feature = una branch. Borrar al merge.

### Vercel y producción

- Push a `main` → deploy automático en Vercel
- Antes de mergear una feature a `main`: build local exitoso
  (`npm run build`)
- Después del merge: revisar el deploy en Vercel dashboard
- Si Vercel falla: hot revert con `git revert` (no `git reset` sobre main)

### Secretos

- **Nunca** en el repo. Hook bloquea writes a `.env*`.
- Producción: Vercel Dashboard → Settings → Environment Variables
- Local: `.env.local` (gitignored), creado por developer manualmente

### Skills hygiene

- No instalar skills que no se usan activamente
- Auditar periódicamente con `/context`
- Solo Superpowers como plugin instalado

---

## Cuando algo se rompe

### "Los hooks no están bloqueando lo que deberían"

1. Verificar branch actual: `git branch --show-current`
2. Verificar hooks existen: `ls -la .claude/hooks/`
3. Verificar permisos ejecutables: deben mostrar `-rwxr-xr-x`
4. Test manual del hook específico:
   ```bash
   echo '{"tool_input":{"command":"<comando-de-prueba>"}}' | .claude/hooks/<hook>.sh
   echo "Exit code: $?"
   ```
   Exit code 2 = bloquea correctamente. Exit code 0 = permite.
5. Si el hook es correcto pero Claude Code no lo invoca: verificar
   `.claude/settings.json` matcher.

### "Claude Code está hallucinando APIs"

Activar Context7 MCP en la sesión. Cuando preguntes sobre Stripe, Drizzle,
Resend, etc., Claude usa Context7 para traer documentación actual.

### "Un subagente está propagando contexto incorrecto"

El project CLAUDE.md tiene info stale. Actualizarlo en `main` (en una
branch chore/) **antes** del próximo dispatch.

### "Necesito ejecutar algo que un hook bloquea"

Hazlo tú directo en tu shell. Los hooks bloquean a Claude, no a ti.
Si te toca limpiar un commit accidental en main, force push para
recuperar de un mal merge, etc., el developer es quien tiene los privilegios.

---

## Próximos pasos para nuevos developers

1. Clonar el repo
2. `npm install`
3. `cp .env.example .env.local` (cuando exista) y pedir secretos al maintainer
4. Verificar `claude --version` y `claude mcp list`
5. Leer este documento + `CLAUDE.md` + `AI_DEVELOPMENT_WORKFLOW.md` + `SYSTEM_STATUS.md`
6. Abrir Claude Code desde la raíz del repo y `/hooks` para confirmar
   los 5 hooks están cargados
