/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_subs.js (v1)
 * SUBS (CORE): sub-artículos de una página (SOLO LECTURA).
 * - Se pintan DEBAJO del artículo original, en vivo
 *   (wiki/subs/{articleId}).
 * - 3 clases:
 *     normal  -> texto con TODOS los formatos (formats.js) + imagen
 *                al lado o debajo del texto.
 *     lista   -> tabla estilo changelog: columnas con títulos
 *                personalizables + hasta 12 filas con notas con formato.
 *     galeria -> rejilla de imágenes con título/descripción + lightbox.
 * - Los botones de staff (añadir/editar/borrar) los cuelga
 *   wiki_subs_manage.js vía decorate()/attachAddBar().
 * - CSS propio inyectado aquí (mismo patrón que wiki_manage.js).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const db = function () { return firebase.database(); };

    const TYPE_META = {
        normal: { label: 'Sub-página', icon: 'fa-file-lines' },
        lista: { label: 'Lista', icon: 'fa-table-list' },
        galeria: { label: 'Galería', icon: 'fa-images' }
    };
    const DEFAULT_COLS = ['Título', 'Fecha', 'Notas', 'Etiqueta'];

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function staffView() { return !!(WK.core && WK.core.staffView && WK.core.staffView()); }
    function mdOf(s) {
        return (WK.formats && WK.formats.md) ? WK.formats.md(s) : '';
    }
    function safeOf(u) {
        return (WK.formats && WK.formats.safeUrl) ? WK.formats.safeUrl(u) : '';
    }
    function fmtDate(ts) {
        try { return new Date(Number(ts)).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch (e) { return '—'; }
    }
    function rowsOf(a) {
        let r = (a && a.rows) || [];
        if (!Array.isArray(r)) {
            r = Object.keys(r).sort(function (x, y) { return Number(x) - Number(y); }).map(function (k) { return r[k]; });
        }
        return r.filter(function (x) { return x && typeof x === 'object'; });
    }
    function colsOf(a) {
        const c = (a && a.cols) || [];
        return [0, 1, 2, 3].map(function (i) { return (c[i] ? String(c[i]) : DEFAULT_COLS[i]); });
    }

    /* ==== CSS (se inyecta una vez) ==== */
    const CSS = `
    .wk-subs{margin-top:8px}
    .wk-s-loading{color:var(--text-muted);font:600 12.5px Inter,sans-serif}
    .wk-subs-head{display:flex;align-items:center;gap:9px;margin:0 0 13px}
    .wk-subs-head h2{display:flex;align-items:center;gap:9px;font-size:17px;margin:0}
    .wk-subs-head h2 i{color:var(--purple-accent);font-size:14px}
    .wk-subs-head small{color:var(--text-muted);font:600 12px Inter,sans-serif;margin-left:auto}
    .wk-s-empty{border:1px dashed var(--border-color);border-radius:14px;padding:26px 16px;text-align:center;color:var(--text-muted);margin-bottom:14px}
    .wk-s-empty i{display:block;font-size:22px;color:var(--purple-dark);margin-bottom:8px}
    .wk-s-empty p{margin:0;font:600 12.5px Inter,sans-serif}
    .wk-sub{background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:20px 22px;margin-bottom:14px}
    .wk-sub-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:8px}
    .wk-sub-chip{display:inline-flex;align-items:center;gap:6px;font:800 9.5px Inter,sans-serif;letter-spacing:.1em;color:var(--purple-accent);background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.45);border-radius:999px;padding:3px 9px}
    .wk-sub-chip i{font-size:9px}
    .wk-sub-date{color:var(--text-muted);font:600 11px Inter,sans-serif}
    .wk-sub-title{margin:0 0 10px;font-size:19px;letter-spacing:-.01em}
    .wk-sub-side{display:flex;gap:18px;align-items:flex-start}
    .wk-sub-side .wk-sub-txt{flex:1;min-width:0}
    .wk-sub-side .wk-sub-fig{flex:0 0 38%;max-width:38%}
    .wk-sub-fig{margin:0}
    .wk-sub-fig img{width:100%;display:block;border-radius:12px;border:1px solid var(--border-color)}
    .wk-sub-below .wk-sub-fig{margin-top:12px}
    .wk-s-table{border:1px solid var(--border-color);border-radius:12px;overflow:hidden;background:var(--bg-main)}
    .wk-s-tr{display:grid;grid-template-columns:minmax(90px,.9fr) minmax(95px,.9fr) 2.6fr minmax(85px,.8fr)}
    .wk-s-tr.h{background:var(--bg-hover);font:800 10px Inter,sans-serif;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase}
    .wk-s-tr:not(.h){border-top:1px solid var(--border-color)}
    .wk-s-tr.h:not(:first-child){border-top:0}
    .wk-s-td{padding:10px 12px;font:600 12.5px Inter,sans-serif;overflow-wrap:anywhere}
    .wk-s-chip{display:inline-block;font:800 10px Inter,sans-serif;letter-spacing:.06em;background:var(--bg-hover);border:1px solid var(--border-color);border-radius:999px;padding:3px 9px;color:var(--text-muted)}
    .wk-s-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:13px}
    .wk-s-gitem{margin:0;background:var(--bg-main);border:1px solid var(--border-color);border-radius:14px;overflow:hidden}
    .wk-s-gitem img{width:100%;height:150px;object-fit:cover;display:block;cursor:zoom-in}
    .wk-s-gcap{padding:10px 12px}
    .wk-s-gcap strong{display:block;font-size:13px;margin-bottom:3px}
    .wk-s-tools{display:flex;gap:8px;margin-left:auto}
    .wk-lb{position:fixed;inset:0;z-index:5000;background:rgba(6,4,11,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:zoom-out;padding:20px}
    .wk-lb img{max-width:92vw;max-height:82vh;border-radius:14px;border:1px solid var(--border-color)}
    .wk-lb p{color:var(--text-muted);font:600 12.5px Inter,sans-serif;margin:0;max-width:80vw;text-align:center}
    @media (max-width:720px){
        .wk-sub-side{flex-direction:column}
        .wk-sub-side .wk-sub-fig{max-width:100%;flex:auto}
        .wk-s-tr{display:block;padding:6px 0}
        .wk-s-tr.h{display:none}
        .wk-s-td{padding:3px 12px}
        .wk-s-td::before{content:attr(data-col)': ';display:block;font:800 9px Inter,sans-serif;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px}
    }`;
    function injectStyles() {
        if (document.getElementById('wk-subs-style')) return;
        const st = document.createElement('style');
        st.id = 'wk-subs-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ==== PIEZAS DE RENDER ==== */
    function typeChip(t) {
        const m = TYPE_META[t] || TYPE_META.normal;
        const c = el('span', 'wk-sub-chip');
        c.appendChild(icon(m.icon));
        c.appendChild(document.createTextNode(m.label.toUpperCase()));
        return c;
    }
    function figureEl(url, cap) {
        const f = el('figure', 'wk-sub-fig');
        const im = document.createElement('img');
        im.src = url; im.alt = ''; im.loading = 'lazy';
        f.appendChild(im);
        if (cap) f.appendChild(el('figcaption', null, cap));
        return f;
    }
    function renderNormal(a) {
        const txt = el('div', 'wk-body wk-sub-txt');
        txt.innerHTML = mdOf(a.body || '');
        const img = safeOf(a.image || '');
        const fig = img ? figureEl(img, '') : null;

        if (fig && a.imagePos === 'side') {
            const row = el('div', 'wk-sub-side');
            row.appendChild(txt);
            row.appendChild(fig);
            return row;
        }
        const wrap = el('div', fig ? 'wk-sub-below' : '');
        wrap.appendChild(txt);
        if (fig) wrap.appendChild(fig);
        return wrap;
    }
    function td(col, txt) {
        const c = el('div', 'wk-s-td', txt);
        c.setAttribute('data-col', col);
        return c;
    }
    function renderLista(a) {
        const cols = colsOf(a);
        const tbl = el('div', 'wk-s-table');
        const head = el('div', 'wk-s-tr h');
        cols.forEach(function (c) { head.appendChild(el('div', 'wk-s-td', c)); });
        tbl.appendChild(head);

        rowsOf(a).forEach(function (r) {
            const tr = el('div', 'wk-s-tr');
            tr.appendChild(td(cols[0], r.t || '—'));
            tr.appendChild(td(cols[1], r.d || '—'));
            const notes = el('div', 'wk-s-td n');
            notes.setAttribute('data-col', cols[2]);
            const inner = el('div', 'wk-body');
            inner.innerHTML = mdOf(r.n || '');
            notes.appendChild(inner);
            tr.appendChild(notes);
            const xcell = el('div', 'wk-s-td');
            xcell.setAttribute('data-col', cols[3]);
            if (r.x) xcell.appendChild(el('span', 'wk-s-chip', r.x));
            else xcell.textContent = '—';
            tr.appendChild(xcell);
            tbl.appendChild(tr);
        });
        return tbl;
    }
    function renderGaleria(a) {
        const grid = el('div', 'wk-s-gal');
        rowsOf(a).forEach(function (r) {
            const it = el('figure', 'wk-s-gitem');
            const url = safeOf(r.i || '');
            if (url) {
                const im = document.createElement('img');
                im.src = url; im.alt = r.t || ''; im.loading = 'lazy';
                im.addEventListener('click', function () { lightbox(url, r.t || '', r.n || ''); });
                it.appendChild(im);
            }
            const cap = el('figcaption', 'wk-s-gcap');
            if (r.t) cap.appendChild(el('strong', null, r.t));
            if (r.n) {
                const d = el('div', 'wk-body');
                d.innerHTML = mdOf(r.n || '');
                cap.appendChild(d);
            }
            it.appendChild(cap);
            grid.appendChild(it);
        });
        return grid;
    }
    function lightbox(url, title, desc) {
        const ov = el('div', 'wk-lb');
        const im = document.createElement('img');
        im.src = url; im.alt = '';
        ov.appendChild(im);
        if (title || desc) ov.appendChild(el('p', null, (title ? title + (desc ? ' — ' : '') : '') + desc));
        ov.addEventListener('click', function () { if (ov.parentNode) ov.parentNode.removeChild(ov); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key !== 'Escape') return;
            if (ov.parentNode) ov.parentNode.removeChild(ov);
            document.removeEventListener('keydown', esc);
        });
        document.body.appendChild(ov);
    }

    /* ==== NÚCLEO ==== */
    WK.subs = {
        _refs: [],

        mount: function (main, articleId) {
            injectStyles();
            this.detachAll();
            const self = this;
            const ref = db().ref('wiki/subs/' + articleId);
            const sec = el('section', 'wk-sec wk-subs');
            sec.appendChild(el('p', 'wk-s-loading', 'Cargando sub-páginas…'));
            main.appendChild(sec);

            function dead() {
                try { ref.off('value', cb); } catch (e) {}
            }
            const cb = ref.on('value', function (s) {
                if (!sec.isConnected) return dead();
                self.paint(sec, s.val() || {}, articleId);
            }, function () {
                if (!sec.isConnected) return dead();
                self.paint(sec, {}, articleId);
            });
            this._refs.push({ ref: ref, cb: cb });
        },

        detachAll: function () {
            this._refs.forEach(function (r) { try { r.ref.off('value', r.cb); } catch (e) {} });
            this._refs = [];
        },

        paint: function (sec, data, articleId) {
            const self = this;
            sec.textContent = '';
            const staff = staffView();
            const ids = Object.keys(data).sort(function (x, y) {
                const a = data[x] || {}, b = data[y] || {};
                return (a.order || a.createdAt || 0) - (b.order || b.createdAt || 0);
            });

            /* Si no hay nada y no es staff: la sección no existe para el visitante */
            if (!ids.length && !staff) return;

            const head = el('div', 'wk-subs-head');
            const h2 = el('h2');
            h2.appendChild(icon('fa-layer-group'));
            h2.appendChild(document.createTextNode(' Sub-páginas'));
            head.appendChild(h2);
            if (ids.length) head.appendChild(el('small', null, ids.length + (ids.length === 1 ? ' sub-página' : ' sub-páginas')));
            sec.appendChild(head);

            if (!ids.length) {
                const empty = el('div', 'wk-s-empty');
                empty.appendChild(icon('fa-layer-group'));
                empty.appendChild(el('p', null, 'Todavía no hay sub-páginas en este artículo.'));
                sec.appendChild(empty);
            }

            ids.forEach(function (id) {
                sec.appendChild(self.subCard(articleId, id, data[id] || {}));
            });

            /* Botón de añadir (solo staff; lo cuelga wiki_subs_manage.js) */
            if (staff && WK.subsManage && WK.subsManage.attachAddBar) {
                WK.subsManage.attachAddBar(sec, articleId);
            }
        },

        subCard: function (articleId, subId, a) {
            const card = el('article', 'wk-sub');
            const top = el('div', 'wk-sub-top');
            top.appendChild(typeChip(a.type));
            top.appendChild(el('span', 'wk-sub-date', '· ' + fmtDate(a.updatedAt || a.createdAt)));
            card.appendChild(top);
            if (a.title) card.appendChild(el('h3', 'wk-sub-title', a.title));

            if (a.type === 'lista') card.appendChild(renderLista(a));
            else if (a.type === 'galeria') card.appendChild(renderGaleria(a));
            else card.appendChild(renderNormal(a));

            if (staffView() && WK.subsManage && WK.subsManage.decorate) {
                WK.subsManage.decorate(card, articleId, subId, a);
            }
            return card;
        }
    };

    console.log('[Stevscon] wiki_subs.js listo (v1) — sub-artículos: normal, lista y galería.');
})(window, document);