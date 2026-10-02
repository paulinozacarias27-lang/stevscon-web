/**
 * STEVSCON.COM - accounts/manage/settings/security/buttons/sec_mail.js
 * LÓGICA: CAMBIAR CORREO (v1)
 * - verifyBeforeUpdateEmail: Firebase manda el link al correo NUEVO y el
 *   correo no cambia hasta que el usuario lo pulsa (flujo seguro).
 * - Auto-sincronía: cuando Firebase confirma el correo nuevo, el campo
 *   users/{uid}/email de la RTDB se actualiza solo en el siguiente login.
 * - Owner: bloqueado (correo oficial).
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    SCSET.api = SCSET.api || {};
    SCSET.api.security = SCSET.api.security || {};

    SCSET.api.security.changeMail = function (newEmail, pwd) {
        if (SCSET.security && SCSET.security.isOwner && SCSET.security.isOwner()) {
            return Promise.reject({ code: 'owner-locked' });
        }
        const user = SCSET.user;
        if (!user) return Promise.reject({ cancelled: true });
        if (typeof firebase === 'undefined' || !firebase.auth) {
            return Promise.reject(new Error('Firebase no disponible'));
        }
        return SCSET.api.security.ensureFresh(user, pwd).then(function (u) {
            return u.verifyBeforeUpdateEmail(newEmail);
        }).then(function () {
            console.log('[Stevscon Security] Link de verificación enviado a ' + newEmail);
        });
    };

    /* ==== AUTO-SINCRONÍA auth email -> users/{uid}/email ==== */
    (function () {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) return;
        firebase.auth().onAuthStateChanged(function (u) {
            if (!u || !u.email) return;
            const ref = firebase.database().ref('users/' + u.uid + '/email');
            ref.once('value').then(function (snap) {
                if (snap.val() !== u.email) {
                    return ref.set(u.email).catch(function () {});
                }
            }).catch(function () {});
        });
    })();

    console.log('[Stevscon] sec_mail.js listo (cambio de correo + sincronía activos).');
})(window);