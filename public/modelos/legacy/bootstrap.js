if (!['1', 'true', 'yes'].includes((new URLSearchParams(location.search).get('embed') || '').toLowerCase())) document.documentElement.classList.add('atlas-enabled');
// ✅ compatibilidad global (evita ReferenceError)
var IS_EMBED = false;
var OPEN_ID = "";
var OPEN_SCHOOL = "";

function getModelIdFromPath(){
  return window.TMPS_MODELOS_I18N?.getModelId(location.pathname) || '';
}

function buildModelPath(id){
  return window.TMPS_MODELOS_I18N?.buildModelPath(id) || '/modelos/';
}

function updateModelUrl(id, options = {}){
  if (window.TMPS_ATLAS) return;
  if (window.IS_EMBED) return;

  const cleanId = String(id || '').trim();
  if (!cleanId) return;

  const nextPath = buildModelPath(cleanId);
  const currentPath = String(location.pathname || '').replace(/\/+$/, '') || '/';

  if (currentPath === nextPath.replace(/\/+$/, '')) return;

  const method = options.replace ? 'replaceState' : 'pushState';

  history[method](
    { modelId: cleanId },
    '',
    nextPath + location.search
  );
  window.TMPS_MODELOS_I18N?.updateLanguageLinks();
}

function updateLibraryUrl(options = {}){
  if (window.TMPS_ATLAS) return;
  if (window.IS_EMBED) return;
  const nextPath = window.TMPS_MODELOS_I18N?.buildLibraryPath() || '/modelos/';
  if ((String(location.pathname || '').replace(/\/+$/, '') || '/') === nextPath.replace(/\/+$/, '')) return;
  const method = options.replace ? 'replaceState' : 'pushState';
  history[method]({ modelId: null }, '', nextPath);
  window.TMPS_MODELOS_I18N?.updateLanguageLinks();
}

const MODELOS_LOCALE = window.TMPS_MODELOS_I18N?.locale || 'es';
const SEO_LOCALE = MODELOS_LOCALE === 'en'
  ? {
      url: 'https://apps.tumentorpsicologia.com/en/models/',
      title: 'Atlas of psychotherapy | Tu Mentor',
      shortTitle: 'Atlas of psychotherapy',
      description: 'Explore psychotherapy models by school, process, and dimension. Compare foundations, techniques, influences, and clinical references.',
      collectionName: 'Psychotherapy Models Library',
      modelSuffix: 'Psychotherapy Model',
      imageAlt: 'Clinical psychotherapy model profile',
      language: 'en'
    }
  : {
      url: 'https://apps.tumentorpsicologia.com/modelos/',
      title: 'Atlas de la psicoterapia | Tu Mentor',
      shortTitle: 'Atlas de la psicoterapia',
      description: 'Explora modelos de psicoterapia por escuelas, procesos y dimensiones. Compara fundamentos, técnicas, influencias y referencias clínicas.',
      collectionName: 'Atlas de la psicoterapia',
      modelSuffix: 'Modelo de Psicoterapia',
      imageAlt: 'Ficha clínica de un modelo de psicoterapia',
      language: 'es'
    };
const SEO_LIBRARY_URL = SEO_LOCALE.url;
const SEO_LIBRARY_TITLE = SEO_LOCALE.title;
const SEO_LIBRARY_DESCRIPTION = SEO_LOCALE.description;

function uiText(key, fallback = '', variables = {}){
  return window.TMPS_MODELOS_I18N?.t(key, variables, fallback) || fallback || key;
}

function uiPlural(key, count, fallbackOne, fallbackMany, variables = {}){
  const numericCount = Number(count) || 0;
  const form = numericCount === 1 ? 'one' : 'many';
  const fallback = form === 'one' ? fallbackOne : fallbackMany;
  return uiText(`${key}.${form}`, fallback, { count:numericCount, ...variables });
}

function syncPersistentUiTranslations(){
  document.getElementById('btnModelClose')?.setAttribute(
    'aria-label',
    uiText('model.closeProfile', 'Cerrar ficha')
  );
  document.getElementById('btnInfoFull')?.setAttribute(
    'aria-label',
    document.body.classList.contains('infoFull')
      ? uiText('common.close', 'Cerrar')
      : uiText('auth.fullscreen', 'Pantalla completa')
  );
  document.getElementById('smhNav')?.setAttribute(
    'aria-label',
    uiText('model.sections', 'Secciones del modelo')
  );
}

function compactSeoText(value){
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSeoText(value, maxLength = 155){
  const text = compactSeoText(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 90 ? lastSpace : clipped.length).trim()}…`;
}

function setSeoMeta(selector, value){
  const node = document.querySelector(selector);
  if (node && value) node.setAttribute('content', value);
}

function setSeoAlternate(id, href){
  const link = document.getElementById(id);
  if (link && href) link.href = href;
}

function setLibrarySeo(){
  document.title = SEO_LIBRARY_TITLE;
  const canonical = document.getElementById('seoCanonical');
  if (canonical) canonical.href = SEO_LIBRARY_URL;
  setSeoAlternate('seoAlternateEs', 'https://apps.tumentorpsicologia.com/modelos/');
  setSeoAlternate('seoAlternateEn', 'https://apps.tumentorpsicologia.com/en/models/');
  setSeoAlternate('seoAlternateDefault', 'https://apps.tumentorpsicologia.com/modelos/');
  const description = document.getElementById('seoDescription');
  if (description) description.setAttribute('content', SEO_LIBRARY_DESCRIPTION);
  setSeoMeta('#seoOgTitle', SEO_LOCALE.shortTitle);
  setSeoMeta('#seoOgDescription', SEO_LIBRARY_DESCRIPTION);
  setSeoMeta('#seoOgUrl', SEO_LIBRARY_URL);
  setSeoMeta('#seoTwitterTitle', SEO_LOCALE.shortTitle);
  setSeoMeta('#seoTwitterDescription', SEO_LIBRARY_DESCRIPTION);
  setSeoMeta('#seoOgImageAlt', SEO_LOCALE.imageAlt);

  const structuredData = document.getElementById('seoStructuredData');
  if (structuredData){
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SEO_LIBRARY_URL}#collection`,
      url: SEO_LIBRARY_URL,
      name: SEO_LOCALE.collectionName,
      description: SEO_LIBRARY_DESCRIPTION,
      inLanguage: SEO_LOCALE.language,
      isPartOf: { '@id': 'https://apps.tumentorpsicologia.com/#website' },
      publisher: { '@id': 'https://apps.tumentorpsicologia.com/#organization' }
    });
  }
}

function setModelSeo(model){
  const id = String(model?.id || '').trim();
  const label = compactSeoText(model?.label || model?.templabel || SEO_LOCALE.modelSuffix);
  if (!id || !label) return;

  const authors = compactSeoText(model?.autores || '');
  const school = compactSeoText(model?.grupo || '');
  const sourceDescription = model?.summary
    || model?.descripcion
    || model?.teoriaCambio?.resumen
    || (MODELOS_LOCALE === 'en'
      ? `${label}: foundations, change processes, techniques, influences, and clinical references.`
      : `${label}: fundamentos, procesos de cambio, técnicas, influencias y referencias clínicas.`);
  const description = truncateSeoText(sourceDescription, 158);
  const url = `https://apps.tumentorpsicologia.com${buildModelPath(id)}`;
  const titleBase = truncateSeoText(label, 48);
  const title = `${titleBase} | ${SEO_LOCALE.modelSuffix}`;

  document.title = title;
  const canonical = document.getElementById('seoCanonical');
  if (canonical) canonical.href = url;
  const esUrl = `https://apps.tumentorpsicologia.com/modelos/${encodeURIComponent(id)}`;
  const enUrl = `https://apps.tumentorpsicologia.com/en/models/${encodeURIComponent(id)}`;
  setSeoAlternate('seoAlternateEs', esUrl);
  setSeoAlternate('seoAlternateEn', enUrl);
  setSeoAlternate('seoAlternateDefault', esUrl);
  const descriptionNode = document.getElementById('seoDescription');
  if (descriptionNode) descriptionNode.setAttribute('content', description);
  setSeoMeta('#seoOgTitle', title);
  setSeoMeta('#seoOgDescription', description);
  setSeoMeta('#seoOgUrl', url);
  setSeoMeta('#seoTwitterTitle', title);
  setSeoMeta('#seoTwitterDescription', description);
  setSeoMeta('#seoOgImageAlt', `${SEO_LOCALE.imageAlt}: ${label}`);

  const structuredData = document.getElementById('seoStructuredData');
  if (structuredData){
    const about = [{ '@type': 'Thing', name: label }];
    if (school) about.push({ '@type': 'Thing', name: school });
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: label,
      description,
      inLanguage: SEO_LOCALE.language,
      about,
      author: { '@id': 'https://apps.tumentorpsicologia.com/#organization' },
      publisher: { '@id': 'https://apps.tumentorpsicologia.com/#organization' },
      isPartOf: { '@id': `${SEO_LIBRARY_URL}#collection` },
      ...(authors ? { mentions: { '@type': 'Person', name: authors } } : {})
    });
  }
}

  // ✅ evita TDZ (Cannot access before initialization)
var GH_SCHOOLS = null;
// Debe existir antes de que refreshSession() pueda resolver: el callback de
// Supabase se ejecuta mientras el resto de este script aun se esta evaluando.
const GH_MODEL_CACHE = new Map();
const HOST = location.hostname.toLowerCase();

const IS_GHPAGES = HOST.endsWith('github.io');
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', '::1', ''].includes(HOST);
const LOCAL_DEV_FULL_ACCESS = IS_LOCAL_DEV;
const LOCAL_API_BASE = (() => {
  if (!IS_LOCAL_DEV) return location.origin;
  const configured = localStorage.getItem('MODELOS_LOCAL_API_BASE');
  if (configured) return configured.replace(/\/+$/, '');
  return location.port && location.port !== '3000' ? 'http://127.0.0.1:3000' : '';
})();

function resolveDataBase(){
  if (USE_PRIVATE_PROXY){
    return `${API_BASE}/api/data?path=`;
  }

  if (IS_LOCAL_DEV || IS_GHPAGES){
    const repoBase = resolveRepoBasePath();
    return `${location.origin}${repoBase}/data`;
  }

  return `${cdnBase()}/data`;
}

function resolveRepoBasePath(){
  const segments = String(location.pathname || '/')
    .split('/')
    .filter(Boolean);
  return (segments[0] && !segments[0].includes('.'))
    ? `/${segments[0]}`
    : '';
}





  // =========================
// Auto cache-buster por commit (GitHub)
// =========================
const GH_OWNER = "josepmunta-design";
const GH_REPO  = "tmps-data";

const API_BASE = LOCAL_API_BASE;
const USE_PRIVATE_PROXY = true;
// Modo temporal de biblioteca abierta. Mantiene preparado el flujo de
// autenticacion y Stripe para poder reactivarlo cambiando este valor a false.
const PUBLIC_LIBRARY_ACCESS = true;
window.PUBLIC_LIBRARY_ACCESS = PUBLIC_LIBRARY_ACCESS;
document.documentElement.classList.toggle('public-library-access', PUBLIC_LIBRARY_ACCESS);
const SUPABASE_URL = "https://yritadgaurvplltgubii.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ddx-9W2ZbYubGUlqx7TRig_AqS6rftm";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tmp-shared-auth-v1'
  }
});
window.SUPABASE_ACCESS_TOKEN = "";
window.HAS_SUBSCRIPTION_ACCESS = PUBLIC_LIBRARY_ACCESS;
window.SUPABASE_AUTH_READY = new Promise((resolve) => {
  window.__resolveSupabaseAuthReady = resolve;
});

async function getSupabaseAccessToken(){
  if (PUBLIC_LIBRARY_ACCESS){
    window.SUPABASE_ACCESS_TOKEN = "";
    return "";
  }
  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token || "";
  window.SUPABASE_ACCESS_TOKEN = token;
  return token;
}

window.getSupabaseAccessToken = getSupabaseAccessToken;

function proxyDataUrl(path){
  const clean = String(path || '').replace(/^\/+/, '').replace(/^data\//, '');
  return `${API_BASE}/api/data?path=${encodeURIComponent(clean)}`;
}

function isProxyUrl(url){
  const raw = String(url || '').trim();
  if (!raw) return false;

  try{
    const parsed = new URL(raw, location.href);
    if (parsed.pathname !== '/api/data') return false;

    if (API_BASE){
      return parsed.origin === new URL(API_BASE, location.href).origin;
    }

    return parsed.origin === location.origin;
  }catch(e){
    return raw.startsWith(`${API_BASE}/api/data`);
  }
}

async function privateProxyFetch(url, options = {}){
  const finalUrl = String(url || '').trim();
  if (!isProxyUrl(finalUrl)){
    return fetch(finalUrl, options);
  }

  const fetchOptions = { ...options };
  const headers = new Headers(options?.headers || {});
  const token = await getSupabaseAccessToken();

  if (token){
    headers.set('Authorization', `Bearer ${token}`);
  }

  fetchOptions.headers = headers;
  const response = await fetch(finalUrl, fetchOptions);
  if (response.status !== 401) return response;

  const { data } = await supabaseClient.auth.refreshSession();
  const refreshedToken = data?.session?.access_token || "";
  window.SUPABASE_ACCESS_TOKEN = refreshedToken;

  if (!refreshedToken) return response;

  const retryOptions = { ...options };
  const retryHeaders = new Headers(options?.headers || {});
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
  retryOptions.headers = retryHeaders;
  return fetch(finalUrl, retryOptions);
}

let __ASSET_VER = ""; // SHA completo para refs estables en jsDelivr
window.__ASSET_VER = ""; // ✅ también global, por consistencia
const ASSET_FALLBACK_VER = String(Date.now());

let ASSET_VERSION_PROMISE = Promise.resolve();
let D3_READY_PROMISE = null;
let TOPO_READY_PROMISE = null;
let AUTHOR_PHOTO_PROMISE = null;
let VIDA_IMAGE_PROMISE = null;
let ISOMORPHISM_PROMISE = null;
window.ISOMORPHISM_INDEX = null;
window.VIDA_IMAGE_INDEX = null;
// Isomorfismos desactivados temporalmente: evita los fetch a indices/isomorfismos/*
// mientras se repara esa fuente de datos.
const ENABLE_ISOMORPHISMS = false;


async function loadAssetVersion(){
  // Evita depender de la API de GitHub en navegador: se rate-limita con facilidad.
  // Los JSON ya usan cache-buster propio y cdnBase() cae a @main.
  __ASSET_VER = "";
  window.__ASSET_VER = "";
}

// Base jsDelivr “versionada” por commit
function cdnBase(){
  // si falla el SHA, cae a @main (no rompe nada)
  const tag = __ASSET_VER ? `@${__ASSET_VER}` : "@main";
  return `https://cdn.jsdelivr.net/gh/${GH_OWNER}/${GH_REPO}${tag}`;
}

let DATA_BASE = resolveDataBase();
let THREE_READY_PROMISE = null;
let ORBIT_READY_PROMISE = null;

  
function gh(p){
  if (USE_PRIVATE_PROXY){
    return proxyDataUrl(p);
  }

  return `${DATA_BASE}/${String(p).replace(/^\/+/, '')}`;
}

function cdnData(p){
  if (USE_PRIVATE_PROXY){
    return proxyDataUrl(p);
  }

  return `${cdnBase()}/data/${String(p).replace(/^\/+/, '')}`;
}

function rawGhData(p){
  if (USE_PRIVATE_PROXY){
    return proxyDataUrl(p);
  }

  const clean = String(p || '').replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

function dataUrlCandidates(p, options = {}){
  const clean = String(p || '').replace(/^\/+/, '').replace(/^data\//, '');

  if (USE_PRIVATE_PROXY){
    return [proxyDataUrl(clean)];
  }

  const urls = IS_LOCAL_DEV && !IS_GHPAGES
    ? [cdnData(clean)]
    : [gh(clean), cdnData(clean)];
  if (options.raw !== false) urls.push(rawGhData(clean));
  return [...new Set(urls)];
}

const PRIVATE_IMAGE_BLOB_URLS = new Map();

function privateDataPathFromUrl(url){
  const raw = String(url || '').trim();
  if (!raw) return '';

  if (isProxyUrl(raw)){
    try{
      const u = new URL(raw, location.href);
      return decodeURIComponent(u.searchParams.get('path') || '').replace(/^\/+/, '').replace(/^data\//, '');
    }catch(e){
      return '';
    }
  }

  const dataMatch = raw.match(/\/data\/([^?#]+)/);
  if (dataMatch?.[1]) return decodeURIComponent(dataMatch[1]).replace(/^\/+/, '');

  return '';
}

function privateImageUrl(path){
  return proxyDataUrl(path);
}

async function loadPrivateImageBlobUrl(url){
  const finalUrl = String(url || '').trim();
  if (!isProxyUrl(finalUrl)) return finalUrl;
  if (PRIVATE_IMAGE_BLOB_URLS.has(finalUrl)) return PRIVATE_IMAGE_BLOB_URLS.get(finalUrl);

  const response = await privateProxyFetch(finalUrl, {
    headers: {
      Accept: 'image/*,*/*'
    }
  });

  if (!response.ok){
    throw new Error("HTTP " + response.status + " " + finalUrl);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  PRIVATE_IMAGE_BLOB_URLS.set(finalUrl, blobUrl);
  return blobUrl;
}

function setImgSrcWithPrivateProxy(imgEl, src){
  if (!imgEl || !src) return;

  if (!isProxyUrl(src)){
    imgEl.src = src;
    return;
  }

  imgEl.dataset.privateProxySrc = src;
  loadPrivateImageBlobUrl(src)
    .then((blobUrl) => {
      if (!imgEl || imgEl.dataset.privateProxySrc !== src) return;
      imgEl.src = blobUrl;
    })
    .catch(() => {
      if (!imgEl || imgEl.dataset.privateProxySrc !== src) return;
      imgEl.dispatchEvent(new Event('error'));
    });
}

function hydratePrivateProxyImages(root = document){
  if (!root || !USE_PRIVATE_PROXY) return;
  root.querySelectorAll?.('img').forEach((imgEl) => {
    const src = imgEl.getAttribute('data-private-src') || imgEl.getAttribute('src') || imgEl.getAttribute('data-photo-url') || '';
    if (isProxyUrl(src)) setImgSrcWithPrivateProxy(imgEl, src);
  });
}

/* ============================
   ENSURE D3 (fallback CDNs)
   ============================ */
async function ensureD3(timeoutMs = 8000){
  if (window.d3) return true;

  function load(src){
    return new Promise((ok, fail)=>{
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  const sources = [
    "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js",
    "https://unpkg.com/d3@7/dist/d3.min.js",
    "https://d3js.org/d3.v7.min.js"
  ];

  const started = Date.now();

  for (const src of sources){
    try{
      await Promise.race([
        load(src),
        new Promise((_, rej)=>setTimeout(()=>rej(new Error("timeout")), timeoutMs))
      ]);
      if (window.d3){
        console.log("D3 OK:", src);
        return true;
      }
    }catch(e){
      console.warn("D3 FAIL:", src, e?.message || e);
      if (Date.now() - started > timeoutMs * sources.length) break;
    }
  }

  console.error("No se pudo cargar D3 desde ningún CDN.");
  return false;
}

async function ensureThreeJs(timeoutMs = 8000){
  if (window.THREE && typeof window.THREE.WebGLRenderer === 'function') return true;

  function load(src){
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  const sources = [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
    'https://unpkg.com/three@0.128.0/build/three.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
  ];

  const started = Date.now();
  for (const src of sources){
    try{
      await Promise.race([
        load(src),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))
      ]);
      if (window.THREE && typeof window.THREE.WebGLRenderer === 'function'){
        console.log('THREE OK:', src);
        return true;
      }
    }catch(e){
      console.warn('THREE FAIL:', src, e?.message || e);
      if (Date.now() - started > timeoutMs * sources.length) break;
    }
  }

  console.error('No se pudo cargar Three.js desde ningún CDN.');
  return false;
}

async function ensureOrbitControls(timeoutMs = 8000){
  if (window.THREE?.OrbitControls) return true;

  const threeOk = await (THREE_READY_PROMISE || ensureThreeJs().catch(() => false));
  if (!threeOk) return false;

  function load(src){
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  const sources = [
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js'
  ];

  const started = Date.now();
  for (const src of sources){
    try{
      await Promise.race([
        load(src),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))
      ]);
      if (window.THREE?.OrbitControls){
        console.log('OrbitControls OK:', src);
        return true;
      }
    }catch(e){
      console.warn('OrbitControls FAIL:', src, e?.message || e);
      if (Date.now() - started > timeoutMs * sources.length) break;
    }
  }

  console.error('No se pudo cargar OrbitControls desde ningún CDN.');
  return false;
}
