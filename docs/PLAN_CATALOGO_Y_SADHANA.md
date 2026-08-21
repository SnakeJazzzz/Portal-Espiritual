# Portal Espiritual — Plan: Catálogo Divinación \+ Sadhana

> **Propósito:** documento de decisiones y alcance para las dos próximas fases del proyecto. Producto del brainstorming en Claude.ai (agosto 2026). Este documento es input al workflow de Superpowers en Claude Code (`/superpowers:brainstorming` → `writing-plans` → execution). Las decisiones marcadas como CERRADAS no se reabren en brainstorming; las marcadas como VERIFICAR requieren chequeo empírico contra el codebase antes de planear.  
>   
> **Mapeo al roadmap:** Fase 1 es un ajuste de catálogo sin número de phase. Fase 2 (Sadhana) es la Phase 7 del roadmap original, absorbiendo el alcance de la Phase 8 (meditaciones) — cursos y meditaciones salen juntos como un solo producto de suscripción.

---

## Contexto

JP reestructura su oferta:

1. **Catálogo de servicios**: queda un solo servicio, "Divinación", con tres duraciones (15/30/60 min) y promoción de lanzamiento. Los otros tres servicios (Divinación de Cartas, Divinación Akáshica, Activación Cuántica) salen del catálogo público.  
2. **Sadhana**: nueva suscripción de $444 MXN/mes que da acceso a contenido grabado (meditaciones, cursos, ejercicios) en video y audio. Los suscriptores de Mentoría ($2222/mes) tienen acceso incluido. JP sube, edita y borra el contenido él mismo desde el admin — independencia operacional total en el día a día del contenido.

---

## Fase 1 — Catálogo Divinación (esta semana)

### Decisiones cerradas

**C1. Tres event types en Cal.com.** Cal.com soporta múltiples duraciones en un event type, pero la integración de pagos solo permite un precio fijo por event type (limitación confirmada, feature request abierto sin resolver). Por lo tanto: `divinacion-15`, `divinacion-30`, `divinacion-60`, cada uno con su precio efectivo. El selector de duración vive en nuestro frontend.

**C2. Config evoluciona a variants (opción B).** `Service` deja de ser plano. Sketch del tipo:

interface ServiceVariant {

  duration: string;          // "15 min"

  regularPrice: number;      // 888 — precio mostrado tachado

  launchPrice: number;       // 444 — precio efectivo cobrado

  calcomEventSlug: string;   // "divinacion-15"

}

interface Service {

  id: string;

  name: string;

  description: string;

  variants: ServiceVariant\[\];

}

// Flag global en siteConfig:

promoActive: boolean;        // true \= muestra tachado \+ launchPrice

                             // false \= muestra solo regularPrice

Breaking change al tipo con un solo consumidor; el compilador guía el refactor de componentes.

**C3. Precios.**

| Duración | Precio tachado | Precio efectivo (cobrado) |
| :---- | :---- | :---- |
| 15 min | $888 MXN | $444 MXN |
| 30 min | $1555 MXN | $777 MXN |
| 60 min | $2222 MXN | $1111 MXN |

Los event types de Cal.com se configuran con el **precio efectivo** (es lo que Stripe cobra). El tachado es solo display en nuestra card.

**C4. Display del descuento: tachado.** La card muestra el precio regular tachado y el precio de lanzamiento en grande, con "50% off por tiempo limitado". *Nota de registro: se evaluó el riesgo bajo LFPC de anunciar descuento sobre precios no cobrados previamente; el cliente y el developer tomaron la decisión informada de aceptarlo dado el alcance del sitio. Decisión cerrada, no reabrir.*

**C5. Fin de la promo (procedimiento documentado en el config).** El día que JP lo pida: (1) `promoActive: false`, (2) actualizar el precio de los 3 event types en Cal.com a los precios regulares, (3) deploy. Dos fuentes de precio (config \+ Cal.com) — el comentario en `services.ts` debe listar ambos pasos para que ninguno se olvide.

**C6. UI: una card, selector de duración en el flujo de reserva.** La card única de Divinación lista las tres duraciones con sus precios. "Reservar tu sesión" abre el selector de duración (evolución del `ServiceSelectionModal` actual, que hoy selecciona entre servicios) → `BookingModal` con el slug correspondiente. El flujo Hero → modal → Cal embed no cambia estructuralmente. Mobile-first como siempre: 375px es el viewport primario.

**C7. Copy.** Entra el copy nuevo de JP para Divinación y "Sobre mí" íntegros. En Mentoría entra el copy nuevo **con un ajuste confirmado por JP**: el bullet "1 llamada privada semanal" se publica como "2 sesiones privadas de 30 min al mes" (el producto no cambia; si JP quiere pasar a cadencia semanal en el futuro, es cambio de producto con impacto en el contador de sesiones del admin — conversación separada). El fragmento "Espacio de productos online …" del copy original se descarta (confirmado con el developer: no agrega nada).

### Secuencia de migración de Cal.com (orden estricto)

1. Revisar bookings futuros en los event types actuales. **Las sesiones ya agendadas se honran** — quedan en el calendario de JP y no se tocan.  
2. Crear los 3 event types nuevos con precio efectivo; probar el flujo de pago de cada uno (booking de prueba end-to-end).  
3. Deploy del frontend con el catálogo nuevo.  
4. **Ocultar** (no borrar) los event types viejos. Borrarlos puede romper reschedules y el historial de bookings existentes.

### Gate de Fase 1

- Las 3 duraciones se reservan y cobran correctamente (booking real de prueba por duración, o al menos una con verificación de config de las otras dos)  
- Card se ve correcta en 375px (in-app browser de Instagram)  
- Tachado \+ precio de lanzamiento renderizan según `promoActive`  
- Copy nuevo en producción sin restos del catálogo anterior  
- Event types viejos ocultos, bookings existentes intactos

---

## Fase 2 — Sadhana (Phase 7\)

### Decisiones cerradas

**S1. Producto y precio.** Suscripción "Sadhana", $444 MXN/mes, sin límite de spots. Nuevo producto \+ price en Stripe (misma cuenta del cliente). Página/portal en `/sadhana` (nombre final de ruta a confirmar en diseño).

**S2. Modelo de entitlements.** Cada producto declara sus entitlements:

- Mentoría → `['mentoria_sessions', 'content_library']`  
- Sadhana → `['content_library']`

El gating de contenido pregunta una sola cosa en un solo lugar: "¿tiene el usuario una suscripción activa con entitlement `content_library`?". Nunca se chequea por productId en el código de features. Implementación ligera: columna `entitlements text[]` en products (o mapa en config si los productos son semi-estáticos — decidir en brainstorming según cómo quedó el schema de Phase 6). Los 8 de Mentoría obtienen acceso sin ningún cambio en Stripe.

**S3. Hosting de media: Mux.** Decisión cerrada tras investigación (agosto 2026):

- Audio y video con la misma API — Mux soporta assets de solo audio nativamente (MP3, WAV, AAC, etc. → HLS \+ M4A descargable), mismo workflow que video. Cloudflare Stream fue descartado: no acepta uploads de audio (solo contenedores de video), lo que forzaría un segundo pipeline o fricción para JP.  
- Costo a esta escala: primeros 100,000 minutos entregados/mes gratis (delivery efectivo: $0 por años), storage \~$0.003 USD/min/mes en video y 1/10 de eso en audio, encoding basic gratis, cold storage automático (-40% a 30 días, \-60% a 90). Cuenta esperada: unos pocos USD/mes.  
- Componentes `<mux-player>` y `<mux-audio>` para reproducción.  
- MP4/M4A descargables disponibles como primitiva (habilita la futura feature de descarga al cancelar).

**La cuenta de Mux se abre a nombre de JP** (mismo patrón que Stripe y Cal.com: el costo lo absorbe el cliente, el developer tiene acceso). Usar los environments de Mux: uno de producción y uno de desarrollo/staging.

**Verificación previa (spike de 1 día en Claude Code, antes de writing-plans):** happy path completo — direct upload con UpChunk, webhook `video.asset.ready`, playback con token firmado. Si fluye, la estimación del slice de Mux se confirma en el rango bajo.

**S4. Audio desde el día 1\.** `media_type: 'video' | 'audio'` en el schema. El costo marginal es una columna y elegir componente de reproducción. Las meditaciones en audio son probablemente el contenido más natural de JP.

**S5. Modelo de contenido (metáfora de carpetas).**

sections        — DB, seeded: Meditaciones, Cursos. SIN UI de admin en v1.

                  Renombrar/agregar sección \= tarea del developer (las

                  secciones son estructura de navegación, no contenido;

                  estructura la controla el dev, contenido lo controla JP).

collections     — las "carpetas". JP las crea/renombra/ordena desde el

                  admin, incluyendo creación inline en el form de subida.

                  Pertenecen a una sección. Borrar solo si está vacía

                  (mover items primero) — protege contra cascadas

                  accidentales.

content\_items   — pertenecen a una colección (NOT NULL: todo archivo vive

                  en una carpeta). Campos: título, descripción, media\_type,

                  mux\_asset\_id, mux\_playback\_id, duration, status

                  ('uploading' | 'processing' | 'ready' | 'error'),

                  position (orden explícito — esencial en cursos),

                  published\_at, soft delete.

Vista pública: colecciones sin items publicados no se muestran (JP puede armar carpetas a medias sin exponerlas).

**S6. Flujo de admin (autonomía de JP).**

1. JP llena título/descripción/carpeta en el admin → server action crea el registro con status `uploading` y solicita a Mux una direct upload URL  
2. El browser sube el archivo **directo a Mux** (UpChunk, con progreso). Restricción no negociable: el media jamás pasa por funciones de Vercel (límite de body \~4.5MB, y sería absurdo aunque no existiera)  
3. Webhook de Mux (`video.asset.ready` / errored) → actualiza status, duración, playback id. Idempotente, misma disciplina que el webhook de Stripe, sin excepciones  
4. Editar descripción/título \= UPDATE en DB. Borrar \= confirmación explícita  
   + delete del asset en Mux (no pagar storage de muertos) \+ soft delete en DB para historial

**S7. Gating de reproducción.** Playback IDs firmados (signed playback policy), nunca públicos. La página de contenido es server component: verifica sesión \+ entitlement `content_library` y genera token firmado de TTL corto por reproducción. Sin token válido, el CDN de Mux rechaza.

**S8. Checkout.** Reusa el flujo de Phase 6 sin lógica de capacidad (Sadhana no tiene spots). **VERIFICAR empíricamente antes del plan:** que el chequeo de capacidad del checkout de Phase 6 esté condicionado a que el producto tenga capacidad definida y no acoplado al flujo. Si está acoplado, refactor previo como sub-task.

**S9. Ambientes e infraestructura (slice inicial de la fase).** Se adopta el patrón de OneTable para consistencia entre proyectos, con un branch extra:

| Neon branch | Uso | Consumidor |
| :---- | :---- | :---- |
| `development` | Desarrollo local (`.env.local`) | localhost |
| `test` | `DATABASE_URL_TEST` \+ `ALLOW_DESTRUCTIVE_TESTS` (la suite trunca aquí y solo aquí) | vitest |
| `staging` | Preview deployments | Vercel Preview |
| `production` | Producción | Vercel Production |

Vercel: subdominio fijo **`staging.portalespiritual.com.mx`** asignado al git branch `staging`. Razón: Mux no tiene forwarding local tipo Stripe CLI; una URL estable permite registrar webhooks de Stripe (test mode, segundo endpoint) y de Mux (environment de desarrollo) y probar flujos completos end-to-end antes de merge.

Matriz de env vars por ambiente de Vercel:

| Var | Production | Preview (staging) | Development (local) |
| :---- | :---- | :---- | :---- |
| `DATABASE_URL` | Neon `production` | Neon `staging` | Neon `development` |
| `DATABASE_URL_TEST` | — | — | Neon `test` |
| Stripe keys | **live** | test | test |
| Stripe webhook secret | endpoint prod (www) | endpoint staging | Stripe CLI listen |
| Mux tokens | env producción | env desarrollo | env desarrollo |
| Mux webhook secret | endpoint prod | endpoint staging | (vía staging / mocks) |

Webhooks:

- Producción Stripe: `https://www.portalespiritual.com.mx/api/webhooks/stripe` (canónico www — lección del incidente 307, no tocar)  
- Producción Mux: `https://www.portalespiritual.com.mx/api/webhooks/mux`  
- Staging: ambos apuntando a `staging.portalespiritual.com.mx`  
- Local: Stripe CLI forwarding; Mux se prueba contra staging o con payloads simulados en integration tests

Nota: los previews comparten el branch `staging` de Neon. Con un solo developer y PRs seriales no hay drift de migraciones; si algún día hay PRs paralelos con migraciones distintas, revisitar.

**S10. Customer Portal de Stripe.** El portal ya opera en producción (cancelación, cambio de tarjeta). **VERIFICAR con dos productos:** que el portal NO exponga cambio de plan entre Mentoría y Sadhana — un switch desde el portal desincronizaría entitlements sin pasar por nuestro flujo. Cancelar \+ resuscribir es el único camino de cambio de tier en esta fase. Revisión de config en el Dashboard (test y live) como item del checklist de launch.

### Diferido explícitamente (no está en Fase 2\)

- Upgrade/downgrade entre Mentoría y Sadhana (el modelo de entitlements no lo bloquea; se difiere el flujo)  
- Custom cancel flow con retención: ofrecer descarga del contenido al cancelar (nombre candidato a elección de JP: "Tu Cosecha", "Semillas para tu Camino", "Llévate tu Templo") y ofrecer upgrade a Mentoría cuando se libere spot. Mux ya provee la primitiva (MP4/M4A descargables)  
- UI de admin para gestionar secciones (renombrar/crear secciones \= dev)  
- Sistema de progreso de cursos ("cuánto llevo")  
- Búsqueda, filtros, analytics de contenido  
- Descuentos/promos en Sadhana o Mentoría (decisión explícita: la promo de lanzamiento aplica SOLO a Divinación)

### Slices y estimación

| Slice | Contenido | Días efectivos |
| :---- | :---- | :---- |
| S0 | Ambientes: branches Neon, `DATABASE_URL_TEST`, staging subdomain, matriz de env vars, webhooks de staging | 2–3 |
| S1 | Schema (sections, collections, content\_items, entitlements) \+ migraciones \+ integration tests | 2–3 |
| S2 | Stripe: producto Sadhana, checkout sin capacidad, webhook | 2–3 |
| S3 | Mux: spike \+ direct upload \+ webhook \+ admin completo (subir con progreso, estados, editar, borrar) | 4–5 |
| S4 | Portal Sadhana en `/cuenta`: librería, gating firmado, players video/audio, QA mobile | 3–4 |
| S5 | QA end-to-end, cobro real de prueba en live ($1 flow), checklist de launch (portal, webhooks prod, Safe Browsing OK) | 2–3 |

**Total: 15–21 días efectivos; 4–6 semanas calendario** tras cerrar Fase 1 (ritmo freelance \+ gates de revisión \+ ping-pong con JP). Mayor incertidumbre: fricción real de Mux (se despeja con el spike de S3, que puede adelantarse) y pulido del admin para autonomía real de JP.

### Gate final de Fase 2 (criterios literales de aceptación)

1. JP sube un video real él solo, sin el developer en la llamada  
2. El developer, como suscriptor de Sadhana, ve y reproduce ese contenido  
3. JP borra un item y deja de verse en el portal  
4. JP edita una descripción y el cambio se refleja  
5. Un usuario SIN suscripción no puede reproducir nada, ni con link directo (prueba del playback firmado)  
6. Un suscriptor de Mentoría ve el contenido sin haber pagado Sadhana (prueba del entitlement)

Criterio de launch (no de merge): existe contenido real subido por JP. No se lanza librería vacía.

---

## Pendientes externos (checklist del developer, fuera del código)

- [ ] Crear cuenta de Mux a nombre de JP; developer con acceso; environments prod \+ dev; método de pago de JP  
- [ ] Crear los 3 event types de Divinación en Cal.com con precios efectivos  
- [ ] Revisar bookings futuros de los event types que se retiran  
- [ ] Ocultar event types viejos post-deploy de Fase 1  
- [ ] Registrar `staging.portalespiritual.com.mx` en Vercel \+ DNS  
- [ ] Registrar webhooks de staging (Stripe test \+ Mux dev)  
- [ ] Revisar config del Customer Portal (test y live) con dos productos  
- [ ] Informar a JP del procedimiento de fin de promo (aviso con anticipación para coordinar config \+ Cal.com)

---

## Copy final aprobado (fuente: JP, con ajustes acordados)

### Divinación (card \+ detalle)

Precios: 15 min ~~$888~~ **$444** · 30 min ~~$1555~~ **$777** · 60 min ~~$2222~~ **$1111** — 50% off por tiempo limitado.

> Durante tu sesión abriremos un Espacio Sagrado donde hablaremos uno-a-uno, conectando con tu Espíritu y transmitiendo el mensaje de la Divinidad para ti en este momento. Un espacio donde conectaremos con tus Guías Espirituales, Ancestros, Angeles, Seres Divinos y tu Ser Superior, para que tu puedas preguntar y conectar con el mensaje que tiene tu Equipo Espiritual para ti.  
>   
> Si tu intención es entrar a tus Registros Akashicos, conectar con el mensaje Divino de tu Ser Superior, recibir consejo de tus Guías para tu camino, descubrir tus dones espirituales, recibir aclaración y información sobre tu misión y propósito aquí en la tierra, este es el espacio perfecto para ti.

### Mentoría (con bullet ajustado — confirmado por JP)

> Encarna tu Divinidad, una mentoria enfocada en ti, en tus metas y tu vision personal, si quieres ayuda para:  
> 

> - Crecer y manifestar tu visión en redes sociales  
> - Aprender a comunicarte con el mundo espiritual  
> - Expandir y explorar tus habilidades supra sensoriales  
> - Creación Consciente de tu realidad

>   
> Está Mentoria es para ti, llegaste hasta aquí por una razón\!  
>   
> Que incluye?  
> 

> - 2 sesiones privadas de 30 min al mes  
> - Acceso a Mensajes directos por Instagram  
> - Prácticas semanales  
> - Acompañamiento y guía en tu camino

### Sobre mí

> Hola mi nombre es Juan Pablo mucho gusto ❤️  
>   
> Yo me dedico a la exploración de la consciencia, el autoconocimiento y estoy al servicio del Universo 🙏🏻  
>   
> A través de mi despertar aprendí a comunicarme con el mundo espiritual, re conectándome con mi esencia Divina y recordando quién soy, abrazando la experiencia terrenal 🌎  
>   
> Lo más importante para mí es amarse a uno mismo y des de ese Amor Divino que cultivamos en nuestro interior compartirlo con el mundo y paso a pasito crearemos un mundo en unidad donde hay espacio para todos y todo 🌀  
>   
> Viviendo mi misión Divina en esta tierra ✨

*(Copy de Sadhana para la landing del producto: pendiente de JP. Bloquea el diseño de la página pública de S4, no bloquea S0–S3.)*

---

## Notas de handoff a Claude Code

- Este documento es input no-negociable al brainstorming de cada fase. Las decisiones CERRADAS no se reabren; si el brainstorming encuentra que una decisión cerrada contradice la realidad del codebase, se pausa y se escala al developer (mandatory pause on friction).  
- VERIFICAR empíricamente antes de writing-plans: (a) acoplamiento del chequeo de capacidad en el checkout de Phase 6 \[S8\], (b) config actual del Customer Portal en live \[S10\], (c) forma real del schema de products de Phase 6 para decidir dónde viven los entitlements \[S2\].  
- Fase 1 puede ejecutarse sin brainstorming completo (feature pequeña, el diseño está cerrado aquí); Fase 2 sigue el workflow completo.  
- Principios arquitectónicos de `ARCHITECTURE_AND_ROADMAP.md` aplican sin cambios. Nota sobre el principio 1 (configuration over code): en Sadhana, "configuración editable por el cliente" se cumple vía admin panel \+ DB (contenido), no vía archivo de config; el config file sigue siendo la fuente para el catálogo de servicios de Cal.com.  
- Al cerrar cada fase: actualizar `ARCHITECTURE_AND_ROADMAP.md` (Phase 7 ejecutada con este alcance, Phase 8 absorbida) y `CHANGELOG.md`.

