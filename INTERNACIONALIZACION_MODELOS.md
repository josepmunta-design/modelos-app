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
- [ ] Añadir pruebas de navegación con historial y enlaces directos.

**Estado (2026-09-02):** la plantilla, la ficha editorial y las visualizaciones
auxiliares ya usan los diccionarios ES/EN. Esto incluye arquitectura,
genogramas, isomorfismos, controversia, debate crítico, contexto de origen,
secuencias, alianza, epistemología, dimensiones, procesos y mapas de influencia.
La sintaxis del JavaScript embebido y los dos diccionarios se ha validado; ambos
diccionarios contienen las mismas 554 claves.

La ruta inglesa de esta fase es una previsualización técnica. No se considera
lista para publicación ni para SEO mientras conserve secciones españolas.

### 2. Esquema de traducciones en `tmps-data`

- [x] Crear `data/Core/i18n/en/` y un esquema de overlay.
- [x] Inventariar campos traducibles de los 283 JSON de modelos.
- [x] Asegurar `id` o `codigo` estable en todos los arrays traducibles.
  - [x] `conceptosClave`: 2.812 elementos con clave estable.
  - [x] `secuencias[].pasos`: 921 elementos con clave estable.
  - [x] Contexto de origen, epistemologías, controversia y módulos especiales.
  - [x] Tabla comparativa de epistemologías (documento auxiliar sin `id`).
- [x] Dar forma fusionable a los arrays de cadenas sueltas.
- [ ] Sustituir relaciones basadas en etiquetas por relaciones basadas en IDs.
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

El inventario cubre los 283 JSON sin errores de parseo: 281 contienen un modelo
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
- [ ] Traducir las descripciones largas de cada escuela.
- [ ] Traducir procesos, subprocesos y dimensiones de cambio.
- [ ] Traducir tags, tipos, facetas y etiquetas de filtros.
- [x] Vocabulario compartido de países, ciudades e instituciones.
- [ ] Localizar tablas epistemológicas e isomorfismos.
  - [x] Las filas de `epistemologia/tabla-comparativa.json` ya tienen clave
        estable, de modo que el overlay puede fusionarlas.
  - [ ] La app solo aplica overlays a rutas `modelos/` con `id` de modelo, así
        que este documento auxiliar todavía no se traduce en pantalla.
- [ ] Usar el locale activo para búsqueda, ordenación y plurales.

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

**Estado:** 12 escuelas y 249 resúmenes analizados; 537 valores de taxonomía se
traducen al pintar. Solo 1 resumen tiene título inglés, porque solo ACT tiene
overlay de ficha. El cuello de botella ya no es el mecanismo, es el volumen de
traducción.

### 4. Generadores y API

- [ ] Adaptar `build-public-models.mjs` para producir overlays públicos.
- [x] Permitir las rutas localizadas en `api/data.js` sin ampliar de forma
      accidental el acceso a datos privados.
- [ ] Adaptar `build-model-pages.mjs` para construir ambos idiomas.
- [ ] Crear manifiestos separados por locale y estado editorial.
- [ ] Generar únicamente páginas inglesas revisadas.

Sobre la casilla de `api/data.js`: estaba marcada, pero el proxy no tenía ninguna
regla de i18n. Solo funcionaba porque `PUBLIC_LIBRARY_ACCESS` está abierto por
defecto y `isAllowedPath` acepta cualquier `.json`. Si la biblioteca volviera a
cerrarse, los overlays de modelos públicos habrían devuelto 401 mientras su
fuente española seguía siendo pública. Ahora la frontera es explícita: un overlay
es tan público como su fuente. `Core/i18n/<locale>/modelos-publicos/**`,
`Core/i18n/<locale>/escuelas/*.json` y `Core/i18n/<locale>/taxonomias.json` son
públicos; `Core/i18n/<locale>/modelos/**` sigue exigiendo sesión y suscripción,
igual que `Core/modelos/**`.

### 5. SEO bilingüe

- [ ] Generar `lang`, canonical, Open Graph y JSON-LD por idioma.
- [ ] Añadir `hreflang="es"`, `hreflang="en"` y `x-default`.
- [ ] Añadir las dos versiones al sitemap con enlaces alternativos.
- [ ] Aplicar `noindex` a traducciones parciales o borradores.
- [ ] Traducir breadcrumbs y fallback `noscript`.

### 6. Flujo editorial

- [x] Definir glosario clínico ES-EN y guía de estilo.
- [x] Clasificar todos los campos textuales del esquema.
- [x] Usar estados `draft`, `machine_translated` y `reviewed`.
- [x] Guardar un hash de la fuente para detectar traducciones obsoletas.
- [x] Crear informe de cobertura por modelo y por campo.
- [ ] Revisar clínicamente procedimientos y microintervenciones.

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
- [ ] Revisión clínica de las cuatro fichas para pasarlas a `reviewed`.
- [ ] Verificar escritorio, móvil, búsqueda, filtros y enlaces profundos.
- [ ] Revisar que la página inglesa no contenga textos españoles inesperados.
- [ ] Publicar solo los modelos con traducción revisada.
- [ ] Ampliar progresivamente hasta completar el catálogo.

#### Las cuatro fichas piloto

Cuatro escuelas distintas, elegidas por cobertura de esquema y no por tamaño.
Todas al **100 % de cobertura** y validando sin errores ni avisos:

| Modelo | Escuela | Campos | Caracteres | Secciones que estrena |
| --- | --- | --- | --- | --- |
| `constructivismo-genetico-piaget-1936` | Constructivista | 51 | 9.289 | `neimeyer` |
| `conductismo-clasico-watson-1913` | Conductismo | 107 | 14.421 | `conceptosClave`, `procedimientos`, `micros` |
| `relaciones-objeto-fairbairn` | Psicoanálisis | 114 | 17.036 | `alianzaModelo`, justificaciones de procesos y dimensiones, `summary` |
| `cognitive-therapy-ptsd-ehlers-clark-2000` | Cognitivo | 129 | 21.180 | `secuencias` con sus pasos |

Entre las cuatro cubren `descripcion`, `frase`, `summary`, `teoriaCambio`,
`contextoOrigen` completo, `conceptosClave`, `ideasPrincipales`, `procedimientos`,
`micros`, `secuencias`, `neimeyer`, `alianzaModelo`, las dos justificaciones y
`influencias`. Queda sin estrenar `modulosEspeciales`, que es la sección más
voluminosa del catálogo y merece una ficha piloto propia.

Las cuatro están en `draft`. Pasarlas a `reviewed` es una decisión clínica, no
técnica: el validador ya exige para ese estado un `reviewedAt` y un hash de fuente
vigente.

#### Esfuerzo medido

Este era el objetivo declarado del piloto, y ahora hay cifras en vez de
estimaciones:

- **401 campos y 61.926 caracteres** traducidos en las cuatro fichas.
- Media real del catálogo: **191 campos y 38.341 caracteres por ficha**, con
  mediana de 31.126. Las cuatro elegidas están por debajo de la media: se
  eligieron por cobertura de esquema, no por representatividad de tamaño.
- Quedan **277 fichas y 53.186 campos**, unos 10,7 millones de caracteres.
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
fase 7 y la mayor parte de la fase 6. Cuatro fichas completas al 100 % en cuatro
escuelas, la categoría `review` del esquema vaciada (131 rutas → 0), glosario de
80 términos con comprobador de adherencia, e informe de cobertura por modelo y
campo. El esfuerzo por ficha ya está medido y no estimado.

**Siguiente trabajo recomendado:**

1. Decidir el modelo de producción para las 277 fichas restantes. Traducirlas a
   mano no es viable en un plazo razonable; el estado `machine_translated` existe
   precisamente para esto, y el glosario y la cobertura por ficha dan el control
   de calidad. Es una decisión de proceso, no técnica.
2. Traducir una ficha con `modulosEspeciales`, la única sección voluminosa que el
   piloto no estrena y la que más claves estables consumió (3.417 de 4.561).
3. Revisión clínica de las cuatro fichas piloto para pasarlas a `reviewed` y
   poder publicarlas.
4. Traducir las descripciones largas de escuela, que el manifiesto no cubre
   porque no existe overlay de `Core/escuelas/<id>.json` escrito a mano.
5. Extender la fusión de overlays a los documentos que hoy no la reciben: la
   tabla comparativa de epistemologías y los modelos públicos.
6. Revisar `data/Core/i18n/en/RELATIONS.md` si se quiere convertir en enlaces las
   296 influencias que coinciden con un modelo del catálogo. No bloquea nada.

La app ya solicita `Core/i18n/en/modelos/<escuela>/<modelId>.json` en rutas
inglesas, lo fusiona con el modelo español y conserva como fallback cualquier
campo todavía no traducido. La caché de sesión está separada por locale.

Verificado en esta sesión, sin navegador:

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
- Los dos diccionarios de interfaz siguen teniendo las mismas 554 claves.

Sigue pendiente la validación visual en navegador: no había instancia conectada.

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
npm run report:i18n-coverage   regenera coverage.json y COVERAGE.md
npm run report:i18n-glossary   regenera GLOSARIO.md y revisa su cumplimiento
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

Comandos todavía previstos en `modelos-app`:

```text
npm run build:public-models
npm run build:model-pages
npm run seo:build
```
