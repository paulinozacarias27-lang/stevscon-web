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

    // Especificaciones por tipo. gifMax limita el GIF ORIGINAL (viaja sin
    // re-encode para conservar la animacion; el base64 lo infla ~33%).
    const SPECS = {
        avatar: { w: 256, h: 256, maxInput: 8 * 1024 * 1024, maxOut: 150 * 1024, gifMax: 1 * 1024 * 1024 },
        banner: { w: 1200, h: 480, maxInput: 8 * 1024 * 1024, maxOut: 400 * 1024, gifMax: 2 * 1024 * 1024 }
    };

    function isGif(file) {
        return !!(file && file.type && String(file.type).toLowerCase() === 'image/gif');
    }

    /**
     * JPG/PNG/WEBP: dibuja la imagen recortada al centro (estilo "cover") en
     * un canvas y la exporta como JPEG base64. Baja la calidad sola si queda
     * grande.
     */
    function renderToDataUrl(img, spec) {
        const canvas = document.createElement('canvas');
        canvas.width = spec.w;
        canvas.height = spec.h;
        const ctx = canvas.getContext('2d');

        // Fondo morado oscuro: evita fondos negros con PNG transparentes.
        ctx.fillStyle = '#120e1c';
        ctx.fillRect(0, 0, spec.w, spec.h);

        // Recorte centrado: la imagen cubre TODO el lienzo sin deformarse.
        const scale = Math.max(spec.w / img.width, spec.h / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const x = Math.round((spec.w - w) / 2);
        const y = Math.round((spec.h - h) / 2);
        ctx.drawImage(img, x, y, w, h);

        // Calidad adaptativa: empieza alta y baja hasta caber en maxOut.
        let q = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        while (dataUrl.length > spec.maxOut && q > 0.4) {
            q -= 0.15;
            dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        return dataUrl;
    }

    /**
     * Convierte un File en dataURL base64 listo para guardar.
     * Resolve(url) · Reject({code:'tipo'|'grande'|'img'}) — los MISMOS
     * codigos de siempre, asi avatar.js y banner.js NO se tocan.
     */
    function process(file, kind) {
        return new Promise(function (resolve, reject) {
            const spec = SPECS[kind] || SPECS.avatar;

            if (!file || !file.type || String(file.type).indexOf('image/') !== 0) {
                return reject({ code: 'tipo' });
            }

            // GIF: su propio limite (viaja intacto, no se re-encodea).
            const limit = isGif(file) ? spec.gifMax : spec.maxInput;
            if (file.size > limit) {
                return reject({ code: 'grande' });
            }

            const reader = new FileReader();
            reader.onerror = function () { reject({ code: 'img' }); };
            reader.onload = function () {
                const dataUrl = String(reader.result);

                // GIF: NUNCA pasa por el canvas (perderia la animacion).
                // Solo validamos que sea un GIF real y viaja tal cual.
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

    /**
     * Pintar avatar COMPARTIDO (Accounts + Profiles).
     * Reemplaza el placeholder por un <img> si hay avatarUrl (GIF animado
     * incluido), aplica el preset guardado si existe, o deja la letra de
     * respaldo. Devuelve el <img> creado o null.
     */
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

    // ---- PUENTE: el MISMO cerebro para las dos categorias ----
    const API = {
        version: 2,
        SPECS: SPECS,
        isGif: isGif,
        process: process,
        applyAvatar: applyAvatar,
        uploadImage: uploadImage
    };

    window.StevsconMedia = API;     // neutro, para files futuros
    SCp.media = API;                // Profiles: SCp.media.process / applyAvatar
    SC.media = API;                 // Accounts: SC.media.process / applyAvatar
    SCp.uploadImage = uploadImage;  // avatar.js y banner.js (Profiles) siguen igual
    SC.uploadImage = uploadImage;   // alias nuevo para files de Accounts

    console.log('[Stevscon] media_acc.js listo (v2 · GIFs + puente Accounts/Profiles).');
})(window, document);