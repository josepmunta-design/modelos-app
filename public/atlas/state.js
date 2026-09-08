export const VIEWS = Object.freeze(['list', 'network', 'map', 'genealogy']);

// La biblioteca entra por escuelas: es la lectura util del catalogo, mientras
// que `all` es el listado completo sin agrupar y vive al final del desplegable.
export const DEFAULT_GROUP = 'school';

export function readRoute(url) {
  const params = new URL(url, 'https://atlas.local').searchParams;
  return {
    view: VIEWS.includes(params.get('view')) ? params.get('view') : 'list',
    group: params.get('group') || DEFAULT_GROUP,
    target: params.get('target') || params.get('school') || '',
    query: params.get('q') || '',
    modelId: params.get('open') || '',
  };
}

export function routeUrl(url, state, libraryPath = '/modelos/') {
  const next = new URL(url, 'https://atlas.local');
  next.pathname = libraryPath;
  for (const key of ['view', 'group', 'target', 'q', 'open', 'school']) next.searchParams.delete(key);
  // La vista siempre viaja en la URL: la biblioteca sin `view` es el portal de inicio.
  next.searchParams.set('view', state.view);
  // El grupo por defecto se omite de la URL, y cualquier otro se escribe. El
  // centinela tiene que ser el mismo que lee readRoute: si se omitiera `all`
  // como antes, al recargar volveria leido como el nuevo defecto.
  if (state.group !== DEFAULT_GROUP) next.searchParams.set('group', state.group);
  if (state.target) next.searchParams.set('target', state.target);
  if (state.query) next.searchParams.set('q', state.query);
  if (state.modelId) next.searchParams.set('open', state.modelId);
  return next.pathname + next.search + next.hash;
}

// A small synchronous store. Transient view state (zoom/scroll/year) stays in
// the mounted view; URL state is the common, shareable exploration context.
export function createStore(initial) {
  let state = Object.freeze({ view: 'list', group: DEFAULT_GROUP, target: '', query: '', modelId: '', ...initial });
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
