import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const MODEL_INDEX_PATH = path.join(PUBLIC_DIR, 'assets', 'Repo', 'modelos-index.json');
const BASE_URL = 'https://apps.tumentorpsicologia.com';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function modelUrl(id) {
  return `${BASE_URL}/modelos/${encodeURIComponent(String(id).trim())}`;
}

async function buildSeoFiles() {
  const rawIndex = await fs.readFile(MODEL_INDEX_PATH, 'utf8');
  const parsedIndex = JSON.parse(rawIndex);
  const sourceModels = Array.isArray(parsedIndex) ? parsedIndex : parsedIndex.models;

  if (!Array.isArray(sourceModels)) {
    throw new Error('El índice de modelos no contiene una lista válida.');
  }

  const modelIds = [...new Set(
    sourceModels
      .map((model) => String(model?.id || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'es'));

  const lastModified = new Date().toISOString().slice(0, 10);
  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/modelos/`,
    `${BASE_URL}/genealogia`,
    ...modelIds.map(modelUrl)
  ];

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => [
      '  <url>',
      `    <loc>${escapeXml(url)}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');

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

  console.log(`SEO generado: ${urls.length} URLs (${modelIds.length} modelos).`);
}

buildSeoFiles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
