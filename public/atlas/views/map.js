import { coordinates, modelYear } from '../data.js';
import { text, escapeHtml, loadAsset } from '../ui.js';
import { cityKey, cityCoordinates, nodeSize, clusterAppearance } from './map-geometry.js';

export async function createView(host, context) {
  await Promise.all([
    loadAsset('/atlas/views/map.css', 'style'),
    loadAsset('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'style'),
    loadAsset('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'style'),
    loadAsset('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),
  ]);
  await loadAsset('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
  const L = window.L;
  host.innerHTML = `
    <div class="atlas-view-tools">
      <span>${text('El origen geográfico de las ideas', 'The geographical origin of ideas')}</span>
      <div class="atlas-map-group-filters" data-group-filters></div>
      <button type="button" data-fit>${text('Ver todos', 'Fit all')}</button>
      <button type="button" data-labels aria-pressed="false">${text('Nombres del mapa', 'Map labels')}</button>
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
  const map = L.map(host.querySelector('.atlas-map-canvas'), { minZoom: 2, maxZoom: 18, worldCopyJump: true, zoomControl: true,
    zoomSnap: .2, zoomDelta: .6, wheelPxPerZoomLevel: 90, maxBounds: [[-72, -220], [84, 220]], maxBoundsViscosity: .6 }).setView([30, 5], 2.4);
  map.attributionControl.setPrefix(false);
  let tiles, tileTheme, labelTiles, labelsOn = false;
  const tileOptions = {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19, updateWhenIdle: true, keepBuffer: 3,
  };
  const tileUrl = name => `https://{s}.basemaps.cartocdn.com/${name}/{z}/{x}/{y}{r}.png?key=cb1_2krb_1_7874140f2d0e9e2cc1e0781f`;
  function tileLayer(name, options = {}) {
    const layer = L.tileLayer(tileUrl(name), { ...tileOptions, ...options });
    // Fractional map/browser zoom can expose hairline gaps between raster tiles.
    // Overlap only the image edges; Leaflet's geographic tile grid stays intact.
    layer.on('tileload', ({ tile }) => {
      const size = layer.getTileSize();
      tile.style.width = `${size.x + 1}px`; tile.style.height = `${size.y + 1}px`;
    });
    return layer;
  }
  function labels() {
    if (labelTiles) { map.removeLayer(labelTiles); labelTiles = null; }
    if (labelsOn) labelTiles = tileLayer(`${tileTheme}_only_labels`, { pane: 'shadowPane' }).addTo(map);
  }
  function theme() {
    const next = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    if (next === tileTheme) return;
    tileTheme = next;
    if (tiles) map.removeLayer(tiles);
    tiles = tileLayer(`${next}_nolabels`).addTo(map);
    labels();
  }
  theme();
  const clusters = L.markerClusterGroup({
    chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 46, spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    spiderLegPolylineOptions: { weight: 1, color: '#999', opacity: .4 },
    iconCreateFunction: cluster => {
      const { size, gradient } = clusterAppearance(cluster.getAllChildMarkers().map(marker => marker.options.atlasColor));
      return L.divIcon({ className: `atlas-map-cluster atlas-map-cluster-${size}`, iconSize: [size, size],
        html: `<div class="atlas-cluster-ring" style="background:conic-gradient(${escapeHtml(gradient)})"><span class="atlas-cluster-core">${cluster.getChildCount()}</span></div>` });
    },
  }).addTo(map);
  const groupFilters = host.querySelector('[data-group-filters]');
  const filterGroups = (context.mapGroups?.() || []).filter(group => group?.id && group?.groups?.length);
  const groupIdBySource = new Map(filterGroups.flatMap(group => group.groups.map(source => [source, group.id])));
  const enabledGroups = new Set(filterGroups.map(group => group.id));
  const groupNoun = kind => kind === 'collection' ? text('Colección', 'Collection') : text('Escuela', 'School');
  for (const kind of ['school', 'collection']) {
    const groups = filterGroups.filter(group => group.kind === kind);
    if (!groups.length) continue;
    const set = document.createElement('div');
    set.className = `atlas-map-filter-set atlas-map-filter-set-${kind}`;
    set.setAttribute('role', 'group');
    set.setAttribute('aria-label', kind === 'collection' ? text('Colecciones', 'Collections') : text('Escuelas', 'Schools'));
    for (const group of groups) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.groupId = group.id; button.dataset.tooltip = group.label;
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', `${groupNoun(kind)}: ${group.label}`);
      button.style.setProperty('--filter-color', group.color);
      button.innerHTML = '<span aria-hidden="true"></span>';
      set.append(button);
    }
    groupFilters.append(set);
  }
  function syncGroupFilters() {
    groupFilters.querySelectorAll('[data-group-id]').forEach(button => {
      const on = enabledGroups.has(button.dataset.groupId);
      button.classList.toggle('is-off', !on);
      button.setAttribute('aria-pressed', String(on));
    });
  }
  function groupEnabled(model) {
    const id = groupIdBySource.get(String(model?.grupo || '').trim());
    return !id || enabledGroups.has(id);
  }
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
    const visible = located.filter(model => groupEnabled(model) && (!modelYear(model) || modelYear(model) <= Number(slider.value)));
    const cityPoints = cityCoordinates(context.data.models());
    const pointFor = model => cityPoints.get(cityKey(model)) || coordinates(model);
    const next = visible.map(model => `${model.id}:${pointFor(model)}`).join('|');
    if (next !== signature) {
      signature = next;
      const visibleIds = new Set(visible.map(model => model.id));
      const remove = [], add = [];
      for (const [id, marker] of markers) if (!visibleIds.has(id)) { remove.push(marker); markers.delete(id); }
      for (const model of visible) {
        const point = pointFor(model), existing = markers.get(model.id);
        if (existing?.getLatLng().equals(L.latLng(point))) continue;
        if (existing) remove.push(existing);
        const size = nodeSize(model), color = context.color(model.grupo);
        const marker = L.marker(point, {
          title: model.label, alt: model.label, keyboard: true, atlasColor: color,
          icon: L.divIcon({ className: 'atlas-map-marker', html: `<span style="--marker-color:${escapeHtml(color)}"></span>`, iconSize: [size, size] }),
        });
        const tooltip = document.createElement('div');
        tooltip.textContent = `${model.label} · ${model.ciudad || model.pais || ''}${modelYear(model) ? ` · ${modelYear(model)}` : ''}`;
        marker.bindTooltip(tooltip, { direction: 'top' });
        // A marker click keeps the current zoom and open fan of city nodes.
        marker.on('click', () => { selectedId = model.id; context.select(model.id); });
        markers.set(model.id, marker); add.push(marker);
      }
      if (remove.length) clusters.removeLayers(remove);
      if (add.length) clusters.addLayers(add);
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
  groupFilters.addEventListener('click', event => {
    const button = event.target.closest('[data-group-id]');
    if (!button) return;
    const id = button.dataset.groupId;
    if (event.ctrlKey || event.metaKey) {
      enabledGroups.clear(); enabledGroups.add(id);
    } else if (enabledGroups.has(id)) enabledGroups.delete(id); else enabledGroups.add(id);
    syncGroupFilters(); draw();
  });
  host.querySelector('[data-fit]').addEventListener('click', fit);
  host.querySelector('[data-labels]').addEventListener('click', event => { labelsOn = !labelsOn; labels(); event.currentTarget.setAttribute('aria-pressed', String(labelsOn)); });
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
  context.data.locate().then(() => { if (active) { models = context.data.mapFiltered(); draw(); } }).catch(() => {});
  return {
    update(_nextModels, state) { const changed = selectedId !== state.modelId; models = context.data.mapFiltered(); selectedId = state.modelId; draw(); if (changed) focusSelection(); },
    activate() { active = true; map.invalidateSize({ animate: false }); draw(); focusSelection(); },
    deactivate() { active = false; stop(); },
    destroy() { stop(); resize.disconnect(); themeObserver.disconnect(); map.remove(); },
  };
}
