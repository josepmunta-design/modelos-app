// =============================================================
// api/data.js  —  Vercel Serverless Function
// Proxies requests to the PRIVATE GitHub repo, authenticated
// with a server-side token the browser never sees.
//
// Deploy to Vercel and set these environment variables:
//   GITHUB_TOKEN   → GitHub Personal Access Token, read-only, private repo
//   GITHUB_OWNER   → e.g. "josepmunta-design"
//   GITHUB_REPO    → e.g. "tmps-data"
//   API_SECRET     → any random string your frontend sends as Bearer token
// =============================================================

const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_SECRET = process.env.API_SECRET;

// Allowed frontend origins.
// CORS uses only protocol + domain, not the full path.
const ALLOWED_ORIGINS = [
  'https://modelos.tumentorpsicologia.com',
  'https://modelos-app.vercel.app'
];

const ALLOWED_EXTENSIONS = [
  '.json',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg'
];

function getContentTypeFromPath(path) {
  const p = String(path || '').toLowerCase();

  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.gif')) return 'image/gif';
  if (p.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';

  return 'application/octet-stream';
}

function isAllowedPath(path) {
  if (!path) return false;

  // Bloquea rutas peligrosas
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (path.startsWith('.')) return false;
  if (path.includes('\\')) return false;

  const lowerPath = path.toLowerCase();

  return ALLOWED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
}

export default async function handler(req, res) {
  // ── CORS / Origin restriction ──────────────────────────────
  const origin = req.headers.origin;

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Environment checks ────────────────────────────────────
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN || !API_SECRET) {
    return res.status(500).json({
      error: 'Server configuration error'
    });
  }

  // ── Auth: check Bearer token ───────────────────────────────
  const authHeader = req.headers.authorization || '';
  const incomingToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (incomingToken !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Validate requested path ────────────────────────────────
  const rawPath = Array.isArray(req.query.path)
    ? req.query.path[0]
    : req.query.path;

  const filePath = String(rawPath || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^data\//, '');

  if (!filePath) {
    return res.status(400).json({
      error: 'Missing ?path= parameter'
    });
  }

  if (!isAllowedPath(filePath)) {
    return res.status(400).json({
      error: 'Invalid path',
      path: filePath
    });
  }

  // ── Fetch from private GitHub repo ────────────────────────
  const encodedPath = filePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/${encodedPath}`;

  try {
    const ghRes = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.raw',
        'User-Agent': 'modelos-proxy/1.0'
      }
    });

    if (!ghRes.ok) {
      const status = ghRes.status === 404 ? 404 : 502;

      return res.status(status).json({
        error: `GitHub returned ${ghRes.status}`,
        path: filePath
      });
    }

    const contentType = getContentTypeFromPath(filePath);
    const arrayBuffer = await ghRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // JSON: cache más corto
    if (filePath.toLowerCase().endsWith('.json')) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60');
    } else {
      // Imágenes: cache más largo
      res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    }

    res.setHeader('Content-Type', contentType);

    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[data proxy] fetch error:', err);

    return res.status(502).json({
      error: 'Upstream fetch failed',
      path: filePath
    });
  }
}
