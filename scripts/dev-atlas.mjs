// Local-only preview using the sibling canonical data checkout. This server
// never exposes a GitHub token and is not part of the production API.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const dataRoot = path.resolve(process.env.ATLAS_DATA_ROOT || path.join(root, '..', 'tmps-data', 'data'));
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function inside(base, relative) {
  const target = path.resolve(base, relative.replace(/^[/\\]+/, ''));
  if (!target.startsWith(base + path.sep) && target !== base) throw new Error('Path outside preview root');
  return target;
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    if (url.pathname === '/api/billing-status') { res.writeHead(200, { 'Content-Type': mime['.json'] }); res.end('{"active":false}'); return; }
    const aliases = { '/mapamundi/': 'map', '/genealogia/': 'genealogy' };
    const legacy = aliases[url.pathname.replace(/\/?(?:index\.html)?$/, '/')];
    if (legacy) { url.searchParams.set('view', legacy); res.writeHead(302, { Location: `/modelos/${url.search}` }); res.end(); return; }
    let file;
    if (url.pathname === '/api/data') file = inside(dataRoot, (url.searchParams.get('path') || '').replace(/^\/?data\//, ''));
    else if (/^\/(modelos|en\/models)(\/.*)?$/.test(url.pathname)) {
      const requested = inside(publicRoot, decodeURIComponent(url.pathname));
      // Serve the live shell on model routes, without requiring an SEO build.
      file = path.extname(requested) && !requested.endsWith('index.html') ? requested : path.join(publicRoot, 'modelos', 'index.html');
    } else if (url.pathname === '/atlas' || url.pathname === '/atlas/') file = path.join(publicRoot, 'modelos', 'index.html');
    else file = inside(publicRoot, decodeURIComponent(url.pathname));
    const stat = await fs.stat(file);
    if (stat.isDirectory()) file = path.join(file, 'index.html');
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found in local Atlas preview'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Atlas preview: http://127.0.0.1:${port}/modelos/`));
