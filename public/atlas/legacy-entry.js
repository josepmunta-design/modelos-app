// Compatibility entry points. Keep bookmarks/query context; no second app,
// session, catalog request or embedded model profile is started here.
const view = document.documentElement.dataset.atlasEntry;
if (['map', 'genealogy'].includes(view)) {
  const target = new URL('/modelos/', location.origin);
  target.search = location.search;
  target.searchParams.set('view', view);
  target.hash = location.hash;
  location.replace(target.pathname + target.search + target.hash);
}
