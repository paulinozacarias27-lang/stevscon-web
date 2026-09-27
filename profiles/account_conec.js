/**
 * ====
 * STEVSCON.COM - profiles/account_conec.js
 * PERFILES · Puente entre ACCOUNTS y PERFILES (capa de datos).
 * - Sigue la sesión de Firebase Auth y carga users/{uid}.
 * - Expone load(), saveField(), saveUsername(), uploadImage().
 * - TODO se guarda en Firebase (Realtime Database + Storage). Nada local.
 * Cargar DESPUÉS de utils/ y edit/, ANTES de category_prf.js.
 * ====
 */
(function (window) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};

    function fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }

    SCp.user = null;     // { uid, email, metadata }
    SCp.profile = null;  // datos combinados de users/{uid}

    const authCbs = [];
    const evtCbs = {};

    SCp.on = function (evt, cb) {
        (evtCbs[evt] = evtCbs[evt] || []).push(cb);
    };
    function emit(evt, data) {
        (evtCbs[evt] || []).forEach(function (cb) {
            try { cb(data); } catch (e) { /* un listener roto no tumba el resto */ }
        });
    }
    SCp.onAuth = function (cb) {
        authCbs.push(cb);
        if (SCp.user) cb(SCp.user);
    };

    SCp.load = function () {
        const F = fb();
        if (!F || !F.database || !SCp.user) return Promise.reject({ code: 'no-user' });
        return F.database.ref('users/' + SCp.user.uid).once('value').then(function (snap) {
            const root = snap.val() || {};
            const p = root.profile || {};
            SCp.profile = {
                username: root.username || '',
                handler: root.handler || '',
                userId: root.userId || '',
                rank: root.rank || 'USER',
                createdAt: root.createdAt || null,
                avatarPreset: p.avatarPreset || 'g1',
                avatarUrl: p.avatarUrl || '',
                bannerPreset: p.bannerPreset || 'b1',
                bannerUrl: p.bannerUrl || '',
                description: p.description || '',
                gender: p.gender || ''
            };
            emit('prf:profile', SCp.profile);
            return SCp.profile;
        });
    };

    SCp.saveField = function (key, value) {
        const F = fb();
        if (!F || !F.database || !SCp.user) return Promise.reject({ code: 'no-user' });
        return F.database.ref('users/' + SCp.user.uid + '/profile/' + key).set(value).then(function () {
            if (SCp.profile) SCp.profile[key] = value;
            emit('prf:changed', { key: key, value: value });
        });
    };

    SCp.saveUsername = function (name) {
        const F = fb();
        if (!F || !F.database || !SCp.user) return Promise.reject({ code: 'no-user' });
        return F.database.ref('users/' + SCp.user.uid + '/username').set(name).then(function () {
            if (SCp.profile) SCp.profile.username = name;
            emit('prf:username', { username: name });
            try {
                document.dispatchEvent(new CustomEvent('stevscon:username-changed', { detail: { username: name } }));
            } catch (e) { /* opcional */ }
        });
    };

    // Imagen desde tu PC → se reduce en el navegador → Firebase Storage.
    // Devuelve la URL pública de descarga.
    SCp.uploadImage = function (file, kind) {
        const F = fb();
        if (!F || !F.storage) return Promise.reject({ code: 'no-storage' });
        if (!SCp.user) return Promise.reject({ code: 'no-user' });
        const max = (kind === 'banner') ? { w: 1200, h: 480 } : { w: 320, h: 320 };
        return fileToResizedBlob(file, max.w, max.h).then(function (blob) {
            const ref = F.storage.ref().child(kind + 's/' + SCp.user.uid + '/' + kind + '.jpg');
            return ref.put(blob).then(function () { return ref.getDownloadURL(); });
        });
    };

    function fileToResizedBlob(file, maxW, maxH) {
        return new Promise(function (resolve, reject) {
            if (!file.type || file.type.indexOf('image/') !== 0) { reject({ code: 'tipo' }); return; }
            if (file.size > 8 * 1024 * 1024) { reject({ code: 'grande' }); return; }
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = function () {
                try {
                    let w = img.naturalWidth, h = img.naturalHeight;
                    const scale = Math.min(maxW / w, maxH / h, 1);
                    w = Math.max(1, Math.round(w * scale));
                    h = Math.max(1, Math.round(h * scale));
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    c.toBlob(function (blob) {
                        URL.revokeObjectURL(url);
                        if (blob) resolve(blob); else reject({ code: 'img' });
                    }, 'image/jpeg', 0.85);
                } catch (e) { URL.revokeObjectURL(url); reject({ code: 'img' }); }
            };
            img.onerror = function () { URL.revokeObjectURL(url); reject({ code: 'img' }); };
            img.src = url;
        });
    }

    // Sesión: un solo onAuthStateChanged para toda la categoría PERFILES
    let watching = false;
    function watch() {
        if (watching) return true;
        const F = fb();
        if (!F || !F.auth) return false;
        watching = true;
        F.auth.onAuthStateChanged(function (user) {
            if (user) {
                SCp.user = { uid: user.uid, email: user.email, metadata: user.metadata };
                authCbs.forEach(function (cb) { try { cb(SCp.user); } catch (e) {} });
                SCp.load().catch(function () { /* cuenta vieja sin perfil: no rompe */ });
            } else {
                SCp.user = null;
                SCp.profile = null;
                authCbs.forEach(function (cb) { try { cb(null); } catch (e) {} });
            }
        });
        return true;
    }
    (function boot(t) {
        if (watch()) return;
        if (t > 20) return;
        setTimeout(function () { boot(t + 1); }, 250);
    })(0);
})(window);