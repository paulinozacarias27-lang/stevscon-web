/**
 * STEVSCON.COM - accounts/manage/settings/security/buttons/sec_reauth.js
 * LA PUERTA DE RE-AUTENTICACIÓN (v1)
 * Firebase exige "sesión reciente" para acciones sensibles. ensureFresh():
 * - Si la sesión tiene menos de 5 minutos -> pasa sin pedir nada.
 * - Si no, y te dan una contraseña (prefill), intenta re-auth callado.
 * - Si aún así no, abre el modal "confirma que eres tú".
 * Los otros buttons la llaman SIEMPRE antes de operar.
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const FRESH_MS = 5 * 60 * 1000;

    function isFresh(user) {
        const t = Date.parse(user.metadata && user.metadata.lastSignInTime);
        return !isNaN(t) && (Date.now() - t) < FRESH_MS;
    }

    function reauth(user, pwd) {
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, pwd);
        return user.reauthenticateWithCredential(cred).then(function () { return user; });
    }

    SCSET.api = SCSET.api || {};
    SCSET.api.security = SCSET.api.security || {};

    SCSET.api.security.ensureFresh = function (user, prefillPwd) {
        if (!user) return Promise.reject({ cancelled: true });

        if (isFresh(user)) return Promise.resolve(user);

        if (prefillPwd) {
            return reauth(user, prefillPwd).catch(function (err) {
                if (err && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')) {
                    throw err;
                }
                return askByModal(user);
            });
        }
        return askByModal(user);

        function askByModal(u) {
            return new Promise(function (resolve, reject) {
                SCSET.security.modal({
                    title: 'Confirmar identidad',
                    desc: 'Por seguridad, escribe tu contraseña para continuar.',
                    icon: 'fa-shield-halved',
                    confirmLabel: 'Confirmar',
                    fields: [{ label: 'Contraseña', id: 'pwd', type: 'password' }],
                    onConfirm: function (vals, h) {
                        if (!vals.pwd) { h.fail('Escribe tu contraseña.'); return; }
                        reauth(u, vals.pwd).then(function () {
                            h.close();
                            resolve(u);
                        }).catch(function (err) {
                            h.fail(SCSET.security.errMsg(err));
                        });
                    }
                });
                setTimeout(function () {}, 0);
                // Si cierra el modal sin confirmar, no hay callback: usamos el cierre por ESC/click.
                // Para no dejar la promesa colgada, sondeamos si el modal fue removido:
                (function watchClosed() {
                    setTimeout(function () {
                        const still = document.querySelector('div[style*="z-index:3500"]');
                        if (!still) reject({ cancelled: true });
                        else watchClosed();
                    }, 300);
                })();
            });
        }
    };

    console.log('[Stevscon] sec_reauth.js listo (puerta de re-auth activa).');
})(window);