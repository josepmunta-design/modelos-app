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
//                    WARNING: if sent from frontend, it is visible in browser requests.
// =============================================================

const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_SECRET = process.env.API_SECRET;

// Allowed file paths.
// Allows examples like:
//   modelos/humanista/rogers.json
//   index.json
//   escuelas/constructivismo/modelo.json
//
// Blocks dangerous paths like:
//   ../secret.json
//   .env
//   anything that is not .json
const PATH_ALLOWLIST = /^[a-zA-Z0-9_\-\/]+\.json$/;

// Allowed frontend origins.
// Important: CORS uses only protocol + domain, not the full path.
// Do NOT include /apps/modelos/ here.
const ALLOWED_ORIGINS = [
  'https://modelos.tumentorpsicologia.com',
  'https://modelos-app.vercel.app'
];

export default async function handler(req, res) {
  // ── CORS / Origin restriction ──────────────────────────────
  const origin = req.headers.origin;

  // If the request comes from a browser and the Origin is not allowed, block it.
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  // If the Origin is allowed, echo that exact origin.
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
      error: 'Server configuration error',
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

  const filePath = (rawPath || '').trim().replace(/^\/+/, '');

  if (!filePath) {
    return res.status(400).json({
      error: 'Missing ?path= parameter',
    });
  }

  if (!PATH_ALLOWLIST.test(filePath)) {
    return res.status(400).json({
      error: 'Invalid path',
    });
  }

  // ── Fetch from private GitHub repo ────────────────────────
  const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/${filePath}`;

  try {
    const ghRes = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
        'User-Agent': 'modelos-proxy/1.0',
      },
    });

    if (!ghRes.ok) {
      const status = ghRes.status === 404 ? 404 : 502;

      return res.status(status).json({
        error: `GitHub returned ${ghRes.status}`,
      });
    }

    const json = await ghRes.json();

    // Cache for 5 minutes on CDN, 1 minute in browser
    res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=60');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    return res.status(200).json(json);
  } catch (err) {
    console.error('[data proxy] fetch error:', err);

    return res.status(502).json({
      error: 'Upstream fetch failed',
    });
  }
}
