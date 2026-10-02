/**
 * ====
 * STEVSCON.COM — social/manage/output/system/profiles_show.js (v2)
 * v2: intenta conectar con TU panel de perfiles real (StevsconProfiles)
 * antes de recurrir al evento 'sc:open-profile'.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    SCSOC.profiles = SCSOC.profiles || {};

    SCSOC.profiles.open = function (uid) {
        if (!uid) return;
        const P = window.StevsconProfiles;
        if (P && typeof P.open === 'function') { P.open(uid); return; }
        if (P && P.ui && typeof P.ui.open === 'function') { P.ui.open(uid); return; }
        if (P && typeof P.openProfile === 'function') { P.openProfile(uid); return; }
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

    console.log('[Stevscon] profiles_show.js listo (v2) — avatar/nombre del Social abre el panel de perfiles.');
})(window, document);