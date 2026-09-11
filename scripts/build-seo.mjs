import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PUBLIC_DIR = process.env.MODEL_PAGES_OUTPUT_DIR
  ? path.resolve(process.env.MODEL_PAGES_OUTPUT_DIR)
  : path.join(ROOT, 'public');
const GENERATED_MANIFEST_PATH = path.join(PUBLIC_DIR, 'modelos', '.generated-pages.json');
const BASE_URL = String(process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com')
  .replace(/\/+$/, '');

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function cleanModelId(value) {
  const id = String(value ?? '').trim();
  return /^[a-z0-9][a-z0-9_-]*$/i.test(id) ? id : '';
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function readModelIdsByLocale() {
  const manifest = await readJson(GENERATED_MANIFEST_PATH);
  if (!Array.isArray(manifest?.locales?.es?.indexableModels) || !Array.isArray(manifest?.locales?.en?.indexableModels)) {
    throw new Error('Genera primero las páginas: falta el manifiesto con modelos indexables por idioma.');
  }
  return { es: manifest.locales.es.indexableModels.map(cleanModelId).filter(Boolean), en: manifest.locales.en.indexableModels.map(cleanModelId).filter(Boolean) };
}

function alternateLinks(esUrl, enUrl = '') {
  const links = [
    `    <xhtml:link rel="alternate" hreflang="es" href="${escapeXml(esUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(esUrl)}" />`
  ];
  if (enUrl) links.splice(1, 0, `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />`);
  return links;
}

function sitemapUrl(url, alternates = null) {
  return [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    ...(alternates ? alternateLinks(alternates.es, alternates.en) : []),
    '  </url>'
  ].join('\n');
}

export function buildSitemap({ baseUrl = BASE_URL, modelIdsByLocale, escuelaIds = [] }) {
  const esIds = [...new Set(modelIdsByLocale.es)].sort((a, b) => a.localeCompare(b, 'es'));
  const enIds = [...new Set(modelIdsByLocale.en.filter(id => esIds.includes(id)))].sort((a, b) => a.localeCompare(b, 'en'));
  const enSet = new Set(enIds);
  const libraryAlternates = {
    es: `${baseUrl}/modelos/`,
    en: `${baseUrl}/en/models/`
  };
  const entries = [
    sitemapUrl(`${baseUrl}/`),
    sitemapUrl(libraryAlternates.es, libraryAlternates),
    sitemapUrl(libraryAlternates.en, libraryAlternates),
    sitemapUrl(`${baseUrl}/escuelas/`),
    // Metamodelos es una pieza editorial larga y autocontenida: no depende de
    // /api/data y responde a busquedas propias ("por que funciona la
    // psicoterapia", "factores comunes"). Faltaba en el sitemap.
    sitemapUrl(`${baseUrl}/metamodelos/`),
    // Paginas hub por escuela: dan jerarquia a las 260 fichas y posicionan por
    // los terminos amplios que una ficha suelta no alcanza. La lista viene del
    // manifiesto del build, no de una constante: una escuela sin modelos no se
    // genera, y anunciar en el sitemap una URL que da 404 es peor que omitirla.
    ...[...new Set(escuelaIds)].map((id) => sitemapUrl(`${baseUrl}/escuelas/${encodeURIComponent(id)}/`)),
    ...esIds.map((id) => {
      const es = `${baseUrl}/modelos/${encodeURIComponent(id)}`;
      const en = enSet.has(id) ? `${baseUrl}/en/models/${encodeURIComponent(id)}` : '';
      return sitemapUrl(es, en ? { es, en } : null);
    }),
    ...enIds.map((id) => {
      const es = `${baseUrl}/modelos/${encodeURIComponent(id)}`;
      const en = `${baseUrl}/en/models/${encodeURIComponent(id)}`;
      return sitemapUrl(en, { es, en });
    })
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');
}

async function buildSeoFiles() {
  const modelIdsByLocale = await readModelIdsByLocale();
  const manifest = await readJson(GENERATED_MANIFEST_PATH);
  // El corpus no ofrece fechas de modificación editorial de estas páginas.
  // generatedAt solo registra la ejecución: no se usa como lastmod.
  const escuelaIds = Array.isArray(manifest?.escuelas) ? manifest.escuelas : [];
  const sitemap = buildSitemap({ modelIdsByLocale, escuelaIds });

  // Fail closed: jamás publicar un sitemap con una salida ausente, noindex
  // o cuyo canonical apunta a otra página.
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1]);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const target = path.resolve(PUBLIC_DIR, relative, 'index.html');
    if (!target.startsWith(path.resolve(PUBLIC_DIR) + path.sep)) throw new Error(`Ruta insegura: ${url}`);
    const html = await fs.readFile(target, 'utf8');
    if (/<meta\b(?=[^>]*name=["']robots["'])[^>]*content=["'][^"']*noindex/i.test(html)) throw new Error(`Sitemap contiene noindex: ${url}`);
    const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)/i)?.[1];
    if (canonical !== url.href) throw new Error(`Canonical incorrecto: ${url} -> ${canonical}`);
    if (url.pathname.startsWith('/en/models/') && !html.includes('data-translation-status="reviewed"')) throw new Error(`EN sin revisión: ${url}`);
  }

  // OJO: este archivo se regenera en cada build y pisa cualquier edicion
  // manual de public/robots.txt. Los cambios se hacen aqui.
  //
  // /api/data es el proxy de solo lectura del que cuelga TODO el contenido del
  // Atlas. Mientras estuvo prohibido, Googlebot no podia pedirlo al renderizar
  // y evaluaba fichas vacias: 13 paginas indexadas de 410. Gana la regla mas
  // larga, asi que este Allow tiene prioridad sobre el Disallow de abajo.
  // El resto de /api/ (pagos, sesion, eventos) sigue fuera del rastreo.
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Allow: /api/data',
    'Disallow: /api/',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    ''
  ].join('\n');

  await Promise.all([
    fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf8'),
    fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), robots, 'utf8')
  ]);

  console.log(`SEO generado: ${modelIdsByLocale.es.length} modelos es, ${modelIdsByLocale.en.length} modelos en.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildSeoFiles().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

