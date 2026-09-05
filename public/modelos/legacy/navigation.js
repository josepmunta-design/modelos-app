(function setupSpeedDialNav(){
  const nav = document.querySelector('.nav-speed');
  if (!nav) return;

  const btn  = nav.querySelector('.nav-fab-main');
  const menu = nav.querySelector('.nav-menu');
  const networkBtn = nav.querySelector('#btnNetworkView');
  const themeBtn = nav.querySelector('#btnThemeToggle');
  if (!btn || !menu) return;

  const THEME_KEY = 'tmps_modelos_theme';
  const sunIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.9 6.9l1.6 1.6M15.5 15.5l1.6 1.6M17.1 6.9l-1.6 1.6M8.5 15.5l-1.6 1.6M12 15.8a3.8 3.8 0 1 0 0-7.6a3.8 3.8 0 0 0 0 7.6Z"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const moonIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.8 4.2a7.8 7.8 0 1 0 5 13.8a8.6 8.6 0 1 1-5-13.8Z"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  function applyTheme(mode){
    const light = (mode === 'light');
    document.body.classList.toggle('theme-light', light);

    if (themeBtn){
      themeBtn.innerHTML = light ? moonIcon : sunIcon;
      const themeLabel = light
        ? uiText('theme.toDark', 'Cambiar a oscuro')
        : uiText('theme.toLight', 'Cambiar a claro');
      themeBtn.dataset.i18nTitle = light ? 'theme.toDark' : 'theme.toLight';
      themeBtn.dataset.i18nAriaLabel = light ? 'theme.toDark' : 'theme.toLight';
      themeBtn.title = themeLabel;
      themeBtn.setAttribute('aria-label', themeLabel);
    }
  }

  const qsTheme = String(new URLSearchParams(location.search).get('theme') || '').toLowerCase();
  const forcedTheme = (qsTheme === 'light' || qsTheme === 'dark') ? qsTheme : '';
  const savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(forcedTheme || (savedTheme === 'light' ? 'light' : 'dark'));

  const setOpen = (on) => {
    nav.classList.toggle('open', on);
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!nav.classList.contains('open'));
  });

  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('open')) return;
    if (nav.contains(e.target)) return;
    setOpen(false);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  if (themeBtn){
    themeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const toLight = !document.body.classList.contains('theme-light');
      applyTheme(toLight ? 'light' : 'dark');
      localStorage.setItem(THEME_KEY, toLight ? 'light' : 'dark');
      setOpen(false);
    });
  }

  if (networkBtn){
    networkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('libraryNetworkViewButton')?.click();
      setOpen(false);
    });
  }

  menu.addEventListener('click', () => setOpen(false));

  setOpen(false);
})();
