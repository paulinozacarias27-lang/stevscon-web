/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/utils/age.js
 * PERFILES · UTIL · Fecha de nacimiento de la CUENTA ("Miembro desde").
 * La formatea como DD/MM/AAAA (estilo Discord). Usa createdAt guardado
 * en users/{uid}; si no existe, usa metadata.creationTime de Firebase Auth.
 * ====
 */
(function (window) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.age = SCp.age || {};

    SCp.age.format = function (value) {
        if (!value) return null;
        const d = (value instanceof Date) ? value : new Date(value);
        if (isNaN(d.getTime())) return null;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return dd + '/' + mm + '/' + d.getFullYear();
    };

    SCp.age.memberSince = function (profile, authUser) {
        const v = (profile && profile.createdAt) ||
                  (authUser && authUser.metadata && authUser.metadata.creationTime) || null;
        return SCp.age.format(v) || '—';
    };
})(window);