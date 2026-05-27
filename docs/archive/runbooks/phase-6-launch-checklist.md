# Runbook — Phase 6 launch checklist (8 PASOS)

**Status:** code-complete, awaiting external execution.
**Branch:** `feature/phase-6-mentoria-spec` (no mergeado a main todavía).
**Sequence:** Opción C híbrida (D-Pre-Clear-1) — Stripe LIVE config en Dashboard ANTES del primer deploy. Deploy a main se hace con TEST keys primero para smoke técnico. Flip a LIVE es un step concreto único. Validar webhook LIVE vía "Send test webhook" antes del primer $1 charge real.

**Total estimate:** ~2 horas de wall-clock (≠ ventana async de Resend DNS si requiere intervención).

---

## Pre-requisitos (antes de PASO 1)

- [ ] `tsc --noEmit` exit 0
- [ ] `npm test` 32/32 PASS (vía `node --env-file=.env.local ./node_modules/.bin/vitest run`)
- [ ] `npm run build` local clean. **Workaround necesario** (caveat PROGRESS:313-314: bash sourcing falla por `&` en DATABASE_URL; --env-file flag rejected por Next workers):

```bash
node --env-file=.env.local -e "require('child_process').execSync('npm run build', {stdio: 'inherit'})"
```

- [ ] `git status` working tree clean
- [ ] `git log feature/phase-6-mentoria-spec` verificado contiene todos los S10 commits + smoke round 1 + pre-clear consolidation
- [ ] Vercel CLI installed: `which vercel || npm i -g vercel`
- [ ] `vercel login` (auth con cuenta del developer)
- [ ] `vercel link` (asociar este directorio con el project Vercel)
- [ ] Acceso a Stripe Dashboard JP confirmado (test + LIVE mode toggle)
- [ ] Acceso a Resend Dashboard confirmado
- [ ] Acceso a Neon Dashboard confirmado (para inspeccionar branch main si necesario)

---

## PASO 1 — Stripe LIVE config completa en Dashboard

**Ejecutor:** user. **Estimate:** ~20 min.

- [ ] Stripe Dashboard → toggle a **LIVE mode** (top-left)
- [ ] **Customer Portal config:**
  - Settings → Billing → Customer Portal
  - Allowed actions: ENABLE cancel subscriptions, update payment method, view invoices
  - DISABLE: switch plans (Phase 6 tiene 1 solo plan)
  - DISABLE: pause subscription
  - Save changes
- [ ] **Create Product LIVE:**
  - Products → Add product
  - Name: `Mentoría 1-a-1`
  - Description: (verificar el del TEST product para copiar exactamente — Stripe Dashboard TEST mode → Products → Mentoría 1-a-1 → Copy description)
  - Pricing: `$2222 MXN`, recurring monthly
  - Save
  - **COPY priceId** (`price_...`) → guardar para PASO 3 / PASO 5
- [ ] **Create Webhook endpoint LIVE:**
  - Developers → Webhooks → Add endpoint
  - Endpoint URL: `https://portalespiritual.com.mx/api/webhooks/stripe`
  - **NOTA:** la URL todavía sirve Phase 5 (404 en /api/webhooks/stripe). Stripe permite crear el endpoint igual — no valida que responda en este momento.
  - Events to listen to (6 events del spec §13.1):
    * `checkout.session.completed`
    * `customer.subscription.created`
    * `customer.subscription.updated`
    * `customer.subscription.deleted`
    * `invoice.paid`
    * `invoice.payment_failed`
  - Click "Add endpoint"
  - **COPY signing secret** (`whsec_...`) → guardar para PASO 3 / PASO 5
- [ ] **Copy LIVE Secret Key:**
  - Developers → API keys → Standard secret key
  - Reveal + **COPY** (`sk_live_...`) → guardar para PASO 3 / PASO 5

---

## PASO 2 — Resend DNS verify

**Ejecutor:** user. **Estimate:** ~10 min.

- [ ] Resend Dashboard → Domains → `portalespiritual.com.mx`
- [ ] Verificar status "Verified" (verde) en:
  - SPF record
  - DKIM records (3)
  - DMARC record
- [ ] Si alguno está pending o failed → click "Verify" (Resend re-checks DNS)
- [ ] Si re-verify falla persistentemente → escalar al chat Claude.ai sparring (puede requerir cambios DNS en el provider donde JP tiene el dominio)

---

## PASO 3 — Pre-deploy local prep

**Ejecutor:** user. **Estimate:** ~15 min.

- [ ] **Ejecutar cleanup pre-PASO-1:**

```bash
# dry-run primero (verificar counts esperados)
node --env-file=.env.local ./node_modules/.bin/tsx scripts/scratch-pre-launch-cleanup.ts --dry-run

# si counts looken bien, run real
node --env-file=.env.local ./node_modules/.bin/tsx scripts/scratch-pre-launch-cleanup.ts
```

- [ ] Verificar post-cleanup output:
  - `subscribers: 1` (solo JP)
  - `products: 1` (mentoría)
  - `waitlist: <count original>` (preserved)
  - `audit_log: 0, auth_tokens: 0, sessions: 0, stripe_events: 0, subscriptions: 0`

- [ ] **Set env vars TEST en Vercel via CLI** (8 vars Zod schema):

```bash
vercel env add DATABASE_URL production
# paste Neon connection string (igual que tu .env.local)

vercel env add APP_URL production
# paste: https://portalespiritual.com.mx

vercel env add ADMIN_SEED_EMAIL production
# paste: akasha.infinito8@gmail.com

vercel env add RESEND_API_KEY production
# paste tu RESEND_API_KEY del .env.local (es LIVE key, ya configurada Resend domain verified)

vercel env add RESEND_FROM_EMAIL production
# paste: hola@portalespiritual.com.mx

vercel env add STRIPE_SECRET_KEY production
# paste TEST key (sk_test_...) del .env.local

vercel env add STRIPE_WEBHOOK_SECRET production
# paste TEST whsec_ del stripe listen current (o de tu .env.local si ya tenés un endpoint TEST persistente)

vercel env add STRIPE_PRICE_ID_MENTORIA production
# paste TEST price_... del .env.local (NO el LIVE del PASO 1)
```

- [ ] Verificar todas las vars cargadas:

```bash
vercel env ls
```

Debe listar **8 vars en production**: DATABASE_URL, APP_URL, ADMIN_SEED_EMAIL, RESEND_API_KEY, RESEND_FROM_EMAIL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MENTORIA.

**NO añadir las 5 vars DEAD** (deferred a 6.5, D-Pre-Clear-5): NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, CLIENT_NOTIFICATION_EMAIL, DATABASE_URL_UNPOOLED, MAGIC_LINK_SECRET.

---

## PASO 4 — Deploy main + smoke técnico (TEST keys)

**Ejecutor:** user. **Estimate:** ~15 min.

- [ ] `git checkout feature/phase-6-mentoria-spec`
- [ ] `git pull origin feature/phase-6-mentoria-spec` (sync)
- [ ] Crear PR: `feature/phase-6-mentoria-spec → main` (single-developer, self-approve)
- [ ] Merge PR → main
- [ ] Vercel auto-deploys main. Esperar deploy completo (~3-5 min). Watch build logs Vercel Dashboard.
- [ ] **Si build falla** → rollback Vercel deployment + debug local + push fix.
- [ ] **Smoke rápido** en `https://portalespiritual.com.mx`:
  - [ ] Home carga 200, sin errors console
  - [ ] /mentoria carga con Card visible + 2 CTAs (Suscribirse + Iniciar sesión)
  - [ ] Footer → click "Admin" → /login renderiza form
  - [ ] /privacidad carga
  - [ ] DevTools → Network → no 404s no-favicon
  - [ ] **NO ejecutar checkout** (tarjeta real vs Stripe TEST keys = rechazo, skipear)

Si smoke falla → debug. **NO seguir a PASO 5 hasta que smoke técnico pase.**

---

## PASO 5 — Flip a LIVE keys

**Ejecutor:** user. **Estimate:** ~10 min.

- [ ] Update las **3 vars Stripe TEST → LIVE** (mismas nombre, valores LIVE):

```bash
vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY production
# paste sk_live_... del PASO 1

vercel env rm STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET production
# paste whsec_... LIVE del PASO 1 webhook endpoint

vercel env rm STRIPE_PRICE_ID_MENTORIA production
vercel env add STRIPE_PRICE_ID_MENTORIA production
# paste price_... LIVE del PASO 1 product creation
```

- [ ] Verificar update (las 3 deben aparecer con timestamps recientes):

```bash
vercel env ls
```

- [ ] **Trigger redeploy** production:

```bash
vercel --prod
```

O desde Vercel Dashboard → Deployments → top deployment → Redeploy.

- [ ] Esperar deploy completo. Watch build logs.

---

## PASO 6 — Validar webhook LIVE sin pagar

**Ejecutor:** user. **Estimate:** ~5 min.

- [ ] Stripe Dashboard LIVE → Developers → Webhooks → select endpoint creado en PASO 1
- [ ] Click "Send test webhook" (o "Test endpoint")
- [ ] Event type: `checkout.session.completed` (el más crítico — dispara welcome email path)
- [ ] Send test
- [ ] Verificar response: debe ser **200 OK** desde portalespiritual.com.mx
- [ ] Verificar Vercel runtime logs:

```bash
vercel logs --prod
```

O Vercel Dashboard → Deployments → top → Functions → `/api/webhooks/stripe` logs. Debe aparecer la request del test webhook con response 200.

- [ ] Si test webhook retorna 500 o 4xx:
  - Verificar `STRIPE_WEBHOOK_SECRET` es correcto (signature verification)
  - Verificar Vercel logs runtime para error exacto
  - **NO seguir a PASO 7 hasta que webhook test responda 200**

---

## PASO 7 — $1 MXN test charge LIVE

**Ejecutor:** user paga, JP refunds. **Estimate:** ~30 min.

- [ ] En `https://portalespiritual.com.mx/mentoria`, click "Suscribirse"
- [ ] Stripe Hosted Checkout LIVE → pagar con tarjeta REAL propia del user (**NO test card**)
- [ ] Confirmar redirect a `/gracias`
- [ ] Confirmar email welcome llega al inbox del user (~5-30s típico)
- [ ] Click magic link → `/cuenta/perfil`
- [ ] Llenar form perfil → guardar
- [ ] Verificar `/cuenta` muestra dashboard correcto
- [ ] Logout
- [ ] Login como JP vía Footer "Admin" → `/login` → `/admin`
- [ ] Verificar nuevo subscriber en lista /admin
- [ ] Click "Cancelar suscripción" desde detail page (`/admin/[id]`)
- [ ] (Opcional, JP) Refund desde Stripe Dashboard LIVE → Customers → user → último charge → Refund full

Si algún paso falla → debug + escalar al chat Claude.ai antes de PASO 8.

---

## PASO 8 — Tag + announce

**Ejecutor:** user. **Estimate:** ~15 min.

- [ ] `git checkout main`
- [ ] `git pull origin main` (sync con remote)
- [ ] Crear el tag:

```bash
git tag -a phase-6-launched -m "Phase 6 mentoría launched end-to-end"
git push origin phase-6-launched
```

- [ ] Update `docs/PHASE_6_PROGRESS.md` final con:
  - tag hash
  - URL LIVE confirmada
  - first-checkout timestamp
- [ ] Coord con JP — JP comparte URL en Instagram cuando quiera. JP es first user de la versión LIVE.

---

## Post-launch monitoring (primeros 24h)

- Watch **Vercel Deployments** tab por errores
- Watch **Stripe Dashboard LIVE → Events** por failed webhooks
- Watch **Resend Dashboard → Logs** por bounces
- Si alguien reporta issue: log en `docs/incidents/` (crear folder on-demand cuando suceda)

---

## Qué hacer si algo falla en cada PASO

| PASO | Falla típica | Mitigación |
|---|---|---|
| 1 | Click error en Stripe Dashboard | Retry, no afecta producción |
| 2 | Resend DNS persistent failure | Escalar a chat Claude.ai para investigar DNS provider |
| 3 | `vercel env add` rechaza valor | `vercel env rm` y `vercel env add` de nuevo |
| 4 | Vercel build fail | Rollback Vercel a previous deployment, debug local, push fix |
| 5 | Build fail post-flip LIVE | Rollback Vercel a deployment con TEST keys (working) |
| 6 | Test webhook 500/4xx | Ver Vercel logs + Stripe Event Inspector. Más común: `STRIPE_WEBHOOK_SECRET` incorrecto en Vercel |
| 7 | $1 charge falla | NO refund hasta entender qué pasó (logs Vercel + Stripe Event Inspector + Resend logs). Si encaja síntomas → `docs/runbooks/refund-reversal-bug-s7-edge-1-b.md` |

---

## Items deferred a Phase 6.5 post-launch

- Limpieza `.env.local` (5 vars DEAD: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, CLIENT_NOTIFICATION_EMAIL, DATABASE_URL_UNPOOLED, MAGIC_LINK_SECRET)
- `DATABASE_URL_TEST` split (test pollution con dev DB)
- **H2** log-out-all-devices semantics (multi-session)
- **H3** caching investigation (si reaparece bug post-launch)
- Logout double-call dev logs (probable Next 16 dev quirk)
- Typography polish JP-driven (10.8b)
- Stripe SDK bump v18+ (post-Basil cleanup en `handle-checkout-completed.ts`)
- Default for `subscriptions.sessionsRemaining`
- `audit_log` idempotency (unique constraint on `event_id`)
- Test helper duplication cleanup (`postWebhook` en 4 files, `seed-active-subscription` en 6+ sites)
- Customer reuse anonymous flow (Stripe customer dedup en pre-checkout)
- `APP_URL` validation en magic link URL tests
- Email subject duplication entre `email.ts` + `resend-mock.ts`
- Pre-existing 9 lint errors S3-era (test helpers + BookingModal)
- Inline-edit pattern post-launch feedback (Editar/Guardar/Cancelar vs per-field click-to-edit)
- `alert()` → toast (MentoriaCard, PastDueBanner, ManageBillingButton)
- `AbortController` en client component fetches que window.location.href
- Welcome email third-person reference (M5 — RESUELTO en `4e7ceed`)

---

## Anchors importantes

- Plan completo: `docs/superpowers/plans/2026-05-13-phase-6-mentoria-implementation.md`
- Spec v3: `docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md`
- DEVLOG histórico: `docs/DEVLOG.md`
- Progress: `docs/PHASE_6_PROGRESS.md`
- Project handoff: `docs/PROJECT_HANDOFF.md`
- Runbook refund bug: `docs/runbooks/refund-reversal-bug-s7-edge-1-b.md`
- Este runbook: `docs/runbooks/phase-6-launch-checklist.md`

---

**Última actualización:** 2026-05-25 (pre-clear consolidation, S10 code-complete)
**Decisiones aplicadas:** D-Pre-Clear-1 (Opción C secuencia) + D-Pre-Clear-2 (Vercel CLI) + D-Pre-Clear-3 (Neon main compartida) + D-Pre-Clear-4 (RESEND_FROM_EMAIL hardcoded en runbook) + D-Pre-Clear-5 (5 DEAD vars defer) + D-Pre-Clear-6 (priceId env var SKIP refactor)
