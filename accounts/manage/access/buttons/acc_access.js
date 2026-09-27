/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/acc_reset.js
 * RESET · Coordinador + cerebro (cargar AL FINAL de los files reset).
 * - Modal propio, mismo estilo morado que ACCESS.
 * - Se abre desde el link de ACCESS: SC.reset.open().
 * - AUTO-APERTURA: si llegan a la web con ?reset=1 (o #reset),
 *   abre el modal solo. Así funciona el botón del correo de EmailJS.
 * - Si la URL trae ?email=..., precarga el correo.
 * - El LINK real lo manda Firebase (sendPasswordResetEmail).
 * - mail_reset.js manda solo el aviso bonito: NUNCA bloquea.
 * - Si el correo no existe, mostramos éxito igual: nadie puede
 *   usar este formulario para espiar qué cuentas existen.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    let overlay = null;
    let viewForm = null;
    let viewSent = null;
    let sentTextEl = null;
    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;
    let escHandler = null;
    let lastFocus = null;
    let knownHandle = '—';

    function fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }

    function setBusy(state, text) {
        busy = state;
        if (!btnEl) return;
        btnEl.disabled = state;
        btnEl.classList.toggle('is-busy', state);
        if (spinnerEl) spinnerEl.classList.toggle('hidden', !state);
        if (labelEl) labelEl.textContent = text || 'Enviar enlace';
    }

    // ---- El cerebro: enviar el enlace ----
    function send() {
        if (busy || !SC.reset.errors) return;
        SC.reset.errors.clear();

        const v = SC.reset.validateAll();
        if (!v.ok) { SC.reset.errors.show(v.firstError); return; }

        const F = fb();
        if (!F || !F.auth) {
            SC.reset.errors.show('Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }

        const email = SC.reset.values()['reset-email'] || '';

        setBusy(true, 'Enviando...');

        F.auth.sendPasswordResetEmail(email)
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
                SC.reset.errors.show(SC.reset.errors.translateAuthError(code));
            });
    }

    function finishSent(email) {
        setBusy(false, 'Enviar enlace');

        // Aviso EmailJS decorativo: si falla, no importa NADA.
        try {
            const r = (SC.reset.mail && typeof SC.reset.mail.sendNotice === 'function')
                ? SC.reset.mail.sendNotice({ email: email, handle: knownHandle }) : null;
            if (r && typeof r.catch === 'function') r.catch(function () {});
        } catch (e) { /* el enlace de Firebase ya se envió */ }

        if (viewForm) viewForm.classList.add('hidden');
        if (sentTextEl) {
            sentTextEl.textContent = 'Si ' + email + ' está en Stevscon, te enviamos un enlace para crear una contraseña nueva. Revisa tu bandeja (y tu spam).';
        }
        if (viewSent) viewSent.classList.remove('hidden');
    }

    // ---- Modal ----
    function open() {
        if (overlay) return;
        lastFocus = document.activeElement;

        overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,8,16,.78);';

        const card = document.createElement('div');
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-label', 'Recuperar contraseña');
        card.style.cssText = 'width:100%;max-width:400px;background:#161221;border:1px solid rgba(167,139,250,.35);border-radius:14px;padding:26px 24px;font-family:Inter,sans-serif;color:#ede9fe;';

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
        sub.textContent = 'Te enviaremos un enlace para crear una contraseña nueva.';
        sub.style.cssText = 'margin:4px 0 18px;font-size:13px;color:#b7a9e6;';

        // VISTA 1: formulario
        viewForm = document.createElement('div');

        const formEl = document.createElement('form');
        formEl.noValidate = true;
        formEl.addEventListener('submit', function (e) { e.preventDefault(); send(); });

        SC.reset.fields.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (f) {
            formEl.appendChild(f.render());
        });

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
        viewForm.appendChild(formEl);

        // VISTA 2: enviado
        viewSent = document.createElement('div');
        viewSent.className = 'hidden';

        const okIcon = document.createElement('i');
        okIcon.className = 'fa-solid fa-circle-check';
        okIcon.style.cssText = 'display:block;text-align:center;font-size:34px;color:#4ade80;margin:6px 0 10px;';

        const okTitle = document.createElement('p');
        okTitle.textContent = 'Revisa tu correo';
        okTitle.style.cssText = 'margin:0 0 8px;text-align:center;font-weight:800;font-size:16px;color:#ffff;';

        sentTextEl = document.createElement('p');
        sentTextEl.style.cssText = 'margin:0 0 16px;text-align:center;font-size:12.5px;line-height:1.5;color:#b7a9e6;';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-primary';
        backBtn.textContent = 'Volver a iniciar sesión';
        backBtn.style.cssText = 'width:100%;';
        backBtn.addEventListener('click', function () {
            close();
            if (SC.access && typeof SC.access.open === 'function') SC.access.open();
        });

        const otherLink = document.createElement('button');
        otherLink.type = 'button';
        otherLink.textContent = 'Usar otro correo';
        otherLink.style.cssText = 'display:block;background:none;border:0;padding:0;margin:10px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        otherLink.addEventListener('click', function () {
            viewSent.classList.add('hidden');
            viewForm.classList.remove('hidden');
        });

        viewSent.appendChild(okIcon);
        viewSent.appendChild(okTitle);
        viewSent.appendChild(sentTextEl);
        viewSent.appendChild(backBtn);
        viewSent.appendChild(otherLink);

        card.appendChild(head);
        card.appendChild(sub);
        card.appendChild(viewForm);
        card.appendChild(viewSent);
        overlay.appendChild(card);

        const root = document.getElementById('modals-root') || document.body;
        root.appendChild(overlay);

        // Precarga: si en ACCESS ya escribieron un correo, lo arrastramos.
        // Si escribieron un @handler, lo guardamos para el aviso del correo.
        try {
            const acc = (SC.access && SC.access.get) ? SC.access.get('access-id') : null;
            const field = (SC.reset && SC.reset.get) ? SC.reset.get('reset-email') : null;
            const typed = (acc && acc.getValue) ? acc.getValue().trim() : '';
            if (field && field.setValue && EMAIL_RE.test(typed)) {
                field.setValue(typed);
                knownHandle = '—';
            } else if (typed) {
                knownHandle = '@' + typed.replace(/^@/, '').toLowerCase();
            }
        } catch (e) { /* opcional */ }

        escHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', escHandler);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

        if (SC.reset.errors) SC.reset.errors.clear();
        const first = viewForm.querySelector('input');
        if (first) setTimeout(function () { first.focus(); }, 60);
    }

    function close() {
        if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null; viewForm = null; viewSent = null; sentTextEl = null;
        btnEl = null; spinnerEl = null; labelEl = null;
        busy = false;
        if (SC.reset.resetAll) SC.reset.resetAll();
        if (SC.reset.errors && SC.reset.errors.clear) SC.reset.errors.clear();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
    }

    // ---- AUTO-APERTURA: ?reset=1 / ?reset=true / #reset (+ ?email= opcional) ----
    function checkUrlAutoOpen() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const wantsReset = params.get('reset') === '1' ||
                               params.get('reset') === 'true' ||
                               window.location.hash === '#reset';
            if (!wantsReset) return;

            const email = params.get('email');
            const field = (SC.reset && SC.reset.get) ? SC.reset.get('reset-email') : null;
            if (email && field && field.setValue && EMAIL_RE.test(email)) field.setValue(email);

            // Limpiamos la URL para que al refrescar no se vuelva a abrir solo
            window.history.replaceState({}, '', window.location.pathname);
            open();
        } catch (e) { /* si falla, el modal se abre a mano como siempre */ }
    }

    SC.reset.open = open;
    SC.reset.close = close;

    // ---- Init ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkUrlAutoOpen);
    } else {
        checkUrlAutoOpen();
    }
})(window, document);