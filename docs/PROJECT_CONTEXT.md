# Portal Espiritual — Project Context

> **Propósito de este documento:** contexto persistente para arrancar
> cualquier conversación nueva sobre el proyecto Portal Espiritual sin
> tener que re-explicar el stack, las convenciones o el estado actual.
> Pegar en el "project knowledge" del proyecto en Claude.ai, o referenciar
> al inicio de chats nuevos.

---

## Qué es el proyecto

Landing page mística de servicios espirituales del cliente Juan Pablo
(guía espiritual). Producción en Vercel, auto-deploy desde `main`.

Servicios live en producción:

- **Phases 1-5** (one-shot, Cal.com booking):
  - Divinación de Cartas (30 min, $555 MXN)
  - Divinación Akáshica (45 min, $666 MXN)
  - Divinación Clásica (60 min, $888 MXN)
  - Activación Cuántica (60 min, $1111 MXN)
- **Phase 6** (LIVE desde 2026-05-27, tag `phase-6-launched`):
  - Mentoría 1-a-1: suscripción mensual $2,222 MXN, 8 spots máximo
  - Stripe Subscriptions (LIVE keys, no Cal.com)
  - Magic-link auth para subscribers (Resend, 15min login TTL / 7d welcome TTL)
  - Customer Portal Stripe (cancel end-of-period, no immediate-cancel)
  - Admin panel mínimo en `/admin` (lista, edición sesiones-restantes,
    cancel, resend welcome)

---

## Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Lenguaje**: TypeScript 5 strict (no `any` sin justificación)
- **Styling**: Tailwind CSS v4 (theme en `src/app/globals.css` con `@theme`)
- **Fuentes**: Josefin Sans (headings) + Cormorant Garamond (body)
- **Booking actual**: Cal.com (`@calcom/embed-react`)
- **Hosting**: Vercel, auto-deploy desde `main`
- **Repo**: https://github.com/SnakeJazzzz/Portal-Espiritual

Stack agregado en Phase 6 (live):
- **DB**: Neon Postgres (vía Vercel Marketplace) + Drizzle
- **Pagos recurrentes**: Stripe Subscriptions (cuenta del cliente, misma que Cal.com)
- **Email transaccional**: Resend (cuenta del developer, dominio del cliente)
- **Validación**: Zod

---

## Audiencia y constraints reales

- Tráfico principal: in-app browser de Instagram en mobile (375px primario)
- Idioma: español en todo el contenido user-facing
- Sitio estático actualmente; lo que requiera estado/runtime vive en `src/app/api/`
- Cliente único, no técnico. Edita contenido vía `src/config/services.ts`.

---

## Arquitectura clave

- **`src/config/services.ts` es single source of truth** para todo lo
  editable por el cliente (servicios, precios, descripciones, slugs Cal.com,
  hero/about copy). **No hardcodear contenido en componentes.**
- Los 4 servicios actuales usan Cal.com.
- La Mentoría 1-a-1 (Phase 6) usa Stripe Subscriptions directo, **no Cal.com**.
- `StarField`, `ConstellationTitle` y `CelestialBorder` son la firma visual.
  Cambios visuales en estos requieren visual review humano.

### Estructura de carpetas relevante

```
src/
├── app/
│   ├── layout.tsx              # Root layout + fonts
│   ├── page.tsx                # Home (StarField + Hero + AboutMe + Footer)
│   ├── globals.css             # Tailwind theme + animations
│   ├── mentoria/               # Phase 6 (nuevo)
│   ├── privacidad/             # Phase 6 (nuevo)
│   └── api/                    # Phase 6+ (nuevo)
├── components/
│   ├── StarField.tsx           # Fondo animado (firma visual)
│   ├── Hero.tsx                # Orquesta animación + modales
│   ├── ConstellationTitle.tsx
│   ├── CelestialBorder.tsx
│   ├── ServiceCard.tsx
│   ├── ServiceSelectionModal.tsx
│   ├── BookingModal.tsx        # Wrapper de Cal.com
│   ├── AboutMe.tsx
│   └── Footer.tsx
├── config/
│   └── services.ts             # SINGLE SOURCE OF TRUTH
└── lib/                        # Phase 6+ (nuevo: db, stripe, email helpers)
```

---

## Convenciones

- Feature branches siempre. Nunca commits directos a `main`.
- TypeScript strict. No `any` sin comentario justificando.
- **Configuration over code**: si el cliente puede querer editarlo, va en config.
- Mobile-first en clases Tailwind (base = mobile, `lg:` = desktop).
- Antes de añadir librería: justificar tamaño bundle vs valor.
- Todo el contenido user-facing en español.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- Pull Requests para cambios significativos; merges con `--no-ff`.

---

## Caveats importantes

- Cal.com username del cliente: `portal-espiritual`
- Stripe del cliente: existe, misma cuenta para Cal.com y Phase 6.
  El developer tiene acceso al dashboard para configuración.
- Resend: cuenta del developer, dominio del cliente (verificación DNS).
- Stripe usa MXN. Considerar fees FX (~3.6% + $3 MXN por transacción).
- **LFPDPPP** (ley mexicana de protección de datos): cualquier
  formulario que recolecte datos personales necesita aviso de
  privacidad accesible. Phase 6 requiere `/privacidad`.

---

## Out of scope

- Auth de usuarios finales con password (Phase 6+ usa magic link via email)
- Backend separado (FastAPI, etc.) — todo en Next.js API routes
- Librerías pesadas de animación (particles.js, three.js, framer-motion agresivo)
- Dashboard admin **completo** (con edición de campos personales del
  suscriptor, notas internas, búsqueda, filtros, exportación) — eso es
  Phase 6.5. Phase 6 sí incluye un admin **mínimo** (lista, edición de
  sesiones, cancelación).
- Cursos y meditaciones (Phase 7+)

---

## Estado actual del repo (post-Phase-6 launch)

- Branch `main`: Phase 6 launched 2026-05-27, tag `phase-6-launched`.
  Mentoría 1-a-1 LIVE en producción.
- Última merge significativa: `Merge hotfix: admin UX + security fixes
  from LIVE smoke` (PR #1, 5 commits).
- Próxima feature: **Phase 6.5** — post-launch polish + tech debt.
  Backlog priorizado en `PHASE_6_5_BACKLOG.md`.
- Snapshot operacional completo: `SYSTEM_STATUS.md`.

---

## Cómo arrancar una conversación nueva sobre este proyecto

Si abres un chat nuevo en Claude.ai sobre Portal Espiritual:

1. Asegúrate de que este documento esté en el "project knowledge".
2. Menciona en qué Phase estás trabajando.
3. Si vas a tocar el repo, hazlo desde Claude Code (no desde Claude.ai),
   porque ahí tienes los hooks y MCPs.
4. Claude.ai sirve mejor para: arquitectura, planning, revisar decisiones,
   redactar docs. Claude Code sirve mejor para: ejecución, código, tests.
