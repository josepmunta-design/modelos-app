import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
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

async function readModelIds() {
  const manifest = await readJson(GENERATED_MANIFEST_PATH);
  if (Array.isArray(manifest?.indexableModels)) {
    return manifest.indexableModels.map(cleanModelId).filter(Boolean);
  }
  if (Array.isArray(manifest?.models)) {
    return manifest.models.map(cleanModelId).filter(Boolean);
  }

  const index = await readJson(MODEL_INDEX_PATH);
  const sourceModels = Array.isArray(index) ? index : index?.models;
  if (Array.isArray(sourceModels)) {
    return sourceModels.map((model) => cleanModelId(model?.id)).filter(Boolean);
  }

  throw new Error('No existe un manifiesto ni un índice válido de modelos.');
}

async function buildSeoFiles() {
  const modelIds = [...new Set(await readModelIds())]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const manifest = await readJson(GENERATED_MANIFEST_PATH);
  const generatedAt = String(manifest?.generatedAt || '');
  const lastModified = /^\d{4}-\d{2}-\d{2}/.test(generatedAt)
    ? generatedAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/modelos/`,
    `${BASE_URL}/genealogia`,
    ...modelIds.map((id) => `${BASE_URL}/modelos/${encodeURIComponent(id)}`)
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

