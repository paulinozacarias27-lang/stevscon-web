/**
 * ====
 * STEVSCON.COM — forms/category_forms.js (v1)
 * CATEGORY FORMS · la PUERTA de Apostulaciones (se carga desde el index).
 *
 *  - Garantiza el enlace "Apostulaciones aqui!" junto a los legales
 *    (Acerca de · Contacto · Privacidad · Términos) en el footer de
 *    cualquier página donde se cargue. Si el enlace ya existe (puesto
 *    a mano en el HTML, como en tu index), no toca nada — solo hace
 *    prefetch.
 *  - Prefetch de /forms/forms.html: entrar es instantáneo.
 *  - Enlace DIRECTO como los legales: cero capas, cero Firebase aquí.
 *  - CERO dependencias. Si no encuentra footer, se queda callado
 *    (nunca rompe la página que lo carga).
 * ====
 */
(function (window, document) {
    'use strict';

    if (window.__SCFORMSDOOR__) return;
    window.__SCFORMSDOOR__ = true;

    var URL = '/forms/forms.html';
    var LABEL = 'Apostulaciones aqui!';

    function prefetch() {
        try {
            if (document.querySelector('link[rel="prefetch"][href="' + URL + '"]')) return;
            var l = document.createElement('link');
            l.rel = 'prefetch';
            l.href = URL;
            (document.head || document.documentElement).appendChild(l);
        } catch (e) {}
    }

    function inject() {
        /* 1 · tu footer global por id (index: #site-footer) */
        var foot = document.getElementById('site-footer');
        /* 2 · fallback: el footer que tenga el enlace a Términos */
        if (!foot) {
            var legal = document.querySelectorAll('footer a[href*="services/terms"], footer a[href*="/terms"]');
            if (legal.length) foot = legal[legal.length - 1].parentNode;
        }
        if (!foot) return;   /* sin footer conocido: puerta callada */

        /* ya existe (a mano o doble carga) -> solo prefetch */
        if (foot.querySelector('a[href="' + URL + '"], a[href$="forms.html"]')) return prefetch();

        var a = document.createElement('a');
        a.href = URL;
        a.textContent = LABEL;
        foot.appendChild(a);
        prefetch();
    }

    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
})(window, document);