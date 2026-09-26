/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/buttons/acc_errors.js
 * Caja de errores/éxito de los botones de CREATE.
 * Traduce los códigos de Firebase Auth a español y muestra
 * los mensajes SIEMPRE con textContent (nunca innerHTML).
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const AUTH_ERRORS = {
        'auth/email-already-in-use': 'Este correo ya tiene una cuenta. Prueba iniciar sesión con él.',
        'auth/invalid-email': 'El correo no tiene un formato válido.',
        'auth/weak-password': 'La contraseña es muy débil: usa al menos 8 caracteres.',
        'auth/network-request-failed': 'Problema de red. Revisa tu conexión e inténtalo de nuevo.',
        'auth/too-many-requests': 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.',
        'auth/operation-not-allowed': 'El registro con correo está deshabilitado en Firebase Console (habilita Email/Password en Auth → Sign-in method).',
        'auth/internal-error': 'Error interno de Firebase. Inténtalo de nuevo.'
    };

    function translateAuthError(code) {
        return AUTH_ERRORS[code] || 'No pudimos crear tu cuenta. Inténtalo de nuevo.';
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
        return { box, icon, msg };
    }

    function render() {
        const wrap = document.createElement('div');
        wrap.className = 'feedback-wrap';
        wrap.dataset.field = 'feedback';

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

    SC.buttons = SC.buttons || {};
    SC.buttons.errors = { id: 'errors', render, show, success, clear, translateAuthError };

    // Atajo global para cualquier módulo de la categoría
    SC.translateAuthError = translateAuthError;
})(window, document);