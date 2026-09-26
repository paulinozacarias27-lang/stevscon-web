/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/output/mail.js
 * Correo de BIENVENIDA vía EmailJS.
 * Se dispara cuando alguien crea su cuenta (lo llama acc_create.js).
 *
 * PEGA AQUÍ TUS 3 LLAVES de emailjs.com. Mientras estén vacías,
 * la cuenta se crea igual y solo se salta el correo. Nadie ve
 * errores ni se rompe nada sin configuración.
 * ============================================================
 */
(function (window) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const CONFIG = {
        serviceId: 'stevscon_servicebot',   
        templateId: 'template_md8rdiq',
        publicKey: 'RYyF8BfVKEL2CwV4y'
    };

    let initialized = false;

    function initIfNeeded() {
        if (initialized || !window.emailjs || typeof window.emailjs.init !== 'function') return;
        try {
            window.emailjs.init(CONFIG.publicKey);
            initialized = true;
        } catch (e) {
            console.error('[Stevscon Mail] Error inicializando EmailJS:', e);
        }
    }

    function isConfigured() {
        return Boolean(CONFIG.serviceId && CONFIG.templateId && CONFIG.publicKey && window.emailjs);
    }

    /**
     * Envía la bienvenida. Recibe: { email, username, handler, userId }
     * Devuelve una promesa: { sent: true } o { sent: false, reason }
     * NUNCA lanza error: el registro de la cuenta no depende del correo.
     */
    function sendWelcome(user) {
        return new Promise(function (resolve) {
            if (!isConfigured()) {
                console.warn('[Stevscon Mail] EmailJS sin configurar: bienvenida omitida.');
                resolve({ sent: false, reason: 'not_configured' });
                return;
            }
            initIfNeeded();

            const params = {
                to_email: user.email,
                to_name: user.username,
                to_handler: '@' + user.handler,
                user_id: user.userId,
                brand: 'Stevscon'
            };

            window.emailjs.send(CONFIG.serviceId, CONFIG.templateId, params)
                .then(function () {
                    console.log('[Stevscon Mail] Bienvenida enviada a ' + params.to_name + '.');
                    resolve({ sent: true });
                })
                .catch(function (err) {
                    console.error('[Stevscon Mail] Error enviando bienvenida:', err);
                    resolve({ sent: false, reason: 'send_error' });
                });
        });
    }

    SC.mail = { sendWelcome, isConfigured };
})(window);