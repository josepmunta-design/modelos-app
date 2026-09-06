import { text } from '../ui.js';

const NS = 'http://www.w3.org/2000/svg';
const WIDTH = 460, HEIGHT = 126, PAD = 14, LABEL_SPACE = 19;
const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

export function createMinimap(host, scroll, getZoom, schoolLabel = label => label) {
  const panel = document.createElement('details');
  panel.className = 'genealogy-minimap';
  panel.open = !matchMedia('(max-width: 980px)').matches;
  const summary = document.createElement('summary');
  summary.textContent = text('Vista general', 'Overview');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', text('Vista general: pulsa o arrastra para desplazarte. También puedes usar las flechas del teclado.', 'Overview: click or drag to navigate. You can also use the arrow keys.'));
  panel.append(summary, svg); host.append(panel);
  let layout, viewport, marker, selectedId = '', sx = 1, sy = 1;
  function node(tag, attributes) {
    const element = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    svg.append(element); return element;
  }
  function sync() {
    if (!layout || !viewport) return;
    const zoom = getZoom();
    const x = Math.min(layout.width, scroll.scrollLeft / zoom), y = Math.min(layout.height, scroll.scrollTop / zoom);
    viewport.setAttribute('x', PAD + x * sx);
    viewport.setAttribute('y', PAD + y * sy);
    viewport.setAttribute('width', Math.min(layout.width - x, scroll.clientWidth / zoom) * sx);
    viewport.setAttribute('height', Math.min(layout.height - y, scroll.clientHeight / zoom) * sy);
  }
  function update(nextLayout, color, id, edges) {
    if (layout !== nextLayout) {
      layout = nextLayout; svg.replaceChildren();
      sx = (WIDTH - PAD * 2) / layout.width; sy = (HEIGHT - PAD * 2 - LABEL_SPACE) / layout.height;
      for (const school of layout.schools) {
        const center = PAD + school.center * sx;
        node('ellipse', { cx: center, cy: (HEIGHT - LABEL_SPACE) / 2, rx: school.width * sx * .28, ry: 18, fill: color(school.label), class: 'genealogy-minimap-glow' });
        const label = node('text', { x: center, y: HEIGHT - 7, class: 'genealogy-minimap-label', 'text-anchor': 'middle', 'textLength': Math.min(school.width * sx + 3, schoolLabel(school.label).length * 3.5), lengthAdjust: 'spacingAndGlyphs' });
        label.textContent = schoolLabel(school.label).toLocaleUpperCase();
        const title = document.createElementNS(NS, 'title'); title.textContent = schoolLabel(school.label); label.append(title);
      }
      const positions = new Map(layout.nodes.map(model => [model.id, { x: PAD + (model.x + model.width / 2) * sx, y: PAD + (model.y + model.height / 2) * sy, model }]));
      for (const edge of edges) {
        const from = positions.get(edge.from), to = positions.get(edge.to);
        if (!from || !to) continue;
        const sameSchool = from.model.grupo === to.model.grupo;
        const middle = (from.y + to.y) / 2;
        node('path', { d: `M${from.x},${from.y} C${from.x},${middle} ${to.x},${middle} ${to.x},${to.y}`, fill: 'none', stroke: color(to.model.grupo), 'stroke-width': sameSchool ? .55 : .35, opacity: sameSchool ? .48 : .035 });
      }
      for (const point of positions.values()) node('circle', { cx: point.x, cy: point.y, r: .95, fill: color(point.model.grupo), opacity: .95 });
      marker = node('circle', { r: 2.5, class: 'genealogy-minimap-selection' });
      viewport = node('rect', { class: 'genealogy-minimap-viewport', rx: 1.5 });
    }
    selectedId = id;
    const selected = layout.nodes.find(model => model.id === selectedId);
    marker.style.display = selected ? '' : 'none';
    if (selected) {
      marker.setAttribute('cx', PAD + (selected.x + selected.width / 2) * sx);
      marker.setAttribute('cy', PAD + (selected.y + selected.height / 2) * sy);
    }
    sync();
  }
  function navigate(event, behavior) {
    if (!layout) return;
    const bounds = svg.getBoundingClientRect(), zoom = getZoom();
    const x = ((event.clientX - bounds.left) / bounds.width * WIDTH - PAD) / sx;
    const y = ((event.clientY - bounds.top) / bounds.height * HEIGHT - PAD) / sy;
    scroll.scrollTo({ left: x * zoom - scroll.clientWidth / 2, top: y * zoom - scroll.clientHeight / 2, behavior });
  }
  let drag;
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); svg.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId); navigate(event, smooth());
  });
  svg.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3) navigate(event, 'instant');
  });
  const endDrag = () => { drag = null; };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('lostpointercapture', endDrag);
  svg.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[event.key] && event.key !== 'Home') return;
    event.preventDefault();
    const [x, y] = directions[event.key] || [0, 0];
    scroll.scrollTo({ left: event.key === 'Home' ? 0 : scroll.scrollLeft + x * scroll.clientWidth * .7, top: event.key === 'Home' ? 0 : scroll.scrollTop + y * scroll.clientHeight * .7, behavior: smooth() });
  });
  scroll.addEventListener('scroll', sync, { passive: true });
  panel.addEventListener('toggle', sync);
  return { update, sync, destroy() { scroll.removeEventListener('scroll', sync); panel.remove(); } };
}
