import { modelYear } from '../data.js';

export const CARD_WIDTH = 168, CARD_HEIGHT = 46, YEAR_SCALE = 26, YEAR_TOP = 170;

// Original Genealogy geometry: real years, symmetric bands and lateral space
// for incoming/outgoing influence cards. Missing dates never become invented years.
export function layoutGenealogy(models) {
  const dated = models.filter(model => modelYear(model) >= 1890);
  const years = dated.map(modelYear);
  const min = years.length ? Math.floor(Math.min(...years) / 10) * 10 : 1890;
  const max = years.length ? Math.ceil(Math.max(...years) / 10) * 10 : 2020;
  const groups = new Map();
  for (const model of dated) {
    const group = model.grupo || '—';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(model);
  }
  let left = 60;
  const schools = [], nodes = [];
  const order = ['psicoanalisis', 'conductismo', 'cognitivo', 'humanista', 'sistemico', 'constructivista', 'integrativo'];
  const rank = label => { const i = order.indexOf(label.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()); return i < 0 ? 99 : i; };
  for (const [label, entries] of [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))) {
    const arranged = [...entries].sort((a, b) => modelYear(a) - modelYear(b) || a.label.localeCompare(b.label))
      .map(model => ({ ...model, year: modelYear(model), y: YEAR_TOP + (modelYear(model) - min) * YEAR_SCALE, width: CARD_WIDTH, height: CARD_HEIGHT }));
    let maxLanes = 1;
    for (let i = 0; i < arranged.length;) {
      let j = i + 1;
      while (j < arranged.length && arranged[j].y - arranged[j - 1].y < CARD_HEIGHT + 12) j++;
      maxLanes = Math.max(maxLanes, j - i);
      for (let k = i; k < j; k++) arranged[k].lane = k - i - (j - i - 1) / 2;
      i = j;
    }
    const center = Math.max((maxLanes - 1) / 2 * (CARD_WIDTH + 20) + CARD_WIDTH / 2 + 30, 700);
    for (const node of arranged) node.x = left + center + node.lane * (CARD_WIDTH + 20) - CARD_WIDTH / 2;
    schools.push({ label, x: left, width: center * 2, center: left + center });
    nodes.push(...arranged); left += center * 2 + 240;
  }
  return { nodes, schools, width: Math.max(640, left), height: YEAR_TOP + 300 + (max - min) * YEAR_SCALE, min, max };
}

export function externalLabel(id) {
  const match = /[-_](1[89]\d\d|20\d\d)$/.exec(id);
  const label = (match ? id.slice(0, match.index) : id).replace(/[-_]+/g, ' ').trim();
  return label.charAt(0).toUpperCase() + label.slice(1) + (match ? ' · ' + match[1] : '');
}

// Classify against the complete shared catalog, never just the filtered canvas.
// This retains cross-school navigation and references outside the model library.
export function genealogyRelations(models, edges, names = new Map()) {
  const all = Object.fromEntries(models.map(model => [model.id, { ...model, _school: model.grupo,
    tl: model.templabel || '', aut: model.autores || '', extAsc: [], extDesc: [], asc: [] }]));
  const internal = [];
  for (const edge of edges) {
    const from = all[edge.from], to = all[edge.to];
    if (from && to) { internal.push({ ...edge, fromS: from._school, toS: to._school }); to.asc.push(from.id); }
    else if (to) to.extAsc.push(names.get(edge.from) || externalLabel(edge.from));
    else if (from) from.extDesc.push(names.get(edge.to) || externalLabel(edge.to));
  }
  for (const node of Object.values(all)) {
    node.parent = node.asc.find(id => all[id]._school === node._school) || null;
    node.extAsc = [...new Set(node.extAsc)]; node.extDesc = [...new Set(node.extDesc)];
  }
  return { all, edges: internal };
}
