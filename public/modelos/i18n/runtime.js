(() => {
  const SUPPORTED_LOCALES = Object.freeze(['es', 'en']);
  const DEFAULT_LOCALE = 'es';
  const ROUTES = Object.freeze({
    es: Object.freeze({ library: '/modelos/', segment: 'modelos' }),
    en: Object.freeze({ library: '/en/models/', segment: 'models' })
  });

  function detectLocale(pathname = location.pathname) {
    const parts = String(pathname || '').split('/').filter(Boolean);
    return parts[0]?.toLowerCase() === 'en' ? 'en' : DEFAULT_LOCALE;
  }

  function normalizeLocale(locale) {
    const value = String(locale || '').toLowerCase();
    return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
  }

  function getModelId(pathname = location.pathname) {
    const parts = String(pathname || '').split('/').filter(Boolean);
    const locale = detectLocale(pathname);
    const segment = ROUTES[locale].segment;
    const segmentIndex = parts.findIndex((part) => part.toLowerCase() === segment);
    if (segmentIndex < 0) return '';
    return decodeURIComponent(parts[segmentIndex + 1] || '').trim();
  }

  let messages = {};
  const currentLocale = detectLocale();
  document.documentElement.lang = currentLocale;
  document.documentElement.dataset.locale = currentLocale;
  const reviewedStaticTranslation = document.documentElement.dataset.translationStatus === 'reviewed';
  if (currentLocale === 'en' && !reviewedStaticTranslation) {
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex,follow');
  }

  function buildLibraryPath(locale = currentLocale) {
    return ROUTES[normalizeLocale(locale)].library;
  }

  function buildModelPath(modelId, locale = currentLocale) {
    const cleanId = String(modelId || '').trim();
    const libraryPath = buildLibraryPath(locale);
    return cleanId ? `${libraryPath}${encodeURIComponent(cleanId)}` : libraryPath;
  }

  function interpolate(message, variables = {}) {
    return String(message || '').replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key) => (
      Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : `{${key}}`
    ));
  }

  function t(key, variables = {}, fallback = '') {
    const message = messages[key] ?? fallback ?? key;
    return interpolate(message, variables);
  }

  async function loadMessages(locale = currentLocale) {
    const normalized = normalizeLocale(locale);
    const response = await fetch(`/modelos/i18n/${normalized}.json?v=20260902-1`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Could not load locale ${normalized}: HTTP ${response.status}`);
    messages = await response.json();
    return messages;
  }

  function translateDom(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n, {}, element.textContent);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute('placeholder', t(
        element.dataset.i18nPlaceholder,
        {},
        element.getAttribute('placeholder') || ''
      ));
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', t(
        element.dataset.i18nAriaLabel,
        {},
        element.getAttribute('aria-label') || ''
      ));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.setAttribute('title', t(
        element.dataset.i18nTitle,
        {},
        element.getAttribute('title') || ''
      ));
    });
  }

  function updateLanguageLinks(root = document) {
    const modelId = getModelId();
    root.querySelectorAll('[data-locale-link]').forEach((link) => {
      const targetLocale = normalizeLocale(link.dataset.localeLink);
      link.href = buildModelPath(modelId, targetLocale);
      if (targetLocale === currentLocale) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function afterDomReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  }

  const ready = loadMessages()
    .then(() => new Promise((resolve) => {
      afterDomReady(() => {
        translateDom();
        updateLanguageLinks();
        if (!getModelId() && typeof window.setLibrarySeo === 'function') window.setLibrarySeo();
        document.dispatchEvent(new CustomEvent('modelos:locale-ready', {
          detail: { locale: currentLocale }
        }));
        resolve(messages);
      });
    }))
    .catch((error) => {
      console.warn('[i18n] Locale dictionary unavailable:', error);
      afterDomReady(() => updateLanguageLinks());
      return messages;
    });

  window.addEventListener('popstate', () => updateLanguageLinks());

  window.TMPS_MODELOS_I18N = Object.freeze({
    supportedLocales: SUPPORTED_LOCALES,
    locale: currentLocale,
    routes: ROUTES,
    ready,
    detectLocale,
    getModelId,
    buildLibraryPath,
    buildModelPath,
    t,
    translateDom,
    updateLanguageLinks
  });
})();
