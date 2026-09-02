import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const publicDir = process.env.MODEL_PAGES_OUTPUT_DIR
  ? path.resolve(process.env.MODEL_PAGES_OUTPUT_DIR)
  : path.join(root, 'public');
const manifestPath = path.join(publicDir, 'modelos', '.generated-pages.json');
const baseUrl = String(process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com')
  .replace(/\/+$/, '');

function requireText(html, expected, label, errors) {
  if (!html.includes(expected)) errors.push(`${label}: falta ${expected}`);
}

async function validate() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const englishIds = Array.isArray(manifest?.locales?.en?.models)
    ? manifest.locales.en.models
    : [];
  const errors = [];
  const libraryPath = path.join(publicDir, 'en', 'models', 'index.html');
  try {
    const libraryHtml = await fs.readFile(libraryPath, 'utf8');
    const esLibraryUrl = `${baseUrl}/modelos/`;
    const enLibraryUrl = `${baseUrl}/en/models/`;
    requireText(libraryHtml, '<html lang="en" data-translation-status="reviewed">', 'biblioteca inglesa', errors);
    requireText(libraryHtml, '<meta name="translation-status" content="reviewed">', 'biblioteca inglesa', errors);
    requireText(libraryHtml, `rel="canonical" href="${enLibraryUrl}"`, 'biblioteca inglesa', errors);
    requireText(libraryHtml, `hreflang="es" href="${esLibraryUrl}"`, 'biblioteca inglesa', errors);
    requireText(libraryHtml, `hreflang="en" href="${enLibraryUrl}"`, 'biblioteca inglesa', errors);
    requireText(libraryHtml, `hreflang="x-default" href="${esLibraryUrl}"`, 'biblioteca inglesa', errors);
    requireText(libraryHtml, 'property="og:locale" content="en_GB"', 'biblioteca inglesa', errors);
    requireText(libraryHtml, '"@type": "CollectionPage"', 'biblioteca inglesa', errors);
    requireText(libraryHtml, '"inLanguage": "en"', 'biblioteca inglesa', errors);
    requireText(libraryHtml, '<h1>Psychotherapy Model Library</h1>', 'biblioteca inglesa', errors);
  } catch (error) {
    errors.push(`biblioteca inglesa: no se puede leer ${libraryPath}: ${error.message}`);
  }

  for (const id of englishIds) {
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(String(id))) {
      errors.push(`ID inglés no válido: ${id}`);
      continue;
    }
    const htmlPath = path.join(publicDir, 'en', 'models', id, 'index.html');
    let html;
    try {
      html = await fs.readFile(htmlPath, 'utf8');
    } catch (error) {
      errors.push(`${id}: no se puede leer ${htmlPath}: ${error.message}`);
      continue;
    }

    const esUrl = `${baseUrl}/modelos/${encodeURIComponent(id)}`;
    const enUrl = `${baseUrl}/en/models/${encodeURIComponent(id)}`;
    requireText(html, '<html lang="en" data-translation-status="reviewed">', id, errors);
    requireText(html, '<meta name="translation-status" content="reviewed">', id, errors);
    requireText(html, `rel="canonical" href="${enUrl}"`, id, errors);
    requireText(html, `hreflang="es" href="${esUrl}"`, id, errors);
    requireText(html, `hreflang="en" href="${enUrl}"`, id, errors);
    requireText(html, `hreflang="x-default" href="${esUrl}"`, id, errors);
    requireText(html, 'property="og:locale" content="en_GB"', id, errors);
    requireText(html, '"inLanguage": "en"', id, errors);

    const noscript = html.match(/<noscript>[\s\S]*?<\/noscript>/i)?.[0] || '';
    for (const spanishHeading of [
      '<h2>Teoría del cambio</h2>',
      '<h2>Ideas fundamentales</h2>',
      '<h2>Influencias</h2>',
      '<h2>Referencias principales</h2>',
      'aria-label="Modelos relacionados"'
    ]) {
      if (noscript.includes(spanishHeading)) errors.push(`${id}: noscript conserva ${spanishHeading}`);
    }
  }

  if (errors.length) throw new Error(`Validación i18n generada fallida:\n- ${errors.join('\n- ')}`);
  console.log(`Páginas inglesas verificadas: ${englishIds.length}.`);
}

validate().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
