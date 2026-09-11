import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.env.MODEL_PAGES_OUTPUT_DIR || 'public');
const base = (process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com').replace(/\/+$/, '');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'modelos/.generated-pages.json'), 'utf8'));
const xml = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(urls).size, urls.length, 'Sitemap duplicado');
assert.ok(!xml.includes('<lastmod>'), 'El corpus actual no ofrece fechas editoriales fiables');
assert.ok(!urls.includes(`${base}/genealogia`), 'Alias noindex en sitemap');
const enIds = new Set(manifest.locales.en.indexableModels);
const esIds = new Set(manifest.locales.es.indexableModels);
const pages = new Map();
const bodyOnly = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const linksOf = html => [...bodyOnly(html).matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => new URL(match[1].replaceAll('&amp;', '&'), base));

for (const url of urls) {
  assert.ok(url.startsWith(`${base}/`), `Origen inesperado: ${url}`);
  const pathname = new URL(url).pathname;
  const file = path.resolve(root, `.${decodeURIComponent(pathname)}`, 'index.html');
  assert.ok(file.startsWith(root + path.sep));
  const html = await fs.readFile(file, 'utf8');
  assert.equal((bodyOnly(html).match(/<h1\b/gi) || []).length, 1, `${pathname}: H1`);
  assert.ok(html.includes(`rel="canonical" href="${url}"`), `${pathname}: canonical`);
  assert.ok(!/<meta\b(?=[^>]*name="robots")[^>]*content="[^"]*noindex/i.test(html), `${pathname}: noindex`);
  const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const isModel = /^\/(?:modelos|en\/models)\/[^/]+$/.test(pathname);
  if (isModel) {
    const graph = schemas.flatMap(schema => schema['@graph'] || [schema]);
    assert.ok(graph.some(item => item['@type'] === 'WebPage'), `${pathname}: WebPage`);
    assert.ok(!graph.some(item => item['@type'] === 'Article'), `${pathname}: Article`);
    const breadcrumb = graph.find(item => item['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumb, `${pathname}: breadcrumb schema`);
    if (!pathname.startsWith('/en/')) for (const item of breadcrumb.itemListElement.slice(0, -1)) assert.ok(linksOf(html).some(link => link.href === item.item), `${pathname}: breadcrumb link`);
    assert.ok(linksOf(html).some(link => /^\/(?:modelos|en\/models)\/[^/]+$/.test(link.pathname)), `${pathname}: relacionados`);
    assert.ok(html.includes('property="og:type" content="website"'));
  }
  if (pathname.startsWith('/en/models/')) assert.ok(html.includes('data-translation-status="reviewed"'), `${pathname}: EN sin revisión`);
  pages.set(url, { html, links: linksOf(html) });
}

for (const [locale, ids] of [['es', esIds], ['en', enIds]]) {
  const prefix = locale === 'es' ? 'modelos' : 'en/models';
  for (const id of ids) {
    const url = `${base}/${prefix}/${id}`;
    assert.ok(pages.has(url), `Falta en sitemap: ${url}`);
    assert.ok(pages.get(`${base}/${prefix}/`).links.some(link => link.href === url), `Falta en índice ${locale}: ${id}`);
    const html = pages.get(url).html;
    if (enIds.has(id)) {
      assert.ok(esIds.has(id), `EN sin fuente española: ${id}`);
      for (const [lang, target] of [['es', `${base}/modelos/${id}`], ['en', `${base}/en/models/${id}`], ['x-default', `${base}/modelos/${id}`]]) {
        assert.ok(html.includes(`hreflang="${lang}" href="${target}"`), `${url}: alternate ${lang}`);
      }
    } else assert.ok(!html.includes('hreflang="en"'), `${url}: alternate EN no revisado`);
  }
}

for (const id of manifest.escuelas) {
  const url = `${base}/escuelas/${id}/`;
  assert.ok(pages.has(url));
  assert.ok(pages.get(`${base}/modelos/`).links.some(link => link.href === url), `Escuela huérfana: ${id}`);
}

// Crawl only real HTML links, without the sitemap as a discovery seed.
const reached = new Set();
const queue = [`${base}/`];
while (queue.length) {
  const url = queue.shift();
  if (reached.has(url) || !pages.has(url)) continue;
  reached.add(url);
  queue.push(...pages.get(url).links.map(link => link.origin + link.pathname));
}
for (const url of urls) assert.ok(reached.has(url), `Huérfana desde la home: ${url}`);
for (const {links} of pages.values()) for (const link of links) {
  if (link.origin !== base || link.search || link.hash) continue;
  if (/^\/(?:modelos|en\/models)\/[^/]+$|^\/escuelas\/[^/]+\/$/.test(link.pathname)) {
    await fs.access(path.join(root, decodeURIComponent(link.pathname), 'index.html'));
  }
}

const robots = await fs.readFile(path.join(root, 'robots.txt'), 'utf8');
for (const rule of ['User-agent: *', 'Allow: /', 'Allow: /api/data', 'Disallow: /api/', `Sitemap: ${base}/sitemap.xml`]) assert.ok(robots.split(/\r?\n/).includes(rule), rule);
if (process.env.SEO_CHECK_HTTP) {
  for (let i = 0; i < urls.length; i += 8) await Promise.all(urls.slice(i, i + 8).map(async url => {
    const response = await fetch(process.env.SEO_CHECK_HTTP + new URL(url).pathname, { redirect: 'manual' });
    assert.equal(response.status, 200, `HTTP ${url}`);
    assert.equal(await response.text(), pages.get(url).html, `HTTP no sirve el HTML generado: ${url}`);
  }));
}
console.log(`SEO verificado: ${urls.length} URLs canónicas, alcanzables desde HTML; ${esIds.size} ES, ${enIds.size} EN, ${manifest.escuelas.length} escuelas. Sin lastmod artificial.`);
for (const route of ['/modelos/', '/escuelas/psicoanalisis/', '/modelos/act-hayes-strosahl-wilson-1999']) {
  const page = pages.get(base + route);
  if (page) console.log(`${route}: ${page.links.filter(link => link.origin === base).length} enlaces internos, 1 H1.`);
}
