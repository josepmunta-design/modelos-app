import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadEscuelasContenido,
  modelosDeEscuela,
  renderEscuelaPage
} from './build-escuela-pages.mjs';
import { buildSitemap } from './build-seo.mjs';

const ESCUELA = {
  id: 'sistemico',
  grupo: 'Sistémico',
  titulo: 'Terapia sistémica y familiar',
  entradilla: 'El síntoma no está dentro de una persona.',
  descripcionMeta: 'Los modelos sistémicos del Atlas.',
  intro: ['Primer párrafo de la introducción.', 'Segundo párrafo.']
};

const MODELOS = [
  { id: 'palo-alto-1959', label: 'Escuela de Palo Alto', grupo: 'Sistémico', year: 1959, autores: 'Bateson' },
  { id: 'milan-1978', label: 'Escuela de Milán', grupo: 'Sistémico', year: 1978, autores: 'Selvini' },
  // Sin acento y en minusculas: asi aparece de verdad en el corpus.
  { id: 'equipos-reflexivos-1987', label: 'Equipos reflexivos', grupo: 'sistemico', year: 1987, autores: 'Andersen' },
  { id: 'act-1999', label: 'ACT', grupo: 'Cognitivo', year: 1999, autores: 'Hayes' }
];

test('el emparejado ignora acentos y mayúsculas del campo grupo', () => {
  const modelos = modelosDeEscuela(ESCUELA, MODELOS);
  assert.equal(modelos.length, 3);
  assert.ok(modelos.some((m) => m.id === 'equipos-reflexivos-1987'));
  assert.ok(!modelos.some((m) => m.id === 'act-1999'));
});

test('los alias rescatan los grupos mal escritos que hay en los datos', () => {
  const conductismo = {
    ...ESCUELA,
    id: 'conductismo',
    grupo: 'Conductismo',
    alias: ['Conductual']
  };
  const modelos = modelosDeEscuela(conductismo, [
    { id: 'exposicion-1991', label: 'Exposición prolongada', grupo: 'Conductual', year: 1991 },
    { id: 'act-1999', label: 'ACT', grupo: 'Cognitivo', year: 1999 }
  ]);
  assert.deepEqual(modelos.map((m) => m.id), ['exposicion-1991']);
});

test('la lista se ordena por año y los modelos sin año van al final', () => {
  const modelos = modelosDeEscuela(ESCUELA, [
    ...MODELOS,
    { id: 'sin-anio', label: 'Sin año', grupo: 'Sistémico' }
  ]);
  assert.deepEqual(
    modelos.map((m) => m.id),
    ['palo-alto-1959', 'milan-1978', 'equipos-reflexivos-1987', 'sin-anio']
  );
});

test('la página trae el texto, los enlaces a cada ficha y sus datos estructurados', () => {
  const html = renderEscuelaPage(ESCUELA, modelosDeEscuela(ESCUELA, MODELOS));

  assert.match(html, /<h1>Terapia sistémica y familiar<\/h1>/);
  assert.match(html, /Primer párrafo de la introducción/);
  assert.match(html, /rel="canonical" href="https:\/\/apps\.tumentorpsicologia\.com\/escuelas\/sistemico\/"/);
  assert.match(html, /href="\/modelos\/palo-alto-1959"/);
  assert.match(html, /href="\/modelos\/equipos-reflexivos-1987"/);
  assert.match(html, /"@type": "ItemList"/);
  assert.match(html, /"@type": "BreadcrumbList"/);
  assert.match(html, /"numberOfItems": 3/);

  // La ficha de otra escuela no debe aparecer aqui.
  assert.doesNotMatch(html, /act-1999/);
});

test('el contenido editorial está completo para las 13 escuelas', async () => {
  const escuelas = await loadEscuelasContenido();
  assert.equal(escuelas.length, 13);

  const ids = new Set();
  for (const e of escuelas) {
    assert.ok(!ids.has(e.id), `id duplicado: ${e.id}`);
    ids.add(e.id);

    for (const campo of ['id', 'grupo', 'titulo', 'entradilla', 'descripcionMeta']) {
      assert.ok(e[campo], `${e.id}: falta ${campo}`);
    }
    // Google trunca la descripcion alrededor de los 160 caracteres.
    assert.ok(e.descripcionMeta.length <= 160, `${e.id}: meta demasiado larga`);

    const palabras = e.intro.reduce((n, p) => n + p.split(/\s+/).length, 0);
    assert.ok(palabras >= 250, `${e.id}: solo ${palabras} palabras`);
  }
});

test('el sitemap deja las escuelas dentro de la app y no publica las rutas antiguas', () => {
  const xml = buildSitemap({
    modelIdsByLocale: { es: ['palo-alto-1959'], en: [] },
    lastModified: '2026-09-08',
    escuelaIds: ['sistemico', 'cognitivo']
  });

  assert.doesNotMatch(xml, /\/escuelas\/sistemico\//);
  assert.doesNotMatch(xml, /\/escuelas\/cognitivo\//);
  assert.doesNotMatch(xml, /\/escuelas\/terapias-expresivas-y-creativas\//);
  assert.doesNotMatch(xml, /\/metamodelos\//);
});

test('el sitemap no anuncia una portada de escuelas independiente', () => {
  const xml = buildSitemap({
    modelIdsByLocale: { es: [], en: [] },
    lastModified: '2026-09-08'
  });
  assert.equal((xml.match(/\/escuelas\/[a-z-]+\//g) || []).length, 0);
  assert.doesNotMatch(xml, /<loc>https:\/\/apps\.tumentorpsicologia\.com\/escuelas\/<\/loc>/);
});
