import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/modelos/legacy/library.js', import.meta.url), 'utf8');
const start = source.indexOf('function getModelDependencyParentId(');
const end = source.indexOf('async function openSchoolTimeline(', start);
assert.ok(start >= 0 && end > start);

const context = {
  TYPE_SECTION_ORDER: ['modelo', 'programa', 'marco'],
  typeSectionLabel: (key) => key,
  getModelTypeInfo: (model) => ({ key: model.tipo }),
  colorForSchoolLabel: () => '#7ab6b3',
  escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
  currentModelId: '',
  buildModelPath: (id) => `/modelos/${id}`,
  isEpistemologiaListMode: () => false,
  buildModelCardAvatarHtml: () => '',
};
runInNewContext(`${source.slice(start, end)}\nglobalThis.render = buildModelSectionsMarkup;`, context);

test('la lista muestra una dependencia de tres niveles una sola vez', () => {
  const models = [
    { id: 'eft', label: 'EFT', tipo: 'modelo', grupo: 'Humanista' },
    { id: 's13eftp1999', label: 'EFT-C', tipo: 'programa', grupo: 'Humanista', pende: 'eft' },
    { id: 'efit-johnson-campbell-2022', label: 'Emotionally Focused Individual Therapy (EFIT)', templabel: 'EFIT', tipo: 'modelo', grupo: 'Humanista', pende: 's13eftp1999' },
    { id: 'efst', label: 'EFST', tipo: 'programa', grupo: 'Humanista', pende: 'eft' },
  ];
  const html = context.render(models);

  for (const model of models) {
    assert.equal(html.split(`data-id="${model.id}"`).length - 1, 1, model.id);
  }
  assert.match(html, /data-parent-id="eft"[^>]*>[\s\S]*data-id="s13eftp1999"[\s\S]*data-parent-id="s13eftp1999"[^>]*>[\s\S]*data-id="efit-johnson-campbell-2022"/);
  assert.match(html, /data-id="efit-johnson-campbell-2022"[^>]*title="Emotionally Focused Individual Therapy \(EFIT\)"[\s\S]*<div class="mi-title">EFIT<\/div>/);

  const searchHtml = context.render([models[2]]);
  assert.match(searchHtml, /data-id="efit-johnson-campbell-2022"/);
  assert.match(searchHtml, /<div class="mi-title">Emotionally Focused Individual Therapy \(EFIT\)<\/div>/);
});
