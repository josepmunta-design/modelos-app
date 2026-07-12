import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasPrivateDataAccess } from './_billing.js';

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

function readLocalEnvValue(name) {
  if (process.env[name]) return process.env[name];

  const files = ['.env.development.local', '.env.local'];
  for (const file of files) {
    const fullPath = join(process.cwd(), file);
    if (!existsSync(fullPath)) continue;

    const lines = readFileSync(fullPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || match[1] !== name) continue;
      return match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return '';
}

const GITHUB_OWNER = readLocalEnvValue('GITHUB_OWNER');
const GITHUB_REPO = readLocalEnvValue('GITHUB_REPO');
const GITHUB_TOKEN = readLocalEnvValue('GITHUB_TOKEN');
const SUPABASE_URL = readLocalEnvValue('SUPABASE_URL') || 'https://yritadgaurvplltgubii.supabase.co';
const SUPABASE_SECRET_KEY = readLocalEnvValue('SUPABASE_SERVICE_ROLE_KEY') || readLocalEnvValue('SUPABASE_SECRET_KEY');
const SUPABASE_API_KEY = SUPABASE_SECRET_KEY
  || readLocalEnvValue('SUPABASE_ANON_KEY')
  || 'sb_publishable_ddx-9W2ZbYubGUlqx7TRig_AqS6rftm';
const LOCAL_DEV_FULL_ACCESS = readLocalEnvValue('LOCAL_DEV_FULL_ACCESS') === '1'
  && process.env.VERCEL_ENV !== 'production'
  && process.env.NODE_ENV !== 'production';

console.log('[data proxy] env check', {
  LOCAL_DEV_FULL_ACCESS,
  NODE_ENV: process.env.NODE_ENV || '',
  VERCEL_ENV: process.env.VERCEL_ENV || '',
  LOCAL_DEV_FULL_ACCESS_READ: readLocalEnvValue('LOCAL_DEV_FULL_ACCESS') === '1'
});

// Allowed frontend origins.
// CORS uses only protocol + domain, not the full path.
const ALLOWED_ORIGINS = [
  'https://apps.tumentorpsicologia.com',
  'https://modelos.tumentorpsicologia.com',
  'https://modelos-app.vercel.app'
];

function isLocalDevOrigin(origin) {
  if (!LOCAL_DEV_FULL_ACCESS) return false;

  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

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
  'Core/imagenes/vida/landing',
  'Core/imagenes/localizacion'
];

const PRIVATE_ROOT_DIRECTORY_PATHS = [
  'indices/subprocesos'
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
  return ALLOWED_DIRECTORY_PATHS.includes(value)
    || PRIVATE_ROOT_DIRECTORY_PATHS.includes(value);
}

function isPublicDirectoryPath(path) {
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
  return isPublicDirectoryPath(value)
    || (
      lowerPath.startsWith('core/imagenes/vida/landing/')
      && ALLOWED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))
    );
}

function isPublicModelImagePath(path) {
  const value = String(path || '').replace(/\/+$/, '');
  const lowerPath = value.toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
    .some((ext) => lowerPath.endsWith(ext));

  return isImage && (
    lowerPath.startsWith('core/fotos/')
    || lowerPath.startsWith('core/imagenes/vida/')
    || lowerPath.startsWith('core/imagenes/localizacion/')
  );
}

function isPublicModelDataPath(path) {
  const value = String(path || '').replace(/\/+$/, '');
  const lowerPath = value.toLowerCase();

  return isPublicLandingAssetPath(value)
    || isPublicModelImagePath(value)
    // Estos indices solo relacionan modelos/autores con sus imagenes publicas.
    || lowerPath === 'core/fotos/foto.json'
    || lowerPath === 'core/fotos.json'
    || lowerPath === 'core/foto.json'
    || lowerPath === 'core/imagenes/vida/index.json'
    || lowerPath === 'core/escuelas/index.json'
    // Grafo de la genealogía: relaciones entre modelos, visible en abierto
    // (las fichas completas siguen siendo privadas).
    || lowerPath === 'core/influencias/modelos_influencias.json'
    || /^core\/escuelas\/[a-z0-9_-]+\.json$/i.test(value)
    || /^core\/modelos-publicos\/[a-z0-9_-]+\/[a-z0-9_-]+\.json$/i.test(value);
}

function isPrivateRootIndexPath(path) {
  const value = String(path || '').replace(/\/+$/, '');
  const lowerPath = value.toLowerCase();
  return lowerPath === 'indices/subprocesos'
    || /^indices\/subprocesos\/[a-z0-9_-]+\.json$/i.test(value)
    || lowerPath === 'indices/subprocesos/index.json'
    || /^indices\/isomorfismos\/[a-z0-9_-]+\.json$/i.test(value)
    || lowerPath === 'indices/isomorfismos/iso_lista.json'
    || lowerPath === 'indices/isomorfismos/iso_lookup.json'
    || lowerPath === 'indices/isomorfismos/isomorfismos-links-modeloid-tecnicaid-repo.json';
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

export default async function handler(req, res) {
  // 1. CORS
  // ── CORS / Origin restriction ──────────────────────────────
  const origin = req.headers.origin;

  const allowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || isLocalDevOrigin(origin));

  if (origin && !allowedOrigin) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  if (allowedOrigin) {
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

  if (LOCAL_DEV_FULL_ACCESS) {
    console.log('[data proxy] local bypass active', {
      path: filePath,
      publicRequest
    });
  }

  // ── Environment checks ────────────────────────────────────
  // 2. Validación Supabase Auth
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!LOCAL_DEV_FULL_ACCESS && !publicRequest && !token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Environment checks
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'Server configuration error: missing GitHub environment variables'
    });
  }

  if (!LOCAL_DEV_FULL_ACCESS && !publicRequest && (!SUPABASE_URL || !SUPABASE_API_KEY)) {
    return res.status(500).json({
      error: 'Server configuration error: missing Supabase environment variables'
    });
  }

  if (!LOCAL_DEV_FULL_ACCESS && !publicRequest) try {
    const user = await validateSupabaseUser(token);

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    const hasSubscriptionAccess = await hasPrivateDataAccess(user);

    if (!hasSubscriptionAccess) {
      return res.status(403).json({ error: 'Suscripcion o prueba gratuita activa requerida' });
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

  const repoPath = isPrivateRootIndexPath(filePath)
    ? encodedPath
    : `data/${encodedPath}`;
  const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoPath}`;

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
