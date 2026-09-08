# Plan de lanzamiento del Atlas de la psicoterapia

Documento de trabajo. Fecha de partida: **8 de septiembre de 2026**.
Objetivo: pasar de "producto construido y sin público" a "producto con demanda
medida y primeros suscriptores de pago".

Este plan no propone construir cosas nuevas. Propone **desbloquear lo que ya
existe** y **medir**. La app está mucho más terminada de lo que su tracción
sugiere; el cuello de botella es de distribución y de medición, no de producto.

---

## Registro de avance

Bitácora de lo que ya está hecho, para poder retomar el trabajo sin releer todo
el plan. Entrada nueva por sesión, la más reciente arriba.

### 8 de septiembre de 2026 (tarde-II) — Fase 1: por qué no indexaba, de verdad

Josep decidió: **fichas abiertas, herramientas de pago**, y **49 €/año
bloqueado de por vida** para los 100 primeros como precio de fundador. Al ir a
implementar la primera parte apareció que ya estaba hecha, y que el diagnóstico
del plan era erróneo.

**La biblioteca ya estaba abierta.** `bootstrap.js:268`:

```js
// Modo temporal de biblioteca abierta. Mantiene preparado el flujo de
// autenticacion y Stripe para poder reactivarlo cambiando este valor a false.
const PUBLIC_LIBRARY_ACCESS = true;
```

Con ese interruptor, `HAS_SUBSCRIPTION_ACCESS` es siempre `true`, el muro se
oculta por CSS (`html.public-library-access .accessGate { display:none }`) y
cualquiera ve la ficha completa. Así que el muro **nunca** fue la causa de la
falta de indexación, y la decisión «fichas abiertas» ya está cumplida: no hay
nada que hacer.

**La causa real, en dos partes:**

1. **`robots.txt` bloqueaba `/api/data`**, que es el proxy del que cuelga todo
   el contenido del Atlas. Googlebot no descarga subrecursos prohibidos al
   renderizar, así que ejecutaba el JS, las peticiones de datos no salían y lo
   que evaluaba era una cáscara vacía. Cuadra con el 13 de 410: trece es
   aproximadamente el número de páginas que no dependen de `/api/data`.
2. **El contenido solo vivía en `<noscript>`**, que ningún buscador lee.

**Arreglos:**

- [x] `robots.txt`: `Allow: /api/data` antes del `Disallow: /api/`. El resto de
      la API (pagos, sesión, eventos) sigue fuera del rastreo.
- [x] `build-model-pages.mjs`: `renderNoScriptFallback` pasa a
      `renderSeoArticle` y el artículo se escribe **dentro de `#modelInfo`**,
      el panel donde el Atlas pinta luego la ficha viva. Al montarse, la app
      reemplaza ese `innerHTML` y el artículo desaparece solo: mismo contenido,
      mismo sitio, sin cloaking. Si la app no carga, el contenido se queda.
- [x] El build falla explícitamente si la plantilla no trae `#modelInfo`, para
      que un cambio futuro en el HTML no vuelva a dejar las páginas vacías en
      silencio.
- [x] Estilos `.seo-article` en `library.css` para que el artículo se lea bien
      durante el instante en que está visible.
- [x] Test actualizado: comprueba que el artículo está dentro de `#modelInfo` y
      que **no** queda ningún `<noscript>` en la página.
- [x] Build de verificación con los datos locales: 259 fichas ES + 186 EN.
      Comprobado sobre ACT: **1.105 palabras en el HTML inicial**, cero
      `<noscript>`.
- [x] Suite completa: 28/28.

**Consecuencia para el resto del plan:** la Fase 1.2 («decidir qué es gratis»)
queda resuelta sin trabajo. Poner las cuatro vistas de pago es trabajo de la
Fase 3, cuando se abra la suscripción; hacerlo ahora restaría uso justo cuando
se quiere medir interés.

**Nota sobre el botón de suscribirse:** en modo abierto,
`window.startSubscriptionCheckout` se sustituye por una función vacía y el muro
está oculto, así que desde `/modelos/` **no hay forma de llegar a Stripe**. El
arreglo de esta mañana desbloqueó el endpoint, pero para probar el pago de
punta a punta hará falta una entrada visible. Pendiente de decidir dónde.

### 8 de septiembre de 2026 (mediodía) — captura arriba, precio de fundador, perfil arreglado

La captura de email ya funciona en producción: tres altas en `lista_espera`.
Pero las tres tenían `perfil` en NULL pese a haberse respondido la pregunta.

**Bug del perfil.** El perfil se pregunta después de guardar el email, así que
llega en una segunda llamada cuando la fila ya existe. Esa llamada repetía el
POST con `resolution=ignore-duplicates`, de modo que Postgres la descartaba por
duplicada y la respuesta se perdía. Arreglado: cuando llega un perfil, el
endpoint hace además un `PATCH` sobre `email_normalized`. Es idempotente y
sirve igual si el perfil viniera en la primera llamada.

**Decisión de Josep: la captura sube arriba.** El formulario pasa del pie de
la home a una banda entre la portada y las cuatro vistas. Revierte lo que
decidí esta mañana; la razón que da Josep es no perder a quien no hace scroll,
y manda él.

- [x] Banda compacta en dos columnas, no un bloque a página completa: se ve
      antes de hacer scroll sin expulsar los portales de la pantalla.
- [x] `.intro` pierde 15px de padding para compensar el alto que añade.
- [x] En móvil se apila en una columna.

**Nuevo mensaje, con promesa de descuento.** Titular: *«Apúntate ahora y
tendrás precio de fundador cuando abra la suscripción.»* El muro dice lo mismo.

**Esto es un compromiso, no un reclamo.** Quien esté en la lista antes de que
abras la suscripción tiene que recibir un precio mejor que la tarifa. Encaja
con la beta fundadora de la Fase 3 (49 €/año bloqueado, 100 plazas), así que
la promesa es sostenible — pero hay que cumplirla, y conviene decidir ya el
número exacto antes de que la lista crezca. Si más adelante se cambia de idea,
lo que se rompe es la confianza de justo las personas más interesadas.

### 8 de septiembre de 2026 (tarde) — arreglo del 500 en la captura de email

Josep probó el formulario en producción y la consola devolvió
`POST /api/subscribe-list 500`. El email nunca llegaba a guardarse.

**Causa:** `supabaseRest()` terminaba con `return response.json()`. PostgREST,
cuando se le pide `Prefer: return=minimal`, responde **201 con el cuerpo
vacío** — no 204, que era el único caso contemplado. Llamar a `.json()` sobre
un cuerpo vacío lanza `SyntaxError: Unexpected end of JSON input`, el `catch`
del endpoint lo convertía en 500 y la inserción parecía fallar **aunque
probablemente hubiera funcionado**.

Solo se notó ahora porque el único consumidor anterior de `supabaseRest`,
`upsertSubscription`, usa `return=representation`, que sí devuelve cuerpo.
Afectaba a los tres sitios nuevos: `subscribe-list`, `track` y el
`recordTrialUsage` restaurado esta misma mañana.

- [x] `supabaseRest` lee la respuesta como texto y solo parsea si hay algo.
      Un 200 con cuerpo no-JSON ahora falla con un mensaje legible en vez de
      con un error de parseo.
- [x] `scripts/billing-rest.test.mjs` — 6 tests de regresión sobre
      `supabaseRest`: 201 vacío, 204, cuerpo JSON, error de Supabase
      propagado, respuesta no-JSON y cabeceras de servicio. `npm run
      test:billing`.
- [x] Suite completa: 28/28.

**Lección para el resto del plan:** los endpoints nuevos se han escrito contra
una suposición sobre PostgREST sin comprobarla. Antes de dar por buena la
Fase 1, probar cada endpoint contra Supabase de verdad, no solo que el módulo
cargue.

### 8 de septiembre de 2026 — Fase 0 implementada + arreglo crítico de pagos

#### Arreglo crítico: los pagos llevaban rotos desde el 2 de julio

Al abrir `api/_billing.js` para la Fase 0 apareció esto:

```
$ node -e "import('./api/create-checkout-session.js')"
SyntaxError: The requested module './_billing.js' does not provide
an export named 'normalizeEmail'
```

El commit `b401c98` (2026-07-02, «Update _billing.js») introdujo la prueba
gratuita por cuenta (`hasFreeAccountTrial`) y **borró** `normalizeEmail`,
`hasUsedTrial` y `recordTrialUsage`, pero no actualizó a quienes las
importaban. En ESM, un import con nombre inexistente es un error de enlace: el
módulo entero no carga.

Consecuencia: `create-checkout-session` y `stripe-webhook` devolvían **HTTP 500
en cada llamada** desde entonces. Durante 223 commits nadie ha podido
suscribirse, y aunque hubiera podido, el webhook tampoco habría registrado la
suscripción.

Esto invalida el punto de partida que daba el plan («la máquina de cobrar ya
está montada»): estaba montada y desconectada.

- [x] Restauradas las tres funciones al final de `api/_billing.js`, con un
      comentario que explica de dónde vienen.
- [x] Verificados los seis endpoints de `api/`: los seis cargan.
- [x] `supabase/trial_history.sql` — la tabla que usa `recordTrialUsage` no
      estaba versionada. **Hay que ejecutarla en Supabase** (ver pendientes).

#### Fase 0.1 — Analítica con eventos

- [x] `public/assets/track.js` — punto de entrada único. Define la cola
      `window.va` y expone `window.track(nombre, datos)`. Todo en try/catch: la
      analítica no puede romper la app. Incluye `track.ficha(id)`, que cuenta
      **fichas distintas por sesión** en `sessionStorage` y manda ese contador
      con cada evento; es el dato que dirá en qué momento choca la gente con el
      muro. Preparado para enviar en paralelo a PostHog si algún día se añade,
      sin reinstrumentar nada.
- [x] Cargado en las páginas que no tenían nada: `public/index.html`,
      `escuelas/`, `metamodelos/`, `procesos/`, más `/modelos/index.html`.
      Las fichas generadas lo heredan de la plantilla en el siguiente build.
- [x] Eventos instrumentados:

| Evento | Archivo | Línea aprox. |
| --- | --- | --- |
| `home_vista` | `assets/atlas-home/home.js` | final |
| `vista_elegida` (portal) | `atlas/portal.js` | 766, en `request()` |
| `vista_elegida` (home) | `assets/atlas-home/home.js` | final |
| `ficha_abierta` | `modelos/legacy/library.js` | 15100, en `openModel()` |
| `muro_visto` | `modelos/legacy/library.js` | 208, en `openAccessGate()` |
| `click_registro` | `modelos/legacy/library.js` | 419, en `signUp()` |
| `registro_ok` | `modelos/legacy/library.js` | 432 |
| `click_suscribir` | `modelos/legacy/library.js` | 275, en `requestCheckout()` |
| `checkout_iniciado` | `modelos/legacy/library.js` | 313, antes del redirect |
| `email_capturado` | `assets/lista-espera.js` | al guardar |
| `perfil_declarado` | `assets/lista-espera.js` | al elegir perfil |

`ficha_parcial_vista` sigue pendiente: requiere tocar el renderizado de la
ficha, y encaja mejor con la Fase 1.1.

#### Fase 0.2 — Captura de email

- [x] `supabase/lista_espera.sql` — tabla con `email_normalized` único,
      `origen`, `perfil`, `modelo_contexto`, `locale`. RLS activado **sin
      policies**: solo el service role escribe, así que la lista no puede
      volcarse desde el navegador. **Hay que ejecutarla en Supabase.**
- [x] `api/subscribe-list.js` — endpoint público. Valida con el `normalizeEmail`
      restaurado (bloquea dominios desechables), inserta con
      `resolution=ignore-duplicates` y **no distingue entre "ya estabas" y
      "ha fallado"**: siendo público, no debe servir para averiguar si un email
      está en la lista.
- [x] `supabaseRest` pasa a exportarse desde `api/_billing.js` para no duplicar
      el acceso a Supabase en el endpoint nuevo.
- [x] `public/assets/lista-espera.js` + `lista-espera.css` — componente
      compartido, mejora progresiva sobre un `<form>` normal. Se engancha a
      cualquier `<form data-lista-espera="<origen>">`. El CSS toma el color del
      contexto mediante variables con fallback, así que funciona igual en la
      home nocturna y dentro del Atlas.
- [x] **Emplazamiento 1 — home**: sección `#avisame` tras el manifiesto.
- [x] **Emplazamiento 2 — muro de acceso**: bajo el bloque de precio, separado
      por una línea, como tercera vía junto a Entrar / Suscribirse.
- [x] La pregunta de perfil (clínico / docente / estudiante / otro) se hace
      **después** de guardar el email, no antes: pedirla antes baja la
      conversión y el email es lo único que de verdad importa.

**Decisión que se aparta del plan:** el plan pedía el formulario de la home
«sobre el pliegue». Está **debajo**, tras el manifiesto. Ponerlo arriba rompe
la portada cinematográfica, que es el mayor diferenciador del producto. Quien
llega hasta ahí ya ha visto las cuatro vistas y es cuando el correo tiene
sentido. Si a las dos semanas la captura va floja, subirlo es mover una sección.

**Pendiente de la Fase 0.2:** el tercer emplazamiento, el pie de cada ficha.
Requiere entrar en el renderizado del panel de ficha (`library.js`, ~15.000
líneas). Se hará junto con la Fase 1.1, que ya toca esa zona.

#### Fase 0.1 bis — La analítica vive en Supabase, no en Vercel

Decisión del 8/9: **no se paga Vercel Pro.** En el plan Hobby las visitas se
registran, pero `va('event', …)` se descarta en silencio, así que el embudo
—que es justo lo que hay que medir— se habría perdido entero.

En vez de meter un proveedor nuevo, los eventos van a la base de datos que ya
existe. Sale gratis, los datos son tuyos y se consultan con SQL.

- [x] `supabase/eventos.sql` — tabla `eventos` con `nombre`, `sesion_id`,
      `ruta`, `referrer`, `datos` (jsonb) y `creado_en`. RLS sin policies.
- [x] `api/track.js` — recibe lotes. Los nombres de evento son un **vocabulario
      cerrado** validado en el servidor: siendo el endpoint público, un
      allowlist evita que la tabla se llene de basura. Responde 204 pase lo que
      pase, para no generar errores en la consola de nadie.
- [x] `public/assets/track.js` reescrito: acumula eventos y los envía por lotes
      cada 3 segundos, y **vacía la cola con `sendBeacon` al ocultarse la
      página**. Sin eso, las visitas cortas —que son la mayoría— no dejarían
      rastro. Se mantiene la llamada a `window.va` para conservar las visitas
      del plan gratuito.
- [x] `supabase/consultas-embudo.sql` — 10 consultas listas: el embudo
      completo, el mismo en porcentaje, **en qué número de ficha choca la gente
      con el muro**, modelos y escuelas más abiertos, vistas más usadas,
      actividad por día, procedencia, estado de la lista de espera y
      mantenimiento de la tabla.

**Privacidad:** no se guarda email, ni IP, ni cookies. `sesion_id` es un
identificador aleatorio que vive en `sessionStorage` y muere al cerrar la
pestaña; solo sirve para encadenar los pasos de una misma visita. Al no haber
cookies ni datos personales, esto no obliga a poner banner de consentimiento.

**Contrapartida asumida:** no hay panel de control. Los números se miran
ejecutando las consultas. Si algún día molesta, se conecta Metabase o Grafana
a la misma base sin tocar nada del código.

#### Verificación

- [x] `npm run test:atlas`, `test:i18n`, `test:build-fetch`: 22/22 pasan.
- [x] `node --check` sobre los archivos tocados.
- [x] Anidamiento del HTML de la home revisado a mano.
- [ ] Sin probar en navegador todavía.

#### Estado de despliegue

- [x] Los dos SQL de la primera tanda, ejecutados en Supabase (confirmado por
      Josep el 8/9).
- [x] Desplegado a producción: commits `351d35b` (arreglo) y `219a745`
      (Fase 0), push a `origin/main`.
- [x] **Arreglo del pago verificado en producción**: `GET
      /api/create-checkout-session` devuelve 405 Method Not Allowed, que es la
      respuesta correcta del handler. Antes reventaba con un 500 al cargar el
      módulo. `GET /api/subscribe-list` también responde 405.
- [x] El formulario de la home se ve en producción.
- [x] `supabase/eventos.sql` ejecutado en Supabase (confirmado por Josep 8/9).
- [ ] Prueba manual pendiente: dejar un email, y hacer el recorrido crear
      cuenta → Suscribirse → llegar a Stripe.

#### Siguiente paso

Fase 1.1: sacar el contenido de las fichas del `<noscript>` al DOM real
(`scripts/build-model-pages.mjs:671` y `:775`), y aprovechar ese trabajo para
colocar el formulario al pie de la ficha y el evento `ficha_parcial_vista`.
Antes de tocarlo, decidir la Fase 1.2: qué queda gratis y qué de pago.

---

## 0. Estado verificado a 8 de septiembre de 2026

Todo lo que sigue está comprobado en el código, no supuesto.

### Lo que ya funciona

| Pieza | Estado | Evidencia |
| --- | --- | --- |
| Corpus de contenido | 253 fichas ES generadas, ~1.000 palabras propias cada una | `public/modelos/*/index.html` |
| Traducción inglesa | Overlays EN en marcha, rutas `/en/models/<id>` construidas en el build | `scripts/build-model-pages.mjs`, `LOCALES` |
| SEO técnico on-page | canonical, hreflang, JSON-LD (`Article` + `BreadcrumbList` + `WebPage`), OG, Twitter Card | `build-model-pages.mjs:699-820` |
| Sitemap y robots | `sitemap.xml` (240 URLs locales) y `robots.txt` correctos | `public/sitemap.xml`, `public/robots.txt` |
| Autenticación | Supabase Auth (email + contraseña, recuperación, reset) | `public/modelos/legacy/library.js:1-600` |
| Suscripción | Stripe Checkout, 9,90 €/mes, 10 días de prueba, cancelación si no hay método de pago. **Estaba rota desde el 2/7/2026; arreglada el 8/9** — ver Registro de avance | `api/create-checkout-session.js:37-76` |
| Portal de cliente | Stripe Billing Portal operativo | `api/create-portal-session.js` |
| Webhook | Sincroniza estado de suscripción a Supabase. **Rota por el mismo motivo; arreglada el 8/9** | `api/stripe-webhook.js`, `supabase/user_subscriptions.sql` |
| Cuatro vistas | Lista, Red de afinidades, Mapamundi, Genealogía, unificadas en `/modelos/` | `ATLAS.md` |

**Conclusión: la máquina de cobrar ya está montada.** No hay que construirla
"después de validar". Hay que decidir cuándo se enciende y qué queda detrás.

**Corrección del 8/9:** estaba montada y *desconectada*. Los dos endpoints de
pago llevaban devolviendo HTTP 500 desde el 2 de julio por un import roto.
Arreglado y verificado; falta probarlo desplegado. Ver Registro de avance.

### Lo que está roto o ausente

| Problema | Gravedad | Detalle |
| --- | --- | --- |
| No hay captura de email en ningún sitio | **Crítica** | Búsqueda en todo `public/`: cero formularios de newsletter, lista de espera o aviso de lanzamiento |
| Analítica sin eventos y ausente en la home | **Crítica** | `public/modelos/legacy/analytics.js` solo define el stub `window.va`; `/_vercel/insights/script.js` se carga en `/modelos/` y en las fichas, **no** en `public/index.html`. Cero eventos personalizados |
| Contenido indexable solo dentro de `<noscript>` | **Crítica** | `build-model-pages.mjs:671-690` generaba la ficha dentro de `<noscript>`. **Arreglado el 8/9**: ahora se escribe dentro de `#modelInfo` |
| `robots.txt` bloqueaba `/api/data` | **Crítica** | Todo el contenido del Atlas cuelga de ese proxy; Googlebot no puede pedir subrecursos prohibidos, así que renderizaba páginas vacías. **Arreglado el 8/9** |
| Indexación parada | **Alta** | Search Console 4/9/26: 410 descubiertas, **13 indexadas**, 378 sin indexar por 2 motivos |
| 13 fichas con `noindex` automático | Media | `build-model-pages.mjs:699` marca `noindex,follow` toda ficha cuya `descripcion` tenga menos de 160 caracteres |
| `/escuelas/` fuera del sitemap | Media | `public/escuelas/index.html` existe (7 KB, 5 enlaces) pero no aparece en `sitemap.xml` |
| Home sin propuesta de valor ni destinatario | **Alta** | `public/index.html` (9 KB): titular poético, sin decir para quién es, qué contiene ni qué cuesta |
| Subdominio sin autoridad heredada | Media | `apps.tumentorpsicologia.com` es un subdominio: Google lo trata como sitio distinto del dominio principal |

---

## 1. Diagnóstico: por qué no llega a la gente

### 1.1 El problema de indexación, explicado

**Corregido el 8/9/2026.** La primera versión de este documento culpaba al muro
de suscripción. Era falso: `bootstrap.js:268` tiene `PUBLIC_LIBRARY_ACCESS =
true`, la biblioteca lleva abierta desde hace tiempo y el muro está oculto por
CSS. Google nunca ha visto una pantalla de acceso. La causa real son dos cosas
que se suman:

**1. `robots.txt` bloqueaba la fuente de todo el contenido.**

Cada dato del Atlas —escuelas, modelos, fichas, influencias, coordenadas— se
pide en el navegador a través de un único proxy:

```js
// public/modelos/legacy/bootstrap.js:300
function proxyDataUrl(path){
  return `${API_BASE}/api/data?path=${encodeURIComponent(clean)}`;
}
```

Y `robots.txt` decía:

```
Disallow: /api/
```

Googlebot **no descarga los subrecursos prohibidos** cuando renderiza. Al
rastrear una ficha ejecutaba el JavaScript, éste pedía los datos a `/api/data`,
y esas peticiones no salían. El resultado renderizado era una cáscara vacía.

Encaja con lo que muestra Search Console: 13 indexadas de 410. Trece es
aproximadamente el número de páginas del sitio que **no** dependen de
`/api/data` — la home, `/escuelas/`, `/metamodelos/`, `/procesos/`, `/quiz/` y
poco más. Todo lo que necesitaba datos quedó fuera.

**2. El contenido solo existía dentro de `<noscript>`.**

`build-model-pages.mjs` escribía la ficha completa —unas 1.000 palabras
propias— dentro de un bloque `<noscript>`. Como todos los buscadores ejecutan
JavaScript, ese bloque no lo lee nadie. Era contenido invisible por
construcción.

Las dos causas son independientes y ambas están arregladas (ver Registro de
avance del 8/9). El contenido bueno existía desde el principio; lo que fallaba
era el camino hasta él.

### 1.2 El problema de medición

Sin eventos no se puede responder a ninguna de estas preguntas, que son
justamente las que definen si hay interés:

- ¿Cuánta gente abre una ficha completa?
- ¿Cuántas fichas ve una persona en su primera visita?
- ¿Cuántos chocan con el muro de acceso?
- ¿Cuántos pulsan «Suscribirse» y abandonan en Stripe?
- ¿Cuántos vuelven a la semana siguiente?

"Evaluar si hay interés" sin estos datos es una intuición, no una evaluación.

### 1.3 El problema de captura

Todo el tráfico que traiga el SEO —y el que traigan las redes, y el boca a
boca— se evapora. No hay ninguna forma de que alguien diga "avísame". Es el
fallo más caro de los tres porque **cada visita perdida hoy es irrecuperable**.

### 1.4 El problema de posicionamiento

`public/index.html` dice:

> Atlas de la *psicoterapia.* Cuatro miradas. Un mismo territorio.
> Cartografías de la experiencia humana

Es bonito y no dice nada operativo. Un psicólogo clínico que aterriza ahí desde
Google no sabe en 10 segundos: qué hay dentro, cuántos modelos, si es para él,
si es gratis, ni qué hacer a continuación.

---

## 2. Métricas: qué vamos a mirar y qué contará como éxito

**Escribir esto antes de mirar los datos es lo que separa validar de
autoengañarse.** Congelar estos números ahora.

### Métricas de embudo

| Nivel | Evento | Objetivo a 8 semanas (3 de noviembre de 2026) |
| --- | --- | --- |
| Alcance | Visitantes únicos / mes | 2.000 |
| Interés | % que abre al menos una ficha | > 40 % |
| Interés profundo | % que abre 3+ fichas en la sesión | > 15 % |
| Captura | Emails recogidos | **300** |
| Retención | % de registrados que vuelven en 7 días | > 25 % |
| Intención de pago | Personas que inician checkout | 60 |
| Pago real | Suscripciones activas tras la prueba | **25** |

### Criterio de decisión

- **25+ suscripciones de pago a 8 semanas** → hay negocio; invertir en
  contenido y en adquisición.
- **10-24** → hay señal, falla el empaquetado o el precio; iterar sobre qué es
  gratis y qué es de pago antes de gastar en adquisición.
- **< 10 con 300 emails capturados** → el problema no es el interés, es la
  propuesta; hacer 15 entrevistas antes de tocar nada más.
- **< 100 emails capturados** → el problema es de distribución; el producto ni
  siquiera se está poniendo delante de la gente.

---

## FASE 0 — Instrumentar (semana del 8 al 14 de septiembre)

Sin esto, todo lo demás es a ciegas. Es un día y medio de trabajo.

### 0.1 Analítica en todas las páginas, con eventos

**Qué hay ahora:** `public/modelos/legacy/analytics.js` contiene solo el stub de
la cola de Vercel Analytics:

```js
window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};
```

Se carga en `/modelos/index.html:53` y en las fichas generadas, pero **nunca se
llama**. Y la home no lo carga en absoluto.

**Tareas:**

- [ ] Añadir el stub + `<script defer src="/_vercel/insights/script.js">` a
      `public/index.html`, `public/metamodelos/index.html`,
      `public/escuelas/index.html` y `public/procesos/index.html`.
- [ ] Crear `public/assets/track.js` con un helper único:

```js
// public/assets/track.js
window.track = function (name, data) {
  try {
    if (typeof window.va === 'function') window.va('event', { name, data });
  } catch (_) { /* la analítica nunca debe romper la app */ }
};
```

- [ ] Instrumentar estos eventos, con estos nombres exactos:

| Evento | Dónde dispararlo | Datos |
| --- | --- | --- |
| `home_vista` | `public/index.html` al cargar | `{ referrer }` |
| `vista_elegida` | portal del Atlas, al elegir perspectiva | `{ vista: 'list'\|'network'\|'map'\|'genealogy' }` |
| `ficha_abierta` | `openModel()` en `atlas.js` | `{ modelo, escuela, origen }` |
| `ficha_parcial_vista` | cuando se renderiza una ficha con `__partial` | `{ modelo }` |
| `muro_visto` | cuando `body` recibe `access-locked` | `{ modelo, fichas_vistas }` |
| `click_registro` | botón Crear cuenta | `{ origen }` |
| `registro_ok` | tras signup correcto en Supabase | `{}` |
| `click_suscribir` | `subscribeBtn` (`library.js:581`) | `{ origen, fichas_vistas }` |
| `checkout_iniciado` | respuesta OK de `create-checkout-session` | `{}` |
| `email_capturado` | formulario de lista (ver 0.2) | `{ origen }` |

- [ ] Contar fichas vistas en `sessionStorage` para poder mandar
      `fichas_vistas` con `muro_visto` y `click_suscribir`. Es el dato que
      dirá **en qué momento exacto la gente choca con el muro**.

**Si quieres embudos de verdad**, en vez de eventos sueltos: PostHog tiene plan
gratuito de 1M eventos/mes y da retención por cohortes y grabaciones de sesión.
Para la fase de validación, ver 10 grabaciones de gente usando el Atlas vale más
que cualquier gráfica. Recomendación: **PostHog además de Vercel Analytics**, no
en lugar de.

### 0.2 Captura de email — la tarea más rentable del plan

**Tabla en Supabase** (mismo patrón que `user_subscriptions.sql`):

```sql
-- supabase/lista_espera.sql
create table if not exists public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  origen text,                          -- 'home' | 'muro' | 'ficha' | 'redes'
  modelo_contexto text,                 -- ficha desde la que se apuntó
  perfil text,                          -- 'clinico' | 'docente' | 'estudiante' | 'otro'
  locale text default 'es',
  created_at timestamptz not null default now()
);

alter table public.lista_espera enable row level security;

-- Inserción anónima permitida, lectura solo desde el servidor (service role).
create policy "Cualquiera puede apuntarse"
on public.lista_espera
for insert
to anon, authenticated
with check (true);
```

**Endpoint:** `api/subscribe-list.js`, siguiendo el estilo de los demás
handlers de `api/`. Valida el email, normaliza a minúsculas, inserta con
`on conflict do nothing`, devuelve 200 siempre (no filtrar si un email ya
existe).

**Tres emplazamientos, con tres textos distintos:**

1. **Home**, bajo el titular, sobre el pliegue:
   > **El Atlas está en beta abierta.**
   > 253 modelos de psicoterapia con sus fundamentos, referencias y linajes.
   > Déjame tu email y te aviso de cada ampliación.
   > `[tu@email.com] [Avísame]`

2. **Muro de acceso** (`accessText` en `library.js:5`), como tercera opción
   junto a Entrar / Suscribirse:
   > ¿Prefieres esperar? Déjame tu email y te aviso cuando abra el acceso
   > completo. Sin compromiso.

3. **Pie de cada ficha**, contextual:
   > ¿Te ha servido esta ficha? Hay 252 más. Te aviso cuando publique nuevas.

- [ ] Añadir campo opcional **perfil** (clínico / docente / estudiante / otro)
      en el formulario de la home. Un desplegable de 4 opciones. Ese dato
      decide a quién le hablas después.

### 0.3 Página de agradecimiento con pregunta

Tras apuntarse, no mostrar solo "gracias". Mostrar **una** pregunta:

> ¿Para qué crees que usarías el Atlas? (opcional)
> `[ ] Preparar sesiones  [ ] Estudiar/formarme  [ ] Dar clase  [ ] Investigar  [ ] Curiosidad`

Es la respuesta que va a escribir tu home dentro de dos meses.

---

## FASE 1 — Desbloquear la indexación (semanas del 8 al 21 de septiembre)

Ya has invertido en SEO. Esta fase no añade inversión: recupera la hecha.

### 1.1 Sacar el contenido del `<noscript>` al DOM real

**Es el cambio de mayor impacto de todo el documento.**

En `scripts/build-model-pages.mjs`:

- [ ] Renombrar `renderNoScriptFallback()` (línea 671) a `renderSeoArticle()` y
      devolver el `<article>` **sin** el envoltorio `<noscript>`.
- [ ] En la línea 775, inyectarlo antes de `</body>` como contenido visible,
      con un id estable:

```js
html = html.replace('</body>', `${renderSeoArticle(model, related, locale)}\n</body>`);
```

- [ ] En el arranque de la app (`bootstrap.js`), cuando el Atlas ya ha pintado
      la ficha interactiva, ocultar ese bloque:

```js
document.getElementById('seoArticle')?.setAttribute('hidden', '');
```

Así el primer HTML que recibe cualquiera —Google, un lector de pantalla, una
conexión lenta— es la ficha completa, y la app la sustituye al hidratar. No es
cloaking: el contenido es idéntico al que ve el usuario.

- [ ] Revisar los estilos: el `<article>` debe verse decente durante el
      instante en que está visible, no como texto sin formato sobre fondo
      blanco.

### 1.2 Decidir qué es gratis y qué es de pago

Este es un cambio **de estrategia**, no técnico, y condiciona el anterior.

Hoy el muro está sobre el contenido. Eso te condena a no indexar nunca: no
puedes pedirle a Google que posicione páginas cuyo contenido le escondes.

**Propuesta:**

| Gratis y abierto | De pago |
| --- | --- |
| Las 253 fichas completas: descripción, teoría del cambio, ideas fundamentales, influencias, referencias | Genealogía (linajes, influencias cruzadas) |
| Buscador y vista Lista | Mapamundi |
| Página de escuela | Red de afinidades |
| | Procesos de cambio (vista por función clínica) |
| | Comparador de modelos |
| | Colecciones propias y notas |
| | Exportar ficha a PDF |
| | Versión inglesa |

**Razonamiento:** las fichas son el motor de captación —es lo que se busca en
Google, lo que se comparte y lo que te da autoridad—. Las cuatro vistas son lo
que **nadie más tiene** y lo que un profesional no puede reproducir con un
manual: eso es lo que se paga. Además, es más fácil justificar 9,90 € por una
herramienta que por un texto.

- [ ] Decidir esto de forma explícita y anotarlo. Es reversible, pero no debe
      quedar ambiguo.

### 1.3 Rescatar las 13 fichas con `noindex`

`build-model-pages.mjs:699`:

```js
const indexable = model.descripcion.length >= 160;
```

13 fichas tienen descripción corta y se publican con `noindex,follow`.

- [ ] Listarlas:
      `grep -rl "noindex" public/modelos/*/index.html`
- [ ] Ampliar su `descripcion` en `tmps-data` por encima de 160 caracteres.
      Son 13 párrafos; una tarde.
- [ ] Reconstruir y verificar que ninguna queda con `noindex`.

### 1.4 Arquitectura de enlaces internos

Un sitemap plano de 410 URLs sin jerarquía es lo peor para el rastreo. Google
necesita entender qué es importante.

- [ ] **Páginas hub por escuela**: `/escuelas/<escuela>/` con introducción real
      a la tradición (300-500 palabras) y enlace a todos sus modelos. Son 13
      páginas con alto potencial de posicionamiento por sí mismas
      ("terapia sistémica", "psicoanálisis relacional", "terapias contextuales").
- [ ] Incluir `/escuelas/` y las páginas de escuela **en el sitemap** (hoy no
      están: `grep -c "escuelas" public/sitemap.xml` → 0).
- [ ] Enlazar cada ficha a su página de escuela (miga de pan visible, no solo
      en JSON-LD).
- [ ] Mantener el bloque «Modelos relacionados» que ya generas — está bien
      hecho y es exactamente lo que hace falta.

### 1.5 Trabajo en Search Console

- [ ] **Leer los 2 motivos exactos** de las 378 sin indexar. Interpretación
      según lo que aparezca:
      - *"Descubierta: actualmente sin indexar"* → problema de autoridad y
        presupuesto de rastreo. Solución: enlaces entrantes y jerarquía (1.4).
      - *"Rastreada: actualmente sin indexar"* → Google la vio y decidió que no
        merece la pena. Solución: 1.1 y 1.2.
      - *"Excluida por etiqueta noindex"* → son las 13 de 1.3.
      - *"Página alternativa con etiqueta canónica"* → revisar hreflang ES/EN.
- [ ] **Inspección de URL → Probar URL publicada → Ver página probada → HTML.**
      Ahí verás con tus ojos lo que Google renderiza. Hazlo antes y después del
      cambio 1.1: es la prueba de que ha funcionado.
- [ ] Pedir indexación manual de **10 fichas insignia** tras el cambio: ACT,
      EMDR, DBT, terapia sistémica de Milán, Beck, Rogers, IFS, terapia
      narrativa, Gestalt, mentalización. Son las de mayor volumen de búsqueda.
      Sirven de test: si en dos semanas indexan, el arreglo funciona.
- [ ] Revisar quincenalmente. **No tocar nada más durante ese tiempo**: si
      cambias cinco cosas a la vez no sabrás cuál funcionó.

### 1.6 Decisión estructural: subdominio o subcarpeta

`apps.tumentorpsicologia.com` es un subdominio; Google lo trata como un sitio
independiente y no hereda la autoridad de `tumentorpsicologia.com`.

- [ ] Comprobar en Search Console la autoridad y el tráfico del dominio
      principal.
- [ ] **Si el dominio principal tiene tráfico apreciable**, mover el Atlas a
      `tumentorpsicologia.com/atlas/` con un rewrite en Vercel y 301 desde el
      subdominio. Eso vale más que meses de link building.
- [ ] Si no lo tiene, quedarse en el subdominio y no perder tiempo aquí.

**Aviso:** una migración de dominio da un bajón temporal de 2-6 semanas. Hacerla
**ahora**, con 13 páginas indexadas, cuesta prácticamente nada. Hacerla dentro
de un año, mucho. Si se va a hacer, es ahora.

### 1.7 Enlaces entrantes iniciales

Con 13 páginas indexadas, el problema es de autoridad. Cinco enlaces de calidad
cambian esto:

- [ ] Ficha del proyecto en tu propio dominio principal, enlazando al Atlas.
- [ ] Perfil de LinkedIn y firma de email.
- [ ] Directorios de recursos para psicólogos (COP autonómicos, blogs de
      psicología clínica que mantengan listas de recursos).
- [ ] Wikipedia en español: en artículos de modelos concretos, como enlace
      externo, **solo donde aporte de verdad** y respetando sus normas. Un
      enlace forzado se revierte y quema.
- [ ] Contactar a 3-4 blogs de psicología en español ofreciendo el Atlas como
      recurso citable.

---

## FASE 2 — Llegar a los profesionales (semanas del 15 de septiembre al 3 de noviembre)

El SEO tarda meses. En paralelo hay que ir donde ya está la gente. Ordenado por
**señal obtenida por hora invertida**, no por volumen.

### 2.1 Treinta conversaciones directas (máxima prioridad)

La señal de más calidad que vas a conseguir. No es marketing: es investigación
de producto que además genera los primeros usuarios.

- [ ] Lista de 30 psicólogos que puedas contactar sin frialdad: excompañeros,
      supervisores, gente de formaciones, colegas de colegio profesional.
- [ ] Enseñarles el Atlas **15 minutos, en directo**, por videollamada o en
      persona. No mandar un enlace: mirar cómo lo usan.
- [ ] Guion de las tres preguntas que importan:
      1. ¿En qué momento de tu trabajo abrirías esto?
      2. ¿Qué echas en falta para que fuera útil de verdad?
      3. ¿Pagarías 9,90 € al mes? *(y luego callarse)*
- [ ] Anotar **verbatim** lo que digan. Las palabras exactas que usen para
      describirlo son el copy de tu home.

Ritmo realista: 4-5 por semana durante 6 semanas.

### 2.2 Docencia — el canal con más apalancamiento

El Atlas es, sin retocar nada, una herramienta de enseñanza. Un profesor con 40
alumnos vale más que 1.000 visitas frías.

- [ ] Identificar 20 programas: másteres de Psicología General Sanitaria,
      másteres de psicoterapia (sistémica, cognitivo-conductual, psicoanalítica,
      humanista, integradora), programas de formación de institutos privados.
- [ ] Escribir al coordinador o a profesores concretos de asignaturas de
      "modelos" / "corrientes" / "fundamentos".
- [ ] **Oferta:** acceso institucional gratuito durante el curso a cambio de (a)
      feedback y (b) que lo mencionen a los alumnos.

Plantilla:

> Asunto: Atlas de psicoterapia — acceso gratuito para tu asignatura
>
> Hola [nombre],
>
> He construido un atlas interactivo de 253 modelos de psicoterapia: cada uno
> con sus fundamentos, teoría del cambio, referencias y sus linajes de
> influencia, más un mapa de dónde nació cada tradición y una genealogía
> navegable de cómo se derivan unos de otros.
>
> Lo hice porque me faltaba algo así cuando estudiaba, y creo que para
> [asignatura] podría ahorrar bastante trabajo de contexto.
>
> Te ofrezco acceso gratuito para ti y tus alumnos durante el curso. No busco
> venderte nada: busco saber si le resulta útil a quien enseña esto.
>
> ¿Te enseño cómo funciona en 15 minutos?
>
> [enlace] · [tu nombre]

### 2.3 Colegios Oficiales de Psicólogos

Gratis, creíble y con listas enormes.

- [ ] Los boletines autonómicos publican recursos para colegiados. Escribir al
      área de comunicación de los COP con más volumen: Madrid, Cataluña,
      Andalucía Occidental, Valencia, País Vasco.
- [ ] Ofrecerlo como recurso, no como anuncio. Un párrafo y una captura.
- [ ] Preguntar también por sus grupos de trabajo y secciones de psicología
      clínica.

### 2.4 Contenido visual — tu ventaja injusta

La genealogía y el mapamundi son **bonitos**. Eso no es un detalle estético: es
lo único que puedes poner en una red social y que la gente pare a mirar. Un
texto sobre modelos de psicoterapia no se comparte; un mapa animado de dónde
nació cada terapia, sí.

- [ ] **Un post por semana**, mínimo. Formato rotatorio:
      - Vídeo de 30 s recorriendo el linaje de una escuela en la genealogía.
      - El mapamundi con el filtro temporal corriendo de 1890 a hoy.
      - Captura de una ficha con un dato sorprendente ("la terapia X nació como
        una crítica a la terapia Y, de la que su autor fue alumno").
      - Hilo: "Cinco modelos de psicoterapia que probablemente no conoces".
- [ ] Cada post enlaza a **una ficha concreta**, no a la home.
- [ ] Canales, por orden: **LinkedIn** (donde están los profesionales),
      Instagram (donde está el alcance), X/Bluesky (donde está la conversación
      académica).
- [ ] Grabar con `prefers-reduced-motion` desactivado y en tema oscuro: es
      cuando mejor se ve.

**Nota:** aquí puedes reciclar el trabajo del SEO. Cada ficha ya escrita es un
post. No hay que crear contenido nuevo, hay que empaquetar el que existe.

### 2.5 Comunidades

Aportando, nunca spameando. Regla: 10 mensajes útiles por cada mención propia.

- [ ] Grupos de Facebook de psicólogos y terapeutas en español (los hay de
      miles de miembros por orientación).
- [ ] Canales de Telegram y grupos de WhatsApp de supervisión y formación.
- [ ] LinkedIn: grupos de psicología clínica.
- [ ] Reddit: r/psicologia, r/psychotherapy, r/AcademicPsychology. **Leer las
      normas de autopromoción antes de publicar** — en r/psychotherapy se banea
      rápido y no compensa.
- [ ] Foros de formación continuada y de preparación del PIR: público muy
      motivado que necesita exactamente esto.

### 2.6 Podcasts y newsletters del sector

- [ ] Listar 10 podcasts de psicología en español y 5 newsletters de psicología
      clínica.
- [ ] Ofrecer no una entrevista promocional, sino un tema: *"la historia de por
      qué hay 400 psicoterapias y qué las une"*. Ese tema es interesante por sí
      mismo; el Atlas aparece como consecuencia.

### 2.7 Mercado inglés

La traducción EN está a medio camino. **No abrir este frente hasta tener señal
en español.** Cuando la haya:

- [ ] Terminar los overlays EN pendientes (ver `tmps-data`, README de i18n).
- [ ] El mercado es 20 veces mayor y la competencia también. Merece su propio
      plan, no un apéndice de este.

---

## FASE 3 — Validar cobrando (desde la semana del 6 de octubre)

**La única validación real es que alguien pague.** Las encuestas mienten; las
listas de espera mienten a medias; una tarjeta de crédito no miente.

### 3.1 Beta fundadora

No esperar a "estar listo". En cuanto haya ~100 emails en la lista:

- [ ] Crear un precio anual en Stripe: **49 €/año**, bloqueado de por vida,
      limitado a los **100 primeros**.
- [ ] Anunciarlo a la lista de espera con honestidad:

> El Atlas está en beta. Faltan cosas y las iré añadiendo.
>
> Los 100 primeros lo tenéis por 49 € el primer año **y todos los siguientes**,
> mientras mantengáis la suscripción. Después, el precio será 9,90 €/mes.
>
> A cambio pido una cosa: contadme qué falta.

- [ ] Ese "a cambio pido una cosa" no es retórica. Los fundadores son tu comité
      de producto durante seis meses.

**Por qué anual y no mensual:** un profesional decide una vez al año sin
pensarlo; una suscripción mensual la revisa cada mes. Y 49 € por adelantado te
financia el desarrollo.

### 3.2 Mantener la prueba de 10 días

Ya está configurada (`create-checkout-session.js:70-76`) y con el comportamiento
correcto: si al acabar la prueba no hay método de pago, Stripe cancela. Está
bien resuelto, no tocarlo.

- [ ] Añadir email en el día 7 de la prueba: *"te quedan 3 días — ¿te ha sido
      útil? Respóndeme, leo todos los correos"*. Es donde se recuperan las bajas.

### 3.3 Entrevistas de salida

- [ ] A todo el que cancele, un email personal de una sola pregunta: *"¿qué te
      faltó?"*. Tasa de respuesta alta y es el dato más valioso que vas a tener.

---

## FASE 4 — Precio y empaquetado

### 4.1 El precio actual está bien

9,90 €/mes para un profesional es el precio de dos cafés. **No vas a perder
ventas por el precio; las vas a perder porque no se entiende para qué sirve.**
No dedicar tiempo a optimizar el precio hasta tener 50 clientes.

### 4.2 Estructura recomendada

| Plan | Precio | Contenido |
| --- | --- | --- |
| Abierto | 0 € | 253 fichas completas, buscador, Lista, páginas de escuela |
| Atlas | 9,90 €/mes · 89 €/año | Las cuatro vistas, Procesos, comparador, colecciones, exportar, EN |
| Fundador | **49 €/año de por vida — cifra comprometida el 8/9/2026** | Igual que Atlas. 100 plazas. Solo en beta |
| Institucional | a convenir | Acceso por aula. Precio por número de alumnos |

- [ ] El plan **institucional** puede acabar siendo el grueso del ingreso. Un
      máster con 40 alumnos a 3 €/alumno/año son 120 € de un solo email. No
      construirlo aún, pero tenerlo en la cabeza al hablar con docentes (2.2).

### 4.3 Facturación

Ya hay un aviso sobre datos fiscales (NIF/IVA intracomunitario) antes del
checkout — buen detalle, poca gente lo cuida.

- [ ] Verificar que Stripe Tax está bien configurado para IVA español y para
      clientes de otros países de la UE antes de cobrar de verdad.

---

## FASE 5 — Reescribir la home

`public/index.html` es la página que más va a ver la gente que llegue de redes,
y hoy no convierte.

**Mantener** la estética editorial: es un diferenciador real y transmite
seriedad. **Añadir** lo operativo:

- [ ] **Titular que diga qué es**, sin perder el tono. Por ejemplo:
      > **Atlas de la psicoterapia**
      > 253 modelos con sus fundamentos, referencias y linajes.
      > Para clínicos, docentes y estudiantes.
- [ ] **Prueba de contenido visible**: las cifras reales (253 modelos, 13
      escuelas, 130 años, X referencias bibliográficas). Ya las calculas para el
      portal del Atlas; súbelas a la home.
- [ ] **Captura de email sobre el pliegue** (Fase 0.2).
- [ ] **Una ficha de muestra abierta**, enlazada desde la home. Que se vea la
      calidad antes de pedir nada.
- [ ] **Para quién es**, explícito: tres líneas — "si eres clínico…", "si
      enseñas…", "si estudias…".
- [ ] **Precio visible**, aunque esté en beta. Ocultarlo genera desconfianza en
      un público profesional.
- [ ] **Quién lo ha hecho.** Una foto y dos líneas. En psicología, la
      credibilidad de la fuente lo es todo, y un atlas anónimo de 253 modelos
      levanta más sospecha que confianza.

---

## Calendario resumido

| Semana | Fechas | Foco | Entregable |
| --- | --- | --- | --- |
| 1 | 8-14 sep | Fase 0 completa | Eventos + captura de email en producción |
| 1-2 | 8-21 sep | Fase 1.1-1.3 | Contenido en el DOM, 13 `noindex` rescatadas, indexación pedida |
| 2 | 15-21 sep | Fase 5 | Home reescrita |
| 2-3 | 15-28 sep | Fase 1.4-1.6 | Hubs de escuela, sitemap, decisión de dominio |
| 3-8 | 22 sep-3 nov | Fase 2 | 30 conversaciones, 20 programas, 1 post/semana |
| 5+ | desde 6 oct | Fase 3 | Beta fundadora abierta |
| 8 | 3 nov | Revisión | Contrastar con las métricas de la sección 2 |

---

## Si solo puedes hacer tres cosas

1. **Formulario de email en la home y en el muro.** Todo lo demás depende de
   tener a quién avisar. Medio día.
2. **Sacar la ficha del `<noscript>` al DOM y abrir las fichas.** Recupera meses
   de inversión en SEO ya hecha. Un día.
3. **Hablar con 30 psicólogos.** Ninguna analítica te va a decir lo que te dirán
   ellos. Seis semanas, a ratos.

---

## Anexo: comandos útiles

```bash
# Reconstruir fichas, validar inglés y SEO
npm run build

# Solo fichas
npm run build:model-pages

# Construir en carpeta temporal sin tocar public/
MODEL_PAGES_OUTPUT_DIR=/tmp/atlas-build npm run build:model-pages

# Ver qué fichas salen con noindex
grep -rl "noindex" public/modelos/*/index.html

# Contar URLs del sitemap
grep -c "<url>" public/sitemap.xml

# Previsualización local
npm run dev:atlas     # http://127.0.0.1:3000/modelos/

# Tests
npm run test:atlas
npm run test:i18n
npm run test:build-fetch
```

---

## Anexo: qué NO hacer todavía

Para proteger el foco, estas cosas parecen buenas ideas y no lo son ahora:

- **App móvil.** El uso profesional es de escritorio. Cero prioridad.
- **Abrir el mercado inglés.** Hasta tener señal en español, duplica el trabajo
  y divide la atención.
- **Añadir más modelos.** 253 ya son más de los que nadie va a leer. El problema
  no es el catálogo.
- **Rediseñar las vistas.** Están bien. El problema no es el producto.
- **Publicidad de pago.** Sin embudo medido, es tirar dinero. Cuando sepas el
  valor de un email captado, entonces.
- **Optimizar el precio.** Antes de 50 clientes no hay datos para optimizar
  nada.
