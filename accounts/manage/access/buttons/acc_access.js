/**
 * ====
 * STEVSCON.COM - accounts/manage/access/buttons/acc_access.js
 * ACCESS · Modal de inicio de sesión + botón ENTRAR.
 * - Correo → login directo en Firebase Auth.
 * - @handler → handlers/ da el UID → users/uid/email da el correo.
 * Incluye recuperar contraseña, cerrar con Esc o clic afuera.
 * Al entrar, session.js toma el control vía onAuthStateChanged.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.access = SC.access || {};
    SC.access.fields = SC.access.fields || [];

    let overlay = null;
    let bannerEl = null;
    let formEl = null;
    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;
    let escHandler = null;

    function fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }

    // ---- Identificador → correo real de Firebase Auth ----
    function resolveEmail() {
        const F = fb();
        const idField = SC.access.get('access-id');
        if (!F || !F.database || !idField) return Promise.reject({ scCode: 'internal' });

        if (idField.isEmailValue()) return Promise.resolve(idField.getValue());

        const handler = idField.handlerValue();
        const key = (typeof SC.handlerKey === 'function')
            ? SC.handlerKey(handler)
            : handler.toLowerCase().replace(/[.$#\[\]]/g, function (ch) {
                return ch === '.' ? ',' : { '#': '~a', '$': '~b', '[': '~c', ']': '~d' }[ch];
            });

        return F.database.ref('handlers/' + key).once('value').then(function (snap) {
            if (!snap.exists()) throw { scCode: 'handler_not_found' };
            const uid = snap.val();
            return F.database.ref('users/' + uid + '/email').once('value');
        }).then(function (emailSnap) {
            if (!emailSnap.exists()) throw { scCode: 'handler_not_found' };
            return String(emailSnap.val());
        });
    }

    function translateAuthError(code) {
        switch (code) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Datos incorrectos: revisa tu correo/handler y tu contraseña.';
            case 'auth/invalid-email':
                return 'El correo no tiene un formato válido.';
            case 'auth/user-disabled':
                return 'Esta cuenta fue deshabilitada. Contacta a soporte.';
            case 'auth/too-many-requests':
                return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
            case 'auth/network-request-failed':
                return 'Problema de conexión. Revisa tu internet e inténtalo de nuevo.';
            default:
                return 'No pudimos iniciar sesión. Detalle: ' + code;
        }
    }

    // ---- Banner de mensajes (inline, textContent = anti-XSS) ----
    function showBanner(kind, msg) {
        if (!bannerEl) return;
        bannerEl.hidden = false;
        bannerEl.textContent = msg;
        bannerEl.style.cssText = kind === 'ok'
            ? 'display:block;margin-bottom:14px;padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.45;border:1px solid rgba(74,222,128,.45);background:rgba(74,222,128,.08);color:#86efac;'
            : 'display:block;margin-bottom:14px;padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.45;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.08);color:#f87171;';
    }

    function clearBanner() {
        if (bannerEl) { bannerEl.hidden = true; bannerEl.textContent = ''; }
    }

    function setBusy(state, text) {
        busy = state;
        if (!btnEl) return;
        btnEl.disabled = state;
        btnEl.classList.toggle('is-busy', state);
        if (spinnerEl) spinnerEl.classList.toggle('hidden', !state);
        if (labelEl) labelEl.textContent = text || 'Entrar';
    }

    // ---- ENTRAR ----
    function login() {
        if (busy) return;
        clearBanner();

        const v = SC.access.validateAll();
        if (!v.ok) { showBanner('error', v.firstError); return; }

        const F = fb();
        if (!F || !F.auth || !F.database) {
            showBanner('error', 'Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }

        const pwdField = SC.access.get('access-password');
        const password = pwdField ? pwdField.getValue() : '';
        if (!password) { showBanner('error', 'Escribe tu contraseña.'); return; }

        setBusy(true, 'Entrando...');

        resolveEmail()
            .then(function (email) {
                return F.auth.signInWithEmailAndPassword(email, password)
                    .then(function (cred) { return { email: email, uid: cred.user.uid }; });
            })
            .then(function (done) {
                setBusy(false, 'Entrar');
                close();
                if (typeof SC.emit === 'function') {
                    SC.emit('access:success', { uid: done.uid, email: done.email });
                }
                try { document.dispatchEvent(new CustomEvent('stevscon:access')); } catch (e) { /* opcional */ }
            })
            .catch(function (err) {
                setBusy(false, 'Entrar');
                const code = (err && err.scCode) ? err.scCode : (err && err.code) || '';
                if (code === 'handler_not_found') {
                    const idField = SC.access.get('access-id');
                    showBanner('error', 'No encontramos el handler @' + (idField ? idField.handlerValue() : '') + '. Revisa que esté bien escrito.');
                } else if (code.indexOf('auth/') === 0) {
                    showBanner('error', translateAuthError(code));
                } else {
                    showBanner('error', 'No pudimos iniciar sesión. Detalle: ' + (code || 'desconocido'));
                }
            });
    }

    // ---- ¿Olvidaste tu contraseña? ----
    function recoverPassword() {
        if (busy) return;
        clearBanner();

        const v = SC.access.validateAll();
        if (!v.ok) { showBanner('error', v.firstError); return; }

        const F = fb();
        if (!F || !F.auth) { showBanner('error', 'Firebase no está disponible ahora mismo.'); return; }

        setBusy(true, 'Enviando...');
        resolveEmail()
            .then(function (email) {
                return F.auth.sendPasswordResetEmail(email).then(function () { return email; });
            })
            .then(function (email) {
                setBusy(false, 'Entrar');
                showBanner('ok', 'Te enviamos un enlace de recuperación a ' + email + '. Revisa tu bandeja (y spam).');
            })
            .catch(function (err) {
                setBusy(false, 'Entrar');
                const code = (err && err.scCode) ? err.scCode : (err && err.code) || '';
                if (code === 'handler_not_found') {
                    showBanner('error', 'No encontramos ese handler. Entra con tu correo para recuperar la contraseña.');
                } else {
                    showBanner('error', translateAuthError(code));
                }
            });
    }

    // ---- Modal ----
    function open() {
        if (overlay) return;
        SC.access.fields = SC.access.fields || [];

        overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,8,16,.78);';

        const card = document.createElement('div');
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-label', 'Iniciar sesión');
        card.style.cssText = 'width:100%;max-width:400px;background:#161221;border:1px solid rgba(167,139,250,.35);border-radius:14px;padding:26px 24px;font-family:Inter,sans-serif;color:#ede9fe;';

        const head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;';

        const title = document.createElement('h2');
        title.textContent = 'Iniciar sesión';
        title.style.cssText = 'margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.02em;';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.style.cssText = 'background:none;border:0;color:#a78bfa;font-size:26px;line-height:1;cursor:pointer;padding:0 4px;';
        closeBtn.addEventListener('click', close);

        head.appendChild(title);
        head.appendChild(closeBtn);

        const sub = document.createElement('p');
        sub.textContent = 'Entra con tu correo o con tu @handler.';
        sub.style.cssText = 'margin:4px 0 18px;font-size:13px;color:#b7a9e6;';

        bannerEl = document.createElement('div');
        bannerEl.setAttribute('role', 'alert');
        bannerEl.hidden = true;

        formEl = document.createElement('form');
        formEl.noValidate = true;
        formEl.addEventListener('submit', function (e) { e.preventDefault(); login(); });

        SC.access.fields.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (f) {
            formEl.appendChild(f.render());
        });

        btnEl = document.createElement('button');
        btnEl.type = 'submit';
        btnEl.className = 'btn btn-primary btn-create';
        btnEl.style.cssText = 'width:100%;margin-top:4px;';

        spinnerEl = document.createElement('span');
        spinnerEl.className = 'spinner hidden';

        labelEl = document.createElement('span');
        labelEl.className = 'btn-create-label';
        labelEl.textContent = 'Entrar';

        btnEl.appendChild(spinnerEl);
        btnEl.appendChild(labelEl);
        formEl.appendChild(btnEl);

        const forgot = document.createElement('button');
        forgot.type = 'button';
        forgot.textContent = '¿Olvidaste tu contraseña?';
        forgot.style.cssText = 'display:block;background:none;border:0;padding:0;margin:14px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#a78bfa;cursor:pointer;text-decoration:underline;';
        forgot.addEventListener('click', function () {
            // El flujo completo vive en accounts/manage/reset/acc_reset.js
            if (SC.reset && typeof SC.reset.open === 'function') {
                close();
                SC.reset.open();
            } else {
                recoverPassword(); // respaldo si acc_reset.js no cargó
            }
        });

        const toCreate = document.createElement('button');
        toCreate.type = 'button';
        toCreate.textContent = '¿Aún no tienes cuenta? Crear una';
        toCreate.style.cssText = 'display:block;background:none;border:0;padding:0;margin:8px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        toCreate.addEventListener('click', function () {
            close();
            try { document.dispatchEvent(new CustomEvent('sc:open-create')); } catch (e) { /* opcional */ }
        });

        card.appendChild(head);
        card.appendChild(sub);
        card.appendChild(bannerEl);
        card.appendChild(formEl);
        card.appendChild(forgot);
        card.appendChild(toCreate);
        overlay.appendChild(card);

        const root = document.getElementById('modals-root') || document.body;
        root.appendChild(overlay);

        escHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', escHandler);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

        SC.access.resetAll();
        clearBanner();
        const first = formEl.querySelector('input');
        if (first) first.focus();
    }

    function close() {
        if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null; bannerEl = null; formEl = null;
        btnEl = null; spinnerEl = null; labelEl = null;
        busy = false;
    }

    SC.access.open = open;
    SC.access.close = close;
})(window, document);