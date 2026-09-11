(async function setupAccessGate(){
      await window.TMPS_MODELOS_I18N?.ready;
      const form = document.getElementById('accessForm');
      const titleEl = document.getElementById('accessTitle');
      const textEl = document.querySelector('.accessText');
      const emailInput = document.getElementById('accessEmail');
      const passwordInput = document.getElementById('accessPassword');
      const passwordRepeatInput = document.getElementById('accessPasswordRepeat');
      const loginBtn = document.getElementById('accessLoginBtn');
      const signupBtn = document.getElementById('accessSignupBtn');
      const subscribeBtn = document.getElementById('accessSubscribeBtn');
      const continueBtn = document.getElementById('accessContinueBtn');
      const forgotPasswordBtn = document.getElementById('forgotPasswordButton');
      const backToLoginBtn = document.getElementById('backToLoginButton');
      const userMenu = document.getElementById('authUserMenu');
      const menuBtn = document.getElementById('authMenuButton');
      const loginMenuBtn = document.getElementById('authLoginButton');
      const fullscreenBtn = document.getElementById('authFullscreenButton');
      const logoutBtn = document.getElementById('authLogoutButton');
      const status = document.getElementById('accessStatus');
      const checkoutNoticeModal = document.getElementById('checkoutNoticeModal');
      const checkoutNoticeCancel = document.getElementById('checkoutNoticeCancel');
      const checkoutNoticeConfirm = document.getElementById('checkoutNoticeConfirm');
      let accessRenderVersion = 0;
      let authReadyResolved = false;
      let checkoutInFlight = false;
      let accessMode = 'login';
      let recoveryLinkInvalid = false;

      if (PUBLIC_LIBRARY_ACCESS){
        document.body.classList.remove('access-locked', 'auth-logged-in');
        window.SUPABASE_ACCESS_TOKEN = '';
        window.HAS_SUBSCRIPTION_ACCESS = true;
        window.startSubscriptionCheckout = () => {};
        window.openSubscriptionLogin = () => {};
        if (typeof window.__resolveSupabaseAuthReady === 'function'){
          window.__resolveSupabaseAuthReady(null);
          window.__resolveSupabaseAuthReady = null;
        }
        return;
      }

      const LOGIN_TITLE = uiText('auth.title', 'Modelos');
      const LOGIN_TEXT = uiText('auth.intro', 'Entra para guardar tu sesión o suscríbete para abrir la biblioteca completa. Puedes seguir gratis con fichas parciales.');

      function hasResetPasswordParam(){
        try{
          return new URLSearchParams(location.search).get('reset_password') === '1';
        }catch(e){
          return false;
        }
      }

      function clearResetPasswordParam(){
        if (!hasResetPasswordParam()) return;
        try{
          const url = new URL(location.href);
          url.searchParams.delete('reset_password');
          history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
        }catch(e){}
      }

      function passwordResetRedirectUrl(){
        const resetPath = MODELOS_LOCALE === 'en' ? '/en/models/?reset_password=1' : '/modelos/?reset_password=1';
        if (IS_LOCAL_DEV){
          return `${location.origin}${resetPath}`;
        }
        return `https://apps.tumentorpsicologia.com${resetPath}`;
      }

      function setStatus(message, ok){
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('is-ok', !!ok);
      }

      function setBusy(busy){
        if (loginBtn) loginBtn.disabled = !!busy;
        if (signupBtn) signupBtn.disabled = !!busy;
        if (subscribeBtn) subscribeBtn.disabled = !!busy;
        if (continueBtn) continueBtn.disabled = !!busy;
      }

      function setAccessMode(mode){
        accessMode = mode;

        if (titleEl) titleEl.textContent = LOGIN_TITLE;
        if (textEl) textEl.textContent = LOGIN_TEXT;

        if (emailInput){
          emailInput.hidden = false;
          emailInput.required = true;
          emailInput.autocomplete = 'email';
        }
        if (passwordInput){
          passwordInput.hidden = false;
          passwordInput.required = true;
          passwordInput.placeholder = uiText('auth.password', 'Contraseña');
          passwordInput.setAttribute('aria-label', uiText('auth.password', 'Contraseña'));
          passwordInput.autocomplete = 'current-password';
        }
        if (passwordRepeatInput){
          passwordRepeatInput.hidden = true;
          passwordRepeatInput.required = false;
          passwordRepeatInput.value = '';
        }
        if (loginBtn){
          loginBtn.hidden = false;
          loginBtn.textContent = uiText('auth.signIn', 'Entrar');
        }
        if (signupBtn) signupBtn.hidden = false;
        if (continueBtn) continueBtn.hidden = false;
        if (subscribeBtn) subscribeBtn.hidden = true;
        if (forgotPasswordBtn) forgotPasswordBtn.hidden = false;
        if (backToLoginBtn){
          backToLoginBtn.hidden = true;
          backToLoginBtn.textContent = uiText('auth.backToSignIn', 'Volver al inicio de sesión');
        }

        if (mode === 'recover'){
          if (titleEl) titleEl.textContent = uiText('auth.recoverTitle', 'Recuperar contraseña');
          if (textEl) textEl.textContent = uiText('auth.recoverText', 'Introduce tu email y te enviaremos un enlace para crear una nueva contraseña.');
          if (passwordInput){
            passwordInput.hidden = true;
            passwordInput.required = false;
            passwordInput.value = '';
          }
          if (loginBtn) loginBtn.textContent = uiText('auth.sendLink', 'Enviar enlace');
          if (signupBtn) signupBtn.hidden = true;
          if (continueBtn) continueBtn.hidden = true;
          if (forgotPasswordBtn) forgotPasswordBtn.hidden = true;
          if (backToLoginBtn) backToLoginBtn.hidden = false;
        }

        if (mode === 'reset'){
          if (titleEl) titleEl.textContent = uiText('auth.resetTitle', 'Crear nueva contraseña');
          if (textEl) textEl.textContent = recoveryLinkInvalid
            ? uiText('auth.expiredLink', 'El enlace de recuperación ha caducado o no es válido. Solicita un nuevo enlace.')
            : '';
          if (emailInput){
            emailInput.hidden = true;
            emailInput.required = false;
          }
          if (passwordInput){
            passwordInput.hidden = recoveryLinkInvalid;
            passwordInput.required = !recoveryLinkInvalid;
            passwordInput.placeholder = uiText('auth.newPassword', 'Nueva contraseña');
            passwordInput.setAttribute('aria-label', uiText('auth.newPassword', 'Nueva contraseña'));
            passwordInput.autocomplete = 'new-password';
            passwordInput.value = '';
          }
          if (passwordRepeatInput){
            passwordRepeatInput.hidden = recoveryLinkInvalid;
            passwordRepeatInput.required = !recoveryLinkInvalid;
            passwordRepeatInput.value = '';
          }
          if (loginBtn){
            loginBtn.hidden = recoveryLinkInvalid;
            loginBtn.textContent = uiText('auth.savePassword', 'Guardar nueva contraseña');
          }
          if (signupBtn) signupBtn.hidden = true;
          if (continueBtn) continueBtn.hidden = true;
          if (forgotPasswordBtn) forgotPasswordBtn.hidden = true;
          if (backToLoginBtn){
            backToLoginBtn.hidden = false;
            backToLoginBtn.textContent = recoveryLinkInvalid
              ? uiText('auth.requestNewLink', 'Solicitar nuevo enlace')
              : uiText('auth.backToSignIn', 'Volver al inicio de sesión');
          }
        }
      }

      function setLoginFieldsVisible(visible){
        if (visible){
          recoveryLinkInvalid = false;
          setAccessMode('login');
          return;
        }
        if (emailInput) emailInput.hidden = true;
        if (passwordInput) passwordInput.hidden = true;
        if (passwordRepeatInput) passwordRepeatInput.hidden = true;
        if (loginBtn) loginBtn.hidden = true;
        if (signupBtn) signupBtn.hidden = true;
        if (forgotPasswordBtn) forgotPasswordBtn.hidden = true;
        if (backToLoginBtn) backToLoginBtn.hidden = true;
        if (subscribeBtn) subscribeBtn.hidden = true;
      }

      function showSubscriptionChoices(message, ok = false){
        setLoginFieldsVisible(false);
        if (subscribeBtn) subscribeBtn.hidden = false;
        if (continueBtn) continueBtn.hidden = false;
        if (textEl) textEl.textContent = uiText('auth.subscriptionPrompt', 'Tu cuenta ya está iniciada. Para acceder al contenido completo, activa la suscripción.');
        setStatus(message, ok);
      }

      function resolveAuthReady(session){
        if (authReadyResolved) return;
        authReadyResolved = true;
        if (typeof window.__resolveSupabaseAuthReady === 'function'){
          window.__resolveSupabaseAuthReady(session || null);
          window.__resolveSupabaseAuthReady = null;
        }
      }

      function openAccessGate(message = '', mode = 'login'){
        document.body.classList.add('access-locked');
        window.track?.('muro_visto', { modo: mode, fichas_vistas: window.track?.fichasVistas?.() });
        setAccessMode(mode);
        setStatus(message);
        const focusTarget = mode === 'reset' ? passwordInput : emailInput;
        setTimeout(() => focusTarget?.focus(), 80);
      }

      function closeAccessGate(){
        document.body.classList.remove('access-locked');
      }

      function setSubscriptionAccess(active){
        const next = !!active;
        if (window.HAS_SUBSCRIPTION_ACCESS === next) return;
        window.HAS_SUBSCRIPTION_ACCESS = next;
        window.dispatchEvent(new CustomEvent('subscription-access-change', {
          detail: { active: next }
        }));
      }

      async function getBillingStatus(session){
        if (LOCAL_DEV_FULL_ACCESS) return { active:true, status:'local_dev' };
        if (!session?.access_token) return { active:false, status:'inactive' };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        let response;
        try{
          response = await fetch(`${API_BASE}/api/billing-status`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            },
            signal: controller.signal
          });
        }finally{
          clearTimeout(timeoutId);
        }

        if (!response.ok) return { active:false, status:'inactive' };
        return response.json();
      }

      function setCheckoutModalLoading(loading){
        if (checkoutNoticeConfirm){
          checkoutNoticeConfirm.disabled = !!loading;
          checkoutNoticeConfirm.textContent = loading
            ? uiText('checkout.openingPayment', 'Abriendo pago…')
            : uiText('checkout.confirm', 'Entendido, ir al pago');
        }
        if (checkoutNoticeCancel) checkoutNoticeCancel.disabled = !!loading;
      }

      function openCheckoutNotice(){
        if (!checkoutNoticeModal || checkoutInFlight) return;
        checkoutNoticeModal.hidden = false;
        setCheckoutModalLoading(false);
        setTimeout(() => checkoutNoticeConfirm?.focus(), 40);
      }

      function closeCheckoutNotice(){
        if (!checkoutNoticeModal || checkoutInFlight) return;
        checkoutNoticeModal.hidden = true;
        setCheckoutModalLoading(false);
      }

      async function requestCheckout(){
        window.track?.('click_suscribir', { origen: 'muro', fichas_vistas: window.track?.fichasVistas?.() });
        const { data } = await supabaseClient.auth.getSession();
        const token = data?.session?.access_token || window.SUPABASE_ACCESS_TOKEN || '';
        if (!token){
          openAccessGate(uiText('auth.signInToSubscribe', 'Inicia sesión o crea una cuenta para suscribirte.'));
          return;
        }

        openCheckoutNotice();
      }

      async function startCheckout(){
        if (checkoutInFlight) return;

        const { data } = await supabaseClient.auth.getSession();
        const token = data?.session?.access_token || window.SUPABASE_ACCESS_TOKEN || '';
        if (!token){
          closeCheckoutNotice();
          openAccessGate(uiText('auth.signInToSubscribe', 'Inicia sesión o crea una cuenta para suscribirte.'));
          return;
        }

        checkoutInFlight = true;
        setCheckoutModalLoading(true);
        setBusy(true);
        setStatus(uiText('checkout.openingStripe', 'Abriendo Stripe…'), true);

        try{
          const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
            method:'POST',
            headers:{
              Authorization:`Bearer ${token}`
            }
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.url){
            throw new Error(payload.error || uiText('checkout.openError', 'No se pudo abrir Stripe Checkout.'));
          }
          window.track?.('checkout_iniciado', {});
          location.href = payload.url;
        }catch(error){
          setStatus(error?.message || uiText('checkout.openError', 'No se pudo abrir Stripe Checkout.'));
        }finally{
          checkoutInFlight = false;
          setCheckoutModalLoading(false);
          setBusy(false);
        }
      }

      async function applySession(session){
        const renderVersion = ++accessRenderVersion;

        if (LOCAL_DEV_FULL_ACCESS){
          window.SUPABASE_ACCESS_TOKEN = session?.access_token || "";
          document.body.classList.toggle('auth-logged-in', !!session);
          setSubscriptionAccess(true);
          closeAccessGate();
          setLoginFieldsVisible(false);
          setStatus(uiText('auth.localFullAccess', 'Modo local: acceso completo para desarrollo.'), true);
          resolveAuthReady(session || null);
          return;
        }

        window.SUPABASE_ACCESS_TOKEN = session?.access_token || "";
        document.body.classList.toggle('auth-logged-in', !!session);

        if (!session){
          GH_MODEL_CACHE.clear();
          clearModelSessionCache();
          setSubscriptionAccess(false);
          closeAccessGate();
          setLoginFieldsVisible(true);
          setStatus('');
          resolveAuthReady(null);
          return;
        }

        showSubscriptionChoices(uiText('auth.checkingSubscription', 'Comprobando suscripción…'), true);
        if (document.body.classList.contains('access-locked')) {
          setStatus(uiText('auth.checkingSubscription', 'Comprobando suscripción…'), true);
        }

        let billing = { active:false };
        try{
          billing = await getBillingStatus(session);
        }catch(error){
          console.error('Billing status error', error);
        }

        if (renderVersion !== accessRenderVersion) return;

        if (billing?.active){
          setSubscriptionAccess(true);
          closeAccessGate();
          setStatus('', true);
          resolveAuthReady(session);
        }else{
          GH_MODEL_CACHE.clear();
          clearModelSessionCache();
          setSubscriptionAccess(false);
          if (document.body.classList.contains('access-locked')) {
            showSubscriptionChoices(uiText('auth.subscriptionRequired', 'Tu cuenta está creada, pero necesitas una suscripción activa para acceder.'));
          }
          resolveAuthReady(session);
        }
      }

      async function refreshSession(){
        const { data, error } = await supabaseClient.auth.getSession();
        if (error){
          console.error('Supabase session error', error);
          setStatus(error.message || uiText('auth.sessionCheckError', 'No se pudo comprobar la sesión.'));
        }
        await applySession(data?.session || null);
        if (hasResetPasswordParam()){
          if (data?.session){
            recoveryLinkInvalid = false;
            openAccessGate('', 'reset');
          }else{
            recoveryLinkInvalid = true;
            openAccessGate(uiText('auth.expiredLink', 'El enlace de recuperación ha caducado o no es válido. Solicita un nuevo enlace.'), 'reset');
          }
        }
      }

      async function signIn(){
        if (!emailInput || !passwordInput) return;
        setBusy(true);
        setStatus(uiText('auth.signingIn', 'Entrando…'), true);
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value
        });
        setBusy(false);
        if (error){
          setStatus(error.message || uiText('auth.signInError', 'No se pudo iniciar sesión.'));
          return;
        }
        await applySession(data?.session || null);
        if (!document.body.classList.contains('access-locked')) setStatus('', true);
      }

      async function signUp(){
        if (!emailInput || !passwordInput) return;
        window.track?.('click_registro', { origen: 'muro' });
        setBusy(true);
        setStatus(uiText('auth.creatingAccount', 'Creando cuenta…'), true);
        const { data, error } = await supabaseClient.auth.signUp({
          email: emailInput.value.trim(),
          password: passwordInput.value
        });
        setBusy(false);
        if (error){
          setStatus(error.message || uiText('auth.createAccountError', 'No se pudo crear la cuenta.'));
          return;
        }
        await applySession(data?.session || null);
        window.track?.('registro_ok', { confirmacion_pendiente: !data?.session });
        if (!data?.session){
          setStatus(uiText('auth.accountCreated', 'Cuenta creada. Revisa tu email para confirmar el acceso.'), true);
        }else if (!document.body.classList.contains('access-locked')){
          setStatus('', true);
        }
      }

      async function sendPasswordRecovery(){
        if (!emailInput) return;
        const email = emailInput.value.trim();
        if (!email){
          setStatus(uiText('auth.enterEmail', 'Introduce tu email.'));
          emailInput.focus();
          return;
        }

        setBusy(true);
        setStatus(uiText('auth.sendingLink', 'Enviando enlace…'), true);

        try{
          const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: passwordResetRedirectUrl()
          });
          if (error) throw error;
          setStatus(uiText('auth.recoverySent', 'Si existe una cuenta asociada a ese email, recibirás un enlace para restablecer la contraseña.'), true);
        }catch(error){
          console.error('Password recovery error', error);
          setStatus(uiText('auth.recoverySent', 'Si existe una cuenta asociada a ese email, recibirás un enlace para restablecer la contraseña.'), true);
        }finally{
          setBusy(false);
        }
      }

      async function saveNewPassword(){
        if (!passwordInput || !passwordRepeatInput) return;
        const nextPassword = passwordInput.value || '';
        const repeatedPassword = passwordRepeatInput.value || '';

        if (!nextPassword || !repeatedPassword){
          setStatus(uiText('auth.completePasswords', 'Completa los dos campos de contraseña.'));
          return;
        }
        if (nextPassword.length < 8){
          setStatus(uiText('auth.passwordMinLength', 'La contraseña debe tener al menos 8 caracteres.'));
          return;
        }
        if (nextPassword !== repeatedPassword){
          setStatus(uiText('auth.passwordMismatch', 'Las contraseñas no coinciden.'));
          return;
        }

        const { data } = await supabaseClient.auth.getSession();
        if (!data?.session){
          recoveryLinkInvalid = true;
          setAccessMode('reset');
          setStatus(uiText('auth.expiredLink', 'El enlace de recuperación ha caducado o no es válido. Solicita un nuevo enlace.'));
          return;
        }

        setBusy(true);
        setStatus(uiText('auth.savingPassword', 'Guardando nueva contraseña…'), true);

        try{
          const { error } = await supabaseClient.auth.updateUser({ password: nextPassword });
          if (error) throw error;

          clearResetPasswordParam();
          recoveryLinkInvalid = false;
          setAccessMode('login');
          setStatus(uiText('auth.passwordUpdated', 'Contraseña actualizada correctamente.'), true);
          setTimeout(() => refreshSession(), 900);
        }catch(error){
          setStatus(error?.message || uiText('auth.passwordUpdateError', 'No se pudo actualizar la contraseña.'));
        }finally{
          setBusy(false);
        }
      }

      async function signOut(){
        setBusy(true);
        const { error } = await supabaseClient.auth.signOut();
        setBusy(false);
        if (error){
          setStatus(error.message || uiText('auth.signOutError', 'No se pudo cerrar sesión.'));
          return;
        }
        await applySession(null);
        setStatus(uiText('auth.signedOut', 'Sesión cerrada.'), true);
      }

      function setUserMenuOpen(open){
        if (!userMenu || !menuBtn) return;
        userMenu.classList.toggle('is-open', !!open);
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      function toggleFullscreenFromMenu(){
        const btnInfoFull = document.getElementById('btnInfoFull');
        if (btnInfoFull){
          btnInfoFull.click();
          return;
        }
        if (typeof setInfoFullscreen === 'function'){
          setInfoFullscreen(!document.body.classList.contains('infoFull'));
        }
      }

      window.addEventListener('supabase:unlock', () => {
        closeAccessGate();
      });

      window.startSubscriptionCheckout = requestCheckout;
      window.openSubscriptionLogin = openAccessGate;

      if (!form || !emailInput || !passwordInput){
        if (typeof window.__resolveSupabaseAuthReady === 'function'){
          window.__resolveSupabaseAuthReady(null);
          window.__resolveSupabaseAuthReady = null;
        }
        return;
      }

      emailInput.addEventListener('input', () => setStatus(''));
      passwordInput.addEventListener('input', () => setStatus(''));
      passwordRepeatInput?.addEventListener('input', () => setStatus(''));

      form.addEventListener('submit', (evt) => {
        evt.preventDefault();
        if (accessMode === 'recover'){
          sendPasswordRecovery();
          return;
        }
        if (accessMode === 'reset'){
          saveNewPassword();
          return;
        }
        signIn();
      });

      signupBtn?.addEventListener('click', signUp);
      forgotPasswordBtn?.addEventListener('click', () => {
        recoveryLinkInvalid = false;
        openAccessGate('', 'recover');
      });
      backToLoginBtn?.addEventListener('click', () => {
        if (recoveryLinkInvalid){
          recoveryLinkInvalid = false;
          openAccessGate('', 'recover');
          return;
        }
        recoveryLinkInvalid = false;
        openAccessGate('', 'login');
      });
      subscribeBtn?.addEventListener('click', requestCheckout);
      checkoutNoticeCancel?.addEventListener('click', closeCheckoutNotice);
      checkoutNoticeConfirm?.addEventListener('click', startCheckout);
      checkoutNoticeModal?.addEventListener('click', (evt) => {
        if (evt.target === checkoutNoticeModal) closeCheckoutNotice();
      });
      continueBtn?.addEventListener('click', () => {
        closeAccessGate();
        setStatus('');
      });
      loginMenuBtn?.addEventListener('click', () => {
        setUserMenuOpen(false);
        openAccessGate();
      });
      menuBtn?.addEventListener('click', (evt) => {
        evt.stopPropagation();
        setUserMenuOpen(!userMenu?.classList.contains('is-open'));
      });
      fullscreenBtn?.addEventListener('click', () => {
        setUserMenuOpen(false);
        toggleFullscreenFromMenu();
      });
      logoutBtn?.addEventListener('click', () => {
        setUserMenuOpen(false);
        signOut();
      });
      document.addEventListener('click', (evt) => {
        if (!userMenu || !userMenu.classList.contains('is-open')) return;
        if (userMenu.contains(evt.target)) return;
        setUserMenuOpen(false);
      });
      window.addEventListener('keydown', (evt) => {
        if (evt.key === 'Escape') closeCheckoutNotice();
        if (evt.key === 'Escape') setUserMenuOpen(false);
      });
      supabaseClient.auth.onAuthStateChange((event, session) => {
        applySession(session);
        if (event === 'PASSWORD_RECOVERY' || hasResetPasswordParam()){
          if (session){
            recoveryLinkInvalid = false;
            openAccessGate('', 'reset');
          }else if (hasResetPasswordParam()){
            recoveryLinkInvalid = true;
            openAccessGate(uiText('auth.expiredLink', 'El enlace de recuperación ha caducado o no es válido. Solicita un nuevo enlace.'), 'reset');
          }
        }
      });
      refreshSession();
    })();

      function escapeHtml(s){
      return String(s ?? '')
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'","&#039;");
    }
    console.log("ESCAPE_HTML_EXISTE", typeof escapeHtml);
    // ================== Índice de fotos de autores (ESCALABLE) ==================
window.AUTHOR_PHOTO_INDEX = null;

console.log('✅ script fotos cargado', location.href);

async function loadAuthorPhotoIndex(){
  const version = encodeURIComponent(__ASSET_VER || ASSET_FALLBACK_VER || Date.now());
  const photoIndexUrls = Array.from(new Set([
    ...dataUrlCandidates('Core/fotos/foto.json').map(url => appendUrlParam(url, 'v', version)),
    ...dataUrlCandidates('Core/fotos.json').map(url => appendUrlParam(url, 'v', version)),
    ...dataUrlCandidates('Core/foto.json').map(url => appendUrlParam(url, 'v', version))
  ]));

  let lastErr = null;

  for (const url of photoIndexUrls){
    try{
    const data = await fetchJson(url, { bust:false });
    const root = (data && typeof data === 'object') ? data : {};

    const authorsRaw = (root.authors && typeof root.authors === 'object') ? root.authors : {};
    const modelsRaw  = (root.models  && typeof root.models  === 'object') ? root.models  : {};

    const authorsNorm = {};
    for (const [k, v] of Object.entries(authorsRaw)){
      if (typeof v === 'string' && v.trim()) authorsNorm[normAuthorKey(k)] = v.trim();
    }

    const modelsNorm = {};
    for (const [k, v] of Object.entries(modelsRaw)){
      const key = String(k).trim();
      if (!key) continue;

      if (Array.isArray(v)){
        const arr = v.map(x => String(x || '').trim()).filter(Boolean);
        if (arr.length) modelsNorm[key] = arr;
        continue;
      }

      if (typeof v === 'string' && v.trim()){
        const str = v.trim();
        // permite "a.jpg|b.jpg" para rotación
        if (str.includes('|')){
          const arr = str.split('|').map(s => s.trim()).filter(Boolean);
          if (arr.length) modelsNorm[key] = arr;
        }else{
          modelsNorm[key] = str;
        }
      }
    }

    window.AUTHOR_PHOTO_INDEX = { authors: authorsNorm, models: modelsNorm };

    console.log('📸 Foto index cargado:', window.AUTHOR_PHOTO_INDEX);
return window.AUTHOR_PHOTO_INDEX;


  }catch(e){
    lastErr = e;
    continue;

  }
    }


  console.warn('No se pudo cargar foto.json', lastErr);
  window.AUTHOR_PHOTO_INDEX = { authors:{}, models:{} };
  return window.AUTHOR_PHOTO_INDEX;
}

function normalizeVidaImageEntry(value){
  if (Array.isArray(value)){
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()){
    const clean = value.trim();
    return clean.includes('|')
      ? clean.split('|').map(item => item.trim()).filter(Boolean)
      : clean;
  }

  return null;
}

function normalizeVidaImageMap(source){
  const direct = {};
  const normalized = {};
  if (!source || typeof source !== 'object') return { direct, normalized };

  for (const [rawKey, rawValue] of Object.entries(source)){
    const key = String(rawKey || '').trim();
    const value = normalizeVidaImageEntry(rawValue);
    if (!key || !value || (Array.isArray(value) && !value.length)) continue;

    direct[key] = value;
    const norm = normAuthorKey(key);
    if (norm) normalized[norm] = value;
  }

  return { direct, normalized };
}

async function loadVidaImageIndex(){
  const version = encodeURIComponent(__ASSET_VER || ASSET_FALLBACK_VER || Date.now());
  const urls = dataUrlCandidates('Core/imagenes/vida/index.json')
    .map(url => appendUrlParam(url, 'v', version));

  let lastErr = null;
  for (const url of urls){
    try{
      const root = await fetchJson(url, { bust:false });
      const basePath = String(root?.basePath || 'Core/imagenes/vida')
        .trim()
        .replace(/^\/+|\/+$/g, '') || 'Core/imagenes/vida';
      const modelMaps = normalizeVidaImageMap(root?.models);
      const authorMaps = normalizeVidaImageMap(root?.authors);

      window.VIDA_IMAGE_INDEX = {
        basePath,
        models: modelMaps.direct,
        modelsNorm: modelMaps.normalized,
        authors: authorMaps.direct,
        authorsNorm: authorMaps.normalized
      };

      console.log('Imagenes vida index cargado:', window.VIDA_IMAGE_INDEX);
      return window.VIDA_IMAGE_INDEX;
    }catch(e){
      lastErr = e;
    }
  }

  console.warn('No se pudo cargar Core/imagenes/vida/index.json', lastErr);
  window.VIDA_IMAGE_INDEX = { basePath:'Core/imagenes/vida', models:{}, modelsNorm:{}, authors:{}, authorsNorm:{} };
  return window.VIDA_IMAGE_INDEX;
}


function normAuthorKey(s){
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')                 // separa acentos
    .replace(/[\u0300-\u036f]/g,'')   // quita acentos
    .replace(/[^a-z0-9 ]+/g,' ')      // ✅ quita puntos, comas, guiones, etc.
    .replace(/\s+/g,' ')             // colapsa espacios
    .trim();
}

function buildAuthorPhotoUrl(file){
  const clean = String(file ?? '').trim();
  if (!clean) return null;
  const normalizedPath = clean.replace(/^\/+/, '').replace(/^data\//i, '').replace(/^Core\/fotos\//i, '');
  if (USE_PRIVATE_PROXY){
    return privateImageUrl(`Core/fotos/${normalizedPath}`);
  }
  const encodedPath = clean.split('/').map(part => encodeURIComponent(part)).join('/');
  const base = IS_LOCAL_DEV && !IS_GHPAGES ? cdnBase() + '/data' : DATA_BASE;
  return `${base}/Core/fotos/${encodedPath}?v=${encodeURIComponent(__ASSET_VER || ASSET_FALLBACK_VER)}`;
}

function authorPhotoRawUrlFromEncodedPath(encodedPath){
  const clean = String(encodedPath || '').trim().replace(/^\/+/, '');
  if (!clean) return '';
  if (USE_PRIVATE_PROXY){
    return privateImageUrl(`Core/fotos/${decodeURIComponent(clean)}`);
  }
  const version = encodeURIComponent(__ASSET_VER || ASSET_FALLBACK_VER);
  return `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/Core/fotos/${clean}?v=${version}`;
}

function authorPhotoVidaUrlsFromEncodedPath(encodedPath){
  const clean = String(encodedPath || '').trim().replace(/^\/+/, '');
  if (!clean) return [];
  if (USE_PRIVATE_PROXY){
    return [privateImageUrl(`Core/imagenes/vida/${decodeURIComponent(clean)}`)];
  }
  const version = encodeURIComponent(__ASSET_VER || ASSET_FALLBACK_VER);
  const base = IS_LOCAL_DEV && !IS_GHPAGES ? cdnBase() + '/data' : DATA_BASE;
  return [
    `${base}/Core/imagenes/vida/${clean}?v=${version}`,
    `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/Core/imagenes/vida/${clean}?v=${version}`
  ];
}

function authorPhotoFallbackUrlsFromUrl(url){
  const raw = String(url || '').trim();
  if (!raw) return [];
  const proxyPath = privateDataPathFromUrl(raw);
  const match = raw.match(/\/data\/Core\/fotos\/([^?#]+)/);
  const encodedPath = proxyPath.replace(/^Core\/fotos\//i, '') || match?.[1] || '';
  const rawUrl = authorPhotoRawUrlFromEncodedPath(encodedPath);
  return Array.from(new Set([
    rawUrl,
    ...authorPhotoVidaUrlsFromEncodedPath(encodedPath)
  ].filter(Boolean).filter(candidate => candidate !== raw)));
}

function buildLifeAuthorImageUrls(file){
  const clean = String(file ?? '').trim();
  if (!clean) return [];
  const normalizedPath = clean.replace(/^\/+/, '').replace(/^data\//i, '');
  const fullPath = /^Core\/imagenes\/vida\//i.test(normalizedPath)
    ? normalizedPath
    : `Core/imagenes/vida/${normalizedPath}`;
  if (USE_PRIVATE_PROXY){
    return [privateImageUrl(fullPath)];
  }
  const encodedPath = fullPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const version = encodeURIComponent(__ASSET_VER || ASSET_FALLBACK_VER);
  const base = IS_LOCAL_DEV && !IS_GHPAGES ? cdnBase() + '/data' : DATA_BASE;
  return [
    `${base}/${encodedPath}?v=${version}`,
    `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/${encodedPath}?v=${version}`
  ];
}

function buildVidaIndexedImageUrls(file, basePath){
  const clean = String(file ?? '').trim();
  if (!clean) return [];
  const cleanBase = String(basePath || 'Core/imagenes/vida').trim().replace(/^\/+|\/+$/g, '') || 'Core/imagenes/vida';
  const normalizedPath = clean.replace(/^\/+/, '').replace(/^data\//i, '');
  const fullPath = /^Core\//i.test(normalizedPath)
    ? normalizedPath
    : `${cleanBase}/${normalizedPath}`;
  return buildLifeAuthorImageUrls(fullPath);
}

function isLifeAuthorImageUrl(url){
  const path = privateDataPathFromUrl(url);
  return String(url || '').includes('/Core/imagenes/vida/') || /^Core\/imagenes\/vida\//i.test(path);
}

function setContextOriginImgSource(img, url, fallbackUrls = []){
  if (!img || !url) return;
  img.classList.toggle('is-life-author-image', isLifeAuthorImageUrl(url));
  img.setAttribute('data-fallback-srcs', fallbackUrls.filter(Boolean).join('|'));
  if (isProxyUrl(url)){
    img.setAttribute('data-private-src', url);
  }else{
    img.removeAttribute('data-private-src');
  }
  setImgSrcWithPrivateProxy(img, url);
}

function getDirectModelPhotoEntry(model, idx){
  const source = idx?.models;
  if (!source || !model || typeof model !== 'object') return null;

  const rawFile = String(model.file || model.archivo || '').trim();
  const fileBase = rawFile
    ? rawFile.split('/').pop().replace(/\.[^.]+$/, '').trim()
    : '';

  const candidates = [
    String(model.id ?? '').trim(),
    String(model.modeloId ?? '').trim(),
    fileBase
  ].filter(Boolean);

  for (const key of candidates){
    if (source[key]) return source[key];
  }

  // foto.json se edita a mano y algunas claves pueden venir con espacios,
  // mayúsculas o pequeñas diferencias de acentos. Normalizamos solo en fallback.
  const normalizedSource = getDirectModelPhotoEntry._normalizedSource;
  const normalizedSourceRef = getDirectModelPhotoEntry._normalizedSourceRef;
  let lookup = normalizedSource;
  if (!lookup || normalizedSourceRef !== source){
    lookup = {};
    for (const [k, v] of Object.entries(source)){
      const trimmed = String(k || '').trim();
      if (trimmed) lookup[trimmed] = v;
      const norm = normAuthorKey(trimmed);
      if (norm) lookup[norm] = v;
    }
    getDirectModelPhotoEntry._normalizedSource = lookup;
    getDirectModelPhotoEntry._normalizedSourceRef = source;
  }

  for (const key of candidates){
    const trimmed = String(key || '').trim();
    const norm = normAuthorKey(trimmed);
    if (lookup[trimmed]) return lookup[trimmed];
    if (norm && lookup[norm]) return lookup[norm];
  }

  return null;
}

function getVidaModelImageEntry(model){
  const idx = window.VIDA_IMAGE_INDEX;
  if (!idx || !model || typeof model !== 'object') return null;

  const rawFile = String(model.file || model.archivo || '').trim();
  const fileBase = rawFile
    ? rawFile.split('/').pop().replace(/\.[^.]+$/, '').trim()
    : '';

  const candidates = [
    String(model.id ?? '').trim(),
    String(model.modeloId ?? '').trim(),
    fileBase
  ].filter(Boolean);

  for (const key of candidates){
    if (idx.models?.[key]) return idx.models[key];
  }

  for (const key of candidates){
    const norm = normAuthorKey(key);
    if (norm && idx.modelsNorm?.[norm]) return idx.modelsNorm[norm];
  }

  const fullAutores = String(model.autores ?? '').trim();
  const primaryAuthor = (fullAutores.split(';')[0] || '').trim();
  const authorCandidates = [
    primaryAuthor,
    primaryAuthor.split(',')[0]?.trim()
  ].filter(Boolean);

  for (const key of authorCandidates){
    if (idx.authors?.[key]) return idx.authors[key];
    const norm = normAuthorKey(key);
    if (norm && idx.authorsNorm?.[norm]) return idx.authorsNorm[norm];
  }

  return null;
}

function getVidaIndexedImageUrls(model){
  const idx = window.VIDA_IMAGE_INDEX;
  const entry = getVidaModelImageEntry(model);
  if (!entry) return [];

  const rawList = Array.isArray(entry)
    ? entry
    : String(entry).split('|').map(s => s.trim()).filter(Boolean);

  return rawList
    .filter(Boolean)
    .flatMap(file => buildVidaIndexedImageUrls(file, idx?.basePath))
    .filter(Boolean);
}

function resolveAuthorPhotoUrl(model){
  if(!model) return null;

  const idx = window.AUTHOR_PHOTO_INDEX || { authors:{}, models:{} };
  const modelEntry = getDirectModelPhotoEntry(model, idx);
  if (modelEntry) {
    const entry = modelEntry;
    if (Array.isArray(entry)){
      const file = entry[0];
      return buildAuthorPhotoUrl(file);
    }
    return buildAuthorPhotoUrl(entry);
  }

  const fullAutores = String(model.autores ?? '').trim();
  const autorFoto = (fullAutores.split(';')[0] || '').trim() || '';
  const autorFotoKey = autorFoto.split(',')[0].trim();

  const authorKey = normAuthorKey(autorFotoKey);
  if (idx.authors?.[authorKey]) {
    return buildAuthorPhotoUrl(idx.authors[authorKey]);
  }

  return null;
}

function getModelPhotoUrls(model){
  if (!model) return [];
  const idx = window.AUTHOR_PHOTO_INDEX || { authors:{}, models:{} };
  const entry = getDirectModelPhotoEntry(model, idx);
  if (!entry) return [];

  const rawList = Array.isArray(entry)
    ? entry
    : String(entry).split('|').map(s => s.trim()).filter(Boolean);

  return rawList
    .filter(Boolean)
    .map(file => buildAuthorPhotoUrl(file))
    .filter(Boolean);
}

function getLifeAuthorImageUrls(model){
  if (!model) return [];
  const urls = getVidaIndexedImageUrls(model);

  const idx = window.AUTHOR_PHOTO_INDEX || { authors:{}, models:{} };
  const entry = getDirectModelPhotoEntry(model, idx);
  const rawList = entry
    ? (Array.isArray(entry) ? entry : String(entry).split('|').map(s => s.trim()).filter(Boolean))
    : [];

  urls.push(...rawList
    .filter(Boolean)
    .flatMap(file => buildLifeAuthorImageUrls(file)));

  const authorUrl = resolveAuthorPhotoUrl(model);
  if (authorUrl) urls.push(authorUrl);

  return Array.from(new Set(urls.filter(Boolean)));
}

const MODEL_HEADER_LIFE_IMAGE_STATUS = new Map();
const MODEL_HEADER_LIFE_IMAGE_PROMISES = new Map();

function probeModelHeaderLifeImage(url, timeoutMs = 12000){
  const key = String(url || '').trim();
  if (!key) return Promise.resolve(false);

  const status = MODEL_HEADER_LIFE_IMAGE_STATUS.get(key);
  if (status === 'ok') return Promise.resolve(true);
  if (status === 'bad') return Promise.resolve(false);
  if (MODEL_HEADER_LIFE_IMAGE_PROMISES.has(key)) return MODEL_HEADER_LIFE_IMAGE_PROMISES.get(key);

  const promise = new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (ok, cacheResult = true) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cacheResult) MODEL_HEADER_LIFE_IMAGE_STATUS.set(key, ok ? 'ok' : 'bad');
      MODEL_HEADER_LIFE_IMAGE_PROMISES.delete(key);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false, false), timeoutMs);
    img.onload = () => finish(Boolean(img.naturalWidth && img.naturalHeight));
    img.onerror = () => finish(false);
    img.decoding = 'async';
    img.src = key;
  });

  MODEL_HEADER_LIFE_IMAGE_PROMISES.set(key, promise);
  return promise;
}

function getValidatedModelHeaderLifeImageUrl(model){
  const indexedUrl = getVidaIndexedImageUrls(model)[0] || '';
  if (indexedUrl) return indexedUrl;

  return getLifeAuthorImageUrls(model)
    .find(url => isLifeAuthorImageUrl(url) && MODEL_HEADER_LIFE_IMAGE_STATUS.get(String(url)) === 'ok') || '';
}

async function ensureModelHeaderLifeImage(model){
  const indexedUrl = getVidaIndexedImageUrls(model)[0] || '';
  if (indexedUrl){
    MODEL_HEADER_LIFE_IMAGE_STATUS.set(String(indexedUrl), 'ok');
    return indexedUrl;
  }

  const urls = getLifeAuthorImageUrls(model).filter(url => isLifeAuthorImageUrl(url));
  for (const url of urls){
    if (await probeModelHeaderLifeImage(url)) return url;
  }
  return '';
}

function getPrimaryAuthorName(value){
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.split(';').map(s => s.trim()).filter(Boolean)[0] || '';
}

function getAuthorInitials(value){
  const primary = getPrimaryAuthorName(value);
  if (!primary) return 'M';
  const clean = primary
    .split(',')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = clean.split(' ').filter(Boolean);
  if (!parts.length) return 'M';
  return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
}

function buildModelCardAvatarHtml(model, photoUrlOverride){
  const authorText = escapeHtml(model?.autores ?? '—');
  const authorInitials = escapeHtml(getAuthorInitials(model?.autores));
  const photoUrl = photoUrlOverride || resolveAuthorPhotoUrl(model);
  return photoUrl
    ? `<div class="mi-avatarFallback" aria-hidden="true">${authorInitials}</div><img data-photo-url="${escapeHtml(photoUrl)}" alt="${authorText}" loading="lazy" decoding="async">`
    : `<div class="mi-avatarFallback" aria-hidden="true">${authorInitials}</div>`;
}

function getModelsListElement(){
  try{
    if (typeof modelsListEl !== 'undefined' && modelsListEl) return modelsListEl;
  }catch(e){}
  return document.getElementById('modelsList');
}

function getGroupingModeValue(){
  try{
    if (typeof groupingMode !== 'undefined') return groupingMode;
  }catch(e){}
  return '';
}

function getCurrentModelIdValue(){
  try{
    if (typeof currentModelId !== 'undefined') return currentModelId;
  }catch(e){}
  return window.__CURRENT_MODEL_ID || '';
}

function setPhotoImgLoading(imgEl, src){
  if (!imgEl) return;
  imgEl.classList.remove('is-loaded');
  imgEl.style.opacity = '';
  if (src) setImgSrcWithPrivateProxy(imgEl, src);
}

function setPhotoImgLoaded(imgEl){
  if (!imgEl) return;
  imgEl.classList.add('is-loaded');
  imgEl.style.opacity = '';
}

function setupModelCardPhotoRetry(imgEl, baseUrl){
  if (!imgEl || !baseUrl) return;
  const candidates = Array.from(new Set([baseUrl, ...authorPhotoFallbackUrlsFromUrl(baseUrl)].filter(Boolean)));
  let candidateIndex = 0;
  let done = false;
  setPhotoImgLoading(imgEl);

  imgEl.onload = () => {
    done = true;
    setPhotoImgLoaded(imgEl);
  };

  imgEl.onerror = () => {
    if (done) return;
    candidateIndex += 1;
    if (candidateIndex < candidates.length){
      setPhotoImgLoading(imgEl, candidates[candidateIndex]);
      return;
    }
    imgEl.remove();
  };

  if (imgEl.complete && imgEl.naturalWidth){
    done = true;
    setPhotoImgLoaded(imgEl);
    return;
  }

  setPhotoImgLoading(imgEl, candidates[0] || baseUrl);
}

function hydrateModelCardAvatars(){
  const modelsListEl = getModelsListElement();
  if (!modelsListEl || getGroupingModeValue() === 'network') return;

  const idx = window.AUTHOR_PHOTO_INDEX;
  const hasPhotoData = !!(
    idx &&
    ((idx.authors && Object.keys(idx.authors).length) ||
     (idx.models && Object.keys(idx.models).length))
  );
  if (!hasPhotoData) return;

  const allModels = (Array.isArray(window.MODELS_ALL) && window.MODELS_ALL.length)
    ? window.MODELS_ALL
    : (Array.isArray(MODELS) ? MODELS : []);

  modelsListEl.querySelectorAll('.mi-item[data-id]').forEach((item) => {
    const rawId = item.getAttribute('data-id') || '';
    const modelId = decodeURIComponent(rawId);
    const model = allModels.find((entry) => String(entry?.id ?? '').trim() === String(modelId).trim());
    if (!model) return;

    const photoUrl = resolveAuthorPhotoUrl(model);
    if (!photoUrl) return;

    const avatarEl = item.querySelector('.mi-avatar');
    if (!avatarEl) return;

    const currentImg = avatarEl.querySelector('img[data-photo-url]');
    if (currentImg && currentImg.getAttribute('data-photo-url') === photoUrl) return;

    avatarEl.innerHTML = buildModelCardAvatarHtml(model, photoUrl);
    const nextImg = avatarEl.querySelector('img[data-photo-url]');
    if (nextImg) setupModelCardPhotoRetry(nextImg, photoUrl);
  });
}

function initVisibleModelCardPhotoRetries(){
  const modelsListEl = getModelsListElement();
  if (!modelsListEl || getGroupingModeValue() === 'network') return;
  modelsListEl.querySelectorAll('.mi-avatar img[data-photo-url]').forEach((imgEl) => {
    if (imgEl.dataset.retryBound === '1') return;
    imgEl.dataset.retryBound = '1';
    const baseUrl = imgEl.getAttribute('data-photo-url') || imgEl.getAttribute('src') || '';
    if (baseUrl) setupModelCardPhotoRetry(imgEl, baseUrl);
  });
}

function ensureAuthorPhotoIndexPromise(){
  if (!ASSET_VERSION_PROMISE || ASSET_VERSION_PROMISE === Promise.resolve()){
    ASSET_VERSION_PROMISE = loadAssetVersion()
      .catch(() => {})
      .finally(() => {
        DATA_BASE = resolveDataBase();
      });
  }

  if (!AUTHOR_PHOTO_PROMISE){
    const doLoad = () => loadAuthorPhotoIndex().catch(() => ({ authors:{}, models:{} }));
    AUTHOR_PHOTO_PROMISE = ASSET_VERSION_PROMISE
      .then(() => doLoad())
      .catch(() => ({ authors:{}, models:{} }))
      .then((idx) => {
        // Reintento tardío si llega vacío (móvil / redes lentas)
        if (!idx || (!Object.keys(idx.authors || {}).length && !Object.keys(idx.models || {}).length)){
          setTimeout(() => { doLoad(); }, 4000);
        }
        return idx;
      });
  }

  return AUTHOR_PHOTO_PROMISE;
}

function ensureVidaImageIndexPromise(){
  if (!ASSET_VERSION_PROMISE || ASSET_VERSION_PROMISE === Promise.resolve()){
    ASSET_VERSION_PROMISE = loadAssetVersion()
      .catch(() => {})
      .finally(() => {
        DATA_BASE = resolveDataBase();
      });
  }

  if (!VIDA_IMAGE_PROMISE){
    VIDA_IMAGE_PROMISE = ASSET_VERSION_PROMISE
      .then(() => loadVidaImageIndex())
      .catch(() => ({ basePath:'Core/imagenes/vida', models:{}, modelsNorm:{}, authors:{}, authorsNorm:{} }));
  }

  return VIDA_IMAGE_PROMISE;
}

function appendUrlParam(url, key, value){
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function replaceAuthorPhotoWithPlaceholder(imgEl){
  if (!imgEl || !imgEl.parentElement) return;
  const ph = document.createElement('div');
  ph.className = 'mp-author-photo';
  ph.setAttribute('aria-hidden', 'true');
  imgEl.replaceWith(ph);
}

function setupAuthorPhotoRetry(imgEl, baseUrl, modelId){
  if (!imgEl || !baseUrl) return;

  const modelToken = String(modelId ?? '').trim();
  const candidates = Array.from(new Set([baseUrl, ...authorPhotoFallbackUrlsFromUrl(baseUrl)].filter(Boolean)));
  let candidateIndex = 0;
  let done = false;
  setPhotoImgLoading(imgEl);

  imgEl.onload = () => {
    done = true;
    setPhotoImgLoaded(imgEl);
  };

  imgEl.onerror = () => {
    if (done) return;
    if (modelToken){
      const current = String(getCurrentModelIdValue() ?? '').trim();
      if (current && current !== modelToken) return;
    }
    candidateIndex += 1;
    if (candidateIndex < candidates.length){
      setPhotoImgLoading(imgEl, candidates[candidateIndex]);
      return;
    }
    replaceAuthorPhotoWithPlaceholder(imgEl);
  };

  if (imgEl.complete && imgEl.naturalWidth){
    done = true;
    setPhotoImgLoaded(imgEl);
    return;
  }

  setPhotoImgLoading(imgEl, candidates[0] || baseUrl);
}

function normalizeIsoText(s){
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function normalizeIsoPath(s){
  return String(s ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .toLowerCase();
}

function buildIsoEntryKey({ archivo = '', tipo = '', nombre = '' } = {}){
  return [
    normalizeIsoPath(archivo),
    normalizeIsoText(tipo),
    normalizeIsoText(nombre)
  ].join('|');
}

function buildIsoFallbackKey({ modelo = '', grupo = '', tipo = '', nombre = '' } = {}){
  return [
    normalizeIsoText(modelo),
    normalizeIsoText(grupo),
    normalizeIsoText(tipo),
    normalizeIsoText(nombre)
  ].join('|');
}

function buildIsoNameKey({ tipo = '', nombre = '' } = {}){
  return [
    normalizeIsoText(tipo),
    normalizeIsoText(nombre)
  ].join('|');
}

function normalizeTechniqueLookupValue(value){
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function typeSectionLabel(key){
  const labels = {
    'epistemologia-base': ['type.epistemologyBase.plural', 'Epistemologías base'],
    'derivacion-epistemologica': ['type.epistemologicalDerivation.plural', 'Derivaciones epistemológicas'],
    'metateoria-ciencia': ['type.metatheory.plural', 'Metateoría de la ciencia'],
    modelo: ['common.model.one', 'Modelo'],
    marco: ['type.framework.plural', 'Marcos teóricos'],
    programa: ['type.program.plural', 'Programas o protocolos'],
    constructo: ['type.construct.plural', 'Constructos teóricos'],
    'constructo-cultural': ['type.culturalConstruct.plural', 'Constructos culturales']
  };
  const entry = labels[key];
  return entry ? uiText(entry[0], entry[1]) : key;
}

const TYPE_SECTION_ORDER = [
  'epistemologia-base',
  'derivacion-epistemologica',
  'metateoria-ciencia',
  'modelo',
  'marco',
  'programa',
  'constructo',
  'constructo-cultural'
];

function getModelTypeInfo(model){
  const candidates = [
    model?.tipoTarjeta,
    model?.tipoModelo,
    model?.tipoDeModelo,
    model?.tipoFicha,
    model?.tipo,
    model?.type,
    model?.kind,
    model?.categoriaTipo
  ];

  for (const rawValue of candidates){
    const raw = String(rawValue ?? '').trim();
    if (!raw) continue;
    const normalized = normalizeIsoText(raw);

    if (
      normalized === 'epistemologia base'
    ){
      return { key:'epistemologia-base', label:uiText('type.epistemologyBase.one', 'Epistemología base') };
    }

    if (
      normalized === 'derivacion epistemologica' ||
      normalized === 'derivacion epistemologia'
    ){
      return { key:'derivacion-epistemologica', label:uiText('type.epistemologicalDerivation.one', 'Derivación epistemológica') };
    }

    if (
      normalized === 'metateoria ciencia' ||
      normalized === 'metateoria de la ciencia'
    ){
      return { key:'metateoria-ciencia', label:uiText('type.metatheory.one', 'Metateoría de la ciencia') };
    }

    if (
      normalized === 'constructo cultural' ||
      normalized.includes('constructo cultural')
    ){
      return { key:'constructo-cultural', label:uiText('type.culturalConstruct.one', 'Constructo cultural') };
    }

    if (
      normalized === 'constructo' ||
      normalized === 'constructos' ||
      normalized.includes('constructo')
    ){
      return { key:'constructo', label:uiText('type.construct.one', 'Constructo') };
    }

    if (
      normalized === 'programa' ||
      normalized === 'programas' ||
      normalized === 'protocolo' ||
      normalized === 'protocolos' ||
      normalized.includes('programa terapeutico') ||
      normalized.includes('protocolo terapeutico') ||
      normalized.includes('programa') ||
      normalized.includes('protocolo')
    ){
      return { key:'programa', label:uiText('type.program.one', 'Programa') };
    }

    if (
      normalized === 'corriente' ||
      normalized.includes('corriente terapeutica') ||
      normalized.includes('corriente psicoterapeutica') ||
      normalized === 'marco' ||
      normalized === 'marcos' ||
      normalized.includes('marco teorico') ||
      normalized.includes('framework')
    ){
      return { key:'marco', label:uiText('type.framework.one', 'Marco') };
    }

    if (
      normalized === 'modelo' ||
      normalized === 'modelos' ||
      normalized.includes('modelo terapeutico') ||
      normalized.includes('model')
    ){
      return { key:'modelo', label:uiText('common.model.one', 'Modelo') };
    }
  }

  if (model?.isMarco){
    return { key:'marco', label:uiText('type.framework.one', 'Marco') };
  }

  return { key:'modelo', label:uiText('common.model.one', 'Modelo') };
}

function isMarcoModel(model){
  return getModelTypeInfo(model).key === 'marco';
}

function getModelTypeCardLabel(model){
  const key = getModelTypeInfo(model).key;
  if (key === 'epistemologia-base') return 'EPI';
  if (key === 'derivacion-epistemologica') return 'DER';
  if (key === 'metateoria-ciencia') return 'MET';
  if (key === 'constructo-cultural') return 'CUL';
  if (key === 'constructo') return 'CON';
  if (key === 'programa') return 'PRO';
  if (key === 'marco') return 'MAR';
  return 'MOD';
}

function buildIsoModelTechniqueKey(modelId = '', tecnicaId = ''){
  return [
    normalizeTechniqueLookupValue(modelId),
    normalizeTechniqueLookupValue(tecnicaId)
  ].join('|');
}

function emptyIsomorphismIndex(){
  return {
    rawIsomorfismos:[],
    byIsomorfismoId:new Map(),
    byModeloId:new Map(),
    byTecnicaId:new Map(),
    byModelTechniqueKey:new Map(),
    byModelId:new Map(),
    byEntryKey:new Map(),
    byFallbackKey:new Map(),
    byNameKey:new Map()
  };
}

function buildIsomorphismIndexFromList(raw){
  const list = Array.isArray(raw) ? raw : [];
  const byEntryKey = new Map();
  const byFallbackKey = new Map();
  const byNameKey = new Map();

  list.forEach((group) => {
    const entries = Array.isArray(group?.entradas) ? group.entradas.filter(Boolean) : [];
    entries.forEach((entry) => {
      const payload = {
        operacionAteorica: String(group?.operacion_ateorica || '').trim(),
        definicion: String(group?.definicion || '').trim(),
        entries,
        entry
      };

      const entryKey = buildIsoEntryKey(entry);
      if (!byEntryKey.has(entryKey)) byEntryKey.set(entryKey, payload);

      const fallbackKey = buildIsoFallbackKey(entry);
      if (!byFallbackKey.has(fallbackKey)) byFallbackKey.set(fallbackKey, payload);

      const nameKey = buildIsoNameKey(entry);
      const bucket = byNameKey.get(nameKey) || [];
      bucket.push(payload);
      byNameKey.set(nameKey, bucket);
    });
  });

  return { byEntryKey, byFallbackKey, byNameKey };
}

function buildIsomorphismIndexFromRepoLinks(raw){
  const safe = (raw && typeof raw === 'object') ? raw : {};
  const groups = Array.isArray(safe.entries) ? safe.entries.filter(Boolean) : [];
  if (!groups.length) return emptyIsomorphismIndex();

  primeIsomorphismModelMetaCache();

  const resolveModelMeta = (modelId = '') => getCachedIsomorphismModelMeta(modelId) || null;
  const normalizeRepoLink = (link) => {
    const modeloId = String(link?.modeloId || '').trim();
    const meta = resolveModelMeta(modeloId);
    return {
      modeloId,
      modeloLabel: String(meta?.label || link?.modeloLabel || modeloId).trim(),
      grupo: String(meta?.grupo || link?.grupo || '').trim(),
      tecnicaId: String(link?.tecnicaId || '').trim(),
      tecnicaLabel: String(link?.tecnicaNombre || link?.tecnicaLabel || link?.tecnicaId || '').trim(),
      tecnicaTipo: String(link?.tipo || link?.tecnicaTipo || '').trim(),
      estado: String(link?.estado || '').trim(),
      nota: String(link?.nota || '').trim(),
      sourceFile: 'indices/isomorfismos/isomorfismos-links-modeloId-tecnicaId-repo.json'
    };
  };
  const buildTechniqueIsoRow = (iso, entry, entries) => ({
    isomorfismoId: String(iso?.id || '').trim(),
    isomorfismoLabel: String(iso?.label || iso?.id || '').trim(),
    isomorfismoDefinicion: String(iso?.definicion || '').trim(),
    isomorfismoCategoria: String(iso?.categoria || '').trim(),
    isomorfismoEntries: (Array.isArray(entries) ? entries : [])
      .filter((item) => String(item?.estado || '').trim().toLowerCase() === 'ok')
      .map((item) => ({ ...item })),
    tecnicaId: String(entry?.tecnicaId || '').trim(),
    tecnicaLabel: String(entry?.tecnicaLabel || '').trim(),
    tecnicaTipo: String(entry?.tecnicaTipo || '').trim(),
    modeloId: String(entry?.modeloId || '').trim(),
    modeloLabel: String(entry?.modeloLabel || '').trim(),
    grupo: String(entry?.grupo || '').trim(),
    nota: String(entry?.nota || '').trim(),
    sourceFile: String(entry?.sourceFile || '').trim()
  });
  const sortTechniqueIsoRows = (rows) => rows.slice().sort((a, b) => {
    const byTechnique = String(a?.tecnicaId || '').localeCompare(String(b?.tecnicaId || ''), MODELOS_LOCALE);
    if (byTechnique !== 0) return byTechnique;
    return String(a?.isomorfismoLabel || '').localeCompare(String(b?.isomorfismoLabel || ''), MODELOS_LOCALE);
  });

  const rawIsomorfismos = groups.map((entry) => {
    const links = Array.isArray(entry?.links) ? entry.links.filter(Boolean).map(normalizeRepoLink) : [];
    return {
      id: String(entry?.id || '').trim(),
      label: String(entry?.label || entry?.id || '').trim(),
      definicion: String(entry?.definicion || '').trim(),
      categoria: String(entry?.categoria || '').trim(),
      subcategoria: String(entry?.subcategoria || '').trim(),
      entries: links
    };
  }).filter((iso) => String(iso?.id || '').trim());

  const byIsomorfismoId = new Map();
  const byModeloId = new Map();
  const byTecnicaId = new Map();
  const byModelTechniqueKey = new Map();
  const byModelId = new Map();
  const seen = new Set();

  rawIsomorfismos.forEach((iso) => {
    const isoId = String(iso?.id || '').trim();
    if (isoId) byIsomorfismoId.set(isoId, iso);

    const entries = Array.isArray(iso?.entries) ? iso.entries : [];
    entries.forEach((entry) => {
      const modelId = String(entry?.modeloId || '').trim();
      const tecnicaId = String(entry?.tecnicaId || '').trim();
      const estado = String(entry?.estado || '').trim().toLowerCase();
      if (!isoId || !modelId || !tecnicaId || estado !== 'ok') return;

      const dedupeKey = `${modelId}|${tecnicaId}|${isoId}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      const row = buildTechniqueIsoRow(iso, entry, entries);
      const normalizedModelId = normalizeTechniqueLookupValue(modelId);
      const normalizedTecnicaId = normalizeTechniqueLookupValue(tecnicaId);

      const techniqueKey = buildIsoModelTechniqueKey(modelId, tecnicaId);
      const techniqueBucket = byModelTechniqueKey.get(techniqueKey) || [];
      techniqueBucket.push(row);
      byModelTechniqueKey.set(techniqueKey, techniqueBucket);

      const modelBucket = byModelId.get(normalizedModelId) || [];
      modelBucket.push(row);
      byModelId.set(normalizedModelId, modelBucket);

      const legacyModelBucket = byModeloId.get(normalizedModelId) || [];
      legacyModelBucket.push(row);
      byModeloId.set(normalizedModelId, legacyModelBucket);

      const tecnicaBucket = byTecnicaId.get(normalizedTecnicaId) || [];
      tecnicaBucket.push(row);
      byTecnicaId.set(normalizedTecnicaId, tecnicaBucket);
    });
  });

  byModelTechniqueKey.forEach((rows, key) => {
    byModelTechniqueKey.set(key, sortTechniqueIsoRows(rows));
  });
  byModelId.forEach((rows, key) => {
    byModelId.set(key, sortTechniqueIsoRows(rows));
  });
  byModeloId.forEach((rows, key) => {
    byModeloId.set(key, sortTechniqueIsoRows(rows));
  });
  byTecnicaId.forEach((rows, key) => {
    byTecnicaId.set(key, sortTechniqueIsoRows(rows));
  });

  return {
    rawIsomorfismos,
    byIsomorfismoId,
    byModeloId,
    byTecnicaId,
    byModelTechniqueKey,
    byModelId,
    byEntryKey:new Map(),
    byFallbackKey:new Map(),
    byNameKey:new Map()
  };
}

function buildIsomorphismIndexFromLookup(raw){
  const safe = (raw && typeof raw === 'object') ? raw : {};

  const buildTechniqueIsoRow = (iso, entry, entries) => ({
    isomorfismoId: String(iso?.id || '').trim(),
    isomorfismoLabel: String(iso?.label || iso?.id || '').trim(),
    isomorfismoDefinicion: String(iso?.definicion || '').trim(),
    isomorfismoCategoria: String(iso?.categoria || '').trim(),
    isomorfismoEntries: (Array.isArray(entries) ? entries : [])
      .filter((item) => String(item?.estado || '').trim().toLowerCase() === 'ok')
      .map((item) => ({
        modeloId: String(item?.modeloId || '').trim(),
        modeloLabel: String(item?.modeloLabel || '').trim(),
        grupo: String(item?.grupo || '').trim(),
        tecnicaId: String(item?.tecnicaId || '').trim(),
        tecnicaLabel: String(item?.tecnicaLabel || '').trim(),
        tecnicaTipo: String(item?.tecnicaTipo || '').trim(),
        estado: String(item?.estado || '').trim(),
        nota: String(item?.nota || '').trim(),
        sourceFile: String(item?.sourceFile || '').trim()
      })),
    tecnicaId: String(entry?.tecnicaId || '').trim(),
    tecnicaLabel: String(entry?.tecnicaLabel || '').trim(),
    tecnicaTipo: String(entry?.tecnicaTipo || '').trim(),
    modeloId: String(entry?.modeloId || '').trim(),
    modeloLabel: String(entry?.modeloLabel || '').trim(),
    grupo: String(entry?.grupo || '').trim(),
    nota: String(entry?.nota || '').trim(),
    sourceFile: String(entry?.sourceFile || '').trim()
  });

  const sortTechniqueIsoRows = (rows) => rows.slice().sort((a, b) => {
    const byTechnique = String(a?.tecnicaId || '').localeCompare(String(b?.tecnicaId || ''), MODELOS_LOCALE);
    if (byTechnique !== 0) return byTechnique;
    return String(a?.isomorfismoLabel || '').localeCompare(String(b?.isomorfismoLabel || ''), MODELOS_LOCALE);
  });

  const rawIsomorfismos = Array.isArray(safe.isomorfismos) ? safe.isomorfismos.filter(Boolean) : [];
  if (Array.isArray(safe.isomorfismos)){
    const byIsomorfismoId = new Map();
    const byModeloId = new Map(
      Object.entries(safe.byModeloId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
    );
    const byTecnicaId = new Map(
      Object.entries(safe.byTecnicaId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
    );
    const byModelTechniqueKey = new Map();
    const byModelId = new Map();
    const seen = new Set();

    rawIsomorfismos.forEach((iso) => {
      const isoId = String(iso?.id || '').trim();
      if (isoId) byIsomorfismoId.set(isoId, iso);
      const isoLabel = String(iso?.label || '').trim();
      const entries = Array.isArray(iso?.entries) ? iso.entries : [];

      entries.forEach((entry) => {
        const modelId = String(entry?.modeloId || '').trim();
        const tecnicaId = String(entry?.tecnicaId || '').trim();
        const estado = String(entry?.estado || '').trim().toLowerCase();
        if (!isoId || !modelId || !tecnicaId || estado !== 'ok') return;

        const dedupeKey = `${modelId}|${tecnicaId}|${isoId}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        const row = buildTechniqueIsoRow(iso, entry, entries);

        const techniqueKey = buildIsoModelTechniqueKey(modelId, tecnicaId);
        const techniqueBucket = byModelTechniqueKey.get(techniqueKey) || [];
        techniqueBucket.push(row);
        byModelTechniqueKey.set(techniqueKey, techniqueBucket);

        const modelBucket = byModelId.get(modelId) || [];
        modelBucket.push(row);
        byModelId.set(modelId, modelBucket);
      });
    });

    byModelTechniqueKey.forEach((rows, key) => {
      byModelTechniqueKey.set(key, sortTechniqueIsoRows(rows));
    });
    byModelId.forEach((rows, key) => {
      byModelId.set(key, sortTechniqueIsoRows(rows));
    });

    return {
      rawIsomorfismos,
      byIsomorfismoId,
      byModeloId,
      byTecnicaId,
      byModelTechniqueKey,
      byModelId,
      byEntryKey:new Map(),
      byFallbackKey:new Map(),
      byNameKey:new Map()
    };
  }

  if (Array.isArray(safe.records) && Array.isArray(safe.groups)){
    const byEntryKey = new Map();
    const byFallbackKey = new Map();
    const byNameKey = new Map();

    safe.records.forEach((record) => {
      const group = safe.groups?.[Number(record?.groupIndex)] || {};
      const entries = Array.isArray(group?.entries) ? group.entries : [];
      const entry = entries?.[Number(record?.sourceIndex)] || record?.source || {};
      const payload = {
        operacionAteorica: String(group?.operacionAteorica || '').trim(),
        definicion: String(group?.definicion || '').trim(),
        entries,
        entry
      };

      const entryKey = String(record?.entryKey || '').trim();
      if (entryKey && !byEntryKey.has(entryKey)) byEntryKey.set(entryKey, payload);

      const fallbackKey = String(record?.fallbackKey || '').trim();
      if (fallbackKey && !byFallbackKey.has(fallbackKey)) byFallbackKey.set(fallbackKey, payload);

      const nameKey = String(record?.nameKey || '').trim();
      if (nameKey){
        const bucket = byNameKey.get(nameKey) || [];
        bucket.push(payload);
        byNameKey.set(nameKey, bucket);
      }
    });

    return {
      rawIsomorfismos:[],
      byIsomorfismoId:new Map(),
      byModeloId:new Map(),
      byTecnicaId:new Map(),
      byModelTechniqueKey:new Map(),
      byModelId:new Map(),
      byEntryKey,
      byFallbackKey,
      byNameKey
    };
  }

  if (safe.byModelTechniqueKey || safe.byModelId || safe.byModeloId || safe.byTecnicaId || safe.byIsomorfismoId){
    return {
      rawIsomorfismos,
      byIsomorfismoId:new Map(Object.entries(safe.byIsomorfismoId || {})),
      byModeloId:new Map(
        Object.entries(safe.byModeloId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
      ),
      byTecnicaId:new Map(
        Object.entries(safe.byTecnicaId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
      ),
      byModelTechniqueKey:new Map(
        Object.entries(safe.byModelTechniqueKey || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
      ),
      byModelId:new Map(
        Object.entries(safe.byModelId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
      ),
      byEntryKey:new Map(Object.entries(safe.byEntryKey || {})),
      byFallbackKey:new Map(Object.entries(safe.byFallbackKey || {})),
      byNameKey:new Map(
        Object.entries(safe.byNameKey || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
      )
    };
  }

  const byEntryKey = new Map(Object.entries(safe.byEntryKey || {}));
  const byFallbackKey = new Map(Object.entries(safe.byFallbackKey || {}));
  const byNameKey = new Map(
    Object.entries(safe.byNameKey || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
  );
  return {
    rawIsomorfismos,
    byIsomorfismoId:new Map(Object.entries(safe.byIsomorfismoId || {})),
    byModeloId:new Map(
      Object.entries(safe.byModeloId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
    ),
    byTecnicaId:new Map(
      Object.entries(safe.byTecnicaId || {}).map(([key, arr]) => [key, Array.isArray(arr) ? arr : []])
    ),
    byModelTechniqueKey:new Map(),
    byModelId:new Map(),
    byEntryKey,
    byFallbackKey,
    byNameKey
  };
}
async function fetchJson(url, options = {}){
  let finalUrl = String(url || '').trim();

  if (finalUrl && options && options.bust){
    const bustValue = String(window.__ASSET_VER || Date.now()).trim();

    try{
      const u = new URL(finalUrl, location.href);
      u.searchParams.set('_v', bustValue);
      finalUrl = u.href;
    }catch(err){
      const joiner = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${joiner}_v=${encodeURIComponent(bustValue)}`;
    }
  }

  const fetchOptions = {};

  if (isProxyUrl(finalUrl)){
    fetchOptions.headers = {
      Accept: 'application/json'
    };
  }

  const r = await privateProxyFetch(finalUrl, fetchOptions);

  if(!r.ok){
    throw new Error("HTTP " + r.status + " " + finalUrl);
  }

  return await r.json();
}
function buildIsomorphismUrlCandidates(relPath){

  const clean = String(relPath || '').replace(/^\/+/, '').replace(/^data\//, '');

  if (USE_PRIVATE_PROXY){
    return [proxyDataUrl(clean)];
  }

  const rawGithub = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/${clean}`;

  const rootLike = [
    gh(clean),
    `${cdnBase()}/data/${clean}`,
    rawGithub
  ];

  return [...new Set(rootLike)];

}

function buildIsomorphismRepoUrlCandidates(relPath){

  const clean = String(relPath || '').replace(/^\/+/, '').replace(/^data\//, '');

  if (USE_PRIVATE_PROXY){
    return [proxyDataUrl(clean)];
  }

  const rawGithub = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${clean}`;

  const rootLike = [
    `${location.origin}${resolveRepoBasePath()}/${clean}`.replace(/([^:]\/)\/+/g, '$1'),
    `${cdnBase()}/${clean}`,
    rawGithub
  ];

  return [...new Set(rootLike)];

}

async function loadIsomorphismIndex(){
  if (!ENABLE_ISOMORPHISMS){
    const empty = emptyIsomorphismIndex();
    window.ISOMORPHISM_INDEX = empty;
    return empty;
  }
  try{
    const repoLinkUrls = buildIsomorphismRepoUrlCandidates('indices/isomorfismos/isomorfismos-links-modeloId-tecnicaId-repo.json');

    for (const url of repoLinkUrls){
      let rawRepoLinks = null;
      try{
        rawRepoLinks = await fetchJson(url, { bust:true });
      }catch(err){
        continue;
      }
      const looksLikeRepoLinks = !!(
        rawRepoLinks &&
        typeof rawRepoLinks === 'object' &&
        !Array.isArray(rawRepoLinks) &&
        Array.isArray(rawRepoLinks.entries)
      );
      if (!looksLikeRepoLinks) continue;

      const repoLinkIndex = buildIsomorphismIndexFromRepoLinks(rawRepoLinks);
      if (!indexHasUsableIsomorphismData(repoLinkIndex)) continue;
      window.ISOMORPHISM_INDEX = repoLinkIndex;
      return repoLinkIndex;
    }

    const lookupUrls = buildIsomorphismUrlCandidates('indices/isomorfismos/iso_lookup.json');

    for (const url of lookupUrls){
      let rawLookup = null;
      try{
        rawLookup = await fetchJson(url, { bust:true });
      }catch(err){
        continue;
      }
      const looksLikeLookup = !!(
        rawLookup &&
        typeof rawLookup === 'object' &&
        !Array.isArray(rawLookup) &&
        (
          Array.isArray(rawLookup.isomorfismos) ||
          rawLookup.byIsomorfismoId ||
          rawLookup.byModeloId ||
          rawLookup.byTecnicaId ||
          rawLookup.byModelId ||
          rawLookup.byModelTechniqueKey ||
          rawLookup.byEntryKey ||
          rawLookup.byFallbackKey ||
          rawLookup.byNameKey
        )
      );
      if (!looksLikeLookup) continue;

      const lookupIndex = buildIsomorphismIndexFromLookup(rawLookup);
      if (!indexHasUsableIsomorphismData(lookupIndex)) continue;
      window.ISOMORPHISM_INDEX = lookupIndex;
      return lookupIndex;
    }

    const isoUrls = buildIsomorphismUrlCandidates('indices/isomorfismos/iso_lista.json');
    let raw = null;
    for (const url of isoUrls){
      try{
        raw = await fetchJson(url, { bust:true });
      }catch(err){
        continue;
      }
      if (raw) break;
    }
    const index = buildIsomorphismIndexFromList(raw);
    if (!indexHasUsableIsomorphismData(index)){
      throw new Error('Índice de isomorfismos vacío o no utilizable');
    }
    window.ISOMORPHISM_INDEX = index;
    return index;
  }catch(e){
    console.warn('No se pudo cargar el indice de isomorfismos', e);
    const empty = emptyIsomorphismIndex();
    window.ISOMORPHISM_INDEX = empty;
    return empty;
  }
}

function getIsomorphismMatch(modelMeta, itemMeta){
  if (!ENABLE_ISOMORPHISMS) return null;
  const idx = window.ISOMORPHISM_INDEX;
  if (!idx) return null;

  const entryKey = buildIsoEntryKey({
    archivo: modelMeta?.file || modelMeta?.archivo || '',
    tipo: itemMeta?.tipo || '',
    nombre: itemMeta?.nombre || ''
  });
  const hit = idx.byEntryKey?.get(entryKey);
  if (hit) return hit;

  const fallbackKey = buildIsoFallbackKey({
    modelo: modelMeta?.label || modelMeta?.modelo || '',
    grupo: modelMeta?.grupo || '',
    tipo: itemMeta?.tipo || '',
    nombre: itemMeta?.nombre || ''
  });
  const fallbackHit = idx.byFallbackKey?.get(fallbackKey);
  if (fallbackHit) return fallbackHit;

  const nameKey = buildIsoNameKey({
    tipo: itemMeta?.tipo || '',
    nombre: itemMeta?.nombre || ''
  });
  const nameHits = Array.isArray(idx.byNameKey?.get(nameKey)) ? idx.byNameKey.get(nameKey) : [];
  if (!nameHits.length) return null;
  if (nameHits.length === 1) return nameHits[0];

  const currentFile = normalizeIsoPath(modelMeta?.file || modelMeta?.archivo || '');
  const currentModel = normalizeIsoText(modelMeta?.label || modelMeta?.modelo || '');
  const currentGroup = normalizeIsoText(modelMeta?.grupo || '');

  return nameHits.find((payload) => {
    const entry = payload?.entry || {};
    const sameFile = currentFile && normalizeIsoPath(entry?.archivo || '') === currentFile;
    const sameModel = currentModel && normalizeIsoText(entry?.modelo || '') === currentModel;
    const sameGroup = currentGroup && normalizeIsoText(entry?.grupo || '') === currentGroup;
    return sameFile || (sameModel && sameGroup) || sameModel;
  }) || nameHits[0];
}

function getTechniqueIsomorphisms(modelMeta, itemMeta){
  if (!ENABLE_ISOMORPHISMS) return [];
  try{
    const idx = window.ISOMORPHISM_INDEX;
    if (!idx) return [];

    const modelId = String(modelMeta?.id || '').trim();
    const tecnicaId = String(itemMeta?.codigo || '').trim();
    const normalizedModelId = normalizeTechniqueLookupValue(modelId);
    const normalizedTecnicaId = normalizeTechniqueLookupValue(tecnicaId);
    const normalizedItemName = normalizeIsoText(itemMeta?.nombre || '');
    const normalizedItemType = normalizeIsoText(itemMeta?.tipo || '');
    if (!normalizedModelId) return [];

    const lookupKey = buildIsoModelTechniqueKey(modelId, tecnicaId);
    const source = idx.byModelTechniqueKey;
    const isomorfismos = Array.isArray(idx.rawIsomorfismos) ? idx.rawIsomorfismos : [];
const getIsoEntryYear = (entry) => {
  const raw =
    entry?.year ??
    entry?.modeloYear ??
    entry?.equivalentYear ??
    entry?.meta?.year ??
    null;

  if (raw == null) return null;

  const txt = String(raw).trim();
  if (!txt) return null;

  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
};
    let rows = [];
    if (source instanceof Map){
      rows = source.get(lookupKey);
    }else if (source && typeof source === 'object'){
      rows = source[lookupKey];
    }

   if (Array.isArray(rows) && rows.length){
  return rows
    .filter(Boolean)
    .map((row) => ({
      ...row,
      year: getIsoEntryYear(row)
    }))
    .sort((a, b) => {
      const ay = a?.year ?? Number.POSITIVE_INFINITY;
      const by = b?.year ?? Number.POSITIVE_INFINITY;
      if (ay !== by) return ay - by;

      return String(a?.modeloLabel || '').localeCompare(String(b?.modeloLabel || ''), MODELOS_LOCALE);
    });
}

    const modelRowsSource = (
      idx.byModelId instanceof Map
        ? idx.byModelId.get(normalizedModelId) || idx.byModelId.get(modelId)
        : (idx.byModelId && typeof idx.byModelId === 'object'
            ? (idx.byModelId[normalizedModelId] || idx.byModelId[modelId] || null)
            : null)
    ) || (
      idx.byModeloId instanceof Map
        ? idx.byModeloId.get(normalizedModelId) || idx.byModeloId.get(modelId)
        : (idx.byModeloId && typeof idx.byModeloId === 'object'
            ? (idx.byModeloId[normalizedModelId] || idx.byModeloId[modelId] || null)
            : null)
    );

    if (Array.isArray(modelRowsSource) && modelRowsSource.length){
      const modelMatches = modelRowsSource
        .filter((row) => {
          const rowTechniqueId = normalizeTechniqueLookupValue(row?.tecnicaId || '');
          const rowTechniqueName = normalizeIsoText(row?.tecnicaLabel || '');
          const rowTechniqueType = normalizeIsoText(row?.tecnicaTipo || '');
          if (normalizedTecnicaId && rowTechniqueId === normalizedTecnicaId) return true;
          if (!normalizedItemName) return false;
          return rowTechniqueName === normalizedItemName &&
            (!normalizedItemType || !rowTechniqueType || rowTechniqueType === normalizedItemType);
        })
        .map((row) => {
          const isoId = String(row?.isomorfismoId || '').trim();
          const iso = idx.byIsomorfismoId instanceof Map
            ? idx.byIsomorfismoId.get(isoId)
            : (idx.byIsomorfismoId && typeof idx.byIsomorfismoId === 'object' ? idx.byIsomorfismoId[isoId] : null);
          const entries = Array.isArray(iso?.entries) ? iso.entries : [];
          const entry = entries.find((item) =>
            normalizeTechniqueLookupValue(item?.modeloId || '') === normalizedModelId &&
            (
              (normalizedTecnicaId && normalizeTechniqueLookupValue(item?.tecnicaId || '') === normalizedTecnicaId) ||
              (
                normalizedItemName &&
                normalizeIsoText(item?.tecnicaLabel || '') === normalizedItemName &&
                (!normalizedItemType || !normalizeIsoText(item?.tecnicaTipo || '') || normalizeIsoText(item?.tecnicaTipo || '') === normalizedItemType)
              )
            ) &&
            String(item?.estado || '').trim().toLowerCase() === 'ok'
          ) || row;

         return {
  isomorfismoId: isoId,
  isomorfismoLabel: String(iso?.label || row?.isomorfismoLabel || isoId).trim(),
  isomorfismoDefinicion: String(iso?.definicion || row?.isomorfismoDefinicion || '').trim(),
  isomorfismoCategoria: String(iso?.categoria || row?.isomorfismoCategoria || '').trim(),
  isomorfismoEntries: entries
    .filter((item) => String(item?.estado || '').trim().toLowerCase() === 'ok')
    .map((item) => ({
      modeloId: String(item?.modeloId || '').trim(),
      modeloLabel: String(item?.modeloLabel || '').trim(),
      grupo: String(item?.grupo || '').trim(),
      year: (() => {
        const raw = item?.year ?? item?.anio ?? null;
        if (raw == null || String(raw).trim() === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })(),
      autores: String(item?.autores || item?.authors || '').trim(),
      tecnicaId: String(item?.tecnicaId || '').trim(),
      tecnicaLabel: String(item?.tecnicaLabel || '').trim(),
      tecnicaTipo: String(item?.tecnicaTipo || '').trim(),
      estado: String(item?.estado || '').trim(),
      nota: String(item?.nota || '').trim(),
      sourceFile: String(item?.sourceFile || '').trim()
    }))
    .sort((a, b) => {
      const yearA = a?.year ?? Number.MAX_SAFE_INTEGER;
      const yearB = b?.year ?? Number.MAX_SAFE_INTEGER;
      if (yearA !== yearB) return yearA - yearB;

      const byModel = String(a?.modeloLabel || '').localeCompare(String(b?.modeloLabel || ''), MODELOS_LOCALE);
      if (byModel !== 0) return byModel;

      return String(a?.tecnicaLabel || '').localeCompare(String(b?.tecnicaLabel || ''), MODELOS_LOCALE);
    }),
  tecnicaId,
  tecnicaLabel: String(entry?.tecnicaLabel || row?.tecnicaLabel || '').trim(),
  tecnicaTipo: String(entry?.tecnicaTipo || row?.tecnicaTipo || '').trim(),
  modeloId,
  modeloLabel: String(entry?.modeloLabel || row?.modeloLabel || '').trim(),
  grupo: String(entry?.grupo || row?.grupo || '').trim(),
  year: (() => {
    const raw = entry?.year ?? entry?.anio ?? row?.year ?? row?.anio ?? null;
    if (raw == null || String(raw).trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  })(),
  autores: String(entry?.autores || entry?.authors || row?.autores || row?.authors || '').trim(),
  nota: String(entry?.nota || row?.nota || '').trim(),
  sourceFile: String(entry?.sourceFile || row?.sourceFile || '').trim()
};
        });

      if (modelMatches.length) return modelMatches;
    }

    return isomorfismos
      .map((iso) => {
        const entries = Array.isArray(iso?.entries) ? iso.entries : [];
        const entry = entries.find((item) =>
          normalizeTechniqueLookupValue(item?.modeloId || '') === normalizedModelId &&
          (
            (normalizedTecnicaId && normalizeTechniqueLookupValue(item?.tecnicaId || '') === normalizedTecnicaId) ||
            (
              normalizedItemName &&
              normalizeIsoText(item?.tecnicaLabel || '') === normalizedItemName &&
              (!normalizedItemType || !normalizeIsoText(item?.tecnicaTipo || '') || normalizeIsoText(item?.tecnicaTipo || '') === normalizedItemType)
            )
          ) &&
          String(item?.estado || '').trim().toLowerCase() === 'ok'
        );
        if (!entry) return null;

     return {
  isomorfismoId: String(iso?.id || '').trim(),
  isomorfismoLabel: String(iso?.label || iso?.id || '').trim(),
  isomorfismoDefinicion: String(iso?.definicion || '').trim(),
  isomorfismoCategoria: String(iso?.categoria || '').trim(),
  isomorfismoEntries: entries
    .filter((item) => String(item?.estado || '').trim().toLowerCase() === 'ok')
    .map((item) => ({
      modeloId: String(item?.modeloId || '').trim(),
      modeloLabel: String(item?.modeloLabel || '').trim(),
      grupo: String(item?.grupo || '').trim(),
      year: (() => {
        const raw = item?.year ?? item?.anio ?? null;
        if (raw == null) return null;
        const txt = String(raw).trim();
        if (!txt) return null;
        const n = Number(txt);
        return Number.isFinite(n) ? n : null;
      })(),
      autores: String(item?.autores || item?.authors || '').trim(),
      tecnicaId: String(item?.tecnicaId || '').trim(),
      tecnicaLabel: String(item?.tecnicaLabel || '').trim(),
      tecnicaTipo: String(item?.tecnicaTipo || '').trim(),
      estado: String(item?.estado || '').trim(),
      nota: String(item?.nota || '').trim(),
      sourceFile: String(item?.sourceFile || '').trim()
    }))
    .sort((a, b) => {
      const yearA = a?.year ?? Number.MAX_SAFE_INTEGER;
      const yearB = b?.year ?? Number.MAX_SAFE_INTEGER;
      if (yearA !== yearB) return yearA - yearB;

      const byModel = String(a?.modeloLabel || '').localeCompare(String(b?.modeloLabel || ''), MODELOS_LOCALE);
      if (byModel !== 0) return byModel;

      return String(a?.tecnicaLabel || '').localeCompare(String(b?.tecnicaLabel || ''), MODELOS_LOCALE);
    }),
  tecnicaId,
  tecnicaLabel: String(entry?.tecnicaLabel || '').trim(),
  tecnicaTipo: String(entry?.tecnicaTipo || '').trim(),
  modeloId,
  modeloLabel: String(entry?.modeloLabel || '').trim(),
  grupo: String(entry?.grupo || '').trim(),
  year: (() => {
    const raw = entry?.year ?? entry?.anio ?? null;
    if (raw == null) return null;
    const txt = String(raw).trim();
    if (!txt) return null;
    const n = Number(txt);
    return Number.isFinite(n) ? n : null;
  })(),
  autores: String(entry?.autores || entry?.authors || '').trim(),
  nota: String(entry?.nota || '').trim(),
  sourceFile: String(entry?.sourceFile || '').trim()
};
      })
     .filter(Boolean)
.sort((a, b) => {
  const yearA = a?.year ?? Number.MAX_SAFE_INTEGER;
  const yearB = b?.year ?? Number.MAX_SAFE_INTEGER;
  if (yearA !== yearB) return yearA - yearB;

  return String(a?.modeloLabel || '').localeCompare(String(b?.modeloLabel || ''), MODELOS_LOCALE);
});
  }catch(err){
    console.warn('getTechniqueIsomorphisms failed', {
      modelId: modelMeta?.id,
      tecnicaId: itemMeta?.codigo,
      err
    });
    return [];
  }
}

function getModelAuthorsById(modelId){
  try{
    const meta = getCachedIsomorphismModelMeta(modelId);
    return String(meta?.autores || '').trim();
  }catch(err){
    console.warn('getModelAuthorsById failed', { modelId, err });
    return '';
  }
}

function formatTechniqueTypeLabel(type){
  const value = String(type || '').trim().toLowerCase();
  if (value === 'micro') return uiText('technique.type.micro', 'Microintervención');
  if (value === 'procedimiento') return uiText('technique.type.procedure', 'Procedimiento');
  return uiText('technique.type.technique', 'Técnica');
}

function getIsomorphismEquivalences(row, currentModelId){
  const currentId = String(currentModelId || '').trim();
  const entries = Array.isArray(row?.isomorfismoEntries) ? row.isomorfismoEntries : [];

  return entries
    .filter((entry) => String(entry?.modeloId || '').trim() && String(entry?.modeloId || '').trim() !== currentId)
   .map((entry) => ({
  ...entry,
  autores: getModelAuthorsById(entry?.modeloId || '') || entry?.autores || '',
  year: getModelYearById(entry?.modeloId || '') || entry?.year || null
}))
   .sort((a, b) => {
  const yearA = Number.isFinite(Number(a?.year)) && Number(a?.year) > 0 ? Number(a.year) : Number.MAX_SAFE_INTEGER;
  const yearB = Number.isFinite(Number(b?.year)) && Number(b?.year) > 0 ? Number(b.year) : Number.MAX_SAFE_INTEGER;

  if (yearA !== yearB) return yearA - yearB;

  const byModel = String(a?.modeloLabel || '').localeCompare(String(b?.modeloLabel || ''), MODELOS_LOCALE);
  if (byModel !== 0) return byModel;

  return String(a?.tecnicaLabel || '').localeCompare(String(b?.tecnicaLabel || ''), MODELOS_LOCALE);
});
}

function renderTechniqueIsomorphisms(modelMeta, itemMeta){
  try{
    const isoList = getTechniqueIsomorphisms(modelMeta, itemMeta);
    if (!isoList.length) return '';
    ensureIsomorphismMetadataForRows(modelMeta, isoList);

    return `
      <div class="iso-tech">
        <div class="iso-tech-stack">
          ${isoList.map((row) => {
            const equivalents = getIsomorphismEquivalences(row, modelMeta?.id);
            return `
            <details class="iso-tech-item">
              <summary>
                <span class="iso-tech-main">
                  <span class="iso-tech-title">${escapeHtml(uiText('isomorphism.one', 'Isomorfismo'))}</span>
                  <span class="iso-tech-name">${escapeHtml(row?.isomorfismoLabel || row?.isomorfismoId || uiText('isomorphism.one', 'Isomorfismo'))}</span>
                </span>
                <span class="iso-tech-meta">${escapeHtml(uiText(equivalents.length === 1 ? 'isomorphism.equivalence.one' : 'isomorphism.equivalence.many', equivalents.length === 1 ? '{count} equivalencia' : '{count} equivalencias', { count:equivalents.length }))}</span>
              </summary>
              <div class="iso-tech-body">
                ${row?.isomorfismoDefinicion ? `<div class="iso-tech-def">${escapeHtml(row.isomorfismoDefinicion)}</div>` : ''}
                <div class="iso-tech-eqTitle">${escapeHtml(uiText('isomorphism.equivalences', 'Equivalencias'))}</div>
                ${
                  equivalents.length
                    ? `<ul class="iso-tech-eqList">${equivalents.map((entry) => `
                        <li>
                      <span class="iso-tech-eqModel">
${entry?.year ? `<span class="iso-tech-eqYear">${escapeHtml(String(entry.year))}</span> · ` : ''}
${escapeHtml(entry?.modeloLabel || entry?.label || uiText('common.model.one', 'Modelo'))}
${entry?.autores ? ` · ${escapeHtml(entry.autores)}` : ''}
</span>

<br>

<span class="iso-tech-eqTechnique">${escapeHtml(formatTechniqueTypeLabel(entry?.tecnicaTipo || ''))}: ${escapeHtml(entry?.tecnicaLabel || entry?.tecnicaId || uiText('common.unnamed', 'Sin nombre'))}</span>
                          </li>
                      `).join('')}</ul>`
                    : `<div class="iso-tech-empty">${escapeHtml(uiText('isomorphism.noConfirmedEquivalences', 'No hay equivalencias confirmadas en otros modelos.'))}</div>`
                }
              </div>
            </details>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }catch(err){
    console.warn('renderTechniqueIsomorphisms failed', {
      modelId: modelMeta?.id,
      tecnicaId: itemMeta?.codigo,
      err
    });
    return '';
  }
}

function renderIsomorphismInner(modelMeta, itemMeta){
  if (!ENABLE_ISOMORPHISMS) return '';
  return renderTechniqueIsomorphisms(modelMeta, itemMeta);
}

function hasIsomorphismIndexData(){
  if (!ENABLE_ISOMORPHISMS) return false;
  const idx = window.ISOMORPHISM_INDEX;
  if (!idx) return false;
  return !!(
    (Array.isArray(idx.rawIsomorfismos) && idx.rawIsomorfismos.length) ||
    (idx.byIsomorfismoId && idx.byIsomorfismoId.size) ||
    (idx.byModeloId && idx.byModeloId.size) ||
    (idx.byTecnicaId && idx.byTecnicaId.size) ||
    (idx.byModelTechniqueKey && idx.byModelTechniqueKey.size) ||
    (idx.byModelId && idx.byModelId.size) ||
    (idx.byEntryKey && idx.byEntryKey.size) ||
    (idx.byFallbackKey && idx.byFallbackKey.size) ||
    (idx.byNameKey && idx.byNameKey.size)
  );
}

function indexHasUsableIsomorphismData(idx){
  if (!idx) return false;
  return !!(
    (Array.isArray(idx.rawIsomorfismos) && idx.rawIsomorfismos.length) ||
    (idx.byIsomorfismoId && idx.byIsomorfismoId.size) ||
    (idx.byModeloId && idx.byModeloId.size) ||
    (idx.byTecnicaId && idx.byTecnicaId.size) ||
    (idx.byModelTechniqueKey && idx.byModelTechniqueKey.size) ||
    (idx.byModelId && idx.byModelId.size) ||
    (idx.byEntryKey && idx.byEntryKey.size) ||
    (idx.byFallbackKey && idx.byFallbackKey.size) ||
    (idx.byNameKey && idx.byNameKey.size)
  );
}

const ISOMORPHISM_MODEL_META_CACHE = new Map();
const ISOMORPHISM_MODEL_META_PENDING = new Map();

function cacheIsomorphismModelMeta(model){
  if (!model || typeof model !== 'object') return null;
  const id = String(model?.id || '').trim();
  if (!id) return null;
  const prev = ISOMORPHISM_MODEL_META_CACHE.get(id) || {};
  const next = {
    id,
    label: String(model?.label || prev.label || model?.modelo || '').trim(),
    autores: String(model?.autores || model?.authors || prev.autores || '').trim(),
    year: Number(model?.year || prev.year || 0) || 0,
    grupo: String(model?.grupo || model?.group || prev.grupo || '').trim()
  };
  ISOMORPHISM_MODEL_META_CACHE.set(id, next);
  return next;
}

function primeIsomorphismModelMetaCache(){

  const pool = Array.isArray(window.ALL_MODELS)
    ? window.ALL_MODELS
    : Array.isArray(window.MODELS)
      ? window.MODELS
      : [];
  pool.forEach((model) => cacheIsomorphismModelMeta(model));
}

function getCachedIsomorphismModelMeta(modelId){
  const id = String(modelId || '').trim();
  if (!id) return null;
  primeIsomorphismModelMetaCache();
  return ISOMORPHISM_MODEL_META_CACHE.get(id) || null;
}

function getModelYearById(modelId){
  const meta = getCachedIsomorphismModelMeta(modelId);
  return Number(meta?.year || 0) || 0;
}

async function loadIsomorphismSchoolMeta(schoolLabel){
  const label = String(schoolLabel || '').trim();
  if (!label) return;
  if (ISOMORPHISM_MODEL_META_PENDING.has(label)){
    return ISOMORPHISM_MODEL_META_PENDING.get(label);
  }

  const promise = (async () => {
    const targetSlug = slugify(label);
    const entry = (GH_SCHOOLS || []).find((item) => {
      const itemLabel = String(item?.label || '').trim();
      const itemId = String(item?.id || '').trim();
      return itemLabel === label || itemId === targetSlug || slugify(itemLabel) === targetSlug;
    });
    const schoolUrls = [];
    const addUrl = (u) => { if (u && !schoolUrls.includes(u)) schoolUrls.push(u); };
    addUrl(gh(`Core/escuelas/${targetSlug}.json`));
    if (entry?.file){
      const rawFile = String(entry.file || '').trim().replace(/^\/+/, '');
      addUrl(gh(rawFile.startsWith('Core/') ? rawFile : `Core/${rawFile}`));
      addUrl(gh(rawFile.replace(/^Core\//, '')));
    }

    let school = null;
    for (const url of schoolUrls){
      try{
        school = await fetchJson(url, { bust:true });
      }catch(err){
        continue;
      }
      if (school) break;
    }
    if (!school) return;

    const listRaw =
      (Array.isArray(school?.modelos) ? school.modelos : null) ||
      (Array.isArray(school?.models) ? school.models : null) ||
      (school?.modelos && typeof school.modelos === 'object' ? Object.values(school.modelos) : null) ||
      (school?.models && typeof school.models === 'object' ? Object.values(school.models) : null) ||
      (Array.isArray(school) ? school : []);

    listRaw
      .filter((item) => item && typeof item === 'object')
      .filter(isModelVisibleInApp)
      .forEach((item) => cacheIsomorphismModelMeta({
        ...item,
        grupo: String(item?.grupo || item?.group || school?.label || entry?.label || label).trim()
      }));
  })().finally(() => {
    ISOMORPHISM_MODEL_META_PENDING.delete(label);
  });

  ISOMORPHISM_MODEL_META_PENDING.set(label, promise);
  return promise;
}

function ensureIsomorphismMetadataForRows(modelMeta, rows){
  if (!ENABLE_ISOMORPHISMS) return;
  try{
    const activeModelId = String(modelMeta?.id || '').trim();
    if (!activeModelId || !Array.isArray(rows) || !rows.length) return;

    primeIsomorphismModelMetaCache();

    const schoolsToLoad = new Set();
    rows.forEach((row) => {
      const entries = Array.isArray(row?.isomorfismoEntries) ? row.isomorfismoEntries : [];
      entries.forEach((entry) => {
        const modelId = String(entry?.modeloId || '').trim();
        if (!modelId || modelId === activeModelId) return;
        const cached = getCachedIsomorphismModelMeta(modelId);
        const hasAuthor = String(cached?.autores || '').trim();
        const hasYear = Number(cached?.year || 0) > 0;
        if (hasAuthor && hasYear) return;
        const school = String(entry?.grupo || '').trim();
        if (school) schoolsToLoad.add(school);
      });
    });

    if (!schoolsToLoad.size) return;

    Promise.allSettled([...schoolsToLoad].map((school) => loadIsomorphismSchoolMeta(school)))
      .then(async () => {
        if (String(getCurrentModelIdValue() || '').trim() !== activeModelId) return;
        const baseModel = getAllModelsPool().find((m) => String(m?.id || '').trim() === activeModelId) || modelMeta;
        const fullModel = await ensureModelFull(baseModel).catch(() => baseModel);
        if (String(getCurrentModelIdValue() || '').trim() !== activeModelId) return;
        renderModelInfo(fullModel || baseModel);
      })
      .catch(() => {});
  }catch(err){
    console.warn('ensureIsomorphismMetadataForRows failed', { modelId: modelMeta?.id, err });
  }
}

function ensureIsomorphismReadyForModel(modelMeta){
  if (!ENABLE_ISOMORPHISMS) return;
  try{
    if (!modelMeta || !modelMeta.id) return;
    const hasNestedItems =
      (Array.isArray(modelMeta.tecnicas) && modelMeta.tecnicas.length) ||
      (Array.isArray(modelMeta.procedimientos) && modelMeta.procedimientos.length) ||
      (Array.isArray(modelMeta.micros) && modelMeta.micros.length);
    if (!hasNestedItems) return;
    if (hasIsomorphismIndexData()) return;

    const modelId = String(modelMeta.id || '').trim();
    if (!modelId) return;
    if (ensureIsomorphismReadyForModel._pendingFor === modelId) return;
    ensureIsomorphismReadyForModel._pendingFor = modelId;

    const loadPromise = hasIsomorphismIndexData()
      ? Promise.resolve(window.ISOMORPHISM_INDEX)
      : loadIsomorphismIndex();
    ISOMORPHISM_PROMISE = Promise.resolve(loadPromise).catch(() => emptyIsomorphismIndex());

    Promise.resolve(ISOMORPHISM_PROMISE)
      .catch(() => null)
      .then(async () => {
        if (!hasIsomorphismIndexData()) return;
        if (String(getCurrentModelIdValue() || '').trim() !== modelId) return;

        const baseModel = getAllModelsPool().find((m) => String(m?.id || '').trim() === modelId) || modelMeta;
        const fullModel = await ensureModelFull(baseModel).catch(() => baseModel);
        if (String(getCurrentModelIdValue() || '').trim() !== modelId) return;

        try{
          renderModelInfo(fullModel || baseModel);
        }catch(err){
          console.warn('ensureIsomorphismReadyForModel rerender failed', { modelId, err });
        }
      })
      .finally(() => {
        if (ensureIsomorphismReadyForModel._pendingFor === modelId){
          ensureIsomorphismReadyForModel._pendingFor = '';
        }
      });
  }catch(err){
    console.warn('ensureIsomorphismReadyForModel failed', {
      modelId: modelMeta?.id,
      err
    });
  }
}



window.getAuthorPhoto = function(authorName){

  const idx = window.AUTHOR_PHOTO_INDEX;
  const authors = idx && idx.authors ? idx.authors : null;

  if (!authors || !Object.keys(authors).length) return null;

  const key = normAuthorKey(authorName);
  const file = authors[key];

  if (!file) return null;

 return buildAuthorPhotoUrl(file);


};

window.getModelPhoto = function(modelId, authorName){

  const idx = window.AUTHOR_PHOTO_INDEX;
  const models = idx && idx.models ? idx.models : null;

  // 1) Preferencia total: por ID de modelo
  if (models && modelId){
    const fileById = models[String(modelId).trim()];
    if (fileById){
     return buildAuthorPhotoUrl(fileById);


    }
  }

  // 2) Fallback: por autor (por si aún no has mapeado ese modelo)
  return window.getAuthorPhoto(authorName);
};


// ✅ NUEVO: topojson también puede no estar listo aunque esté con defer
async function ensureTopojson(timeoutMs = 6000){
  if (window.topojson) return true;

  // si tu <script defer ...> está, normalmente bastaría con esperar un poco
  const t0 = Date.now();
  while (!window.topojson && (Date.now() - t0) < timeoutMs){
    await new Promise(r => setTimeout(r, 50));
  }
  return !!window.topojson;
}


window.addEventListener('DOMContentLoaded', async () => {
ASSET_VERSION_PROMISE = loadAssetVersion()
  .catch(() => {})
  .finally(() => {
    // Recalcula base en segundo plano cuando llegue el SHA (o fallback @main)
    DATA_BASE = resolveDataBase();
  });

D3_READY_PROMISE = null;
TOPO_READY_PROMISE = null;
AUTHOR_PHOTO_PROMISE = ASSET_VERSION_PROMISE
  .then(() => loadAuthorPhotoIndex())
  .catch(() => ({ authors:{}, models:{} }));
VIDA_IMAGE_PROMISE = ASSET_VERSION_PROMISE
  .then(() => loadVidaImageIndex())
  .catch(() => ({ basePath:'Core/imagenes/vida', models:{}, modelsNorm:{}, authors:{}, authorsNorm:{} }));
ISOMORPHISM_PROMISE = ASSET_VERSION_PROMISE
  .then(() => {
    DATA_BASE = resolveDataBase();
    return loadIsomorphismIndex();
  })
  .catch(() => emptyIsomorphismIndex());

ISOMORPHISM_PROMISE.then(async () => {
  const activeId = String(getCurrentModelIdValue() || '').trim();
  if (!activeId || !['school', 'epistemology'].includes(groupingMode)) return;

  const baseModel = getAllModelsPool().find((m) => String(m?.id || '') === activeId);
  if (!baseModel) return;

  const fullModel = await ensureModelFull(baseModel).catch(() => baseModel);
  if (String(getCurrentModelIdValue() || '').trim() !== activeId) return;
  renderModelInfo(fullModel || baseModel);
}).catch(() => {});

  
  const qs = new URLSearchParams(location.search);
  IS_EMBED = ["1","true","yes"].includes((qs.get("embed") || "").toLowerCase());
  OPEN_ID  = (qs.get("open") || "").trim();
  OPEN_SCHOOL = (qs.get("school") || "").trim();


  if(IS_EMBED){
    document.body.classList.add("is-embed");
  }

// ✅ GH_SCHOOLS: útil, pero JAMÁS debe romper el render
try{
  const idx = await loadGhSchoolsIndex();
  GH_SCHOOLS = Array.isArray(idx) ? idx : (Array.isArray(idx?.escuelas) ? idx.escuelas : []);
  window.GH_SCHOOLS = GH_SCHOOLS;
  if(!GH_SCHOOLS.length){
    console.warn("[GH_SCHOOLS] respuesta vacía/invalid, uso []");
  }
}catch(e){
  console.warn("[GH_SCHOOLS] no se pudo cargar (continúo sin él):", e);
  GH_SCHOOLS = Array.isArray(GH_SCHOOLS) ? GH_SCHOOLS : [];
}

const SPECIAL_MODULE_TYPES = new Set([
  'taxonomia', 'jerarquia', 'ciclo', 'mapa', 'matriz',
  'lineaTiempo', 'arbolDecision', 'continuo', 'genograma'
]);

function getSpecialModelModules(model){
  if (!Array.isArray(model?.modulosEspeciales)) return [];
  return model.modulosEspeciales
    .filter((module) => module && typeof module === 'object' && !Array.isArray(module))
    .map((module, index) => ({
      ...module,
      id:String(module.id || `modulo-${index + 1}`).trim(),
      tipo:String(module.tipo || '').trim(),
      titulo:String(module.titulo || uiText('architecture.specialModule', 'Módulo especial')).trim(),
      descripcion:String(module.descripcion || '').trim(),
      fuente:String(module.fuente || '').trim(),
      datos:Array.isArray(module.datos) ? module.datos : (module.datos && typeof module.datos === 'object' ? module.datos : [])
    }));
}

function specialItemTitle(item, fallback = uiText('architecture.item', 'Elemento')){
  return String(item?.nombre || item?.titulo || item?.etiqueta || item?.label || fallback);
}

function specialItemText(item){
  return String(item?.definicion || item?.descripcion || item?.texto || item?.resumen || '');
}

function renderSpecialTaxonomy(data){
  const groups = data.flatMap((entry) => Array.isArray(entry?.items)
    ? [{ title:specialItemTitle(entry, uiText('architecture.category', 'Categoría')), items:entry.items }]
    : [{ title:String(entry?.categoria || ''), items:[entry] }]);
  return `<div class="ed-arch-taxonomy">${groups.map((group) => `
    <section class="ed-arch-group">
      ${group.title ? `<p class="ed-arch-overline">${escapeHtml(group.title)}</p>` : ''}
      ${group.items.map((item) => `<details class="ed-arch-taxItem">
        <summary><span>${escapeHtml(specialItemTitle(item))}</span><span class="ed-arch-plus">+</span></summary>
        <div class="ed-arch-taxBody">${specialItemText(item) ? `<p>${escapeHtml(specialItemText(item))}</p>` : ''}
        ${item?.ejemploClinico ? `<p><strong>${escapeHtml(uiText('architecture.clinicalExample', 'Ejemplo clínico'))}</strong>${escapeHtml(item.ejemploClinico)}</p>` : ''}
        ${Array.isArray(item?.relaciones) && item.relaciones.length ? `<p><strong>${escapeHtml(uiText('architecture.relationships', 'Relaciones'))}</strong>${escapeHtml(item.relaciones.join(' · '))}</p>` : ''}</div>
      </details>`).join('')}
    </section>`).join('')}</div>`;
}

function renderSpecialHierarchy(data){
  const levels = [...data].sort((a,b) => Number(a?.orden ?? a?.posicion ?? 0) - Number(b?.orden ?? b?.posicion ?? 0));
  return `<ol class="ed-arch-hierarchy">${levels.map((item, index) => `<li style="width:${100 - (index / Math.max(levels.length - 1, 1)) * 32}%;--levelTone:${Math.min(70,18 + index * 6)}%;--levelFill:${Math.min(18,3 + index * 1.5)}%">
    <span class="ed-arch-index">${String(index + 1).padStart(2,'0')}</span><div><h4>${escapeHtml(specialItemTitle(item, uiText('architecture.level', 'Nivel {number}', { number:index + 1 })))}</h4>${specialItemText(item) ? `<p>${escapeHtml(specialItemText(item))}</p>` : ''}</div>
  </li>`).join('')}</ol>`;
}

function renderSpecialCycle(data){
  const count = Math.max(data.length, 1);
  return `<div class="ed-arch-cycle" style="--cycle-count:${count}"><div class="ed-arch-cycleCore">${escapeHtml(uiText('architecture.cycle', 'Ciclo'))}</div>${data.map((item,index) => {
    const angle = (index * 360 / count) - 90;
    return `<article style="--angle:${angle}deg" tabindex="0"><span>${String(index + 1).padStart(2,'0')}</span><h4>${escapeHtml(specialItemTitle(item))}</h4>${specialItemText(item) ? `<p>${escapeHtml(specialItemText(item))}</p>` : ''}</article>`;
  }).join('')}</div>`;
}

function renderSpecialMap(input){
  const module=Array.isArray(input) ? { datos:input } : (input && typeof input==='object' ? input : { datos:[] });
  const nodes=Array.isArray(module.datos) ? module.datos.filter(Boolean) : [];
  const config=module.configuracionMapa && typeof module.configuracionMapa==='object' ? module.configuracionMapa : {};
  const safeClass=(value,fallback='asociativa') => String(value || fallback).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-');
  const markerId = `ed-arch-arrow-${String(nodes[0]?.id || 'map').replace(/[^a-z0-9_-]/gi,'')}`;
  const ids = nodes.map((node,index) => String(node.id || index));
  const byId = new Map(ids.map((id,index) => [id,nodes[index]]));
  const rawPosition = new Map(nodes.map((node,index) => {
    const angle=(index*Math.PI*2/Math.max(nodes.length,1))-Math.PI/2;
    return [ids[index],{
      x:Number.isFinite(Number(node.x)) ? Number(node.x) : 50+Math.cos(angle)*36,
      y:Number.isFinite(Number(node.y)) ? Number(node.y) : 50+Math.sin(angle)*34
    }];
  }));
  const moduleRelations=Array.isArray(module.relaciones) ? module.relaciones : [];
  const legacyRelations=nodes.flatMap((node,index) => (Array.isArray(node.relaciones) ? node.relaciones : []).map((target,edgeIndex) => ({
    ...(target && typeof target==='object' ? target : {}),
    id:`legacy-${String(node.id || index)}-${edgeIndex}`,
    origen:String(node.id || index),
    destino:String(target && typeof target==='object' ? target.destino || target.hasta || target.id : target),
    __legacy:true
  })));
  const rawEdges=moduleRelations.length ? moduleRelations : legacyRelations;
  const edgeKeys=new Set();
  const edges=rawEdges.map((edge,index) => {
    const source=edge && typeof edge==='object' ? edge : {};
    const from=String(source.origen || source.desde || source.source || '');
    const to=String(source.destino || source.hasta || source.target || '');
    const direction=String(source.direccion || 'origen-destino').toLowerCase();
    const arrow=String(source.flecha===false ? 'ninguna' : source.flecha ?? (direction.includes('bidirecc') ? 'ambos' : direction==='destino-origen' ? 'origen' : direction==='ninguna' ? 'ninguna' : 'destino')).toLowerCase();
    return { id:String(source.id || `relacion-${index+1}`), from, to, label:String(source.etiqueta || source.label || ''), description:String(source.descripcion || source.texto || ''), type:safeClass(source.tipo,source.__legacy?'estructural':'asociativa'), style:safeClass(source.estilo,'continua'), direction, arrow, sourcePort:safeClass(source.puertoOrigen,'auto'), targetPort:safeClass(source.puertoDestino,'auto'), trace:safeClass(source.trazado,'ortogonal'), labelPosition:safeClass(source.posicionEtiqueta,'centro'), labelOrientation:safeClass(source.orientacionEtiqueta || config.orientacionEtiquetas,'auto'), layer:String(source.capa || ''), legacy:source.__legacy===true };
  }).filter((edge) => {
    if(!byId.has(edge.from) || !byId.has(edge.to) || edge.from===edge.to) return false;
    if(!edge.legacy) return true;
    const key=[edge.from,edge.to].sort().join('::');
    if(edgeKeys.has(key)) return false;
    edgeKeys.add(key); return true;
  });
  const adjacency = new Map(ids.map(id => [id,[]]));
  edges.forEach((edge) => { adjacency.get(edge.from).push(edge.to); adjacency.get(edge.to).push(edge.from); });
  const explicitCenter = ids.find(id => byId.get(id)?.central===true || byId.get(id)?.destacado===true || safeClass(byId.get(id)?.rolVisual,'')==='nucleo');
  const centerId = explicitCenter || [...ids].sort((a,b) => adjacency.get(b).length-adjacency.get(a).length || Math.hypot(rawPosition.get(a).x-50,rawPosition.get(a).y-50)-Math.hypot(rawPosition.get(b).x-50,rawPosition.get(b).y-50))[0];
  const distance = new Map(centerId ? [[centerId,0]] : []), parent = new Map(), queue=centerId ? [centerId] : [];
  while(queue.length){ const current=queue.shift(); adjacency.get(current).forEach(next => { if(distance.has(next)) return; distance.set(next,distance.get(current)+1); parent.set(next,current); queue.push(next); }); }
  const side = new Map();
  ids.forEach(id => {
    if(id===centerId){ side.set(id,0); return; }
    let ancestor=id;
    while(parent.has(ancestor) && parent.get(ancestor)!==centerId) ancestor=parent.get(ancestor);
    const first=ancestor;
    const firstPosition=rawPosition.get(first), centerPosition=rawPosition.get(centerId);
    const deltaX=firstPosition.x-centerPosition.x;
    // Las relaciones expresan dirección semántica, no el lado visual del mapa.
    // Respetamos x; si ambos nodos comparten x, y desempata para repartirlos.
    const rawSide=Math.abs(deltaX)>1 ? Math.sign(deltaX) : (firstPosition.y<centerPosition.y ? -1 : 1);
    side.set(id,rawSide);
  });
  const positions=new Map(), manual=String(config.modoLayout || '').toLowerCase()==='manual';
  let maxRows=1;
  if(manual){
    ids.forEach(id => { const p=rawPosition.get(id); positions.set(id,{ x:Math.max(5,Math.min(95,p.x)), y:Math.max(6,Math.min(94,p.y)), column:p.x<46?-1:p.x>54?1:0 }); });
    maxRows=Math.max(5,Math.ceil(nodes.length/3));
  }else{
    const columns = new Map([[-2,[]],[-1,[]],[0,centerId?[centerId]:[]],[1,[]],[2,[]]]);
    ids.forEach(id => { if(id===centerId) return; const level=Math.min(2,Math.max(1,distance.get(id)||2)); columns.get((side.get(id)||1)*level).push(id); });
    columns.forEach((list,key) => { if(key) list.sort((a,b) => rawPosition.get(a).y-rawPosition.get(b).y || ids.indexOf(a)-ids.indexOf(b)); });
    const columnX = new Map([[-2,10.5],[-1,28], [0,50], [1,72], [2,89.5]]);
    columns.forEach((list,key) => { maxRows=Math.max(maxRows,list.length); list.forEach((id,index) => positions.set(id,{ x:columnX.get(key), y:list.length===1 ? 50 : 11.5+(77*index/(list.length-1)), column:key })); });
  }
  const zoneData=Array.isArray(module.zonas) ? module.zonas.filter(Boolean) : [];
  const explicitMapHeight=Number(config.altoMapa ?? config.alturaMapa ?? config.mapHeight);
  let automaticMapHeight=manual ? Math.max(760,maxRows*128+100) : 600;
  if(manual && zoneData.length){
    zoneData.forEach((zone) => {
      const zoneHeightPct=Math.max(4,Math.min(100,Number(zone.alto)||20));
      const zoneNodes=nodes.filter((node) => String(node?.zona || '')===String(zone?.id || ''));
      if(!zoneNodes.length) return;
      const yBands=[];
      zoneNodes
        .map((node) => Number(node.y))
        .filter(Number.isFinite)
        .sort((a,b) => a-b)
        .forEach((y) => {
          if(!yBands.length || Math.abs(y-yBands[yBands.length-1])>5) yBands.push(y);
        });
      const rows=Math.max(1,yBands.length || Math.ceil(zoneNodes.length/4));
      const requiredZoneHeight=64+(rows*72)+(Math.max(0,rows-1)*18)+28;
      automaticMapHeight=Math.max(automaticMapHeight,requiredZoneHeight/(zoneHeightPct/100));
    });
  }
  const mapMinHeight=Math.round(Math.max(600,Math.min(
    Number.isFinite(explicitMapHeight) ? 2400 : 1600,
    Number.isFinite(explicitMapHeight) ? explicitMapHeight : Math.ceil(automaticMapHeight/20)*20
  )));
  const layers=Array.isArray(module.capas) ? module.capas.filter(Boolean) : [];
  const maxVisible=Number.isFinite(Number(config.maxRelacionesVisibles)) ? Math.max(1,Number(config.maxRelacionesVisibles)) : Infinity;
  const labelMode=['siempre','alSeleccionar','nunca'].includes(config.mostrarEtiquetasRelacion) ? config.mostrarEtiquetasRelacion : (edges.some(edge=>edge.label) ? 'alSeleccionar' : 'nunca');
  const zones=zoneData.map((zone) => `<section class="ed-arch-zone is-${safeClass(zone.estilo,'suave')}" data-arch-zone="${escapeHtml(zone.id || '')}" style="left:${Number(zone.x)||0}%;top:${Number(zone.y)||0}%;width:${Number(zone.ancho)||20}%;height:${Number(zone.alto)||20}%"><strong>${escapeHtml(zone.titulo || '')}</strong>${zone.subtitulo ? `<small>${escapeHtml(zone.subtitulo)}</small>` : ''}</section>`).join('');
  const edgeMarkup=edges.map((edge,index) => {
    const secondary=edge.type==='asociativa';
    const density=index>=maxVisible?' is-density-hidden':'';
    const markerStart=['origen','ambos','doble'].includes(edge.arrow) || edge.direction.includes('bidirecc');
    const markerEnd=!['ninguna','sin-flecha','origen'].includes(edge.arrow) && edge.direction!=='ninguna';
    return `<circle class="${density.trim()}" data-edge-dot="${index}" cx="0" cy="0" r="4"></circle><path class="ed-arch-edgeHit${density}" data-edge-hit="${index}" d="M0 0"></path><path tabindex="0" class="ed-arch-edge is-${edge.type} is-${edge.style}${secondary?' is-secondary':''}${density}" data-edge-index="${index}" data-edge-id="${escapeHtml(edge.id)}" data-edge-from="${escapeHtml(edge.from)}" data-edge-to="${escapeHtml(edge.to)}" data-source-port="${edge.sourcePort}" data-target-port="${edge.targetPort}" data-trace="${edge.trace}" data-label-position="${edge.labelPosition}" data-layer="${escapeHtml(edge.layer)}" data-relation-title="${escapeHtml(edge.label || `${specialItemTitle(byId.get(edge.from))} → ${specialItemTitle(byId.get(edge.to))}`)}" data-relation-description="${escapeHtml(edge.description)}" d="M0 0"${markerStart ? ` marker-start="url(#${markerId})"` : ''}${markerEnd ? ` marker-end="url(#${markerId})"` : ''}></path>`;
  }).join('');
  const labels=edges.map((edge,index) => edge.label ? `<button type="button" class="ed-arch-edgeLabel${index>=maxVisible?' is-density-hidden':''}" data-edge-label="${index}" data-edge-id="${escapeHtml(edge.id)}" data-label-orientation="${edge.labelOrientation}" data-layer="${escapeHtml(edge.layer)}">${escapeHtml(edge.label)}</button>` : '').join('');
  const layerToolbar=layers.length ? `<div class="ed-arch-mapToolbar"><span>${escapeHtml(uiText('architecture.layers', 'Capas'))}</span>${layers.map(layer => `<button type="button" class="ed-arch-layerBtn" data-map-layer="${escapeHtml(layer.id)}" data-relation-types="${escapeHtml((Array.isArray(layer.tiposRelacion)?layer.tiposRelacion:[]).join(','))}" aria-pressed="${layer.visiblePorDefecto!==false}">${escapeHtml(layer.titulo || layer.id)}</button>`).join('')}</div>` : '';
  const typeSet=[...new Set(edges.map(edge=>edge.type).filter(Boolean))];
  const legendItems=Array.isArray(module.leyenda?.items) && module.leyenda.items.length ? module.leyenda.items : typeSet.map(type => ({ tipo:type, etiqueta:type.charAt(0).toUpperCase()+type.slice(1) }));
  const showLegend=module.leyenda?.visible===true || config.mostrarLeyenda===true || (module.leyenda?.visible!==false && config.mostrarLeyenda!==false && typeSet.length>1);
  const legend=showLegend ? `<div class="ed-arch-mapLegend">${legendItems.map(item => `<span><i class="is-${safeClass(item.tipo)}"></i>${escapeHtml(item.etiqueta || item.tipo)}</span>`).join('')}</div>` : '';
  return `<div class="ed-arch-mapVisual">${layerToolbar}<div class="ed-arch-map" data-label-mode="${labelMode}" data-mobile-mode="${escapeHtml(config.modoMovil || 'zoom')}" data-avoid-overlap="${config.evitarSolapamientos!==false}" data-node-gap="${Math.max(0,Math.min(80,Number(config.separacionNodos)||16))}" style="--map-rows:${maxRows};--map-min-height:${mapMinHeight}px">${zones}<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="group" aria-label="${escapeHtml(uiText('architecture.mapRelationships', 'Relaciones del mapa conceptual'))}"><defs><marker id="${markerId}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1L11 6L1 11Z"></path></marker></defs>${edgeMarkup}</svg>${labels}${nodes.map((node,index) => { const id=String(node.id || index),p=positions.get(id); const role=safeClass(node.rolVisual,'principal'),size=safeClass(node.tamano,'medio'),isCenter=id===centerId || role==='nucleo'; return `<article tabindex="0" class="${isCenter ? 'is-center ' : ''}is-role-${role} is-size-${size}" data-arch-node="${escapeHtml(id)}" data-arch-column="${p.column}" data-base-x="${p.x}" data-base-y="${p.y}" data-node-title="${escapeHtml(specialItemTitle(node))}" data-node-description="${escapeHtml(specialItemText(node))}" data-zone="${escapeHtml(node.zona || '')}" style="left:${p.x}%;top:${p.y}%"><span>${String(index + 1).padStart(2,'0')}</span><h4>${escapeHtml(specialItemTitle(node))}</h4></article>`; }).join('')}</div>${legend}
  <aside class="ed-arch-mapReader" hidden><span>${escapeHtml(uiText('architecture.reading', 'Lectura'))}</span><div><h5></h5><p></p></div></aside><div class="ed-arch-mapNotes">${nodes.map((node,index) => `<details${index===0 ? ' open' : ''}><summary><span>${String(index + 1).padStart(2,'0')}</span>${escapeHtml(specialItemTitle(node))}<i>+</i></summary>${specialItemText(node) ? `<p>${escapeHtml(specialItemText(node))}</p>` : ''}</details>`).join('')}</div></div>`;
}

function renderSpecialMatrix(data){
  const cfg = Array.isArray(data) ? { filas:data } : data;
  const columns = Array.isArray(cfg.columnas) ? cfg.columnas : [];
  const rows = Array.isArray(cfg.filas) ? cfg.filas : [];
  return `<div class="ed-arch-matrixWrap"><table class="ed-arch-matrix"><thead><tr><th></th>${columns.map(col => `<th>${escapeHtml(specialItemTitle(col, String(col)))}</th>`).join('')}</tr></thead><tbody>${rows.map(row => {
    const cells = Array.isArray(row.celdas) ? row.celdas : [];
    return `<tr><th>${escapeHtml(specialItemTitle(row))}</th>${columns.map((_,i) => { const cell=cells[i] || {}; return `<td>${cell.titulo ? `<strong>${escapeHtml(cell.titulo)}</strong>` : ''}${specialItemText(cell) ? `<span>${escapeHtml(specialItemText(cell))}</span>` : ''}</td>`; }).join('')}</tr>`;
  }).join('')}</tbody></table></div>`;
}

function renderSpecialTimeline(data){
  return `<ol class="ed-arch-timeline">${data.map((item,index) => `<li><span class="ed-arch-time">${escapeHtml(String(item.fecha || item.year || item.periodo || index + 1))}</span><div><h4>${escapeHtml(specialItemTitle(item))}</h4>${specialItemText(item) ? `<p>${escapeHtml(specialItemText(item))}</p>` : ''}</div></li>`).join('')}</ol>`;
}

function renderSpecialTreeNode(node, depth = 0, branch = null){
  if (!node || typeof node !== 'object') return '';
  const children = Array.isArray(node.opciones) ? node.opciones : (Array.isArray(node.hijos) ? node.hijos : []);
  const targetOf=(child) => {
    const nested=child && typeof child==='object' ? (child.nodo || child.siguiente || child.destino || child.hijo) : null;
    return nested && typeof nested==='object' ? nested : child;
  };
  const countLeaves=(candidate,remaining=8) => {
    if(!candidate || typeof candidate!=='object' || remaining<=0) return 1;
    const descendants=Array.isArray(candidate.opciones) ? candidate.opciones : (Array.isArray(candidate.hijos) ? candidate.hijos : []);
    return descendants.length ? descendants.reduce((sum,child)=>sum+countLeaves(targetOf(child),remaining-1),0) : 1;
  };
  const normalizeBranch=(child,index,total) => {
    const nested=child && typeof child==='object' ? (child.nodo || child.siguiente || child.destino || child.hijo) : null;
    const target=targetOf(child);
    let label=String(child?.respuesta || child?.condicion || child?.opcion || child?.etiquetaRama || child?.rama || child?.etiqueta || '').trim();
    if(!label && total===2) label=index===0 ? uiText('common.yes', 'Sí') : uiText('common.no', 'No');
    if(!label) label=uiText('architecture.option', 'Opción {number}', { number:index + 1 });
    const normalized=label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const tone=/^(si|yes|verdadero|presente|cumple)$/.test(normalized) ? 'yes' : (/^(no|false|falso|ausente|no cumple)$/.test(normalized) ? 'no' : 'neutral');
    return {target,label,tone};
  };
  const branches=children.map((child,index) => normalizeBranch(child,index,children.length));
  const leafCounts=branches.map(item=>countLeaves(item.target,8-depth));
  const leafCount=Math.max(1,leafCounts.reduce((sum,count)=>sum+count,0));
  const busLeft=branches.length ? leafCounts[0]/(leafCount*2)*100 : 50;
  const busRight=branches.length ? leafCounts[leafCounts.length-1]/(leafCount*2)*100 : 50;
  const branchClass=branch ? ` is-branch-${branch.tone}` : '';
  return `<li class="${branchClass.trim()}" data-tree-depth="${depth}" style="--leaf-count:${leafCount}">${branch ? `<span class="ed-arch-branchLabel">${escapeHtml(branch.label)}</span>` : ''}<article><p class="ed-arch-overline">${escapeHtml(String(node.tipo || (children.length ? uiText('architecture.question', 'Pregunta') : uiText('architecture.result', 'Resultado'))))}</p><h4>${escapeHtml(String(node.pregunta || node.resultado || specialItemTitle(node)))}</h4>${specialItemText(node) ? `<p>${escapeHtml(specialItemText(node))}</p>` : ''}</article>${branches.length && depth < 8 ? `<ul style="--branch-count:${branches.length};--bus-left:${busLeft.toFixed(3)}%;--bus-right:${busRight.toFixed(3)}%">${branches.map(item => renderSpecialTreeNode(item.target,depth+1,item)).join('')}</ul>` : ''}</li>`;
}

function renderSpecialDecisionTree(data){
  const roots = Array.isArray(data) ? data : [data];
  return `<div class="ed-arch-tree"><ul>${roots.map(node => renderSpecialTreeNode(node)).join('')}</ul></div>`;
}

function renderSpecialContinuum(data){
  const cfg = Array.isArray(data) ? { posiciones:data } : data;
  const points = Array.isArray(cfg.posiciones) ? cfg.posiciones : [];
  return `<div class="ed-arch-continuum"><div class="ed-arch-poles"><strong>${escapeHtml(String(cfg.extremoIzquierdo || uiText('architecture.initialPole', 'Polo inicial')))}</strong><strong>${escapeHtml(String(cfg.extremoDerecho || uiText('architecture.finalPole', 'Polo final')))}</strong></div><div class="ed-arch-scale">${points.map((point,index) => {
    const position = Math.max(0,Math.min(100,Number(point.posicion ?? (points.length > 1 ? index*100/(points.length-1) : 50))));
    return `<article style="left:${position}%"><span></span><h4>${escapeHtml(specialItemTitle(point))}</h4>${specialItemText(point) ? `<p>${escapeHtml(specialItemText(point))}</p>` : ''}</article>`;
  }).join('')}${Number.isFinite(Number(cfg.marcador)) ? `<i class="ed-arch-marker" style="left:${Math.max(0,Math.min(100,Number(cfg.marcador)))}%"></i>` : ''}</div></div>`;
}

const GENO_CATEGORY_INFO = {
  pareja: { label:'Pareja / conyugal', meaning:'Vínculo de pareja: matrimonio o unión estable (línea continua), convivencia o compromiso (discontinua). Una marca cruzada indica separación; dos, divorcio.' },
  parental: { label:'Filiación parento-filial', meaning:'Vínculo de padre/madre a hijo/a: biológico (línea continua), adoptivo (discontinua) o de acogida (punteada).' },
  alianza: { label:'Alianza', meaning:'Cercanía o coalición funcional entre dos miembros, a menudo frente a un tercero.' },
  cercania: { label:'Relación cercana', meaning:'Vínculo cálido y conectado, cada persona conserva su espacio propio. Se dibuja como línea doble.' },
  fusion: { label:'Fusión / enmarañamiento', meaning:'Vínculo de límites difusos: el bienestar de una persona depende de la otra. Se dibuja como línea triple.' },
  distancia: { label:'Distancia emocional', meaning:'Contacto limitado, desinvestido o indiferente. Línea discontinua.' },
  corte: { label:'Corte de relación', meaning:'Ruptura deliberada del contacto entre dos personas. Línea con un corte y dos marcas transversales.' },
  tension: { label:'Tensión', meaning:'Fricción latente o desacuerdo no resuelto, sin llegar al conflicto abierto. Línea quebrada suave.' },
  conflicto: { label:'Conflicto', meaning:'Desacuerdo activo y recurrente. Línea en zigzag.' },
  hostil: { label:'Hostilidad / violencia', meaning:'Antagonismo sostenido o violencia entre los miembros. Zigzag marcado y más grueso.' },
  abuso: { label:'Abuso', meaning:'Daño físico, emocional o sexual de una persona hacia otra. Zigzag con flecha señalando a quien lo recibe.' },
  anotacion: { label:'Anotación clínica', meaning:'Flecha de lectura clínica: hipótesis, foco de intervención o función relacional observada.' },
  relacion: { label:'Relación', meaning:'Vínculo sin tipificar.' }
};

function getGenoCategoryInfo(type){
  const info = GENO_CATEGORY_INFO[type] || { label:type, meaning:'' };
  return {
    label:uiText(`genogram.category.${type}`, info.label),
    meaning:uiText(`genogram.category.${type}.meaning`, info.meaning)
  };
}

function classifyGenoEdgeKind(kind, isArrowDefault){
  const k = String(kind || '');
  let category = 'relacion';
  if(/abuso/.test(k)) category='abuso';
  else if(/violencia|hostil/.test(k)) category='hostil';
  else if(/conflicto/.test(k)) category='conflicto';
  else if(/tension/.test(k)) category='tension';
  else if(/corte|cutoff|ruptura|estrang/.test(k)) category='corte';
  else if(/fusion|enmaranad|enmesh|muycercan/.test(k)) category='fusion';
  else if(/cercan/.test(k)) category='cercania';
  else if(/distan/.test(k)) category='distancia';
  else if(/alianza/.test(k)) category='alianza';
  else if(/pareja|conyugal|matrimonial|conviv|esposos|union|compromiso|noviazgo|separacion|divorcio|viud/.test(k)) category='pareja';
  else if(/parental|filiacion|biologic|adoptiv|adopcion|acogida|foster/.test(k)) category='parental';
  else if(isArrowDefault) category='anotacion';
  const closeness = category==='fusion' ? 2 : (category==='cercania' ? 1 : 0);
  const conflictIntensity = category==='abuso' ? 2.2 : category==='hostil' ? 1.8 : category==='conflicto' ? 1.3 : category==='tension' ? .7 : 0;
  const slashes = /divorcio/.test(k) ? 2 : (/separacion/.test(k) ? 1 : 0);
  const dashStyle = /adoptiv|adopcion/.test(k) ? 'dashed' : (/acogida|foster/.test(k) ? 'dotted' : ((/conviv|compromiso|noviazgo/.test(k) || category==='distancia') ? 'dashed' : 'solid'));
  return {
    category,
    isCouple: category==='pareja',
    isParental: category==='parental',
    isCutoff: category==='corte',
    closeness, conflictIntensity, slashes, dashStyle,
    forceArrow: category==='abuso'
  };
}

function renderSpecialGenogram(data){
  const cfg = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const people = (Array.isArray(cfg.personas) ? cfg.personas : (Array.isArray(cfg.nodos) ? cfg.nodos : [])).filter(Boolean);
  const relations = (Array.isArray(cfg.relaciones) ? cfg.relaciones : []).filter(Boolean);
  const boxes = (Array.isArray(cfg.recuadros) ? cfg.recuadros : (Array.isArray(cfg.anotaciones) ? cfg.anotaciones : (Array.isArray(cfg.cajas) ? cfg.cajas : []))).filter(Boolean);
  const arrows = (Array.isArray(cfg.flechas) ? cfg.flechas : []).filter(Boolean);
  const clamp = (value,min,max,fallback) => Number.isFinite(Number(value)) ? Math.max(min,Math.min(max,Number(value))) : fallback;
  const safeClass = (value,fallback='relacion') => String(value || fallback).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-');
  const measuredBoxes = boxes.map((box,index) => {
    const width=clamp(box.ancho,18,34,24);
    const charsPerLine=Math.max(25,Math.round(width*1.75));
    const title=String(box.titulo || box.id || uiText('architecture.box', 'Recuadro {number}', { number:index + 1 }));
    const body=String(box.texto || box.descripcion || '');
    const estimatedHeight=58 + Math.ceil(title.length/(charsPerLine*.82))*20 + Math.ceil(body.length/charsPerLine)*18;
    return { box,index,width,estimatedHeight:clamp(estimatedHeight,104,260,140) };
  });
  const requestedHeight=clamp(cfg.altura,560,1100,700);
  const requiredHeight=measuredBoxes.reduce((sum,item)=>sum+item.estimatedHeight,0) + Math.max(0,measuredBoxes.length-1)*18 + 76;
  const stageHeight=Math.max(requestedHeight,requiredHeight);
  const positions = new Map();
  people.forEach((person,index) => {
    const sex=safeClass(person.sexo || person.genero,'otro');
    const shape = (sex==='mujer'||sex==='femenino') ? 'ellipse' : ((sex==='otro'||sex==='no-binario') ? 'diamond' : 'rect');
    positions.set(String(person.id || `persona-${index+1}`), {
      x:clamp(person.x,5,95,15 + (index%4)*23), y:clamp(person.y,7,93,18 + Math.floor(index/4)*28), kind:'person', shape
    });
  });
  const arrangedBoxes=measuredBoxes.map((item) => {
    const halfH=item.estimatedHeight/stageHeight*50;
    return {...item,halfH,desiredY:clamp(item.box.y,halfH+4,96-halfH,16+item.index*28)};
  }).sort((a,b)=>a.desiredY-b.desiredY);
  let cursor=4;
  const gap=18/stageHeight*100;
  arrangedBoxes.forEach((item) => {
    item.y=Math.max(item.desiredY,cursor+item.halfH);
    cursor=item.y+item.halfH+gap;
  });
  const excess=Math.max(0,cursor-gap-96);
  arrangedBoxes.forEach((item) => {
    item.y-=excess;
    const halfW=item.width/2;
    const x=clamp(item.box.x,halfW+2,98-halfW,80);
    positions.set(String(item.box.id || `recuadro-${item.index+1}`), {x,y:item.y,kind:'box',shape:'rect'});
  });
  const markerId = `ed-geno-arrow-${String(people[0]?.id || boxes[0]?.id || 'genograma').replace(/[^a-z0-9_-]/gi,'')}`;
  const edgeRow = (edge,index,isArrow) => {
    const fromId=String(edge.desde || edge.origen || edge.source || ''), toId=String(edge.hasta || edge.destino || edge.target || '');
    if(!positions.has(fromId) || !positions.has(toId) || fromId===toId) return '';
    const rawKind=String(edge.tipo || (isArrow ? 'anotacion' : 'relacion'));
    const kind=safeClass(rawKind, isArrow ? 'anotacion' : 'relacion');
    const flags=classifyGenoEdgeKind(kind, isArrow);
    const bidireccional = String(edge.direccion||'').toLowerCase().includes('bidirecc') || edge.bidireccional===true;
    const showArrow = isArrow || edge.flecha===true || bidireccional || flags.forceArrow;
    const label=String(edge.etiqueta || edge.texto || '').trim();
    const extras=[];
    for(let e=0;e<flags.closeness;e++){
      extras.push(`<path class="ed-geno-edge is-${flags.category}${isArrow ? ' is-arrow' : ''} is-echo" data-edge-index="${index}" data-edge-role="echo" data-echo-index="${e}" d="M0 0"></path>`);
    }
    for(let s=0;s<flags.slashes;s++){
      extras.push(`<line class="ed-geno-edgeSlash" data-edge-index="${index}" data-edge-role="slash" data-slash-index="${s}" x1="0" y1="0" x2="0" y2="0"></line>`);
    }
    if(flags.isCutoff){
      extras.push(`<line class="ed-geno-edgeTick" data-edge-index="${index}" data-edge-role="tick" data-tick-index="0" x1="0" y1="0" x2="0" y2="0"></line>`);
      extras.push(`<line class="ed-geno-edgeTick" data-edge-index="${index}" data-edge-role="tick" data-tick-index="1" x1="0" y1="0" x2="0" y2="0"></line>`);
    }
    return `<circle class="ed-geno-edgeDot" data-edge-dot="${index}" cx="0" cy="0" r="3"></circle><path class="ed-geno-edgeHit" data-edge-hit="${index}" d="M0 0"></path><path tabindex="0" class="ed-geno-edge is-${flags.category}${isArrow ? ' is-arrow' : ''}" data-edge-index="${index}" data-edge-id="ed-geno-edge-${index}" data-edge-from="${escapeHtml(fromId)}" data-edge-to="${escapeHtml(toId)}" data-edge-category="${flags.category}" data-edge-dash="${flags.dashStyle}" data-edge-conflict="${flags.conflictIntensity}" data-edge-cutoff="${flags.isCutoff}" data-label-position="${safeClass(edge.posicionEtiqueta,'centro')}" data-relation-title="${escapeHtml(label || rawKind)}" data-relation-description="${escapeHtml(String(edge.descripcion || edge.nota || ''))}" d="M0 0"${bidireccional ? ` marker-start="url(#${markerId})"` : ''}${showArrow ? ` marker-end="url(#${markerId})"` : ''}></path>${extras.join('')}`;
  };
  const edgeMarkup=[...relations.map((edge,index) => edgeRow(edge,index,false)),...arrows.map((edge,index) => edgeRow(edge,relations.length+index,true))].join('');
  const labels=[...relations.map((edge,index) => ({edge,index})),...arrows.map((edge,index) => ({edge,index:relations.length+index}))]
    .map(({edge,index}) => {
      const text=String(edge.etiqueta || edge.texto || '').trim();
      const fromId=String(edge.desde || edge.origen || edge.source || ''), toId=String(edge.hasta || edge.destino || edge.target || '');
      if(!text || !positions.has(fromId) || !positions.has(toId)) return '';
      return `<button type="button" class="ed-geno-edgeLabel" data-edge-label="${index}" data-edge-id="ed-geno-edge-${index}">${escapeHtml(text)}</button>`;
    }).join('');
  const typeSet=[...new Set([
    ...relations.map(edge => classifyGenoEdgeKind(safeClass(edge.tipo,'relacion'), false).category),
    ...arrows.map(edge => classifyGenoEdgeKind(safeClass(edge.tipo,'anotacion'), true).category)
  ])];
  const relationLegend = typeSet.length ? `<div class="ed-geno-legendRelations">${typeSet.map(type => { const info=getGenoCategoryInfo(type); return `<span title="${escapeHtml(info.meaning)}"><i class="is-${type}"></i>${escapeHtml(info.label)}</span>`; }).join('')}</div>` : '';
  return `<div class="ed-geno-shell"><div class="ed-geno-stage${boxes.length ? ' has-notes' : ''}" style="--geno-height:${stageHeight}px">
    <svg aria-hidden="true"><defs><marker id="${markerId}" viewBox="0 0 8 8" refX="6.6" refY="4" markerWidth="7.5" markerHeight="7.5" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0.5 0.5L7.5 4L0.5 7.5Z"></path></marker></defs>${edgeMarkup}</svg>
    ${labels}
    ${people.map((person,index) => { const id=String(person.id || `persona-${index+1}`), p=positions.get(id), sex=safeClass(person.sexo || person.genero,'otro'), title=String(person.nombre || person.titulo || id), desc=String(person.descripcion || person.nota || ''); return `<article tabindex="0" class="ed-geno-person is-${sex}${person.fallecido ? ' is-deceased' : ''}${person.identificado || person.pacienteIdentificado ? ' is-index' : ''}" data-geno-node="${escapeHtml(id)}" data-geno-shape="${p.shape}" data-node-title="${escapeHtml(title)}" data-node-description="${escapeHtml(desc)}" style="left:${p.x}%;top:${p.y}%" title="${escapeHtml(desc)}"><span class="ed-geno-symbol" aria-hidden="true"></span><h4>${escapeHtml(title)}</h4>${person.fecha || person.year ? `<p>${escapeHtml(String(person.fecha || person.year))}</p>` : ''}</article>`; }).join('')}
    ${measuredBoxes.map(({box,index,width}) => { const id=String(box.id || `recuadro-${index+1}`), p=positions.get(id), title=String(box.titulo || id), body=String(box.texto || box.descripcion || ''); return `<article tabindex="0" class="ed-geno-box" data-geno-node="${escapeHtml(id)}" data-geno-shape="rect" data-node-title="${escapeHtml(title)}" data-node-description="${escapeHtml(body)}" style="left:${p.x}%;top:${p.y}%;width:${width}%"><p class="ed-arch-overline">${escapeHtml(box.etiqueta || uiText('architecture.reading', 'Lectura'))}</p><h4>${escapeHtml(title)}</h4>${body ? `<p>${escapeHtml(body)}</p>` : ''}</article>`; }).join('')}
  </div>
  <aside class="ed-geno-reader" hidden><span>${escapeHtml(uiText('architecture.reading', 'Lectura'))}</span><div><h5></h5><p></p></div></aside>
  <div class="ed-geno-legend"><span><i class="is-hombre"></i>${escapeHtml(uiText('genogram.man', 'Hombre'))}</span><span><i class="is-mujer"></i>${escapeHtml(uiText('genogram.woman', 'Mujer'))}</span><span><i class="is-otro"></i>${escapeHtml(uiText('genogram.other', 'Otro / no especificado'))}</span><span><b></b>${escapeHtml(uiText('genogram.identifiedPerson', 'Persona identificada'))}</span></div>
  ${relationLegend}</div>`;
}

function renderUnknownSpecialModule(module){
  let serialized = '';
  try{ serialized = JSON.stringify(module.datos, null, 2); }catch(e){ serialized = String(module.datos ?? ''); }
  return `<div class="ed-arch-unknown"><p>${escapeHtml(uiText('architecture.unknownType', 'Tipo no reconocido'))}: <code>${escapeHtml(module.tipo || uiText('architecture.noType', 'sin tipo'))}</code></p><pre>${escapeHtml(serialized)}</pre></div>`;
}

function renderSpecialModuleContent(module){
  const data = module.datos;
  if (!SPECIAL_MODULE_TYPES.has(module.tipo)) return renderUnknownSpecialModule(module);
  if (module.tipo === 'matriz') return renderSpecialMatrix(data);
  if (module.tipo === 'arbolDecision') return renderSpecialDecisionTree(data);
  if (module.tipo === 'continuo') return renderSpecialContinuum(data);
  if (module.tipo === 'genograma') return renderSpecialGenogram(data);
  const list = Array.isArray(data) ? data.filter(Boolean) : [];
  if (module.tipo === 'taxonomia') return renderSpecialTaxonomy(list);
  if (module.tipo === 'jerarquia') return renderSpecialHierarchy(list);
  if (module.tipo === 'ciclo') return renderSpecialCycle(list);
  if (module.tipo === 'mapa') return renderSpecialMap(module);
  if (module.tipo === 'lineaTiempo') return renderSpecialTimeline(list);
  return renderUnknownSpecialModule(module);
}

function ArquitecturaModelo(model){
  const modules = getSpecialModelModules(model);
  if (!modules.length) return '';
  const tabs = modules.length > 1 ? `<div class="ed-arch-tabsNav"><button class="ed-arch-tabsArrow" type="button" data-arch-scroll="-1" aria-label="${escapeHtml(uiText('architecture.previousModules', 'Módulos anteriores'))}">&larr;</button><div class="ed-arch-tabs" role="tablist">${modules.map((module,index) => `<button type="button" role="tab" aria-selected="${index===0}" data-arch-tab="${escapeHtml(module.id)}">${escapeHtml(module.titulo)}</button>`).join('')}</div><button class="ed-arch-tabsArrow" type="button" data-arch-scroll="1" aria-label="${escapeHtml(uiText('architecture.nextModules', 'Módulos siguientes'))}">&rarr;</button></div>` : '';
  return `<section class="ed-chapter ed-architecture" id="ed-section-architecture" data-smh-section data-smh-label="${escapeHtml(uiText('architecture.label', 'Arquitectura'))}" data-smh-unnumbered>
    <header class="ed-arch-head"><p class="ed-chap-kicker">${escapeHtml(uiText('architecture.kicker', 'Estructura conceptual'))}</p><h2>${escapeHtml(uiText('architecture.title', 'Arquitectura del modelo'))}</h2><p>${escapeHtml(uiText('architecture.description', 'Una lectura visual de la organización interna que distingue a este modelo.'))}</p></header>
    ${tabs}<div class="ed-arch-panels">${modules.map((module,index) => `<article class="ed-arch-module" data-arch-panel="${escapeHtml(module.id)}"${index ? ' hidden' : ''}><header><p class="ed-arch-type">${escapeHtml(module.tipo || uiText('architecture.module', 'módulo'))}</p><h3>${escapeHtml(module.titulo)}</h3>${module.descripcion ? `<p>${escapeHtml(module.descripcion)}</p>` : ''}</header>${renderSpecialModuleContent(module)}${module.fuente ? `<footer><span>${escapeHtml(uiText('architecture.source', 'Fuente'))}</span>${escapeHtml(module.fuente)}</footer>` : ''}</article>`).join('')}</div>
  </section>`;
}

function syncSpecialMapEdges(scope){
  (scope?.matches?.('.ed-arch-map') ? [scope] : [...(scope?.querySelectorAll?.('.ed-arch-map') || [])]).forEach((map) => {
    if (!map.offsetWidth || !map.offsetHeight) return;
    const svg=map.querySelector(':scope > svg'), mapRect=map.getBoundingClientRect();
    if (!svg || !mapRect.width || !mapRect.height) return;
    const nodeElements=[...map.querySelectorAll('[data-arch-node]')];
    nodeElements.forEach(node => {
      if(node.dataset.baseX) node.style.left=`${node.dataset.baseX}%`;
      if(node.dataset.baseY) node.style.top=`${node.dataset.baseY}%`;
    });
    const zoneHeaders=new Map([...map.querySelectorAll('[data-arch-zone]')].map(zone => {
      const zoneRect=zone.getBoundingClientRect(),textElements=[...zone.querySelectorAll(':scope > strong,:scope > small')];
      const headerBottom=Math.max(zoneRect.top+15,...textElements.map(item=>item.getBoundingClientRect().bottom))-mapRect.top;
      return [zone.dataset.archZone,{ left:zoneRect.left-mapRect.left, right:zoneRect.right-mapRect.left, top:zoneRect.top-mapRect.top, headerBottom, bottom:zoneRect.bottom-mapRect.top }];
    }));
    const resolveNodeZone=(node) => {
      const explicit=node.dataset.zone ? zoneHeaders.get(node.dataset.zone) : null;
      if(explicit) return explicit;
      const rect=node.getBoundingClientRect(),x=(rect.left+rect.right)/2-mapRect.left,y=(rect.top+rect.bottom)/2-mapRect.top;
      return [...zoneHeaders.values()].filter(zone => x>=zone.left&&x<=zone.right&&y>=zone.top&&y<=zone.bottom).sort((a,b)=>(a.right-a.left)*(a.bottom-a.top)-(b.right-b.left)*(b.bottom-b.top))[0];
    };
    nodeElements.forEach(node => {
      const zone=resolveNodeZone(node);
      if(!zone) return;
      const rect=node.getBoundingClientRect(),top=rect.top-mapRect.top;
      if(top<zone.headerBottom+16){
        const desired=Math.min(zone.bottom-rect.height/2-14,zone.headerBottom+16+rect.height/2);
        node.style.top=`${Math.max(rect.height/2+14,desired)}px`;
      }
    });
    if(map.dataset.avoidOverlap!=='false' && nodeElements.length>1){
      const gap=Math.max(0,Number(map.dataset.nodeGap)||16);
      const states=nodeElements.map((element) => {
        const rect=element.getBoundingClientRect(),zone=resolveNodeZone(element);
        const width=rect.width,height=rect.height;
        const bounds={left:(zone?.left??0)+width/2+12,right:(zone?.right??mapRect.width)-width/2-12,top:(zone?.headerBottom??0)+height/2+(zone?16:12),bottom:(zone?.bottom??mapRect.height)-height/2-12};
        if(bounds.left>bounds.right){ const middle=(bounds.left+bounds.right)/2; bounds.left=middle; bounds.right=middle; }
        if(bounds.top>bounds.bottom){ const middle=(bounds.top+bounds.bottom)/2; bounds.top=middle; bounds.bottom=middle; }
        return {element,width,height,x:(rect.left+rect.right)/2-mapRect.left,y:(rect.top+rect.bottom)/2-mapRect.top,bounds};
      });
      const clampState=(state) => {
        state.x=Math.max(state.bounds.left,Math.min(state.bounds.right,state.x));
        state.y=Math.max(state.bounds.top,Math.min(state.bounds.bottom,state.y));
      };
      states.forEach(clampState);
      for(let pass=0;pass<12;pass++){
        let changed=false;
        for(let i=0;i<states.length;i++) for(let j=i+1;j<states.length;j++){
          const a=states[i],b=states[j];
          const overlapX=(a.width+b.width)/2+gap-Math.abs(b.x-a.x);
          const overlapY=(a.height+b.height)/2+gap-Math.abs(b.y-a.y);
          if(overlapX<=0 || overlapY<=0) continue;
          changed=true;
          if(overlapX<overlapY){
            const direction=b.x>=a.x?1:-1,shift=overlapX/2+.5;
            a.x-=direction*shift; b.x+=direction*shift;
          }else{
            const direction=b.y>=a.y?1:-1,shift=overlapY/2+.5;
            a.y-=direction*shift; b.y+=direction*shift;
          }
          clampState(a); clampState(b);
        }
        if(!changed) break;
      }
      states.forEach(state => { state.element.style.left=`${state.x}px`; state.element.style.top=`${state.y}px`; });
    }
    const nodes=new Map([...map.querySelectorAll('[data-arch-node]')].map((node) => {
      const rect=node.getBoundingClientRect();
      return [node.dataset.archNode,{ left:rect.left-mapRect.left, right:rect.right-mapRect.left, top:rect.top-mapRect.top, bottom:rect.bottom-mapRect.top, x:(rect.left+rect.right)/2-mapRect.left, y:(rect.top+rect.bottom)/2-mapRect.top, column:Number(node.dataset.archColumn)||0 }];
    }));
    svg.setAttribute('viewBox',`0 0 ${mapRect.width} ${mapRect.height}`);
    svg.setAttribute('preserveAspectRatio','none');
    const paths=[...svg.querySelectorAll('[data-edge-from]')], placedLabels=[];
    const portPoint=(node,port,other,gap=8) => {
      let side=port;
      if(!side || side==='auto'){
        const dx=other.x-node.x,dy=other.y-node.y;
        side=Math.abs(dx)>=Math.abs(dy)*.72 ? (dx>=0?'derecha':'izquierda') : (dy>=0?'abajo':'arriba');
      }
      if(side==='izquierda') return { x:node.left-gap,y:node.y,side };
      if(side==='derecha') return { x:node.right+gap,y:node.y,side };
      if(side==='arriba') return { x:node.x,y:node.top-gap,side };
      return { x:node.x,y:node.bottom+gap,side:'abajo' };
    };
    paths.forEach((path,index) => {
      const a=nodes.get(path.dataset.edgeFrom), b=nodes.get(path.dataset.edgeTo);
      if (!a || !b) return;
      const start=portPoint(a,path.dataset.sourcePort,b),end=portPoint(b,path.dataset.targetPort,a);
      const siblings=paths.filter(item => [item.dataset.edgeFrom,item.dataset.edgeTo].sort().join('::')===[path.dataset.edgeFrom,path.dataset.edgeTo].sort().join('::'));
      const siblingIndex=siblings.indexOf(path),parallelOffset=(siblingIndex-(siblings.length-1)/2)*14;
      let d;
      if(path.dataset.trace==='recto'){
        d=`M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      }else if(path.dataset.trace==='curvo'){
        const mx=(start.x+end.x)/2,my=(start.y+end.y)/2,dx=end.x-start.x,dy=end.y-start.y,length=Math.max(1,Math.hypot(dx,dy));
        const bend=(siblings.length>1?parallelOffset:(index%2?18:-18));
        d=`M ${start.x} ${start.y} Q ${mx-dy/length*bend} ${my+dx/length*bend} ${end.x} ${end.y}`;
      } else {
        const sourceHorizontal=['izquierda','derecha'].includes(start.side),targetHorizontal=['izquierda','derecha'].includes(end.side);
        if(sourceHorizontal && targetHorizontal){
          const middle=(start.x+end.x)/2+parallelOffset;
          d=`M ${start.x} ${start.y} H ${middle} V ${end.y} H ${end.x}`;
        }else if(!sourceHorizontal && !targetHorizontal){
          const middle=(start.y+end.y)/2+parallelOffset;
          d=`M ${start.x} ${start.y} V ${middle} H ${end.x} V ${end.y}`;
        }else if(sourceHorizontal){
          d=`M ${start.x} ${start.y} H ${end.x+parallelOffset} V ${end.y}`;
        } else {
          d=`M ${start.x} ${start.y} V ${end.y+parallelOffset} H ${end.x}`;
        }
      }
      path.setAttribute('d',d);
      svg.querySelector(`[data-edge-hit="${path.dataset.edgeIndex}"]`)?.setAttribute('d',d);
      const dot=svg.querySelector(`[data-edge-dot="${path.dataset.edgeIndex}"]`);
      if (dot){ dot.setAttribute('cx',start.x); dot.setAttribute('cy',start.y); dot.setAttribute('r','4'); }
      const label=map.querySelector(`[data-edge-label="${path.dataset.edgeIndex}"]`);
      if(label && typeof path.getTotalLength==='function'){
        const length=Math.max(1,path.getTotalLength());
        const preferred=path.dataset.labelPosition==='inicio' ? .25 : (path.dataset.labelPosition==='final' ? .75 : .5);
        const ratios=[preferred,preferred-.12,preferred+.12,preferred-.22,preferred+.22].map(value=>Math.max(.1,Math.min(.9,value)));
        const offsets=[0,14,-14,27,-27];
        const labelWidth=label.offsetWidth || Math.min(190,Math.max(62,label.textContent.trim().length*5.8+18));
        const labelHeight=label.offsetHeight || (label.textContent.length>26?31:23);
        const overlapArea=(a,b) => Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
        let best=null;
        ratios.forEach((ratio,ratioIndex) => offsets.forEach((offset,offsetIndex) => {
          const at=length*ratio,point=path.getPointAtLength(at),before=path.getPointAtLength(Math.max(0,at-4)),after=path.getPointAtLength(Math.min(length,at+4));
          const dx=after.x-before.x,dy=after.y-before.y,tangentLength=Math.max(1,Math.hypot(dx,dy));
          let angle=Math.atan2(dy,dx)*180/Math.PI;
          if(angle>90) angle-=180; if(angle<-90) angle+=180;
          const orientation=label.dataset.labelOrientation || 'auto';
          const alignToLine=orientation==='linea' || (orientation==='auto' && path.dataset.trace!=='ortogonal' && Math.abs(angle)<=58);
          if(!alignToLine) angle=0;
          const x=point.x+(-dy/tangentLength)*offset,y=point.y+(dx/tangentLength)*offset;
          const radians=Math.abs(angle)*Math.PI/180;
          const boxWidth=Math.abs(labelWidth*Math.cos(radians))+Math.abs(labelHeight*Math.sin(radians));
          const boxHeight=Math.abs(labelWidth*Math.sin(radians))+Math.abs(labelHeight*Math.cos(radians));
          const rect={left:x-boxWidth/2-4,right:x+boxWidth/2+4,top:y-boxHeight/2-3,bottom:y+boxHeight/2+3};
          const nodePenalty=[...nodes.values()].reduce((sum,node)=>sum+overlapArea(rect,{left:node.left-7,right:node.right+7,top:node.top-7,bottom:node.bottom+7})*12,0);
          const labelPenalty=placedLabels.reduce((sum,item)=>sum+overlapArea(rect,item)*18,0);
          const edgePenalty=Math.abs(offset)*.08+ratioIndex*1.4+offsetIndex*.25;
          const score=nodePenalty+labelPenalty+edgePenalty;
          if(!best || score<best.score) best={score,x,y,angle,rect,aligned:alignToLine};
        }));
        if(best){
          placedLabels.push(best.rect);
          label.style.left=`${best.x}px`; label.style.top=`${best.y}px`;
          label.style.setProperty('--label-angle',`${best.angle.toFixed(1)}deg`);
          label.dataset.labelAligned=String(best.aligned);
        }
      }
    });
  });
}

function syncSpecialGenogramEdges(scope){
  (scope?.matches?.('.ed-geno-stage') ? [scope] : [...(scope?.querySelectorAll?.('.ed-geno-stage') || [])]).forEach((stage) => {
    if (!stage.offsetWidth || !stage.offsetHeight) return;
    const svg=stage.querySelector(':scope > svg'), stageRect=stage.getBoundingClientRect();
    if (!svg || !stageRect.width || !stageRect.height) return;
    svg.setAttribute('viewBox',`0 0 ${stageRect.width} ${stageRect.height}`);
    svg.setAttribute('preserveAspectRatio','none');
    const nodes=new Map([...stage.querySelectorAll('[data-geno-node]')].map((element) => {
      const symbol=element.matches('.ed-geno-person') ? element.querySelector('.ed-geno-symbol') : null;
      const rect=(symbol || element).getBoundingClientRect();
      return [element.dataset.genoNode,{
        x:(rect.left+rect.right)/2-stageRect.left, y:(rect.top+rect.bottom)/2-stageRect.top,
        halfW:rect.width/2, halfH:rect.height/2, shape:element.dataset.genoShape || 'rect'
      }];
    }));
    const clipPoint=(node,dx,dy,padding) => {
      if(!dx && !dy) return {x:node.x,y:node.y};
      const halfW=node.halfW+padding, halfH=node.halfH+padding;
      let scale;
      if(node.shape==='ellipse') scale=1/Math.sqrt((dx*dx)/(halfW*halfW)+(dy*dy)/(halfH*halfH));
      else if(node.shape==='diamond') scale=1/(Math.abs(dx)/halfW+Math.abs(dy)/halfH);
      else scale=1/Math.max(Math.abs(dx)/halfW,Math.abs(dy)/halfH);
      return {x:node.x+dx*scale,y:node.y+dy*scale};
    };
    const buildZigzag=(start,end,amplitude) => {
      const dx=end.x-start.x, dy=end.y-start.y, length=Math.max(1,Math.hypot(dx,dy));
      const steps=Math.max(5,Math.min(16,Math.round(length/24)));
      const nx=-dy/length, ny=dx/length;
      let d=`M ${start.x} ${start.y}`;
      for(let i=1;i<steps;i++){
        const t=i/steps, bx=start.x+dx*t, by=start.y+dy*t, sign=(i%2===0)?1:-1;
        d+=` L ${(bx+nx*amplitude*sign).toFixed(2)} ${(by+ny*amplitude*sign).toFixed(2)}`;
      }
      return d+` L ${end.x} ${end.y}`;
    };
    const normalAt=(p0,p1) => { const tdx=p1.x-p0.x, tdy=p1.y-p0.y, tl=Math.max(1,Math.hypot(tdx,tdy)); return {x:-tdy/tl,y:tdx/tl}; };
    const paths=[...svg.querySelectorAll('[data-edge-from]')], placedLabels=[];
    const coupleKeys=new Set(paths.filter(path => path.dataset.edgeCategory==='pareja').map(path => [path.dataset.edgeFrom,path.dataset.edgeTo].sort().join('::')));
    const childParents=new Map();
    paths.filter(path => path.dataset.edgeCategory==='parental').forEach((path) => {
      const childId=path.dataset.edgeTo, parentId=path.dataset.edgeFrom;
      if(!nodes.has(parentId) || !nodes.has(childId)) return;
      if(!childParents.has(childId)) childParents.set(childId,[]);
      childParents.get(childId).push(parentId);
    });
    const familyChildren=new Map();
    childParents.forEach((parents,childId) => {
      const unique=[...new Set(parents)];
      let familyParents=unique.slice(0,1);
      for(let i=0;i<unique.length;i++){
        for(let j=i+1;j<unique.length;j++){
          const key=[unique[i],unique[j]].sort().join('::');
          if(coupleKeys.has(key)) familyParents=[unique[i],unique[j]];
        }
      }
      const familyKey=familyParents.sort().join('::');
      if(!familyChildren.has(familyKey)) familyChildren.set(familyKey,{parents:familyParents,children:[]});
      familyChildren.get(familyKey).children.push(childId);
    });
    const parentalDrawingKeys=new Set();
    const familyLayout=(parentId,childId) => {
      const parents=childParents.get(childId) || [parentId];
      let family=null;
      familyChildren.forEach((candidate,key) => {
        if(candidate.children.includes(childId) && candidate.parents.includes(parentId)) family={key,...candidate};
      });
      if(!family){
        const familyKey=[parentId].join('::');
        family={key:familyKey,parents:[parentId],children:[childId]};
      }
      const parentNodes=family.parents.map(id => nodes.get(id)).filter(Boolean);
      const childNodes=[...new Set(family.children)].map(id => nodes.get(id)).filter(Boolean).sort((a,b)=>a.x-b.x);
      const parentCenterY=parentNodes.reduce((sum,node)=>sum+node.y,0)/Math.max(1,parentNodes.length);
      const parentY=parentNodes.length>1 ? parentCenterY : (parentNodes[0].y+parentNodes[0].halfH+7);
      const parentMidX=parentNodes.length>1 ? (Math.min(...parentNodes.map(node=>node.x))+Math.max(...parentNodes.map(node=>node.x)))/2 : parentNodes[0]?.x;
      const highestChildY=Math.min(...childNodes.map(node=>node.y));
      const busY=Math.max(parentY+34,highestChildY-42);
      return {family,parentMidX,parentY,busY,childNodes};
    };
    const pairCounts=new Map();
    paths.forEach((path) => {
      const key=[path.dataset.edgeFrom,path.dataset.edgeTo].sort().join('::');
      pairCounts.set(key,(pairCounts.get(key)||0)+1);
    });
    const pairSeen=new Map();
    paths.forEach((path) => {
      const a=nodes.get(path.dataset.edgeFrom), b=nodes.get(path.dataset.edgeTo);
      if(!a || !b) return;
      const dx=b.x-a.x, dy=b.y-a.y;
      const category=path.dataset.edgeCategory || 'relacion';
      const isCouple=category==='pareja', isParental=category==='parental';
      const conflictIntensity=Number(path.dataset.edgeConflict)||0;
      const isCutoff=path.dataset.edgeCutoff==='true';
      const key=[path.dataset.edgeFrom,path.dataset.edgeTo].sort().join('::');
      const siblingCount=pairCounts.get(key)||1;
      const seenIndex=pairSeen.get(key)||0; pairSeen.set(key,seenIndex+1);
      const parallelOffset=(seenIndex-(siblingCount-1)/2)*16;
      let start=clipPoint(a,dx,dy,6), end=clipPoint(b,-dx,-dy,9), d;
      path.style.opacity = '';
      path.style.pointerEvents = '';
      if(isCouple){
        start=clipPoint(a,dx,0,6);
        end=clipPoint(b,-dx,0,6);
        const y=(start.y+end.y)/2;
        start={x:start.x,y};
        end={x:end.x,y};
        if(Math.abs(start.y-end.y)<20){
          d=`M ${start.x} ${start.y} L ${end.x} ${end.y}`;
        }else{
          const midY=(start.y+end.y)/2+parallelOffset;
          d=`M ${start.x} ${start.y} V ${midY} H ${end.x} V ${end.y}`;
        }
      }else if(isParental){
        const layout=familyLayout(path.dataset.edgeFrom,path.dataset.edgeTo);
        const drawKey=`${layout.family.key}::${path.dataset.edgeTo}`;
        const familyKey=`${layout.family.key}::family`;
        const childTop=clipPoint(b,0,-1,7);
        start={x:layout.parentMidX,y:layout.parentY};
        end={x:b.x,y:childTop.y};
        if(parentalDrawingKeys.has(drawKey)){
          d=`M ${start.x} ${start.y}`;
          path.style.opacity = '0';
          path.style.pointerEvents = 'none';
        }else if(parentalDrawingKeys.has(familyKey)){
          parentalDrawingKeys.add(drawKey);
          d=`M ${b.x} ${layout.busY} V ${childTop.y}`;
        }else{
          parentalDrawingKeys.add(familyKey);
          parentalDrawingKeys.add(drawKey);
          const xs=layout.childNodes.map(node => node.x);
          const left=Math.min(...xs), right=Math.max(...xs);
          const childDrops=layout.childNodes.map((node) => {
            const top=clipPoint(node,0,-1,7);
            return `M ${node.x} ${layout.busY} V ${top.y}`;
          }).join(' ');
          const bus=layout.childNodes.length>1 ? `M ${left} ${layout.busY} H ${right}` : '';
          d=`M ${layout.parentMidX} ${layout.parentY} V ${layout.busY} ${bus} ${childDrops}`.trim();
        }
      }else{
        const length=Math.max(1,Math.hypot(dx,dy)), px=-dy/length, py=dx/length;
        const baseStart=siblingCount>1 ? {x:start.x+px*parallelOffset,y:start.y+py*parallelOffset} : start;
        const baseEnd=siblingCount>1 ? {x:end.x+px*parallelOffset,y:end.y+py*parallelOffset} : end;
        if(conflictIntensity>0){
          d=buildZigzag(baseStart,baseEnd,4+conflictIntensity*4.5);
        }else{
          const bend=siblingCount>1 ? 0 : ((Number(path.dataset.edgeIndex)%2) ? 22 : -22);
          const mx=(baseStart.x+baseEnd.x)/2+(-dy/length)*bend, my=(baseStart.y+baseEnd.y)/2+(dx/length)*bend;
          d=`M ${baseStart.x} ${baseStart.y} Q ${mx} ${my} ${baseEnd.x} ${baseEnd.y}`;
        }
      }
      let tick0=null, tick1=null;
      if(isCutoff){
        path.setAttribute('d',d);
        const total=Math.max(1,path.getTotalLength());
        const sample=(ratio) => path.getPointAtLength(Math.max(0,Math.min(total,total*ratio)));
        const seg1=[0,.09,.18,.27,.36,.45].map(sample), seg2=[.55,.64,.73,.82,.91,1].map(sample);
        const toPath=(pts) => `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p=>`L ${p.x} ${p.y}`).join(' ');
        d=`${toPath(seg1)} ${toPath(seg2)}`;
        const n0=normalAt(seg1[seg1.length-2],seg1[seg1.length-1]), n1=normalAt(seg2[0],seg2[1]);
        tick0={x:seg1[seg1.length-1].x,y:seg1[seg1.length-1].y,nx:n0.x,ny:n0.y};
        tick1={x:seg2[0].x,y:seg2[0].y,nx:n1.x,ny:n1.y};
      }
      path.setAttribute('d',d);
      path.style.strokeDasharray = path.dataset.edgeDash==='dashed' ? '8 5' : (path.dataset.edgeDash==='dotted' ? '1.5 4' : '');
      const isHidden=path.style.opacity==='0';
      const hit=svg.querySelector(`[data-edge-hit="${path.dataset.edgeIndex}"]`);
      if(hit){
        hit.setAttribute('d',d);
        hit.style.pointerEvents = isHidden ? 'none' : '';
      }
      const dot=svg.querySelector(`[data-edge-dot="${path.dataset.edgeIndex}"]`);
      if(dot){ dot.setAttribute('cx',start.x); dot.setAttribute('cy',start.y); dot.style.opacity = isHidden ? '0' : ''; }
      const echoes=[...svg.querySelectorAll(`[data-edge-role="echo"][data-edge-index="${path.dataset.edgeIndex}"]`)];
      if(echoes.length){
        const length=Math.max(1,Math.hypot(dx,dy)), nx=-dy/length, ny=dx/length;
        echoes.forEach((echo,i) => {
          const offset=echoes.length===1 ? 6 : (i===0?6:-6);
          echo.setAttribute('d',d);
          echo.setAttribute('transform',`translate(${(nx*offset).toFixed(2)} ${(ny*offset).toFixed(2)})`);
        });
      }
      const slashes=[...svg.querySelectorAll(`[data-edge-role="slash"][data-edge-index="${path.dataset.edgeIndex}"]`)];
      if(slashes.length && typeof path.getTotalLength==='function'){
        const total=Math.max(1,path.getTotalLength());
        slashes.forEach((slash,i) => {
          const ratio=Math.max(.08,Math.min(.92,.66+i*.09));
          const at=total*ratio, point=path.getPointAtLength(at);
          const before=path.getPointAtLength(Math.max(0,at-4)), after=path.getPointAtLength(Math.min(total,at+4));
          const tdx=after.x-before.x, tdy=after.y-before.y, tl=Math.max(1,Math.hypot(tdx,tdy));
          const ux=tdx/tl, uy=tdy/tl, ax=(ux-uy)*6, ay=(uy+ux)*6;
          slash.setAttribute('x1',(point.x-ax).toFixed(2)); slash.setAttribute('y1',(point.y-ay).toFixed(2));
          slash.setAttribute('x2',(point.x+ax).toFixed(2)); slash.setAttribute('y2',(point.y+ay).toFixed(2));
        });
      }
      const ticks=[...svg.querySelectorAll(`[data-edge-role="tick"][data-edge-index="${path.dataset.edgeIndex}"]`)];
      if(ticks.length && tick0 && tick1){
        [tick0,tick1].forEach((t,i) => {
          const tick=ticks[i]; if(!tick) return;
          tick.setAttribute('x1',(t.x+t.nx*6).toFixed(2)); tick.setAttribute('y1',(t.y+t.ny*6).toFixed(2));
          tick.setAttribute('x2',(t.x-t.nx*6).toFixed(2)); tick.setAttribute('y2',(t.y-t.ny*6).toFixed(2));
        });
      }
      const label=stage.querySelector(`[data-edge-label="${path.dataset.edgeIndex}"]`);
      if(label && typeof path.getTotalLength==='function'){
        const length=Math.max(1,path.getTotalLength());
        const preferred=path.dataset.labelPosition==='inicio' ? .3 : (path.dataset.labelPosition==='final' ? .7 : .5);
        const ratios=[preferred,preferred-.16,preferred+.16,preferred-.3,preferred+.3].map((value) => Math.max(.12,Math.min(.88,value)));
        const offsets=[0,16,-16,30,-30];
        const labelWidth=label.offsetWidth || Math.min(170,Math.max(56,label.textContent.trim().length*5.6+16));
        const labelHeight=label.offsetHeight || 22;
        const overlapArea=(r1,r2) => Math.max(0,Math.min(r1.right,r2.right)-Math.max(r1.left,r2.left))*Math.max(0,Math.min(r1.bottom,r2.bottom)-Math.max(r1.top,r2.top));
        let best=null;
        ratios.forEach((ratio,ratioIndex) => offsets.forEach((offset,offsetIndex) => {
          const at=length*ratio, point=path.getPointAtLength(at);
          const before=path.getPointAtLength(Math.max(0,at-3)), after=path.getPointAtLength(Math.min(length,at+3));
          const tdx=after.x-before.x, tdy=after.y-before.y, tlen=Math.max(1,Math.hypot(tdx,tdy));
          const x=point.x+(-tdy/tlen)*offset, y=point.y+(tdx/tlen)*offset;
          const rect={left:x-labelWidth/2-3,right:x+labelWidth/2+3,top:y-labelHeight/2-2,bottom:y+labelHeight/2+2};
          const nodePenalty=[...nodes.values()].reduce((sum,node) => sum+overlapArea(rect,{left:node.x-node.halfW-6,right:node.x+node.halfW+6,top:node.y-node.halfH-6,bottom:node.y+node.halfH+6})*12,0);
          const labelPenalty=placedLabels.reduce((sum,item) => sum+overlapArea(rect,item)*16,0);
          const score=nodePenalty+labelPenalty+ratioIndex*1.2+Math.abs(offset)*.05+offsetIndex*.2;
          if(!best || score<best.score) best={score,x,y,rect};
        }));
        if(best){
          placedLabels.push(best.rect);
          label.style.left=`${best.x}px`; label.style.top=`${best.y}px`;
        }
      }
    });
  });
}

function bindSpecialModelModules(host){
  host?.querySelectorAll('[data-arch-tab]').forEach((button) => button.addEventListener('click', () => {
    const id = button.getAttribute('data-arch-tab');
    host.querySelectorAll('[data-arch-tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
    host.querySelectorAll('[data-arch-panel]').forEach(panel => { panel.hidden = panel.getAttribute('data-arch-panel') !== id; });
    button.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    requestAnimationFrame(() => { syncSpecialMapEdges(host); syncSpecialGenogramEdges(host); });
  }));
  host?.querySelectorAll('.ed-arch-map').forEach((map) => {
    if (typeof ResizeObserver === 'function'){
      map.__archMapResizeObserver = new ResizeObserver(() => syncSpecialMapEdges(map));
      map.__archMapResizeObserver.observe(map);
    }
    const visual=map.closest('.ed-arch-mapVisual'),reader=visual?.querySelector('.ed-arch-mapReader');
    const nodes=[...map.querySelectorAll('[data-arch-node]')],edges=[...map.querySelectorAll('[data-edge-from]')],hits=[...map.querySelectorAll('[data-edge-hit]')],labels=[...map.querySelectorAll('[data-edge-label]')];
    const showReader=(kind,title,description) => {
      if(!reader) return;
      reader.hidden=false;
      reader.querySelector(':scope > span').textContent=kind;
      reader.querySelector('h5').textContent=title || uiText('architecture.conceptualRelationship', 'Relación conceptual');
      reader.querySelector('p').textContent=description || uiText('architecture.noDescription', 'Sin explicación adicional.');
    };
    const clearFocus=() => {
      map.classList.remove('is-focus-active');
      [...nodes,...edges,...labels].forEach(item => item.classList.remove('is-focus'));
      if(reader) reader.hidden=true;
    };
    const focusEdge=(edge) => {
      clearFocus(); map.classList.add('is-focus-active'); edge.classList.add('is-focus');
      nodes.filter(node => node.dataset.archNode===edge.dataset.edgeFrom || node.dataset.archNode===edge.dataset.edgeTo).forEach(node => node.classList.add('is-focus'));
      labels.filter(label => label.dataset.edgeId===edge.dataset.edgeId).forEach(label => label.classList.add('is-focus'));
      showReader(uiText('fiche.relationship', 'Relación'),edge.dataset.relationTitle,edge.dataset.relationDescription);
    };
    const focusNode=(node) => {
      clearFocus(); map.classList.add('is-focus-active'); node.classList.add('is-focus');
      const direct=edges.filter(edge => edge.dataset.edgeFrom===node.dataset.archNode || edge.dataset.edgeTo===node.dataset.archNode);
      direct.forEach(edge => { edge.classList.add('is-focus'); nodes.find(item => item.dataset.archNode===(edge.dataset.edgeFrom===node.dataset.archNode?edge.dataset.edgeTo:edge.dataset.edgeFrom))?.classList.add('is-focus'); labels.find(label => label.dataset.edgeId===edge.dataset.edgeId)?.classList.add('is-focus'); });
      showReader(uiText('architecture.node', 'Nodo'),node.dataset.nodeTitle,node.dataset.nodeDescription);
    };
    nodes.forEach(node => { node.addEventListener('click',event => { event.stopPropagation(); focusNode(node); }); node.addEventListener('keydown',event => { if(event.key==='Enter'||event.key===' '){ event.preventDefault(); focusNode(node); } }); });
    edges.forEach(edge => { edge.addEventListener('click',event => { event.stopPropagation(); focusEdge(edge); }); edge.addEventListener('keydown',event => { if(event.key==='Enter'||event.key===' '){ event.preventDefault(); focusEdge(edge); } }); });
    hits.forEach(hit => hit.addEventListener('click',event => { event.stopPropagation(); const edge=edges.find(item => item.dataset.edgeIndex===hit.dataset.edgeHit); if(edge) focusEdge(edge); }));
    labels.forEach(label => label.addEventListener('click',event => { event.stopPropagation(); const edge=edges.find(item => item.dataset.edgeId===label.dataset.edgeId); if(edge) focusEdge(edge); }));
    map.addEventListener('click',event => { if(event.target===map || event.target.tagName==='svg') clearFocus(); });
    const layerButtons=[...(visual?.querySelectorAll('[data-map-layer]') || [])];
    const updateLayers=() => {
      edges.forEach(edge => {
        const memberships=edge.dataset.layer
          ? layerButtons.filter(button => edge.dataset.layer===button.dataset.mapLayer)
          : layerButtons.filter(button => button.dataset.relationTypes.split(',').filter(Boolean).some(type => edge.classList.contains(`is-${type}`)));
        const hidden=memberships.length && memberships.every(button => button.getAttribute('aria-pressed')!=='true');
        edge.classList.toggle('is-layer-hidden',hidden);
        hits.find(hit => hit.dataset.edgeHit===edge.dataset.edgeIndex)?.classList.toggle('is-layer-hidden',hidden);
        map.querySelector(`[data-edge-dot="${edge.dataset.edgeIndex}"]`)?.classList.toggle('is-layer-hidden',hidden);
        labels.find(label => label.dataset.edgeId===edge.dataset.edgeId)?.classList.toggle('is-layer-hidden',hidden);
      });
    };
    layerButtons.forEach(button => button.addEventListener('click',() => { button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true')); updateLayers(); }));
    updateLayers();
  });
  host?.querySelectorAll('.ed-geno-stage').forEach((stage) => {
    if (typeof ResizeObserver === 'function'){
      stage.__genoResizeObserver = new ResizeObserver(() => syncSpecialGenogramEdges(stage));
      stage.__genoResizeObserver.observe(stage);
    }
    const shell=stage.closest('.ed-geno-shell'),reader=shell?.querySelector('.ed-geno-reader');
    const people=[...stage.querySelectorAll('[data-geno-node]')],edges=[...stage.querySelectorAll('[data-edge-from]')],hits=[...stage.querySelectorAll('[data-edge-hit]')],labels=[...stage.querySelectorAll('[data-edge-label]')];
    const showReader=(kind,title,description) => {
      if(!reader) return;
      reader.hidden=false;
      reader.querySelector(':scope > span').textContent=kind;
      reader.querySelector('h5').textContent=title || uiText('architecture.item', 'Elemento');
      reader.querySelector('p').textContent=description || uiText('architecture.noDescription', 'Sin explicación adicional.');
    };
    const clearFocus=() => {
      stage.classList.remove('is-focus-active');
      [...people,...edges,...labels].forEach(item => item.classList.remove('is-focus'));
      if(reader) reader.hidden=true;
    };
    const focusEdge=(edge) => {
      clearFocus(); stage.classList.add('is-focus-active'); edge.classList.add('is-focus');
      people.filter(node => node.dataset.genoNode===edge.dataset.edgeFrom || node.dataset.genoNode===edge.dataset.edgeTo).forEach(node => node.classList.add('is-focus'));
      labels.filter(label => label.dataset.edgeId===edge.dataset.edgeId).forEach(label => label.classList.add('is-focus'));
      showReader(uiText('fiche.relationship', 'Relación'),edge.dataset.relationTitle,edge.dataset.relationDescription);
    };
    const focusNode=(node) => {
      clearFocus(); stage.classList.add('is-focus-active'); node.classList.add('is-focus');
      const direct=edges.filter(edge => edge.dataset.edgeFrom===node.dataset.genoNode || edge.dataset.edgeTo===node.dataset.genoNode);
      direct.forEach(edge => { edge.classList.add('is-focus'); people.find(item => item.dataset.genoNode===(edge.dataset.edgeFrom===node.dataset.genoNode?edge.dataset.edgeTo:edge.dataset.edgeFrom))?.classList.add('is-focus'); labels.find(label => label.dataset.edgeId===edge.dataset.edgeId)?.classList.add('is-focus'); });
      showReader(uiText('architecture.person', 'Persona'),node.dataset.nodeTitle,node.dataset.nodeDescription);
    };
    people.forEach(node => { node.addEventListener('click',event => { event.stopPropagation(); focusNode(node); }); node.addEventListener('keydown',event => { if(event.key==='Enter'||event.key===' '){ event.preventDefault(); focusNode(node); } }); });
    edges.forEach(edge => { edge.addEventListener('click',event => { event.stopPropagation(); focusEdge(edge); }); edge.addEventListener('keydown',event => { if(event.key==='Enter'||event.key===' '){ event.preventDefault(); focusEdge(edge); } }); });
    hits.forEach(hit => hit.addEventListener('click',event => { event.stopPropagation(); const edge=edges.find(item => item.dataset.edgeIndex===hit.dataset.edgeHit); if(edge) focusEdge(edge); }));
    labels.forEach(label => label.addEventListener('click',event => { event.stopPropagation(); const edge=edges.find(item => item.dataset.edgeId===label.dataset.edgeId); if(edge) focusEdge(edge); }));
    stage.addEventListener('click',event => { if(event.target===stage || event.target.tagName==='svg') clearFocus(); });
  });
  requestAnimationFrame(() => { syncSpecialMapEdges(host); syncSpecialGenogramEdges(host); });
  host?.querySelectorAll('.ed-arch-tabsNav').forEach((nav) => {
    const track = nav.querySelector('.ed-arch-tabs');
    const arrows = [...nav.querySelectorAll('[data-arch-scroll]')];
    if (!track || arrows.length !== 2) return;
    const update = () => {
      const tabs = [...track.querySelectorAll('[data-arch-tab]')];
      const mobileModuleNav = isMobileViewport();
      nav.classList.toggle('is-mobile-module-nav', mobileModuleNav);

      if (mobileModuleNav){
        const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
        nav.classList.add('is-overflowing');
        arrows[0].disabled = activeIndex <= 0;
        arrows[1].disabled = activeIndex >= tabs.length - 1;
        return;
      }

      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      nav.classList.toggle('is-overflowing', max > 2);
      arrows[0].disabled = track.scrollLeft <= 2;
      arrows[1].disabled = track.scrollLeft >= max - 2;
    };
    arrows.forEach((arrow) => arrow.addEventListener('click', () => {
      const direction = Number(arrow.getAttribute('data-arch-scroll')) || 1;
      if (isMobileViewport()){
        const tabs = [...track.querySelectorAll('[data-arch-tab]')];
        const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
        const nextTab = tabs[activeIndex + direction];
        if (nextTab){
          nextTab.click();
          nextTab.focus({ preventScroll:true });
        }
        requestAnimationFrame(update);
        return;
      }
      track.scrollBy({ left:direction * Math.max(180, track.clientWidth * .72), behavior:'smooth' });
    }));
    track.addEventListener('scroll', update, { passive:true });
    track.addEventListener('click', (event) => {
      if (event.target.closest('[data-arch-tab]')) requestAnimationFrame(update);
    });
    if (typeof ResizeObserver === 'function'){
      nav.__archResizeObserver = new ResizeObserver(update);
      nav.__archResizeObserver.observe(track);
    }
    requestAnimationFrame(update);
  });
}

    // =========================================================
    // 1) COLORES de escuelas (puedes copiar los tuyos)
    // =========================================================
    const BG_COLS = [
      { key:'Psicoanálisis',    color:'#4E79A7' },
      { key:'Conductismo',     color:'#d69640' },
      { key:'Cognitivo',       color:'#E15759' },
      { key:'Humanista',       color:'#76B7B2' },
      { key:'Sistémico',       color:'#F1CE63' },
      { key:'Constructivista', color:'#B07AA1' },
      { key:'Integrativo',     color:'#FF9DA7' },
   { key:'Transversal', color:'#5F7F78' },
   { key:'Psicodélicos', color:'#9575CD' },
   { key:'Fronteras', color:'#8D6E63' },
   { key:'Terapias Expresivas y Creativas', color:'#C86B98' },
   { key:'Arteterapia', color:'#C86B98' },
   { key:'Epistemología', color:'#D9AA3F' },



      { key:'Otros',  color:'#f2f2f2' }
    ];
    const groupColor = new Map(BG_COLS.map(d => [d.key, d.color]));
      
      
    // ===== INFO DE ESCUELAS (texto manual) =====
const SCHOOL_INFO_ES = {
  'Psicoanálisis': {
    subtitle: 'Inconsciente, conflicto, defensas y desarrollo',
    desc: `La escuela psicoanalítica entiende el malestar como expresión de conflictos internos, defensas y patrones relacionales
que se organizan a lo largo del desarrollo. El trabajo terapéutico suele centrarse en insight, elaboración emocional y cambio
de patrones (transferencia/relación terapéutica) con distintos grados de directividad según el autor.`,
    keys: ['conflicto/defensas', 'transferencia', 'desarrollo', 'relación terapéutica', 'elaboración']
  },

  'Conductismo': {
    subtitle: 'Aprendizaje, contingencias y exposición',
    desc: `El foco está en cómo se adquieren y mantienen conductas y respuestas emocionales mediante aprendizaje.
La intervención prioriza evaluación funcional, cambio de contingencias, entrenamiento y exposición para modificar hábitos
y reducir evitación.`,
    keys: ['análisis funcional', 'exposición', 'refuerzo', 'habilidades', 'hábitos']
  },

  'Cognitivo': {
    subtitle: 'Procesamiento de la información, creencias y reestructuración',
    desc: `Plantea que pensamiento, atención y memoria influyen en emoción y conducta. Se trabaja sobre creencias,
sesgos y estrategias de afrontamiento con técnicas como reestructuración, experimentos conductuales y entrenamiento
metacognitivo según el modelo.`,
    keys: ['creencias', 'sesgos', 'reestructuración', 'experimentos', 'metacognición']
  },

  'Humanista': {
    subtitle: 'Experiencia, autenticidad y crecimiento',
    desc: `Enfatiza la experiencia vivida, la congruencia y el potencial de crecimiento. La relación terapéutica es
un agente central de cambio (presencia, aceptación, empatía) y el trabajo suele facilitar contacto emocional y
autocompasión/autenticidad.`,
    keys: ['experiencia', 'empatía', 'aceptación', 'autenticidad', 'crecimiento']
  },

  'Sistémico': {
    subtitle: 'Patrones relacionales, comunicación y contexto',
    desc: `Entiende el problema en el sistema de relaciones y en los patrones de interacción. La intervención busca
cambiar reglas, significados y secuencias comunicacionales, trabajando con familia/pareja o con el sistema “interno”
representado en sesión.`,
    keys: ['patrones', 'comunicación', 'ciclo', 'contexto', 'reencuadre']
  },

  'Integrativo': {
    subtitle: 'Procesos y combinación coherente de estrategias',
    desc: `Integra técnicas y principios de distintas tradiciones buscando coherencia con el caso y con procesos de cambio.
Suele apoyarse en formulación de caso, factores comunes y selección estratégica de intervenciones.`,
    keys: ['formulación', 'procesos', 'factores comunes', 'selección', 'flexibilidad']
  },
  'Constructivista': {
  subtitle: 'Significado, organización del self y construcción de la experiencia',
  desc: `La escuela constructivista entiende el malestar como una forma de organización del significado y del self,
construida a lo largo de la experiencia relacional y biográfica. El cambio terapéutico no se produce corrigiendo
contenidos, sino transformando la manera en que la persona interpreta, da sentido y se relaciona con su propia
experiencia, favoreciendo coherencia, diferenciación e integración.`,
  keys: ['significado', 'self', 'narrativa', 'coherencia', 'identidad']
},
  'Transversal': {
  subtitle: 'Factores comunes, procesos de cambio y coherencia terapéutica',
  desc: `Los enfoques transversales no se definen por una teoría única del problema, sino por identificar
procesos de cambio y condiciones que operan a través de distintos modelos. El énfasis se pone en la alianza,
las expectativas, la explicación compartida del malestar y la activación de procesos psicológicos relevantes,
buscando coherencia clínica más que fidelidad a una escuela concreta.`,
  keys: ['factores comunes', 'alianza', 'expectativas', 'procesos de cambio', 'coherencia']
},
  'Psicodélicos': {
  subtitle: 'Preparación, experiencia psicodélica e integración',
  desc: `Los modelos psicodélicos organizan el acompañamiento clínico antes, durante y después de una experiencia
psicodélica. Integran preparación, seguridad, atención al contexto, apoyo durante la sesión e integración posterior,
con especial cuidado por el consentimiento, la vulnerabilidad, las expectativas y los límites profesionales.`,
  keys: ['preparación', 'acompañamiento', 'integración', 'set y setting', 'seguridad']
},
  'Fronteras': {
  subtitle: 'Practicas influyentes, limitrofes y epistemologicamente controvertidas',
  desc: `Agrupa modelos y practicas situadas en los bordes del campo psicoterapeutico: propuestas con influencia cultural,
uso clinico o paraclinico real, pero con fundamentos, evidencia o encuadres profesionales discutidos. Se presentan aqui
para comprender su lugar historico y sus riesgos, diferenciando recursos potencialmente integrables de afirmaciones
teoricas que requieren cautela critica.`,
  keys: ['limite epistemologico', 'evidencia discutida', 'influencia cultural', 'uso prudente', 'riesgo de sugestion']
},
  'Terapias Expresivas y Creativas': {
  subtitle: 'Creación, simbolización y experiencia artística como vías de cambio',
  desc: `Esta colección reúne modelos que utilizan los lenguajes artísticos y expresivos como medios centrales de elaboración psicológica. Integra enfoques basados en artes visuales, movimiento, música, dramatización, escritura y otras formas creativas sin tratarlos como una escuela psicoterapéutica única.`,
  keys: ['creación', 'simbolización', 'expresión', 'experiencia artística', 'integración']
},
  'Epistemología': {
  subtitle: 'Marcos sobre conocimiento, sujeto, verdad y cambio',
  desc: `Las epistemologías explicitan los supuestos desde los que cada tradición comprende qué puede conocerse,
cómo se construye la experiencia y qué hace posible el cambio. Este grupo permite compararlas como marcos transversales,
al mismo nivel de navegación que las escuelas, sin tratarlas como una escuela psicoterapéutica más.`,
  keys: ['conocimiento', 'verdad', 'sujeto', 'cambio', 'rol terapéutico']
},
  'Otros': {
  subtitle: 'Tradiciones no occidentales, contemplativas y culturales',
  desc: `La categoría “Otros” agrupa enfoques terapéuticos que no emergen del desarrollo histórico occidental de la psicoterapia,
o que se basan en epistemologías distintas a las escuelas clásicas (psicoanálisis, cognitivo, humanista, sistémico, etc.).

Incluye tradiciones orientales, modelos contemplativos, enfoques indígenas y sistemas de comprensión del sufrimiento
basados en la aceptación, la acción correcta, la disciplina vital o la relación con la naturaleza y la comunidad.
En estos modelos, el cambio no se produce corrigiendo síntomas ni contenidos mentales, sino transformando la relación
con la experiencia y la forma de vivirla.`,
  keys: [
    'aceptación',
    'acción con malestar',
    'conciencia',
    'disciplina vital',
    'sabiduría experiencial',
    'contexto cultural'
  ]
}



};

SCHOOL_INFO_ES['Arteterapia'] = SCHOOL_INFO_ES['Terapias Expresivas y Creativas'];

const SCHOOL_INFO_EN = {
  'Psicoanálisis': {
    subtitle: 'Unconscious processes, conflict, defences and development',
    desc: `The psychoanalytic school understands distress as an expression of internal conflicts, defences and relational patterns
organised throughout development. Therapeutic work generally focuses on insight, emotional working-through and changing
patterns enacted in the transference and therapeutic relationship, with varying degrees of directiveness depending on the author.`,
    keys: ['conflict/defences', 'transference', 'development', 'therapeutic relationship', 'working-through']
  },

  'Conductismo': {
    subtitle: 'Learning, contingencies and exposure',
    desc: `The focus is on how behaviour and emotional responses are acquired and maintained through learning.
Intervention prioritises functional assessment, changing contingencies, skills training and exposure to modify habits
and reduce avoidance.`,
    keys: ['functional analysis', 'exposure', 'reinforcement', 'skills', 'habits']
  },

  'Cognitivo': {
    subtitle: 'Information processing, beliefs and restructuring',
    desc: `This school proposes that thinking, attention and memory influence emotion and behaviour. Work addresses beliefs,
biases and coping strategies through techniques such as restructuring, behavioural experiments and metacognitive
training, depending on the model.`,
    keys: ['beliefs', 'biases', 'restructuring', 'experiments', 'metacognition']
  },

  'Humanista': {
    subtitle: 'Experience, authenticity and growth',
    desc: `This school emphasises lived experience, congruence and the potential for growth. The therapeutic relationship is
a central agent of change through presence, acceptance and empathy, while the work generally facilitates emotional contact,
self-compassion and authenticity.`,
    keys: ['experience', 'empathy', 'acceptance', 'authenticity', 'growth']
  },

  'Sistémico': {
    subtitle: 'Relational patterns, communication and context',
    desc: `This school understands the problem within systems of relationships and patterns of interaction. Intervention seeks
to change rules, meanings and communication sequences, working with families or couples, or with the “internal” system
represented in the session.`,
    keys: ['patterns', 'communication', 'cycle', 'context', 'reframing']
  },

  'Integrativo': {
    subtitle: 'Processes and the coherent combination of strategies',
    desc: `This school integrates techniques and principles from different traditions, seeking coherence with the case and its
change processes. It commonly draws on case formulation, common factors and the strategic selection of interventions.`,
    keys: ['formulation', 'processes', 'common factors', 'selection', 'flexibility']
  },

  'Constructivista': {
    subtitle: 'Meaning, organisation of the self and construction of experience',
    desc: `The constructivist school understands distress as a form of organisation of meaning and the self, built throughout
relational and biographical experience. Therapeutic change does not arise from correcting content, but from transforming how
people interpret, make sense of and relate to their own experience, fostering coherence, differentiation and integration.`,
    keys: ['meaning', 'self', 'narrative', 'coherence', 'identity']
  },

  'Transversal': {
    subtitle: 'Common factors, change processes and therapeutic coherence',
    desc: `Cross-cutting approaches are not defined by a single theory of the problem, but by identifying change processes and
conditions that operate across different models. They emphasise the alliance, expectations, a shared explanation of distress
and the activation of relevant psychological processes, seeking clinical coherence rather than allegiance to a particular school.`,
    keys: ['common factors', 'alliance', 'expectations', 'change processes', 'coherence']
  },

  'Psicodélicos': {
    subtitle: 'Preparation, psychedelic experience and integration',
    desc: `Psychedelic models organise clinical support before, during and after a psychedelic experience. They integrate
preparation, safety, attention to context, support during the session and subsequent integration, with particular care for
consent, vulnerability, expectations and professional boundaries.`,
    keys: ['preparation', 'support', 'integration', 'set and setting', 'safety']
  },

  'Fronteras': {
    subtitle: 'Influential, boundary and epistemologically contested practices',
    desc: `This group brings together models and practices at the margins of psychotherapy: proposals with cultural influence
and real clinical or para-clinical use, but with contested foundations, evidence or professional frameworks. They are included
to clarify their historical place and risks, distinguishing potentially integrable resources from theoretical claims that
require critical caution.`,
    keys: ['epistemological boundary', 'contested evidence', 'cultural influence', 'prudent use', 'risk of suggestion']
  },

  'Terapias Expresivas y Creativas': {
  subtitle: 'Creation, symbolisation and artistic experience as pathways to change',
  desc: `This collection brings together models that use artistic and expressive languages as central means of psychological elaboration. It includes approaches based on visual arts, movement, music, drama, writing and other creative forms without treating them as a single psychotherapy school.`,
  keys: ['creation', 'symbolisation', 'expression', 'artistic experience', 'integration']
  },

  'Epistemología': {
    subtitle: 'Frameworks for knowledge, subject, truth and change',
    desc: `Epistemologies make explicit the assumptions through which each tradition understands what can be known,
how experience is constructed and what makes change possible. This group allows them to be compared as cross-cutting
frameworks at the same level of navigation as the schools, without treating them as another school of psychotherapy.`,
    keys: ['knowledge', 'truth', 'subject', 'change', 'therapeutic role']
  },

  'Otros': {
    subtitle: 'Non-Western, contemplative and cultural traditions',
    desc: `The “Other” category brings together therapeutic approaches that did not emerge from the Western historical
development of psychotherapy, or that rest on epistemologies different from the classical schools such as psychoanalysis,
cognitive, humanistic and systemic traditions.

It includes Eastern traditions, contemplative models, Indigenous approaches and systems for understanding distress grounded
in acceptance, right action, life discipline or a relationship with nature and community. In these models, change does not
come from correcting symptoms or mental content, but from transforming one’s relationship with experience and way of living it.`,
    keys: [
      'acceptance',
      'action in the presence of distress',
      'awareness',
      'life discipline',
      'experiential wisdom',
      'cultural context'
    ]
  }
};

SCHOOL_INFO_EN['Arteterapia'] = SCHOOL_INFO_EN['Terapias Expresivas y Creativas'];

const SCHOOL_INFO = MODELOS_LOCALE === 'en' ? SCHOOL_INFO_EN : SCHOOL_INFO_ES;

function hexToRgba(hex, a=0.14){
  if (!hex) return `rgba(217,170,63,${a})`;
  const h = hex.replace('#','').trim();
  const full = h.length===3 ? h.split('').map(x=>x+x).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
  
function tintForModel(model, selectedSchool){
  // Prioridad 1: escuela seleccionada (tu UI trabaja por escuela)
  if (selectedSchool) return colorForSchoolLabel(selectedSchool);

  // Prioridad 2: inferir por texto del grupo si no coincide exacto
  const g = (model?.grupo || '').toLowerCase();
  if (g.includes('cognit')) return groupColor.get('Cognitivo') || '#E15759';
 if (g.includes('conduct')) return groupColor.get('Conductismo') || '#d69640';
  if (g.includes('psicoan')) return groupColor.get('Psicoanálisis') || '#4E79A7';
  if (g.includes('human')) return groupColor.get('Humanista') || '#76B7B2';
  if (g.includes('sist')) return groupColor.get('Sistémico') || '#F1CE63';
  if (g.includes('construct')) return groupColor.get('Constructivista') || '#B07AA1';
  if (g.includes('integr')) return groupColor.get('Integrativo') || '#FF9DA7';
  if (g.includes('frontera')) return groupColor.get('Fronteras') || '#8D6E63';

  // Fallback
  return '#D9AA3F';
}

    // =========================================================
    // 2) DATOS: estructura EXACTA que tú importas del otro código
    //    (nota: esta app NO muestra "procesos" ni "mjps" aunque existan)
    // =========================================================
    const LOCAL_MODELS = [


];
  // ===== MODELS GLOBAL (debe existir antes de usarlo) =====
let MODELS = LOCAL_MODELS.filter(isModelVisibleInApp);
window.MODELS_ALL = MODELS.slice();

// =========================================================
// 2B) DATOS: GitHub + compatibilidad con datos locales
// =========================================================
// =========================
// MINI MAP (estética Mapamundi)
// =========================
const MINI_WORLD = { loaded:false, countries:null };

async function miniLoadWorld(){
  if (MINI_WORLD.loaded) return MINI_WORLD.countries;

  const world = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
    .then(r => r.json()); // igual que Mapamundi

  MINI_WORLD.countries = topojson.feature(world, world.objects.countries);
  MINI_WORLD.loaded = true;
  return MINI_WORLD.countries;
}

function miniSize(svgEl){
  const r = svgEl.getBoundingClientRect();
  return { w: Math.max(10, r.width), h: Math.max(10, r.height) };
}

function miniEnsureDefs(svg){
  // defs + dotGlow (igual que Mapamundi)
  let defs = svg.select('defs');
  if (!defs.node()) defs = svg.append('defs');

  if (!defs.select('#dotGlow').node()){
    const fDot = defs.append('filter')
      .attr('id', 'dotGlow')
      .attr('x', '-80%')
      .attr('y', '-80%')
      .attr('width', '260%')
      .attr('height', '260%');

    fDot.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 2.2)
      .attr('flood-color', 'var(--dotGlow)');
  }
}

async function miniRender(svgEl, m){
  if (!svgEl) return;

  const svg = d3.select(svgEl);
  const { w, h } = miniSize(svgEl);
  svg.attr('viewBox', `0 0 ${w} ${h}`);

  // Si no hay coords, limpia el svg y sal
  const hasCoords = Number.isFinite(m?.lat) && Number.isFinite(m?.lon);
  if (!hasCoords){
    svg.selectAll('*').remove();
    return;
  }

  // Root/layers (mismo orden conceptual que Mapamundi)
  let root = svg.select('g.mini-root');
  if (!root.node()){
    svg.selectAll('*').remove(); // render limpio
    miniEnsureDefs(svg);

    root = svg.append('g').attr('class','mini-root');
    root.append('g').attr('class','graticule');
    root.append('g').attr('class','land');
    root.append('g').attr('class','halos');
    root.append('g').attr('class','dots');
  }

// ✅ Zoom + centrado en el nodo (misma “ventana”, menos superficie visible)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Mercator “peta” cerca de los polos: clamp suave
const lat = clamp(+m.lat, -80, 80);
const lon = ((+m.lon + 540) % 360) - 180; // normaliza a [-180, 180]

const zoom = (w < 420 ? 2.1 : 2.8);
const base = Math.min(w, h) * 0.30;

// ✅ Ajuste: levantar nodo (y por tanto el centro del mapa)
const yLift = Math.round(h * 0.08);
const xShift = Math.round(w * 0.08);

const projection = d3.geoMercator()
  .center([lon, lat])
  .translate([(w/2) + xShift, (h/2) - yLift])
  .scale(base * zoom);


  const path = d3.geoPath(projection);

  // Graticule (igual que Mapamundi)
  const graticule = d3.geoGraticule10();
  const gGrat = root.select('g.graticule');
  const gratPath = gGrat.selectAll('path').data([graticule]);
  gratPath.enter().append('path')
    .merge(gratPath)
    .attr('d', path);

  // Land (countries TopoJSON)
  const countries = await miniLoadWorld();
  const gLand = root.select('g.land');
  const landSel = gLand.selectAll('path').data(countries.features, d => d.id);

  landSel.enter().append('path')
    .merge(landSel)
    .attr('d', path);

  landSel.exit().remove();

  // Punto (dot) + halo (misma “sensación” Mapamundi)
  const [x, y] = projection([m.lon, m.lat]);

  const col = (typeof groupColor !== 'undefined' ? (groupColor.get(m.grupo) || colorForSchoolLabel?.(m.grupo) || '#7FD1B9') : '#7FD1B9');

  const gDots = root.select('g.dots');
  const dot = gDots.selectAll('circle.mini-dot').data([1]);
  dot.enter().append('circle')
    .attr('class','mini-dot')
    .merge(dot)
    .attr('cx', x).attr('cy', y)
    .attr('r', 5.8)
    .attr('fill', col)
    .attr('filter', 'url(#dotGlow)');

  const gHalos = root.select('g.halos');
  const halo = gHalos.selectAll('circle.mini-halo').data([1]);
  halo.enter().append('circle')
    .attr('class','mini-halo')
    .merge(halo)
    .attr('cx', x).attr('cy', y)
    .attr('r', 28)
    .attr('stroke', col)
    .attr('filter', 'url(#dotGlow)'); // evita “cuadrados” (Mapamundi usa dotGlow para halos)
}


async function renderMiniMapBgLazy(m){
  try{
    const bgSvg = document.getElementById('miniMapSvgBg');
    if (!bgSvg) return;

    const d3ok = await (D3_READY_PROMISE || ensureD3().catch(() => false));
    const topook = await (TOPO_READY_PROMISE || ensureTopojson().catch(() => false));
    if (!d3ok || !topook) return;

    await miniRender(bgSvg, m);
  }catch(e){
    console.warn('miniRender bg failed', e);
  }
}

// ⬇️ Usa GitHub Pages (más fiable que raw en embeds tipo Teachable)




async function fetchJsonLegacy(url, opts = {}){

  const ctrl = new AbortController();
  const timeoutMs = Number(opts.timeoutMs || 6500);
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  // ✅ cache-buster para evitar “me quedé con un 404/HTML cacheado”
  const sep = url.includes('?') ? '&' : '?';
const finalUrl = opts.bust
  ? `${url}${sep}v=${Date.now()}`
  : url;



  try{
   const res = await privateProxyFetch(finalUrl, {
 cache: opts.bust ? 'no-store' : 'force-cache',
 // ✅ rápido en clic
  signal: ctrl.signal,
  headers: { 'Accept': 'application/json' }
});


    if(!res.ok){
      if (!opts.quiet) console.warn(`No encontrado: ${url} (HTTP ${res.status})`);
      return null;
    }

    // ✅ si GitHub Pages te devolviese HTML (caché / error), esto lo detecta
   // ⚠️ No te fíes del content-type: GitHub/jsDelivr a veces sirven JSON como text/plain
const txt = await res.text();
try{
  return JSON.parse(txt);
}catch(e){
  const ct = res.headers.get('content-type') || '';
  if (!opts.quiet) console.warn('No pude parsear JSON en:', url, 'CT=', ct, 'Body head=', txt.slice(0,120));
  return null;
}

  }catch(e){
    if (!opts.quiet){
      const msg = e?.name === 'AbortError' ? `timeout ${timeoutMs}ms` : (e?.message || e);
      console.warn('fetchJson failed:', url, msg);
    }
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url, options = {}){
  let finalUrl = String(url || '').trim();

  if (finalUrl && options && options.bust){
    const bustValue = String(window.__ASSET_VER || Date.now()).trim();

    try{
      const u = new URL(finalUrl, location.href);
      u.searchParams.set('_v', bustValue);
      finalUrl = u.href;
    }catch(err){
      const joiner = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${joiner}_v=${encodeURIComponent(bustValue)}`;
    }
  }

  const fetchOptions = {};

  if (isProxyUrl(finalUrl)){
    fetchOptions.headers = {
      Accept: 'application/json'
    };
  }

  const r = await privateProxyFetch(finalUrl, fetchOptions);

  if(!r.ok){
    throw new Error("HTTP " + r.status + " " + finalUrl);
  }

  return await r.json();
}

async function fetchFirstJson(urls, opts = {}){
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  for (let i = 0; i < list.length; i++){
    try{
      const data = await fetchJson(list[i], {
        ...opts,
        quiet: opts.quiet ?? i > 0,
        timeoutMs: opts.timeoutMs ?? (i === 0 ? 4200 : 5200)
      });
      if (data) return data;
    }catch(e){
      if (!(opts.quiet ?? i > 0)){
        console.warn('fetchJson failed:', list[i], e?.message || e);
      }
    }
  }
  return null;
}





// Escuelas disponibles en GitHub (solo para poblar el selector)
if (!Array.isArray(GH_SCHOOLS)) GH_SCHOOLS = []; // no pisar si ya viene cargado

// Cache de escuelas/modelos cargados desde GitHub
const GH_SCHOOL_LOADED = new Set();   // slugs (ej: "humanista")
const MODEL_SESSION_PREFIX = `tmps:model:v5:${MODELOS_LOCALE}:`;
const MODEL_SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function readModelFromSession(id){
  try{
    const raw = sessionStorage.getItem(MODEL_SESSION_PREFIX + String(id));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Compatibilidad: formato antiguo guardaba directamente el objeto del modelo
    if (!('data' in parsed) || !('ts' in parsed)){
      return parsed;
    }

    const ts = Number(parsed.ts || 0);
    if (!Number.isFinite(ts) || ts <= 0){
      sessionStorage.removeItem(MODEL_SESSION_PREFIX + String(id));
      return null;
    }

    if ((Date.now() - ts) > MODEL_SESSION_TTL_MS){
      sessionStorage.removeItem(MODEL_SESSION_PREFIX + String(id));
      return null;
    }

    const data = parsed.data;
    return (data && typeof data === 'object') ? data : null;
  }catch(e){
    return null;
  }
}

function writeModelToSession(id, obj){
  try{
    if (!obj || typeof obj !== 'object') return;
    const payload = { ts: Date.now(), data: obj };
    sessionStorage.setItem(MODEL_SESSION_PREFIX + String(id), JSON.stringify(payload));
  }catch(e){}
}

function clearModelSessionCache(){
  try{
    for (let i = sessionStorage.length - 1; i >= 0; i--){
      const key = sessionStorage.key(i);
      if (key && key.startsWith(MODEL_SESSION_PREFIX)){
        sessionStorage.removeItem(key);
      }
    }
  }catch(e){}
}

function slugify(s){
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita acentos
    .replace(/\s+/g,'')                             // quita espacios
    .trim();
}

// ¿Ya tienes modelos locales para esa escuela?
function hasLocalSchoolModels(label){
  return LOCAL_MODELS.some(m => m.grupo === label);
}

function normalizeModelDataKey(value){
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function isModelVisibilityOffValue(value){
  if (value === false) return true;
  if (typeof value === 'number') return value === 0;

  const normalized = normalizeModelDataKey(value);
  return normalized === 'off' ||
    normalized === 'false' ||
    normalized === 'no' ||
    normalized === '0' ||
    normalized === 'oculto' ||
    normalized === 'hidden';
}

function isModelHiddenInApp(model){
  if (!model || typeof model !== 'object') return false;
  return model.hideInModels === true ||
    isModelVisibilityOffValue(model.modelos) ||
    isModelVisibilityOffValue(model.models);
}

function isModelVisibleInApp(model){
  return !isModelHiddenInApp(model);
}

function pickModelObject(source, keys){
  if(!source || typeof source !== 'object') return null;

  for (const key of keys){
    const direct = source[key];
    if(direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
    if(typeof direct === 'string' && direct.trim()) return { texto: direct.trim() };
  }

  const wanted = new Set(keys.map(normalizeModelDataKey));
  for (const [key, value] of Object.entries(source)){
    if(!wanted.has(normalizeModelDataKey(key))) continue;
    if(value && typeof value === 'object' && !Array.isArray(value)) return value;
    if(typeof value === 'string' && value.trim()) return { texto: value.trim() };
  }

  return null;
}

function pickModelValue(source, keys){
  if(!source || typeof source !== 'object') return undefined;

  for (const key of keys){
    if(source[key] !== undefined && source[key] !== null) return source[key];
  }

  const wanted = new Set(keys.map(normalizeModelDataKey));
  for (const [key, value] of Object.entries(source)){
    if(wanted.has(normalizeModelDataKey(key))) return value;
  }

  return undefined;
}

function isEpistemologiaModel(model){
  if(!model || typeof model !== 'object') return false;

  const tipo = normalizeModelDataKey(model.tipo || model.type || model.clase || '');
  if(tipo === 'epistemologia') return true;

  const grupo = normalizeModelDataKey(model.grupo || model.group || model.categoria || '');
  if(grupo.includes('epistemologia')) return true;

  const epistemologiaFields = [
    'definicionBreve',
    'nombresLiteratura',
    'autoresClave',
    'preguntaCentral',
    'concepcionVerdad',
    'concepcionSujeto',
    'concepcionCambio',
    'concepcionTerapeuta',
    'supuestosPrincipales',
    'implicacionesClinicas',
    'afinidades',
    'tensiones',
    'riesgosClinicos',
    'advertenciaEpistemologica'
  ];

  const present = epistemologiaFields.filter((key) => {
    const value = model[key];
    if(typeof value === 'string') return value.trim().length > 0;
    if(Array.isArray(value)) return value.length > 0;
    return !!(value && typeof value === 'object');
  }).length;

  return present >= 2;
}

function isEpistemologiaSchoolName(value){
  return normalizeModelDataKey(value || '').includes('epistemologia');
}

function getEpistemologiaSchoolLabel(){
  const ghLabel = (GH_SCHOOLS || [])
    .map((school) => school?.label || school?.id || '')
    .find(isEpistemologiaSchoolName);
  if (ghLabel) return String(ghLabel).trim();

  const localLabel = (LOCAL_MODELS || [])
    .map((model) => model?.grupo || '')
    .find(isEpistemologiaSchoolName);
  return String(localLabel || 'Epistemología').trim();
}

function isEpistemologiaGrouping(){
  return getGroupingModeValue() === 'epistemology';
}

function isEpistemologiaListMode(){
  return isEpistemologiaGrouping() || (
    getGroupingModeValue() === 'school' &&
    isEpistemologiaSchoolName(currentSchool || groupingTarget)
  );
}

function getChangeTheoryData(model){
  return pickModelObject(model, [
    'teoriaCambio',
    'teoriaDelCambio',
    'teoria_cambio',
    'teoria_del_cambio',
    'teoríaCambio',
    'teoríaDelCambio',
    'teoría del cambio',
    'theoryOfChange',
    'changeTheory'
  ]);
}

function getContextOriginData(model){
  return pickModelObject(model, [
    'contextoOrigen',
    'contexto_origen',
    'contextoYOrigen',
    'contexto_y_origen',
    'contexto origen',
    'contexto y origen',
    'marcoHistorico',
    'marcoHistórico',
    'marco_historico',
    'marco histórico',
    'historicalContext',
    'contextOrigin'
  ]);
}

// Carga index de escuelas de GitHub (si falla, no pasa nada)
async function loadGhSchoolsIndex(){
  try{
    // El vocabulario localizado se carga de forma explícita durante init.
    // Mantener aquí solo el índice evita acceder a sus variables antes de que
    // se inicialicen cuando esta precarga temprana corre en DOMContentLoaded.
    const idx = await fetchFirstJson(
      dataUrlCandidates('Core/escuelas/index.json'),
      { bust:true }
    );
    GH_SCHOOLS = Array.isArray(idx) ? idx : (Array.isArray(idx?.escuelas) ? idx.escuelas : []);
  }catch(e){
    console.warn('No se pudo cargar index de escuelas desde GitHub:', e);
    GH_SCHOOLS = [];
  }finally{
    // ✅ clave: para que openModel() pueda iterar aunque uses window.GH_SCHOOLS
    window.GH_SCHOOLS = GH_SCHOOLS;
  }
  return GH_SCHOOLS;
}




// ✅ promesas en vuelo por escuela (evita carreras)
const GH_SCHOOL_PENDING = new Map(); // id -> Promise

// Carga una escuela desde GitHub y añade sus modelos a MODELS (solo si no existe local)
// Carga una escuela desde GitHub y añade sus modelos a MODELS (solo si no existe local)
async function ensureSchoolFromGitHub(schoolLabel){
  if(!schoolLabel || String(schoolLabel).trim().toLowerCase() === "todas"){
    return; // "todas" no es una escuela de GH_SCHOOLS
  }

  // ✅ mapa de promesas "en vuelo" SIN declarar globals (evita carreras y redeclare)
  ensureSchoolFromGitHub._pending = ensureSchoolFromGitHub._pending || new Map();
  const PENDING = ensureSchoolFromGitHub._pending;

  // Busca la escuela en el index de GitHub
  const entry = (GH_SCHOOLS || []).find(
    s => s.label === schoolLabel || s.id === slugify(schoolLabel)
  );

  if(!entry){
    console.warn('Escuela no encontrada en GH_SCHOOLS:', schoolLabel);
    return;
  }

  // Ya cargada
  if (GH_SCHOOL_LOADED.has(entry.id)) return;

  // ✅ Si ya se está cargando, espera a esa misma carga
  if (PENDING.has(entry.id)){
    return PENDING.get(entry.id);
  }

  // ✅ Single-flight real
  const promise = (async () => {
    const rawFile = String(entry.file || '').trim().replace(/^\/+/, '');
    if (!rawFile){
      console.warn('Escuela sin file en index:', entry);
      return;
    }

    // ✅ tolera index con "Core/..." o sin él, y evita quedarte con un 404 cacheado
    const schoolUrls = [];
    const addUrl = (u) => { if (u && !schoolUrls.includes(u)) schoolUrls.push(u); };
    const coreFile = rawFile.startsWith('Core/') ? rawFile : `Core/${rawFile}`;
    const bareFile = rawFile.replace(/^Core\//, '');
    dataUrlCandidates(coreFile).forEach(addUrl);
    dataUrlCandidates(bareFile).forEach(addUrl);

    let school = await fetchFirstJson(schoolUrls, { bust:true });

    if (!school){
      console.warn('No se pudo cargar escuela desde GH:', schoolLabel, schoolUrls);
      return;
    }

    // En rutas inglesas, el manifiesto traduce los titulos de los resumenes
    // antes de que se construya la lista.
    school = await applySchoolLocaleOverlay(school, entry.id);

    // ✅ admite variantes de estructura (array u objeto)
    const listRaw =
      (Array.isArray(school?.modelos) ? school.modelos : null) ||
      (Array.isArray(school?.models) ? school.models : null) ||
      (school?.modelos && typeof school.modelos === 'object' ? Object.values(school.modelos) : null) ||
      (school?.models && typeof school.models === 'object' ? Object.values(school.models) : null) ||
      (Array.isArray(school) ? school : []);

    const publishedIds = new Set(Array.isArray(school?.__localePublishedModelIds)
      ? school.__localePublishedModelIds.map((id) => String(id || '').trim()).filter(Boolean)
      : []);
    const groupLabel = String(entry.label || schoolLabel || school.label || '').trim();
    const summaries = listRaw
      .filter((m) => m && typeof m === 'object')
      .filter((m) => MODELOS_LOCALE === 'es' || publishedIds.has(String(m.id || '').trim()))
      .filter(isModelVisibleInApp)
      .map(m => ({
        ...m,
        grupo: groupLabel || String(m.grupo || school.label || entry.label || schoolLabel).trim()
      }));

    // Añade a MODELS sin duplicar
    const existingIds = new Set(MODELS.map(m => String(m.id)));
    for (const m of summaries){
      const mid = String(m.id);
      if (!existingIds.has(mid)){
        MODELS.push(m);
        existingIds.add(mid);
      }
    }

GH_SCHOOL_LOADED.add(entry.id);

// ✅ IMPORTANTÍSIMO: el pool “completo” debe incluir lo que acabas de añadir
window.MODELS_ALL = MODELS.filter(isModelVisibleInApp);

// ✅ Asegura visibilidad antes de devolver (micro-wait)
await Promise.resolve();


  })();

  PENDING.set(entry.id, promise);

  try{
    return await promise;
  }finally{
    PENDING.delete(entry.id);
  }
}



// Si un modelo es “resumen” (viene de GitHub) lo expandimos a ficha completa
async function ensureModelPublic(m){
  if (!m) return m;

  const id = String(m.id ?? '').trim();
  if (!id) return m;

  const privateFile = String(m.file || '').trim().replace(/^\/+/, '');

  if (!privateFile || !privateFile.startsWith('modelos/')) {
    return m;
  }

  const publicFile = privateFile.replace(/^modelos\//, 'modelos-publicos/');

  ensureModelPublic._cache = ensureModelPublic._cache || new Map();
  ensureModelPublic._pending = ensureModelPublic._pending || new Map();

  const CACHE = ensureModelPublic._cache;
  const PENDING = ensureModelPublic._pending;

  // La ficha publica cacheada ya lleva el idioma aplicado, asi que la clave
  // incluye el locale y nunca se sirve texto de un idioma en el otro.
  const cacheKey = `${MODELOS_LOCALE}:${id}`;

  if (CACHE.has(cacheKey)) {
    return {
      ...m,
      ...CACHE.get(cacheKey),
      file: m.file
    };
  }

  if (PENDING.has(cacheKey)) {
    return PENDING.get(cacheKey);
  }

  const promise = (async () => {
    const tryUrls = dataUrlCandidates(`Core/${publicFile}`);
    // Ficha publica y su traduccion se piden a la vez: el overlay no anade un
    // segundo viaje en serie y la primera pintura ya sale en el idioma actual.
    const [publicData, localeOverlay] = await Promise.all([
      fetchFirstJson(tryUrls, { bust:true }),
      fetchPublicModelLocaleOverlay(publicFile, id)
    ]);

    if (!publicData || typeof publicData !== 'object') {
      return m;
    }

    let localizedPublicData = publicData;
    if (localeOverlay){
      try{
        localizedPublicData = mergeModelLocaleOverlay(publicData, localeOverlay);
      }catch(error){
        // Un overlay desalineado con la fuente no debe romper la ficha: se
        // descarta y la vista publica sigue en espanol hasta la ficha completa.
        PUBLIC_MODEL_LOCALE_OVERLAY_CACHE.set(cacheKey, null);
        console.warn('Invalid public model translation overlay:', { id, locale:MODELOS_LOCALE, error:error?.message || error });
        localizedPublicData = publicData;
      }
    }

    const merged = {
      ...m,
      ...localizedPublicData,

      // Mantener siempre el puntero privado original:
      id: m.id,
      file: m.file,

      __publicLoaded: true,

      // No se marca __locale a proposito: applyModelLocaleOverlay lo usa para
      // saltarse el trabajo ya hecho, y la ficha completa necesita aplicar
      // despues su propio overlay, mucho mas amplio que el publico.
      __localePublic: localeOverlay ? MODELOS_LOCALE : null
    };

    CACHE.set(cacheKey, localizedPublicData);
    return merged;
  })();

  PENDING.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    PENDING.delete(cacheKey);
  }
}

const MODEL_LOCALE_OVERLAY_CACHE = new Map();
const MODEL_LOCALE_OVERLAY_PENDING = new Map();

// ===== Manifiesto traducido de la biblioteca =====
// La portada se construye con los resumenes de Core/escuelas/<id>.json. En rutas
// inglesas se fusiona ahi el overlay generado por build:i18n-manifest, de modo
// que la lista muestre los titulos traducidos sin abrir cada ficha.
//
// El vocabulario compartido (taxonomias.json) NO se fusiona en los datos: grupo
// y tipo son claves funcionales (color de escuela, orden, texto por escuela,
// deteccion de epistemologias, rutas de los grafos de influencia). Se traducen
// solo al pintar, con localeTaxonomyLabel().
let LOCALE_TAXONOMIES = null;
let LOCALE_TAXONOMIES_PENDING = null;

async function loadLocaleTaxonomies(){
  if (MODELOS_LOCALE === 'es') return null;
  if (LOCALE_TAXONOMIES) return LOCALE_TAXONOMIES;
  if (LOCALE_TAXONOMIES_PENDING) return LOCALE_TAXONOMIES_PENDING;

  LOCALE_TAXONOMIES_PENDING = fetchFirstJson(
    dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/taxonomias.json`),
    { bust:true, quiet:true }
  ).then((data) => {
    LOCALE_TAXONOMIES = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    return LOCALE_TAXONOMIES;
  }).catch(() => {
    LOCALE_TAXONOMIES = {};
    return LOCALE_TAXONOMIES;
  }).finally(() => {
    LOCALE_TAXONOMIES_PENDING = null;
  });

  return LOCALE_TAXONOMIES_PENDING;
}

// Traduce un valor de taxonomia para mostrarlo. Nunca modifica el dato.
function localeTaxonomyLabel(group, value){
  const raw = String(value ?? '').trim();
  if (!raw || MODELOS_LOCALE === 'es') return raw;
  const table = LOCALE_TAXONOMIES?.[group];
  if (!table || typeof table !== 'object') return raw;
  const translated = table[raw];
  return (typeof translated === 'string' && translated.trim()) ? translated : raw;
}

function schoolDisplayLabel(value){
  return localeTaxonomyLabel('escuelas', value);
}

function isCanonicalSchoolName(value){
  return CANONICAL_SCHOOL_KEYS.has(normalizeModelDataKey(value));
}

function collectionDefinitionForSchool(value){
  const key = normalizeModelDataKey(value);
  return COLLECTION_DEFS.find((collection) => collection.sourceKeys.includes(key)) || null;
}

function collectionDefinitionById(value){
  const id = String(value || '').trim();
  return COLLECTION_DEFS.find((collection) => collection.id === id) || null;
}

function collectionDisplayLabel(collectionOrId){
  const collection = typeof collectionOrId === 'object'
    ? collectionOrId
    : collectionDefinitionById(collectionOrId);
  return collection ? uiText(collection.labelKey, collection.fallback) : '';
}

function collectionSourceLabel(collectionOrId){
  const collection = typeof collectionOrId === 'object'
    ? collectionOrId
    : collectionDefinitionById(collectionOrId);
  if (!collection) return '';
  const candidates = uniq([
    ...(GH_SCHOOLS || []).map((school) => school?.label || school?.id || ''),
    ...(LOCAL_MODELS || []).map((model) => model?.grupo || '')
  ]);
  return String(candidates.find((label) => collection.sourceKeys.includes(normalizeModelDataKey(label))) || '').trim();
}

function groupingModeForSchool(value){
  if (isEpistemologiaSchoolName(value)) return 'epistemology';
  if (collectionDefinitionForSchool(value)) return 'collection';
  return 'school';
}

function navigationGroupDisplayLabel(value){
  const collection = collectionDefinitionForSchool(value);
  return collection ? collectionDisplayLabel(collection) : (schoolDisplayLabel(value) || String(value || ''));
}

function isTherapyModel(model){
  return isModelVisibleInApp(model) && !isEpistemologiaModel(model);
}

function cityDisplayLabel(value){
  return localeTaxonomyLabel('ciudades', value);
}

function countryDisplayLabel(value){
  return localeTaxonomyLabel('paises', value);
}

function institutionDisplayLabel(value){
  return localeTaxonomyLabel('universidades', value);
}
// `tipo` no se pinta en ninguna parte de la app: solo se usa como clave. Por eso
// no hay helper de presentacion, aunque el diccionario lo cubra.

const SCHOOL_LOCALE_OVERLAY_CACHE = new Map();
const SCHOOL_LOCALE_OVERLAY_PENDING = new Map();

async function applySchoolLocaleOverlay(school, schoolId){
  if (MODELOS_LOCALE === 'es' || !school || typeof school !== 'object') return school;
  const id = String(schoolId || school.id || '').trim();
  if (!id) return school;

  const cacheKey = `${MODELOS_LOCALE}:${id}`;
  let overlay;
  if (SCHOOL_LOCALE_OVERLAY_CACHE.has(cacheKey)){
    overlay = SCHOOL_LOCALE_OVERLAY_CACHE.get(cacheKey);
  } else if (SCHOOL_LOCALE_OVERLAY_PENDING.has(cacheKey)){
    overlay = await SCHOOL_LOCALE_OVERLAY_PENDING.get(cacheKey);
  } else {
    const request = fetchFirstJson(
      dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/escuelas/${id}.json`),
      { bust:true, quiet:true }
    ).then((data) => {
      // Una escuela sin ninguna ficha traducida no tiene archivo: es lo normal.
      const valid = data && typeof data === 'object' && !Array.isArray(data);
      const normalized = valid ? data : null;
      SCHOOL_LOCALE_OVERLAY_CACHE.set(cacheKey, normalized);
      return normalized;
    }).catch(() => {
      SCHOOL_LOCALE_OVERLAY_CACHE.set(cacheKey, null);
      return null;
    }).finally(() => {
      SCHOOL_LOCALE_OVERLAY_PENDING.delete(cacheKey);
    });
    SCHOOL_LOCALE_OVERLAY_PENDING.set(cacheKey, request);
    overlay = await request;
  }

  if (!overlay) {
    return MODELOS_LOCALE === 'es'
      ? school
      : { ...school, __localePublishedModelIds:[] };
  }
  try{
    const publishedModelIds = Array.isArray(overlay.modelos)
      ? overlay.modelos.map((model) => String(model?.id || '').trim()).filter(Boolean)
      : [];
    return {
      ...mergeModelLocaleOverlay(school, overlay),
      __localePublishedModelIds:publishedModelIds
    };
  }catch(error){
    // Un manifiesto desalineado con la fuente no debe romper la portada: se
    // descarta y la lista sigue en espanol.
    SCHOOL_LOCALE_OVERLAY_CACHE.set(cacheKey, null);
    console.warn('Invalid library manifest overlay:', { school:id, locale:MODELOS_LOCALE, error:error?.message || error });
    return school;
  }
}

// Campos canonicos que una traduccion nunca puede sobrescribir. Debe coincidir
// con PROTECTED_MODEL_FIELDS de tmps-data/tools/i18n/model-overlays.mjs.
const MODEL_OVERLAY_PROTECTED_FIELDS = new Set(['grupo','year','autores','lat','lon','file']);

function modelOverlayStableKey(item){
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  if (typeof item.id === 'string' && item.id.trim()) return ['id', item.id];
  if (typeof item.codigo === 'string' && item.codigo.trim()) return ['codigo', item.codigo];
  return null;
}

// Forma de array: la traduccion repite los elementos que traduce, cada uno con
// su id o codigo. Refleja mergeArray de tmps-data/tools/i18n/model-overlays.mjs.
function mergeModelLocaleOverlayArray(source, overlay, path){
  if (!overlay.length) return source;
  const translated = new Map();
  overlay.forEach((item) => {
    const stableKey = modelOverlayStableKey(item);
    if (!stableKey) throw new Error(`${path}: translated array item has no id or codigo`);
    translated.set(`${stableKey[0]}:${stableKey[1]}`, item);
  });
  const matched = new Set();
  const merged = source.map((sourceItem) => {
    const stableKey = modelOverlayStableKey(sourceItem);
    if (!stableKey) return sourceItem;
    const lookupKey = `${stableKey[0]}:${stableKey[1]}`;
    const translatedItem = translated.get(lookupKey);
    if (!translatedItem) return sourceItem;
    matched.add(lookupKey);
    return mergeModelLocaleOverlay(sourceItem, translatedItem, `${path}[${lookupKey}]`);
  });
  const unknown = [...translated.keys()].filter((key) => !matched.has(key));
  if (unknown.length) throw new Error(`${path}: unknown translated item(s): ${unknown.join(', ')}`);
  return merged;
}

// Forma de mapa: la clave es el id/codigo del elemento, o el texto espanol
// literal cuando el array contiene cadenas sueltas. Sigue sin haber fusion por
// posicion. Refleja mergeArrayByKeyMap del mismo modulo.
function mergeModelLocaleOverlayKeyMap(source, overlay, path){
  const indexByStableKey = new Map();
  const indexesByString = new Map();
  source.forEach((item, index) => {
    const stableKey = modelOverlayStableKey(item);
    if (stableKey){
      const keyValue = stableKey[1];
      if (indexByStableKey.has(keyValue)) throw new Error(`${path}: duplicated source key ${keyValue}`);
      indexByStableKey.set(keyValue, index);
      return;
    }
    if (typeof item === 'string' && item.trim()){
      if (!indexesByString.has(item)) indexesByString.set(item, []);
      indexesByString.get(item).push(index);
    }
  });

  const merged = source.slice();
  Object.entries(overlay).forEach(([key, value]) => {
    const stringIndexes = indexesByString.get(key);
    const stableIndex = indexByStableKey.get(key);
    if (stringIndexes && stableIndex !== undefined){
      throw new Error(`${path}: key ${key} matches both a source string and a source id`);
    }
    if (stringIndexes){
      if (typeof value !== 'string') throw new Error(`${path}[${key}]: a translated string item requires a string value`);
      stringIndexes.forEach((index) => { merged[index] = value; });
      return;
    }
    if (stableIndex === undefined) throw new Error(`${path}: unknown translated item ${key}`);
    merged[stableIndex] = mergeModelLocaleOverlay(source[stableIndex], value, `${path}[${key}]`);
  });
  return merged;
}

function mergeModelLocaleOverlay(source, overlay, path = '$'){
  const isOverlayObject = !!overlay && typeof overlay === 'object' && !Array.isArray(overlay);
  if (Array.isArray(source)){
    if (Array.isArray(overlay)) return mergeModelLocaleOverlayArray(source, overlay, path);
    if (isOverlayObject) return mergeModelLocaleOverlayKeyMap(source, overlay, path);
    throw new Error(`${path}: a translated array requires an array or a keyed object`);
  }
  if (Array.isArray(overlay)) throw new Error(`${path}: source is not an array`);
  const isSourceObject = !!source && typeof source === 'object';
  if (!isOverlayObject){
    if (isSourceObject) throw new Error(`${path}: source is an object`);
    return overlay;
  }
  if (!isSourceObject) throw new Error(`${path}: source is not an object`);
  const merged = { ...source };
  Object.entries(overlay).forEach(([key, value]) => {
    if (key === '_translation') return;
    if (!(key in source)) throw new Error(`${path}.${key}: field does not exist in source`);
    if (path === '$' && MODEL_OVERLAY_PROTECTED_FIELDS.has(key)){
      throw new Error(`${path}.${key}: canonical field cannot be translated`);
    }
    merged[key] = mergeModelLocaleOverlay(source[key], value, `${path}.${key}`);
  });
  return merged;
}

function mergeLoadedModelLocaleOverlay(model, overlay, id){
  if (!overlay) return model;
  try{
    return {
      ...mergeModelLocaleOverlay(model, overlay),
      __locale:MODELOS_LOCALE,
      __translation:overlay._translation || null
    };
  }catch(error){
    MODEL_LOCALE_OVERLAY_CACHE.set(`${MODELOS_LOCALE}:${id}`, null);
    console.warn('Invalid model translation overlay:', { id, locale:MODELOS_LOCALE, error:error?.message || error });
    return model;
  }
}

const DOCUMENT_LOCALE_OVERLAY_CACHE = new Map();

async function applyDocumentLocaleOverlay(documentData, sourcePath){
  if (MODELOS_LOCALE === 'es' || !documentData || typeof documentData !== 'object') return documentData;
  const cleanSourcePath = String(sourcePath || '').trim().replace(/^\/+/, '').replace(/^Core\//, '');
  if (!cleanSourcePath) return documentData;
  const cacheKey = `${MODELOS_LOCALE}:${cleanSourcePath}`;

  let overlay = DOCUMENT_LOCALE_OVERLAY_CACHE.get(cacheKey);
  if (overlay === undefined) {
    try{
      overlay = await fetchFirstJson(
        dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/documentos/${cleanSourcePath}`),
        { bust:true, quiet:true }
      );
      if (!overlay || overlay?._translation?.status !== 'reviewed') overlay = null;
    }catch(error){
      overlay = null;
    }
    DOCUMENT_LOCALE_OVERLAY_CACHE.set(cacheKey, overlay);
  }

  if (!overlay) return documentData;
  try{
    return mergeModelLocaleOverlay(documentData, overlay);
  }catch(error){
    DOCUMENT_LOCALE_OVERLAY_CACHE.set(cacheKey, null);
    console.warn('Invalid auxiliary document translation overlay:', {
      sourcePath:cleanSourcePath,
      locale:MODELOS_LOCALE,
      error:error?.message || error
    });
    return documentData;
  }
}

// Overlay de la ficha publica. La primera pintura del modelo se hace con la
// ficha publica, asi que sin este overlay el usuario en ingles ve espanol y solo
// despues, cuando llega la ficha completa, el texto cambia de idioma. Se resuelve
// en paralelo con la ficha publica espanola para no anadir una segunda espera.
const PUBLIC_MODEL_LOCALE_OVERLAY_CACHE = new Map();

async function fetchPublicModelLocaleOverlay(publicFile, id){
  if (MODELOS_LOCALE === 'es') return null;
  const clean = String(publicFile || '').trim().replace(/^\/+/, '').replace(/^Core\//, '');
  if (!clean.startsWith('modelos-publicos/')) return null;

  const cacheKey = `${MODELOS_LOCALE}:${id}`;
  if (PUBLIC_MODEL_LOCALE_OVERLAY_CACHE.has(cacheKey)){
    return PUBLIC_MODEL_LOCALE_OVERLAY_CACHE.get(cacheKey);
  }

  // Los resumenes de escuela no siempre escriben la carpeta con la misma
  // capitalizacion que el arbol de fichas (`otros` frente a `Otros`), y GitHub
  // distingue mayusculas. Se prueban las dos formas, como en ensureModelFull.
  const tryUrls = dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/${clean}`);
  const parts = clean.split('/');
  if (parts[1]){
    const fixedFolder = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    const altFile = ['modelos-publicos', fixedFolder, ...parts.slice(2)].join('/');
    dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/${altFile}`).forEach((u) => {
      if (!tryUrls.includes(u)) tryUrls.push(u);
    });
  }

  let overlay = null;
  try{
    const data = await fetchFirstJson(tryUrls, { bust:true, quiet:true });
    // Un modelo sin ficha publica traducida es lo normal: se queda en espanol.
    const valid = data
      && typeof data === 'object'
      && String(data.id || '').trim() === id
      && data?._translation?.status === 'reviewed';
    overlay = valid ? data : null;
  }catch(error){
    overlay = null;
  }

  PUBLIC_MODEL_LOCALE_OVERLAY_CACHE.set(cacheKey, overlay);
  return overlay;
}

async function applyModelLocaleOverlay(model, sourceFile = ''){
  if (MODELOS_LOCALE === 'es' || !model || typeof model !== 'object') return model;
  const id = String(model.id || '').trim();
  if (!id) return model;
  if (model.__locale === MODELOS_LOCALE) return model;

  const rawFile = String(sourceFile || model.file || '').trim().replace(/^\/+/, '').replace(/^Core\//, '');
  if (!rawFile.startsWith('modelos/')) return model;
  const cacheKey = `${MODELOS_LOCALE}:${id}`;

  if (MODEL_LOCALE_OVERLAY_CACHE.has(cacheKey)){
    const cachedOverlay = MODEL_LOCALE_OVERLAY_CACHE.get(cacheKey);
    return mergeLoadedModelLocaleOverlay(model, cachedOverlay, id);
  }
  if (MODEL_LOCALE_OVERLAY_PENDING.has(cacheKey)){
    const pendingOverlay = await MODEL_LOCALE_OVERLAY_PENDING.get(cacheKey);
    return mergeLoadedModelLocaleOverlay(model, pendingOverlay, id);
  }

  const request = fetchFirstJson(
    dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/${rawFile}`),
    { bust:true, quiet:true }
  ).then((overlay) => {
    const valid = overlay
      && typeof overlay === 'object'
      && String(overlay.id || '').trim() === id
      && overlay?._translation?.status === 'reviewed';
    const normalized = valid ? overlay : null;
    MODEL_LOCALE_OVERLAY_CACHE.set(cacheKey, normalized);
    return normalized;
  }).catch(() => {
    MODEL_LOCALE_OVERLAY_CACHE.set(cacheKey, null);
    return null;
  }).finally(() => {
    MODEL_LOCALE_OVERLAY_PENDING.delete(cacheKey);
  });

  MODEL_LOCALE_OVERLAY_PENDING.set(cacheKey, request);
  const overlay = await request;
  return mergeLoadedModelLocaleOverlay(model, overlay, id);
}

async function ensureModelFull(m){
  if(!m) return m;

  const hasCoreModelData = (obj) =>
    !!obj &&
    (typeof obj.descripcion === 'string' && obj.descripcion.trim().length > 0) &&
    (Array.isArray(obj.procedimientos) || Array.isArray(obj.micros) || Array.isArray(obj.influencias));

  const hasEpistemologiaData = (obj) =>
    isEpistemologiaModel(obj) &&
    (
      (typeof obj.descripcion === 'string' && obj.descripcion.trim().length > 0) ||
      (typeof obj.definicionBreve === 'string' && obj.definicionBreve.trim().length > 0) ||
      Array.isArray(obj.supuestosPrincipales) ||
      Array.isArray(obj.implicacionesClinicas) ||
      Array.isArray(obj.tensiones)
    );

  const hasRichModelSections = (obj) =>
    !!getChangeTheoryData(obj) || !!getContextOriginData(obj);

  const hasExternalFullFile = (obj) =>
    !!String(obj?.file || obj?.archivo || '').trim();

  const isPublicOnlyModel = (obj) =>
    !!obj &&
    (
      obj.__partial === true ||
      obj.__access === 'public' ||
      obj.__publicLoaded === true
    );

  const isFull = (obj) => {
    if(!obj) return false;

    // Una ficha publica nunca debe considerarse completa,
    // aunque tenga descripcion, ideas, influencias o teoria del cambio.
    if (isPublicOnlyModel(obj)) return false;

    if(obj.__fullLoaded === true) return true;
    if(hasEpistemologiaData(obj)) return true;
    if(!hasExternalFullFile(obj)) return hasCoreModelData(obj) || hasRichModelSections(obj);
    return hasCoreModelData(obj) && hasRichModelSections(obj);
  };

  const id = String(m.id ?? '').trim();
  if (!id) return m;

  if (window.HAS_SUBSCRIPTION_ACCESS !== true){
    return m;
  }

  if (isFull(m)){
    const localized = await applyModelLocaleOverlay(m);
    GH_MODEL_CACHE.set(id, localized);
    writeModelToSession(id, localized);
    return localized;
  }

  ensureModelFull._pending = ensureModelFull._pending || new Map(); // id -> Promise
  const PENDING = ensureModelFull._pending;

  // 1) cache en memoria
  if (GH_MODEL_CACHE.has(id)){
    const cached = { ...m, ...GH_MODEL_CACHE.get(id), id:m.id };

    if (isPublicOnlyModel(cached)){
      GH_MODEL_CACHE.delete(id);
    }else if (isFull(cached)){
      return cached;
    }
  }

  // 2) cache en sessionStorage
  const sessionCached = readModelFromSession(id);
  if (sessionCached){
    const mergedSession = { ...m, ...sessionCached, id:m.id };

    if (!isPublicOnlyModel(mergedSession)){
      GH_MODEL_CACHE.set(id, mergedSession);
      if (isFull(mergedSession)) return mergedSession;
    }
  }

  // 3) fetch deduplicado por id (single-flight)
  if (PENDING.has(id)){
    return PENDING.get(id);
  }

  const p = (async () => {
    if (!m.file){
      console.warn('⚠️ Modelo sin "file":', m);
      return m;
    }

    const file = String(m.file || '').trim().replace(/^\/+/, '');
    const tryUrls = dataUrlCandidates(`Core/${file}`);
    if (file.startsWith('modelos/')){
      const parts = file.split('/');
      if (parts[1]){
        const fixedFolder = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        const altFile = ['modelos', fixedFolder, ...parts.slice(2)].join('/');
        dataUrlCandidates(`Core/${altFile}`).forEach((u) => {
          if (!tryUrls.includes(u)) tryUrls.push(u);
        });
      }
    }

    const fullFast = await fetchFirstJson(tryUrls, { bust:true });
    if (fullFast){
      const merged = {
        ...m,
        ...fullFast,

        // Al cargar el JSON privado, eliminamos marcas publicas.
        id: m.id,
        __fullLoaded: true,
        __publicLoaded: false,
        __partial: false,
        __access: 'full'
      };
      const summaryGroup = String(m.grupo || '').trim();
      const mergedGroup = String(merged.grupo || '').trim();
      if (!mergedGroup || (summaryGroup && normSchoolName(mergedGroup) === normSchoolName(summaryGroup))){
        merged.grupo = summaryGroup || mergedGroup;
      }
      if (!merged.label) merged.label = m.label;

      const localized = await applyModelLocaleOverlay(merged, file);
      GH_MODEL_CACHE.set(id, localized);
      writeModelToSession(id, localized);

      return localized;
    }

    console.warn('No se pudo ampliar el modelo; se mantiene el resumen:', { id, file: m.file });
    return m;

  })();

  PENDING.set(id, p);
  try{
    return await p;
  }finally{
    PENDING.delete(id);
  }
}



    // =========================================================
    // 3) UI: selector de escuela + lista de modelos
    // =========================================================
    const schoolSelect = document.getElementById('schoolSelect');
    const groupBySelectEl = document.getElementById('groupBySelect');
    const groupTargetWrapEl = document.getElementById('groupTargetWrap');
    const groupTargetLabelEl = document.getElementById('groupTargetLabel');
    const groupTargetSelectEl = document.getElementById('groupTargetSelect');
    const libraryListViewButtonEl = document.getElementById('libraryListViewButton');
    const libraryNetworkViewButtonEl = document.getElementById('libraryNetworkViewButton');
    const modelsListEl = document.getElementById('modelsList');
    const networkSelectionEl = document.getElementById('networkSelectionCard');
    const countLine = document.getElementById('countLine');
    const modelInfoEl = document.getElementById('modelInfo');
    const leftListTitleEl = document.getElementById('leftListTitle');
    const leftListHintEl = document.getElementById('leftListHint');
    const modelSearchOpenEl = document.getElementById('modelSearchOpen');
    const modelSearchShellEl = document.getElementById('modelSearchShell');
    const modelSearchInputEl = document.getElementById('modelSearchInput');
    const modelSearchClearEl = document.getElementById('modelSearchClear');
    const tagFiltersPanelEl = document.getElementById('tagFiltersPanel');
    let groupingMode = 'all';
    let listGroupingMode = 'all';
    let groupingTarget = '';
    let modelSearchQuery = '';
    const TAG_FILTER_COLOR = '#8BAA9A';
    const CANONICAL_SCHOOL_KEYS = new Set([
      'psicoanalisis',
      'conductismo',
      'cognitivo',
      'humanista',
      'constructivista',
      'sistemico',
      'integrativo'
    ]);
    const COLLECTION_DEFS = [
      { id:'transversal', sourceKeys:['transversal'], labelKey:'collection.transversal', fallback:'Transversales' },
      { id:'psychedelic', sourceKeys:['psicodelicos'], labelKey:'collection.psychedelic', fallback:'Psicodélicos' },
      { id:'frontiers', sourceKeys:['fronteras'], labelKey:'collection.frontiers', fallback:'Fronteras' },
      { id:'cultural-traditions', sourceKeys:['otros'], labelKey:'collection.culturalTraditions', fallback:'Tradiciones culturales' },
      { id:'expressive-creative', sourceKeys:['terapiasexpresivasycreativas', 'arteterapia'], labelKey:'collection.expressiveCreative', fallback:'Terapias Expresivas y Creativas' }
    ];
    const TAG_FACETS = [
      { id:'foco', label:'Foco' },
      { id:'poblacion', label:'Población' },
      { id:'formato', label:'Formato' },
      { id:'ola', label:'Ola' },
      { id:'mecanismo', label:'Mecanismo' },
      { id:'epistemologia', label:'Epistemología' }
    ];
    const TAG_VALUE_LABELS = {
      'adicciones':'Adicciones', 'ansiedad':'Ansiedad', 'apego-vinculo':'Apego y vínculo',
      'bienestar-crecimiento':'Bienestar y crecimiento', 'depresion':'Depresión',
      'dolor-cronico':'Dolor crónico', 'duelo':'Duelo', 'estres':'Estrés', 'familia':'Familia',
      'identidad-self':'Identidad / self', 'pareja':'Pareja', 'personalidad':'Personalidad',
      'psicosis':'Psicosis', 'regulacion-emocional':'Regulación emocional',
      'sentido-existencial':'Sentido existencial', 'sexualidad':'Sexualidad',
      'trastorno-alimentario':'Trastorno alimentario', 'trauma':'Trauma',
      'adolescencia':'Adolescencia', 'familias':'Familias', 'infancia':'Infancia',
      'parejas':'Parejas', 'poblacion-general':'Población general',
      'autoaplicado':'Autoaplicado', 'familiar':'Familiar', 'grupal':'Grupal',
      'individual':'Individual', 'primera':'Primera', 'segunda':'Segunda', 'tercera':'Tercera',
      'agencia-motivacional':'Agencia motivacional', 'atencional-mindfulness':'Atención / mindfulness',
      'cognitivo-narrativo':'Cognitivo-narrativo', 'emocional-experiencial':'Emocional-experiencial',
      'relacional-sistemico':'Relacional-sistémico', 'somatico-fisiologico':'Somático-fisiológico',
      'constructivista':'Constructivista', 'contextual-funcional':'Contextual-funcional',
      'fenomenologica-experiencial':'Fenomenológica-experiencial', 'integrativa':'Integrativa',
      'objetivista-empirista':'Objetivista-empirista', 'psicodinamica':'Psicodinámica',
      'racionalista':'Racionalista', 'sistemico-cibernetica':'Sistémico-cibernética',
      'hermeneutica':'Hermenéutica',
      'pragmatismo-contextualismo-funcional':'Pragmatismo / contextualismo funcional',
      'neurodesarrollo':'Neurodesarrollo',
      'positivismo-postpositivismo':'Positivismo / postpositivismo',
      'fenomenologia-existencialismo':'Fenomenología / existencialismo',
      'constructivismo':'Constructivismo', 'sistemica-cibernetica':'Sistémica / cibernética',
      'adultos':'Adultos', 'conducta-antisocial':'Conducta antisocial', 'insomnio':'Insomnio',
      'construccionismo-social':'Construccionismo social', 'toc':'TOC'
    };
    const TAG_FILTER_STATE = new Map(TAG_FACETS.map((facet) => [facet.id, new Set()]));
    let TAGS_BY_MODEL = new Map();
    let TAG_VALUES_BY_FACET = new Map();
    let TAGS_LOAD_PROMISE = null;
    let TAGS_LOAD_ERROR = '';
    const SIGNIFICANT_DIMENSION_PCT = 20;
    const PROCESS_FILTERS = [
      { id:'RF', label:'Regular cuerpo' },
      { id:'RE', label:'Regular emociones' },
      { id:'AP', label:'Procesar experiencia emocional' },
      { id:'RI', label:'Transformar la relación con uno mismo' },
      { id:'N',  label:'Construir significado / narrativa' },
      { id:'I',  label:'Configurar identidad' },
      { id:'AG', label:'Ejercer agencia' },
      { id:'R',  label:'Transformar las relaciones' }
    ];
    const PROCESS_ZONE_COLORS = {
      RF: '#88A6C6',
      RE: '#F26B7A',
      AP: '#B07AA1',
      RI: '#FF9DA7',
      N:  '#E15759',
      I:  '#4E79A7',
      AG: '#d69640',
      R:  '#F1CE63'
    };
    const PROCESS_INFO = {
      RF: {
        title: 'RF — Regulación fisiológica / corporal',
        desc: 'Regulación del sistema corporal y autonómico para reducir hiperactivación, estabilizar y aumentar seguridad en sesión y fuera de sesión.',
        subs: [
          'RF_resp — Respiración y control autonómico',
          'RF_ground — Grounding sensorial',
          'RF_relax — Relajación muscular / somática',
          'RF_intero — Interocepción y mindfulness corporal',
          'RF_crisis — Estabilización rápida en crisis',
          'RF_expo — Exposición fisiológica'
        ]
      },
      RE: {
        title: 'RE — Regulación emocional',
        desc: 'Procesos para identificar, sostener y modular emociones sin evitación experiencial rígida.',
        subs: [
          'RE_rotulacion — Rotulación y claridad emocional',
          'RE_aceptacion — Aceptación emocional',
          'RE_modulacion — Ventana de tolerancia',
          'RE_coregulacion — Co-regulación',
          'RE_reapreciacion — Reapreciación emocional',
          'RE_prevEvitacion — Prevención de evitación emocional'
        ]
      },
      AP: {
        title: 'AP — Acceso y procesamiento emocional',
        desc: 'Activar y procesar emocionalmente material relevante para transformarlo e integrarlo clínicamente.',
        subs: [
          'AP_evocacion — Evocación emocional guiada',
          'AP_profundizacion — Profundización experiencial',
          'AP_somaticoEsquematico — Procesamiento somático / esquemático',
          'AP_procesamiento — Procesamiento estructurado',
          'AP_integracionMemorias — Integración de memorias emocionales',
          'AP_trabajoCorrectivo — Experiencias emocionales correctivas',
          'AP_resolucionConflictos — Resolución de conflictos afectivos'
        ]
      },
      RI: {
        title: 'RI — Relación interna',
        desc: 'Cómo la persona se habla, se observa y se trata internamente; incluye autocrítica, compasión y trabajo con partes.',
        subs: [
          'RI_dialogoFuncional — Diálogo interno funcional',
          'RI_criticoInterno — Crítico interno y vergüenza',
          'RI_autocompasion — Autocompasión',
          'RI_mindfulnessSelf — Mindfulness del self',
          'RI_partesSubpersonalidades — Partes y subpersonalidades',
          'RI_reparacionRepresentaciones — Reparación de representaciones internas'
        ]
      },
      N: {
        title: 'N — Significado / narrativa / regulación cognitiva',
        desc: 'Construcción de marcos de significado, reatribución y flexibilidad cognitiva para reorganizar la experiencia.',
        subs: [
          'N_narrativaAutobiografica — Reautoría autobiográfica',
          'N_marcosCognitivos — Marcos cognitivos y constructivistas',
          'N_insightPsicodinamico — Interpretación / insight',
          'N_reformulacion — Reformulación / reatribución',
          'N_metacognicion — Metacognición',
          'N_construccionAlternativa — Construcción alternativa de sentido'
        ]
      },
      I: {
        title: 'I — Identidad / Self',
        desc: 'Procesos de coherencia, continuidad e integración del self en el tiempo y en la relación con otros.',
        subs: [
          'I_coherenciaInterna — Coherencia interna del self',
          'I_autoimagen — Autoimagen y autovaloración',
          'I_continuidadBiografica — Continuidad biográfica',
          'I_conflictosSelf — Integración de conflictos del self',
          'I_valoresAspiracionales — Valores nucleares e identidad aspiracional',
          'I_selfFuturo — Self futuro',
          'I_posicionRelacional — Posición del self en relaciones',
          'I_fortalezasRecursos — Fortalezas y recursos'
        ]
      },
      AG: {
        title: 'AG — Agencia y acción',
        desc: 'Capacidad de elegir, comprometerse y sostener conducta orientada a valores en lugar de alivio inmediato.',
        subs: [
          'AG_necesidadesPropias — Discriminación de necesidades propias',
          'AG_tomaDecisiones — Toma de decisiones',
          'AG_motivacionInterna — Motivación interna',
          'AG_autoriaResponsabilidad — Autoría y responsabilidad',
          'AG_compromisoConductual — Compromiso conductual'
        ]
      },
      R: {
        title: 'R — Relacional / interpersonal',
        desc: 'Intervención explícita sobre patrones vinculares, límites, apego, mentalización y ciclos relacionales.',
        subs: [
          'R_estilosApego — Estilos de apego',
          'R_comunicacionEmocional — Comunicación emocional',
          'R_limitesInterpersonales — Límites interpersonales',
          'R_reparacionRelacional — Reparación relacional',
          'R_mentalizacion — Mentalización interpersonal',
          'R_coregulacion — Co-regulación interpersonal',
          'R_repertorioInterpersonal — Repertorio interpersonal',
          'R_valoresRelacionales — Valores relacionales',
          'R_sist_ciclos — Ciclos relacionales',
          'R_sist_roles — Roles y reglas del sistema',
          'R_sist_interaccion — Patrones de interacción',
          'R_sist_apoyo — Movilización de apoyo',
          'R_sist_triangulos — Triangulaciones y alianzas',
          'R_sist_guiones — Mandatos y guiones familiares',
          'R_sist_contexto — Ajustes contextuales'
        ]
      }
    };
    const DIMENSION_INFO = {
      cognicion: 'Procesos de interpretación, creencias, inferencias, sesgos y flexibilidad cognitiva.',
      afecto: 'Generación, intensidad, duración y regulación emocional; tolerancia al malestar.',
      atencion: 'Orientación del foco, sesgos atencionales, desenganche y atención plena.',
      self: 'Identidad, autoconcepto, autocrítica/autocompasión y perspectiva del yo.',
      motivacion: 'Dirección de conducta por valores, metas, recompensa/castigo y persistencia.',
      conducta_manifiesta: 'Acciones observables, evitación/aproximación, hábitos y aprendizaje instrumental.',
      biofisiologico: 'Regulación autonómica, sueño, estrés y soporte somático del cambio.',
      sociocultural: 'Relaciones, redes, normas, roles y contextos comunitarios/culturales.'
    };
    const PROCESS_FILTER_MAP = new Map(PROCESS_FILTERS.map((p) => [p.id, p]));
    let ENSURE_ALL_SCHOOLS_PROMISE = null;
    let ENSURE_GROUPING_MODELS_PROMISE = null;
const NETWORK_STATE = {
  sim: null,
  resizeHandler: null,
  loadingTimer: null,
  loadingSince: 0,
  threeD: null
};
const NETWORK_GLOBAL_LAYOUT_CACHE = {
  threeD: {
    signature: '',
    positionsById: new Map(),
    nodeMetaById: new Map(),
    extents: { x:1, y:1, z:1 },
    scale: 120
  }
};
    const NETWORK_FILTER_STATE = {
      activeSchools: new Set(),
      knownSchools: new Set(),
      schoolFiltersInitialized: false,
      minSimDelta: 0,
      query: '',
      selectedNodeId: '',
      selectedZoneKey: '',
      zoomTransform: null,
      profileMode: 'mixed'
    };
  function infoFadeOut(){
  if(!modelInfoEl) return;
  modelInfoEl.classList.add('is-loading');
}

function infoFadeIn(){
  if(!modelInfoEl) return;
  // 2 RAF = garantiza que el browser “ve” el render antes de animar
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    modelInfoEl.classList.remove('is-loading');
  }));
}

function beginModelInfoPending(id){
  const key = String(id ?? '').trim();
  const hasOpenProfile = document.body.classList.contains('model-info-open') && !!String(currentModelId ?? '').trim();
  document.body.dataset.pendingModelId = key;
  modelInfoEl?.setAttribute('aria-busy', 'true');
  // Keep the source view visible on the first opening. When changing between
  // open fiches, the current fiche stays in place until its replacement exists.
  if (!hasOpenProfile) document.body.classList.add('model-info-pending');
}

function endModelInfoPending(id){
  const key = String(id ?? '').trim();
  if (key && document.body.dataset.pendingModelId !== key) return;
  document.body.classList.remove('model-info-pending');
  delete document.body.dataset.pendingModelId;
  modelInfoEl?.removeAttribute('aria-busy');
}

// ================= MODO LECTURA PANEL DERECHO (SUAVE) =================

const leftPanel  = document.querySelector('.panel.left');
const rightPanel = document.querySelector('.panel.right');

function isMobileViewport(){
  return !!(window.matchMedia && window.matchMedia('(max-width: 980px)').matches);
}

function computeMobilePanelShiftPx(){
  const rp = document.querySelector('.panel.right');
  if (!rp) return 0;
  const topPx = parseFloat(getComputedStyle(rp).top || '0') || 0;
  return Math.max(56, Math.round(topPx * 0.5));
}

function setMobileModelPanelLowered(lowered){
  const rp = document.querySelector('.panel.right');
  const lp = document.querySelector('.panel.left');
  if (!rp) return;
  if (!isMobileViewport() || document.body.classList.contains('infoFull')){
    rp.classList.remove('mobile-lowered');
    rp.style.removeProperty('--mobilePanelShift');
    if (lp){
      lp.classList.remove('mobile-expanded');
      lp.style.removeProperty('--mobilePanelShift');
    }
    document.body.classList.remove('mobile-model-lowered');
    return;
  }

  if (lowered){
    const shift = `${computeMobilePanelShiftPx()}px`;
    rp.style.setProperty('--mobilePanelShift', shift);
    rp.classList.add('mobile-lowered');
    if (lp){
      lp.style.setProperty('--mobilePanelShift', shift);
      lp.classList.add('mobile-expanded');
    }
    document.body.classList.add('mobile-model-lowered');
  }else{
    rp.classList.remove('mobile-lowered');
    rp.style.setProperty('--mobilePanelShift', '0px');
    if (lp){
      lp.classList.remove('mobile-expanded');
      lp.style.setProperty('--mobilePanelShift', '0px');
    }
    document.body.classList.remove('mobile-model-lowered');
  }
}

function applyMobilePanelShiftDuringDrag(shiftPx){
  const rp = document.querySelector('.panel.right');
  const lp = document.querySelector('.panel.left');
  if (!rp || !isMobileViewport() || document.body.classList.contains('infoFull')) return;

  const maxShift = computeMobilePanelShiftPx();
  const clamped = Math.max(0, Math.min(maxShift, shiftPx));
  const shift = `${Math.round(clamped)}px`;

  rp.style.setProperty('--mobilePanelShift', shift);
  if (clamped > 0.5){
    rp.classList.add('mobile-lowered');
    document.body.classList.add('mobile-model-lowered');
  }else{
    rp.classList.remove('mobile-lowered');
    document.body.classList.remove('mobile-model-lowered');
  }

  if (lp){
    lp.style.setProperty('--mobilePanelShift', shift);
    if (clamped > 0.5) lp.classList.add('mobile-expanded');
    else lp.classList.remove('mobile-expanded');
  }
}

function setupMobilePanelDragGesture(){
  const rp = document.querySelector('.panel.right');
  if (!rp || rp.__mobileDragBound) return;
  rp.__mobileDragBound = true;

  const state = {
    active: false,
    startY: 0,
    startShift: 0,
    maxShift: 0
  };

  const getCurrentShift = () => {
    const raw = parseFloat(getComputedStyle(rp).getPropertyValue('--mobilePanelShift') || '0');
    if (Number.isFinite(raw) && raw > 0) return raw;
    return rp.classList.contains('mobile-lowered') ? computeMobilePanelShiftPx() : 0;
  };

  rp.addEventListener('touchstart', (evt) => {
    if (!isMobileViewport() || document.body.classList.contains('infoFull')) return;
    if (!rp.classList.contains('mobile-lowered')) return;
    if (!evt.touches || evt.touches.length !== 1) return;

    state.active = true;
    state.startY = evt.touches[0].clientY;
    state.maxShift = computeMobilePanelShiftPx();
    state.startShift = getCurrentShift();

    rp.style.transition = 'none';
    const lp = document.querySelector('.panel.left');
    if (lp) lp.style.transition = 'none';
  }, { passive: true });

  rp.addEventListener('touchmove', (evt) => {
    if (!state.active || !evt.touches || !evt.touches.length) return;

    const y = evt.touches[0].clientY;
    const dy = y - state.startY;
    applyMobilePanelShiftDuringDrag(state.startShift + dy);
    evt.preventDefault();
  }, { passive: false });

  const endDrag = () => {
    if (!state.active) return;
    state.active = false;

    rp.style.removeProperty('transition');
    const lp = document.querySelector('.panel.left');
    if (lp) lp.style.removeProperty('transition');

    const current = parseFloat(getComputedStyle(rp).getPropertyValue('--mobilePanelShift') || '0') || 0;
    const keepLowered = current > (state.maxShift * 0.42);
    setMobileModelPanelLowered(keepLowered);
  };

  rp.addEventListener('touchend', endDrag, { passive: true });
  rp.addEventListener('touchcancel', endDrag, { passive: true });
}
function setInfoFullscreen(on){
  document.body.classList.toggle('infoFull', !!on);
  window.dispatchEvent(new CustomEvent('modelInfoFullChange'));
}

function setModelInfoOpen(on){
  document.body.classList.toggle('model-info-open', !!on);
}

function openMobileModelFullscreen(){
  if (!isMobileViewport()) return;
  setInfoFullscreen(true);
  setMobileModelPanelLowered(false);
  resetModelPanelToTop();
}

function closeMobileModelInfoToList(){
  if (window.TMPS_ATLAS) return window.TMPS_ATLAS.closeSelection();
  endModelInfoPending();
  setInfoFullscreen(false);
  setModelInfoOpen(false);
  if (window.__SMH) window.__SMH.hide();

  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';
  updateLibraryUrl();
  setLibrarySeo();
  setMobileModelPanelLowered(false);
  if (groupingMode === 'school' || groupingMode === 'collection' || groupingMode === 'epistemology'){
    renderSchoolInfo(currentSchool);
  }else{
    renderModelInfo(null);
  }
  renderModelsList();
  resetRightPanelToTop();
}

(function setupModelCloseButton(){
  if (document.getElementById('btnModelClose')) return;
  const btn = document.createElement('button');
  btn.id = 'btnModelClose';
  btn.className = 'modelCloseBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', uiText('model.closeProfile', 'Cerrar ficha'));
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6M10 12h9"
        stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  btn.addEventListener('click', closeMobileModelInfoToList);
  document.body.appendChild(btn);
})();

// ===== FULLSCREEN del panel de info (panel derecho) =====
(function setupInfoFullscreen(){
  const modelInfoEl = document.getElementById('modelInfo');
  if (!modelInfoEl) return;

  // Evita duplicados
  if (document.getElementById('btnInfoFull')) return;

  const btn = document.createElement('button');
  btn.id = 'btnInfoFull';
  btn.className = 'mp-fullBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', uiText('auth.fullscreen', 'Pantalla completa'));

  const iconExpand = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const iconClose = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  function syncIcon(){
    const on = document.body.classList.contains('infoFull');
    btn.innerHTML = on ? iconClose : iconExpand;
    btn.setAttribute('aria-label', on
      ? uiText('common.close', 'Cerrar')
      : uiText('auth.fullscreen', 'Pantalla completa'));
  }

btn.addEventListener('click', () => {
  if (document.body.classList.contains('infoFull') && isMobileViewport()){
    closeMobileModelInfoToList();
    syncIcon();
    return;
  }

  setInfoFullscreen(!document.body.classList.contains('infoFull'));

  // Opcional: al abrir, arranca arriba del panel
  if (document.body.classList.contains('infoFull')){
    const rp = document.querySelector('.panel.right');
    if (rp) rp.scrollTop = 0;

    // al entrar en fullscreen: recalcula observadores
    if (window.__SMH) window.__SMH.rescan();
  }else{
    // al salir: oculta header

  }

  syncIcon();
});

  window.addEventListener('modelInfoFullChange', syncIcon);


  // ESC para cerrar (útil en desktop)
  window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('infoFull')){
  setInfoFullscreen(false);
  if (window.__SMH) window.__SMH.hide();
  syncIcon();
}

  });

  function closeModelToListFromSwipe(direction){
    if (!document.body.classList.contains('infoFull')) return;
    if (!currentModelId) return;

    const outCls = (direction === 'right') ? 'model-swipe-out-right' : 'model-swipe-out-left';
    document.body.classList.remove('model-swipe-out-left', 'model-swipe-out-right');
    document.body.classList.add(outCls);

    setTimeout(() => {
      setInfoFullscreen(false);
      document.body.classList.remove('model-swipe-out-left', 'model-swipe-out-right');
      if (window.__SMH) window.__SMH.hide();
      syncIcon();

      currentModelId = null;
      window.__CURRENT_MODEL_ID = '';
      updateLibraryUrl();
      setLibrarySeo();
      setModelInfoOpen(false);
      setMobileModelPanelLowered(false);
      renderSchoolInfo(currentSchool);
      renderModelsList();
      resetRightPanelToTop();
    }, 220);
  }

const host = document.querySelector('.panel.right');
if (!host) return;

  // Swipe horizontal en fullscreen móvil para cerrar modelo activo
  const swipe = { active:false, sx:0, sy:0, dx:0, dy:0, lockX:false };
  host.addEventListener('touchstart', (evt) => {
    swipe.active = false;
    if (!document.body.classList.contains('infoFull')) return;
    if (!isMobileViewport()) return;
    if (!currentModelId) return;
    if (!evt.touches || evt.touches.length !== 1) return;

    // En los módulos especiales, el gesto horizontal pertenece al graph,
    // no al cierre de la ficha completa.
    const touchTarget = evt.target instanceof Element ? evt.target : evt.target?.parentElement;
    if (touchTarget?.closest('.ed-architecture')) return;

    const t = evt.touches[0];
    swipe.active = true;
    swipe.sx = t.clientX;
    swipe.sy = t.clientY;
    swipe.dx = 0;
    swipe.dy = 0;
    swipe.lockX = false;
  }, { passive:true });

  host.addEventListener('touchmove', (evt) => {
    if (!swipe.active || !evt.touches || !evt.touches.length) return;
    const t = evt.touches[0];
    swipe.dx = t.clientX - swipe.sx;
    swipe.dy = t.clientY - swipe.sy;

    if (!swipe.lockX && Math.abs(swipe.dx) > 10 && Math.abs(swipe.dx) > Math.abs(swipe.dy) * 1.15){
      swipe.lockX = true;
    }
    if (swipe.lockX) evt.preventDefault();
  }, { passive:false });

  const endSwipe = () => {
    if (!swipe.active) return;
    swipe.active = false;

    if (!swipe.lockX) return;
    if (Math.abs(swipe.dx) < 70) return;
    closeModelToListFromSwipe(swipe.dx > 0 ? 'right' : 'left');
  };
  host.addEventListener('touchend', endSwipe, { passive:true });
  host.addEventListener('touchcancel', endSwipe, { passive:true });

// ===== Sticky header (solo en fullscreen y cuando no se ve mp-title/mp-author) =====
let __smh = document.getElementById('stickyModelHeader');
if (!__smh){
  __smh = document.createElement('div');
  __smh.id = 'stickyModelHeader';
__smh.innerHTML = `
  <div class="smh-overlay">
    <div class="smh-text">
      <span class="smh-dot"></span>
      <div class="smh-title" id="smhTitle">—</div>
      <div class="smh-author" id="smhAuthor"></div>
    </div>
    <nav class="smh-nav" id="smhNav" aria-label="${escapeHtml(uiText('model.sections', 'Secciones del modelo'))}"></nav>
  </div>
`;


  host.insertBefore(__smh, host.firstChild);
}

let __io = null;
let __smhSections = [];
let __smhActiveId = '';
let __smhNavTouching = false;

function isSmartphoneViewport(){
  return window.matchMedia && window.matchMedia('(max-width: 620px)').matches;
}

function clampStickyNavScroll(nav, value){
  const max = Math.max(0, nav.scrollWidth - nav.clientWidth);
  return Math.max(0, Math.min(max, value));
}

function revealStickyHeaderButton(button, behavior = 'smooth'){
  const nav = document.getElementById('smhNav');
  if (!nav || !button || !isSmartphoneViewport() || __smhNavTouching) return;
  if (nav.scrollWidth <= nav.clientWidth + 1) return;

  const inset = 8;
  const navRect = nav.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const buttonLeftInNav = buttonRect.left - navRect.left + nav.scrollLeft;
  const targetLeft = clampStickyNavScroll(nav, buttonLeftInNav - inset);
  nav.scrollTo({ left:targetLeft, behavior });
}

function syncStickyHeaderSections(){
  const nav = document.getElementById('smhNav');
  if (!nav) return;
  __smhSections = Array.from(document.querySelectorAll('#modelInfo [data-smh-section]'))
    .filter((section) => section.id);
  let numberedIndex = 0;
  nav.innerHTML = __smhSections.map((section, index) => {
    const label = section.getAttribute('data-smh-label') || `Sección ${index + 1}`;
    const isUnnumbered = section.hasAttribute('data-smh-unnumbered');
    const number = isUnnumbered ? '' : String(numberedIndex++).padStart(2, '0');
    return `<button class="smh-navLink${index === 0 ? ' is-active' : ''}${isUnnumbered ? ' is-special' : ''}" type="button" data-smh-target="${escapeHtml(section.id)}">${number ? `<span>${number}</span>&nbsp; ` : ''}${escapeHtml(label)}</button>`;
  }).join('');
  __smhActiveId = __smhSections[0]?.id || '';
  nav.scrollLeft = 0;
}

function updateStickyHeaderActiveSection(){
  if (!__smhSections.length) return;
  const hostRect = host.getBoundingClientRect();
  const markerY = hostRect.top + Math.min(150, hostRect.height * 0.22);
  let active = __smhSections[0];
  __smhSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= markerY) active = section;
  });
  let activeButton = null;
  document.querySelectorAll('#smhNav .smh-navLink').forEach((button) => {
    const isActive = button.dataset.smhTarget === active.id;
    button.classList.toggle('is-active', isActive);
    if (isActive) activeButton = button;
  });
  if (active.id !== __smhActiveId){
    __smhActiveId = active.id;
    revealStickyHeaderButton(activeButton);
  }
}

__smh.addEventListener('click', (event) => {
  const button = event.target.closest('[data-smh-target]');
  if (!button) return;
  const target = document.getElementById(button.dataset.smhTarget || '');
  if (!target) return;
  const headerHeight = __smh.querySelector('.smh-overlay')?.offsetHeight || 62;
  const top = target.offsetTop - headerHeight - 8;
  document.querySelectorAll('#smhNav .smh-navLink').forEach((navButton) => {
    navButton.classList.toggle('is-active', navButton === button);
  });
  __smhActiveId = target.id;
  revealStickyHeaderButton(button);
  host.scrollTo({ top:Math.max(0, top), behavior:'smooth' });
});

__smh.addEventListener('touchstart', (event) => {
  if (event.target.closest('#smhNav')) __smhNavTouching = true;
}, { passive:true });

__smh.addEventListener('touchend', () => {
  __smhNavTouching = false;
}, { passive:true });

__smh.addEventListener('touchcancel', () => {
  __smhNavTouching = false;
}, { passive:true });

host.addEventListener('scroll', updateStickyHeaderActiveSection, { passive:true });

function setupStickyHeaderObservers(){
  if (__io){ try{ __io.disconnect(); }catch(e){} __io = null; }

  const titleEl  = document.querySelector('#modelInfo .mp-title');
  const authorEl = document.querySelector('#modelInfo .mp-author');

// ✅ Si estamos en vista ESCUELA, el sticky NO debe existir nunca
const mi = document.getElementById('modelInfo');
if (mi && mi.classList.contains('school-view')){
  __smh.classList.remove('is-on');
  if (__io){ try{ __io.disconnect(); }catch(e){} __io = null; }
  return;
}

// ✅ Si aún no hay mp-title/mp-author (render en curso), no fuerces reintentos
if (!titleEl || !authorEl){
  __smh.classList.remove('is-on');
  if (__io){ try{ __io.disconnect(); }catch(e){} __io = null; }
  return;
}




  let titleVisible = true;
  let authorVisible = true;

const update = () => {
  const mi = document.getElementById('modelInfo');

  // ✅ Nunca muestres sticky en escuela
  if (mi && mi.classList.contains('school-view')){
    __smh.classList.remove('is-on');
    return;
  }

  const show = (!titleVisible && !authorVisible);
  __smh.classList.toggle('is-on', show);
};


  __io = new IntersectionObserver((entries) => {
    for (const en of entries){
      if (en.target === titleEl)  titleVisible  = en.isIntersecting;
      if (en.target === authorEl) authorVisible = en.isIntersecting;
    }
    update();
  }, { root: host, threshold: 0.01 });

  __io.observe(titleEl);
  __io.observe(authorEl);

  // estado inicial
  update();
}

// Exponemos una mini API para que el render del modelo actualice el texto
window.__SMH = {
  setTitle: (txt) => {
    const t = document.getElementById('smhTitle');
    if (t) t.textContent = txt || '—';
  },
  setAuthor: (txt) => {
  const a = document.getElementById('smhAuthor');
  if (!a) return;
  const t = (txt || '').trim();
  a.textContent = t;
  a.style.display = t ? 'block' : 'none';
},

  rescan: () => {
    syncStickyHeaderSections();
    setupStickyHeaderObservers();
    updateStickyHeaderActiveSection();
  },
 hide: () => { __smh.classList.remove('is-on'); }

};

// ✅ 1) El botón vive fuera del panel (para que "fixed" sea de verdad)
document.body.appendChild(btn);

// ✅ 2) Lo anclamos visualmente a la esquina sup. derecha del panel
function placeBtn(){
  // si no hay panel, no hacemos nada
  const rp = document.querySelector('.panel.right');
  if (!rp) return;

  const r = rp.getBoundingClientRect();
  const pad = 12;  // mismo padding visual que quieres
  const size = 34; // mismo tamaño del botón

  // colocación en viewport
  btn.style.top  = `${Math.round(r.top + pad)}px`;
  btn.style.left = `${Math.round(r.right - pad - size)}px`;
}

placeBtn();
window.addEventListener('resize', placeBtn, { passive:true });
window.addEventListener('scroll', placeBtn, { passive:true }); // por si el contenedor externo se desplaza

// cuando haces toggle a fullscreen cambia el rect: recolocamos
const _oldSync = syncIcon;
syncIcon = function(){
  _oldSync();
  placeBtn();
};

syncIcon();


})();

/* ===== DETECTAR STICKY PEGADO ARRIBA ===== */
if (leftPanel){
  leftPanel.addEventListener('scroll', () => {
    const sticky = leftPanel.querySelector('.leftTopSticky');
    if (!sticky) return;

    const r = sticky.getBoundingClientRect();
    const p = leftPanel.getBoundingClientRect();

    // Si ya está pegado arriba
    const stuck = Math.abs(r.top - p.top) < 2;

    sticky.classList.toggle('stuck', stuck);

    // En móvil: al hacer scroll por tarjetas, baja suavemente el panel de modelo
    if (!isMobileViewport() && leftPanel.scrollTop > 8){
      setMobileModelPanelLowered(true);
    }
  }, { passive:true });
}

window.addEventListener('resize', () => {
  setMobileModelPanelLowered(false);
  syncDesktopLeftListScrollMode();
}, { passive:true });

setupMobilePanelDragGesture();

function cycleSchoolBySwipe(direction){
  if (groupingMode !== 'school') return;
  if (!schoolSelect) return;
  const values = Array.from(schoolSelect.options || [])
    .map(o => String(o.value || '').trim())
    .filter(Boolean);
  if (values.length < 2) return;

  const current = String(schoolSelect.value || '').trim();
  let idx = values.indexOf(current);
  if (idx < 0) idx = 0;

  const nextIdx = (direction === 'next')
    ? (idx + 1) % values.length
    : (idx - 1 + values.length) % values.length;

  if (nextIdx === idx) return;

  const outCls = (direction === 'next') ? 'school-swipe-out-right' : 'school-swipe-out-left';
  const targets = [schoolSelect, modelsListEl, modelInfoEl, countLine].filter(Boolean);
  targets.forEach(el => {
    el.classList.remove('school-swipe-out-left','school-swipe-out-right','school-swipe-in-left','school-swipe-in-right');
    el.classList.add(outCls);
  });

  window.__schoolSwipeDir = direction;

  setTimeout(() => {
    schoolSelect.value = values[nextIdx];
    schoolSelect.dispatchEvent(new Event('change', { bubbles:true }));
  }, 170);
}

function setupMobileSchoolSwipe(){
  if (!modelsListEl || modelsListEl.__boundSwipeSchools) return;
  modelsListEl.__boundSwipeSchools = true;

  const swipe = { active:false, sx:0, sy:0, dx:0, dy:0, lockX:false };

  modelsListEl.addEventListener('touchstart', (evt) => {
    if (!isMobileViewport()) return;
    if (document.body.classList.contains('infoFull')) return;
    if (!evt.touches || evt.touches.length !== 1) return;
    if (modelsListEl.__loading) return;

    const interactive = evt.target.closest('button, a, input, textarea, select, label');
    if (interactive) return;

    const t = evt.touches[0];
    swipe.active = true;
    swipe.sx = t.clientX;
    swipe.sy = t.clientY;
    swipe.dx = 0;
    swipe.dy = 0;
    swipe.lockX = false;
  }, { passive:true });

  modelsListEl.addEventListener('touchmove', (evt) => {
    if (!swipe.active || !evt.touches || !evt.touches.length) return;
    const t = evt.touches[0];
    swipe.dx = t.clientX - swipe.sx;
    swipe.dy = t.clientY - swipe.sy;

    if (!swipe.lockX && Math.abs(swipe.dx) > 12 && Math.abs(swipe.dx) > Math.abs(swipe.dy) * 1.15){
      swipe.lockX = true;
    }
    if (swipe.lockX) evt.preventDefault();
  }, { passive:false });

  const endSwipe = () => {
    if (!swipe.active) return;
    swipe.active = false;

    if (!swipe.lockX) return;
    if (Math.abs(swipe.dx) < 70) return;

    if (swipe.dx > 0){
      cycleSchoolBySwipe('next'); // derecha -> siguiente
    }else{
      cycleSchoolBySwipe('prev'); // izquierda -> anterior
    }
  };

  modelsListEl.addEventListener('touchend', endSwipe, { passive:true });
  modelsListEl.addEventListener('touchcancel', endSwipe, { passive:true });
}

// ================= FIN MODO LECTURA (SUAVE) =================


    let currentSchool = null;
    let currentModelId = null;
    window.__CURRENT_MODEL_ID = '';

    function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }

function scheduleIdleTask(fn, timeout = 1200){
  if (typeof window.requestIdleCallback === 'function'){
    return window.requestIdleCallback(fn, { timeout });
  }
  return setTimeout(fn, 120);
}

function syncDesktopLeftListScrollMode(){
  const isDesktop = !isMobileViewport();
  const enableListOnly = isDesktop && groupingMode !== 'network';
  const enableNetworkZoneOnly = isDesktop && groupingMode === 'network' && !!String(NETWORK_FILTER_STATE.selectedZoneKey || '').trim();
  document.body.classList.toggle('desktop-left-list-scroll', enableListOnly);
  document.body.classList.toggle('desktop-network-zone-scroll', enableNetworkZoneOnly);
}

function showLanding(){
  const ov = document.getElementById('landingOverlay');
  if (!ov) return;

  ov.classList.add('is-on');
  document.body.classList.add('landing-on');

  ov.setAttribute('aria-hidden', 'false');

  // botón "Entrar" (por si alguien quiere cerrar sin elegir)
  const close = document.getElementById('landingClose');
  if (close && !close.__bound){
    close.__bound = true;
    close.addEventListener('click', () => hideLanding(), { passive:true });
  }
}

function hideLanding(){
  const ov = document.getElementById('landingOverlay');
  if (!ov) return;
  ov.classList.remove('is-on');
  document.body.classList.remove('landing-on');

  ov.setAttribute('aria-hidden', 'true');
}
function normSchoolName(s){
  return String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')  // quita acentos
    .toLowerCase();
}

// Cachea conteos para no refetchear
const LANDING_COUNT_CACHE = new Map(); // key: school id/label normalizado -> number

async function landingCountForSchool(label){
  const target = normSchoolName(label);

  // 0) Si ya lo tengo cacheado
  if (LANDING_COUNT_CACHE.has(target)) return LANDING_COUNT_CACHE.get(target);

  // 1) Fallback inmediato: locales (sirve mientras carga GH)
  const localN = MODELOS_LOCALE === 'en' ? 0 : (LOCAL_MODELS || [])
    .filter(isModelVisibleInApp)
    .filter(m => normSchoolName(m.grupo) === target)
    .length;

  // 2) Intento GitHub: buscar la entrada del índice (solo trae file)
  const entry = (GH_SCHOOLS || []).find(s => {
    const name = s.label ?? s.id ?? '';
    return normSchoolName(name) === target;
  });

  if (!entry || !entry.file){
    LANDING_COUNT_CACHE.set(target, localN);
    return localN;
  }

  try{
    if (MODELOS_LOCALE !== 'es') {
      const localized = await fetchFirstJson(
        dataUrlCandidates(`Core/i18n/${MODELOS_LOCALE}/escuelas/${entry.id}.json`),
        { quiet:true }
      );
      const translated = Array.isArray(localized?.modelos) ? localized.modelos : [];
      const n = translated.filter(isModelVisibleInApp).length;
      LANDING_COUNT_CACHE.set(target, n);
      return n;
    }

    // Carga el archivo real de la escuela y cuenta sus modelos
    const school = await fetchFirstJson(dataUrlCandidates(`Core/${entry.file}`), { quiet:true });
    const countList =
      (Array.isArray(school?.modelos) ? school.modelos : null) ||
      (Array.isArray(school?.models) ? school.models : null) ||
      (school?.modelos && typeof school.modelos === 'object' ? Object.values(school.modelos) : null) ||
      (school?.models && typeof school.models === 'object' ? Object.values(school.models) : null) ||
      [];
    const ghN = countList.filter(isModelVisibleInApp).length;

    const n = ghN || localN;
    LANDING_COUNT_CACHE.set(target, n);
    return n;
  }catch(e){
    console.warn('No se pudo contar modelos GH para', label, e);
    LANDING_COUNT_CACHE.set(target, localN);
    return localN;
  }
}


function buildLandingSchools(){
  const grid = document.getElementById('landingGrid');
  if (!grid) return;

  // Sacamos escuelas del propio <select> (así coincide 100% con lo disponible)
  const opts = Array.from(schoolSelect?.options || []);
  const schools = opts.map(o => o.value).filter(Boolean);
  const search = document.getElementById('landingSearchInput');
  const status = document.getElementById('landingIndexStatus');
  const schoolTotal = document.getElementById('landingSchoolTotal');
  const modelTotal = document.getElementById('landingModelTotal');
  const empty = document.getElementById('landingEmpty');
  let availableSchoolCount = schools.length;

  if (schoolTotal) schoolTotal.textContent = String(schools.length);

 grid.innerHTML = schools.map((label, index) => {
  const col = groupColor.get(label) || '#D9AA3F';
  const displayLabel = schoolDisplayLabel(label) || label;
  const desc = SCHOOL_INFO[label]?.subtitle || uiText(
    'landing.schoolDefaultDescription',
    'Colección de modelos y desarrollos clínicos relacionados.'
  );

  // Pinta placeholder; luego lo rellenamos async
return `
  <button type="button" class="landingSchool" data-school="${escapeHtml(label)}" data-search="${escapeHtml(`${label} ${displayLabel} ${desc}`.toLowerCase())}" style="--schoolColor:${col}">
    <span class="landingSchoolIndex">${String(index + 1).padStart(2, '0')}</span>
    <span class="landingSchoolCopy">
      <span class="landingSchoolName">${escapeHtml(displayLabel)}</span>
      <span class="landingSchoolDesc">${escapeHtml(desc)}</span>
    </span>
    <div class="landingSchoolMeta">
      <span class="landingSchoolCount">
        <span class="landingCount" data-count-for="${escapeHtml(label)}">…</span>
        <span class="landingCountLabel">${escapeHtml(uiPlural('common.model', 2, 'modelo', 'modelos'))}</span>
      </span>
      <span class="landingSchoolArrow" aria-hidden="true">→</span>
    </div>
  </button>
`;

}).join('');

  function filterLandingSchools(){
    const query = normSchoolName(search?.value || '');
    let shown = 0;

    grid.querySelectorAll('.landingSchool').forEach(card => {
      const haystack = normSchoolName(card.getAttribute('data-search') || '');
      const hasPublishedModels = MODELOS_LOCALE === 'es'
        || card.dataset.modelCount === ''
        || Number(card.dataset.modelCount) > 0;
      const visible = hasPublishedModels && (!query || haystack.includes(query));
      card.hidden = !visible;
      if (visible) shown += 1;
    });

    if (status){
      status.textContent = query
        ? uiText('landing.status.filtered', `${shown} de ${availableSchoolCount} escuelas`, { shown, total:availableSchoolCount })
        : uiText('landing.status.collections', `${availableSchoolCount} escuelas`, { count:availableSchoolCount });
    }
    if (empty) empty.classList.toggle('is-visible', shown === 0);
  }

  if (search && !search.__bound){
    search.__bound = true;
    search.addEventListener('input', filterLandingSchools);
  }
  filterLandingSchools();

// Relleno async de conteos (GitHub real)
(async () => {
  let total = 0;
  for (const label of schools){
    const n = await landingCountForSchool(label);
    const el = grid.querySelector(`.landingCount[data-count-for="${CSS.escape(label)}"]`);
    if (el){
  const nn = Number(n) || 0;
  total += nn;
  el.textContent = String(nn);
  const card = el.closest('.landingSchool');
  if (card) card.dataset.modelCount = String(nn);

  const lab = el.closest('.landingSchool')?.querySelector('.landingCountLabel');
  if (lab) lab.textContent = uiPlural('common.model', nn, 'modelo', 'modelos');
  if (modelTotal) modelTotal.textContent = String(total);
}

  }
  availableSchoolCount = MODELOS_LOCALE === 'es'
    ? schools.length
    : [...grid.querySelectorAll('.landingSchool')].filter((card) => Number(card.dataset.modelCount) > 0).length;
  if (schoolTotal) schoolTotal.textContent = String(availableSchoolCount);
  filterLandingSchools();
  if (status && !normSchoolName(search?.value || '')){
    status.textContent = uiText(
      'landing.status.summary',
      `${total} modelos · ${availableSchoolCount} escuelas`,
      { models:total, schools:availableSchoolCount }
    );
  }
})();


  if (!grid.__bound){
    grid.__bound = true;
    grid.addEventListener('click', async (evt) => {
      const card = evt.target.closest('.landingSchool');
      if (!card) return;

      const label = card.getAttribute('data-school');
      if (!label) return;

      // 1) seleccionar en el desplegable
      schoolSelect.value = label;
      currentSchool = label;
      groupingTarget = label;

      // 2) disparar el flujo normal
      await handleGroupingModeChange('school');

      // 3) ocultar landing
      hideLanding();
    });
  }
}

function buildSchoolOptions(){
  const localSchools = uniq(LOCAL_MODELS.map(m => m.grupo));
  const ghSchools = (GH_SCHOOLS || []).map(s => s.label || s.id).filter(Boolean);

  // unión sin duplicados
  const set = new Set(
    [...localSchools, ...ghSchools].filter(isCanonicalSchoolName)
  );
 const schoolOrder = [
  'Psicoanálisis',
  'Conductismo',
  'Humanista',
  'Cognitivo',
  'Sistémico',
  'Constructivista',
  'Integrativo'
];

const orderMap = new Map(schoolOrder.map((s,i)=>[s,i]));

const schools = [...set].sort((a,b)=>{
  const ia = orderMap.has(a) ? orderMap.get(a) : 999;
  const ib = orderMap.has(b) ? orderMap.get(b) : 999;
  return (ia - ib) || a.localeCompare(b, MODELOS_LOCALE);
});


  // El valor sigue siendo la etiqueta canonica en espanol, que es la clave; solo
  // cambia el texto visible.
  schoolSelect.innerHTML = schools
    .map(g => `<option value="${escapeHtml(g)}">${escapeHtml(schoolDisplayLabel(g))}</option>`)
    .join('');

  currentSchool = schools[0] ?? null;
  schoolSelect.value = currentSchool ?? '';
}

function getModelDependencyParentId(model){
  return String(
    model?.pende ??
    model?.pendeDe ??
    model?.dependeDe ??
    model?.parentId ??
    model?.modeloPadre ??
    ''
  ).trim();
}

function isDependentProgramCard(model){
  return getModelTypeInfo(model).key === 'programa' && !!getModelDependencyParentId(model);
}

function buildDependentProgramMap(list){
  const rows = Array.isArray(list) ? list : [];
  const idsInList = new Set(rows.map((model) => String(model?.id ?? '').trim()).filter(Boolean));
  const childrenByParent = new Map();
  const attachedChildIds = new Set();

  rows.forEach((model) => {
    if (!getModelDependencyParentId(model)) return;
    const parentId = getModelDependencyParentId(model);
    const childId = String(model?.id ?? '').trim();
    if (!parentId || !idsInList.has(parentId)) return;

    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(model);
    if (childId) attachedChildIds.add(childId);
  });

  return { childrenByParent, attachedChildIds };
}

function buildModelListItemMarkup(model, options = {}){
  const active = (String(model.id) === String(currentModelId)) ? 'active' : '';
  const safeId = encodeURIComponent(String(model.id ?? '').trim());
  const schoolColor = colorForSchoolLabel(model.grupo);
  const typeInfo = getModelTypeInfo(model);
  const marcoClass = typeInfo.key === 'marco' ? 'is-marco' : '';
  const dependentClass = options.dependent ? 'is-dependent-program' : '';
  const pendeAttr = options.dependent
    ? ` data-pende="${escapeHtml(getModelDependencyParentId(model))}"`
    : '';
  const authorText = escapeHtml(model.autores ?? '-');
  const isEpistemologiaList = isEpistemologiaListMode();
  const avatarHtml = isEpistemologiaList
    ? `<div class="mi-avatarFallback" aria-hidden="true">${escapeHtml(getAuthorInitials(model?.autores))}</div>`
    : buildModelCardAvatarHtml(model);

  return `
  <div class="mi-item ${active} ${marcoClass} ${dependentClass}" data-id="${safeId}"${pendeAttr} style="--schoolColor:${escapeHtml(schoolColor)}">
    <div class="mi-shell">
      <div class="mi-avatar">${avatarHtml}</div>
      <div class="mi-body">
        <div class="mi-top">
          <div class="mi-titleWrap">
            <span class="mi-accentDot" aria-hidden="true"></span>
            <div class="mi-title">${escapeHtml(model.label ?? '-')}</div>
          </div>
          <div class="mi-meta">
            <div class="mi-year">${escapeHtml(model.year ?? '-')}</div>
          </div>
        </div>
        <div class="mi-sub">${authorText}</div>
      </div>
    </div>
  </div>
`;
}

function buildModelSectionsMarkup(list){
  const { childrenByParent, attachedChildIds } = buildDependentProgramMap(list);
  const sectionDefs = TYPE_SECTION_ORDER.map((key) => ({
    key,
    label: typeSectionLabel(key)
  }));

  return sectionDefs
    .map((section) => {
      const rows = list.filter((model) => {
        const id = String(model?.id ?? '').trim();
        return getModelTypeInfo(model).key === section.key && !attachedChildIds.has(id);
      });
      if (!rows.length) return '';

      return `
        <section class="mi-section" data-section-type="${escapeHtml(section.key)}">
          <div class="mi-sectionHeader" aria-hidden="true">
            <span class="mi-sectionLine"></span>
            <span class="mi-sectionLabel">${escapeHtml(section.label)}</span>
            <span class="mi-sectionLine"></span>
          </div>
          ${rows.map((model) => {
            const parentId = String(model?.id ?? '').trim();
            const children = childrenByParent.get(parentId) || [];
            const childMarkup = children.length
              ? `<div class="mi-dependencyGroup" data-parent-id="${escapeHtml(parentId)}" style="--schoolColor:${escapeHtml(colorForSchoolLabel(model.grupo))}">${children.map((child) => buildModelListItemMarkup(child, { dependent:true })).join('')}</div>`
              : '';
            return buildModelListItemMarkup(model) + childMarkup;
          }).join('')}
        </section>
      `;
    })
    .filter(Boolean)
    .join('');
}

async function openSchoolTimeline(schoolLabel = ''){
  const school = String(schoolLabel || currentSchool || (groupingMode === 'school' ? groupingTarget : '') || '').trim();
  if (!school) return false;

  const nextGroupingMode = groupingModeForSchool(school);
  const collection = collectionDefinitionForSchool(school);

  currentSchool = school;
  groupingMode = nextGroupingMode;
  listGroupingMode = nextGroupingMode;
  groupingTarget = collection?.id || school;
  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';

  if (schoolSelect && nextGroupingMode === 'school') schoolSelect.value = school;
  if (groupBySelectEl) groupBySelectEl.value = listGroupingMode;
  syncLibraryViewControls();
  syncGroupingTargetOptions();
  if (groupTargetSelectEl && nextGroupingMode !== 'epistemology') groupTargetSelectEl.value = groupingTarget;

  setInfoFullscreen(isMobileViewport());
  setModelInfoOpen(false);
  setMobileModelPanelLowered(false);
  if (window.__SMH) window.__SMH.hide?.();

  renderSchoolInfo(school);
  renderModelsList();
  await ensureSchoolFromGitHub(school).catch(() => {});
  renderSchoolInfo(school);
  renderModelsList();
  return true;
}

if (leftListHintEl){
  leftListHintEl.addEventListener('click', async (event) => {
    event.preventDefault();
    const timelineLabel = uiText('list.openTimeline', 'abrir timeline').trim().toLowerCase();
    if (leftListHintEl.textContent.trim().toLowerCase() !== timelineLabel) return;
    await openSchoolTimeline();
  });
}

function filteredModelsBySchool(grupo){
  const target = normSchoolName(grupo);

  return MODELS
    .filter(isModelVisibleInApp)
    .filter(m => normSchoolName(m.grupo) === target)
    .sort((a,b) =>
      (+a.year||0) - (+b.year||0) ||
      String(a.label).localeCompare(String(b.label), MODELOS_LOCALE)
    );
}

function modelMatchesSearch(model, query){
  const needle = normSchoolName(query);
  if (!needle) return true;
  const haystack = normSchoolName([
    model?.label,
    model?.autores,
    model?.autor,
    model?.grupo,
    model?.year,
    model?.nombreAlternativo,
    model?.nombresLiteratura
  ].filter(Boolean).join(' '));
  return haystack.includes(needle);
}

function setModelSearchOpen(open, { clear = false } = {}){
  const nextOpen = !!open;
  modelSearchShellEl?.classList.toggle('is-open', nextOpen);
  modelSearchOpenEl?.setAttribute('aria-expanded', String(nextOpen));

  if (clear){
    modelSearchQuery = '';
    if (modelSearchInputEl) modelSearchInputEl.value = '';
    renderModelsList();
  }

  if (nextOpen){
    requestAnimationFrame(() => modelSearchInputEl?.focus());
  }else{
    modelSearchOpenEl?.focus();
  }
}

function setupModelSearch(){
  if (!modelSearchOpenEl || !modelSearchInputEl || modelSearchOpenEl.__bound) return;
  modelSearchOpenEl.__bound = true;

  modelSearchOpenEl.addEventListener('click', () => setModelSearchOpen(true));
  modelSearchClearEl?.addEventListener('click', () => setModelSearchOpen(false, { clear:true }));
  modelSearchInputEl.addEventListener('input', () => {
    modelSearchQuery = modelSearchInputEl.value.trim();
    document.dispatchEvent(new Event("atlas:filters-change"));
    renderModelsList();
    resetModelsListToTop();
  });
  modelSearchInputEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setModelSearchOpen(false, { clear:true });
  });
}

setupModelSearch();

function renderSchoolModelTimeline(models, options = {}){
  const rows = (Array.isArray(models) ? models : [])
    .filter((m) => m && String(m.label || '').trim())
    .slice()
    .sort((a, b) => {
      const ay = Number(a.year || 0);
      const by = Number(b.year || 0);
      const aKnown = Number.isFinite(ay) && ay > 0;
      const bKnown = Number.isFinite(by) && by > 0;
      if (aKnown && bKnown && ay !== by) return ay - by;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      return String(a.label || '').localeCompare(String(b.label || ''), MODELOS_LOCALE);
    });

  if (!rows.length) return '';

  let lastDecadeKey = '';
  let previousKnownYear = null;
  const decadeLabel = (model) => {
    const year = Number(model?.year || 0);
    if (!Number.isFinite(year) || year <= 0) return uiText('school.timeline.unknownYear', 'S/F');
    const decade = Math.floor(year / 10) * 10;
    return uiText('school.timeline.decade', 'Años {short}', {
      decade,
      short:String(decade).slice(-2)
    });
  };
  const gapForYear = (year) => {
    if (!Number.isFinite(year) || year <= 0 || !Number.isFinite(previousKnownYear)) return 0;
    const delta = Math.max(0, year - previousKnownYear);
    if (delta < 8) return 0;
    if (delta < 15) return 56;
    if (delta < 25) return 112;
    if (delta < 40) return 176;
    return 248;
  };
  const timelineClass = options.variant === 'all' ? ' school-editorialTimeline--all' : '';
  const timelineAria = options.aria || uiText('school.timeline.aria', 'Cronología de modelos');
  const timelineKicker = options.kicker || uiText('school.timeline.kicker', 'Cronología');
  const timelineTitle = options.title || uiText('school.modelsTitle', 'Modelos de la escuela');
  const showGroup = options.showGroup === true;

  return `
    <section class="school-editorialTimeline${timelineClass}" aria-label="${escapeHtml(timelineAria)}">
      <div class="school-editorialTimelineHead">
        <div>
          <p class="school-editorialTimelineKicker">${escapeHtml(timelineKicker)}</p>
          <h2 class="school-editorialTimelineTitle">${escapeHtml(timelineTitle)}</h2>
        </div>
        <span class="school-editorialTimelineCount">${rows.length} ${escapeHtml(uiPlural('school.timeline.entry', rows.length, 'entrada', 'entradas'))}</span>
      </div>
      <ol class="school-editorialTimelineList">
        ${rows.map((model) => {
          const year = Number(model.year || 0);
          const yearText = Number.isFinite(year) && year > 0
            ? String(model.year)
            : uiText('school.timeline.unknownYear', 's/f').toLocaleLowerCase(MODELOS_LOCALE);
          const currentDecade = decadeLabel(model);
          const isDecadeStart = currentDecade !== lastDecadeKey;
          const physicalGap = gapForYear(year);
          const itemStyles = [
            physicalGap ? `--timeline-gap:${physicalGap}px` : '',
            showGroup ? `--timeline-item-color:${colorForSchoolLabel(model.grupo)}` : ''
          ].filter(Boolean).join(';');
          if (Number.isFinite(year) && year > 0) previousKnownYear = year;
          lastDecadeKey = currentDecade;
          return `
            <li class="school-editorialTimelineItem${isDecadeStart ? ' is-decade-start' : ''}"${itemStyles ? ` style="${escapeHtml(itemStyles)}"` : ''}>
              <span class="school-editorialTimelineDecade">${isDecadeStart ? currentDecade : ''}</span>
              <span class="school-editorialTimelineYear">${escapeHtml(yearText)}</span>
              <span>
                <button type="button" class="school-editorialTimelineLabel" data-action="open-school-timeline-model" data-id="${escapeHtml(String(model.id || ''))}">${escapeHtml(model.label || uiText('common.model.one', 'Modelo'))}</button>
                ${model.autores ? `<span class="school-editorialTimelineAuthors">${escapeHtml(model.autores)}</span>` : ''}
                ${showGroup ? `<span class="school-editorialTimelineSource">${escapeHtml(navigationGroupDisplayLabel(model.grupo))}</span>` : ''}
              </span>
            </li>
          `;
        }).join('')}
      </ol>
    </section>
  `;
}

function bindEditorialModelTimeline(root = modelInfoEl){
  if (!root) return;
  root.querySelectorAll('[data-action="open-school-timeline-model"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = String(button.getAttribute('data-id') || '').trim();
      if (!id) return;
      await openModel(id);
    });
  });
  hydrateTimelineMotion(root, document.querySelector('.panel.right'));
}

function normalizeScoreToFour(raw){
  if (typeof raw === 'number' && Number.isFinite(raw)){
    if (raw <= 0) return 0;
    if (raw <= 3) return Math.max(1, Math.min(4, Math.round(raw + 1)));
    if (raw <= 4) return Math.max(1, Math.min(4, Math.round(raw)));
    if (raw <= 100){
      if (raw >= 75) return 4;
      if (raw >= 50) return 3;
      if (raw >= 25) return 2;
      return 1;
    }
    return 4;
  }

  const txt = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(',', '.');
  if (!txt) return 0;

  const parsed = Number(txt);
  if (Number.isFinite(parsed)) return normalizeScoreToFour(parsed);

  if (txt.includes('muy alta')) return 4;
  if (txt.includes('alta')) return 3;
  if (txt.includes('media')) return 2;
  if (txt.includes('baja')) return 1;
  return 0;
}

function resolveProcessRawValue(procesos, procDef){
  if (!procesos || typeof procesos !== 'object' || !procDef) return null;

  const aliases = [procDef.id, procDef.label]
    .filter(Boolean)
    .map((v) => normProcKey(v));

  for (const [k, v] of Object.entries(procesos)){
    if (aliases.includes(normProcKey(k))) return v;
  }
  return null;
}

function modelProcessLevelFour(m, processId){
  if (!m || typeof m !== 'object' || !processId) return 0;
  const procDef = PROCESS_FILTER_MAP.get(processId);
  if (!procDef) return 0;
  const raw = resolveProcessRawValue(getModelProcessMap(m), procDef);
  return normalizeScoreToFour(raw);
}

function modelDimensionSharePct(m, dimId){
  if (!m || typeof m !== 'object' || !dimId) return 0;
  const dimMap = getModelDimensionMap(m);
  if (!dimMap || typeof dimMap !== 'object') return 0;

  const total = CHANGE_DIMS.reduce((acc, d) => acc + readDimensionValue(dimMap, [d.id]), 0);
  if (!(total > 0)) return 0;

  const def = CHANGE_DIMS.find((d) => d.id === dimId);
  if (!def) return 0;

  const own = readDimensionValue(dimMap, [def.id]);
  return (own / total) * 100;
}

function tagValuesForFacet(record, facetId){
  if (!record || typeof record !== 'object') return [];
  const raw = record[facetId];
  return (Array.isArray(raw) ? raw : [raw])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

function tagValueLabel(value){
  const key = String(value || '').trim();
  if (TAG_VALUE_LABELS[key]) return uiText(`taxonomy.tagValue.${key}`, TAG_VALUE_LABELS[key]);
  const human = key.replace(/[-_]+/g, ' ').trim();
  const fallback = human ? human.charAt(0).toUpperCase() + human.slice(1) : key;
  return uiText(`taxonomy.tagValue.${key}`, fallback);
}

function selectedTagCount(){
  let count = 0;
  TAG_FILTER_STATE.forEach((values) => { count += values.size; });
  return count;
}

function modelMatchesTagFilters(model){
  const record = TAGS_BY_MODEL.get(String(model?.id || '').trim());
  if (!record) return false;
  return TAG_FACETS.every((facet) => {
    const selected = TAG_FILTER_STATE.get(facet.id);
    if (!selected || selected.size === 0) return true;
    return tagValuesForFacet(record, facet.id).some((value) => selected.has(value));
  });
}

function parseTagsIndex(root){
  const rows = (root?.tags && typeof root.tags === 'object') ? root.tags : {};
  TAGS_BY_MODEL = new Map(Object.entries(rows));
  TAG_VALUES_BY_FACET = new Map(TAG_FACETS.map((facet) => {
    const values = new Set();
    TAGS_BY_MODEL.forEach((record) => {
      tagValuesForFacet(record, facet.id).forEach((value) => values.add(value));
    });
    return [facet.id, Array.from(values).sort((a,b) => tagValueLabel(a).localeCompare(tagValueLabel(b), MODELOS_LOCALE))];
  }));
}

async function loadTagsIndex(){
  if (!hasPremiumGroupingAccess()) return new Map();
  if (TAGS_BY_MODEL.size) return TAGS_BY_MODEL;
  if (TAGS_LOAD_PROMISE) return TAGS_LOAD_PROMISE;

  TAGS_LOAD_ERROR = '';
  const path = 'Core/Tags/tags.json';
  const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/${path}`;
  const cdnUrl = `${cdnBase()}/data/${path}`;
  const urls = [...new Set([rawUrl, cdnUrl, ...dataUrlCandidates(path)])];

  TAGS_LOAD_PROMISE = (async () => {
    let lastError = null;
    for (const url of urls){
      if (!hasPremiumGroupingAccess()) return new Map();
      try{
        const root = await fetchJson(url, { bust:false });
        if (!hasPremiumGroupingAccess()) return new Map();
        parseTagsIndex(root);
        if (!TAGS_BY_MODEL.size) throw new Error(uiText('tags.emptyIndex', 'El índice de tags está vacío.'));
        renderTagFiltersPanel();
        return TAGS_BY_MODEL;
      }catch(error){
        lastError = error;
      }
    }
    TAGS_LOAD_ERROR = uiText('tags.loadError', 'No se han podido cargar los tags.');
    renderTagFiltersPanel();
    throw lastError || new Error(TAGS_LOAD_ERROR);
  })().finally(() => { TAGS_LOAD_PROMISE = null; });

  return TAGS_LOAD_PROMISE;
}

function updateTagFilterUi(){
  if (!tagFiltersPanelEl) return;
  const total = selectedTagCount();
  const status = tagFiltersPanelEl.querySelector('[data-tag-status]');
  if (status) status.textContent = total
    ? uiPlural('tags.active', total, '1 filtro activo', `${total} filtros activos`)
    : uiText('tags.combine', 'Combina facetas');
  const clear = tagFiltersPanelEl.querySelector('[data-action="clear-tags"]');
  if (clear) clear.hidden = total === 0;

  TAG_FACETS.forEach((facet) => {
    const details = tagFiltersPanelEl.querySelector(`[data-tag-facet="${facet.id}"]`);
    if (!details) return;
    const count = TAG_FILTER_STATE.get(facet.id)?.size || 0;
    details.classList.toggle('has-selection', count > 0);
    const badge = details.querySelector('.tagFacetCount');
    if (badge) badge.textContent = String(count);
  });
}

function renderTagFiltersPanel(){
  if (!tagFiltersPanelEl) return;
  tagFiltersPanelEl.hidden = groupingMode !== 'tags';
  if (groupingMode !== 'tags') return;

  if (!hasPremiumGroupingAccess()){
    tagFiltersPanelEl.innerHTML = `<div class="tagFiltersLockedNote">${escapeHtml(uiText('tags.locked', 'Filtros avanzados incluidos con la suscripción'))}</div>`;
    return;
  }

  if (!TAGS_BY_MODEL.size){
    tagFiltersPanelEl.innerHTML = `<div class="tagFiltersMessage">${escapeHtml(TAGS_LOAD_ERROR || uiText('tags.loadingFilters', 'Cargando filtros…'))}</div>`;
    return;
  }

  tagFiltersPanelEl.innerHTML = `
    <div class="tagFiltersStatus">
      <span data-tag-status>${escapeHtml(uiText('tags.combine', 'Combina facetas'))}</span>
      <button class="tagFiltersClear" type="button" data-action="clear-tags" hidden>${escapeHtml(uiText('tags.clear', 'Limpiar'))}</button>
    </div>
    <div class="tagFacetGrid">
      ${TAG_FACETS.map((facet) => {
        const values = TAG_VALUES_BY_FACET.get(facet.id) || [];
        const selected = TAG_FILTER_STATE.get(facet.id) || new Set();
        return `
          <details class="tagFacet" data-tag-facet="${escapeHtml(facet.id)}">
            <summary><span class="tagFacetName">${escapeHtml(uiText(`taxonomy.tagFacet.${facet.id}`, facet.label))}</span><span class="tagFacetCount">${selected.size}</span></summary>
            <div class="tagFacetMenu">
              ${values.map((value) => `
                <label class="tagCheck">
                  <input type="checkbox" data-tag-facet-value="${escapeHtml(facet.id)}" value="${escapeHtml(value)}" ${selected.has(value) ? 'checked' : ''}>
                  <span>${escapeHtml(tagValueLabel(value))}</span>
                </label>
              `).join('')}
            </div>
          </details>
        `;
      }).join('')}
    </div>
  `;
  updateTagFilterUi();
}

function applyTagFilterChange(){
  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';
  setModelInfoOpen(false);
  setInfoFullscreen(false);
  renderModelInfo(null);
  renderModelsList();
  resetRightPanelToTop();
}

function setupTagFilters(){
  if (!tagFiltersPanelEl || tagFiltersPanelEl.__bound) return;
  tagFiltersPanelEl.__bound = true;

  tagFiltersPanelEl.addEventListener('toggle', (event) => {
    const opened = event.target.closest?.('.tagFacet');
    if (!opened || !opened.open) return;
    tagFiltersPanelEl.querySelectorAll('.tagFacet[open]').forEach((details) => {
      if (details !== opened) details.open = false;
    });
  }, true);

  tagFiltersPanelEl.addEventListener('change', (event) => {
    const input = event.target.closest?.('[data-tag-facet-value]');
    if (!input) return;
    const facetId = String(input.getAttribute('data-tag-facet-value') || '');
    const selected = TAG_FILTER_STATE.get(facetId);
    if (!selected) return;
    if (input.checked) selected.add(input.value);
    else selected.delete(input.value);
    updateTagFilterUi();
    if (input.checked){
      const facet = input.closest('.tagFacet');
      if (facet) facet.open = false;
    }
    applyTagFilterChange();
  });

  tagFiltersPanelEl.addEventListener('click', (event) => {
    const clear = event.target.closest?.('[data-action="clear-tags"]');
    if (!clear) return;
    TAG_FILTER_STATE.forEach((values) => values.clear());
    tagFiltersPanelEl.querySelectorAll('[data-tag-facet-value]').forEach((input) => { input.checked = false; });
    updateTagFilterUi();
    applyTagFilterChange();
  });

  document.addEventListener('click', (event) => {
    if (groupingMode !== 'tags' || tagFiltersPanelEl.contains(event.target)) return;
    tagFiltersPanelEl.querySelectorAll('.tagFacet[open]').forEach((details) => { details.open = false; });
  });
}

function baseListByGroupingMode(mode = groupingMode){
  if (mode === 'all'){
    return MODELS
      .filter(isTherapyModel)
      .sort((a,b) =>
        (+a.year||0) - (+b.year||0) ||
        String(a.label || '').localeCompare(String(b.label || ''), MODELOS_LOCALE)
      );
  }

  if (mode === 'school'){
    return filteredModelsBySchool(currentSchool);
  }

  if (mode === 'collection'){
    const collection = collectionDefinitionById(groupingTarget) || COLLECTION_DEFS[0];
    return MODELS
      .filter(isTherapyModel)
      .filter((model) => collection?.sourceKeys.includes(normalizeModelDataKey(model?.grupo)))
      .sort((a,b) =>
        (+a.year||0) - (+b.year||0) ||
        String(a.label || '').localeCompare(String(b.label || ''), MODELOS_LOCALE)
      );
  }

  if (mode === 'epistemology'){
    return MODELS
      .filter((model) => isModelVisibleInApp(model) && isEpistemologiaModel(model))
      .sort((a,b) =>
        (+a.year||0) - (+b.year||0) ||
        String(a.label || '').localeCompare(String(b.label || ''), MODELOS_LOCALE)
      );
  }

  if (mode === 'tags'){
    return MODELS
      .filter(isTherapyModel)
      .sort((a,b) =>
        String(a.label || '').localeCompare(String(b.label || ''), MODELOS_LOCALE) ||
        (+a.year||0) - (+b.year||0)
      );
  }

  if (mode === 'network'){
    return MODELS
      .filter(m => isModelVisibleInApp(m) && !isMarcoModel(m))
      .sort((a,b) =>
        String(a.grupo || '').localeCompare(String(b.grupo || ''), MODELOS_LOCALE) ||
        (+a.year||0) - (+b.year||0) ||
        String(a.label).localeCompare(String(b.label), MODELOS_LOCALE)
      );
  }

  return MODELS.slice().sort((a,b) =>
    (+a.year||0) - (+b.year||0) ||
    String(a.label).localeCompare(String(b.label), MODELOS_LOCALE)
  );
}

function applyGroupingFilterAndSort(list, mode = groupingMode){
  if (!Array.isArray(list)) return [];

  if (mode === 'tags'){
    return list.filter(modelMatchesTagFilters);
  }

  if (mode === 'process'){
    const target = groupingTarget || PROCESS_FILTERS[0]?.id || '';
    return list
      .map((m) => ({ model: m, score: modelProcessLevelFour(m, target) }))
      .filter((entry) => entry.score >= 4)
      .sort((a,b) =>
        (b.score - a.score) ||
        (+a.model.year||0) - (+b.model.year||0) ||
        String(a.model.label).localeCompare(String(b.model.label), MODELOS_LOCALE)
      )
      .map((entry) => entry.model);
  }

  if (mode === 'dimension'){
    const target = groupingTarget || CHANGE_DIMS[0]?.id || '';
    return list
      .map((m) => ({ model: m, share: modelDimensionSharePct(m, target) }))
      .filter((entry) => entry.share >= SIGNIFICANT_DIMENSION_PCT)
      .sort((a,b) =>
        (b.share - a.share) ||
        (+a.model.year||0) - (+b.model.year||0) ||
        String(a.model.label).localeCompare(String(b.model.label), MODELOS_LOCALE)
      )
      .map((entry) => entry.model);
  }

  return list;
}

async function ensureAllSchoolsLoadedForGrouping(){
  if (ENSURE_ALL_SCHOOLS_PROMISE) return ENSURE_ALL_SCHOOLS_PROMISE;

  const labels = uniq((GH_SCHOOLS || []).map(s => s.label || s.id).filter(Boolean));
  ENSURE_ALL_SCHOOLS_PROMISE = Promise.all(
    labels.map((label) => ensureSchoolFromGitHub(label).catch(() => null))
  ).then(() => null).catch(() => null);

  return ENSURE_ALL_SCHOOLS_PROMISE;
}

async function ensureModelsHydratedForGrouping(){
  if (ENSURE_GROUPING_MODELS_PROMISE) return ENSURE_GROUPING_MODELS_PROMISE;

  ENSURE_GROUPING_MODELS_PROMISE = (async () => {
    await ensureAllSchoolsLoadedForGrouping();

    const jobs = MODELS.map(async (m, idx) => {
      const full = await ensureModelFull(m).catch(() => m);
      MODELS[idx] = full || m;
      return MODELS[idx];
    });

    await Promise.all(jobs);
    MODELS = MODELS.filter(isModelVisibleInApp);
    window.MODELS_ALL = MODELS.slice();
  })().catch(() => null);

  return ENSURE_GROUPING_MODELS_PROMISE;
}

function syncGroupingTargetOptions(){
  const mode = groupingMode === 'network' && window.TMPS_ATLAS ? listGroupingMode : groupingMode;
  if (!groupTargetSelectEl || !groupTargetLabelEl || !groupTargetWrapEl) return;

  if (tagFiltersPanelEl){
    tagFiltersPanelEl.hidden = mode !== 'tags';
  }

  if (mode === 'all'){
    groupTargetWrapEl.hidden = true;
    groupTargetSelectEl.innerHTML = '';
    return;
  }
  if (mode === 'school'){
    groupTargetLabelEl.textContent = uiText('group.school', 'Escuela');
    groupTargetWrapEl.hidden = false;

    const schools = Array.from(schoolSelect?.options || [])
      .map((o) => String(o.value || '').trim())
      .filter(Boolean);

    groupTargetSelectEl.innerHTML = schools
      .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(schoolDisplayLabel(s) || s)}</option>`)
      .join('');

    if (!schools.includes(String(currentSchool || ''))){
      currentSchool = schools[0] || null;
      if (schoolSelect && currentSchool) schoolSelect.value = currentSchool;
    }
    groupTargetSelectEl.value = currentSchool || '';
    return;
  }

  if (mode === 'collection'){
    groupTargetLabelEl.textContent = uiText('group.collection', 'Colección');
    groupTargetWrapEl.hidden = false;
    groupTargetSelectEl.innerHTML = COLLECTION_DEFS
      .map((collection) => `<option value="${escapeHtml(collection.id)}">${escapeHtml(collectionDisplayLabel(collection))}</option>`)
      .join('');
    if (!collectionDefinitionById(groupingTarget)){
      groupingTarget = COLLECTION_DEFS[0]?.id || '';
    }
    groupTargetSelectEl.value = groupingTarget;
    currentSchool = collectionSourceLabel(groupingTarget) || '';
    return;
  }

  if (mode === 'epistemology'){
    groupTargetWrapEl.hidden = true;
    groupTargetSelectEl.innerHTML = '';
    return;
  }

  if (mode === 'process'){
    if (!hasPremiumGroupingAccess()){
      groupTargetWrapEl.hidden = true;
      groupTargetSelectEl.innerHTML = '';
      return;
    }
    groupTargetLabelEl.textContent = uiText('group.process', 'Proceso');
    groupTargetWrapEl.hidden = false;
    groupTargetSelectEl.innerHTML = PROCESS_FILTERS
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(`${p.id} · ${changeProcessLabel(p.id, p.label)}`)}</option>`)
      .join('');
    if (!PROCESS_FILTER_MAP.has(groupingTarget)){
      groupingTarget = PROCESS_FILTERS[0]?.id || '';
    }
    groupTargetSelectEl.value = groupingTarget;
    return;
  }

  if (mode === 'dimension'){
    if (!hasPremiumGroupingAccess()){
      groupTargetWrapEl.hidden = true;
      groupTargetSelectEl.innerHTML = '';
      return;
    }
    groupTargetLabelEl.textContent = uiText(
      'group.dimensionThreshold',
      `Dimensión (>=${SIGNIFICANT_DIMENSION_PCT}%)`,
      { percent:SIGNIFICANT_DIMENSION_PCT }
    );
    groupTargetWrapEl.hidden = false;
    groupTargetSelectEl.innerHTML = CHANGE_DIMS
      .map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(changeDimensionLabel(d))}</option>`)
      .join('');
    if (!CHANGE_DIMS.some((d) => d.id === groupingTarget)){
      groupingTarget = CHANGE_DIMS[0]?.id || '';
    }
    groupTargetSelectEl.value = groupingTarget;
    return;
  }

  if (mode === 'tags'){
    groupTargetWrapEl.hidden = true;
    groupTargetSelectEl.innerHTML = '';
    renderTagFiltersPanel();
    return;
  }

  if (mode === 'network'){
    groupTargetWrapEl.hidden = true;
    groupTargetSelectEl.innerHTML = '';
    return;
  }

  groupTargetWrapEl.hidden = false;
}

function applyNetworkProfileMode(modeKey){
  const nextMode = (modeKey === 'process' || modeKey === 'dimension' || modeKey === 'mixed')
    ? modeKey
    : 'mixed';

  if (nextMode === String(NETWORK_FILTER_STATE.profileMode || 'mixed')) return;

  NETWORK_FILTER_STATE.profileMode = nextMode;
  NETWORK_FILTER_STATE.selectedNodeId = '';
  NETWORK_FILTER_STATE.selectedZoneKey = '';
  hideNetworkMobileGraphButton();
  hideNetworkModelGraphPanel();
  renderNetworkSelectionCard(null);
  renderModelsList();
  renderModelInfo(null);
}

function hasNetworkGraphAccess(){
  return window.HAS_SUBSCRIPTION_ACCESS === true;
}

function hasPremiumGroupingAccess(){
  return window.HAS_SUBSCRIPTION_ACCESS === true;
}

function renderPremiumGroupingPaywallMarkup(mode = 'tags'){
  const content = {
    tags:{
      title:uiText('paywall.tags.title', 'Descubre conexiones entre modelos'),
      copy:uiText('paywall.tags.copy', 'Filtra toda la biblioteca por foco, población, formato, mecanismo de cambio y epistemología.'),
      button:uiText('paywall.tags.button', 'Suscribirse para explorar Tags')
    },
    dimension:{
      title:uiText('paywall.dimension.title', 'Compara por dimensiones clínicas'),
      copy:uiText('paywall.dimension.copy', 'Organiza todos los modelos por el peso que dan al afecto, la cognición, el self, la relación, el cuerpo y otras dimensiones.'),
      button:uiText('paywall.dimension.button', 'Suscribirse para explorar Dimensiones')
    },
    process:{
      title:uiText('paywall.process.title', 'Explora los procesos de cambio'),
      copy:uiText('paywall.process.copy', 'Organiza los modelos por los procesos que activan: regulación, experiencia emocional, significado, identidad, agencia y relación.'),
      button:uiText('paywall.process.button', 'Suscribirse para explorar Procesos')
    }
  }[mode] || null;
  const paywall = content || {
    title:uiText('paywall.advanced', 'Exploración avanzada'),
    copy:uiText('paywall.default.copy', 'Accede a nuevas formas de organizar y comparar toda la biblioteca.'),
    button:uiText('auth.subscribe', 'Suscribirse')
  };
  const previewRows = Array.from({ length:7 }, () => `
    <div class="tagsPaywallPreviewRow">
      <span class="tagsPaywallPreviewDot"></span>
      <span class="tagsPaywallPreviewText"></span>
      <span class="tagsPaywallPreviewMeta"></span>
    </div>
  `).join('');

  return `
    <section class="tagsPaywall" aria-labelledby="premiumGroupingPaywallTitle">
      <div class="tagsPaywallPreview" aria-hidden="true">${previewRows}</div>
      <div class="tagsPaywallShade">
        <div class="tagsPaywallCard">
          <span class="tagsPaywallIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="10" width="14" height="10" rx="2"></rect>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
            </svg>
          </span>
          <p class="tagsPaywallEyebrow">${escapeHtml(uiText('paywall.advanced', 'Exploración avanzada'))}</p>
          <h3 class="tagsPaywallTitle" id="premiumGroupingPaywallTitle">${escapeHtml(paywall.title)}</h3>
          <p class="tagsPaywallCopy">${escapeHtml(paywall.copy)}</p>
          <button class="tagsPaywallButton" type="button" data-action="subscribe-premium-grouping">${escapeHtml(paywall.button)}</button>
          <small class="tagsPaywallFine">${escapeHtml(uiText('paywall.finePrint', 'Acceso completo por 9,95 €/mes · Cancela cuando quieras'))}</small>
        </div>
      </div>
    </section>
  `;
}

function bindPremiumGroupingPaywallAction(){
  const button = modelsListEl?.querySelector('[data-action="subscribe-premium-grouping"]');
  if (!button || button.dataset.bound === '1') return;
  button.dataset.bound = '1';
  button.addEventListener('click', () => {
    if (typeof window.startSubscriptionCheckout === 'function'){
      window.startSubscriptionCheckout();
      return;
    }
    if (typeof window.openSubscriptionLogin === 'function'){
      window.openSubscriptionLogin(uiText('auth.signInToSubscribe', 'Inicia sesión o crea una cuenta para suscribirte.'));
    }
  });
}

function syncLibraryViewControls(){
  if (window.TMPS_ATLAS) return;
  const networkActive = groupingMode === 'network';
  if (libraryListViewButtonEl){
    libraryListViewButtonEl.classList.toggle('is-active', !networkActive);
    libraryListViewButtonEl.setAttribute('aria-pressed', networkActive ? 'false' : 'true');
  }
  if (libraryNetworkViewButtonEl){
    libraryNetworkViewButtonEl.classList.toggle('is-active', networkActive);
    libraryNetworkViewButtonEl.setAttribute('aria-pressed', networkActive ? 'true' : 'false');
  }
}

async function handleGroupingModeChange(nextMode){
  const atlas = window.TMPS_ATLAS;
  const selected = atlas?.getState().modelId || '';
  try { return await applyAtlas_handleGroupingModeChange(nextMode); }
  finally {
    if (selected && atlas?.getState().modelId === selected && atlas.getState().view !== 'network') await openModel(selected, { updateUrl: false });
    document.dispatchEvent(new Event('atlas:filters-change'));
  }
}
async function applyAtlas_handleGroupingModeChange(nextMode){
  groupingMode = String(nextMode || 'all');
  if (groupingMode !== 'network') listGroupingMode = groupingMode;
  if (groupBySelectEl) groupBySelectEl.value = listGroupingMode;
  syncLibraryViewControls();
  if (groupingMode === 'epistemology'){
    currentSchool = getEpistemologiaSchoolLabel();
    groupingTarget = currentSchool;
  }
  syncGroupingTargetOptions();
  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';
  setModelInfoOpen(false);
  setInfoFullscreen(false);
  setMobileModelPanelLowered(false);

  if (groupingMode === 'all'){
    document.documentElement.style.setProperty('--schoolColor', '#D9AA3F');
    renderModelInfo(null);
    renderModelsList();
    resetRightPanelToTop();
    await ensureAllSchoolsLoadedForGrouping();
    renderModelsList();
    renderModelInfo(null);
    return;
  }

  if (groupingMode === 'school'){
    const nextSchool = String(groupTargetSelectEl?.value || currentSchool || '').trim();
    if (nextSchool){
      schoolSelect.value = nextSchool;
      schoolSelect.dispatchEvent(new Event('change', { bubbles:true }));
    }else{
      renderSchoolInfo(currentSchool);
      renderModelsList();
    }
    resetRightPanelToTop();
    return;
  }

  if (groupingMode === 'collection'){
    const collection = collectionDefinitionById(groupingTarget) || COLLECTION_DEFS[0];
    groupingTarget = collection?.id || '';
    currentSchool = collectionSourceLabel(collection) || '';
    if (currentSchool){
      renderSchoolInfo(currentSchool);
      renderModelsList();
      resetRightPanelToTop();
      await ensureSchoolFromGitHub(currentSchool).catch((error) => {
        console.warn('No se pudo cargar la colección:', error);
      });
      renderSchoolInfo(currentSchool);
      renderModelsList();
    }else{
      renderModelInfo(null);
      renderModelsList();
    }
    return;
  }

  if (groupingMode === 'epistemology'){
    renderSchoolInfo(currentSchool);
    renderModelsList();
    resetRightPanelToTop();
    await ensureSchoolFromGitHub(currentSchool).catch((error) => {
      console.warn('No se pudo cargar la colección de epistemologías:', error);
    });
    renderSchoolInfo(currentSchool);
    renderModelsList();
    return;
  }

  if (groupingMode === 'tags'){
    document.documentElement.style.setProperty('--schoolColor', TAG_FILTER_COLOR);
    renderModelInfo(null);
    renderModelsList();
    resetRightPanelToTop();
    if (!hasPremiumGroupingAccess()){
      renderTagFiltersPanel();
      return;
    }
    await Promise.all([
      ensureAllSchoolsLoadedForGrouping(),
      loadTagsIndex()
    ]).catch((error) => {
      console.warn('No se pudo preparar la vista Tags:', error);
    });
    renderTagFiltersPanel();
    renderModelsList();
    renderModelInfo(null);
    return;
  }

  if ((groupingMode === 'dimension' || groupingMode === 'process') && !hasPremiumGroupingAccess()){
    renderModelInfo(null);
    renderModelsList();
    resetRightPanelToTop();
    return;
  }

  if (groupingMode === 'network'){
    NETWORK_FILTER_STATE.selectedNodeId = '';
    NETWORK_FILTER_STATE.selectedZoneKey = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    renderNetworkSelectionCard(null);
    // ✅ Pinta solo el contenedor + indicador de carga: el grafo real espera
    // a que los modelos estén hidratados para no parpadear con 0 nodos.
    renderModelInfo(null, { skipGraphRender: true });
    setNetworkLoading(true);
    renderModelsList();
    resetRightPanelToTop();
    try{
      await ensureModelsHydratedForGrouping();
      renderModelsList();
      renderModelInfo(null);
    }catch(e){
      setNetworkLoading(false);
      throw e;
    }
    return;
  }

  renderModelInfo(null);
  renderModelsList();
  resetRightPanelToTop();
  await ensureModelsHydratedForGrouping();
  renderModelsList();
}

async function handleGroupingTargetChange(nextTarget){
  const atlas = window.TMPS_ATLAS;
  const selected = atlas?.getState().modelId || '';
  try { return await applyAtlas_handleGroupingTargetChange(nextTarget); }
  finally {
    if (selected && atlas?.getState().modelId === selected && atlas.getState().view !== 'network') await openModel(selected, { updateUrl: false });
    document.dispatchEvent(new Event('atlas:filters-change'));
  }
}
async function applyAtlas_handleGroupingTargetChange(nextTarget){
  groupingTarget = String(nextTarget || '').trim();
  if (groupTargetSelectEl) groupTargetSelectEl.value = groupingTarget;

  if (groupingMode === 'network'){
    return;
  }
  if (groupingMode === 'school'){
    if (groupingTarget){
      schoolSelect.value = groupingTarget;
      schoolSelect.dispatchEvent(new Event('change', { bubbles:true }));
    }
    return;
  }
  if (groupingMode === 'collection'){
    const collection = collectionDefinitionById(groupingTarget) || COLLECTION_DEFS[0];
    groupingTarget = collection?.id || '';
    currentSchool = collectionSourceLabel(collection) || '';
    currentModelId = null;
    window.__CURRENT_MODEL_ID = '';
    setModelInfoOpen(false);
    setInfoFullscreen(false);
    if (currentSchool){
      renderSchoolInfo(currentSchool);
      renderModelsList();
      resetRightPanelToTop();
      await ensureSchoolFromGitHub(currentSchool).catch(() => {});
      renderSchoolInfo(currentSchool);
      renderModelsList();
    }
    return;
  }
  if (['tags','dimension','process'].includes(groupingMode) && !hasPremiumGroupingAccess()){
    renderModelInfo(null);
    renderModelsList();
    resetRightPanelToTop();
    return;
  }
  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';
  setModelInfoOpen(false);
  setInfoFullscreen(false);
  renderModelInfo(null);
  renderModelsList();
  await ensureModelsHydratedForGrouping();
  renderModelsList();
  resetRightPanelToTop();
}

function setupGroupingControls(){
  if (!groupBySelectEl || groupBySelectEl.__bound) return;
  groupBySelectEl.__bound = true;

  setupTagFilters();
  groupBySelectEl.value = listGroupingMode;
  syncLibraryViewControls();
  syncGroupingTargetOptions();

  groupBySelectEl.addEventListener('change', async () => {
    const network = window.TMPS_ATLAS?.getState().view === 'network';
    await handleGroupingModeChange(groupBySelectEl.value || 'all');
    if (network) await window.TMPS_ATLAS.setView('network', { replace: true });
  });

  if (libraryListViewButtonEl && !libraryListViewButtonEl.__bound){
    libraryListViewButtonEl.__bound = true;
    libraryListViewButtonEl.addEventListener('click', async () => {
      if (window.TMPS_ATLAS) return window.TMPS_ATLAS.setView('list');
      if (groupingMode === 'network') await handleGroupingModeChange(listGroupingMode || 'all');
    });
  }

  if (libraryNetworkViewButtonEl && !libraryNetworkViewButtonEl.__bound){
    libraryNetworkViewButtonEl.__bound = true;
    libraryNetworkViewButtonEl.addEventListener('click', async () => {
      if (window.TMPS_ATLAS) return window.TMPS_ATLAS.setView('network');
      if (groupingMode !== 'network') await handleGroupingModeChange('network');
    });
  }

  if (groupTargetSelectEl && !groupTargetSelectEl.__bound){
    groupTargetSelectEl.__bound = true;
    groupTargetSelectEl.addEventListener('change', async () => {
      const network = window.TMPS_ATLAS?.getState().view === 'network';
      if (network) groupingMode = listGroupingMode;
      await handleGroupingTargetChange(groupTargetSelectEl.value || '');
      if (network) await window.TMPS_ATLAS.setView('network', { replace: true });
    });
  }
}

function setSchoolToneClass(grupo){
  const b = document.body;
  if(!b) return;
  b.classList.remove('school-otros', 'school-sistemico');

  const g = String(grupo || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .trim();

  if (g === 'otros') b.classList.add('school-otros');
  if (g === 'sistemico') b.classList.add('school-sistemico');
}

function colorForSchoolLabel(label){
  const raw = String(label || '').trim();
  if (groupColor.has(raw)) return groupColor.get(raw);

  const target = normSchoolName(raw);
  for (const [key, col] of groupColor.entries()){
    if (normSchoolName(key) === target) return col;
  }
  return '#D9AA3F';
}

function getAtlasMapGroups(){
  const models = getAllModelsPool().filter(isTherapyModel);
  const sourceGroups = uniq(models.map((model) => String(model?.grupo || '').trim()).filter(Boolean));
  const schoolOrder = ['psicoanalisis', 'conductismo', 'humanista', 'cognitivo', 'sistemico', 'constructivista', 'integrativo'];
  const schoolRank = new Map(schoolOrder.map((key, index) => [key, index]));
  const schools = sourceGroups
    .filter(isCanonicalSchoolName)
    .sort((a, b) => (schoolRank.get(normalizeModelDataKey(a)) ?? 999) - (schoolRank.get(normalizeModelDataKey(b)) ?? 999))
    .map((group) => ({
      id: `school:${normalizeModelDataKey(group)}`,
      kind: 'school',
      label: schoolDisplayLabel(group) || group,
      color: colorForSchoolLabel(group),
      groups: [group]
    }));
  const collections = COLLECTION_DEFS.map((collection) => {
    const groups = sourceGroups.filter((group) => collection.sourceKeys.includes(normalizeModelDataKey(group)));
    if (!groups.length) return null;
    return {
      id: `collection:${collection.id}`,
      kind: 'collection',
      label: collectionDisplayLabel(collection),
      color: colorForSchoolLabel(groups[0]),
      groups
    };
  }).filter(Boolean);
  return [...schools, ...collections];
}


function renderModelsList(){
  queueMicrotask(() => document.dispatchEvent(new Event('atlas:library-change')));
  window.__RENDER_MODELS_LIST_COUNT = (window.__RENDER_MODELS_LIST_COUNT || 0) + 1;
  console.log('[PERF] renderModelsList', window.__RENDER_MODELS_LIST_COUNT, {
    groupingMode,
    currentSchool,
    groupingTarget
  });

  document.body.classList.toggle('network-mode', groupingMode === 'network');
  if (groupingMode !== 'network'){
    NETWORK_FILTER_STATE.selectedZoneKey = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    renderNetworkSelectionCard(null);
  }
  syncDesktopLeftListScrollMode();
  if (groupingMode === 'network'){
    setInfoFullscreen(false);
    setModelInfoOpen(false);
  }

  const setLeftListMeta = (title, hint) => {
    if (leftListTitleEl) leftListTitleEl.textContent = title;
    if (leftListHintEl) leftListHintEl.textContent = hint;
  };

  if (groupingMode === 'network'){
    if (String(NETWORK_FILTER_STATE.profileMode || 'mixed') === 'mixed' || String(NETWORK_FILTER_STATE.profileMode || '') === '3d'){
      NETWORK_FILTER_STATE.profileMode = 'process';
    }
    const modeCards = [
      {
        id:'process',
        title:uiText('network.processes', 'Procesos'),
        desc:uiText('network.processesDescription', 'Solo similitud por procesos')
      },
      {
        id:'dimension',
        title:uiText('network.dimensions', 'Dimensiones'),
        desc:uiText('network.dimensionsDescription', 'Solo similitud por dimensiones')
      },
    ];

    setLeftListMeta(
      uiText('list.classification', 'Clasificación'),
      uiText('list.chooseGraphMode', 'elige modo del grafo')
    );
    countLine.innerHTML = `
      <span class="count-n">${modeCards.length}</span>
      <span class="count-txt">${escapeHtml(uiText('list.modesIn', 'modos en'))}</span>
      <span class="count-school">“${escapeHtml(uiText('library.group.network', 'Vista red'))}”</span>
    `;

    modelsListEl.style.setProperty('--schoolColor', '#5F7F78');
    modelsListEl.innerHTML = modeCards.map((m) => {
      const active = (String(NETWORK_FILTER_STATE.profileMode || 'mixed') === m.id) ? 'active' : '';
      return `
        <div class="mi-item networkModeCard ${active}" data-network-mode="${escapeHtml(m.id)}" style="--schoolColor:#5F7F78">
          <div class="networkModeCardInner">
            <span class="networkModeCardDot" aria-hidden="true"></span>
            <div class="mi-top">
              <div class="mi-title">${escapeHtml(m.title)}</div>
              <div class="mi-sub">${escapeHtml(m.desc)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    return;
  }


  if (['tags','dimension','process'].includes(groupingMode) && !hasPremiumGroupingAccess()){
    const lockedMeta = {
      tags:{
        title:'Tags',
        label:uiText('list.crossExploration', 'Exploración transversal'),
        color:TAG_FILTER_COLOR
      },
      dimension:{
        title:uiText('network.dimensions', 'Dimensiones'),
        label:uiText('list.dimensionClassification', 'Clasificación por dimensiones'),
        color:'#D9AA3F'
      },
      process:{
        title:uiText('network.processes', 'Procesos'),
        label:uiText('list.processClassification', 'Clasificación por procesos'),
        color:'#8BAA9A'
      }
    }[groupingMode];
    setLeftListMeta(lockedMeta.title, uiText('list.subscriptionContent', 'contenido de suscripción'));
    modelsListEl.style.setProperty('--schoolColor', lockedMeta.color);
    countLine.innerHTML = `
      <span class="count-txt">${escapeHtml(lockedMeta.label)}</span>
      <span class="count-school">&ldquo;Premium&rdquo;</span>
    `;
    modelsListEl.innerHTML = renderPremiumGroupingPaywallMarkup(groupingMode);
    bindPremiumGroupingPaywallAction();
    return;
  }

  if (groupingMode === 'tags' && !TAGS_BY_MODEL.size){
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.crossFilter', 'filtrado transversal'));
    modelsListEl.style.setProperty('--schoolColor', TAG_FILTER_COLOR);
    countLine.innerHTML = TAGS_LOAD_ERROR
      ? `<span class="count-txt">${escapeHtml(TAGS_LOAD_ERROR)}</span>`
      : `<span class="count-txt">${escapeHtml(uiText('tags.loading', 'Cargando clasificación por tags…'))}</span>`;
    modelsListEl.innerHTML = `<div class="subtitle" style="margin:10px 0 0 0">${escapeHtml(TAGS_LOAD_ERROR || uiText('tags.preparing', 'Preparando filtros…'))}</div>`;
    return;
  }

  const searchActive = !!normSchoolName(modelSearchQuery);
  const baseList = baseListByGroupingMode();
  const list = getAtlasFilteredModels();

  modelsListEl.style.setProperty(
    '--schoolColor',
    groupingMode === 'tags' ? TAG_FILTER_COLOR : (groupingMode === 'all' ? '#D9AA3F' : colorForSchoolLabel(currentSchool))
  );


  if (searchActive){
    setLeftListMeta(uiText('list.results', 'Resultados'), '');
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiPlural('list.resultFor', list.length, 'resultado para', 'resultados para'))}</span>
      <span class="count-school">&ldquo;${escapeHtml(modelSearchQuery)}&rdquo;</span>
    `;
  }else if (groupingMode === 'tags'){
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.crossFilter', 'filtrado transversal'));
    const activeFilters = selectedTagCount();
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiText(
        activeFilters ? 'list.modelsWith' : 'list.modelsIn',
        `${uiPlural('common.model', list.length, 'modelo', 'modelos')} ${activeFilters ? 'con' : 'en'}`,
        { models:uiPlural('common.model', list.length, 'modelo', 'modelos') }
      ))}</span>
      <span class="count-school">${activeFilters ? `${activeFilters} tag${activeFilters === 1 ? '' : 's'}` : '&ldquo;Tags&rdquo;'}</span>
    `;
  }else if (groupingMode === 'process'){
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.openTimeline', 'abrir timeline'));
    const proc = PROCESS_FILTER_MAP.get(groupingTarget) || PROCESS_FILTERS[0];
    const procLabel = proc
      ? `${proc.id} · ${changeProcessLabel(proc.id, proc.label)}`
      : uiText('group.process', 'Proceso');
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiText('list.levelFourIn', 'con nivel 4 en'))}</span>
      <span class="count-school">“${escapeHtml(procLabel)}”</span>
    `;
  }else if (groupingMode === 'dimension'){
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.openTimeline', 'abrir timeline'));
    const dim = CHANGE_DIMS.find((d) => d.id === groupingTarget) || CHANGE_DIMS[0];
    const dimLabel = dim
      ? `${changeDimensionLabel(dim)} (>=${SIGNIFICANT_DIMENSION_PCT}%)`
      : uiText('overview.dimension.defaultTitle', 'Dimensión');
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiText('list.significantWeightIn', 'con peso significativo en'))}</span>
      <span class="count-school">“${escapeHtml(dimLabel)}”</span>
    `;
  }else if (groupingMode === 'epistemology'){
    setLeftListMeta(uiText('list.epistemologies', 'Epistemologías'), uiText('list.openTimeline', 'abrir timeline'));
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiText(
        'list.frameworksIn',
        `${uiPlural('common.framework', list.length, 'marco', 'marcos')} en`,
        { frameworks:uiPlural('common.framework', list.length, 'marco', 'marcos') }
      ))}</span>
      <span class="count-school">&ldquo;${escapeHtml(uiText('list.epistemologies', 'Epistemologías'))}&rdquo;</span>
    `;
  }else if (groupingMode === 'all'){
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.orderedByYear', 'ordenados por año'));
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiText('list.modelsIn', 'modelos en', { models:uiPlural('common.model', list.length, 'modelo', 'modelos') }))}</span>
      <span class="count-school">&ldquo;${escapeHtml(uiText('library.group.all', 'Todos'))}&rdquo;</span>
    `;
  }else if (groupingMode === 'collection'){
    const collectionLabel = collectionDisplayLabel(groupingTarget) || uiText('library.group.collection', 'Colecciones');
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.openTimeline', 'abrir timeline'));
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml(uiText('list.in', 'en'))}</span>
      <span class="count-school">&ldquo;${escapeHtml(collectionLabel)}&rdquo;</span>
    `;
  }else{
    setLeftListMeta(uiText('list.models', 'Modelos'), uiText('list.openTimeline', 'abrir timeline'));
    countLine.innerHTML = `
      <span class="count-n">${list.length}</span>
      <span class="count-txt">${escapeHtml((list.length === baseList.length)
        ? uiText('list.in', 'en')
        : uiText('list.fromIn', `de ${baseList.length} en`, { total:baseList.length }))}</span>
      <span class="count-school">“${escapeHtml(schoolDisplayLabel(currentSchool) || currentSchool)}”</span>
    `;
  }

  if(!list.length){
    if (searchActive){
      modelsListEl.innerHTML = `<div class="subtitle" style="margin:10px 0 0 0">${escapeHtml(uiText(
        'empty.search',
        `No se han encontrado modelos para "${modelSearchQuery}".`,
        { query:modelSearchQuery }
      ))}</div>`;
      return;
    }
    const emptyByGrouping = (groupingMode === 'all')
      ? uiText('empty.all', 'No hay modelos disponibles todavía.')
      : (groupingMode === 'collection'
        ? uiText('empty.collection', 'No hay modelos en esta colección todavía.')
      : (groupingMode === 'school')
      ? uiText('empty.school', 'No hay modelos en esta escuela todavía.')
      : (groupingMode === 'epistemology'
        ? uiText('empty.epistemology', 'No hay epistemologías disponibles todavía.')
      : (groupingMode === 'process'
        ? uiText('empty.process', 'No hay modelos con nivel 4 en ese proceso.')
        : (groupingMode === 'dimension'
          ? uiText('empty.dimension', `No hay modelos con >=${SIGNIFICANT_DIMENSION_PCT}% en esa dimensión.`, { percent:SIGNIFICANT_DIMENSION_PCT })
          : (groupingMode === 'tags'
            ? uiText('empty.tags', 'No hay modelos que combinen los tags seleccionados.')
            : uiText('empty.network', 'No hay modelos para la vista red.'))))));
    modelsListEl.innerHTML =
      `<div class="subtitle" style="margin:10px 0 0 0">${escapeHtml(emptyByGrouping)}</div>`;
    return;
  }

  // 1) Render lista
  modelsListEl.innerHTML = buildModelSectionsMarkup(list);

  // ✅ Prefetch adaptativo: evita competir con la UI en smartphone
  scheduleIdleTask(() => {
    try{
      const saveData = !!(navigator.connection && navigator.connection.saveData);
      if (saveData) return;

      const isEpistemologiaList = isEpistemologiaListMode();

      if (isEpistemologiaList) return;

      const isMobile = window.matchMedia && window.matchMedia('(max-width: 980px)').matches;
      const prefetchCount = isMobile ? 2 : 6;
      const pre = list.slice(0, prefetchCount);

      for (const mm of pre){
        ensureModelFull(mm).catch(()=>{});
      }
    }catch(e){}
  }, 1500);

  // 2) Delegación de eventos (se engancha una sola vez)
  if(!modelsListEl.__boundClick || !modelsListEl.__clickHealthy){
    modelsListEl.__boundClick = true;
    modelsListEl.__clickHealthy = true;

  modelsListEl.addEventListener('click', async (evt) => {
  const item = evt.target.closest('.mi-item');
  if(!item) return;

  const modeKey = String(item.getAttribute('data-network-mode') || '').trim();
  if (groupingMode === 'network' && modeKey){
    applyNetworkProfileMode(modeKey);
    return;
  }

  const raw = item.getAttribute('data-id') || '';
  const id = decodeURIComponent(raw);

  // evita doble clic accidental mientras carga
  if (modelsListEl.__loading) return;
  modelsListEl.__loading = true;

  try{
    beginModelInfoPending(id);
    // ✅ 1) pinta selección INMEDIATA (sin esperar red)
    currentModelId = id;
    window.__CURRENT_MODEL_ID = id;
    setModelInfoOpen(true);
    setMobileModelPanelLowered(false);

    // quita active del resto (rápido)
    setActiveModelInList(id);
    openMobileModelFullscreen();

    // ✅ 2) feedback visual en panel derecho antes del fetch
    infoFadeOut();
    resetModelPanelToTop();

    // ✅ 3) cede un frame para que el navegador renderice (esto mata el “lag percibido”)
    await new Promise(r => requestAnimationFrame(r));

    // ✅ 4) carga real
    await openModel(id);

  }catch(err){
    console.error('openModel falló:', id, err);
  }finally{
    modelsListEl.__loading = false;
    endModelInfoPending(id);
    infoFadeIn(); // por si openModel no lo hace siempre
  }
});

  }

  try{
    const isEpistemologiaList = isEpistemologiaListMode();

    if (!isEpistemologiaList){
      initVisibleModelCardPhotoRetries();
      hydrateModelCardAvatars();
      ensureAuthorPhotoIndexPromise().then(() => {
        try{
          hydrateModelCardAvatars();
          initVisibleModelCardPhotoRetries();
        }catch(e){
          console.warn('hydrateModelCardAvatars failed after photo index load', e);
        }
      }).catch(() => {});
    }
  }catch(e){
    console.warn('Model card avatar hydration failed', e);
  }

  // âœ… Prefetch adaptativo: evita competir con la UI en smartphone
  scheduleIdleTask(() => {
    try{
      const saveData = !!(navigator.connection && navigator.connection.saveData);
      if (saveData) return;

      const isEpistemologiaList = isEpistemologiaListMode();

      if (isEpistemologiaList) return;

      const isMobile = window.matchMedia && window.matchMedia('(max-width: 980px)').matches;
      const prefetchCount = isMobile ? 2 : 6;
      const pre = list.slice(0, prefetchCount);

      for (const mm of pre){
        ensureModelFull(mm).catch(()=>{});
      }
    }catch(e){}
  }, 1500);
}


const EPISTEMOLOGIA_COMPARISON_JSON_PATHS = [
  'Core/modelos/epistemologia/tabla-comparativa.json',
  'Core/modelos/epistemologias/tabla-comparativa.json',
  'Core/escuelas/epistemologia/tabla-comparativa.json',
  'Core/escuelas/epistemologia-tabla-comparativa.json'
];

function normalizeEpistemologiaComparisonRows(data){
  const rawRows =
    (Array.isArray(data) ? data : null) ||
    (Array.isArray(data?.rows) ? data.rows : null) ||
    (Array.isArray(data?.filas) ? data.filas : null) ||
    (Array.isArray(data?.tabla) ? data.tabla : null) ||
    [];

  return rawRows
    .filter(row => row && typeof row === 'object')
    .map(row => ({
      epistemologia: row.epistemologia ?? row.epistemología ?? row.nombre ?? '',
      verdad: row.verdad ?? row.dondeResideLaVerdad ?? row['donde_reside_la_verdad'] ?? '',
      sujeto: row.sujeto ?? row.concepcionDelSujeto ?? row['concepcion_del_sujeto'] ?? '',
      cambio: row.cambio ?? row.concepcionDelCambio ?? row['concepcion_del_cambio'] ?? '',
      terapeuta: row.terapeuta ?? row.concepcionDelTerapeuta ?? row['concepcion_del_terapeuta'] ?? ''
    }))
    .filter(row => row.epistemologia || row.verdad || row.sujeto || row.cambio || row.terapeuta);
}

function findEpistemologiaComparisonModel(row){
  const label = String(row?.epistemologia || '').trim();
  if (!label) return null;

  if (typeof epFindModelByLabelOrId === 'function'){
    const found = epFindModelByLabelOrId(label);
    if (found) return found;
  }

  const labelSlug = slugify(label);
  const labelNorm = normAuthorKey(label);
  const pool = (typeof getAllModelsPool === 'function') ? getAllModelsPool() : (Array.isArray(MODELS) ? MODELS : []);
  return pool.find((item) => {
    const itemLabel = String(item?.label || item?.nombre || '').trim();
    const itemId = String(item?.id || '').trim();
    return slugify(itemLabel) === labelSlug ||
      slugify(itemId) === labelSlug ||
      normAuthorKey(itemLabel) === labelNorm;
  }) || null;
}

function getEpistemologiaComparisonImageUrl(row, model){
  const explicit = row?.imagenVida || row?.vidaImage || row?.imagen || row?.image || '';
  if (explicit) return buildLifeAuthorImageUrls(explicit)[0] || '';

  const target = model || findEpistemologiaComparisonModel(row);
  return target ? (getValidatedModelHeaderLifeImageUrl(target) || getVidaIndexedImageUrls(target)[0] || '') : '';
}

function renderEpistemologiaComparisonModelCell(row){
  const title = String(row?.epistemologia || '').trim();
  const model = findEpistemologiaComparisonModel(row);
  const imageUrl = getEpistemologiaComparisonImageUrl(row, model);
  const imageHtml = imageUrl
    ? `<img class="ep-model-cover-img"${isProxyUrl(imageUrl) ? '' : ` src="${escapeHtml(imageUrl)}"`} data-private-src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
    : '';

  return `
    <div class="ep-model-cover">
      ${imageHtml}
      <span class="ep-model-cover-title">${escapeHtml(title)}</span>
    </div>
  `;
}

async function loadEpistemologiaComparisonRows(){
  if (loadEpistemologiaComparisonRows._promise) return loadEpistemologiaComparisonRows._promise;

  loadEpistemologiaComparisonRows._promise = (async () => {
    for (const sourcePath of EPISTEMOLOGIA_COMPARISON_JSON_PATHS) {
      try{
        const data = await fetchFirstJson(dataUrlCandidates(sourcePath), { bust:true, quiet:true });
        if (!data) continue;
        const localized = await applyDocumentLocaleOverlay(data, sourcePath);
        return normalizeEpistemologiaComparisonRows(localized);
      }catch(error){
        // Prueba la siguiente ruta histórica compatible.
      }
    }
    return [];
  })();

  return loadEpistemologiaComparisonRows._promise;
}

function renderEpistemologiaComparisonTable(rows){
  const headers = [
    uiText('epistemology.table.header.epistemology', 'Epistemología'),
    uiText('epistemology.table.header.truth', '¿Dónde reside la verdad?'),
    uiText('epistemology.table.header.subject', 'Concepción del sujeto'),
    uiText('epistemology.table.header.change', 'Concepción del cambio'),
    uiText('epistemology.table.header.therapist', 'Concepción del terapeuta')
  ];
  const safeRows = Array.isArray(rows) ? rows : [];
  const body = safeRows.map(row => `
    <tr>
      <td>${renderEpistemologiaComparisonModelCell(row)}</td>
      <td>${escapeHtml(row.verdad)}</td>
      <td>${escapeHtml(row.sujeto)}</td>
      <td>${escapeHtml(row.cambio)}</td>
      <td>${escapeHtml(row.terapeuta)}</td>
    </tr>
  `).join('');

  return `
    <section class="ep-comparison" aria-label="${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}">
      <div class="ep-comparison-header">
        <p class="ep-comparison-eyebrow">${escapeHtml(uiText('epistemology.table.framework', 'Marco comparativo'))}</p>
        <h3 class="ep-comparison-heading">${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}</h3>
        <p class="ep-comparison-sub">${escapeHtml(uiText('epistemology.table.subtitle', 'Comparación de enfoques según la concepción de verdad, sujeto, cambio y terapeuta.'))}</p>
      </div>
      <div class="ep-comparison-scroll">
        <table class="ep-comparison-table">
          <thead>
            <tr>${headers.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderEpistemologiaComparisonPlaceholder(){
  return `
    <section class="ep-comparison ep-comparison-loading" aria-label="${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}" data-ep-comparison>
      <div class="ep-comparison-header">
        <p class="ep-comparison-eyebrow">${escapeHtml(uiText('epistemology.table.framework', 'Marco comparativo'))}</p>
        <h3 class="ep-comparison-heading">${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}</h3>
      </div>
      <div class="mp-hint" style="margin:12px 28px">${escapeHtml(uiText('epistemology.table.loading', 'Cargando tabla comparativa…'))}</div>
    </section>
  `;
}

function hydrateTimelineMotion(host, scrollRoot){
  if (!host || window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  // La línea recorre una lista muy alta. Mantenerla transformada tras animarla
  // puede hacer que Chrome deje de rasterizarla al alejarse de su origen.
  // Se deja estática y solo se animan las entradas de la cronología.
  const list = host.querySelector('.school-editorialTimelineList');
  if (list){
    list.classList.remove('tl-will-animate', 'is-visible');
  }

  // Animate each item on scroll with a stagger that resets between scroll events
  const items = [...host.querySelectorAll('.school-editorialTimelineItem')];
  if (!items.length) return;
  items.forEach(item => item.classList.add('tl-will-animate'));

  let batchIdx = 0;
  let resetTimer = null;
  const itemObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const item = entry.target;
      item.style.transitionDelay = `${Math.min(batchIdx, 5) * 55}ms`;
      item.classList.add('is-visible');
      batchIdx++;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { batchIdx = 0; }, 420);
      itemObs.unobserve(item);
    });
  }, { root: scrollRoot || null, threshold: 0.06, rootMargin: '0px 0px -28px 0px' });
  items.forEach(item => itemObs.observe(item));
}

async function hydrateEpistemologiaComparisonTable(host){
  const target = host?.querySelector?.('[data-ep-comparison]');
  if (!target) return;

  try{
    await loadVidaImageIndex().catch(() => null);
    const rows = await loadEpistemologiaComparisonRows();
    if (!target.isConnected) return;
    if (!rows.length){
      target.innerHTML = `
        <div class="ep-comparison-header">
          <p class="ep-comparison-eyebrow">${escapeHtml(uiText('epistemology.table.framework', 'Marco comparativo'))}</p>
          <h3 class="ep-comparison-heading">${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}</h3>
        </div>
        <div class="mp-hint" style="margin:12px 28px">${escapeHtml(uiText('epistemology.table.error', 'No se pudo cargar la tabla comparativa.'))}</div>
      `;
      return;
    }
    const parent = target.parentElement;
    target.outerHTML = renderEpistemologiaComparisonTable(rows);
    hydratePrivateProxyImages(parent || host);
  }catch(e){
    console.warn('No se pudo cargar la tabla comparativa de epistemologías:', e);
    if (!target.isConnected) return;
    target.innerHTML = `
      <div class="ep-comparison-header">
        <p class="ep-comparison-eyebrow">${escapeHtml(uiText('epistemology.table.framework', 'Marco comparativo'))}</p>
        <h3 class="ep-comparison-heading">${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}</h3>
      </div>
      <div class="mp-hint" style="margin:12px 28px">${escapeHtml(uiText('epistemology.table.error', 'No se pudo cargar la tabla comparativa.'))}</div>
    `;
  }
}

function closeEpistemologiaComparisonModal(){
  const modal = document.querySelector('.ep-table-modal');
  if (modal) modal.remove();
  document.removeEventListener('keydown', handleEpistemologiaComparisonModalKeydown);
}

function handleEpistemologiaComparisonModalKeydown(evt){
  if (evt.key === 'Escape') closeEpistemologiaComparisonModal();
}

async function openEpistemologiaComparisonModal(){
  closeEpistemologiaComparisonModal();

  const modal = document.createElement('div');
  modal.className = 'ep-table-modal';
  modal.setAttribute('role', 'presentation');
  modal.innerHTML = `
    <div class="ep-table-dialog" role="dialog" aria-modal="true" aria-labelledby="epTableModalTitle">
      <div class="ep-table-modal-head">
        <div class="ep-table-modal-kicker">
          <p class="ep-table-modal-eyebrow">${escapeHtml(uiText('epistemology.table.framework', 'Marco comparativo'))}</p>
          <h3 class="ep-table-modal-title" id="epTableModalTitle">${escapeHtml(uiText('epistemology.table.label', 'Tabla comparativa de epistemologías'))}</h3>
          <p class="ep-table-modal-subtitle">${escapeHtml(uiText('epistemology.table.modalSubtitle', 'Comparación de enfoques según la concepción de verdad, el sujeto, el cambio y el rol del terapeuta.'))}</p>
        </div>
        <button type="button" class="ep-table-close" aria-label="${escapeHtml(uiText('epistemology.table.close', 'Cerrar tabla comparativa'))}" data-action="close-ep-table">x</button>
      </div>
      <div class="ep-table-modal-body">
        <div class="mp-hint" style="margin:0">${escapeHtml(uiText('epistemology.table.loading', 'Cargando tabla comparativa…'))}</div>
      </div>
    </div>
  `;

  modal.addEventListener('click', (evt) => {
    if (evt.target === modal || evt.target.closest('[data-action="close-ep-table"]')){
      closeEpistemologiaComparisonModal();
    }
  });

  document.body.appendChild(modal);
  document.addEventListener('keydown', handleEpistemologiaComparisonModalKeydown);
  modal.querySelector('[data-action="close-ep-table"]')?.focus?.();

  const body = modal.querySelector('.ep-table-modal-body');
  try{
    const [rows] = await Promise.all([
      loadEpistemologiaComparisonRows(),
      loadVidaImageIndex().catch(() => null)
    ]);
    if (!modal.isConnected) return;
    body.innerHTML = rows.length
      ? renderEpistemologiaComparisonTable(rows)
      : `<div class="mp-hint" style="margin:0">${escapeHtml(uiText('epistemology.table.error', 'No se pudo cargar la tabla comparativa.'))}</div>`;
    hydratePrivateProxyImages(body);
  }catch(e){
    console.warn('No se pudo abrir la tabla comparativa de epistemologías:', e);
    if (!modal.isConnected) return;
    body.innerHTML = `<div class="mp-hint" style="margin:0">${escapeHtml(uiText('epistemology.table.error', 'No se pudo cargar la tabla comparativa.'))}</div>`;
  }
}

function renderSchoolInfo(grupo){
  if(!grupo){
    setSchoolToneClass('');
    renderModelInfo(null);
    return;
  }

  modelInfoEl.classList.remove(
    'is-loading',
    'school-swipe-out-left',
    'school-swipe-out-right',
    'school-swipe-in-left',
    'school-swipe-in-right'
  );
  modelInfoEl.style.removeProperty('opacity');
  modelInfoEl.style.removeProperty('transform');

  setSchoolToneClass(grupo);

  const col = colorForSchoolLabel(grupo) || '#ffffff';
const info = SCHOOL_INFO[grupo] || {};
const subtitle = info.subtitle || '—';
const desc = info.desc || uiText('overview.school.defaultDescription', 'Aún no has definido la descripción de esta escuela.');
const keys = info.keys || [];
const shouldShowEpistemologiaTable = isEpistemologiaSchoolName(grupo);
const collection = collectionDefinitionForSchool(grupo);
const editorialTitle = shouldShowEpistemologiaTable
  ? uiText('overview.school.epistemologies', 'Epistemologías')
  : (collection ? collectionDisplayLabel(collection) : (schoolDisplayLabel(grupo) || grupo));
const epistemologiaTable = shouldShowEpistemologiaTable ? renderEpistemologiaComparisonPlaceholder() : '';

  // Tinte del panel derecho como ya haces con modelos
  const rightPanel = document.querySelector('.panel.right');
  if (rightPanel){
    rightPanel.style.setProperty('--panelGlow', hexToRgba(col, 0.18));
  }

  // Datos dinámicos desde tus MODELS
  const list = collection
    ? baseListByGroupingMode('collection')
    : filteredModelsBySchool(grupo);
  const n = list.length;
  const schoolTimeline = renderSchoolModelTimeline(list);

  const first = list
    .filter(m => m && m.year)
    .sort((a,b)=> (+a.year||0) - (+b.year||0))[0];

  const firstLine = first
    ? `${escapeHtml(first.year)} · ${escapeHtml(first.label ?? '—')} (${escapeHtml(first.autores ?? '—')})`
    : '—';
modelInfoEl.classList.add('school-view');
modelInfoEl.style.setProperty('--schoolColor', col);
// ✅ IMPORTANTE: actualizar variables globales (si no, se hereda el color del último modelo)
document.documentElement.style.setProperty('--schoolColor', col);
document.documentElement.style.setProperty('--panelGlow', hexToRgba(col, 0.16));

// ✅ IMPORTANTE: en vista “escuela” NO queremos sticky con el título del último modelo
if (window.__SMH){
  window.__SMH.setTitle('');
  window.__SMH.setAuthor('');
  window.__SMH.hide?.();        // si existe
  const el = document.getElementById('stickyModelHeader');
  if (el) el.classList.remove('is-on');
}

  modelInfoEl.innerHTML = `
    <article class="school-editorial" style="--schoolColor:${col}">
      <div class="school-editorialHero">
        <div class="school-editorialMain">
          <p class="school-editorialKicker">${shouldShowEpistemologiaTable
            ? escapeHtml(uiText('overview.school.epistemologicalFramework', 'Marco epistemológico'))
            : (collection
              ? escapeHtml(uiText('overview.collection.kicker', 'Colección temática'))
              : escapeHtml(uiText('overview.school.psychotherapySchool', 'Escuela psicoterapéutica')))}</p>
          <h1 class="school-editorialTitle">${escapeHtml(editorialTitle)}</h1>
          <p class="school-editorialSubtitle">${escapeHtml(subtitle)}</p>
        </div>

        <div class="school-editorialSide">
          <p class="school-editorialIntro">${escapeHtml(desc)}</p>

          ${keys.length ? `
            <div class="school-editorialKeys" aria-label="${escapeHtml(uiText('overview.school.keyConcepts', 'Conceptos clave'))}">
              ${keys.map(k => `<span class="school-editorialKey">${escapeHtml(k)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="school-editorialFacts">
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.school.library', 'Biblioteca'))}</span>
              <span class="school-editorialFactValue">${n} ${escapeHtml(uiPlural('common.model', n, 'modelo', 'modelos'))}</span>
            </div>
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.school.firstModel', 'Primer modelo'))}</span>
              <span class="school-editorialFactValue">${firstLine}</span>
            </div>
          </div>
          <div class="school-editorialCta">${escapeHtml(uiText('overview.school.cta', 'Elige un modelo de la lista para abrir su ficha editorial.'))}</div>
        </div>
      </div>

      ${schoolTimeline}

      ${epistemologiaTable}
    </article>
  `;

  bindEditorialModelTimeline(modelInfoEl);

  modelInfoEl.classList.remove('is-loading', 'school-swipe-out-left', 'school-swipe-out-right');
  resetRightPanelToTop();

  if (shouldShowEpistemologiaTable){
    hydrateEpistemologiaComparisonTable(modelInfoEl);
  }
}

function renderAllModelsOverviewHtml(){
  const models = MODELS
    .filter(isTherapyModel)
    .sort((a,b) => (+a.year||0) - (+b.year||0));
  const datedModels = models.filter((model) => Number(model?.year) > 0);
  const first = datedModels[0] || null;
  const latest = datedModels[datedModels.length - 1] || null;
  const coverage = first && latest
    ? `${first.year} — ${latest.year}`
    : uiText('overview.all.coveragePending', 'Cronología en construcción');
  const overviewCards = [
    {
      title:uiText('overview.all.chronology.title', 'Cronología'),
      copy:uiText('overview.all.chronology.copy', 'La lista recorre los modelos desde sus antecedentes históricos hasta los desarrollos contemporáneos.'),
      meta:uiText('overview.all.chronology.meta', 'Orden temporal')
    },
    {
      title:uiText('library.group.school', 'Escuelas'),
      copy:uiText('overview.all.schools.copy', 'Siete tradiciones canónicas permiten seguir las grandes genealogías de la psicoterapia.'),
      meta:uiText('overview.all.schools.meta', '7 escuelas canónicas')
    },
    {
      title:uiText('library.group.collection', 'Colecciones'),
      copy:uiText('overview.all.collections.copy', 'Agrupan desarrollos transversales, psicodélicos, fronterizos, tradiciones culturales y terapias expresivas y creativas sin convertirlos en escuelas.'),
      meta:uiText('overview.all.collections.meta', '5 colecciones temáticas')
    },
    {
      title:uiText('library.group.tags', 'Tags'),
      copy:uiText('overview.all.tags.copy', 'Cruzan la biblioteca por foco clínico, población, formato, ola, mecanismo y epistemología.'),
      meta:uiText('overview.all.tags.meta', '6 facetas combinables')
    },
    {
      title:uiText('library.group.epistemology', 'Epistemologías'),
      copy:uiText('overview.all.epistemologies.copy', 'Hacen visibles los supuestos sobre conocimiento, sujeto, cambio y relación terapéutica.'),
      meta:uiText('overview.all.epistemologies.meta', 'Marcos de comprensión')
    },
    {
      title:uiText('library.view.network', 'Red'),
      copy:uiText('overview.all.network.copy', 'La vista de red compara afinidades entre modelos a partir de procesos y dimensiones de cambio.'),
      meta:uiText('overview.all.network.meta', 'Vista relacional')
    }
  ];
  const timeline = renderSchoolModelTimeline(models, {
    variant:'all',
    showGroup:true,
    aria:uiText('overview.all.timeline.aria', 'Cronología de todos los modelos'),
    kicker:uiText('overview.all.timeline.kicker', 'Historia de la psicoterapia'),
    title:uiText('overview.all.timeline.title', 'Timeline general')
  });

  return `
    <article class="school-editorial tags-editorial" style="--schoolColor:#D9AA3F">
      <div class="school-editorialHero">
        <div class="school-editorialMain">
          <p class="school-editorialKicker">${escapeHtml(uiText('overview.all.kicker', 'Biblioteca completa'))}</p>
          <h1 class="school-editorialTitle">${escapeHtml(uiText('overview.all.title', 'Todos los modelos'))}</h1>
          <p class="school-editorialSubtitle">${escapeHtml(uiText('overview.all.subtitle', 'Historia, escuelas y conexiones en una sola mirada.'))}</p>
        </div>

        <div class="school-editorialSide">
          <p class="school-editorialIntro">${escapeHtml(uiText('overview.all.intro', 'Este índice reúne el conjunto de modelos psicoterapéuticos de la biblioteca y los presenta en orden histórico. Es el punto de partida para recorrer el campo completo antes de acotar la búsqueda.'))}</p>

          <div class="school-editorialKeys" aria-label="${escapeHtml(uiText('overview.all.summary', 'Resumen de la biblioteca'))}">
            <span class="school-editorialKey">${escapeHtml(`${models.length} ${uiPlural('common.model', models.length, 'modelo', 'modelos')}`)}</span>
            <span class="school-editorialKey">${escapeHtml(uiText('overview.all.schools.meta', '7 escuelas canónicas'))}</span>
            <span class="school-editorialKey">${escapeHtml(uiText('overview.all.collections.meta', '5 colecciones temáticas'))}</span>
            <span class="school-editorialKey">${escapeHtml(uiText('overview.all.twoViews', '2 vistas'))}</span>
          </div>

          <div class="school-editorialFacts">
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.all.coverage', 'Recorrido histórico'))}</span>
              <span class="school-editorialFactValue">${escapeHtml(coverage)}</span>
            </div>
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.all.organization', 'Organización'))}</span>
              <span class="school-editorialFactValue">${escapeHtml(uiText('overview.all.organizationValue', 'Escuelas · Colecciones · Tags · Epistemologías'))}</span>
            </div>
          </div>
          <div class="school-editorialCta">${escapeHtml(uiText('overview.all.cta', 'Recorre la cronología de la izquierda o elige otra clasificación para cambiar el punto de vista.'))}</div>
        </div>
      </div>

      ${timeline}

      <section class="school-editorialBody tags-editorialBody">
        <div class="school-editorialSectionHead">
          <div>
            <p class="school-editorialSectionKicker">${escapeHtml(uiText('overview.all.guide', 'Guía de lectura'))}</p>
            <h2 class="school-editorialSectionTitle">${escapeHtml(uiText('overview.all.entryPoints', 'Seis formas de entrar en la biblioteca'))}</h2>
          </div>
        </div>

        <div class="tags-editorialFacets">
          ${overviewCards.map((card, index) => `
            <article class="tags-editorialFacet">
              <span class="tags-editorialFacetNum">${String(index + 1).padStart(2, '0')}</span>
              <h3 class="tags-editorialFacetTitle">${escapeHtml(card.title)}</h3>
              <p class="tags-editorialFacetText">${escapeHtml(card.copy)}</p>
              <span class="tags-editorialFacetMeta">${escapeHtml(card.meta)}</span>
            </article>
          `).join('')}
        </div>
      </section>
    </article>
  `;
}

function renderProcessOverviewHtml(){
  const proc = PROCESS_FILTER_MAP.get(groupingTarget) || PROCESS_FILTERS[0] || null;
  const info = (proc && PROCESS_INFO[proc.id]) ? PROCESS_INFO[proc.id] : null;
  const processFallback = uiText('overview.process.defaultTitle', 'Proceso');
  const processId = proc?.id || '';
  const title = processId
    ? uiText(`overview.process.${processId}.title`, info?.title || `${processId} — ${proc?.label || ''}`.trim())
    : processFallback;
  const desc = processId
    ? uiText(`overview.process.${processId}.description`, info?.desc || uiText('overview.process.defaultDescription', 'Proceso de cambio seleccionado en el marco EEMM (PBT).'))
    : uiText('overview.process.defaultDescription', 'Proceso de cambio seleccionado en el marco EEMM (PBT).');
  const subs = Array.isArray(info?.subs)
    ? info.subs.map((subprocess) => {
        const subprocessId = String(subprocess || '').split(' — ')[0].trim();
        return subprocessId
          ? uiText(`overview.process.subprocess.${subprocessId}`, subprocess)
          : subprocess;
      })
    : [];
  const isRelational = !!(proc && proc.id === 'R');

  const procLabel = processId ? changeProcessLabel(processId, proc?.label) : processFallback;
  const procId = proc?.id || '';
  const procSubtitle = title.includes(' — ') ? title.split(' — ').slice(1).join(' — ') : '';

  return `
    <article class="school-editorial">
      <div class="school-editorialHero">
        <div class="school-editorialMain">
          <p class="school-editorialKicker">${escapeHtml(uiText('overview.process.changeProcess', 'Proceso de cambio'))}${procId ? ` · ${escapeHtml(procId)}` : ''}</p>
          <h1 class="school-editorialTitle">${escapeHtml(procLabel)}</h1>
          ${procSubtitle ? `<p class="school-editorialSubtitle">${escapeHtml(procSubtitle)}</p>` : ''}
        </div>
        <div class="school-editorialSide">
          <p class="school-editorialIntro">${escapeHtml(desc)}</p>
          ${subs.length ? `
            <div class="school-editorialKeys" aria-label="${escapeHtml(uiText('overview.process.mainSubprocesses', 'Subprocesos principales'))}">
              ${subs.map((s) => `<span class="school-editorialKey">${escapeHtml(s)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="school-editorialFacts">
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.process.scale', 'Escala'))}</span>
              <span class="school-editorialFactValue">PBT 0–4</span>
            </div>
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.process.scoringRule', 'Regla de puntuación'))}</span>
              <span class="school-editorialFactValue">${escapeHtml(uiText('overview.process.scoringValues', '0 no explícito · 1 secundario · 2 importante · 3 nuclear · 4 definitorio'))}</span>
            </div>
          </div>
          ${isRelational ? `
            <div class="school-editorialFacts" style="margin-top:16px">
              <div class="school-editorialFact" style="grid-column:1/-1">
                <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.process.relationalNote', 'Aclaración para R'))}</span>
                <span class="school-editorialFactValue">${escapeHtml(uiText('overview.process.relationalExplanation', 'La alianza terapéutica por sí sola no puntúa R alto. R se puntúa alto cuando el modelo interviene explícitamente para cambiar relaciones externas del paciente (pareja, familia, redes, patrones vinculares).'))}</span>
              </div>
            </div>
          ` : ''}
          <div class="school-editorialCta">${escapeHtml(uiText('overview.process.cta', 'Elige un modelo de la lista para ver cómo justifica este proceso en su ficha.'))}</div>
        </div>
      </div>
    </article>
  `;
}

function renderDimensionOverviewHtml(){
  const dim = CHANGE_DIMS.find((d) => d.id === groupingTarget) || CHANGE_DIMS[0] || null;
  const dimLabel = dim ? changeDimensionLabel(dim) : uiText('overview.dimension.defaultTitle', 'Dimensión');
  const dimDesc = dim
    ? uiText(`overview.dimension.${dim.id}.description`, DIMENSION_INFO[dim.id] || uiText('overview.dimension.defaultDescription', 'Dimensión de cambio dentro del EEMM.'))
    : uiText('overview.dimension.defaultDescription', 'Dimensión de cambio dentro del EEMM.');

  const dimParts = dimLabel.split('. ');
  const dimNum = dimParts.length > 1 ? dimParts[0] : '';
  const dimName = dimParts.length > 1 ? dimParts.slice(1).join('. ') : dimLabel;

  const allDims = CHANGE_DIMS.map((d) => {
    const on = dim && d.id === dim.id;
    return `<span class="school-editorialKey"${on ? ' style="border-color:color-mix(in srgb,var(--schoolColor,#D9AA3F) 70%,transparent);background:color-mix(in srgb,var(--schoolColor,#D9AA3F) 12%,rgba(255,255,255,0.02));color:color-mix(in srgb,var(--schoolColor,#D9AA3F) 90%,#fff 10%)"' : ''}>${escapeHtml(changeDimensionLabel(d))}</span>`;
  }).join('');

  return `
    <article class="school-editorial">
      <div class="school-editorialHero">
        <div class="school-editorialMain">
          <p class="school-editorialKicker">${escapeHtml(uiText('overview.dimension.changeDimension', 'Dimensión de cambio'))}${dimNum ? ` · ${escapeHtml(dimNum)}` : ''}</p>
          <h1 class="school-editorialTitle">${escapeHtml(dimName)}</h1>
        </div>
        <div class="school-editorialSide">
          <p class="school-editorialIntro">${escapeHtml(dimDesc)}</p>
          <div class="school-editorialKeys" aria-label="${escapeHtml(uiText('overview.dimension.changeDimensions', 'Dimensiones de cambio'))}">
            ${allDims}
          </div>
          <div class="school-editorialFacts">
            <div class="school-editorialFact" style="grid-column:1/-1">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.dimension.reference', 'Referencia'))}</span>
              <span class="school-editorialFactValue">Hofmann, Hayes &amp; Lorscheid (2021). <em>Learning Process-Based Therapy</em>. New Harbinger Publications.</span>
            </div>
          </div>
          <div class="school-editorialCta">${escapeHtml(uiText('overview.dimension.cta', 'Elige un modelo para ver cómo trabaja esta dimensión en su ficha.'))}</div>
        </div>
      </div>
    </article>
  `;
}

function renderTagsOverviewHtml(){
  const facetCopy = {
    foco:uiText('overview.tags.facet.focus', 'El problema o territorio clínico sobre el que se concentra el modelo.'),
    poblacion:uiText('overview.tags.facet.population', 'Las personas y configuraciones relacionales para las que fue pensado.'),
    formato:uiText('overview.tags.facet.format', 'El encuadre de aplicación: individual, grupal, pareja, familiar o autoaplicado.'),
    ola:uiText('overview.tags.facet.wave', 'La generación histórica dentro de la tradición cognitivo-conductual.'),
    mecanismo:uiText('overview.tags.facet.mechanism', 'La vía principal por la que el modelo intenta producir cambio.'),
    epistemologia:uiText('overview.tags.facet.epistemology', 'La concepción del conocimiento y del cambio que sostiene la propuesta.')
  };
  const selected = TAG_FACETS.flatMap((facet) => {
    const values = Array.from(TAG_FILTER_STATE.get(facet.id) || []);
    return values.map((value) => `${uiText(`taxonomy.tagFacet.${facet.id}`, facet.label)} · ${tagValueLabel(value)}`);
  });
  const activeFilters = selected.length;
  const keyLabels = activeFilters ? selected : TAG_FACETS.map((facet) => uiText(`taxonomy.tagFacet.${facet.id}`, facet.label));

  return `
    <article class="school-editorial tags-editorial" style="--schoolColor:${TAG_FILTER_COLOR}">
      <div class="school-editorialHero">
        <div class="school-editorialMain">
          <p class="school-editorialKicker">${escapeHtml(uiText('overview.tags.index', 'Índice transversal'))}</p>
          <h1 class="school-editorialTitle">Tags</h1>
          <p class="school-editorialSubtitle">${escapeHtml(uiText('overview.tags.subtitle', 'Otra forma de leer la biblioteca.'))}</p>
        </div>

        <div class="school-editorialSide">
          <p class="school-editorialIntro">${escapeHtml(uiText('overview.tags.intro', 'Los modelos no pertenecen solo a una escuela. También pueden encontrarse por el problema que abordan, la población a la que se dirigen, su formato, su genealogía, sus mecanismos de cambio y la epistemología que los sostiene.'))}</p>

          <div class="school-editorialKeys" aria-label="${escapeHtml(activeFilters ? uiText('overview.tags.selected', 'Tags seleccionados') : uiText('overview.tags.available', 'Facetas disponibles'))}">
            ${keyLabels.map((label) => `<span class="school-editorialKey">${escapeHtml(label)}</span>`).join('')}
          </div>

          <div class="school-editorialFacts">
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.tags.architecture', 'Arquitectura'))}</span>
              <span class="school-editorialFactValue">${escapeHtml(uiText('overview.tags.facets', '6 facetas combinables'))}</span>
            </div>
            <div class="school-editorialFact">
              <span class="school-editorialFactLabel">${escapeHtml(uiText('overview.tags.currentSelection', 'Selección actual'))}</span>
              <span class="school-editorialFactValue">${escapeHtml(activeFilters
                ? uiPlural('overview.tags.active', activeFilters, '1 tag activo', '{count} tags activos', { count: activeFilters })
                : uiText('overview.tags.fullLibrary', 'Biblioteca completa'))}</span>
            </div>
          </div>
          <div class="school-editorialCta">${escapeHtml(uiText('overview.tags.cta', 'Combina filtros a la izquierda y elige un modelo para abrir su ficha editorial.'))}</div>
        </div>
      </div>

      <section class="school-editorialBody tags-editorialBody">
        <div class="school-editorialSectionHead">
          <div>
            <p class="school-editorialSectionKicker">${escapeHtml(uiText('overview.tags.classificationSystem', 'Sistema de clasificación'))}</p>
            <h2 class="school-editorialSectionTitle">${escapeHtml(uiText('overview.tags.entryPoints', 'Seis puertas de entrada'))}</h2>
          </div>
        </div>

        <div class="tags-editorialFacets">
          ${TAG_FACETS.map((facet, index) => {
            const valueCount = (TAG_VALUES_BY_FACET.get(facet.id) || []).length;
            return `
              <article class="tags-editorialFacet">
                <span class="tags-editorialFacetNum">${String(index + 1).padStart(2, '0')}</span>
                <h3 class="tags-editorialFacetTitle">${escapeHtml(uiText(`taxonomy.tagFacet.${facet.id}`, facet.label))}</h3>
                <p class="tags-editorialFacetText">${escapeHtml(facetCopy[facet.id] || '')}</p>
                <span class="tags-editorialFacetMeta">${escapeHtml(valueCount
                  ? uiPlural('overview.tags.category', valueCount, '1 categoría', '{count} categorías', { count: valueCount })
                  : uiText('overview.tags.curatedVocabulary', 'Vocabulario curado'))}</span>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    </article>
  `;
}

function disposeNetworkGraph(){
  if (NETWORK_STATE.sim){
    try{ NETWORK_STATE.sim.stop(); }catch(e){}
    NETWORK_STATE.sim = null;
  }
  if (NETWORK_STATE.resizeHandler){
    window.removeEventListener('resize', NETWORK_STATE.resizeHandler);
    NETWORK_STATE.resizeHandler = null;
  }
  disposeNetwork3DView();
}

function getNetworkSchoolList(){
  return uniq(
    getAllModelsPool()
      .filter(m => m && isTherapyModel(m) && !isMarcoModel(m) && m.id && m.label)
      .map(m => String(m.grupo || 'Otros'))
      .filter(Boolean)
  );
}

function ensureNetworkSchoolFilters(){
  const schools = getNetworkSchoolList();
  const active = NETWORK_FILTER_STATE.activeSchools;
  const known = NETWORK_FILTER_STATE.knownSchools;

  if (!NETWORK_FILTER_STATE.schoolFiltersInitialized){
    schools.forEach((s) => active.add(s));
    NETWORK_FILTER_STATE.schoolFiltersInitialized = true;
  }else{
    // Los grupos que llegan después de la carga inicial empiezan visibles, sin
    // reactivar los que la persona ya ha apagado deliberadamente.
    schools.forEach((s) => {
      if (!known.has(s)) active.add(s);
    });
  }

  for (const s of [...active]){
    if (!schools.includes(s)) active.delete(s);
  }
  known.clear();
  schools.forEach((s) => known.add(s));
  return schools;
}

function getNetworkFilterGroups(){
  const groups = ensureNetworkSchoolFilters();
  return {
    schools: groups.filter((group) => !collectionDefinitionForSchool(group)),
    collections: groups.filter((group) => !!collectionDefinitionForSchool(group))
  };
}

function updateNetworkLegendUi(){
  const legend = document.querySelector('.networkLegend');
  if (!legend) return;
  const active = NETWORK_FILTER_STATE.activeSchools;
  const grouped = getNetworkFilterGroups();
  const allSchools = [...grouped.schools, ...grouped.collections];
  legend.querySelectorAll('.chip[data-school]').forEach((chip) => {
    const school = String(chip.getAttribute('data-school') || '');
    const on = active.has(school);
    chip.classList.toggle('is-on', on);
    chip.classList.toggle('is-off', !on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  const resetBtn = legend.querySelector('.chip.reset');
  if (resetBtn){
    const allOn = allSchools.length > 0 && active.size === allSchools.length;
    resetBtn.classList.toggle('is-off', allOn);
    resetBtn.classList.toggle('is-on', !allOn);
  }

  legend.querySelectorAll('[data-network-filter-scope]').forEach((button) => {
    const scope = String(button.getAttribute('data-network-filter-scope') || '');
    const values = grouped[scope] || [];
    const enabled = values.filter((value) => active.has(value)).length;
    const allOn = values.length > 0 && enabled === values.length;
    button.textContent = allOn
      ? uiText('network.hideAll', 'Ocultar todas')
      : uiText('network.showAll', 'Mostrar todas');
    button.setAttribute('aria-pressed', allOn ? 'true' : 'false');
  });

  legend.querySelectorAll('[data-network-filter-count]').forEach((counter) => {
    const scope = String(counter.getAttribute('data-network-filter-count') || '');
    const values = grouped[scope] || [];
    const enabled = values.filter((value) => active.has(value)).length;
    counter.textContent = `${enabled}/${values.length}`;
  });
}

function bindNetworkLegendHandlers(){
  const legend = document.querySelector('.networkLegend');
  if (!legend || legend.__bound) return;
  legend.__bound = true;

  const showOnlySchoolOrRestoreAll = (school) => {
    const active = NETWORK_FILTER_STATE.activeSchools;
    const restoreAll = active.size === 1 && active.has(school);
    active.clear();
    if (restoreAll) getNetworkSchoolList().forEach((value) => active.add(value));
    else active.add(school);
  };
  const refreshSchoolSelection = () => {
    updateNetworkLegendUi();
    renderNetworkGraphLazy();
  };

  legend.addEventListener('click', (evt) => {
    const chip = evt.target.closest('.chip[data-school]');
    if (!chip) return;

    const school = String(chip.getAttribute('data-school') || '');
    if (!school) return;

    const active = NETWORK_FILTER_STATE.activeSchools;
    const onlyThis = evt.ctrlKey || evt.metaKey;

    if (onlyThis){
      showOnlySchoolOrRestoreAll(school);
    }else{
      if (active.has(school)){
        active.delete(school);
      }else{
        active.add(school);
      }
    }

    refreshSchoolSelection();
  });

  legend.addEventListener('dblclick', (evt) => {
    if (evt.ctrlKey || evt.metaKey) return;
    const chip = evt.target.closest('.chip[data-school]');
    if (!chip) return;
    const school = String(chip.getAttribute('data-school') || '');
    if (!school) return;
    evt.preventDefault();
    showOnlySchoolOrRestoreAll(school);
    refreshSchoolSelection();
  });

  legend.addEventListener('click', (evt) => {
    const scopeButton = evt.target.closest('[data-network-filter-scope]');
    if (!scopeButton) return;
    const scope = String(scopeButton.getAttribute('data-network-filter-scope') || '');
    const values = getNetworkFilterGroups()[scope] || [];
    const active = NETWORK_FILTER_STATE.activeSchools;
    const allOn = values.length > 0 && values.every((value) => active.has(value));
    values.forEach((value) => allOn ? active.delete(value) : active.add(value));
    updateNetworkLegendUi();
    renderNetworkGraphLazy();
  });

  legend.addEventListener('click', (evt) => {
    const reset = evt.target.closest('.chip.reset');
    if (!reset) return;
    const schools = getNetworkSchoolList();
    const active = NETWORK_FILTER_STATE.activeSchools;
    active.clear();
    schools.forEach((s) => active.add(s));
    updateNetworkLegendUi();
    renderNetworkGraphLazy();
  });
}

function buildNetworkOverviewHtml(){
  const grouped = getNetworkFilterGroups();
  const accessLocked = !hasNetworkGraphAccess();
  const renderFilterChips = (groups, kind) => groups.map((s) => {
    const c = colorForSchoolLabel(s);
    const on = NETWORK_FILTER_STATE.activeSchools.has(s);
    const label = navigationGroupDisplayLabel(s);
    const noun = kind === 'collections' ? uiText('group.collection', 'Colección') : uiText('group.school', 'Escuela');
    return `<button type="button" class="chip ${on ? 'is-on' : 'is-off'}" data-school="${escapeHtml(s)}" data-tooltip="${escapeHtml(label)}" aria-label="${escapeHtml(`${noun}: ${label}`)}" aria-pressed="${on ? 'true' : 'false'}" style="--filter-color:${escapeHtml(c)}"><span class="dot" aria-hidden="true" style="background:${escapeHtml(c)}"></span></button>`;
  }).join('');
  const activeMode = String(NETWORK_FILTER_STATE.profileMode || 'process');
  const modeButtons = [
    { id:'process', label:uiText('network.processes', 'Procesos'), desc:uiText('network.processesDescription', 'Afinidad por procesos de cambio') },
    { id:'dimension', label:uiText('network.dimensions', 'Dimensiones'), desc:uiText('network.dimensionsDescription', 'Afinidad por dimensiones psicológicas') }
  ].map((mode) => `
    <button type="button" class="networkModeButton ${activeMode === mode.id ? 'is-active' : ''}" data-network-mode-control="${mode.id}" aria-pressed="${activeMode === mode.id ? 'true' : 'false'}">
      <span>${escapeHtml(mode.label)}</span>
      <small>${escapeHtml(mode.desc)}</small>
    </button>
  `).join('');
  const filterGroup = (scope, title, groups) => `
    <section class="networkFilterGroup networkFilterGroup-${scope}" role="group" aria-label="${escapeHtml(title)}">
      <div class="networkFilterChips">${renderFilterChips(groups, scope)}</div>
    </section>`;

  return `
    <div class="networkView">
      <div class="networkHeader">
        <div class="networkHeaderTop">
          <div class="networkHeading">
            <span class="networkEyebrow">${escapeHtml(uiText('library.group.network', 'Red de afinidades'))}</span>
            <h2 class="networkTitle">${escapeHtml(uiText('network.compareTitle', 'Cartografía del cambio'))}</h2>
            <p class="networkSub">${escapeHtml(uiText('network.compareIntro', 'Activa escuelas y colecciones para descubrir proximidades, contrastes y territorios compartidos.'))}</p>
          </div>
          <div class="networkModeSwitch" role="group" aria-label="${escapeHtml(uiText('network.graphMode', 'Modo del grafo'))}">${modeButtons}</div>
        </div>
        <div class="networkLegend">
          ${filterGroup('schools', uiText('library.group.school', 'Escuelas'), grouped.schools)}
          ${filterGroup('collections', uiText('library.group.collection', 'Colecciones'), grouped.collections)}
        </div>
      </div>
      <div class="networkCanvas ${accessLocked ? 'is-access-preview' : ''}" id="networkCanvas">
        <svg id="networkSvg" aria-label="${escapeHtml(uiText('network.modelsGraph', 'Red de modelos'))}"></svg>
        <div class="networkThreeMount" id="networkThreeMount" hidden></div>
        <div class="networkLoading" id="networkLoading" aria-live="polite" aria-hidden="true">
          <div class="networkLoadingCard">
            <span class="networkLoadingEyebrow">${escapeHtml(uiText('library.group.network', 'Vista red'))}</span>
            <p class="networkLoadingTitle">${escapeHtml(uiText('network.loadingNodes', 'Cargando nodos'))}<span class="networkLoadingDots" aria-hidden="true"><span></span><span></span><span></span></span></p>
            <span class="networkLoadingRule" aria-hidden="true"></span>
          </div>
        </div>
        <div class="networkTooltip" id="networkTooltip"></div>
        <div class="networkEmpty" id="networkEmpty" hidden role="status">
          <span class="networkEmptyMark" aria-hidden="true"></span>
          <strong>${escapeHtml(uiText('network.emptyTitle', 'No hay grupos activos'))}</strong>
          <p>${escapeHtml(uiText('network.emptyText', 'Activa al menos una escuela o colección para volver a dibujar la red.'))}</p>
        </div>
        ${accessLocked ? `
          <div class="networkAccessOverlay">
            <div class="networkAccessCard">
              <button class="mp-publicSubscribeBtn" type="button" data-action="subscribe-network-graph">${escapeHtml(uiText('network.subscribe', 'Suscribirse'))}</button>
              <div class="networkAccessText">
                ${escapeHtml(uiText('network.subscriptionExplanation', 'para explorar los grafos interactivos de procesos y dimensiones, filtrar escuelas y comparar afinidades entre modelos.'))}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
</div>
`;
}

function normSearchText(s){
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .trim();
}

function effectiveImportanceLevel(m){
  const raw = Number(m?.importance);
  if (!Number.isFinite(raw)) return null;
  return Math.max(0, Math.min(4, raw));
}

function modelVectorForNetwork(m){
  const mode = String(NETWORK_FILTER_STATE.profileMode || 'mixed');
  const v = [];

  if (mode === 'process' || mode === 'mixed'){
    for (const p of PROCESS_FILTERS){
      v.push(modelProcessLevelFour(m, p.id) / 4);
    }
  }

  if (mode === 'dimension' || mode === 'mixed'){
    for (const d of CHANGE_DIMS){
      v.push(modelDimensionSharePct(m, d.id) / 100);
    }
  }

  if (mode === 'mixed'){
    const imp = effectiveImportanceLevel(m);
    v.push(((imp === null ? 2 : imp) / 4));
  }

  return v;
}

function modelHasNetworkProfileData(model, mode){
  const key = String(mode || NETWORK_FILTER_STATE.profileMode || 'process');
  if (key === 'dimension') return modelHasDimensionData(model);
  if (key === '3d' || key === 'process') return modelHasProcessData(model);
  return modelHasProcessData(model) || modelHasDimensionData(model);
}

function dominantProcessForModel(m){
  let bestId = '';
  let bestScore = -1;
  for (const p of PROCESS_FILTERS){
    const s = modelProcessLevelFour(m, p.id);
    if (s > bestScore){
      bestScore = s;
      bestId = p.id;
    }
  }
  if (!(bestScore > 0)) return null;
  const def = PROCESS_FILTER_MAP.get(bestId);
  if (!def) return null;
  return {
    key: def.id,
    label: `${def.id} · ${def.label}`,
    color: PROCESS_ZONE_COLORS[def.id] || '#A9B1C5'
  };
}

function processScoresForModel(m){
  const out = {};
  for (const p of PROCESS_FILTERS){
    out[p.id] = modelProcessLevelFour(m, p.id);
  }
  return out;
}

function dominantDimensionForModel(m){
  if (!m || typeof m !== 'object') return null;
  const dimMap = getModelDimensionMap(m);
  const total = CHANGE_DIMS.reduce((acc, d) => acc + readDimensionValue(dimMap, [d.id]), 0);
  if (!(total > 0)) return null;

  let best = null;
  let bestShare = -1;
  for (const d of CHANGE_DIMS){
    const own = readDimensionValue(dimMap, [d.id]);
    const share = (own / total) * 100;
    if (share > bestShare){
      bestShare = share;
      best = d;
    }
  }
  if (!best) return null;
  return {
    key: best.id,
    label: best.label,
    color: CHANGE_DIM_COLORS_BY_ID[best.id] || '#A9B1C5'
  };
}

function dimensionSharesForModel(m){
  const out = {};
  for (const d of CHANGE_DIMS){
    out[d.id] = modelDimensionSharePct(m, d.id);
  }
  return out;
}

function shortZoneLabel(mode, key, label){
  if (mode === 'process'){
    return String(key || '').trim().toUpperCase() || 'PROC';
  }

  if (mode === 'dimension'){
    const byId = {
      cognicion: 'COG',
      afecto: 'AFE',
      atencion: 'ATN',
      self: 'SELF',
      motivacion: 'MOT',
      conducta_manifiesta: 'COND',
      biofisiologico: 'BIO',
      sociocultural: 'SOC'
    };
    if (byId[key]) return byId[key];
  }

  const txt = String(label || key || '')
    .replace(/^\d+\.\s*/, '')
    .trim();
  if (!txt) return 'ZONA';

  const first = txt.split(/\s+/)[0] || txt;
  return first.slice(0, 4).toUpperCase();
}

function getNetworkZoneDefinitions(mode){
  if (mode === 'process'){
    return PROCESS_FILTERS.map((p) => ({
      key: String(p.id || ''),
      label: `${p.id} · ${p.label}`,
      color: PROCESS_ZONE_COLORS[p.id] || '#A9B1C5'
    }));
  }

  if (mode === 'dimension'){
    return CHANGE_DIMS.map((d) => ({
      key: String(d.id || ''),
      label: String(d.label || d.id || 'Dimensión'),
      color: CHANGE_DIM_COLORS_BY_ID[d.id] || '#A9B1C5'
    }));
  }

  return [];
}

function createZoneRepelForce(zoneAnchors, mode){
  const anchors = [...(zoneAnchors?.entries?.() || [])].map(([key, pos]) => ({
    key,
    x: Number(pos?.x) || 0,
    y: Number(pos?.y) || 0
  }));
  let nodes = [];

  const weightFor = (node, key) => {
    if (mode === 'process'){
      const v = Number(node?.processScores?.[key] || 0);
      return Math.max(0, Math.min(1, v / 4));
    }
    if (mode === 'dimension'){
      const v = Number(node?.dimensionShares?.[key] || 0);
      return Math.max(0, Math.min(1, v / 100));
    }
    return 0.5;
  };

  // Empuja lejos de zonas con bajo peso cuando el nodo entra en su radio de influencia.
  const force = (alpha) => {
    if (!anchors.length || !nodes.length) return;
    const influenceR = 310;
    const baseK = 0.30;

    for (const n of nodes){
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      for (const a of anchors){
        const w = weightFor(n, a.key);
        const low = 1 - w;
        if (low <= 0.08) continue;

        const dx = (n.x - a.x);
        const dy = (n.y - a.y);
        const d2 = (dx * dx) + (dy * dy) + 0.0001;
        const d = Math.sqrt(d2);
        if (d > influenceR) continue;

        const near = (influenceR - d) / influenceR; // 0..1 (más alto = más cerca)
        const mag = alpha * baseK * low * low * near;
        n.vx += (dx / d) * mag;
        n.vy += (dy / d) * mag;
      }
    }
  };

  force.initialize = (_nodes) => { nodes = _nodes || []; };
  return force;
}

function cosineSimilarity(a, b){
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++){
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!(na > 0) || !(nb > 0)) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function stableNetworkHash(value){
  let h = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++){
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function network3DProcessSnapshot(model){
  const p = processScoresForModel(model);
  return {
    N: Number(p.N || 0),
    I: Number(p.I || 0),
    RI: Number(p.RI || 0),
    AG: Number(p.AG || 0),
    RF: Number(p.RF || 0),
    AP: Number(p.AP || 0),
    RE: Number(p.RE || 0),
    R: Number(p.R || 0)
  };
}

function raw3DAxesForModel(model){
  const p = network3DProcessSnapshot(model);
  const total =
    p.RF + p.RE + p.AP + p.RI +
    p.N + p.I + p.AG + p.R;
  const share = total > 0
    ? {
        RF: p.RF / total,
        RE: p.RE / total,
        AP: p.AP / total,
        RI: p.RI / total,
        N: p.N / total,
        I: p.I / total,
        AG: p.AG / total,
        R: p.R / total
      }
    : { RF:0, RE:0, AP:0, RI:0, N:0, I:0, AG:0, R:0 };

  // Ejes balanceados por polos teóricos.
  // Antes reutilizábamos N/I/RI en varios ejes con pesos asimétricos,
  // lo que sesgaba el espacio hacia una diagonal y dejaba cuadrantes casi vacíos.
  return {
    x: share.N - share.AG,
    y: (share.AP + share.RE + share.RF) - (share.N + share.I),
    z: share.R - (share.RI + share.I),
    processScores: p
  };
}

function isModelEligibleFor3D(model){
  return !!(
    model &&
    isModelVisibleInApp(model) &&
    !isMarcoModel(model) &&
    model.id &&
    model.label &&
    modelHasNetworkProfileData(model, '3d')
  );
}

function buildNetwork3DSignature(models){
  return models
    .map((m) => {
      const p = network3DProcessSnapshot(m);
      return [
        String(m.id || '').trim(),
        p.N, p.I, p.RI, p.AG, p.RF, p.AP, p.RE, p.R
      ].join(':');
    })
    .sort()
    .join('|');
}

function ensureNetwork3DLayoutCache(){
  const pool = getAllModelsPool()
    .filter((m) => isModelEligibleFor3D(m))
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), MODELOS_LOCALE));

  const signature = buildNetwork3DSignature(pool);
  const cache = NETWORK_GLOBAL_LAYOUT_CACHE.threeD;
  if (cache.signature === signature && cache.positionsById?.size){
    return cache;
  }

  const rawRows = pool.map((m) => {
    const raw = raw3DAxesForModel(m);
    return { model:m, id:String(m.id), rawX:raw.x, rawY:raw.y, rawZ:raw.z, processScores:raw.processScores };
  });

  const axes = ['rawX', 'rawY', 'rawZ'];
  const stats = {};
  for (const key of axes){
    const vals = rawRows.map((row) => Number(row[key]) || 0);
    const mean = vals.length ? (vals.reduce((acc, v) => acc + v, 0) / vals.length) : 0;
    const centeredAbs = vals
      .map((v) => Math.abs(v - mean))
      .sort((a, b) => a - b);
    const p85Index = centeredAbs.length
      ? Math.min(centeredAbs.length - 1, Math.floor(centeredAbs.length * 0.85))
      : 0;
    let spread = centeredAbs[p85Index] || 0;
    if (!(spread > 0)){
      spread = centeredAbs[centeredAbs.length - 1] || 1;
    }
    stats[key] = { mean, spread: spread || 1 };
  }

  const scale = 120;
  const positionsById = new Map();
  const nodeMetaById = new Map();
  const expandSigned = (value) => {
    const n = Number(value || 0);
    if (!n) return 0;
    return Math.sign(n) * Math.pow(Math.min(1.6, Math.abs(n)), 0.82);
  };
  rawRows.forEach((row) => {
    const seed = stableNetworkHash(row.id);
    const angleA = ((seed % 360) / 360) * Math.PI * 2;
    const angleB = ((((seed >>> 9) % 360) / 360) * Math.PI * 2);
    const jitter = 3.5 + ((seed % 7) * 0.55);
    const x = (expandSigned((row.rawX - stats.rawX.mean) / stats.rawX.spread) * scale) + (Math.cos(angleA) * jitter);
    const y = (expandSigned((row.rawY - stats.rawY.mean) / stats.rawY.spread) * scale) + (Math.sin(angleA) * jitter);
    const z = (expandSigned((row.rawZ - stats.rawZ.mean) / stats.rawZ.spread) * scale) + (Math.sin(angleB) * jitter);
    positionsById.set(row.id, { x, y, z });
    nodeMetaById.set(row.id, {
      id: row.id,
      label: String(row.model.label || 'Modelo'),
      autores: String(row.model.autores || ''),
      grupo: String(row.model.grupo || 'Otros'),
      year: Number(row.model.year || 0) || 0,
      importance: effectiveImportanceLevel(row.model),
      rawX: row.rawX,
      rawY: row.rawY,
      rawZ: row.rawZ,
      processScores: row.processScores,
      modelRef: row.model
    });
  });

  cache.signature = signature;
  cache.positionsById = positionsById;
  cache.nodeMetaById = nodeMetaById;
  cache.extents = { x:scale, y:scale, z:scale };
  cache.scale = scale;
  return cache;
}

function getNearestNeighbors3D(nodeId, k = 5, visibleIds = null){
  const cache = ensureNetwork3DLayoutCache();
  const origin = cache.positionsById.get(String(nodeId || ''));
  if (!origin) return [];

  const allow = visibleIds instanceof Set ? visibleIds : null;
  const rows = [];
  for (const [otherId, pos] of cache.positionsById.entries()){
    if (otherId === String(nodeId || '')) continue;
    if (allow && !allow.has(otherId)) continue;
    const dx = Number(pos.x || 0) - Number(origin.x || 0);
    const dy = Number(pos.y || 0) - Number(origin.y || 0);
    const dz = Number(pos.z || 0) - Number(origin.z || 0);
    const distance = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
    rows.push({ id:otherId, distance, position:pos, meta:cache.nodeMetaById.get(otherId) || null });
  }
  rows.sort((a, b) => a.distance - b.distance);
  return rows.slice(0, Math.max(0, Number(k) || 0));
}

function buildNetwork3DData(){
  const cache = ensureNetwork3DLayoutCache();
  const activeSchools = NETWORK_FILTER_STATE.activeSchools;
  const query = normSearchText(NETWORK_FILTER_STATE.query || '');
  const visibleNodes = [];

  for (const [id, pos] of cache.positionsById.entries()){
    const meta = cache.nodeMetaById.get(id);
    if (!meta) continue;
    if (NETWORK_FILTER_STATE.schoolFiltersInitialized && !activeSchools.has(String(meta.grupo || 'Otros'))) continue;
    if (query){
      const inLabel = normSearchText(meta.label).includes(query);
      const inAuthor = normSearchText(meta.autores || '').includes(query);
      if (!inLabel && !inAuthor) continue;
    }
    visibleNodes.push({
      ...meta,
      x: Number(pos.x || 0),
      y: Number(pos.y || 0),
      z: Number(pos.z || 0)
    });
  }

  return { cache, nodes:visibleNodes };
}

function setNetworkTooltipHtml(html, evt, wrap){
  const tooltip = document.getElementById('networkTooltip');
  if (!tooltip || !wrap) return;
  tooltip.innerHTML = html;
  const r = wrap.getBoundingClientRect();
  tooltip.style.left = `${evt.clientX - r.left + 12}px`;
  tooltip.style.top = `${evt.clientY - r.top + 12}px`;
  tooltip.classList.add('is-on');
}

function clearNetworkTooltip(){
  const tooltip = document.getElementById('networkTooltip');
  if (!tooltip) return;
  tooltip.classList.remove('is-on');
}

function makeNetwork3DTextSprite(text){
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(10,16,24,0.78)';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  const x = 10;
  const y = 14;
  const w = canvas.width - 20;
  const h = canvas.height - 28;
  const r = 28;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f4f8ff';
  ctx.font = '700 36px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text || ''), canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(54, 13.5, 1);
  return sprite;
}

function addNetwork3DSceneGuides(scene, range){
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xdfe7f4,
    transparent: true,
    opacity: 0.42
  });
  const pts = [
    new THREE.Vector3(-range, 0, 0), new THREE.Vector3(range, 0, 0),
    new THREE.Vector3(0, -range, 0), new THREE.Vector3(0, range, 0),
    new THREE.Vector3(0, 0, -range), new THREE.Vector3(0, 0, range)
  ];
  const axes = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.LineSegments(axes, lineMaterial));

  const gridSize = range * 2.1;
  const gridDivisions = 8;
  const grids = [
    new THREE.GridHelper(gridSize, gridDivisions, 0xffffff, 0xffffff),
    new THREE.GridHelper(gridSize, gridDivisions, 0xffffff, 0xffffff),
    new THREE.GridHelper(gridSize, gridDivisions, 0xffffff, 0xffffff)
  ];
  grids[0].material.opacity = 0.08;
  grids[0].material.transparent = true;
  grids[1].rotation.x = Math.PI / 2;
  grids[1].material.opacity = 0.05;
  grids[1].material.transparent = true;
  grids[2].rotation.z = Math.PI / 2;
  grids[2].material.opacity = 0.04;
  grids[2].material.transparent = true;
  grids.forEach((g) => scene.add(g));

  const labels = [
    { text:'Significado', pos:[range + 22, 0, 0] },
    { text:'Acción', pos:[-range - 22, 0, 0] },
    { text:'Experiencia emocional', pos:[0, range + 18, 0] },
    { text:'Estructuración cognitiva', pos:[0, -range - 18, 0] },
    { text:'Relacional', pos:[0, 0, range + 18] },
    { text:'Intrapersonal', pos:[0, 0, -range - 18] }
  ];
  labels.forEach((row) => {
    const sprite = makeNetwork3DTextSprite(row.text);
    if (!sprite) return;
    sprite.position.set(row.pos[0], row.pos[1], row.pos[2]);
    scene.add(sprite);
  });
}

function updateNetwork3DSelectionState(){
  const state = NETWORK_STATE.threeD;
  if (!state) return;

  const selectedId = String(NETWORK_FILTER_STATE.selectedNodeId || '');
  if (selectedId && !state.visibleIds.has(selectedId)){
    NETWORK_FILTER_STATE.selectedNodeId = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    renderNetworkSelectionCard(null);
  }

  const currentSelected = String(NETWORK_FILTER_STATE.selectedNodeId || '');
  const neighbors = currentSelected
    ? getNearestNeighbors3D(currentSelected, 5, state.visibleIds)
    : [];
  state.neighborIds = new Set(neighbors.map((n) => String(n.id)));

  for (const [id, mesh] of state.meshById.entries()){
    const material = mesh.material;
    if (!material) continue;
    const visible = state.visibleIds.has(id);
    mesh.visible = visible;
    if (!visible) continue;

    const baseR = Number(mesh.userData.baseRadius || 4.5);
    const isSel = currentSelected && id === currentSelected;
    const isNeighbor = !isSel && state.neighborIds.has(id);
    const faded = !!currentSelected && !isSel && !isNeighbor;

    const scaleFactor = isSel ? 1.42 : (isNeighbor ? 1.18 : 1);
    mesh.scale.setScalar(baseR * scaleFactor);
    material.transparent = true;
    material.opacity = faded ? 0.18 : (isNeighbor ? 0.95 : 0.88);
    material.emissive = new THREE.Color(isSel ? '#ffffff' : (isNeighbor ? '#dfefff' : '#000000'));
    material.emissiveIntensity = isSel ? 0.55 : (isNeighbor ? 0.24 : 0.04);
  }
}

function syncNetwork3DSceneData(state, networkData){
  state.visibleIds = new Set(networkData.nodes.map((n) => String(n.id)));

  for (const [id, mesh] of state.meshById.entries()){
    mesh.visible = state.visibleIds.has(id);
  }

  if (NETWORK_FILTER_STATE.selectedZoneKey){
    NETWORK_FILTER_STATE.selectedZoneKey = '';
  }

  updateNetwork3DSelectionState();
}

function setNetwork3DOrthoView(kind){
  const state = NETWORK_STATE.threeD;
  if (!state) return;
  const dist = state.range * 2.55;
  const target = state.controls?.target || new THREE.Vector3(0, 0, 0);

  if (kind === 'front'){
    state.camera.position.set(target.x, target.y, dist);
  }else if (kind === 'side'){
    state.camera.position.set(dist, target.y, target.z);
  }else if (kind === 'top'){
    state.camera.position.set(target.x, dist, target.z + 0.001);
  }

  state.camera.lookAt(target);
  state.controls?.update();
}

function disposeNetwork3DView(){
  const state = NETWORK_STATE.threeD;
  if (!state) return;

  clearNetworkTooltip();
  if (state.frameId){
    cancelAnimationFrame(state.frameId);
  }
  if (state.resizeHandler){
    window.removeEventListener('resize', state.resizeHandler);
  }
  if (state.pointerMoveHandler && state.renderer?.domElement){
    state.renderer.domElement.removeEventListener('pointermove', state.pointerMoveHandler);
  }
  if (state.pointerLeaveHandler && state.renderer?.domElement){
    state.renderer.domElement.removeEventListener('pointerleave', state.pointerLeaveHandler);
  }
  if (state.clickHandler && state.renderer?.domElement){
    state.renderer.domElement.removeEventListener('click', state.clickHandler);
  }
  try{ state.controls?.dispose?.(); }catch(e){}
  for (const mesh of state.meshById?.values?.() || []){
    try{ mesh.geometry?.dispose?.(); }catch(e){}
    try{ mesh.material?.dispose?.(); }catch(e){}
  }
  state.scene?.traverse?.((obj) => {
    if (obj?.material?.map){
      try{ obj.material.map.dispose(); }catch(e){}
    }
    if (obj?.material && obj.type === 'Sprite'){
      try{ obj.material.dispose(); }catch(e){}
    }
    if (obj?.geometry && obj.type !== 'Mesh'){
      try{ obj.geometry.dispose(); }catch(e){}
    }
  });
  try{ state.renderer?.dispose?.(); }catch(e){}
  if (state.mountEl){
    state.mountEl.innerHTML = '';
    state.mountEl.hidden = true;
  }
  NETWORK_STATE.threeD = null;
}

async function initNetwork3DView(){
  if (!THREE_READY_PROMISE){
    THREE_READY_PROMISE = ensureThreeJs().catch(() => false);
  }
  if (!ORBIT_READY_PROMISE){
    ORBIT_READY_PROMISE = ensureOrbitControls().catch(() => false);
  }
  const threeOk = await THREE_READY_PROMISE;
  const orbitOk = await ORBIT_READY_PROMISE;
  if (!threeOk || !orbitOk){
    setNetworkLoading(false);
    return null;
  }

  const wrap = document.getElementById('networkCanvas');
  const svgEl = document.getElementById('networkSvg');
  const mountEl = document.getElementById('networkThreeMount');
  if (!wrap || !mountEl) return null;

  const existing = NETWORK_STATE.threeD;
  const cache = ensureNetwork3DLayoutCache();
  if (existing && existing.signature === cache.signature && existing.mountEl === mountEl){
    existing.mountEl.hidden = false;
    if (svgEl) svgEl.style.display = 'none';
    return existing;
  }

  disposeNetwork3DView();
  if (svgEl) svgEl.style.display = 'none';
  mountEl.hidden = false;

  const host = document.createElement('div');
  host.className = 'networkThreeCanvas';
  mountEl.innerHTML = '';
  mountEl.appendChild(host);

  const hud = document.createElement('div');
  hud.className = 'network3dHud';
  hud.innerHTML = `
    <div class="network3dBadge">
      <strong>Espacio 3D</strong>
      X: Significado ↔ Acción<br>
      Y: Experiencia ↔ Estructuración<br>
      Z: Relacional ↔ Intrapersonal
    </div>
    <div class="network3dCameraBar">
      <button type="button" class="network3dViewBtn" data-view="front">Frontal</button>
      <button type="button" class="network3dViewBtn" data-view="side">Lateral</button>
      <button type="button" class="network3dViewBtn" data-view="top">Superior</button>
    </div>
  `;
  mountEl.appendChild(hud);

  const size = () => {
    const r = wrap.getBoundingClientRect();
    return { w:Math.max(220, r.width), h:Math.max(240, r.height) };
  };
  const s = size();
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(s.w, s.h, false);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, s.w / s.h, 1, 1800);
  const range = Math.max(140, Number(cache.scale || 120) * 1.25);
  camera.position.set(range * 1.45, range * 1.1, range * 1.55);

  scene.add(new THREE.AmbientLight(0xffffff, 0.88));
  const key = new THREE.DirectionalLight(0xffffff, 0.74);
  key.position.set(range * 0.9, range * 1.2, range * 1.1);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x91c3ff, 0.22);
  rim.position.set(-range, range * 0.25, -range);
  scene.add(rim);

  addNetwork3DSceneGuides(scene, range);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = range * 0.8;
  controls.maxDistance = range * 4.4;
  controls.target.set(0, 0, 0);
  controls.update();

  const geometry = new THREE.SphereGeometry(1, 18, 18);
  const meshById = new Map();
  for (const [id, pos] of cache.positionsById.entries()){
    const meta = cache.nodeMetaById.get(id);
    if (!meta) continue;
    const color = colorForSchoolLabel(meta.grupo);
    const baseRadius = 3.6 + ((Number(meta.importance || 2) || 2) * 0.75);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: 0x000000,
      emissiveIntensity: 0.04,
      roughness: 0.38,
      metalness: 0.06,
      transparent: true,
      opacity: 0.88
    });
    const mesh = new THREE.Mesh(geometry.clone(), material);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.scale.setScalar(baseRadius);
    mesh.userData = { id, baseRadius, color, meta };
    scene.add(mesh);
    meshById.set(id, mesh);
  }

  const state = {
    signature: cache.signature,
    cache,
    mountEl,
    host,
    hud,
    renderer,
    scene,
    camera,
    controls,
    meshById,
    hoveredId: '',
    neighborIds: new Set(),
    visibleIds: new Set(),
    range,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    frameId: 0,
    resizeHandler: null,
    pointerMoveHandler: null,
    pointerLeaveHandler: null,
    clickHandler: null
  };

  hud.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setNetwork3DOrthoView(btn.getAttribute('data-view') || 'front'));
  });

  state.pointerMoveHandler = (evt) => {
    const r = renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((evt.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    state.pointer.y = -(((evt.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
    state.raycaster.setFromCamera(state.pointer, camera);
    const targets = [...state.meshById.values()].filter((mesh) => mesh.visible);
    const hit = state.raycaster.intersectObjects(targets, false)[0];
    if (!hit?.object){
      state.hoveredId = '';
      clearNetworkTooltip();
      return;
    }

    const hoveredId = String(hit.object.userData?.id || '');
    state.hoveredId = hoveredId;
    const meta = state.cache.nodeMetaById.get(hoveredId);
    if (!meta) return;
    const pos = state.cache.positionsById.get(hoveredId) || { x:0, y:0, z:0 };
    setNetworkTooltipHtml(
      `<strong>${escapeHtml(meta.label)}</strong><br>${escapeHtml(meta.autores || '—')}<br>${escapeHtml(schoolDisplayLabel(meta.grupo))}${meta.year ? ` · ${meta.year}` : ''}<br>X ${Number(pos.x || 0).toFixed(1)} · Y ${Number(pos.y || 0).toFixed(1)} · Z ${Number(pos.z || 0).toFixed(1)}`,
      evt,
      wrap
    );
  };

  state.pointerLeaveHandler = () => {
    state.hoveredId = '';
    clearNetworkTooltip();
  };

  state.clickHandler = async () => {
    const clickedId = String(state.hoveredId || '');
    if (!clickedId){
      if (!NETWORK_FILTER_STATE.selectedNodeId) return;
      NETWORK_FILTER_STATE.selectedNodeId = '';
      hideNetworkMobileGraphButton();
      hideNetworkModelGraphPanel();
      renderNetworkSelectionCard(null);
      updateNetwork3DSelectionState();
      return;
    }

    NETWORK_FILTER_STATE.selectedZoneKey = '';
    NETWORK_FILTER_STATE.selectedNodeId = clickedId;
    updateNetwork3DSelectionState();

    const base = getAllModelsPool().find((m) => String(m?.id || '') === clickedId);
    if (!base) return;
    const full = await ensureModelFull(base).catch(() => base);
    if (String(NETWORK_FILTER_STATE.selectedNodeId || '') !== clickedId) return;
    const selectedModel = full || base;
    renderNetworkSelectionCard(selectedModel);
    if (isMobileViewport()){
      renderNetworkMobileGraphButton(selectedModel);
      hideNetworkModelGraphPanel();
    }else{
      hideNetworkMobileGraphButton();
      renderNetworkModelGraphPanel(selectedModel);
    }
  };

  renderer.domElement.addEventListener('pointermove', state.pointerMoveHandler, { passive:true });
  renderer.domElement.addEventListener('pointerleave', state.pointerLeaveHandler, { passive:true });
  renderer.domElement.addEventListener('click', state.clickHandler);

  state.resizeHandler = () => {
    if (groupingMode !== 'network' || String(NETWORK_FILTER_STATE.profileMode || '') !== '3d') return;
    const next = size();
    camera.aspect = next.w / next.h;
    camera.updateProjectionMatrix();
    renderer.setSize(next.w, next.h, false);
  };
  window.addEventListener('resize', state.resizeHandler, { passive:true });

  const tick = () => {
    state.frameId = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();

  NETWORK_STATE.threeD = state;
  return state;
}

async function renderNetwork3DView(){
  const { nodes } = buildNetwork3DData();
  const mountEl = document.getElementById('networkThreeMount');
  const svgEl = document.getElementById('networkSvg');
  if (svgEl) svgEl.style.display = 'none';
  if (mountEl) mountEl.hidden = false;

  const state = await initNetwork3DView();
  if (!state){
    setNetworkLoading(false);
    return;
  }

  syncNetwork3DSceneData(state, { nodes });

  if (!nodes.length){
    NETWORK_FILTER_STATE.selectedNodeId = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    renderNetworkSelectionCard(null);
  }

  requestAnimationFrame(() => setNetworkLoading(false));
}

function buildNetworkData(){
  const activeSchools = NETWORK_FILTER_STATE.activeSchools;
  const mode = String(NETWORK_FILTER_STATE.profileMode || 'mixed');
  const query = normSearchText(NETWORK_FILTER_STATE.query || '');
  const rawNodes = getAllModelsPool()
    .filter(m => m && isTherapyModel(m) && !isMarcoModel(m) && m.id && m.label)
    .filter(m => modelHasNetworkProfileData(m, mode))
    .filter(m => {
      const g = String(m.grupo || 'Otros');
      return !NETWORK_FILTER_STATE.schoolFiltersInitialized || activeSchools.has(g);
    })
    .filter((m) => {
      if (!query) return true;
      const inLabel = normSearchText(m.label).includes(query);
      const inAuthor = normSearchText(m.autores || '').includes(query);
      return inLabel || inAuthor;
    })
    .map((m) => ({
      ...(mode === 'process'
        ? (() => {
            const z = dominantProcessForModel(m);
            return {
              zoneKey: z?.key || '',
              zoneLabel: z?.label || '',
              zoneColor: z?.color || ''
            };
          })()
        : mode === 'dimension'
          ? (() => {
              const z = dominantDimensionForModel(m);
              return {
                zoneKey: z?.key || '',
                zoneLabel: z?.label || '',
                zoneColor: z?.color || ''
              };
            })()
          : { zoneKey:'', zoneLabel:'', zoneColor:'' }),
      id: String(m.id),
      label: String(m.label || '—'),
      autores: String(m.autores || ''),
      grupo: String(m.grupo || 'Otros'),
      year: Number(m.year || 0) || 0,
      importance: effectiveImportanceLevel(m),
      processScores: processScoresForModel(m),
      dimensionShares: dimensionSharesForModel(m),
      vector: modelVectorForNetwork(m)
    }));

  const edges = [];
  const perNode = new Map();
  for (let i = 0; i < rawNodes.length; i++){
    perNode.set(rawNodes[i].id, []);
  }

  for (let i = 0; i < rawNodes.length; i++){
    for (let j = i + 1; j < rawNodes.length; j++){
      const a = rawNodes[i];
      const b = rawNodes[j];
      const sim = cosineSimilarity(a.vector, b.vector);
      const delta = Number(NETWORK_FILTER_STATE.minSimDelta || 0) / 100;
      const minSimBase = 0.54;
      const minSim = Math.max(0.12, Math.min(0.92, minSimBase + delta));
      if (sim < minSim) continue;
      const e = { source: a.id, target: b.id, w: sim };
      edges.push(e);
      perNode.get(a.id).push(e);
      perNode.get(b.id).push(e);
    }
  }

  const maxPerNode = 4;
  const keep = new Set();
  for (const n of rawNodes){
    const top = (perNode.get(n.id) || [])
      .sort((x, y) => y.w - x.w)
      .slice(0, maxPerNode);
    for (const e of top){
      const key = (String(e.source) < String(e.target))
        ? `${e.source}__${e.target}`
        : `${e.target}__${e.source}`;
      keep.add(key);
    }
  }

  const filteredEdges = edges.filter((e) => {
    const key = (String(e.source) < String(e.target))
      ? `${e.source}__${e.target}`
      : `${e.target}__${e.source}`;
    return keep.has(key);
  });

  return { nodes: rawNodes, links: filteredEdges };
}

async function renderNetworkGraph(){
  const svgEl = document.getElementById('networkSvg');
  const wrap = document.getElementById('networkCanvas');
  const tooltip = document.getElementById('networkTooltip');
  if (!svgEl || !wrap){
    setNetworkLoading(false);
    return;
  }

  const threeMount = document.getElementById('networkThreeMount');
  const mode = String(NETWORK_FILTER_STATE.profileMode || 'mixed');
  if (mode === '3d'){
    await renderNetwork3DView();
    return;
  }

  const d3ok = await (D3_READY_PROMISE || ensureD3().catch(() => false));
  if (!d3ok){
    setNetworkLoading(false);
    return;
  }

  disposeNetworkGraph();
  svgEl.style.display = '';
  if (threeMount) threeMount.hidden = true;

  const { nodes, links } = buildNetworkData();
  const empty = document.getElementById('networkEmpty');
  if (!nodes.length){
    svgEl.innerHTML = '';
    if (empty) empty.hidden = false;
    setNetworkLoading(false);
    NETWORK_FILTER_STATE.selectedNodeId = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    renderNetworkSelectionCard(null);
    return;
  }
  if (empty) empty.hidden = true;

  const svg = d3.select(svgEl);
  const size = () => {
    const r = wrap.getBoundingClientRect();
    return { w: Math.max(220, r.width), h: Math.max(240, r.height) };
  };
  const s = size();
  svg.attr('viewBox', `0 0 ${s.w} ${s.h}`);
  svg.selectAll('*').remove();

  const cx = s.w / 2;
  const cy = s.h / 2;
  let zoneAnchors = null;
  let zoneMeta = new Map();
  let zoneRows = [];
  const layoutMin = Math.min(s.w, s.h);
  const zoneBaseR = Math.max(56, Math.min(112, layoutMin * 0.096));
  if (mode === 'process' || mode === 'dimension'){
    const zoneDefs = getNetworkZoneDefinitions(mode);
    const zoneKeys = zoneDefs.map((z) => z.key).filter(Boolean);
    const radius = Math.max(230, Math.min(s.w * 0.34, layoutMin * 0.68));
    zoneAnchors = new Map();
    for (const zone of zoneDefs){
      if (!zone || !zone.key) continue;
      zoneMeta.set(zone.key, {
        label: zone.label || zone.key,
        color: zone.color || '#A9B1C5'
      });
    }
    zoneKeys.forEach((k, i) => {
      const ang = ((Math.PI * 2) / Math.max(1, zoneKeys.length)) * i - (Math.PI / 2);
      zoneAnchors.set(k, {
        x: cx + Math.cos(ang) * radius,
        y: cy + Math.sin(ang) * radius
      });
    });
  }

  const gViewport = svg.append('g').attr('class', 'net-viewport');
  const gZones = gViewport.append('g').attr('class', 'net-zones');
  const gLinks = gViewport.append('g').attr('class', 'net-links');
  const gNodes = gViewport.append('g').attr('class', 'net-nodes');
  let zoneRingSel = null;

  if (zoneAnchors && zoneAnchors.size){
    const zoneCount = new Map();
    nodes.forEach((n) => {
      if (!n || !n.zoneKey) return;
      zoneCount.set(n.zoneKey, (zoneCount.get(n.zoneKey) || 0) + 1);
    });

    zoneRows = [...zoneAnchors.entries()].map(([key, pos]) => {
      const meta = zoneMeta.get(key) || { label:key, color:'#A9B1C5' };
      return {
        key,
        x: pos.x,
        y: pos.y,
        label: meta.label,
        short: shortZoneLabel(mode, key, meta.label),
        color: meta.color,
        count: zoneCount.get(key) || 0
      };
    });

    const zoneSel = gZones.selectAll('g.net-zone')
      .data(zoneRows, (d) => d.key)
      .enter()
      .append('g')
      .attr('class', 'net-zone');

    zoneRingSel = zoneSel.append('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', zoneBaseR)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.04)
      .attr('stroke', (d) => d.color)
      .attr('stroke-opacity', 0.34)
      .attr('stroke-width', 1.1);

    zoneSel.append('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 800)
      .attr('fill', 'rgba(231,237,245,.95)')
      .attr('style', 'letter-spacing:.25px')
      .attr('pointer-events', 'none')
      .each(function(d){
        const t = d3.select(this);
        t.text(null);
        t.append('tspan')
          .attr('x', d.x)
          .attr('dy', 0)
          .text(d.short);
        t.append('tspan')
          .attr('x', d.x)
          .attr('dy', 14)
          .attr('font-size', 10)
          .attr('font-weight', 700)
          .attr('fill', 'rgba(231,237,245,.72)')
          .text(String(d.count));
      });

    zoneSel
      .style('cursor', 'pointer')
      .on('mouseenter', (evt, d) => {
        if (!tooltip) return;
        tooltip.innerHTML = `<strong>${escapeHtml(d.label)}</strong><br>${escapeHtml(String(d.count))} ${escapeHtml(uiPlural('common.model', d.count, 'modelo', 'modelos'))}`;
        tooltip.classList.add('is-on');
      })
      .on('mousemove', (evt) => {
        if (!tooltip) return;
        const r = wrap.getBoundingClientRect();
        tooltip.style.left = `${evt.clientX - r.left + 12}px`;
        tooltip.style.top = `${evt.clientY - r.top + 12}px`;
      })
      .on('mouseleave', () => {
        if (!tooltip) return;
        tooltip.classList.remove('is-on');
      })
      .on('click', (evt, d) => {
        evt.stopPropagation();
        const key = String(d.key || '');
        NETWORK_FILTER_STATE.selectedNodeId = '';
        NETWORK_FILTER_STATE.selectedZoneKey = (String(NETWORK_FILTER_STATE.selectedZoneKey || '') === key) ? '' : key;
        hideNetworkMobileGraphButton();
        hideNetworkModelGraphPanel();
        updateSelectionStyles();
      });
  }

  const linkSel = gLinks.selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', 'rgba(228,236,248,0.42)')
    .attr('stroke-width', d => 0.7 + (d.w * 1.25))
    .attr('stroke-opacity', d => 0.10 + (d.w * 0.30));

  const defs = svg.append('defs');
  const glow = defs.append('filter')
    .attr('id', 'networkNodeGlow')
    .attr('x', '-220%')
    .attr('y', '-220%')
    .attr('width', '440%')
    .attr('height', '440%');
  glow.append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 0)
    .attr('stdDeviation', 2.4)
    .attr('flood-color', 'rgba(255,255,255,.45)');

  const adjacency = new Map();
  nodes.forEach((n) => adjacency.set(n.id, new Set()));
  links.forEach((l) => {
    const a = String(l.source);
    const b = String(l.target);
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  });

  const nodeBaseR = (d) => 5 + (((d.importance || 2)) * 0.65);

  function networkZoneWeightForNode(node, key){
    if (mode === 'process'){
      return Math.max(0, Math.min(1, Number(node?.processScores?.[key] || 0) / 4));
    }
    if (mode === 'dimension'){
      return Math.max(0, Math.min(1, Number(node?.dimensionShares?.[key] || 0) / 100));
    }
    return 0;
  }

  function networkTargetForNode(node){
    if (!zoneAnchors || !zoneAnchors.size || !node) return { x:cx, y:cy };

    let tx = 0;
    let ty = 0;
    let total = 0;
    for (const [key, pos] of zoneAnchors.entries()){
      const w = networkZoneWeightForNode(node, key);
      if (!(w > 0)) continue;
      tx += Number(pos.x || 0) * w;
      ty += Number(pos.y || 0) * w;
      total += w;
    }

    if (!(total > 0)){
      const fallback = node.zoneKey && zoneAnchors.has(node.zoneKey) ? zoneAnchors.get(node.zoneKey) : null;
      return fallback ? { x:fallback.x, y:fallback.y } : { x:cx, y:cy };
    }

    const seed = stableNetworkHash(node.id);
    const angle = ((seed % 360) / 360) * Math.PI * 2;
    const jitter = 16 + ((seed % 9) * 2.2);
    return {
      x: (tx / total) + (Math.cos(angle) * jitter),
      y: (ty / total) + (Math.sin(angle) * jitter)
    };
  }

  const nodeSel = gNodes.selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', d => nodeBaseR(d))
    .attr('fill', d => colorForSchoolLabel(d.grupo))
    .attr('fill-opacity', 0.96)
    .attr('stroke', 'rgba(255,255,255,.92)')
    .attr('stroke-width', 1.35)
    .attr('filter', 'url(#networkNodeGlow)')
    .style('cursor', 'pointer');

  const selectedLabel = gViewport.append('g')
    .attr('class', 'networkNodeLabel')
    .style('display', 'none');

  const selectedLabelBg = selectedLabel.append('rect')
    .attr('rx', 12)
    .attr('ry', 12)
    .attr('fill', 'rgba(12,18,28,0.86)')
    .attr('stroke', 'rgba(255,255,255,0.18)')
    .attr('stroke-width', 1);

  const selectedLabelText = selectedLabel.append('text')
    .attr('fill', '#f7fbff')
    .attr('font-size', 12)
    .attr('font-weight', 800)
    .attr('style', 'letter-spacing:.2px');

  const zoneNodeLabels = gViewport.append('g')
    .attr('class', 'networkZoneNodeLabels');

  const idExists = new Set(nodes.map((n) => String(n.id)));
  if (!idExists.has(String(NETWORK_FILTER_STATE.selectedNodeId || ''))){
    NETWORK_FILTER_STATE.selectedNodeId = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
  }
  const nodeById = new Map(nodes.map((n) => [String(n.id), n]));

  function networkLabelScale(){
    const k = Number(NETWORK_FILTER_STATE.zoomTransform?.k || 1);
    if (!(k > 1)) return 1;
    return Math.max(0.76, Math.pow(k, -0.28));
  }

  function updateZoneNodeLabels(){
    const zoneKey = String(NETWORK_FILTER_STATE.selectedZoneKey || '');
    if (!zoneKey){
      zoneNodeLabels.selectAll('*').remove();
      return;
    }

    const activeNodes = nodes.filter((n) => String(n.zoneKey || '') === zoneKey && Number.isFinite(n.x) && Number.isFinite(n.y));
    const labelSel = zoneNodeLabels.selectAll('g.zone-node-label')
      .data(activeNodes, (d) => String(d.id));

    labelSel.exit().remove();

    const enter = labelSel.enter()
      .append('g')
      .attr('class', 'zone-node-label');

    enter.append('rect')
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', 'rgba(12,18,28,0.78)')
      .attr('stroke', 'rgba(255,255,255,0.14)')
      .attr('stroke-width', 1);

    enter.append('text')
      .attr('fill', '#f7fbff')
      .attr('font-weight', 700)
      .attr('dominant-baseline', 'middle');

    const labelScale = networkLabelScale();
    const fontSize = 11 * labelScale;
    const xPad = 7 * labelScale;
    const yJitter = 10 * labelScale;
    const height = Math.max(18, 22 * labelScale);

    const merged = enter.merge(labelSel);
    merged.each(function(d, i){
      const g = d3.select(this);
      const text = g.select('text')
        .attr('font-size', fontSize)
        .text(String(d.label || 'Modelo'));
      const box = text.node()?.getBBox?.();
      const width = Math.max(42 * labelScale, (box?.width || 0) + (xPad * 2));
      const dir = (i % 2 === 0) ? 1 : -1;
      const x = Math.max(8, Math.min(s.w - width - 8, d.x + (14 * dir)));
      const y = Math.max(8, Math.min(s.h - height - 8, d.y - (12 * labelScale) + ((i % 3) * yJitter)));
      g.attr('transform', `translate(${x},${y})`);
      g.select('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);
      text
        .attr('x', xPad)
        .attr('y', height / 2);
    });
  }

  function updateSelectedNodeLabel(){
    const selected = String(NETWORK_FILTER_STATE.selectedNodeId || '');
    const selNode = selected ? nodeById.get(selected) : null;
    if (!selNode || !Number.isFinite(selNode.x) || !Number.isFinite(selNode.y)){
      selectedLabel.style('display', 'none');
      return;
    }

    selectedLabel.style('display', null);
    const labelScale = networkLabelScale();
    const fontSize = 12 * labelScale;
    const xPad = 10 * labelScale;
    const height = Math.max(22, 28 * labelScale);
    selectedLabelText
      .attr('font-size', fontSize)
      .attr('x', 0)
      .attr('y', 0)
      .attr('dominant-baseline', 'middle')
      .text(String(selNode.label || 'Modelo'));

    const box = selectedLabelText.node()?.getBBox?.();
    const width = Math.max(64 * labelScale, (box?.width || 0) + (xPad * 2) - (2 * labelScale));
    const x = Math.max(8, Math.min(s.w - width - 8, selNode.x + 12));
    const y = Math.max(8, Math.min(s.h - height - 8, selNode.y - 26));

    selectedLabel.attr('transform', `translate(${x},${y})`);
    selectedLabelBg
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);
    selectedLabelText
      .attr('x', xPad)
      .attr('y', height / 2);
  }

  function zoneRadiusForValue(val, currentMode){
    if (currentMode === 'process'){
      const n = Math.max(0, Math.min(4, Number(val) || 0)) / 4; // 0..1
      return zoneBaseR * (0.72 + (0.55 * n));                    // 0.72x..1.27x
    }
    if (currentMode === 'dimension'){
      const n = Math.max(0, Math.min(100, Number(val) || 0)) / 100; // 0..1
      return zoneBaseR * (0.72 + (0.62 * Math.sqrt(n)));             // 0.72x..1.34x
    }
    return zoneBaseR;
  }

  function updateSelectionStyles(){
    const selected = String(NETWORK_FILTER_STATE.selectedNodeId || '');
    const selectedZoneKey = String(NETWORK_FILTER_STATE.selectedZoneKey || '');
    const hasSel = !!selected;
    const hasZoneSel = !!selectedZoneKey && !hasSel;
    const linkedSet = hasSel ? (adjacency.get(selected) || new Set()) : new Set();
    const selNode = hasSel ? nodeById.get(selected) : null;
    const selModel = hasSel
      ? (getAllModelsPool().find((m) => String(m?.id || '') === selected) || selNode)
      : null;
    const selZone = hasZoneSel ? zoneRows.find((z) => String(z.key || '') === selectedZoneKey) : null;
    const selZoneModels = hasZoneSel
      ? getAllModelsPool()
          .filter((m) => String(m?.id || ''))
          .filter((m) => String(nodeById.get(String(m.id))?.zoneKey || '') === selectedZoneKey)
          .sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), MODELOS_LOCALE))
      : [];

    nodeSel
      .attr('opacity', (d) => {
        if (!hasSel) return 1;
        if (String(d.id) === selected) return 1;
        if (linkedSet.has(String(d.id))) return 0.95;
        return 0.18;
      })
      .attr('stroke-width', (d) => (hasSel && String(d.id) === selected) ? 2.2 : 1.2)
      .attr('r', (d) => {
        if (hasSel && String(d.id) === selected) return nodeBaseR(d) + 1.9;
        if (hasZoneSel && String(d.zoneKey || '') === selectedZoneKey) return nodeBaseR(d) + 1.2;
        return nodeBaseR(d);
      })
      .attr('opacity', (d) => {
        if (hasSel){
          if (String(d.id) === selected) return 1;
          if (linkedSet.has(String(d.id))) return 0.95;
          return 0.18;
        }
        if (hasZoneSel){
          return String(d.zoneKey || '') === selectedZoneKey ? 1 : 0.16;
        }
        return 1;
      });

    if (hasZoneSel){
      renderNetworkZoneSelectionCard(selZone, selZoneModels);
      hideNetworkModelGraphPanel();
    }else{
      renderNetworkSelectionCard(selModel || null);
      if (!hasSel){
        hideNetworkModelGraphPanel();
      }
    }
    updateSelectedNodeLabel();
    updateZoneNodeLabels();

    linkSel
      .attr('stroke-opacity', (l) => {
        if (!hasSel) return 0.14 + (l.w * 0.34);
        const a = String(l.source.id || l.source);
        const b = String(l.target.id || l.target);
        if (a === selected || b === selected) return 0.72;
        return 0.06;
      })
      .attr('stroke-width', (l) => {
        const base = 0.8 + (l.w * 1.4);
        if (!hasSel) return base;
        const a = String(l.source.id || l.source);
        const b = String(l.target.id || l.target);
        return (a === selected || b === selected) ? (base + 0.9) : 0.8;
      });

    if (hasZoneSel){
      linkSel
        .attr('stroke-opacity', (l) => {
          const a = String(l.source.id || l.source);
          const b = String(l.target.id || l.target);
          const inA = String(nodeById.get(a)?.zoneKey || '') === selectedZoneKey;
          const inB = String(nodeById.get(b)?.zoneKey || '') === selectedZoneKey;
          return (inA && inB) ? (0.26 + (l.w * 0.4)) : 0.04;
        })
        .attr('stroke-width', (l) => {
          const a = String(l.source.id || l.source);
          const b = String(l.target.id || l.target);
          const inA = String(nodeById.get(a)?.zoneKey || '') === selectedZoneKey;
          const inB = String(nodeById.get(b)?.zoneKey || '') === selectedZoneKey;
          return (inA && inB) ? (1 + (l.w * 1.5)) : 0.8;
        });
    }

    if (zoneRingSel){
      zoneRingSel
        .interrupt()
        .transition()
        .duration(420)
        .ease(d3.easeCubicOut)
        .attr('r', (d) => {
          if (!selNode) return zoneBaseR;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0)
            : Number(selNode.dimensionShares?.[d.key] || 0);
          return zoneRadiusForValue(value, mode);
        })
        .attr('fill-opacity', (d) => {
          if (!selNode) return 0.04;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0) / 4
            : Number(selNode.dimensionShares?.[d.key] || 0) / 100;
          const n = Math.max(0, Math.min(1, value));
          return 0.03 + (0.12 * n);
        })
        .attr('stroke-opacity', (d) => {
          if (!selNode) return 0.34;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0) / 4
            : Number(selNode.dimensionShares?.[d.key] || 0) / 100;
          const n = Math.max(0, Math.min(1, value));
          return 0.26 + (0.44 * n);
        })
        .attr('stroke-width', (d) => {
          if (!selNode) return 1.1;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0) / 4
            : Number(selNode.dimensionShares?.[d.key] || 0) / 100;
          const n = Math.max(0, Math.min(1, value));
          return 1 + (1.2 * n);
        })
        .attr('fill-opacity', (d) => {
          if (hasZoneSel && d.key === selectedZoneKey) return 0.11;
          if (!selNode) return 0.04;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0) / 4
            : Number(selNode.dimensionShares?.[d.key] || 0) / 100;
          const n = Math.max(0, Math.min(1, value));
          return 0.03 + (0.12 * n);
        })
        .attr('stroke-opacity', (d) => {
          if (hasZoneSel && d.key === selectedZoneKey) return 0.82;
          if (!selNode) return 0.34;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0) / 4
            : Number(selNode.dimensionShares?.[d.key] || 0) / 100;
          const n = Math.max(0, Math.min(1, value));
          return 0.26 + (0.44 * n);
        })
        .attr('stroke-width', (d) => {
          if (hasZoneSel && d.key === selectedZoneKey) return 1.9;
          if (!selNode) return 1.1;
          const value = (mode === 'process')
            ? Number(selNode.processScores?.[d.key] || 0) / 4
            : Number(selNode.dimensionShares?.[d.key] || 0) / 100;
          const n = Math.max(0, Math.min(1, value));
          return 1 + (1.2 * n);
        });
    }
  }

  nodeSel
    .on('mouseenter', (evt, d) => {
      if (!tooltip) return;
      tooltip.innerHTML = `<strong>${escapeHtml(d.label)}</strong><br>${escapeHtml(d.autores || '—')}<br>${escapeHtml(schoolDisplayLabel(d.grupo))}${d.year ? ` · ${d.year}` : ''}`;
      tooltip.classList.add('is-on');
    })
    .on('mousemove', (evt) => {
      if (!tooltip) return;
      const r = wrap.getBoundingClientRect();
      tooltip.style.left = `${evt.clientX - r.left + 12}px`;
      tooltip.style.top = `${evt.clientY - r.top + 12}px`;
    })
    .on('mouseleave', () => {
      if (!tooltip) return;
      tooltip.classList.remove('is-on');
    })
    .on('click', async (evt, d) => {
      const clickedId = String(d.id);
      evt.stopPropagation();
      NETWORK_FILTER_STATE.selectedZoneKey = '';
      NETWORK_FILTER_STATE.selectedNodeId = clickedId;
      updateSelectionStyles();
      const base = getAllModelsPool().find((m) => String(m?.id || '') === clickedId);
      if (base){
        const full = await ensureModelFull(base).catch(() => base);
        if (String(NETWORK_FILTER_STATE.selectedNodeId || '') === clickedId){
          const selectedModel = full || base;
          renderNetworkSelectionCard(selectedModel);
          if (isMobileViewport()){
            renderNetworkMobileGraphButton(selectedModel);
            hideNetworkModelGraphPanel();
          }else{
            hideNetworkMobileGraphButton();
            renderNetworkModelGraphPanel(selectedModel);
          }
        }
      }
    });

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => 126 - (d.w * 42)).strength(d => 0.09 + (d.w * 0.16)))
    .force('charge', d3.forceManyBody().strength(zoneAnchors ? -74 : -62))
    .force('collide', d3.forceCollide().radius(zoneAnchors ? 14 : 13))
    .force('x', d3.forceX().x((d) => {
      if (zoneAnchors) return networkTargetForNode(d).x;
      return cx;
    }).strength(zoneAnchors ? 0.20 : 0.09))
    .force('y', d3.forceY().y((d) => {
      if (zoneAnchors) return networkTargetForNode(d).y;
      return cy;
    }).strength(zoneAnchors ? 0.20 : 0.09))
    .force('center', d3.forceCenter(cx, cy))
    .force('zoneRepel', zoneAnchors ? createZoneRepelForce(zoneAnchors, mode) : null)
    .alpha(0.95)
    .alphaDecay(0.028);

  const drag = d3.drag()
    .on('start', (evt, d) => {
      if (!evt.active) sim.alphaTarget(0.22).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (evt, d) => {
      d.fx = evt.x;
      d.fy = evt.y;
    })
    .on('end', (evt, d) => {
      if (!evt.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
  nodeSel.call(drag);

  const zoom = d3.zoom()
    .scaleExtent([0.35, 2.8])
    .on('zoom', (evt) => {
      gViewport.attr('transform', evt.transform);
      NETWORK_FILTER_STATE.zoomTransform = evt.transform;
      updateSelectedNodeLabel();
      updateZoneNodeLabels();
    });
  svg.call(zoom);
  if (NETWORK_FILTER_STATE.zoomTransform){
    svg.call(zoom.transform, NETWORK_FILTER_STATE.zoomTransform);
  }else{
    const initial = d3.zoomIdentity.translate(s.w * 0.02, s.h * 0.01).scale(0.86);
    svg.call(zoom.transform, initial);
  }
  svg.on('click', (evt) => {
    const t = evt.target;
    if (t && String(t.tagName || '').toLowerCase() === 'circle') return;
    if (!NETWORK_FILTER_STATE.selectedNodeId && !NETWORK_FILTER_STATE.selectedZoneKey) return;
    NETWORK_FILTER_STATE.selectedNodeId = '';
    NETWORK_FILTER_STATE.selectedZoneKey = '';
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    renderNetworkSelectionCard(null);
    updateSelectionStyles();
  });

  sim.on('tick', () => {
    linkSel
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodeSel
      .attr('cx', d => d.x = Math.max(12, Math.min(s.w - 12, d.x)))
      .attr('cy', d => d.y = Math.max(12, Math.min(s.h - 12, d.y)));

    updateSelectedNodeLabel();
  });
  updateSelectionStyles();
  requestAnimationFrame(() => setNetworkLoading(false));

  NETWORK_STATE.sim = sim;
  NETWORK_STATE.resizeHandler = () => {
    if (groupingMode !== 'network') return;
    renderNetworkGraphLazy();
  };
  window.addEventListener('resize', NETWORK_STATE.resizeHandler, { passive:true });
}

function setNetworkLoading(isLoading){
  const wrap = document.getElementById('networkCanvas');
  const loading = document.getElementById('networkLoading');
  if (!wrap || !loading) return;
  if (NETWORK_STATE.loadingTimer){
    clearTimeout(NETWORK_STATE.loadingTimer);
    NETWORK_STATE.loadingTimer = null;
  }
  if (isLoading){
    NETWORK_STATE.loadingSince = Date.now();
    wrap.classList.add('is-loading');
    loading.setAttribute('aria-hidden', 'false');
    return;
  }

  const elapsed = Date.now() - Number(NETWORK_STATE.loadingSince || 0);
  const minVisible = 420;
  const applyOff = () => {
    wrap.classList.remove('is-loading');
    loading.setAttribute('aria-hidden', 'true');
  };

  if (elapsed < minVisible){
    NETWORK_STATE.loadingTimer = setTimeout(applyOff, minVisible - elapsed);
    return;
  }

  applyOff();
}

function renderNetworkGraphLazy(){
  setNetworkLoading(true);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderNetworkGraph().catch((e) => {
        setNetworkLoading(false);
        console.warn('network graph error', e);
      });
    });
  });
}

function bindNetworkCompactControls(){
  const subscribeGraphBtn = document.querySelector('[data-action="subscribe-network-graph"]');
  if (subscribeGraphBtn && subscribeGraphBtn.dataset.bound !== '1'){
    subscribeGraphBtn.dataset.bound = '1';
    subscribeGraphBtn.addEventListener('click', () => {
      if (typeof window.startSubscriptionCheckout === 'function'){
        window.startSubscriptionCheckout();
        return;
      }

      if (typeof window.openSubscriptionLogin === 'function'){
        window.openSubscriptionLogin(uiText('auth.signInToSubscribe', 'Inicia sesión o crea una cuenta para suscribirte.'));
      }
    });
  }

  document.querySelectorAll('[data-network-mode-control]').forEach((button) => {
    if (button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => {
      applyNetworkProfileMode(button.getAttribute('data-network-mode-control') || 'process');
    });
  });
}

function ensureNetworkModelGraphHost(){
  if (groupingMode !== 'network') return null;
  const view = document.querySelector('#modelInfo .networkView');
  if (!view) return null;

  let host = document.getElementById('networkModelGraphPanel');
  if (host && host.parentElement !== view){
    host.remove();
    host = null;
  }

  if (!host){
    host = document.createElement('aside');
    host.id = 'networkModelGraphPanel';
    host.className = 'networkModelGraphPanel';
    host.hidden = true;
    view.appendChild(host);
  }

  return host;
}

function ensureNetworkMobileGraphButton(){
  if (groupingMode !== 'network') return null;
  const view = document.querySelector('#modelInfo .networkView');
  if (!view) return null;

  let btn = document.getElementById('networkMobileGraphCta');
  if (btn && btn.parentElement !== view){
    btn.remove();
    btn = null;
  }

  if (!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'networkMobileGraphCta';
    btn.className = 'networkMobileGraphCta';
    btn.hidden = true;
    btn.textContent = uiText('network.openGraph', 'Abrir gráfica');
    view.appendChild(btn);
  }

  if (!btn.dataset.bound){
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const key = String(btn.getAttribute('data-id') || '').trim();
      if (!key || groupingMode !== 'network') return;
      const base = getAllModelsPool().find((m) => String(m?.id || '').trim() === key);
      if (!base) return;
      const full = await ensureModelFull(base).catch(() => base);
      const selectedModel = full || base;
      renderNetworkModelGraphPanel(selectedModel);
      hideNetworkMobileGraphButton();
    });
  }

  return btn;
}

function hideNetworkModelGraphPanel(){
  const host = document.getElementById('networkModelGraphPanel');
  if (!host) return;
  host.hidden = true;
  host.innerHTML = '';
  host.style.removeProperty('--schoolColor');
}

function hideNetworkMobileGraphButton(){
  const btn = document.getElementById('networkMobileGraphCta');
  if (!btn) return;
  btn.hidden = true;
  btn.removeAttribute('data-id');
  btn.style.removeProperty('--schoolColor');
}

function renderNetworkMobileGraphButton(model){
  const btn = ensureNetworkMobileGraphButton();
  if (!btn || !model || !model.id || groupingMode !== 'network' || !isMobileViewport()){
    hideNetworkMobileGraphButton();
    return;
  }
  btn.hidden = false;
  btn.setAttribute('data-id', String(model.id));
  btn.style.setProperty('--schoolColor', colorForSchoolLabel(model.grupo));
}

function bindNetworkModelGraphPanel(host){
  if (!host || host.dataset.bound === '1') return;
  host.dataset.bound = '1';
  host.addEventListener('click', (evt) => {
    const closeBtn = evt.target.closest('[data-action="close-network-graph"]');
    if (!closeBtn) return;
    NETWORK_FILTER_STATE.selectedNodeId = '';
    renderNetworkSelectionCard(null);
    hideNetworkMobileGraphButton();
    hideNetworkModelGraphPanel();
    try{ renderNetworkGraphLazy(); }catch(e){}
  });
}

function renderNetworkModelGraphPanel(model){
  const host = ensureNetworkModelGraphHost();
  if (!host || !model || !model.id || groupingMode !== 'network'){
    hideNetworkModelGraphPanel();
    return;
  }

  const mode = String(NETWORK_FILTER_STATE.profileMode || 'mixed');
  const schoolColor = colorForSchoolLabel(model.grupo);
  const hasProc = modelHasProcessData(model);
  const hasDim = modelHasDimensionData(model);

  let graphHtml = '';
  let kicker = uiText('common.model.one', 'Modelo');

  if (mode === 'dimension'){
    kicker = uiText('network.dimensions', 'Dimensiones');
    graphHtml = hasDim
      ? renderDimensionesCambioChart(getModelDimensionMap(model), model)
      : `<div class="dim-card"><h4 class="dim-title">${escapeHtml(uiText('graph.intervenesDimensions', 'Interviene en las siguientes dimensiones'))}</h4><div class="dim-empty">${escapeHtml(uiText('network.noDimensions', 'Sin dimensiones definidas.'))}</div></div>`;
  }else if (mode === '3d'){
    const pos = ensureNetwork3DLayoutCache().positionsById.get(String(model.id || '')) || { x:0, y:0, z:0 };
    const neighbors = getNearestNeighbors3D(String(model.id || ''), 5)
      .map((row) => row.meta?.label || row.id)
      .filter(Boolean);
    kicker = uiText('network.space3d', 'Espacio 3D');
    graphHtml = `
      <div class="grafica-procesos">
        <h4 class="dim-title">${escapeHtml(uiText('network.theoreticalCoordinates', 'Coordenadas teóricas'))}</h4>
        <div class="mp-meta" style="margin-bottom:4px">
          <span class="mp-pill">X ${escapeHtml(Number(pos.x || 0).toFixed(1))}</span>
          <span class="mp-pill">Y ${escapeHtml(Number(pos.y || 0).toFixed(1))}</span>
          <span class="mp-pill">Z ${escapeHtml(Number(pos.z || 0).toFixed(1))}</span>
        </div>
        <div class="dim-reference" style="margin-top:8px">
          X = (N + I + RI) - (AG + RF)<br>
          Y = (AP + RE) - (N + 0.5 · RI)<br>
          Z = R - (I + RI)
        </div>
        <div class="mp-section">
          <h4 class="dim-title">${escapeHtml(uiText('network.nearestNeighbors', 'Vecinos más cercanos'))}</h4>
          ${neighbors.length
            ? `<div class="mp-meta">${neighbors.map((name) => `<span class="mp-pill">${escapeHtml(name)}</span>`).join('')}</div>`
            : `<div class="dim-empty">${escapeHtml(uiText('network.noNeighbors', 'Sin vecinos disponibles.'))}</div>`}
        </div>
      </div>
    `;
  }else{
    kicker = (mode === 'process')
      ? uiText('network.processes', 'Procesos')
      : uiText('network.mixedProfile', 'Perfil mixto');
    graphHtml = (hasProc || hasDim)
      ? renderGraficaProcesos(model, { includeDimensions: false })
      : `<div class="grafica-procesos"><h4 class="dim-title">${escapeHtml(uiText('network.modelProfile', 'Perfil del modelo'))}</h4><div class="dim-empty">${escapeHtml(uiText('network.noProfile', 'Sin procesos ni dimensiones definidas.'))}</div></div>`;
  }

  const meta = [model.autores || '', schoolDisplayLabel(model.grupo) || '', model.year || ''].filter(Boolean).join(' · ');

  host.hidden = false;
  hideNetworkMobileGraphButton();
  host.style.setProperty('--schoolColor', schoolColor);
  host.innerHTML = `
    <div class="networkModelGraphHead">
      <div>
        <span class="networkModelGraphKicker">${escapeHtml(kicker)}</span>
        <h3 class="networkModelGraphTitle">${escapeHtml(model.label || uiText('common.model.one', 'Modelo'))}</h3>
        <p class="networkModelGraphMeta">${escapeHtml(meta || uiText('common.noMetadata', 'Sin metadatos'))}</p>
      </div>
      <button type="button" class="networkModelGraphClose" aria-label="${escapeHtml(uiText('network.closeGraph', 'Cerrar gráfica'))}" data-action="close-network-graph">x</button>
    </div>
    <div class="networkModelGraphBody">${graphHtml}</div>
  `;

  bindNetworkModelGraphPanel(host);
  initDimHoverSync(host);
  initProcessDetailSync(host);
  initGraphEntranceAnimations(host);
  initProcesosHeightSync(host);
  host.scrollTop = 0;
}

function renderNotaEpistemologica(modelo){
  const nota = modelo?.advertenciaEpistemologica || modelo?.notaEpistemologica;
  const texto = String(nota?.texto || '').trim();
  if (!texto) return '';

  const titulo = String(nota?.titulo || uiText('epistemology.note', 'Nota epistemológica')).trim() || uiText('epistemology.note', 'Nota epistemológica');
  const nivel = String(nota?.nivel || 'suave')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') || 'suave';

  return `
    <section class="epistemic-note epistemic-note--${escapeHtml(nivel)}">
      <div class="epistemic-note__header">
        <span class="epistemic-note__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <path d="M12 3.6 21 19.2H3L12 3.6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M12 9v4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
        </span>
        <span>${escapeHtml(titulo)}</span>
      </div>
      <p class="epistemic-note__text">${escapeHtml(texto)}</p>
    </section>`;
}

function renderControversyBars(nivel, max){
  const safeMax = Number.isFinite(Number(max)) ? Math.max(0, Math.floor(Number(max))) : 5;
  const safeNivel = Number.isFinite(Number(nivel)) ? Number(nivel) : 0;
  const clampedNivel = Math.max(0, Math.min(safeNivel, safeMax));

  return Array.from({ length: safeMax }, (_, i) =>
    `<i class="controversia-tick${i < clampedNivel ? ' is-active' : ''}" aria-hidden="true"></i>`
  ).join('');
}

function normalizeDebateUrl(value){
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try{
    const url = new URL(raw, location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  }catch(e){}

  return '';
}

function controversyText(value){
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return String(value.texto ?? value.resumen ?? value.descripcion ?? '').trim();
  return String(value).trim();
}

function controversyRefs(value){
  if (!value || typeof value !== 'object') return [];
  const refs = Array.isArray(value.refs)
    ? value.refs
    : (Array.isArray(value.referencias) ? value.referencias : []);
  return refs.map(ref => String(ref ?? '').trim()).filter(Boolean);
}

function renderControversiaRefs(refs){
  const cleanRefs = Array.isArray(refs)
    ? refs.map(ref => String(ref ?? '').trim()).filter(Boolean)
    : [];
  if (!cleanRefs.length) return '';

  return `
    <div class="controversia-refs">
      <span class="controversia-refs-title">${escapeHtml(uiText('controversy.references', 'Referencias'))}: </span>
      <span class="controversia-refs-text">${cleanRefs.map(ref => escapeHtml(ref)).join(' · ')}</span>
    </div>
  `;
}

function renderControversiaTextBlock(value, className = 'controversia-texto'){
  const text = controversyText(value);
  const refs = controversyRefs(value);
  if (!text && !refs.length) return '';

  return `
    <div class="controversia-textBlock">
      ${text ? `<p class="${escapeHtml(className)}">${escapeHtml(text)}</p>` : ''}
      ${renderControversiaRefs(refs)}
    </div>
  `;
}

function renderControversiaItems(items, className = 'controversia-criterios'){
  const rows = Array.isArray(items)
    ? items.map((item) => {
        const text = controversyText(item);
        const refs = controversyRefs(item);
        if (!text && !refs.length) return '';
        return `
          <li>
            ${text ? `<span class="controversia-itemText">${escapeHtml(text)}</span>` : ''}
            ${renderControversiaRefs(refs)}
          </li>
        `;
      }).filter(Boolean)
    : [];

  return rows.length ? `<ul class="${escapeHtml(className)}">${rows.join('')}</ul>` : '';
}

function renderControversiaSubsection(title, value){
  const body = Array.isArray(value)
    ? renderControversiaItems(value, 'controversia-sublist')
    : renderControversiaTextBlock(value);
  if (!body) return '';

  return `
    <details class="controversia-subsection">
      <summary><span>${escapeHtml(title)}</span></summary>
      <div class="controversia-subsection-body">${body}</div>
    </details>
  `;
}

function parseModelObjectField(value){
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw || raw[0] !== '{') return null;

  try{
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }catch(e){
    return null;
  }
}

function renderControversia(model, options = {}){
  const c = parseModelObjectField(model?.controversia);
  if (!c) return '';

  const defaultTitle = uiText('fiche.controversyDegree', 'Grado de controversia');
  const titulo = String(c.titulo || defaultTitle).trim() || defaultTitle;
  const max = Number.isFinite(Number(c.max)) ? Number(c.max) : 5;
  const nivel = Number.isFinite(Number(c.nivel)) ? Number(c.nivel) : 0;
  const safeMax = Math.max(0, Math.floor(max));
  const safeNivel = Math.max(0, Math.min(nivel, safeMax));
  const etiqueta = String(c.etiqueta || '').trim();
  const bars = renderControversyBars(safeNivel, safeMax);

  return `
    <section class="controversia-card">
      <div class="controversia-header">
        <div class="controversia-titleRow">
          ${options.editorial ? '' : `<h3>${escapeHtml(titulo)}</h3>`}
          <div class="controversia-meter" aria-label="${escapeHtml(`${titulo}: ${safeNivel} de ${safeMax}`)}">
            <span class="controversia-meter-caption">${escapeHtml(uiText('controversy.index', 'Índice de controversia'))} <b>${safeNivel}/${safeMax}</b></span>
            <span class="controversia-bars" style="--controversy-max:${Math.max(1, safeMax)}" aria-hidden="true">${bars}</span>
            ${etiqueta ? `<span class="controversia-label">${escapeHtml(etiqueta)}</span>` : ''}
          </div>
        </div>
      </div>

      ${renderControversiaTextBlock(c.resumen || c.texto)}
      ${renderControversiaItems(c.criterios)}
      ${renderControversiaSubsection(uiText('controversy.clinicalDimension', 'Dimensión clínica'), c.dimensionClinica)}
      ${renderControversiaSubsection(uiText('controversy.epistemologicalDimension', 'Dimensión epistemológica'), c.dimensionEpistemologica)}
      ${renderControversiaSubsection(uiText('controversy.historicalDimension', 'Dimensión histórica'), c.dimensionHistorica)}
      ${renderControversiaSubsection(uiText('controversy.clinicalRisks', 'Riesgos clínicos'), c.riesgosClinicos)}
      ${renderControversiaSubsection(uiText('controversy.editorialNuance', 'Matiz editorial'), c.matizEditorial)}
      ${renderControversiaSubsection(uiText('controversy.usageRecommendation', 'Recomendación de uso'), c.recomendacionUso)}
      ${renderControversiaSubsection(uiText('controversy.criticalReferences', 'Referencias críticas'), c.refsCriticas)}
      ${renderControversiaSubsection(uiText('controversy.counterpointReferences', 'Referencias de contrapunto'), c.refsContrapunto)}
      ${renderControversiaSubsection(uiText('controversy.contextualReferences', 'Referencias contextuales'), c.refsContextuales)}
      ${renderControversiaSubsection(uiText('controversy.primaryReferences', 'Referencias primarias del modelo'), c.refsPrimariasModelo)}
    </section>
  `;
}

function renderLecturaDebate(item){
  if (!item || typeof item !== 'object') return '';

  const titulo = String(item.titulo || '').trim();
  const autor = String(item.autor || '').trim();
  const year = item.year ?? '';
  const yearText = String(year || '').trim();
  const tipo = String(item.tipo || '').trim();
  const url = normalizeDebateUrl(item.url);

  if (!titulo && !autor && !yearText && !tipo && !url) return '';

  const tituloHtml = url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(titulo || url)}</a>`
    : escapeHtml(titulo);
  const meta = [autor, yearText, tipo].filter(Boolean).map(escapeHtml).join(' · ');

  return `
    <li class="debate-lectura">
      ${tituloHtml ? `<div class="debate-lectura-titulo">${tituloHtml}</div>` : ''}
      ${meta ? `<div class="debate-lectura-meta">${meta}</div>` : ''}
    </li>
  `;
}

function renderDebateCriticoContent(value, options = {}){
  const d = parseModelObjectField(value);
  if (!d) return '';
  const nivel = String(d.nivel || '').trim();
  const resumenHtml = renderControversiaTextBlock(d.resumen, 'debate-critico-resumen');
  const temas = Array.isArray(d.temas) ? d.temas.filter(item => item !== null && item !== undefined) : [];
  const lecturasCriticas = Array.isArray(d.lecturasCriticas) ? d.lecturasCriticas : [];
  const lecturasContextuales = Array.isArray(d.lecturasContextuales) ? d.lecturasContextuales : [];

  const lecturasCriticasHtml = lecturasCriticas
    .map(renderLecturaDebate)
    .filter(Boolean)
    .join('');

  const lecturasContextualesHtml = lecturasContextuales
    .map(renderLecturaDebate)
    .filter(Boolean)
    .join('');

  return `
    <section class="debate-critico-card${options.nested ? ' debate-critico-card--nested' : ''}">
      <div class="debate-critico-header">
        ${options.editorial ? '' : `<h3>${escapeHtml(uiText('fiche.criticalDebate', 'Debate crítico'))}</h3>`}
        ${nivel ? `<span class="debate-critico-nivel">${escapeHtml(nivel)}</span>` : ''}
      </div>

      ${resumenHtml}

      ${temas.length ? `
        <div class="debate-critico-temas">
          <h4>${escapeHtml(uiText('debate.mainTopics', 'Temas principales'))}</h4>
          ${renderControversiaItems(temas, 'debate-critico-temas-list')}
        </div>
      ` : ''}

      ${lecturasCriticasHtml ? `
        <details class="debate-critico-lecturas">
          <summary>${escapeHtml(uiText('debate.criticalReadings', 'Lecturas críticas'))}</summary>
          <ul>${lecturasCriticasHtml}</ul>
        </details>
      ` : ''}

      ${lecturasContextualesHtml ? `
        <details class="debate-critico-lecturas">
          <summary>${escapeHtml(uiText('debate.contextualReadings', 'Lecturas contextuales'))}</summary>
          <ul>${lecturasContextualesHtml}</ul>
        </details>
      ` : ''}
    </section>
  `;
}

function renderDebateCritico(model, options = {}){
  const controversy = parseModelObjectField(model?.controversia);
  return renderDebateCriticoContent(model?.debateCritico || controversy?.debateCritico, options);
}

function epHasText(value){
  return typeof value === 'string' && value.trim().length > 0;
}

function epCleanText(value){
  return epHasText(value) ? value.trim() : '';
}

function epArray(value){
  return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined && item !== '') : [];
}

function epHasArray(value){
  return epArray(value).length > 0;
}

function epSection(title, bodyHtml, extraClass = '', titleActionHtml = ''){
  if (!epHasText(bodyHtml)) return '';
  return `
    <section class="mp-section${extraClass ? ` ${escapeHtml(extraClass)}` : ''}">
      <div class="ep-section-head">
        <h4>${title}</h4>
        ${titleActionHtml || ''}
      </div>
      ${bodyHtml}
    </section>`;
}

function epGetItemLabel(item){
  if (typeof item === 'string') return item.trim();
  if (item && typeof item === 'object'){
    return String(item.label ?? item.nombre ?? item.titulo ?? item.id ?? item.texto ?? '').trim();
  }
  return '';
}

function epFindModelByLabelOrId(value){
  const key = String(value ?? '').trim();
  if (!key) return null;
  const keySlug = slugify(key);
  const pool = (typeof getAllModelsPool === 'function') ? getAllModelsPool() : (Array.isArray(MODELS) ? MODELS : []);
  return pool.find((item) => {
    const id = String(item?.id ?? '').trim();
    const label = String(item?.label ?? '').trim();
    return id === key || label === key || slugify(id) === keySlug || slugify(label) === keySlug;
  }) || null;
}

function epRenderChips(items, options = {}){
  const list = epArray(items)
    .map((item) => ({ raw: item, label: epGetItemLabel(item) }))
    .filter((item) => item.label);

  if (!list.length) return '';

  return `<div class="ep-chipList">${
    list.map(({ raw, label }) => {
      if (options.linkModels){
        const target = epFindModelByLabelOrId(typeof raw === 'object' ? (raw.id ?? raw.modelo ?? raw.model ?? label) : label);
        if (target?.id){
          return `<button type="button" class="ep-chip" data-action="open-ep-related-model" data-id="${escapeHtml(String(target.id))}">${escapeHtml(target.label || label)}</button>`;
        }
      }
      return `<span class="ep-chip">${escapeHtml(label)}</span>`;
    }).join('')
  }</div>`;
}

function epRenderMixedItems(items){
  const list = epArray(items);
  if (!list.length) return '';

  const html = list.map((item, index) => {
    if (typeof item === 'string'){
      const text = item.trim();
      return text ? `<p class="ep-itemText">${escapeHtml(text)}</p>` : '';
    }

    if (item && typeof item === 'object'){
      const title = epCleanText(item.titulo) || epCleanText(item.con) || epCleanText(item.label) || epCleanText(item.nombre);
      const body = epCleanText(item.desarrollo) || epCleanText(item.diferencia) || epCleanText(item.texto) || epCleanText(item.descripcion);
      if (!title && !body) return '';
      return `
        <details>
          <summary>
            <span class="subLeft">
              <span class="subTitle">${escapeHtml(title || uiText('epistemology.entry', 'Entrada {number}', { number:index + 1 }))}</span>
            </span>
            <span class="subRight">
              <span class="chev">&#9662;</span>
            </span>
          </summary>
          <div class="subBody">
            <div class="subText">${escapeHtml(body || '-')}</div>
          </div>
        </details>`;
    }

    return '';
  }).filter(Boolean).join('');

  return html ? `<div class="mp-sub ep-items">${html}</div>` : '';
}

function epRenderAuthorGroups(autoresClave){
  if (!autoresClave || typeof autoresClave !== 'object') return '';

  const groups = [
    [uiText('epistemology.authors.philosophical', 'Filosóficos'), autoresClave.filosoficos],
    [uiText('epistemology.authors.psychological', 'Psicológicos'), autoresClave.psicologicos],
    [uiText('epistemology.authors.clinical', 'Clínicos'), autoresClave.clinicos]
  ].map(([title, items]) => {
    const names = epArray(items).map(epGetItemLabel).filter(Boolean);
    if (!names.length) return '';
    return `
      <div class="ep-authorGroup">
        <h5 class="ep-authorTitle">${escapeHtml(title)}</h5>
        <p class="ep-authorText">${
          names.map((name, index) =>
            `${index ? '<span class="ep-authorSep">,</span>' : ''}<span class="ep-authorName">${escapeHtml(name)}</span>`
          ).join('')
        }</p>
      </div>`;
  }).filter(Boolean).join('');

  return groups ? `<div class="ep-authorGrid">${groups}</div>` : '';
}

function epRenderConceptions(model){
  const imageBase = 'Core/imagenes/epistemologia/';
  const rows = [
    { key:'verdad', roman:'I', name:uiText('epistemology.truth.name', 'Verdad'), role:uiText('epistemology.truth.role', 'Dónde reside y cómo se conoce'), title:uiText('epistemology.truth.title', '¿Dónde reside la verdad?'), value:model?.concepcionVerdad, image:'Verdad.jpg', summary:model?.concepcionVerdadResumen },
    { key:'sujeto', roman:'II', name:uiText('epistemology.subject.name', 'Sujeto'), role:uiText('epistemology.subject.role', 'Qué idea de persona sostiene'), title:uiText('epistemology.subject.title', 'Concepción del sujeto'), value:model?.concepcionSujeto, image:'Sujeto.jpg', summary:model?.concepcionSujetoResumen },
    { key:'cambio', roman:'III', name:uiText('epistemology.change.name', 'Cambio'), role:uiText('epistemology.change.role', 'Cómo se transforma la experiencia'), title:uiText('epistemology.change.title', 'Concepción del cambio'), value:model?.concepcionCambio, image:'Cambio.jpg', summary:model?.concepcionCambioResumen },
    { key:'terapeuta', roman:'IV', name:uiText('epistemology.therapist.name', 'Terapeuta'), role:uiText('epistemology.therapist.role', 'Qué lugar ocupa en el proceso'), title:uiText('epistemology.therapist.title', 'Concepción del terapeuta'), value:model?.concepcionTerapeuta, image:'Terapeuta.jpg', summary:model?.concepcionTerapeutaResumen }
  ].map(row => ({
    ...row,
    text:epCleanText(row.value),
    summaryText:epCleanText(row.summary)
  })).filter(row => row.text);

  if (!rows.length) return null;

  return {
    rows,
    cardsHtml:`<div class="ep-conceptions">${
      rows.map((row, index) => {
        const imageUrl = privateImageUrl(`${imageBase}${row.image}`);
        return `
          <div class="ep-conceptCard" data-key="${row.key}">
            <img class="ep-conceptBg" data-private-src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async">
            <div class="ep-conceptBody">
              <div class="ep-conceptIndex">${String(index + 1).padStart(2, '0')} · ${escapeHtml(uiText('epistemology.conception', 'Concepción'))}</div>
              <h5 class="ep-conceptTitle">${escapeHtml(row.title)}</h5>
              ${row.summaryText ? `<div class="ep-conceptSummary">${escapeHtml(row.summaryText)}</div>` : ''}
              <p class="ep-conceptText">${escapeHtml(row.text)}</p>
            </div>
          </div>`;
      }).join('')
    }</div>`
  };
}

function epRenderRefs(refs){
  const list = epArray(refs);
  if (!list.length) return '';

  const items = list.map((item) => {
    if (typeof item === 'string'){
      const text = item.trim();
      return text ? `<li>${escapeHtml(text)}</li>` : '';
    }

    if (item && typeof item === 'object'){
      const parts = [
        item.autores ?? item.autor ?? item.author,
        item.year ?? item.ano ?? item.anio,
        item.titulo ?? item.title,
        item.fuente ?? item.source ?? item.editorial ?? item.journal
      ].map(value => String(value ?? '').trim()).filter(Boolean);
      return parts.length ? `<li>${escapeHtml(parts.join('. '))}</li>` : '';
    }

    return '';
  }).filter(Boolean).join('');

  return items ? `<ol class="ep-biblio">${items}</ol>` : '';
}

function epAutoresList(model){
  const explicitAutores = String(model?.autores ?? '').trim()
    ? String(model.autores).split(';').map(s => s.trim()).filter(Boolean)
    : [];
  if (explicitAutores.length) return explicitAutores;

  const autoresClave = model?.autoresClave && typeof model.autoresClave === 'object' ? model.autoresClave : {};
  return [
    ...epArray(autoresClave.filosoficos),
    ...epArray(autoresClave.psicologicos),
    ...epArray(autoresClave.clinicos)
  ].map(epGetItemLabel).filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);
}

function renderAiImageNotice(){
  const notice = uiText('image.aiNotice', 'Foto recreada con IA a partir de imágenes públicas del autor, con fines educativos.');
  return `<div class="mp-aiImageNotice">
    <span class="mp-aiImageInfo" tabindex="0" aria-label="${escapeHtml(notice)}">
      i
      <span class="mp-aiImageInfoText">${escapeHtml(notice)}</span>
    </span>
  </div>`;
}

function EpistemologiaFicha({ model }){
  const col = colorForSchoolLabel(model?.grupo) || '#ffffff';
  const grupo = schoolDisplayLabel(epCleanText(model?.grupo)) || uiText('epistemology.plural', 'Epistemologías');
  const brief = epCleanText(model?.definicionBreve);
  const descripcion = epCleanText(model?.descripcion);
  const pregunta = epCleanText(model?.preguntaCentral);
  const advertencia = epCleanText(model?.advertenciaEpistemologica);
  const autoresList = epAutoresList(model);
  const autoresDisplay = autoresList.length ? autoresList.join(' · ') : '—';
  const headerModel = { ...model, autores: epCleanText(model?.autores) || autoresList.join('; ') };
  const fotoUrl = resolveAuthorPhotoUrl(headerModel);
  const headerLifeImageUrl = getValidatedModelHeaderLifeImageUrl(headerModel);
  const quoteRaw = [model?.frase, model?.fraseCorta, model?.cita, model?.quote, brief]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean) || '';

  const authorHTML =
    '<div class="mp-author mp-author-wrap">' +
      (fotoUrl
        ? '<img class="mp-author-photo" src="' + fotoUrl + '" data-photo-url="' + fotoUrl + '" alt="' + escapeHtml(autoresDisplay) + '" loading="eager" decoding="async" fetchpriority="high">'
        : '<div class="mp-author-photo" aria-hidden="true"></div>'
      ) +
      '<div class="mp-author-text">' +
        '<div class="mp-author-name">' + autoresList.map((a, i) =>
          `<span class="mp-author-part is-active" data-author-index="${i}">${escapeHtml(a)}</span>`
        ).join('<span class="mp-author-sep"> &middot; </span>') +
        '</div>' +
        '<div class="mp-author-meta"></div>' +
      '</div>' +
    '</div>';

  const heroBgHtml = headerLifeImageUrl
    ? `<div class="ed-hero-bg"><img src="${escapeHtml(headerLifeImageUrl)}" alt="" loading="eager" decoding="async" fetchpriority="high"><span class="ed-hero-scrim"></span></div>`
    : '';

  const factsHtml = [
    autoresList.length ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('epistemology.keyThinkers', 'Pensadores clave'))}</span><span class="ed-fact-v">${escapeHtml(autoresDisplay)}</span></div>` : '',
    model?.year ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('epistemology.period', 'Período'))}</span><span class="ed-fact-v">${escapeHtml(model.year)}</span></div>` : '',
    (model?.ciudad || model?.pais) ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('epistemology.origin', 'Origen'))}</span><span class="ed-fact-v">${escapeHtml([cityDisplayLabel(model?.ciudad), countryDisplayLabel(model?.pais)].filter(Boolean).join(' · '))}</span></div>` : '',
    model?.universidad ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('epistemology.institution', 'Institución'))}</span><span class="ed-fact-v">${escapeHtml(institutionDisplayLabel(model.universidad))}</span></div>` : ''
  ].filter(Boolean).join('');

  // Pre-compute section blocks
  const conceptionsData  = epRenderConceptions(model);
  const authorGroupsHtml = epRenderAuthorGroups(model?.autoresClave);
  const nomLiterHtml     = epRenderChips(model?.nombresLiteratura);
  const supuestosHtml    = epRenderMixedItems(model?.supuestosPrincipales);
  const implicHtml       = epRenderMixedItems(model?.implicacionesClinicas);
  const relacionadosHtml = epRenderChips(model?.modelosRelacionados, { linkModels:true });
  const afinidadesHtml   = epRenderChips(model?.afinidades);
  const tensionesHtml    = epRenderMixedItems(model?.tensiones);
  const riesgosHtml      = epRenderMixedItems(model?.riesgosClinicos);
  const refsHtml         = epRenderRefs(model?.refs);
  const controversiaHtml = renderControversia(model, { editorial:true });
  const debateHtml       = renderDebateCritico(model, { editorial:true });

  const hasChap01 = !!(pregunta || descripcion);
  const hasChap02 = !!conceptionsData;
  const hasChap03 = !!(authorGroupsHtml || nomLiterHtml);
  const hasChap04 = !!(supuestosHtml || implicHtml);
  const hasChap05 = !!(relacionadosHtml || afinidadesHtml || tensionesHtml || riesgosHtml);
  const hasChap06 = !!(advertencia || refsHtml);

  let chapNum = 0;
  const nextChap = () => String(++chapNum).padStart(2, '0');

  const chBlock = (title, html) => html
    ? `<div class="ep-ch-block"><h4>${escapeHtml(title)}</h4>${html}</div>`
    : '';

  return `
    <div class="ed-ficha ep-ficha-ed" style="--ed-accent:${col}">

      <div class="ed-hero${headerLifeImageUrl ? ' has-bg' : ''}" id="ep-cover" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.cover', 'Portada'))}">
        ${heroBgHtml}
        ${headerLifeImageUrl ? renderAiImageNotice() : ''}
        <div class="ed-hero-inner">
          <p class="ed-eyebrow">
            <span class="ed-rule"></span>${escapeHtml(grupo)} · ${escapeHtml(uiText('epistemology.label', 'Epistemología'))}${model?.year ? ' · ' + escapeHtml(model.year) : ''}
          </p>
          <h1 class="mp-title ed-title">${escapeHtml(model?.label || uiText('epistemology.label', 'Epistemología'))}</h1>
          ${authorHTML}
          ${quoteRaw ? `<blockquote class="ed-quote">${escapeHtml(quoteRaw)}</blockquote>` : ''}
          ${factsHtml ? `<div class="ed-facts">${factsHtml}</div>` : ''}
        </div>
      </div>

      ${hasChap01 ? `
      <section class="ed-chapter" id="ep-section-marco" data-smh-section data-smh-label="${escapeHtml(uiText('epistemology.framework', 'Marco epistemológico'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('epistemology.framework', 'Marco epistemológico'))}</h2></div>
        </div>
        ${pregunta ? `
        <div class="ep-pregunta-ed">
          <p class="ep-pregunta-label">${escapeHtml(uiText('epistemology.centralQuestion', 'Pregunta central'))}</p>
          <p class="ep-questionText">${escapeHtml(pregunta)}</p>
        </div>` : ''}
        ${descripcion ? `<p class="ed-lead ep-lead-nodrop">${escapeHtml(descripcion)}</p>` : ''}
      </section>` : ''}

      ${controversiaHtml ? `
      <section class="ed-chapter ed-alt ep-criticalChapter" id="ep-section-controversia" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.controversyDegree', 'Grado de controversia'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.criticalReading', 'Lectura crítica'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.controversyDegree', 'Grado de controversia'))}</h2></div>
        </div>
        ${controversiaHtml}
      </section>` : ''}

      ${debateHtml ? `
      <section class="ed-chapter ep-criticalChapter" id="ep-section-debate" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.criticalDebate', 'Debate crítico'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.counterpoint', 'Contrapunto'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.criticalDebate', 'Debate crítico'))}</h2></div>
        </div>
        ${debateHtml}
      </section>` : ''}

      ${hasChap02 ? `
      <section class="ed-chapter ed-alt ep-conceptionsChapter" id="ep-section-conceptions" data-smh-section data-smh-label="${escapeHtml(uiText('epistemology.fundamentalConceptions', 'Concepciones fundamentales'))}">
        ${conceptionsData.rows.map((row, index) => `
          <input class="ep-conception-radio" type="radio" name="ep_conception_${escapeHtml(String(model?.id || model?.label || 'ep'))}" id="ep_conception_${escapeHtml(String(model?.id || model?.label || 'ep').replace(/[^a-zA-Z0-9_-]+/g, '_'))}_${row.key}" data-key="${row.key}" ${index === 0 ? 'checked' : ''}>
        `).join('')}
        <div class="ep-conceptionsEditorial">
          <aside class="ep-conceptionsIntro">
            <div class="ed-chap-head">
              <span class="ed-chap-num">${nextChap()}</span>
              <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('epistemology.fundamentalConceptions', 'Concepciones fundamentales'))}</h2></div>
            </div>
            <p class="ep-conceptionsDeck">${escapeHtml(uiText('epistemology.conceptionsDeck', 'Cuatro preguntas sitúan el marco epistemológico: qué entiende por verdad, sujeto, cambio y función terapéutica.'))}</p>
            <nav class="ep-conception-tabs" aria-label="${escapeHtml(uiText('epistemology.fundamentalConceptions', 'Concepciones fundamentales'))}">
              <p class="ep-conception-indexLabel">${escapeHtml(uiText('epistemology.inThisSection', 'En este apartado'))}</p>
              ${conceptionsData.rows.map(row => `
                <label class="ep-conception-tab" data-key="${row.key}" for="ep_conception_${escapeHtml(String(model?.id || model?.label || 'ep').replace(/[^a-zA-Z0-9_-]+/g, '_'))}_${row.key}">
                  <span class="ep-conception-tabRoman">${row.roman}</span>
                  <span class="ep-conception-tabCopy">
                    <span class="ep-conception-tabName">${row.name}</span>
                    <span class="ep-conception-tabRole">${row.role}</span>
                  </span>
                </label>
              `).join('')}
            </nav>
            <button type="button" class="ep-table-link ep-table-link-chap" data-action="open-ep-comparison-table">${escapeHtml(uiText('epistemology.viewComparison', 'Ver tabla comparativa'))}</button>
          </aside>
          ${conceptionsData.cardsHtml}
        </div>
      </section>` : ''}

      ${hasChap03 ? `
      <section class="ed-chapter" id="ep-section-authors" data-smh-section data-smh-label="${escapeHtml(uiText('epistemology.authorsTradition', 'Autores y tradición'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('epistemology.authorsTradition', 'Autores y tradición'))}</h2></div>
        </div>
        ${chBlock(uiText('epistemology.keyAuthors', 'Autores clave'), authorGroupsHtml)}
        ${chBlock(uiText('epistemology.literatureNames', 'Nombres en la literatura'), nomLiterHtml)}
      </section>` : ''}

      ${hasChap04 ? `
      <section class="ed-chapter ed-alt" id="ep-section-clinica" data-smh-section data-smh-label="${escapeHtml(uiText('epistemology.clinicalApplication', 'Clínica y aplicación'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('epistemology.clinicalApplication', 'Clínica y aplicación'))}</h2></div>
        </div>
        ${chBlock(uiText('epistemology.mainAssumptions', 'Supuestos principales'), supuestosHtml)}
        ${chBlock(uiText('epistemology.clinicalImplications', 'Implicaciones clínicas'), implicHtml)}
      </section>` : ''}

      ${hasChap05 ? `
      <section class="ed-chapter" id="ep-section-mapa" data-smh-section data-smh-label="${escapeHtml(uiText('epistemology.map', 'Mapa epistemológico'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('epistemology.map', 'Mapa epistemológico'))}</h2></div>
        </div>
        ${chBlock(uiText('epistemology.relatedModels', 'Modelos relacionados'), relacionadosHtml)}
        ${chBlock(uiText('epistemology.affinities', 'Afinidades epistemológicas'), afinidadesHtml)}
        ${chBlock(uiText('epistemology.tensions', 'Tensiones y diferencias'), tensionesHtml)}
        ${chBlock(uiText('epistemology.extremeRisks', 'Riesgos clínicos si se lleva al extremo'), riesgosHtml)}
      </section>` : ''}

      ${hasChap06 ? `
      <section class="ed-chapter ed-alt" id="ep-section-refs" data-smh-section data-smh-label="${escapeHtml(uiText('epistemology.notesReferences', 'Notas y referencias'))}">
        <div class="ed-chap-head">
          <span class="ed-chap-num">${nextChap()}</span>
          <div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('epistemology.notesReferences', 'Notas y referencias'))}</h2></div>
        </div>
        ${advertencia ? `<div class="ep-notice ep-ch-block"><p class="ep-itemText">${escapeHtml(advertencia)}</p></div>` : ''}
        ${chBlock(uiText('fiche.references', 'Referencias'), refsHtml)}
      </section>` : ''}

    </div>`;
}

function bindEpistemologiaFicha(host){
  if (!host || host.__epistemologiaBound) return;
  host.__epistemologiaBound = true;
  host.addEventListener('click', async (evt) => {
    const tableBtn = evt.target.closest('[data-action="open-ep-comparison-table"]');
    if (tableBtn && host.contains(tableBtn)){
      evt.preventDefault();
      openEpistemologiaComparisonModal();
      return;
    }

    const btn = evt.target.closest('[data-action="open-ep-related-model"]');
    if (!btn || !host.contains(btn)) return;
    const id = btn.getAttribute('data-id') || '';
    if (!id) return;
    await openModel(id);
  });
}

function influenceGraphSlug(value){
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

async function loadInfluenceGraphIndex(){
  loadInfluenceGraphIndex.promise = loadInfluenceGraphIndex.promise || fetchFirstJson(
    dataUrlCandidates('Core/Influencias/modelos_influencias.json', { raw:true }),
    {
      bust:false,
      quiet:true,
      timeoutMs:5200
    }
  ).then((data) => Array.isArray(data) ? data : []).catch(() => []);

  return loadInfluenceGraphIndex.promise;
}

function influenceGraphModelKeys(model){
  return [
    model?.id,
    model?.modeloId,
    model?.slug,
    model?.label,
    model?.nombre,
    model?.titulo,
    model?.file,
    model?.archivo
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .flatMap((value) => {
      const file = value.split(/[\\/]/).pop().replace(/\.json$/i, '');
      return [value, file, influenceGraphSlug(value), influenceGraphSlug(file)];
    })
    .map(influenceGraphSlug)
    .filter(Boolean);
}

function influenceGraphInternalModelValues(data){
  const direct = [
    data?.modelo,
    data?.modeloId,
    data?.modelo_id,
    data?.modeloCentral,
    data?.modelo_central,
    data?.modeloOrigen,
    data?.modelo_origen,
    data?.id,
    data?.slug,
    data?.nombre,
    data?.name,
    data?.label,
    data?.titulo,
    data?.title
  ];

  const nested = [
    data?.nodo?.id,
    data?.nodo?.label,
    data?.nodo?.nombre,
    data?.nodo?.titulo,
    data?.modelo?.id,
    data?.modelo?.nombre,
    data?.modelo?.label,
    data?.modelo?.titulo,
    data?.modeloCentral?.id,
    data?.modeloCentral?.nombre,
    data?.modeloCentral?.label,
    data?.modelo_central?.id,
    data?.modelo_central?.nombre,
    data?.modelo_central?.label
  ];

  return [...direct, ...nested]
    .map((value) => normalizeInfluenceGraphEntry(value))
    .filter(Boolean)
    .flatMap((value) => [value, influenceGraphSlug(value)])
    .map(influenceGraphSlug)
    .filter(Boolean);
}

function influenceGraphDataMatchesModel(data, model){
  const modelKeys = new Set(influenceGraphModelKeys(model));
  const dataKeys = influenceGraphInternalModelValues(data);
  return dataKeys.some((key) => modelKeys.has(key));
}

async function loadInfluenceGraphData(model){
  const id = String(model?.id || model?.modeloId || '').trim();
  loadInfluenceGraphData.cache = loadInfluenceGraphData.cache || new Map();
  const cache = loadInfluenceGraphData.cache;
  const cacheKey = `${String(model?.grupo || '')}::${id || String(model?.label || '')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const promise = (async () => {
    const index = await loadInfluenceGraphIndex();
    return (Array.isArray(index) ? index : []).find((entry) => influenceGraphDataMatchesModel(entry, model)) || null;
  })();

  cache.set(cacheKey, promise);
  return promise;
}

function influenceGraphJustificationFolders(model){
  const group = String(model?.grupo || model?.group || '').trim();
  const key = influenceGraphSlug(group);
  const aliases = {
    'psicoanalisis': 'Psicoanálisis',
    'conductismo': 'Conductismo',
    'cognitivo': 'Cognitivo',
    'humanista': 'Humanista',
    'sistemico': 'Sistemico',
    'constructivista': 'Constructivismo',
    'constructivismo': 'Constructivismo',
    'integrativo': 'Integrativo',
    'transversal': 'Transversal',
    'otros': 'Otros',
    'epistemologia': 'Epistemología',
    'epistemologias': 'Epistemología',
    'epistemologias-base': 'Epistemología'
  };
  return [...new Set([aliases[key], group].filter(Boolean))];
}

async function loadInfluenceGraphJustifications(model){
  loadInfluenceGraphJustifications.cache = loadInfluenceGraphJustifications.cache || new Map();
  const folders = influenceGraphJustificationFolders(model);
  const cacheKey = folders.join('|') || 'none';
  const cache = loadInfluenceGraphJustifications.cache;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const promise = fetchFirstJson(
    folders.flatMap((folder) => dataUrlCandidates(`Core/Influencias/${folder}/justificacion.json`, { raw:true })),
    { bust:false, quiet:true, timeoutMs:4200 }
  ).then((data) => data && typeof data === 'object' ? data : {}).catch(() => ({}));

  cache.set(cacheKey, promise);
  return promise;
}

function influenceGraphEdgeKey(source, target){
  const from = influenceGraphSlug(source);
  const to = influenceGraphSlug(target);
  return from && to ? `${from}__${to}` : '';
}

function indexInfluenceGraphJustifications(data){
  const index = new Map();
  if (!data || typeof data !== 'object') return index;

  Object.entries(data).forEach(([rawKey, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const text = String(entry.justificacion || entry.justificación || '').trim();
    if (!text) return;

    const source = String(entry.origen ?? entry.source ?? entry.from ?? '').trim();
    const target = String(entry.destino ?? entry.target ?? entry.to ?? '').trim();
    const directKey = influenceGraphEdgeKey(source, target);
    if (directKey) index.set(directKey, text);

    const parts = String(rawKey).split('__');
    if (parts.length === 2){
      const keyed = influenceGraphEdgeKey(parts[0], parts[1]);
      if (keyed && !index.has(keyed)) index.set(keyed, text);
    }
  });

  return index;
}

function findInfluenceGraphJustification(index, sources, targets){
  if (!(index instanceof Map) || !index.size) return '';
  const fromValues = (Array.isArray(sources) ? sources : [sources]).filter(Boolean);
  const toValues = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
  for (const source of fromValues){
    for (const target of toValues){
      const text = index.get(influenceGraphEdgeKey(source, target));
      if (text) return text;
    }
  }
  return '';
}

function normalizeInfluenceGraphEntry(entry){
  if (entry == null) return '';
  if (typeof entry === 'string' || typeof entry === 'number') return String(entry).trim();
  if (typeof entry !== 'object') return '';

  return String(pickModelValue(entry, [
    'modelo',
    'modeloNombre',
    'modelo_nombre',
    'nombre',
    'name',
    'label',
    'titulo',
    'title',
    'id'
  ]) ?? '').trim();
}

function normalizeInfluenceGraphItem(entry){
  if (entry == null) return null;
  if (typeof entry === 'string' || typeof entry === 'number'){
    const label = String(entry).trim();
    return label ? { id:'', label } : null;
  }
  if (typeof entry !== 'object') return null;

  const id = String(pickModelValue(entry, [
    'id',
    'modeloId',
    'modelo_id',
    'slug'
  ]) ?? '').trim();
  const label = normalizeInfluenceGraphEntry(entry);
  if (!id && !label) return null;
  return { id, label: label || id };
}

function normalizeInfluenceGraphList(value){
  const raw = Array.isArray(value)
    ? value
    : (value && typeof value === 'object' ? Object.values(value) : []);

  const seen = new Set();
  return raw
    .map(normalizeInfluenceGraphItem)
    .filter(Boolean)
    .filter((item) => {
      const key = influenceGraphSlug(item.id || item.label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);
}

function resolveInfluenceGraphNodeItem(value){
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const key = influenceGraphSlug(raw);
  const pool = typeof getAllModelsPool === 'function' ? getAllModelsPool() : [];
  const found = (Array.isArray(pool) ? pool : []).find((model) => {
    const values = [
      model?.id,
      model?.modeloId,
      model?.slug,
      model?.label,
      model?.nombre,
      model?.titulo
    ];
    return values.some((candidate) => influenceGraphSlug(candidate) === key);
  });

  return {
    id: String(found?.id || raw).trim(),
    label: String(found?.label || found?.nombre || raw).trim()
  };
}

function parseInfluenceGraphEdges(data, model, justificationIndex){
  const edges = Array.isArray(data?.aristas) ? data.aristas : [];
  if (!edges.length) return { up: [], down: [] };

  const modelKeys = new Set([
    ...influenceGraphModelKeys(model),
    ...influenceGraphInternalModelValues(data)
  ]);
  const up = [];
  const down = [];

  edges.forEach((edge) => {
    if (!edge || typeof edge !== 'object') return;
    const source = String(edge.source ?? edge.origen ?? edge.from ?? '').trim();
    const target = String(edge.target ?? edge.destino ?? edge.to ?? '').trim();
    if (!source || !target) return;

    const sourceKey = influenceGraphSlug(source);
    const targetKey = influenceGraphSlug(target);

    if (modelKeys.has(sourceKey)){
      const item = resolveInfluenceGraphNodeItem(target);
      if (item) item.justificacion = findInfluenceGraphJustification(justificationIndex, source, target);
      if (item && !down.some((row) => influenceGraphSlug(row.id || row.label) === influenceGraphSlug(item.id || item.label))) down.push(item);
      return;
    }

    if (modelKeys.has(targetKey)){
      const item = resolveInfluenceGraphNodeItem(source);
      if (item) item.justificacion = findInfluenceGraphJustification(justificationIndex, source, target);
      if (item && !up.some((row) => influenceGraphSlug(row.id || row.label) === influenceGraphSlug(item.id || item.label))) up.push(item);
    }
  });

  return { up: up.slice(0, 7), down: down.slice(0, 7) };
}

function parseInfluenceGraphData(data, model, justifications){
  const hasJsonData = !!data && typeof data === 'object' && Object.keys(data).length > 0;
  const justificationIndex = indexInfluenceGraphJustifications(justifications);
  const edgeGraph = parseInfluenceGraphEdges(data, model, justificationIndex);
  const epistemologies = normalizeInfluenceGraphList(pickModelValue(data, [
    'epistemologias',
    'epistemologies',
    'marcosEpistemologicos',
    'marcos_epistemologicos'
  ]));
  const up = edgeGraph.up.length ? edgeGraph.up : normalizeInfluenceGraphList(pickModelValue(data, [
    'ascendentes',
    'influenciasAscendentes',
    'influencias_ascendentes',
    'influenciasRecibidas',
    'influencias_recibidas',
    'influidoPor',
    'influido_por',
    'antecedentes',
    'fuentes',
    'influencias'
  ]));

  const down = edgeGraph.down.length ? edgeGraph.down : normalizeInfluenceGraphList(pickModelValue(data, [
    'descendentes',
    'influenciasDescendentes',
    'influencias_descendentes',
    'influidos',
    'influyeEn',
    'influye_en',
    'posteriores',
    'derivaciones',
    'legado'
  ]));

  if (!hasJsonData && !up.length && Array.isArray(model?.influencias)){
    up.push(...normalizeInfluenceGraphList(model.influencias).slice(0, 7));
  }

  const centerValues = [
    ...influenceGraphModelKeys(model),
    ...influenceGraphInternalModelValues(data)
  ];
  up.forEach((item) => {
    if (!item.justificacion){
      item.justificacion = findInfluenceGraphJustification(
        justificationIndex,
        [item.id, item.label],
        centerValues
      );
    }
  });
  down.forEach((item) => {
    if (!item.justificacion){
      item.justificacion = findInfluenceGraphJustification(
        justificationIndex,
        centerValues,
        [item.id, item.label]
      );
    }
  });

  return { up, down, epistemologies };
}

function renderInfluenceGraphShell(model){
  const key = escapeHtml(String(model?.id || model?.modeloId || influenceGraphSlug(model?.label || '') || 'model'));
  return `
    <div class="mp-influenceGraph influence-graph-card" data-influence-graph="${key}">
      <div class="mp-influenceGraphHead">
        <div class="mp-influenceGraphLabel is-left">${escapeHtml(uiText('influence.influencedBy', 'influenciado por'))}</div>
        <div class="mp-influenceGraphLabel is-center">${escapeHtml(uiText('epistemology.label', 'Epistemología'))}</div>
        <div class="mp-influenceGraphLabel is-right">${escapeHtml(uiText('influence.influences', 'influencia a'))}</div>
      </div>
      <div class="mp-influenceGraphState">${escapeHtml(uiText('influence.loadingMap', 'Cargando mapa de influencias...'))}</div>
    </div>`;
}

function influenceGraphNode(item, x, y, extraClass = '', graphAttrs = ''){
  const normalized = (item && typeof item === 'object')
    ? item
    : { id:'', label:String(item ?? '').trim() };
  const label = normalized.label || normalized.id || '';
  const id = String(normalized.id || '').trim();
  const justificacion = String(normalized.justificacion || '').trim();
  const actionAttrs = id
    ? ` role="button" data-action="open-influence-model" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(uiText('common.openNamed', 'Abrir {name}', { name:label }))}"`
    : '';
  const justificationAttrs = justificacion
    ? ` data-has-justification="1" data-influence-justification="${escapeHtml(justificacion)}"`
    : '';
  const nodeContent = extraClass.split(/\s+/).includes('is-center')
    ? `<span><span class="mp-influenceNodeKicker">${escapeHtml(uiText('influence.theModel', 'El modelo'))}</span>${escapeHtml(label)}</span>`
    : escapeHtml(label);
  return `<div class="mp-influenceNode ${extraClass}" style="--x:${x}%;--y:${y}%" tabindex="0"${actionAttrs}${justificationAttrs}${graphAttrs}>${nodeContent}</div>`;
}

function renderInfluenceGraphContent(model, graph){
  const center = { id:String(model?.id || model?.modeloId || '').trim(), label:String(model?.label || model?.nombre || uiText('common.model.one', 'Modelo')).trim() };
  const up = graph?.up || [];
  const down = graph?.down || [];
  const epistemologies = graph?.epistemologies || [];
  const graphKey = influenceGraphSlug(center.id || center.label) || 'model';
  const arrowId = `mpInfluenceArrow-${graphKey}`;

  if (!up.length && !down.length && !epistemologies.length){
    return `
      <canvas class="mp-influenceGraphDots" aria-hidden="true"></canvas>
      <div class="mp-influenceGraphHead">
        <div class="mp-influenceGraphLabel is-left">${escapeHtml(uiText('influence.influencedBy', 'influenciado por'))}</div>
        <div class="mp-influenceGraphLabel is-center">${escapeHtml(uiText('epistemology.label', 'Epistemología'))}</div>
        <div class="mp-influenceGraphLabel is-right">${escapeHtml(uiText('influence.influences', 'influencia a'))}</div>
      </div>
      <div class="mp-influenceGraphState">${escapeHtml(uiText('influence.notEnough', 'No hay suficientes influencias para dibujar la gráfica.'))}</div>`;
  }

  const upRows = up.length ? up : [{ id:'', label:uiText('influence.noPredecessors', 'Sin ascendentes definidos') }];
  const downRows = down.length ? down : [{ id:'', label:uiText('influence.noSuccessors', 'Sin descendentes definidos') }];
  const rowY = (rows, index) => rows.length === 1 ? 50 : 18 + (64 / Math.max(1, rows.length - 1)) * index;
  const epSpread = epistemologies.length <= 1
    ? 0
    : Math.min(36, Math.max(22, (epistemologies.length - 1) * 17));
  const epX = (rows, index) => rows.length === 1 ? 50 : 50 - (epSpread / 2) + (epSpread / Math.max(1, rows.length - 1)) * index;
  const epY = 9;

  const upNodes = upRows.map((label, i) => influenceGraphNode(label, 18, rowY(upRows, i), up.length ? 'is-up' : 'is-empty', up.length ? ' data-influence-node="up"' : '')).join('');
  const downNodes = downRows.map((label, i) => influenceGraphNode(label, 82, rowY(downRows, i), down.length ? 'is-down' : 'is-empty', down.length ? ' data-influence-node="down"' : '')).join('');
  const epNodes = epistemologies.map((item, i) => influenceGraphNode(item, epX(epistemologies, i), epY, 'is-epistemology', ' data-influence-node="ep"')).join('');

  return `
    <canvas class="mp-influenceGraphDots" aria-hidden="true"></canvas>
    <div class="influence-graph-mobile-shell">
      <button class="influence-graph-nav influence-graph-nav-left" type="button" aria-label="${escapeHtml(uiText('influence.viewLeft', 'Ver parte izquierda de la gráfica'))}" data-influence-graph-nav="left">&lsaquo;</button>
      <div class="influence-graph-viewport">
        <div class="influence-graph-track">
          <div class="mp-influenceGraphHead">
            <div class="mp-influenceGraphLabel is-left">${escapeHtml(uiText('influence.influencedBy', 'influenciado por'))}</div>
            <div class="mp-influenceGraphLabel is-center">${escapeHtml(uiText('epistemology.label', 'Epistemología'))}</div>
            <div class="mp-influenceGraphLabel is-right">${escapeHtml(uiText('influence.influences', 'influencia a'))}</div>
          </div>
          <div class="mp-influenceGraphStage">
            <svg class="mp-influenceGraphSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-arrow-id="${arrowId}">
              <defs>
                <marker id="${arrowId}" viewBox="0 0 6 6" refX="5.25" refY="3" markerWidth="6.2" markerHeight="6.2" orient="auto">
                  <path class="mp-influenceArrow" d="M 0 0 L 6 3 L 0 6 z" fill="rgba(220,230,240,.82)" stroke="none"></path>
                </marker>
              </defs>
            </svg>
            ${epNodes}
            ${upNodes}
            ${influenceGraphNode(center, 50, 50, 'is-center', ' data-influence-node="center"')}
            ${downNodes}
          </div>
        </div>
      </div>
      <button class="influence-graph-nav influence-graph-nav-right" type="button" aria-label="${escapeHtml(uiText('influence.viewRight', 'Ver parte derecha de la gráfica'))}" data-influence-graph-nav="right">&rsaquo;</button>
    </div>
    <div class="mp-influenceJustificationTooltip" role="tooltip" hidden>
      <strong>${escapeHtml(uiText('influence.justification', 'Justificación de la influencia'))}</strong>
      <span></span>
    </div>`;
}

function syncInfluenceGraphMobileNav(host){
  const shell = host?.querySelector?.('.influence-graph-mobile-shell');
  const viewport = host?.querySelector?.('.influence-graph-viewport');
  const track = host?.querySelector?.('.influence-graph-track');
  const leftBtn = host?.querySelector?.('[data-influence-graph-nav="left"]');
  const rightBtn = host?.querySelector?.('[data-influence-graph-nav="right"]');
  if (!shell || !viewport || !track || !leftBtn || !rightBtn) return;

  const hostWidth = host.getBoundingClientRect().width || window.innerWidth;
  const narrow = hostWidth <= 768 || window.innerWidth <= 768;
  host.classList.toggle('is-influenceGraph-narrow', narrow);

  if (!narrow){
    track.style.setProperty('--influence-graph-shift', '0px');
    leftBtn.disabled = true;
    rightBtn.disabled = true;
    shell.dataset.mobileActive = '0';
    return;
  }

  const maxShift = Math.max(0, track.getBoundingClientRect().width - viewport.getBoundingClientRect().width);
  const active = maxShift > 1;

  if (!active){
    track.style.setProperty('--influence-graph-shift', '0px');
    leftBtn.disabled = true;
    rightBtn.disabled = true;
    shell.dataset.mobileActive = '0';
    return;
  }

  const state = host.__influenceGraphMobileState || (host.__influenceGraphMobileState = { position:1 });
  state.position = Math.max(0, Math.min(2, Number(state.position ?? 1)));
  const shifts = [0, maxShift / 2, maxShift];
  track.style.setProperty('--influence-graph-shift', `${(-shifts[state.position]).toFixed(2)}px`);
  leftBtn.disabled = state.position === 0;
  rightBtn.disabled = state.position === 2;
  shell.dataset.mobileActive = '1';
}

function bindInfluenceGraphMobileNav(host){
  if (!host || host.__influenceGraphMobileNavBound) return;
  host.__influenceGraphMobileNavBound = true;
  host.__influenceGraphMobileState = host.__influenceGraphMobileState || { position:1 };

  const moveInfluenceGraphMobile = (direction) => {
    const state = host.__influenceGraphMobileState || (host.__influenceGraphMobileState = { position:1 });
    const next = Math.max(0, Math.min(2, Number(state.position ?? 1) + direction));
    if (next === state.position) return;
    state.position = next;
    syncInfluenceGraphMobileNav(host);
    requestAnimationFrame(() => layoutInfluenceGraphSvg(host));
  };

  host.querySelectorAll('[data-influence-graph-nav]').forEach((btn) => {
    btn.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const direction = btn.getAttribute('data-influence-graph-nav') === 'right' ? 1 : -1;
      moveInfluenceGraphMobile(direction);
    });
  });

  const viewport = host.querySelector('.influence-graph-viewport');
  if (viewport){
    const swipe = { active:false, sx:0, sy:0, dx:0, dy:0, lockX:false };

    viewport.addEventListener('touchstart', (evt) => {
      if (!evt.touches || evt.touches.length !== 1) return;
      const shell = host.querySelector('.influence-graph-mobile-shell');
      if (shell?.dataset.mobileActive !== '1') return;
      const t = evt.touches[0];
      swipe.active = true;
      swipe.sx = t.clientX;
      swipe.sy = t.clientY;
      swipe.dx = 0;
      swipe.dy = 0;
      swipe.lockX = false;
    }, { passive:true });

    viewport.addEventListener('touchmove', (evt) => {
      if (!swipe.active || !evt.touches || !evt.touches.length) return;
      const t = evt.touches[0];
      swipe.dx = t.clientX - swipe.sx;
      swipe.dy = t.clientY - swipe.sy;
      if (!swipe.lockX && Math.abs(swipe.dx) > 12 && Math.abs(swipe.dx) > Math.abs(swipe.dy) * 1.2){
        swipe.lockX = true;
      }
      if (swipe.lockX) evt.preventDefault();
    }, { passive:false });

    viewport.addEventListener('touchend', (evt) => {
      if (!swipe.active) return;
      swipe.active = false;
      if (!swipe.lockX || Math.abs(swipe.dx) < 56) return;
      evt.preventDefault();
      evt.stopPropagation();
      moveInfluenceGraphMobile(swipe.dx < 0 ? 1 : -1);
    });

    viewport.addEventListener('touchcancel', () => {
      swipe.active = false;
    });
  }

  syncInfluenceGraphMobileNav(host);
}

function layoutInfluenceGraphSvg(host){
  const stage = host?.querySelector?.('.mp-influenceGraphStage');
  const svg = host?.querySelector?.('.mp-influenceGraphSvg');
  const center = host?.querySelector?.('[data-influence-node="center"]');
  if (!stage || !svg || !center) return;

  const stageRect = stage.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return;

  const svgNs = 'http://www.w3.org/2000/svg';
  const arrowId = svg.dataset.arrowId || '';
  const defs = svg.querySelector('defs')?.cloneNode(true);
  svg.replaceChildren();
  if (defs) svg.appendChild(defs);
  svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  const point = (el, side) => {
    const r = el.getBoundingClientRect();
    const x = side === 'left' ? r.left : side === 'right' ? r.right : r.left + (r.width / 2);
    const y = side === 'top' ? r.top : side === 'bottom' ? r.bottom : r.top + (r.height / 2);
    return { x:x - stageRect.left, y:y - stageRect.top };
  };

  const addPath = (d, cls, marker = false) => {
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('class', `mp-influenceEdge ${cls || ''}`);
    path.setAttribute('d', d);
    if (marker && arrowId) path.setAttribute('marker-end', `url(#${arrowId})`);
    svg.appendChild(path);
  };

  const addConnector = ({ x, y }, cls) => {
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('class', `mp-influenceConnector ${cls || ''}`);
    circle.setAttribute('cx', x.toFixed(2));
    circle.setAttribute('cy', y.toFixed(2));
    circle.setAttribute('r', '3');
    svg.appendChild(circle);
  };

  const centerLeft = point(center, 'left');
  const centerRight = point(center, 'right');
  const centerTop = point(center, 'top');

  host.querySelectorAll('[data-influence-node="up"]').forEach((node) => {
    const start = point(node, 'right');
    const end = { x:centerLeft.x - 7, y:centerLeft.y };
    const curve = Math.max(34, Math.min(120, (end.x - start.x) * .56));
    addPath(`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${(start.x + curve).toFixed(2)} ${start.y.toFixed(2)}, ${(end.x - curve).toFixed(2)} ${end.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`, 'is-up');
    addConnector(start, 'is-up');
  });

  host.querySelectorAll('[data-influence-node="ep"]').forEach((node) => {
    const start = point(node, 'bottom');
    const end = { x:centerTop.x, y:centerTop.y - 7 };
    const curve = Math.max(34, Math.min(86, (end.y - start.y) * .62));
    addPath(`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${start.x.toFixed(2)} ${(start.y + curve).toFixed(2)}, ${end.x.toFixed(2)} ${(end.y - curve).toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`, 'is-ep');
    addConnector(start, 'is-ep');
  });

  host.querySelectorAll('[data-influence-node="down"]').forEach((node) => {
    const start = { x:centerRight.x + 7, y:centerRight.y };
    const endNode = point(node, 'left');
    const end = { x:endNode.x - 12, y:endNode.y };
    const curve = Math.max(42, Math.min(130, (end.x - start.x) * .52));
    addPath(`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${(start.x + curve).toFixed(2)} ${start.y.toFixed(2)}, ${(end.x - curve).toFixed(2)} ${end.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`, 'is-down', true);
  });
}

function bindInfluenceGraphResize(host){
  if (!host || host.__influenceGraphResizeBound) return;
  host.__influenceGraphResizeBound = true;
  const render = () => {
    syncInfluenceGraphMobileNav(host);
    layoutInfluenceGraphSvg(host);
  };
  if (typeof ResizeObserver === 'function'){
    const observer = new ResizeObserver(() => requestAnimationFrame(render));
    observer.observe(host);
    observer.observe(host.querySelector('.influence-graph-viewport') || host);
    observer.observe(host.querySelector('.mp-influenceGraphStage') || host);
    host.__influenceGraphResizeObserver = observer;
    return;
  }
  window.addEventListener('resize', render, { passive:true });
}

function bindInfluenceGraphDotMotion(host){
  const canvas = host?.querySelector?.('.mp-influenceGraphDots');
  if (!host || !canvas || canvas.__influenceDotsBound) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  canvas.__influenceDotsBound = true;

  const state = {
    width:0,
    height:0,
    dpr:1,
    x:-9999,
    y:-9999,
    targetX:-9999,
    targetY:-9999,
    active:false,
    raf:0
  };

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width === state.width && height === state.height && dpr === state.dpr) return;
    state.width = width;
    state.height = height;
    state.dpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    resize();
    ctx.clearRect(0, 0, state.width, state.height);
    const spacing = 18;
    const radius = 88;
    for (let y = 1; y <= state.height + spacing; y += spacing){
      for (let x = 1; x <= state.width + spacing; x += spacing){
        const dx = x - state.x;
        const dy = y - state.y;
        const near = state.active ? Math.max(0, 1 - (Math.hypot(dx, dy) / radius)) : 0;
        const eased = near * near * (3 - (2 * near));
        const dotRadius = 0.78 + eased * 0.82;
        const alpha = 0.048 + eased * 0.075;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }
  };

  const tick = () => {
    state.x += (state.targetX - state.x) * 0.14;
    state.y += (state.targetY - state.y) * 0.14;
    draw();
    const moving = Math.abs(state.targetX - state.x) > 0.5 || Math.abs(state.targetY - state.y) > 0.5;
    if (state.active || moving){
      state.raf = requestAnimationFrame(tick);
      return;
    }
    state.raf = 0;
  };

  const start = () => {
    if (!state.raf) state.raf = requestAnimationFrame(tick);
  };

  host.addEventListener('pointermove', (evt) => {
    const rect = host.getBoundingClientRect();
    state.targetX = evt.clientX - rect.left;
    state.targetY = evt.clientY - rect.top;
    if (!state.active){
      state.x = state.targetX;
      state.y = state.targetY;
    }
    state.active = true;
    start();
  }, { passive:true });

  host.addEventListener('pointerleave', () => {
    state.active = false;
    state.targetX = -9999;
    state.targetY = -9999;
    start();
  }, { passive:true });

  if (typeof ResizeObserver === 'function'){
    const observer = new ResizeObserver(() => requestAnimationFrame(draw));
    observer.observe(host);
    canvas.__influenceDotsObserver = observer;
  } else {
    window.addEventListener('resize', draw, { passive:true });
  }

  draw();
}

function bindInfluenceGraphJustificationTooltip(host){
  if (!host || host.__influenceJustificationBound) return;
  const tooltip = host.querySelector('.mp-influenceJustificationTooltip');
  const text = tooltip?.querySelector('span');
  if (!tooltip || !text) return;
  host.__influenceJustificationBound = true;
  let hideTimer = 0;

  const hide = () => {
    window.clearTimeout(hideTimer);
    tooltip.classList.remove('is-on');
    hideTimer = window.setTimeout(() => {
      if (!tooltip.classList.contains('is-on')) tooltip.hidden = true;
    }, 150);
  };

  const show = (node) => {
    const value = String(node?.getAttribute('data-influence-justification') || '').trim();
    if (!value) return;
    window.clearTimeout(hideTimer);
    text.textContent = value;
    tooltip.hidden = false;
    tooltip.classList.add('is-on');

    const hostRect = host.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const width = Math.min(420, Math.max(220, hostRect.width - 24));
    tooltip.style.width = `${width}px`;
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.max(12, Math.min(
      hostRect.width - tooltipRect.width - 12,
      nodeRect.left - hostRect.left + (nodeRect.width - tooltipRect.width) / 2
    ));
    let top = nodeRect.bottom - hostRect.top + 12;
    if (top + tooltipRect.height > hostRect.height - 12){
      top = Math.max(12, nodeRect.top - hostRect.top - tooltipRect.height - 12);
    }
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  host.addEventListener('pointerover', (evt) => {
    const node = evt.target.closest('[data-influence-justification]');
    if (node && host.contains(node)) show(node);
  });
  host.addEventListener('pointerout', (evt) => {
    const node = evt.target.closest('[data-influence-justification]');
    if (!node || node.contains(evt.relatedTarget) || tooltip.contains(evt.relatedTarget)) return;
    hide();
  });
  host.addEventListener('focusin', (evt) => {
    const node = evt.target.closest('[data-influence-justification]');
    if (node && host.contains(node)) show(node);
  });
  host.addEventListener('focusout', (evt) => {
    const node = evt.target.closest('[data-influence-justification]');
    if (node && !node.contains(evt.relatedTarget)) hide();
  });
  tooltip.addEventListener('pointerenter', () => window.clearTimeout(hideTimer));
  tooltip.addEventListener('pointerleave', hide);
}

async function hydrateModelInfluenceGraph(root, model){
  const host = root?.querySelector?.('[data-influence-graph]');
  if (!host || !model || host.dataset.loaded === '1') return;
  host.dataset.loaded = '1';

  const [data, justifications] = await Promise.all([
    loadInfluenceGraphData(model),
    loadInfluenceGraphJustifications(model)
  ]);
  const graph = parseInfluenceGraphData(data || {}, model, justifications);
  if (!document.body.contains(host)) return;
  host.innerHTML = renderInfluenceGraphContent(model, graph);
  requestAnimationFrame(() => {
    bindInfluenceGraphMobileNav(host);
    syncInfluenceGraphMobileNav(host);
    layoutInfluenceGraphSvg(host);
    bindInfluenceGraphResize(host);
    bindInfluenceGraphDotMotion(host);
    bindInfluenceGraphJustificationTooltip(host);
  });
}

function bindModelInfluenceGraph(root){
  if (!root || root.__influenceGraphBound) return;
  root.__influenceGraphBound = true;

  const openInfluence = async (node) => {
    const id = String(node?.getAttribute('data-id') || '').trim();
    if (!id) return;
    if (typeof openModelFromNetworkSelection === 'function'){
      await openModelFromNetworkSelection(id);
      return;
    }
    await openModel(id);
  };

  root.addEventListener('click', (evt) => {
    const node = evt.target.closest('[data-action="open-influence-model"]');
    if (!node || !root.contains(node)) return;
    openInfluence(node).catch((e) => console.warn('No se pudo abrir la influencia:', e));
  });

  root.addEventListener('keydown', (evt) => {
    if (evt.key !== 'Enter' && evt.key !== ' ') return;
    const node = evt.target.closest('[data-action="open-influence-model"]');
    if (!node || !root.contains(node)) return;
    evt.preventDefault();
    openInfluence(node).catch((e) => console.warn('No se pudo abrir la influencia:', e));
  });
}

function isPublicModelView(model){
  return !!model && (
    model.__partial === true ||
    model.__access === 'public' ||
    model.__publicLoaded === true
  );
}

function renderPublicLockedSection(label, kind = 'accordions'){
  const accordionLabels = kind === 'practice'
    ? [uiText('locked.accordion.techniques', 'Técnicas y procedimientos'), uiText('locked.accordion.sequences', 'Secuencias'), uiText('locked.accordion.micro', 'Microintervenciones')]
    : kind === 'relationship'
      ? [uiText('locked.accordion.alliance', 'Alianza terapéutica'), uiText('locked.accordion.therapistPosition', 'Posición del terapeuta'), uiText('locked.accordion.bond', 'Vínculo y colaboración')]
      : kind === 'anatomy'
        ? [uiText('locked.accordion.concepts', 'Conceptos clave'), uiText('locked.accordion.levels', 'Niveles')]
        : [uiText('locked.accordion.life', 'Vida'), uiText('locked.accordion.era', 'Época'), uiText('locked.accordion.problemStyle', 'Problema y estilo')];

  const influenceMock = `<div class="mp-lockedInfluenceGraph" aria-hidden="true">
      <svg viewBox="0 0 1000 330" preserveAspectRatio="none">
        <path d="M285 85 C390 85 390 165 500 165"/><path d="M285 165 C385 165 405 165 500 165"/><path d="M285 245 C390 245 390 165 500 165"/>
        <path d="M500 165 C610 165 610 85 715 85"/><path d="M500 165 C610 165 610 165 715 165"/><path d="M500 165 C610 165 610 245 715 245"/>
        <path d="M500 68 C500 90 500 118 500 132" stroke-dasharray="5 7"/>
      </svg>
      <span class="mp-lockedInfluenceNode is-left is-one">${escapeHtml(uiText('locked.influence.theoretical', 'Influencia teórica'))}</span>
      <span class="mp-lockedInfluenceNode is-left is-two">${escapeHtml(uiText('locked.influence.precursor', 'Modelo precursor'))}</span>
      <span class="mp-lockedInfluenceNode is-left is-three">${escapeHtml(uiText('locked.influence.tradition', 'Tradición clínica'))}</span>
      <span class="mp-lockedInfluenceNode is-center">${escapeHtml(uiText('locked.influence.model', 'El modelo'))}</span>
      <span class="mp-lockedInfluenceNode is-epistemology">${escapeHtml(uiText('locked.influence.epistemology', 'Epistemología'))}</span>
      <span class="mp-lockedInfluenceNode is-right is-one">${escapeHtml(uiText('locked.influence.later', 'Desarrollo posterior'))}</span>
      <span class="mp-lockedInfluenceNode is-right is-two">${escapeHtml(uiText('locked.influence.related', 'Modelo relacionado'))}</span>
      <span class="mp-lockedInfluenceNode is-right is-three">${escapeHtml(uiText('locked.influence.current', 'Influencia actual'))}</span>
    </div>`;

  const graphsMock = `<div class="mp-lockedGraphs" aria-hidden="true">
      <div class="mp-lockedGraphPanel">
        <p class="mp-lockedGraphKicker">${escapeHtml(uiText('network.dimensions', 'Dimensiones'))}</p>
        <div class="mp-lockedDimensionsBody">
          <div class="mp-lockedDimList">
            ${[
              ['#c58da9','Cognici&oacute;n','30%'], ['#d9b267','Self','25%'], ['#a96e9a','Motivaci&oacute;n','15%'],
              ['#d59d59','Conducta manifiesta','15%'], ['#9b83ae','Afecto','5%'], ['#8797aa','Atenci&oacute;n','0%'], ['#a7b18b','Sociocultural','10%']
            ].map(([color,name,value]) => `<div class="mp-lockedDimRow"><span class="mp-lockedDimDot" style="--c:${color}"></span><span>${name}</span><span class="mp-lockedDimRule"></span><b>${value}</b></div>`).join('')}
          </div>
          <div class="mp-lockedDonut"></div>
        </div>
      </div>
      <div class="mp-lockedGraphPanel">
        <p class="mp-lockedGraphKicker">${escapeHtml(uiText('locked.throughProcesses', 'A través de (procesos de cambio)'))}</p>
        <div class="mp-lockedProcessList">
          ${[
            ['RF','Regular cuerpo','0%','0%'], ['RE','Regular emociones','50%','50%'], ['AP','Procesar experiencia','0%','0%'],
            ['RI','Transformar relaci&oacute;n','25%','25%'], ['N','Construir significado','100%','100%'], ['I','Configurar identidad','100%','100%'],
            ['AG','Ejercer agencia','75%','75%'], ['R','Transformar relaciones','75%','75%']
          ].map(([code,name,value,width]) => `<div class="mp-lockedProcessRow"><span class="mp-lockedProcessCode">${code}</span><span>${name}</span><span class="mp-lockedProcessTrack"><i class="mp-lockedProcessFill" style="--w:${width}"></i></span><b>${value}</b></div>`).join('')}
        </div>
      </div>
    </div>`;

  const accordionsMock = `<div class="mp-lockedMock" aria-hidden="true">
        ${accordionLabels.map((item) => `
          <div class="mp-lockedAccordion">
            <span class="mp-lockedAccordionText">${escapeHtml(item)}</span>
            <span class="mp-lockedAccordionRight"><span aria-hidden="true">&#128274;</span><span aria-hidden="true">&#9662;</span></span>
          </div>`).join('')}
      </div>`;

  const mockHtml = kind === 'influence' ? influenceMock : kind === 'graphs' ? graphsMock : accordionsMock;

  return `
    <div class="mp-lockedSection" aria-label="${escapeHtml(uiText('locked.subscriberContent', '{label}: contenido para suscriptores', { label }))}">
      <div class="mp-lockedSectionHead">
        <div class="mp-lockedSectionLabel"><span class="mp-lockIcon" aria-hidden="true">&#128274;</span><span>${escapeHtml(label)}</span></div>
        <button class="mp-lockedSubscribeBtn" type="button" data-action="subscribe-public-model">${escapeHtml(uiText('auth.subscribe', 'Suscribirse'))}</button>
      </div>
      ${mockHtml}
    </div>`;
}

function renderPublicModelPreviewGate(model){
  if (!isPublicModelView(model)) return '';

  return `
    <section class="mp-publicPreview" aria-label="${escapeHtml(uiText('locked.fullContent', 'Contenido completo bloqueado'))}">
      <div class="mp-publicPreviewMock" aria-hidden="true">
        <div class="mp-publicDonut">
          <svg viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="78" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="30"/>
            <circle cx="110" cy="110" r="78" fill="none" stroke="rgba(127,209,185,.9)" stroke-width="30" stroke-dasharray="245 490" stroke-linecap="round" transform="rotate(-90 110 110)"/>
            <circle cx="110" cy="110" r="78" fill="none" stroke="rgba(217,170,63,.78)" stroke-width="30" stroke-dasharray="145 490" stroke-dashoffset="-250" stroke-linecap="round" transform="rotate(-90 110 110)"/>
            <circle cx="110" cy="110" r="42" fill="rgba(255,255,255,.08)"/>
          </svg>
        </div>
        <div class="mp-publicBars">
          <div class="mp-publicBar" style="--w:88%"></div>
          <div class="mp-publicBar" style="--w:64%"></div>
          <div class="mp-publicBar" style="--w:78%"></div>
          <div class="mp-publicBar" style="--w:48%"></div>
          <div class="mp-publicBar" style="--w:71%"></div>
        </div>
        <div class="mp-publicDropdowns">
          <div class="mp-publicDropdown"></div>
          <div class="mp-publicDropdown"></div>
          <div class="mp-publicDropdown"></div>
        </div>
      </div>
      <div class="mp-publicPreviewOverlay">
        <div class="mp-publicPreviewCard">
          <p class="mp-publicPreviewKicker">${escapeHtml(uiText('locked.preview.kicker', 'Ficha parcial'))}</p>
          <h3 class="mp-publicPreviewTitle">${escapeHtml(uiText('locked.preview.title', 'Desbloquea la lectura completa del modelo'))}</h3>
          <div class="mp-publicPreviewText">
            ${escapeHtml(uiText('locked.preview.text', 'Suscríbete para ver técnicas, procedimientos, microintervenciones, secuencias, contexto de origen y grafos interactivos. La vista gratuita mantiene una entrada parcial para orientarte.'))}
          </div>
          <div class="mp-publicPreviewActions">
            <button class="mp-publicSubscribeBtn" type="button" data-action="subscribe-public-model">${escapeHtml(uiText('auth.subscribe', 'Suscribirse'))}</button>
            <span class="mp-publicPreviewHint">${escapeHtml(uiText('locked.preview.price', '9,90 €/mes · beta privada'))}</span>
          </div>
        </div>
      </div>
    </section>`;
}

function markModelAsPublicView(model){
  if (!model || typeof model !== 'object') return model;
  return {
    ...model,
    __fullLoaded: false,
    __publicLoaded: true,
    __partial: true,
    __access: 'public'
  };
}

    // =========================================================
    // 4) Render ficha de modelo (sin procesos/mjps)
    // =========================================================
   function renderModelInfo(m, opts){
  const skipGraphRender = !!(opts && opts.skipGraphRender);
  window.__RENDER_MODEL_INFO_COUNT = (window.__RENDER_MODEL_INFO_COUNT || 0) + 1;
  console.log('[PERF] renderModelInfo', window.__RENDER_MODEL_INFO_COUNT, m?.id, m?.label);

  // ✅ Si no hay modelo: pinta SIEMPRE el hero y resetea estados
  if(!m || !m.id){
    setSchoolToneClass(currentSchool || '');

    modelInfoEl.classList.remove('school-view');
    modelInfoEl.style.removeProperty('--schoolColor');

    // resetea glow suave
    const rightPanel = document.querySelector('.panel.right');
    if (rightPanel){
      rightPanel.style.setProperty('--panelGlow', 'rgba(217,170,63,0.12)');
    }

    // oculta sticky header si existía
    if (window.__SMH){
      window.__SMH.setTitle('');
      window.__SMH.setAuthor('');
      window.__SMH.hide?.();
    }
    const smh = document.getElementById('stickyModelHeader');
    if (smh) smh.classList.remove('is-on');

    if (groupingMode === 'network'){
      const netColor = '#5F7F78';
      modelInfoEl.classList.remove('school-view');
      modelInfoEl.style.setProperty('--schoolColor', netColor);
      document.documentElement.style.setProperty('--schoolColor', netColor);
      document.documentElement.style.setProperty('--panelGlow', hexToRgba(netColor, 0.16));
      if (rightPanel){
        rightPanel.style.setProperty('--panelGlow', hexToRgba(netColor, 0.18));
      }
      NETWORK_FILTER_STATE.query = '';
      NETWORK_FILTER_STATE.minSimDelta = 0;
      disposeNetworkGraph();
      modelInfoEl.innerHTML = buildNetworkOverviewHtml();
      hideNetworkModelGraphPanel();
      bindNetworkLegendHandlers();
      bindNetworkCompactControls();
      updateNetworkLegendUi();
      if (!skipGraphRender) renderNetworkGraphLazy();
      return;
    }

    disposeNetworkGraph();

    if (groupingMode === 'all'){
      const allColor = '#D9AA3F';
      setSchoolToneClass('');
      modelInfoEl.classList.add('school-view');
      modelInfoEl.style.setProperty('--schoolColor', allColor);
      document.documentElement.style.setProperty('--schoolColor', allColor);
      document.documentElement.style.setProperty('--panelGlow', hexToRgba(allColor, 0.16));
      if (rightPanel){
        rightPanel.style.setProperty('--panelGlow', hexToRgba(allColor, 0.18));
      }
      modelInfoEl.innerHTML = renderAllModelsOverviewHtml();
      bindEditorialModelTimeline(modelInfoEl);
      return;
    }

    if (groupingMode === 'tags'){
      const tagColor = TAG_FILTER_COLOR;
      setSchoolToneClass('');
      modelInfoEl.classList.add('school-view');
      modelInfoEl.style.setProperty('--schoolColor', tagColor);
      document.documentElement.style.setProperty('--schoolColor', tagColor);
      document.documentElement.style.setProperty('--panelGlow', hexToRgba(tagColor, 0.16));
      if (rightPanel){
        rightPanel.style.setProperty('--panelGlow', hexToRgba(tagColor, 0.18));
      }
      modelInfoEl.innerHTML = renderTagsOverviewHtml();
      return;
    }

    if (groupingMode === 'process'){
      const proc = PROCESS_FILTER_MAP.get(groupingTarget) || PROCESS_FILTERS[0] || null;
      const procColor = proc ? colorForSchoolLabel('Transversal') : '#D9AA3F';
      modelInfoEl.classList.add('school-view');
      modelInfoEl.style.setProperty('--schoolColor', procColor);
      document.documentElement.style.setProperty('--schoolColor', procColor);
      document.documentElement.style.setProperty('--panelGlow', hexToRgba(procColor, 0.16));
      if (rightPanel){
        rightPanel.style.setProperty('--panelGlow', hexToRgba(procColor, 0.18));
      }
      modelInfoEl.innerHTML = renderProcessOverviewHtml();
      return;
    }
    if (groupingMode === 'dimension'){
      const dim = CHANGE_DIMS.find((d) => d.id === groupingTarget) || CHANGE_DIMS[0] || null;
      const dimColor = dim ? (CHANGE_DIM_COLORS_BY_ID[dim.id] || '#D9AA3F') : '#D9AA3F';
      modelInfoEl.classList.add('school-view');
      modelInfoEl.style.setProperty('--schoolColor', dimColor);
      document.documentElement.style.setProperty('--schoolColor', dimColor);
      document.documentElement.style.setProperty('--panelGlow', hexToRgba(dimColor, 0.16));
      if (rightPanel){
        rightPanel.style.setProperty('--panelGlow', hexToRgba(dimColor, 0.18));
      }
      modelInfoEl.innerHTML = renderDimensionOverviewHtml();
      return;
    }

    modelInfoEl.innerHTML = `
      <div class="mp-hero">
        <div class="mp-hero-eyebrow">${escapeHtml(uiText('welcome.eyebrow', 'Biblioteca viva'))}</div>
        <div class="mp-hero-title">${escapeHtml(uiText('welcome.title', 'Modelos psicoterapéuticos'))}</div>
        <div class="mp-hero-text">
          ${escapeHtml(uiText('welcome.description', 'Explora cómo distintas escuelas entienden el cambio, el sufrimiento y la intervención clínica.'))}
        </div>

        <div class="mp-hero-steps">
          <div class="mp-step"><span class="mp-step-dot"></span>${escapeHtml(uiText('welcome.step1', '1) Elige cómo explorar'))}</div>
          <div class="mp-step"><span class="mp-step-dot"></span>${escapeHtml(uiText('welcome.step2', '2) Haz clic en un modelo'))}</div>
          <div class="mp-step"><span class="mp-step-dot"></span>${escapeHtml(uiText('welcome.step3', '3) Lee influencias, procedimientos y micros'))}</div>
        </div>
      </div>

      <div class="mp-hint">${escapeHtml(uiText('welcome.hint', 'Elige una vía de exploración y después un modelo para ver toda su información.'))}</div>
    `;
    return;
  }

  // ---- a partir de aquí, ya hay modelo real ----
  disposeNetworkGraph();

  if (window.__PHOTO_ROTATE_TIMER){
    clearInterval(window.__PHOTO_ROTATE_TIMER);
    window.__PHOTO_ROTATE_TIMER = null;
  }

  try{ console.log('OPEN MODEL', m.label, m.id); }catch(e){}
  const isEpistemologia = isEpistemologiaModel(m);
  const col = colorForSchoolLabel(m.grupo) || '#ffffff';
  setSchoolToneClass(m.grupo);

  modelInfoEl.classList.remove('school-view');
  modelInfoEl.style.removeProperty('--schoolColor');

  const rightPanel = document.querySelector('.panel.right');
  if (rightPanel){
    rightPanel.style.setProperty('--panelGlow', hexToRgba(col, 0.22));
  }

  if (isEpistemologia){
    modelInfoEl.innerHTML = EpistemologiaFicha({ model: m });
    document.documentElement.style.setProperty('--schoolColor', col);
    document.documentElement.style.setProperty('--panelGlow', hexToRgba(col, 0.16));
    if (window.__SMH){
      window.__SMH.setTitle(m.label || '');
      window.__SMH.setAuthor(epAutoresList(m).join(' - ') || 'Marco epistemologico');
      window.__SMH.rescan();
    }
    hydratePrivateProxyImages(modelInfoEl);
    const epAuthorImgEl = modelInfoEl.querySelector('img.mp-author-photo[data-photo-url]');
    if (epAuthorImgEl){
      setupAuthorPhotoRetry(epAuthorImgEl, epAuthorImgEl.getAttribute('data-photo-url'), m.id);
    }
    bindEpistemologiaFicha(modelInfoEl);
    requestAnimationFrame(() => {
      renderMiniMapBgLazy(m);
    });
    const epHeaderModel = { ...m, autores: epCleanText(m?.autores) || epAutoresList(m).join('; ') };
    const epHeaderLifeImageUrl = getValidatedModelHeaderLifeImageUrl(epHeaderModel);
    window.__EP_HEADER_IMAGE_ENSURE = window.__EP_HEADER_IMAGE_ENSURE || new Set();

    const epHeaderEnsureKey = String(m.id ?? '').trim();

    if (!epHeaderLifeImageUrl && epHeaderEnsureKey && !window.__EP_HEADER_IMAGE_ENSURE.has(epHeaderEnsureKey)){
      window.__EP_HEADER_IMAGE_ENSURE.add(epHeaderEnsureKey);

      ensureVidaImageIndexPromise()
        .then(() => ensureModelHeaderLifeImage(epHeaderModel))
        .then((validatedUrl) => {
          if (!validatedUrl) return;
          if (String(getCurrentModelIdValue() ?? '').trim() !== epHeaderEnsureKey) return;

          const alreadyHasHeaderImage = !!getValidatedModelHeaderLifeImageUrl(epHeaderModel);
          if (!alreadyHasHeaderImage) return;

          renderModelInfo(m);
        })
        .catch(() => {});
    }
    if (!epAuthorImgEl){
      ensureAuthorPhotoIndexPromise().then(() => {
        if (String(getCurrentModelIdValue() ?? '').trim() !== String(m.id ?? '').trim()) return;
        const headerModel = { ...m, autores: epCleanText(m?.autores) || epAutoresList(m).join('; ') };
        const lateUrl = resolveAuthorPhotoUrl(headerModel);
        if (!lateUrl) return;
        const wrap = modelInfoEl.querySelector('.mp-author-wrap');
        const ph = wrap?.querySelector('.mp-author-photo');
        if (!ph) return;
        const img = document.createElement('img');
        img.className = 'mp-author-photo';
        img.setAttribute('data-photo-url', lateUrl);
        img.alt = epAutoresList(m).join(' - ') || uiText('fiche.authorFallback', 'Autor');
        img.loading = 'eager';
        img.decoding = 'async';
        img.fetchPriority = 'high';
        ph.replaceWith(img);
        setupAuthorPhotoRetry(img, lateUrl, m.id);
      }).catch(() => {});
    }
    return;
  }

  ensureIsomorphismReadyForModel(m);

  const pills = [
    m.year ? `<span class="mp-pill">${escapeHtml(m.year)}</span>` : '',
    m.universidad ? `<span class="mp-pill">${escapeHtml(institutionDisplayLabel(m.universidad))}</span>` : '',
    (m.ciudad || m.pais) ? `<span class="mp-pill">${escapeHtml([cityDisplayLabel(m.ciudad), countryDisplayLabel(m.pais)].filter(Boolean).join(' · '))}</span>` : ''
  ].filter(Boolean).join('');
  const quoteRaw = [m.frase, m.fraseCorta, m.cita, m.quote]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean) || '';

  // contadores
const nInflu = Array.isArray(m.influencias) ? m.influencias.filter(Boolean).length : 0;
const nRefs  = Array.isArray(m.refs) ? m.refs.filter(Boolean).length : 0;
const isPublicRender = isPublicModelView(m);
const nTech  = !isPublicRender && Array.isArray(m.tecnicas) ? m.tecnicas.filter(Boolean).length : 0;
const nProc  = !isPublicRender && Array.isArray(m.procedimientos) ? m.procedimientos.filter(Boolean).length : 0;
const nMicro = !isPublicRender && Array.isArray(m.micros) ? m.micros.filter(Boolean).length : 0;
const nSeq   = !isPublicRender && Array.isArray(m.secuencias) ? m.secuencias.filter(Boolean).length : 0;
const nIdeas = Array.isArray(m.ideasPrincipales) ? m.ideasPrincipales.filter(Boolean).length : 0;
const nConcepts = Array.isArray(m.conceptosClave) ? m.conceptosClave.filter(Boolean).length : 0;

  // alianza/neimeyer
  const nAli = (!isPublicRender && m.alianzaModelo && typeof m.alianzaModelo === 'object')
    ? Object.entries(m.alianzaModelo).filter(([k,v]) => v && String(v).trim()).length
    : 0;

  const nNei = (!isPublicRender && m.neimeyer && typeof m.neimeyer === 'object')
    ? Object.entries(m.neimeyer).filter(([k,v]) => v && String(v).trim()).length
    : 0;
  // ===== Autor con foto =====
// ===== Autor con foto (versión con depuración para ver qué falla) =====
// ===== Autor con foto (foto.json) =====
const fullAutores = String(m.autores ?? '').trim();

// Para la FOTO: usa el 1º autor (lo normal en índices)
const autorFoto = (fullAutores.split(';')[0] || '').trim() || '—';
const autorFotoKey = autorFoto.split(',')[0].trim(); // por si viene "Apellido, Nombre"

// Para MOSTRAR: todos los autores
const autoresList = fullAutores
  ? fullAutores.split(';').map(s => s.trim()).filter(Boolean)
  : [];
const autoresDisplay = autoresList.length ? autoresList.join(' · ') : '—';

const fotoUrl = resolveAuthorPhotoUrl(m);
const fotoUrls = getModelPhotoUrls(m);
const headerLifeImageUrl = getValidatedModelHeaderLifeImageUrl(m);
const editorialTitleHtml = (() => {
  const label = String(m.label || '');
  const match = label.match(/^(.*?)(\s*\([^()]+\))\s*$/);
  if (!match) return escapeHtml(label);
  return `${escapeHtml(match[1].trim())} <span class="ed-title-accent">${escapeHtml(match[2].trim())}</span>`;
})();


const authorHTML =
  '<div class="mp-author mp-author-wrap">' +

    (fotoUrl
? '<img class="mp-author-photo" src="' + fotoUrl + '" data-photo-url="' + fotoUrl + '" alt="' + escapeHtml(autoresDisplay) + '" loading="eager" decoding="async" fetchpriority="high">'

      : '<div class="mp-author-photo" aria-hidden="true"></div>'
    ) +
    '<div class="mp-author-text">' +
      '<div class="mp-author-name">' + autoresList.map((a, i) =>
        `<span class="mp-author-part" data-author-index="${i}">${escapeHtml(a)}</span>`
      ).join('<span class="mp-author-sep"> · </span>') +
      '</div>' +
      // 👇 Quitamos el año aquí para NO duplicarlo (ya está en pills)
      '<div class="mp-author-meta"></div>' +
    '</div>' +
  '</div>';


  const typeInfo = getModelTypeInfo(m);
  const modelSchoolLabel = schoolDisplayLabel(m.grupo) || String(m.grupo || '');
  const heroBgHtml = headerLifeImageUrl
    ? `<img class="mp-modelHeroBg" src="${escapeHtml(headerLifeImageUrl)}" alt="" loading="eager" decoding="async" fetchpriority="high">`
    : '';
  const modelTagLabel = typeInfo?.label ? `${modelSchoolLabel} · ${typeInfo.label}` : modelSchoolLabel;

  const headerOpenHtml = headerLifeImageUrl
    ? `  <div class="mp-modelHero has-life-bg">
    ${heroBgHtml}
    <div class="mp-modelHeroContent">`
    : `  <div class="mp-mapbg" aria-hidden="true">
    <svg id="miniMapSvgBg"></svg>
  </div>`;
  const headerCloseHtml = headerLifeImageUrl
    ? `
    </div>
  </div>`
    : '';
  const influenceGraphHtml = !isPublicRender ? renderInfluenceGraphShell(m) : '';
  const influencesHtml = `<div class="mp-section mp-influences">
      <h4>${escapeHtml(uiText('fiche.influences', 'Influencias'))}</h4>
      ${sectionListInner(m.influencias, {asList:false})}
      ${influenceGraphHtml}
    </div>`;
  const mapPlaceLabel = [cityDisplayLabel(m.ciudad), countryDisplayLabel(m.pais)].map(v => String(v ?? '').trim()).filter(Boolean).join(', ')
    || String(m.universidad ?? '').trim()
    || uiText('fiche.originPlace', 'Lugar de origen');
  const changeTheoryMapHtml = headerLifeImageUrl
    ? `<div class="mp-locationCard">
      <div class="mp-changeTheory-mapFrame">
        <div class="mp-mapbg">
          <svg id="miniMapSvgBg"></svg>
        </div>
        <div class="mp-locationOverlay">
          <div class="mp-locationTitle">${escapeHtml(uiText('fiche.location', 'Localización'))}</div>
          <div class="mp-locationPlace">${escapeHtml(mapPlaceLabel)}</div>
        </div>
      </div>
    </div>`
    : '';
  const epistemicNoteHtml = renderNotaEpistemologica(m);
  const changeTheorySummary = getChangeTheorySummaryText(m);
  const changeTheoryExplanation = getChangeTheoryExplanationText(m);
  const descAsideHtml = headerLifeImageUrl ? '' : influencesHtml + epistemicNoteHtml;
  const influencesBelowHtml = headerLifeImageUrl ? influencesHtml + epistemicNoteHtml : '';
  const mainControversiaHtml = renderControversia(m, { editorial:true });
  const mainDebateHtml = renderDebateCritico(m, { editorial:true });

  modelInfoEl.innerHTML = `
    <div class="ed-ficha" style="--ed-accent:${col}">

      <div class="ed-hero${headerLifeImageUrl ? ' has-bg' : ''}" id="ed-section-cover" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.cover', 'Portada'))}">
        ${headerLifeImageUrl ? `<div class="ed-hero-bg"><img src="${escapeHtml(headerLifeImageUrl)}" alt="" loading="eager" decoding="async" fetchpriority="high"><span class="ed-hero-scrim"></span></div>` : ''}
        ${headerLifeImageUrl ? renderAiImageNotice() : ''}
        <div class="ed-hero-inner">
          <p class="ed-eyebrow"><span class="ed-rule"></span>${escapeHtml(modelSchoolLabel)}${typeInfo?.label ? ' · ' + escapeHtml(typeInfo.label) : ''}${m.year ? ' · ' + escapeHtml(m.year) : ''}</p>
          <h1 class="mp-title ed-title">${editorialTitleHtml}</h1>
          ${authorHTML}
          ${quoteRaw ? `<blockquote class="ed-quote">${escapeHtml(quoteRaw)}</blockquote>` : ''}
          <div class="ed-facts">
            ${(autoresDisplay && autoresDisplay !== '—') ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('fiche.author', 'Autor/a'))}</span><span class="ed-fact-v">${escapeHtml(autoresDisplay)}</span></div>` : ''}
            ${(m.ciudad || m.pais) ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('fiche.place', 'Lugar'))}</span><span class="ed-fact-v">${escapeHtml([cityDisplayLabel(m.ciudad), countryDisplayLabel(m.pais)].filter(Boolean).join(' · '))}</span></div>` : ''}
            ${m.year ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('fiche.year', 'Año'))}</span><span class="ed-fact-v">${escapeHtml(m.year)}</span></div>` : ''}
            ${m.universidad ? `<div class="ed-fact"><span class="ed-fact-k">${escapeHtml(uiText('fiche.center', 'Centro'))}</span><span class="ed-fact-v">${escapeHtml(institutionDisplayLabel(m.universidad))}</span></div>` : ''}
          </div>
        </div>
      </div>

      <section class="ed-chapter" id="ed-section-model" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.model', 'El modelo'))}">
        <div class="ed-chap-head"><span class="ed-chap-num">01</span><div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.model', 'El modelo'))}</h2></div></div>
        <div class="ed-modelIntro">
          <aside class="ed-changeSummary">
            <p class="ed-changeSummary-kicker">${escapeHtml(uiText('fiche.changeTheorySummary', 'Teoría del cambio · resumen'))}</p>
            <p class="ed-changeSummary-text">${escapeHtml(changeTheorySummary || quoteRaw || m.definicionBreve || uiText('fiche.changeSummaryFallback', 'El cambio se comprende desde los principios centrales del modelo.'))}</p>
          </aside>
          <div class="ed-modelDescription">
            <p class="ed-lead">${escapeHtml(m.descripcion ?? '—')}</p>
          </div>
        </div>
        <div class="ed-influences">
          <div class="ed-lineage">
            <h4>${escapeHtml(uiText('fiche.theoreticalLineage', 'Linaje teórico'))}</h4>
            <p>${escapeHtml(uiText('fiche.lineageDescription', 'De qué corrientes bebe el modelo y a qué desarrollos posteriores dio lugar.'))}</p>
          </div>
          ${!isPublicRender ? influenceGraphHtml : renderPublicLockedSection(uiText('fiche.influenceGraph', 'Grafo de influencias'), 'influence')}
        </div>
        ${renderNotaEpistemologica(m)}
        ${(mainControversiaHtml || mainDebateHtml) ? `
        <section class="ed-criticalDossier" id="ed-section-critical" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.criticalDossier', 'Dossier crítico'))}" data-smh-unnumbered>
          <div class="ed-criticalDossier-head">
            <div>
              <p class="ed-criticalDossier-kicker">${escapeHtml(uiText('fiche.criticalKicker', 'Fronteras · evaluación editorial'))}</p>
              <h2 class="ed-criticalDossier-title">${escapeHtml(uiText('fiche.criticalDossier', 'Dossier crítico'))}</h2>
            </div>
            <p class="ed-criticalDossier-deck">${escapeHtml(uiText('fiche.criticalDeck', 'Una lectura graduada de sus límites clínicos, epistemológicos e históricos.'))}</p>
          </div>
          ${mainControversiaHtml ? `
          <section class="ed-criticalFeature">
            <header class="ed-criticalFeature-head">
              <span class="ed-criticalFeature-index">I</span>
              <div><p>${escapeHtml(uiText('fiche.criticalReading', 'Lectura crítica'))}</p><h3>${escapeHtml(uiText('fiche.controversyDegree', 'Grado de controversia'))}</h3></div>
            </header>
            ${mainControversiaHtml}
          </section>` : ''}
          ${mainDebateHtml ? `
          <section class="ed-criticalFeature">
            <header class="ed-criticalFeature-head">
              <span class="ed-criticalFeature-index">II</span>
              <div><p>${escapeHtml(uiText('fiche.counterpoint', 'Contrapunto'))}</p><h3>${escapeHtml(uiText('fiche.criticalDebate', 'Debate crítico'))}</h3></div>
            </header>
            ${mainDebateHtml}
          </section>` : ''}
        </section>` : ''}
      </section>

      ${ArquitecturaModelo(m)}

      ${(isPublicRender || changeTheoryExplanation || modelHasProcessData(m) || modelHasDimensionData(m) || nConcepts || nIdeas || nNei) ? `
      <section class="ed-chapter ed-alt" id="ed-section-anatomy" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.anatomy', 'Anatomía'))}">
        <div class="ed-chap-head"><span class="ed-chap-num">02</span><div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.changeAnatomy', 'Anatomía del cambio'))}</h2></div></div>
        ${changeTheoryExplanation ? `<section class="ed-changeTheoryExplanation" aria-labelledby="ed-change-theory-title">
          <p class="ed-changeTheoryExplanation-kicker">${escapeHtml(uiText('fiche.changeMechanism', 'Mecanismo de cambio'))}</p>
          <h3 id="ed-change-theory-title">${escapeHtml(uiText('fiche.howChangeOccurs', 'Cómo ocurre el cambio'))}</h3>
          <p>${escapeHtml(changeTheoryExplanation)}</p>
        </section>` : ''}
        ${(!isPublicRender && (modelHasProcessData(m) || modelHasDimensionData(m))) ? renderGraficaProcesos(m) : ''}
        ${isPublicRender ? renderPublicLockedSection(uiText('fiche.dimensionProcessGraphs', 'Grafos de dimensiones y procesos'), 'graphs') : ''}
        ${isPublicRender ? renderPublicLockedSection(uiText('fiche.conceptsLevels', 'Conceptos y niveles'), 'anatomy') : ''}
        <div class="ed-acc">
          ${(!isPublicRender && nConcepts) ? acc(uiText('fiche.keyConcepts', 'Conceptos clave'), nConcepts, sectionConceptsInner(m.conceptosClave), false) : ''}
          ${nIdeas ? acc(uiText('fiche.mainIdeas', 'Ideas principales'), nIdeas, sectionIdeasInner(m.ideasPrincipales), false) : ''}
          ${nNei ? acc(uiText('fiche.levels', 'Niveles'), nNei, sectionNeimeyerInner(m.neimeyer), false) : ''}
        </div>
      </section>` : ''}

      ${(isPublicRender || nAli) ? `
      <section class="ed-chapter" id="ed-section-relationship" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.relationship', 'Relación'))}">
        <div class="ed-chap-head"><span class="ed-chap-num">03</span><div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.therapeuticRelationship', 'La relación terapéutica'))}</h2></div></div>
        ${isPublicRender ? renderPublicLockedSection(uiText('fiche.therapeuticRelationship', 'Relación terapéutica'), 'relationship') : `<div class="ed-acc">
          ${acc(uiText('fiche.therapeuticAlliance', 'Alianza terapéutica'), nAli, sectionAliInner(m.alianzaModelo), false)}
        </div>`}
      </section>` : ''}

      ${(isPublicRender || nTech || nProc || nSeq || nMicro) ? `
      <section class="ed-chapter ed-alt" id="ed-section-practice" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.practice', 'Práctica'))}">
        <div class="ed-chap-head"><span class="ed-chap-num">04</span><div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.practice', 'La práctica'))}</h2></div></div>
        ${isPublicRender ? renderPublicLockedSection(uiText('fiche.techniquesAndMicro', 'Técnicas y microintervenciones'), 'practice') : `<div class="ed-practiceTools">
          <div class="ed-acc">
            ${nTech ? acc(uiText('fiche.techniques', 'Técnicas'), nTech, sectionProceduresInner(m.tecnicas, { type:'tecnica', model:m }), false) : ''}
            ${nProc ? acc(uiText('fiche.techniquesProcedures', 'Técnicas y procedimientos'), nProc, sectionProceduresInner(m.procedimientos, { type:'procedimiento', model:m }), false) : ''}
            ${nMicro ? acc(uiText('fiche.microinterventions', 'Microintervenciones'), nMicro, sectionProceduresInner(m.micros, { type:'micro', model:m }), false) : ''}
          </div>
          ${nSeq ? `<section class="ed-sequencesBlock" aria-labelledby="ed-sequences-title">
            <div class="ed-sequencesHeading">
              <div>
                <p class="ed-sequencesKicker">${escapeHtml(uiText('fiche.clinicalJourney', 'Recorrido clínico'))}</p>
                <h3 id="ed-sequences-title" class="ed-sequencesTitle">${escapeHtml(uiText('fiche.sequences', 'Secuencias'))}</h3>
              </div>
              <p class="ed-sequencesDeck">${escapeHtml(uiText('fiche.therapeuticProcessSteps', 'El proceso terapéutico, ordenado paso a paso.'))}</p>
              <span class="ed-sequencesCount" aria-label="${escapeHtml(uiPlural('fiche.sequence', nSeq, '1 secuencia', '{count} secuencias', { count:nSeq }))}">${nSeq}</span>
            </div>
            ${sectionSequencesInner(m.secuencias)}
          </section>` : ''}
        </div>`}
      </section>` : ''}

      <section class="ed-chapter" id="ed-section-sources" data-smh-section data-smh-label="${escapeHtml(uiText('fiche.sources', 'Fuentes'))}">
        <div class="ed-chap-head"><span class="ed-chap-num">05</span><div><p class="ed-chap-kicker">${escapeHtml(uiText('fiche.chapter', 'Capítulo'))}</p><h2 class="ed-chap-title">${escapeHtml(uiText('fiche.contextSources', 'Contexto y fuentes'))}</h2></div></div>
        <div class="ed-loc">
          <div class="ed-loc-map mp-locationCard"><div class="mp-changeTheory-mapFrame"><div class="mp-mapbg"><svg id="miniMapSvgBg"></svg></div></div></div>
          <div class="ed-loc-text">
            <p class="ed-loc-kicker">${escapeHtml(uiText('fiche.location', 'Localización'))}</p>
            <p class="ed-loc-place">${escapeHtml([cityDisplayLabel(m.ciudad), countryDisplayLabel(m.pais)].filter(Boolean).join(', ') || institutionDisplayLabel(m.universidad) || uiText('fiche.originPlace', 'Lugar de origen'))}</p>
            ${(m.lat != null && m.lon != null) ? `<p class="ed-loc-coords">${edFmtCoord(m.lat, true)} · ${edFmtCoord(m.lon, false)}</p>` : ''}
          </div>
          ${m.year ? `<div class="ed-loc-year" aria-label="${escapeHtml(uiText('fiche.modelYear', 'Año del modelo'))}">${escapeHtml(m.year)}</div>` : ''}
        </div>
        ${!isPublicRender ? renderContextOriginSection(m, headerLifeImageUrl) : renderPublicLockedSection(uiText('fiche.extendedContext', 'Contexto ampliado'), 'context')}
        <div class="ed-refs">
          <h4>${escapeHtml(uiText('fiche.references', 'Referencias'))}</h4>
          ${sectionListInner(m.refs, {asList:true})}
        </div>
      </section>
${renderFichaListaEspera(m)}

    </div>
  `;
      // ✅ Variables globales para todo el panel derecho (sticky incluido)
document.documentElement.style.setProperty('--schoolColor', col);
document.documentElement.style.setProperty('--panelGlow', hexToRgba(col, 0.16));
if (window.__SMH){
  window.__SMH.setTitle(m.label);
  window.__SMH.setAuthor(m.autores || '');
  window.__SMH.rescan();
}
hydratePrivateProxyImages(modelInfoEl);
bindSpecialModelModules(modelInfoEl);
bindModelInfluenceGraph(modelInfoEl);
hydrateModelInfluenceGraph(modelInfoEl, m).catch((e) => {
  console.warn('No se pudo cargar el graph de influencias:', e);
});

modelInfoEl.querySelectorAll('[data-action="subscribe-public-model"]').forEach((button) => {
  button.addEventListener('click', () => {
    if (typeof window.startSubscriptionCheckout === 'function'){
      window.startSubscriptionCheckout();
      return;
    }

    if (typeof window.openSubscriptionLogin === 'function'){
      window.openSubscriptionLogin(uiText('auth.signInToSubscribe', 'Inicia sesión o crea una cuenta para suscribirte.'));
    }
  });
});

const authorImgEl = modelInfoEl.querySelector('img.mp-author-photo[data-photo-url]');
if (authorImgEl){
  const basePhotoUrl = authorImgEl.getAttribute('data-photo-url');
  setupAuthorPhotoRetry(authorImgEl, basePhotoUrl, m.id);
}

if (autoresList.length === 1){
  const single = modelInfoEl.querySelector('.mp-author-part');
  if (single) single.classList.add('is-active');
}

if (fotoUrls.length <= 1){
  modelInfoEl.querySelectorAll('.mp-author-part').forEach(el => el.classList.add('is-active'));
}

if (!headerLifeImageUrl){
  const rerenderWithHeaderImage = (validatedUrl) => {
    if (!validatedUrl) return false;
    if (String(getCurrentModelIdValue() ?? '').trim() !== String(m.id ?? '').trim()) return true;
    renderModelInfo(m);
    return true;
  };

  ensureVidaImageIndexPromise()
    .then(() => ensureModelHeaderLifeImage(m))
    .then((validatedUrl) => {
      if (rerenderWithHeaderImage(validatedUrl)) return null;
      return ensureAuthorPhotoIndexPromise()
        .then(() => ensureModelHeaderLifeImage(m))
        .then(rerenderWithHeaderImage);
    })
    .catch(() => {});
}

// Rotación de fotos por modelo (si hay varias)
  if (authorImgEl && Array.isArray(fotoUrls) && fotoUrls.length > 1){
    let idx = 0;
    const isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 980px)').matches);
    const intervalMs = isMobile ? 25000 : 15000;
    const authorParts = modelInfoEl.querySelectorAll('.mp-author-part');

    const markActiveAuthor = (i) => {
      if (!authorParts || !authorParts.length) return;
      authorParts.forEach((el, j) => el.classList.toggle('is-active', j === i));
    };

    markActiveAuthor(idx);

    const rotate = () => {
      if (String(getCurrentModelIdValue() ?? '').trim() !== String(m.id ?? '').trim()) return;
      idx = (idx + 1) % fotoUrls.length;
      const nextUrl = fotoUrls[idx];
      setPhotoImgLoading(authorImgEl);
      setTimeout(() => {
        authorImgEl.setAttribute('data-photo-url', nextUrl);
        setPhotoImgLoading(authorImgEl, nextUrl);
        setupAuthorPhotoRetry(authorImgEl, nextUrl, m.id);
        markActiveAuthor(idx);
      }, 240);
    };

    window.__PHOTO_ROTATE_TIMER = setInterval(rotate, intervalMs);
  }


// Si la foto aún no estaba disponible (carga asíncrona de foto.json), hidrátala en caliente
if (!fotoUrl){
  ensureAuthorPhotoIndexPromise().then(() => {
    if (String(getCurrentModelIdValue() ?? '').trim() !== String(m.id ?? '').trim()) return;

    const lateUrl = resolveAuthorPhotoUrl(m);
    if (!lateUrl) return;

    const wrap = modelInfoEl.querySelector('.mp-author-wrap');
    if (!wrap) return;

    const existingImg = wrap.querySelector('img.mp-author-photo');
    if (existingImg){
      existingImg.setAttribute('data-photo-url', lateUrl);
      setupAuthorPhotoRetry(existingImg, lateUrl, m.id);
      const contextLifeImg = modelInfoEl.querySelector('.mp-co-image[data-key="vida"] img, .mp-contextOrigin-media[data-context-origin-key="vida"] img');
      if (contextLifeImg){
        const lifeUrls = getLifeAuthorImageUrls(m);
        const [lifeUrl, ...lifeFallbackUrls] = lifeUrls.length ? lifeUrls : [lateUrl];
        setContextOriginImgSource(contextLifeImg, lifeUrl, lifeFallbackUrls);
      }
      return;
    }

    const ph = wrap.querySelector('.mp-author-photo');
    if (!ph) return;

    const img = document.createElement('img');
    img.className = 'mp-author-photo';
    img.setAttribute('data-photo-url', lateUrl);
    img.alt = autoresDisplay || uiText('fiche.authorFallback', 'Autor');
    img.loading = 'eager';
    img.decoding = 'async';
    img.fetchPriority = 'high';
    ph.replaceWith(img);
    setupAuthorPhotoRetry(img, lateUrl, m.id);
    const contextLifeImg = modelInfoEl.querySelector('.mp-co-image[data-key="vida"] img, .mp-contextOrigin-media[data-context-origin-key="vida"] img');
    if (contextLifeImg){
      const lifeUrls = getLifeAuthorImageUrls(m);
      const [lifeUrl, ...lifeFallbackUrls] = lifeUrls.length ? lifeUrls : [lateUrl];
      setContextOriginImgSource(contextLifeImg, lifeUrl, lifeFallbackUrls);
    }
  }).catch(() => {});
}

// El formulario del pie se repinta con cada ficha, asi que hay que volver a
// engancharlo. `enganchar` es idempotente, de modo que llamarlo de mas no duplica
// los listeners. Si el componente aun no ha cargado, el <form> sigue funcionando
// como envio normal del navegador.
try { window.listaEspera?.iniciar?.(); } catch (_) {}

initDimHoverSync(modelInfoEl);
initProcessDetailSync(modelInfoEl);
initGraphEntranceAnimations(modelInfoEl);
syncMobileGraphDisclosures(modelInfoEl);
initMobileGraphDisclosureResize();
initProcesosHeightSync(modelInfoEl);

      // === Mini map de fondo (lazy: no bloquea la ficha en móvil) ===
requestAnimationFrame(() => {
  renderMiniMapBgLazy(m);
});

}

/* Captura de email al pie de la ficha — tercer emplazamiento de la Fase 0.2.
   Va dentro de `.ed-ficha`, asi que se repinta con cada ficha: por eso el
   `id` del campo lleva el id del modelo (no puede haber dos iguales si algun
   dia se pintan dos fichas) y por eso hay que volver a enganchar el formulario
   despues de asignar el innerHTML. Ver LANZAMIENTO.md, seccion 0.2. */
function renderFichaListaEspera(model){
  const modelId = String(model?.id || '').trim();
  const campoId = 'fichaListaEmail-' + (modelId.replace(/[^a-zA-Z0-9_-]/g, '') || 'x');
  return `
      <section class="ed-chapter ed-listaEspera" aria-labelledby="${campoId}-titulo">
        <form class="lista-espera" data-lista-espera="ficha" data-modelo="${escapeHtml(modelId)}" data-locale="${escapeHtml(MODELOS_LOCALE)}" action="/api/subscribe-list" method="post">
          <p class="lista-espera-titulo" id="${campoId}-titulo">${escapeHtml(uiText('waitlist.fiche.title', 'Apúntate ahora y tendrás precio de fundador cuando abra la suscripción.'))}</p>
          <p class="lista-espera-nota">${escapeHtml(uiText('waitlist.fiche.note', 'El Atlas sigue creciendo. Déjame tu correo y te aviso cuando haya modelos nuevos y cuando abra el acceso completo.'))}</p>
          <div class="lista-espera-campos" data-lista-campos>
            <label class="visually-hidden" for="${campoId}">${escapeHtml(uiText('waitlist.emailLabel', 'Tu correo electrónico'))}</label>
            <input id="${campoId}" type="email" name="email" placeholder="${escapeHtml(uiText('waitlist.emailPlaceholder', 'tu@correo.com'))}" autocomplete="email" required />
            <button type="submit">${escapeHtml(uiText('waitlist.submit', 'Avísame'))}</button>
          </div>
          <div class="lista-espera-gracias" data-lista-gracias hidden>
            <p class="lista-espera-nota">${escapeHtml(uiText('waitlist.profileQuestion', 'Gracias. ¿Qué describe mejor tu caso?'))}</p>
            <div class="lista-espera-perfiles">
              <button type="button" data-perfil="clinico">${escapeHtml(uiText('waitlist.profile.clinical', 'Ejerzo la clínica'))}</button>
              <button type="button" data-perfil="docente">${escapeHtml(uiText('waitlist.profile.teaching', 'Doy clase'))}</button>
              <button type="button" data-perfil="estudiante">${escapeHtml(uiText('waitlist.profile.student', 'Estudio'))}</button>
              <button type="button" data-perfil="otro">${escapeHtml(uiText('waitlist.profile.other', 'Otra cosa'))}</button>
            </div>
          </div>
          <p class="lista-espera-cierre" data-lista-cierre hidden>${escapeHtml(uiText('waitlist.closing', 'Anotado. Nos leemos pronto.'))}</p>
          <p class="lista-espera-estado" data-lista-estado role="status" aria-live="polite"></p>
        </form>
      </section>`;
}

function edFmtCoord(v, isLat){
  const n = Number(v);
  if (!isFinite(n)) return '';
  const hemi = isLat ? (n >= 0 ? 'N' : 'S') : (n >= 0 ? 'E' : 'O');
  return Math.abs(n).toFixed(2) + '\u00b0 ' + hemi;
}

function acc(title, count, bodyHtml, open=false){
  return `
    <details ${open ? 'open' : ''}>
      <summary>
        <span>${escapeHtml(title)}</span>
        <span class="sumRight">
          <span class="sumCount">${count}</span>
          <span class="chev">▾</span>
        </span>
      </summary>
      <div class="body">${bodyHtml}</div>
    </details>
  `;
}

function sectionListInner(arr, opts={}){
  const a = Array.isArray(arr) ? arr.filter(Boolean) : [];
  const asList = !!opts.asList;

  if(!a.length) return `<div>—</div>`;

  if(asList){
    return `<ul class="mp-list">${a.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  }
  return `<div>${a.map(x => escapeHtml(x)).join(', ')}</div>`;
}

function getChangeTheorySummaryText(model){
  const data = getChangeTheoryData(model);
  if (!data) return '';
  return String(
    pickModelValue(data, [
      'resumen',
      'fraseResumen',
      'frase_resumen',
      'frase',
      'sintesis',
      'síntesis',
      'ideaCentral',
      'idea_central',
      'summary'
    ]) ?? ''
  ).trim();
}

function getChangeTheoryExplanationText(model){
  const data = getChangeTheoryData(model);
  if (!data) return '';
  return String(
    pickModelValue(data, [
      'explicacion',
      'explicación',
      'texto',
      'desarrollo',
      'mecanismo',
      'descripcion',
      'descripción',
      'explanation',
      'body'
    ]) ?? ''
  ).trim();
}

function renderChangeTheorySection(model, mapHtml = ''){
  const data = getChangeTheoryData(model);

  if(!data) return '';

  const summary = getChangeTheorySummaryText(model);

  const explanation = String(
    pickModelValue(data, [
      'explicacion',
      'explicación',
      'texto',
      'desarrollo',
      'mecanismo',
      'descripcion',
      'descripción',
      'explanation',
      'body'
    ]) ??
    ''
  ).trim();

  if(!summary && !explanation) return '';

  return `
    <div class="mp-section mp-changeTheory">
      <div class="mp-changeTheory-layout${mapHtml ? ' has-map' : ''}">
        <div class="mp-changeTheory-card">
          <div class="mp-changeTheory-head">
            <div class="mp-changeTheory-eyebrow">Teor&iacute;a del cambio</div>
            <span class="mp-changeTheory-rule" aria-hidden="true"></span>
          </div>
          <div class="mp-changeTheory-copy">
            ${summary ? `<div class="mp-changeTheory-summary">${escapeHtml(summary)}</div>` : ''}
            ${explanation ? `<div class="mp-changeTheory-text">${escapeHtml(explanation)}</div>` : ''}
          </div>
        </div>
        ${mapHtml}
      </div>
    </div>
  `;
}

function contextOriginCleanItems(value){
  if(Array.isArray(value)){
    return value
      .map((item) => {
        if(typeof item === 'string') return item.trim();
        if(item && typeof item === 'object'){
          return String(item.label ?? item.nombre ?? item.titulo ?? item.texto ?? '').trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if(typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

const CONTEXT_ORIGIN_EPOCH_YEARS = [1920, 1940, 1960, 1980, 2000, 2026];

function contextOriginEpochYear(modelYear){
  const year = Number(modelYear);
  if(!Number.isFinite(year)) return 1920;

  return CONTEXT_ORIGIN_EPOCH_YEARS.reduce((best, candidate) => {
    const bestDist = Math.abs(best - year);
    const candidateDist = Math.abs(candidate - year);
    if(candidateDist < bestDist) return candidate;
    if(candidateDist === bestDist && candidate < best) return candidate;
    return best;
  }, CONTEXT_ORIGIN_EPOCH_YEARS[0]);
}

function contextOriginTimeline(model){
  const year = Number(model?.year || 0);
  if(!Number.isFinite(year) || year <= 0) return '';

  const minYear = 1880;
  const maxYear = 2030;
  const clampedYear = Math.min(maxYear, Math.max(minYear, year));
  const position = ((clampedYear - minYear) / (maxYear - minYear)) * 100;
  const ticks = [1900, 1920, 1940, 1960, 1980, 2000, 2020]
    .map((tick) => {
      const tickPosition = ((tick - minYear) / (maxYear - minYear)) * 100;
      return `<span class="mp-co-timelineTick" style="left:${tickPosition.toFixed(2)}%"></span>`;
    })
    .join('');

  return `
    <div class="mp-co-timeline" aria-label="${escapeHtml(uiText('context.modelYearAria', 'Año del modelo: {year}', { year }))}">
      <span class="mp-co-timelineTrack"></span>
      ${ticks}
      <span class="mp-co-timelineYear" style="left:${position.toFixed(2)}%">${escapeHtml(String(year))}</span>
    </div>
  `;
}

function contextOriginImageFile(key, model = null){
  if(key === 'epoca'){
    return `epoca/Epoca_${contextOriginEpochYear(model?.year)}.png`;
  }

  const files = {
    vida: 'Vida.png',
    problema: 'Problema.png',
    influencias: 'influencias.png',
    estilo: 'Estilo.png'
  };

  return files[key] || '';
}

function contextOriginImageCdnUrl(file){
  if (USE_PRIVATE_PROXY){
    return privateImageUrl(`Core/imagenes/${file.replace(/^\/+/, '').replace(/^data\//i, '').replace(/^Core\/imagenes\//i, '')}`);
  }
  const base = IS_LOCAL_DEV && !IS_GHPAGES ? cdnBase() + '/data' : DATA_BASE;
  return `${base}/Core/imagenes/${file.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(__ASSET_VER || Date.now())}`;
}

function contextOriginImageRawUrl(file){
  if (USE_PRIVATE_PROXY){
    return privateImageUrl(`Core/imagenes/${file.replace(/^\/+/, '').replace(/^data\//i, '').replace(/^Core\/imagenes\//i, '')}`);
  }
  return `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/Core/imagenes/${file.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(__ASSET_VER || Date.now())}`;
}

function contextOriginImageUrls(key, model = null){
  const urls = [];

  if(key === 'vida'){
    urls.push(...getLifeAuthorImageUrls(model));
  }

  const file = contextOriginImageFile(key, model);
  if(file){
    urls.push(contextOriginImageCdnUrl(file));
    urls.push(contextOriginImageRawUrl(file));
  }

  if(key === 'influencias'){
    ['Influencias.png', 'influencias.png'].forEach((candidate) => {
      urls.push(contextOriginImageCdnUrl(candidate));
      urls.push(contextOriginImageRawUrl(candidate));
    });
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

function contextOriginMedia(key, title, model = null){
  const urls = contextOriginImageUrls(key, model);
  const [firstUrl, ...fallbackUrls] = urls;
  if(!firstUrl) return '';
  const imageClass = isLifeAuthorImageUrl(firstUrl) ? ' class="is-life-author-image"' : '';
  const initialSrc = isProxyUrl(firstUrl) ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' : firstUrl;
  const privateSrcAttr = isProxyUrl(firstUrl) ? ` data-private-src="${escapeHtml(firstUrl)}"` : '';

  return `
    <div class="mp-contextOrigin-media" data-context-origin-key="${escapeHtml(key)}">
      <img${imageClass} src="${escapeHtml(initialSrc)}"${privateSrcAttr} data-fallback-srcs="${escapeHtml(fallbackUrls.join('|'))}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="const list=(this.getAttribute('data-fallback-srcs')||'').split('|').filter(Boolean); const next=list.shift(); if(next){ setContextOriginImgSource(this, next, list); } else { this.style.display='none'; }">
    </div>
  `;
}

function contextOriginImageTag(key, title, model = null, headerImageUrl = ''){
  const usesLifeZoom = key === 'problema';
  const urls = usesLifeZoom
    ? contextOriginImageUrls('vida', model)
    : contextOriginImageUrls(key, model);
  const [firstUrl, ...fallbackUrls] = urls;
  if(!firstUrl) return '';
  const classes = [
    isLifeAuthorImageUrl(firstUrl) ? 'is-life-author-image' : '',
    usesLifeZoom ? 'is-context-header-zoom' : ''
  ].filter(Boolean).join(' ');
  const imageClass = classes ? ` class="${escapeHtml(classes)}"` : '';
  const initialSrc = isProxyUrl(firstUrl) ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' : firstUrl;
  const privateSrcAttr = isProxyUrl(firstUrl) ? ` data-private-src="${escapeHtml(firstUrl)}"` : '';

  return `<img${imageClass} src="${escapeHtml(initialSrc)}"${privateSrcAttr} data-fallback-srcs="${escapeHtml(fallbackUrls.join('|'))}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="const list=(this.getAttribute('data-fallback-srcs')||'').split('|').filter(Boolean); const next=list.shift(); if(next){ setContextOriginImgSource(this, next, list); } else { this.style.display='none'; }">`;
}

function renderContextOriginBlock(title, items, iconKey = '', model = null){
  const clean = contextOriginCleanItems(items);
  if(!clean.length) return '';

  const phrase = clean[0];
  const chips = clean
    .slice(1, 7)
    .map((item) => `<span class="mp-contextOrigin-chip">${escapeHtml(item)}</span>`)
    .join('');

  return `
    <div class="mp-contextOrigin-block is-${escapeHtml(iconKey || 'generic')}">
      ${contextOriginMedia(iconKey, title, model)}
      <div class="mp-contextOrigin-content">
        <div class="mp-contextOrigin-blockTitle">${title}</div>
        <div class="mp-contextOrigin-phrase">${escapeHtml(phrase)}</div>
        ${chips ? `<div class="mp-contextOrigin-chips">${chips}</div>` : ''}
      </div>
    </div>
  `;
}

function renderContextOriginNarrativeBlock(title, value, iconKey = '', model = null){
  const clean = contextOriginCleanItems(value);
  if(!clean.length) return '';

  return `
    <div class="mp-contextOrigin-block is-narrative is-${escapeHtml(iconKey || 'generic')}">
      ${contextOriginMedia(iconKey, title, model)}
      <div class="mp-contextOrigin-content">
        <div class="mp-contextOrigin-blockTitle">${title}</div>
        <div class="mp-contextOrigin-narrative">${escapeHtml(clean.join(' '))}</div>
      </div>
    </div>
  `;
}

function renderContextOriginTrace(items){
  const clean = Array.isArray(items) ? items.filter(Boolean) : [];
  if(!clean.length) return '';

  const chains = clean
    .map((item) => {
      if(!item || typeof item !== 'object') return '';

      const origin = String(item.origen ?? '').trim();
      const clinicalIdea = String(item.ideaClinica ?? item.idea_clinica ?? item.idea ?? '').trim();
      const technique = String(item.tecnica ?? item['t\u00e9cnica'] ?? '').trim();
      const chips = [origin, clinicalIdea, technique].filter(Boolean);
      if(!chips.length) return '';

      return `
        <div class="mp-contextOrigin-chain">
          ${origin ? `<div class="mp-contextOrigin-chainItem"><span class="mp-contextOrigin-chainLabel">${escapeHtml(uiText('context.origin', 'Origen'))}</span>${escapeHtml(origin)}</div>` : ''}
          ${origin && clinicalIdea ? `<div class="mp-contextOrigin-arrow">&darr;</div>` : ''}
          ${clinicalIdea ? `<div class="mp-contextOrigin-chainItem"><span class="mp-contextOrigin-chainLabel">${escapeHtml(uiText('context.clinicalIdea', 'Idea clínica'))}</span>${escapeHtml(clinicalIdea)}</div>` : ''}
          ${(origin || clinicalIdea) && technique ? `<div class="mp-contextOrigin-arrow">&darr;</div>` : ''}
          ${technique ? `<div class="mp-contextOrigin-chainItem"><span class="mp-contextOrigin-chainLabel">${escapeHtml(uiText('context.technique', 'Técnica'))}</span>${escapeHtml(technique)}</div>` : ''}
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  if(!chains) return '';

  return `
    <div class="mp-contextOrigin-block is-trace">
      <div class="mp-contextOrigin-blockTitle">${escapeHtml(uiText('context.trace', 'Huella'))}</div>
      ${chains}
    </div>
  `;
}

function renderContextOriginSection(model, headerImageUrl = ''){
  const data = getContextOriginData(model);
  if(!data || typeof data !== 'object') return '';

  // Quitar 'influencias' de esta lista para reactivar la pestaña.
  const hiddenContextOriginTabs = new Set(['influencias']);
  const rows = [
    {
      key:'vida',
      title:uiText('context.life', 'Vida'),
      roman:'I',
      role:uiText('context.lifeRole', 'Desde qué experiencia clínica lo pensó'),
      lead:uiText('context.lifeLead', 'Quién lo pensó, y desde qué práctica.'),
      items:contextOriginCleanItems(pickModelValue(data, ['vida', 'biografia', 'biografía', 'life', 'authorLife'])),
      narrative:true
    },
    {
      key:'epoca',
      title:uiText('context.era', 'Época'),
      roman:'II',
      role:uiText('context.eraRole', 'El momento histórico que lo hizo posible'),
      lead:uiText('context.eraLead', 'El clima de ideas en que el modelo se vuelve posible.'),
      items:contextOriginCleanItems(pickModelValue(data, ['epoca', 'época', 'periodo', 'periodoHistorico', 'periodo_histórico', 'historicalPeriod', 'epoch'])),
      narrative:true
    },
    {
      key:'problema',
      title:uiText('context.problem', 'Problema'),
      roman:'III',
      role:uiText('context.problemRole', 'El sufrimiento al que vino a responder'),
      lead:uiText('context.problemLead', 'El sufrimiento concreto que buscó atender.'),
      items:contextOriginCleanItems(pickModelValue(data, ['problemaClinico', 'problema_clinico', 'problemaClínico', 'problema', 'problemaCentral', 'clinicalProblem'])),
      narrative:true
    },
    {
      key:'influencias',
      title:uiText('context.influences', 'Influencias'),
      items:contextOriginCleanItems(pickModelValue(data, ['influenciasIntelectuales', 'influencias_intelectuales', 'influencias', 'influenciasTeoricas', 'influencias_teóricas', 'intellectualInfluences'])),
      narrative:false
    },
    {
      key:'estilo',
      title:uiText('context.style', 'Estilo'),
      roman:'IV',
      role:uiText('context.styleRole', 'La voz y el gesto clínico del método'),
      lead:uiText('context.styleLead', 'La voz clínica que dio forma al método.'),
      items:contextOriginCleanItems(pickModelValue(data, ['estiloAutor', 'estilo_autor', 'estilo', 'estiloDelAutor', 'authorStyle'])),
      narrative:false
    }
  ].filter(row => row.items.length && !hiddenContextOriginTabs.has(row.key));

  if(!rows.length) return '';

  const uid = `co_${String(model?.id || model?.modeloId || model?.label || 'model').replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
  const textFor = (row) => row.narrative ? row.items.join(' ') : row.items.join(', ');

  return `
    <div class="mp-section mp-contextOrigin">
      <div class="mp-contextOriginApple">
        <div class="mp-contextOrigin-head">
          <div class="mp-contextOrigin-eyebrow">${escapeHtml(uiText('context.historicalFramework', 'Marco histórico'))}</div>
          <span class="mp-contextOrigin-rule" aria-hidden="true"></span>
        </div>
        <div class="mp-contextOrigin-heading">
          <h4 class="mp-contextOrigin-title">${escapeHtml(uiText('context.title', 'Contexto y origen'))}</h4>
          <div class="mp-contextOrigin-subtitle">${escapeHtml(uiText('context.subtitle', 'De dónde emerge este modelo: la persona, el momento y el problema que lo hicieron necesario.'))}</div>
        </div>

        ${rows.map((row, idx) => `
          <input class="mp-co-radio" type="radio" name="${escapeHtml(uid)}" id="${escapeHtml(uid + '_' + row.key)}" data-key="${escapeHtml(row.key)}" ${idx === 0 ? 'checked' : ''}>
        `).join('')}

        <div class="mp-co-layout">
          <aside class="mp-co-tabs" role="tablist" aria-label="${escapeHtml(uiText('context.title', 'Contexto y origen'))}">
            <p class="mp-co-indexLabel">${escapeHtml(uiText('context.inThisSection', 'En este apartado'))}</p>
            ${rows.map(row => `
              <label class="mp-co-tab" data-key="${escapeHtml(row.key)}" for="${escapeHtml(uid + '_' + row.key)}">
                <span class="mp-co-tabRoman">${row.roman}</span>
                <span class="mp-co-tabCopy">
                  <span class="mp-co-tabName">${escapeHtml(row.title)}</span>
                  <span class="mp-co-tabRole">${escapeHtml(row.role)}</span>
                </span>
              </label>
            `).join('')}
          </aside>

          <article class="mp-co-article">
            <div class="mp-co-hero">
              ${rows.map(row => `
                <div class="mp-co-image" data-key="${escapeHtml(row.key)}">
                  ${contextOriginImageTag(row.key, row.title.replace(/&[^;]+;/g, ''), model, headerImageUrl)}
                  ${row.key === 'epoca' ? contextOriginTimeline(model) : ''}
                </div>
              `).join('')}
              <div class="mp-co-copy">
                ${rows.map(row => `
                  <div class="mp-co-text" data-key="${escapeHtml(row.key)}">
                    <div class="mp-co-textKicker">${row.roman} · ${escapeHtml(row.title)}</div>
                    <h5 class="mp-co-textLead">${escapeHtml(row.lead)}</h5>
                    <p class="mp-co-textBody">${escapeHtml(textFor(row))}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
}

const CHANGE_DIMS = [
  { id:'cognicion',           label:'1. Cognición',            keys:['cognicion','cognitivo'], group:'psychological' },
  { id:'afecto',              label:'2. Afecto',               keys:['afecto','emocional','experiencial'], group:'psychological' },
  { id:'atencion',            label:'3. Atención',             keys:['atencion','atencional'], group:'psychological' },
  { id:'self',                label:'4. Self',                 keys:['self','identidad','ri'], group:'psychological' },
  { id:'motivacion',          label:'5. Motivación',           keys:['motivacion','motivacional'], group:'psychological' },
  { id:'conducta_manifiesta', label:'6. Conducta manifiesta',  keys:['conducta_manifiesta','conductual','agencia'], group:'psychological' },
  { id:'biofisiologico',      label:'7. Biofisiológico',       keys:['biofisiologico','fisiologico','rf'], group:'contextual' },
  { id:'sociocultural',       label:'8. Sociocultural',        keys:['sociocultural','sistemico','relacional'], group:'contextual' }
];

function changeDimensionLabel(dimension){
  if (!dimension) return uiText('overview.dimension.defaultTitle', 'Dimensión');
  return uiText(`taxonomy.dimension.${dimension.id}`, dimension.label || dimension.id);
}

function changeProcessLabel(code, fallback = ''){
  const key = String(code || '').trim().toUpperCase();
  return uiText(`taxonomy.process.${key}`, fallback || key);
}

const CHANGE_DIM_COLORS_BY_ID = {
  cognicion:           '#C8849A',
  afecto:              '#9B7EAD',
  atencion:            '#6E8198',
  self:                '#D7A85A',
  motivacion:          '#A96D96',
  conducta_manifiesta: '#D49A55',
  biofisiologico:      '#7FD1B9',
  sociocultural:       '#A7B18A'
};

function readDimensionValue(dimObj, keys){
  const aliases = Array.isArray(keys) ? keys : [];
  for (const key of aliases){
    const raw = Number(dimObj?.[key]);
    if (Number.isFinite(raw) && raw > 0){
      return raw;
    }
  }
  return 0;
}

function pickFirstObject(...candidates){
  for (const c of candidates){
    if (c && typeof c === 'object' && !Array.isArray(c)) return c;
  }
  return null;
}

function numOrNull(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getModelProcessMap(model){
  if (!model || typeof model !== 'object') return {};

  const raw = pickFirstObject(
    model.graficaProcesos,
    model.grafica_procesos,
    model.procesosGrafica,
    model.procesos_grafica,
    model.procesosCambio,
    model.procesos_cambio,
    model.procesos
  ) || {};

  const out = {};
  const keyToCode = new Map();
  for (const p of PROCESS_FILTERS){
    const code = String(p.id || '').toUpperCase();
    const label = String(p.label || '');
    const aliases = [
      code,
      label,
      normProcKey(code),
      normProcKey(label),
      label.toLowerCase(),
      String(code).toLowerCase()
    ];
    aliases.forEach((a) => keyToCode.set(normProcKey(a), code));
  }

  for (const [k, v] of Object.entries(raw)){
    const parsed = numOrNull(v);
    if (parsed === null) continue;
    const nk = normProcKey(k);
    const code = keyToCode.get(nk);
    if (!code) continue;
    out[code] = parsed;
  }

  return out;
}

function getModelDimensionMap(model){
  if (!model || typeof model !== 'object') return {};

  const raw = pickFirstObject(
    model.dimensionesCambio,
    model.dimensiones_cambio,
    model.graficaDimensiones,
    model.grafica_dimensiones,
    model.dimensiones
  ) || {};

  const out = {};
  for (const d of CHANGE_DIMS){
    const aliases = [d.id, ...(Array.isArray(d.keys) ? d.keys : [])].map(normDimKey);
    let val = null;
    for (const [k, v] of Object.entries(raw)){
      if (!aliases.includes(normDimKey(k))) continue;
      const parsed = numOrNull(v);
      if (parsed !== null){
        val = parsed;
        break;
      }
    }
    if (val !== null) out[d.id] = val;
  }

  return out;
}

function modelHasProcessData(model){
  const p = getModelProcessMap(model);
  return Object.values(p).some((v) => Number(v) > 0);
}

function modelHasDimensionData(model){
  const d = getModelDimensionMap(model);
  return Object.values(d).some((v) => Number(v) > 0);
}

function normDimKey(s){
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}

function readDimensionJustification(dimObj, modelMeta, keys){
  const buckets = [
    modelMeta?.dimensionesCambioJustificacion,
    modelMeta?.dimensionesJustificacion,
    dimObj?._justificacion,
    dimObj?.justificacion
  ].filter(v => v && typeof v === 'object');

  if (!buckets.length) return '';

  const aliases = Array.isArray(keys) ? keys : [];
  const normAliases = aliases.map(normDimKey);

  for (const bucket of buckets){
    for (const [rawKey, rawVal] of Object.entries(bucket)){
      if (typeof rawVal !== 'string' || !rawVal.trim()) continue;
      const nk = normDimKey(rawKey);
      if (normAliases.includes(nk)){
        return rawVal.trim();
      }
    }
  }
  return '';
}

function normProcKey(s){
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'');
}

function readProcessJustification(processObj, modelMeta, code, label){
  const buckets = [
    modelMeta?.graficaProcesosJustificacion,
    modelMeta?.procesosJustificacion,
    processObj?._justificacion,
    processObj?.justificacion
  ].filter(v => v && typeof v === 'object');

  if (!buckets.length) return '';

  const aliases = [
    String(code ?? ''),
    String(label ?? ''),
    String(code ?? '').toLowerCase(),
    normProcKey(code),
    normProcKey(label)
  ].filter(Boolean).map(normProcKey);

  for (const bucket of buckets){
    for (const [rawKey, rawVal] of Object.entries(bucket)){
      if (typeof rawVal !== 'string' || !rawVal.trim()) continue;
      const k = normProcKey(rawKey);
      if (aliases.includes(k)){
        return rawVal.trim();
      }
    }
  }
  return '';
}

function renderDimensionesCambioChart(dimObj, modelMeta = null){
  const vals = CHANGE_DIMS.map((d, idx) => {
    const value = readDimensionValue(dimObj, d.keys);
    const justification = readDimensionJustification(dimObj, modelMeta, d.keys);
    const color = CHANGE_DIM_COLORS_BY_ID[d.id] || '#A9B1C5';
    return { ...d, label:changeDimensionLabel(d), color, value, justification, _idx: idx };
  });

  const total = vals.reduce((acc, d) => acc + d.value, 0);
  const sortedVals = vals.slice().sort((a, b) => (b.value - a.value) || (a._idx - b._idx));

  if (total <= 0){
    return `
      <div class="dim-card">
        <h4 class="dim-title">${escapeHtml(uiText('graph.intervenesDimensions', 'Interviene en las siguientes dimensiones'))}</h4>
        <div class="dim-empty">${escapeHtml(uiText('graph.undefinedForModel', 'Sin definir en este modelo.'))}</div>
      </div>
    `;
  }

  const pctFormatter = new Intl.NumberFormat(MODELOS_LOCALE, { minimumFractionDigits:1, maximumFractionDigits:1 });
  const fmtPct = (n) => `${pctFormatter.format(n)}%`;
  const polar = (deg, r = 56) => {
    const rad = (deg * Math.PI) / 180;
    return [60 + (r * Math.cos(rad)), 60 + (r * Math.sin(rad))];
  };
  const pieSectorPath = (startDeg, endDeg, r = 56) => {
    const span = endDeg - startDeg;
    const [x1, y1] = polar(startDeg, r);
    const [x2, y2] = polar(endDeg, r);
    const largeArc = span > 180 ? 1 : 0;
    return `M 60 60 L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
  };
  const pieRevealPath = (endDeg, r = 86) => {
    const startDeg = -90;
    const clampedEnd = Math.max(startDeg + 0.001, Math.min(270, endDeg));
    const [x1, y1] = polar(startDeg, r);
    const [x2, y2] = polar(clampedEnd, r);
    const span = clampedEnd - startDeg;
    const largeArc = span > 180 ? 1 : 0;
    return `M 60 60 L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
  };

  let angleAcc = 0;
  const segments = [];
  let segOrder = 0;
  for (const d of sortedVals){
    if (d.value <= 0) continue;
    const startDeg = ((angleAcc / total) * 360) - 90;
    angleAcc += d.value;
    const endDeg = ((angleAcc / total) * 360) - 90;
    const span = endDeg - startDeg;
    const pct = (d.value / total) * 100;
    const title = `${d.label} · ${fmtPct(pct)}`;

    if (span >= 359.999){
      segments.push(`
        <circle
          class="dim-segment"
          data-dim-id="${d.id}"
          style="--segmentColor:${d.color};--seg-i:${segOrder}"
          cx="60" cy="60" r="56" fill="${d.color}">
          <title>${escapeHtml(title)}</title>
        </circle>
      `);
      segOrder += 1;
      continue;
    }

    segments.push(`
      <path
        class="dim-segment"
        data-dim-id="${d.id}"
        style="--segmentColor:${d.color};--seg-i:${segOrder}"
        fill="${d.color}"
        d="${pieSectorPath(startDeg, endDeg)}">
        <title>${escapeHtml(title)}</title>
      </path>
    `);
    segOrder += 1;
  }

  const hasAnyJustification = sortedVals.some((d) => !!d.justification);
  const clipId = `dimReveal_${Math.random().toString(36).slice(2, 10)}`;

  const rowTemplate = (d) => {
    const pct = (d.value / total) * 100;
    const hasJustification = !!d.justification;
    const canOpen = hasAnyJustification && hasJustification;
    const rowClass = `dim-row${canOpen ? '' : ' no-justification'}`;
    const detailHtml = canOpen
      ? `<div class="dim-detail" data-dim-id="${d.id}" hidden>${escapeHtml(d.justification)}</div>`
      : '';

    return `
      <div class="dim-item" data-dim-id="${d.id}" style="--dot:${d.color}">
        <button
          type="button"
          class="${rowClass}"
          data-dim-id="${d.id}"
          data-can-open="${canOpen ? '1' : '0'}"
          style="--dot:${d.color}"
          aria-expanded="false">
          <span class="dim-dot" style="--dot:${d.color}"></span>
          <span class="dim-label">${escapeHtml(d.label)}</span>
          <span class="dim-val">${fmtPct(pct)}</span>
        </button>
        ${detailHtml}
      </div>
    `;
  };

  const psychologicalRows = sortedVals
    .filter((d) => d.group !== 'contextual')
    .map(rowTemplate)
    .join('');

  const contextualRows = sortedVals
    .filter((d) => d.group === 'contextual')
    .map(rowTemplate)
    .join('');

  const rows = `
    <div class="dim-group">
      <div class="dim-groupTitle">${escapeHtml(uiText('graph.psychologicalDimensions', 'Dimensiones psicológicas'))}</div>
      <div class="dim-groupList">${psychologicalRows || '<div class="dim-empty">—</div>'}</div>
    </div>
    <div class="dim-group">
      <div class="dim-groupTitle">${escapeHtml(uiText('graph.contextualDimensions', 'Dimensiones contextuales'))}</div>
      <div class="dim-groupList">${contextualRows || '<div class="dim-empty">—</div>'}</div>
    </div>
  `;

  return `
    <div class="dim-card">
      <h4 class="dim-title">${escapeHtml(uiText('network.dimensions', 'Dimensiones'))}</h4>
      <div class="dim-pieWrap">
        <div class="dim-pie dim-interactive" role="img" aria-label="${escapeHtml(uiText('graph.dimensionDistribution', 'Distribución de dimensiones psicológicas y niveles contextuales'))}">
          <svg class="dim-pieSvg" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <clipPath id="${clipId}">
                <path class="dim-revealMaskPath" data-reveal-path d="${pieRevealPath(-89.8)}"></path>
              </clipPath>
            </defs>
            <g class="dim-segments" clip-path="url(#${clipId})">
              ${segments.join('')}
            </g>
          </svg>
        </div>
      </div>
      <div class="dim-list">${rows}</div>
      <div class="dim-reference">
        ${escapeHtml(uiText('graph.basedOnClassification', 'Basado en la clasificación descrita en'))} Hofmann, S. G., Hayes, S. C., &amp; Lorscheid, D. N. (2021). <em>Learning Process-Based Therapy: A Skills Training Manual for Targeting the Core Processes of Psychological Change in Clinical Practice</em>. Oakland, CA: New Harbinger Publications.
      </div>
    </div>
  `;
}

function initDimHoverSync(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const cards = root.querySelectorAll('.dim-card');

  cards.forEach((card) => {
    if (card.dataset.dimHoverBound === '1') return;
    card.dataset.dimHoverBound = '1';

    const rows = Array.from(card.querySelectorAll('.dim-row[data-dim-id]'));
    const items = Array.from(card.querySelectorAll('.dim-item[data-dim-id]'));
    const details = Array.from(card.querySelectorAll('.dim-detail[data-dim-id]'));
    const segs = Array.from(card.querySelectorAll('.dim-segment[data-dim-id]'));
    if (!rows.length || !segs.length) return;

    const setHover = (id) => {
      card.classList.toggle('has-hover', !!id);
      rows.forEach((row) => row.classList.toggle('is-linked-hover', !!id && row.dataset.dimId === id));
      segs.forEach((seg) => seg.classList.toggle('is-linked-hover', !!id && seg.dataset.dimId === id));
    };

    const canOpenId = (id) => {
      const row = rows.find((r) => r.dataset.dimId === id);
      if (!row) return false;
      if (row.dataset.canOpen !== '1') return false;
      return details.some((detail) => detail.dataset.dimId === id);
    };

    const setOpen = (id) => {
      if (!canOpenId(id)) return;
      const current = String(card.dataset.openDimId || '');
      const next = (current === id) ? '' : id;
      card.dataset.openDimId = next;

      items.forEach((item) => {
        const on = !!next && item.dataset.dimId === next;
        item.classList.toggle('is-open', on);
      });

      rows.forEach((row) => {
        const on = !!next && row.dataset.dimId === next;
        row.setAttribute('aria-expanded', on ? 'true' : 'false');
      });

      details.forEach((detail) => {
        const on = !!next && detail.dataset.dimId === next;
        detail.hidden = !on;
      });

      segs.forEach((seg) => seg.classList.toggle('is-linked-open', !!next && seg.dataset.dimId === next));
    };

    const bind = (el) => {
      const id = el.dataset.dimId;
      if (!id) return;
      el.addEventListener('mouseenter', () => setHover(id));
      el.addEventListener('mouseleave', () => setHover(''));
      el.addEventListener('click', () => {
        if (el.classList.contains('dim-row') && el.dataset.canOpen !== '1') return;
        setOpen(id);
      });
    };

    rows.forEach(bind);
    segs.forEach(bind);
  });
}

function initProcessDetailSync(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const cards = root.querySelectorAll('.grafica-procesos');

  cards.forEach((card) => {
    if (card.dataset.procDetailBound === '1') return;
    card.dataset.procDetailBound = '1';

    const rows = Array.from(card.querySelectorAll('.fila-proceso[data-proc-id]'));
    const items = Array.from(card.querySelectorAll('.proceso-item[data-proc-id]'));
    const details = Array.from(card.querySelectorAll('.proceso-detail[data-proc-id]'));
    if (!rows.length) return;

    const canOpenId = (id) => {
      const row = rows.find((r) => r.dataset.procId === id);
      if (!row || row.dataset.canOpen !== '1') return false;
      return details.some((d) => d.dataset.procId === id);
    };

    const setOpen = (id) => {
      if (!canOpenId(id)) return;
      const current = String(card.dataset.openProcId || '');
      const next = (current === id) ? '' : id;
      card.dataset.openProcId = next;

      items.forEach((item) => {
        const on = !!next && item.dataset.procId === next;
        item.classList.toggle('is-open', on);
      });

      rows.forEach((row) => {
        const on = !!next && row.dataset.procId === next;
        row.setAttribute('aria-expanded', on ? 'true' : 'false');
      });

      details.forEach((detail) => {
        const on = !!next && detail.dataset.procId === next;
        detail.hidden = !on;
      });
    };

    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.procId;
        if (!id || row.dataset.canOpen !== '1') return;
        setOpen(id);
      });
    });
  });
}

function animateProcessBars(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const bars = Array.from(root.querySelectorAll('.grafica-procesos .barra[data-target-width]'));
  if (!bars.length) return;

  bars.forEach((bar) => {
    const raw = Number(bar.dataset.targetWidth);
    const target = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
    bar.style.width = '0%';
    bar.dataset.targetWidth = String(target);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bars.forEach((bar) => {
        bar.style.width = `${bar.dataset.targetWidth}%`;
      });
    });
  });
}

function animateDimPie(cardEl){
  if (!cardEl || cardEl.dataset.dimAnimated === '1') return;
  const segs = cardEl.querySelectorAll('.dim-segment');
  if (!segs.length){
    cardEl.dataset.dimAnimated = '1';
    return;
  }

  const revealPathEl = cardEl.querySelector('.dim-revealMaskPath[data-reveal-path]');
  const revealPathAt = (endDeg, r = 86) => {
    const startDeg = -90;
    const clampedEnd = Math.max(startDeg + 0.001, Math.min(270, endDeg));
    const radA = (startDeg * Math.PI) / 180;
    const radB = (clampedEnd * Math.PI) / 180;
    const x1 = 60 + (r * Math.cos(radA));
    const y1 = 60 + (r * Math.sin(radA));
    const x2 = 60 + (r * Math.cos(radB));
    const y2 = 60 + (r * Math.sin(radB));
    const span = clampedEnd - startDeg;
    const largeArc = span > 180 ? 1 : 0;
    return `M 60 60 L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
  };
  const fullRevealPath = 'M 60 60 m -86 0 a 86 86 0 1 0 172 0 a 86 86 0 1 0 -172 0';

  if (!revealPathEl){
    cardEl.dataset.dimAnimated = '1';
    return;
  }

  cardEl.classList.add('dim-anim-pending');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cardEl.classList.add('dim-anim-running');
      cardEl.classList.remove('dim-anim-pending');
      const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (prefersReduced){
        revealPathEl.setAttribute('d', fullRevealPath);
        cardEl.dataset.dimAnimated = '1';
        cardEl.classList.remove('dim-anim-running');
        return;
      }

      const duration = 1250;
      const startTs = performance.now();
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const tick = (now) => {
        const raw = (now - startTs) / duration;
        const t = Math.max(0, Math.min(1, raw));
        const eased = easeOutCubic(t);
        const endDeg = -90 + (360 * eased);
        revealPathEl.setAttribute('d', revealPathAt(endDeg));

        if (t < 1){
          requestAnimationFrame(tick);
          return;
        }

        revealPathEl.setAttribute('d', fullRevealPath);
        cardEl.dataset.dimAnimated = '1';
        cardEl.classList.remove('dim-anim-running');
      };

      requestAnimationFrame(tick);
    });
  });
}

function initGraphEntranceAnimations(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const barCards = Array.from(root.querySelectorAll('.grafica-procesos'));
  const dimCards = Array.from(root.querySelectorAll('.dim-card'));
  const targets = [...barCards, ...dimCards];
  if (!targets.length) return;

  // estado inicial: barras a 0 y pie preparado
  barCards.forEach((card) => {
    const bars = card.querySelectorAll('.barra[data-target-width]');
    bars.forEach((bar) => {
      bar.style.width = '0%';
    });
    card.dataset.barsAnimated = '0';
  });

  dimCards.forEach((card) => {
    card.classList.add('dim-anim-pending');
    card.dataset.dimAnimated = '0';
  });

  const triggerTarget = (el) => {
    if (!el) return;
    if (el.classList.contains('grafica-procesos') && el.dataset.barsAnimated !== '1'){
      animateProcessBars(el);
      el.dataset.barsAnimated = '1';
    }
    if (el.classList.contains('dim-card') && el.dataset.dimAnimated !== '1'){
      animateDimPie(el);
    }
  };

  if (!('IntersectionObserver' in window)){
    targets.forEach(triggerTarget);
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      triggerTarget(entry.target);
      obs.unobserve(entry.target);
    });
  }, {
    root: null,
    threshold: 0.28,
    rootMargin: '0px 0px -8% 0px'
  });

  targets.forEach((el) => io.observe(el));
}

function syncMobileGraphDisclosures(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 980px)').matches);
  const disclosures = root.querySelectorAll('details.mobile-graphDisclosure');

  disclosures.forEach((details) => {
    if (details.dataset.mobileGraphBound !== '1'){
      details.dataset.mobileGraphBound = '1';
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        requestAnimationFrame(() => {
          initGraphEntranceAnimations(details);
          syncProcesosGridHeights(details);
        });
      });
    }

    if (isMobile){
      if (details.dataset.mobileInitialised !== '1'){
        details.open = false;
        details.dataset.mobileInitialised = '1';
      }
      return;
    }

    details.open = true;
    details.dataset.mobileInitialised = '0';
  });
}

function initMobileGraphDisclosureResize(){
  if (window.__mobileGraphDisclosureResizeBound) return;
  window.__mobileGraphDisclosureResizeBound = true;
  window.addEventListener('resize', () => {
    const panel = document.getElementById('modelInfo');
    if (panel) syncMobileGraphDisclosures(panel);
  }, { passive:true });
}

function syncProcesosGridHeights(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 980px)').matches);
  const grids = root.querySelectorAll('.procesos-grid');

  grids.forEach((grid) => {
    const left = grid.querySelector('.grafica-procesos');
    const body = grid.querySelector('.dim-colBody');
    const btn = grid.querySelector('.dim-expandBtn');
    if (!left || !body || !btn) return;

    body.classList.remove('is-collapsed');
    body.style.maxHeight = 'none';

    if (isNarrow){
      body.dataset.expanded = '1';
      btn.hidden = true;
      btn.setAttribute('aria-expanded', 'true');
      return;
    }

    const target = Math.ceil(left.getBoundingClientRect().height);
    const natural = Math.ceil(body.scrollHeight);
    let expanded = body.dataset.expanded === '1';
    const hasOverflow = natural > (target + 2);

    if (!hasOverflow){
      body.dataset.expanded = '0';
      expanded = false;
    }

    if (!expanded && hasOverflow){
      body.style.maxHeight = `${target}px`;
      body.classList.add('is-collapsed');
    }

    const showBtn = hasOverflow || expanded;
    btn.hidden = !showBtn;
    btn.textContent = expanded
      ? uiText('common.viewLess', 'Ver menos')
      : uiText('common.viewMore', 'Ver más');
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });
}

function initProcesosHeightSync(rootEl){
  const root = (rootEl && typeof rootEl.querySelectorAll === 'function') ? rootEl : document;
  const grids = root.querySelectorAll('.procesos-grid');

  grids.forEach((grid) => {
    const body = grid.querySelector('.dim-colBody');
    const btn = grid.querySelector('.dim-expandBtn');
    if (!body || !btn) return;

    if (btn.dataset.bound !== '1'){
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        body.dataset.expanded = (body.dataset.expanded === '1') ? '0' : '1';
        syncProcesosGridHeights(root);
      });
    }
  });

  syncProcesosGridHeights(root);

  if (!window.__procesosHeightResizeBound){
    window.__procesosHeightResizeBound = true;
    window.addEventListener('resize', () => {
      const panel = document.getElementById('modelInfo');
      if (panel) syncProcesosGridHeights(panel);
    });
  }
}

function renderGraficaProcesos(modelOrProcesos, options = {}){
  const hasModelObj = !!(modelOrProcesos && typeof modelOrProcesos === 'object');
  const procesos = hasModelObj ? getModelProcessMap(modelOrProcesos) : (modelOrProcesos || {});
  const dimensiones = hasModelObj ? getModelDimensionMap(modelOrProcesos) : null;
  const hasProcValues = Object.values(procesos || {}).some((v) => Number(v) > 0);
  const includeDimensions = options.includeDimensions !== false;

  const processOnlyEmptyHtml = `
    <div class="mp-section">
      <div class="grafica-procesos">
        <h4 class="dim-title">${escapeHtml(uiText('graph.throughProcesses', 'A través de (procesos de cambio)'))}</h4>
        <div class="dim-empty">${escapeHtml(uiText('graph.noProcesses', 'Sin procesos definidos.'))}</div>
      </div>
    </div>
  `;

  const processOnlyHtml = (filas) => `
    <div class="mp-section">
      <div class="grafica-procesos">
        <h4 class="dim-title">${escapeHtml(uiText('graph.throughProcesses', 'A través de (procesos de cambio)'))}</h4>
        ${filas}
      </div>
    </div>
  `;

  if(!procesos || typeof procesos !== 'object' || !hasProcValues){
    if (!includeDimensions) return processOnlyEmptyHtml;
    return `
      <div class="mp-section">
        <div class="procesos-grid">
          <details class="mobile-graphDisclosure" data-mobile-graph="dimensions" open>
            <summary>${escapeHtml(uiText('graph.changeDimensions', 'Dimensiones de cambio'))}</summary>
            <div class="mobile-graphDisclosureBody">
          <div class="dim-col">
            <div class="dim-colBody" data-expanded="0">
              ${renderDimensionesCambioChart(dimensiones, modelOrProcesos)}
            </div>
              <button class="dim-expandBtn" type="button" hidden aria-expanded="false">${escapeHtml(uiText('common.viewMore', 'Ver más'))}</button>
          </div>
            </div>
          </details>
          <details class="mobile-graphDisclosure" data-mobile-graph="processes" open>
            <summary>${escapeHtml(uiText('graph.changeProcesses', 'Procesos de cambio'))}</summary>
            <div class="mobile-graphDisclosureBody">
          <div class="grafica-procesos">
            <h4 class="dim-title">${escapeHtml(uiText('graph.throughProcesses', 'A través de (procesos de cambio)'))}</h4>
            <div class="dim-empty">${escapeHtml(uiText('graph.noProcesses', 'Sin procesos definidos.'))}</div>
          </div>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  const orden = ['RF', 'RE', 'AP', 'RI', 'N', 'I', 'AG', 'R'];
  const labels = {
    RF: changeProcessLabel('RF', 'Regular cuerpo'),
    RE: changeProcessLabel('RE', 'Regular emociones'),
    AP: changeProcessLabel('AP', 'Procesar experiencia emocional'),
    RI: changeProcessLabel('RI', 'Transformar la relación con uno mismo'),
    N: changeProcessLabel('N', 'Construir significado / narrativa'),
    I: changeProcessLabel('I', 'Configurar identidad'),
    AG: changeProcessLabel('AG', 'Ejercer agencia'),
    R: changeProcessLabel('R', 'Transformar las relaciones')
  };

  const filas = orden.map((code) => {
    const raw = Number(procesos?.[code]);
    const valor = Number.isFinite(raw) ? Math.max(0, Math.min(4, raw)) : 0;
    const width = (valor / 4) * 100;
    const widthSafe = Math.max(0, Math.min(100, width));
    const tip = labels[code] || code;
    const justification = readProcessJustification(procesos, modelOrProcesos, code, tip);
    const canOpen = !!justification;
    const rowClass = `fila-proceso${canOpen ? '' : ' no-justification'}`;
    const detailHtml = canOpen
      ? `<div class="proceso-detail" data-proc-id="${code}" hidden>${escapeHtml(justification)}</div>`
      : '';

    return `
      <div class="proceso-item" data-proc-id="${code}">
        <button
          type="button"
          class="${rowClass}"
          data-proc-id="${code}"
          data-can-open="${canOpen ? '1' : '0'}"
          aria-expanded="false">
        <div class="label-proceso" title="${escapeHtml(tip)}">
          <span class="proceso-codigo">${code}</span>
          <span class="proceso-nombre">${escapeHtml(tip)}</span>
        </div>
        <div class="barra-container" title="${escapeHtml(tip)}">
          <div class="barra" data-target-width="${widthSafe}" style="width:0%"></div>
        </div>
        <span class="proceso-percent">${Math.round(widthSafe)}%</span>
        </button>
        ${detailHtml}
      </div>
    `;
  }).join('');

  if (!includeDimensions){
    return processOnlyHtml(filas);
  }

  return `
    <div class="mp-section">
      <div class="procesos-grid">
        <details class="mobile-graphDisclosure" data-mobile-graph="dimensions" open>
          <summary>${escapeHtml(uiText('graph.changeDimensions', 'Dimensiones de cambio'))}</summary>
          <div class="mobile-graphDisclosureBody">
        <div class="dim-col">
          <div class="dim-colBody" data-expanded="0">
            ${renderDimensionesCambioChart(dimensiones, modelOrProcesos)}
          </div>
          <button class="dim-expandBtn" type="button" hidden aria-expanded="false">${escapeHtml(uiText('common.viewMore', 'Ver más'))}</button>
        </div>
          </div>
        </details>
        <details class="mobile-graphDisclosure" data-mobile-graph="processes" open>
          <summary>${escapeHtml(uiText('graph.changeProcesses', 'Procesos de cambio'))}</summary>
          <div class="mobile-graphDisclosureBody">
        <div class="grafica-procesos">
          <h4 class="dim-title">${escapeHtml(uiText('graph.throughProcesses', 'A través de (procesos de cambio)'))}</h4>
          ${filas}
        </div>
          </div>
        </details>
      </div>
    </div>
  `;
}

function renderSubDetailsList(items){
  const clean = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!clean.length) return `<div>—</div>`;

  return `
    <div class="mp-sub">
      ${clean.map((item) => `
        <details>
          <summary>
            <span class="subLeft">
              <span class="subTitle">${escapeHtml(item.title || uiText('common.untitled', 'Sin título'))}</span>
            </span>
            <span class="subRight">
              <span class="chev">▾</span>
            </span>
          </summary>
          <div class="subBody">
            <div class="subText">${escapeHtml(item.body || '—')}</div>
          </div>
        </details>
      `).join('')}
    </div>
  `;
}

function sectionConceptsInner(arr){
  const list = Array.isArray(arr) ? arr.filter(Boolean) : [];
  if(!list.length) return `<div>—</div>`;

  return renderSubDetailsList(list.map((it, idx) => {
    if (typeof it === 'string'){
      return { title: it.trim() || uiText('concept.fallback', 'Concepto {number}', { number:idx+1 }), body: '—' };
    }

    const titleRaw = String(
      it?.titulo ??
      it?.concepto ??
      it?.nombre ??
      it?.title ??
      uiText('concept.fallback', 'Concepto {number}', { number:idx+1 })
    ).trim();

    const bodyRaw = String(
      it?.descripcion ??
      it?.definicion ??
      it?.texto ??
      it?.body ??
      ''
    ).trim();

    return {
      title: titleRaw || uiText('concept.fallback', 'Concepto {number}', { number:idx+1 }),
      body: bodyRaw || '—'
    };
  }));
}

function sectionProceduresInner(arr, options = {}){
  const a = Array.isArray(arr) ? arr : [];
  const itemType = String(options?.type || '').trim().toLowerCase();
  const modelMeta = options?.model || null;

  // ✅ filtra entradas realmente útiles (evita huecos)
  const clean = a
    .filter(Boolean)
    .filter(p => {
      const hasName = (p.nombre && String(p.nombre).trim().length);
      const hasText = (p.texto && String(p.texto).trim().length);
      const hasCode = (p.codigo && String(p.codigo).trim().length);
      return hasName || hasText || hasCode;
    });

  if(!clean.length) return `<div>—</div>`;

  return `
    <div class="mp-sub">
      ${clean.map(p => {
        const title = escapeHtml(p.nombre && String(p.nombre).trim() ? p.nombre : uiText('common.untitled', 'Sin título'));
        const code  = (p.codigo && String(p.codigo).trim())
          ? `<span class="mp-code">${escapeHtml(p.codigo)}</span>` : '';
        const bodyText = (p.texto && String(p.texto).trim()) ? p.texto : '—';

        const isoHtml = renderTechniqueIsomorphisms(modelMeta, {
          tipo: itemType,
          nombre: p.nombre || '',
          codigo: p.codigo || ''
        });

      const dataCodeAttr = (p.codigo && String(p.codigo).trim())
  ? ` data-code="${escapeHtml(p.codigo)}"`
  : '';

return `
  <details${dataCodeAttr}>

            <summary>
              <span class="subLeft">
                <span class="subTitle">${title}</span>
              </span>
              <span class="subRight">
                ${code}
                <span class="chev">▾</span>
              </span>
            </summary>
            <div class="subBody">
              <div class="subText">${escapeHtml(bodyText)}</div>
              ${isoHtml}
            </div>
          </details>
        `;
      }).join('')}
    </div>
  `;
}

function sectionSequencesInner(arr){
  const a = Array.isArray(arr) ? arr : [];
  const clean = a.filter(Boolean).filter(s => {
    const hasName = (s.nombre && String(s.nombre).trim().length);
    const hasDesc = (s.descripcion && String(s.descripcion).trim().length);
    const hasSteps = Array.isArray(s.pasos) && s.pasos.length;
    return hasName || hasDesc || hasSteps;
  });

  if (!clean.length) return `<div>—</div>`;

  return `
    <div class="ed-sequencesList">
      ${clean.map((seq, seqIndex) => {
        const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][seqIndex] || String(seqIndex + 1).padStart(2, '0');
        const title = escapeHtml(seq.nombre && String(seq.nombre).trim() ? seq.nombre : uiText('common.untitled', 'Sin título'));
        const descRaw = seq.descripcion && String(seq.descripcion).trim() ? String(seq.descripcion).trim() : '';
        const desc = escapeHtml(descRaw);

        const steps = Array.isArray(seq.pasos) ? seq.pasos : [];
        const stepsSorted = steps.slice().sort((x,y) => (x?.orden ?? 0) - (y?.orden ?? 0));
        const isCyclic = String(seq.tipo || '') === 'protocolo_ciclico';

        const stepsHtml = stepsSorted.map((st, i) => {
          const ord = (st && st.orden != null) ? st.orden : (i+1);
          const accTxt = escapeHtml(st?.accion ? String(st.accion) : '—');
          const procs = Array.isArray(st?.procesos) ? st.procesos : [];
          const procsHtml = procs.length
            ? `<div class="ed-seqProcesses">${procs.map(p => `<span>${escapeHtml(p)}</span>`).join('')}</div>`
            : '';
          const expTxt = escapeHtml(st?.explicacion ? String(st.explicacion) : '');
          const hasDetail = !!(expTxt || procsHtml);

          return `
            <details class="ed-seqStep" ${i === 0 && hasDetail ? 'open' : ''} ${hasDetail ? '' : 'data-noexp="1"'}>
              <summary>
                <span class="ed-seqStepNum">${escapeHtml(String(ord).padStart(2, '0'))}</span>
                <span class="ed-seqStepTitle">${accTxt}</span>
                ${hasDetail ? '<span class="ed-seqStepToggle" aria-hidden="true"></span>' : ''}
              </summary>
              ${hasDetail ? `<div class="ed-seqStepBody">${expTxt ? `<p>${expTxt}</p>` : ''}${procsHtml}</div>` : ''}
            </details>
          `;
        }).join('');

        return `
          <details class="ed-sequence">
            <summary class="ed-sequenceSummary">
              <span class="ed-sequenceRoman">${roman}</span>
              <span class="ed-sequenceTitle">${title}</span>
              <span class="ed-sequenceMeta">${escapeHtml(isCyclic
                ? uiText('sequence.cyclic', 'Secuencia cíclica')
                : uiPlural('sequence.step', stepsSorted.length, '1 paso', '{count} pasos', { count:stepsSorted.length }))}</span>
              <span class="ed-sequenceToggle" aria-hidden="true"></span>
            </summary>
            <div class="ed-sequenceBody">
              ${desc ? `<p class="ed-sequenceDesc">${desc}</p>` : ''}
              <div class="ed-sequenceSteps${isCyclic ? ' is-cyclic' : ''}">${stepsHtml || `<p class="ed-sequenceEmpty">${escapeHtml(uiText('sequence.noSteps', 'Sin pasos descritos.'))}</p>`}</div>
            </div>
          </details>
        `;
      }).join('')}
    </div>
  `;
}


function sectionAliInner(obj){
  if(!obj || typeof obj !== 'object') return `<div>—</div>`;
  const entries = Object.entries(obj).filter(([k,v]) => v && String(v).trim());
  if(!entries.length) return `<div>—</div>`;

  const allianceLabels = {
    vinculo: uiText('alliance.bond', 'Vínculo'),
    objetivos: uiText('alliance.goals', 'Objetivos'),
    tareas: uiText('alliance.tasks', 'Tareas'),
    colaboracion: uiText('alliance.collaboration', 'Colaboración'),
    sintonia: uiText('alliance.attunement', 'Sintonía'),
    rupturareparacion: uiText('alliance.ruptureRepair', 'Ruptura y reparación'),
    monitorizacion: uiText('alliance.monitoring', 'Monitorización'),
    contexto: uiText('alliance.context', 'Contexto')
  };
  const nice = (k) => {
    const raw = String(k).replace(/^ALI_/, '').replace(/_/g, ' ').trim();
    const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
    return allianceLabels[normalized] || raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase());
  };

  return `<div class="ed-allianceList">${entries.map(([k,v], index) => `
    <section class="ed-allianceItem">
      <span class="ed-allianceIndex">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="ed-allianceTitle">${escapeHtml(nice(k))}</h3>
      <p class="ed-allianceText">${escapeHtml(v)}</p>
    </section>
  `).join('')}</div>`;
}

function sectionNeimeyerInner(obj){
  if(!obj || typeof obj !== 'object') return `<div>—</div>`;

  const keys = ['epistemologico','teoriaFormal','teoriaClinica'];
  const labels = {
    epistemologico: uiText('neimeyer.epistemological', 'Epistemológico'),
    teoriaFormal: uiText('neimeyer.formalTheory', 'Teoría formal'),
    teoriaClinica: uiText('neimeyer.clinicalTheory', 'Teoría clínica')
  };

  const blocks = keys
    .map(k => [k, obj[k]])
    .filter(([k,v]) => v && String(v).trim());

  if(!blocks.length) return `<div>—</div>`;

  return `<div class="ed-neimeyerList">${blocks.map(([k,v], index) => `
    <section class="ed-neimeyerItem">
      <span class="ed-neimeyerIndex">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="ed-neimeyerTitle">${escapeHtml(labels[k] ?? k)}</h3>
      <p class="ed-neimeyerText">${escapeHtml(v)}</p>
    </section>
  `).join('')}</div>`;
}

    function sectionList(title, arr, opts={}){
      const a = Array.isArray(arr) ? arr.filter(Boolean) : [];
      const asList = !!opts.asList;

      return `
        <div class="mp-section">
          <h4>${escapeHtml(title)}</h4>
          ${
            a.length
              ? (asList
                  ? `<ul class="mp-list">${a.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
                  : `<div>${a.map(x => escapeHtml(x)).join(', ')}</div>`)
              : `<div>—</div>`
          }
        </div>
      `;
    }
function sectionIdeasInner(ideas){
  const list = Array.isArray(ideas) ? ideas.filter(Boolean) : [];
  if(!list.length) return `<div>—</div>`;

  return renderSubDetailsList(list.map((it, idx) => {
    // Admite ideas como string o como objeto
    if (typeof it === 'string'){
      return {
        title: uiText('idea.fallback', 'Idea {number}', { number:idx+1 }),
        body: it.trim() || '—'
      };
    }

    const titleRaw = String(it?.titulo ?? it?.title ?? uiText('idea.fallback', 'Idea {number}', { number:idx+1 })).trim();
    const bodyRaw  = String(
      it?.desarrollo ??
      it?.texto ??
      it?.body ??
      it?.descripcion ??
      ''
    ).trim();

    return {
      title: titleRaw || uiText('idea.fallback', 'Idea {number}', { number:idx+1 }),
      body: bodyRaw || '—'
    };
  }));
}



    function sectionProcedures(title, arr){
      const a = Array.isArray(arr) ? arr.filter(Boolean) : [];
      if(!a.length){
        return `
          <div class="mp-section">
            <h4>${escapeHtml(title)}</h4>
            <div>—</div>
          </div>
        `;
      }

      return `
        <div class="mp-section">
          <h4>${escapeHtml(title)}</h4>
          <ul class="mp-list">
            ${a.map(p => `
              <li>
                <b>${escapeHtml(p.nombre ?? '—')}</b>
                ${p.codigo ? `<span class="mp-code">${escapeHtml(p.codigo)}</span>` : ''}
                ${p.texto ? `<div style="margin-top:6px; color:#e3ebf6; white-space:pre-wrap;">${escapeHtml(p.texto)}</div>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    function sectionAli(title, obj){
      if(!obj || typeof obj !== 'object'){
        return `
          <div class="mp-section">
            <h4>${escapeHtml(title)}</h4>
            <div>—</div>
          </div>
        `;
      }
      const entries = Object.entries(obj).filter(([k,v]) => v && String(v).trim());
      if(!entries.length){
        return `
          <div class="mp-section">
            <h4>${escapeHtml(title)}</h4>
            <div>—</div>
          </div>
        `;
      }

      const nice = (k) => k
        .replace(/^ALI_/, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g,' ')
        .trim();

      return `
        <div class="mp-section">
          <h4>${escapeHtml(title)}</h4>
          ${entries.map(([k,v]) => `
            <div style="margin:10px 0 0 0">
              <div style="font-weight:900; color:var(--text); font-size:12px">${escapeHtml(nice(k))}</div>
              <div style="margin-top:6px; white-space:pre-wrap; color:#e3ebf6">${escapeHtml(v)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function sectionNeimeyer(title, obj){
      if(!obj || typeof obj !== 'object'){
        return `
          <div class="mp-section">
            <h4>${escapeHtml(title)}</h4>
            <div>—</div>
          </div>
        `;
      }
      const keys = ['epistemologico','teoriaFormal','teoriaClinica'];
      const labels = {
        epistemologico: uiText('neimeyer.epistemological', 'Epistemológico'),
        teoriaFormal: uiText('neimeyer.formalTheory', 'Teoría formal'),
        teoriaClinica: uiText('neimeyer.clinicalTheory', 'Teoría clínica')
      };
      const blocks = keys
        .map(k => [k, obj[k]])
        .filter(([k,v]) => v && String(v).trim());

      if(!blocks.length){
        return `
          <div class="mp-section">
            <h4>${escapeHtml(title)}</h4>
            <div>—</div>
          </div>
        `;
      }

      return `
        <div class="mp-section">
          <h4>${escapeHtml(title)}</h4>
          ${blocks.map(([k,v]) => `
            <div style="margin:10px 0 0 0">
              <div style="font-weight:900; color:var(--text); font-size:12px">${escapeHtml(labels[k] ?? k)}</div>
              <div style="margin-top:6px; white-space:pre-wrap; color:#e3ebf6">${escapeHtml(v)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // =========================================================
    // 5) Interacción
    // =========================================================
function summarizeModelForNetwork(model){
  const raw = [
    model?.descripcion,
    model?.definicion,
    model?.fraseCorta,
    model?.frase,
    model?.quote
  ].find(v => typeof v === 'string' && v.trim());
  if (!raw) return uiText('network.noSummary', 'Sin resumen breve disponible.');
  const txt = String(raw).trim().replace(/\s+/g, ' ');
  return txt.length > 210 ? `${txt.slice(0, 207).trim()}...` : txt;
}

function renderNetworkSelectionCard(model){
  if (!networkSelectionEl) return;
  if (!model || !model.id || groupingMode !== 'network'){
    document.body.classList.remove('network-has-selection-card');
    networkSelectionEl.hidden = true;
    networkSelectionEl.innerHTML = '';
    networkSelectionEl.style.removeProperty('--schoolColor');
    networkSelectionEl.scrollTop = 0;
    syncDesktopLeftListScrollMode();
    return;
  }

  const schoolColor = colorForSchoolLabel(model.grupo);
  const photoUrl = resolveAuthorPhotoUrl(model);
  const metaBits = [
    model.autores ? String(model.autores) : '',
    model.grupo ? String(schoolDisplayLabel(model.grupo)) : '',
    model.year ? String(model.year) : ''
  ].filter(Boolean);
  const schoolName = String(schoolDisplayLabel(model.grupo) || uiText('group.school', 'Escuela'));

  document.body.classList.add('network-has-selection-card');
  networkSelectionEl.hidden = false;
  networkSelectionEl.style.setProperty('--schoolColor', schoolColor);
  networkSelectionEl.innerHTML = `
    <div class="networkSelectionHead">
      <div class="networkSelectionPhoto">
        ${photoUrl
          ? `<img data-photo-url="${escapeHtml(photoUrl)}" alt="${escapeHtml(uiText('network.authorOf', 'Autor de {model}', { model:model.label || uiText('common.model.one', 'modelo') }))}" loading="lazy" decoding="async">`
          : ''}
      </div>
      <div>
        <div class="networkSelectionSchoolRow">
          <span class="networkSelectionSchoolPill">${escapeHtml(schoolName)}</span>
        </div>
        <h3 class="networkSelectionTitle">${escapeHtml(model.label || uiText('common.model.one', 'Modelo'))}</h3>
        <p class="networkSelectionMeta">${escapeHtml(metaBits.join(' · ') || uiText('common.noMetadata', 'Sin metadatos'))}</p>
      </div>
    </div>
    <p class="networkSelectionDesc">${escapeHtml(summarizeModelForNetwork(model))}</p>
    <div class="networkSelectionActions">
      <button type="button" class="networkSelectionBtn" data-action="view-model" data-id="${escapeHtml(String(model.id))}">${escapeHtml(uiText('network.viewModel', 'Ver modelo'))}</button>
    </div>
  `;
  const photoEl = networkSelectionEl.querySelector('.networkSelectionPhoto img[data-photo-url]');
  if (photoEl) setupModelCardPhotoRetry(photoEl, photoUrl);
  networkSelectionEl.scrollTop = 0;
  syncDesktopLeftListScrollMode();
}

function renderNetworkZoneSelectionCard(zoneMetaRow, zoneModels){
  if (!networkSelectionEl) return;
  if (!zoneMetaRow || !groupingMode || groupingMode !== 'network'){
    document.body.classList.remove('network-has-selection-card');
    networkSelectionEl.hidden = true;
    networkSelectionEl.innerHTML = '';
    networkSelectionEl.style.removeProperty('--schoolColor');
    networkSelectionEl.scrollTop = 0;
    syncDesktopLeftListScrollMode();
    return;
  }

  const tint = zoneMetaRow.color || '#5F7F78';
  const title = String(zoneMetaRow.label || zoneMetaRow.short || uiText('network.zone', 'Zona'));
  const kind = String(NETWORK_FILTER_STATE.profileMode || 'process') === 'dimension'
    ? uiText('overview.dimension.defaultTitle', 'Dimensión')
    : uiText('overview.process.defaultTitle', 'Proceso');
  const rows = Array.isArray(zoneModels) ? zoneModels : [];

  document.body.classList.add('network-has-selection-card');
  networkSelectionEl.hidden = false;
  networkSelectionEl.style.setProperty('--schoolColor', tint);
  networkSelectionEl.innerHTML = `
    <div class="networkSelectionSchoolRow">
      <span class="networkSelectionSchoolPill">${escapeHtml(kind)}</span>
    </div>
    <h3 class="networkSelectionTitle">${escapeHtml(title)}</h3>
    <p class="networkSelectionMeta">${escapeHtml(uiText('network.modelsInZone', '{models} en esta {kind}.', {
      models:`${rows.length} ${uiPlural('common.model', rows.length, 'modelo', 'modelos')}`,
      kind:kind.toLocaleLowerCase(MODELOS_LOCALE)
    }))}</p>
    <div class="networkZoneList">
      ${rows.map((model) => `
        <article class="networkZoneItem" style="--schoolColor:${escapeHtml(colorForSchoolLabel(model.grupo))}">
          <div class="networkZoneItemTop">
            <div class="networkZoneItemTitle">${escapeHtml(model.label || uiText('common.model.one', 'Modelo'))}</div>
            <span class="networkZoneItemSchool">${escapeHtml(schoolDisplayLabel(model.grupo) || uiText('school.other', 'Otros'))}</span>
          </div>
          <div class="networkZoneItemMeta">${escapeHtml([model.autores || '', model.year || ''].filter(Boolean).join(' · ') || uiText('common.noMetadata', 'Sin metadatos'))}</div>
        </article>
      `).join('')}
    </div>
  `;
  networkSelectionEl.scrollTop = 0;
  syncDesktopLeftListScrollMode();
}

async function openModelFromNetworkSelection(id){
  if (window.TMPS_ATLAS) {
    await window.TMPS_ATLAS.setView('list');
    return window.TMPS_ATLAS.select(String(id || ''));
  }
  const key = String(id || '').trim();
  if (!key) return;

  const pool = getAllModelsPool();
  let baseModel = pool.find((m) => String(m?.id || '').trim() === key) || MODELS.find((m) => String(m?.id || '').trim() === key);
  if (!baseModel && Array.isArray(window.GH_SCHOOLS)){
    for (const school of window.GH_SCHOOLS){
      const label = String(school?.label || school?.id || '').trim();
      if (!label) continue;
      await ensureSchoolFromGitHub(label).catch(() => {});
      baseModel = getAllModelsPool().find((m) => String(m?.id || '').trim() === key) || MODELS.find((m) => String(m?.id || '').trim() === key);
      if (baseModel) break;
    }
  }
  if (!baseModel) return;

  groupingMode = groupingModeForSchool(baseModel.grupo);
  listGroupingMode = groupingMode;
  if (groupBySelectEl) groupBySelectEl.value = listGroupingMode;
  currentSchool = String(baseModel.grupo || currentSchool || '').trim();
  groupingTarget = collectionDefinitionForSchool(currentSchool)?.id || currentSchool;
  syncLibraryViewControls();
  NETWORK_FILTER_STATE.selectedNodeId = '';
  renderNetworkSelectionCard(null);
  syncGroupingTargetOptions();

  if (currentSchool){
    if (schoolSelect && groupingMode === 'school') schoolSelect.value = currentSchool;
    if (groupTargetSelectEl && groupingMode !== 'epistemology') groupTargetSelectEl.value = groupingTarget;
    renderSchoolInfo(currentSchool);
    renderModelsList();
    resetRightPanelToTop();
    await ensureSchoolFromGitHub(currentSchool).catch(() => {});
    renderModelsList();
  }

  infoFadeOut();
  await new Promise(r => requestAnimationFrame(r));
  await openModel(key);
  infoFadeIn();
}

if (networkSelectionEl && !networkSelectionEl.__boundClick){
  networkSelectionEl.__boundClick = true;
  networkSelectionEl.addEventListener('click', async (evt) => {
    const btn = evt.target.closest('[data-action="view-model"]');
    if (!btn) return;
    await openModelFromNetworkSelection(btn.getAttribute('data-id') || '');
  });
}

function getAllModelsPool(){
  return (window.MODELS_ALL && Array.isArray(window.MODELS_ALL) && window.MODELS_ALL.length)
    ? window.MODELS_ALL
    : (Array.isArray(MODELS) ? MODELS : []);
}

function setActiveModelInList(id){
  const key = String(id ?? '').trim();
  if (!modelsListEl) return;

  modelsListEl.querySelectorAll('.mi-item.active').forEach(el => el.classList.remove('active'));

  const target = modelsListEl.querySelector(`.mi-item[data-id="${CSS.escape(encodeURIComponent(key))}"]`);
  if (target){
    target.classList.add('active');
  }else{
    // Si el modelo está filtrado, fuerza un render para incluirlo
    try{ renderModelsList(); }catch(e){}
  }
}

function resetModelPanelToTop(){
  const rp = document.querySelector('.panel.right');
  if (!rp) return;
  rp.scrollTop = 0;
  requestAnimationFrame(() => { rp.scrollTop = 0; });
}


async function openModel(id, options = {}){
  try{
    beginModelInfoPending(id);
    window.TMPS_ATLAS?.recordSelection(id, options.updateUrl !== false);
    currentModelId = id;
    window.__CURRENT_MODEL_ID = id;

    // Analitica: cuenta fichas distintas por sesion (LANZAMIENTO.md 0.1).
    const trackedModel = (Array.isArray(window.MODELS_ALL) ? window.MODELS_ALL : MODELS)
      ?.find(x => String(x?.id ?? '').trim() === String(id).trim());
    window.track?.ficha?.(String(id), {
      escuela: trackedModel?.grupo,
      origen: window.TMPS_ATLAS?.getState?.()?.view || 'directo'
    });

    if (options.updateUrl !== false){
      updateModelUrl(id, { replace: options.replaceUrl === true });
    }

    setModelInfoOpen(true);
    setActiveModelInList(id);
    openMobileModelFullscreen();
    resetModelPanelToTop();

    const ALL = (Array.isArray(window.MODELS_ALL) && window.MODELS_ALL.length)
      ? window.MODELS_ALL
      : MODELS;

    let m =
      MODELS.find(x => String(x?.id ?? '').trim() === String(id).trim()) ||
      ALL.find(x => String(x?.id ?? '').trim() === String(id).trim());

    if(!m){
      // En embed: intenta cargar escuelas de GitHub hasta encontrar el id
      if (Array.isArray(window.GH_SCHOOLS) && window.GH_SCHOOLS.length){
        for (const s of window.GH_SCHOOLS){
          try{
            const label = s.label || s.id;
            if (!label) continue;

            await ensureSchoolFromGitHub(label);

            const ALL2 = (Array.isArray(window.MODELS_ALL) && window.MODELS_ALL.length)
              ? window.MODELS_ALL
              : MODELS;

            m = MODELS.find(x => String(x?.id ?? '').trim() === String(id).trim()) ||
                ALL2.find(x => String(x?.id ?? '').trim() === String(id).trim());

            if (m) break;
          }catch(e){}
        }
      }

      if(!m){
        console.warn("Modelo no encontrado:", id);
        renderModelInfo(null);
        return;
      }
    }

    const baseModel = m;

    // 1) Cargar primero la version publica generada.
    let publicModel = baseModel;

    try {
      publicModel = await ensureModelPublic(baseModel);
    } catch (e) {
      console.warn('No se pudo cargar la ficha publica:', id, e);
      publicModel = baseModel;
    }

    if (String(currentModelId) !== String(id)) return;
    if (window.HAS_SUBSCRIPTION_ACCESS !== true){
      publicModel = markModelAsPublicView(publicModel);
    }

    // En modo abierto no se pinta la vista parcial ni sus placeholders de
    // suscripcion: esperamos la ficha completa y la mostramos directamente.
    if (PUBLIC_LIBRARY_ACCESS){
      const fullModel = await ensureModelFull(publicModel);
      if (String(currentModelId) !== String(id)) return;
      renderModelInfo(fullModel);
      setModelSeo(fullModel);
      endModelInfoPending(id);
      if (window.__SMH) window.__SMH.rescan();
      infoFadeIn();
      return;
    }

    // 2) Pintar la version publica.
    renderModelInfo(publicModel);
    setModelSeo(publicModel);
    endModelInfoPending(id);
    infoFadeIn();

    if (window.__SMH) {
      window.__SMH.rescan();
    }

    // 3) Intentar cargar la version completa privada.
    // Si no hay sesion/suscripcion, se quedara la publica.
    const fullPromise = window.HAS_SUBSCRIPTION_ACCESS === true
      ? ensureModelFull(publicModel)
      : Promise.resolve(publicModel);

    // Si el modelo completo llega muy rápido, evita doble render (sin flicker)
    const QUICK_FULL_WAIT_MS = 140;
    let quickFull = null;
    try{
      quickFull = await Promise.race([
        fullPromise,
        new Promise(resolve => setTimeout(() => resolve(null), QUICK_FULL_WAIT_MS))
      ]);
    }catch(e){}

    if (String(currentModelId) !== String(id)) return;
    if (quickFull && quickFull !== baseModel && window.HAS_SUBSCRIPTION_ACCESS === true){
      renderModelInfo(quickFull);
      if (window.__SMH) window.__SMH.rescan();
      infoFadeIn();
      return;
    }

    // Fallback progresivo: ya se ha pintado la ficha publica.
    // No repintar el indice minimo.

    const renderFullModel = (fullModel) => {
      if (String(currentModelId ?? '').trim() !== String(id ?? '').trim()) return;
      if (window.HAS_SUBSCRIPTION_ACCESS !== true) return;
      if (fullModel && fullModel !== baseModel){
        renderModelInfo(fullModel);
        if (window.__SMH) window.__SMH.rescan();
      }
    };

    const fullModel = null;

    if (fullModel){
      renderFullModel(fullModel);
    }else{
      fullPromise
        .then(renderFullModel)
        .catch(err => console.warn('Carga tardÃ­a de modelo fallida:', id, err));
    }

    // Si el usuario ya cambió de modelo, no repintes
    if (window.__SMH) window.__SMH.rescan();

  }catch(err){
    console.error("openModel error:", err);
  }finally{
    endModelInfoPending(id);
    infoFadeIn();
  }
}

window.addEventListener('popstate', async () => {
  if (window.TMPS_ATLAS) return;
  const idFromPath = getModelIdFromPath();

  if (idFromPath){
    await openModel(idFromPath, { updateUrl: false });
    return;
  }

  endModelInfoPending();
  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';
  setLibrarySeo();
  setModelInfoOpen(false);
  setInfoFullscreen(false);
  setMobileModelPanelLowered(false);

  if (currentSchool){
    renderSchoolInfo(currentSchool);
    renderModelsList();
  }else{
    renderModelInfo(null);
  }

  resetRightPanelToTop();
});

let subscriptionAccessRenderVersion = 0;
window.addEventListener('subscription-access-change', async (evt) => {
  const version = ++subscriptionAccessRenderVersion;
  const active = !!evt?.detail?.active;

  if (!active){
    GH_MODEL_CACHE.clear();
    clearModelSessionCache();
  }

  const activeId = String(currentModelId ?? window.__CURRENT_MODEL_ID ?? '').trim();
  if (groupingMode === 'tags'){
    if (!active){
      TAGS_BY_MODEL = new Map();
      TAG_VALUES_BY_FACET = new Map();
      TAG_FILTER_STATE.forEach((values) => values.clear());
      TAGS_LOAD_ERROR = '';
    }

    renderTagFiltersPanel();
    renderModelsList();
    renderModelInfo(null);
    if (!active) return;

    await Promise.all([
      ensureAllSchoolsLoadedForGrouping(),
      loadTagsIndex()
    ]).catch((error) => {
      console.warn('No se pudo preparar la vista Tags tras activar la suscripci\u00f3n:', error);
    });

    if (version !== subscriptionAccessRenderVersion || groupingMode !== 'tags' || !hasPremiumGroupingAccess()) return;
    renderTagFiltersPanel();
    renderModelsList();
    renderModelInfo(null);
    return;
  }

  if (groupingMode === 'dimension' || groupingMode === 'process'){
    syncGroupingTargetOptions();
    renderModelsList();
    renderModelInfo(null);
    if (!active) return;

    await ensureModelsHydratedForGrouping();
    if (version !== subscriptionAccessRenderVersion || !['dimension','process'].includes(groupingMode) || !hasPremiumGroupingAccess()) return;
    renderModelsList();
    renderModelInfo(null);
    return;
  }

  if (groupingMode === 'network'){
    renderModelsList();
    renderModelInfo(null);
    return;
  }

  if (!activeId) return;

  try{
    await openModel(activeId, { updateUrl:false });
  }catch(e){
    console.warn('No se pudo refrescar la ficha tras cambiar el acceso:', activeId, e);
  }

  if (version !== subscriptionAccessRenderVersion) return;
});

function resetRightPanelToTop(){

  // panel derecho
  const rp = document.querySelector('.panel.right');
  if (rp){
    rp.scrollTop = 0;
    requestAnimationFrame(() => { rp.scrollTop = 0; });
  }

  // documento completo (embed / iframe fix)
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  requestAnimationFrame(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

function scrollLeftPanelToStickyPoint(){
  const panel = document.querySelector('.panel.left');
  if (!panel) return;
  panel.scrollTop = 0;
}

function resetModelsListToTop(){
  if (!modelsListEl) return;
  modelsListEl.scrollTop = 0;
  requestAnimationFrame(() => { modelsListEl.scrollTop = 0; });
}




schoolSelect.addEventListener('change', async () => {
  const swipeDir = window.__schoolSwipeDir || null;
  window.__schoolSwipeDir = null;
  currentSchool = schoolSelect.value;
  if (groupTargetSelectEl && groupingMode === 'school'){
    groupTargetSelectEl.value = currentSchool || '';
  }
  if (groupingMode !== 'school'){
    return;
  }
  const requestedSchool = currentSchool;
  currentModelId = null;
  window.__CURRENT_MODEL_ID = '';
  setModelInfoOpen(false);
  setInfoFullscreen(false);
  setMobileModelPanelLowered(false);

  // 1) Panel derecho en modo "escuela" + top limpio (instantáneo)
  renderSchoolInfo(currentSchool);
  resetRightPanelToTop();

  // 2) Render inmediato con lo que ya haya en memoria (sin bloquear UI)
  renderModelsList();
  resetModelsListToTop();

  // 3) Intenta traer modelos de GitHub en segundo plano
  try{
    await ensureSchoolFromGitHub(currentSchool);
  }catch(err){
    console.warn('[ensureSchoolFromGitHub] fallo, sigo con lo local:', err);
  }

  // Si el usuario ya cambió otra vez de escuela, no repintes esta respuesta tardía
  if (currentSchool !== requestedSchool) return;

  // 4) Re-render con lo que haya llegado (GH + local)
  if (!currentModelId){
    renderSchoolInfo(currentSchool);
  }
  renderModelsList();
  resetModelsListToTop();

  if (swipeDir){
    const inCls = (swipeDir === 'next') ? 'school-swipe-in-right' : 'school-swipe-in-left';
    [schoolSelect, modelsListEl, modelInfoEl, countLine].filter(Boolean).forEach(el => {
      el.classList.remove('school-swipe-out-left','school-swipe-out-right','school-swipe-in-left','school-swipe-in-right');
      el.classList.add(inCls);
      setTimeout(() => {
        el.classList.remove(inCls);
      }, 260);
    });
  }

  // 5) Ajuste sticky sin baile (doble RAF para asegurar layout)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollLeftPanelToStickyPoint();
    });
  });
});





    // =========================================================
    // 6) Helpers
    // =========================================================
  
// (eliminada: ya existe hexToRgba arriba; evita duplicados)

// =========================
// URL PARAMS (embed)
// =========================
window.__QS = window.__QS || new URLSearchParams(location.search);
window.IS_EMBED  = ["1","true","yes"].includes((window.__QS.get("embed") || "").toLowerCase());
window.OPEN_ID = (window.__QS.get("open") || getModelIdFromPath() || "").trim();

// La clase is-embed debe estar puesta ANTES del primer render (openModel más abajo):
// si se añade después, el primer pintado de la ficha usa el CSS de escritorio
// (panel.right compartiendo ancho con panel.left) y al re-pintarse ya con
// is-embed aplicado (p.ej. cuando llega la foto de cabecera tardía) el ancho
// cambia de golpe y el contenido sale recortado.
if(window.IS_EMBED){
  document.body.classList.add("embedMode", "is-embed");
}


// Adapter boundary: new Atlas views share the legacy catalog and ficha.
function getAtlasFilteredModels(){
  const mode = groupingMode === 'network' ? listGroupingMode : groupingMode;
  if (['tags','dimension','process'].includes(mode) && !hasPremiumGroupingAccess()) return [];
  return applyGroupingFilterAndSort(baseListByGroupingMode(mode), mode)
    .filter(model => !modelSearchQuery || modelMatchesSearch(model, modelSearchQuery));
}
let atlasLegacyViewQueue = Promise.resolve();
const atlasLibrary = {
  models: () => getAllModelsPool().filter(isTherapyModel),
  filteredModels: getAtlasFilteredModels,
  mapModels: () => getAllModelsPool().filter(isTherapyModel)
    .filter(model => !modelSearchQuery || modelMatchesSearch(model, modelSearchQuery)),
  mapGroups: getAtlasMapGroups,
  selectedId: () => String(currentModelId || ''),
  filters: () => ({ group: listGroupingMode, target: groupingTarget, query: modelSearchQuery }),
  color: colorForSchoolLabel,
  schoolLabel: schoolDisplayLabel,
  loadCatalog: ensureAllSchoolsLoadedForGrouping,
  publicModel: ensureModelPublic,
  readJson: async path => {
    const value = await fetchFirstJson(dataUrlCandidates(path));
    if (!value) throw new Error('Atlas data unavailable: ' + path);
    return value;
  },
  libraryPath: () => window.TMPS_MODELOS_I18N?.buildLibraryPath() || '/modelos/',
  modelIdFromPath: getModelIdFromPath,
  hideWelcome: () => { try { hideLanding(); } catch {} },
  openModel: id => openModel(id, { updateUrl: false }),
  closeProfile: () => {
    endModelInfoPending();
    currentModelId = null; window.__CURRENT_MODEL_ID = '';
    setModelInfoOpen(false); setInfoFullscreen(false); setMobileModelPanelLowered(false);
    window.__SMH?.hide(); renderModelInfo(null); setLibrarySeo(); renderModelsList();
  },
  setView: view => {
    atlasLegacyViewQueue = atlasLegacyViewQueue.catch(() => {}).then(async () => {
      const next = view === 'network' ? 'network' : listGroupingMode;
      if (groupingMode !== next) await handleGroupingModeChange(next);
      setInfoFullscreen(false); setMobileModelPanelLowered(false);
    });
    return atlasLegacyViewQueue;
  },
  restoreFilters: async state => {
    const allowed = ['all', 'school', 'collection', 'tags', 'epistemology'];
    const next = allowed.includes(state.group) ? state.group : 'all';
    if (groupingMode !== next || groupingTarget !== state.target) {
      listGroupingMode = next; groupingTarget = state.target || '';
      if (next === 'school') currentSchool = state.target || '';
      if (groupBySelectEl) groupBySelectEl.value = next;
      syncGroupingTargetOptions();
      if (groupTargetSelectEl && state.target) groupTargetSelectEl.value = state.target;
      await handleGroupingModeChange(next);
      if (state.target && groupTargetSelectEl?.value === state.target) await handleGroupingTargetChange(state.target);
    }
    modelSearchQuery = state.query || '';
    if (modelSearchInputEl) modelSearchInputEl.value = modelSearchQuery;
    if (modelSearchQuery) setModelSearchOpen(true);
    renderModelsList();
  },
};

// init (local + GitHub)
// init (local + GitHub)
(async function init(){
  try{
    await window.TMPS_MODELOS_I18N?.ready;
    syncPersistentUiTranslations();
    // Las taxonomías traducen etiquetas funcionales (escuelas, países, etc.).
    // Deben estar listas incluso cuando el índice de escuelas ya viene precargado.
    await loadLocaleTaxonomies();
    // 1) índice de escuelas GH
    if (!Array.isArray(GH_SCHOOLS) || !GH_SCHOOLS.length){
      await loadGhSchoolsIndex();
    }

    // 2) selector
    buildSchoolOptions();
    setupGroupingControls();
    setupMobileSchoolSwipe();

    // 3) precarga escuela inicial (si procede) + pinta
    if (groupingMode === 'all'){
      await ensureAllSchoolsLoadedForGrouping();
      renderModelsList();
      renderModelInfo(null);
      resetRightPanelToTop();
    }else if (currentSchool){
      await ensureSchoolFromGitHub(currentSchool);
      renderModelsList();
      renderSchoolInfo(currentSchool);
      resetRightPanelToTop();
    }else{
      renderModelsList();
      renderModelInfo(null);
    }

// 4) landing solo si NO embed y no viene open directo
if(!window.IS_EMBED && !window.OPEN_ID && !document.documentElement.classList.contains('atlas-enabled')){
  buildLandingSchools();
  showLanding();
}else{
  try{ hideLanding(); }catch(e){}
}

    // 5) open directo: abrir modelo
if (window.OPEN_ID){

  // ✅ Si nos pasan escuela en la URL, precargar ESA escuela antes de abrir
  if (window.OPEN_SCHOOL){
    try{
      currentSchool = window.OPEN_SCHOOL;
      groupingMode = groupingModeForSchool(currentSchool);
      listGroupingMode = groupingMode;
      groupingTarget = collectionDefinitionForSchool(currentSchool)?.id || currentSchool;
      if (groupBySelectEl) groupBySelectEl.value = listGroupingMode;
      syncLibraryViewControls();
      syncGroupingTargetOptions();

      // si tienes selector de escuelas, déjalo coherente
      if (typeof schoolSelect !== "undefined" && schoolSelect && groupingMode === 'school'){
        schoolSelect.value = currentSchool;
      }

      // opcional pero recomendable: que el estado visual sea consistente
      try{ renderSchoolInfo(currentSchool); }catch(e){}
      await ensureSchoolFromGitHub(currentSchool);
      try{ renderModelsList(); }catch(e){}
    }catch(e){}
  }else{
    // Fallback: comportamiento actual
    try{
      if(currentSchool) await ensureSchoolFromGitHub(currentSchool);
    }catch(e){}
  }

  await openModel(window.OPEN_ID, { replaceUrl: true });

  // En embed, forzar scroll arriba tras pintar
  if(window.IS_EMBED){
    setTimeout(() => {
      resetRightPanelToTop();
    }, 60);
  }
}

    if (!window.IS_EMBED) {
      const { mountAtlas } = await import('/atlas/atlas.js');
      await mountAtlas(atlasLibrary);
    }

    // 6) micro-ritual “loaded”
    requestAnimationFrame(()=> document.body.classList.add('loaded'));

  }catch(e){
    console.error('❌ init falló', e);
    document.body.classList.add('loaded');
  }
})();



});

  /* =========================
   EMBED HEIGHT SYNC
   ========================= */

function sendEmbedHeight(){
  try{
    const h = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
    window.parent && window.parent.postMessage(
      { type:"tmps:embedHeight", h },
      "*"
    );
  }catch(e){}
}

// al cargar
window.addEventListener("load", ()=> setTimeout(sendEmbedHeight, 50));

// cuando cambie tamaño
window.addEventListener("resize", ()=> setTimeout(sendEmbedHeight, 50));
