/**
 * ============================================================
 * STEVSCON.COM - accounts/owner.js  ·  JERARQUÍA DE RANGOS
 * ⬆️ Carga SIEMPRE ALTO DE TODO (primer <script> del index).
 *
 * IDENTIDAD DEL OWNER (INQUEBRANTABLE, guardada aquí):
 * → steven23hd@gmail.com  /  StevsLoL
 * ============================================================
 */
(function (window) {
    'use strict';

    const Ranks = window.StevsconRanks = {};

    // ===== IDENTIDAD DEL OWNER (guardada AQUÍ y solo aquí) =====
    const OWNER = {
        email: 'steven23hd@gmail.com',
        username: 'StevsLoL',
        rank: 'OWNER'
    };
    Ranks.OWNER = OWNER;

    const LEVELS = { OWNER: 100, ADMIN: 80, MOD: 50, USER: 10 };
    Ranks.LEVELS = LEVELS;

    const ADMIN_EMAILS = [];
    Ranks.ADMIN_EMAILS = ADMIN_EMAILS;

    function norm(s) { return String(s || '').trim().toLowerCase(); }

    Ranks.isOwnerUsername = function (username) {
        return norm(username) === norm(OWNER.username);
    };

    Ranks.isOwnerEmail = function (email) {
        return norm(email) === norm(OWNER.email);
    };

    function fieldValue(id) {
        try {
            const SC = window.StevsconCreate;
            const f = SC && SC.output && SC.output.get ? SC.output.get(id) : null;
            return f && typeof f.getValue === 'function' ? f.getValue() : '';
        } catch (e) { return ''; }
    }

    Ranks.ownerMode = function () {
        return Ranks.isOwnerUsername(fieldValue('username')) ||
               Ranks.isOwnerEmail(fieldValue('account'));
    };

    Ranks.rankForEmail = function (email) {
        if (Ranks.isOwnerEmail(email)) return 'OWNER';
        if (ADMIN_EMAILS.map(norm).indexOf(norm(email)) !== -1) return 'ADMIN';
        return 'USER';
    };
    Ranks.getRank = Ranks.rankForEmail;

    Ranks.atLeast = function (rank, email) {
        return (LEVELS[rank] || 0) <= (LEVELS[Ranks.rankForEmail(email)] || 0);
    };

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