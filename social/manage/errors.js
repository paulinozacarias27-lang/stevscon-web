/**
 * ====
 * STEVSCON.COM — social/manage/posts/errors.js (v1)
 * RED DE SEGURIDAD de la categoría SOCIAL (el errors.js verdadero).
 *
 *  · Atrapa errores JS no manejados y promesas rotas: los reporta en
 *    consola con prefijo y avisa al usuario con mensaje amistoso y tope
 *    de frecuencia (NUNCA detalles técnicos en pantalla).
 *  · Guardia de sesión: SCSOC.errors.requireUser(accion, cb) niega la
 *    interacción a visitantes con mensaje claro y lanza el evento
 *    'sc:guest-blocked' para que otros módulos reaccionen (eventos).
 *  · SCSOC.errors.safe(fn, etiqueta): envuelve acciones de otros módulos
 *    para que un fallo no mate a todo el Social.
 *
 *  SEGURIDAD: textContent SIEMPRE. Cargar DESPUÉS de category_posts.js.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.errors) return;

    let lastToastAt = 0;

    function toast(msg) {
        if (SCSOC.toast) { try { SCSOC.toast(msg); return; } catch (e) {} }
        const wrap = document.getElementById('alerts-container');
        if (!wrap) return;
        const t = document.createElement('div');
        t.className = 'toast toast-error';
        const s = document.createElement('span');
        s.textContent = String(msg || '');
        t.appendChild(s);
        wrap.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4500);
    }

    /* aviso amistoso con tope de frecuencia (1 por ventana de ms) */
    function warn(msg, ms) {
        const now = Date.now();
        if (now - lastToastAt < (ms || 15000)) return;
        lastToastAt = now;
        toast(msg);
    }

    /* 1) Errores no manejados — solo avisan si el Social está vivo */
    window.addEventListener('error', function (e) {
        console.error('[Stevscon][Social] error en', (e && e.filename) || '?',
            'línea', (e && e.lineno) || '?', '→', (e && e.message) || e);
        if (!window.SCSOC || !SCSOC.pages) return;
        warn('Algo falló en Social. Reintenta; si sigue, avísale a Stevs.', 20000);
    });

    window.addEventListener('unhandledrejection', function (e) {
        console.error('[Stevscon][Social] promesa rechazada:', (e && e.reason) || e);
    });

    /* 2) Guardia de sesión (niega interacción a visitantes) */
    function isUser() {
        try { return !!(window.firebase && firebase.auth() && firebase.auth().currentUser); }
        catch (e) { return false; }
    }

    function requireUser(accion, cb) {
        const u = isUser() ? firebase.auth().currentUser : null;
        if (u) { if (typeof cb === 'function') cb(u); return true; }
        warn('Inicia sesión para ' + (accion || 'interactuar') + '.', 2500);
        try {
            document.dispatchEvent(new CustomEvent('sc:guest-blocked', { detail: { accion: String(accion || '') } }));
        } catch (e) {}
        return false;
    }

    /* 3) Envoltorio a prueba de fallos para acciones de otros módulos */
    function safe(fn, etiqueta) {
        return function () {
            try { return fn.apply(this, arguments); }
            catch (e) {
                console.error('[Stevscon][Social] fallo en ' + (etiqueta || 'una acción') + ':', e);
                warn('Esa acción falló. Intenta de nuevo.', 8000);
            }
        };
    }

    SCSOC.errors = { isUser: isUser, requireUser: requireUser, safe: safe, warn: warn };

    console.log('[Stevscon] errors.js listo (v1) — red de seguridad del Social activa.');
})(window, document);