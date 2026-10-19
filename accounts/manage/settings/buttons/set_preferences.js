/**
 * STEVSCON.COM - accounts/manage/settings/buttons/set_preferences.js
 * LÓGICA: PREFERENCIAS (v3) · guarda en users/{uid}/settings y aplica al instante
 *  - TEMA A PRUEBA DE BALAS (v3):
 *    · Puente LAZY: busca el aplicador del core (SCSET._applyThemeCore)
 *      al MOMENTO de usarlo, no al cargar -> el orden de carga jamás
 *      rompe el modo claro.
 *    · Aplica body class + html[data-theme] + localStorage + evento
 *      'sc:theme-applied' (social.html y wiki.html lo escuchan).
 *    · SINCRONIZACIÓN: al iniciar sesión lee users/{uid}/settings/theme
 *      y aplica el tema de tu CUENTA — el tema te sigue en index,
 *      social y wiki aunque el navegador esté limpio.
 *    · Antidoble-montaje: si este file carga dos veces, no se envuelve dos veces.
 */
(function (window, document) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    /* Antidoble-montaje (por si el HTML llegara a cargar dos bloques) */
    if (SCSET._prefV3) return;
    SCSET._prefV3 = true;

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

    /* ==== PUENTE DE TEMA v3 (lazy + a prueba de orden de carga) ==== */
    const _origTheme = (typeof SCSET.applyTheme === 'function') ? SCSET.applyTheme : null;
    SCSET.applyTheme = function (v) {
        const val = (v === 'light') ? 'light' : 'dark';
        const core = (typeof SCSET._applyThemeCore === 'function') ? SCSET._applyThemeCore : _origTheme;
        if (core) {
            try { core(val); } catch (e) {}
        } else {
            /* Fallback si el core no existe aún: clase al menos */
            try {
                document.body.classList.remove('theme-dark', 'theme-light');
                document.body.classList.add('theme-' + val);
            } catch (e) {}
        }
        try { document.documentElement.setAttribute('data-theme', val); } catch (e) {}
        try { localStorage.setItem('stevscon_theme', val); } catch (e) {}
        document.dispatchEvent(new CustomEvent('sc:theme-applied', { detail: { theme: val } }));
    };

    /* ==== SINCRONIZACIÓN · el tema guardado en tu CUENTA manda ==== */
    (function syncThemeFromFirebase() {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) return;
        firebase.auth().onAuthStateChanged(function (u) {
            if (!u || !firebase.database) return;
            firebase.database().ref('users/' + u.uid + '/settings/theme').once('value').then(function (s) {
                const t = s.val();
                if (t !== 'light' && t !== 'dark') return;
                let cur = null;
                try { cur = localStorage.getItem('stevscon_theme'); } catch (e) {}
                if (t !== cur) SCSET.applyTheme(t);
            }).catch(function () {});
        });
    })();

    console.log('[Stevscon] set_preferences.js listo (v3 · tema lazy + sincronizado con la cuenta).');
})(window, document);