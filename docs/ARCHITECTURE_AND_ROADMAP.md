# Portal Espiritual — Arquitectura y Roadmap

> **Propósito de este documento:** definir el QUÉ y el POR QUÉ del proyecto a
> nivel arquitectónico, sin cerrar prematuramente decisiones de implementación.
> Lo abierto se cierra en `/superpowers:brainstorming`. Lo cerrado aquí ES
> input no-negociable al brainstorming.
>
> **Audiencia:** Claude Code (lee esto en cada sesión), developer (revisa
> antes de planning), y futuros maintainers.
>
> **No es:** un plan de tasks, un design doc detallado, ni un schema final
> de DB. Esos se generan downstream.

---

## 1. Qué estamos construyendo

Portal Espiritual es una landing page de servicios espirituales del cliente
Juan Pablo (guía espiritual). En producción en `portalespiritual.com.mx` via
Vercel, auto-deploy desde `main`.

### Estado actual (Phases 1-6, en producción)

**Phases 1-5** — cuatro servicios one-shot pagados y agendados vía Cal.com:

- Divinación de Cartas (30 min, $555 MXN)
- Divinación Akáshica (45 min, $666 MXN)
- Divinación Clásica (60 min, $888 MXN)
- Activación Cuántica (60 min, $1111 MXN)

**Phase 6 — Mentoría 1-a-1** (LIVE desde 2026-05-27, tag `phase-6-launched`)
— suscripción mensual recurrente:

- Precio: $2222 MXN/mes
- Capacidad: 8 spots máximo (read-only counter en `/mentoria`)
- Incluye: 2 sesiones privadas de 30 min al mes, acceso a mensajes directos
  por Instagram, plan personalizado de desarrollo
- Pago: Stripe Subscriptions (NO Cal.com), checkout hosted, webhook destination
  `we_1TbAtKLoQFUZprag5melpCZk` en LIVE (URL canónica:
  `https://www.portalespiritual.com.mx/api/webhooks/stripe` — el subdomain
  `www` es required; el apex causa 307 redirects)
- Autenticación de suscriptores: magic link via email (Resend, dominio verificado)
- Customer Portal de Stripe activo (next-gen, cancel end-of-period, no
  immediate-cancel)
- Admin panel mínimo en `/admin` (lista, edición de sesiones-restantes,
  cancel, resend welcome)
- Cuando se llenan los 8 spots: el botón muestra "Cupo lleno, regresa
  pronto". Sin waitlist automatizada.

Stack runtime actual: Next.js 16 + React 19 + Tailwind v4 + Drizzle ORM +
Neon serverless Postgres + Stripe SDK 17 + Resend.

Para el snapshot operacional completo del sistema LIVE (env vars, schema,
routes activas, etc.) ver `SYSTEM_STATUS.md`.

### Lo que viene después (visión, no compromiso)

- **Phase 6.5**: post-launch polish + tech debt (ver `PHASE_6_5_BACKLOG.md`)
- **Phase 7**: Cursos pre-grabados
- **Phase 8**: Meditaciones guiadas
- **Phase 9**: Comunidad interna

Todas estas phases comparten el mismo modelo: contenido digital con acceso
controlado por suscripción o compra. Phase 6 ya estableció la base de
**autenticación + control de acceso + cobros recurrentes** que las demás
heredarán.

---

## 2. Por qué este enfoque (principios arquitectónicos)

Estos siete principios son no-negociables. Si alguna propuesta del
brainstorming los viola, se rechaza o se justifica explícitamente por qué se
viola.

1. **Configuration over code.** Todo lo que el cliente podría querer editar
   (precios, descripciones, slugs) vive en archivos de config tipados, no
   hardcoded en componentes. Single source: `src/config/services.ts` para
   servicios actuales; Phase 6 extiende o crea config análogo.

2. **Single source of truth.** Una sola definición autoritativa por concepto.
   Si "precio de mentoría" existe en 3 lugares, hay un bug esperando suceder.

3. **Schema genérico, lógica específica.** El núcleo de DB
   (products, subscriptions, subscribers, etc.) es agnóstico al tipo de
   producto. Mentoría es UNA instancia de "producto con suscripción".
   Cursos en Phase 7 será otra instancia. Sin reescribir el schema.

4. **Webhooks idempotentes siempre.** Stripe (y cualquier proveedor) puede
   enviar el mismo evento múltiples veces. Procesarlos N veces debe dar el
   mismo resultado que procesarlos 1 vez.

5. **Server components donde el dato es server-side.** Datos del usuario
   logueado, estado de suscripción, info admin → server. Animaciones,
   interacciones del DOM → client. Sin mezclar.

6. **Mobile-first siempre.** Tráfico principal es in-app browser de Instagram
   en móvil (375px primario). Cualquier UI que se rompa en mobile no se
   merge.

7. **No reescribir features previas para soportar futuras.** Phase 7 no debe
   requerir tocar el código de Phase 6. Si lo requiere, el schema/diseño de
   Phase 6 está mal y se corrige ANTES de empezar Phase 7.

---

## 3. Stack confirmado para Phase 6

**Esto está cerrado. No es para discutir en brainstorming.**

### Frontend (ya existe, se extiende)

- Next.js 16 App Router + React 19
- TypeScript 5 strict
- Tailwind CSS v4 (theme en `src/app/globals.css`)
- Josefin Sans (headings) + Cormorant Garamond (body)

### Backend / Datos (nuevo)

- **Database**: Neon Postgres, integración via Vercel Marketplace
  (NO la legacy "Vercel Postgres"; Neon directamente, Vercel-Managed)
- **ORM**: Drizzle
- **Validación**: Zod
- **Pagos recurrentes**: Stripe Subscriptions (cuenta del cliente, misma
  que Cal.com)
- **Email transaccional**: Resend (cuenta del cliente, dominio verificado
  `portalespiritual.com.mx`)
- **Autenticación**: NextAuth con email provider (magic link). No
  passwords, no OAuth en Phase 6.

### Hosting (ya existe)

- Vercel, plan Pro, auto-deploy desde `main`
- Dominio: `portalespiritual.com.mx` (GoDaddy DNS, A record a Vercel)
- Vercel CLI + `vercel env pull` para sincronizar env vars locales

---

## 4. Alcance de Phase 6

Modo de lanzamiento: **completo del lado del suscriptor; mínimo del lado
admin**. Phase 6 incluye el flujo completo del suscriptor (registro,
checkout, dashboard, cancelación, edición de perfil) Y un panel admin
mínimo (lista de suscriptores, edición de sesiones restantes, cancelación
de suscripciones). El panel admin completo (edición de campos personales,
notas internas, búsqueda, filtros, exportación) se difiere a Phase 6.5.

Esta decisión se cerró en el brainstorming del 2026-05-12. Ver
`docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md` §1 y §9
para el alcance exacto.

### Flujo del suscriptor (público)

1. Usuario llega a `/mentoria` (página nueva)
2. Ve el servicio, sus beneficios, precio, y estado de cupo
3. Si hay cupo → botón "Suscribirme" → checkout
4. Si no hay cupo → botón "Cupo lleno, regresa pronto" (deshabilitado)
5. Después del pago exitoso → email de bienvenida + acceso a su panel
6. En su panel (`/cuenta` o similar): ve info de su suscripción, sesiones
   restantes, datos personales (editables), y opción de cancelar

### Flujo del admin (Juan Pablo)

1. Login via magic link al email registrado
2. Panel admin (`/admin` o similar) protegido por rol
3. Ve lista de suscriptores: activos, inactivos, fecha de inicio, monto pagado
4. Por cada suscriptor puede:
   - Ver detalles completos (incluyendo info personal)
   - Editar info del suscriptor (nombre, contacto, notas internas)
   - Ver y modificar el número de sesiones restantes del mes
   - Agregar sesiones extra (cortesía, regalo, compensación)
   - Ver historial de pagos
   - Marcar suscriptor como inactivo manualmente
5. Lista de usuarios inactivos separable / filtrable

### Lo que NO está en Phase 6 (explícito)

- Lista de espera automatizada
- Notificaciones push o SMS
- Integración de las sesiones con calendario (Cal.com u otros) — las
  sesiones se agendan por fuera, el panel solo cuenta cuántas le quedan
- Reportes / analytics / métricas más allá de "lista de suscriptores"
- Multi-admin (solo Juan Pablo es admin)
- Cambio de plan / upgrade / downgrade
- Trials gratuitos, cupones, descuentos
- Facturación con datos fiscales (CFDI, etc.)
- Cursos, meditaciones, comunidad (Phase 7+)

---

## 5. Requisitos transversales (aplican a todo Phase 6)

### Privacidad y legal

- **LFPDPPP** (México): cualquier formulario que recolecte datos personales
  necesita aviso de privacidad accesible. Phase 6 incluye crear `/privacidad`.
- Datos sensibles (tarjetas, etc.) NUNCA tocan nuestra DB — viven en Stripe.
- Email del suscriptor es PII pero necesario; se almacena en DB con cuidado
  estándar (no se loguea en consola, no se expone en URLs).

### Confiabilidad

- Webhooks de Stripe idempotentes (regla 4 arriba)
- Manejo de race conditions en el flujo de checkout (qué pasa si dos
  usuarios pagan simultáneamente y solo queda 1 spot — esto se discute en
  brainstorming)
- Si un webhook falla, debe ser reintentable sin efectos secundarios

### Testing

- Tests del spec (lo que debe pasar), no del code (cómo está implementado)
- Tests aislados, no contaminan DB de producción
- Test end-to-end del flujo crítico (suscripción → webhook → email →
  acceso al panel) antes de merge

### Operacional

- Test de cobro real en live mode de Stripe ($1 MXN end-to-end, luego
  refund) antes de declarar Phase 6 "done"
- Antes del cobro real: Juan Pablo informado de la decisión fiscal
  (registro SAT vs no registrado), responsabilidad suya

---

## 6. Decisiones explícitamente abiertas (input al brainstorming)

Estas son las decisiones que NO se cierran aquí. El brainstorming debe
producir respuesta concreta para cada una. Si encuentra más, las agrega a
su propio spec.

### Sobre el modelo de datos

- **D1**: ¿El schema arranca completo (todas las tablas de phases futuras
  incluidas) o incremental (solo lo que Phase 6 necesita, expandible)?
- **D2**: ¿Cómo modelar "8 spots"? ¿Conteo dinámico de suscriptores activos?
  ¿Campo `capacity` en `products`? ¿Lock pesimista al momento del checkout?
- **D3**: ¿Cómo se representa "sesiones restantes del mes"? ¿Contador que
  decrementa? ¿Tabla de sesiones individuales con `used_at`? ¿Reset
  automático en cada renovación?
- **D4**: ¿Roles de usuario simples (`subscriber` vs `admin`) o algo más
  flexible (permisos granulares)?

### Sobre el flujo de checkout

- **D5**: ¿Stripe Checkout hosted (redirige al dominio de Stripe) o Stripe
  Elements embebido (todo en nuestra página)? Trade-offs de UX, costo de
  integración, riesgo PCI.
- **D6**: ¿Qué pasa si el usuario cierra el checkout sin pagar?
- **D7**: ¿Qué pasa si paga pero el webhook tarda en llegar (latencia
  Stripe → nosotros)?
- **D8**: ¿Qué pasa si paga pero el spot 8 fue tomado por otro usuario
  simultáneamente?

### Sobre autenticación

- **D9**: ¿Magic link emite sesión de cuánto tiempo? (1 día / 7 días / 30
  días / hasta logout)
- **D10**: ¿Mismo magic link para suscriptor que para admin, distinguidos
  por rol en DB? ¿O endpoints separados?
- **D11**: Si el suscriptor cancela y se re-suscribe meses después con el
  mismo email, ¿es el mismo usuario o uno nuevo? ¿Conserva su historial?

### Sobre el panel admin

- **D12**: ¿Cuándo Juan Pablo "agrega sesiones extra" a un suscriptor, eso
  queda auditable? ¿Hay log de cambios?
- **D13**: ¿Editar info del suscriptor genera notificación al suscriptor?
- **D14**: ¿"Marcar inactivo" manualmente cancela también la suscripción
  en Stripe, o solo en nuestra DB?

### Sobre el panel del suscriptor

- **D15**: ¿El suscriptor puede editar SU email? Eso es delicado — el email
  es su identidad de login. Si lo cambia, ¿se invalida la sesión?
- **D16**: ¿Cancelar la suscripción es inmediato o al final del período
  pagado? (Stripe soporta ambos.)

### Sobre la implementación

- **D17**: ¿Migraciones de Drizzle se corren manualmente o automáticamente
  en deploy? ¿Cómo se rollback?
- **D18**: ¿Cuánto del código de Phase 6 vive en `/api/*` (Next.js API
  routes) vs Server Actions vs Server Components?
- **D19**: ¿Cómo se estructura el código para que Phase 7 (cursos) pueda
  reusar la mayor parte sin duplicar?

### Sobre testing

- **D20**: ¿Qué casos críticos requieren test E2E con Stripe test mode vs
  cuáles bastan con mocks?
- **D21**: ¿Hay tests que requieran Vercel Preview Branching de la DB? ¿O
  todos pueden correr con SQLite en memoria / Postgres local?

---

## 7. Roadmap macro (visión, no compromiso)

Las phases futuras se documentan aquí para que las decisiones de Phase 6 no
las cierren accidentalmente, no porque ya estén planeadas en detalle.

### Phase 6.5 (post-launch, ajustes)

Mejoras al panel admin basadas en uso real. Optimizaciones de performance.
Refactor de cosas que en Phase 6 se hicieron "bien-suficiente".

### Phase 7: Cursos pre-grabados

- Producto NO recurrente (one-off purchase)
- Acceso permanente al contenido tras la compra
- Hosting de video (proveedor por decidir)
- Sistema de progreso ("cuánto llevo del curso")

### Phase 8: Meditaciones guiadas

- Producto recurrente (suscripción mensual) similar a mentoría pero con
  acceso a librería de meditaciones (audio/video)
- Sin límite de spots
- Probable que comparta el panel del suscriptor con Phase 6

### Phase 9: Comunidad interna

- Foro / chat para suscriptores activos
- Más complejo en cuanto a moderación, real-time, etc.
- Posiblemente integrar herramienta externa (Discord, Circle.so) en vez de
  construir

**Implicación para Phase 6**: el schema debe permitir un usuario tener
múltiples suscripciones simultáneas (mentoría + meditaciones), múltiples
compras one-off (cursos), y métricas separadas por producto. Esto es
exactamente lo que el principio 3 ("schema genérico") busca.

---

## 8. Estructura de carpetas (estado actual post-Phase-6)

```
src/
├── app/
│   ├── layout.tsx              # Root layout + fonts
│   ├── page.tsx                # Home (Phases 1-5)
│   ├── globals.css             # Tailwind theme + animations
│   ├── privacidad/             # Phase 6: aviso de privacidad (LFPDPPP)
│   ├── mentoria/               # Phase 6: landing del servicio
│   ├── cuenta/                 # Phase 6: panel del suscriptor
│   ├── admin/                  # Phase 6: panel admin
│   │   └── [id]/               # Phase 6: detalle por suscriptor
│   └── api/                    # Phase 6: webhooks, auth, billing-portal, admin
├── components/                 # Phases 1-5 + admin/ subdir Phase 6
├── config/
│   ├── services.ts             # Single source para servicios Phases 1-5
│   └── mentoria.ts             # Single source para Mentoría 1-a-1
├── lib/                        # db client, stripe SDK, email, auth, audit, env
├── db/
│   ├── client.ts
│   ├── schema.ts
│   └── migrations/             # Drizzle-generated SQL
└── middleware.ts               # Phase 6: session cookie + admin gate
```

---

## 9. Cómo se usa este documento

### Antes de brainstorming

Claude Code lo lee como contexto. NO genera código en base a este doc; lo
usa para entender el QUÉ y el POR QUÉ. El CÓMO sale del brainstorming.

### Durante brainstorming

Si una propuesta viola un principio (sección 2) o asume algo que está en
las "decisiones abiertas" (sección 6), Claude Code lo señala. El brainstorming
NO cierra decisiones que el roadmap quiso dejar abiertas, las refina y las
resuelve concretamente.

### Después de brainstorming

Si el brainstorming reveló que algún supuesto del roadmap estaba mal, se
actualiza ESTE documento en una branch chore/ separada antes de empezar
writing-plans.

### Durante writing-plans

El plan referencia este doc para justificar decisiones de tasks. "Por qué
esta task existe" debe rastrearse a una sección de este doc + la
conclusión del brainstorming.

---

## 10. Estado actual del repo (post-Phase-6 launch)

- Branch `main`: Phase 6 launched 2026-05-27, tag `phase-6-launched`.
  Mentoría 1-a-1 live en production, full subscriber flow + admin panel
  functional. Live smoke a/b/c/d/e completado verde.
- Cuentas externas en LIVE:
  - Stripe LIVE mode: producto Mentoría 1-a-1 (`prod_UaL3x5TrS6pv6B`),
    price activo $2,222 MXN/mes (`price_1TbANALoQFUZpragoscEMVVK`),
    webhook destination `we_1TbAtKLoQFUZprag5melpCZk` (URL canónica
    `https://www.portalespiritual.com.mx/api/webhooks/stripe`,
    6 events suscritos, API version `2026-02-25.clover`)
  - Resend: dominio `portalespiritual.com.mx` verified, sender
    `hola@portalespiritual.com.mx`
  - Neon: DB `portal-espiritual-db` vía Vercel Marketplace. Branch
    `main` único, compartido entre dev local + production (split a
    `DATABASE_URL_TEST` deferred a Phase 6.5 — ver `PHASE_6_5_BACKLOG.md`
    item HIGH/Data-integrity #1)
- Vercel env vars: 8 vars Zod-validated en Production scope. Preview scope
  no tiene mirrored vars (también Phase 6.5 backlog).
- Para el snapshot operacional completo del sistema LIVE ver
  `SYSTEM_STATUS.md`.
- Pendiente: brainstorming → writing-plans → execution de Phase 6