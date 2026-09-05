(() => {
  if (document.documentElement.classList.contains('atlas-enabled')) return;
  const NAV_ID = 'tmpsAppsNav';
  if (document.getElementById(NAV_ID)) return;

  const isEnglish = String(location.pathname || '').startsWith('/en/');
  const copy = isEnglish
    ? {
        navigation: 'Application navigation',
        heading: 'Switch application',
        current: 'Current',
        home: 'Back to Home'
      }
    : {
        navigation: 'Navegación entre aplicaciones',
        heading: 'Cambiar de aplicación',
        current: 'Actual',
        home: 'Volver a la Home'
      };

  const apps = [
    { id: 'modelos', label: isEnglish ? 'Library' : 'Biblioteca', href: isEnglish ? '/en/models/' : '/modelos/' },
    { id: 'genealogia', label: isEnglish ? 'Genealogy' : 'Genealogía', href: '/modelos/?view=genealogy' },
    { id: 'mapamundi', label: isEnglish ? 'World map' : 'Mapamundi', href: '/modelos/?view=map' },
    { id: 'metamodelos', label: 'Metamodelos', href: '/metamodelos/' }
  ];

  const path = `${location.pathname.replace(/\/+$/, '')}/`;
  const currentApp = apps.find((app) => path.startsWith(`${app.href}`))?.id || '';
  document.documentElement.dataset.tmpsApp = currentApp;
  const nav = document.createElement('nav');
  nav.id = NAV_ID;
  nav.dataset.open = 'false';
  nav.setAttribute('aria-label', copy.navigation);

  const links = apps.map((app) => {
    const current = app.id === currentApp;
    return `
      <a class="tmps-apps-nav__link" href="${app.href}" role="menuitem"${current ? ' aria-current="page"' : ''}>
        <span>${app.label}</span>
        ${current ? `<span class="tmps-apps-nav__current">${copy.current}</span>` : ''}
      </a>`;
  }).join('');

  nav.innerHTML = `
    <div class="tmps-apps-nav__panel" id="tmpsAppsNavPanel" role="menu" aria-labelledby="tmpsAppsNavButton">
      <p class="tmps-apps-nav__heading">${copy.heading}</p>
      <div class="tmps-apps-nav__links">${links}</div>
      <div class="tmps-apps-nav__home">
        <a class="tmps-apps-nav__link" href="/" role="menuitem"><span>${copy.home}</span></a>
      </div>
    </div>
    <button class="tmps-apps-nav__button" id="tmpsAppsNavButton" type="button"
      aria-haspopup="menu" aria-controls="tmpsAppsNavPanel" aria-expanded="false">
      <span class="tmps-apps-nav__icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span>Apps</span>
    </button>`;

  document.body.appendChild(nav);

  const button = nav.querySelector('#tmpsAppsNavButton');
  const menuItems = [...nav.querySelectorAll('[role="menuitem"]')];

  function setOpen(open, focusFirst = false) {
    nav.dataset.open = String(open);
    button.setAttribute('aria-expanded', String(open));
    if (open && focusFirst) menuItems[0]?.focus();
  }

  button.addEventListener('click', () => {
    setOpen(nav.dataset.open !== 'true');
  });

  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    setOpen(true, true);
  });

  nav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      button.focus();
      return;
    }

    const index = menuItems.indexOf(document.activeElement);
    if (index < 0) return;
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % menuItems.length;
    else if (event.key === 'ArrowUp') nextIndex = (index - 1 + menuItems.length) % menuItems.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = menuItems.length - 1;
    else return;
    event.preventDefault();
    menuItems[nextIndex].focus();
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('[role="menuitem"]')) setOpen(false);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!nav.contains(event.target)) setOpen(false);
  });
})();
