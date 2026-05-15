# Phase 6 — Progreso de Ejecución

**Última actualización:** 2026-05-15
**Branch:** `feature/phase-6-mentoria-spec`
**Último commit:** `feat(webhook): S7 close-out — refund-path defense + final review minors` (hash variable — buscar por subject en `git log --oneline`; un commit no puede referenciarse a sí mismo por hash sin un follow-up commit)

> Plan completo: `docs/superpowers/plans/2026-05-13-phase-6-mentoria-implementation.md`
> Spec: `docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md`
> DEVLOG histórico: `docs/DEVLOG.md`

---

## Slices completados

### S1 — Foundation ✅
Drizzle + Neon + Zod env + products table + vitest scaffold + /api/health.

Commits:
- `0f74030` chore(deps): add drizzle, stripe, resend, zod, vitest for Phase 6
- `c6fadb2` added .env.example (humano, fuera del plan; ahora autoritativa)
- `3c8eeda` feat(env): add Zod-validated env access in src/lib/env.ts
- `9fae7aa` feat(db): add Drizzle config, db client, and products table schema
- `67e1ff5` chore(build): add db:migrate, prebuild hook, and test scripts
- `e02f445` feat(db): seed mentoría product row
- `8f9198c` test(infra): vitest config + products integration test
- `2ad32b1` feat(api): add /api/health endpoint for boot verification
- `3fc63d4` docs(devlog): log Phase 6 S1 progress and known caveats

Tests: **1/1 PASS** (products seed). Smoke manual: Day-1 invariant validated (homepage 4-card grid + Cal.com + AboutMe sin regresión).

### S2 — Public page + Checkout redirect ✅
`/mentoria` con MentoriaCard + Stripe Hosted Checkout + `/gracias` + capacity read-only.

Pre-S2 fix:
- `ceff528` fix(seed): replace prod_placeholder with real Stripe product ID (`prod_UV4jAxf6bKDQmr`)

Commits S2:
- `fa3e1e6` refactor(env): switch env.parse to lazy getEnv() + add seed guard to test setup
- `a571f3e` feat(config): add mentoria.ts single-source-of-truth
- `5d176ca` feat(stripe): pinned-version Stripe SDK client
- `f5c1a90` feat(capacity): add read-only getCapacity helper (write helper added in S7)
- `f221146` feat(ui): MentoriaCard with capacityFull-aware CTA
- `39818a4` feat(api): POST /api/checkout/create — Stripe Hosted Checkout
- `c137ae7` feat(page): /mentoria server component with capacity-aware CTA
- `4d6eeed` feat(page): /gracias post-checkout success page

Post-S2 UI/QA fixes:
- `304dbf0` fix(visual): add StarField to /mentoria and /gracias
- `1bf6e42` fix(ui): improve cancel-checkout banner visibility on /mentoria
- `4f19a76` chore(comments): add slice-tagged TODOs for deferred behaviors
- `3d51da2` docs(devlog): log S2 manual QA findings (first-attempt decline)

Tests: 1/1 (sin tests nuevos en S2 por contrato del plan). Smoke manual: Stripe checkout end-to-end, $2222 MXN, `/gracias` redirect, cancel flow con banner amarillo.

### S3 — Webhook foundation + happy path (Tests 1, 4) ✅
4 nuevas tablas (`subscribers`, `subscriptions`, `auth_tokens`, `stripe_events`) + partial unique index + auth-tokens (SHA-256 hashed) + Resend + handler `checkout.session.completed` + signature-verified idempotent dispatcher.

Commits S3:
- `5e453fa` feat(db): add subscribers, subscriptions, auth_tokens, stripe_events
- `7522955` feat(capacity): query subscriptions for live count (active + past_due)
- `ed6cd8b` feat(auth): SHA-256 token generation, hashing, and single-use consume
- `c4508a9` feat(email): Resend client + welcome email template
- `8728979` test(helpers): Stripe event fixture + Resend send-mock
- `c8dc6d8` feat(webhook): happy-path checkout.session.completed handler
- `33220f6` feat(webhook): signature verify + idempotent dispatcher (commit-at-end)
- `8218b6f` test(spec): satisfy spec tests 1 (happy path) + 4 (idempotency)

S3→S4 bundle:
- `0b6eecf` refactor(webhook): tighten error logging + payload typing + document partial-index drift + smoke test learnings

Tests: **3/3 PASS** (Test 1 + Test 4 nuevos). Smoke manual end-to-end: Stripe CLI (cuenta correcta), webhook devolvió 200 en 12 eventos, fila `subscribers` + `subscriptions` con `welcome_email_status='sent'`, Resend delivered al inbox de Gmail.

### S4 — Magic link verify + /cuenta gate + perfil (Tests 5, 9-partial) ✅
Sessions table + `src/lib/auth.ts` (createSession/getSession/deleteSession/requireAuth/requireAdmin) + verify route + logout route + /cuenta layout + first-visit profile form con Zod.

Commits S4:
- `821cc6c` feat(db): add sessions table
- `73e3e02` feat(auth): session create/read/delete + auth/admin guards
- `a8f497f` feat(auth): GET /api/auth/verify with role+profile-aware redirect
- `0d2d0e9` feat(auth): POST /api/auth/logout
- `ac763bb` feat(cuenta): auth+profile gate layout + placeholder page
- `d39ea6a` feat(cuenta): first-visit profile form with field-level gate
- `7fa7780` test(spec): satisfy spec tests 5 + 9 (security criteria, partial)

Fixes post-S4 code review:
- `006c9dd` fix(auth): make cookie Secure flag dynamic per APP_URL  (Important #1)
- `41592b8` refactor(auth): fix profileCompletedAt semantics + extract isProfileComplete + remove ghost x-pathname check  (Important #2, #3, #4)

Tests: **8/8 PASS** (5 nuevos: Test 5 single-use; Test 9 plaintext-never-in-DB, expired-rejected, cookie-attrs, logout). Smoke manual end-to-end: magic link → `/cuenta/perfil` → form submit → persistencia; `profileCompletedAt` invariant validado en DB.

### S5 — Subscriber dashboard + Customer Portal ✅
Real `/cuenta` con SessionsCounter + PastDueBanner + InlineEditableField + `updateSubscriberField` action + ManageBillingButton + portal endpoint con error handling.

Commits S5:
- `002ee81` feat(api): POST /api/billing-portal/create
- `0778e8e` feat(ui): dashboard sub-components
- `437e7bd` feat(cuenta): inline-edit server action for subscriber fields
- `279d6b2` feat(cuenta): subscriber dashboard with edits + portal + logout
- `ad2a7a7` docs: Stripe Customer Portal required configuration

Fixes post-S5 code review:
- `b7e485a` fix(cuenta): make portal button JS-driven + remove as any + parameterize sessions total + new URL for portal return  (Critical #1 + #2 + Important #1 + #2)

UI fixes post-S5 smoke:
- `748ad95` feat(cuenta): make inline-edit discoverable + fix email styling + verify StarField

Tests: **8/8 PASS** (sin tests nuevos en S5 por contrato del plan). Stripe Customer Portal configurado en test mode (return URL prod, cancellation end-of-period). Smoke manual end-to-end: dashboard, Customer Portal apertura sin JSON crudo, edit/save flow con "✓ guardado" feedback. `profileCompletedAt` invariant preservado tras 3 edits sucesivos (~51 min entre primer profileCompletedAt y último updatedAt).

### S6 — Subscription lifecycle webhooks (Tests 6, 6b, 7) ✅

4 nuevos handlers en `src/lib/webhooks/` + admin cancel route + 5 nuevos event-type cases en el dispatcher (4 reales + `customer.subscription.created` no-op) + `mapStatus` helper con override defensivo + 1 archivo de tests nuevo (`admin-cancel.test.ts`) + Test 6 + Test 6b + Test 7 + 9 mapStatus unit cases.

Commits S6 (gates + cleanups, 12 commits):
- `4a8c95e` feat(webhook): customer.subscription.updated handler with mapStatus
- `7bec7b5` test(spec): satisfy spec test 6 (cancel flow) + mapStatus unit cases
- `d821e48` fix(webhook): tighten Test 6 invariant + dispatcher style + update 6.5 backlog scope
- `414cd03` feat(webhook): invoice.paid + invoice.payment_failed handlers
- `b556203` test(spec): satisfy spec test 7 (past_due → restore)
- `9411c70` chore(webhook): remove redundant comment from invoice.paid handler
- `214cd62` feat(webhook): customer.subscription.deleted handler
- `635179f` feat(webhook): dispatch customer.subscription.deleted + created no-op
- `b5ed7e2` chore(webhook): trim no-op case comment to two lines
- `98e4bd0` feat(api): POST /api/admin/cancel-subscription with requireAdmin guard
- `d64b50a` test(spec): Test 6b — admin cancel route calls Stripe with cancel_at_period_end
- `be1e1c3` chore(test): document vi.hoisted WHY in admin-cancel test

Post-S6 smoke fixes:
- `[S6 close-out]` fix(cuenta): resolve S6 smoke findings + document test isolation gap (hash buscarlo en `git log --grep="S6 smoke findings"`)

Tests: **20/20 PASS** (12 nuevos en S6: Test 6, Test 6b, Test 7, + 9 `mapStatus` unit cases).

Smoke manual S6: **validado parcial.**

- **Validado con eventos reales de Stripe:** flujo end-to-end de nuevo subscriber (`/mentoria` → checkout → webhook → magic link email → `/cuenta`); Test 6 contract end-to-end vía Customer Portal (cancela pending correctamente seteada con `status='active', cancelAtPeriodEnd=true, canceledAt=null`); signature verification + idempotent dispatcher (200 responses); multi-row WHERE behavior con 2 cuentas coexistiendo sin interferencia.
- **No validado con eventos reales (sí cubierto por tests integración 20/20):** `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, admin cancel route con sesión admin real. `stripe trigger` y `stripe invoices create` ambos limitados para forzar renewal sobre subs recién creadas — requiere Stripe test clocks. Diferido a pre-launch checklist S10/S11.

Decisiones tomadas durante S6:

1. **`mapStatus` override (incomplete → past_due por SCA/3DS).** El plan original mapeaba "todo lo demás" a `active`. Decisión humana: mapear `incomplete` y `paused` a `past_due` defensivamente para no dar acceso sin pago confirmado durante 3DS/SCA gate. Defensive fallback con `console.error` para telemetría de futuros enum drifts de Stripe. Test unitario cubre los 9 branches incluyendo el fallback.
2. **Mock complexity ceiling (vi.hoisted en Test 6b).** Test 6b requirió mocking simultáneo de `@/lib/stripe` + `@/lib/auth`. Setup llegó a 10 líneas (ceiling acordado). `vi.hoisted` necesario por hoisting de vi.mock factories en Vitest; comentado en código para explicar el WHY.
3. **Capacity semantics verificadas.** `getCapacity` en `src/lib/capacity.ts:13` filtra por `inArray(status, ['active', 'past_due'])`, no por presencia de fila. Confirma que cancelaciones liberan capacidad automáticamente al flip de status. S7 puede asumir esta semántica.
4. **Smoke con `stripe trigger` limitado.** Eventos de lifecycle (`invoice.paid`, `payment_failed`, `subscription.deleted`) requieren Stripe test clocks para validar con payloads reales en development. `stripe trigger` envía eventos con payloads sintéticos que no corresponden a subs reales; `stripe invoices create` requiere customer existente sin pending invoice. Diferido a S11 pre-launch.

### S7 — Capacity race + duplicate guards + failure-path emails (Tests 2, 3, 8) ✅

Helper atómico `insertSubscriptionIfCapacity` (un solo SQL statement: INSERT … SELECT … WHERE COUNT < capacity RETURNING) que cierra la race S3 via unique constraint sobre `stripe_subscription_id`. Refactor de `handle-checkout-completed.ts` para branching `result.inserted` (happy path) vs `result.reason` (capacity_full / duplicate_subscription → refund path). 2 nuevos email templates (race + duplicate) con refund timing 5-10 días hábiles. Audit log table + helper `appendAudit` para system-initiated rows (`adminId: null`). Pre-checkout 409 guard en `POST /api/checkout/create` para subscribers logueados con sub activa + Stripe customer reuse para re-subscription post-cancel.

Commits S7 (range `986d05d..HEAD`): 12 commits durante Gates A-D + este close-out commit = 13 total.

- `69d0f6f` docs: add BUG-S7-edge-1 to Phase 6.5 backlog (launch blocker)
- `ed49e7f` feat(db): audit_log table + appendAudit helper
- `c45aea8` test(helpers): stateful Stripe mock that tracks refund state
- `3661b4d` fix(audit): tighten audit.ts + stripe-mock-with-state.ts per code review
- `57e318b` test(spec): satisfy spec tests 2 (race), 3 (mixed), 8 (duplicate) — RED at Gate B close
- `57c46a3` feat(capacity): atomic insertSubscriptionIfCapacity (full + duplicate handling)
- `b23b8de` feat(email): race-condition + duplicate-subscription templates with refund timing
- `793a50f` chore: Gate B code-review minors — drop drift-prone line refs + log deferrals
- `2fa8e11` feat(webhook): race-condition + duplicate-subscription refund paths
- `e9b03c2` chore: Gate C code-review minors — atomicity WHY-comment + backlog updates
- `e1a5d46` feat(checkout): pre-checkout 409 guard + Stripe customer reuse
- `bfce921` chore: Gate D code-review minor — narrow body.redirect to string + log API typing sweep

S7 close-out:
- `[S7 close-out]` feat(webhook): S7 close-out — refund-path defense + final review minors (hash buscarlo en `git log --grep="S7 close-out"`)

Tests: **23/23 PASS** (3 nuevos en S7: Test 2 capacity race + Test 3 mixed-status capacity + Test 8 duplicate-subscription). Subimos de 20/20 → 23/23. El I1 fix del close-out (refund-path defense para null `payment_intent`) mantuvo 23/23 PASS — el mock `stripe-mock-with-state` maneja correctamente el unconditional `cancel` call porque ambos test 2 y test 8 seedan la subscription en `stripeState` antes de disparar el webhook.

Smoke manual S7: **Pendiente.** Discutir alcance con humano después de close-out commit. Refund flow + pre-checkout guard NO validados con eventos reales — solo tests de integración cubren los happy paths (race con 8 active, mixed status 5 active + 3 canceled, duplicate sub). Stripe Customer Portal cancel flow (heredado de S6 smoke) sí validado.

Decisiones tomadas durante S7:

1. **Advisory lock para race resolution rechazado tras verificación técnica.** Neon connection pool no garantiza session affinity para `pg_advisory_lock` (session-level); variante `pg_advisory_xact_lock` requiere transaction wrapper que rompe spec §13.2 (DB commits before external Stripe/Resend calls). La race está cerrada por unique constraint en `stripe_subscription_id` + check `result.inserted` del helper 7.2 — defense suficiente para nuestra escala. Backlog 6.5 item M3 documenta la race remanente entre subscribers distintos a capacity boundary con upgrade trigger (capacity > 30 cupos O primer caso observado en producción).
2. **Empirical-first sobre `as any` / escape hatches.** Lección aplicada a través de gates: 0 nuevos `as any` introducidos en código de producción S7. Reviewer empíricamente caught 2 falsos positivos del drift list pre-implementación (Drizzle nullable jsonb accepts `unknown` directly; Stripe SDK signatures más estrictos de lo asumido). Regla codificada en `~/.claude/CLAUDE.md` developer global post-Gate-A.
3. **mapStatus override de S6 preservado.** Verificado en cross-gate review — `handle-subscription-updated.ts:8` 5-branch body intacto; los 9 unit tests de mapStatus siguen GREEN. S7 no tocó dispatcher (cumplió scope discipline).
4. **I1 fix close-out — refund-path defense.** `stripe.subscriptions.cancel` separado del guard `if (paymentIntentId)`. Cancel side-Stripe ahora unconditional para evitar orphan Stripe subscriptions cuando `payment_intent` es null. Refund creation sigue dependiendo de PI presence; rama else loggea `console.warn` con event_id + stripe_sub_id + reason para telemetría. Resuelve simultáneamente Gate-C-M1 trigger condition (setup-mode checkout futuro) y I1 (cross-gate reviewer finding). Code comment WHY agregado inline (no se documenta separadamente en backlog porque el código es self-documenting).

Configuración externa S7: sin cambios. Stripe Customer Portal sigue configurado solo en test mode (live mode pending S11 pre-launch). Resend domain `portalespiritual.com.mx` verified. Stripe SDK pin a `'2025-02-24.acacia'` mantenido.

---

## Pendiente

### S8 — Login magic link + rate limit (Tests 9-remaining, 10, 11)
`/api/auth/login` (POST email → magic link login token, 15-min TTL). Rate limit (table `rate_limit_attempts` ya planeada en S1). Tests: 9 timing-safe-comparison + 9 no-account-leak + 10 + 11.

### S9 — Waitlist + /privacidad + home integration
Tabla `waitlist`, form en MentoriaCard cuando `capacityFull=true`. Página de privacidad (LFPDPPP). Integración del MentoriaCard en homepage debajo de la grid 2x2 existente (additive).

### S10 — Admin panel + seed admin + pre-launch checklist
`/admin` rutas con `requireAdmin`. Seed inicial del admin via `ADMIN_SEED_EMAIL`. Pre-launch checklist (S11 gate).

---

## Estado de DB (Neon test branch)

DB vacía tras `npm test` (issue documentado en backlog 6.5: `DATABASE_URL` compartido entre dev y tests). Para regenerar subscribers de smoke en futuros chats, repetir flujo de checkout vía `/mentoria`.

**Smoke S6 anterior (data wipeada por test suite del cierre):**
- `michael.devlyn.tech@gmail.com` (sub `sub_1TXFq5PwEjHy5wNA0lOllwkQ`, `cancelAtPeriodEnd=true` tras smoke S6)
- `michael.devlyn.personal@gmail.com` (sub `sub_1TXGNbPwEjHy5wNA0Wnb0jZc`, activa limpia)

Las suscripciones en Stripe siguen vivas y son cancelables manualmente desde Stripe Dashboard si se necesita limpiar antes de repetir smoke.

## Configuración externa

- **Stripe Customer Portal (test mode): CONFIGURADO**
  - Cancel: end-of-period (NO immediate)
  - Update payment methods: enabled
  - View invoice history: enabled
  - Update business info: disabled
  - Switch plans / Quantity change / Pause: disabled
  - Return URL: `https://portalespiritual.com.mx/cuenta`
- **Stripe Customer Portal (live mode): NO CONFIGURADO** (requerido antes de S11 pre-launch)
- **Stripe Product:** `prod_UV4jAxf6bKDQmr` ("Mentoría 1-a-1", $2222 MXN recurring monthly)
- **Stripe API version** pinned en código: `'2025-02-24.acacia'`
- **Stripe API version** del account: `2026-02-25.clover` (cambia con releases de Stripe; conversión server-side mitiga drift — bump SDK a v18+ en Phase 6.5)
- **Resend domain** `portalespiritual.com.mx`: verified
- **Resend Gmail delivery:** working (inbox)
- **Resend iCloud delivery:** marked delivered por Resend pero filtrado por iCloud (no bloqueante; anotado para Phase 6.5)

## Decisiones importantes tomadas durante ejecución

1. **`getEnv()` lazy refactor** (S2 commit `fa3e1e6`) — env parsing es lazy con cache interna. Workarounds `--env-file=.env.local` siguen siendo necesarios para tooling CLI que no auto-carga `.env.local`.
2. **Stripe SDK pin** a `'2025-02-24.acacia'` por compat con `stripe@17.7.0`. Plan pedía `'2025-09-30.clover'` pero SDK actual no lo acepta. Bump a v18+ en Phase 6.5.
3. **Post-Basil type assertion** en `handle-checkout-completed.ts` — narrow intersection (no `as any`) para `current_period_start/end` que viven en `items.data[0]` desde Stripe API 2025-03-31.
4. **Idempotency commit-at-end** (S3) — race conocida concurrente del mismo `event.id` deferida a S7 por contrato del plan.
5. **`profileCompletedAt` semantics** (S4 bundle `41592b8`) — solo se setea en primera completion (`subscriber.profileCompletedAt ?? new Date()`). Invariant validado end-to-end en S5 smoke.
6. **`isProfileComplete` helper** (S4 bundle) — extraído a `src/lib/auth.ts`, replaces 3 duplicaciones.
7. **`/cuenta` layout sin x-pathname check** (S4 bundle) — eliminado el ghost middleware check que causaba `ERR_TOO_MANY_REDIRECTS`. Decisión de redirect lives en page-level individual (`/cuenta` redirige si profile incompleto, `/cuenta/perfil` redirige si completo).
8. **Cookie Secure flag dinámico** (S4 `006c9dd`) — `secure: APP_URL.startsWith('https://')` permite cookie en dev local sobre HTTP. Test ahora verifica el contrato dinámico vía `process.env.APP_URL` (no `getEnv()` para evitar tautología).
9. **`/api/billing-portal/create` JS-driven button** (S5 fix `b7e485a`) — el endpoint devuelve JSON, no redirect. Form-POST original llevaba al usuario a página JSON cruda. ManageBillingButton (Client Component) hace fetch + `window.location.href`.
10. **Inline-edit approach** — "siempre editable con styling fuerte + hint prominente + ✓ guardado feedback" en lugar de patrón "Editar/Guardar/Cancelar global". Refactor diferido a Phase 6.5 si JP da feedback.
11. **Stripe CLI account mismatch** (smoke S3) — autenticación a cuenta equivocada causa silent false negative en `stripe listen`. Mitigación: `stripe config --list` antes de cualquier smoke.

## Caveats de setup local (de `docs/DEVLOG.md`)

- `tsx`, `drizzle-kit`, `vitest` no auto-cargan `.env.local` → usar `node --env-file=.env.local ./node_modules/.bin/<tool>`
- `psql` no instalado local → verificaciones vía Drizzle JS query
- `npm audit`: 17 vulns post-install (12 mod, 5 high) — fuera de scope Phase 6, polish pass
- Node v23 emite EBADENGINE warning para `eslint-visitor-keys@5.0.1` (no bloqueante)
- `npm run build` local falla porque `prebuild` corre `drizzle-kit migrate` que no auto-carga `.env.local`. Workaround: `./node_modules/.bin/next build` directo. En Vercel está OK.
- `NODE_OPTIONS=--env-file=...` no funciona con Next.js workers (`ERR_WORKER_INVALID_EXEC_ARGV`)
- `scripts/login_url.ts` (untracked, gitignored) genera magic link manual para dev/smoke
- Pre-existing 9 lint errors (`tests/helpers/*`, `tests/integration/*`, `BookingModal.tsx`) — S3-era, fuera de scope hasta Phase 6.5 polish
- **`npm test` TRUNCATEa `subscribers`/`subscriptions`/`sessions`/`stripe_events`/`auth_tokens`** en la DB apuntada por `DATABASE_URL`. Hasta que se separe `DATABASE_URL_TEST` (bloqueante S11 — ver backlog 6.5), NO correr `npm test` después de un smoke manual si querés preservar los subscribers reales.

## Phase 6.5 backlog (acumulado de los reviews)

De `docs/DEVLOG.md` entry de S5:

- **Inline-edit pattern post-launch feedback.** Si JP reporta que per-field click-to-edit feels clunky, refactor a "Editar / Guardar / Cancelar" unificado con todos los campos a la vez. Decision blocked en real-user feedback (S10 pre-launch UX pass).
- **"Toque más profesional" en dashboard.** Catch-all para polish que debe landear antes de launch (S10) pero no bloquea S6–S9: typography tightening, icon para el ✓ indicator, transitions, error-state colors. Reservar tiempo en S10; needs JP feedback.
- **Auto-save vs explicit-save.** Pattern actual es explicit Guardar (button-triggered, no keystroke). Si futuro UX se mueve a keystroke auto-save + profiling muestra write amplification, añadir `300-500ms` debounce.
- **`alert()` → toast.** Tres sites usan `alert()`: `MentoriaCard`, `PastDueBanner`, `ManageBillingButton`. Todos tagged `TODO(Phase 6.5): replace alert with toast`. Pick small toast lib o write minimal one.
- **`AbortController` para fetches en client components** que redirigen via `window.location.href`. Window navigation hace impacto near-zero hoy pero es el canonical pattern.
- **InlineEditableField re-sync.** Local `value` state nunca re-sync con `initialValue` si parent re-renders con new server data. `revalidatePath('/cuenta')` causa server-side re-fetch — verificar comportamiento observado antes de añadir `useEffect` o `key={initialValue}`.
- **Error display en InlineEditableField.** Si `onSave` throws, user ve spinner stop sin mensaje. Solo falla path es Zod hoy (no triggerable from controlled input). Cuando action grow, añadir try/catch slot con inline error.
- **Pre-existing test-file `any` errors (9 de S3 + N de S6, contar al cierre de Phase 6).** `tests/helpers/*`, `tests/integration/*`, `BookingModal.tsx` — out of scope hasta Phase 6.5 polish. S6 añadió nuevas introducciones de `as any` / `event: any` en `tests/integration/subscription-lifecycle.test.ts` y `tests/integration/admin-cancel.test.ts` (estas con `eslint-disable` comments justificando el WHY), siguiendo el patrón establecido en `webhook-happy-path.test.ts`.

De otros DEVLOG entries:

- **Decline handling telemetry.** First-attempt Stripe Radar / Link interference observado en S2 smoke. Si persiste con real card flows o aparece en Sentry post-webhooks, investigar.
- **iCloud email filtering.** Resend marks delivered pero iCloud filtra antes de inbox. Si JP reporta problemas con subscribers iCloud, investigar SPF/DKIM/DMARC del dominio.
- **Drizzle snapshot drift.** Partial unique index y `CREATE EXTENSION` viven fuera del snapshot Drizzle. Pattern: leer cada SQL generado antes de aplicar (`drizzle-kit generate` → manual review → `db:migrate`). En cada slice que añada tabla, verificar que el SQL no proponga `DROP INDEX subscriptions_active_subscriber_per_product` o `DROP EXTENSION`.
- **Stripe SDK bump a v18+.** Quitar la post-Basil type assertion en `handle-checkout-completed.ts`, mover `apiVersion` al SDK's `LatestApiVersion` (probable contemporary `*.clover`). Re-test items.data[0] code path.
- **Default for `subscriptions.sessionsRemaining`.** Sin SQL default actual; cualquier INSERT que omita el campo falla. Si futuro código path lo omite, considerar `.default(2)` en schema.
- **`subscribers.dateOfBirth` text vs date column.** Text más permissive; LFPDPPP podría preferir DB-level validation con tipo `date`. Decisión antes de S5 dashboard edit del campo (ya pasó — text se quedó).

Items S6 — smoke findings (cierre):

- **[RESUELTO en S6 close-out commit]** BUG-S6-1: copy "Próximo cobro" engañoso cuando `cancelAtPeriodEnd=true`. Detectado en smoke S6, fixeado mismo día (conditional copy en `src/app/cuenta/page.tsx` — muestra "Acceso termina: {fecha}" cuando subscriber ya canceló).
- **[RESUELTO en S6 close-out commit]** UX-S6-1: botón "Cerrar sesión" inconsistente con resto del dashboard (texto plano vs border + padding del botón Administrar pago). Detectado en smoke S6, fixeado mismo día (mismo styling de `ManageBillingButton`).
- **[RESUELTO en S6 close-out commit]** BUG-S6-2: test-pollution en Test 6b (admin cancel). `afterEach` añadido en `tests/integration/admin-cancel.test.ts` para limpiar `subscribers`/`subscriptions` seedeados por el test, evitando residuo post-suite.

Items S6 — diferidos al pre-launch checklist:

- **Stripe test clocks para smoke de lifecycle completo.** Bloqueante para pre-launch checklist S11. Permite forzar advance de cycle para validar `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` con payloads reales — no posible con `stripe trigger` ni `stripe invoices create` sobre subs recién creadas. Configurar customer con `test_clock` attached al crear vía `/api/checkout/create` con flag dev-only.
- **[BLOQUEANTE S11] `DATABASE_URL` único compartido entre dev local y tests integración.** `tests/integration/setup.ts` hace `TRUNCATE` sobre la misma DB que `npm run dev` usa, lo cual borra cualquier estado de smoke manual al primer `npm test`. Fix: añadir `DATABASE_URL_TEST` en env schema (opcional, fallback a `DATABASE_URL` con warning si missing). Modificar `setup.ts` para usarla. Debe diseñarse junto con la separación prod/dev branches que S11 va a configurar. Lugar: `src/lib/env.ts`, `tests/integration/setup.ts`.

Items S7 — edge cases identificados en planning (pre-implementation):

- **[BLOQUEANTE LAUNCH] BUG-S7-edge-1: subscription-existe-sin-auth_token.** Si un network blip causa fallo entre el INSERT de `subscriptions` (atómico, exitoso) y el INSERT de `auth_tokens` (no idempotente) dentro de `handleCheckoutCompleted`, la subscription queda sin magic link y sin recovery automático. Stripe retry NO recupera porque la unique constraint sobre `stripe_subscription_id` hace que el siguiente intento del helper `insertSubscriptionIfCapacity` falle silenciosamente (catch re-throwea) — el handler nunca llega de nuevo a la creación de auth_token. Resultado: user paga, tiene fila en `subscriptions`, pero no puede loguearse vía magic link. **Mitigation requerida antes de launch:** admin route "resend welcome email" que detecte subs sin `auth_tokens` row (vía LEFT JOIN) y genere uno nuevo + envíe email. Lugar: `src/app/api/admin/resend-welcome/route.ts` (no existe). Bloqueante S11.

  **Variante observada en Gate C review (S7):** si el fallo ocurre DESPUÉS de `createAuthToken` (en email send o más adelante), Stripe retry ejecuta el handler de nuevo. `insertSubscriptionIfCapacity` detecta la sub existente y devuelve `duplicate_subscription`, llevando el flow al refund path para una sub que SÍ debería existir. Resultado: usuario paga, sub existe, auth_token existe, pero recibe email "duplicate subscription" + refund inesperado. El handler se autodestruye. **Implicación para la mitigación S11:** la admin "resend welcome email" route debe también detectar y permitir revertir refunds erróneos disparados por este retry-storm. Scope real del fix incluye refund reversal, no solo token regeneration.
- **[Phase 6.5 cosmetic] tests/helpers/stripe-mock-with-state.ts: redundant Map lookup in `retrieve` method.** Could collapse `stripeState.seedSubscription(id)` + `stripeState.subscriptions.get(id)` to a single call (have `seedSubscription` return the seeded value, or use a local reference). Surfaced in S7 Gate A code review; deferred as pure cosmetic.

Items S7 — Gate B code review findings (diferidos):

- **M1 — Error-string matching fragility en `insertSubscriptionIfCapacity` catch** (`src/lib/capacity.ts:69`). `msg.includes('subscriptions_active_subscriber_per_product')` se rompe silenciosamente si Drizzle ever renames the constraint. Defense-in-depth alternative: narrow con `(err as { code?: string }).code === '23505'` (Postgres unique_violation code) AND el string match. Defer — current path funciona; optimization no urgente.

- **M3 — Race condition entre subscribers distintos en capacity boundary.** Dos subscribers distintos pueden ver `COUNT < capacity` simultáneamente en READ COMMITTED y ambos insertar, sobrepasando capacity. Partial unique index NO protege (subscriber_ids distintos). Decisión actual: aceptar el edge porque probabilidad <1/año a 8 cupos y daño bajo (9 subs en vez de 8). Upgrade path: `SERIALIZABLE` isolation o products-row lock vía `SELECT ... FOR UPDATE`.

  **Upgrade trigger:** cuando capacity > 30 cupos O cuando se observe el primer caso real en producción (Stripe Dashboard mostraría N+1 active subs con N=capacity). Mientras no se cumpla ninguna, defer.

- **M4 — Test helper duplication.** `postWebhook` helper duplicado en 4 archivos test (`webhook-happy-path`, `capacity-race`, `capacity-mixed-status`, `duplicate-subscription`). Pattern de `seed-active-subscription` (insert subscriber + subscription with product lookup) duplicado en 6+ sites a lo largo de S6 + S7. Extraer a `tests/helpers/post-webhook.ts` + `tests/helpers/seed-active-subscription.ts` durante sweep de cleanup al cierre de Phase 6 (S10/S11).

- **M5 — Welcome email third-person reference** [depends on: M5-duplicate-fix landed in S7 commit b23b8de]. `src/lib/email.ts:62` todavía dice `"escríbele a Juan Pablo por Instagram"`. Replicar el fix aplicado a duplicate email (`"escríbeme por Instagram"`) para consistency de voice. Defer hasta S10 pre-launch UX pass cuando JP de feedback global de copy.

Items S7 — Gate C code review findings (diferidos):

- **Flag B — `appendAudit` non-idempotent on Stripe retry.** Cada retry del handler appendea nuevo row al `audit_log` para el mismo `event.id`, polluting el log con duplicates. No es data corruption (audit es append-only) pero compromete integridad para auditorías LFPDPPP donde el log se cita como evidence.

  **Mitigación trivial:** añadir `UNIQUE (event_id, action)` constraint en `audit_log` schema + cambiar `appendAudit` a `INSERT … ON CONFLICT DO NOTHING`. Requiere migration nueva (añadir `event_id` column también, ya que actualmente no existe). Defer al sweep de Phase 6.5 polish.

- **API response typing sweep.** `src/app/api/checkout/create/route.ts` devuelve shapes diferentes por status code (200: `{url}`, 409: `{redirect}`, error: `{message}`). El consumer (`MentoriaCard.tsx`) usa `typeof` guards defensivos para narrowing porque `res.json()` es `any`. Cuando S9 o S10 toquen estos endpoints, considerar tipar con discriminated union compartida (e.g. tipo `CheckoutCreateResponse`) para eliminar el `any` en el client side. Mismo patrón aplica a `/api/billing-portal/create` y `/api/admin/cancel-subscription` para consistency.

Items S7 — Gate E final review findings (diferidos):

- **M-3 — `audit_log` writes uncovered by integration tests.** Tests 2/3/8 verifican los 3 observables principales (refund external state, email subject, DB capacity) pero NO querean `audit_log`. Si `appendAudit` silenciosamente fallara, el suite seguiría GREEN. Hoy aceptable porque `appendAudit` es 1 INSERT simple sin lógica condicional. **Upgrade trigger:** si Phase 7 (cursos) o Phase 8 (meditaciones) reusan `audit_log` para más event types, añadir coverage cross-cutting con assertions en `target_subscriber_id`.
