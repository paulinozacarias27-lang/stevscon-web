/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/mail_reset.js
 * RESET · AVISO bonito por correo (EmailJS) cuando alguien pide recuperar.
 * El LINK oficial lo manda Firebase; este es solo el aviso de Stevscon.
 * NUNCA bloquea el proceso, pero ahora AVISA cuando falla (antes fallaba
 * en silencio y por eso nunca te llegó).
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};

    // ⚠️ Copia estas 3 llaves EXACTAS desde EmailJS. Una letra mal y falla.
    const CONFIG = {
        serviceId: 'stevscon_servicebot',
        templateId: 'template_p89fuyt',
        publicKey: 'RYyF8BFvKEL2CwV4y'
    };

    function init() {
        if (typeof window.emailjs === 'undefined' || typeof window.emailjs.send !== 'function') return false;
        try { window.emailjs.init({ publicKey: CONFIG.publicKey }); }
        catch (e) { try { window.emailjs.init(CONFIG.publicKey); } catch (e2) {} }
        return true;
    }

    function sendNotice(params) {
        params = params || {};
        return new Promise(function (resolve) {
            if (!init()) {
                console.error('[Stevscon Reset Mail] EmailJS no está cargado (¿falta el CDN email.min.js en el index?). El aviso bonito NO se envió.');
                resolve({ ok: false, reason: 'sdk-no-cargado' });
                return;
            }
            const templateParams = {
                to_email: params.email || '',
                handle: params.handle || '—',
                reset_link: 'https://stevscon.com/reset_password.html' + (params.email ? '?email=' + encodeURIComponent(params.email) : '')
            };
            window.emailjs.send(CONFIG.serviceId, CONFIG.templateId, templateParams)
                .then(function () {
                    console.log('[Stevscon Reset Mail] Aviso bonito enviado a ' + templateParams.to_email);
                    resolve({ ok: true });
                })
                .catch(function (err) {
                    console.error('[Stevscon Reset Mail] EmailJS RECHAZÓ el envío:', err);
                    resolve({ ok: false, reason: (err && (err.text || err.status || err.message)) || 'desconocido' });
                });
        });
    }

    SC.reset.mail = { sendNotice: sendNotice };
    console.log('[Stevscon] mail_reset.js listo.');
})(window, document);