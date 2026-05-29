import { hasActiveSubscription } from './_billing.js';

// =============================================================
// api/data.js  —  Vercel Serverless Function
// Proxies requests to the PRIVATE GitHub repo, authenticated
// with a server-side GitHub token the browser never sees.
//
// Deploy to Vercel and set these environment variables:
//   GITHUB_TOKEN   → GitHub Personal Access Token, read-only, private repo
//   GITHUB_OWNER   → e.g. "josepmunta-design"
//   GITHUB_REPO    → e.g. "tmps-data"
//
// IMPORTANT:
// - The frontend sends only the user's Supabase access token.
// - Do NOT expose server-side tokens in modelos.html.
// =============================================================

const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yritadgaurvplltgubii.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const SUPABASE_API_KEY = SUPABASE_SECRET_KEY
  || process.env.SUPABASE_ANON_KEY
  || 'sb_publishable_ddx-9W2ZbYubGUlqx7TRig_AqS6rftm';

// Allowed frontend origins.
// CORS uses only protocol + domain, not the full path.
const ALLOWED_ORIGINS = [
  'https://apps.tumentorpsicologia.com',
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

const ALLOWED_DIRECTORY_PATHS = [
  'Core/imagenes/vida/landing'
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

function isAllowedDirectoryPath(path) {
  const value = String(path || '').replace(/\/+$/, '');
  return ALLOWED_DIRECTORY_PATHS.includes(value);
}

function isAllowedPath(path) {
  if (!path) return false;

  const value = String(path);

  // Bloquea rutas peligrosas
  if (value.includes('..')) return false;
  if (value.startsWith('/')) return false;
  if (value.startsWith('.')) return false;
  if (value.includes('\\')) return false;

  // Bloquea URLs externas o intentos raros
  if (/^https?:\/\//i.test(value)) return false;
  if (/^\/\//.test(value)) return false;
  if (value.includes(':')) return false;

  const lowerPath = value.toLowerCase();

  return isAllowedDirectoryPath(value)
    || ALLOWED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
}

function isPublicLandingAssetPath(path) {
  const value = String(path || '').replace(/\/+$/, '');
  const lowerPath = value.toLowerCase();
  return isAllowedDirectoryPath(value)
    || (
      lowerPath.startsWith('core/imagenes/vida/landing/')
      && ALLOWED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))
    );
}

function isPublicModelDataPath(path) {
  const value = String(path || '').replace(/\/+$/, '');
  const lowerPath = value.toLowerCase();

  const isImageOrJson = ALLOWED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));

  return isPublicLandingAssetPath(value)
    || lowerPath === 'core/escuelas/index.json'
    || /^core\/escuelas\/[a-z0-9_-]+\.json$/i.test(value)
    || /^core\/modelos-publicos\/[a-z0-9_-]+\/[a-z0-9_-]+\.json$/i.test(value)

    // Índices de fotos necesarios para resolver foto de autor y hero visual.
    || lowerPath === 'core/fotos/foto.json'
    || lowerPath === 'core/fotos.json'
    || lowerPath === 'core/foto.json'
    || lowerPath === 'core/imagenes/vida/index.json'

    // Imágenes públicas usadas en fichas abiertas.
    || (
      lowerPath.startsWith('core/fotos/')
      && isImageOrJson
    )
    || (
      lowerPath.startsWith('core/imagenes/vida/')
      && isImageOrJson
    );
}

function cleanRequestedPath(rawPath) {
  return String(rawPath || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^data\//, '');
}

async function validateSupabaseUser(token) {
  if (!SUPABASE_URL || !SUPABASE_API_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const baseUrl = String(SUPABASE_URL).replace(/\/+$/, '');
  const authRes = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_API_KEY
    }
  });

  if (!authRes.ok) return null;
  return authRes.json();
}

async function hasActiveSubscriptionAccess(user) {
  if (!user?.id) return false;
  return hasActiveSubscription(user.id);
}

export default async function handler(req, res) {
  // 1. CORS
  // ── CORS / Origin restriction ──────────────────────────────
  const origin = req.headers.origin;

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawPath = Array.isArray(req.query.path)
    ? req.query.path[0]
    : req.query.path;

  const filePath = cleanRequestedPath(rawPath);
  const publicRequest = isPublicModelDataPath(filePath);

  // ── Environment checks ────────────────────────────────────
  // 2. Validación Supabase Auth
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!publicRequest && !token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Environment checks
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'Server configuration error: missing GitHub environment variables'
    });
  }

  if (!publicRequest && (!SUPABASE_URL || !SUPABASE_API_KEY)) {
    return res.status(500).json({
      error: 'Server configuration error: missing Supabase environment variables'
    });
  }

  if (!publicRequest) try {
    const user = await validateSupabaseUser(token);

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    const hasSubscriptionAccess = await hasActiveSubscriptionAccess(user);

    if (!hasSubscriptionAccess) {
      return res.status(403).json({ error: 'Suscripcion requerida' });
    }
  } catch (err) {
    console.error('[data proxy] Supabase auth error:', err);
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  // ── Validate requested path ────────────────────────────────
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
  // 3. Proxy GitHub
  const encodedPath = filePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/${encodedPath}`;

  try {
    const directoryRequest = isAllowedDirectoryPath(filePath);
    const ghRes = await fetch(ghUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: directoryRequest ? 'application/vnd.github+json' : 'application/vnd.github.raw',
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

    const contentType = directoryRequest
      ? 'application/json; charset=utf-8'
      : getContentTypeFromPath(filePath);
    const arrayBuffer = await ghRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // JSON: cache más corto
    if (directoryRequest || filePath.toLowerCase().endsWith('.json')) {
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
