import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PUBLIC_DIR = process.env.MODEL_PAGES_OUTPUT_DIR
  ? path.resolve(process.env.MODEL_PAGES_OUTPUT_DIR)
  : path.join(ROOT, 'public');
const MODEL_INDEX_PATH = path.join(PUBLIC_DIR, 'assets', 'Repo', 'modelos-index.json');
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
  if (manifest?.locales && typeof manifest.locales === 'object') {
    return {
      es: (manifest.locales.es?.indexableModels || manifest.locales.es?.models || [])
        .map(cleanModelId).filter(Boolean),
      en: (manifest.locales.en?.indexableModels || manifest.locales.en?.models || [])
        .map(cleanModelId).filter(Boolean)
    };
  }
  if (Array.isArray(manifest?.indexableModels) || Array.isArray(manifest?.models)) {
    return {
      es: (manifest.indexableModels || manifest.models).map(cleanModelId).filter(Boolean),
      en: []
    };
  }

  const index = await readJson(MODEL_INDEX_PATH);
  const sourceModels = Array.isArray(index) ? index : index?.models;
  if (Array.isArray(sourceModels)) {
    return {
      es: sourceModels.map((model) => cleanModelId(model?.id)).filter(Boolean),
      en: []
    };
  }

  throw new Error('No existe un manifiesto ni un índice válido de modelos.');
}

function alternateLinks(esUrl, enUrl = '') {
  const links = [
    `    <xhtml:link rel="alternate" hreflang="es" href="${escapeXml(esUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(esUrl)}" />`
  ];
  if (enUrl) links.splice(1, 0, `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />`);
  return links;
}

function sitemapUrl(url, lastModified, alternates = null) {
  return [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    `    <lastmod>${lastModified}</lastmod>`,
    ...(alternates ? alternateLinks(alternates.es, alternates.en) : []),
    '  </url>'
  ].join('\n');
}

export function buildSitemap({ baseUrl = BASE_URL, modelIdsByLocale, lastModified }) {
  const esIds = [...new Set(modelIdsByLocale.es)].sort((a, b) => a.localeCompare(b, 'es'));
  const enIds = [...new Set(modelIdsByLocale.en)].sort((a, b) => a.localeCompare(b, 'en'));
  const enSet = new Set(enIds);
  const libraryAlternates = {
    es: `${baseUrl}/modelos/`,
    en: `${baseUrl}/en/models/`
  };
  const entries = [
    sitemapUrl(`${baseUrl}/`, lastModified),
    sitemapUrl(libraryAlternates.es, lastModified, libraryAlternates),
    sitemapUrl(libraryAlternates.en, lastModified, libraryAlternates),
    sitemapUrl(`${baseUrl}/genealogia`, lastModified),
    ...esIds.map((id) => {
      const es = `${baseUrl}/modelos/${encodeURIComponent(id)}`;
      const en = enSet.has(id) ? `${baseUrl}/en/models/${encodeURIComponent(id)}` : '';
      return sitemapUrl(es, lastModified, en ? { es, en } : null);
    }),
    ...enIds.map((id) => {
      const es = `${baseUrl}/modelos/${encodeURIComponent(id)}`;
      const en = `${baseUrl}/en/models/${encodeURIComponent(id)}`;
      return sitemapUrl(en, lastModified, { es, en });
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
  const generatedAt = String(manifest?.generatedAt || '');
  const lastModified = /^\d{4}-\d{2}-\d{2}/.test(generatedAt)
    ? generatedAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const sitemap = buildSitemap({ modelIdsByLocale, lastModified });

  const robots = [
    'User-agent: *',
    'Allow: /',
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

