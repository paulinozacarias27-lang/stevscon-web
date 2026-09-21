/**
 * ==========================================================================
 * STEVSON.COM - ACCOUNTS MANAGER :: OWNER (Máxima autoridad)
 * --------------------------------------------------------------------------
 * - El rango OWNER está siempre en TOP y pertenece a UNA sola cuenta.
 * - Se identifica por CORREO, nunca por contraseña en el código.
 * - La contraseña solo existe en Firebase Auth (se escribe al registrarse).
 * ==========================================================================
 */
(function (window) {
    'use strict';

    if (typeof window.OwnerManager !== 'undefined') { return; }

    /* ---- Identidad protegida del Owner (pública a propósito) ---- */
    var OWNER_EMAIL  = 'steven23hd@gmail.com';
    var OWNER_HANDLE = 'StevsLoL';
    var OWNER_EMAIL_LOWER = OWNER_EMAIL.toLowerCase();
    var OWNER_HANDLE_LOWER = OWNER_HANDLE.toLowerCase();

    var OwnerManager = {
        OWNER_EMAIL: OWNER_EMAIL,
        OWNER_HANDLE: OWNER_HANDLE,

        isOwnerEmail: function (email) {
            return String(email || '').trim().toLowerCase() === OWNER_EMAIL_LOWER;
        },

        /* ¿Este uid corresponde al Owner? */
        isOwner: async function (uid) {
            if (!uid || typeof window.AccountsMemory === 'undefined') { return false; }
            var data = await window.AccountsMemory.getUserById(uid);
            if (!data) { return false; }
            return data.emailLower === OWNER_EMAIL_LOWER || data.rank === 'OWNER';
        },

        /* Se ejecuta en cada login/registro (llamado por memory_acc.js):
           si el correo es el del Owner, FUERZA rango OWNER y datos correctos. */
        ensureOwnerRecord: async function (authUser) {
            var mem = window.AccountsMemory;
            var r = mem.refs();
            if (!r || !authUser || !this.isOwnerEmail(authUser.email)) { return false; }

            var record = await mem.ensureUserRecord(authUser, {
                handle: OWNER_HANDLE,
                displayName: OWNER_HANDLE
            });

            var updates = {};
            if (!record || record.rank !== 'OWNER')     { updates.rank = 'OWNER'; }
            if (!record || record.verified !== true)    { updates.verified = true; }
            if (!record || record.banned)               { updates.banned = false; }
            if (!record || record.suspended)            { updates.suspended = false; }
            if (record && record.handleLower !== OWNER_HANDLE_LOWER) { updates.handle = OWNER_HANDLE; updates.handleLower = OWNER_HANDLE_LOWER; }

            if (Object.keys(updates).length > 0) {
                await r.user(authUser.uid).update(updates);
                r.admins.child(authUser.uid).remove(); // El Owner no es staff: está por encima
            }
            return true;
        },

        /* Re-autenticación para acciones críticas: el Owner ESCRIBE su
           contraseña en el momento (nunca se guarda en BD ni localStorage). */
        confirmIdentity: async function (password) {
            var auth = window.StevsconFirebase && window.StevsconFirebase.auth
                ? window.StevsconFirebase.auth : null;
            if (!auth || !auth.currentUser) { throw new Error('NOT_LOGGED'); }
            var cred = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, String(password || ''));
            await auth.currentUser.reauthenticateWithCredential(cred);
            return true;
        },

        /* ---------------- Poderes exclusivos del Owner ---------------- */
        setUserRank: async function (targetUid, rank) {
            var mem = window.AccountsMemory;
            if (!await this.isOwner(mem.getCurrentUser().uid)) { throw new Error('ONLY_OWNER'); }
            return mem.setRank(targetUid, rank, { rank: 'OWNER' });
        },

        promoteAdmin: async function (targetUid) { return this.setUserRank(targetUid, 'ADMIN'); },
        demoteToUser: async function (targetUid) { return this.setUserRank(targetUid, 'USER'); },

        listStaff: async function () {
            var r = window.AccountsMemory.refs();
            var snap = await r.admins.once('value');
            var out = [];
            snap.forEach(function (c) { out.push(c.key); });
            return out;
        }
    };

    /* Registrar identidad protegida en la memoria global */
    if (typeof window.AccountsMemory !== 'undefined') {
        window.AccountsMemory._reservedHandles.push(OWNER_HANDLE_LOWER);
        window.AccountsMemory._protectedEmails.push(OWNER_EMAIL_LOWER);
    }

    window.OwnerManager = OwnerManager;
    console.log('[Stevscon] owner.js listo. Cuenta TOP protegida:', OWNER_EMAIL);

})(window);