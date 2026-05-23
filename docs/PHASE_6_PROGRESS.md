# Phase 6 — Progreso de Ejecución

**Última actualización:** 2026-05-22
**Branch:** `feature/phase-6-mentoria-spec`
**Último commit:** `chore(s10): close Gate A + Gates B-E + mini-gate 10.9 (smoke pending)` (hash variable — buscar por subject en `git log --oneline`; un commit no puede referenciarse a sí mismo por hash sin un follow-up commit)

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

### S8 — Login magic link + rate limit (Tests 9.no-leak, 10, 11) ✅

`/api/auth/login` (POST email → magic link login token, 15-min TTL) con rate limit DB-backed 5/min/IP. Nueva tabla `rate_limit_attempts` (id, endpoint, ip `inet`, attempted_at) + índice composite `(endpoint, ip, attempted_at DESC)`. Helper `checkRateLimit` con INSERT-then-COUNT semantics. Route handler con 5 branches, todos pasando por `delayUntil(MIN_RESPONSE_MS=800)` para flat timing. Template `sendLoginLinkEmail` sin idempotency header (user-initiated, cada request es genuinamente distinto). 4 tests integración (9.ghost, 9.real, 10, 11).

Pre-S8 fix (V6 sanity check de Gate A reveló TS error pre-existente heredado de S4):
- `692fecb` fix(test): align makeReq init type with NextRequest constructor

Commits S8 (Gates A-D, 5 commits):
- `0e21eb0` feat(db): rate_limit_attempts table + index — Gate A
- `1b09da7` feat(rate-limit): DB-backed per-IP rate limit — Gate B (amend post-empirical verification: cast `::inet` resultó innecesario por wire-protocol describe handshake)
- `4167d4b` feat(email): login-link template — Gate C
- `c87db3a` test(spec): tests 9.no-leak / 10 / 11 in RED with route stub — Gate D step 1
- `31009f7` feat(auth): POST /api/auth/login with rate limit + no-leak + flat timing — Gate D step 2

S8 close-out:
- `[S8 close-out]` chore(s8): close-out — login magic link + rate limit (hash buscarlo en `git log --grep="S8 close-out"`)

Tests: **29/29 PASS** (4 nuevos en S8: Test 9.ghost, 9.real, 10, 11). Subimos de 25/25 (S7 close-out 23/23 + 2 customer-id-preservation tests landed en `747ac81` post-S7 close-out commit) → 29/29.

Smoke manual S8: **Skipped per standing rule "smoke selectivo: solo paths sin cobertura de integración".** Tests 9/10/11 cubren el contract end-to-end (no-leak, exceed, isolation). Si JP reporta abuse spike post-launch (Sentry/logs muestren rate-limit hits sostenidos), reactivar smoke con curl real contra Resend para validar p99 floor de MIN_RESPONSE_MS.

Decisiones tomadas durante S8:

1. **`inet` nativo de Drizzle 0.36.4 (D1).** Verificado empíricamente en Gate 0 V2 que `inet` está exportado por `drizzle-orm/pg-core`. Plan ofrecía fallback a `text` + manual ALTER pero no fue necesario. `ip: opts.ip` (string plano) compila clean tanto en INSERT como en SELECT WHERE sin `as any` ni cast SQL — la conversión `inet` ocurre vía wire-protocol describe handshake del driver pg/Neon, sin intervención manual del query builder.
2. **INSERT-then-COUNT en rate-limit helper (D2).** Pattern verbatim del plan. La row del request bloqueado contamina su propia ventana hasta `windowSeconds` — acceptable trade-off vs race window que permitiría burst attacks bajo COUNT-then-INSERT. WHY documentado en docstring del helper + commit body de Gate B.
3. **MIN_RESPONSE_MS=800 (D3, NO 250 del plan).** 800ms da margen sobre Resend p99 (~600ms) para mantener flat timing realista. Aplicado a TODOS los branches del route handler vía `delayUntil(startedAt + MIN_RESPONSE_MS)`. NO bajar sin Resend SLA confirmado.
4. **429 explícito vs always-200 (D4).** 429 con body `'rate limited'` permite a clients legítimos distinguir abuse de error de aplicación. Si threat model post-launch identifica adversary capable of timing attacks at scale, revisitar always-200 pattern (item nuevo en backlog 6.5).
5. **Criterion 5 (timingSafeEqual) por inspección de código, no test (D5).** `src/lib/auth-tokens.ts:32-49` mantiene WHY comment de 4 líneas + `crypto.timingSafeEqual(expectedBuf, actualBuf)` en línea 49 — verificado visualmente al cierre de S8. NO se añadió test directo. Spy-based test rechazado como impl-coupled (se rompe ante cualquier refactor legítimo); statistical test rechazado por flake. Code review humano del path es el guard.

### S9 — Waitlist + `/privacidad` + home integration ✅

Tabla `waitlist` append-only para LFPDPPP consent evidence (sin UNIQUE constraint por diseño). Página `/privacidad` con `PRIVACY_VERSION = '2026-05-13'` exportada como constante. WaitlistModal client component (`useActionState` + `useFormStatus`) que captura email + consent + privacy version. Wrapper `MentoriaCardWithWaitlist` para server→client bridging (server components no pueden pasar funciones a client components). Mentoría section añadida al home page entre Hero y AboutMe (additive, sin regresión). Link a /privacidad en Footer. 2 tests integración para `submitWaitlist` (consent required + privacy version captured).

Commits S9 (Gates A-D, 10 commits + close-out + 1 commit del user con standing rules durables):
- `bf8183c` feat(db): waitlist table — Gate A part 1
- `6140459` feat(page): /privacidad with PRIVACY_VERSION constant (LFPDPPP) — Gate A part 2 (borrador, pendiente revisión legal JP)
- `cec4948` docs(claude): codify S8 lessons + scratch script convention as project standing rules — commit del user post-Gate-A, codifica 3 lessons learned de S8 + nueva regla sobre scratch scripts en `scripts/` (no `/tmp/`)
- `8b8f65a` feat(waitlist): server action with LFPDPPP consent + privacy version — Gate B part 1 (revalidatePath removido por análisis empírico)
- `5b744a2` test(waitlist): consent required + privacy version captured — Gate B part 2
- `120084e` feat(ui): WaitlistModal with consent checkbox — Gate C part 1 (bg-portal-bg → bg-portal-black, plan typo sustituido)
- `a7af02b` feat(mentoria): wire WaitlistModal into the page — Gate C part 2
- `7537c83` fix(modal): migrate useFormState → useActionState (React 19.2 / Next 16 compat) — Gate D part 1 (fix bundled + rel="noopener noreferrer" piggyback, ver decisiones 5+6)
- `a8e2160` feat(home): add Mentoría section below existing grid (additive) — Gate D part 2
- `3ed3c8d` feat(footer): link to /privacidad — Gate D part 3

S9 close-out:
- `[S9 close-out]` chore(s9): close-out — waitlist + /privacidad + home integration (hash buscarlo en `git log --grep="S9 close-out"`)

Tests: **31/31 PASS** (2 nuevos en S9: Test waitlist consent required + Test waitlist privacy version captured). Subimos de 29/29 (S8 close-out) → 31/31.

Smoke manual S9: **Validado end-to-end por user en mobile viewport 375px.**

- **Capacity-full path:** seed manual de 8 active subscriptions vía `scripts/scratch-seed-capacity-full.ts` → `/` y `/mentoria` muestran "Cupo lleno - únete a la lista de espera" → click CTA abre modal con form → submit sin consent intercepta HTML5 required (tooltip nativo "Please check this box") sin llegar al server action → submit con consent muestra "Listo. Te aviso cuando se abra un cupo." → row insertada en `waitlist` con `PRIVACY_VERSION` capturado. bg-portal-black aplicando correctamente, fondo sólido sin StarField filtrándose, sin overflow en mobile.
- **Capacity-not-full path:** cancel 1 sub (de 8 a 7) → `/` muestra "Suscribirse" en lugar de CTA waitlist → checkout real con Stripe test card → email welcome → magic link → `/cuenta/perfil` → form submit → `/cuenta` dashboard → Customer Portal funcional → logout funcional → capacity vuelve a 8 (nuevo subscriber) → CTA vuelve a "Cupo lleno". Consistencia validada.
- **Regression check inadvertido (out-of-scope para S9, validado de paso):** `/api/checkout/create`, webhook idempotent (~15 events sin duplicate rows), `/api/auth/verify`, `/cuenta/perfil` + field gate, `/cuenta` dashboard render, `/api/billing-portal/create` con return URL, `/api/auth/logout` — todo funcional.

Defecto detectado pero out-of-scope S9 (registrado en backlog 6.5 como BLOQUEANTE-LAUNCH): **"Orphaned authenticated flow"** — `/` no tiene entry point visible para subscribers existentes que quieran re-loguearse después de logout. `/login` existe pero URL hidden. Gap heredado de S4, **expuesto en S9 smoke** cuando el user clickeó Logout desde /cuenta. Categoría "UX gap invisible hasta smoke end-to-end" — el gap existe desde S4 pero NO se materializó como dolor real hasta S9 porque en S4-S8 nadie hacía logout. S9 es el slice que EXPONE el bug, no el que lo CREA. Distinción importa para retro: gaps de UX que viven sin manifestarse durante varios slices son la categoría más insidiosa — tsc no los caza, tests no los cazan, la única defensa es smoke completo end-to-end.

Decisiones tomadas durante S9:

1. **Email dedup en waitlist: sin UNIQUE constraint (Opción A).** Row del waitlist es evidencia legal append-only bajo LFPDPPP. ON CONFLICT DO UPDATE destruiría el primer `consent_privacy_at`, que es exactamente el timestamp que el `PRIVACY_VERSION` está diseñado para preservar. Duplicados los dedupea JP visualmente en /admin al notificar — no es bug, es audit log.
2. **PRIVACY_VERSION ubicación: export desde page file (spec-literal).** Plan mandata `import { PRIVACY_VERSION } from '@/app/privacidad/page';`. Verificado empíricamente que Next 16 compila named exports desde page files (tsc clean). NO extracted a `src/lib/` ni `src/config/` para mantener fidelidad al spec. Si emerge 3er consumer en S10/Phase 7, extraer entonces (anchor existente en pre-launch checklist S11: "LFPDPPP /privacidad reviewed by JP").
3. **9.6 path: componente separado `MentoriaHomeSection`** (vs inline async en `page.tsx`). `Home()` es sync — mantenerlo sync por review surface más limpio. Plan ofrecía este fallback explícitamente.
4. **`bg-portal-bg` → `bg-portal-black` en WaitlistModal.** Plan literal usaba class no-existente en theme (Tailwind v4 silently no-op'ea). Verificación empírica del theme pre-implementación con full read de `globals.css`; sustitución documentada en commit body de `120084e`. Drift del plan, no amendment de diseño.
5. **`useFormState` → `useActionState` (fix bundled en Gate D commit `7537c83`).** Runtime error detectado en smoke visual de Gate D: `useFormState` removido del runtime de `react-dom` en Next 16 / React 19.2 aunque permanecía en types. tsc clean + npm test 31/31 NO lo cazaron porque la action funciona aislada y los tests no montan el modal en DOM real. Fix con signature idéntica (`useActionState` desde `react`, `useFormStatus` permanece en `react-dom`).
6. **`rel="noopener noreferrer"` piggyback** en el link `target="_blank"` del modal hacia /privacidad. Defense-in-depth contra corporate environments con extensions que sobreescriben el noopener implícito de browsers modernos (Chrome 88+, Firefox 79+, Safari 12.1+). Costo 1 atributo. Mismo patrón que el link de Instagram en Footer.
7. **`revalidatePath` removido del action (deviation del plan).** `/mentoria/page.tsx` solo lee `getCapacity` (subscription count), no waitlist data. Insert al waitlist NO cambia ningún dato observable en `/mentoria` → `revalidatePath('/mentoria')` era no-op semantic y false coupling signal. Lectura empírica de la page antes de decidir.

Caveats heredados que persisten:
- **DATABASE_URL único compartido** (backlog 6.5 bloqueante-S11): se manifestó nuevamente en S9 Gate D — re-seed mid-smoke necesario después del primer `npm test` post-fix. Refuerza prioridad del fix.
- **Stripe Dashboard desync DB↔Stripe** (efecto del mismo issue): la subscription real creada durante el smoke de S9 sobrevive en Stripe test mode pero la DB fue wipeada por `npm test`. Decisión del user al close-out: dejar la sub viva como anchor reproducible para S10 admin smoke + S11 pre-launch verifications. Stripe test mode no cobra dinero real. Rehidratación en S10 via webhook resend desde Stripe Dashboard.

---

### S10 (en progreso, code-complete excepto 10.8b + 10.8d) — Admin panel + auth UX entry points + pre-launch partial ✅⚠️

`scripts/seed-admin.ts` upsert vía `ADMIN_SEED_EMAIL` + `/admin` layout con `requireAdmin` + Footer entry "Admin" + SubscribersList + inline-edit `sessions_remaining` (con test integración D6 + audit_log) + admin CancelSubscriptionButton + admin ResendWelcomeButton (S10 Task 10.6, mitiga BUG-S7-edge-1 sub-variante 1 automation-wise) + subscriber detail page `/admin/[id]` componiendo todo. Mini-gate 10.9 añadido como amendment al plan v2 tras descubrir gap en review (orphan auth flow más profundo de lo documentado en backlog 6.5).

Commits Gate A (3):
- `46de57a` feat(admin): seed-admin script
- `3abe33a` feat(admin): admin layout with requireAdmin gate
- `c0e15be` feat(footer): login link for re-authentication path

Commits Gates B-E (5):
- `4eece1c` feat(admin): subscribers list page with active/canceled toggle
- `9bcde55` feat(admin): inline edit sessions_remaining with audit_log (incluye test D6)
- `059d97f` feat(admin): CancelSubscriptionButton
- `441d558` feat(admin): resend welcome email with overwrite-in-place status
- `789d09f` feat(admin): subscriber detail page with edits + actions

Commits Gate F parcial (2):
- `4e7ceed` fix(email): welcome copy third-person → first-person (M5 backlog 6.5)
- `51dec7e` docs(runbook): BUG-S7-edge-1 variante B refund-reversal procedure (sub-variante 2 cobertura inicial)

### Mini-gate 10.9 — Auth UX entry points (amendment to plan v2)

Amendment al plan v2 — gap UX descubierto en S10 review tras pre-checks empíricos (P0.3 reveló que `/login` page literalmente no existía, contradiciendo PROGRESS:407 que afirmaba "/login existe pero la URL es hidden"). Closes the orphaned auth flow gap more completely than Task 10.2.5 (commit c0e15be) did alone.

Commits (5):
- `6678014` feat(login): /login page with email-only magic link request (S8 endpoint UI)
- `4d6bd25` feat(footer): relabel login link to "Admin" with discrete styling
- `aa4b34a` feat(mentoria): add "Iniciar sesión" CTA below primary capacity-aware CTA
- `9e03003` docs(runbook): cover BUG-S7-edge-1 variante B sub-variant 1 (handler fails before auth_token insert)
- `3399c56` docs(progress): correct PROGRESS:407 — /login page didn't exist, not just hidden

Decisiones cerradas mini-gate 10.9:

1. **D-10.9-1 — MentoriaCard secondary CTA "Iniciar sesión" always visible** (no hide-on-session detection en Phase 6, defer optimization a 6.5). Same footprint que primary CTA, subordinated by color/opacity only (border-white/20 vs primary white/60). Stacked vertically debajo del CTA capacity-aware. Cubre subscribers existentes que regresan a /mentoria post-logout o desde re-share del URL sin tener que descubrir el link "Admin" en Footer.
2. **D-10.9-2 — Footer login link relabel "Iniciar sesión" → "Admin"**. JP necesita acceso directo a /login para entrar a /admin sin pasar por el flow customer (MentoriaCard). Label semánticamente claro para él, irrelevante para visitantes casuales. Mismo endpoint, diferente label — semantic split, not technical. Posición: derecha del Footer en línea propia, color tenue text-portal-text/60. No destacado.
3. **D-10.9-3 — Empty-state Gate B (rows.length === 0)** aceptado como precedente de "drifts UX-defensivos triviales documentados en commit body". No requiere revert del commit `4eece1c`. Pattern aplicable prospectivamente: UX-defensive nano-additions fuera del plan literal son OK si están documentadas explícitamente en commit body + no introducen design decisions sustantivas.
4. **D-10.9-4 — /login es restablecimiento de sesión, NO registro**. El único path para crear cuenta sigue siendo checkout pago vía Stripe (Phase 6 architecture invariant: subscriber existe si y solo si pagó). /login expone el endpoint S8 existente (POST `/api/auth/login` con rate limit + timing-safe response) a subscribers que perdieron sesión. UI: form simple email-only. Success state: "Te enviamos un enlace de acceso. Revisá tu inbox." (mismo mensaje para email registrado o no, garantizado por timing-safe contract del endpoint S8).
5. **D-10.9-5 — Forma A para JP es bloqueante LIVE**. JP entra a producción vía: Footer "Admin" → /login → email → magic link real → /cuenta → escribe /admin en URL bar. Forma B (script `scripts/login_url.ts`) sigue válida solo en dev local del developer, NO para JP en producción. Smoke browser final de S10 debe incluir Forma A end-to-end con email real recibiendo magic link real desde Resend.

Notas adicionales:

- **`/login` page creation revealed pre-existing S8 gap, not new S10 work.** El endpoint POST `/api/auth/login` existía desde S8 (commit `31009f7`) con su rate limit + timing-safe contract validados por tests integración (9.ghost, 9.real, 10, 11 — todos green). La UI consumidora NUNCA se construyó en S8. PROGRESS:407 documentó incorrectamente el estado como "URL hidden" en lugar de "page missing". Mini-gate 10.9.4 corrigió el record histórico preservando el item original como audit trail (no se borró, solo marcó RESUELTO).

- **Sub-variante 1 del runbook (10.9.3) ↔ Task 10.6 cross-ref.** Sub-variante 1 (handler falla DESPUÉS de INSERT subscriptions, ANTES de INSERT auth_tokens → sub huérfana sin token) está mitigada automation-wise por el admin route "Reenviar welcome email" (S10 Task 10.6, commit `441d558`). El runbook ahora documenta el playbook manual que JP sigue cuando un subscriber reporta el síntoma — login a /admin, click subscriber, click Resend Welcome, confirm con subscriber. Sin pérdida de datos.

- **Pre-checks empíricos validados pre-código (P0.1–P0.4):** identificación de la opción β materializada en Gate A; runtime APIs (sendWelcomeEmail/createAuthToken/welcomeEmailStatus/bg-portal-bg drift) todas OK; `/login` page missing CRÍTICO (drove Opción 1); runbook coverage gap (sub-variante 1 missing) detectado y resuelto. Lección 17 S9 ("Plan v2 vs codebase reality drift") aplicada a backlog reading también — propuesta de standing rule a sparring.

**Tests:** 32/32 PASS al cierre de mini-gate 10.9 (sin tests nuevos en 10.9 — el smoke cubre los flows UI de auth; tests integración para LoginForm reservados a Phase 6.5 si surgen regresiones post-launch).

**Smoke browser NO ejecutado todavía** — pendiente sesión próxima como smoke consolidado: Gate A + Gates B-E + mini-gate 10.9 + 10.8a (M5 fix). Smoke = Forma A end-to-end con email JP real + visual review todas las pages nuevas en mobile 375px in-app Instagram browser.

Pendiente para LIVE (resto de Gate F): 10.8b typography polish JP-driven + 10.8d.* (LFPDPPP review legal async, Stripe Customer Portal LIVE config, Resend DNS re-verify, visual review templates, $1 MXN test charge LIVE, Vercel preview deploy, merge a main, watch first checkout, tag phase-6-launched).

---

## Pendiente

### S10 — Resto de Gate F (10.8b polish + 10.8d.* coord JP + LIVE smoke)
Items que requieren coordinación con JP en vivo o setup externo: typography polish dashboard, LFPDPPP review legal, Stripe Customer Portal LIVE mode, DNS Resend re-verify, $1 MXN test charge LIVE, merge a main, tag. Ver close-out commit chore(s10) para checklist completa.

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
12. **`tsc --noEmit` como standing rule de cierre de gate** (lección S8 Gate A V6 sanity check). El check reveló un TS error pre-existente en `tests/integration/auth-verify.test.ts:62` (DOM RequestInit vs NextRequest internal RequestInit, signal `null` no asignable) que había viajado intacto desde S4 (`7fa7780`) porque ningún gate previo corría tsc como contract de close-out. `npm run build` no lo captura porque `next build` no incluye `tests/`; vitest tampoco hace strict TS check. A partir de S8, `npx tsc --noEmit` con exit 0 es contract obligatorio al cierre de cada gate.
13. **Empirical-first extendido a CUALQUIER afirmación técnica** (lección S8 Gate B amend). La afirmación inicial "operator `inet = text` no existe en postgres → cast `::inet` necesario" era cierta solo para queries con literales sin parametrizar. Scratch script de 3 tests verificó empíricamente que con wire-protocol parametrization (Drizzle + pg/Neon) el cast NO es necesario. Amend del commit `38bba50 → 1b09da7` corrigió impl + body. La regla de `~/.claude/CLAUDE.md` developer global sobre `as any` ahora aplica también a SQL casts, library workarounds, y cualquier "X es necesario porque Y" que se pueda verificar en <5 min con un scratch script ad-hoc.
14. **Heredoc + caracteres especiales → siempre `git commit -F file`** (lección S8 Gate B re-amend). El primer amend del Gate B usó `git commit --amend -m "$(cat <<'EOF' ... EOF)"` con backslash-escapes defensivos en backticks (`\`value\``) que terminaron persistiendo literalmente en el commit body porque heredoc quoted preserva backslashes. Re-amend con `git commit --amend -F /tmp/msg.txt` arregló el escape. A partir de Gate B, commit bodies con caracteres especiales (backticks, `$`, etc.) se escriben siempre via Write + `-F`, nunca heredoc.
15. **Smoke completo end-to-end vs smoke estrecho-del-scope** (lección S9 Gate D). Patrón observado: smoke estrecho de Gate D ("solo capacity-full + capacity-not-full") no habría cazado el `orphaned auth flow` ni el `useFormState` runtime error. Smoke end-to-end completo de Phase 6 que el user ejecutó (checkout → email → /cuenta → portal → logout) reveló 3 cosas: bug del useFormState, defensa HTML5+Zod válida, gap de re-login. A partir de S10, todo gate que toque UI debe tener smoke end-to-end completo (5-10 min de fricción extra, evita debt de descubrimiento tardío). Promover a `~/.claude/CLAUDE.md` global en post-mortem de Phase 6.
16. **Empirical-first es BIDIRECCIONAL** (lección S9 Gate D). La regla actual (CLAUDE.md global codificada post-Gate-B S8) cubre "verificá antes de afirmar X es necesario". Igualmente aplicable a "verificá antes de afirmar Y aún funciona". Caso S9: `useFormState` reportado en mi pre-check de Gate A como "aún exportado" basado en `@types/react-dom` (correcto en types) pero removido del runtime de `react-dom` en Next 16 / React 19.2. Types ≠ runtime, especialmente en transition periods de mayor versions framework. Pre-checks de compat de hooks/APIs renamed/deprecated deben incluir runtime mount (booting dev + render real) cuando posible, no solo grep en `.d.ts`. Promover a `~/.claude/CLAUDE.md` global en post-mortem de Phase 6.
17. **Plan v2 vs codebase reality drift** (lección S9 Gates C+D). Patrón observado en 2 sites de S9: `bg-portal-bg` (class inexistente en theme, Gate C catch pre-implementación) y `useFormState` (API removed runtime, Gate D catch post-implementación durante smoke). Ambos eran "empirically verifiable" pero requerían contextos distintos: (1) verificable pre-implementación con grep contra theme/exports, (2) verificable solo post-implementación con smoke visual. Para Phase 7+: antes de codificar literal de un snippet del plan, grep + view de dependencies/classes/imports/hooks mencionadas en el snippet. Si el snippet usa un hook/API/class del codebase, verificar runtime behavior antes de close-out de gate. Promover a `~/.claude/CLAUDE.md` global en post-mortem de Phase 6.

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

Items S7 — smoke findings (post-close-out):

- **Customer reuse anonymous flow.** `POST /api/checkout/create` solo pasa `customer` a Stripe si hay sesión activa. Si subscriber existe por email pero no tiene sesión (logged out + re-checkout), Stripe crea customer nuevo. Resultado: múltiples Stripe customers con misma email, datos huérfanos en Stripe Dashboard.

  **Mitigación:** en `route.ts` ANTES de `stripe.checkout.sessions.create`, hacer lookup por email en `subscribers` table. Si existe + tiene `stripeCustomerId`, pasarlo aunque user sea anonymous.

  **Trade-off de seguridad a discutir:** ¿qué pasa si dos personas distintas usan misma email accidentalmente? El customer del primer subscriber se "asocia" a la sesión del segundo. Esto requiere diseño cuidadoso, no fix mecánico. Defer a S11 pre-launch security pass.

  **Related fix landed:** the security-latent bug where `handle-checkout-completed.ts` overwrote `stripeCustomerId` on every webhook (allowing a malicious or mistaken second checkout to redirect a legitimate subscriber's Stripe customer to a different account) was fixed in the S7 post-close-out commit. The handler now preserves existing `stripeCustomerId` on upsert + logs `console.warn` on mismatch. This 6.5 item is the COMPLEMENTARY fix on the checkout-creation side (passing the existing customer to Stripe so the mismatch never happens in the first place for known subscribers).

Items S8 — Gate D / E findings (diferidos):

- **Error-path no-leak hardening en `/api/auth/login`.** WHY: spec tests 9/10/11 no ejercitan path de error de DB o Resend; un throw no manejado en el handler actualmente bubblea a Next default 500 sin pasar por `delayUntil`, rompiendo el contrato de flat timing en presencia de errores inesperados (timing leak por error path vs success path). Scope: try/catch global en el route handler con `delayUntil(startedAt + MIN_RESPONSE_MS)` antes de retornar 500. Trigger: cualquier error reportado en Sentry/logs para `/api/auth/login` post-launch, o pre-launch checklist S11 si se quiere hardening preventivo antes de exposure. Lugar: `src/app/api/auth/login/route.ts`.

- **`as any` sweep en test helpers (S3-S8).** WHY: cada test file de Phase 6 usa `as any` para castear DOM Request → NextRequest en helpers (`postLogin` en S8, `makeReq` en S4, `postWebhook` en S3/S6/S7). El fix de S8 Gate A sobre `auth-verify.test.ts:62` (cambio de `RequestInit` → `ConstructorParameters<typeof NextRequest>[1]` en el parámetro de `init`) sugiere que la mayoría de los `as any` actuales reflejan reasoning no-verificado de S3-S7 y son innecesarios bajo TS strict actual. Scope: verificar empíricamente cada uso heredado en `tests/integration/*.test.ts` + `tests/helpers/*.ts`, eliminar los que tsc no requiera. Trigger: sweep de cleanup al cierre de Phase 6 (S10/S11), o cualquier touch significativo a test infrastructure. Lugar: todos los archivos de `tests/` con `as any`.

- **APP_URL validation en magic link URL del email.** WHY: Test 9.real verifica que se envía exactamente 1 email pero NO valida el contents del URL pasado a Resend. Si `APP_URL` env var queda mal configurado (e.g., trailing slash, scheme omitido, IP literal en prod, env no cargado correctamente en serverless), el magic link es no-funcional para subscribers reales pero el test pasa silenciosamente. Scope: assertion adicional en test 9.real que extraiga el URL del último sent email y verifique esquema HTTPS + hostname válido + path `/api/auth/verify` + query `token` no vacío. Requeriría que el mock `resend-mock.ts` persista el `magicLinkUrl` o el `html` real en `sentEmails` para que el test pueda extraerlo (cambio breaking del shape del mock — coordinar con M4 abajo). Trigger: si JP reporta magic-link broken post-launch con causa env, o pre-launch checklist S11. Lugar: `tests/integration/auth-login.test.ts` (assertion) + `tests/helpers/resend-mock.ts` (shape).

- **Subject duplication entre `email.ts` y `resend-mock.ts`.** WHY: cada template tiene su subject literal duplicado en ambos archivos (e.g. `'Tu enlace de acceso a Portal Espiritual'`, `'Tu acceso a Portal Espiritual — Mentoría 1-a-1'`, `'Ya tienes una suscripción activa'`, etc.). Si alguien cambia el subject en `email.ts` y olvida actualizar el mirror, el mock divergerá silenciosamente y los tests podrían pasar con copy desactualizada. Identificado durante review de Gate C de S8. Scope: extraer subjects a constantes exportadas desde `email.ts` (o un módulo nuevo `email-subjects.ts`), importarlas en ambos archivos para que el compilador cace divergencia. Trigger: próximo cambio de copy en cualquier template (S10 pre-launch UX pass es candidato natural), o si se hace el fix de APP_URL validation que ya requiere tocar `resend-mock.ts`. Lugar: `src/lib/email.ts` + `tests/helpers/resend-mock.ts`.

Items S9 — Gate D smoke findings + decisiones diferidas:

BLOQUEANTE-LAUNCH (alta prioridad para S11):

- **[RESUELTO en S10 mini-gate 10.9, commits 6678014 + 4d6bd25 + aa4b34a]** **Orphaned authenticated flow.** WHY: `/` no tenía entry point para login de subscribers existentes después de logout. **CORRECCIÓN HISTÓRICA (10.9.4):** la afirmación original "`/login` existe pero la URL es hidden" era **incorrecta** — verificado empíricamente en S10 mini-gate 10.9 P0.3, la página `/login` literalmente **no existía** hasta el commit 6678014. S8 implementó solo el endpoint POST `/api/auth/login` sin UI consumidora. Task 10.2.5 (commit c0e15be) añadió un link en el Footer apuntando a `/login` bajo el assumption falso de que la página existía, generando un 404 silencioso. Gap heredado de S4-S8 (ruta no creada) + S9 (lectura incorrecta del estado en el backlog). **Expuesto en S9 smoke** cuando el user clickeó Logout desde /cuenta. Resolución triple: (1) commit `6678014` creó `src/app/login/page.tsx` real con form email + redirect-if-authenticated, (2) commit `4d6bd25` relabel del Footer link "Iniciar sesión" → "Admin" + reposicionar derecha tenue para JP, (3) commit `aa4b34a` añadió CTA secundario "Iniciar sesión" en MentoriaCard para subscribers regulares. Categoría "UX gap invisible hasta smoke end-to-end": tsc no lo caza, tests no lo cazan — solo smoke completo end-to-end revela el problema (lección 15 S9 reforzada). Lugar: `src/app/login/page.tsx`, `src/components/LoginForm.tsx`, `src/app/login/actions.ts`, `src/components/Footer.tsx`, `src/components/MentoriaCard.tsx`.

NO BLOQUEANTE (polish / lessons):

- **JP debe revisar texto del aviso de privacidad antes del live launch.** WHY: PRIVACY_VERSION = '2026-05-13' se hardcodeó como borrador con copy del plan. Antes del live launch, JP (y idealmente un abogado) deben revisar el texto completo en `src/app/privacidad/page.tsx` para cumplimiento LFPDPPP real (no solo formal). Anchor existente en spec §793 / pre-launch checklist S11: "LFPDPPP /privacidad reviewed by JP". Si JP cambia copy en review, bumpear PRIVACY_VERSION a la fecha del review (las versiones anteriores quedan como timestamps históricos en filas de waitlist ya capturadas — no destruir). Trigger: S11 pre-launch checklist. Lugar: `src/app/privacidad/page.tsx`.

- **revalidatePath check pattern (retroactivo y prospectivo).** WHY: en S9 Task 9.3 se removió `revalidatePath('/mentoria')` del action porque la página solo lee `getCapacity`, no consume waitlist data. Patrón a aplicar retroactivamente: en futuras actions de S10+, verificar empíricamente qué data consume la página antes de añadir revalidatePath. False coupling signals son ruido permanente en código y mislead a futuros readers. Scope: review de actions existentes en `src/app/cuenta/actions.ts` + `src/app/admin/*` (cuando S10 las cree) — asegurar que cada `revalidatePath` corresponde a una page que realmente consume el data mutated. Trigger: cualquier touch a actions existentes en S10+. Lugar: cualquier `'use server'` file con `revalidatePath`.

- **WaitlistActionResult type extraction.** WHY: actualmente el return type del action `submitWaitlist` es inline (`Promise<{ ok: boolean; error: string | null }>`). `useActionState` infiere desde la signature, modal e action coinciden via inference. Si emerge 3er consumer en S10 (e.g. admin route que llame `submitWaitlist` programáticamente) o Phase 7, extraer a `WaitlistActionResult` exportado desde `waitlist-actions.ts`. Trigger: 3er consumer del result type. Lugar: `src/app/mentoria/waitlist-actions.ts`.

- **`useActionState` como pattern canonical desde S9.** WHY: tras el fix de Gate D (`7537c83`), todos los hooks de form state en este proyecto usan `useActionState` desde `react` + `useFormStatus` desde `react-dom`. NUNCA `useFormState` (deprecated en types, removido del runtime de `react-dom` en Next 16 / React 19.2). Pattern a aplicar prospectivamente en cualquier form S10+. Scope: si S10 introduce admin forms (ej. cancel sub form, resend welcome form), usar useActionState. Trigger: cualquier nuevo form server-action en S10+. Lugar: futuras forms en `src/components/admin/*` o `src/app/admin/**`.
