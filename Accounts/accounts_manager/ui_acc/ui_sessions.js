/**
 * STEVSON.COM :: ui_sessions.js
 * Avisos visuales del ciclo de sesión: bienvenida, salida, baneo
 * (pantalla de bloqueo) y suspensión. Navegación básica de menú.
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsUISessions !== 'undefined') { return; }

    var _hadUser = false;
    function _toast(msg, type, title) {
        if (typeof window.AccountsUIErrors !== 'undefined') {
            window.AccountsUIErrors.toast(msg, type, title);
        }
    }

    var AccountsUISessions = {

        onLogin: function (userData) {
            if (_hadUser) { return; }               // ya avisamos
            _hadUser = true;
            var handle = (userData && userData.handle) ? userData.handle : 'usuario';
            _toast('Sesión iniciada como @' + handle, 'success', '¡Hola de nuevo!');
        },

        onLogout: function () {
            if (!_hadUser) { return; }
            _hadUser = false;
            this._removeBlockedScreen();
        },

        onBanned: function () {
            _hadUser = false;
            this.showBlockedScreen();
        },

        onSuspended: function () {
            _toast('Tu cuenta está suspendida temporalmente.', 'warn', 'Cuenta suspendida');
        },

        /* Pantalla de bloqueo total para cuentas baneadas */
        showBlockedScreen: function () {
            this._removeBlockedScreen();
            var root = document.getElementById('modals-root');
            if (!root) { return; }
            var el = document.createElement('div');
            el.id = 'acc-blocked-screen';
            el.className = 'modal-overlay visible blocked-screen';
            el.innerHTML =
                '<div class="stevscon-accounts-card blocked-card">' +
                    '<div class="accounts-logo" style="color:var(--danger)"><i class="fa-solid fa-ban"></i></div>' +
                    '<h2>Cuenta baneada</h2>' +
                    '<p>Tu cuenta ha sido baneada de Stevscon por violar las normas de la comunidad.</p>' +
                    '<p class="blocked-note">Si crees que es un error, contacta al equipo de soporte.</p>' +
                    '<button id="blocked-logout-btn" class="btn btn-danger btn-block">Volver al inicio</button>' +
                '</div>';
            root.appendChild(el);
            var btn = document.getElementById('blocked-logout-btn');
            if (btn) {
                btn.addEventListener('click', function () {
                    var scr = document.getElementById('acc-blocked-screen');
                    if (scr && scr.parentNode) { scr.parentNode.removeChild(scr); }
                });
            }
        },

        _removeBlockedScreen: function () {
            var scr = document.getElementById('acc-blocked-screen');
            if (scr && scr.parentNode) { scr.parentNode.removeChild(scr); }
        },

        /* ---------- Navegación del menú de usuario ---------- */
        _switchView: function (viewName) {
            var views = document.querySelectorAll('.view-section');
            for (var i = 0; i < views.length; i++) {
                views[i].classList.add('hidden');
                views[i].classList.remove('active');
            }
            var target = document.getElementById('view-' + viewName);
            if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
        },

        goToProfile: function () {
            this._switchView('profile');
            _toast('El perfil completo llegará con el módulo de perfiles.', 'info');
        },
        goToSettings: function () {
            _toast('La configuración llegará con el módulo de ajustes.', 'info');
        },
        goToAdmin: function () {
            _toast('El panel de administración llegará con el módulo de staff.', 'info');
        }
    };

    window.AccountsUISessions = AccountsUISessions;
    console.log('[Stevscon] ui_sessions.js listo.');

})(window);