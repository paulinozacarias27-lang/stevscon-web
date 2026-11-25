/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/pages/mc_categorys.js (v2)
 * CATEGORÍAS: barra de navegación superior estilo Fandom.
 *  - Pestaña fija PAGOS (#pagos) justo después de Inicio, junto a Tienda.
 *  - Categorías principales como pestañas (mayúsculas + subrayado activo).
 *  - Cada categoría abre un panel desplegable con 2 columnas:
 *      · SECCIONES -> sus sub-categorías (mc_sub_categorys.js)
 *      · PÁGINAS   -> las últimas páginas de esa categoría
 *  - A la derecha, contador global "N PÁGINAS".
 *  - Al final de la barra, solo para staff, la pestaña ADMIN (#admin).
 *  - Override seguro de MC.core.paintCatNav: mc_page.js y mc_core.js
 *    NO se tocan. Solo LECTURA + pintado.
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function fmtNum(n) { return Number(n || 0).toLocaleString('es'); }

    const state = { openFor: null, hoverTimer: null };
    const HOVER = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);

    function go(hash) { location.hash = hash; MC.route(); }

    MC.catsNav = {
        started: false,

        start: function () {
            if (this.started || !MC.core) return;
            this.started = true;
            const self = this;

            MC.core.paintCatNav = function (activeSlug) { self.paint(activeSlug); };

            document.addEventListener('click', function (e) {
                if (!state.openFor) return;
                const nav = document.getElementById('mc-catnav');
                if (nav && !nav.contains(e.target)) self.close();
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') self.close();
            });
        },

        close: function () {
            const nav = document.getElementById('mc-catnav');
            if (nav) {
                const btn = nav.querySelector('.mcc-item.is-open');
                if (btn) { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
                const drop = nav.querySelector('.mcc-drop');
                if (drop && drop.parentNode) drop.parentNode.removeChild(drop);
            }
            state.openFor = null;
        },

        paint: function (activeSlug) {
            const nav = document.getElementById('mc-catnav');
            if (!nav || !MC.core) return;
            const self = this;
            nav.textContent = '';

            const parts = String(activeSlug || '').split('/');
            const actCat = (parts[0] || '').toLowerCase();
            const actSub = (parts[1] || '').toLowerCase();
            const subsMod = MC.subcats || null;

            const bar = el('div', 'mcc-bar');

            const home = el('button', 'mcc-item' + (!actCat ? ' is-active' : ''));
            home.type = 'button';
            home.appendChild(icon('fa-house'));
            home.appendChild(el('span', null, 'Inicio'));
            home.addEventListener('click', function () { self.close(); go(''); });
            bar.appendChild(home);

            const pagos = el('button', 'mcc-item' + (actCat === 'pagos' ? ' is-active' : ''));
            pagos.type = 'button';
            pagos.appendChild(icon('fa-hand-holding-dollar'));
            pagos.appendChild(el('span', null, 'Pagos'));
            pagos.addEventListener('click', function () { self.close(); go('#pagos'); });
            bar.appendChild(pagos);

            MC.core.sortedCats().forEach(function (c) {
                const subsOf = subsMod ? subsMod.byParent(c.id) : [];
                const isActive = actCat === String(c.slug).toLowerCase() ||
                    (!!actSub && subsOf.some(function (s) {
                        return s.catId === c.id && String(s.slug).toLowerCase() === actSub;
                    }));

                const wrap = el('div', 'mcc-wrap');
                const btn = el('button', 'mcc-item' + (isActive ? ' is-active' : ''));
                btn.type = 'button';
                btn.setAttribute('aria-expanded', 'false');
                if (c.icon) btn.appendChild(el('span', 'mcc-ico', c.icon));
                btn.appendChild(el('span', 'mcc-label', c.name));
                const caret = icon('fa-chevron-down');
                caret.classList.add('mcc-caret');
                btn.appendChild(caret);

                const open = function () {
                    if (state.openFor === c.id) { self.close(); return; }
                    self.close();
                    state.openFor = c.id;
                    btn.classList.add('is-open');
                    btn.setAttribute('aria-expanded', 'true');
                    wrap.appendChild(self.buildDrop(c, subsOf));
                };
                btn.addEventListener('click', open);
                if (HOVER) {
                    wrap.addEventListener('mouseenter', function () {
                        clearTimeout(state.hoverTimer);
                        if (state.openFor === c.id) return;
                        open();
                    });
                    wrap.addEventListener('mouseleave', function () {
                        state.hoverTimer = setTimeout(function () {
                            if (state.openFor === c.id) self.close();
                        }, 220);
                    });
                }

                wrap.appendChild(btn);
                bar.appendChild(wrap);
            });

            const total = MC.core.pages || MC.core.published().length;
            bar.appendChild(el('span', 'mcc-count', fmtNum(total) + ' PÁGINAS'));

            if (MC.core.staffView()) {
                const isAdmin = !!(MC.state && MC.state.view === 'admin');
                const adm = el('button', 'mcc-item' + (isAdmin ? ' is-active' : ''));
                adm.type = 'button';
                adm.appendChild(icon('fa-screwdriver-wrench'));
                adm.appendChild(el('span', null, 'Admin'));
                adm.addEventListener('click', function () { self.close(); go('#admin'); });
                bar.appendChild(adm);
            }

            nav.appendChild(bar);
        },

        buildDrop: function (c, subsOf) {
            const self = this;
            const drop = el('div', 'mcc-drop');

            const head = el('button', 'mcc-viewall');
            head.type = 'button';
            head.appendChild(icon('fa-layer-group'));
            head.appendChild(document.createTextNode(' Ver todas las páginas de ' + c.name));
            head.addEventListener('click', function () { self.close(); go('#c/' + encodeURIComponent(c.slug)); });
            drop.appendChild(head);

            const cols = el('div', 'mcc-cols');

            const colA = el('div', 'mcc-col');
            colA.appendChild(el('h4', null, 'Secciones'));
            if (subsOf.length && MC.subcats) {
                subsOf.forEach(function (s) {
                    const b = el('button', 'mcc-link');
                    b.type = 'button';
                    b.appendChild(el('span', 'mcc-linkico', s.icon || '🏷'));
                    b.appendChild(el('span', 'mcc-linktxt', s.name));
                    b.appendChild(el('small', null, fmtNum(MC.subcats.countArticles(s.id))));
                    b.addEventListener('click', function () {
                        self.close();
                        go('#c/' + encodeURIComponent(c.slug) + '/' + encodeURIComponent(s.slug));
                    });
                    colA.appendChild(b);
                });
            } else {
                colA.appendChild(el('p', 'mcc-empty', 'Sin sub-categorías todavía.'));
            }
            cols.appendChild(colA);

            const colB = el('div', 'mcc-col');
            colB.appendChild(el('h4', null, 'Páginas'));
            const arts = MC.core.byCategory(c.id).sort(function (a, b) {
                return (b.a.updatedAt || b.a.createdAt || 0) - (a.a.updatedAt || a.a.createdAt || 0);
            }).slice(0, 5);
            if (arts.length) {
                arts.forEach(function (x) {
                    const b = el('button', 'mcc-link');
                    b.type = 'button';
                    const ic = icon('fa-file-lines');
                    ic.classList.add('mcc-linkico');
                    b.appendChild(ic);
                    b.appendChild(el('span', 'mcc-linktxt', x.a.title || 'Sin título'));
                    b.appendChild(el('small', null, '👁 ' + fmtNum(x.a.views)));
                    b.addEventListener('click', function () {
                        self.close();
                        go('#p/' + encodeURIComponent(x.a.slug || x.id));
                    });
                    colB.appendChild(b);
                });
            } else {
                colB.appendChild(el('p', 'mcc-empty', 'Sin páginas todavía.'));
            }
            cols.appendChild(colB);

            drop.appendChild(cols);

            if (MC.core.staffView() && MC.subcats && typeof MC.subcats.openEditor === 'function') {
                const foot = el('div', 'mcc-dropfoot');
                const add = el('button', 'mcc-addbtn');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(document.createTextNode(' Nueva sub-categoría'));
                add.addEventListener('click', function () { self.close(); MC.subcats.openEditor(c.id); });
                foot.appendChild(add);
                drop.appendChild(foot);
            }

            drop.addEventListener('click', function (e) { e.stopPropagation(); });
            return drop;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { MC.catsNav.start(); });
    } else {
        MC.catsNav.start();
    }

    console.log('[Stevscon] mc_categorys.js listo (v2) — navegación de categorías + pestaña Pagos.');
})(window, document);
