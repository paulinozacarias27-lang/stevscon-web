/**
 * ====
 * STEVSCON.COM - profiles/manage/switch_acc/store.js
 * SWITCH · Almacén LOCAL de cuentas guardadas (estilo Discord).
 * - Guarda email + contraseña OFUSCADA solo en este dispositivo (localStorage).
 * - NO crea NADA en Firebase: cero cambios en tus reglas.
 * - Límite de cuentas por rango: USER 5 · MOD 10 · ADMIN 15 · OWNER 20.
 * Cargar PRIMERO de este grupo (switch.js y panel.js lo usan).
 * ====
 */
(function (window) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.switchAcc = SCp.switchAcc || {};

    const KEY = 'stevscon.swacc.v1';
    const XK = 0x5A;

    // ---- Ofuscación local (NO es criptografía: nunca sale del dispositivo) ----
    function xor(str) {
        let out = '';
        for (let i = 0; i < str.length; i++) {
            out += String.fromCharCode(str.charCodeAt(i) ^ XK ^ (i % 7));
        }
        return out;
    }
    function obfuscate(pass) {
        try { return btoa(unescape(encodeURIComponent(xor(String(pass))))); } catch (e) { return ''; }
    }
    function reveal(token) {
        try { return xor(decodeURIComponent(escape(atob(String(token))))); } catch (e) { return ''; }
    }

    function read() {
        try {
            const arr = JSON.parse(window.localStorage.getItem(KEY) || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }
    function write(list) {
        try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* modo privado */ }
    }

    // ---- API para switch.js y panel.js ----
    SCp.switchAcc.list = read;

    SCp.switchAcc.find = function (uid) {
        const l = read();
        for (let i = 0; i < l.length; i++) if (l[i].uid === uid) return l[i];
        return null;
    };

    // Guarda o actualiza (por uid); la más reciente queda arriba.
    SCp.switchAcc.upsert = function (entry) {
        const rest = read().filter(function (a) { return a.uid !== entry.uid; });
        const e = Object.assign({}, entry, { pass: obfuscate(entry.pass) });
        rest.unshift(e);
        write(rest);
        return e;
    };

    SCp.switchAcc.remove = function (uid) {
        write(read().filter(function (a) { return a.uid !== uid; }));
    };

    // Devuelve la contraseña en claro SOLO para el login (nunca se muestra).
    SCp.switchAcc.decode = function (entry) {
        return entry ? reveal(entry.pass) : '';
    };

    // ---- Límite de cuentas según el rango de la cuenta ACTUAL ----
    SCp.switchAcc.limitFor = function () {
        const R = window.StevsconRanks;
        const F = window.StevsconFirebase;
        const u = F && F.auth ? F.auth.currentUser : null;
        if (u && R && typeof R.isOwnerEmail === 'function' && R.isOwnerEmail(u.email)) return 20;
        const rank = (SCp.profile && SCp.profile.rank) || 'USER';
        if (rank === 'OWNER') return 20;
        if (rank === 'ADMIN') return 15;
        if (rank === 'MOD') return 10;
        return 5;
    };
})(window);