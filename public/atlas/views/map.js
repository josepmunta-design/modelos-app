import { coordinates, modelYear } from '../data.js';
import { text, escapeHtml, loadAsset } from '../ui.js';

export async function createView(host, context) {
  await Promise.all([
    loadAsset('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'style'),
    loadAsset('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'style'),
    loadAsset('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),
  ]);
  await loadAsset('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
  const L = window.L;
  host.innerHTML = `
    <div class="atlas-view-tools">
      <span>${text('El origen geográfico de las ideas', 'The geographical origin of ideas')}</span>
      <button type="button" data-fit>${text('Ver todos', 'Fit all')}</button>
    </div>
    <div class="atlas-map-canvas" role="region" aria-label="${text('Mapa de modelos psicoterapéuticos', 'Map of psychotherapy models')}"></div>
    <div class="atlas-timebar">
      <button type="button" data-play aria-pressed="false">${text('Recorrer', 'Play')}</button>
      <label>${text('Hasta el año', 'Through year')} <output></output>
        <input type="range" aria-label="${text('Hasta el año', 'Through year')}" step="1">
      </label>
      <button type="button" data-present>${text('Actualidad', 'Present')}</button>
    </div>
    <p class="atlas-view-status" role="status"></p>`;
  const map = L.map(host.querySelector('.atlas-map-canvas'), { minZoom: 2, maxZoom: 18, worldCopyJump: true, zoomControl: true }).setView([28, 4], 2);
  let tiles, tileTheme;
  function theme() {
    const next = document.body.classList.contains('theme-light') ? 'light_all' : 'dark_all';
    if (next === tileTheme) return;
    tileTheme = next;
    if (tiles) map.removeLayer(tiles);
    // Existing public basemap credential from the original Mapamundi app.
    tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${next}/{z}/{x}/{y}{r}.png?key=cb1_2krb_1_7874140f2d0e9e2cc1e0781f`, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);
  }
  theme();
  const clusters = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 42, spiderfyOnMaxZoom: true, animate: false,
    iconCreateFunction: cluster => L.divIcon({ className: 'atlas-map-cluster', html: `<span>${cluster.getChildCount()}</span>`, iconSize: [38, 38] }),
  }).addTo(map);
  let models = [], selectedId = '', markers = new Map(), signature = '', initialFit = false, timer = null, active = false;
  const slider = host.querySelector('input'), output = host.querySelector('output'), play = host.querySelector('[data-play]');
  const years = context.data.models().map(modelYear).filter(Boolean);
  const min = years.length ? Math.min(...years) : 1890;
  const max = Math.max(new Date().getFullYear(), ...years);
  slider.min = min; slider.max = max; slider.value = max;
  function stop() {
    clearInterval(timer); timer = null;
    play.textContent = text('Recorrer', 'Play'); play.setAttribute('aria-pressed', 'false');
  }
  function fit() {
    const points = [...markers.values()].map(marker => marker.getLatLng());
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 6, animate: false });
  }
  function updateStatus(visible, located) {
    const missing = models.length - located.length;
    let message = text(`${visible.length} de ${models.length} modelos en el mapa`, `${visible.length} of ${models.length} models on the map`);
    if (missing) message += text(` · ${missing} sin ubicación registrada`, ` · ${missing} without a recorded location`);
    if (selectedId && !markers.has(selectedId)) message += text(' · El modelo seleccionado queda fuera del mapa o del periodo actual.', ' · The selected model is outside the map or current period.');
    host.querySelector('[role="status"]').textContent = message;
  }
  function draw() {
    output.textContent = slider.value;
    const located = models.filter(model => coordinates(model));
    const visible = located.filter(model => !modelYear(model) || modelYear(model) <= Number(slider.value));
    const next = visible.map(model => `${model.id}:${coordinates(model)}`).join('|');
    if (next !== signature) {
      signature = next; clusters.clearLayers(); markers = new Map();
      const cityPoints = new Map();
      for (const model of visible) {
        const city = `${model.ciudad || ''}|${model.pais || ''}`.toLocaleLowerCase();
        if (model.ciudad && !cityPoints.has(city)) cityPoints.set(city, coordinates(model));
        const point = model.ciudad ? cityPoints.get(city) : coordinates(model);
        const marker = L.marker(point, {
          title: model.label, keyboard: true,
          icon: L.divIcon({ className: 'atlas-map-marker', html: `<span style="--marker-color:${escapeHtml(context.color(model.grupo))}"></span>`, iconSize: [22, 22] }),
        });
        const tooltip = document.createElement('div');
        tooltip.textContent = `${model.label} · ${model.ciudad || model.pais || ''}${modelYear(model) ? ` · ${modelYear(model)}` : ''}`;
        marker.bindTooltip(tooltip, { direction: 'top' });
        marker.on('click', () => context.select(model.id));
        markers.set(model.id, marker);
      }
      clusters.addLayers([...markers.values()]);
    }
    if (active && !initialFit && visible.length) { fit(); initialFit = true; }
    for (const [id, marker] of markers) marker.getElement()?.classList.toggle('is-selected', id === selectedId);
    updateStatus(visible, located);
  }
  function focusSelection() {
    const marker = markers.get(selectedId);
    if (!marker || !active) return;
    map.setView(marker.getLatLng(), Math.max(4, Math.min(map.getZoom(), 7)), { animate: false });
    const parent = clusters.getVisibleParent(marker);
    if (parent && parent !== marker && parent.spiderfy) parent.spiderfy();
    marker.getElement()?.classList.add('is-selected'); marker.openTooltip();
  }
  slider.addEventListener('input', () => { stop(); draw(); });
  host.querySelector('[data-fit]').addEventListener('click', fit);
  host.querySelector('[data-present]').addEventListener('click', () => { stop(); slider.value = max; draw(); });
  play.addEventListener('click', () => {
    if (timer) return stop();
    if (Number(slider.value) >= max) slider.value = min;
    play.textContent = text('Pausar', 'Pause'); play.setAttribute('aria-pressed', 'true'); draw();
    timer = setInterval(() => { slider.value = Math.min(max, Number(slider.value) + 1); draw(); if (Number(slider.value) >= max) stop(); }, 220);
  });
  let previousWidth = 0;
  const resize = new ResizeObserver(() => {
    if (!active) return;
    map.invalidateSize({ animate: false });
    if (previousWidth && Math.abs(previousWidth - host.clientWidth) > 80 && !selectedId) fit();
    previousWidth = host.clientWidth;
  }); resize.observe(host);
  const themeObserver = new MutationObserver(theme); themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // Missing coordinates are completed through the same public-model cache as
  // the ficha. Do not block the first useful map on those optional requests.
  context.data.locate().then(() => { if (active) { models = context.data.filtered(); draw(); } }).catch(() => {});
  return {
    update(nextModels, state) { const changed = selectedId !== state.modelId; models = nextModels; selectedId = state.modelId; draw(); if (changed) focusSelection(); },
    activate() { active = true; map.invalidateSize({ animate: false }); draw(); focusSelection(); },
    deactivate() { active = false; stop(); },
    destroy() { stop(); resize.disconnect(); themeObserver.disconnect(); map.remove(); },
  };
}
