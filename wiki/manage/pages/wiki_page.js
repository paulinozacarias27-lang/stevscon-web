/**
 * ====
 * STEVSCON.WIKI — wiki/manage/pages/wiki_page.js (v1)
 * CONTROLADOR de la página. Define el namespace StevsconWiki (WK),
 * hace el boot, rutea deep links y maneje Volver/Escape.
 *   #a/{slug|id} -> artículo    #c/{slug} -> categoría
 *   #s/{texto}   -> búsqueda    (sin hash) -> portada
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    WK.version = 1;
    WK.core = WK.core || null;
    WK.system = WK.system || null;

    WK.state = { view: 'home', arg: '', ready: false, booted: false };

    /* ---- Título de la pestaña (Stevscon.wiki) ---- */
    function setTitle(t) {
        document.title = t ? (t + ' — Stevscon.wiki') : 'Stevscon.wiki';
    }

    /* ---- Router ---- */
    function route() {
        const h = (location.hash || '').replace(/^#\/?/, '');
        let view = 'home', arg = '';
        if (h.indexOf('a/') === 0) { view = 'article'; arg = decodeURIComponent(h.slice(2)); }
        else if (h.indexOf('c/') === 0) { view = 'category'; arg = decodeURIComponent(h.slice(2)); }
        else if (h.indexOf('s/') === 0) { view = 'search'; arg = decodeURIComponent(h.slice(2)); }

        WK.state.view = view;
        WK.state.arg = arg;
        render();
    }

    function render() {
        const main = document.getElementById('wk-main');
        if (!main || !WK.core) return;
        main.textContent = '';

        try {
            if (WK.state.view === 'article') { WK.core.renderArticle(main, WK.state.arg); setTitle('Artículo'); }
            else if (WK.state.view === 'category') { WK.core.renderCategory(main, WK.state.arg); setTitle('Categoría'); }
            else if (WK.state.view === 'search') { WK.core.renderSearch(main, WK.state.arg); setTitle('Búsqueda'); }
            else { WK.core.renderHome(main); setTitle(''); }
        } catch (e) {
            console.error('[Wiki] render:', e);
            const p = document.createElement('p');
            p.style.cssText = 'color:var(--text-muted);font:600 14px Inter,sans-serif;padding:30px 0;text-align:center';
            p.textContent = 'Algo falló al dibujar esta vista. Revisa la consola.';
            main.appendChild(p);
        }

        /* Marcar chip activo en la barra de categorías */
        WK.core.paintCatNav(WK.state.view === 'category' ? WK.state.arg : '');

        if (!WK.state.ready) {
            WK.state.ready = true;
            document.dispatchEvent(new CustomEvent('sc:wiki-ready'));
        }
    }

    /* ---- Boot: el HTML le pasa el mando aquí ---- */
    WK.boot = function () {
        if (WK.state.booted) return;
        WK.state.booted = true;

        WK.core.start();
        WK.system.start();

        /* Re-render en vivo cuando llegan datos o cambia la sesión */
        let deb = null;
        document.addEventListener('sc:wiki-data', function () {
            if (!WK.state.ready) return;
            clearTimeout(deb);
            deb = setTimeout(render, 180);
        });
        document.addEventListener('sc:wiki-auth', function () {
            if (WK.state.ready) render();
        });

        /* Header: logo -> portada, buscador -> #s/, Volver -> index */
        const homeBtn = document.getElementById('wk-home-btn');
        if (homeBtn) homeBtn.addEventListener('click', function () { location.hash = ''; route(); });

        const search = document.getElementById('wk-search');
        if (search) {
            search.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter') return;
                const q = (search.value || '').trim();
                if (!q) { location.hash = ''; route(); return; }
                location.hash = '#s/' + encodeURIComponent(q);
                route();
                search.blur();
            });
        }

        const back = document.getElementById('wk-back-btn');
        if (back) back.addEventListener('click', function () { location.href = '/'; });

        /* Escape: vuelve a la portada de la wiki */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (WK.state.view !== 'home') { location.hash = ''; route(); }
        });

        window.addEventListener('hashchange', route);

        route();
        console.log('[Stevscon] wiki_page.js: wiki BOOTEADA (v1).');
    };

    WK.route = route;
    WK.render = render;
    WK.setTitle = setTitle;

    console.log('[Stevscon] wiki_page.js listo (v1) — controlador de la wiki.');
})(window, document);