# Runbook — BUG-S7-edge-1 variante B: revertir refund erróneo post Stripe retry

**Status:** procedimiento manual. Automatización descartada en D4 de S10 planning (requiere distinguir refunds legítimos del race S7 de bug-induced, sin test clocks la lógica no es validable safely).

**Probabilidad de ocurrencia:** muy baja (≤8 subs en Phase 6, requiere falla de red + Stripe retry en ventana estrecha del handler). Si emerge en producción, este runbook + 10-15 min de trabajo manual de JP lo resuelve sin pérdida de datos.

---

## Contexto del bug

`handle-checkout-completed.ts` puede fallar después de que `insertSubscriptionIfCapacity` insertó la `subscription` row Y `createAuthToken` creó el token. Si el fallo ocurre en el envío del email welcome (o más adelante), Stripe re-entrega el evento `checkout.session.completed`. El dispatcher idempotent verifica `stripe_events` y procede; el handler corre de nuevo. Esta vez `insertSubscriptionIfCapacity` ve la sub ya existente (vía unique constraint sobre `stripe_subscription_id`) y devuelve `duplicate_subscription`. El handler ejecuta el **refund path** → reembolso al subscriber legítimo + email "Ya tienes una suscripción activa" (que técnicamente es cierto, pero engañoso en este caso porque la "sub existente" es del primer intento del MISMO checkout).

**Síntomas observables que indican variante B (no race S7 legítimo):**

1. Subscriber reporta confusión: "Pagué pero me dijeron que ya tenía sub activa y me reembolsaron, pero nunca había suscrito antes."
2. `subscriptions` table tiene **exactamente 1 row** para esa email (no múltiples).
3. `audit_log` muestra acción del refund con `event_id` cercano en tiempo a un `checkout.session.completed` re-entregado (gap entre processed_at de stripe_events ≈ retry de Stripe, no acción humana).
4. Subscriber NO tiene segunda Stripe charge en Dashboard — solo la primera (refunded) y nada más.

Compárese con race S7 legítimo: 2 customers distintos, 2 charges, 1 ganador + 1 perdedor refundeado, sin email confusion.

---

## Playbook de detección

Cuando JP recibe reporte del subscriber:

1. **Stripe Dashboard** → buscar customer por email → contar charges totales en últimas 24h.
   - **1 charge refunded** + sub no aparece active → posible variante B.
   - **2+ charges** (1 refunded, 1+ active) → race S7 legítimo, ignorar (no acción).

2. **DB query** (vía scratch script o Drizzle):
   ```sql
   SELECT s.id, s.status, s.welcome_email_status, s.created_at, sub.email
   FROM subscriptions s
   JOIN subscribers sub ON sub.id = s.subscriber_id
   WHERE sub.email = '<subscriber_email>';
   ```
   - **0 rows:** edge raro, sub fue cleanup-eada. Re-checkout manual con JP.
   - **1 row con status='active' o 'past_due':** **CONFIRMADO variante B.** Proceder.
   - **2+ rows:** posible re-checkout legítimo del subscriber confundido; pedir clarificación antes de actuar.

3. **`stripe_events` cross-check:**
   ```sql
   SELECT stripe_event_id, type, processed_at FROM stripe_events
   WHERE payload->'data'->'object'->>'customer_email' = '<email>'
   ORDER BY processed_at;
   ```
   - Esperado: 2+ rows del mismo `checkout.session.completed` con `event_id` distintos (Stripe genera nuevo ID por retry).

---

## Playbook de reversión

Pasos a ejecutar en orden:

### 1. Revertir el refund en Stripe Dashboard

- Stripe Dashboard → Customers → buscar email → Charges
- Identificar la charge refunded del caso (cross-check con `payment_intent` del DB `subscriptions.id` si dudás)
- **NO existe "undo refund"** en Stripe. Opciones:
  - **Opción 1 (recomendada):** "Re-charge" manual al customer por el mismo monto ($2222 MXN), crear nueva invoice o usar Payment Links. JP coordina con subscriber antes (mensaje: "Hubo un error técnico, te voy a re-cobrar para activar tu mentoría correctamente").
  - **Opción 2:** issue una manual credit al next invoice. Solo viable si la sub queda active y el subscriber acepta esperar al siguiente ciclo.

### 2. Confirmar que la sub sigue active en DB

```sql
SELECT status, sessions_remaining, welcome_email_status FROM subscriptions WHERE id = '<sub_id>';
```

- Si `welcome_email_status = 'failed'` o NULL: usar admin route `/api/admin/resend-welcome` (S10 task 10.6) para generar nuevo magic link + email al subscriber.
- Si `welcome_email_status = 'sent'` pero subscriber no tiene token usable: revisar `auth_tokens` table — si todos consumed_at o expired, mismo path (resend welcome).

### 3. Append audit_log entry manual

JP debe registrar la acción en `audit_log` con su admin id (no automation aquí — la action label `refund_reversed_bug_s7_edge_1_b` deja traza para auditoría LFPDPPP):

```ts
// Vía scratch script:
import { appendAudit } from '@/lib/audit';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';

const admin = await db.query.subscribers.findFirst({
  where: eq(subscribers.email, '<JP_email>'),
});
const target = await db.query.subscribers.findFirst({
  where: eq(subscribers.email, '<subscriber_email>'),
});
await appendAudit({
  adminId: admin!.id,
  action: 'refund_reversed_bug_s7_edge_1_b',
  targetSubscriberId: target!.id,
  before: { refundStripeId: '<refund_id>', amount: 2222 },
  after: { recharge: 'manual', stripeChargeId: '<new_charge_id>' },
});
```

### 4. Comunicar al subscriber

Email manual (no template — un email personalizado de JP por Instagram DM o respuesta directa):

> Hola, hubo un error técnico que disparó un reembolso automático en tu primer pago.
> Acabo de re-procesarlo y tu Mentoría 1-a-1 ya está activa. Te llegará un nuevo
> email con tu acceso al panel. Cualquier duda escríbeme directo por aquí.

---

## Prevención (Phase 6.5 o post-launch)

Decisión cerrada en D4 de S10: NO automatizar. Trigger para revisitar:

- Si emerge **el primer caso real en producción** → re-evaluar si vale la complejidad de discriminator logic (handler debería detectar "subscription existente con welcome_email_status='pending' Y mismo subscriberId que el checkout actual" → skipear refund path, solo retry email send).
- Si emerge **2+ casos en 6 meses** → priorizar automatización en Phase 6.5.

Mientras no se cumpla ninguno, este runbook + monitoring manual de JP es la defensa.

---

**Última actualización:** 2026-05-22 (S10 Gate F partial — task 10.8c)
**Anchor:** backlog 6.5 BUG-S7-edge-1 variante B (PHASE_6_PROGRESS.md), spec §13 webhook idempotency
