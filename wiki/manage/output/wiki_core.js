/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_core.js (v1)
 * CORE: LECTURA y RENDER (nada de escritura).
 * - Portada estilo Fandom: banner, N PAGES, destacados, categorías, últimas.
 * - Artículo: meta con autor (data-scsoc-profile), portada, markdown
 *   seguro (escape PRIMERO, formato DESPUÉS), vistas e historial.
 * - Categorías y buscador. TODO con textContent (innerHTML solo para
 *   el markdown ya escapado y componentes estáticos).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};

    const db = function () { return firebase.database(); };

    /* ================= HELPERS ================= */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
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

    /* ============ MARKDOWN SEGURO (escape -> formato) ============ */
    function safeUrl(u) {
        u = String(u || '').trim();
        if (/^https:\/\//i.test(u)) return u;
        if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(u)) return u;
        return null;
    }
    function inline(md) {
        let s = esc(md);
        s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
            const ok = safeUrl(url);
            return ok ? '<img src="' + esc(ok) + '" alt="' + alt + '" loading="lazy">' : alt;
        });
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
            const ok = safeUrl(url);
            return ok ? '<a href="' + esc(ok) + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>' : txt;
        });
        return s;
    }
    function md(src) {
        const lines = String(src || '').split(/\r?\n/);
        let out = '', list = null; /* 'ul' | 'ol' | null */
        const closeList = function () { if (list) { out += '</' + list + '>'; list = null; } };
        for (let i = 0; i < lines.length; i++) {
            const L = lines[i];
            const t = L.trim();
            if (!t) { closeList(); continue; }
            if (t === '---') { closeList(); out += '<hr>'; continue; }
            if (t.indexOf('### ') === 0) { closeList(); out += '<h3>' + inline(t.slice(4)) + '</h3>'; continue; }
            if (t.indexOf('## ') === 0) { closeList(); out += '<h2>' + inline(t.slice(3)) + '</h2>'; continue; }
            if (t.indexOf('# ') === 0) { closeList(); out += '<h2>' + inline(t.slice(2)) + '</h2>'; continue; }
            if (t.indexOf('- ') === 0) {
                if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
                out += '<li>' + inline(t.slice(2)) + '</li>'; continue;
            }
            if (/^\d+\.\s/.test(t)) {
                if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; }
                out += '<li>' + inline(t.replace(/^\d+\.\s/, '')) + '</li>'; continue;
            }
            if (t.indexOf('&gt; ') === 0) { closeList(); out += '<blockquote>' + inline(t.slice(5)) + '</blockquote>'; continue; }
            closeList();
            out += '<p>' + inline(t) + '</p>';
        }
        closeList();
        return out;
    }

    /* ================= ESTADO ================= */
    WK.core = {
        cats: {}, arts: {}, pages: 0, avatars: {}, started: false,

        start: function () {
            if (this.started) return;
            this.started = true;

            const self = this;
            const fire = function () {
                clearTimeout(fire._t);
                fire._t = setTimeout(function () {
                    document.dispatchEvent(new CustomEvent('sc:wiki-data'));
                }, 150);
            };

            db().ref('wiki/categories').on('value', function (s) {
                self.cats = s.val() || {}; fire();
            }, function (err) { console.warn('[Wiki] lectura de categorías:', err && err.code); });

            db().ref('wiki/articles').on('value', function (s) {
                self.arts = s.val() || {}; fire();
            }, function (err) { console.warn('[Wiki] lectura de artículos:', err && err.code); });

            db().ref('wiki/counters/articles').on('value', function (s) {
                self.pages = Number(s.val() || 0); fire();
            }, function () {});

            db().ref('wiki/counters/edits').on('value', function (s) {
                self.edits = Number(s.val() || 0); fire();
            }, function () {});
        },

        /* ==== SLUGS / BÚSQUEDA ==== */
        slugIndex: function () {
            const map = {};
            Object.keys(this.arts).forEach(function (id) {
                const a = self(id);
                if (a && a.slug) map[String(a.slug).toLowerCase()] = id;
            });
            function self(id) { return WK.core.arts[id]; }
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
            return !!(WK.system && WK.system.session && WK.system.session.isStaff);
        },

        /* ==== AUTOR (avatar + nombre desde users/{uid}) ==== */
        avatar: function (uid) {
            if (!uid) return Promise.resolve(null);
            if (this.avatars[uid]) return Promise.resolve(this.avatars[uid]);
            const self = this;
            return db().ref('users/' + uid).once('value').then(function (s) {
                const u = s.val() || {};
                const info = {
                    name: u.username || u.handle || 'Miembro',
                    handler: u.handle ? ('@' + u.handle) : '',
                    avatarURL: u.avatarURL || ''
                };
                self.avatars[uid] = info;
                return info;
            }).catch(function () { return null; });
        },

        /* ================= BARRA DE CATEGORÍAS ================= */
        paintCatNav: function (activeSlug) {
            const nav = document.getElementById('wk-catnav');
            if (!nav) return;
            nav.textContent = '';

            const home = el('button', 'wk-chip' + (!activeSlug ? ' is-active' : ''));
            home.type = 'button';
            const hi = document.createElement('i');
            hi.className = 'fa-solid fa-house';
            home.appendChild(hi);
            home.appendChild(document.createTextNode('Inicio'));
            home.addEventListener('click', function () { location.hash = ''; WK.route(); });
            nav.appendChild(home);

            const cats = this.sortedCats();
            cats.forEach(function (c) {
                const b = el('button', 'wk-chip' + (activeSlug === c.slug ? ' is-active' : ''));
                b.type = 'button';
                if (c.icon) b.appendChild(document.createTextNode(c.icon + ' '));
                b.appendChild(document.createTextNode(c.name));
                b.addEventListener('click', function () {
                    location.hash = '#c/' + encodeURIComponent(c.slug);
                    WK.route();
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

        /* ================= VISTAS (bloques) ================= */
        typeChip: function (t) {
            const map = {
                proyecto: ['fa-rocket', 'Proyecto'],
                devlog: ['fa-pen-nib', 'Devlog'],
                easter: ['fa-egg', 'Easter egg'],
                guia: ['fa-map', 'Guía'],
                libre: ['fa-book', 'Página']
            };
            const m = map[t] || map.libre;
            const chip = el('span', 'wk-type wk-type-' + (t || 'libre'));
            const i = document.createElement('i');
            i.className = 'fa-solid ' + m[0];
            chip.appendChild(i);
            chip.appendChild(document.createTextNode(m[1]));
            return chip;
        },
        card: function (id, a) {
            const c = el('article', 'wk-card');
            c.addEventListener('click', function () {
                location.hash = '#a/' + encodeURIComponent(a.slug || id);
                WK.route();
            });

            const top = el('div', 'wk-card-top');
            top.appendChild(this.typeChip(a.type));
            if (a.featured) {
                const f = el('span', 'wk-feat');
                const fi = document.createElement('i');
                fi.className = 'fa-solid fa-star';
                f.appendChild(fi);
                f.appendChild(document.createTextNode('Destacado'));
                top.appendChild(f);
            }
            c.appendChild(top);

            c.appendChild(el('h3', null, a.title || 'Sin título'));
            if (a.summary) c.appendChild(el('p', 'wk-card-sum', a.summary));

            const meta = el('div', 'wk-card-meta');
            const cat = this.catById(a.category);
            meta.appendChild(el('span', null, (cat ? (cat.icon ? cat.icon + ' ' : '') + cat.name : 'General')));
            meta.appendChild(el('span', null, '· ' + fmtDate(a.updatedAt || a.createdAt)));
            meta.appendChild(el('span', null, '· 👁 ' + fmtNum(a.views)));
            c.appendChild(meta);
            return c;
        },
        emptyBox: function (main, icon, title, sub) {
            const box = el('div', 'wk-empty');
            const i = document.createElement('i');
            i.className = 'fa-solid ' + icon;
            box.appendChild(i);
            box.appendChild(el('h3', null, title));
            if (sub) box.appendChild(el('p', null, sub));
            main.appendChild(box);
            return box;
        },

        /* ================= PORTADA ================= */
        renderHome: function (main) {
            const self = this;

            /* Banner */
            const hero = el('section', 'wk-hero');
            const h1 = el('h1');
            h1.appendChild(document.createTextNode('Stevscon'));
            const dot = el('span', 'wk-tld', '.wiki');
            h1.appendChild(dot);
            hero.appendChild(h1);
            hero.appendChild(el('p', 'wk-hero-sub', 'Toda la Enciclopedia de Stevscon: proyectos, devlogs, easter eggs y guías, escritas por el staff.'));
            const stats = el('div', 'wk-stats');
            stats.appendChild(el('strong', null, fmtNum(this.pages || this.published().length)));
            stats.appendChild(el('span', null, 'PÁGINAS'));
            stats.appendChild(el('i', null, '·'));
            stats.appendChild(el('strong', null, String(this.sortedCats().length)));
            stats.appendChild(el('span', null, 'CATEGORÍAS'));
            hero.appendChild(stats);
            main.appendChild(hero);

            /* Sobre la wiki */
            const about = el('section', 'wk-about');
            const at = el('h2');
            const ai = document.createElement('i');
            ai.className = 'fa-solid fa-circle-info';
            at.appendChild(ai);
            at.appendChild(document.createTextNode(' Acerca de'));
            about.appendChild(at);
            about.appendChild(el('p', null, 'Esta wiki es la casa oficial de los proyectos de Stevscon: aquí anunciamos lo terminado, contamos los devlogs, escondimos easter eggs y documentamos todo lo que construye la web.'));
            main.appendChild(about);

            /* Destacados */
            const feat = this.published().filter(function (x) { return x.a.featured; })
                .sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });
            if (feat.length) {
                const sec = el('section', 'wk-sec');
                const st = el('h2');
                const si = document.createElement('i');
                si.className = 'fa-solid fa-star';
                st.appendChild(si);
                st.appendChild(document.createTextNode(' Destacados'));
                sec.appendChild(st);
                const grid = el('div', 'wk-grid');
                feat.slice(0, 6).forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
                sec.appendChild(grid);
                main.appendChild(sec);
            }

            /* Categorías */
            const cats = this.sortedCats();
            if (cats.length) {
                const sec = el('section', 'wk-sec');
                const st = el('h2');
                const si = document.createElement('i');
                si.className = 'fa-solid fa-folder-tree';
                st.appendChild(si);
                st.appendChild(document.createTextNode(' Explorar por categoría'));
                sec.appendChild(st);
                const grid = el('div', 'wk-catgrid');
                cats.forEach(function (c) {
                    const n = self.byCategory(c.id).length;
                    const card = el('button', 'wk-catcard');
                    card.type = 'button';
                    if (c.color) card.style.setProperty('--cat-color', c.color);
                    const ic = el('span', 'wk-caticon', c.icon || '📁');
                    card.appendChild(ic);
                    const tx = el('span', 'wk-catname', c.name);
                    card.appendChild(tx);
                    card.appendChild(el('span', 'wk-catcount', n + (n === 1 ? ' página' : ' páginas')));
                    card.addEventListener('click', function () {
                        location.hash = '#c/' + encodeURIComponent(c.slug);
                        WK.route();
                    });
                    grid.appendChild(card);
                });
                sec.appendChild(grid);
                main.appendChild(sec);
            }

            /* Últimas páginas */
            const latest = this.published().sort(function (a, b) { return (b.a.updatedAt || b.a.createdAt || 0) - (a.a.updatedAt || a.a.createdAt || 0); });
            if (latest.length) {
                const sec = el('section', 'wk-sec');
                const st = el('h2');
                const si = document.createElement('i');
                si.className = 'fa-solid fa-clock-rotate-left';
                st.appendChild(si);
                st.appendChild(document.createTextNode(' Últimas páginas'));
                sec.appendChild(st);
                const grid = el('div', 'wk-grid');
                latest.slice(0, 8).forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
                sec.appendChild(grid);
                main.appendChild(sec);
            } else {
                this.emptyBox(main, 'fa-feather', 'La wiki está vacía… por ahora',
                    'El staff puede crear la primera página desde el botón de edición (solo visible para staff).');
            }
        },

        /* ================= CATEGORÍA ================= */
        renderCategory: function (main, slug) {
            const c = this.catBySlug(slug);
            if (!c) return this.emptyBox(main, 'fa-folder-xmark', 'Categoría no encontrada', 'Quizá fue renombrada o borrada.');
            main.appendChild(this.catHeader(c));
            const list = this.byCategory(c.id).sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });
            if (!list.length) return this.emptyBox(main, 'fa-feather', 'Aún no hay páginas aquí', 'Vuelve pronto: esta categoría está en construcción.');
            const grid = el('div', 'wk-grid');
            list.forEach(function (x) { grid.appendChild(WK.core.card(x.id, x.a)); });
            main.appendChild(grid);
        },
        catHeader: function (c) {
            const h = el('section', 'wk-cathead');
            if (c.color) h.style.setProperty('--cat-color', c.color);
            h.appendChild(el('span', 'wk-caticon wk-big', c.icon || '📁'));
            h.appendChild(el('h1', null, c.name));
            return h;
        },

        /* ================= BUSCADOR ================= */
        renderSearch: function (main, q) {
            const self = this;
            const qq = String(q || '').trim().toLowerCase();
            const sec = el('section', 'wk-sec');
            sec.appendChild(el('h2', null, 'Resultados para “' + q + '”'));
            main.appendChild(sec);
            if (!qq) return this.emptyBox(main, 'fa-magnifying-glass', 'Escribe algo para buscar');

            const hits = this.published().filter(function (x) {
                const a = x.a;
                const blob = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.tags || '').toString() + ' ' + (a.body || '')).toLowerCase();
                return blob.indexOf(qq) !== -1;
            }).sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); });

            if (!hits.length) return this.emptyBox(main, 'fa-ghost', 'Sin resultados', 'Nadie ha escrito sobre eso todavía… ¿señal para un nuevo artículo?');
            sec.appendChild(el('p', 'wk-search-count', hits.length + (hits.length === 1 ? ' página encontrada' : ' páginas encontradas')));
            const grid = el('div', 'wk-grid');
            hits.forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
            sec.appendChild(grid);
        },

        /* ================= ARTÍCULO ================= */
        renderArticle: function (main, key) {
            const self = this;
            const hit = this.resolveArticle(key);
            if (!hit) return this.emptyBox(main, 'fa-ghost', 'Página no encontrada', 'Puede que el enlace esté roto o el artículo se haya movido.');
            const id = hit.id, a = hit.a;

            const art = el('article', 'wk-article');

            /* Meta superior */
            const top = el('div', 'wk-art-top');
            top.appendChild(this.typeChip(a.type));
            const cat = this.catById(a.category);
            if (cat) {
                const chip = el('button', 'wk-catlink');
                chip.type = 'button';
                chip.appendChild(document.createTextNode((cat.icon ? cat.icon + ' ' : '') + cat.name));
                chip.addEventListener('click', function () {
                    location.hash = '#c/' + encodeURIComponent(cat.slug);
                    WK.route();
                });
                top.appendChild(chip);
            }
            if (this.staffView()) {
                const edit = el('button', 'wk-editbtn');
                edit.type = 'button';
                const ei = document.createElement('i');
                ei.className = 'fa-solid fa-pen-to-square';
                edit.appendChild(ei);
                edit.appendChild(document.createTextNode(' Editar'));
                edit.addEventListener('click', function () {
                    if (WK.manage && WK.manage.openEditor) WK.manage.openEditor(id);
                });
                top.appendChild(edit);
            }
            art.appendChild(top);

            art.appendChild(el('h1', 'wk-art-title', a.title || 'Sin título'));
            if (a.summary) art.appendChild(el('p', 'wk-art-sum', a.summary));

            /* Autor + fecha + vistas (avatar en vivo) */
            const meta = el('div', 'wk-art-meta');
            const avWrap = el('button', 'wk-author');
            avWrap.type = 'button';
            avWrap.setAttribute('data-scsoc-profile', a.authorUid || '');
            const avatar = el('span', 'wk-avatar', 'S');
            avWrap.appendChild(avatar);
            avWrap.appendChild(el('span', 'wk-author-name', a.authorName || 'Miembro'));
            meta.appendChild(avWrap);
            meta.appendChild(el('span', 'wk-meta-sep', '·'));
            meta.appendChild(el('span', null, fmtDate(a.updatedAt || a.createdAt)));
            meta.appendChild(el('span', 'wk-meta-sep', '·'));
            meta.appendChild(el('span', null, '👁 ' + fmtNum(a.views)));
            art.appendChild(meta);

            this.avatar(a.authorUid).then(function (info) {
                if (!info) return;
                if (info.avatarURL) {
                    const im = document.createElement('img');
                    im.className = 'wk-avatar';
                    im.alt = '';
                    im.src = info.avatarURL;
                    if (avatar.parentNode) avatar.replaceWith(im);
                }
                avWrap.querySelector('.wk-author-name').textContent = info.name + (info.handler ? ' (' + info.handler + ')' : '');
            });

            /* Portada del artículo */
            const cover = safeUrl(a.cover || '');
            if (cover) {
                const cwrap = el('div', 'wk-cover');
                const im = document.createElement('img');
                im.alt = '';
                im.src = cover;
                cwrap.appendChild(im);
                art.appendChild(cwrap);
            }

            /* Cuerpo (markdown YA escapado dentro de md()) */
            const body = el('div', 'wk-body');
            body.innerHTML = md(a.body || '');
            art.appendChild(body);

            main.appendChild(art);

            /* Vistas: +1 por sesión (solo usuarios logueados; las rules lo permiten) */
            if (WK.system && WK.system.bumpViews) WK.system.bumpViews(id);

            /* Historial (como las wikis de verdad) */
            this.renderHistory(main, id);

            /* Relacionados por categoría */
            if (cat) {
                const rel = this.byCategory(cat.id).filter(function (x) { return x.id !== id; })
                    .sort(function (a, b) { return (b.a.updatedAt || 0) - (a.a.updatedAt || 0); }).slice(0, 4);
                if (rel.length) {
                    const sec = el('section', 'wk-sec');
                    sec.appendChild(el('h2', null, 'Más de ' + cat.name));
                    const grid = el('div', 'wk-grid');
                    rel.forEach(function (x) { grid.appendChild(self.card(x.id, x.a)); });
                    sec.appendChild(grid);
                    main.appendChild(sec);
                }
            }
        },

        renderHistory: function (main, id) {
            const wrap = el('section', 'wk-sec wk-hist');
            wrap.appendChild(el('h2', null, 'Historial de ediciones'));
            const listWrap = el('div', 'wk-hist-list');
            listWrap.textContent = 'Cargando…';
            wrap.appendChild(listWrap);
            main.appendChild(wrap);

            db().ref('wiki/history/' + id).limitToLast(50).once('value').then(function (s) {
                const h = s.val() || {};
                const rows = Object.keys(h).map(function (k) { return Object.assign({ _k: k }, h[k]); })
                    .sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 15);
                listWrap.textContent = '';
                if (!rows.length) {
                    listWrap.appendChild(el('p', 'wk-hist-empty', 'Sin ediciones registradas todavía.'));
                    return;
                }
                rows.forEach(function (r) {
                    const row = el('div', 'wk-hist-row');
                    const ic = document.createElement('i');
                    ic.className = 'fa-solid ' + (r.action === 'created' ? 'fa-seedling' : r.action === 'edited' ? 'fa-pen' : 'fa-clock-rotate-left');
                    row.appendChild(ic);
                    row.appendChild(el('span', 'wk-hist-txt',
                        (r.action === 'created' ? 'Creada' : 'Editada') + ' por ' + (r.byName || 'Staff')));
                    row.appendChild(el('span', 'wk-hist-date', fmtDate(r.at)));
                    listWrap.appendChild(row);
                });
            }).catch(function () {
                listWrap.textContent = '';
                listWrap.appendChild(el('p', 'wk-hist-empty', 'Historial no disponible.'));
            });
        }
    };

    console.log('[Stevscon] wiki_core.js listo (v1) — núcleo de lectura y render.');
})(window, document);