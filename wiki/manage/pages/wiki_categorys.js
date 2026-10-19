/**
 * ====
 * STEVSCON.WIKI — wiki/manage/pages/wiki_categorys.js (v1)
 * CATEGORÍAS: barra de navegación superior estilo Fandom.
 *  - Categorías principales como pestañas (mayúsculas + subrayado activo).
 *  - Cada categoría abre un panel desplegable con 2 columnas:
 *      · SECCIONES -> sus sub-categorías (wiki_sub_categorys.js)
 *      · PÁGINAS   -> las últimas páginas de esa categoría
 *  - A la derecha, contador global "N PÁGINAS" (como el "499 PAGES").
 *  - Reemplaza los chips viejos: override seguro de WK.core.paintCatNav,
 *    así wiki_page.js y wiki_core.js NO se tocan.
 *  - Solo LECTURA + pintado. Nada de escrituras aquí.
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};

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

    function go(hash) { location.hash = hash; WK.route(); }

    WK.catsNav = {
        started: false,

        start: function () {
            if (this.started || !WK.core) return;
            this.started = true;
            const self = this;

            /* Adiós chips viejos: desde ahora el nav lo pinta este file */
            WK.core.paintCatNav = function (activeSlug) { self.paint(activeSlug); };

            /* Click fuera o Escape -> cierra el panel abierto */
            document.addEventListener('click', function (e) {
                if (!state.openFor) return;
                const nav = document.getElementById('wk-catnav');
                if (nav && !nav.contains(e.target)) self.close();
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') self.close();
            });
        },

        close: function () {
            const nav = document.getElementById('wk-catnav');
            if (nav) {
                const btn = nav.querySelector('.wkc-item.is-open');
                if (btn) { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
                const drop = nav.querySelector('.wkc-drop');
                if (drop && drop.parentNode) drop.parentNode.removeChild(drop);
            }
            state.openFor = null;
        },

        paint: function (activeSlug) {
            const nav = document.getElementById('wk-catnav');
            if (!nav || !WK.core) return;
            const self = this;
            nav.textContent = '';

            const parts = String(activeSlug || '').split('/');
            const actCat = (parts[0] || '').toLowerCase();
            const actSub = (parts[1] || '').toLowerCase();
            const subsMod = WK.subcats || null;

            const bar = el('div', 'wkc-bar');

            /* Inicio */
            const home = el('button', 'wkc-item' + (!actCat ? ' is-active' : ''));
            home.type = 'button';
            home.appendChild(icon('fa-house'));
            home.appendChild(el('span', null, 'Inicio'));
            home.addEventListener('click', function () { self.close(); go(''); });
            bar.appendChild(home);

            /* Categorías principales */
            WK.core.sortedCats().forEach(function (c) {
                const subsOf = subsMod ? subsMod.byParent(c.id) : [];
                const isActive = actCat === String(c.slug).toLowerCase() ||
                    (!!actSub && subsOf.some(function (s) {
                        return s.catId === c.id && String(s.slug).toLowerCase() === actSub;
                    }));

                const wrap = el('div', 'wkc-wrap');
                const btn = el('button', 'wkc-item' + (isActive ? ' is-active' : ''));
                btn.type = 'button';
                btn.setAttribute('aria-expanded', 'false');
                if (c.icon) btn.appendChild(el('span', 'wkc-ico', c.icon));
                btn.appendChild(el('span', 'wkc-label', c.name));
                const caret = icon('fa-chevron-down');
                caret.classList.add('wkc-caret');
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

            /* Contador global a la derecha */
            const total = WK.core.pages || WK.core.published().length;
            bar.appendChild(el('span', 'wkc-count', fmtNum(total) + ' PÁGINAS'));

            nav.appendChild(bar);
        },

        buildDrop: function (c, subsOf) {
            const self = this;
            const drop = el('div', 'wkc-drop');

            /* Cabecera: ir a la categoría entera */
            const head = el('button', 'wkc-viewall');
            head.type = 'button';
            head.appendChild(icon('fa-layer-group'));
            head.appendChild(document.createTextNode(' Ver todas las páginas de ' + c.name));
            head.addEventListener('click', function () { self.close(); go('#c/' + encodeURIComponent(c.slug)); });
            drop.appendChild(head);

            const cols = el('div', 'wkc-cols');

            /* SECCIONES: sub-categorías de esta categoría */
            const colA = el('div', 'wkc-col');
            colA.appendChild(el('h4', null, 'Secciones'));
            if (subsOf.length && WK.subcats) {
                subsOf.forEach(function (s) {
                    const b = el('button', 'wkc-link');
                    b.type = 'button';
                    b.appendChild(el('span', 'wkc-linkico', s.icon || '🏷'));
                    b.appendChild(el('span', 'wkc-linktxt', s.name));
                    b.appendChild(el('small', null, fmtNum(WK.subcats.countArticles(s.id))));
                    b.addEventListener('click', function () {
                        self.close();
                        go('#c/' + encodeURIComponent(c.slug) + '/' + encodeURIComponent(s.slug));
                    });
                    colA.appendChild(b);
                });
            } else {
                colA.appendChild(el('p', 'wkc-empty', 'Sin sub-categorías todavía.'));
            }
            cols.appendChild(colA);

            /* PÁGINAS: las últimas publicadas de la categoría */
            const colB = el('div', 'wkc-col');
            colB.appendChild(el('h4', null, 'Páginas'));
            const arts = WK.core.byCategory(c.id).sort(function (a, b) {
                return (b.a.updatedAt || b.a.createdAt || 0) - (a.a.updatedAt || a.a.createdAt || 0);
            }).slice(0, 5);
            if (arts.length) {
                arts.forEach(function (x) {
                    const b = el('button', 'wkc-link');
                    b.type = 'button';
                    const ic = icon('fa-file-lines');
                    ic.classList.add('wkc-linkico');
                    b.appendChild(ic);
                    b.appendChild(el('span', 'wkc-linktxt', x.a.title || 'Sin título'));
                    b.appendChild(el('small', null, '👁 ' + fmtNum(x.a.views)));
                    b.addEventListener('click', function () {
                        self.close();
                        go('#a/' + encodeURIComponent(x.a.slug || x.id));
                    });
                    colB.appendChild(b);
                });
            } else {
                colB.appendChild(el('p', 'wkc-empty', 'Sin páginas todavía.'));
            }
            cols.appendChild(colB);

            drop.appendChild(cols);

            /* Staff: crear sub-categorías directo desde el menú */
            if (WK.core.staffView() && WK.subcats && typeof WK.subcats.openEditor === 'function') {
                const foot = el('div', 'wkc-dropfoot');
                const add = el('button', 'wkc-addbtn');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(document.createTextNode(' Nueva sub-categoría'));
                add.addEventListener('click', function () { self.close(); WK.subcats.openEditor(c.id); });
                foot.appendChild(add);
                drop.appendChild(foot);
            }

            /* Click dentro del panel no lo cierra */
            drop.addEventListener('click', function (e) { e.stopPropagation(); });
            return drop;
        }
    };

    /* ---- Init ---- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { WK.catsNav.start(); });
    } else {
        WK.catsNav.start();
    }

    console.log('[Stevscon] wiki_categorys.js listo (v1) — navegación de categorías estilo Fandom.');
})(window, document);