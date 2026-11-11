/**
 * ====
 * STEVSCON.COM — forms/fonts.js (v1)
 * FONTS · la tipografía de Apostulaciones — la MISMA de Social y Wiki:
 * Inter (400-800) + Font Awesome 6.4.0.
 *  - Idempotente: detecta los <link> que ya existan y no duplica nada
 *    (forms.html ya los trae; este file es la red de seguridad para
 *    cualquier otra página donde lo cargues).
 *  - CERO dependencias: ni Firebase ni FM. Si falla, no rompe nada.
 * ====
 */
(function (window, document) {
    'use strict';

    if (window.__SCFMFONTS__) return;
    window.__SCFMFONTS__ = true;

    var HEAD = document.head || document.getElementsByTagName('head')[0];
    if (!HEAD) return;

    function has(fragment) {
        var all = HEAD.getElementsByTagName('link');
        for (var i = 0; i < all.length; i++) {
            if ((all[i].getAttribute('href') || '').indexOf(fragment) !== -1) return true;
        }
        return false;
    }
    function add(href, rel, cross) {
        var l = document.createElement('link');
        l.setAttribute('rel', rel || 'stylesheet');
        if (cross) l.setAttribute('crossorigin', 'anonymous');
        l.setAttribute('href', href);
        l.setAttribute('data-fm-fonts', '1');
        HEAD.appendChild(l);
    }

    function boot() {
        if (!has('fonts.googleapis.com')) add('https://fonts.googleapis.com', 'preconnect', true);
        if (!has('fonts.gstatic.com')) add('https://fonts.gstatic.com', 'preconnect', true);
        if (!has('family=Inter')) add('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        if (!has('font-awesome')) add('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        window.SCFMFONTS = { ready: true };
    }

    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
})(window, document);