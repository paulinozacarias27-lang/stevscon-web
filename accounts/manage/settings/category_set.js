/**
 * STEVSCON.COM - accounts/manage/settings/category_set.js
 * COORDINADOR DE AJUSTES (v1)
 * - Sigue la sesión: con sesión activa carga users/{uid}/settings y el
 *   registro de la cuenta; sin sesión, apaga el engranaje y cierra el panel.
 * - Mantiene SCSET.settings fresco con on('value').
 */
(function (window, document) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    let detachSettings = null;
    let detachStatus = null;

    function defaults() {
        return {
            lang: 'es', theme: 'dark', defaultStatus: 'online',
            privacy: { invisible: false, profileVis: 'public', hideAge: false, hideGender: false }
        };
    }

    function mergeSettings(v) {
        const d = defaults();
        const out = Object.assign(d, v || {});
        out.privacy = Object.assign(defaults().privacy, (v && v.privacy) || {});
        SCSET.settings = out;
    }

    function startForUser(user) {
        const D = (typeof firebase !== 'undefined' && firebase.database) ? firebase.database : null;
        if (!D) return;
        SCSET.user = user;
        SCSET.authed = true;

        const setRef = D().ref('users/' + user.uid + '/settings');
        setRef.once('value').then(function (snap) {
            mergeSettings(snap.val());
            if (SCSET.settings.theme) SCSET.applyTheme(SCSET.settings.theme);
            document.dispatchEvent(new CustomEvent('sc:settings-changed', {}));
        }).catch(function (err) { console.error('[Stevscon Settings] Error leyendo ajustes:', err); });

        detachSettings = setRef.on('value', function (snap) {
            mergeSettings(snap.val());
            document.dispatchEvent(new CustomEvent('sc:settings-changed', {}));
        });

        D().ref('users/' + user.uid).once('value').then(function (snap) {
            SCSET.data = { record: snap.val() || {} };
            document.dispatchEvent(new CustomEvent('sc:settings-changed', {}));
        }).catch(function () { SCSET.data = { record: {} }; });
    }

    function stopForUser() {
        SCSET.user = null;
        SCSET.authed = false;
        SCSET.data = { record: null };
        SCSET.settings = defaults();
        if (detachSettings) { try { detachSettings(); } catch (e) {} detachSettings = null; }
        if (detachStatus) { try { detachStatus(); } catch (e) {} detachStatus = null; }
        SCSET.close();
    }

    function init() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.error('[Stevscon Settings] Firebase no disponible.');
            return;
        }
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) startForUser(user);
            else stopForUser();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    console.log('[Stevscon] category_set.js listo (coordinador v1).');
})(window, document);