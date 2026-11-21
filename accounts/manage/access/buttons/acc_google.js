/**
 * ====
 * STEVSCON.COM - accounts/manage/access/buttons/acc_google.js
 * INICIO DE SESIÓN CON GOOGLE (modales Iniciar sesión y Crear cuenta).
 *  - Botón "Continuar con Google" montado SOLO en los formularios
 *    de ACCESS y CREATE cuando aparecen en la página (MutationObserver,
 *    los modales se crean y destruyen dinámicamente).
 *  - signInWithPopup + GoogleAuthProvider (SDK compat 9.23).
 *  - Si el usuario de Google NUNCA tuvo perfil en users/, se crea uno
 *    completo con el MISMO formato que el registro normal: userId
 *    reservado en ids/, handler único reservado en handlers/ (derivado
 *    de su correo con sufijos si está tomado), email y createdAt.
 *    Si ya tenía perfil, entra directo sin tocar nada.
 *  - Errores con los mismos toasts del formulario (SC.buttons.errors).
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const BTN_ID = 'sc-google-btn';
    const ID_LENGTH = 16;
    const ID_MAX_TRIES = 5;

    function db() {
        return (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.database)
            ? window.StevsconFirebase.database : null;
    }

    function fauth() {
        return (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.auth)
            ? window.StevsconFirebase.auth : null;
    }

    function handlerKey(h) {
        return (typeof SC.handlerKey === 'function')
            ? SC.handlerKey(h)
            : String(h).toLowerCase().replace(/[.$#\[\]]/g, function (ch) {
                return ch === '.' ? ',' : { '#': '~a', '$': '~b', '[': '~c', ']': '~d' }[ch];
            });
    }

    function generateId() {
        let id = String(Math.floor(Math.random() * 9) + 1);
        for (let i = 1; i < ID_LENGTH; i++) id += String(Math.floor(Math.random() * 10));
        return id;
    }

    function reserveId(uid, tries) {
        const d = db();
        const id = generateId();
        return d.ref('ids/' + id).transaction(function (current) {
            return current === null ? uid : undefined;
        }).then(function (res) {
            if (res.committed) return id;
            if (tries >= ID_MAX_TRIES) throw new Error('id_exhausted');
            return reserveId(uid, tries + 1);
        });
    }

    function reserveHandler(handler, uid) {
        const d = db();
        return d.ref('handlers/' + handlerKey(handler)).transaction(function (current) {
            return current === null ? uid : undefined;
        }).then(function (res) {
            if (!res.committed) throw new Error('handler_taken');
            return handler;
        });
    }

    function errors() {
        return (SC.buttons && SC.buttons.errors) ? SC.buttons.errors : null;
    }

    function setBusyBtn(btn, state) {
        if (!btn) return;
        btn.disabled = state;
        btn.style.opacity = state ? '.6' : '1';
        btn.style.cursor = state ? 'wait' : 'pointer';
    }

    function ensureProfile(user) {
        const d = db();
        if (!d) return Promise.reject(new Error('no-db'));
        return d.ref('users/' + user.uid).once('value').then(function (snap) {
            if (snap.exists()) return { created: false, profile: snap.val() };
            const email = user.email || '';
            const display = String(user.displayName || email.split('@')[0] || 'Miembro').trim().slice(0, 32) || 'Miembro';
            const base = (email.split('@')[0] || 'miembro').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12) || 'miembro';
            let userId = null;
            return reserveId(user.uid, 0).then(function (id) {
                userId = id;
                function tryHandler(n) {
                    return reserveHandler(base + (n || ''), user.uid).catch(function (e) {
                        if (e && e.message === 'handler_taken' && n < 40) return tryHandler(n + 1);
                        throw e;
                    });
                }
                return tryHandler(0);
            }).then(function (handler) {
                const profile = {
                    userId: userId,
                    username: display,
                    handler: handler,
                    email: email,
                    rank: email.toLowerCase() === OWNER_EMAIL ? 'OWNER' : 'USER',
                    createdAt: window.firebase.database.ServerValue.TIMESTAMP
                };
                return d.ref('users/' + user.uid).set(profile).then(function () {
                    return { created: true, profile: profile };
                });
            });
        });
    }

    function googleSignIn() {
        const A = fauth();
        const e = errors();
        if (!A) { if (e) e.show('Firebase no está disponible ahora mismo. Recarga la página.'); return; }
        if (A.currentUser) { if (e) e.show('Ya tienes una sesión abierta en esta pestaña.'); return; }
        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        setBusyBtn(gBtn, true);
        A.signInWithPopup(provider).then(function (res) {
            return ensureProfile(res.user).then(function (r) {
                setBusyBtn(gBtn, false);
                try { if (SC.access && typeof SC.access.close === 'function') SC.access.close(); } catch (err) {}
                if (r.created && e) e.success('¡Bienvenido a Stevscon, ' + r.profile.username + '! Tu ID es ' + r.profile.userId + '.');
                if (!r.created && e) e.success('¡Sesión iniciada con Google!');
            });
        }).catch(function (err) {
            setBusyBtn(gBtn, false);
            const code = (err && err.code) || '';
            if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
            if (e) e.show(SC.translateAuthError ? SC.translateAuthError(code) : 'No pudimos conectar con Google. Detalle: ' + (code || 'desconocido'));
        });
    }

    function makeGoogleButton() {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = BTN_ID;
        b.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:9px;width:100%;height:42px;margin-top:10px;' +
            'border-radius:10px;border:1px solid var(--border-color,#2e2440);background:#ffffff;color:#1f2937;' +
            'font:700 13px Inter,sans-serif;cursor:pointer;box-sizing:border-box;transition:transform .12s ease;';
        b.addEventListener('mouseenter', function () { b.style.transform = 'translateY(-1px)'; });
        b.addEventListener('mouseleave', function () { b.style.transform = 'none'; });
        b.addEventListener('click', function (e) { e.preventDefault(); googleSignIn(); });

        const g = document.createElement('span');
        g.style.cssText = 'width:18px;height:18px;flex:none;display:inline-block;';
        g.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
        b.appendChild(g);
        b.appendChild(document.createTextNode('Continuar con Google'));
        return b;
    }

    function wireForm(form, label) {
        if (!form || !form.tagName || form.tagName.toLowerCase() !== 'form') return;
        if (form.querySelector('#' + BTN_ID)) return;
        form.appendChild(makeGoogleButton());
    }

    function findAccessForm() {
        const inputs = document.querySelectorAll('#access-identifier');
        for (let i = 0; i < inputs.length; i++) {
            const f = inputs[i].closest && inputs[i].closest('form');
            if (f) return f;
        }
        return null;
    }

    function findCreateForm() {
        const inputs = document.querySelectorAll('#create-account-email');
        for (let i = 0; i < inputs.length; i++) {
            const f = inputs[i].closest && inputs[i].closest('form');
            if (f) return f;
        }
        return null;
    }

    let gBtn = null;

    function tick() {
        const af = findAccessForm();
        if (af) wireForm(af, 'access');
        const cf = findCreateForm();
        if (cf) wireForm(cf, 'create');
        gBtn = document.getElementById(BTN_ID);
    }

    new MutationObserver(function () { setTimeout(tick, 50); })
        .observe(document.body, { childList: true, subtree: true });
    tick();

    console.log('[Stevscon] acc_google.js listo (v1) — Continuar con Google en los modales de acceso y registro.');
})(window, document);
