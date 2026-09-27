/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/reset_errors.js
 * RESET · Caja de errores/éxito propia del flujo de recuperar.
 * Mensajes SIEMPRE con textContent (nunca innerHTML, anti-XSS).
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};

    const AUTH_ERRORS = {
        'auth/invalid-email': 'El correo no tiene un formato válido.',
        'auth/too-many-requests': 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.',
        'auth/network-request-failed': 'Problema de red. Revisa tu conexión e inténtalo de nuevo.'
    };

    function translateAuthError(code) {
        return AUTH_ERRORS[code] || 'No pudimos enviar el enlace. Inténtalo de nuevo.';
    }

    let boxEl = null;
    let iconEl = null;
    let msgEl = null;

    function buildBox(kind) {
        const box = document.createElement('div');
        box.className = kind === 'success' ? 'success-box' : 'errors-box';
        box.setAttribute('role', kind === 'success' ? 'status' : 'alert');

        const icon = document.createElement('i');
        icon.className = kind === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';

        const msg = document.createElement('p');

        box.appendChild(icon);
        box.appendChild(msg);
        box.classList.add('hidden');
        return { box: box, icon: icon, msg: msg };
    }

    function render() {
        const wrap = document.createElement('div');
        wrap.className = 'feedback-wrap';
        wrap.dataset.field = 'reset-feedback';

        const err = buildBox('error');
        const ok = buildBox('success');

        boxEl = { error: err.box, success: ok.box };
        iconEl = { error: err.icon, success: ok.icon };
        msgEl = { error: err.msg, success: ok.msg };

        wrap.appendChild(err.box);
        wrap.appendChild(ok.box);
        return wrap;
    }

    function showOne(kind, msg) {
        if (!boxEl) return;
        const other = kind === 'error' ? 'success' : 'error';
        boxEl[other].classList.add('hidden');
        msgEl[kind].textContent = msg || '';
        boxEl[kind].classList.remove('hidden');
    }

    function show(msg) { showOne('error', msg); }
    function success(msg) { showOne('success', msg); }

    function clear() {
        if (!boxEl) return;
        boxEl.error.classList.add('hidden');
        boxEl.success.classList.add('hidden');
        msgEl.error.textContent = '';
        msgEl.success.textContent = '';
    }

    SC.reset.errors = { id: 'errors', render: render, show: show, success: success, clear: clear, translateAuthError: translateAuthError };
})(window, document);