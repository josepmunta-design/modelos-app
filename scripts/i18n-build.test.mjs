import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { isAllowedPath, isPublicModelDataPath } from '../api/data.js';
import { buildSitemap } from './build-seo.mjs';
import { mergeModelOverlay, renderEnglishLibraryPage, renderModelPage } from './build-model-pages.mjs';

const TEMPLATE = `<!doctype html>
<html lang="es">
<head>
  <title id="seoTitle">Modelos</title>
  <meta id="seoDescription" name="description" content="">
  <link id="seoCanonical" rel="canonical" href="">
  <link id="seoAlternateEs" rel="alternate" hreflang="es" href="">
  <link id="seoAlternateEn" rel="alternate" hreflang="en" href="">
  <link id="seoAlternateDefault" rel="alternate" hreflang="x-default" href="">
  <meta property="og:locale" content="es_ES">
  <meta id="seoOgTitle" property="og:title" content="">
  <meta id="seoOgDescription" property="og:description" content="">
  <meta id="seoOgUrl" property="og:url" content="">
  <meta id="seoTwitterTitle" name="twitter:title" content="">
  <meta id="seoTwitterDescription" name="twitter:description" content="">
  <meta id="seoOgImageAlt" property="og:image:alt" content="">
  <meta property="og:type" content="website">
  <meta name="robots" content="index,follow">
  <script id="seoStructuredData" type="application/ld+json">{}</script>
</head>
<body></body>
</html>`;

const MODEL = {
  id: 'example-model',
  label: 'Example model',
  grupo: 'Cognitivo',
  year: 2020,
  autores: 'Example Author',
  frase: 'A sufficiently clear English quotation.',
  descripcion: 'This reviewed English description is intentionally longer than one hundred and sixty characters so that the generated psychotherapy model page is indexable and exercises the complete SEO branch.',
  teoriaCambio: { resumen: 'Change follows a clear and testable process.' },
  ideasPrincipales: [{ id: 'idea_1', titulo: 'Core mechanism', desarrollo: 'Description.' }],
  influencias: ['Learning theory'],
  refs: ['Example (2020).']
};

test('la página inglesa genera metadatos, hreflang y noscript localizados', () => {
  const html = renderModelPage(MODEL, [MODEL], TEMPLATE, 'en', new Set([MODEL.id]));

  assert.match(html, /<html lang="en" data-translation-status="reviewed">/);
  assert.match(html, /Example model \| Psychotherapy model/);
  assert.match(html, /rel="canonical" href="https:\/\/apps\.tumentorpsicologia\.com\/en\/models\/example-model"/);
  assert.match(html, /hreflang="es"/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="x-default"/);
  assert.match(html, /property="og:locale" content="en_GB"/);
  assert.equal((html.match(/property="og:locale"/g) || []).length, 1);
  assert.match(html, /name="translation-status" content="reviewed"/);
  assert.match(html, /Clinical psychotherapy model profile: Example model/);
  assert.match(html, /<h2>Theory of change<\/h2>/);
  assert.match(html, /<h2>Core ideas<\/h2>/);
  assert.doesNotMatch(html, /Teoría del cambio|Ideas fundamentales|Modelos relacionados/);
  assert.match(html, /"inLanguage": "en"/);
});

test('la portada inglesa se genera como página estática indexable', () => {
  const html = renderEnglishLibraryPage(TEMPLATE);
  assert.match(html, /<html lang="en" data-translation-status="reviewed">/);
  assert.match(html, /Psychotherapy Model Library \| Tu Mentor Psicología/);
  assert.match(html, /rel="canonical" href="https:\/\/apps\.tumentorpsicologia\.com\/en\/models\/"/);
  assert.match(html, /hreflang="es" href="https:\/\/apps\.tumentorpsicologia\.com\/modelos\/"/);
  assert.match(html, /hreflang="en" href="https:\/\/apps\.tumentorpsicologia\.com\/en\/models\/"/);
  assert.match(html, /"@type": "CollectionPage"/);
  assert.match(html, /<h1>Psychotherapy Model Library<\/h1>/);
});

test('la fusión usada por el build conserva orden y claves canónicas', () => {
  const source = {
    id: 'example-model',
    year: 2020,
    ideasPrincipales: [
      { id: 'idea_1', titulo: 'Primera' },
      { id: 'idea_2', titulo: 'Segunda' }
    ],
    influencias: ['Conductismo']
  };
  const merged = mergeModelOverlay(source, {
    id: 'example-model',
    _translation: { status: 'reviewed' },
    ideasPrincipales: [{ id: 'idea_2', titulo: 'Second' }],
    influencias: { Conductismo: 'Behaviourism' }
  });

  assert.equal(merged.year, 2020);
  assert.deepEqual(merged.ideasPrincipales.map((idea) => idea.titulo), ['Primera', 'Second']);
  assert.deepEqual(merged.influencias, ['Behaviourism']);
});

test('el sitemap solo añade URLs inglesas para modelos revisados', () => {
  const xml = buildSitemap({
    baseUrl: 'https://example.test',
    lastModified: '2026-09-02',
    modelIdsByLocale: {
      es: ['translated', 'spanish-only'],
      en: ['translated']
    }
  });

  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(xml, /<loc>https:\/\/example\.test\/en\/models\/translated<\/loc>/);
  assert.doesNotMatch(xml, /\/en\/models\/spanish-only/);
  assert.match(xml, /hreflang="x-default" href="https:\/\/example\.test\/modelos\/translated"/);
});

test('los diccionarios ES y EN conservan exactamente las mismas claves', async () => {
  const localeRoot = path.join(process.cwd(), 'public', 'modelos', 'i18n');
  const [es, en] = await Promise.all([
    fs.readFile(path.join(localeRoot, 'es.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(localeRoot, 'en.json'), 'utf8').then(JSON.parse)
  ]);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test('todos los valores de tag declarados por la app tienen etiqueta localizada', async () => {
  const [html, es, en] = await Promise.all([
    fs.readFile(path.join(process.cwd(), 'public', 'modelos', 'index.html'), 'utf8'),
    fs.readFile(path.join(process.cwd(), 'public', 'modelos', 'i18n', 'es.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(process.cwd(), 'public', 'modelos', 'i18n', 'en.json'), 'utf8').then(JSON.parse)
  ]);
  const match = html.match(/const TAG_VALUE_LABELS = (\{[\s\S]*?\n\s*\});\s*\n\s*const TAG_FILTER_STATE/);
  assert.ok(match, 'No se ha encontrado TAG_VALUE_LABELS en la plantilla');
  const labels = vm.runInNewContext(`(${match[1]})`);
  const missing = Object.keys(labels).filter((value) => (
    !Object.hasOwn(es, `taxonomy.tagValue.${value}`) ||
    !Object.hasOwn(en, `taxonomy.tagValue.${value}`)
  ));
  assert.deepEqual(missing, []);
});

test('todos los scripts embebidos de la plantilla mantienen sintaxis válida', async () => {
  const html = await fs.readFile(path.join(process.cwd(), 'public', 'modelos', 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, body]) => !/\bsrc\s*=/i.test(attributes) && !/application\/ld\+json/i.test(attributes) && body.trim())
    .map((match) => match[2]);
  assert.ok(scripts.length >= 1);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
});

test('Vercel sirve las fichas inglesas desde el árbol estático revisado', async () => {
  const config = JSON.parse(await fs.readFile(path.join(process.cwd(), 'vercel.json'), 'utf8'));
  const route = config.rewrites.find((rewrite) => rewrite.source === '/en/models/:id');
  assert.equal(route?.destination, '/en/models/:id/index.html');
  const libraryRoutes = config.rewrites.filter((rewrite) => ['/en/models', '/en/models/'].includes(rewrite.source));
  assert.equal(libraryRoutes.length, 2);
  libraryRoutes.forEach((rewrite) => assert.equal(rewrite.destination, '/en/models/index.html'));
});

test('la API expone solo overlays cuya fuente española ya es pública', () => {
  const publicPaths = [
    'Core/i18n/en/modelos-publicos/cognitivo/example.json',
    'Core/i18n/en/escuelas/cognitivo.json',
    'Core/i18n/en/taxonomias.json'
  ];
  const privatePaths = [
    'Core/i18n/en/modelos/cognitivo/example.json',
    'Core/i18n/en/documentos/modelos/epistemologia/tabla-comparativa.json'
  ];

  publicPaths.forEach((dataPath) => assert.equal(isPublicModelDataPath(dataPath), true));
  privatePaths.forEach((dataPath) => assert.equal(isPublicModelDataPath(dataPath), false));
  assert.equal(isAllowedPath('../Core/i18n/en/taxonomias.json'), false);
});

test('los enlaces de idioma conservan la ficha en enlaces directos y al navegar por el historial', async () => {
  const source = await fs.readFile(path.join(process.cwd(), 'public', 'modelos', 'i18n', 'runtime.js'), 'utf8');
  const listeners = new Map();
  const attributes = new Map();
  const links = ['es', 'en'].map((locale) => ({
    dataset: { localeLink: locale },
    href: '',
    setAttribute(name, value) { attributes.set(`${locale}:${name}`, value); },
    removeAttribute(name) { attributes.delete(`${locale}:${name}`); }
  }));
  const location = { pathname: '/en/models/model%20one' };
  const document = {
    readyState: 'complete',
    documentElement: { lang: '', dataset: { translationStatus: 'reviewed' } },
    querySelector: () => null,
    querySelectorAll: (selector) => selector === '[data-locale-link]' ? links : [],
    addEventListener() {},
    dispatchEvent() {}
  };
  const window = {
    addEventListener(type, handler) { listeners.set(type, handler); }
  };

  vm.runInNewContext(source, {
    console,
    CustomEvent: class CustomEvent {},
    document,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    location,
    window
  });
  await window.TMPS_MODELOS_I18N.ready;

  assert.equal(window.TMPS_MODELOS_I18N.getModelId(), 'model one');
  assert.equal(links[0].href, '/modelos/model%20one');
  assert.equal(links[1].href, '/en/models/model%20one');
  assert.equal(attributes.get('en:aria-current'), 'page');

  location.pathname = '/modelos/second-model';
  listeners.get('popstate')();
  assert.equal(links[0].href, '/modelos/second-model');
  assert.equal(links[1].href, '/en/models/second-model');
});
