# Atlas de la psicoterapia

La biblioteca (`/modelos/`, y `/en/models/` en inglés) es ahora la interfaz
persistente del Atlas. Lista, Red de afinidades, Mapamundi y Genealogía cambian
de perspectiva dentro del mismo documento. Metamodelos mantiene su enlace
como sección independiente; Quiz e Isomorfismos no se han incorporado todavía.

El HTML completo de la biblioteca anterior se conserva, sin modificaciones, en
`public/modelos/index-biblioteca-backup-2026-09-05.html`, recuperado del commit
`2f230c4`. El Atlas mantiene la URL pública `/modelos/`.

## Organización del código

- `public/modelos/index.html`: estructura de página, cabecera y contenedores.
- `public/modelos/legacy/library.css`: estilos extraídos de la biblioteca,
  conservando su orden de cascada.
- `public/modelos/legacy/bootstrap.js`: acceso, configuración, SEO y helpers
  iniciales de la biblioteca.
- `public/modelos/legacy/library.js`: carga y cachés existentes, clasificación,
  red y renderizado de fichas. `atlasLibrary` delimita el adaptador público.
- `public/modelos/legacy/navigation.js`: tema y utilidades existentes.
- `public/atlas/atlas.js`: coordinación de vistas, selección, historial y ficha.
- `public/atlas/state.js`: estado compartido y serialización de URLs.
- `public/atlas/data.js`: acceso al catálogo común, coordenadas e influencias.
- `public/atlas/views/`: visualizaciones con `createView`, `update`, `activate`,
  `deactivate` y `destroy`. Cada una conserva su zoom, desplazamiento y controles.
- `public/atlas/atlas.css`: cabecera, distribución adaptable y estilos de vistas.
- `public/atlas/profile.css`: ajustes de listas y ficha; las reglas editoriales
  responden al ancho del contenedor `atlas-profile`, también en paneles de escritorio.
- `public/atlas/views/genealogy-layout.js`: fechas, bandas simétricas y clasificación
  de relaciones sobre el catálogo completo.
- `public/atlas/views/genealogy-interactions.js` y `genealogy.css`: tarjetas SVG,
  conexiones y expansión de influencias recuperadas de la Genealogía original.

El código heredado sigue siendo amplio, pero ya está fuera del HTML. Los nuevos
módulos no añaden variables a su ámbito ni contienen otra copia de la biblioteca.
Para futuras extracciones, mantener el adaptador y migrar responsabilidades
concretas (ficha, autenticación, clasificación) sin cambiar el contrato de vistas.

## Datos y ficha únicos

Las vistas consumen el catálogo y el resultado filtrado de la biblioteca.
Reutilizan sus peticiones autenticadas, cachés de escuelas y fichas públicas.
Genealogía solicita únicamente el índice adicional de influencias. Mapamundi
completa las coordenadas que faltan mediante la misma caché de fichas públicas,
con un máximo de cuatro peticiones simultáneas.

Seleccionar un marcador o nodo llama al mismo `openModel`; solo existe un
`#modelInfo`. No se crean iframes, clientes Supabase ni pantallas de pago en los
módulos. Los controles de acceso existentes de biblioteca y API se mantienen.
Las dependencias de Leaflet se cargan al entrar en Mapamundi; la animación
temporal se detiene al salir de la vista.

## Estado y compatibilidad

Ejemplo: `/modelos/?view=map&group=school&target=Humanista&open=<id>`.

- `view`: `list`, `network`, `map`, `genealogy`.
- `group`, `target`, `q`: clasificación, grupo y búsqueda.
- `open`: modelo seleccionado.
- Los filtros por tags y los controles particulares de cada vista permanecen
  en memoria durante la sesión; no se serializan todos en la URL.
- Las rutas individuales `/modelos/<id>` y las versiones inglesas continúan
  funcionando con las páginas indexables del build.
- `/mapamundi/` y `/genealogia/` son entradas ligeras que conservan los parámetros
  y abren la vista correspondiente del Atlas. Ya no ejecutan las apps antiguas.
- `?embed=1&open=<id>` sigue mostrando la ficha sin la cabecera del Atlas, para
  mantener compatibilidad con otros consumidores.

Genealogía mantiene el inicio del recorrido en 1890. Los modelos anteriores
siguen en Lista y Mapamundi. Los años ausentes no se infieren: se contabilizan
como no disponibles. Sus tarjetas comparten una escala temporal real y se
separan en bandas simétricas para evitar solapamientos. Se conserva el lenguaje
original de cajas redondeadas, líneas en cascada, conexiones secundarias discontinuas
y expansión de los nombres. Seleccionar un nodo fija sus influencias: las entrantes
a la izquierda y las salientes a la derecha, incluyendo referencias externas
con sus nombres. Las relaciones de la misma escuela se resaltan en el árbol.

Las tarjetas de otras escuelas permiten viajar hasta el modelo relacionado.
Si un filtro ocultaba su escuela, esta se incorpora temporalmente al lienzo;
«Volver al filtro» recupera el conjunto inicial sin cambiar los filtros compartidos.
En escritorio se abre la ficha común al seleccionar; en móvil el primer toque
fija las influencias y «Abrir ficha» abre esa misma ficha. Zoom, desplazamiento,
tema y filtros siguen perteneciendo a la interfaz persistente del Atlas.

## Desarrollo y validación

En Windows: `npm.cmd run dev:atlas` (o `npm run dev:atlas` en otras shells).
Abre `http://127.0.0.1:3000/modelos/`. El servidor escucha solo en loopback y lee
`../tmps-data/data`; se puede cambiar con `ATLAS_DATA_ROOT`. No escribe datos ni
implementa pagos. Es una previsualización local, no el servidor de producción.

- `npm run test:atlas`: estado, rutas, coordenadas, influencias, disposición y caché.
- `npm run test:i18n` y `npm run test:build-fetch`: regresiones existentes.
- `npm run build`: fichas, validación del inglés y SEO.
- `MODEL_PAGES_DATA_ROOT` permite construir desde el checkout de datos.
- `MODEL_PAGES_OUTPUT_DIR` permite validar el build en una carpeta temporal sin
  sobrescribir páginas o sitemap locales.

La verificación visual debe cubrir la selección Lista → Mapa → Genealogía,
filtros compartidos, Atrás/Adelante, recarga del enlace, cambio de idioma, tema
claro/oscuro, ficha en móvil y vuelta a la red existente.
