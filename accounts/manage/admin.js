/**
 * ============================================================
 * STEVSCON.COM - admin.js  ·  SISTEMA DE ADMIN
 * Depende de owner.js: SIEMPRE carga justo después de él.
 * El OWNER manda por encima de todo; los ADMIN van debajo.
 * Listo para el futuro panel de administración.
 * ============================================================
 */
(function (window) {
    'use strict';

    const R = window.StevsconRanks;
    if (!R) {
        console.error('[Stevscon Ranks] owner.js debe cargar ANTES que admin.js.');
        return;
    }

    R.Admin = {
        isAdmin: function (email) {
            return R.atLeast('ADMIN', email);
        },

        rankOfUser: function (uid) {
            const FB = window.StevsconFirebase;
            if (!FB || !FB.database) return Promise.resolve('USER');
            return FB.database.ref('users/' + uid + '/rank').once('value')
                .then(function (snap) { return snap.val() || 'USER'; })
                .catch(function () { return 'USER'; });
        },

        canCurrentUser: function (rank) {
            const FB = window.StevsconFirebase;
            const user = FB && FB.auth ? FB.auth.currentUser : null;
            if (!user || !user.email) return Promise.resolve(false);
            if (R.atLeast(rank, user.email)) return Promise.resolve(true);
            return R.Admin.rankOfUser(user.uid).then(function (saved) {
                return (R.LEVELS[saved] || 0) >= (R.LEVELS[rank] || 0);
            });
        }
    };
})(window);