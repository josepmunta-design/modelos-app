export const text = (es, en) => document.documentElement.lang === 'en' ? en : es;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const dependencies = new Map();
export function loadAsset(url, type = 'script') {
  if (dependencies.has(url)) return dependencies.get(url);
  const pending = new Promise((resolve, reject) => {
    const node = document.createElement(type === 'style' ? 'link' : 'script');
    if (type === 'style') { node.rel = 'stylesheet'; node.href = url; }
    else { node.src = url; node.async = true; }
    const timeout = setTimeout(() => fail(), 20000);
    const fail = () => { clearTimeout(timeout); node.remove(); dependencies.delete(url); reject(new Error(`Could not load ${url}`)); };
    node.onload = () => { clearTimeout(timeout); resolve(); };
    node.onerror = fail;
    document.head.append(node);
  });
  dependencies.set(url, pending);
  return pending;
}
