/*
 * Analitica del Atlas.
 *
 * Un unico punto de entrada para todas las paginas. Define la cola de Vercel
 * Analytics (window.va) y expone window.track(nombre, datos).
 *
 * Reglas:
 * - La analitica NUNCA debe romper la aplicacion: todo va en try/catch.
 * - Los nombres de evento estan fijados en LANZAMIENTO.md, seccion 0.1.
 *   No inventar nombres nuevos sin anotarlos alli.
 *
 * Cargar antes que el resto de scripts de la pagina:
 *   <script src="/assets/track.js"></script>
 *   <script defer src="/_vercel/insights/script.js"></script>
 */
(function () {
  'use strict';

  // Cola de Vercel Analytics. El script real (/_vercel/insights/script.js) la
  // vacia al cargar; si no llega, los eventos se quedan aqui sin dar error.
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  var SESSION_KEY = 'atlas:fichas-vistas';

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

  /**
   * Envia un evento.
   * @param {string} name  Nombre del evento (ver LANZAMIENTO.md 0.1).
   * @param {object} [data] Propiedades planas. Los nulos se descartan.
   */
  function track(name, data) {
    try {
      if (!name) return;

      var payload = {};
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function (key) {
          var value = data[key];
          if (value === undefined || value === null || value === '') return;
          // Vercel Analytics solo admite valores planos.
          payload[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        });
      }

      window.va('event', { name: name, data: payload });

      // Segundo destino opcional: si algun dia se anade PostHog, recibe lo mismo
      // sin tener que reinstrumentar nada.
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

  window.track = track;
}());
