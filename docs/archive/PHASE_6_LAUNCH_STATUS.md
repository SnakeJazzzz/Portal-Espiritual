# Phase 6 Launch — Status Detallado

> **Última actualización:** 2026-05-26 (post-hotfix UX + tests gate)
> **Branch main commit más reciente:** merge de `hotfix/tests-truncate-gate`
> **Estado general:** PASO 1-4 cerrados, PASO 5+ pendiente, blockers conocidos

---

## TL;DR del estado

Phase 6 desplegada en producción con **TEST keys** de Stripe. Flow end-to-end UI validado (cancel UX + login back nav fixeados post-deploy). DB conectada a Neon main branch compartida. Falta: validación con price $10 LIVE temporal, $1 charge real LIVE (PASO 7), y resolver bloqueador de Google Safe Browsing antes de launch público.

---

## Lo que ya logramos en este chat

### PASO 1 — Stripe LIVE config completa ✓

Sub-bloques cerrados:

| Sub-bloque | Resultado |
|---|---|
| 1. Customer Portal | next-gen experience ON, configurado con email/shipping/taxID desactivados, cancellations end-of-period, redirect a `/cuenta` |
| 2. Product LIVE | `prod_UaL3x5TrS6pv6B` — Mentoría 1-a-1 con description en español preservada del TEST |
| 2b. Price LIVE | `price_1TbANALoQFUZpragoscEMVVK` — $2,222 MXN/mes recurring (este es el ACTIVO, hay que crear uno nuevo de $10 para smoke) |
| 3. Webhook destination | `we_1TbAtKLoQFUZprag5melpCZk` — phase-6-mentoria-live, 6 events suscritos, API version 2026-02-25.clover |
| 4. Secret Key LIVE | `sk_live_...` capturada (en scratchpad local del developer) |

**Decisiones tomadas durante PASO 1:**
- API version del webhook: `2026-02-25.clover` (Latest) — validado empíricamente por Claude Code que el código maneja shape post-Basil correctamente
- Customer Portal next-gen experience activada en TEST y LIVE para paridad

### PASO 2 — Resend domain verify ✓

- `portalespiritual.com.mx` verified (May 11)
- DKIM + SPF records green
- Sender: `hola@portalespiritual.com.mx`
- Welcome email validado: copy correcto, 7d TTL
- Login email validado: copy correcto, 15min TTL, single-use enforcement funcionando

### PASO 3 — Vercel env vars (TEST keys) ✓

8 env vars Zod-required cargadas en Production environment:

| Variable | Origen actual | Cambia en PASO 5 |
|---|---|---|
| `DATABASE_URL` | Neon integration (Vercel auto) | No |
| `APP_URL` | `https://portalespiritual.com.mx` | No |
| `ADMIN_SEED_EMAIL` | `akasha.infinito8@gmail.com` | No |
| `RESEND_API_KEY` | LIVE key (Resend no separa test/live) | No |
| `RESEND_FROM_EMAIL` | `hola@portalespiritual.com.mx` | No |
| `STRIPE_SECRET_KEY` | TEST (`sk_test_...`) | **Sí → `sk_live_...`** |
| `STRIPE_WEBHOOK_SECRET` | TEST | **Sí → `whsec_...` LIVE del webhook destination phase-6-mentoria-live** |
| `STRIPE_PRICE_ID_MENTORIA` | TEST | **Sí → `price_...` LIVE del Mentoría product (el de $10 si querés smoke con cobro mínimo, o el de $2222 para launch real)** |

Todas marcadas como Sensitive.

**Pre-launch cleanup script ejecutado:** DB en estado limpio (1 admin JP, 1 product, todo demás 0).

### PASO 4 — Deploy main + smoke técnico UI-only ✓

- `feature/phase-6-mentoria-spec` mergeado a `main`
- Vercel auto-deploy successful, 14 routes Phase 6 live
- Card de Mentoría 1-a-1 renderiza en mobile (375px) y desktop
- Botón "Suscribirse" abre Stripe Checkout con $2,222 MXN
- Build clean: tsc 0 errors, npm test 32/32 (cuando se corre con gate)

### Hotfixes post-deploy ✓

Branch `hotfix/tests-truncate-gate` mergeado a main:

1. **Tests TRUNCATE gate** — vitest run accidental ya no destruye prod DB. Requiere `ALLOW_DESTRUCTIVE_TESTS=true` para ejecutar suite destructiva.
2. **Cancel checkout UX** — `/mentoria?checkout=canceled` ahora muestra banner + CTA "Volver al inicio"
3. **Login back nav** — `/login` ahora muestra `← Volver al inicio` arriba del form

---

## Estado de la infraestructura externa

### Stripe LIVE

- **Modo activo:** LIVE
- **Customer Portal:** configurado y guardado
- **Product activo:** Mentoría 1-a-1 (`prod_UaL3x5TrS6pv6B`)
- **Price activo:** `price_1Tb...sVK` ($2,222 MXN/mes)
- **Webhook destination:** `we_1....k` apuntando a `https://portalespiritual.com.mx/api/webhooks/stripe`
- **Events suscritos (6):** checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed
- **Subscriptions activas:** 0

### Resend

- **Domain status:** Verified
- **Region:** us-east-1
- **DKIM + SPF + DMARC:** all green
- **API key:** LIVE, en Vercel env

### Vercel

- **Project:** michael-devlyn-s-projects/portal-espiritual
- **Branch deployed:** main
- **Último deploy SHA:** del merge hotfix (~14:00 hrs 2026-05-26)
- **Domain:** portalespiritual.com.mx (custom, via GoDaddy DNS)
- **Env vars en Production:** 8 Zod-required + 16 auto-Neon

### Neon

- **Project ID:** ep-curly-queen-aqvjmlyn (us-east-1)
- **Branch:** main (compartida dev local + Vercel production — split deferred a 6.5)
- **Tables migradas:** subscribers, subscriptions, products, sessions, auth_tokens, audit_log, stripe_events, rate_limit_attempts, waitlist
- **Estado actual:** 1 admin JP (`akasha.infinito8@gmail.com` role=admin), 1 product (Mentoría 1-a-1), todo demás 0

### Google Search Console

- **Domain ownership:** verified via DNS TXT (GoDaddy)
- **Security issue detectado:** "Páginas engañosas" (falso positivo)
- **Review request:** submitted (2026-05-26 ~14:25)
- **Status:** waiting for Google review (24-72h estimado)

---

## Lo que falta — secuencia de acciones

### Próximo paso inmediato — Smoke LIVE con price $10 temporal

**Decisión arquitectónica tomada:** crear segundo Price LIVE de $10 MXN dentro del MISMO Product, marcar el viejo como inactive durante smoke, después revertir.

**Pasos a ejecutar (en el próximo chat de Claude.ai sparring):**

1. **Crear price nuevo en Stripe LIVE:**
   - Stripe Dashboard → LIVE mode → Products → Mentoría 1-a-1 → click "+" en sección Pricing
   - Add price: $10 MXN, recurring monthly, MXN currency
   - Capturar nuevo `price_id` LIVE (formato `price_...`)

2. **Marcar price viejo como inactive:**
   - En la página del Product, encontrar el price de $2,222 → action menu → Archive
   - Mantener archivado, NO delete (Stripe permite reactivar)

3. **Update `STRIPE_PRICE_ID_MENTORIA` en Vercel:**
   - Vercel Dashboard → Settings → Environment Variables → Production → editar `STRIPE_PRICE_ID_MENTORIA`
   - Reemplazar TEST value con el nuevo `price_$10_id`
   - O usando CLI: `vercel env rm STRIPE_PRICE_ID_MENTORIA production` + add nuevo

4. **Update `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en Vercel** (flip a LIVE):
   - Reemplazar TEST values con los LIVE del scratchpad
   - `sk_live_...` (Standard secret key del Dashboard)
   - `whsec_...` del webhook destination phase-6-mentoria-live

5. **Trigger redeploy:**
   - En Vercel Dashboard, último deployment → "Redeploy" → confirmar
   - O push commit cosmético a main para auto-deploy

6. **Smoke LIVE end-to-end con $10:**
   - Browser → portalespiritual.com.mx → click Suscribirse
   - Stripe Checkout debe mostrar **$10 MXN** (no $2,222 — si muestra el viejo, redeploy no agarró)
   - Pagar con tarjeta real (cualquiera del developer)
   - Verificar:
     - Email welcome llega
     - Click magic link entra a `/cuenta`
     - Profile form se puede completar
     - Stripe Dashboard muestra subscription activa
     - Customer Portal accesible desde `/cuenta`
     - Cancel subscription desde Customer Portal funciona end-to-end
     - Webhook delivery `customer.subscription.updated` con cancel_at_period_end=true llega y se procesa
   - Verificar admin como JP:
     - Login JP funciona
     - `/admin` lista al nuevo subscriber
     - `/admin/[id]` muestra detalles
     - Actions (resend welcome, sessions remaining edit, cancel subscription) funcionan

7. **Si todo verde:**
   - Cancelar la subscription del developer desde Customer Portal
   - Esperar el `customer.subscription.deleted` webhook
   - Verificar que la row de subscription pasa a `status: canceled`

8. **Reset a precio real:**
   - Stripe Dashboard → Mentoría 1-a-1 product → reactivar price de $2,222 (unarchive)
   - Archivar price de $10 (no delete, por si hay refund / dispute futuro)
   - Update `STRIPE_PRICE_ID_MENTORIA` en Vercel al price `price_1TbANALoQFUZpragoscEMVVK` ($2,222)
   - Redeploy

9. **Cleanup DB del subscriber de test:**
   - Manual SQL via Neon Dashboard o script tsx: borrar el subscriber del developer, sus sessions, auth_tokens, subscriptions, audit_log entries
   - JP debe quedar como único subscriber

10. **PASO 8 del runbook original:** tag `phase-6-launched`

### Bloqueadores conocidos

1. **Google Safe Browsing review (HIGH):** Chrome desktop puede mostrar "Dangerous site" warning hasta que Google apruebe el review submitted. Tiempo estimado 24-72h. Mobile/incognito no afectados. **No bloqueador absoluto** del launch técnico, pero sí afecta UX de algunos users hasta resolverse.

2. **DATABASE_URL_TEST split (LOW, deferred a 6.5):** tests integration corren TRUNCATE en setup. Hotfix actual gatea esto con env var, pero arquitectura real es separar branches. Aceptable para launch.

3. **Customer Portal next-gen "Preview":** activado en TEST y LIVE para paridad. Stripe puede cambiar UX sin warning. Aceptable hasta que pase a GA.

### Amendments acumulados al runbook (para sweep post-launch)

1. Capturar description del TEST product ANTES de toggle a LIVE mode (cazó el chat actual)
2. Documentar Customer Portal next-gen experience config en `docs/stripe-customer-portal-config.md`
3. Documentar API version `2026-02-25.clover` para webhook endpoint LIVE
4. `docs/DEVLOG.md:97-98` fix: Stripe convierte payload al apiVersion del endpoint, no del SDK
5. Stripe UI rename: "Workbench → Webhooks → destinations" (no "Developers → Webhooks → endpoints")
6. NO clickear "More pricing options" al crear product (abre form para Price adicional, confunde)
7. Vercel `env pull` enmascara Sensitive vars como string vacío — usar UI Reveal para verificar valores
8. seed-admin.ts es idempotent (UPSERT), seguro re-correr
9. **Tests destructive gate:** documentar standing rule "NO vitest run sin ALLOW_DESTRUCTIVE_TESTS"
10. **scratch-pre-launch-cleanup.ts** accidentalmente commiteado en chore commit, hay que decidir si remover en Phase 6.5 o dejar
11. **.env.example accidentalmente borrado** en chore commit, hay que recrear con contenido útil

---

## Decisiones arquitectónicas tomadas durante el launch

| Decisión | Razón |
|---|---|
| API version webhook = `2026-02-25.clover` (Latest) | Código maneja shape post-Basil per comments + 23/23 tests PASS, smoke S2-S10 corrió en clover |
| Customer Portal next-gen ON | Validado en sandbox previo, UX más moderno, paridad TEST↔LIVE |
| Email/shipping/taxID OFF en Customer Portal | Email change rompe DB match (out of scope hasta 6.5), shipping irrelevante, no CFDI |
| Cancellations = "end of billing period" | Subscriber pagó por el mes, debe poder usarlo hasta el final |
| Vercel deploy con TEST keys primero | Validar build/deploy verde sin riesgo, flip a LIVE en sub-paso aislado |
| Hotfix branch separado de feature branch | Audit trail claro, fácil rollback si necesario |
| Opción 1 para smoke LIVE ($10 price temporal) | Mismo producto = mismo comportamiento, validación más completa que TEST mode puro |

---

## Archivos clave del repo

| Path | Propósito |
|---|---|
| `docs/PHASE_6_PROGRESS.md` | History S1-S10 + decisiones aplicadas + items deferred |
| `docs/PROJECT_HANDOFF.md` | Workflow + anchors |
| `docs/runbooks/phase-6-launch-checklist.md` | Los 8 PASOS (este chat ejecutó 1-4 + hotfixes) |
| `docs/known-issues-pre-launch.md` | Bug del tests TRUNCATE documentado + standing rule |
| `docs/PHASE_6_LAUNCH_STATUS.md` | Este archivo |
| `src/lib/env.ts` | Zod schema de 8 env vars |
| `src/lib/webhooks/handle-checkout-completed.ts` | Handler principal post-payment |
| `scripts/seed-admin.ts` | Re-seed JP idempotent |
| `scripts/scratch-pre-launch-cleanup.ts` | Cleanup script (commiteado accidentalmente) |
| `tests/integration/setup.ts` | Gate de ALLOW_DESTRUCTIVE_TESTS antes de TRUNCATE |

---

## Scratchpad del developer — valores secretos LIVE pendientes de uso

> NO commitear este archivo. Estos valores ya están en formato listo para pegar en Vercel env vars cuando se ejecute PASO 5 del runbook.

```
sk_live_...           → STRIPE_SECRET_KEY (LIVE)
whsec_...             → STRIPE_WEBHOOK_SECRET (LIVE del webhook destination phase-6-mentoria-live)
price_<NEW_$10>       → STRIPE_PRICE_ID_MENTORIA (temporal $10 a crear en próximo chat)
price_1TbANALoQFUZpragoscEMVVK → STRIPE_PRICE_ID_MENTORIA (real $2,222 a revertir post-smoke)
```

---

**Próximo chat de Claude.ai:** ver el starter prompt aparte (`docs/NEXT_CHAT_STARTER_PROMPT.md`).