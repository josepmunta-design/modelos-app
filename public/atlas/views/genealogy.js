import { layoutGenealogy, genealogyRelations, CARD_WIDTH, CARD_HEIGHT, YEAR_SCALE, YEAR_TOP } from './genealogy-layout.js';
import { createInteractions } from './genealogy-interactions.js';
import { modelYear } from '../data.js';
import { text, escapeHtml, loadAsset } from '../ui.js';

const NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes = {}, value) {
  const node = document.createElementNS(NS, tag);
  for (const [key, val] of Object.entries(attributes)) node.setAttribute(key, val);
  if (value != null) node.textContent = value;
  return node;
}

export async function createView(host, context) {
  const [rawEdges, names] = await Promise.all([context.data.influences(), context.data.influenceNames(), loadAsset('/atlas/views/genealogy.css', 'style')]);
  host.innerHTML = `
    <div class="atlas-view-tools">
      <span>${text('Historia e influencias', 'History and influences')}</span>
      <select data-school-jump aria-label="${text('Recorrer escuela', 'Explore school')}"></select>
      <label><input type="checkbox" data-cross checked> ${text('Entre escuelas', 'Across schools')}</label>
      <button type="button" data-minus aria-label="${text('Alejar genealogía', 'Zoom out genealogy')}">−</button>
      <output data-zoom>100%</output>
      <button type="button" data-plus aria-label="${text('Acercar genealogía', 'Zoom in genealogy')}">+</button>
      <button type="button" data-focus>${text('Localizar selección', 'Find selection')}</button>
      <button type="button" data-reset hidden>${text('Volver al filtro', 'Return to filter')}</button>
    </div>
    <div class="atlas-genealogy-scroll" tabindex="0" role="region" aria-label="${text('Genealogía: desplázate para recorrer años y escuelas', 'Genealogy: scroll to explore years and schools')}">
      <div class="atlas-genealogy-size"><div class="atlas-genealogy-world"></div></div>
    </div>
    <p class="atlas-view-status" role="status"></p>`;
  const scroll = host.querySelector('.atlas-genealogy-scroll'), world = host.querySelector('.atlas-genealogy-world'), size = host.querySelector('.atlas-genealogy-size');
  let zoom = 1, models = [], selectedId = '', signature = '', filterSignature = '', layout, active = false, interaction, contexts = new Map();
  const revealedSchools = new Set();
  const mobile = () => matchMedia('(max-width: 980px)').matches;
  function scale() {
    if (!layout) return;
    world.style.transform = `scale(${zoom})`; size.style.width = `${layout.width * zoom}px`; size.style.height = `${layout.height * zoom}px`;
    host.querySelector('[data-zoom]').textContent = `${Math.round(zoom * 100)}%`;
  }
  function zoomBy(factor) {
    const previous = zoom; zoom = Math.max(.3, Math.min(1.7, zoom * factor)); scale();
    scroll.scrollLeft = (scroll.scrollLeft + scroll.clientWidth / 2) * zoom / previous - scroll.clientWidth / 2;
    scroll.scrollTop = (scroll.scrollTop + scroll.clientHeight / 2) * zoom / previous - scroll.clientHeight / 2;
  }
  function focus(id = interaction?.pinned || selectedId) {
    const node = layout?.nodes.find(model => model.id === id);
    if (node) scroll.scrollTo({ left: (node.x + node.width / 2) * zoom - scroll.clientWidth / 2, top: (node.y + node.height / 2) * zoom - scroll.clientHeight / 2, behavior: 'auto' });
  }
  function pin(id) {
    const ctx = contexts.get(id);
    if (ctx) { interaction.pin(id, ctx); host.querySelector('[data-focus]').disabled = false; }
  }
  function travelToNode(id) {
    const target = context.data.models().find(model => model.id === id);
    if (!target) return;
    if (!modelYear(target) || modelYear(target) < 1890) { context.select(id); return; }
    if (!contexts.has(id)) { revealedSchools.add(target.grupo); draw(); }
    pin(id);
    if (!mobile()) context.select(id);
    requestAnimationFrame(() => focus(id));
  }
  function choose(id) {
    pin(id);
    // As in the original, touch pins the influence context first. The explicit
    // profile button opens the Atlas fiche; desktop also opens it on selection.
    if (!mobile()) context.select(id);
    requestAnimationFrame(() => focus(id));
  }
  function draw() {
    const catalog = context.data.models();
    const entries = [...new Map([...models, ...catalog.filter(model => revealedSchools.has(model.grupo))].map(model => [model.id, model])).values()];
    const next = entries.map(model => `${model.id}:${model.year}:${model.grupo}:${model.label}`).join('|');
    if (signature !== next || !layout) {
      const pinned = interaction?.pinned;
      interaction?.clear(); signature = next; layout = layoutGenealogy(entries); contexts = new Map();
      const relations = genealogyRelations(catalog, rawEdges, names);
      const all = relations.all;
      const colors = Object.fromEntries(catalog.map(model => [model.grupo, context.color(model.grupo)]));
      const schoolLabels = Object.fromEntries(catalog.map(model => [model.grupo, context.schoolLabel(model.grupo)]));
      world.style.width = `${layout.width}px`; world.style.height = `${layout.height}px`; world.replaceChildren();
      interaction = createInteractions({ world, main: scroll, ALL: all, EDGES: relations.edges,
        colorOf: colors, schoolLabel: schoolLabels,
        crossEnabled: () => host.querySelector('[data-cross]').checked,
        openDetail: id => context.select(id), travelToNode });
      const jump = host.querySelector('[data-school-jump]');
      jump.innerHTML = `<option value="">${text('Ir a una escuela…', 'Go to a school…')}</option>` + layout.schools.map(s => `<option value="${escapeHtml(s.label)}">${escapeHtml(context.schoolLabel(s.label))}</option>`).join('');
      for (const school of layout.schools) {
        const section = document.createElement('section'); section.className = 'school';
        section.style.left = `${school.x}px`; section.style.width = `${school.width}px`;
        const nodes = layout.nodes.filter(node => node.grupo === school.label);
        const color = context.color(school.label);
        const heading = document.createElement('div'); heading.className = 'genealogy-school-heading';
        heading.style.setProperty('--school-accent', color);
        heading.innerHTML = `<span>${String(layout.schools.indexOf(school) + 1).padStart(2, '0')}</span><h2>${escapeHtml(context.schoolLabel(school.label))}</h2><p>${nodes.length} ${text('modelos', 'models')} · ${Math.min(...nodes.map(n => n.year))} — ${Math.max(...nodes.map(n => n.year))}</p>`;
        section.append(heading);
        const svg = svgNode('svg', { width: school.width, height: layout.height, viewBox: `0 0 ${school.width} ${layout.height}` });
        section.append(svg); world.append(section);
        for (let year = layout.min; year <= layout.max; year += 10) {
          const y = YEAR_TOP + (year - layout.min) * YEAR_SCALE + CARD_HEIGHT / 2;
          const axis = svgNode('g', { class: 'atlas-year' });
          axis.append(svgNode('line', { x1: 28, x2: school.width - 4, y1: y, y2: y }), svgNode('text', { x: 5, y: y - 5 }, year)); svg.append(axis);
        }
        const byId = new Map(nodes.map(node => [node.id, node]));
        const edgeLayer = svgNode('g'); svg.append(edgeLayer);
        for (const node of nodes) {
          const full = all[node.id];
          for (const aid of full.asc) {
            const parent = byId.get(aid); if (!parent) continue;
            const dy = Math.abs(node.y - parent.y);
            let x1 = parent.x - school.x + CARD_WIDTH / 2, x2 = node.x - school.x + CARD_WIDTH / 2;
            let y1 = parent.y + CARD_HEIGHT / 2, y2 = node.y + CARD_HEIGHT / 2;
            let path;
            if (dy < 24) {
              const direction = x1 <= x2 ? 1 : -1; x1 += direction * CARD_WIDTH / 2; x2 -= direction * CARD_WIDTH / 2;
              const bend = (x1 + x2) / 2; path = `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`;
            } else {
              const direction = y1 <= y2 ? 1 : -1; y1 += direction * CARD_HEIGHT / 2; y2 -= direction * CARD_HEIGHT / 2;
              const d = y2 - y1; path = `M ${x1} ${y1} C ${x1} ${y1 + d * .45}, ${x2} ${y2 - d * .45}, ${x2} ${y2}`;
            }
            edgeLayer.append(svgNode('path', { d: path, class: `tedge${full.parent === aid ? '' : ' sec'}`, stroke: color, 'data-child': node.id, 'data-parent': aid }));
          }
        }
        const nodeLayer = svgNode('g'); svg.append(nodeLayer);
        for (const node of nodes) {
          const full = all[node.id];
          Object.assign(full, { _x: node.x - school.x, _cx: node.x - school.x + CARD_WIDTH / 2, _y: node.y + CARD_HEIGHT / 2 });
          const x = full._x, y = full._y;
          const g = svgNode('g', { class: 'tnode', 'data-id': node.id, role: 'button', tabindex: 0, 'aria-label': `${node.label} · ${node.year}` });
          g.append(svgNode('title', {}, `${node.label} · ${node.year}`));
          const rect = svgNode('rect', { class: 'node-card', x, y: node.y, width: CARD_WIDTH, height: CARD_HEIGHT, rx: 11, fill: 'var(--genealogy-card)', stroke: color, 'stroke-opacity': '.4', 'stroke-width': 1 });
          rect.style.width = `${CARD_WIDTH}px`; g.append(rect, svgNode('circle', { cx: x + 14, cy: y - 6.5, r: 3, fill: color }));
          const compact = full.tl || full.label, max = Math.floor((CARD_WIDTH - 31) / 6.3);
          const short = compact.length > max ? compact.slice(0, max - 1) + '…' : compact;
          const label = svgNode('text', { class: 'tlabel', x: x + 23, y: y - 2.5, 'font-size': 12, 'data-short-label': short, 'data-full-label': full.label }, short);
          const sub = svgNode('text', { class: 'tsub', x: x + 23, y: y + 13, 'font-size': 9.5, 'data-year': node.year, 'data-rest': String(full.aut || '').split(';')[0].trim(), 'data-col': color });
          interaction.buildSubContent(sub, Math.floor((CARD_WIDTH - 31) / 5.4)); g.append(label, sub); nodeLayer.append(g);
          const ctx = { svg, L: { CARDH: CARD_HEIGHT }, node: full, school, g }; contexts.set(node.id, ctx);
          g.addEventListener('click', event => { if (scroll._suppressClick) return; event.stopPropagation(); choose(node.id); });
          g.addEventListener('keydown', event => { if (event.target === g && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); choose(node.id); } });
          g.addEventListener('mouseenter', () => interaction.hover(node.id, ctx));
          g.addEventListener('mouseleave', () => interaction.leave(ctx));
        }
      }
      scale(); if (pinned && contexts.has(pinned)) pin(pinned);
    }
    const missing = models.filter(model => !modelYear(model)).length;
    let status = text(`${layout.nodes.length} modelos · Pulsa un nodo para fijar sus influencias. Arrastra el fondo para explorar.`, `${layout.nodes.length} models · Select a node to pin its influences. Drag the background to explore.`);
    if (missing) status += text(` · ${missing} sin año registrado.`, ` · ${missing} without a recorded year.`);
    if (revealedSchools.size) status += text(' Incluye escuelas relacionadas.', ' Related schools included.');
    if (selectedId && !contexts.has(selectedId)) status += text(' La selección queda fuera de esta vista.', ' Selection is outside this view.');
    host.querySelector('[role="status"]').textContent = status;
    host.querySelector('[data-focus]').disabled = !contexts.has(interaction?.pinned || selectedId);
    host.querySelector('[data-reset]').hidden = !revealedSchools.size;
  }
  host.querySelector('[data-plus]').addEventListener('click', () => zoomBy(1.2));
  host.querySelector('[data-minus]').addEventListener('click', () => zoomBy(1 / 1.2));
  host.querySelector('[data-focus]').addEventListener('click', () => focus());
  host.querySelector('[data-reset]').addEventListener('click', () => { revealedSchools.clear(); interaction.clear(); draw(); focus(); });
  host.querySelector('[data-cross]').addEventListener('change', () => { const id = interaction.pinned; interaction.clear(); if (id) pin(id); });
  host.querySelector('[data-school-jump]').addEventListener('change', event => {
    const school = layout.schools.find(s => s.label === event.target.value);
    const first = layout.nodes.find(node => node.grupo === event.target.value);
    if (school) scroll.scrollTo({ left: school.center * zoom - scroll.clientWidth / 2, top: first ? Math.max(0, first.y * zoom - 120) : 0, behavior: 'auto' });
  });
  let drag;
  scroll.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('[role="button"],.cross-card')) return;
    drag = { x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop }; scroll._suppressClick = false;
    scroll.setPointerCapture(event.pointerId);
  });
  scroll.addEventListener('pointermove', event => {
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) scroll._suppressClick = true;
    scroll.scrollLeft = drag.left - event.clientX + drag.x; scroll.scrollTop = drag.top - event.clientY + drag.y;
  });
  scroll.addEventListener('pointerup', () => { drag = null; });
  scroll.addEventListener('pointercancel', () => { drag = null; scroll._suppressClick = false; });
  scroll.addEventListener('click', event => { if (!scroll._suppressClick && !event.target.closest('[role="button"],.cross-card')) interaction?.clear(); scroll._suppressClick = false; });
  scroll.addEventListener('keydown', event => { if (event.key === 'Escape') interaction?.clear(); });
  const resize = new ResizeObserver(() => { if (active && interaction?.pinned) focus(); }); resize.observe(scroll);
  return {
    update(nextModels, state) {
      const changed = selectedId !== state.modelId;
      const filters = `${state.group}:${state.target}:${state.query}`;
      if (filterSignature !== filters) { revealedSchools.clear(); filterSignature = filters; }
      models = nextModels; selectedId = state.modelId; draw();
      if (changed) { if (selectedId) pin(selectedId); else interaction.clear(); if (active) focus(); }
    },
    activate() { active = true; draw(); if (selectedId) { pin(selectedId); focus(); } else if (!scroll.scrollLeft && layout.schools.length) scroll.scrollLeft = layout.schools[0].center * zoom - scroll.clientWidth / 2; },
    deactivate() { active = false; },
    destroy() { resize.disconnect(); interaction?.clear(); host.replaceChildren(); },
  };
}
