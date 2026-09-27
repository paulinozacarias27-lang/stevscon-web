/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/mail_reset.js
 * RESET · AVISO por correo (EmailJS) cuando alguien pide recuperar.
 *
 * IMPORTANTE: el LINK real de reset lo manda Firebase
 * (sendPasswordResetEmail). Ese enlace lleva un código seguro que
 * EmailJS NO puede generar. Este correo es solo un aviso decorativo
 * y NUNCA bloquea el proceso: si falla, no pasa nada.
 * ====
 */
(function (window) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};

    const SERVICE_ID = 'stevscon_servicebot';
    const TEMPLATE_ID = 'template_p89fuyt';
    const PUBLIC_KEY = 'RYyF8BFvKEL2CwV4y';

    function sendNotice(data) {
        data = data || {};
        if (typeof window.emailjs === 'undefined') {
            console.warn('[Stevscon Reset] emailjs no está cargado; el aviso se omite.');
            return null;
        }
        try {
            // Si tu template usa otros nombres de variables, cámbialos aquí.
            const params = {
                to_email: data.email || '',
                email: data.email || '',
                username: data.username || 'Stevsconero',
                title: 'Recuperación de contraseña',
                message: 'Alguien pidió recuperar tu cuenta en Stevscon. Te acabamos de enviar un correo aparte (de Firebase) con el enlace para crear una contraseña nueva. Si no fuiste tú, ignora este aviso.'
            };
            return window.emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY })
                .catch(function (e) {
                    console.warn('[Stevscon Reset] El aviso por correo falló (el enlace de Firebase SÍ se envió):', e);
                });
        } catch (e) {
            console.warn('[Stevscon Reset] El aviso por correo falló:', e);
            return null;
        }
    }

    SC.reset.mail = { sendNotice: sendNotice };
})(window);