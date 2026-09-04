import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SOURCE_PUBLIC_DIR = path.join(ROOT, 'public');
const PUBLIC_DIR = process.env.MODEL_PAGES_OUTPUT_DIR
  ? path.resolve(process.env.MODEL_PAGES_OUTPUT_DIR)
  : SOURCE_PUBLIC_DIR;
const MODELS_DIR = path.join(PUBLIC_DIR, 'modelos');
const EN_MODELS_DIR = path.join(PUBLIC_DIR, 'en', 'models');
const LOCAL_INDEX_PATH = path.join(SOURCE_PUBLIC_DIR, 'assets', 'Repo', 'modelos-index.json');
const MANIFEST_PATH = path.join(MODELS_DIR, '.generated-pages.json');
const APP_TEMPLATE_PATH = path.join(SOURCE_PUBLIC_DIR, 'modelos', 'index.html');
const GENERATED_ASSETS_DIR = path.join(MODELS_DIR, 'generated-assets');
const MODEL_PAGES_DATA_ROOT = String(process.env.MODEL_PAGES_DATA_ROOT || '').trim();

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
const GITHUB_REQUEST_ATTEMPTS = Math.max(1, Number(process.env.GITHUB_REQUEST_ATTEMPTS || 4));
const GITHUB_REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.GITHUB_REQUEST_TIMEOUT_MS || 30000));
const GITHUB_RETRY_BASE_MS = Math.max(100, Number(process.env.GITHUB_RETRY_BASE_MS || 750));

const LOCALES = {
  es: {
    code: 'es',
    path: 'modelos',
    libraryName: 'Modelos',
    pageSuffix: 'Modelo de psicoterapia',
    home: 'Inicio',
    theory: 'Teoría del cambio',
    ideas: 'Ideas fundamentales',
    influences: 'Influencias',
    references: 'Referencias principales',
    related: 'Modelos relacionados',
    idea: 'Idea principal',
    imageAlt: 'Ficha clínica de un modelo de psicoterapia',
    psychotherapy: 'Psicoterapia'
  },
  en: {
    code: 'en',
    path: 'en/models',
    libraryName: 'Models',
    pageSuffix: 'Psychotherapy model',
    home: 'Home',
    theory: 'Theory of change',
    ideas: 'Core ideas',
    influences: 'Influences',
    references: 'Key references',
    related: 'Related models',
    idea: 'Core idea',
    imageAlt: 'Clinical psychotherapy model profile',
    psychotherapy: 'Psychotherapy'
  }
};

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableKeyForItem(item) {
  if (!isPlainObject(item)) return null;
  if (typeof item.id === 'string' && item.id.trim()) return ['id', item.id];
  if (typeof item.codigo === 'string' && item.codigo.trim()) return ['codigo', item.codigo];
  return null;
}

export function mergeModelOverlay(source, overlay, pathLabel = '$') {
  if (Array.isArray(source)) {
    if (Array.isArray(overlay)) {
      const translated = new Map();
      for (const item of overlay) {
        const key = stableKeyForItem(item);
        if (!key) throw new Error(`${pathLabel}: translated array item has no id or codigo`);
        translated.set(`${key[0]}:${key[1]}`, item);
      }
      const matched = new Set();
      const merged = source.map((item) => {
        const key = stableKeyForItem(item);
        if (!key) return item;
        const lookup = `${key[0]}:${key[1]}`;
        if (!translated.has(lookup)) return item;
        matched.add(lookup);
        return mergeModelOverlay(item, translated.get(lookup), `${pathLabel}[${lookup}]`);
      });
      const unknown = [...translated.keys()].filter((key) => !matched.has(key));
      if (unknown.length) throw new Error(`${pathLabel}: unknown translated item(s): ${unknown.join(', ')}`);
      return merged;
    }
    if (!isPlainObject(overlay)) throw new Error(`${pathLabel}: translated array requires an array or keyed object`);

    const byStableKey = new Map();
    const byString = new Map();
    source.forEach((item, index) => {
      const key = stableKeyForItem(item);
      if (key) byStableKey.set(key[1], index);
      else if (typeof item === 'string') {
        if (!byString.has(item)) byString.set(item, []);
        byString.get(item).push(index);
      }
    });
    const merged = source.slice();
    for (const [key, value] of Object.entries(overlay)) {
      if (byString.has(key)) {
        if (typeof value !== 'string') throw new Error(`${pathLabel}[${key}]: expected translated string`);
        for (const index of byString.get(key)) merged[index] = value;
      } else if (byStableKey.has(key)) {
        const index = byStableKey.get(key);
        merged[index] = mergeModelOverlay(source[index], value, `${pathLabel}[${key}]`);
      } else {
        throw new Error(`${pathLabel}: unknown translated item ${key}`);
      }
    }
    return merged;
  }

  if (Array.isArray(overlay)) throw new Error(`${pathLabel}: source is not an array`);
  if (!isPlainObject(overlay)) {
    if (isPlainObject(source)) throw new Error(`${pathLabel}: source is an object`);
    return overlay;
  }
  if (!isPlainObject(source)) throw new Error(`${pathLabel}: source is not an object`);

  const merged = { ...source };
  for (const [key, value] of Object.entries(overlay)) {
    if (key === '_translation') continue;
    if (!(key in source)) throw new Error(`${pathLabel}.${key}: field does not exist in source`);
    if (pathLabel === '$' && ['grupo', 'year', 'autores', 'lat', 'lon', 'file'].includes(key)) {
      throw new Error(`${pathLabel}.${key}: canonical field cannot be translated`);
    }
    merged[key] = mergeModelOverlay(source[key], value, `${pathLabel}.${key}`);
  }
  return merged;
}

function applyReviewedOverlay(source, overlay) {
  if (!isPlainObject(overlay) || overlay?._translation?.status !== 'reviewed') return null;
  if (String(overlay.id || '') !== String(source.id || '')) return null;
  return {
    ...mergeModelOverlay(source, overlay),
    __locale: 'en',
    __translation: overlay._translation
  };
}

function localizedPublicPath(dataPath, locale = 'en') {
  const clean = String(dataPath || '').replace(/^data\//i, '').replace(/^Core\//i, '');
  return clean.startsWith('modelos-publicos/') ? `Core/i18n/${locale}/${clean}` : '';
}

function taxonomyLabel(taxonomies, group, value) {
  const raw = compactText(value);
  const translated = taxonomies?.[group]?.[raw];
  return typeof translated === 'string' && translated.trim() ? translated.trim() : raw;
}

function normalizeModel(raw, school = {}, taxonomies = null) {
  const id = cleanModelId(raw?.id);
  if (!id) return null;

  const label = compactText(raw?.label || raw?.templabel || id);
  const group = taxonomyLabel(taxonomies, 'escuelas', raw?.grupo || school?.label || school?.id || '');
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
    ciudad: taxonomyLabel(taxonomies, 'ciudades', raw?.ciudad || ''),
    pais: taxonomyLabel(taxonomies, 'paises', raw?.pais || ''),
    universidad: taxonomyLabel(taxonomies, 'universidades', raw?.universidad || ''),
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

function isRetryableGitHubStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function githubRetryDelay(response, attempt) {
  const retryAfter = String(response?.headers?.get?.('retry-after') || '').trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(10000, Math.max(0, seconds * 1000));
    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) return Math.min(10000, Math.max(0, retryDate - Date.now()));
  }
  return Math.min(10000, GITHUB_RETRY_BASE_MS * (2 ** Math.max(0, attempt - 1)));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function githubRequest(repoPath, { raw = false } = {}) {
  const encodedPath = String(repoPath)
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const url = new URL(`https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodedPath}`);
  url.searchParams.set('ref', GITHUB_REF);

  let lastError = null;
  let attemptsMade = 0;
  for (let attempt = 1; attempt <= GITHUB_REQUEST_ATTEMPTS; attempt += 1) {
    attemptsMade = attempt;
    let response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'User-Agent': 'tu-mentor-model-pages/1.0',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      lastError = error;
      if (attempt === GITHUB_REQUEST_ATTEMPTS) break;
      const delay = githubRetryDelay(null, attempt);
      console.warn(`[reintento ${attempt}/${GITHUB_REQUEST_ATTEMPTS - 1}] ${repoPath}: ${error.message}; esperando ${delay} ms`);
      await wait(delay);
      continue;
    }

    if (response.ok) return response.json();

    lastError = new Error(`HTTP ${response.status}`);
    if (!isRetryableGitHubStatus(response.status) || attempt === GITHUB_REQUEST_ATTEMPTS) break;

    const delay = githubRetryDelay(response, attempt);
    await response.body?.cancel?.().catch(() => {});
    console.warn(`[reintento ${attempt}/${GITHUB_REQUEST_ATTEMPTS - 1}] ${repoPath}: HTTP ${response.status}; esperando ${delay} ms`);
    await wait(delay);
  }

  throw new Error(`GitHub no pudo leer ${repoPath} tras ${attemptsMade} intento${attemptsMade === 1 ? '' : 's'}: ${lastError?.message || 'error de red'}`);
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
  let taxonomies = {};
  try {
    taxonomies = await fetchJson('Core/i18n/en/taxonomias.json');
  } catch {
    // El build español puede continuar aunque falte el vocabulario inglés.
  }

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
      const source = { ...entry.summary, ...detail, __seoDetail: true };
      const es = normalizeModel(source, entry.school);
      let en = null;
      const overlayPath = localizedPublicPath(entry.dataPath);
      if (overlayPath) {
        try {
          const overlay = await fetchJson(overlayPath);
          const localized = applyReviewedOverlay(source, overlay);
          if (localized) en = normalizeModel(localized, entry.school, taxonomies);
        } catch {
          // Una traducción ausente o no revisada no genera una página inglesa.
        }
      }
      return { es, en };
    } catch (error) {
      console.warn(`[resumen] ${entry.summary?.id || entry.dataPath}: ${error.message}`);
      return { es: normalizeModel({ ...entry.summary, __seoDetail: false }, entry.school), en: null };
    }
  });

  return {
    es: loaded.map((entry) => entry?.es).filter(Boolean),
    en: loaded.map((entry) => entry?.en).filter(Boolean)
  };
}

async function loadGitHubPublicModels() {
  const rootPath = 'data/Core/modelos-publicos';
  const schools = await githubRequest(rootPath);
  if (!Array.isArray(schools)) throw new Error('GitHub no devolvió el directorio de modelos públicos.');

  let taxonomies = {};
  try {
    taxonomies = await githubRequest('data/Core/i18n/en/taxonomias.json', { raw: true });
  } catch {
    // La ausencia del vocabulario solo impide localizar taxonomías, no el build español.
  }

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
      const source = { ...detail, __seoDetail: true };
      const es = normalizeModel(source);
      let en = null;
      const relative = String(filePath).replace(/^data\/Core\//i, '');
      const overlayPath = relative.startsWith('modelos-publicos/')
        ? `data/Core/i18n/en/${relative}`
        : '';
      if (overlayPath) {
        try {
          const overlay = await githubRequest(overlayPath, { raw: true });
          const localized = applyReviewedOverlay(source, overlay);
          if (localized) en = normalizeModel(localized, {}, taxonomies);
        } catch {
          // GitHub responde 404 para modelos todavía no traducidos.
        }
      }
      return { es, en };
    } catch (error) {
      console.warn(`[omitido] ${filePath}: ${error.message}`);
      return null;
    }
  });

  return {
    es: loaded.map((entry) => entry?.es).filter(Boolean),
    en: loaded.map((entry) => entry?.en).filter(Boolean)
  };
}

async function loadLocalModels() {
  const raw = await fs.readFile(LOCAL_INDEX_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed?.models;
  if (!Array.isArray(list)) throw new Error('El índice local de modelos no es válido.');
  return {
    es: list.map((model) => normalizeModel(model)).filter(Boolean),
    en: []
  };
}

async function listJsonFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) files.push(fullPath);
  }
  return files;
}

async function loadDataRepositoryModels() {
  const coreRoot = path.join(path.resolve(MODEL_PAGES_DATA_ROOT), 'data', 'Core');
  const publicRoot = path.join(coreRoot, 'modelos-publicos');
  const files = await listJsonFiles(publicRoot);
  if (!files.length) throw new Error(`No hay modelos públicos en ${publicRoot}.`);
  let taxonomies = {};
  try {
    taxonomies = await readJsonFile(path.join(coreRoot, 'i18n', 'en', 'taxonomias.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const loaded = await mapWithConcurrency(files, FETCH_CONCURRENCY, async (filePath) => {
    const source = { ...await readJsonFile(filePath), __seoDetail: true };
    const es = normalizeModel(source);
    const relative = path.relative(publicRoot, filePath);
    const overlayPath = path.join(coreRoot, 'i18n', 'en', 'modelos-publicos', relative);
    let en = null;
    try {
      const localized = applyReviewedOverlay(source, await readJsonFile(overlayPath));
      if (localized) en = normalizeModel(localized, {}, taxonomies);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return { es, en };
  });

  return {
    es: loaded.map((entry) => entry.es).filter(Boolean),
    en: loaded.map((entry) => entry.en).filter(Boolean)
  };
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadModels() {
  if (MODEL_PAGES_DATA_ROOT) {
    console.log(`Fuente: repositorio de datos local ${path.resolve(MODEL_PAGES_DATA_ROOT)}.`);
    return loadDataRepositoryModels();
  }
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

function renderIdea(idea, locale) {
  if (typeof idea === 'string') {
    return `<li><p>${escapeHtml(compactText(idea))}</p></li>`;
  }

  const title = compactText(idea?.titulo || idea?.title || locale.idea);
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

function relatedModelsFor(model, models, localeCode) {
  return models
    .filter((candidate) => candidate.id !== model.id && candidate.grupo === model.grupo)
    .sort((a, b) => {
      const yearA = a.year ?? 9999;
      const yearB = b.year ?? 9999;
      const distanceA = model.year ? Math.abs(yearA - model.year) : yearA;
      const distanceB = model.year ? Math.abs(yearB - model.year) : yearB;
      return distanceA - distanceB || a.label.localeCompare(b.label, localeCode);
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

function removeElementById(html, tagName, id) {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>`,
    'i'
  );
  return html.replace(pattern, '');
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

function modelUrl(modelId, locale) {
  return `${BASE_URL}/${locale.path}/${encodeURIComponent(modelId)}`;
}

function renderNoScriptFallback(model, related, locale) {
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
      ${theory ? `<section><h2>${escapeHtml(locale.theory)}</h2><p>${escapeHtml(theory)}</p></section>` : ''}
      ${ideas.length ? `<section><h2>${escapeHtml(locale.ideas)}</h2><ol>${ideas.map((idea) => renderIdea(idea, locale)).join('')}</ol></section>` : ''}
      ${model.influencias.length ? `<section><h2>${escapeHtml(locale.influences)}</h2>${renderSimpleList(model.influencias)}</section>` : ''}
      ${references.length ? `<section><h2>${escapeHtml(locale.references)}</h2>${renderSimpleList(references)}</section>` : ''}
      ${related.length ? `<nav aria-label="${escapeHtml(locale.related)}"><h2>${escapeHtml(locale.related)}</h2><ul>${related.map((item) => `<li><a href="/${locale.path}/${encodeURIComponent(item.id)}">${escapeHtml(item.label)}</a></li>`).join('')}</ul></nav>` : ''}
    </article>
  </noscript>`;
}

export function renderModelPage(model, allModels, interactiveTemplate, localeCode = 'es', englishModelIds = new Set()) {
  const locale = LOCALES[localeCode];
  if (!locale) throw new Error(`Locale no soportado: ${localeCode}`);
  const url = modelUrl(model.id, locale);
  const description = truncateText(model.descripcion, 158);
  const title = `${model.label} | ${locale.pageSuffix}`;
  const related = relatedModelsFor(model, allModels, localeCode);
  const indexable = model.descripcion.length >= 160;
  const spanishUrl = modelUrl(model.id, LOCALES.es);
  const englishUrl = modelUrl(model.id, LOCALES.en);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: locale.code,
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
        about: [model.grupo, locale.psychotherapy].filter(Boolean),
        inLanguage: locale.code
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: locale.home, item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: locale.libraryName, item: `${BASE_URL}/${locale.path}/` },
          { '@type': 'ListItem', position: 3, name: model.label, item: url }
        ]
      }
    ]
  };

  let html = interactiveTemplate;
  html = html.replace(/<html\b([^>]*)\blang=(['"])[^'"]*\2/i, `<html$1lang="${locale.code}"`);
  if (localeCode === 'en') {
    html = html.replace(/<html\b([^>]*)>/i, '<html$1 data-translation-status="reviewed">');
  }
  html = replaceElementTextById(html, 'title', 'seoTitle', title);
  html = replaceAttributeById(html, 'meta', 'seoDescription', 'content', description);
  html = replaceAttributeById(html, 'link', 'seoCanonical', 'href', url);
  html = replaceAttributeById(html, 'link', 'seoAlternateEs', 'href', spanishUrl);
  html = replaceAttributeById(html, 'link', 'seoAlternateDefault', 'href', spanishUrl);
  html = englishModelIds.has(model.id)
    ? replaceAttributeById(html, 'link', 'seoAlternateEn', 'href', englishUrl)
    : removeElementById(html, 'link', 'seoAlternateEn');
  html = replaceAttributeById(html, 'meta', 'seoOgTitle', 'content', title);
  html = replaceAttributeById(html, 'meta', 'seoOgDescription', 'content', description);
  html = replaceAttributeById(html, 'meta', 'seoOgUrl', 'content', url);
  html = replaceAttributeById(html, 'meta', 'seoTwitterTitle', 'content', title);
  html = replaceAttributeById(html, 'meta', 'seoTwitterDescription', 'content', description);
  html = replaceAttributeById(html, 'meta', 'seoOgImageAlt', 'content', `${locale.imageAlt}: ${model.label}`);
  html = replaceMetaByProperty(html, 'og:type', 'article');
  html = replaceMetaByProperty(html, 'og:locale', localeCode === 'en' ? 'en_GB' : 'es_ES');
  html = html.replace(
    /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i,
    `<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow'}">`
  );
  html = html.replace(
    /<script\b[^>]*\bid=["']seoStructuredData["'][^>]*>[\s\S]*?<\/script>/i,
    `<script id="seoStructuredData" type="application/ld+json">${safeJsonForHtml(structuredData)}</script>`
  );
  const localeMetadata = [
    ...(localeCode === 'en' ? ['<meta name="translation-status" content="reviewed">'] : []),
    ...(englishModelIds.has(model.id)
      ? [`<meta property="og:locale:alternate" content="${localeCode === 'en' ? 'es_ES' : 'en_GB'}">`]
      : [])
  ].join('\n  ');
  if (localeMetadata) html = html.replace('</head>', `  ${localeMetadata}\n</head>`);
  html = html.replace('</body>', `${renderNoScriptFallback(model, related, locale)}\n</body>`);
  return html;
}

export function renderEnglishLibraryPage(interactiveTemplate) {
  const url = `${BASE_URL}/en/models/`;
  const spanishUrl = `${BASE_URL}/modelos/`;
  const title = 'Psychotherapy Model Library | Tu Mentor Psicología';
  const description = 'Explore psychotherapy models, schools, change processes, clinical techniques, influences, and evidence in a bilingual living library.';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': `${BASE_URL}/#website` }
  };

  let html = interactiveTemplate;
  html = html.replace(/<html\b([^>]*)\blang=(['"])[^'"]*\2/i, '<html$1lang="en"');
  html = html.replace(/<html\b([^>]*)>/i, '<html$1 data-translation-status="reviewed">');
  html = replaceElementTextById(html, 'title', 'seoTitle', title);
  html = replaceAttributeById(html, 'meta', 'seoDescription', 'content', description);
  html = replaceAttributeById(html, 'link', 'seoCanonical', 'href', url);
  html = replaceAttributeById(html, 'link', 'seoAlternateEs', 'href', spanishUrl);
  html = replaceAttributeById(html, 'link', 'seoAlternateEn', 'href', url);
  html = replaceAttributeById(html, 'link', 'seoAlternateDefault', 'href', spanishUrl);
  html = replaceAttributeById(html, 'meta', 'seoOgTitle', 'content', title);
  html = replaceAttributeById(html, 'meta', 'seoOgDescription', 'content', description);
  html = replaceAttributeById(html, 'meta', 'seoOgUrl', 'content', url);
  html = replaceAttributeById(html, 'meta', 'seoTwitterTitle', 'content', title);
  html = replaceAttributeById(html, 'meta', 'seoTwitterDescription', 'content', description);
  html = replaceAttributeById(html, 'meta', 'seoOgImageAlt', 'content', 'Psychotherapy Model Library');
  html = replaceMetaByProperty(html, 'og:type', 'website');
  html = replaceMetaByProperty(html, 'og:locale', 'en_GB');
  html = html.replace(
    /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i,
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">'
  );
  html = html.replace(
    /<script\b[^>]*\bid=["']seoStructuredData["'][^>]*>[\s\S]*?<\/script>/i,
    `<script id="seoStructuredData" type="application/ld+json">${safeJsonForHtml(structuredData)}</script>`
  );
  html = html.replace('</head>', '  <meta name="translation-status" content="reviewed">\n  <meta property="og:locale:alternate" content="es_ES">\n</head>');
  html = html.replace('</body>', `<noscript>
    <article class="seo-noscript" lang="en">
      <h1>Psychotherapy Model Library</h1>
      <p>${escapeHtml(description)}</p>
      <p>Enable JavaScript to search, filter, and open the reviewed English model profiles.</p>
    </article>
  </noscript>\n</body>`);
  return html;
}

function assertGeneratedPath(id, outputDir = MODELS_DIR) {
  const target = path.resolve(outputDir, id);
  const base = `${path.resolve(outputDir)}${path.sep}`;
  if (!target.startsWith(base)) throw new Error(`Ruta de salida no segura: ${id}`);
  return target;
}

async function readPreviousManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(raw);
    return {
      es: Array.isArray(manifest?.locales?.es?.models)
        ? manifest.locales.es.models
        : (Array.isArray(manifest?.models) ? manifest.models : []),
      en: Array.isArray(manifest?.locales?.en?.models) ? manifest.locales.en.models : []
    };
  } catch {
    return { es: [], en: [] };
  }
}

async function removePreviousGeneratedPages(ids, outputDir) {
  await Promise.all(ids.map(async (id) => {
    const cleanId = cleanModelId(id);
    if (!cleanId) return;
    await fs.rm(assertGeneratedPath(cleanId, outputDir), { recursive: true, force: true });
  }));
}

function uniqueModels(models, localeCode) {
  return [...new Map(models.map((model) => [model.id, model])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, localeCode));
}

async function writeLocalePages(models, outputDir, interactiveTemplate, localeCode, englishModelIds) {
  await fs.mkdir(outputDir, { recursive: true });
  for (const model of models) {
    const modelDir = assertGeneratedPath(model.id, outputDir);
    await fs.mkdir(modelDir, { recursive: true });
    await fs.writeFile(
      path.join(modelDir, 'index.html'),
      renderModelPage(model, models, interactiveTemplate, localeCode, englishModelIds),
      'utf8'
    );
  }
}

export async function build() {
  await fs.mkdir(MODELS_DIR, { recursive: true });
  const loaded = await loadModels();
  const modelsByLocale = {
    es: uniqueModels(loaded.es, 'es'),
    en: uniqueModels(loaded.en, 'en')
  };

  if (!modelsByLocale.es.length) throw new Error('No hay modelos válidos para generar.');

  const previous = await readPreviousManifest();
  await Promise.all([
    removePreviousGeneratedPages(previous.es, MODELS_DIR),
    removePreviousGeneratedPages(previous.en, EN_MODELS_DIR)
  ]);
  const interactiveTemplate = await prepareInteractiveTemplate();
  const englishModelIds = new Set(modelsByLocale.en.map((model) => model.id));

  await writeLocalePages(modelsByLocale.es, MODELS_DIR, interactiveTemplate, 'es', englishModelIds);
  await writeLocalePages(modelsByLocale.en, EN_MODELS_DIR, interactiveTemplate, 'en', englishModelIds);
  await fs.writeFile(path.join(EN_MODELS_DIR, 'index.html'), renderEnglishLibraryPage(interactiveTemplate), 'utf8');

  const manifestFor = (models) => ({
    count: models.length,
    models: models.map((model) => model.id),
    indexableModels: models
      .filter((model) => model.descripcion.length >= 160)
      .map((model) => model.id)
  });

  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    source: GITHUB_OWNER && GITHUB_REPO && GITHUB_TOKEN
      ? `github:${GITHUB_OWNER}/${GITHUB_REPO}:modelos-publicos`
      : (!FORCE_REMOTE && await fileExists(LOCAL_INDEX_PATH) ? 'local-index' : DATA_API_URL),
    count: modelsByLocale.es.length,
    models: modelsByLocale.es.map((model) => model.id),
    indexableModels: manifestFor(modelsByLocale.es).indexableModels,
    locales: {
      es: manifestFor(modelsByLocale.es),
      en: manifestFor(modelsByLocale.en)
    }
  };

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Páginas HTML generadas: ${modelsByLocale.es.length} es, ${modelsByLocale.en.length} en.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

