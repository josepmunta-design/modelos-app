export const VIEWS = Object.freeze(['list', 'network', 'map', 'genealogy']);

// La biblioteca limpia abre el catalogo completo. Las escuelas son rutas y
// filtros de la misma app, no una pantalla intermedia obligatoria.
export const DEFAULT_GROUP = 'all';

export function schoolIdFromPath(url) {
  const pathname = new URL(url, 'https://atlas.local').pathname;
  const match = pathname.match(/^\/(?:modelos\/escuelas|en\/models\/schools)\/([^/]+)\/?$/i);
  return match ? decodeURIComponent(match[1]).trim() : '';
}

export function readRoute(url) {
  const parsed = new URL(url, 'https://atlas.local');
  const params = parsed.searchParams;
  const schoolId = schoolIdFromPath(parsed);
  return {
    view: VIEWS.includes(params.get('view')) ? params.get('view') : 'list',
    group: params.get('group') || DEFAULT_GROUP,
    target: params.get('target') || params.get('school') || schoolId,
    query: params.get('q') || '',
    modelId: params.get('open') || '',
    schoolId,
  };
}

export function routeUrl(url, state, libraryPath = '/modelos/', schoolPath = '') {
  const next = new URL(url, 'https://atlas.local');
  next.pathname = schoolPath || libraryPath;
  for (const key of ['view', 'group', 'target', 'q', 'open', 'school']) next.searchParams.delete(key);
  // La URL limpia ya es la lista. Solo las otras perspectivas necesitan indicar
  // la vista, tanto en la biblioteca general como en una escuela.
  if (state.view !== 'list') next.searchParams.set('view', state.view);
  // El grupo por defecto se omite de la URL; los filtros restantes conservan
  // URLs compartibles sin convertir la biblioteca limpia en otra portada.
  if (!schoolPath && state.group !== DEFAULT_GROUP) next.searchParams.set('group', state.group);
  if (!schoolPath && state.target) next.searchParams.set('target', state.target);
  if (state.query) next.searchParams.set('q', state.query);
  if (state.modelId) next.searchParams.set('open', state.modelId);
  return next.pathname + next.search + next.hash;
}

// A small synchronous store. Transient view state (zoom/scroll/year) stays in
// the mounted view; URL state is the common, shareable exploration context.
export function createStore(initial) {
  let state = Object.freeze({ view: 'list', group: DEFAULT_GROUP, target: '', query: '', modelId: '', schoolId: '', ...initial });
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = { ...state, ...patch };
      if (!VIEWS.includes(next.view)) throw new Error('Unknown Atlas view');
      if (Object.keys(next).every(key => next[key] === state[key])) return;
      const previous = state;
      state = Object.freeze(next);
      for (const listener of listeners) listener(state, previous);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
