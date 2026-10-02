/**
 * ============================================================
 * STEVSCON.COM — social/manage/output/system/profiles_show.js (v1)
 * Abre el panel de perfiles que YA EXISTE cuando alguien pulsa un
 * avatar o nombre del Social (posts, comentarios, respuestas).
 *
 * utils.js marca las cabezas de usuario con data-scsoc-profile="{uid}";
 * este file las escucha por delegación global.
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    SCSOC.profiles = SCSOC.profiles || {};

    /*
     * >>> CONEXIÓN CON TU PANEL DE PERFILES <<<
     * Si tu panel tiene una función global, actívala en la línea marcada
     * de abajo y borra el dispatch. Ejemplo:
     *     window.StevsconProfiles.open(uid);
     */
    SCSOC.profiles.open = function (uid) {
        if (!uid) return;
        /* >>> DESCOMENTA Y CONECTA AQUÍ TU PANEL:
        if (window.StevsconProfiles && window.StevsconProfiles.open) {
            window.StevsconProfiles.open(uid);
            return;
        }
        */
        const ev = new CustomEvent('sc:open-profile', { detail: { uid: uid, handled: false } });
        document.dispatchEvent(ev);
        if (!ev.detail.handled) {
            console.warn('[SCSOC profiles_show] Panel de perfiles aún no conectado para uid:', uid);
        }
    };

    document.addEventListener('click', function (e) {
        const t = e.target && e.target.closest ? e.target.closest('[data-scsoc-profile]') : null;
        if (!t) return;
        e.stopPropagation();
        SCSOC.profiles.open(t.dataset.scsocProfile);
    });

    console.log('[Stevscon] profiles_show.js listo (v1) — avatar/nombre del Social abre el panel de perfiles.');
})(window, document);