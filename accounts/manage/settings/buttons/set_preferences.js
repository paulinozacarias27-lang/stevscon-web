/**
 * STEVSCON.COM - accounts/manage/settings/buttons/set_preferences.js
 * LÓGICA: PREFERENCIAS (v2) · guarda en users/{uid}/settings y aplica al instante
 *  - NUEVO: preferencias de MD (mdAllow, mdRequests, mdSound, mdPreview, mdBadge).
 *  - NUEVO: puente de tema — Oscuro/Claro ahora funciona en TODA la web
 *    (index + social.html): body class + data-theme + localStorage + evento.
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
        },
        /* ==== MENSAJES DIRECTOS · un switch = un write a settings ==== */
        setMD: function (obj, msg) {
            if (msg) SCSET.toast(msg);
            return patch(obj);
        }
    };

    /* ==== PUENTE DE TEMA (toda la web) ====
       Conserva el comportamiento original del index (si existía) y AÑADE:
       data-theme en <html> + localStorage('stevscon_theme') + evento
       'sc:theme-applied' que social.html escucha para pintarse claro/oscuro. */
    const _origTheme = (typeof SCSET.applyTheme === 'function') ? SCSET.applyTheme : null;
    SCSET.applyTheme = function (v) {
        const val = (v === 'light') ? 'light' : 'dark';
        if (_origTheme) { try { _origTheme(val); } catch (e) {} }
        else {
            try {
                document.body.classList.remove('theme-dark', 'theme-light');
                document.body.classList.add('theme-' + val);
            } catch (e) {}
        }
        try { document.documentElement.setAttribute('data-theme', val); } catch (e) {}
        try { localStorage.setItem('stevscon_theme', val); } catch (e) {}
        document.dispatchEvent(new CustomEvent('sc:theme-applied', { detail: { theme: val } }));
    };

    console.log('[Stevscon] set_preferences.js listo (v2 · botones + puente de tema para toda la web).');
})(window, document);