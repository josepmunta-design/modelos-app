Informe de descubrimiento e indexación — 11 de septiembre de 2026

Cambios preparados en `modelos-app`, sin modificar `tmps-data`, IDs, slugs, rutas de producción, autenticación ni pagos. Este informe documenta la validación local previa al despliegue; el resultado en producción se comunica por separado.

Problemas encontrados y solución

1. `/modelos/` tenía solo unos ocho enlaces internos en su HTML inicial. Ahora el build rellena el listado existente con enlaces reales: 263 fichas ES y 197 EN revisadas. Reutiliza las clases y estructura de las tarjetas actuales; JavaScript mantiene su presentación y filtrado. No se añade ningún directorio lateral ni bloque editorial visible. Los enlaces no están ocultos para buscadores y son navegables también sin scripts.
2. `/escuelas/` empezaba con una rejilla vacía oculta. JavaScript creaba siete tarjetas que llevaban a filtros de la biblioteca. Ahora esas mismas siete tarjetas y sus textos se generan en HTML con enlaces directos a los hubs. El navegador añade las imágenes animadas existentes; un fallo de la API conserva las tarjetas. Los 13 hubs están enlazados desde los grupos del listado de `/modelos/`, sin ampliar la portada de escuelas.
3. Las fichas ya tenían contenido y cinco relacionados estáticos. Se generan hasta seis relacionados a partir de su escuela. Ese contenido inicial ocupa el panel de ficha existente y se sustituye por la ficha interactiva como antes. No se añaden secciones visibles después de cargar la aplicación. Las tarjetas interactivas también pasan a ser enlaces reales y conservan su funcionamiento dentro de la aplicación; admiten abrir en otra pestaña.
4. La animación de entrada original conserva los paneles transparentes hasta recibir la clase `loaded`. Se mantiene para la aplicación normal. Un estilo exclusivo de `noscript` permite navegar por el contenido inicial cuando no se ejecuta JavaScript. El contenido y los enlaces están fuera de `noscript`.
5. Había tres H1 en cada ficha: autenticación, landing auxiliar y título del modelo. Los dos auxiliares pasan a H2. El portal interactivo también usa H2. El título principal conserva el H1.
6. El generador emitía `Article` sin fechas editoriales y atribuía su autoría a los autores históricos del modelo, incluso agrupando varios nombres en un `Person`. El navegador volvía a emitir `Article`. Ambos caminos se han corregido.
7. El sitemap utilizaba `generatedAt` o la fecha actual para todas sus entradas. Ahora omite `lastmod`. El corpus público no contiene fechas fiables de modificación editorial de estas páginas.
8. `/genealogia` estaba anunciado pese a declarar `noindex` y canonical a `/modelos/`. Se retira únicamente del sitemap. `/metamodelos/` carecía de canonical explícito; se añade el de su URL existente.
9. OpenGraph apuntaba a `/modelos/assets/biblioteca-modelos-editorial.png`, ausente del checkout. Ahora utiliza la imagen real `/assets/atlas-home/library.jpg`, con sus dimensiones. La home incorpora el enlace exacto `/modelos/`; ya tenía escuelas, red, mapa, genealogía y metamodelos. Sus imágenes de ambiente conservan `alt=""`, pues decoran enlaces con texto y nombre accesible.

Arquitectura resultante

```text
Home del Atlas
├── /modelos/ ── listado existente con enlaces a 263 fichas y 13 hubs
├── /escuelas/ ── las 7 tarjetas originales enlazan a sus hubs
├── /en/models/ ── listado con 197 fichas EN revisadas y completas
└── /metamodelos/

Hub de escuela → todas sus fichas
Ficha HTML → escuela y modelos relacionados
```

Por indicación expresa del usuario, se conserva la vista actual. Donde no existía un breadcrumb visible se mantiene únicamente `BreadcrumbList` en JSON-LD, sin añadir una barra de navegación. Esta decisión sustituye el requisito inicial de incorporar breadcrumbs visibles; la capacidad de descubrimiento se apoya en los enlaces reales del listado, las tarjetas y las fichas, no solo en los metadatos.

La prueba de rastreo parte exclusivamente de `/` y sigue `a[href]` del HTML de `public/`, sin ejecutar JavaScript y sin usar el sitemap como semilla. Alcanza las 478 URLs anunciadas.

Fuentes y generación

- La fuente canónica sigue en `tmps-data/data/Core/modelos/**` y `data/Core/escuelas/**`. Este build utiliza las proyecciones públicas de `data/Core/modelos-publicos/**` y los overlays de `data/Core/i18n/en/modelos-publicos/**`.
- `scripts/build-model-pages.mjs` genera ES, EN y sus metadatos, prepara los assets comunes e invoca los hubs y directorios. Admite el repositorio de datos local, GitHub autenticado, el índice local y la API, según la configuración existente.
- `public/assets/Repo/modelos-index.json` es una ruta alternativa prevista por el generador; no existe en este checkout. La validación se ejecutó contra el repositorio hermano mediante `MODEL_PAGES_DATA_ROOT`.
- `scripts/build-escuela-pages.mjs` ya genera todos los enlaces de cada hub, su introducción editorial, recuento y cronología. Se conserva su implementación y `scripts/escuelas-contenido.json`; no se ha inventado texto nuevo. Los datos públicos no ofrecen campos de familias o relaciones entre escuelas que permitan añadir esas agrupaciones con una regla inequívoca.
- Los relacionados se seleccionan entre modelos de la misma escuela, normalizando acentos y mayúsculas, con proximidad de año y desempate por nombre. El año solo ordena relaciones, nunca se convierte en fecha editorial. Si faltan candidatos se muestran menos de cuatro; no se rellenan con relaciones inventadas. En EN se puede completar con fichas ES de la misma escuela, señaladas como `Spanish`.
- `public/modelos/.generated-pages.json` registra modelos generados, indexables por idioma y hubs. `generatedAt` permanece como dato operativo. El sitemap requiere este manifiesto y comprueba la existencia, indexabilidad y canonical del HTML antes de publicarse.
- EN exige estado `reviewed`, cobertura no vacía del texto público mostrado y una ficha ES indexable. Un overlay parcial no genera una página EN ni un hreflang hacia ella. Los pares válidos mantienen `es`, `en` y `x-default` recíprocos. No se han creado traducciones.

Fechas y structured data

No se calcula ninguna fecha sustituta: actualmente hay cero `lastmod`. Tampoco se usan mtime, año histórico, fecha de revisión de traducción o fecha del despliegue como fechas de publicación de la página. Si en el futuro se incorpora un campo editorial fiable, habrá que mapearlo explícitamente por URL y adaptar su prueba.

Las fichas usan `WebPage`, `BreadcrumbList` y un `Thing` para nombrar el tema. No se declaran autores web históricos, fechas ni tratamientos médicos por inferencia. Los hubs conservan `CollectionPage`, `ItemList` y `BreadcrumbList`; el índice de escuelas incorpora `CollectionPage` y breadcrumb. El breadcrumb JSON-LD de cada ficha expresa Atlas → escuela → modelo. Se conservan los breadcrumbs visibles que ya existían en los hubs.

`robots.txt` conserva exactamente las reglas funcionales solicitadas:

```text
User-agent: *
Allow: /
Allow: /api/data
Disallow: /api/

Sitemap: https://apps.tumentorpsicologia.com/sitemap.xml
```

Validación

| Página | H1 antes → después | Enlaces internos estáticos actuales |
|---|---:|---:|
| `/modelos/` | 2 → 1 | 288, frente a unos 8 antes |
| `/escuelas/psicoanalisis/` | 1 → 1 | 36; incluye las 23 fichas de esa escuela |
| ACT | 3 → 1 | 19; incluye 6 relacionados |
| Home e índice de escuelas | 1 → 1 | Se preserva un único H1 |

El build produce 263 fichas ES, 197 EN y 13 hubs. El sitemap tiene 478 URLs: esas 473 páginas más home, bibliotecas ES/EN, índice de escuelas y metamodelos. La cifra procede del checkout de datos utilizado; no es una medición del despliegue actual ni de la cobertura de Google.

Comandos ejecutados en PowerShell:

```powershell
$env:MODEL_PAGES_DATA_ROOT='A:\MODELOS GIT\tmps-data'
npm.cmd run build
npm.cmd test
$env:SEO_CHECK_HTTP='http://127.0.0.1:3000'
npm.cmd run validate:generated-seo
[xml]$seoXml = Get-Content public/sitemap.xml -Raw
git -c core.whitespace=cr-at-eol diff --check
```

Se utiliza `npm.cmd` porque la política de PowerShell bloquea `npm.ps1`. Las 43 pruebas pasan: las 36 existentes de Atlas, facturación, reintentos, escuelas e i18n, y siete pruebas nuevas de SEO. El build ejecuta además la validación de i18n y el rastreo estático. La lectura mediante el parser XML de PowerShell confirma XML bien formado y 478 entradas. La comprobación HTTP local verifica 200 y compara cada respuesta con su archivo generado; no sigue redirecciones para simular un 200.

Se inspeccionaron en navegador home, `/modelos/`, `/escuelas/`, el hub de psicoanálisis, ACT, EMDR, Beck, Rogers, Freud y Gestalt, así como ACT en inglés. Tras ajustar la implementación a la conservación de la vista, se comprobó de nuevo ACT con un único H1, canonical correcto y cero bloques visibles añadidos; el índice de escuelas mantiene sus siete tarjetas originales. Se verificó el cambio entre Lista y Red de afinidades y la apertura de una ficha mediante una tarjeta. Una previsualización local sin etiquetas script, activando el CSS de `noscript`, confirmó las 263 tarjetas navegables del HTML estático. No equivale a una auditoría visual exhaustiva de todos los tamaños de pantalla.

El rastreo completo cubre también Jung, Adler, Bowlby, DBT, Esquemas, los modelos sistémicos, Narrativa, Soluciones, EFT/Greenberg, IFS, MBCT, Metacognitiva, Logoterapia y Existencial. No se han añadido excepciones por ID en la implementación.

Archivos modificados o añadidos

| Archivo | Motivo |
|---|---|
| `scripts/build-model-pages.mjs` | Fichas, traducciones completas, breadcrumbs, relacionados y generación de directorios |
| `scripts/seo-navigation.mjs` — nuevo | Emparejado con escuelas, catálogo HTML y tarjetas del índice |
| `scripts/build-seo.mjs` | Manifiesto obligatorio, eliminación de fechas falsas y comprobación del HTML anunciado |
| `scripts/validate-generated-seo.mjs` — nuevo | Rastreo de HTML, canonical, H1, schema, enlaces, idiomas, robots y HTTP opcional |
| `scripts/seo.test.mjs` — nuevo | Regresiones de generación, traducciones, relaciones e hidratación |
| `scripts/dev-atlas.mjs` | Servir el HTML generado de las fichas para una previsualización fiel |
| `package.json` | `npm test` global y validación SEO al finalizar el build |
| `public/modelos/index.html` | Listado estático dentro del contenedor existente, H1, enlaces de vistas, imagen OG y CSS exclusivo sin scripts |
| `public/modelos/legacy/bootstrap.js` | Head coherente al navegar y conservación del schema generado durante la carga |
| `public/modelos/legacy/library.js` | Tarjetas con href, controles de vistas, metadatos iniciales y H1 de bienvenida |
| `public/modelos/legacy/library.css` | Aplicar los estilos existentes a los enlaces y neutralizar el margen por defecto del nuevo H1 |
| `public/escuelas/index.html` | Las siete tarjetas originales en HTML estático y schema |
| `public/assets/escuelas/escuelas.js` | Enriquecer imágenes sin sustituir ni ocultar el catálogo |
| `public/assets/escuelas/catalog.js` — nuevo | Compartir los siete IDs y textos originales entre build y navegador |
| `public/atlas/atlas.js`, `public/atlas/atlas.css` | Mantener comportamiento y estilos de los controles al convertirlos en enlaces |
| `public/atlas/portal.js`, `public/atlas/portal.css` | H2 del portal conservando su presentación |
| `public/index.html` | Enlace HTML exacto a la biblioteca |
| `public/metamodelos/index.html` | Canonical explícito |
| `public/sitemap.xml`, `public/robots.txt` | Salidas regeneradas |
| `SEO-TECNICO.md` — nuevo | Este informe |

Las fichas, hubs, assets generados y manifiesto siguen las reglas existentes de `.gitignore` y se regeneran durante el despliegue.

Límites y comprobaciones posteriores

El listado estático añade aproximadamente 151 KB de HTML a la biblioteca, unos 19 KB adicionales comprimidos con gzip frente a HEAD. No incorpora el corpus JSON completo ni dependencias de terceros; el pequeño catálogo editorial de escuelas se comparte en un módulo propio. Las fichas individuales no duplican el listado completo. Estas cifras no equivalen a una medición de Core Web Vitals: no se han medido datos de campo tras despliegue.

La verificación HTTP documentada aquí corresponde a la previsualización local. La integración no puede garantizar que Google indexe las páginas: queda desplegar, verificar las respuestas de producción y observar nuevos rastreos y cobertura en Search Console. No se ha modificado ni enviado información a Search Console.

Los criterios utilizados coinciden con las guías oficiales de Google sobre [enlaces rastreables](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) y [sitemaps y fechas fiables](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
