/**
 * STEVSON.COM :: func_buttons.js
 * Qué hace CADA botón del sistema de cuentas (sin dibujar nada).
 * La UI (ui_auth / ui_buttons) llama a estas acciones.
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsButtons !== 'undefined') { return; }

    function _uiErr() {
        return (typeof window.AccountsUIErrors !== 'undefined') ? window.AccountsUIErrors : null;
    }
    function _toast(msg, type) {
        var u = _uiErr();
        if (u) { u.toast(msg, type); } else { console.log('[' + (type || 'info') + '] ' + msg); }
    }
    function _fail(err) {
        var msg = (typeof window.AccountsErrors !== 'undefined')
            ? window.AccountsErrors.translate(err) : String(err && err.message);
        _toast(msg, 'error');
        return msg;
    }

    var AccountsButtons = {

        /* ---------- LOGIN ---------- */
        doLogin: async function (email, password) {
            if (typeof window.AccountsAuth === 'undefined') { return; }
            try {
                await window.AccountsAuth.login(email, password);
                _toast('Sesión iniciada. ¡Bienvenido de vuelta!', 'success');
                if (typeof window.AccountsUIAuth !== 'undefined') { window.AccountsUIAuth.close(); }
            } catch (e) { _fail(e); }
        },

        /* ---------- REGISTRO ---------- */
        doRegister: async function (email, password, password2, handle, displayName) {
            if (typeof window.AccountsAuth === 'undefined') { return; }
            var err = (typeof window.AccountsErrors !== 'undefined') ? window.AccountsErrors : null;
            if (err && password !== password2) { throw new Error('PASSWORD_MISMATCH'); }
            try {
                await window.AccountsAuth.register(email, password, handle, displayName);
                _toast('¡Cuenta creada! Revisa tu correo para verificarla.', 'success');
                if (typeof window.AccountsUIAuth !== 'undefined') { window.AccountsUIAuth.close(); }
            } catch (e) { _fail(e); }
        },

        /* ---------- GOOGLE ---------- */
        doGoogle: async function () {
            if (typeof window.AccountsAuth === 'undefined') { return; }
            try {
                await window.AccountsAuth.loginWithGoogle();
                _toast('Sesión iniciada con Google.', 'success');
                if (typeof window.AccountsUIAuth !== 'undefined') { window.AccountsUIAuth.close(); }
            } catch (e) { _fail(e); }
        },

        /* ---------- RECUPERAR CONTRASEÑA ---------- */
        doReset: async function (email) {
            if (typeof window.AccountsAuth === 'undefined') { return; }
            try {
                await window.AccountsAuth.resetPassword(email);
                _toast('Enlace de recuperación enviado a tu correo.', 'success');
                if (typeof window.AccountsUIAuth !== 'undefined') { window.AccountsUIAuth.switchMode('login'); }
            } catch (e) { _fail(e); }
        },

        /* ---------- CERRAR SESIÓN (con confirmación) ---------- */
        doLogout: async function () {
            var u = _uiErr();
            var self = this;
            var ask = function () { return Promise.resolve(true); };
            if (u && u.confirm) {
                ask = function () {
                    return u.confirm({
                        title: 'Cerrar sesión',
                        message: '¿Seguro que quieres cerrar tu sesión en Stevscon?',
                        confirmText: 'Cerrar sesión',
                        danger: true
                    });
                };
            }
            var ok = await ask();
            if (!ok) { return; }
            try {
                await window.AccountsAuth.logout();
                _toast('Sesión cerrada. ¡Nos vemos pronto!', 'info');
            } catch (e) { _fail(e); }
        },

        /* ---------- MOSTRAR / OCULTAR CONTRASEÑA ---------- */
        togglePassword: function (inputId, btn) {
            var input = document.getElementById(inputId);
            if (!input) { return; }
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            if (btn) {
                var icon = btn.querySelector('i');
                if (icon) { icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'; }
            }
        }
    };

    window.AccountsButtons = AccountsButtons;
    console.log('[Stevscon] func_buttons.js listo.');

})(window);