import { createStore, readRoute, routeUrl, VIEWS } from './state.js';
import { createAtlasData } from './data.js';
import { text } from './ui.js';

export async function mountAtlas(library) {
  if (window.IS_EMBED || window.TMPS_ATLAS) return;
  const routeFromLocation = ({ includeSelected = false } = {}) => {
    const route = readRoute(location.href);
    if (route.schoolId) Object.assign(route, library.routeForSchool?.(route.schoolId) || {});
    route.modelId = (includeSelected ? library.selectedId() : '') || library.modelIdFromPath() || route.modelId;
    return route;
  };
  const initial = routeFromLocation({ includeSelected: true });
  const store = createStore(initial), data = createAtlasData(library);
  const stage = document.getElementById('atlasStage'), notice = document.getElementById('atlasNotice');
  const panel = document.querySelector('.panel.right'), sidebar = document.querySelector('.panel.left');
  const header = document.getElementById('atlasHeader');
  const views = new Map(), loading = new Map();
  let transition = 0, applying = false, refreshQueued = false, profileFocus = null;
  const labels = { list: text('Lista', 'List'), network: text('Red de afinidades', 'Affinity network'), map: text('Mapamundi', 'World map'), genealogy: text('Genealogía', 'Genealogy') };
  const spatial = () => ['map', 'genealogy'].includes(store.get().view);

  function writeHistory(replace = false) {
    const state = store.get();
    const schoolPath = library.schoolPathFor?.(state.group, state.target) || '';
    const next = routeUrl(location.href, state, library.libraryPath(), schoolPath);
    if (next !== location.pathname + location.search + location.hash) history[replace ? 'replaceState' : 'pushState']({ atlas: state }, '', next);
    window.TMPS_MODELOS_I18N?.updateLanguageLinks();
  }
  function syncControls() {
    const state = store.get();
    document.body.dataset.atlasView = state.view;
    document.body.classList.toggle('atlas-spatial', spatial());
    document.body.classList.toggle('atlas-has-selection', !!state.modelId);
    header.querySelectorAll('[data-view-mode]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.viewMode === state.view);
      button.setAttribute('aria-pressed', String(button.dataset.viewMode === state.view));
    });
    document.getElementById('atlasMobileView').value = state.view;
    document.getElementById('atlasProfileActions').hidden = !state.modelId || state.view === 'network';
    panel.setAttribute('aria-label', state.view === 'network' ? labels.network : text('Ficha del modelo', 'Model profile'));
    stage.hidden = !spatial();
  }
  function report(message, error = false) {
    notice.replaceChildren(); notice.hidden = !message;
    notice.append(document.createTextNode(message));
    if (error) {
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = text('Reintentar', 'Retry');
      retry.addEventListener('click', () => setView(store.get().view, { replace: true })); notice.append(retry);
    }
  }
  function refresh() {
    if (applying) return;
    const filters = library.filters();
    store.set(filters); syncControls();
    const instance = views.get(store.get().view);
    if (instance) instance.view.update(data.filtered(), store.get());
  }
  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => { refreshQueued = false; refresh(); });
  }
  async function ensureView(name) {
    if (views.has(name)) return views.get(name);
    if (loading.has(name)) return loading.get(name);
    const promise = (async () => {
      await data.ready();
      const module = await import(name === 'map' ? './views/map.js' : './views/genealogy.js');
      const host = document.createElement('section'); host.className = `atlas-view atlas-view-${name}`; host.hidden = true;
      stage.append(host);
      try {
        const view = await module.createView(host, {
          data, select, color: library.color, schoolLabel: library.schoolLabel,
          mapGroups: library.mapGroups,
        });
        const instance = { host, view }; views.set(name, instance); return instance;
      } catch (error) { host.remove(); throw error; }
    })().finally(() => loading.delete(name));
    loading.set(name, promise); return promise;
  }
  async function setView(name, { replace = false, restore = false } = {}) {
    if (!VIEWS.includes(name)) return;
    const version = ++transition;
    applying = true;
    for (const instance of views.values()) { instance.view.deactivate(); instance.host.hidden = true; }
    const retained = store.get().modelId;
    store.set({ view: name }); syncControls(); report('');
    if (!restore) writeHistory(replace);
    try {
      await library.setView(name);
      if (version !== transition) return;
      if (spatial()) {
        report(text('Preparando esta perspectiva del Atlas…', 'Preparing this Atlas perspective…'));
        const instance = await ensureView(name);
        if (version !== transition) return;
        instance.host.hidden = false;
        instance.view.update(data.filtered(), store.get()); instance.view.activate(); report('');
      }
      if (name !== 'network' && retained && library.selectedId() !== retained) await library.openModel(retained);
      if (version !== transition) return;
      syncControls();
    } catch (error) {
      if (version === transition) report(text('No se ha podido cargar esta vista. Puedes seguir usando la biblioteca.', 'This view could not load. You can continue using the library.'), true);
      console.error('[Atlas] view load failed', error);
    } finally {
      if (version === transition) { applying = false; stage.removeAttribute('aria-busy'); refresh(); }
    }
  }
  async function select(id) {
    profileFocus = document.activeElement;
    recordSelection(id);
    await library.openModel(id);
    if (store.get().modelId !== id) return;
    syncControls();
    if (spatial() && matchMedia('(max-width: 980px)').matches) document.getElementById('atlasCloseProfile').focus();
  }
  function recordSelection(id, history = true) {
    store.set({ modelId: String(id || '') }); syncControls();
    if (history && !applying) writeHistory();
    views.get(store.get().view)?.view.update(data.filtered(), store.get());
  }
  function closeSelection() {
    store.set({ modelId: '' }); library.closeProfile(); syncControls(); writeHistory();
    views.get(store.get().view)?.view.update(data.filtered(), store.get());
    if (profileFocus?.isConnected) profileFocus.focus();
    else header.querySelector(`[data-view-mode="${store.get().view}"]`)?.focus();
  }
  async function restoreRoute() {
    applying = true;
    const route = routeFromLocation();
    store.set(route);
    await library.restoreFilters(route);
    await setView(route.view, { restore: true });
    if (route.modelId && route.view !== 'network') await library.openModel(route.modelId);
    else library.closeProfile();
    syncControls();
  }
  window.TMPS_ATLAS = { setView, recordSelection, closeSelection, select, getState: store.get };
  // The profile stays the same DOM node in every view, including its section
  // navigation, public/full access behaviour and cached model data.
  const profileActions = document.getElementById('atlasProfileActions'); panel.prepend(profileActions);
  for (const [name, label] of Object.entries(labels)) {
    header.querySelector(`[data-view-mode="${name}"]`).textContent = label;
    document.querySelector(`#atlasMobileView option[value="${name}"]`).textContent = label;
  }
  header.querySelector('.atlas-brand-title').textContent = text('Atlas de la psicoterapia', 'Atlas of psychotherapy');
  header.querySelector('.atlas-brand').href = '/';
  header.querySelector('.atlas-sections').setAttribute('aria-label', text('Secciones del Atlas', 'Atlas sections'));
  stage.setAttribute('aria-label', text('Vista del Atlas', 'Atlas view'));
  document.getElementById('atlasViewLabel').textContent = text('Vista', 'View');
  document.getElementById('atlasFiltersButton').textContent = text('Filtros y modelos', 'Filters and models');
  document.getElementById('atlasCloseProfile').textContent = text('Cerrar ficha', 'Close profile');
  document.getElementById('atlasViewMap').textContent = text('Ver en mapa', 'View on map');
  document.getElementById('atlasViewGenealogy').textContent = text('Ver en genealogía', 'View in genealogy');
  header.querySelectorAll('[data-view-mode]').forEach(button => {
    if (['list', 'network'].includes(button.dataset.viewMode)) return; // library adapter owns the original buttons
    button.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      setView(button.dataset.viewMode);
    });
  });
  document.getElementById('atlasMobileView').addEventListener('change', event => setView(event.target.value));
  document.getElementById('atlasViewMap').addEventListener('click', () => setView('map'));
  document.getElementById('atlasViewGenealogy').addEventListener('click', () => setView('genealogy'));
  document.getElementById('atlasCloseProfile').addEventListener('click', closeSelection);
  document.getElementById('atlasFiltersButton').addEventListener('click', event => {
    if (!spatial() && store.get().view !== 'network' && store.get().modelId && matchMedia('(max-width: 980px)').matches) return closeSelection();
    const open = document.body.classList.toggle('atlas-filters-open'); event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && spatial() && store.get().modelId) closeSelection();
  });
  sidebar.addEventListener('change', () => { scheduleRefresh(); setTimeout(() => { if (!applying) writeHistory(true); }, 0); });
  document.addEventListener('atlas:library-change', scheduleRefresh);
  document.addEventListener('atlas:filters-change', () => { scheduleRefresh(); queueMicrotask(() => { if (!applying) writeHistory(true); }); });
  window.addEventListener('popstate', restoreRoute);
  const resize = new ResizeObserver(() => document.documentElement.style.setProperty('--atlas-header-height', `${header.getBoundingClientRect().height}px`)); resize.observe(header);
  window.addEventListener('pagehide', () => { for (const instance of views.values()) instance.view.deactivate(); });
  window.addEventListener('pageshow', () => views.get(store.get().view)?.view.activate());
  library.hideWelcome();
  await library.restoreFilters(initial);
  await setView(initial.view, { replace: true });
  syncControls();
}
