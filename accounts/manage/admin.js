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
        // ¿Este correo tiene permisos de administración? (ADMIN u OWNER)
        isAdmin: function (email) {
            return R.atLeast('ADMIN', email);
        },

        // Rango guardado de un usuario en users/{uid}/rank
        rankOfUser: function (uid) {
            const FB = window.StevsconFirebase;
            if (!FB || !FB.database) return Promise.resolve('USER');
            return FB.database.ref('users/' + uid + '/rank').once('value')
                .then(function (snap) { return snap.val() || 'USER'; })
                .catch(function () { return 'USER'; });
        },

        // ¿El usuario ACTUALMENTE logueado puede hacer X?
        // El Owner pasa siempre por su correo; los demás, por su
        // rank guardado en el perfil de la base de datos.
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