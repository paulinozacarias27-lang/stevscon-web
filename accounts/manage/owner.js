/**
 * ============================================================
 * STEVSCON.COM - owner.js  ·  JERARQUÍA DE RANGOS
 * ⬆️ ESTE FILE DEBE CARGAR SIEMPRE ALTO DE TODO:
 *    es el PRIMER <script> del index, antes que Firebase.
 *
 * OWNER = TOP absoluto de la web (nadie por encima).
 * Si en el crear cuentas el username es "StevsLoL", se activa
 * el MODO OWNER: handler y contraseña libres a su gusto.
 * ============================================================
 */
(function (window) {
    'use strict';

    const Ranks = window.StevsconRanks = {};

    // ===== IDENTIDAD DEL OWNER (INQUEBRANTABLE) =====
    const OWNER = {
        email: 'steven23hd@gmail.com',
        username: 'StevsLoL',
        rank: 'OWNER'
    };
    Ranks.OWNER = OWNER;

    // Jerarquía: OWNER siempre TOP, nadie lo supera
    const LEVELS = { OWNER: 100, ADMIN: 80, MOD: 50, USER: 10 };
    Ranks.LEVELS = LEVELS;

    // Correos con rango ADMIN (añade aquí los futuros admins)
    const ADMIN_EMAILS = [];
    Ranks.ADMIN_EMAILS = ADMIN_EMAILS;

    function norm(s) { return String(s || '').trim().toLowerCase(); }

    // ¿El username escrito es el del Owner? (compara sin mayúsculas)
    Ranks.isOwnerUsername = function (username) {
        return norm(username) === norm(OWNER.username);
    };

    Ranks.isOwnerEmail = function (email) {
        return norm(email) === norm(OWNER.email);
    };

    // ¿El formulario está en MODO OWNER ahora mismo?
    // Lee el campo username en vivo desde el registro OUTPUT.
    Ranks.ownerMode = function () {
        try {
            const SC = window.StevsconCreate;
            const f = SC && SC.output && SC.output.get ? SC.output.get('username') : null;
            return Ranks.isOwnerUsername(f && f.getValue ? f.getValue() : '');
        } catch (e) { return false; }
    };

    // Rango de un correo: OWNER > ADMIN > USER
    Ranks.rankForEmail = function (email) {
        if (Ranks.isOwnerEmail(email)) return 'OWNER';
        if (ADMIN_EMAILS.map(norm).indexOf(norm(email)) !== -1) return 'ADMIN';
        return 'USER';
    };
    Ranks.getRank = Ranks.rankForEmail;

    Ranks.atLeast = function (rank, email) {
        const need = LEVELS[rank] || 0;
        const has = LEVELS[Ranks.rankForEmail(email)] || 0;
        return has >= need;
    };

    // Al entrar/salir el Modo Owner, refresca los campos con privilegios
    Ranks.refresh = function () {
        const SC = window.StevsconCreate || {};
        ['account', 'handler', 'password'].forEach(function (id) {
            const f = SC.output && SC.output.get ? SC.output.get(id) : null;
            if (f && typeof f.refresh === 'function') {
                try { f.refresh(); } catch (e) { /* campo aún no renderizado */ }
            }
        });
    };
})(window);