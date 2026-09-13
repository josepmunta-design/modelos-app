import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Paginas de escuela: /escuelas/<id>/
 *
 * Son las paginas hub del Atlas. Existen por dos razones:
 *
 * 1. Posicionan por los terminos amplios que una ficha suelta no alcanza
 *    ("terapia sistemica", "psicoanalisis relacional", "terapias contextuales").
 * 2. Dan jerarquia a las 260 fichas. Un sitemap plano de 445 URLs sin
 *    estructura es lo peor para el rastreo: Google no sabe que es importante.
 *
 * El texto editorial vive en escuelas-contenido.json. El listado de modelos se
 * deriva del corpus que ya carga build-model-pages.mjs, asi que no hay dos
 * fuentes de verdad ni datos que se queden atras.
 */

const BASE_URL = String(process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com')
  .replace(/\/+$/, '');

const CONTENIDO_PATH = new URL('./escuelas-contenido.json', import.meta.url);

export async function loadEscuelasContenido() {
  const raw = await fs.readFile(CONTENIDO_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.escuelas)) {
    throw new Error('escuelas-contenido.json debe exponer un array en "escuelas"');
  }
  return parsed.escuelas;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForHtml(value) {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

/* El campo `grupo` del corpus no esta normalizado: conviven 'Sistemico' y
   'sistemico', 'Fronteras' y 'fronteras'. Se comparan sin acentos, sin
   mayusculas y sin espacios de mas para que una diferencia tipografica no deje
   un modelo fuera de su escuela. */
function normalizaGrupo(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/* Los modelos de una escuela, mas recientes al final: la lista se lee como un
   recorrido historico, que es como se entiende una tradicion. */
export function modelosDeEscuela(escuela, todosLosModelos) {
  // `alias` recoge valores erroneos que hay en los datos y que conviene
  // arreglar en tmps-data; mientras tanto, evitan perder modelos.
  const nombres = new Set(
    [escuela.grupo, ...(escuela.alias || [])].map(normalizaGrupo)
  );

  return todosLosModelos
    .filter((m) => nombres.has(normalizaGrupo(m?.grupo)))
    .sort((a, b) => {
      const ya = Number.isFinite(a?.year) ? a.year : Number.POSITIVE_INFINITY;
      const yb = Number.isFinite(b?.year) ? b.year : Number.POSITIVE_INFINITY;
      if (ya !== yb) return ya - yb;
      return String(a?.label || '').localeCompare(String(b?.label || ''), 'es');
    });
}

function rangoDeAnios(modelos) {
  const years = modelos.map((m) => m?.year).filter((y) => Number.isFinite(y)).sort((a, b) => a - b);
  if (!years.length) return null;
  return { desde: years[0], hasta: years[years.length - 1] };
}

function renderListaModelos(modelos) {
  if (!modelos.length) return '';

  const items = modelos.map((m) => {
    const year = Number.isFinite(m?.year) ? `<span class="ee-year">${m.year}</span>` : '<span class="ee-year ee-year-na">—</span>';
    const autores = m?.autores ? `<span class="ee-autores">${escapeHtml(m.autores)}</span>` : '';
    return `        <li>
          ${year}
          <a href="/modelos/${encodeURIComponent(m.id)}">${escapeHtml(m.label)}</a>
          ${autores}
        </li>`;
  }).join('\n');

  return `      <ol class="ee-modelos">\n${items}\n      </ol>`;
}

function structuredData(escuela, modelos, url) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: `${escuela.titulo} | Atlas de la psicoterapia`,
        description: escuela.descripcionMeta,
        inLanguage: 'es',
        isPartOf: { '@id': `${BASE_URL}/#website` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#lista` }
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#lista`,
        name: `Modelos de la tradición ${escuela.titulo}`,
        numberOfItems: modelos.length,
        itemListElement: modelos.map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: m.label,
          url: `${BASE_URL}/modelos/${encodeURIComponent(m.id)}`
        }))
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Atlas de la psicoterapia', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Escuelas', item: `${BASE_URL}/escuelas/` },
          { '@type': 'ListItem', position: 3, name: escuela.titulo, item: url }
        ]
      }
    ]
  };
}

export function renderEscuelaPage(escuela, modelos) {
  const url = `${BASE_URL}/escuelas/${encodeURIComponent(escuela.id)}/`;
  const rango = rangoDeAnios(modelos);
  const parrafos = (escuela.intro || []).map((p) => `      <p>${escapeHtml(p)}</p>`).join('\n');
  const titulo = `${escuela.titulo} | Modelos de psicoterapia`;

  const cifras = [
    `${modelos.length} ${modelos.length === 1 ? 'modelo' : 'modelos'}`,
    rango ? `${rango.desde}–${rango.hasta}` : null
  ].filter(Boolean).join(' · ');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(titulo)}</title>
  <meta name="description" content="${escapeHtml(escuela.descripcionMeta)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
  <meta name="theme-color" content="#0b0e0c">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/png" href="/assets/atlas-home/logo.png">
  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Tu Mentor Psicología">
  <meta property="og:title" content="${escapeHtml(titulo)}">
  <meta property="og:description" content="${escapeHtml(escuela.descripcionMeta)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE_URL}/assets/atlas-home/library.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(titulo)}">
  <meta name="twitter:description" content="${escapeHtml(escuela.descripcionMeta)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/escuelas/escuela.css">
  <link rel="stylesheet" href="/assets/lista-espera.css">
  <script src="/assets/track.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="/assets/lista-espera.js"></script>
  <script type="application/ld+json">${safeJsonForHtml(structuredData(escuela, modelos, url))}</script>
</head>
<body>
  <div class="grain" aria-hidden="true"></div>
  <header class="masthead">
    <a class="brand" href="/" aria-label="Tu Mentor · Inicio"><span class="brand-symbol" aria-hidden="true">✳</span><span>TU MENTOR<span class="brand-sub">PSICOLOGÍA</span></span></a>
    <nav aria-label="Navegación principal"><a href="/escuelas/">Todas las escuelas</a><a href="/modelos/?view=list">Ir a la biblioteca <span aria-hidden="true">↗</span></a></nav>
  </header>
  <main class="ee">
    <nav class="ee-breadcrumb" aria-label="Migas de pan">
      <a href="/">Atlas</a> <span aria-hidden="true">/</span>
      <a href="/escuelas/">Escuelas</a> <span aria-hidden="true">/</span>
      <span aria-current="page">${escapeHtml(escuela.titulo)}</span>
    </nav>

    <article class="ee-cuerpo">
      <p class="ee-eyebrow">${escapeHtml(cifras)}</p>
      <h1>${escapeHtml(escuela.titulo)}</h1>
      <p class="ee-entradilla">${escapeHtml(escuela.entradilla)}</p>
${parrafos}
    </article>

    <section class="ee-catalogo" aria-labelledby="ee-catalogo-title">
      <h2 id="ee-catalogo-title">Los modelos de esta tradición</h2>
      <p class="ee-nota">Ordenados por año. Cada ficha reúne fundamentos, teoría del cambio, ideas principales, influencias y referencias.</p>
${renderListaModelos(modelos)}
    </section>

    <section class="ee-vistas" aria-labelledby="ee-vistas-title">
      <h2 id="ee-vistas-title">Recorrer esta escuela en el Atlas</h2>
      <div class="ee-vistas-grid">
        <a href="/modelos/?view=list&amp;group=school&amp;target=${encodeURIComponent(escuela.grupo)}">Lista completa <span aria-hidden="true">↗</span></a>
        <a href="/modelos/?view=genealogy&amp;group=school&amp;target=${encodeURIComponent(escuela.grupo)}">Genealogía e influencias <span aria-hidden="true">↗</span></a>
        <a href="/modelos/?view=map&amp;group=school&amp;target=${encodeURIComponent(escuela.grupo)}">Dónde nació cada modelo <span aria-hidden="true">↗</span></a>
        <a href="/modelos/?view=network&amp;group=school&amp;target=${encodeURIComponent(escuela.grupo)}">Red de afinidades <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <aside class="ee-aviso">
      <form class="lista-espera" data-lista-espera="escuelas" action="/api/subscribe-list" method="post">
        <p class="lista-espera-titulo">Apúntate y tendrás precio de fundador cuando abra la suscripción.</p>
        <div class="lista-espera-campos" data-lista-campos>
          <label class="visually-hidden" for="ee-email">Tu correo electrónico</label>
          <input id="ee-email" type="email" name="email" placeholder="tu@correo.com" autocomplete="email" required>
          <button type="submit">Avísame</button>
        </div>
        <div class="lista-espera-gracias" data-lista-gracias hidden>
          <p class="lista-espera-nota">Gracias. ¿Qué describe mejor tu caso?</p>
          <div class="lista-espera-perfiles">
            <button type="button" data-perfil="clinico">Ejerzo la clínica</button>
            <button type="button" data-perfil="docente">Doy clase</button>
            <button type="button" data-perfil="estudiante">Estudio</button>
            <button type="button" data-perfil="otro">Otra cosa</button>
          </div>
        </div>
        <p class="lista-espera-cierre" data-lista-cierre hidden>Anotado. Tendrás noticias mías antes que nadie.</p>
        <p class="lista-espera-estado" data-lista-estado role="status" aria-live="polite">Te aviso de cada ampliación. Nada más.</p>
      </form>
    </aside>
  </main>
  <footer class="footer">
    <a class="brand" href="/">TU MENTOR <span class="footer-atlas">/ Atlas de la psicoterapia</span></a>
    <nav aria-label="Otros recursos"><a href="/escuelas/">Escuelas</a><a href="/en/models/">English ↗</a></nav>
    <span>© 2026 Tu Mentor Psicología</span>
  </footer>
</body>
</html>
`;
}

export async function buildEscuelaPages(todosLosModelos, outputDir) {
  const escuelas = await loadEscuelasContenido();
  const generadas = [];
  const vacias = [];

  for (const escuela of escuelas) {
    const modelos = modelosDeEscuela(escuela, todosLosModelos);

    // Una escuela sin modelos daria una pagina hub vacia, que es justo el tipo
    // de pagina que Google descarta. Mejor no publicarla.
    if (!modelos.length) {
      vacias.push(escuela.id);
      continue;
    }

    const dir = path.join(outputDir, 'escuelas', escuela.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), renderEscuelaPage(escuela, modelos), 'utf8');
    generadas.push({ id: escuela.id, modelos: modelos.length });
  }

  return { generadas, vacias };
}
