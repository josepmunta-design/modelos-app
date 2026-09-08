/*
 * Lista de espera del Atlas.
 *
 * Mejora progresiva: se engancha a cualquier <form data-lista-espera="<origen>">
 * que exista en la pagina, lo envia por fetch a /api/subscribe-list y muestra el
 * estado sin recargar. Si el JS no carga, el formulario sigue siendo un form
 * normal y el navegador lo envia igual.
 *
 * Markup minimo:
 *   <form data-lista-espera="home" action="/api/subscribe-list" method="post">
 *     <input type="email" name="email" required>
 *     <button type="submit">Avisadme</button>
 *     <p data-lista-estado role="status" aria-live="polite"></p>
 *   </form>
 *
 * Atributos opcionales en el <form>:
 *   data-modelo   ficha desde la que se apunta
 *   data-locale   'es' | 'en'
 *
 * Ver LANZAMIENTO.md, seccion 0.2.
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/subscribe-list';

  var TEXTOS = {
    es: {
      enviando: 'Un momento…',
      ok: 'Hecho. Te escribo cuando haya novedades.',
      emailMal: 'Revisa el email, parece incompleto.',
      error: 'No ha podido guardarse. Inténtalo en un momento.',
      pregunta: '¿Qué describe mejor tu caso?'
    },
    en: {
      enviando: 'One moment…',
      ok: 'Done. I will write when there is news.',
      emailMal: 'That email looks incomplete.',
      error: 'It could not be saved. Please try again shortly.',
      pregunta: 'What best describes you?'
    }
  };

  function textos(form) {
    var locale = form.getAttribute('data-locale')
      || document.documentElement.getAttribute('lang')
      || 'es';
    return TEXTOS[locale.slice(0, 2)] || TEXTOS.es;
  }

  function emailParecePlausible(value) {
    // Validacion deliberadamente laxa: el servidor es quien decide.
    // Aqui solo se evita el viaje de ida y vuelta por una errata evidente.
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
  }

  function setEstado(form, mensaje, tipo) {
    var el = form.querySelector('[data-lista-estado]');
    if (!el) return;
    el.textContent = mensaje || '';
    el.setAttribute('data-tipo', tipo || '');
  }

  function bloquear(form, busy) {
    form.querySelectorAll('input, button, select').forEach(function (el) {
      el.disabled = !!busy;
    });
    form.setAttribute('data-enviando', busy ? 'si' : '');
  }

  function exito(form, t) {
    // Se sustituye el formulario por el agradecimiento: pedir el email dos
    // veces es la forma mas rapida de parecer roto.
    form.setAttribute('data-hecho', 'si');
    bloquear(form, false);
    setEstado(form, t.ok, 'ok');

    var campos = form.querySelector('[data-lista-campos]');
    if (campos) campos.hidden = true;

    var gracias = form.querySelector('[data-lista-gracias]');
    if (gracias) {
      gracias.hidden = false;
      var primero = gracias.querySelector('button, input, select');
      if (primero) { try { primero.focus(); } catch (_) {} }
    }
  }

  function enviar(form) {
    var t = textos(form);
    var input = form.querySelector('input[type="email"]');
    var email = input ? input.value : '';

    if (!emailParecePlausible(email)) {
      setEstado(form, t.emailMal, 'error');
      if (input) { try { input.focus(); } catch (_) {} }
      return;
    }

    var origen = form.getAttribute('data-lista-espera') || 'otro';
    var perfilEl = form.querySelector('[name="perfil"]');

    bloquear(form, true);
    setEstado(form, t.enviando, '');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        origen: origen,
        perfil: perfilEl ? perfilEl.value : null,
        modelo: form.getAttribute('data-modelo') || null,
        locale: form.getAttribute('data-locale')
          || document.documentElement.getAttribute('lang')
          || 'es'
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    }).then(function () {
      exito(form, t);
      if (typeof window.track === 'function') {
        window.track('email_capturado', {
          origen: origen,
          perfil: perfilEl ? perfilEl.value : null,
          modelo: form.getAttribute('data-modelo') || null,
          fichas_vistas: typeof window.track.fichasVistas === 'function'
            ? window.track.fichasVistas()
            : null
        });
      }
    }).catch(function () {
      bloquear(form, false);
      setEstado(form, t.error, 'error');
    });
  }

  /* El perfil se pregunta DESPUES de tener el email: si se pide antes,
     baja la conversion y el email es lo unico que de verdad importa. */
  function enviarPerfil(form, perfil) {
    var gracias = form.querySelector('[data-lista-gracias]');
    if (gracias) gracias.hidden = true;

    var cierre = form.querySelector('[data-lista-cierre]');
    if (cierre) cierre.hidden = false;

    if (typeof window.track === 'function') {
      window.track('perfil_declarado', {
        perfil: perfil,
        origen: form.getAttribute('data-lista-espera') || 'otro'
      });
    }

    var input = form.querySelector('input[type="email"]');
    if (!input) return;

    // Actualiza la fila ya creada; si falla, no se le dice nada a la persona:
    // su email, que es lo importante, ya esta guardado.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.value,
        origen: form.getAttribute('data-lista-espera') || 'otro',
        perfil: perfil,
        modelo: form.getAttribute('data-modelo') || null
      })
    }).catch(function () { /* silencio deliberado */ });
  }

  function enganchar(form) {
    if (form.getAttribute('data-lista-lista') === 'si') return;
    form.setAttribute('data-lista-lista', 'si');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      enviar(form);
    });

    form.querySelectorAll('[data-perfil]').forEach(function (boton) {
      boton.addEventListener('click', function (event) {
        event.preventDefault();
        enviarPerfil(form, boton.getAttribute('data-perfil'));
      });
    });
  }

  function iniciar() {
    document.querySelectorAll('form[data-lista-espera]').forEach(enganchar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  // El Atlas inyecta el formulario del muro y de la ficha despues de cargar.
  window.listaEspera = { enganchar: enganchar, iniciar: iniciar };
}());
