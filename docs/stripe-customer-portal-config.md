# Stripe Customer Portal — required configuration

In Stripe Dashboard → Settings → Billing → Customer portal:

**Enable:**
- Update payment method
- View invoice history
- Cancel subscription:
  - "Cancel at end of billing period" (toggle this)
  - **NOT** "Cancel immediately"

**Disable:**
- Plan change (no plans to switch between)
- Quantity change
- Pause subscription
- Update business information

**Default return URL:** `https://portalespiritual.com.mx/cuenta`

Activate the portal in **both** test mode and live mode separately.

## How users hit it

`/cuenta` has an "Administrar pago / suscripción" button that POSTs to `/api/billing-portal/create`. The endpoint requires `subscriber.stripeCustomerId` (set on first webhook-driven subscription).

If the portal is NOT configured in Stripe Dashboard for the active mode (test or live), `stripe.billingPortal.sessions.create()` throws and the endpoint returns 400 with `{message: 'El portal de Stripe no está configurado. Avisa a Juan Pablo.'}`. This message bubbles to the `PastDueBanner` via `alert()`. The form-POST path on the dashboard button does NOT capture this — a future polish slice should swap that to a JS-driven button that handles the error.

## Verification

1. In Stripe test mode, log into the portal config page.
2. Toggle the items above per the lists.
3. Save.
4. From the Portal-Espiritual app: log in as a subscriber with an active subscription, click "Administrar pago / suscripción". Expect a redirect to a Stripe-hosted page showing payment method + cancel option (no "Cancel immediately" button).
5. Repeat in live mode before production launch.
