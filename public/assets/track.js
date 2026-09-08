/*
 * Analitica del Atlas.
 *
 * Un unico punto de entrada para todas las paginas. Expone
 * window.track(nombre, datos) y envia los eventos por lotes a /api/track,
 * que los guarda en la tabla `eventos` de Supabase.
 *
 * Por que no Vercel: los eventos personalizados de Vercel Web Analytics
 * requieren plan Pro y en Hobby se descartan en silencio. Se mantiene la
 * llamada a window.va para no perder las visitas ni cerrar esa puerta.
 *
 * Privacidad: no se guarda email, ni IP, ni cookies. `sesion` es un
 * identificador aleatorio que vive en sessionStorage y muere al cerrar la
 * pestana; sirve solo para encadenar los pasos de una misma visita.
 *
 * Reglas:
 * - La analitica NUNCA debe romper la aplicacion: todo va en try/catch.
 * - Los nombres de evento son un vocabulario cerrado, fijado en
 *   LANZAMIENTO.md seccion 0.1 y validado tambien en api/track.js.
 *   Anadir uno nuevo exige tocar los dos sitios.
 *
 * Cargar antes que el resto de scripts de la pagina:
 *   <script src="/assets/track.js"></script>
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/track';
  var SESSION_KEY = 'atlas:fichas-vistas';
  var SESSION_ID_KEY = 'atlas:sesion';
  var ESPERA_MS = 3000;   // agrupa eventos seguidos en un solo envio
  var LOTE_MAXIMO = 40;   // el endpoint descarta lo que pase de aqui

  // Cola de Vercel Analytics: mantiene las visitas del plan gratuito.
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  function readSession(key, fallback) {
    try {
      var raw = window.sessionStorage.getItem(key);
      return raw === null ? fallback : raw;
    } catch (_) {
      return fallback;
    }
  }

  function writeSession(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (_) {
      /* modo privado, cuota llena: no pasa nada */
    }
  }

  /* Identificador de visita. Aleatorio, no persistente, sin relacion con
     ninguna cuenta: solo permite ver el recorrido dentro de una sesion. */
  function sesionId() {
    var id = readSession(SESSION_ID_KEY, '');
    if (id) return id;

    id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    writeSession(SESSION_ID_KEY, id);
    return id;
  }

  /* Cuantas fichas lleva vistas esta persona en la sesion. Es el dato que dice
     en que momento exacto choca con el muro. */
  function fichasVistas() {
    var n = parseInt(readSession(SESSION_KEY, '0'), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function contarFicha(modelo) {
    var vistasKey = SESSION_KEY + ':ids';
    var vistas = readSession(vistasKey, '');
    var id = String(modelo || '').trim();

    // Solo cuenta fichas distintas: recargar una ficha no infla el contador.
    if (id && vistas.split('|').indexOf(id) !== -1) return fichasVistas();

    var total = fichasVistas() + 1;
    writeSession(SESSION_KEY, String(total));
    if (id) writeSession(vistasKey, vistas ? vistas + '|' + id : id);
    return total;
  }

  var cola = [];
  var temporizador = null;

  function enviar(usarBeacon) {
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
    if (!cola.length) return;

    var lote = cola.splice(0, LOTE_MAXIMO);
    var cuerpo = JSON.stringify({ eventos: lote });

    try {
      // Al cerrar la pestana solo sendBeacon garantiza la entrega; fetch
      // normal se cancela. Sin esto, las visitas cortas no dejan rastro.
      if (usarBeacon && navigator.sendBeacon) {
        var blob = new Blob([cuerpo], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true
      }).catch(function () { /* evento perdido, no se reintenta */ });
    } catch (_) {
      /* la analitica nunca debe romper la app */
    }
  }

  function encolar(nombre, datos) {
    cola.push({
      nombre: nombre,
      sesion: sesionId(),
      ruta: location.pathname + location.search,
      referrer: document.referrer || '',
      datos: datos
    });

    if (cola.length >= LOTE_MAXIMO) return enviar(false);
    if (!temporizador) temporizador = setTimeout(function () { enviar(false); }, ESPERA_MS);
  }

  /**
   * Envia un evento.
   * @param {string} name  Nombre del evento (ver LANZAMIENTO.md 0.1).
   * @param {object} [data] Propiedades planas. Los vacios se descartan.
   */
  function track(name, data) {
    try {
      if (!name) return;

      var payload = {};
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function (key) {
          var value = data[key];
          if (value === undefined || value === null || value === '') return;
          payload[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        });
      }

      encolar(name, payload);
      window.va('event', { name: name, data: payload });

      // Tercer destino opcional: si algun dia se anade PostHog, recibe lo
      // mismo sin tener que reinstrumentar nada.
      if (typeof window.posthog !== 'undefined' && window.posthog.capture) {
        window.posthog.capture(name, payload);
      }
    } catch (_) {
      /* la analitica nunca debe romper la app */
    }
  }

  /* Marca una ficha como vista y emite el evento con el contador ya al dia. */
  track.ficha = function (modelo, extra) {
    var total = contarFicha(modelo);
    var payload = { modelo: modelo, fichas_vistas: total };
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    }
    track('ficha_abierta', payload);
    return total;
  };

  track.fichasVistas = fichasVistas;
  track.enviar = function () { enviar(true); };

  // Vaciar la cola antes de que la pagina desaparezca. visibilitychange es el
  // unico evento fiable en Safari de iOS; pagehide cubre el resto.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') enviar(true);
  });
  window.addEventListener('pagehide', function () { enviar(true); });

  window.track = track;
}());
