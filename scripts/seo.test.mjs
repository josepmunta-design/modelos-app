import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { buildSitemap } from './build-seo.mjs';
import { hasCompletePublicTranslation, isIndexableModel, relatedModelsFor, renderModelPage, renderEnglishLibraryPage } from './build-model-pages.mjs';
import { buildSchoolsIndex, renderDirectory, replaceDirectory, schoolFor } from './seo-navigation.mjs';

test('sitemap no hereda fechas globales y excluye EN sin pareja ES', () => {
  const xml = buildSitemap({ modelIdsByLocale: { es: ['a', 'a'], en: ['a', 'orphan'] }, escuelaIds: ['cognitivo', 'cognitivo'], lastModified: '2026-09-11' });
  assert.ok(!xml.includes('lastmod'));
  assert.ok(!xml.includes('orphan'));
  const urls = [...xml.matchAll(/<loc>([^<]+)/g)].map(match => match[1]);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(!urls.some(url => url.endsWith('/genealogia')));
});

test('una revisión incompleta no publica texto heredado del español', () => {
  const source = { label: 'Modelo', descripcion: 'Descripción', ideasPrincipales: [{id: 'i', titulo: 'Idea', desarrollo: 'Desarrollo'}], influencias: ['Aprendizaje'] };
  const overlay = { label: 'Model', descripcion: 'Description', ideasPrincipales: {i: {titulo: 'Idea', desarrollo: 'Explanation'}}, influencias: {Aprendizaje: 'Learning'} };
  assert.equal(hasCompletePublicTranslation(source, overlay), true);
  assert.equal(hasCompletePublicTranslation(source, {...overlay, ideasPrincipales: {i: {titulo: 'Idea'}}}), false);
  assert.equal(hasCompletePublicTranslation(source, {...overlay, influencias: {}}), false);
  assert.equal(hasCompletePublicTranslation(source, {...overlay, descripcion: ''}), false);
  assert.equal(isIndexableModel({descripcion: 'a'.repeat(200), __seoDetail: false}), false);
});

test('relaciones reproducibles por escuela sin rellenar con modelos ajenos', () => {
  const model = {id:'a', grupo:'Sistémico', year:1980, label:'A'};
  const pool = [model, {id:'b', grupo:'sistemico', year:1981, label:'B'}, {id:'c', grupo:'Cognitivo', year:1980, label:'C'}];
  assert.deepEqual(relatedModelsFor(model, pool, 'es').map(item => item.id), ['b']);
  assert.equal(schoolFor(pool[1]).id, 'sistemico');
  assert.deepEqual(relatedModelsFor(model, pool.toReversed(), 'es'), relatedModelsFor(model, pool, 'es'));
});

test('el directorio enlaza también grupos no reconocidos y no se duplica al regenerar', () => {
  const models = [{id:'a', label:'A & B', grupo:'Cognitivo'}, {id:'b', label:'Otro', grupo:'Nuevo'}];
  const directory = renderDirectory(models);
  assert.ok(directory.includes('href="/modelos/a"') && directory.includes('A &amp; B'));
  assert.ok(directory.includes('href="/modelos/b"'));
  assert.ok(directory.includes('/modelos/escuelas/cognitivo/'));
  const template = '<!-- ATLAS DIRECTORY START --><!-- ATLAS DIRECTORY END -->';
  const first = replaceDirectory(template, directory);
  assert.equal(replaceDirectory(first, directory), first);
});

test('los hubs del índice existen como tarjetas HTML aun sin JS y se regeneran sin duplicados', async () => {
  const template = '<div class="schools" id="schoolsGrid"></div><!-- SCHOOLS GRID END -->';
  const models = [{id:'a', label:'A', grupo:'Cognitivo'}];
  const first = await buildSchoolsIndex(models, template);
  assert.ok(first.includes('href="/modelos/escuelas/cognitivo/"'));
  assert.ok(!first.includes(' hidden'));
  assert.equal(await buildSchoolsIndex(models, first), first);
});

test('la plantilla real produce un solo H1, breadcrumb coherente y WebPage sin autor histórico ficticio', async () => {
  const template = await fs.readFile('public/modelos/index.html', 'utf8');
  const model = {id:'a', label:'Modelo A', grupo:'Cognitivo', descripcion:'Texto '.repeat(40), ideasPrincipales:[], influencias:[], refs:[]};
  const html = renderModelPage(model, [model, {...model, id:'b', label:'Modelo B'}], template);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(html.includes('/modelos/escuelas/cognitivo/'));
  assert.ok(html.includes('<a href="/modelos/b"'));
  assert.ok(!html.includes('"@type": "Article"'));
  assert.ok(!html.includes('"@type": "Person"'));
  assert.ok(!html.includes('hreflang="en"'));
  assert.ok(!html.includes('class="atlas-directory"'), 'No duplicar el directorio completo en cada ficha');
  for (const english of [renderEnglishLibraryPage(template, [model]), renderModelPage(model, [model], template, 'en', new Set(['a']))]) {
    assert.ok(english.includes('href="/en/models/?view=list"'));
    assert.ok(!english.includes('href="/modelos/?view='));
  }
});

test('hidratar conserva schema sin cambiar la vista y navegar no arrastra hreflang EN', async () => {
  const source = await fs.readFile('public/modelos/legacy/bootstrap.js', 'utf8');
  const code = source.slice(source.indexOf('function setSeoMeta'), source.indexOf('  // ✅ evita TDZ'));
  const nodes = new Map();
  const create = () => ({ setAttribute(name,value){this[name]=value;}, remove(){nodes.delete(this.id);} });
  for (const id of ['seoCanonical','seoAlternateEs','seoAlternateEn','seoAlternateDefault','seoDescription','seoStructuredData']) nodes.set(id, {id,...create()});
  const nav = [];
  const panel = { querySelector: () => null, insertAdjacentHTML: (_,html) => nav.push(html) };
  nodes.set('modelInfo',panel);
  const base = 'https://apps.tumentorpsicologia.com';
  const context = {
    document: {getElementById: id => nodes.get(id), querySelector: () => null, createElement: create, head:{append:node => nodes.set(node.id,node)}},
    window: {TMPS_GENERATED_MODEL_SEO: {url:base+'/modelos/a', schema:'{"@type":"WebPage"}', breadcrumb:'<nav>School</nav>', related:'<nav>Related</nav>', english:base+'/en/models/a'}, MODELS_ALL:[]},
    MODELOS_LOCALE:'es', SEO_LOCALE:{shortTitle:'Atlas',language:'es',modelSuffix:'Modelo'}, SEO_LIBRARY_URL:base+'/modelos/', SEO_LIBRARY_TITLE:'Atlas', SEO_LIBRARY_DESCRIPTION:'Atlas',
    compactSeoText: String, truncateSeoText: String, escapeHtml: String, buildModelPath: id => '/modelos/'+id
  };
  vm.createContext(context); vm.runInContext(code,context);
  context.setLibrarySeo(); context.setModelSeo({id:'a',label:'A'});
  assert.equal(nodes.get('seoStructuredData').textContent, '{"@type":"WebPage"}');
  assert.equal(nodes.get('seoAlternateEn').href, base+'/en/models/a');
  assert.deepEqual(nav, [], 'No añadir elementos visibles al hidratar');
  context.setModelSeo({id:'b',label:'B'});
  assert.ok(!nodes.has('seoAlternateEn'));
  assert.ok(!nodes.get('seoStructuredData').textContent.includes('Article'));
});
