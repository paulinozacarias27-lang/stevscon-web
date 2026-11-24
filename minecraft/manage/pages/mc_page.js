/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/pages/mc_page.js (v1)
 * CONTROLADOR de la página. Define el namespace StevsconMC (MC),
 * hace el boot, rutea deep links y maneja Volver/Escape.
 *   #p/{slug|id}          -> página      #c/{slug} -> categoría
 *   #c/{catSlug}/{subSlug}-> sub-categoría
 *   #s/{texto}            -> búsqueda    #admin -> consola de staff
 *   (sin hash)            -> portada
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    MC.version = 1;
    MC.core = MC.core || null;
    MC.system = MC.system || null;

    MC.state = { view: 'home', arg: '', sub: '', ready: false, booted: false };

    function setTitle(t) {
        document.title = t ? (t + ' — StevsMCross') : 'StevsMCross';
    }

    function route() {
        const h = (location.hash || '').replace(/^#\/?/, '');
        let view = 'home', arg = '', sub = '';
        if (h.indexOf('p/') === 0) { view = 'page'; arg = decodeURIComponent(h.slice(2)); }
        else if (h.indexOf('c/') === 0) {
            const parts = decodeURIComponent(h.slice(2)).split('/');
            view = 'category';
            arg = parts[0] || '';
            sub = parts[1] || '';
        }
        else if (h.indexOf('s/') === 0) { view = 'search'; arg = decodeURIComponent(h.slice(2)); }
        else if (h === 'admin') { view = 'admin'; }

        MC.state.view = view;
        MC.state.arg = arg;
        MC.state.sub = sub;
        render();
    }

    function render() {
        const main = document.getElementById('mc-main');
        if (!main || !MC.core) return;
        main.textContent = '';

        try {
            if (MC.state.view === 'page') { MC.core.renderPage(main, MC.state.arg); setTitle('Página'); }
            else if (MC.state.view === 'category') {
                if (MC.state.sub) MC.core.renderCategory(main, MC.state.arg, MC.state.sub);
                else MC.core.renderCategory(main, MC.state.arg);
                setTitle('Categoría');
            }
            else if (MC.state.view === 'search') { MC.core.renderSearch(main, MC.state.arg); setTitle('Búsqueda'); }
            else if (MC.state.view === 'admin') {
                const staff = !!(MC.core && typeof MC.core.staffView === 'function' && MC.core.staffView());
                if (staff && MC.manage && typeof MC.manage.renderAdmin === 'function') {
                    MC.manage.renderAdmin(main);
                    setTitle('Admin');
                } else {
                    if (MC.toast) MC.toast('Zona solo para staff.', 'error');
                    location.hash = '';
                    MC.state.view = 'home';
                    MC.state.arg = '';
                    MC.state.sub = '';
                    MC.core.renderHome(main);
                    setTitle('');
                }
            }
            else { MC.core.renderHome(main); setTitle(''); }
        } catch (e) {
            console.error('[StevsMCross] render:', e);
            const p = document.createElement('p');
            p.style.cssText = 'color:var(--text-muted);font:600 14px Inter,sans-serif;padding:30px 0;text-align:center';
            p.textContent = 'Algo falló al dibujar esta vista. Revisa la consola.';
            main.appendChild(p);
        }

        MC.core.paintCatNav(MC.state.view === 'category' ? MC.state.arg : '');

        if (!MC.state.ready) {
            MC.state.ready = true;
            document.dispatchEvent(new CustomEvent('sc:mc-ready'));
        }
    }

    MC.boot = function () {
        if (MC.state.booted) return;
        MC.state.booted = true;

        MC.core.start();
        MC.system.start();

        let deb = null;
        document.addEventListener('sc:mc-data', function () {
            if (!MC.state.ready) return;
            clearTimeout(deb);
            deb = setTimeout(render, 180);
        });
        document.addEventListener('sc:mc-auth', function () {
            if (MC.state.ready) render();
        });

        const homeBtn = document.getElementById('mc-home-btn');
        if (homeBtn) homeBtn.addEventListener('click', function () { location.hash = ''; route(); });

        const search = document.getElementById('mc-search');
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

        const back = document.getElementById('mc-back-btn');
        if (back) back.addEventListener('click', function () { location.href = '/'; });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (MC.state.view !== 'home') { location.hash = ''; route(); }
        });

        window.addEventListener('hashchange', route);

        route();
        console.log('[Stevscon] mc_page.js: StevsMCross BOOTEADA (v1).');
    };

    MC.route = route;
    MC.render = render;
    MC.setTitle = setTitle;

    console.log('[Stevscon] mc_page.js listo (v1) — controlador de StevsMCross.');
})(window, document);
