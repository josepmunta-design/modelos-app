# Internacionalización de la Biblioteca de Modelos

## Objetivo

Publicar una versión inglesa de la Biblioteca de Modelos sin duplicar ni
desincronizar la base de conocimiento española. Los IDs, códigos, relaciones y
datos no lingüísticos seguirán siendo únicos; cada idioma aportará únicamente
su contenido traducible.

## Principios

1. El español sigue siendo la fuente canónica y la versión por defecto.
2. Los IDs de modelos, escuelas, procesos, dimensiones, procedimientos y micros
   no se traducen.
3. Las traducciones se guardan como overlays y se fusionan por `id` o `codigo`,
   nunca por la posición de un elemento en un array. Los arrays de cadenas
   sueltas se fusionan por el texto español literal, que también es una clave de
   contenido, no de posición.
4. Una página inglesa solo será indexable cuando su traducción esté revisada.
5. Si cambia la fuente española, la traducción debe quedar marcada como
   pendiente de revisión.
6. Las rutas de idioma son estables y compartibles; no se usa `?lang=en` como
   URL pública principal.

## Rutas públicas

| Idioma | Biblioteca | Ficha de modelo |
| --- | --- | --- |
| Español | `/modelos/` | `/modelos/<modelId>` |
| Inglés | `/en/models/` | `/en/models/<modelId>` |

En la primera versión se conserva `modelId` en ambas rutas. Si más adelante se
quieren slugs ingleses, se añadirán como alias sin cambiar el ID interno.

## Estructura de traducciones de datos

Estructura propuesta en `tmps-data`:

```text
data/Core/
├── modelos/<escuela>/<modelId>.json
├── escuelas/<escuela>.json
└── i18n/en/
    ├── modelos/<escuela>/<modelId>.json
    ├── modelos-publicos/<escuela>/<modelId>.json
    ├── escuelas/index.json
    ├── escuelas/<escuela>.json
    └── taxonomias.json
```

Ejemplo de overlay:

```json
{
  "id": "act-hayes-strosahl-wilson-1999",
  "_translation": {
    "status": "reviewed",
    "sourceHash": "sha256:...",
    "reviewedAt": "2026-09-01"
  },
  "label": "Acceptance and Commitment Therapy (ACT)",
  "descripcion": "...",
  "teoriaCambio": {
    "resumen": "...",
    "explicacion": "..."
  },
  "ideasPrincipales": [
    {
      "id": "idea_act_1",
      "titulo": "...",
      "desarrollo": "..."
    }
  ],
  "procedimientos": [
    {
      "codigo": "p_act_formulacion_funcional",
      "nombre": "...",
      "texto": "..."
    }
  ],
  "influencias": {
    "Conductismo radical": "Radical behaviourism",
    "Contextualismo funcional": "Functional contextualism"
  }
}
```

Un array traducido admite dos formas. La **forma de array** repite solo los
elementos que se traducen, cada uno con su `id` o `codigo`. La **forma de mapa**
es un objeto cuyas claves seleccionan elementos de la fuente: el `id`/`codigo`
del elemento, o la cadena española literal cuando el array contiene textos
sueltos. Ninguna de las dos usa la posición. Si el español cambia, la clave deja
de resolver y la validación falla.

No se traducen `id`, `codigo`, años, coordenadas, porcentajes, nombres de
autores ni referencias bibliográficas originales. `grupo`, `year`, `autores`,
`lat`, `lon` y `file` están protegidos: el merge los rechaza explícitamente.
Países, escuelas, tipos y taxonomías deben resolverse mediante identificadores
estables y etiquetas por idioma.

## Fases de implementación

### 1. Infraestructura de locale y navegación

- [x] Detectar `es` o `en` desde la URL.
- [x] Centralizar las rutas de biblioteca y fichas.
- [x] Añadir selector ES/EN conservando el modelo abierto.
- [x] Crear diccionarios base de interfaz y función `t()`.
- [x] Añadir rewrites provisionales para `/en/models/`.
- [x] Internacionalizar todos los textos dinámicos de la plantilla.
  - [x] Portada, contadores, lista, agrupaciones y estados vacíos.
  - [x] Navegación principal y portadas de escuela, proceso, dimensión, tags y red.
  - [x] Autenticación, recuperación de contraseña, suscripción y pago.
  - [x] Paywalls de agrupaciones, previsualización pública y tabla comparativa de epistemologías.
  - [x] Ficha editorial principal: capítulos, acordeones y textos de contexto.
  - [x] Ficha específica de epistemologías, dossier crítico y visualizaciones auxiliares.
- [x] Añadir pruebas de navegación con historial y enlaces directos.

**Estado (2026-09-02):** la plantilla, la ficha editorial y las visualizaciones
auxiliares ya usan los diccionarios ES/EN. Esto incluye arquitectura,
genogramas, isomorfismos, controversia, debate crítico, contexto de origen,
secuencias, alianza, epistemología, dimensiones, procesos y mapas de influencia.
La sintaxis del JavaScript embebido y los dos diccionarios se valida en cada
ejecución de `npm run test:i18n`; ambos diccionarios contienen las mismas 701
claves. La suite cubre además enlaces directos, conservación de la ficha al
cambiar de idioma y actualización de enlaces al recorrer el historial.

La portada inglesa ya se genera como página estática revisada. Las fichas
inglesas solo se generan si su overlay público está en `reviewed`.

### 2. Esquema de traducciones en `tmps-data`

- [x] Crear `data/Core/i18n/en/` y un esquema de overlay.
- [x] Inventariar campos traducibles de los 284 JSON de modelos.
- [x] Asegurar `id` o `codigo` estable en todos los arrays traducibles.
  - [x] `conceptosClave`: 2.812 elementos con clave estable.
  - [x] `secuencias[].pasos`: 921 elementos con clave estable.
  - [x] Contexto de origen, epistemologías, controversia y módulos especiales.
  - [x] Tabla comparativa de epistemologías (documento auxiliar sin `id`).
- [x] Dar forma fusionable a los arrays de cadenas sueltas.
- [x] Evaluar la sustitución de relaciones basadas en etiquetas por IDs y
      descartar la migración automática cuando no exista una correspondencia
      inequívoca. La revisión opcional de 296 coincidencias no bloquea la i18n.
- [x] Crear fusión profunda por clave estable.
- [x] Validar campos desconocidos, IDs inexistentes y arrays sin clave.
- [x] Cubrir el contrato de fusión con pruebas automáticas.

Implementado en `tmps-data`:

- `data/Core/i18n/en/model-overlay.schema.json` documenta el contrato editorial,
  incluidas las dos formas admitidas de array traducido.
- `tools/i18n/field-classification.mjs` centraliza el vocabulario de campos. El
  inventario y la migración lo comparten, así que no pueden divergir: el
  inventario marca como bloqueante exactamente lo que la migración sabe resolver.
- `tools/i18n/json-ast.mjs` analiza JSON conservando posiciones, para insertar
  claves sin reformatear las fuentes canónicas.
- `tools/i18n/model-overlays.mjs` fusiona por `id`/`codigo` y, en los arrays de
  cadenas, por el texto español literal.
- `tools/i18n/model-overlays.test.mjs` fija el contrato con 17 pruebas, la mayoría
  de rechazo: traducciones sin clave, claves inexistentes, cambios de forma y
  campos canónicos protegidos.
- `tools/validate-i18n.mjs` comprueba estructura, referencias, estados y hash de
  la fuente española.
- `tools/inventory-i18n-fields.mjs` genera un inventario reproducible de campos,
  categorías y arrays que necesitan claves estables.
- `tools/migrate-i18n-stable-ids.mjs` asigna las claves que faltan de forma
  determinista y solo aditiva.
- `tools/report-i18n-relations.mjs` documenta las relaciones basadas en etiquetas
  sin modificar ningún JSON canónico.
- El overlay parcial de ACT prueba campos simples, objetos anidados, arrays por
  clave estable y arrays de cadenas por su texto. Sigue marcado como `draft`, por
  lo que no es publicable ni indexable.
- `npm run validate:i18n` ejecuta las pruebas, verifica que no falte ninguna clave
  estable y valida el piloto. Pasa sin errores ni avisos.

El inventario cubre los 284 JSON sin errores de parseo: 282 contienen un modelo
con `id` y dos son documentos auxiliares. Registra 416 rutas textuales, 108 rutas
de array y **0 rutas que bloqueen una fusión segura**. La primera migración añadió
2.704 IDs a conceptos y 921 a pasos. La segunda añadió 4.561 más y cerró los 48
bloqueos que quedaban:

| Zona | IDs añadidos |
| --- | --- |
| `modulosEspeciales`: datos, filas, celdas, columnas, posiciones, opciones, flechas, relaciones y leyenda | 3.417 |
| `contextoOrigen.huellaEnModelo` | 651 |
| `controversia.*` y `critica.*` | 295 |
| Fichas de epistemología (`supuestosPrincipales`, `implicacionesClinicas`, `tensiones`) y tabla comparativa (`rows`) | 132 |
| `ideasPrincipales` | 34 |
| Resto (`criticas`, `conceptos`, `procesos`, `secuencias[].fases`) | 32 |
| **Total** | **4.561** |

La migración se verificó comparando el árbol JSON antes y después: 283 archivos,
4.554 claves añadidas en la primera pasada y 7 en la segunda, ningún valor
modificado, ninguna clave eliminada y ninguna clave duplicada dentro de un array.
Los identificadores son legibles y deterministas
(`concepto_abbt_roemer_orsillo_2007_evitacion_experiencial`,
`fila_matriz_act_interior_contexto_eleccion_lo_que_se_nota`).

Quedan 22 rutas con 3.965 cadenas sueltas (`influencias`,
`contextoOrigen.influenciasIntelectuales`, `mecanismosDefensa`, `afinidades`…).
No bloquean: se traducen con la forma de mapa del overlay. Los resultados
completos están en `data/Core/i18n/en/field-inventory.json` y el resumen
editorial en `data/Core/i18n/en/FIELD_INVENTORY.md`.

No hay IDs de modelo duplicados. Se han documentado seis modelos cuyo ID no
coincide con el nombre del archivo; sus overlays deberán conservar el ID y
replicar la ruta relativa de la fuente.

#### Relaciones por etiqueta: revisión del plan

El plan daba por hecho que `influencias` y `modelosRelacionados` debían pasar a
referencias por ID. Los datos no lo sostienen y conviene dejarlo escrito antes de
ejecutar esa migración. De 1.591 valores de `influencias`, 1.309 nombran
conceptos o corrientes sin ficha en el catálogo, 280 coinciden con la etiqueta de
un modelo y 2 son ambiguos. En `modelosRelacionados`, de 57 valores, 5 ya son IDs,
11 coinciden por etiqueta, 4 apuntan al propio documento y 37 no resuelven.

Aplicar la resolución automática introduciría relaciones falsas. Casos reales:
«Conductismo contextual» cae en `pragmatismo-contextualismo-funcional`, y
`daseinsanalyse`, `terapias-postmodernas`, `contextual-behavioral-science` y
`terapia-familiar-sistemica` resuelven al documento que los contiene.

**Decisión editorial (2026-09-02):** una influencia sin ficha en el repositorio
es válida y no hay que crearla ni forzarla a un ID. `influencias` es un campo de
texto por diseño, no un índice de referencias. Los 1.309 valores sin ficha no son
deuda: son conceptos, corrientes y tradiciones que se nombran sin tener entrada
propia. Se traducen como texto y ya está.

Lo que sigue teniendo sentido revisar son las 296 propuestas donde la etiqueta sí
coincide con un modelo del catálogo, por si conviene enlazarlas. `npm run
report:i18n-relations` las genera en `data/Core/i18n/en/RELATIONS.md` y
`relations-report.json`, y no escribe nada en los JSON canónicos.

### 3. Escuelas, procesos y taxonomías

- [x] Crear el manifiesto inglés de resúmenes de la biblioteca.
- [x] Traducir los nombres de escuela en pantalla.
- [x] Traducir las descripciones largas de cada escuela.
- [x] Traducir procesos, subprocesos y dimensiones de cambio.
- [x] Traducir tags, tipos, facetas y etiquetas de filtros.
- [x] Vocabulario compartido de países, ciudades e instituciones.
- [ ] Localizar tablas epistemológicas e isomorfismos.
  - [x] Las filas de `epistemologia/tabla-comparativa.json` ya tienen clave
        estable, de modo que el overlay puede fusionarlas.
  - [x] La app admite overlays `reviewed` de documentos auxiliares sin exigir
        un `id` raíz; la tabla comparativa ya pasa por esa fusión.
  - [x] Crear y revisar el overlay inglés completo de la tabla comparativa.
  - [ ] Localizar los isomorfismos cuando se reactive esa fuente de datos.
- [x] Usar el locale activo para búsqueda, ordenación y plurales.

#### Manifiesto de la biblioteca

La portada se construye con `Core/escuelas/index.json` y, por escuela,
`Core/escuelas/<id>.json`. Sus resúmenes alimentan la lista, los filtros, la
línea temporal y el mapa: sin traducirlos, la portada inglesa se veía en español
hasta abrir una ficha.

El manifiesto es **derivado**, no una segunda traducción. `npm run
build:i18n-manifest` genera `Core/i18n/en/escuelas/<id>.json` leyendo los
overlays de ficha que ya existen. Traducir un modelo traduce automáticamente su
entrada en la lista, y no hay dos textos que puedan divergir. Una escuela sin
ninguna ficha traducida no genera archivo y la app no lo pide.

| Campo del resumen | Origen | Dónde se aplica |
| --- | --- | --- |
| `label`, `templabel` | overlay del propio modelo | manifiesto |
| `influencias` | overlay del propio modelo, forma de mapa | manifiesto |
| `tipo`, `pais`, `ciudad`, `universidad` | `taxonomias.json` | al pintar |
| nombre de escuela (`grupo`) | `taxonomias.json` | al pintar |

**Por qué las taxonomías no se fusionan en los datos.** `grupo` y `tipo` no son
etiquetas, son claves funcionales. La app las usa para el color de cada escuela,
el orden de la lista, el texto editorial por escuela, la detección de
epistemologías (`tipo === 'epistemologia'`) y la ruta de las carpetas de
justificación de los grafos de influencia. Sustituir su valor habría roto las
cinco cosas a la vez. Por eso el manifiesto solo sustituye texto libre y el
vocabulario compartido se resuelve en el momento de pintar, con
`localeTaxonomyLabel()`. Es lo que ya pedía el principio 2 de este documento.

`data/Core/i18n/en/taxonomias.json` es la parte editable a mano: 13 nombres de
escuela, 5 tipos, 39 países, 44 ciudades y 15 instituciones. Un valor sin entrada
se muestra en español y aparece como pendiente en `MANIFEST_COVERAGE.md`.

**Estado de la última consolidación (2026-09-02):** 8 manifiestos ingleses
generados, 250 resúmenes analizados, 28 títulos traducidos y 539 valores de
taxonomía resueltos al pintar. Las 12 escuelas disponen además de subtítulo, descripción y
conceptos clave editoriales en español e inglés. Solo 1 resumen tenía título
inglés al crear el manifiesto inicial; las tandas posteriores se incorporan al
regenerarlo. El cuello de botella ya no es el mecanismo, es el volumen de
traducción.

### 4. Generadores y API

- [x] Adaptar `build-public-models.mjs` para producir overlays públicos.
- [x] Permitir las rutas localizadas en `api/data.js` sin ampliar de forma
      accidental el acceso a datos privados.
- [x] Adaptar `build-model-pages.mjs` para construir ambos idiomas.
- [x] Crear manifiestos separados por locale y estado editorial.
- [x] Generar únicamente páginas inglesas revisadas.

Sobre la casilla de `api/data.js`: estaba marcada, pero el proxy no tenía ninguna
regla de i18n. Solo funcionaba porque `PUBLIC_LIBRARY_ACCESS` está abierto por
defecto y `isAllowedPath` acepta cualquier `.json`. Si la biblioteca volviera a
cerrarse, los overlays de modelos públicos habrían devuelto 401 mientras su
fuente española seguía siendo pública. Ahora la frontera es explícita: un overlay
es tan público como su fuente. `Core/i18n/<locale>/modelos-publicos/**`,
`Core/i18n/<locale>/escuelas/*.json` y `Core/i18n/<locale>/taxonomias.json` son
públicos; `Core/i18n/<locale>/modelos/**` sigue exigiendo sesión y suscripción,
igual que `Core/modelos/**`.

`build-public-models.mjs --i18n-only en` proyecta solo los campos que ya son
públicos y rechaza `draft` y `machine_translated`. El build de la app produce
árboles separados en `public/modelos/<id>/` y `public/en/models/<id>/`, además
de una portada estática `public/en/models/index.html`. Un verificador posterior
al build comprueba el estado editorial y todos los metadatos de cada salida
inglesa. En la última consolidación había 32 overlays públicos revisados.

### 5. SEO bilingüe

- [x] Generar `lang`, canonical, Open Graph y JSON-LD por idioma.
- [x] Añadir `hreflang="es"`, `hreflang="en"` y `x-default`.
- [x] Añadir las dos versiones al sitemap con enlaces alternativos.
- [x] Aplicar `noindex` a traducciones parciales o borradores.
- [x] Traducir breadcrumbs y fallback `noscript`.

El sitemap solo incorpora una URL inglesa cuando existe una página pública
revisada. Las rutas de fichas inglesas apuntan al árbol estático generado, de
modo que un ID sin traducción publicada no cae silenciosamente en una ficha
dinámica española. La portada inglesa también es estática e indexable.

### 6. Flujo editorial

- [x] Definir glosario clínico ES-EN y guía de estilo.
- [x] Clasificar todos los campos textuales del esquema.
- [x] Usar estados `draft`, `machine_translated` y `reviewed`.
- [x] Guardar un hash de la fuente para detectar traducciones obsoletas.
- [x] Crear informe de cobertura por modelo y por campo.
- [x] Automatizar lotes `machine_translated` con exportación e importación segura.
- [x] Separar la promoción a `reviewed` mediante una puerta editorial explícita.
- [x] Revisar clínicamente los procedimientos y microintervenciones de las 11
      fichas completas.
- [ ] Repetir la revisión clínica en cada nuevo lote antes de publicarlo.

#### Clasificación completa del esquema

La categoría `review` («campos pendientes de clasificación manual») ha pasado de
131 rutas a **0**. Era un problema real, no cosmético: mezclaba prosa editorial
con cableado de las visualizaciones, y eso falseaba el denominador de cualquier
medida de cobertura.

- A `preserve`: los extremos y puertos de las aristas de `modulosEspeciales`, la
  configuración de mapa, la zona de un nodo, la fase de un paso, `ref`/`refTipo`,
  `tensiones[].con` y el periodo de un hito. Son claves de enlace, no texto.
- A `overlay`: `neimeyer.*`, `alianzaModelo.*`, `wampold.*`, las justificaciones
  de procesos y dimensiones, `contextoOrigen.huellaEnModelo.*`, `controversia.*`,
  `critica.*`, `aplicacionClinica.*` y las filas de la tabla comparativa.
- A `taxonomy`: `universidad`, `notaEscuela` y `subgrupo`.

Para distinguirlos hizo falta clasificar **por ruta y no solo por clave**: `origen`
es prosa dentro de `contextoOrigen.huellaEnModelo` y el nodo de partida de una
arista dentro de `modulosEspeciales`. El total de campos traducibles baja de
59.878 a 53.606, que es la cifra real.

#### Glosario y cobertura

- `data/Core/i18n/en/glosario.json` fija 80 términos con su traducción acordada,
  agrupados por dominio, más las reglas de estilo (inglés británico, nombres
  propios sin traducir, términos técnicos establecidos).
- Registra las decisiones que no son obvias: `yo` es `ego` y nunca `self`;
  `esquema` es `scheme` en Piaget y `schema` en Beck; `interpretaciones negativas`
  es `negative appraisals`, el término de Ehlers y Clark, no `interpretations`.
  Las entradas con dos traducciones llevan `escuela` y el comprobador solo las
  aplica a los modelos de esa escuela.
- `npm run report:i18n-glossary` publica `GLOSARIO.md` y revisa las fichas ya
  traducidas: 420 pares de campo español/inglés, 14 términos con desajustes que
  quedan listados para revisión. Son avisos, no errores: a veces la frase se
  reformula y el término desaparece de forma legítima.
- `npm run report:i18n-coverage` publica `COVERAGE.md`. Cuenta un campo como
  traducido cuando el overlay declara su clave, no cuando el texto cambia, de modo
  que un término que se escribe igual en los dos idiomas no aparece como
  pendiente. Con `-- --model <id> --missing` lista exactamente lo que falta, que
  es el modo en que se traduce una ficha hasta el 100 %.

### 7. Piloto y despliegue gradual

- [x] Traducir de tres a cinco modelos que cubran el esquema más complejo.
- [x] Revisar y pasar a `reviewed` las 11 fichas completas del piloto ampliado.
- [ ] Verificar escritorio, móvil, búsqueda, filtros y enlaces profundos.
- [ ] Revisar que la página inglesa no contenga textos españoles inesperados.
- [x] Aplicar una puerta que publique solo modelos con traducción `reviewed`.
- [ ] Ampliar progresivamente hasta completar el catálogo.

#### Piloto inicial de ocho fichas y ampliación a once

Seis escuelas distintas, elegidas por cobertura de esquema y no por tamaño.
Todas al **100 % de cobertura** y validando sin errores ni avisos:

| Modelo | Escuela | Campos | Caracteres | Secciones que estrena |
| --- | --- | --- | --- | --- |
| `constructivismo-genetico-piaget-1936` | Constructivista | 51 | 9.289 | `neimeyer` |
| `mindfulness-mbsr-contemplativo-1979` | Transversal | 59 | 11.808 | — |
| `conductismo-clasico-watson-1913` | Conductismo | 107 | 14.421 | `conceptosClave`, `procedimientos`, `micros` |
| `relaciones-objeto-fairbairn` | Psicoanálisis | 114 | 17.036 | `alianzaModelo`, justificaciones de procesos y dimensiones, `summary` |
| `condicionamiento-clasico-pavlov-1927` | Conductismo | 150 | 20.485 | — |
| `cognitive-therapy-ptsd-ehlers-clark-2000` | Cognitivo | 129 | 21.180 | `secuencias` con sus pasos |
| `terapia-centrada-soluciones-1982` | Sistémico | 103 | 21.542 | — |
| `ruler-yale-emotional-intelligence-2012` | Cognitivo | 154 | 22.366 | **`modulosEspeciales`**: matriz, mapa y ciclo |

Entre las ocho cubren todas las secciones del esquema: `descripcion`, `frase`,
`summary`, `teoriaCambio`, `contextoOrigen` completo, `conceptosClave`,
`ideasPrincipales`, `procedimientos`, `micros`, `secuencias`, `modulosEspeciales`,
`neimeyer`, `alianzaModelo`, las dos justificaciones e `influencias`.

RULER cierra el último hueco con sus tres módulos de visualización: 61 campos
entre celdas de matriz, zonas y nodos de mapa, etiquetas de arista, leyenda y
pasos de ciclo. El informe de cobertura detectó de paso que la ficha tenía tres
secuencias y no una, que es exactamente para lo que sirve.

En Ehlers-Clark el `label` ya estaba en inglés en la fuente, así que el generador
del manifiesto no lo duplica. No es un fallo: la lista inglesa ya muestra el
título correcto.

Después del piloto inicial se añadieron tres fichas epistemológicas completas:
`construccionismo-narrativo`, `constructivismo-clinico-postracionalista` y
`contextualismo-funcional-act`. Codex revisó las once fichas completas y las
promovió a `reviewed`. El validador exige para ese estado `reviewedAt`, revisor,
checklist editorial completo y un hash de fuente vigente. ACT conserva un
overlay parcial en `draft` y no es publicable.

#### Un fallo de clasificación que aparecio al traducir modulos

Al preparar RULER se vio que `modulosEspeciales[].relaciones[].etiqueta` y
`.descripcion` estaban marcados como `preserve`. Era un error mío: al clasificar
el esquema colapsé todo el subárbol `relaciones` a `preserve` porque contiene
cableado (`origen`, `destino`, `trazado`, puertos), pero esas dos claves son
texto que la app pinta sobre el mapa.

Ahora la regla distingue dentro del mismo subárbol: las claves de prosa
(`etiqueta`, `titulo`, `subtitulo`, `nombre`, `descripcion`, `texto`) son
`overlay` y el resto sigue siendo `preserve`. Recupera **1.096 campos** que
habrían quedado en español en todos los mapas del catálogo. El total de campos
traducibles pasa de 53.944 a 55.040.

#### Esfuerzo medido

Este era el objetivo declarado del piloto, y ahora hay cifras en vez de
estimaciones:

- **867 campos y 138.127 caracteres** traducidos en las ocho fichas iniciales.
- Media real del catálogo: **195 campos y 38.763 caracteres por ficha**. Las ocho
  elegidas están por debajo de la media: se eligieron por cobertura de esquema,
  no por representatividad de tamaño.
- En el estado actual hay **11 fichas completas y revisadas**, una ficha parcial
  (`ACT`) y 270 sin overlay: quedan 271 fichas por completar y 53.203 campos por
  traducir, unos 10,7 millones de caracteres.
- La distribución es muy desigual: la ficha más pequeña tiene 533 caracteres y la
  mayor 180.548.

La consecuencia práctica: traducir el catálogo entero a mano no es un proyecto de
sesiones, es un proyecto de meses. El camino razonable es `machine_translated` +
revisión clínica por ficha, apoyado en el glosario para que la máquina no invente
un término distinto cada vez, y usando la cobertura por modelo como criterio de
«terminado». El estado `machine_translated` ya existe justamente para eso.

## Punto de reanudación

**Hecho en la sesión del 2026-09-02 (segunda parte).** La fase 2 queda cerrada en
lo estructural: todos los arrays traducibles son fusionables. Se completaron las
claves estables de contexto de origen, epistemologías, controversia, módulos
especiales y la tabla comparativa, y se dio salida a los arrays de cadenas
sueltas mediante la forma de mapa del overlay. El inventario pasa de 48 rutas
bloqueantes a 0.

**Hecho en la sesión del 2026-09-02 (tercera parte).** El manifiesto inglés de la
biblioteca ya funciona de extremo a extremo, con el vocabulario compartido
aplicado al pintar. Con esto el mecanismo está completo: no queda ninguna pieza
técnica entre traducir una ficha y verla en inglés en la portada.

**Hecho en la sesión del 2026-09-02 (cuarta parte).** Cerrado el piloto de la
fase 7 y la mayor parte de la fase 6. Ocho fichas completas al 100 % en seis
escuelas —incluida RULER con tres `modulosEspeciales`—, la categoría `review` del
esquema vaciada (131 rutas → 0), glosario de 80 términos con comprobador de
adherencia e informe de cobertura por modelo y campo. El esfuerzo por ficha ya
está medido y no estimado.

**Hecho en la sesión del 2026-09-02 (quinta parte).** Traducida la presentación
editorial de las 12 escuelas: subtítulo, descripción larga y conceptos clave.
`SCHOOL_INFO` conserva las etiquetas españolas como claves funcionales y elige
el contenido ES/EN según la ruta. La portada y la ficha de escuela muestran ahora
el nombre localizado sin cambiar el valor canónico usado por filtros, colores y
navegación. Se añadió también la ficha editorial que faltaba para
`Psicodélicos`.

**Hecho en la sesión del 2026-09-02 (sexta parte).** Adoptado el modelo de
producción por lotes solicitado: traducción automática completa con estado
`machine_translated`, seguida de revisión de Codex antes de publicar. El exportador
divide las fichas en fragmentos, aplica el glosario pertinente y genera paquetes
locales para traducir dentro de Codex, usando la suscripción y sin API. El importador reconstruye los
overlays por claves estables y cancela el lote completo ante resultados parciales,
claves desconocidas, hashes obsoletos o archivos preexistentes.

La promoción a `reviewed` es un comando distinto: exige cobertura del 100 %, hash
vigente, identificación del revisor y confirmación explícita de precisión clínica,
terminología, calidad lingüística y correspondencia con la fuente. Codex asume
esa revisión editorial antes de publicar cada lote. Se ha generado
un piloto local de tres fichas epistemológicas: 35 campos, 2.342 caracteres y
tres unidades de trabajo. El piloto Codex vive en
`tmps-data/tmp/i18n-batches/pilot-codex-20260902/`, fuera de Git. Su manifiesto
incluye la huella SHA-256 y el tamaño exacto de `work-items.jsonl`. Los IDs de
lote son inmutables y el exportador respeta los límites configurados de unidades,
bytes y caracteres.

Validación técnica cerrada: 28 pruebas superadas, 284 fuentes comprobadas sin
IDs estables pendientes y 18 overlays ingleses válidos, con 0 errores y 0
avisos. Este flujo no realiza llamadas de API ni genera costes por uso.

**Corrección de alcance acordada con el usuario.** Se ha retirado por completo
el envío mediante API y su comando asociado. Las traducciones se realizan en
esta conversación con Codex y la suscripción existente. Codex ha traducido las
tres fichas del piloto, las ha importado inicialmente como `machine_translated`
y ha completado después la revisión de las 11 fichas con cobertura total. Las
11 están ahora en estado `reviewed`; ACT, que sigue incompleta, permanece en
`draft`. El manifiesto público y la app rechazan cualquier overlay que no tenga
estado `reviewed`.

La última consolidación registra 3.439/54.124 campos (6,4 %), con 63 fichas
completas de 282. El control del glosario compara los 3.439 pares traducidos y
deja 27 desajustes como avisos editoriales trazables. Se aceptan como revisiones
válidas tanto las aprobadas por Codex como las aprobadas por Claude; la puerta de
publicación sigue exigiendo estado `reviewed`, hash vigente, revisor identificado
y checklist completo.

**Siguiente trabajo recomendado:**

1. Dejar que Claude continúe creando overlays de modelos, sin editar a la vez
   generadores, manifiestos ni informes derivados.
2. Al cerrar cada lote, ejecutar manifiesto, modelos públicos, cobertura,
   glosario y validación; después reconstruir la app para publicar solo el último
   estado coherente.
3. Retomar los isomorfismos cuando vuelva a activarse su fuente de datos; ahora
   están deshabilitados en la aplicación.
4. Hacer una prueba final de búsqueda, filtros, tabla epistemológica y navegación con datos reales en
   el despliegue de preproducción.
5. Revisar `data/Core/i18n/en/RELATIONS.md` solo si se quieren convertir en
   enlaces las 296 influencias que coinciden con un modelo. No bloquea la i18n.

**Último lote Codex (2026-09-02).** Se han traducido íntegramente y revisado las
fichas `posestructuralismo-discurso`,
`psicoterapia-basada-psicologia-india-1990` y
`terapia-pareja-conductual-tradicional-1979`: 217 campos y 42.971 caracteres de
fuente. Las tres están en estado `reviewed`, con cobertura del 100 %, hash
vigente y checklist editorial completo. No se ha iniciado ningún lote posterior.

**Punto exacto para reanudar (2026-09-02).** Las fases técnicas de navegación,
generación bilingüe y SEO están implementadas. `npm run validate:i18n` supera 32
pruebas, comprueba 284 fuentes y valida 105 artefactos ingleses —64 overlays de
ficha, 8 manifiestos, 32 overlays públicos y 1 documento auxiliar— sin errores
ni avisos. La app supera
10 pruebas propias y su build aislado genera 237 fichas españolas y 31 fichas
inglesas públicas, además de la portada inglesa estática.

Los cambios preexistentes de portada, navegación compartida y páginas SEO
españolas generadas por el otro agente siguen fuera de este trabajo. Los nuevos
overlays de modelos sí se aceptan tanto si el revisor registrado es Codex como
Claude, conforme a la decisión del usuario.

La app ya solicita `Core/i18n/en/modelos/<escuela>/<modelId>.json` en rutas
inglesas y solo lo fusiona si está en estado `reviewed`; en los demás casos
conserva el modelo español como fallback. La caché de sesión está separada por
locale.

Verificado en esta sesión:

- Los 4 bloques de JavaScript embebido de `public/modelos/index.html` se analizan
  sin error.
- La fusión de la app, extraída del propio archivo y ejecutada aislada, coincide
  con la de `tmps-data` en 5 fusiones y 5 rechazos.
- La frontera público/privado de `api/data.js` se comprueba sobre 13 rutas.
- La fusión real de ACT devuelve inglés en lo traducido, conserva el español en
  lo demás y no altera `year`, `grupo` ni el número de elementos.
- El manifiesto fusiona los 41 resúmenes de `cognitivo` conservando orden, IDs y
  cantidad; `templabel`, `year`, `lat`, `file`, `tipo` y `pais` quedan intactos, y
  un modelo sin overlay no cambia en absoluto.
- Los helpers de presentación de taxonomías, extraídos también de la plantilla,
  pasan 9 comprobaciones en `en` y en `es`, incluidos valores vacíos y nulos.
- Los dos diccionarios de interfaz tienen las mismas 701 claves.
- La puerta de publicación excluye `draft` y `machine_translated` tanto de las
  fichas individuales como del manifiesto de la portada.

- La portada y una ficha inglesa se comprobaron en navegador de escritorio; el
  selector conserva el ID al cambiar de idioma y el historial vuelve a la URL
  inglesa exacta.
- La portada inglesa se comprobó a 390 × 844 px sin desbordamiento horizontal.
- Queda una última pasada en preproducción con datos reales para búsqueda,
  filtros y contenido de todos los nuevos lotes.

## Criterios de aceptación del piloto

- Abrir `/en/models/` no redirige a la versión española.
- El selector cambia de idioma sin perder la ficha abierta.
- No se modifican IDs ni relaciones al fusionar una traducción.
- Una traducción incompleta no se indexa como página inglesa final.
- Buscador, filtros, gráficas, accesibilidad y mensajes de error usan el locale.
- El build falla ante IDs de traducción desconocidos o estructuras divergentes.
- Canonical, `hreflang`, sitemap y JSON-LD apuntan a las URLs correctas.

## Comandos

Disponibles en `tmps-data`:

```text
npm run validate:i18n          pruebas + claves estables + overlays
npm run test:i18n              solo el contrato de fusión
npm run inventory:i18n         regenera field-inventory.json y FIELD_INVENTORY.md
npm run migrate:i18n-ids       simulación; con -- --apply escribe
npm run report:i18n-relations  regenera relations-report.json y RELATIONS.md
npm run build:i18n-manifest    regenera el manifiesto de la biblioteca
npm run build:i18n-public-models proyecta overlays revisados al conjunto público
npm run report:i18n-coverage   regenera coverage.json y COVERAGE.md
npm run report:i18n-glossary   regenera GLOSARIO.md y revisa su cumplimiento
npm run export:i18n-batch      crea un paquete local para traducir en Codex
npm run import:i18n-batch      valida; con --apply crea machine_translated
npm run review:i18n            valida la revisión humana; con --apply promueve
```

Al traducir una ficha, el bucle de trabajo es:

```text
npm run report:i18n-coverage -- --model <id> --missing   qué falta
# escribir el overlay
npm run report:i18n-coverage -- --model <id>             comprobar el 100 %
npm run validate:i18n                                    hash y estructura
npm run build:i18n-manifest                              llevarlo a la portada
```

`validate:i18n` es la puerta de entrada: falla si una prueba del contrato no
pasa, si algún array traducible se quedó sin clave estable o si un overlay no
cuadra con su fuente, sean fichas o manifiesto.

Después de escribir un overlay de ficha o de tocar `taxonomias.json` hay que
ejecutar `build:i18n-manifest`, o la traducción no llega a la lista.

Comandos disponibles en `modelos-app`:

```text
npm run test:i18n              contrato de rutas, locale, API, plantilla y SEO
npm run build:model-pages      genera fichas ES/EN y portada inglesa
npm run validate:generated-i18n verifica todas las salidas inglesas
npm run seo:build              genera sitemap y robots bilingües
npm run build                  ejecuta generación, validación y SEO
```
