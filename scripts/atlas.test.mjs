import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, readRoute, routeUrl } from '../public/atlas/state.js';
import { coordinates, createAtlasData, normalizeInfluences } from '../public/atlas/data.js';
import { layoutGenealogy, genealogyRelations } from '../public/atlas/views/genealogy-layout.js';
import { cityKey, cityCoordinates, nodeSize, clusterAppearance } from '../public/atlas/views/map-geometry.js';

test('map city clusters use stable median coordinates without mutating catalog data', () => {
  const models = [
    { id: 'a', ciudad: 'París, Francia', pais: 'Francia', lat: 48, lon: 2 },
    { id: 'b', ciudad: 'Paris', pais: 'FRANCIA', lat: 50, lon: 4 },
    { id: 'c', ciudad: 'Paris', pais: 'Estados Unidos', lat: 33, lon: -95 },
    { id: 'missing', ciudad: 'Paris', pais: 'Francia', lat: null, lon: 2 },
  ];
  const points = cityCoordinates(models);
  assert.equal(cityKey(models[0]), cityKey(models[1]));
  assert.deepEqual(points.get(cityKey(models[0])), [49, 3]);
  assert.deepEqual(points.get(cityKey(models[2])), [33, -95]);
  assert.deepEqual(cityCoordinates([...models].reverse()), points);
  assert.equal(models[0].lat, 48);
  assert.equal(cityKey({ pais: 'Francia' }), '');
});

test('map rings show school proportions and original cluster and node sizes', () => {
  assert.deepEqual(clusterAppearance(['#aabbcc', '#112233', '#aabbcc', '#aabbcc']), {
    size: 40, gradient: '#aabbcc 0.0deg 270.0deg, #112233 270.0deg 360.0deg',
  });
  assert.equal(clusterAppearance(Array(10).fill('#999')).size, 48);
  assert.equal(clusterAppearance(Array(40).fill('#999')).size, 58);
  assert.deepEqual([{}, { importance: -1 }, { importance: 2 }, { importance: 9 }].map(nodeSize), [15, 9, 15, 21]);
});

test('view changes retain classification, query and model; shared URLs round-trip', () => {
  const store = createStore({ group: 'school', target: 'Psicoanálisis', query: 'Freud', modelId: 'freud' });
  store.set({ view: 'map' });
  const url = routeUrl('https://example.test/modelos/freud?theme=light', store.get());
  assert.deepEqual(readRoute(url), store.get());
  assert.match(url, /theme=light/);
  store.set({ view: 'genealogy' });
  assert.equal(store.get().modelId, 'freud');
  assert.throws(() => store.set({ view: '../unsafe' }));
  assert.equal(readRoute('/modelos/?view=unknown').view, 'list');
});

test('missing coordinates cannot become artificial points at zero', () => {
  for (const model of [{ lat: null, lon: 5 }, { lat: '', lon: 5 }, { lat: ' ', lon: 5 }, { lat: 91, lon: 5 }, { lat: 0, lon: 0 }]) assert.equal(coordinates(model), null);
  assert.deepEqual(coordinates({ latitude: '0', longitude: '30' }), [0, 30]);
  assert.deepEqual(coordinates({ lat: 41.2, lng: 2.1 }), [41.2, 2.1]);
});

test('ascending and descending influences have the same direction and deduplicate', () => {
  assert.deepEqual(normalizeInfluences([
    { id: 'b', influenciasAscendentes: [{ id: 'a' }, 'b'], influenciasDescendentes: ['c'] },
    { id: 'a', influyeEn: ['b'] },
  ]), [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]);
  assert.throws(() => normalizeInfluences({}));
});

test('genealogy uses a shared date axis without card overlaps or invented years', () => {
  const models = Array.from({ length: 30 }, (_, i) => ({ id: String(i), label: `Model ${i}`, year: 1900 + i % 8, grupo: i % 2 ? 'A' : 'B' }));
  const layout = layoutGenealogy([...models, { id: 'undated', label: 'No year', grupo: 'A' }]);
  assert.equal(layout.nodes.length, 30);
  for (const a of layout.nodes) for (const b of layout.nodes) {
    if (a.id === b.id) continue;
    if (a.year === b.year) assert.equal(a.y, b.y);
    const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
  }
});

test('views share catalog and ficha cache; failed influence requests can retry', async () => {
  let reads = 0, fichas = 0;
  const models = [{ id: 'a', label: 'A', file: 'a.json' }, { id: 'b', label: 'B', lat: 40, lon: 2 }];
  const data = createAtlasData({
    models: () => models, filteredModels: () => [models[0]], loadCatalog: async () => {},
    publicModel: async model => { fichas++; return { ...model, lat: 10, lon: 20 }; },
    readJson: async () => { reads++; if (reads === 1) throw new Error('offline'); return []; },
  });
  await Promise.all([data.locate(), data.locate()]);
  assert.equal(fichas, 1);
  assert.deepEqual(coordinates(data.filtered()[0]), [10, 20]);
  assert.equal(models[0].lat, undefined, 'view enrichment does not mutate the canonical catalog');
  await assert.rejects(data.influences());
  await Promise.all([data.influences(), data.influences()]);
  assert.equal(reads, 2);
});

test('genealogy retains both directions, other schools and named external references', () => {
  const catalog = [
    { id: 'selected', label: 'Selected', grupo: 'A' },
    { id: 'ancestor', label: 'Ancestor', grupo: 'A' },
    { id: 'other-school', label: 'Other school', grupo: 'B' },
  ];
  const edges = normalizeInfluences([
    { id: 'selected', influenciasAscendentes: ['ancestor', 'external-1950'], influenciasDescendentes: ['other-school', 'named-reference'] },
    { id: 'other-school', influenciasAscendentes: ['selected'] },
  ]);
  const { all, edges: internal } = genealogyRelations(catalog, edges, new Map([['named-reference', 'Named external theory']]));
  assert.equal(all.selected.parent, 'ancestor');
  assert.deepEqual(all.selected.extAsc, ['External · 1950']);
  assert.deepEqual(all.selected.extDesc, ['Named external theory']);
  assert.deepEqual(internal.find(e => e.to === 'other-school'), { from: 'selected', to: 'other-school', fromS: 'A', toS: 'B' });
  assert.equal(internal.length, 2);
  assert.equal(catalog[0].extAsc, undefined, 'interaction metadata does not mutate shared models');
});

test('influence names and edges reuse one in-flight data request', async () => {
  let reads = 0;
  const data = createAtlasData({ readJson: async () => { reads++; return [{ id: 'a', nombre: 'Theory A', influyeEn: ['b'] }]; } });
  const [edges, names] = await Promise.all([data.influences(), data.influenceNames()]);
  assert.deepEqual(edges, [{ from: 'a', to: 'b' }]);
  assert.equal(names.get('a'), 'Theory A');
  assert.equal(reads, 1);
});

test('the clean library URL belongs to the portal; every view stays addressable', () => {
  const store = createStore({});
  assert.equal(routeUrl('https://example.test/modelos/', store.get()), '/modelos/?view=list');
  assert.equal(routeUrl('https://example.test/modelos/', { ...store.get(), view: 'map' }, '/en/models/'), '/en/models/?view=map');
  assert.equal(readRoute('/modelos/').view, 'list');
  for (const view of ['list', 'network', 'map', 'genealogy']) {
    assert.equal(readRoute(routeUrl('/modelos/', { ...store.get(), view })).view, view);
  }
});
