/**
 * ====
 * STEVSCON.COM - ACCESS · Botón ENTRAR + modal + cerebro del login.
 * (cargar DESPUÉS de los campos access_account.js y access_password.js,
 *  y ANTES de category_acc.js)
 *
 * - Modal propio, estilo morado de la web.
 * - Entra con CORREO o con @HANDLER (resuelve el handler contra
 *   handlers/ → uid → users/{uid}/email, y luego Firebase Auth).
 * - "¿Olvidaste tu contraseña?" abre el sistema RESET (SC.reset.open).
 * - "Crear una" avisa a category_acc.js para abrir el modal CREATE.
 * - Nada de contraseñas en localStorage: solo Firebase Auth.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.access = SC.access || {};
    SC.access.fields = SC.access.fields || [];

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    let overlay = null;
    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;
    let escHandler = null;
    let lastFocus = null;

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

    /* ================= ERRORES (SC.access.errors) ================= */

    const AUTH_ERRORS = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/user-disabled': 'Esta cuenta fue deshabilitada. Contacta al equipo de Stevscon.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Espera un momento y vuelve a intentarlo.',
        'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
        'stevscon/handler-not-found': 'No encontramos ninguna cuenta con ese @handler. Prueba con tu correo.',
        'stevscon/no-database': 'La base de datos no está disponible. Recarga la página.'
    };

    let errorBox = null;
    let errorText = null;

    const errors = {
        render: function () {
            errorBox = document.createElement('div');
            errorBox.className = 'form-errors hidden';
            errorBox.setAttribute('role', 'alert');
            errorText = document.createElement('p');
            errorText.style.cssText = 'margin:0;';
            errorBox.appendChild(errorText);
            return errorBox;
        },
        show: function (msg) {
            if (!errorBox || !errorText) return;
            errorText.textContent = String(msg || 'Algo salió mal. Inténtalo de nuevo.');
            errorBox.classList.remove('hidden');
        },
        clear: function () {
            if (errorBox) errorBox.classList.add('hidden');
            if (errorText) errorText.textContent = '';
        },
        translateAuthError: function (code) {
            return AUTH_ERRORS[code] || 'No pudimos iniciar sesión. Inténtalo de nuevo.';
        }
    };
    SC.access.errors = errors;

    /* ================= REGISTRO DE CAMPOS (API) ================= */

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

    /* ================= CEREBRO: ENTRAR ================= */

    // Si escribió un @handler, lo resolvemos: handlers/{h} → uid → users/{uid}/email
    function resolveEmail(idVal) {
        if (EMAIL_RE.test(idVal)) return Promise.resolve(idVal);

        const D = db();
        if (!D) return Promise.reject({ code: 'stevscon/no-database' });

        const h = idVal.replace(/^@/, '').toLowerCase();
        return D.ref('handlers/' + h).once('value')
            .then(function (snap) {
                const uid = snap ? snap.val() : null;
                if (!uid) throw { code: 'stevscon/handler-not-found' };
                return D.ref('users/' + uid + '/email').once('value');
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
                console.error('[Stevscon Access] Error al iniciar sesión:', err);
                errors.show(errors.translateAuthError(code));
            });
    }

    /* ================= MODAL ================= */

    function makeLink(text, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = text;
        b.style.cssText = 'display:block;background:none;border:0;padding:0;margin:10px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        b.addEventListener('click', onClick);
        return b;
    }

    function openCreateFromLink() {
        close();
        let opened = false;
        try {
            if (SC.create && typeof SC.create.open === 'function') { SC.create.open(); opened = true; }
        } catch (e) { /* seguimos con el plan B */ }
        if (!opened) {
            // Avisamos por el bus de eventos y por DOM, por si el coordinador escucha cualquiera de los dos.
            try { if (typeof SC.emit === 'function') SC.emit('create:open'); } catch (e) {}
            try { if (typeof SC.emit === 'function') SC.emit('open-create'); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('stevscon:open-create')); } catch (e) {}
        }
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

        const forgot = makeLink('¿Olvidaste tu contraseña?', function () {
            close();
            if (SC.reset && typeof SC.reset.open === 'function') SC.reset.open();
            else console.error('[Stevscon Access] SC.reset.open no existe: ¿faltan los files de accounts/manage/reset/?');
        });

        const toCreate = makeLink('¿No tienes cuenta? Crear una', openCreateFromLink);

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

    console.log('[Stevscon] acc_access.js listo.');
})(window, document);