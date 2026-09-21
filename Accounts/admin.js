/**
 * ==========================================================================
 * STEVSON.COM - ACCOUNTS MANAGER :: ADMIN (Moderación y staff)
 * --------------------------------------------------------------------------
 * - Jerarquía: OWNER > ADMIN > MOD > USER.
 * - Nadie puede actuar sobre el Owner ni sobre rangos superiores.
 * ==========================================================================
 */
(function (window) {
    'use strict';

    if (typeof window.AdminManager !== 'undefined') { return; }

    var AdminManager = {

        _mem: function () {
            return (typeof window.AccountsMemory !== 'undefined') ? window.AccountsMemory : null;
        },

        isAdmin: async function (uid) {
            var mem = this._mem();
            if (!mem) { return false; }
            var data = uid ? await mem.getUserById(uid) : mem.getCurrentData();
            if (!data) { return false; }
            return data.rank === 'ADMIN' || data.rank === 'MOD' || data.rank === 'OWNER';
        },

        isAdminRank: function () {
            var mem = this._mem();
            var rank = mem ? mem.getCurrentRank() : null;
            return rank === 'ADMIN' || rank === 'MOD' || rank === 'OWNER';
        },

        /* --------- Acción genérica de moderación con jerarquía --------- */
        _moderate: async function (targetUid, updates, actionName) {
            var mem = this._mem();
            if (!mem) { throw new Error('MEMORY_NOT_READY'); }

            var actorData = mem.getCurrentData();
            if (!actorData) { throw new Error('NOT_LOGGED'); }
            if (!this.isAdminRank()) { throw new Error('PERMISSION_DENIED'); }

            var target = await mem.getUserById(targetUid);
            if (!target) { throw new Error('USER_NOT_FOUND'); }
            if (!mem.canManage(actorData.rank, target.rank)) { throw new Error('PERMISSION_DENIED'); }

            updates.moderatedBy = actorData.uid;
            updates.moderatedAt = Date.now();
            await mem.refs().user(targetUid).update(updates);
            return actionName + ':OK';
        },

        suspendUser:   async function (uid) { return this._moderate(uid, { suspended: true },  'suspend'); },
        unsuspendUser: async function (uid) { return this._moderate(uid, { suspended: false }, 'unsuspend'); },
        banUser:       async function (uid) { return this._moderate(uid, { banned: true, suspended: true }, 'ban'); },
        unbanUser:     async function (uid) { return this._moderate(uid, { banned: false, suspended: false }, 'unban'); },
        verifyUser:    async function (uid) { return this._moderate(uid, { verified: true },  'verify'); },
        unverifyUser:  async function (uid) { return this._moderate(uid, { verified: false }, 'unverify'); },

        /* Solo ADMIN/OWNER pueden crear Moderadores */
        promoteToMod: async function (targetUid) {
            var mem = this._mem();
            var actor = mem.getCurrentData();
            if (!actor || (actor.rank !== 'ADMIN' && actor.rank !== 'OWNER')) { throw new Error('PERMISSION_DENIED'); }
            return mem.setRank(targetUid, 'MOD', actor);
        }
    };

    window.AdminManager = AdminManager;
    console.log('[Stevscon] admin.js listo.');

})(window);