/**
 * STEVSCON.COM - accounts/manage/settings/buttons/set_privacy.js
 * LÓGICA: PRIVACIDAD (v1)
 * - Invisible: se aplica AL INSTANTE (te pone Desconectado para los demás
 *   escribiendo en users/{uid}/status, igual que el panel de estados).
 * - El resto se guarda en users/{uid}/settings/privacy.
 */
(function (window, document) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    function db() {
        if (typeof firebase !== 'undefined' && firebase.database) return firebase.database();
        return null;
    }

    function patchPrivacy(obj) {
        const user = SCSET.user;
        if (!user || !db()) return Promise.reject(new Error('sin sesión'));
        return db().ref('users/' + user.uid + '/settings/privacy').update(obj).then(function () {
            SCSET.settings.privacy = Object.assign({}, SCSET.settings.privacy, obj);
            document.dispatchEvent(new CustomEvent('sc:settings-changed', { detail: { privacy: obj } }));
        }).catch(function (err) {
            console.error('[Stevscon Settings] No se pudo guardar privacidad:', err);
            SCSET.toast('No se pudo guardar. Intenta de nuevo.');
        });
    }

    function writeStatus(state) {
        const user = SCSET.user;
        if (!user || !db()) return;
        try {
            firebase.database.ServerValue.TIMESTAMP;
            db().ref('users/' + user.uid + '/status')
                .update({ state: state, manual: state, updated: firebase.database.ServerValue.TIMESTAMP })
                .catch(function () {});
        } catch (e) {}
    }

    SCSET.api = SCSET.api || {};
    SCSET.api.privacy = {
        setInvisible: function (on) {
            SCSET.toast(on ? 'Modo invisible activado' : 'Modo invisible desactivado');
            // Invisible = pareces Desconectado. Al salir, vuelves a tu estado por defecto.
            writeStatus(on ? 'offline' : (SCSET.settings.defaultStatus || 'online'));
            return patchPrivacy({ invisible: !!on });
        },
        setProfileVis: function (v) { return patchPrivacy({ profileVis: v }); },
        setHideAge: function (v) { return patchPrivacy({ hideAge: !!v }); },
        setHideGender: function (v) { return patchPrivacy({ hideGender: !!v }); }
    };

    console.log('[Stevscon] set_privacy.js listo (botones registrados).');
})(window, document);