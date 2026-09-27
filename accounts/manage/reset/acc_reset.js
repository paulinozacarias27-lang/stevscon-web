/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/acc_reset.js
 * RESET · Coordinador + cerebro (cargar AL FINAL de los files reset).
 * - Modal propio, mismo estilo morado que ACCESS.
 * - Se abre desde el link de ACCESS: SC.reset.open().
 * - AUTO-APERTURA: si llegan con ?reset=1 (botón del correo de EmailJS),
 *   abre el modal solo y precarga ?email=...
 * - El LINK seguro lo manda Firebase (sendPasswordResetEmail) y AHORA
 *   con continueUrl: tras crear la contraseña nueva, Firebase te regresa
 *   a https://stevscon.com/ en vez de su página técnica.
 * - mail_reset.js manda el aviso bonito: NUNCA bloquea.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};

    const CONTINUE_URL = 'https://stevscon.com/';
    const COOLDOWN_SECONDS = 20;

    let overlay = null;
    let viewForm = null;
    let viewSent = null;
    let sentTextEl = null;
    let mailNoteEl = null;
    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;
    let cooldownTimer = null;
    let cooldownLeft = 0;
    let escHandler = null;
    let lastFocus = null;

    function fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }

    function field() {
        return (typeof SC.reset.get === 'function') ? SC.reset.get('reset-email') : null;
    }

    function setBusy(state, text) {
        busy = state;
        if (!btnEl) return;
        btnEl.disabled = state || cooldownLeft > 0;
        btnEl.classList.toggle('is-busy', state);
        if (spinnerEl) spinnerEl.classList.toggle('hidden', !state);
        if (labelEl) labelEl.textContent = text || 'Enviar enlace';
    }

    function startCooldown() {
        cooldownLeft = COOLDOWN_SECONDS;
        if (btnEl) btnEl.disabled = true;
        tickCooldown();
    }

    function tickCooldown() {
        if (cooldownLeft <= 0) {
            if (cooldownTimer) { clearTimeout(cooldownTimer); cooldownTimer = null; }
            if (btnEl) btnEl.disabled = false;
            if (labelEl) labelEl.textContent = 'Enviar enlace';
            return;
        }
        if (labelEl) labelEl.textContent = 'Espera ' + cooldownLeft + 's...';
        cooldownLeft--;
        cooldownTimer = setTimeout(tickCooldown, 1000);
    }

    /* ==== CEREBRO: ENVIAR ENLACE ==== */
    function send() {
        if (busy || cooldownLeft > 0 || !SC.reset.errors) return;
        SC.reset.errors.clear();
        if (mailNoteEl) mailNoteEl.classList.add('hidden');

        const v = SC.reset.validateAll();
        if (!v.ok) { SC.reset.errors.show(v.firstError); return; }

        const F = fb();
        if (!F || !F.auth) {
            SC.reset.errors.show('Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }

        const email = (SC.reset.values()['reset-email'] || '').trim();

        setBusy(true, 'Enviando...');

        F.auth.sendPasswordResetEmail(email, { url: CONTINUE_URL })
            .then(function () { finishSent(email); })
            .catch(function (err) {
                const code = (err && err.code) || '';
                console.error('[Stevscon Reset] Error al enviar el enlace:', err);
                // Si el correo no existe, NO lo confirmamos: éxito igual.
                if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
                    finishSent(email);
                    return;
                }
                setBusy(false, 'Enviar enlace');
                const EXTRA = {
                    'auth/unauthorized-domain': 'stevscon.com no está en los dominios autorizados de Firebase (Authentication → Settings → Authorized domains).',
                    'auth/invalid-email': 'El correo no tiene un formato válido.',
                    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
                    'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
                };
                SC.reset.errors.show(EXTRA[code] || SC.reset.errors.translateAuthError(code));
            });
    }

    function finishSent(email) {
        setBusy(false, 'Enviar enlace');
        startCooldown();

        // Aviso bonito (EmailJS): si falla, avisa en pantalla pero NO bloquea.
        if (SC.reset.mail && typeof SC.reset.mail.sendNotice === 'function') {
            Promise.resolve(SC.reset.mail.sendNotice({ email: email }))
                .then(function (r) {
                    if (r && !r.ok && mailNoteEl) {
                        mailNoteEl.textContent = 'El aviso estético de Stevscon no se pudo enviar (el enlace oficial de Firebase sí llegó). F12 → Console para el detalle.';
                        mailNoteEl.classList.remove('hidden');
                    }
                })
                .catch(function () {});
        }

        if (viewForm) viewForm.classList.add('hidden');
        if (viewSent) viewSent.classList.remove('hidden');
        if (sentTextEl) {
            sentTextEl.textContent = 'Si ' + email + ' está en Stevscon, te enviamos dos correos: nuestro aviso bonito y el enlace oficial para crear tu contraseña nueva. Si no los ves, revisa spam.';
        }
    }

    function backToForm() {
        if (viewSent) viewSent.classList.add('hidden');
        if (viewForm) viewForm.classList.remove('hidden');
        if (mailNoteEl) mailNoteEl.classList.add('hidden');
        if (SC.reset.errors) SC.reset.errors.clear();
    }

    function openAccess() {
        close();
        if (SC.access && typeof SC.access.open === 'function') SC.access.open();
    }

    /* ==== MODAL ==== */
    function makeLink(text, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        b.style.cssText = 'display:block;background:none;border:0;padding:0;margin:10px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        b.addEventListener('click', onClick);
        return b;
    }

    function open() {
        if (overlay) return;
        if (!field()) {
            console.error('[Stevscon Reset] No hay campo registrado: ¿falta accounts/manage/reset/output.js antes de acc_reset.js?');
            return;
        }
        lastFocus = document.activeElement;

        overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,8,16,.78);';

        const card = document.createElement('div');
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-label', 'Recuperar contraseña');
        card.style.cssText = 'width:100%;max-width:400px;background:#161221;border:1px solid rgba(167,139,250,.35);border-radius:14px;padding:26px 24px;font-family:Inter,sans-serif;color:#ede9fe;';

        // ---- VISTA 1: formulario ----
        viewForm = document.createElement('div');

        const head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;';

        const title = document.createElement('h2');
        title.textContent = 'Recuperar contraseña';
        title.style.cssText = 'margin:0;font-size:22px;font-weight:800;color:#ffff;letter-spacing:-.02em;';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.style.cssText = 'background:none;border:0;color:#a78bfa;font-size:26px;line-height:1;cursor:pointer;padding:0 4px;';
        closeBtn.addEventListener('click', close);

        head.appendChild(title);
        head.appendChild(closeBtn);

        const sub = document.createElement('p');
        sub.textContent = 'Te enviaremos un enlace oficial para crear una contraseña nueva.';
        sub.style.cssText = 'margin:4px 0 18px;font-size:13px;color:#b7a9e6;';

        const formEl = document.createElement('form');
        formEl.noValidate = true;
        formEl.addEventListener('submit', function (e) { e.preventDefault(); send(); });

        try { formEl.appendChild(field().render()); }
        catch (e) { console.error('[Stevscon Reset] Error renderizando el campo:', e); }

        if (SC.reset.errors && typeof SC.reset.errors.render === 'function') {
            formEl.appendChild(SC.reset.errors.render());
        }

        btnEl = document.createElement('button');
        btnEl.type = 'submit';
        btnEl.className = 'btn btn-primary btn-create';
        btnEl.style.cssText = 'width:100%;margin-top:4px;';

        spinnerEl = document.createElement('span');
        spinnerEl.className = 'spinner hidden';

        labelEl = document.createElement('span');
        labelEl.className = 'btn-create-label';
        labelEl.textContent = 'Enviar enlace';

        btnEl.appendChild(spinnerEl);
        btnEl.appendChild(labelEl);
        formEl.appendChild(btnEl);

        viewForm.appendChild(head);
        viewForm.appendChild(sub);
        viewForm.appendChild(formEl);
        viewForm.appendChild(makeLink('Volver a iniciar sesión', openAccess));

        // ---- VISTA 2: enviado ----
        viewSent = document.createElement('div');
        viewSent.classList.add('hidden');

        const okIcon = document.createElement('div');
        okIcon.textContent = '✉️';
        okIcon.style.cssText = 'font-size:34px;text-align:center;margin:6px 0 10px;';

        const okTitle = document.createElement('h2');
        okTitle.textContent = '¡Revisa tu correo!';
        okTitle.style.cssText = 'margin:0 0 10px;font-size:20px;font-weight:800;color:#ffff;text-align:center;';

        sentTextEl = document.createElement('p');
        sentTextEl.style.cssText = 'margin:0 0 8px;font-size:13px;color:#b7a9e6;line-height:1.6;text-align:center;';

        mailNoteEl = document.createElement('p');
        mailNoteEl.classList.add('hidden');
        mailNoteEl.style.cssText = 'margin:0 0 8px;font-size:12px;color:#fbbf24;line-height:1.5;text-align:center;';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-primary btn-create';
        backBtn.style.cssText = 'width:100%;margin-top:14px;';
        backBtn.textContent = 'Volver a iniciar sesión';
        backBtn.addEventListener('click', openAccess);

        viewSent.appendChild(okIcon);
        viewSent.appendChild(okTitle);
        viewSent.appendChild(sentTextEl);
        viewSent.appendChild(mailNoteEl);
        viewSent.appendChild(backBtn);
        viewSent.appendChild(makeLink('Usar otro correo', backToForm));

        card.appendChild(viewForm);
        card.appendChild(viewSent);
        overlay.appendChild(card);

        const root = document.getElementById('modals-root') || document.body;
        root.appendChild(overlay);

        escHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', escHandler);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

        if (SC.reset.errors) SC.reset.errors.clear();
        const first = viewForm.querySelector('input');
        if (first) setTimeout(function () { first.focus(); }, 60);
    }

    function close() {
        if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
        if (cooldownTimer) { clearTimeout(cooldownTimer); cooldownTimer = null; }
        cooldownLeft = 0;
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null; viewForm = null; viewSent = null;
        btnEl = null; labelEl = null; spinnerEl = null;
        sentTextEl = null; mailNoteEl = null;
        busy = false;
        if (SC.reset.errors) SC.reset.errors.clear();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
    }

    SC.reset.open = open;
    SC.reset.close = close;

    /* ==== AUTO-APERTURA: botón del correo (reset_password.html) ==== */
    function checkDeepLink() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const hash = window.location.hash || '';
            if (params.get('reset') === '1' || hash.indexOf('reset') !== -1) {
                const email = params.get('email') || '';
                open();
                const f = field();
                if (email && f && typeof f.setValue === 'function') f.setValue(email);
                try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
            }
        } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkDeepLink);
    else checkDeepLink();

    console.log('[Stevscon] acc_reset.js listo (v13).');
})(window, document);