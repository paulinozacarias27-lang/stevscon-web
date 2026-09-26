/**
 * ============================================================
 * STEVSCON.COM - accounts/owner.js  ·  JERARQUÍA DE RANGOS
 * ⬆️ Carga SIEMPRE ALTO DE TODO (primer <script> del index).
 *
 * IDENTIDAD DEL OWNER (INQUEBRANTABLE, guardada aquí):
 * → steven23hd@gmail.com  /  StevsLoL
 *
 * MODO OWNER en el formulario: se activa si el username escrito
 * es "StevsLoL" O el correo escrito es el del Owner. Con uno solo
 * de los dos basta. Ahí handler y contraseña quedan libres.
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

    // Jerarquía: OWNER siempre TOP, nadie lo supera
    const LEVELS = { OWNER: 100, ADMIN: 80, MOD: 50, USER: 10 };
    Ranks.LEVELS = LEVELS;

    // Correos con rango ADMIN (añade aquí los futuros admins)
    const ADMIN_EMAILS = [];
    Ranks.ADMIN_EMAILS = ADMIN_EMAILS;

    function norm(s) { return String(s || '').trim().toLowerCase(); }

    Ranks.isOwnerUsername = function (username) {
        return norm(username) === norm(OWNER.username);
    };

    Ranks.isOwnerEmail = function (email) {
        return norm(email) === norm(OWNER.email);
    };

    // Lee en vivo el valor de un campo OUTPUT por su id
    function fieldValue(id) {
        try {
            const SC = window.StevsconCreate;
            const f = SC && SC.output && SC.output.get ? SC.output.get(id) : null;
            return f && typeof f.getValue === 'function' ? f.getValue() : '';
        } catch (e) { return ''; }
    }

    // ¿El formulario está en MODO OWNER ahora mismo?
    // Basta con el username del Owner O su correo oficial.
    Ranks.ownerMode = function () {
        return Ranks.isOwnerUsername(fieldValue('username')) ||
               Ranks.isOwnerEmail(fieldValue('account'));
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