/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/pages/mc_sub_categorys.js (v1)
 * SUB-CATEGORÍAS: grupos ordenados dentro de una categoría principal.
 *  - Datos: mc/subcats/{subId} = {catId, name, slug, icon, order, createdAt}
 *  - Una página pertenece a una sub con mc/pages/{id}/subcat = subId.
 *  - Staff (Owner/Admins): crear, renombrar, borrar y asignar páginas.
 *    Mods y usuarios normales solo las ven y navegan.
 *  - Rutas: #c/{categoria}/{sub-categoria} — un wrap seguro de
 *    MC.core.renderCategory manda esas rutas aquí SIN tocar mc_page.js
 *    (acepta tanto slug con "/" como el tercer argumento de mc_page.js).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const toast = function (m, k) { if (MC.toast) MC.toast(m, k); };
    const db = function () { return firebase.database(); };

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function fmtNum(n) { return Number(n || 0).toLocaleString('es'); }
    function closeOvl(ovl) { if (ovl && ovl.parentNode) ovl.parentNode.removeChild(ovl); }
    function armed(btn, fn) {
        let st = false;
        btn.addEventListener('click', function () {
            if (!st) {
                st = true;
                btn.classList.add('arm');
                btn.textContent = '¿Seguro?';
                setTimeout(function () { st = false; btn.classList.remove('arm'); btn.textContent = 'Borrar'; }, 2600);
                return;
            }
            fn();
        });
    }
    function slugify(s) {
        return String(s == null ? '' : s).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    }

    MC.subcats = {
        map: {}, started: false, wrapped: false,

        start: function () {
            if (this.started) return;
            this.started = true;
            const self = this;
            db().ref('mc/subcats').on('value', function (s) {
                self.map = s.val() || {};
                document.dispatchEvent(new CustomEvent('sc:mc-data'));
            }, function (err) { console.warn('[StevsMCross] lectura de sub-categorías:', err && err.code); });
        },

        all: function () {
            const out = [];
            const map = this.map;
            Object.keys(map).forEach(function (id) { out.push(Object.assign({ id: id }, map[id])); });
            return out;
        },
        byParent: function (catId) {
            return this.all().filter(function (s) { return s.catId === catId; })
                .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name)); });
        },
        byId: function (id) { return this.map[id] ? Object.assign({ id: id }, this.map[id]) : null; },
        resolve: function (catId, subSlug) {
            const q = String(subSlug || '').toLowerCase();
            return this.byParent(catId).filter(function (s) { return String(s.slug).toLowerCase() === q; })[0] || null;
        },
        articlesOf: function (subId) {
            return MC.core.published().filter(function (x) { return x.a.subcat === subId; });
        },
        countArticles: function (subId) { return this.articlesOf(subId).length; },
        isStaff: function () {
            return !!(MC.system && MC.system.session && MC.system.session.isStaff);
        },

        guard: function () {
            if (!this.isStaff()) { toast('Solo el Owner y los Administradores pueden editar StevsMCross.', 'error'); return false; }
            return true;
        },
        create: function (catId, name, iconCh) {
            if (!this.guard()) return Promise.reject(new Error('Sin permiso'));
            const cat = MC.core.catById(catId);
            if (!cat) return Promise.reject(new Error('La categoría padre no existe'));
            const n = String(name || '').trim();
            if (!n) return Promise.reject(new Error('Ponle un nombre a la sub-categoría.'));
            const base = slugify(n) || 'sub';
            const taken = {};
            this.byParent(catId).forEach(function (s) { taken[String(s.slug).toLowerCase()] = 1; });
            let slug = base, i = 2;
            while (taken[slug]) { slug = base + '-' + i; i++; }
            return db().ref('mc/subcats').push().set({
                catId: catId,
                name: n.slice(0, 40),
                slug: slug,
                icon: String(iconCh || '').trim().slice(0, 4) || '🏷',
                order: Date.now(),
                createdAt: Date.now()
            });
        },
        rename: function (id, name, iconCh) {
            if (!this.guard()) return Promise.reject(new Error('Sin permiso'));
            const sub = this.byId(id);
            if (!sub) return Promise.reject(new Error('No existe esa sub-categoría'));
            const n = String(name || '').trim();
            if (!n) return Promise.reject(new Error('Falta el nombre'));
            return db().ref('mc/subcats/' + id).update({
                name: n.slice(0, 40),
                icon: String(iconCh || '').trim().slice(0, 4) || sub.icon || '🏷'
            });
        },
        remove: function (id) {
            if (!this.guard()) return Promise.reject(new Error('Sin permiso'));
            const sub = this.byId(id);
            if (!sub) return Promise.reject(new Error('No existe esa sub-categoría'));
            const upd = {};
            upd['mc/subcats/' + id] = null;
            MC.core.published().forEach(function (x) {
                if (x.a.subcat === id) upd['mc/pages/' + x.id + '/subcat'] = null;
            });
            return db().ref().update(upd);
        },
        setArticleSub: function (articleId, subId) {
            if (!this.guard()) return Promise.reject(new Error('Sin permiso'));
            return db().ref('mc/pages/' + articleId + '/subcat').set(subId || null);
        },

        openEditor: function (catId, sub) {
            if (!this.guard()) return;
            const self = this;
            const cat = MC.core.catById(catId);
            if (!cat) return;

            const ovl = el('div', 'mc-ovl');
            ovl.id = 'mc-subcat-ovl';
            const panel = el('div', 'mc-panel');
            ovl.appendChild(panel);
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);

            panel.appendChild(el('h2', null, sub ? 'Editar sub-categoría' : 'Nueva sub-categoría'));
            panel.appendChild(el('p', 'mc-sub', 'Se creará dentro de "' + cat.name + '" y saldrá en el menú de la barra de arriba.'));
            const close = el('button', 'mc-close');
            close.type = 'button';
            close.appendChild(icon('fa-xmark'));
            close.addEventListener('click', function () { closeOvl(ovl); });
            panel.appendChild(close);

            const name = document.createElement('input');
            name.type = 'text'; name.maxLength = 40;
            name.placeholder = 'Ej: Skins, Actualizaciones, Secretos...';
            const ico = document.createElement('input');
            ico.type = 'text'; ico.maxLength = 4; ico.placeholder = '🏷 (emoji)';

            const form = el('div', 'mc-form');
            const r = el('div', 'mc-2');
            const f1 = el('div'); f1.appendChild(el('label', null, 'NOMBRE')); f1.appendChild(name); r.appendChild(f1);
            const f2 = el('div'); f2.appendChild(el('label', null, 'ICONO')); f2.appendChild(ico); r.appendChild(f2);
            form.appendChild(r);

            const bSave = el('button', 'mc-btn pri');
            bSave.type = 'button';
            bSave.appendChild(icon('fa-floppy-disk'));
            bSave.appendChild(document.createTextNode(sub ? ' Guardar' : ' Crear'));
            bSave.addEventListener('click', function () {
                bSave.disabled = true;
                const p = sub ? self.rename(sub.id, name.value, ico.value)
                              : self.create(catId, name.value, ico.value);
                p.then(function () {
                    toast(sub ? 'Sub-categoría actualizada' : 'Sub-categoría creada', 'ok');
                    closeOvl(ovl);
                }).catch(function (e) { toast(e.message, 'error'); bSave.disabled = false; });
            });
            form.appendChild(bSave);
            panel.appendChild(form);

            if (sub) { name.value = sub.name || ''; ico.value = sub.icon || ''; }
            setTimeout(function () { name.focus(); }, 50);
        },

        openAssign: function (sub) {
            if (!this.guard()) return;
            const self = this;
            const cat = MC.core.catById(sub.catId);
            const ovl = el('div', 'mc-ovl');
            const panel = el('div', 'mc-panel');
            ovl.appendChild(panel);
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);

            const close = el('button', 'mc-close');
            close.type = 'button';
            close.appendChild(icon('fa-xmark'));
            close.addEventListener('click', function () { closeOvl(ovl); });
            panel.appendChild(close);

            panel.appendChild(el('h2', null, 'Páginas de "' + sub.name + '"'));
            panel.appendChild(el('p', 'mc-sub', 'Agrega o quita páginas de ' + (cat ? cat.name : 'la categoría') + ' dentro de esta sub-categoría.'));

            const list = el('div');
            panel.appendChild(list);

            function paintList() {
                list.textContent = '';
                const arts = MC.core.published()
                    .filter(function (x) { return x.a.category === sub.catId; })
                    .sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });
                if (!arts.length) {
                    list.appendChild(el('p', 'mc-sub', 'Esta categoría no tiene páginas todavía.'));
                    return;
                }
                arts.forEach(function (x) {
                    const row = el('div', 'mc-row');
                    const gro = el('div', 'mc-gro');
                    gro.appendChild(el('strong', null, x.a.title || 'Sin título'));
                    const isIn = x.a.subcat === sub.id;
                    gro.appendChild(el('small', null, isIn ? 'Está en esta sub-categoría' : 'Sin sub-categoría'));
                    row.appendChild(gro);
                    const b = el('button', 'mc-btn' + (isIn ? ' danger' : ' pri'));
                    b.type = 'button';
                    b.textContent = isIn ? 'Quitar' : 'Agregar';
                    b.addEventListener('click', function () {
                        self.setArticleSub(x.id, isIn ? null : sub.id)
                            .then(paintList)
                            .catch(function (e) { toast(e.message, 'error'); });
                    });
                    row.appendChild(b);
                    list.appendChild(row);
                });
            }
            paintList();
        },

        render: function (main, arg) {
            const parts = String(arg || '').split('/');
            const cat = MC.core.catBySlug(parts[0] || '');
            const sub = cat ? this.resolve(cat.id, parts[1] || '') : null;
            if (!cat || !sub) {
                return MC.core.emptyBox(main, 'fa-folder-xmark', 'Sub-categoría no encontrada',
                    'Puede que se haya borrado o renombrado. Prueba entrando desde la categoría.');
            }

            const head = el('section', 'mc-cathead mc-subhead');
            if (cat.color) head.style.setProperty('--cat-color', cat.color);
            const crumb = el('button', 'mc-subcrumb');
            crumb.type = 'button';
            crumb.appendChild(icon('fa-arrow-left-long'));
            crumb.appendChild(document.createTextNode(' ' + cat.name));
            crumb.addEventListener('click', function () {
                location.hash = '#c/' + encodeURIComponent(cat.slug);
                MC.route();
            });
            head.appendChild(crumb);
            head.appendChild(el('span', 'mc-caticon mc-big', sub.icon || '🏷'));
            head.appendChild(el('h1', null, sub.name));
            main.appendChild(head);

            const list = this.articlesOf(sub.id).sort(function (a, b) {
                return (b.a.updatedAt || b.a.createdAt || 0) - (a.a.updatedAt || a.a.createdAt || 0);
            });
            main.appendChild(el('p', 'mc-subcount', fmtNum(list.length) + (list.length === 1 ? ' página' : ' páginas')));

            if (this.isStaff()) {
                const tools = el('div', 'mc-subtools');
                const bEdit = el('button', 'mc-btn');
                bEdit.type = 'button';
                bEdit.appendChild(icon('fa-pen-to-square'));
                bEdit.appendChild(document.createTextNode(' Renombrar'));
                bEdit.addEventListener('click', function () { MC.subcats.openEditor(cat.id, sub); });
                tools.appendChild(bEdit);

                const bAs = el('button', 'mc-btn pri');
                bAs.type = 'button';
                bAs.appendChild(icon('fa-list-check'));
                bAs.appendChild(document.createTextNode(' Asignar páginas'));
                bAs.addEventListener('click', function () { MC.subcats.openAssign(sub); });
                tools.appendChild(bAs);

                const bDe = el('button', 'mc-btn danger');
                bDe.type = 'button';
                bDe.textContent = 'Borrar';
                armed(bDe, function () {
                    MC.subcats.remove(sub.id).then(function () {
                        toast('Sub-categoría borrada', 'ok');
                        location.hash = '#c/' + encodeURIComponent(cat.slug);
                        MC.route();
                    }).catch(function (e) { toast(e.message, 'error'); });
                });
                tools.appendChild(bDe);
                main.appendChild(tools);
            }

            if (!list.length) {
                return MC.core.emptyBox(main, 'fa-feather', 'Aún no hay páginas aquí',
                    this.isStaff() ? 'Usa "Asignar páginas" para mover páginas de ' + cat.name + ' hacia esta sub-categoría.'
                                   : 'Vuelve pronto: esta sección está en construcción.');
            }
            const grid = el('div', 'mc-grid');
            list.forEach(function (x) { grid.appendChild(MC.core.card(x.id, x.a)); });
            main.appendChild(grid);
        },

        paintChips: function (main, catSlug) {
            const cat = MC.core.catBySlug(catSlug);
            if (!cat) return;
            const subs = this.byParent(cat.id);
            if (!subs.length && !this.isStaff()) return;
            const head = main.querySelector('.mc-cathead');
            if (!head || main.querySelector('.mc-subbar')) return;
            const self = this;

            const bar = el('div', 'mc-subbar');
            const all = el('button', 'mc-subchip is-active');
            all.type = 'button';
            all.textContent = 'Todas · ' + MC.core.byCategory(cat.id).length;
            all.addEventListener('click', function () {
                location.hash = '#c/' + encodeURIComponent(cat.slug);
                MC.route();
            });
            bar.appendChild(all);

            subs.forEach(function (s) {
                const b = el('button', 'mc-subchip');
                b.type = 'button';
                b.appendChild(el('span', null, s.icon || '🏷'));
                b.appendChild(el('span', null, s.name));
                b.appendChild(el('small', null, String(self.countArticles(s.id))));
                b.addEventListener('click', function () {
                    location.hash = '#c/' + encodeURIComponent(cat.slug) + '/' + encodeURIComponent(s.slug);
                    MC.route();
                });
                bar.appendChild(b);
            });

            if (this.isStaff()) {
                const add = el('button', 'mc-subchip add');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(el('span', null, 'Sub-categoría'));
                add.addEventListener('click', function () { self.openEditor(cat.id); });
                bar.appendChild(add);
            }

            head.parentNode.insertBefore(bar, head.nextSibling);
        },

        wrap: function () {
            if (this.wrapped || !MC.core) return;
            this.wrapped = true;
            const self = this;
            const origCat = MC.core.renderCategory;
            MC.core.renderCategory = function (main, slug, sub) {
                const s = String(slug || '');
                const two = sub ? (s + '/' + sub) : s;
                if (two.indexOf('/') !== -1) return self.render(main, two);
                const out = origCat.call(MC.core, main, s);
                try { self.paintChips(main, s); } catch (e) { console.warn('[StevsMCross] subchips:', e); }
                return out;
            };
        }
    };

    function init() {
        if (!MC.core) return;
        MC.subcats.start();
        MC.subcats.wrap();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Stevscon] mc_sub_categorys.js listo (v1) — sub-categorías con menú desplegable.');
})(window, document);
