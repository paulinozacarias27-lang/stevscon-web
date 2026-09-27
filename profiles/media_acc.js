/**
 * ====
 * STEVSCON.COM - profiles/media_acc.js
 * PERFILES · MEDIA: subida de imágenes en BASE64 (sin Firebase Storage).
 * - Reemplaza SCp.uploadImage (la de Storage) nada más cargar.
 * - Recorta y reduce la imagen EN TU NAVEGADOR con canvas.
 * - Guarda un texto "data:image/jpeg;base64,..." en users/{uid}/profile
 *   (Realtime Database), igual que la descripción o el género.
 * - AVATAR: 256x256 cuadrado · BANNER: 1200x480 horizontal.
 * Cargar DESPUÉS de account_conec.js y ANTES de category_prf.js.
 * No necesita Storage, ni tarjeta, ni reglas nuevas.
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.media = SCp.media || {};

    // Especificaciones por tipo: tamaño final y límites.
    const SPECS = {
        avatar: { w: 256, h: 256, maxInput: 8 * 1024 * 1024, maxOut: 150 * 1024 },
        banner: { w: 1200, h: 480, maxInput: 8 * 1024 * 1024, maxOut: 400 * 1024 }
    };

    /**
     * Dibuja la imagen recortada al centro (estilo "cover") en un canvas
     * y la exporta como JPEG base64. Baja la calidad sola si queda grande.
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
     * Resolve(url) · Reject({code:'tipo'|'grande'|'img'}) — mismos códigos
     * que ya entienden avatar.js y banner.js.
     */
    SCp.media.process = function (file, kind) {
        return new Promise(function (resolve, reject) {
            const spec = SPECS[kind] || SPECS.avatar;

            if (!file || !file.type || file.type.indexOf('image/') !== 0) {
                return reject({ code: 'tipo' });
            }
            if (file.size > spec.maxInput) {
                return reject({ code: 'grande' });
            }

            const reader = new FileReader();
            reader.onerror = function () { reject({ code: 'img' }); };
            reader.onload = function () {
                const img = new Image();
                img.onerror = function () { reject({ code: 'img' }); };
                img.onload = function () {
                    try { resolve(renderToDataUrl(img, spec)); }
                    catch (e) { reject({ code: 'img' }); }
                };
                img.src = String(reader.result);
            };
            reader.readAsDataURL(file);
        });
    };

    // ---- La subida oficial de Stevscon: base64 a Realtime Database ----
    // PISA la versión de Storage de account_conec.js porque este file
    // carga DESPUÉS. avatar.js y banner.js no necesitan ningún cambio.
    SCp.uploadImage = function (file, kind) {
        return SCp.media.process(file, kind === 'banner' ? 'banner' : 'avatar');
    };
})(window, document);