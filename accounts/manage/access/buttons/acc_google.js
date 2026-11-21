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
 *  - v2 · ERRORES VISIBLES: antes cualquier fallo del popup (bloqueado,
 *    dominio no autorizado, proveedor apagado) quedaba SILENCIOSO porque
 *    SC.buttons.errors solo existe en el modal CREATE. Ahora el aviso se
 *    pinta SIEMPRE inline bajo el propio botón del modal abierto (rojo
 *    error / verde éxito) + console.error con el código. Popup bloqueado
 *    → reintenta con signInWithRedirect y checkRedirect() completa el
 *    perfil al volver. Ids únicos por formulario (#sc-google-btn y
 *    #sc-google-btn-create) para que el clic del ACCESS no caiga en el
 *    botón del CREATE.
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

    const GOOGLE_ERRORS = {
        'auth/unauthorized-domain': 'Esta web no está autorizada en Firebase. Agrega el dominio en Authentication → Settings → Authorized domains.',
        'auth/operation-not-allowed': 'El acceso con Google está APAGADO en Firebase. Actívalo en Authentication → Sign-in method → Google.',
        'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
        'auth/too-many-requests': 'Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'
    };

    function msgFor(code) {
        return GOOGLE_ERRORS[code] || 'No pudimos conectar con Google. Detalle: ' + (code || 'desconocido');
    }

    function inlineMsg(btn, msg, kind) {
        if (!btn || !btn.parentNode) return;
        let p = btn.parentNode.querySelector('[data-sc-google-msg]');
        if (!p) {
            p = document.createElement('p');
            p.setAttribute('data-sc-google-msg', '1');
            p.style.cssText = 'margin:8px 0 0;font:600 12px Inter,sans-serif;text-align:left;';
            btn.parentNode.insertBefore(p, btn.nextSibling);
        }
        p.style.color = kind === 'ok' ? '#34d399' : '#f87171';
        p.textContent = msg;
    }

    function showErr(btn, code, msg) {
        try { console.error('[Stevscon Google] ' + (code || 'error desconocido')); } catch (e2) {}
        inlineMsg(btn, msg || msgFor(code));
    }

    function showOk(btn, msg) {
        inlineMsg(btn, msg, 'ok');
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

    function googleSignIn(btn) {
        const A = fauth();
        if (!A) {
            showErr(btn, 'no-firebase', 'Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }
        if (A.currentUser) {
            showErr(btn, 'sc-session-activa', 'Ya tienes una sesión abierta en esta pestaña.');
            return;
        }
        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        setBusyBtn(btn, true);
        A.signInWithPopup(provider).then(function (res) {
            return ensureProfile(res.user).then(function (r) {
                setBusyBtn(btn, false);
                try { if (SC.access && typeof SC.access.close === 'function') SC.access.close(); } catch (err) {}
                if (r.created) showOk(btn, '¡Bienvenido a Stevscon, ' + r.profile.username + '! Tu ID es ' + r.profile.userId + '.');
                else showOk(btn, '¡Sesión iniciada con Google!');
            });
        }).catch(function (err) {
            setBusyBtn(btn, false);
            const code = (err && err.code) || '';
            if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
            if (code === 'auth/popup-blocked') {
                A.signInWithRedirect(provider).catch(function (err2) {
                    showErr(btn, (err2 && err2.code) || 'auth/popup-blocked');
                });
                return;
            }
            showErr(btn, code);
        });
    }

    function makeGoogleButton(label) {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = label === 'create' ? BTN_ID + '-create' : BTN_ID;
        b.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:9px;width:100%;height:42px;margin-top:10px;' +
            'border-radius:10px;border:1px solid var(--border-color,#2e2440);background:#ffffff;color:#1f2937;' +
            'font:700 13px Inter,sans-serif;cursor:pointer;box-sizing:border-box;transition:transform .12s ease;';
        b.addEventListener('mouseenter', function () { b.style.transform = 'translateY(-1px)'; });
        b.addEventListener('mouseleave', function () { b.style.transform = 'none'; });
        b.addEventListener('click', function (e) { e.preventDefault(); googleSignIn(b); });

        const g = document.createElement('span');
        g.style.cssText = 'width:18px;height:18px;flex:none;display:inline-block;';
        g.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
        b.appendChild(g);
        b.appendChild(document.createTextNode('Continuar con Google'));
        return b;
    }

    function wireForm(form, label) {
        if (!form || !form.tagName || form.tagName.toLowerCase() !== 'form') return;
        const bid = label === 'create' ? BTN_ID + '-create' : BTN_ID;
        if (form.querySelector('#' + bid)) return;
        form.appendChild(makeGoogleButton(label));
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

    function tick() {
        const af = findAccessForm();
        if (af) wireForm(af, 'access');
        const cf = findCreateForm();
        if (cf) wireForm(cf, 'create');
    }

    new MutationObserver(function () { setTimeout(tick, 50); })
        .observe(document.body, { childList: true, subtree: true });
    tick();

    function checkRedirect() {
        const A = fauth();
        if (!A || typeof A.getRedirectResult !== 'function') return;
        A.getRedirectResult().then(function (res) {
            if (!res || !res.user) return;
            return ensureProfile(res.user).then(function (r) {
                try { if (SC.access && typeof SC.access.close === 'function') SC.access.close(); } catch (err) {}
                if (r.created) console.log('[Stevscon Google] perfil creado vía redirect: ' + r.profile.userId);
            });
        }).catch(function (err) {
            const code = (err && err.code) || '';
            if (code) console.error('[Stevscon Google] redirect: ' + code);
        });
    }
    checkRedirect();

    console.log('[Stevscon] acc_google.js listo (v2) — Continuar con Google en los modales de acceso y registro.');
})(window, document);
