# Copias de la portada antes del nuevo Atlas

Guardadas el 6 de septiembre de 2026, antes de sustituir `public/index.html`.

- `index.local-before.html`: copia exacta de la portada local, que ya tenía cambios sin confirmar.
- `index.production-before.html`: HTML descargado de `https://apps.tumentorpsicologia.com/`; era distinto del archivo local.

SHA-256:

```text
index.local-before.html       e7606dc099b1f00db9488a4571cc56237b1a5efca84fb5f697b4f8028ee40c09
index.production-before.html  28cee9be1b022597ad181658143eaa43085bf76c7ff65ac9e8ea0b3f9fff21a0
```

Para restaurar, copiar la versión elegida a `public/index.html` y desplegar mediante el flujo habitual de Vercel. Las dependencias externas de cada copia se conservan en su HTML; estos archivos respaldan la portada, no los servicios externos.

La nueva portada usa únicamente `/assets/atlas-home/` para sus imágenes, CSS y JavaScript, y enlaza las cuatro vistas existentes con `?view=list`, `?view=network`, `?view=map` y `?view=genealogy`.

La dirección final es oscura y da protagonismo a las cuatro vistas. Las imágenes se reutilizaron de `assets/fotos/` y `assets/landing/`; no son nuevas fotografías documentales. Las cuatro escenas usan Canvas 2D, admiten pausar el movimiento y respetan `prefers-reduced-motion`. Los enlaces funcionan sin JavaScript. La animación se detiene al salir de pantalla y en pestañas ocultas, con un límite de 30 fps y resolución limitada.

`land.json` contiene arcos geográficos de `world-atlas@2.0.2/land-110m.json` (Natural Earth), convertidos de TopoJSON a coordenadas longitud/latitud, sin dependencias de ejecución. Su licencia se incluye junto al archivo.

Validación: build completo con el repositorio de datos local y salida aislada para preservar los artefactos existentes; 251 páginas ES y 186 EN generadas, validación i18n y SEO correctas; 10 pruebas del Atlas correctas.
