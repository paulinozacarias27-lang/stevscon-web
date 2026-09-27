/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/mail_reset.js
 * RESET · AVISO OFICIAL de Stevscon (EmailJS, template_p89fuyt).
 *
 * El {{reset_link}} del template apunta a reset_password.html con
 * el correo del usuario: al hacer clic se abre Stevscon con el
 * modal de recuperar ya abierto y el correo precargado.
 * El CAMBIO final de la contraseña lo hace el enlace seguro que
 * manda Firebase aparte. Si EmailJS falla, no pasa NADA.
 * ====
 */
(function (window) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};

    const SERVICE_ID = 'stevscon_servicebot';
    const TEMPLATE_ID = 'template_p89fuyt';
    const PUBLIC_KEY = 'RYyF8BFvKEL2CwV4y';

    // Página de la web donde aterrizan al hacer clic en el botón
    const RESET_PAGE = 'https://www.stevscon.com/reset_password.html';

    function buildResetLink(email) {
        if (!email) return RESET_PAGE;
        return RESET_PAGE + '?email=' + encodeURIComponent(email);
    }

    function sendNotice(data) {
        data = data || {};
        if (typeof window.emailjs === 'undefined') {
            console.warn('[Stevscon Reset] emailjs no está cargado; el aviso se omite.');
            return null;
        }
        try {
            const params = {
                to_email: data.email || '',
                email: data.email || '',
                handle: data.handle || '—',
                username: data.username || 'Stevsconero',
                reset_link: buildResetLink(data.email || '')
            };
            return window.emailjs.send(SERVICE_ID, TEMPLATE_ID, params, { publicKey: PUBLIC_KEY })
                .then(function () {
                    console.log('[Stevscon Reset] Aviso oficial enviado a:', params.to_email);
                })
                .catch(function (e) {
                    console.warn('[Stevscon Reset] El aviso falló (el enlace de Firebase SÍ se envió):', e);
                });
        } catch (e) {
            console.warn('[Stevscon Reset] El aviso por correo falló:', e);
            return null;
        }
    }

    SC.reset.mail = { sendNotice: sendNotice, buildResetLink: buildResetLink };
})(window);