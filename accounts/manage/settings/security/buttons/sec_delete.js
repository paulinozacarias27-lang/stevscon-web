/**
 * STEVSCON.COM - accounts/manage/settings/security/buttons/sec_delete.js
 * LÓGICA: ELIMINAR CUENTA (v1)
 * Orden importa: 1) Storage  2) RTDB users/{uid}  3) user.delete()
 * (después de user.delete() perdemos el uid, por eso RTDB va primero).
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    function cleanStorage(uid) {
        if (typeof firebase === 'undefined' || !firebase.storage) return Promise.resolve();
        return firebase.storage().ref('users/' + uid).listAll().then(function (res) {
            const jobs = res.items.map(function (item) {
                return item.delete().catch(function () {});
            });
            return Promise.all(jobs);
        }).catch(function () { /* si tus imágenes viven en otra ruta, no rompe el borrado */ });
    }

    function farewell() {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:5000;background:#0d0b14;display:flex;' +
            'align-items:center;justify-content:center;padding:24px;box-sizing:border-box;font-family:Inter,sans-serif;';
        const box = document.createElement('div');
        box.style.cssText = 'text-align:center;max-width:420px;';
        const logo = document.createElement('p');
        logo.textContent = 'Stevscon.com';
        logo.style.cssText = 'margin:0 0 14px;font-size:20px;font-weight:800;color:#8b5cf6;letter-spacing:-.5px;';
        const t = document.createElement('p');
        t.textContent = 'Tu cuenta fue eliminada';
        t.style.cssText = 'margin:0 0 8px;font-size:17px;font-weight:800;color:#f8fafc;';
        const d = document.createElement('p');
        d.textContent = 'Gracias por haber sido parte. Puedes crear una cuenta nueva cuando quieras.';
        d.style.cssText = 'margin:0;font-size:13px;color:#94a3b8;line-height:1.6;';
        box.appendChild(logo); box.appendChild(t); box.appendChild(d);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    SCSET.api = SCSET.api || {};
    SCSET.api.security = SCSET.api.security || {};

    SCSET.api.security.deleteAccount = function (pwd) {
        const user = SCSET.user;
        if (!user) return Promise.reject({ cancelled: true });
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) {
            return Promise.reject(new Error('Firebase no disponible'));
        }
        return SCSET.api.security.ensureFresh(user, pwd).then(function () {
            return cleanStorage(user.uid);
        }).then(function () {
            return firebase.database().ref('users/' + user.uid).remove();
        }).then(function () {
            return user.delete();
        }).then(function () {
            farewell();
            console.log('[Stevscon Security] Cuenta eliminada por completo.');
        });
    };

    console.log('[Stevscon] sec_delete.js listo (borrado total activo).');
})(window);