/**
 * STEVSCON.COM - accounts/manage/settings/buttons/set_data.js
 * LÓGICA: DATOS Y SESIÓN (v1) · exportar JSON + cerrar sesión
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    function db() {
        if (typeof firebase !== 'undefined' && firebase.database) return firebase.database();
        return null;
    }

    SCSET.api = SCSET.api || {};
    SCSET.api.data = {
        export: function () {
            const user = SCSET.user;
            if (!user || !db()) return;
            db().ref('users/' + user.uid).once('value').then(function (snap) {
                const data = {
                    exported: new Date().toISOString(),
                    auth: {
                        uid: user.uid,
                        email: user.email || null,
                        created: user.metadata ? user.metadata.creationTime : null
                    },
                    profile: snap.val() || {}
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'stevscon-mis-datos.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 800);
                SCSET.toast('Datos descargados');
            }).catch(function (err) {
                console.error('[Stevscon Settings] Error exportando:', err);
                SCSET.toast('No se pudieron exportar los datos.');
            });
        },
        logout: function () {
            if (typeof firebase === 'undefined' || !firebase.auth) return;
            SCSET.close();
            firebase.auth().signOut().catch(function (err) {
                console.error('[Stevscon Settings] Error cerrando sesión:', err);
            });
        }
    };

    console.log('[Stevscon] set_data.js listo (botones registrados).');
})(window);