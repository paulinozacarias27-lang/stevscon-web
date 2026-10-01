/**
 * STEVSCON.COM - accounts/manage/settings/buttons/set_preferences.js
 * LÓGICA: PREFERENCIAS (v1) · guarda en users/{uid}/settings y aplica al instante
 */
(function (window, document) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    function db() {
        if (typeof firebase !== 'undefined' && firebase.database) return firebase.database();
        return null;
    }

    function patch(obj) {
        const user = SCSET.user;
        if (!user || !db()) return Promise.reject(new Error('sin sesión'));
        return db().ref('users/' + user.uid + '/settings').update(obj).then(function () {
            Object.keys(obj).forEach(function (k) { SCSET.settings[k] = obj[k]; });
            document.dispatchEvent(new CustomEvent('sc:settings-changed', { detail: obj }));
        }).catch(function (err) {
            console.error('[Stevscon Settings] No se pudo guardar:', err);
            SCSET.toast('No se pudo guardar. Intenta de nuevo.');
        });
    }

    SCSET.api = SCSET.api || {};
    SCSET.api.preferences = {
        setLang: function (v) {
            try { localStorage.setItem('stevscon_lang', v); } catch (e) {}
            // Engancha al sistema de lenguaje si expone API; si no, avisa por evento.
            if (window.StevsconLang && typeof window.StevsconLang.set === 'function') {
                window.StevsconLang.set(v);
            } else {
                document.dispatchEvent(new CustomEvent('sc:lang-changed', { detail: { lang: v } }));
            }
            SCSET.toast(v === 'en' ? 'Language updated' : 'Idioma actualizado');
            return patch({ lang: v });
        },
        setTheme: function (v) {
            SCSET.applyTheme(v);
            SCSET.toast(v === 'light' ? 'Tema claro aplicado' : 'Tema oscuro aplicado');
            return patch({ theme: v });
        },
        setDefaultStatus: function (v) {
            SCSET.toast('Estado por defecto guardado');
            return patch({ defaultStatus: v });
        }
    };

    console.log('[Stevscon] set_preferences.js listo (botones registrados).');
})(window, document);