# Aplicaciones del atlas de Tu Mentor

El Atlas de la Psicoterapia es una herramienta de Tu Mentor compuesta por varias aplicaciones que observan el mismo corpus desde perspectivas distintas. La portada (`/`) actúa como entrada editorial y conduce, por ahora, a cinco recorridos públicos: Biblioteca, Genealogía, Mapamundi, Metamodelos y Quiz.

## Mapa de aplicaciones

| Aplicación | Ruta | Qué permite hacer | Estética y lenguaje visual | Relación con el resto |
| --- | --- | --- | --- | --- |
| **Portada / Atlas** | `/` | Presenta el proyecto, sitúa su escala histórica y propone los cinco recorridos principales. | Portada editorial cinematográfica: archivo nocturno, negros profundos, luz tungsteno, papel envejecido, tipografía serif y acentos dorados. La interfaz se reduce al mínimo para que el relato y las imágenes lleven el peso. | Es el distribuidor central. No duplica las herramientas: introduce cada una y enlaza con su experiencia completa. |
| **Biblioteca de modelos** | `/modelos/` | Buscar, filtrar, leer y comparar fichas de modelos psicoterapéuticos: fundamentos, autores, técnicas, influencias, dimensiones y referencias. | Archivo clínico contemporáneo, oscuro y preciso. Paneles densos, jerarquía tipográfica clara y acento verde frío para distinguir datos, filtros y relaciones. | Es la ficha base del sistema. Los modelos que aparecen en Genealogía, Mapamundi y Quiz remiten conceptualmente a esta biblioteca. |
| **Genealogía** | `/genealogia/` | Explorar escuelas, autores, años y vínculos de influencia como un linaje histórico interactivo. | Atlas histórico nocturno: carbón, marfil y oro; líneas finas, cristal oscuro y una composición de mapa o constelación. | Convierte las fichas individuales de la Biblioteca en una red temporal de ascendencias, rupturas e influencias. |
| **Mapamundi** | `/mapamundi/` | Situar escuelas y modelos según sus ciudades y lugares de origen, y recorrer la expansión geográfica de las ideas. | Cartografía editorial con modo oscuro y claro, textura de mapa, tonos sepia contenidos, paneles translúcidos y acento dorado. | Añade la dimensión espacial a los años y relaciones de Genealogía; cada punto representa entidades que también existen en la Biblioteca. |
| **Metamodelos** | `/metamodelos/` | Explicar qué elementos producen cambio terapéutico a través de factores comunes, relación, expectativas y marcos integradores. | Ensayo visual: papel cálido o carbón, grandes titulares serif, ilustraciones, cifras y gráficos sobrios. Tiene un ritmo más pausado y divulgativo que las aplicaciones exploratorias. | Reorganiza el corpus por mecanismos transversales: permite leer juntos modelos que históricamente pertenecen a escuelas diferentes. |
| **Quiz** | `/quiz/` | Reconocer modelos a partir de pistas y poner a prueba el criterio clínico con una interacción breve y progresiva. | Juego editorial, no arcade: fondos oscuros o papel, serif protagonista, oro como guía y colores discretos para acierto y error. | Transforma el contenido de la Biblioteca en aprendizaje activo y refuerza diferencias entre modelos y escuelas. |

## Aplicaciones en construcción

Estas rutas existen en el repositorio, pero no forman parte de la navegación de la portada mientras se terminan:

- **Procesos** (`/procesos/`): organiza técnicas, procedimientos y microintervenciones por procesos y subprocesos de cambio.
- **Isomorfismos** (`/isomorfismos/`): agrupa operaciones clínicas equivalentes que aparecen con nombres distintos en modelos y escuelas diferentes.

No deben presentarse todavía como recorridos disponibles para el público.

## Variantes y áreas auxiliares

- `/modelosnou/` es una variante del explorador de modelos. No es la entrada principal mientras `/modelos/` siga siendo la Biblioteca pública.
- `/genealogia2/` contiene una variante o iteración alternativa de Genealogía. La ruta pública presentada desde la portada es `/genealogia/`.
- Las páginas generadas bajo `/modelos/<id>/` son versiones indexables de fichas concretas. El script `scripts/build-model-pages.mjs` las genera durante el build.

## Una estética común

Aunque cada aplicación tiene una función propia, todas pertenecen al mismo mundo visual:

- **Editorial antes que instrumental:** grandes titulares, aire, ritmo de capítulo y textos breves que orientan sin explicar en exceso.
- **Cinematográfico y documental:** fotografía histórica cuidada, luz lateral, grano sutil, materiales táctiles y ausencia de recursos visuales genéricos.
- **Paleta compartida:** carbón, negro, marfil, papel, tabaco y oro. Los colores secundarios aparecen solo cuando ayudan a leer datos o estados.
- **Tipografía con dos voces:** serif expresiva para relato y contexto; sans serif contenida para navegación, cifras, filtros y metadatos.
- **Movimiento funcional:** transiciones lentas, líneas que conectan y revelados discretos. La animación sirve para mostrar relaciones, no como adorno.
- **Interfaces reales:** la portada muestra fragmentos de las aplicaciones, sin encerrarlas en maquetas de ordenadores o navegadores.

## Cómo se conectan

```text
                         ┌── Genealogía: cuándo y de quién procede
                         ├── Mapamundi: dónde aparece y se desplaza
Portada ── Biblioteca ───┼── Metamodelos: qué mecanismos comparte
                         └── Quiz: cómo se reconoce y se aprende

Repositorio de datos ── /api/data ── todas las aplicaciones públicas
                 │
                 └── Supabase y Stripe: cuenta, acceso y suscripción
```

La fuente de conocimiento vive en el repositorio de datos canónicos. En producción, las aplicaciones solicitan esos JSON a través de la función serverless `api/data.js`. Esa función consulta el repositorio de datos con credenciales de servidor, filtra las rutas permitidas y evita que el token de GitHub llegue al navegador.

Las aplicaciones comparten la sesión de Supabase mediante la clave local `tmp-shared-auth-v1`. Las funciones de `api/` gestionan el estado de suscripción y la integración con Stripe. De este modo, la navegación puede cambiar de herramienta sin convertir cada aplicación en un producto aislado.

## Recorrido conceptual de ejemplo

Una misma entidad puede leerse de varias formas: **Carl Rogers** abre una ficha en Biblioteca; aparece en un linaje humanista dentro de Genealogía; se sitúa en Chicago en Mapamundi; su énfasis en la alianza y la experiencia emocional reaparece en Metamodelos; y sus rasgos distintivos pueden convertirse en una pregunta del Quiz. Esa continuidad es la idea central del atlas: cambiar la perspectiva sin perder el objeto de estudio.
