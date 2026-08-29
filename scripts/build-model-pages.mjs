import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const MODELS_DIR = path.join(PUBLIC_DIR, 'modelos');
const LOCAL_INDEX_PATH = path.join(PUBLIC_DIR, 'assets', 'Repo', 'modelos-index.json');
const MANIFEST_PATH = path.join(MODELS_DIR, '.generated-pages.json');

const BASE_URL = String(process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com')
  .replace(/\/+$/, '');
const DATA_API_URL = String(process.env.PUBLIC_DATA_API_URL || `${BASE_URL}/api/data`)
  .replace(/\/+$/, '');
const FORCE_REMOTE = process.env.MODEL_PAGES_SOURCE === 'remote';
const FETCH_CONCURRENCY = Math.max(1, Number(process.env.MODEL_PAGES_CONCURRENCY || 8));

function compactText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLength = 158) {
  const text = compactText(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 90 ? lastSpace : clipped.length).trim()}…`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeJsonForHtml(value) {
  return JSON.stringify(value, null, 2)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

function cleanModelId(value) {
  const id = String(value ?? '').trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) return '';
  return id;
}

function normalizeModel(raw, school = {}) {
  const id = cleanModelId(raw?.id);
  if (!id) return null;

  const label = compactText(raw?.label || raw?.templabel || id);
  const group = compactText(raw?.grupo || school?.label || school?.id || '');
  const description = compactText(
    raw?.descripcion
      || raw?.summary
      || raw?.teoriaCambio?.resumen
      || `${label}: fundamentos, procesos de cambio, técnicas, influencias y referencias clínicas.`
  );

  return {
    ...raw,
    id,
    label,
    grupo: group,
    descripcion: description,
    autores: compactText(raw?.autores || ''),
    ciudad: compactText(raw?.ciudad || ''),
    pais: compactText(raw?.pais || ''),
    frase: compactText(raw?.frase || ''),
    year: Number.isFinite(Number(raw?.year)) ? Number(raw.year) : null,
    ideasPrincipales: Array.isArray(raw?.ideasPrincipales) ? raw.ideasPrincipales : [],
    influencias: Array.isArray(raw?.influencias) ? raw.influencias : [],
    refs: Array.isArray(raw?.refs) ? raw.refs : [],
    teoriaCambio: raw?.teoriaCambio && typeof raw.teoriaCambio === 'object'
      ? raw.teoriaCambio
      : {}
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(dataPath) {
  const url = new URL(DATA_API_URL);
  url.searchParams.set('path', dataPath);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`No se pudo leer ${dataPath}: HTTP ${response.status}`);
  }

  return response.json();
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function publicModelPath(modelFile, school, modelId) {
  const clean = String(modelFile || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/^data\//i, '')
    .replace(/^Core\//i, '');

  if (clean.startsWith('modelos/')) {
    return `Core/${clean.replace(/^modelos\//, 'modelos-publicos/')}`;
  }

  if (clean.startsWith('modelos-publicos/')) return `Core/${clean}`;

  const schoolId = cleanModelId(school?.id)?.toLowerCase();
  const id = cleanModelId(modelId);
  return schoolId && id ? `Core/modelos-publicos/${schoolId}/${id}.json` : '';
}

async function loadRemoteModels() {
  const schools = await fetchJson('Core/escuelas/index.json');
  if (!Array.isArray(schools)) throw new Error('El índice remoto de escuelas no es válido.');

  const entries = [];
  for (const school of schools) {
    const schoolFile = String(school?.file || '').replace(/^\/+/, '');
    if (!schoolFile) continue;
    const schoolData = await fetchJson(`Core/${schoolFile}`);
    for (const model of Array.isArray(schoolData?.modelos) ? schoolData.modelos : []) {
      const dataPath = publicModelPath(model?.file, school, model?.id);
      if (cleanModelId(model?.id)) entries.push({ school, summary: model, dataPath });
    }
  }

  const loaded = await mapWithConcurrency(entries, FETCH_CONCURRENCY, async (entry) => {
    try {
      const detail = await fetchJson(entry.dataPath);
      return normalizeModel({ ...entry.summary, ...detail, __seoDetail: true }, entry.school);
    } catch (error) {
      console.warn(`[resumen] ${entry.summary?.id || entry.dataPath}: ${error.message}`);
      return normalizeModel({ ...entry.summary, __seoDetail: false }, entry.school);
    }
  });

  return loaded.filter(Boolean);
}

async function loadLocalModels() {
  const raw = await fs.readFile(LOCAL_INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed?.models;
  if (!Array.isArray(list)) throw new Error('El índice local de modelos no es válido.');
  return list.map((model) => normalizeModel(model)).filter(Boolean);
}

async function loadModels() {
  if (!FORCE_REMOTE && await fileExists(LOCAL_INDEX_PATH)) {
    console.log('Fuente: índice local de modelos.');
    return loadLocalModels();
  }

  console.log(`Fuente: API pública de modelos (${DATA_API_URL}).`);
  return loadRemoteModels();
}

function renderIdea(idea) {
  if (typeof idea === 'string') {
    return `<li><p>${escapeHtml(compactText(idea))}</p></li>`;
  }

  const title = compactText(idea?.titulo || idea?.title || 'Idea principal');
  const body = compactText(idea?.desarrollo || idea?.descripcion || idea?.text || '');
  return [
    '<li>',
    `  <h3>${escapeHtml(title)}</h3>`,
    body ? `  <p>${escapeHtml(body)}</p>` : '',
    '</li>'
  ].filter(Boolean).join('\n');
}

function renderSimpleList(items, className = '') {
  const values = items.map(compactText).filter(Boolean);
  if (!values.length) return '';
  return `<ul${className ? ` class="${className}"` : ''}>${values
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
}

function relatedModelsFor(model, models) {
  return models
    .filter((candidate) => candidate.id !== model.id && candidate.grupo === model.grupo)
    .sort((a, b) => {
      const yearA = a.year ?? 9999;
      const yearB = b.year ?? 9999;
      const distanceA = model.year ? Math.abs(yearA - model.year) : yearA;
      const distanceB = model.year ? Math.abs(yearB - model.year) : yearB;
      return distanceA - distanceB || a.label.localeCompare(b.label, 'es');
    })
    .slice(0, 5);
}

function renderModelPage(model, allModels) {
  const url = `${BASE_URL}/modelos/${encodeURIComponent(model.id)}`;
  const interactiveUrl = `/modelos/?open=${encodeURIComponent(model.id)}`;
  const description = truncateText(model.descripcion, 158);
  const title = `${model.label} | Modelo de psicoterapia`;
  const theory = compactText(model?.teoriaCambio?.resumen || '');
  const ideas = model.ideasPrincipales.slice(0, 10);
  const related = relatedModelsFor(model, allModels);
  const location = [model.ciudad, model.pais].filter(Boolean).join(' · ');
  const references = model.refs.map(compactText).filter(Boolean).slice(0, 20);
  const indexable = model.descripcion.length >= 160;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: 'es',
        isPartOf: { '@id': `${BASE_URL}/#website` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#article` }
      },
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: model.label,
        description,
        author: model.autores ? { '@type': 'Person', name: model.autores } : undefined,
        publisher: { '@id': `${BASE_URL}/#organization` },
        about: [model.grupo, 'Psicoterapia'].filter(Boolean),
        inLanguage: 'es'
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Modelos', item: `${BASE_URL}/modelos/` },
          { '@type': 'ListItem', position: 3, name: model.label, item: url }
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow'}">
  <meta name="author" content="Tu Mentor Psicología">
  <meta name="theme-color" content="#0b1016">
  <link rel="canonical" href="${escapeHtml(url)}">
  <link rel="icon" type="image/png" href="/assets/logo/logo.png">
  <meta property="og:locale" content="es_ES">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Tu Mentor Psicología">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <script type="application/ld+json">${safeJsonForHtml(structuredData)}</script>
  <style>
    :root{color-scheme:dark;--bg:#080b0f;--panel:#0e141a;--line:#24313a;--ink:#f0ece5;--muted:#a8a5a0;--accent:#8ed4d0;--accent-soft:#142729}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 80% 0,#182125 0,transparent 30rem),var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65}
    a{color:inherit}.wrap{width:min(1120px,calc(100% - 36px));margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;padding:22px 0;border-bottom:1px solid var(--line)}.brand{text-decoration:none;font-family:Georgia,serif;font-size:1.28rem}.back{color:var(--muted);text-decoration:none;font-size:.92rem}.hero{padding:78px 0 62px;border-bottom:1px solid var(--line)}.eyebrow{color:var(--accent);font-size:.75rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.hero h1{max-width:900px;margin:.55rem 0 1rem;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.7rem,7vw,6rem);font-weight:400;line-height:.98;letter-spacing:-.035em}.lede{max-width:820px;color:#d6d1c9;font-size:clamp(1.05rem,2vw,1.3rem)}.meta{display:flex;flex-wrap:wrap;gap:10px;margin:28px 0}.meta span{padding:7px 11px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.85rem}.cta{display:inline-flex;align-items:center;gap:10px;margin-top:10px;padding:12px 18px;border-radius:999px;background:var(--accent);color:#071011;text-decoration:none;font-weight:800}.quote{margin:0;padding:26px 0 0;max-width:850px;color:#ded8ce;font-family:Georgia,serif;font-size:clamp(1.25rem,2.7vw,2rem);font-style:italic}.content{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:64px;padding:64px 0 96px}.section{padding:0 0 48px;margin:0 0 48px;border-bottom:1px solid var(--line)}.section h2{margin:0 0 20px;font-family:Georgia,serif;font-size:clamp(2rem,4vw,3.4rem);font-weight:400;line-height:1.08}.section p{color:#c9c4bd;font-size:1.05rem}.ideas{list-style:none;padding:0;margin:0;display:grid;gap:16px}.ideas li{padding:22px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,var(--panel),#0a0e12)}.ideas h3{margin:0 0 8px;font-size:1rem}.ideas p{margin:0;font-size:.95rem}.chips{display:flex;flex-wrap:wrap;gap:9px;list-style:none;padding:0}.chips li{padding:8px 11px;border:1px solid #345154;border-radius:999px;background:var(--accent-soft);font-size:.86rem}.refs{padding-left:1.25rem;color:var(--muted);font-size:.88rem}.refs li{margin-bottom:.7rem}.aside{position:sticky;top:24px;align-self:start;padding:20px;border:1px solid var(--line);border-radius:18px;background:rgba(14,20,26,.88)}.aside h2{font-family:Georgia,serif;font-weight:400}.related{list-style:none;padding:0;margin:0}.related li+li{border-top:1px solid var(--line)}.related a{display:block;padding:13px 0;text-decoration:none}.related small{display:block;color:var(--muted)}footer{padding:28px 0;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}@media(max-width:800px){.content{grid-template-columns:1fr;gap:10px}.aside{position:static}.hero{padding-top:52px}}
  </style>
</head>
<body>
  <header class="wrap topbar">
    <a class="brand" href="/">Tu Mentor Psicología</a>
    <a class="back" href="/modelos/">← Biblioteca de modelos</a>
  </header>
  <main>
    <article>
      <header class="hero">
        <div class="wrap">
          <div class="eyebrow">${escapeHtml([model.grupo, model.tipo || 'Modelo de psicoterapia'].filter(Boolean).join(' · '))}</div>
          <h1>${escapeHtml(model.label)}</h1>
          ${model.frase ? `<p class="quote">“${escapeHtml(model.frase)}”</p>` : ''}
          <div class="meta">
            ${model.autores ? `<span>${escapeHtml(model.autores)}</span>` : ''}
            ${model.year ? `<span>${escapeHtml(model.year)}</span>` : ''}
            ${location ? `<span>${escapeHtml(location)}</span>` : ''}
          </div>
          <p class="lede">${escapeHtml(model.descripcion)}</p>
          <a class="cta" href="${escapeHtml(interactiveUrl)}">Abrir ficha interactiva <span aria-hidden="true">→</span></a>
        </div>
      </header>
      <div class="wrap content">
        <div>
          ${theory ? `<section class="section"><div class="eyebrow">Teoría del cambio</div><h2>Cómo entiende el cambio</h2><p>${escapeHtml(theory)}</p></section>` : ''}
          ${ideas.length ? `<section class="section"><div class="eyebrow">Ideas fundamentales</div><h2>Claves del modelo</h2><ol class="ideas">${ideas.map(renderIdea).join('')}</ol></section>` : ''}
          ${model.influencias.length ? `<section class="section"><div class="eyebrow">Linaje teórico</div><h2>Influencias</h2>${renderSimpleList(model.influencias, 'chips')}</section>` : ''}
          ${references.length ? `<section class="section"><div class="eyebrow">Fuentes</div><h2>Referencias principales</h2>${renderSimpleList(references, 'refs')}</section>` : ''}
        </div>
        <aside class="aside" aria-label="Modelos relacionados">
          <div class="eyebrow">Seguir explorando</div>
          <h2>Modelos relacionados</h2>
          <ul class="related">${related.map((item) => `<li><a href="/modelos/${encodeURIComponent(item.id)}">${escapeHtml(item.label)}<small>${escapeHtml([item.autores, item.year].filter(Boolean).join(' · '))}</small></a></li>`).join('')}</ul>
        </aside>
      </div>
    </article>
  </main>
  <footer><div class="wrap">Contenido educativo basado en fuentes bibliográficas. No sustituye la evaluación ni el tratamiento profesional.</div></footer>
</body>
</html>
`;
}

function assertGeneratedPath(id) {
  const target = path.resolve(MODELS_DIR, id);
  const base = `${path.resolve(MODELS_DIR)}${path.sep}`;
  if (!target.startsWith(base)) throw new Error(`Ruta de salida no segura: ${id}`);
  return target;
}

async function readPreviousManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(raw);
    return Array.isArray(manifest?.models) ? manifest.models : [];
  } catch {
    return [];
  }
}

async function removePreviousGeneratedPages(ids) {
  await Promise.all(ids.map(async (id) => {
    const cleanId = cleanModelId(id);
    if (!cleanId) return;
    await fs.rm(assertGeneratedPath(cleanId), { recursive: true, force: true });
  }));
}

async function build() {
  await fs.mkdir(MODELS_DIR, { recursive: true });
  const models = await loadModels();
  const uniqueModels = [...new Map(models.map((model) => [model.id, model])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));

  if (!uniqueModels.length) throw new Error('No hay modelos válidos para generar.');

  const previousIds = await readPreviousManifest();
  await removePreviousGeneratedPages(previousIds);

  for (const model of uniqueModels) {
    const modelDir = assertGeneratedPath(model.id);
    await fs.mkdir(modelDir, { recursive: true });
    await fs.writeFile(path.join(modelDir, 'index.html'), renderModelPage(model, uniqueModels), 'utf8');
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: !FORCE_REMOTE && await fileExists(LOCAL_INDEX_PATH) ? 'local-index' : DATA_API_URL,
    count: uniqueModels.length,
    models: uniqueModels.map((model) => model.id),
    indexableModels: uniqueModels
      .filter((model) => model.descripcion.length >= 160)
      .map((model) => model.id)
  };

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Páginas HTML generadas: ${uniqueModels.length}.`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

