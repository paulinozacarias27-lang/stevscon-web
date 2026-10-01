/**
 * ====
 * STEVSCON.COM - ACCESS · Botón ENTRAR + modal + cerebro del login.
 * (cargar DESPUÉS de access_account.js y access_password.js, y ANTES
 *  de category_acc.js)
 *
 * - Entra con CORREO o con @HANDLER (handlers/ → uid → users/{uid}/email).
 * - Si un error no está traducido, muestra el CÓDIGO técnico en pantalla.
 * - v15 · IGUAL que la v14 corregida (puertas reales + MODAL DE RESERVA de
 *   reset), solo cambia el número de versión para FORZAR al navegador a
 *   bajar el file nuevo (cache-bust con ?v=15 en el index).
 *     RESET  → SC.reset.open() (acc_reset.js) + verificación en el DOM.
 *     CREATE → evento 'sc:open-create' en DOCUMENT (category_acc.js) +
 *       verificación de que #create-modal-overlay quedó visible.
 *   Si la puerta oficial de RESET falla (acc_reset.js no cargó, o
 *   reset/output.js no registró el campo), este file pinta SU PROPIO modal
 *   de reset completo y funcional. El botón funciona SIEMPRE.
 * - Nada de contraseñas en localStorage: solo Firebase Auth.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.access = SC.access || {};
    SC.access.fields = SC.access.fields || [];

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const CONTINUE_URL = 'https://stevscon.com/';
    const RESET_COOLDOWN = 20;

    let overlay = null;
    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;
    let escHandler = null;
    let lastFocus = null;

    let fbOverlay = null;
    let fbViewForm = null;
    let fbViewSent = null;
    let fbInput = null;
    let fbErr = null;
    let fbSentText = null;
    let fbBtn = null;
    let fbLabel = null;
    let fbSpinner = null;
    let fbBusy = false;
    let fbTimer = null;
    let fbLeft = 0;
    let fbEsc = null;

    function fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }

    function db() {
        const F = fb();
        if (!F) return null;
        if (F.db && typeof F.db.ref === 'function') return F.db;
        if (F.database && typeof F.database.ref === 'function') return F.database;
        if (typeof firebase !== 'undefined' && firebase.database) return firebase.database();
        return null;
    }

    /* ==== ERRORES (SC.access.errors) ==== */

    const AUTH_ERRORS = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/user-disabled': 'Esta cuenta fue deshabilitada. Contacta al equipo de Stevscon.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Espera un momento y vuelve a intentarlo.',
        'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
        'auth/operation-not-allowed': 'El acceso con correo/contraseña está APAGADO en Firebase. Actívalo en Authentication → Sign-in method → Email/Password.',
        'auth/unauthorized-domain': 'Esta web no está autorizada en Firebase. Agrega el dominio en Authentication → Settings → Authorized domains.',
        'auth/internal-error': 'Error interno de Firebase. Revisa tu conexión e inténtalo de nuevo.',
        'auth/api-key-not-valid': 'La API key de Firebase no es válida. Revisa firebase_data.js.',
        'auth/app-not-authorized': 'La API key no autoriza esta web. Revisa sus restricciones en Google Cloud.',
        'permission_denied': 'Firebase denegó la lectura (Rules). Revisa las reglas de Realtime Database.',
        'stevscon/handler-not-found': 'No encontramos ninguna cuenta con ese @handler. Prueba con tu correo.',
        'stevscon/db-permission': 'Sin permiso para leer la base de datos (Rules de Firebase).',
        'stevscon/no-database': 'La base de datos no está disponible. Recarga la página.'
    };

    let errorBox = null;
    let errorText = null;
    let errorMeta = null;

    const errors = {
        render: function () {
            errorBox = document.createElement('div');
            errorBox.className = 'form-errors hidden';
            errorBox.setAttribute('role', 'alert');
            errorText = document.createElement('p');
            errorText.style.cssText = 'margin:0;';
            errorMeta = document.createElement('p');
            errorMeta.style.cssText = 'margin:6px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;';
            errorBox.appendChild(errorText);
            errorBox.appendChild(errorMeta);
            return errorBox;
        },
        show: function (msg, meta) {
            if (!errorBox || !errorText) return;
            errorText.textContent = String(msg || 'Algo salió mal. Inténtalo de nuevo.');
            if (meta) {
                errorMeta.textContent = 'Código técnico: ' + meta;
                errorMeta.classList.remove('hidden');
            } else {
                errorMeta.textContent = '';
                errorMeta.classList.add('hidden');
            }
            errorBox.classList.remove('hidden');
        },
        clear: function () {
            if (errorBox) errorBox.classList.add('hidden');
            if (errorText) errorText.textContent = '';
            if (errorMeta) errorMeta.textContent = '';
        },
        translateAuthError: function (code) {
            return AUTH_ERRORS[code] || null;
        }
    };
    SC.access.errors = errors;

    /* ==== REGISTRO DE CAMPOS (API) ==== */

    function sorted() {
        return SC.access.fields.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    }

    SC.access.get = function (id) {
        return SC.access.fields.find(function (f) { return f && f.id === id; }) || null;
    };

    SC.access.values = function () {
        const out = {};
        SC.access.fields.forEach(function (f) {
            if (f && f.id) out[f.id] = (f.getValue ? f.getValue() : '');
        });
        return out;
    };

    SC.access.validateAll = function () {
        const list = sorted();
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            if (f && typeof f.validate === 'function') {
                const r = f.validate();
                if (r && !r.ok) return { ok: false, firstError: r.msg || 'Revisa los campos.' };
            }
        }
        return { ok: true };
    };

    /* ==== CEREBRO: ENTRAR ==== */

    function safeOnce(ref) {
        return ref.once('value').catch(function (err) {
            const c = (err && err.code) || '';
            if (c === 'permission_denied' || c === 'PERMISSION_DENIED') throw { code: 'stevscon/db-permission' };
            throw err;
        });
    }

    function resolveEmail(idVal) {
        if (EMAIL_RE.test(idVal)) return Promise.resolve(idVal);

        const D = db();
        if (!D) return Promise.reject({ code: 'stevscon/no-database' });

        const h = idVal.replace(/^@/, '').toLowerCase();
        return safeOnce(D.ref('handlers/' + h))
            .then(function (snap) {
                let uid = snap ? snap.val() : null;
                if (uid && typeof uid === 'object') uid = uid.uid || uid.id || null;
                if (!uid) throw { code: 'stevscon/handler-not-found' };
                return safeOnce(D.ref('users/' + uid + '/email'));
            })
            .then(function (snap) {
                const email = snap ? snap.val() : null;
                if (!email) throw { code: 'stevscon/handler-not-found' };
                return String(email);
            });
    }

    function setBusy(state, text) {
        busy = state;
        if (!btnEl) return;
        btnEl.disabled = state;
        btnEl.classList.toggle('is-busy', state);
        if (spinnerEl) spinnerEl.classList.toggle('hidden', !state);
        if (labelEl) labelEl.textContent = text || 'Entrar';
    }

    function login() {
        if (busy) return;
        errors.clear();

        const v = SC.access.validateAll();
        if (!v.ok) { errors.show(v.firstError); return; }

        const F = fb();
        if (!F || !F.auth) {
            errors.show('Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }

        const vals = SC.access.values();
        const idVal = vals['access-id'] || '';
        const pass = vals['access-password'] || '';

        setBusy(true, 'Entrando...');

        resolveEmail(idVal)
            .then(function (email) {
                return F.auth.signInWithEmailAndPassword(email, pass);
            })
            .then(function () {
                setBusy(false, 'Entrar');
                close(); // session.js toma el header con onAuthStateChanged
            })
            .catch(function (err) {
                setBusy(false, 'Entrar');
                const code = (err && err.code) || '';
                const mapped = AUTH_ERRORS[code];
                console.error('[Stevscon Access] Error al iniciar sesión:', err);
                errors.show(
                    mapped || 'No pudimos iniciar sesión. Inténtalo de nuevo.',
                    mapped ? '' : (code || String((err && err.message) || 'error desconocido'))
                );
            });
    }

    /* ==== NAVEGACIÓN ENTRE MODALS (abrir primero, cerrar después) ==== */

    function snapshotDialogs() {
        const root = document.getElementById('modals-root') || document.body;
        return Array.prototype.slice.call(root.querySelectorAll('div[role="dialog"]'));
    }

    function isCreateVisible() {
        const ov = document.getElementById('create-modal-overlay');
        return !!(ov && !ov.classList.contains('hidden'));
    }

    function tryOpenCreate() {
        const before = snapshotDialogs();

        // 1) Puerta oficial de category_acc.js: evento en DOCUMENT
        try { document.dispatchEvent(new CustomEvent('sc:open-create')); } catch (e) {}
        // 2) Extras inofensivos por si una versión futura expone más puertas
        try { if (SC.create && typeof SC.create.open === 'function') SC.create.open(); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('stevscon:open-create')); } catch (e) {}
        try { if (typeof SC.emit === 'function') SC.emit('open-create'); } catch (e) {}

        if (isCreateVisible()) {
            console.log('[Stevscon Access] Create abierto via evento sc:open-create.');
            return true;
        }
        if (snapshotDialogs().length > before.length) {
            console.log('[Stevscon Access] Create abierto (nuevo diálogo detectado en el DOM).');
            return true;
        }
        console.error('[Stevscon Access] El evento sc:open-create no abrió CREATE (¿category_acc.js está cargado en el index?).');
        return false;
    }

    function tryOpenReset() {
        const before = snapshotDialogs();

        // 1) Puerta oficial: acc_reset.js
        if (SC.reset && typeof SC.reset.open === 'function') {
            try {
                SC.reset.open();
                if (document.querySelector('[aria-label="Recuperar contraseña"]') ||
                    snapshotDialogs().length > before.length) {
                    console.log('[Stevscon Access] Reset abierto via SC.reset.open().');
                    return true;
                }
                console.error('[Stevscon Access] SC.reset.open() corrió pero NO pintó el modal (falta el campo reset-email: revisa accounts/manage/reset/output.js). Uso el MODAL DE RESERVA.');
            } catch (e) {
                console.error('[Stevscon Access] SC.reset.open() lanzó error:', e, '— uso el MODAL DE RESERVA.');
            }
        } else {
            console.error('[Stevscon Access] SC.reset.open no existe: acc_reset.js no cargó con la ruta que pone el index. Uso el MODAL DE RESERVA.');
        }

        // 2) Plan B: modal de reserva propio de este file
        try {
            return openFallbackReset('');
        } catch (e) {
            console.error('[Stevscon Access] Hasta el modal de reserva falló:', e);
            return false;
        }
    }

    /* ==== MODAL DE RESERVA DE RESET (plan B autocontenido) ==== */

    function fbShowErr(msg) {
        if (!fbErr) return;
        fbErr.textContent = String(msg || '');
        fbErr.classList.remove('hidden');
    }

    function fbHideErr() {
        if (!fbErr) return;
        fbErr.textContent = '';
        fbErr.classList.add('hidden');
    }

    function fbSetBusy(state, text) {
        fbBusy = state;
        if (!fbBtn) return;
        fbBtn.disabled = state || fbLeft > 0;
        fbBtn.classList.toggle('is-busy', state);
        if (fbSpinner) fbSpinner.classList.toggle('hidden', !state);
        if (fbLabel) fbLabel.textContent = text || 'Enviar enlace';
    }

    function fbStartCooldown() {
        fbLeft = RESET_COOLDOWN;
        if (fbBtn) fbBtn.disabled = true;
        fbTick();
    }

    function fbTick() {
        if (fbLeft <= 0) {
            if (fbTimer) { clearTimeout(fbTimer); fbTimer = null; }
            if (fbBtn) fbBtn.disabled = false;
            if (fbLabel) fbLabel.textContent = 'Enviar enlace';
            return;
        }
        if (fbLabel) fbLabel.textContent = 'Espera ' + fbLeft + 's...';
        fbLeft--;
        fbTimer = setTimeout(fbTick, 1000);
    }

    function fbFinishSent(email) {
        fbSetBusy(false, 'Enviar enlace');
        fbStartCooldown();

        if (SC.reset && SC.reset.mail && typeof SC.reset.mail.sendNotice === 'function') {
            Promise.resolve(SC.reset.mail.sendNotice({ email: email })).catch(function () {});
        }

        if (fbViewForm) fbViewForm.classList.add('hidden');
        if (fbViewSent) fbViewSent.classList.remove('hidden');
        if (fbSentText) {
            fbSentText.textContent = 'Si ' + email + ' está en Stevscon, te enviamos el enlace oficial para crear tu contraseña nueva. Si no lo ves, revisa spam.';
        }
    }

    function fbSend() {
        if (fbBusy || fbLeft > 0) return;
        fbHideErr();

        const email = ((fbInput && fbInput.value) || '').trim();
        if (!EMAIL_RE.test(email)) {
            fbShowErr('Escribe el correo de tu cuenta.');
            return;
        }

        const F = fb();
        if (!F || !F.auth) {
            fbShowErr('Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }

        fbSetBusy(true, 'Enviando...');

        F.auth.sendPasswordResetEmail(email, { url: CONTINUE_URL })
            .then(function () { fbFinishSent(email); })
            .catch(function (err) {
                const code = (err && err.code) || '';
                console.error('[Stevscon Access · Reset] Error al enviar el enlace:', err);
                if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
                    fbFinishSent(email);
                    return;
                }
                fbSetBusy(false, 'Enviar enlace');
                const mapped = AUTH_ERRORS[code];
                fbShowErr(mapped || 'No pudimos enviar el enlace. Inténtalo de nuevo. (' + (code || 'error') + ')');
            });
    }

    function closeFallback(returnToAccess) {
        if (fbEsc) { document.removeEventListener('keydown', fbEsc); fbEsc = null; }
        if (fbTimer) { clearTimeout(fbTimer); fbTimer = null; }
        fbLeft = 0;
        fbBusy = false;
        if (fbOverlay && fbOverlay.parentNode) fbOverlay.parentNode.removeChild(fbOverlay);
        fbOverlay = null; fbViewForm = null; fbViewSent = null; fbInput = null;
        fbErr = null; fbSentText = null; fbBtn = null; fbLabel = null; fbSpinner = null;
        if (returnToAccess !== false && SC.access && typeof SC.access.open === 'function') {
            SC.access.open();
        }
    }

    function openFallbackReset(prefEmail) {
        if (fbOverlay) return true;

        const root = document.getElementById('modals-root') || document.body;

        fbOverlay = document.createElement('div');
        fbOverlay.style.cssText = 'position:fixed;inset:0;z-index:1001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,8,16,.78);';

        const card = document.createElement('div');
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-label', 'Recuperar contraseña');
        card.style.cssText = 'width:100%;max-width:400px;background:#161221;border:1px solid rgba(167,139,250,.35);border-radius:14px;padding:26px 24px;font-family:Inter,sans-serif;color:#ede9fe;';

        // ---- VISTA 1: formulario ----
        fbViewForm = document.createElement('div');

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
        closeBtn.addEventListener('click', function () { closeFallback(true); });

        head.appendChild(title);
        head.appendChild(closeBtn);

        const sub = document.createElement('p');
        sub.textContent = 'Te enviaremos un enlace oficial para crear una contraseña nueva.';
        sub.style.cssText = 'margin:4px 0 18px;font-size:13px;color:#b7a9e6;';

        const formEl = document.createElement('form');
        formEl.noValidate = true;
        formEl.addEventListener('submit', function (e) { e.preventDefault(); fbSend(); });

        fbInput = document.createElement('input');
        fbInput.type = 'email';
        fbInput.placeholder = 'tu@correo.com';
        fbInput.setAttribute('aria-label', 'Correo de tu cuenta');
        fbInput.autocomplete = 'email';
        fbInput.style.cssText = 'width:100%;box-sizing:border-box;background:#0d0b14;border:1px solid #2e2440;border-radius:10px;padding:12px 14px;font-family:Inter,sans-serif;font-size:14px;color:#ede9fe;outline:none;margin-bottom:10px;';
        if (prefEmail) fbInput.value = String(prefEmail);

        fbErr = document.createElement('p');
        fbErr.className = 'hidden';
        fbErr.setAttribute('role', 'alert');
        fbErr.style.cssText = 'margin:0 0 10px;font-size:12.5px;color:#f87171;line-height:1.5;';

        fbBtn = document.createElement('button');
        fbBtn.type = 'submit';
        fbBtn.className = 'btn btn-primary btn-create';
        fbBtn.style.cssText = 'width:100%;margin-top:4px;';

        fbSpinner = document.createElement('span');
        fbSpinner.className = 'spinner hidden';

        fbLabel = document.createElement('span');
        fbLabel.className = 'btn-create-label';
        fbLabel.textContent = 'Enviar enlace';

        fbBtn.appendChild(fbSpinner);
        fbBtn.appendChild(fbLabel);
        formEl.appendChild(fbInput);
        formEl.appendChild(fbErr);
        formEl.appendChild(fbBtn);

        const backLink = document.createElement('button');
        backLink.type = 'button';
        backLink.textContent = 'Volver a iniciar sesión';
        backLink.style.cssText = 'display:block;background:none;border:0;padding:0;margin:10px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        backLink.addEventListener('click', function () { closeFallback(true); });

        fbViewForm.appendChild(head);
        fbViewForm.appendChild(sub);
        fbViewForm.appendChild(formEl);
        fbViewForm.appendChild(backLink);

        // ---- VISTA 2: enviado ----
        fbViewSent = document.createElement('div');
        fbViewSent.classList.add('hidden');

        const okIcon = document.createElement('div');
        okIcon.textContent = '✉️';
        okIcon.style.cssText = 'font-size:34px;text-align:center;margin:6px 0 10px;';

        const okTitle = document.createElement('h2');
        okTitle.textContent = '¡Revisa tu correo!';
        okTitle.style.cssText = 'margin:0 0 10px;font-size:20px;font-weight:800;color:#ffff;text-align:center;';

        fbSentText = document.createElement('p');
        fbSentText.style.cssText = 'margin:0 0 8px;font-size:13px;color:#b7a9e6;line-height:1.6;text-align:center;';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'btn btn-primary btn-create';
        backBtn.style.cssText = 'width:100%;margin-top:14px;';
        backBtn.textContent = 'Volver a iniciar sesión';
        backBtn.addEventListener('click', function () { closeFallback(true); });

        const otherLink = document.createElement('button');
        otherLink.type = 'button';
        otherLink.textContent = 'Usar otro correo';
        otherLink.style.cssText = 'display:block;background:none;border:0;padding:0;margin:10px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        otherLink.addEventListener('click', function () {
            if (fbViewSent) fbViewSent.classList.add('hidden');
            if (fbViewForm) fbViewForm.classList.remove('hidden');
            fbHideErr();
        });

        fbViewSent.appendChild(okIcon);
        fbViewSent.appendChild(okTitle);
        fbViewSent.appendChild(fbSentText);
        fbViewSent.appendChild(backBtn);
        fbViewSent.appendChild(otherLink);

        card.appendChild(fbViewForm);
        card.appendChild(fbViewSent);
        fbOverlay.appendChild(card);
        root.appendChild(fbOverlay);

        fbEsc = function (e) { if (e.key === 'Escape') closeFallback(true); };
        document.addEventListener('keydown', fbEsc);
        fbOverlay.addEventListener('click', function (e) {
            if (e.target === fbOverlay) closeFallback(true);
        });

        fbHideErr();
        setTimeout(function () { if (fbInput) fbInput.focus(); }, 60);
        return true;
    }

    // Deep-link de EMERGENCIA: solo si acc_reset.js no cargó.
    function checkResetDeepLink() {
        try {
            if (SC.reset && typeof SC.reset.open === 'function') return;
            const params = new URLSearchParams(window.location.search || '');
            const q = window.location.search || '';
            const hash = window.location.hash || '';
            if (params.get('reset') === '1' || /reset/i.test(q) || /reset/i.test(hash)) {
                openFallbackReset(params.get('email') || '');
                try { window.history.replaceState({}, '', window.location.pathname); } catch (e) {}
            }
        } catch (e) {}
    }

    /* ==== MODAL ACCESS ==== */

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
        if (!SC.access.fields.length) {
            console.error('[Stevscon Access] No hay campos registrados: ¿cargan access_account.js y access_password.js antes de acc_access.js?');
            return;
        }
        lastFocus = document.activeElement;

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
        sub.textContent = 'Entra con tu correo o con tu @handler.';
        sub.style.cssText = 'margin:4px 0 18px;font-size:13px;color:#b7a9e6;';

        const formEl = document.createElement('form');
        formEl.noValidate = true;
        formEl.addEventListener('submit', function (e) { e.preventDefault(); login(); });

        sorted().forEach(function (f) {
            try { formEl.appendChild(f.render()); }
            catch (e) { console.error('[Stevscon Access] Error renderizando campo:', f.id, e); }
        });

        formEl.appendChild(errors.render());

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

        // v15: abrir destino PRIMERO, verificar, y SOLO ENTONCES cerrar ACCESS.
        const forgot = makeLink('¿Olvidaste tu contraseña?', function () {
            errors.clear();
            if (tryOpenReset()) { close(); return; }
            errors.show(
                'No se pudo abrir la recuperación de contraseña. Recarga la página e inténtalo de nuevo.',
                'reset falló incluso con el modal de reserva — revisa Firebase (firebase_data.js)'
            );
        });

        const toCreate = makeLink('¿No tienes cuenta? Crear una', function () {
            errors.clear();
            if (tryOpenCreate()) { close(); return; }
            errors.show(
                'No se pudo abrir Crear cuenta. El panel sigue abierto.',
                'category_acc.js no respondió al evento sc:open-create — revisa el index'
            );
        });

        card.appendChild(head);
        card.appendChild(sub);
        card.appendChild(formEl);
        card.appendChild(forgot);
        card.appendChild(toCreate);
        overlay.appendChild(card);

        const root = document.getElementById('modals-root') || document.body;
        root.appendChild(overlay);

        escHandler = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', escHandler);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

        errors.clear();
        const first = formEl.querySelector('input');
        if (first) setTimeout(function () { first.focus(); }, 60);
    }

    function close() {
        if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null; btnEl = null; spinnerEl = null; labelEl = null;
        busy = false;
        errors.clear();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
    }

    SC.access.open = open;
    SC.access.close = close;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkResetDeepLink);
    } else {
        checkResetDeepLink();
    }

    console.log('[Stevscon] acc_access.js listo (v15 · puertas reales + modal de reserva).');
})(window, document);