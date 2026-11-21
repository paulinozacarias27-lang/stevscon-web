/**
 * ====
 * STEVSCON.COM - profiles/media_acc.js
 * MEDIA · Subida de imágenes en BASE64 (sin Firebase Storage). · v2
 * - Soporta GIF ANIMADOS en avatares y banners: viajan INTACTOS como
 *   data:image/gif (el canvas solo capturaria el primer fotograma).
 * - JPG/PNG/WEBP: canvas + recorte centrado + JPEG base64, como siempre.
 * - PUENTE COMPARTIDO: un solo cerebro para las DOS categorias.
 *     · Profiles:  SCp.media / SCp.uploadImage  (avatar.js y banner.js igual)
 *     · Accounts:  SC.media  / SC.uploadImage
 *     · Neutro:    window.StevsconMedia
 * - applyAvatar(): pinta el avatar (GIF, imagen, preset o letra) en
 *   cualquier elemento; lo usan Accounts y Profiles.
 * - AVATAR: 256x256 · BANNER: 1200x480.
 * Cargar DESPUES de account_conec.js. No necesita Storage ni reglas nuevas.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const SPECS = {
        avatar: { w: 256, h: 256, maxInput: 8 * 1024 * 1024, maxOut: 150 * 1024, gifMax: 1 * 1024 * 1024 },
        banner: { w: 1200, h: 480, maxInput: 8 * 1024 * 1024, maxOut: 400 * 1024, gifMax: 2 * 1024 * 1024 }
    };

    function isGif(file) {
        return !!(file && file.type && String(file.type).toLowerCase() === 'image/gif');
    }

    function renderToDataUrl(img, spec) {
        const canvas = document.createElement('canvas');
        canvas.width = spec.w;
        canvas.height = spec.h;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#120e1c';
        ctx.fillRect(0, 0, spec.w, spec.h);

        const scale = Math.max(spec.w / img.width, spec.h / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const x = Math.round((spec.w - w) / 2);
        const y = Math.round((spec.h - h) / 2);
        ctx.drawImage(img, x, y, w, h);

        let q = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        while (dataUrl.length > spec.maxOut && q > 0.4) {
            q -= 0.15;
            dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        return dataUrl;
    }

    function process(file, kind) {
        return new Promise(function (resolve, reject) {
            const spec = SPECS[kind] || SPECS.avatar;

            if (!file || !file.type || String(file.type).indexOf('image/') !== 0) {
                return reject({ code: 'tipo' });
            }

            const limit = isGif(file) ? spec.gifMax : spec.maxInput;
            if (file.size > limit) {
                return reject({ code: 'grande' });
            }

            const reader = new FileReader();
            reader.onerror = function () { reject({ code: 'img' }); };
            reader.onload = function () {
                const dataUrl = String(reader.result);

                if (isGif(file)) {
                    const probe = new Image();
                    probe.onerror = function () { reject({ code: 'img' }); };
                    probe.onload = function () { resolve(dataUrl); };
                    probe.src = dataUrl;
                    return;
                }

                const img = new Image();
                img.onerror = function () { reject({ code: 'img' }); };
                img.onload = function () {
                    try { resolve(renderToDataUrl(img, spec)); }
                    catch (e) { reject({ code: 'img' }); }
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });
    }

    function applyAvatar(placeholderEl, profile, userRow) {
        if (!placeholderEl || !placeholderEl.parentNode) return null;

        const letter = String((userRow && userRow.username) || (profile && profile.username) || 'S').charAt(0).toUpperCase();
        const url = profile && (profile.avatarUrl || profile.avatarURL);

        if (url) {
            const img = document.createElement('img');
            img.src = String(url);
            img.alt = 'Tu avatar';
            img.referrerPolicy = 'no-referrer';
            img.className = placeholderEl.className;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:center;border-radius:inherit;display:block;';
            img.onerror = function () {
                if (img.parentNode) img.parentNode.replaceChild(placeholderEl, img);
                placeholderEl.textContent = letter;
            };
            placeholderEl.parentNode.replaceChild(img, placeholderEl);
            return img;
        }

        if (profile && profile.avatarPreset && SCp.presets && SCp.presets.avatar) {
            for (let i = 0; i < SCp.presets.avatar.length; i++) {
                if (SCp.presets.avatar[i].id === profile.avatarPreset) {
                    placeholderEl.style.background = SCp.presets.avatar[i].css;
                    break;
                }
            }
        }
        placeholderEl.textContent = letter;
        return null;
    }

    function uploadImage(file, kind) {
        return process(file, kind === 'banner' ? 'banner' : 'avatar');
    }

    const API = {
        version: 2,
        SPECS: SPECS,
        isGif: isGif,
        process: process,
        applyAvatar: applyAvatar,
        uploadImage: uploadImage
    };

    window.StevsconMedia = API;
    SCp.media = API;
    SC.media = API;
    SCp.uploadImage = uploadImage;
    SC.uploadImage = uploadImage;

    console.log('[Stevscon] media_acc.js listo (v2 · GIFs + puente Accounts/Profiles).');
})(window, document);