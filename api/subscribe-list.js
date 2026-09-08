import {
  normalizeEmail,
  sendMethodNotAllowed,
  supabaseRest
} from './_billing.js';

const ORIGENES = new Set(['home', 'muro', 'ficha', 'escuelas', 'metamodelos', 'otro']);
const PERFILES = new Set(['clinico', 'docente', 'estudiante', 'otro']);
const LOCALES = new Set(['es', 'en']);

const MAX_EMAIL_LENGTH = 254;
const MAX_TEXT_LENGTH = 120;

function cleanText(value, allowed) {
  const text = String(value ?? '').trim().toLowerCase().slice(0, MAX_TEXT_LENGTH);
  if (!text) return null;
  if (allowed && !allowed.has(text)) return null;
  return text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST');
  }

  try {
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const rawEmail = String(body.email ?? '').trim();

    if (!rawEmail || rawEmail.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ error: 'Escribe un email válido.' });
    }

    const norm = normalizeEmail(rawEmail);

    if (!norm.ok) {
      return res.status(400).json({
        error: norm.reason === 'disposable'
          ? 'Usa un email permanente, por favor.'
          : 'Escribe un email válido.'
      });
    }

    const perfil = cleanText(body.perfil, PERFILES);

    await supabaseRest('lista_espera?on_conflict=email_normalized', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        // Apuntarse dos veces no es un error: se ignora el duplicado.
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        email: rawEmail.toLowerCase(),
        email_normalized: norm.value,
        origen: cleanText(body.origen, ORIGENES) || 'otro',
        modelo_contexto: cleanText(body.modelo) || null,
        perfil,
        locale: cleanText(body.locale, LOCALES) || 'es',
        user_agent: String(req.headers['user-agent'] ?? '').slice(0, 250) || null
      })
    });

    // El perfil se pregunta DESPUÉS de guardar el email, así que llega en una
    // segunda llamada cuando la fila ya existe. El insert de arriba la ignora
    // por duplicada, de modo que sin este PATCH la respuesta se perdía y la
    // columna quedaba en NULL.
    if (perfil) {
      await supabaseRest(
        `lista_espera?email_normalized=eq.${encodeURIComponent(norm.value)}`,
        {
          method: 'PATCH',
          headers: { Accept: 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ perfil })
        }
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[subscribe-list] error:', err);

    // No se distingue entre "ya estabas" y "ha fallado": el endpoint es
    // público y no debe servir para averiguar si un email está en la lista.
    return res.status(500).json({
      error: 'No hemos podido guardar tu email. Inténtalo en un momento.'
    });
  }
}
