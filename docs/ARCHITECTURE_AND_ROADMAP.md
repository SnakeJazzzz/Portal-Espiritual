# Portal Espiritual — Architecture & Roadmap

> **Propósito:** documentar QUÉ vamos a construir, CÓMO está diseñado para
> escalar, y QUÉ viene en phases futuras. Este es el norte arquitectónico
> del proyecto. Cuando una decisión técnica esté en duda, este documento
> es la fuente de verdad para "¿esto encaja en el diseño?".

---

## El principio rector

**Estamos construyendo la primera capa de un sistema de suscripciones
y productos, no solo "la feature de Mentoría".**

Cada decisión de Phase 6 se evalúa contra esta pregunta: *¿esto sigue
funcionando cuando agreguemos cursos y meditaciones por suscripción?*

Si la respuesta es no, rediseñamos. Optimizar para un solo caso de uso
hoy nos garantiza reescribir schemas en 6 meses.

---

## Phase 6 — Mentoría 1-a-1 (en planning)

### Resumen del producto

- Suscripción mensual recurrente automática: **$2222 MXN/mes**
- Cancelable por el suscriptor en cualquier momento
- **8 spots máximo** (configurable)
- Contador en vivo de spots restantes en la página principal
- Datos personales del suscriptor recolectados al registro

### Lo que incluye el servicio (definido por el cliente)

- 2 sesiones privadas de 30 min al mes
- Acceso a mensajes directos por Instagram
- Plan personalizado de desarrollo consciente

**Las sesiones y la comunicación NO se gestionan desde el sitio web.**
El cliente las maneja por fuera (Cal.com, Instagram DMs, calendario
personal). El sitio web solo maneja: registro, pago, cancelación,
email de agradecimiento, email al cliente con datos del nuevo suscriptor.

---

### Stack agregado en Phase 6

| Capa | Tecnología | Por qué |
|------|------------|---------|
| DB | Vercel Postgres + Drizzle ORM | Schema relacional escalable. Drizzle = type-safe queries, migrations explícitas, ligero |
| Pagos | Stripe Subscriptions | Solución estándar de la industria para recurring. Cuenta del cliente (la misma que usa Cal.com) |
| Email | Resend | SDK simple para Next.js, free tier 3000 emails/mes |
| Validación | Zod | Schema validation en API routes y forms |
| Auth (mínima) | Magic link via email | Sin passwords. Link firmado con expiración corta |

### Costos mensuales esperados (8 suscriptores activos)

| Servicio | Costo |
|----------|-------|
| Vercel Postgres (free tier hasta 0.5 GB) | $0 |
| Resend (free tier 3000 emails/mes) | $0 |
| Stripe fees (~3.6% + $3 MXN por cargo) | ~$560 MXN (revenue share) |
| Vercel hosting | sin cambio |
| **Total infra nueva** | **$0/mes fijo** |

---

### Modelo de datos (diseñado para escalar)

```
products
├── id (uuid, PK)
├── slug (text, unique)          -- 'mentoria-1-a-1', 'curso-akashico', etc.
├── name (text)
├── description (text)
├── product_type (enum)          -- 'subscription' | 'one_shot' | 'course'
├── price_mxn_cents (int)        -- 222200 = $2222.00
├── billing_interval (enum)      -- 'month' | 'year' | null (null = one-shot)
├── max_capacity (int, nullable) -- 8 para mentoria, null para sin límite
├── stripe_product_id (text)
├── stripe_price_id (text)
├── is_active (boolean)
├── metadata (jsonb)             -- campos específicos por tipo de producto
├── created_at, updated_at

subscriptions
├── id (uuid, PK)
├── product_id (fk → products)
├── subscriber_id (fk → subscribers)
├── stripe_subscription_id (text, unique)
├── stripe_customer_id (text)
├── status (enum)                -- 'active' | 'canceled' | 'past_due' | 'incomplete'
├── current_period_start, current_period_end (timestamp)
├── canceled_at (timestamp, nullable)
├── created_at, updated_at

subscribers
├── id (uuid, PK)
├── email (text, unique)
├── full_name (text)
├── instagram_handle (text)
├── phone (text)
├── birth_date (date)
├── birth_time (time, nullable)
├── birth_place (text)
├── consent_given_at (timestamp) -- LFPDPPP
├── created_at, updated_at

waitlist
├── id (uuid, PK)
├── product_id (fk → products)
├── email (text)
├── full_name (text)
├── instagram_handle (text)
├── created_at

stripe_events                    -- para idempotency de webhooks
├── id (text, PK)                -- stripe event_id
├── type (text)                  -- e.g. 'checkout.session.completed'
├── processed_at (timestamp)
├── created_at
```

### Por qué este modelo escala

**Phase 6 hoy:**
```
products: [{ slug: 'mentoria-1-a-1', product_type: 'subscription', max_capacity: 8 }]
```

**Phase 7 (cursos):** añadir rows a `products` con `product_type: 'course'`.
Tablas nuevas `lessons` y `lesson_progress` para lo específico de cursos.
**Nada se reescribe en Phase 6.**

**Phase 8 (meditaciones por suscripción):** añadir rows a `products`
con `product_type: 'subscription'` y `max_capacity: null`.
Tablas `meditations` y `meditation_access` para ACL.
**Nada se reescribe en Phase 6 ni 7.**

El núcleo reusable es: `products` + `subscriptions` + `subscribers`.

---

### Flujo de UX

```
[ Home ]
    │
    │ Hero muestra ServiceCard especial "Mentoría 1-a-1"
    │ con contador en vivo "Quedan X de 8 spots"
    │
    ▼
[ Click en tarjeta o en modal de selección ]
    │
    ▼
[ /mentoria ]
    │ Página dedicada con detalles completos del programa
    │ Botón "Reservar mi lugar"
    │
    ▼
[ /mentoria/registro ]
    │ Form con: Instagram, fecha de nac., hora de nac., lugar de nac.,
    │ celular, email, checkbox de aviso de privacidad
    │ Submit → POST /api/mentoria/checkout
    │
    ▼
[ /api/mentoria/checkout ]
    │ Valida datos con Zod
    │ Verifica spots disponibles (transacción Postgres)
    │ Crea Stripe Checkout Session (mode: 'subscription')
    │ Guarda datos personales en sesión Stripe metadata
    │ Redirige a Stripe Checkout
    │
    ▼
[ Stripe Checkout ]
    │ Usuario completa pago
    │
    ▼
[ /mentoria/exito ]   ←  Success URL desde Stripe
    │ Mensaje "Bienvenido. Te llegó un email."
    │
    ▼
[ Webhook /api/webhooks/stripe ]   ← Async, idempotente
    │ Verifica firma del webhook
    │ Chequea stripe_events para idempotency
    │ Si checkout.session.completed:
    │   - INSERT subscriber + subscription en Postgres
    │   - Manda email al suscriptor (agradecimiento + link a gestionar)
    │   - Manda email al cliente (Juan Pablo) con todos los datos
    │ Si customer.subscription.deleted o invoice.payment_failed:
    │   - UPDATE subscription.status = 'canceled' (libera spot automáticamente)
```

### Manejo de cupo lleno

Si al hacer click en "Reservar" o al cargar `/mentoria/registro` no
hay spots:
- Botón cambia a "Únete a la lista de espera"
- Form más corto: email + nombre + Instagram
- POST a `/api/mentoria/waitlist`
- Cuando cancela alguien, el cliente contacta manualmente al siguiente
  (no automatizamos invite-back en v1)

### Manejo de cancelación

- Link a `/mentoria/gestionar` en el email de agradecimiento y en footer
- Usuario mete su email
- Recibe magic link (válido 15 min)
- Click → autenticado → redirige a **Stripe Customer Portal**
- Stripe Customer Portal maneja: cancelar suscripción, actualizar tarjeta,
  ver historial. Llave en mano, branded con logo del cliente.

### Aviso de privacidad (LFPDPPP)

- Página `/privacidad` con texto simple (~200 palabras)
- Checkbox en form de registro: "He leído y acepto el [aviso de privacidad]"
- Guardamos `consent_given_at` en `subscribers`

---

### Archivos que se crean en Phase 6

```
NUEVOS:
src/app/mentoria/page.tsx                    # landing del programa
src/app/mentoria/registro/page.tsx           # form de 6 campos + consent
src/app/mentoria/exito/page.tsx              # confirmación post-Stripe
src/app/mentoria/gestionar/page.tsx          # entry point para magic link
src/app/privacidad/page.tsx                  # aviso de privacidad
src/app/api/mentoria/checkout/route.ts       # crear Stripe Checkout Session
src/app/api/mentoria/waitlist/route.ts       # añadir a waitlist
src/app/api/mentoria/portal/route.ts         # generar link a Stripe Customer Portal
src/app/api/auth/magic-link/route.ts         # generar y validar magic links
src/app/api/webhooks/stripe/route.ts         # webhook handler idempotente

src/lib/db/schema.ts                         # drizzle schema
src/lib/db/index.ts                          # drizzle client
src/lib/db/queries.ts                        # query helpers (getSpotsAvailable, etc.)
src/lib/stripe/client.ts                     # stripe sdk wrapper
src/lib/stripe/checkout.ts                   # helpers para crear sessions
src/lib/email/resend.ts                      # wrapper de Resend
src/lib/email/templates/                     # templates de los 2 emails
src/lib/validation/mentoria.ts               # zod schemas

src/components/MentoriaCard.tsx              # tarjeta especial con contador
src/components/MentoriaRegistroForm.tsx      # form client-side
src/components/WaitlistForm.tsx              # form de waitlist

drizzle/migrations/                          # SQL migrations versionadas

MODIFICADOS:
src/config/services.ts                       # añadir Mentoría con type='subscription'
src/components/ServiceSelectionModal.tsx     # branch: subscription → router.push('/mentoria')
src/components/Hero.tsx                      # añadir MentoriaCard al grid
src/components/Footer.tsx                    # link a /privacidad y a /mentoria/gestionar
.env.local.example                           # documentar nuevas env vars necesarias

NUEVAS DEPS:
- stripe
- @vercel/postgres + drizzle-orm + drizzle-kit
- resend
- zod
```

### Variables de entorno nuevas

A configurar en Vercel Dashboard + `.env.local`:

```
DATABASE_URL                     # Postgres connection string
STRIPE_SECRET_KEY                # del dashboard del cliente
STRIPE_WEBHOOK_SECRET            # de la configuración del webhook endpoint
STRIPE_MENTORIA_PRICE_ID         # price_xxx del producto en Stripe
RESEND_API_KEY                   # de la cuenta del developer
RESEND_FROM_EMAIL                # ej: 'Portal Espiritual <hola@portal-espiritual.com>'
CLIENT_NOTIFICATION_EMAIL        # email de Juan Pablo para alertas
NEXT_PUBLIC_SITE_URL             # https://portal-espiritual.com
MAGIC_LINK_SECRET                # random 32-byte hex para firmar links
```

---

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Migrations en producción | Sin CI/CD en Phase 6 — corremos manual con plan. CI/CD se monta antes de Phase 7. |
| Webhook idempotency | Tabla `stripe_events` chequea `event_id` antes de procesar. |
| Race condition en último spot | Transacción Postgres con check de capacity dentro de la transacción. |
| Test de pago real | Cobro real de $1 MXN end-to-end antes de marcar done. Luego refund. |
| Borrar datos personales (LFPDPPP) | Phase 6: script manual de delete-by-email. Phase 6.5: UI en admin. |

---

### Criterios de "feature done" para Phase 6

- [ ] Build local exitoso, 0 errores TS / ESLint
- [ ] Schema migrado a Postgres en producción
- [ ] Webhook de Stripe configurado con secret y endpoint
- [ ] Productos creados en Stripe con price_id correctos
- [ ] Resend dominio verificado
- [ ] Test de pago real ($1 MXN) exitoso end-to-end
- [ ] Email al suscriptor llegó
- [ ] Email al cliente llegó con datos correctos
- [ ] Spot decrementa en home tras suscripción
- [ ] Cancelación libera spot
- [ ] Magic link funciona
- [ ] Customer Portal accesible
- [ ] Waitlist funciona cuando cupo lleno
- [ ] `/privacidad` accesible
- [ ] Aviso de privacidad mencionado en footer
- [ ] Build de Vercel verde
- [ ] Mobile rendering verificado (375px Instagram in-app)

---

### Alcance del admin en Phase 6 (decisión brainstorming 2026-05-12)

Phase 6 **sí incluye un admin mínimo** — sin él, Juan Pablo no tiene
forma observable de saber cuántos suscriptores activos tiene ni de
ajustar `sessions_remaining` manualmente. Lo que va y lo que no va:

**Incluido en Phase 6 (admin mínimo):**

- `/admin` — lista de suscriptores con columnas: nombre, email,
  fecha inicio, sesiones restantes, status. Toggle "ver canceladas".
- `/admin/[id]` — vista de detalle read-only excepto:
  - Input inline numérico para ajustar `sessions_remaining`
    (registrado en `audit_log`)
  - Botón "Cancelar suscripción" (Stripe API con
    `cancel_at_period_end = true`)
  - Link directo al Customer en Stripe Dashboard

**Diferido a Phase 6.5 (admin completo, ver siguiente sección):**

- Edición de campos del suscriptor (nombre, email, IG, etc) — en
  Phase 6 se cambian por SQL si surge necesidad (≤8 suscriptores).
- Notas internas del admin
- Pause subscription
- Búsqueda, ordenamiento custom, exportación CSV
- UI propia de historial de pagos (existe en Stripe Dashboard)
- LFPDPPP delete-by-email UI (en Phase 6: script manual)
- Métricas / churn rate / spots ocupados visual
- Lista de waitlist con marcar-como-notificado

Spec de referencia: `docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md` §9.

---

## Phase 6.5 — Admin dashboard completo (post-Phase 6, antes de Phase 7)

**Relación con Phase 6:** Phase 6 ya entrega un admin *mínimo*
(lista + cancel + edit sessions; ver "Alcance del admin en Phase 6"
arriba). Phase 6.5 expande ese admin a CRM completo. Es expansión,
no construcción desde cero.

**Cuando se hace:** cuando el cliente reporte fricción manejando
suscriptores manualmente, o antes de Phase 7 si se considera necesario.

### Funcionalidad (delta sobre el admin mínimo de Phase 6)

- Edición inline de datos del suscriptor (nombre, IG, teléfono, etc)
- Notas internas del admin con editor
- Pause subscription (Stripe `pause_collection`)
- Búsqueda y filtros custom, exportación CSV
- UI de historial de pagos (vs link a Stripe Dashboard en Phase 6)
- LFPDPPP delete-by-email con UI
- Lista de waitlist con marcar-como-notificado
- Métricas básicas: spots ocupados, churn rate, MRR

### Estimación

3-5 días bien planeados. Phase 6 prepara el terreno (DB, queries, auth);
6.5 es mayormente UI.

---

## Phase 7 — Cursos (futuro)

**Cuando se hace:** cuando Mentoría esté estable y el cliente quiera
expandir a contenido grabado.

### Funcionalidad esperada

- Catálogo de cursos en `/cursos`
- Cada curso es un `product` con `product_type: 'course'`
- Pago one-shot (no recurrente) por curso, o bundle por suscripción
- Reproductor de video (Mux, YouTube unlisted, o Cloudflare Stream)
- Tracking de progreso por suscriptor (`lesson_progress` table)
- ACL: suscriptor solo accede a cursos comprados

### Tablas nuevas

```
lessons
├── id, product_id (fk → products), title, video_url, order_index, duration_seconds

lesson_progress
├── id, subscriber_id, lesson_id, completed_at, watch_time_seconds
```

### Decisiones a tomar entonces

- Proveedor de video: Mux (mejor DX, pago por minuto) vs Cloudflare Stream
  (precio fijo, más simple) vs YouTube unlisted (gratis, peor control)
- DRM o no
- Si la suscripción de cursos es bundle ($X/mes da acceso a todos) o
  per-course

---

## Phase 8 — Meditaciones guiadas por suscripción (futuro)

**Cuando se hace:** después de Phase 7, si hay demanda.

### Funcionalidad esperada

- Suscripción mensual da acceso a librería de meditaciones (audio + video)
- Releases periódicos (1 nueva por semana, etc.)
- Notificaciones de nuevas meditaciones (email vía Resend)

### Tablas nuevas

```
meditations
├── id, title, description, audio_url, video_url, duration_seconds,
│   release_date, is_subscriber_only

meditation_access  (opcional, si access es por meditación individual)
├── id, subscriber_id, meditation_id, accessed_at
```

### Diseño que aprovecha el modelo existente

Suscripción de meditaciones es un nuevo row en `products`:
```
{ slug: 'meditaciones-mensual', product_type: 'subscription',
  max_capacity: null, price_mxn_cents: 49900, billing_interval: 'month' }
```

Suscriber compra → `subscriptions` con `status='active'` → middleware
de auth chequea si tiene suscripción activa para acceder a `/meditaciones/*`.

---

## Principios arquitectónicos del proyecto

1. **Configuration over code.** Todo lo editable por el cliente, en config o DB.
2. **Single source of truth.** Para servicios actuales: `src/config/services.ts`.
   Para productos de Phase 6+: tabla `products` en Postgres.
3. **Schema genérico, lógica específica.** El núcleo de DB (products,
   subscriptions, subscribers) es agnóstico al tipo de producto. La
   lógica específica vive en API routes y componentes específicos.
4. **Webhooks idempotentes siempre.** Cualquier integración con Stripe,
   Resend, o futuros providers procesa eventos exactly-once.
5. **Server components donde el dato es server-side.** Counter de spots,
   listas de productos, dashboards admin. Client components solo donde
   hay interactividad real.
6. **Mobile-first siempre.** Instagram in-app browser primero, desktop
   después.
7. **No reescribir features previas para soportar futuras.** Si una
   feature nueva requiere romper algo viejo, parar y rediseñar el plan.

---

## Por dónde NO crecer

Estas son tentaciones a evitar mientras no haya razón fuerte:

- **No** auth con passwords. Magic links cubren todo lo que necesitamos.
- **No** dashboard admin con permisos granulares. Un admin (Juan Pablo) basta.
- **No** internacionalización (i18n). El sitio es 100% en español.
- **No** mobile app nativa. PWA si acaso, en Phase 9+.
- **No** AI/ML features. El sitio es content + commerce, no ML.
- **No** real-time (websockets) salvo necesidad real (live sessions sería
  caso válido en Phase 10+).
- **No** microservicios. Todo Next.js monolítico hasta que duela.
