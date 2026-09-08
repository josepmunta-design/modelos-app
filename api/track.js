import { sendMethodNotAllowed, supabaseRest } from './_billing.js';

/*
 * Recogida de eventos del embudo.
 *
 * Recibe lotes de public/assets/track.js y los escribe en public.eventos.
 * Endpoint público y anónimo: no se guarda email, ni IP, ni cookies.
 *
 * Es deliberadamente permisivo con los fallos —responde 204 pase lo que
 * pase— porque la analítica no debe generar errores visibles ni reintentos
 * en el navegador. Lo que no se pueda guardar, se pierde.
 */

const MAX_EVENTOS = 40;
const MAX_NOMBRE = 40;
const MAX_TEXTO = 300;
const MAX_DATOS_CLAVES = 12;

// Los nombres de evento son un vocabulario cerrado (LANZAMIENTO.md 0.1).
// Siendo el endpoint público, un allowlist evita que la tabla se llene de
// basura y deja claro qué se está midiendo.
const NOMBRES = new Set([
  'home_vista',
  'vista_elegida',
  'ficha_abierta',
  'ficha_parcial_vista',
  'muro_visto',
  'click_registro',
  'registro_ok',
  'click_suscribir',
  'checkout_iniciado',
  'email_capturado',
  'perfil_declarado'
]);

function recorta(valor, largo = MAX_TEXTO) {
  const texto = String(valor ?? '').trim();
  return texto ? texto.slice(0, largo) : null;
}

function limpiaDatos(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return {};

  const salida = {};
  for (const clave of Object.keys(datos).slice(0, MAX_DATOS_CLAVES)) {
    const valor = datos[clave];
    if (valor === null || valor === undefined || valor === '') continue;

    if (typeof valor === 'number' || typeof valor === 'boolean') {
      salida[recorta(clave, 40)] = valor;
    } else {
      salida[recorta(clave, 40)] = recorta(valor, 120);
    }
  }
  return salida;
}

function normaliza(evento) {
  const nombre = recorta(evento?.nombre, MAX_NOMBRE);
  if (!nombre || !NOMBRES.has(nombre)) return null;

  return {
    nombre,
    sesion_id: recorta(evento?.sesion, 60),
    ruta: recorta(evento?.ruta, 200),
    referrer: recorta(evento?.referrer, 200),
    datos: limpiaDatos(evento?.datos)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST');
  }

  try {
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const entrada = Array.isArray(body?.eventos) ? body.eventos : [];
    const filas = entrada.slice(0, MAX_EVENTOS).map(normaliza).filter(Boolean);

    if (filas.length) {
      await supabaseRest('eventos', {
        method: 'POST',
        headers: { Accept: 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(filas)
      });
    }

    // 204 sin cuerpo: sendBeacon no lee la respuesta y así no se transfiere
    // nada de vuelta por cada lote.
    return res.status(204).end();
  } catch (err) {
    console.error('[track] error:', err);
    // Tampoco aquí se devuelve error: un 500 haría ruido en la consola de
    // cada visitante sin aportar nada.
    return res.status(204).end();
  }
}
