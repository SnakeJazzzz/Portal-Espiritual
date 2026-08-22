# Phase 6.5 — Backlog priorizado

> **What this is:** post-Phase-6-launch backlog acumulado durante el ciclo
> de implementación + smoke + hotfix. No es un plan ejecutable — es input
> para `/superpowers:brainstorming` cuando se decida arrancar Phase 6.5.
> Cada item lista contexto del descubrimiento, por qué importa, y fix
> sugerido (no obligatorio).
>
> **What this is not:** ni una promesa de cuándo se ejecuta, ni un orden
> obligatorio. Severidad sirve para triaje; agrupación por categoría sirve
> para detectar bundles naturales en brainstorming.

---

## Severity levels

- **HIGH** — operational risk active in production. Tech debt that has
  already bitten or is one bad invocation away.
- **MEDIUM** — degraded UX, ops friction, or developer experience cost that
  the team works around currently.
- **LOW** — polish, ergonomics, hardening that nobody loses sleep over.

---

## HIGH

### Data integrity

#### [HIGH/DI-1] Split DATABASE_URL_TEST como Neon branch aparte

**Status: COMPLETADO** (merge `1f9cc89`, 2026-08-21). Se implementó el
Approach A ampliado: branch Neon `test` + `DATABASE_URL_TEST` sin
fallback; guards en `tests/integration/env-guard.ts` (existencia de la
var, `ALLOW_DESTRUCTIVE_TESTS`, host de test ≠ host de producción) que
abortan antes de abrir conexión alguna; lógica de guards como función
pura con unit tests; y script `db:migrate:test` para paridad de schema
entre branches. El contenido original se preserva abajo como registro.

**Context:** during the hotfix cycle, two destructive-TRUNCATE incidents
occurred because integration tests (`tests/integration/setup.ts`) run a
`beforeEach` that `TRUNCATE`s 8 tables. `.env.local` currently points
`DATABASE_URL` at the production Neon `main` branch (the same DB Vercel
production reads from). Both incidents were recovered by re-seeding JP
admin and resending Stripe webhooks, but the recovery cost was ~30 min
each.

The pre-launch `ALLOW_DESTRUCTIVE_TESTS=true` gate (documented in the
now-archived `docs/archive/known-issues-pre-launch.md`) is a tripwire —
it catches the accidental invocation but not the "I-set-the-var-and-the-
DB-was-still-prod" case.

**Why it matters:** any contributor (Claude Code agent, new developer,
CI run) who runs `vitest run` against `.env.local` deletes production
state. The recovery path exists but it costs time and risks subscriber
trust.

**Fix sugerido:**
- **Approach A (minimum viable):** create a new Neon branch `tests` with
  the same schema and no production data. Add `DATABASE_URL_TEST` to
  `.env.local` + Vercel scope. Update `tests/integration/setup.ts` to use
  `DATABASE_URL_TEST` instead of `DATABASE_URL`. Keep the
  `ALLOW_DESTRUCTIVE_TESTS` gate as belt-and-suspenders + add an
  invariant check that `DATABASE_URL_TEST !== DATABASE_URL`.
- **Approach B (long-term):** move tests to a containerized Postgres
  (Docker, or vitest-managed pglite). No remote DB at all for tests.

Approach A unblocks immediately; B is the ergonomic answer for CI.

---

### Security

#### [HIGH/Sec-1] Standing rule en CLAUDE.md sobre destructive tests

**Status:** **landed in this docs cleanup PR** (commit 10/11). Documented
here for completeness — the actual rule lives in `CLAUDE.md` at the repo
root.

The rule: NEVER run vitest against `.env.local` without first verifying
`DATABASE_URL` does not point at the production Neon branch.

**Why it matters:** regression prevention. The TRUNCATE bug already
surfaced twice during launch — the rule reduces the third occurrence
probability for new contributors who haven't seen the incident.

**Permanent fix:** [HIGH/DI-1] makes this rule obsolete. **Aplicado
2026-08-22:** DI-1 está completado y la regla manual en `CLAUDE.md` fue
reemplazada por la descripción del aislamiento automático (los guards de
`tests/integration/env-guard.ts` hacen la verificación que la regla
pedía hacer a mano).

---

## MEDIUM

### Security

#### [MEDIUM/Sec-2] Rate limiting en `/api/auth/verify`

**Context:** during the LIVE smoke a bot scanner probed `/admin/.env`
(causing the postgres `22P02` that drove the UUID-validation hotfix).
The same scanner pattern often probes `/api/auth/verify` looking for
exploit vectors. Currently the verify endpoint has no per-IP rate limit
— the `/api/auth/login` endpoint does (5 attempts/min/IP) but verify
doesn't.

**Why it matters:** while `auth_tokens` are SHA-256 hashed and
single-use, an unlimited verify attempt rate lets a scanner enumerate
the token namespace cheaper than expected.

**Fix sugerido:** reuse the existing `rate_limit_attempts` table +
helper in `src/lib/rate-limit.ts`. Add a `verify` endpoint scope. Same
5/min/IP threshold as login is a reasonable default.

---

### Ops

#### [MEDIUM/Ops-1] Mirror env vars Production → Preview en Vercel scope

**Context:** during PR #1 the Vercel preview deploy failed because the
Production env vars (STRIPE_*, RESEND_*, APP_URL) were not mirrored to
the Preview scope. The `prebuild: npm run db:migrate` triggered
`drizzle.config.ts` → `getEnv()` → Zod validation → failure on missing
vars.

**Why it matters:** every PR has a red Vercel check until env vars
land in Preview scope. Devs lose the preview-deploy safety net (manual
smoke before merge to main).

**Fix sugerido:** `vercel env pull` from Production, then `vercel env
add` each to Preview scope. Or use the Vercel UI: Settings → Environment
Variables → check "Preview" alongside "Production" for each var. ~3 min
of UI work. Or scripted via Vercel CLI from a developer machine.

---

#### [MEDIUM/Ops-2] Webhook destination URL canonicalization docs

**Context:** during the LIVE smoke the webhook destination was initially
configured with the apex domain `portalespiritual.com.mx`. This caused
307 redirects on every webhook delivery — Stripe received 200 OK from
the redirect endpoint and considered each delivery successful, but the
actual handler at `www.portalespiritual.com.mx/api/webhooks/stripe`
never ran. Symptom: webhooks "delivered" per Stripe Dashboard, DB never
updated.

**Why it matters:** the bug is silent. If the canonical URL drifts back
to apex (Stripe migration, infra change, contributor error), the
breakage doesn't surface until subscriber-facing behavior diverges from
expected.

**Fix sugerido:** explicit assertion in `SYSTEM_STATUS.md` is already in
place. Additional hardening: a Vercel redirect rule that rewrites
apex→www at the edge (Stripe's POST to apex would survive the rewrite
preservation of method+body). Verify Stripe webhook resending tolerates
that pattern.

---

#### [MEDIUM/Ops-3] Structured logger en lugar de `process.stderr.write` directo

**Context:** the cancel-route fail-closed path writes to stderr via
`process.stderr.write(...)`. This works for the Vercel runtime log but
doesn't ship structured fields (request ID, subscriber ID, environment
tag), which makes triage harder once volume grows.

**Why it matters:** as soon as Phase 6.5 lands logs from rate limiting
+ webhook diagnostics + admin actions, the unstructured stream becomes
the bottleneck for "find me all the 500s last hour from admin cancel
on this customer."

**Fix sugerido:** minimal structured-log helper (e.g. `src/lib/log.ts`
with `log.error({ event, ...fields })`). Don't pull in pino/winston —
the overhead isn't justified at this scale. JSON-line-to-stderr is
enough.

---

### DX

#### [MEDIUM/DX-1] zsh bracket-path quoting documented

**Status:** **landed in this docs cleanup PR** (commit 10/11) as standing
rule in `CLAUDE.md`.

Discovered during hotfix subagent dispatch: `git add 'src/app/admin/[id]/page.tsx'`
without single quotes fails in zsh with `no matches found` because the
shell glob-expands `[id]`.

**Why it matters:** every contributor touching the `/admin/[id]` route
hits this once. Documenting it is cheaper than re-discovering.

---

#### [MEDIUM/DX-2] Post-feature worktree cleanup documented

**Status:** **landed in this docs cleanup PR** (commit 10/11) as standing
rule + commit 11/11 prunes the existing leftovers.

`/superpowers:subagent-driven-development` creates `.claude/worktrees/agent-<id>/`
directories per subagent dispatch. These survive the merge to main.

**Why it matters:** cluttered filesystem. Worktree branches also
accumulate in `git branch` output.

**Fix sugerido:** `git worktree prune && rm -rf .claude/worktrees/`
after merge. Documented as standing rule. Possible future automation:
post-merge hook.

---

### UX

#### [MEDIUM/UX-1] Amber badge logic: `cancelAtPeriodEnd && status === 'active'`

**Context:** the hotfix added an amber pill in `/admin` lista when
`cancelAtPeriodEnd=true`. Current logic fires the pill purely on the
`cancelAtPeriodEnd` boolean. Edge case: a `status='canceled'` sub with
`cancelAtPeriodEnd=true` (data from when the sub was active-canceling
before the final period-end deletion) shows as `"canceled (cancela)"` in
the amber pill — cosmetic, not functional, but visually awkward.

**Why it matters:** purely cosmetic — JP's day-to-day view of
"who's canceling soon" only shows active subs by default. The "canceled"
tab is where the awkward rendering would surface, and even there it's a
single-line oddity.

**Fix sugerido:** condition the pill on `status === 'active' &&
cancelAtPeriodEnd`. One-line change in `SubscribersList.tsx`.

---

#### [MEDIUM/UX-2] Email fallback en columna Nombre para subs sin perfil completo

**Context:** if a subscriber pays but doesn't complete the
`/cuenta/perfil` onboarding, `subscribers.name` stays null. The admin
lista renders `—` for the name. JP has to cross-reference via the email
column or click into the detail page.

**Why it matters:** small UX paper cut for JP that compounds as the
subscriber count grows.

**Fix sugerido:** in `SubscribersList.tsx`, show the email when name is
null. Keep the link to the detail page.

---

## LOW

### UX

#### [LOW/UX-1] Toast notifications en lugar de `alert()` en admin error handling

**Context:** the hotfix added `alert(body.message)` to
`CancelSubscriptionButton` for non-OK responses (Stripe-OK / DB-fail
case). `alert()` is functional, accessible, blocking — but jarring.

**Why it matters:** admin UI ergonomics. Not subscriber-facing so the
priority is low.

**Fix sugerido:** small toast library (react-hot-toast adds ~3KB) or a
hand-rolled portal-based toast component. Replace the 2 `alert()`s in
admin button error paths.

---

#### [LOW/UX-3] SubscribersList: `—` clickeable para subs sin nombre

**Context:** related to [MEDIUM/UX-2] above. Currently the `—` placeholder
in the Name column is NOT clickable to the detail page — only the row's
"Ver detalle →" cell is. If the email fallback is implemented (UX-2)
the `—` case may disappear naturally, but if kept the `—` should at least
link to detail.

**Why it matters:** consistency with the rest of the row's clickability.

**Fix sugerido:** wrap the `—` in the same `<Link>` as the name. Or
solve via UX-2 (email fallback).

---

## How to use this backlog

When Phase 6.5 starts:

1. Run `/superpowers:brainstorming` with this doc as one of the inputs.
   Brainstorming groups items into vertical slices that make sense to
   ship together.
2. HIGH items should likely lead the first slice — data integrity is the
   one ongoing operational risk.
3. The cluster MEDIUM/DX-1 + MEDIUM/DX-2 + LOW items are already partially
   resolved by this docs cleanup PR (standing rules + worktree prune).
   Re-read those sections before re-opening — they may be effectively
   closed.
4. MEDIUM/Ops items (env mirror, webhook canonicalization, structured
   logger) are independent and could be a single small slice.

Don't treat severity as deadline. The system runs fine in production today
without any of these — `phase-6-launched` is green, the smoke a/b/c/d/e
passed on production, subscribers can subscribe and cancel. The backlog
is forward-progress, not firefighting.
