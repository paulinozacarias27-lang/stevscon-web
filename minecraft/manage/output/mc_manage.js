/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_manage.js (v2)
 * MANAGE: PANEL DE STAFF (invisible para usuarios normales).
 * - FAB de edición (aparece solo si la sesión es staff/owner).
 * - Pestañas: Páginas (editar/destacar/publicar/borrar), Nueva
 *   página (con PLANTILLAS: Novedad, Guía, Cómo entrar, Economía,
 *   Tienda, Plugin StevsXP y Libre), Categorías (crear con
 *   icono/color, crear la base de StevsMCross, borrar) y Tienda
 *   (delega en MC.storeManage).
 * - Editor con subida de portada (hasta 20MB, se optimiza sola).
 * - renderAdmin: la ruta #admin pinta el MISMO panel dentro de main.
 * TODO con textContent; innerHTML solo para esqueletos estáticos.
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const toast = function (m, k) { if (window.StevsconMC && window.StevsconMC.toast) window.StevsconMC.toast(m, k); };
    const dbf = function () { return firebase.database(); };
    const esc = function (s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const TEMPLATES = {
        libre: { label: 'Página libre', icon: '📖', title: '', body: '## Introducción\n\nEscribe aquí...' },
        novedad: {
            label: 'Novedad del server', icon: '📣',
            title: '', body: '## Novedad\n\n**Fecha:**\n\n### Qué cambió\n\n- Cambio 1\n- Cambio 2\n\n### Lo siguiente\n\n- Plan 1\n\n> Comenta qué te parece en el Discord oficial.'
        },
        guia: {
            label: 'Guía de juego', icon: '🗺',
            title: '', body: '## Guía de juego\n\n### Paso 1\n\nExplica el primer paso.\n\n### Paso 2\n\nSigue construyendo.\n\n### Consejos\n\n- Consejo útil\n- Otro consejo'
        },
        entrar: {
            label: 'Cómo entrar', icon: '🚪',
            title: '', body: '## Cómo entrar a StevsMCross\n\n### Paso 1: entra al Discord\n\nTodo empieza en el Discord oficial: ahí se verifica tu cuenta y se entrega el acceso al servidor.\n\nÚnete al Discord oficial: [discord.gg/TJMXjM5kdE](' + MC.DISCORD_URL + ')\n\n### Paso 2: verifícate\n\nSigue las instrucciones del canal de verificación y espera a que el staff te dé el rol.\n\n### Paso 3: entra al servidor\n\nCon el rol ya puesto, abre Minecraft y conecta con la dirección que el staff te comparte dentro del Discord.\n\n> La dirección del servidor solo se comparte dentro del Discord, nunca en esta página.'
        },
        economia: {
            label: 'Página de economía', icon: '💎',
            title: '', body: '## Economía de StevsMCross\n\n### XP\n\nExplica cómo se gana XP en el servidor.\n\n### Rubbie\n\nExplica para qué sirve la Rubbie y cómo se obtiene.\n\n### Canjes\n\n- Qué se puede comprar\n- Qué se puede canjear'
        },
        tienda: {
            label: 'Página de tienda', icon: '🛒',
            title: '', body: '## Tienda de StevsMCross\n\n### Qué puedes comprar\n\n- Paquete 1\n- Paquete 2\n\n### Códigos\n\nCada compra entrega un código canjeable dentro del servidor con el plugin StevsXP.\n\n### Cómo canjearlo\n\n1. Entra al servidor.\n2. Abre el menú de canjes.\n3. Escribe el código que recibiste.'
        },
        plugin: {
            label: 'Página de plugin', icon: '⚡',
            title: '', body: '## Plugin StevsXP\n\n### Qué es\n\nEl plugin propio del servidor: economía de XP y Rubbie, canjes de códigos y progreso de los jugadores.\n\n### Comandos\n\n- `/comando` — explica qué hace\n\n### Permisos\n\n- Permiso 1\n- Permiso 2'
        }
    };
    const TYPES = [
        ['libre', 'Página'], ['novedad', 'Novedad'], ['guia', 'Guía'],
        ['entrar', 'Cómo entrar'], ['economia', 'Economía'], ['tienda', 'Tienda'],
        ['plugin', 'Plugin']
    ];

    const CSS = `
    #mc-manage-fab{position:fixed;right:22px;bottom:22px;z-index:1500;width:56px;height:56px;border:3px solid #000;border-radius:0;
      background:var(--mc-dark,#4a8f1d);color:var(--mc-accent,#7fdc3a);cursor:pointer;
      box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4),inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4);
      font-size:19px;display:none;align-items:center;justify-content:center;
      transition:transform .12s steps(2,end)}
    #mc-manage-fab:hover{background:var(--mc-accent,#7fdc3a);color:#16300a;transform:translate(-2px,-2px)}
    #mc-manage-fab:active{transform:translate(2px,2px);box-shadow:0 0 0 2px var(--border-color,#2f3626),2px 2px 0 rgba(0,0,0,.4),inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    #mc-manage-fab.show{display:flex}
    .mc-ovl{position:fixed;inset:0;z-index:2000;background:rgba(10,12,8,.85);display:flex;align-items:center;justify-content:center;padding:16px;font-family:var(--ui-font),sans-serif}
    .mc-panel{width:min(860px,96vw);max-height:92vh;overflow:auto;background:var(--bg-card,#181c14);border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);padding:20px 22px;color:var(--text-main,#eef4e6)}
    .mc-panel h2{margin:0 0 6px;font:400 13px var(--px-font),monospace;line-height:1.6;letter-spacing:.02em;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mc-panel .mc-sub{margin:0 0 14px;color:var(--text-muted,#98a28c);font:600 12.5px var(--ui-font),sans-serif;line-height:1.6}
    .mc-admin{padding:0 0 40px}
    .mc-admin .mc-panel{width:100%;max-width:none;max-height:none;overflow:visible}
    .mc-tabs{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}
    .mc-tab{border:2px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);
      border-radius:0;padding:8px 16px;font:700 12.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mc-tab:hover{color:var(--text-main,#eef4e6)}
    .mc-tab.is-on{background:rgba(127,220,58,.12);color:var(--mc-accent,#7fdc3a);border-color:var(--mc-accent,#7fdc3a)}
    .mc-row{display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:2px solid var(--border-color,#2f3626);flex-wrap:wrap}
    .mc-row .mc-gro{flex:1;min-width:180px}
    .mc-row strong{display:block;font:700 14px var(--ui-font),sans-serif}
    .mc-row small{color:var(--text-muted,#98a28c);font:600 11.5px var(--ui-font),sans-serif}
    .mc-pill{display:inline-block;padding:3px 9px;border-radius:0;font:700 9.5px var(--ui-font),sans-serif;letter-spacing:.1em;text-transform:uppercase;margin-left:8px;vertical-align:2px;
      border:2px solid #000;box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mc-pill.draft{background:rgba(244,197,66,.14);color:var(--gold,#f4c542);border-color:rgba(244,197,66,.5)}
    .mc-pill.feat{background:rgba(127,220,58,.16);color:var(--mc-accent,#7fdc3a);border-color:rgba(127,220,58,.5)}
    .mc-btn{border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-main,#eef4e6);
      border-radius:0;padding:7px 12px;font:700 12px var(--ui-font),sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mc-btn:hover{border-color:var(--mc-accent,#7fdc3a);color:var(--mc-accent,#7fdc3a)}
    .mc-btn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mc-btn.pri{background:var(--mc-dark,#4a8f1d);border-color:#000;color:#eaf7dd}
    .mc-btn.pri:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mc-btn.danger{background:var(--redstone,#ff5545);border-color:#000;color:#fff}
    .mc-btn.danger:hover{background:#c23225;color:#fff}
    .mc-btn.danger.arm{background:#c23225;color:#fff;border-color:#000}
    .mc-form{display:grid;gap:12px}
    .mc-form label{display:block;font:700 10px var(--ui-font),sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#98a28c);margin:0 0 5px}
    .mc-form input[type=text],.mc-form input[type=number],.mc-form select,.mc-form textarea{
      width:100%;background:#0b0d09;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);
      color:var(--text-main,#eef4e6);padding:10px 12px;font:600 13px var(--ui-font),sans-serif;outline:0;box-sizing:border-box}
    .mc-form input:focus,.mc-form select:focus,.mc-form textarea:focus{border-color:#000;box-shadow:0 0 0 2px var(--gold,#f4c542)}
    .mc-form textarea{min-height:130px;resize:vertical;line-height:1.6}
    .mc-form textarea.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;min-height:300px;line-height:1.6}
    .mc-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .mc-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .mc-cover-prev{max-height:150px;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);display:block}
    .mc-hint{color:var(--text-muted,#98a28c);font:600 11px var(--ui-font),sans-serif;margin-top:4px;line-height:1.6}
    .mc-close{position:sticky;top:0;float:right;background:var(--bg-hover,#232a1b);border:3px solid #000;
      color:var(--text-muted,#98a28c);width:34px;height:34px;border-radius:0;cursor:pointer;font-size:14px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mc-close:hover{color:var(--redstone,#ff5545);border-color:#000}
    @media(max-width:640px){.mc-2,.mc-3{grid-template-columns:1fr}}
    `;
    function injectStyles() {
        if (document.getElementById('mc-manage-style')) return;
        const st = document.createElement('style');
        st.id = 'mc-manage-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function field(labelTxt, input) {
        const w = el('div');
        w.appendChild(el('label', null, labelTxt));
        w.appendChild(input);
        return w;
    }
    function sel(opts, val) {
        const s = document.createElement('select');
        opts.forEach(function (o) {
            const op = el('option', null, o[1]);
            op.value = o[0];
            s.appendChild(op);
        });
        if (val) s.value = val;
        return s;
    }
    function closeOvl(ovl) { if (ovl && ovl.parentNode) ovl.parentNode.removeChild(ovl); }
    function armed(btn, fn) {
        let armedSt = false;
        btn.addEventListener('click', function () {
            if (!armedSt) {
                armedSt = true;
                btn.classList.add('arm');
                btn.textContent = '¿Seguro?';
                setTimeout(function () {
                    armedSt = false;
                    btn.classList.remove('arm');
                    btn.textContent = 'Borrar';
                }, 2600);
                return;
            }
            fn();
        });
    }

    MC.manage = {
        tab: 'arts',

        init: function () {
            injectStyles();
            const self = this;

            const fab = el('button');
            fab.type = 'button';
            fab.id = 'mc-manage-fab';
            fab.title = 'Panel de StevsMCross (staff)';
            fab.setAttribute('aria-label', 'Panel de StevsMCross');
            fab.appendChild(icon('fa-pen-to-square'));
            fab.addEventListener('click', function () { self.openPanel(); });
            document.body.appendChild(fab);

            document.addEventListener('sc:mc-auth', function () {
                const staff = MC.system && MC.system.session && MC.system.session.isStaff;
                fab.classList.toggle('show', !!staff);
            });
        },

        buildPanel: function (host, opts) {
            const self = this;
            const o = opts || {};
            const panel = el('div', 'mc-panel');
            if (o.id) panel.id = o.id;

            if (o.close) {
                const close = el('button', 'mc-close');
                close.type = 'button';
                close.appendChild(icon('fa-xmark'));
                close.addEventListener('click', o.close);
                panel.appendChild(close);
            }

            panel.appendChild(el('h2', null, 'Panel de StevsMCross'));
            panel.appendChild(el('p', 'mc-sub', 'Crea categorías, escribe páginas y destaca lo más importante. Todo queda guardado con historial.'));

            const tabs = el('div', 'mc-tabs');
            const defs = [['arts', 'Páginas', 'fa-file-lines'], ['new', 'Nueva página', 'fa-plus'], ['cats', 'Categorías', 'fa-folder-tree'], ['store', 'Tienda', 'fa-store']];
            const tabBtns = {};
            const body = el('div');
            const paint = function (key) {
                self.tab = key;
                Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('is-on', k === key); });
                body.textContent = '';
                if (key === 'arts') self.renderArts(body);
                else if (key === 'new') self.openEditor(null, body);
                else if (key === 'cats') self.renderCats(body);
                else self.renderStore(body);
            };
            defs.forEach(function (d) {
                const b = el('button', 'mc-tab');
                b.type = 'button';
                b.appendChild(icon(d[2]));
                b.appendChild(document.createTextNode(' ' + d[1]));
                b.addEventListener('click', function () { paint(d[0]); });
                tabBtns[d[0]] = b;
                tabs.appendChild(b);
            });
            panel.appendChild(tabs);
            panel.appendChild(body);
            host.appendChild(panel);
            paint(this.tab);
            return panel;
        },

        openPanel: function () {
            if (!(MC.system && MC.system.session && MC.system.session.isStaff)) return;
            if (document.getElementById('mc-panel-ovl')) return;
            const ovl = el('div', 'mc-ovl');
            ovl.id = 'mc-panel-ovl';
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);
            this.buildPanel(ovl, { id: 'mc-panel', close: function () { closeOvl(ovl); } });
        },

        renderAdmin: function (main) {
            if (!main) return;
            if (!(MC.system && MC.system.session && MC.system.session.isStaff)) { toast('Zona solo para staff.', 'error'); return; }
            injectStyles();
            main.textContent = '';
            const wrap = el('div', 'mc-admin');
            main.appendChild(wrap);
            this.buildPanel(wrap, { id: 'mc-admin-panel' });
        },

        renderStore: function (box) {
            box.textContent = '';
            if (MC.storeManage && typeof MC.storeManage.mount === 'function') {
                MC.storeManage.mount(box);
                return;
            }
            box.appendChild(el('p', 'mc-sub', 'Tienda: módulo no cargado.'));
        },

        renderArts: function (box) {
            const self = this;
            box.textContent = '';
            const arts = MC.core.arts || {};
            const ids = Object.keys(arts).sort(function (a, b) {
                return (arts[b].updatedAt || 0) - (arts[a].updatedAt || 0);
            });

            if (!ids.length) {
                box.appendChild(el('p', 'mc-sub', 'Todavía no hay páginas. Crea la primera en la pestaña "Nueva página".'));
                return;
            }

            ids.forEach(function (id) {
                const a = arts[id];
                const row = el('div', 'mc-row');

                const gro = el('div', 'mc-gro');
                const t = el('strong');
                t.textContent = a.title || 'Sin título';
                if (a.status === 'draft') t.appendChild(el('span', 'mc-pill draft', 'BORRADOR'));
                if (a.featured) t.appendChild(el('span', 'mc-pill feat', 'DESTACADA'));
                row.appendChild(gro);
                gro.appendChild(t);

                const cat = MC.core.catById(a.category);
                gro.appendChild(el('small', null, (cat ? cat.name : 'General') + ' · 👁 ' + Number(a.views || 0).toLocaleString('es')));

                const bEd = el('button', 'mc-btn');
                bEd.type = 'button';
                bEd.appendChild(icon('fa-pen-to-square'));
                bEd.appendChild(document.createTextNode(' Editar'));
                bEd.addEventListener('click', function () {
                    closeOvl(document.getElementById('mc-panel-ovl'));
                    self.openEditor(id);
                });
                row.appendChild(bEd);

                const bFe = el('button', 'mc-btn');
                bFe.type = 'button';
                bFe.appendChild(icon(a.featured ? 'fa-star' : 'fa-regular fa-star'));
                bFe.appendChild(document.createTextNode(a.featured ? ' Quitar' : ' Destacar'));
                bFe.addEventListener('click', function () {
                    MC.system.setFeatured(id, !a.featured)
                        .then(function () { toast(a.featured ? 'Quitada de destacados' : '¡Destacada en la portada!', 'ok'); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bFe);

                const bSt = el('button', 'mc-btn');
                bSt.type = 'button';
                const isDraft = a.status === 'draft';
                bSt.appendChild(icon(isDraft ? 'fa-upload' : 'fa-box-archive'));
                bSt.appendChild(document.createTextNode(isDraft ? ' Publicar' : ' A borrador'));
                bSt.addEventListener('click', function () {
                    MC.system.setStatus(id, isDraft ? 'published' : 'draft')
                        .then(function () { toast(isDraft ? 'Página publicada' : 'Página en borrador', 'ok'); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bSt);

                const bDe = el('button', 'mc-btn danger');
                bDe.type = 'button';
                bDe.textContent = 'Borrar';
                armed(bDe, function () {
                    MC.system.deleteArticle(id)
                        .then(function () { toast('Página borrada', 'ok'); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bDe);

                box.appendChild(row);
            });
        },

        BASE_CATS: [
            { name: 'Inicio', slug: 'inicio', icon: '🏠', color: '#4ade80' },
            { name: 'Cómo entrar', slug: 'como-entrar', icon: '🚪', color: '#22c55e' },
            { name: 'Economía', slug: 'economia', icon: '💎', color: '#fbbf24' },
            { name: 'Tienda', slug: 'tienda', icon: '🛒', color: '#38bdf8' },
            { name: 'StevsXP', slug: 'stevsx', icon: '⚡', color: '#a78bfa' },
            { name: 'Reglas', slug: 'reglas', icon: '📜', color: '#f87171' },
            { name: 'Guías', slug: 'guias', icon: '📘', color: '#60a5fa' }
        ],

        createBaseCats: function () {
            if (!(MC.system && MC.system.session && MC.system.session.isStaff)) {
                return Promise.reject(new Error('Solo el Owner y los Administradores pueden crear categorías.'));
            }
            const list = this.BASE_CATS;
            return dbf().ref('mc/categories').once('value').then(function (s) {
                const cats = s.val() || {};
                const taken = {};
                Object.keys(cats).forEach(function (k) {
                    if (cats[k] && cats[k].slug) taken[String(cats[k].slug).toLowerCase()] = true;
                });
                const now = firebase.database.ServerValue.TIMESTAMP;
                let chain = Promise.resolve();
                let made = 0;
                list.forEach(function (c, i) {
                    if (taken[c.slug]) return;
                    chain = chain.then(function () {
                        return dbf().ref('mc/categories').push({
                            name: c.name, slug: c.slug, icon: c.icon, color: c.color,
                            order: i + 1, createdAt: now
                        }).then(function () { made++; });
                    });
                });
                return chain.then(function () { return made; });
            });
        },

        renderCats: function (box) {
            const self = this;
            box.textContent = '';

            const form = el('div', 'mc-form');
            const name = document.createElement('input');
            name.type = 'text';
            name.placeholder = 'Ej: Proyectos, Devlogs, Secretos…';
            name.maxLength = 32;
            const ico = document.createElement('input');
            ico.type = 'text';
            ico.placeholder = '📁 (emoji)';
            ico.maxLength = 4;
            const color = document.createElement('input');
            color.type = 'color';
            color.value = '#8b5cf6';
            color.style.cssText = 'width:100%;height:42px;background:#0b0d09;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);cursor:pointer';

            const r = el('div', 'mc-3');
            r.appendChild(field('NOMBRE', name));
            r.appendChild(field('ICONO', ico));
            r.appendChild(field('COLOR', color));
            form.appendChild(r);

            const bAdd = el('button', 'mc-btn pri');
            bAdd.type = 'button';
            bAdd.appendChild(icon('fa-plus'));
            bAdd.appendChild(document.createTextNode(' Crear categoría'));
            bAdd.addEventListener('click', function () {
                MC.system.createCategory(name.value, ico.value, color.value)
                    .then(function () {
                        toast('Categoría creada', 'ok');
                        name.value = ''; ico.value = '';
                        self.renderCats(box);
                    })
                    .catch(function (e) { toast(e.message, 'error'); });
            });

            const bBase = el('button', 'mc-btn');
            bBase.type = 'button';
            bBase.appendChild(icon('fa-layer-group'));
            bBase.appendChild(document.createTextNode(' Crear base de StevsMCross'));
            bBase.addEventListener('click', function () {
                bBase.disabled = true;
                self.createBaseCats()
                    .then(function (n) {
                        toast(n ? 'Base creada: ' + n + ' categorías nuevas' : 'La base ya estaba completa', 'ok');
                        self.renderCats(box);
                    })
                    .catch(function (e) { toast(e.message, 'error'); bBase.disabled = false; });
            });

            const acts = el('div');
            acts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
            acts.appendChild(bAdd);
            acts.appendChild(bBase);
            form.appendChild(acts);
            box.appendChild(form);

            box.appendChild(el('h2', null, 'Categorías existentes'));
            const cats = MC.core.sortedCats();
            if (!cats.length) {
                box.appendChild(el('p', 'mc-sub', 'Aún no hay categorías.'));
                return;
            }
            cats.forEach(function (c) {
                const row = el('div', 'mc-row');
                const gro = el('div', 'mc-gro');
                const t = el('strong', null, (c.icon || '📁') + ' ' + c.name);
                gro.appendChild(t);
                gro.appendChild(el('small', null, '/' + c.slug + ' · ' + MC.core.byCategory(c.id).length + ' páginas'));
                row.appendChild(gro);

                const bDe = el('button', 'mc-btn danger');
                bDe.type = 'button';
                bDe.textContent = 'Borrar';
                armed(bDe, function () {
                    MC.system.deleteCategory(c.id)
                        .then(function () { toast('Categoría borrada', 'ok'); self.renderCats(box); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bDe);
                box.appendChild(row);
            });
        },

        openEditor: function (id, mount) {
            const self = this;
            if (!(MC.system && MC.system.session && MC.system.session.isStaff)) { toast('Solo el Owner y los Administradores pueden editar StevsMCross.', 'error'); return; }
            let ovl = null;
            if (!mount) {
                ovl = el('div', 'mc-ovl');
                ovl.id = 'mc-editor-ovl';
                const panel = el('div', 'mc-panel');
                ovl.appendChild(panel);
                ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
                document.body.appendChild(ovl);
                mount = panel;
            }
            mount.textContent = '';
            mount.appendChild(el('h2', null, id ? 'Editar página' : 'Nueva página'));
            mount.appendChild(el('p', 'mc-sub', 'Se guarda con historial: cada edición queda registrada.'));

            if (ovl) {
                const close = el('button', 'mc-close');
                close.type = 'button';
                close.appendChild(icon('fa-xmark'));
                close.addEventListener('click', function () { closeOvl(ovl); });
                mount.appendChild(close);
            }

            const a = id ? (MC.core.arts[id] || {}) : null;

            const tpl = sel([['—', 'Elegir plantilla…']].concat(Object.keys(TEMPLATES).map(function (k) {
                return [k, TEMPLATES[k].icon + ' ' + TEMPLATES[k].label];
            })));
            const tplW = field('PLANTILLA (SOLO NUEVAS)', tpl);

            const title = document.createElement('input');
            title.type = 'text';
            title.maxLength = 120;
            title.placeholder = 'Título de la página';
            const catSel = sel([['', 'Elige categoría…']].concat(MC.core.sortedCats().map(function (c) {
                return [c.id, (c.icon || '') + ' ' + c.name];
            })));
            const typeSel = sel(TYPES, 'libre');
            const summary = document.createElement('textarea');
            summary.maxLength = 300;
            summary.placeholder = 'Resumen corto que se ve en las tarjetas (opcional)…';
            summary.style.minHeight = '60px';
            const tags = document.createElement('input');
            tags.type = 'text';
            tags.placeholder = 'separadas, por, comas';
            const cover = document.createElement('input');
            cover.type = 'text';
            cover.placeholder = 'Pega una URL https o sube una imagen…';
            const coverPrev = document.createElement('img');
            coverPrev.className = 'mc-cover-prev';
            coverPrev.style.display = 'none';
            const coverFile = document.createElement('input');
            coverFile.type = 'file';
            coverFile.accept = 'image/*';
            coverFile.style.cssText = 'color:var(--text-muted);font-size:12px';
            const body = document.createElement('textarea');
            body.className = 'mono';
            body.placeholder = 'Escribe con formato: ## títulos, **negrita**, - listas, `código`, [enlaces](https://…) y ![](imagen)…';
            const status = sel([['published', 'Publicado'], ['draft', 'Borrador']]);
            const feat = document.createElement('input');
            feat.type = 'checkbox';
            feat.style.cssText = 'width:auto;margin-right:8px;transform:scale(1.3)';

            const form = el('div', 'mc-form');
            if (!id) form.appendChild(tplW);
            form.appendChild(field('TÍTULO', title));

            const r1 = el('div', 'mc-2');
            r1.appendChild(field('CATEGORÍA', catSel));
            r1.appendChild(field('TIPO', typeSel));
            form.appendChild(r1);

            form.appendChild(field('RESUMEN', summary));
            form.appendChild(field('ETIQUETAS (MÁX 8)', tags));

            form.appendChild(field('PORTADA (URL O IMAGEN SUBIDA, HASTA 20MB)', cover));
            form.appendChild(coverPrev);
            form.appendChild(coverFile);
            form.appendChild(el('p', 'mc-hint', 'Puedes subir imágenes de hasta 20MB: se optimizan solas para que StevsMCross siga cargando rápido.'));

            form.appendChild(field('CUERPO (MARKDOWN SEGURO)', body));

            const r2 = el('div', 'mc-2');
            r2.appendChild(field('ESTADO', status));
            const featW = el('div');
            featW.appendChild(el('label', null, 'DESTACADA EN PORTADA'));
            const featRow = el('div');
            featRow.appendChild(feat);
            featRow.appendChild(document.createTextNode(' Mostrar en Destacados'));
            featRow.style.cssText = 'font:600 13px Inter,sans-serif;padding-top:8px';
            featW.appendChild(featRow);
            r2.appendChild(featW);
            form.appendChild(r2);

            if (a) {
                title.value = a.title || '';
                catSel.value = a.category || '';
                typeSel.value = a.type || 'libre';
                summary.value = a.summary || '';
                tags.value = a.tags || '';
                cover.value = a.cover || '';
                body.value = a.body || '';
                status.value = a.status === 'draft' ? 'draft' : 'published';
                feat.checked = !!a.featured;
                if (a.cover) { coverPrev.src = a.cover; coverPrev.style.display = 'block'; }
            }
            if (!catSel.value && MC.core.sortedCats().length) catSel.value = MC.core.sortedCats()[0].id;

            tpl.addEventListener('change', function () {
                const t = TEMPLATES[tpl.value];
                if (!t) return;
                if (!body.value.trim()) body.value = t.body;
                if (!title.value.trim() && t.label !== 'Página libre') title.value = '';
                typeSel.value = tpl.value;
            });

            cover.addEventListener('change', function () {
                if (safeImg(cover.value)) { coverPrev.src = cover.value; coverPrev.style.display = 'block'; }
                else { coverPrev.style.display = 'none'; }
            });

            coverFile.addEventListener('change', function () {
                const f = coverFile.files && coverFile.files[0];
                if (!f) return;
                coverFile.disabled = true;
                const finish = function (dataURI, err) {
                    coverFile.disabled = false;
                    if (err) return toast(err, 'error');
                    cover.value = dataURI;
                    coverPrev.src = dataURI;
                    coverPrev.style.display = 'block';
                    toast('Imagen lista (' + Math.round(dataURI.length / 1024) + 'KB)', 'ok');
                };
                if (MC.system && typeof MC.system.shrinkImage === 'function') {
                    MC.system.shrinkImage(f, { maxDim: 1920, targetStr: 2000000, hardStr: 9000000 }, finish);
                } else {
                    shrink(f, finish);
                }
            });

            const bSave = el('button', 'mc-btn pri');
            bSave.type = 'button';
            bSave.appendChild(icon('fa-floppy-disk'));
            bSave.appendChild(document.createTextNode(id ? ' Guardar cambios' : ' Crear página'));
            bSave.addEventListener('click', function () {
                const data = {
                    title: title.value,
                    category: catSel.value,
                    type: typeSel.value,
                    summary: summary.value,
                    tags: tags.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
                    cover: cover.value.trim(),
                    body: body.value,
                    status: status.value,
                    featured: feat.checked
                };
                if (!data.category) return toast('Elige una categoría (crea una en la pestaña Categorías).', 'error');
                bSave.disabled = true;
                MC.system.saveArticle(data, id)
                    .then(function () {
                        toast(id ? 'Cambios guardados' : '¡Página creada!', 'ok');
                        closeOvl(ovl || document.getElementById('mc-panel-ovl'));
                        closeOvl(document.getElementById('mc-editor-ovl'));
                    })
                    .catch(function (e) { toast(e.message, 'error'); bSave.disabled = false; });
            });
            form.appendChild(bSave);
            mount.appendChild(form);
        }
    };

    function safeImg(u) {
        u = String(u || '').trim();
        return /^https:\/\//i.test(u) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(u) ? u : '';
    }

    function shrink(file, cb) {
        try {
            const fr = new FileReader();
            fr.onload = function () {
                const im = new Image();
                im.onload = function () {
                    const maxW = 1920;
                    const sc = Math.min(1, maxW / im.width);
                    const cv = document.createElement('canvas');
                    cv.width = Math.round(im.width * sc);
                    cv.height = Math.round(im.height * sc);
                    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                    let out = cv.toDataURL('image/jpeg', 0.9);
                    let q = 0.9;
                    while (out.length > 9000000 && q > 0.35) {
                        q -= 0.15;
                        out = cv.toDataURL('image/jpeg', q);
                    }
                    if (out.length > 2000000) return cb(null, 'La imagen es demasiado grande incluso reescalada.');
                    cb(out, null);
                };
                im.onerror = function () { cb(null, 'Ese archivo no parece una imagen válida.'); };
                im.src = String(fr.result);
            };
            fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
            fr.readAsDataURL(file);
        } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { MC.manage.init(); });
    } else {
        MC.manage.init();
    }

    console.log('[Stevscon] mc_manage.js listo (v2) — portadas: cualquier imagen hasta 20MB, cero errores de tamaño.');
})(window, document);