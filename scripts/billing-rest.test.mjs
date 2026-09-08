import test from 'node:test';
import assert from 'node:assert/strict';

// supabaseRest necesita estas dos para no abortar en assertServerBillingConfig.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://ejemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'clave-de-prueba';

const { supabaseRest } = await import('../api/_billing.js');

function conRespuesta(respuesta, alRecibir) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    alRecibir?.(url, options);
    return respuesta;
  };
  return () => { globalThis.fetch = original; };
}

test('una insercion con return=minimal devuelve 201 sin cuerpo y no revienta', async () => {
  // PostgREST responde 201 con el cuerpo vacio cuando se pide
  // Prefer: return=minimal. Llamar a .json() sobre eso lanzaba SyntaxError y
  // la insercion parecia fallar aunque hubiera funcionado: es lo que tumbaba
  // /api/subscribe-list con un 500.
  const restaurar = conRespuesta(new Response('', { status: 201 }));

  try {
    const resultado = await supabaseRest('lista_espera', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ email: 'a@b.com' })
    });
    assert.equal(resultado, null);
  } finally {
    restaurar();
  }
});

test('un 204 sin cuerpo sigue devolviendo null', async () => {
  const restaurar = conRespuesta(new Response(null, { status: 204 }));

  try {
    assert.equal(await supabaseRest('eventos'), null);
  } finally {
    restaurar();
  }
});

test('una respuesta con cuerpo JSON se sigue parseando', async () => {
  const restaurar = conRespuesta(
    new Response(JSON.stringify([{ status: 'active' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );

  try {
    const filas = await supabaseRest('user_subscriptions?select=*');
    assert.deepEqual(filas, [{ status: 'active' }]);
  } finally {
    restaurar();
  }
});

test('un error de Supabase se propaga con su cuerpo, no como fallo de parseo', async () => {
  const restaurar = conRespuesta(
    new Response('{"message":"relation does not exist"}', { status: 404 })
  );

  try {
    await assert.rejects(
      () => supabaseRest('tabla_que_no_existe'),
      /Supabase REST error 404.*relation does not exist/s
    );
  } finally {
    restaurar();
  }
});

test('una respuesta 200 que no es JSON falla con un mensaje legible', async () => {
  const restaurar = conRespuesta(new Response('<html>proxy</html>', { status: 200 }));

  try {
    await assert.rejects(
      () => supabaseRest('eventos'),
      /respuesta no JSON/
    );
  } finally {
    restaurar();
  }
});

test('la clave de servicio viaja en apikey y en Authorization', async () => {
  let recibido = null;
  const restaurar = conRespuesta(
    new Response('', { status: 201 }),
    (_url, options) => { recibido = options; }
  );

  try {
    await supabaseRest('eventos', { method: 'POST', body: '[]' });
    assert.equal(recibido.headers.get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY);
    assert.equal(
      recibido.headers.get('Authorization'),
      `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    );
    // El Content-Type se pone solo cuando hay cuerpo.
    assert.equal(recibido.headers.get('Content-Type'), 'application/json');
  } finally {
    restaurar();
  }
});
