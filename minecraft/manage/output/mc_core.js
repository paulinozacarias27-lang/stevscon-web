/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_core.js (v2)
 * CORE: LECTURA y RENDER (nada de escritura, salvo el contador de vistas).
 *
 * - Portada estilo Fandom: banner, N PÁGINAS, destacados, categorías,
 *   últimas páginas. Página: meta con autor (data-scsoc-profile),
 *   portada, cuerpo, vistas e historial.
 * - Categorías y buscador. TODO con textContent (innerHTML solo para
 *   el markdown ya escapado por mc_formats.js).
 * - Escucha mc/pages, mc/categories, mc/subcats y mc/home en Firebase
 *   y dispara sc:mc-data en cada cambio en vivo.
 * - Las CATEGORÍAS SON DATOS (mc/categories), no files: Inicio,
 *   Cómo entrar, Economía, Tienda, StevsXP, Reglas, Guías, Descargas.
 * - MC.DISCORD_URL es el link PRINCIPAL de Discord para entrar al
 *   servidor (nunca se publica la IP del servidor de Minecraft).
 * - renderCategory pinta la TIENDA cuando existe MC.store; si no,
 *   cae al render normal de categoría.
 * - renderPage delega en renderArticle (mc_page.js llama renderPage).
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};

    MC.DISCORD_URL = 'https://discord.gg/TJMXjM5kdE';

    const db = function () { return firebase.database(); };
    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    function fmtDate(ts) {
        const n = Number(ts);
        if (!n) return '—';
        try {
            return new Date(n).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return '—'; }
    }
    function fmtNum(n) { return Number(n || 0).toLocaleString('es'); }
    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function localInline(s) {
        let h = esc(s);
        h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        h = h.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
            const ok = safeUrlAny(url);
            return ok ? '<img src="' + ok + '" alt="' + alt + '" loading="lazy">' : alt;
        });
        h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
            const ok = safeUrlAny(url);
            return ok ? '<a href="' + ok + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>' : txt;
        });
        return h;
    }
    function localMd(src) {
        const lines = String(src || '').split(/\r?\n/);
        let out = '', list = null;
        const closeList = function () { if (list) { out += '</' + list + '>'; list = null; } };
        for (let i = 0; i < lines.length; i++) {
            const L = lines[i];
            const t = L.trim();
            if (!t) { closeList(); continue; }
            if (t === '---') { closeList(); out += '<hr>'; continue; }
            if (t.indexOf('### ') === 0) { closeList(); out += '<h3>' + localInline(t.slice(4)) + '</h3>'; continue; }
            if (t.indexOf('## ') === 0) { closeList(); out += '<h2>' + localInline(t.slice(3)) + '</h2>'; continue; }
            if (t.indexOf('# ') === 0) { closeList(); out += '<h2>' + localInline(t.slice(2)) + '</h2>'; continue; }
            if (t.indexOf('- ') === 0) {
                if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
                out += '<li>' + localInline(t.slice(2)) + '</li>'; continue;
            }
            if (t.indexOf('&gt; ') === 0) { closeList(); out += '<blockquote>' + localInline(t.slice(5)) + '</blockquote>'; continue; }
            closeList();
            out += '<p>' + localInline(t) + '</p>';
        }
        closeList();
        return out;
    }
    function renderMd(src) {
        if (MC.formats && typeof MC.formats.md === 'function') {
            try { return MC.formats.md(src); } catch (e) {}
        }
        return localMd(src);
    }
    function enhanceBody(box) {
        if (MC.formats && typeof MC.formats.enhance === 'function') {
            try { MC.formats.enhance(box); } catch (e) {}
        }
    }
    function safeUrlAny(u) {
        if (MC.formats && typeof MC.formats.safeUrl === 'function') {
            try { return MC.formats.safeUrl(u) || ''; } catch (e) {}
        }
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }

    MC.core = {
        cats: {}, arts: {}, subcatsMap: {}, homeMap: {}, pages: 0, edits: 0, avatars: {}, started: false,

        start: function () {
            if (this.started) return;
            this.started = true;

            const self = this;
            const fire = function () {
                clearTimeout(fire._t);
                fire._t = setTimeout(function () {
                    document.dispatchEvent(new CustomEvent('sc:mc-data'));
                }, 150);
            };

            db().ref('mc/categories').on('value', function (s) {
                self.cats = s.val() || {}; fire();
            }, function (err) { console.warn('[StevsMCross] lectura de categorías:', err && err.code); });

            db().ref('mc/pages').on('value', function (s) {
                self.arts = s.val() || {}; fire();
            }, function (err) { console.warn('[StevsMCross] lectura de páginas:', err && err.code); });

            db().ref('mc/subcats').on('value', function (s) {
                self.subcatsMap = s.val() || {}; fire();
            }, function (err) { console.warn('[StevsMCross] lectura de sub-categorías:', err && err.code); });

            db().ref('mc/home').on('value', function (s) {
                self.homeMap = s.val() || {}; fire();
            }, function (err) { console.warn('[StevsMCross] lectura del inicio:', err && err.code); });

            db().ref('mc/counters/articles').on('value', function (s) {
                self.pages = Number(s.val() || 0); fire();
            }, function () {});

            db().ref('mc/counters/edits').on('value', function (s) {
                self.edits = Number(s.val() || 0); fire();
            }, function () {});
        },

        slugIndex: function () {
            const map = {};
            Object.keys(this.arts).forEach(function (id) {
                const a = self(id);
                if (a && a.slug) map[String(a.slug).toLowerCase()] = id;
            });
            function self(id) { return MC.core.arts[id]; }
            return map;
        },
        resolveArticle: function (key) {
            if (this.arts[key]) return { id: key, a: this.arts[key] };
            const map = this.slugIndex();
            const id = map[String(key).toLowerCase()];
            if (id && this.arts[id]) return { id: id, a: this.arts[id] };
            return null;
        },
        published: function () {
            const out = [];
            const arts = this.arts;
            Object.keys(arts).forEach(function (id) {
                if (arts[id] && arts[id].status !== 'draft') out.push({ id: id, a: arts[id] });
            });
            return out;
        },
        byCategory: function (catId) {
            return this.published().filter(function (x) { return x.a.category === catId; });
        },
        staffView: function () {
            return !!(MC.system && MC.system.session && MC.system.session.isStaff);
        },

        avatar: function (uid) {
            if (!uid) return Promise.resolve(null);
            if (this.avatars[uid]) return Promise.resolve(this.avatars[uid]);
            const self = this;
            return db().ref('users/' + uid).once('value').then(function (s) {
                const u = s.val() || {};
                const p = (u.profile && typeof u.profile === 'object') ? u.profile : {};
                const hd = String(u.handler || u.handle || p.handler || p.handle || '').replace(/^@/, '');
                const info = {
                    name: u.username || p.username || u.name || p.name || u.handle || 'Miembro',
                    handler: hd ? ('@' + hd) : '',
                    avatarURL: p.avatarUrl || p.avatar || u.avatarUrl || u.avatar || ''
                };
                self.avatars[uid] = info;
                return info;
            }).catch(function () { return null; });
        },

        bumpViews: function (id) {
            if (!id) return;
            if (MC.system && typeof MC.system.bumpViews === 'function') {
                try { MC.system.bumpViews(id); return; } catch (e) {}
            }
            try {
                db().ref('mc/pages/' + id + '/views').transaction(function (v) {
                    return Number(v || 0) + 1;
                }).catch(function () {});
            } catch (e) {}
        },

        paintCatNav: function (activeSlug) {
            const nav = document.getElementById('mc-catnav');
            if (!nav) return;
            nav.textContent = '';

            const home = el('button', 'mc-chip' + (!activeSlug ? ' is-active' : ''));
            home.type = 'button';
            const hi = document.createElement('i');
            hi.className = 'fa-solid fa-house';
            home.appendChild(hi);
            home.appendChild(document.createTextNode('Inicio'));
            home.addEventListener('click', function () { location.hash = ''; MC.route(); });
            nav.appendChild(home);

            const pagos = el('button', 'mc-chip' + (activeSlug === 'pagos' ? ' is-active' : ''));
            pagos.type = 'button';
            const pi = document.createElement('i');
            pi.className = 'fa-solid fa-hand-holding-dollar';
            pagos.appendChild(pi);
            pagos.appendChild(document.createTextNode('Pagos'));
            pagos.addEventListener('click', function () { location.hash = '#pagos'; MC.route(); });
            nav.appendChild(pagos);

            const cats = this.sortedCats();
            cats.forEach(function (c) {
                const b = el('button', 'mc-chip' + (activeSlug === c.slug ? ' is-active' : ''));
                b.type = 'button';
                if (c.icon) b.appendChild(document.createTextNode(c.icon + ' '));
                b.appendChild(document.createTextNode(c.name));
                b.addEventListener('click', function () {
                    location.hash = '#c/' + encodeURIComponent(c.slug);
                    MC.route();
                });
                nav.appendChild(b);
            });
        },
        sortedCats: function () {
            const self = this;
            return Object.keys(this.cats).map(function (id) {
                return Object.assign({ id: id }, self.cats[id]);
            }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name)); });
        },
        catById: function (id) { return this.cats[id] || null; },
        catBySlug: function (slug) {
            const found = this.sortedCats().filter(function (c) { return String(c.slug).toLowerCase() === String(slug).toLowerCase(); });
            return found[0] || null;
        },

        typeChip: function (t) {
            const map = {
                proyecto: ['fa-rocket', 'Proyecto'],
                devlog: ['fa-pen-nib', 'Devlog'],
                easter: ['fa-egg', 'Easter egg'],
                guia: ['fa-map', 'Guía'],
                libre: ['fa-book', 'Página']
            };
            const m = map[t] || map.libre;
            const chip = el('span', 'mc-type mc-type-' + (t || 'libre'));
            const i = document.createElement('i');
            i.className = 'fa-solid ' + m[0];
            chip.appendChild(i);
            chip.appendChild(document.createTextNode(m[1]));
            return chip;
        },
        card: function (id, a) {
            const c = el('article', 'mc-card');
            c.addEventListener('click', function () {
                location.hash = '#p/' + encodeURIComponent(a.slug || id);
                MC.route();
            });

            const top = el('div', 'mc-card-top');
            top.appendChild(this.typeChip(a.type));
            if (a.featured) {
                const f = el('span', 'mc-feat');
                const fi = document.createElement('i');
                fi.className = 'fa-solid fa-star';
                f.appendChild(fi);
                f.appendChild(document.createTextNode('Destacado'));
                top.appendChild(f);
            }
            c.appendChild(top);

            c.appendChild(el('h3', null, a.title || 'Sin título'));
            if (a.summary) c.appendChild(el('p', 'mc-card-sum', a.summary));

            const meta = el('div', 'mc-card-meta');
            const cat = this.catById(a.category);
            meta.appendChild(el('span', null, (cat ? (cat.icon ? cat.icon + ' ' : '') + cat.name : 'General')));
            meta.appendChild(el('span', null, '· ' + fmtDate(a.updatedAt || a.createdAt)));
            meta.appendChild(el('span', null, '· 👁 ' + fmtNum(a.views)));
            c.appendChild(meta);
            return c;
        },
        emptyBox: function (main, icon, title, sub) {
            const box = el('div', 'mc-empty');
            const i = document.createElement('i');
            i.className = 'fa-solid ' + icon;
            box.appendChild(i);
            box.appendChild(el('h3', null, title));
            if (sub) box.appendChild(el('p', null, sub));
            main.appendChild(box);
            return box;
        },

        renderHome: function (main) {
            const self = this;

            const hero = el('section', 'mc-hero');
            const h1 = el('h1');
            h1.appendChild(document.createTextNode('Stevs'));
            h1.appendChild(el('span', 'mc-tld', 'MCross'));
            hero.appendChild(h1);
            hero.appendChild(el('p', 'mc-hero-sub', 'Toda la información del servidor StevsMCross: cómo entrar, economía de XP y Rubbie, tienda con códigos, el plugin StevsXP, reglas y guías, escritas por el staff.'));
            main.appendChild(hero);

            const about = el('section', 'mc-about');
            const at = el('h2');
            const ai = document.createElement('i');
            ai.className = 'fa-solid fa-circle-info';
            at.appendChild(ai);
            at.appendChild(document.createTextNode(' Acerca de StevsMCross'));
            about.appendChild(at);
            about.appendChild(el('p', null, 'Esta es la sección oficial de StevsMCross, el servidor de Minecraft de Stevscon. Aquí se publica TODO lo del servidor: cómo entrar por Discord, la economía de XP y Rubbie, la tienda con códigos canjeables, el plugin StevsXP, las reglas, las guías y las descargas. El staff actualiza la información casi todos los días, así que vuelve seguido para no perderte nada.'));
            main.appendChild(about);

            const feat = this.published().filter(function (x) { return x.a.featured; })
                .sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });
            if (feat.length) {
                const sec = el('section', 'mc-sec');
                const st = el('h2');
                const si = document.createElement('i');
                si.className = 'fa-solid fa-star';
                st.appendChild(si);
                st.appendChild(document.createTextNode(' Destacados'));
                sec.appendChild(st);
                const grid = el('div', 'mc-grid');
                feat.slice(0, 6).forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
                sec.appendChild(grid);
                main.appendChild(sec);
            }

            const cats = this.sortedCats();
            if (cats.length) {
                const sec = el('section', 'mc-sec');
                const st = el('h2');
                const si = document.createElement('i');
                si.className = 'fa-solid fa-folder-tree';
                st.appendChild(si);
                st.appendChild(document.createTextNode(' Explorar por categoría'));
                sec.appendChild(st);
                const grid = el('div', 'mc-catgrid');
                cats.forEach(function (c) {
                    const n = self.byCategory(c.id).length;
                    const card = el('button', 'mc-catcard');
                    card.type = 'button';
                    if (c.color) card.style.setProperty('--cat-color', c.color);
                    const ic = el('span', 'mc-caticon', c.icon || '📁');
                    card.appendChild(ic);
                    const tx = el('span', 'mc-catname', c.name);
                    card.appendChild(tx);
                    card.appendChild(el('span', 'mc-catcount', n + (n === 1 ? ' página' : ' páginas')));
                    card.addEventListener('click', function () {
                        location.hash = '#c/' + encodeURIComponent(c.slug);
                        MC.route();
                    });
                    grid.appendChild(card);
                });
                sec.appendChild(grid);
                main.appendChild(sec);
            }

            const latest = this.published().sort(function (a, b) { return (b.a.updatedAt || b.a.createdAt || 0) - (a.a.updatedAt || a.a.createdAt || 0); });
            if (latest.length) {
                const sec = el('section', 'mc-sec');
                const st = el('h2');
                const si = document.createElement('i');
                si.className = 'fa-solid fa-clock-rotate-left';
                st.appendChild(si);
                st.appendChild(document.createTextNode(' Últimas páginas'));
                sec.appendChild(st);
                const grid = el('div', 'mc-grid');
                latest.slice(0, 8).forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
                sec.appendChild(grid);
                main.appendChild(sec);
            } else {
                this.emptyBox(main, 'fa-feather', 'StevsMCross está vacío... por ahora',
                    'El staff puede crear la primera página desde el botón de edición (solo visible para staff).');
            }
        },

        renderCategory: function (main, slug) {
            if (String(slug || '').toLowerCase() === 'tienda' && MC.store && typeof MC.store.render === 'function') {
                MC.store.render(main);
                return;
            }
            const c = this.catBySlug(slug);
            if (!c) return this.emptyBox(main, 'fa-folder-xmark', 'Categoría no encontrada', 'Quizá fue renombrada o borrada.');
            main.appendChild(this.catHeader(c));
            const list = this.byCategory(c.id).sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });
            if (!list.length) return this.emptyBox(main, 'fa-feather', 'Aún no hay páginas aquí', 'Vuelve pronto: esta categoría está en construcción.');
            const grid = el('div', 'mc-grid');
            list.forEach(function (x) { grid.appendChild(MC.core.card(x.id, x.a)); });
            main.appendChild(grid);
        },
        catHeader: function (c) {
            const h = el('section', 'mc-cathead');
            if (c.color) h.style.setProperty('--cat-color', c.color);
            h.appendChild(el('span', 'mc-caticon mc-big', c.icon || '📁'));
            h.appendChild(el('h1', null, c.name));
            return h;
        },

        renderSearch: function (main, q) {
            const self = this;
            const qq = String(q || '').trim().toLowerCase();
            const sec = el('section', 'mc-sec');
            sec.appendChild(el('h2', null, 'Resultados para "' + q + '"'));
            main.appendChild(sec);
            if (!qq) return this.emptyBox(main, 'fa-magnifying-glass', 'Escribe algo para buscar');

            const hits = this.published().filter(function (x) {
                const a = x.a;
                const blob = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.tags || '').toString() + ' ' + (a.body || '')).toLowerCase();
                return blob.indexOf(qq) !== -1;
            }).sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });

            if (!hits.length) return this.emptyBox(main, 'fa-ghost', 'Sin resultados', 'Nadie ha escrito sobre eso todavía... ¿señal para una página nueva?');
            sec.appendChild(el('p', 'mc-search-count', hits.length + (hits.length === 1 ? ' página encontrada' : ' páginas encontradas')));
            const grid = el('div', 'mc-grid');
            hits.forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
            sec.appendChild(grid);
        },

        renderArticle: function (main, key) {
            const self = this;
            const hit = this.resolveArticle(key);
            if (!hit) return this.emptyBox(main, 'fa-ghost', 'Página no encontrada', 'Puede que el enlace esté roto o la página se haya movido.');
            const id = hit.id, a = hit.a;

            const art = el('article', 'mc-article');

            const top = el('div', 'mc-art-top');
            top.appendChild(this.typeChip(a.type));
            const cat = this.catById(a.category);
            if (cat) {
                const chip = el('button', 'mc-catlink');
                chip.type = 'button';
                chip.appendChild(document.createTextNode((cat.icon ? cat.icon + ' ' : '') + cat.name));
                chip.addEventListener('click', function () {
                    location.hash = '#c/' + encodeURIComponent(cat.slug);
                    MC.route();
                });
                top.appendChild(chip);
            }
            if (this.staffView()) {
                const edit = el('button', 'mc-editbtn');
                edit.type = 'button';
                const ei = document.createElement('i');
                ei.className = 'fa-solid fa-pen-to-square';
                edit.appendChild(ei);
                edit.appendChild(document.createTextNode(' Editar'));
                edit.addEventListener('click', function () {
                    if (MC.manage && MC.manage.openEditor) MC.manage.openEditor(id);
                });
                top.appendChild(edit);
            }
            art.appendChild(top);

            art.appendChild(el('h1', 'mc-art-title', a.title || 'Sin título'));
            if (a.summary) art.appendChild(el('p', 'mc-art-sum', a.summary));

            const meta = el('div', 'mc-art-meta');
            const avWrap = el('button', 'mc-author');
            avWrap.type = 'button';
            avWrap.setAttribute('data-scsoc-profile', a.authorUid || '');
            const avatar = el('span', 'mc-avatar', 'S');
            const avBox = el('span');
            avBox.style.cssText = 'position:relative;display:inline-flex;flex:none;';
            avBox.appendChild(avatar);
            avWrap.appendChild(avBox);
            avWrap.appendChild(el('span', 'mc-author-name', a.authorName || 'Miembro'));
            meta.appendChild(avWrap);
            meta.appendChild(el('span', 'mc-meta-sep', '·'));
            meta.appendChild(el('span', null, fmtDate(a.updatedAt || a.createdAt)));
            meta.appendChild(el('span', 'mc-meta-sep', '·'));
            meta.appendChild(el('span', null, '👁 ' + fmtNum(a.views)));
            art.appendChild(meta);

            const ST_COLORS = { online: 'var(--mc-accent,#7fdc3a)', inactive: 'var(--gold,#f4c542)', busy: 'var(--redstone,#ff5545)', offline: '#6b7280' };
            if (a.authorUid && typeof firebase !== 'undefined' && firebase.database) {
                try {
                    const stDot = el('span');
                    stDot.style.cssText = 'position:absolute;right:-3px;bottom:-3px;width:12px;height:12px;border-radius:0;border:2px solid #000;box-shadow:2px 2px 0 rgba(0,0,0,.4);background:#6b7280;box-sizing:border-box;';
                    avBox.appendChild(stDot);
                    firebase.database().ref('users/' + a.authorUid + '/status/state').on('value', function (s) {
                        const v = String(s.val() || '');
                        stDot.style.background = ST_COLORS[v] || '#6b7280';
                    });
                } catch (e) {}
            }

            this.avatar(a.authorUid).then(function (info) {
                if (!info) return;
                if (info.avatarURL) {
                    const im = document.createElement('img');
                    im.className = 'mc-avatar';
                    im.alt = '';
                    im.src = info.avatarURL;
                    if (avatar.parentNode) avatar.replaceWith(im);
                }
                avWrap.querySelector('.mc-author-name').textContent = info.name + (info.handler ? ' (' + info.handler + ')' : '');
            });

            const cover = safeUrlAny(a.cover || '');
            if (cover) {
                const cwrap = el('div', 'mc-cover');
                const im = document.createElement('img');
                im.alt = '';
                im.src = cover;
                cwrap.appendChild(im);
                art.appendChild(cwrap);
            }

            const body = el('div', 'mc-body');
            body.innerHTML = renderMd(a.body || '');
            art.appendChild(body);

            main.appendChild(art);
            enhanceBody(body);

            this.bumpViews(id);

            if (MC.subs && typeof MC.subs.mountSection === 'function') {
                try { MC.subs.mountSection(main, id, a); } catch (e) { console.warn('[StevsMCross] subs:', e); }
            }

            this.renderHistory(main, id);

            if (cat) {
                const rel = this.byCategory(cat.id).filter(function (x) { return x.id !== id; })
                    .sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); }).slice(0, 4);
                if (rel.length) {
                    const sec = el('section', 'mc-sec');
                    sec.appendChild(el('h2', null, 'Más de ' + cat.name));
                    const grid = el('div', 'mc-grid');
                    rel.forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
                    sec.appendChild(grid);
                    main.appendChild(sec);
                }
            }
        },

        renderHistory: function (main, id) {
            const wrap = el('section', 'mc-sec mc-hist');
            wrap.appendChild(el('h2', null, 'Historial de ediciones'));
            const listWrap = el('div', 'mc-hist-list');
            listWrap.textContent = 'Cargando...';
            wrap.appendChild(listWrap);
            main.appendChild(wrap);

            db().ref('mc/history/' + id).limitToLast(50).once('value').then(function (s) {
                const h = s.val() || {};
                const rows = Object.keys(h).map(function (k) { return Object.assign({ _k: k }, h[k]); })
                    .sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 15);
                listWrap.textContent = '';
                if (!rows.length) {
                    listWrap.appendChild(el('p', 'mc-hist-empty', 'Sin ediciones registradas todavía.'));
                    return;
                }
                const ACTS = {
                    created: ['fa-seedling', 'Creada'],
                    edited: ['fa-pen', 'Editada'],
                    published: ['fa-eye', 'Publicada'],
                    drafted: ['fa-box-archive', 'Pasada a borrador'],
                    deleted: ['fa-trash-can', 'Eliminada'],
                    'sub-created': ['fa-file-circle-plus', 'Sub-página creada'],
                    'sub-edited': ['fa-file-pen', 'Sub-página editada'],
                    'sub-deleted': ['fa-file-xmark', 'Sub-página eliminada']
                };
                rows.forEach(function (r) {
                    const m = ACTS[r.action] || ACTS.edited;
                    const row = el('div', 'mc-hist-row');
                    const ic = document.createElement('i');
                    ic.className = 'fa-solid ' + m[0];
                    row.appendChild(ic);
                    row.appendChild(el('span', 'mc-hist-txt', m[1] + (r.title ? ' · ' + r.title : '') + ' — por ' + (r.byName || 'Staff')));
                    row.appendChild(el('span', 'mc-hist-date', fmtDate(r.at)));
                    listWrap.appendChild(row);
                });
            }).catch(function () {
                listWrap.textContent = '';
                listWrap.appendChild(el('p', 'mc-hist-empty', 'Historial no disponible.'));
            });
        }
    };

    MC.core.renderPage = function (main, key) {
        return MC.core.renderArticle(main, key);
    };

    console.log('[Stevscon] mc_core.js listo (v2) — lectura/render de StevsMCross.');
})(window, document);
