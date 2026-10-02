/**
 * STEVSCON.COM - accounts/manage/settings/security/buttons/sec_password.js
 * LÓGICA: CAMBIAR CONTRASEÑA (v1)
 * Puerta re-auth -> updatePassword. Nada se escribe en la RTDB (regla de oro).
 * Bonus: Firebase cierra la sesión en los otros dispositivos automáticamente.
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    SCSET.api = SCSET.api || {};
    SCSET.api.security = SCSET.api.security || {};

    SCSET.api.security.changePassword = function (currentPwd, newPwd) {
        const user = SCSET.user;
        if (!user) return Promise.reject({ cancelled: true });
        if (typeof firebase === 'undefined' || !firebase.auth) {
            return Promise.reject(new Error('Firebase no disponible'));
        }
        return SCSET.api.security.ensureFresh(user, currentPwd).then(function (u) {
            return u.updatePassword(newPwd);
        }).then(function () {
            console.log('[Stevscon Security] Contraseña actualizada.');
        });
    };

    console.log('[Stevscon] sec_password.js listo (cambio de contraseña activo).');
})(window);