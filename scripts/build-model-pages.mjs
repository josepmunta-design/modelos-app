import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const MODELS_DIR = path.join(PUBLIC_DIR, 'modelos');
const LOCAL_INDEX_PATH = path.join(PUBLIC_DIR, 'assets', 'Repo', 'modelos-index.json');
const MANIFEST_PATH = path.join(MODELS_DIR, '.generated-pages.json');
const APP_TEMPLATE_PATH = path.join(MODELS_DIR, 'index.html');
const GENERATED_ASSETS_DIR = path.join(MODELS_DIR, 'generated-assets');

const BASE_URL = String(process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com')
  .replace(/\/+$/, '');
const DATA_API_URL = String(process.env.PUBLIC_DATA_API_URL || `${BASE_URL}/api/data`)
  .replace(/\/+$/, '');
const FORCE_REMOTE = process.env.MODEL_PAGES_SOURCE === 'remote';
const FETCH_CONCURRENCY = Math.max(1, Number(process.env.MODEL_PAGES_CONCURRENCY || 8));
const GITHUB_OWNER = String(process.env.GITHUB_OWNER || '').trim();
const GITHUB_REPO = String(process.env.GITHUB_REPO || '').trim();
const GITHUB_TOKEN = String(process.env.GITHUB_TOKEN || '').trim();
const GITHUB_REF = String(process.env.GITHUB_REF_NAME || process.env.GITHUB_DATA_REF || 'main').trim();

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

async function githubRequest(repoPath, { raw = false } = {}) {
  const encodedPath = String(repoPath)
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const url = new URL(`https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodedPath}`);
  url.searchParams.set('ref', GITHUB_REF);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'User-Agent': 'tu-mentor-model-pages/1.0',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub no pudo leer ${repoPath}: HTTP ${response.status}`);
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

async function loadGitHubPublicModels() {
  const rootPath = 'data/Core/modelos-publicos';
  const schools = await githubRequest(rootPath);
  if (!Array.isArray(schools)) throw new Error('GitHub no devolvió el directorio de modelos públicos.');

  const files = [];
  for (const school of schools.filter((entry) => entry?.type === 'dir')) {
    const entries = await githubRequest(school.path);
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry?.type === 'file' && String(entry.name || '').toLowerCase().endsWith('.json')) {
        files.push(entry.path);
      }
    }
  }

  const loaded = await mapWithConcurrency(files, FETCH_CONCURRENCY, async (filePath) => {
    try {
      const detail = await githubRequest(filePath, { raw: true });
      return normalizeModel({ ...detail, __seoDetail: true });
    } catch (error) {
      console.warn(`[omitido] ${filePath}: ${error.message}`);
      return null;
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
  if (GITHUB_OWNER && GITHUB_REPO && GITHUB_TOKEN) {
    console.log(`Fuente: JSON públicos del repositorio privado ${GITHUB_OWNER}/${GITHUB_REPO}.`);
    return loadGitHubPublicModels();
  }

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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceElementTextById(html, tagName, id, value) {
  const pattern = new RegExp(
    `(<${tagName}\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>)[\\s\\S]*?(<\\/${tagName}>)`,
    'i'
  );
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
}

function replaceAttributeById(html, tagName, id, attribute, value) {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>`,
    'i'
  );
  return html.replace(pattern, (tag) => {
    const attributePattern = new RegExp(`\\s${escapeRegExp(attribute)}\\s*=\\s*(["']).*?\\1`, 'i');
    const nextAttribute = ` ${attribute}="${escapeHtml(value)}"`;
    return attributePattern.test(tag)
      ? tag.replace(attributePattern, nextAttribute)
      : tag.replace(/>$/, `${nextAttribute}>`);
  });
}

function replaceMetaByProperty(html, property, value) {
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\bproperty=["']${escapeRegExp(property)}["'])[^>]*>`,
    'i'
  );
  return html.replace(pattern, (tag) => {
    const contentPattern = /\scontent\s*=\s*(["']).*?\1/i;
    const nextContent = ` content="${escapeHtml(value)}"`;
    return contentPattern.test(tag)
      ? tag.replace(contentPattern, nextContent)
      : tag.replace(/>$/, `${nextContent}>`);
  });
}

async function prepareInteractiveTemplate() {
  let html = await fs.readFile(APP_TEMPLATE_PATH, 'utf8');
  const assets = [];
  let styleIndex = 0;
  let scriptIndex = 0;

  if (!html.includes('getModelIdFromPath')) {
    throw new Error('La plantilla de la biblioteca no reconoce las rutas individuales de modelos.');
  }

  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_match, _attributes, content) => {
    const filename = `app-${++styleIndex}.css`;
    assets.push({ filename, content: `${content.trim()}\n` });
    return `<link rel="stylesheet" href="/modelos/generated-assets/${filename}">`;
  });

  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attributes, content) => {
    const normalizedAttributes = String(attributes || '').trim();
    if (!content.trim() || /\bsrc\s*=/i.test(normalizedAttributes) || /application\/ld\+json/i.test(normalizedAttributes)) {
      return match;
    }

    const filename = `app-${++scriptIndex}.js`;
    assets.push({ filename, content: `${content.trim()}\n` });
    return `<script${normalizedAttributes ? ` ${normalizedAttributes}` : ''} src="/modelos/generated-assets/${filename}"></script>`;
  });

  await fs.rm(GENERATED_ASSETS_DIR, { recursive: true, force: true });
  await fs.mkdir(GENERATED_ASSETS_DIR, { recursive: true });
  await Promise.all(assets.map(({ filename, content }) => (
    fs.writeFile(path.join(GENERATED_ASSETS_DIR, filename), content, 'utf8')
  )));

  return html;
}

function renderNoScriptFallback(model, related) {
  const theory = compactText(model?.teoriaCambio?.resumen || '');
  const ideas = model.ideasPrincipales.slice(0, 10);
  const references = model.refs.map(compactText).filter(Boolean).slice(0, 20);

  return `<noscript>
    <style>.seo-noscript{max-width:980px;margin:40px auto;padding:32px;color:#f0ece5;background:#0b1016;font:16px/1.65 system-ui,sans-serif}.seo-noscript h1,.seo-noscript h2{font-family:Georgia,serif;font-weight:400}.seo-noscript a{color:#8ed4d0}</style>
    <article class="seo-noscript">
      <p>${escapeHtml([model.grupo, model.year].filter(Boolean).join(' · '))}</p>
      <h1>${escapeHtml(model.label)}</h1>
      ${model.frase ? `<blockquote>${escapeHtml(model.frase)}</blockquote>` : ''}
      <p>${escapeHtml(model.descripcion)}</p>
      ${theory ? `<section><h2>Teoría del cambio</h2><p>${escapeHtml(theory)}</p></section>` : ''}
      ${ideas.length ? `<section><h2>Ideas fundamentales</h2><ol>${ideas.map(renderIdea).join('')}</ol></section>` : ''}
      ${model.influencias.length ? `<section><h2>Influencias</h2>${renderSimpleList(model.influencias)}</section>` : ''}
      ${references.length ? `<section><h2>Referencias principales</h2>${renderSimpleList(references)}</section>` : ''}
      ${related.length ? `<nav aria-label="Modelos relacionados"><h2>Modelos relacionados</h2><ul>${related.map((item) => `<li><a href="/modelos/${encodeURIComponent(item.id)}">${escapeHtml(item.label)}</a></li>`).join('')}</ul></nav>` : ''}
    </article>
  </noscript>`;
}

function renderModelPage(model, allModels, interactiveTemplate) {
  const url = `${BASE_URL}/modelos/${encodeURIComponent(model.id)}`;
  const description = truncateText(model.descripcion, 158);
  const title = `${model.label} | Modelo de psicoterapia`;
  const related = relatedModelsFor(model, allModels);
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

  let html = interactiveTemplate;
  html = replaceElementTextById(html, 'title', 'seoTitle', title);
  html = replaceAttributeById(html, 'meta', 'seoDescription', 'content', description);
  html = replaceAttributeById(html, 'link', 'seoCanonical', 'href', url);
  html = replaceAttributeById(html, 'meta', 'seoOgTitle', 'content', title);
  html = replaceAttributeById(html, 'meta', 'seoOgDescription', 'content', description);
  html = replaceAttributeById(html, 'meta', 'seoOgUrl', 'content', url);
  html = replaceAttributeById(html, 'meta', 'seoTwitterTitle', 'content', title);
  html = replaceAttributeById(html, 'meta', 'seoTwitterDescription', 'content', description);
  html = replaceMetaByProperty(html, 'og:type', 'article');
  html = html.replace(
    /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i,
    `<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow'}">`
  );
  html = html.replace(
    /<script\b[^>]*\bid=["']seoStructuredData["'][^>]*>[\s\S]*?<\/script>/i,
    `<script id="seoStructuredData" type="application/ld+json">${safeJsonForHtml(structuredData)}</script>`
  );
  html = html.replace('</body>', `${renderNoScriptFallback(model, related)}\n</body>`);
  return html;
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
  const interactiveTemplate = await prepareInteractiveTemplate();

  for (const model of uniqueModels) {
    const modelDir = assertGeneratedPath(model.id);
    await fs.mkdir(modelDir, { recursive: true });
    await fs.writeFile(
      path.join(modelDir, 'index.html'),
      renderModelPage(model, uniqueModels, interactiveTemplate),
      'utf8'
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: GITHUB_OWNER && GITHUB_REPO && GITHUB_TOKEN
      ? `github:${GITHUB_OWNER}/${GITHUB_REPO}:modelos-publicos`
      : (!FORCE_REMOTE && await fileExists(LOCAL_INDEX_PATH) ? 'local-index' : DATA_API_URL),
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

