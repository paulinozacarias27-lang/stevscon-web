/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_subs.js (v2)
 * SUBS (RENDER): pinta las sub-páginas debajo del artículo.
 *  v2 — REHECHO:
 *    · LISTA: tabla estilo Fandom como la captura de referencia:
 *      # | Nombre | Imagen | Cómo conseguirlo | Notas | Versión.
 *      Columnas ORDENABLES al clic (▲▼), cebra, miniaturas de
 *      imagen en celdas (clic = lightbox) y notas con TODOS los
 *      formatos (formats.js).
 *    · GALERÍA: rejilla responsive con caption y lightbox con
 *      flechas + teclado (← → ESC).
 *    · NORMAL: cuerpo con formats.js + imagen al lado o debajo.
 *    · Chips de navegación con scroll suave a cada sub-página.
 *  - Lectura EN VIVO de wiki/subs/{articleId} (listener value).
 *  - Botones de staff delegan en WK.subsManage (añadir/editar/borrar).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const db = function () { return firebase.database(); };

    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    function isStaff() {
        return !!(WK.system && WK.system.session && WK.system.session.isStaff);
    }
    function toast(m, k) { if (WK.toast) WK.toast(m, k); }
    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function fa(name) {
        const i = document.createElement('i');
        i.className = 'fa-solid ' + name;
        return i;
    }

    /* ==== FORMATOS: formats.js si está, fallback mínimo propio ==== */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function localInline(s) {
        let h = esc(s);
        h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        h = h.replace(/__([^_\n]+)__/g, '<u>$1</u>');
        h = h.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
        return h;
    }
    function localMd(src) {
        const lines = String(src || '').split(/\r?\n/);
        const out = [];
        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            if (t) out.push('<p>' + localInline(t) + '</p>');
        }
        return out.join('');
    }
    function renderMd(src) {
        if (WK.formats && typeof WK.formats.md === 'function') {
            try { return WK.formats.md(src); } catch (e) {}
        }
        return localMd(src);
    }
    /* Celdas: una línea -> formats.md y quitamos el <p> envolvente */
    function cellMd(src) {
        let h = renderMd(src);
        const m = h.match(/^<p>([\s\S]*)<\/p>$/);
        if (m) h = m[1];
        return h;
    }
    function safeUrl(u) {
        if (WK.formats && typeof WK.formats.safeUrl === 'function') {
            try { return WK.formats.safeUrl(u) || ''; } catch (e) {}
        }
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function enhance(box) {
        if (WK.formats && typeof WK.formats.enhance === 'function') {
            try { WK.formats.enhance(box); } catch (e) {}
        }
    }

    const TYPES = {
        normal: ['fa-file-lines', 'Texto'],
        lista: ['fa-table-list', 'Lista'],
        galeria: ['fa-images', 'Galería']
    };
    function typeChip(t) {
        const m = TYPES[t] || TYPES.normal;
        const c = el('span', 'wk-sub-type wk-sub-type-' + (t || 'normal'));
        c.appendChild(fa(m[0]));
        c.appendChild(document.createTextNode(m[1]));
        return c;
    }

    /* ==== ESTADO ==== */
    let cur = null;                 /* { artId, sec, nav, list, ref, cb, addBtn, lastVal } */
    const sorts = {};               /* subId -> {col: -1..4, dir: 1|-1} */

    /* ==== LIGHTBOX (compartido: galería, filas con imagen, normal) ==== */
    let lb = null;
    function closeLb() {
        if (!lb) return;
        document.removeEventListener('keydown', lb.key);
        if (lb.ovl.parentNode) lb.ovl.parentNode.removeChild(lb.ovl);
        lb = null;
    }
    function lightbox(items, idx) {
        closeLb();
        if (!items || !items.length) return;
        const ovl = el('div', 'wk-lb');
        const img = document.createElement('img');
        img.alt = '';
        const cap = el('div', 'wk-lb-cap');
        const cnt = el('span', 'wk-lb-cnt');
        const prev = el('button', 'wk-lb-nav wk-lb-prev');
        prev.type = 'button';
        prev.appendChild(fa('fa-chevron-left'));
        const next = el('button', 'wk-lb-nav wk-lb-next');
        next.type = 'button';
        next.appendChild(fa('fa-chevron-right'));
        const x = el('button', 'wk-lb-x');
        x.type = 'button';
        x.appendChild(fa('fa-xmark'));

        let i = Math.min(Math.max(0, idx), items.length - 1);
        function show() {
            const it = items[i] || {};
            img.src = it.img || '';
            cap.textContent = '';
            if (it.t) cap.appendChild(el('strong', null, it.t));
            if (it.d) cap.appendChild(el('span', null, it.d));
            cnt.textContent = (i + 1) + ' / ' + items.length;
            const many = items.length > 1;
            prev.style.display = many ? '' : 'none';
            next.style.display = many ? '' : 'none';
        }
        function go(d) { i = (i + d + items.length) % items.length; show(); }

        prev.addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
        next.addEventListener('click', function (e) { e.stopPropagation(); go(1); });
        x.addEventListener('click', function (e) { e.stopPropagation(); closeLb(); });
        ovl.addEventListener('click', function (e) { if (e.target === ovl) closeLb(); });
        const key = function (e) {
            if (e.key === 'Escape') closeLb();
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
        };
        ovl.appendChild(prev);
        ovl.appendChild(img);
        ovl.appendChild(next);
        ovl.appendChild(x);
        ovl.appendChild(cnt);
        ovl.appendChild(cap);
        document.body.appendChild(ovl);
        lb = { ovl: ovl, key: key };
        document.addEventListener('keydown', key);
        show();
    }

    /* ==== MONTAJE DE LA SECCIÓN ==== */
    function mountSection(main, artId) {
        if (!main || !artId) return;
        unmount();

        const sec = el('section', 'wk-subs-sec');
        const head = el('div', 'wk-subs-head');
        const h = el('h2');
        h.appendChild(fa('fa-layer-group'));
        h.appendChild(document.createTextNode(' Sub páginas'));
        head.appendChild(h);

        const addBtn = el('button', 'wk-sub-add');
        addBtn.type = 'button';
        addBtn.appendChild(fa('fa-plus'));
        addBtn.appendChild(document.createTextNode(' Añadir sub-página'));
        addBtn.style.display = isStaff() ? '' : 'none';
        addBtn.addEventListener('click', function () {
            if (WK.subsManage && WK.subsManage.openModal) WK.subsManage.openModal(artId, null);
            else toast('Falta wiki_subs_manage.js', 'error');
        });
        head.appendChild(addBtn);

        const nav = el('div', 'wk-subs-nav');
        const list = el('div', 'wk-subs-list');
        sec.appendChild(head);
        sec.appendChild(nav);
        sec.appendChild(list);
        main.appendChild(sec);

        cur = {
            artId: artId, sec: sec, nav: nav, list: list, addBtn: addBtn,
            ref: db().ref('wiki/subs/' + artId), lastVal: null
        };
        cur.cb = function (s) { paint(s.val() || {}); };
        cur.ref.on('value', cur.cb, function () {});
    }
    function unmount() {
        if (cur && cur.ref && cur.cb) cur.ref.off('value', cur.cb);
        cur = null;
    }

    function paint(val) {
        if (!cur) return;
        if (!cur.sec.isConnected) { unmount(); return; }
        cur.lastVal = val;
        const staff = isStaff();
        cur.addBtn.style.display = staff ? '' : 'none';

        const ids = Object.keys(val).filter(function (k) { return val[k] && val[k].title; });
        ids.sort(function (a, b) { return (val[a].createdAt || 0) - (val[b].createdAt || 0); });

        cur.nav.textContent = '';
        cur.list.textContent = '';

        if (!ids.length) {
            if (!staff) {
                const p = cur.sec.parentNode;
                if (p) p.removeChild(cur.sec);
                return;
            }
            cur.nav.style.display = 'none';
            cur.list.appendChild(el('p', 'wk-sub-empty', 'Aún no hay sub-páginas: con tu cuenta de staff puedes añadir la primera con el botón de arriba.'));
            return;
        }
        cur.nav.style.display = '';
        ids.forEach(function (id) {
            const sub = val[id];
            const chip = el('button', 'wk-sub-chip');
            chip.type = 'button';
            const m = TYPES[sub.type] || TYPES.normal;
            chip.appendChild(fa(m[0]));
            chip.appendChild(document.createTextNode(sub.title));
            chip.addEventListener('click', function () {
                const t = document.getElementById('wk-sub-' + id);
                if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            cur.nav.appendChild(chip);

            cur.list.appendChild(block(id, sub, staff));
        });
    }

    function block(id, sub, staff) {
        const b = el('section', 'wk-sub wk-sub-' + (sub.type || 'normal'));
        b.id = 'wk-sub-' + id;

        const top = el('div', 'wk-sub-top');
        top.appendChild(el('h3', null, sub.title));
        top.appendChild(typeChip(sub.type));
        if (staff) {
            const acts = el('span', 'wk-sub-acts');
            const ed = el('button', 'wk-sub-btn');
            ed.type = 'button';
            ed.appendChild(fa('fa-pen'));
            ed.appendChild(document.createTextNode(' Editar'));
            ed.addEventListener('click', function () {
                if (cur && WK.subsManage && WK.subsManage.openModal) WK.subsManage.openModal(cur.artId, id);
            });
            const del = el('button', 'wk-sub-btn wk-sub-btn-del');
            del.type = 'button';
            del.appendChild(fa('fa-trash'));
            del.appendChild(document.createTextNode(' Borrar'));
            del.addEventListener('click', function () {
                if (!cur) return;
                if (!window.confirm('¿Borrar la sub-página «' + (sub.title || '') + '»? No se puede deshacer.')) return;
                WK.subsSystem.remove(cur.artId, id).then(function () {
                    toast('Sub-página borrada', 'ok');
                }).catch(function (e) {
                    toast(e && e.message ? e.message : 'No se pudo borrar.', 'error');
                });
            });
            acts.appendChild(ed);
            acts.appendChild(del);
            top.appendChild(acts);
        }
        b.appendChild(top);

        if (sub.type === 'lista') b.appendChild(listaTable(id, sub));
        else if (sub.type === 'galeria') b.appendChild(galeriaGrid(sub));
        else b.appendChild(normalBody(sub));
        return b;
    }

    /* ==== TIPO NORMAL ==== */
    function normalBody(sub) {
        const pos = sub.imgPos === 'lado' ? 'lado' : 'abajo';
        const u = safeUrl(sub.image);
        const w = el('div', 'wk-sub-normal' + (u ? ' has-img pos-' + pos : ''));
        const body = el('div', 'wk-sub-body');
        body.innerHTML = renderMd(sub.body || '');
        w.appendChild(body);
        enhance(body);
        if (u) {
            const im = document.createElement('img');
            im.className = 'wk-sub-img';
            im.src = u;
            im.alt = '';
            im.loading = 'lazy';
            im.addEventListener('click', function () {
                lightbox([{ img: u, t: sub.title || '', d: '' }], 0);
            });
            w.appendChild(im);
        }
        return w;
    }

    /* ==== TIPO LISTA: tabla ordenable estilo Fandom ==== */
    const DEF_COLS = ['Nombre', 'Imagen', 'Cómo conseguirlo', 'Notas', 'Versión'];
    function listaTable(id, sub) {
        const cols = DEF_COLS.slice();
        const cs = String(sub.colsStr || '').split('\n');
        for (let i = 0; i < DEF_COLS.length && i < cs.length; i++) {
            const c = cs[i].trim();
            if (c) cols[i] = c;
        }
        const raw = Array.isArray(sub.rows) ? sub.rows : [];
        const rows = raw.map(function (r, i) {
            r = r || {};
            return { t: r.t || '', img: r.img || '', d: r.d || '', x: r.x || '', c: r.c || '', _i: i + 1 };
        });
        const st = sorts[id] || (sorts[id] = { col: -1, dir: 1 });

        const wrap = el('div', 'wk-lt-wrap');
        const table = el('table', 'wk-lt');
        const thead = el('thead');
        const trh = el('tr');

        const arrows = [];
        function headCell(title, colIdx) {
            const th = el('th');
            const btn = el('button', 'wk-lt-sort');
            btn.type = 'button';
            btn.appendChild(document.createTextNode(title));
            const ar = el('span', 'wk-lt-arrow', '⇅');
            btn.appendChild(ar);
            arrows[colIdx + 1] = ar;
            btn.addEventListener('click', function () {
                if (st.col === colIdx) st.dir = -st.dir;
                else { st.col = colIdx; st.dir = 1; }
                paintBody();
            });
            th.appendChild(btn);
            trh.appendChild(th);
        }
        headCell('#', -1);
        for (let c = 0; c < cols.length; c++) headCell(cols[c], c);
        thead.appendChild(trh);
        table.appendChild(thead);

        const tbody = el('tbody');
        table.appendChild(tbody);
        wrap.appendChild(table);

        function imgsAll() {
            return rows.filter(function (r) { return !!r.img; })
                .map(function (r) { return { img: r.img, t: r.t, d: r.d }; });
        }
        function imgIdx(r) {
            const all = imgsAll();
            for (let i = 0; i < all.length; i++) { if (all[i].img === r.img) return i; }
            return 0;
        }
        function tdName(r) {
            const td = el('td', 'wk-lt-name');
            if (r.t) td.textContent = r.t;
            else td.appendChild(el('span', 'wk-lt-none', '—'));
            return td;
        }
        function tdImg(r) {
            const td = el('td');
            if (r.img) {
                const b = el('button', 'wk-lt-imgbtn');
                b.type = 'button';
                const im = document.createElement('img');
                im.src = r.img;
                im.alt = r.t || '';
                im.loading = 'lazy';
                b.appendChild(im);
                b.addEventListener('click', function () { lightbox(imgsAll(), imgIdx(r)); });
                td.appendChild(b);
            } else {
                td.appendChild(el('span', 'wk-lt-none', '—'));
            }
            return td;
        }
        function tdMd(text, extra) {
            const td = el('td', 'wk-lt-cell' + (extra ? ' ' + extra : ''));
            const t = String(text || '');
            if (!t) { td.appendChild(el('span', 'wk-lt-none', '—')); return td; }
            td.innerHTML = cellMd(t);
            return td;
        }
        function tdChip(c) {
            const td = el('td');
            if (c) td.appendChild(el('span', 'wk-lt-pill', c));
            else td.appendChild(el('span', 'wk-lt-none', '—'));
            return td;
        }
        function colKey(ci) {
            return ['t', 'img', 'd', 'x', 'c'][ci];
        }
        function paintBody() {
            arrows.forEach(function (ar, pos) {
                const c = pos - 1;
                ar.textContent = st.col === c ? (st.dir === 1 ? '▲' : '▼') : '⇅';
                ar.className = 'wk-lt-arrow' + (st.col === c ? ' is-on' : '');
            });
            const arr = rows.slice();
            if (st.col >= 0) {
                const key = colKey(st.col);
                arr.sort(function (a, b) {
                    const va = a[key], vb = b[key];
                    let r;
                    if (st.col === 1) {
                        r = (va ? 1 : 0) - (vb ? 1 : 0);
                        if (r === 0) r = String(va).localeCompare(String(vb));
                    } else {
                        r = String(va || '').toLowerCase().localeCompare(String(vb || '').toLowerCase(), 'es');
                    }
                    return r * st.dir;
                });
            } else {
                arr.sort(function (a, b) { return a._i - b._i; });
            }
            tbody.textContent = '';
            arr.forEach(function (r) {
                const tr = el('tr');
                tr.appendChild(el('td', 'wk-lt-num', String(r._i)));
                tr.appendChild(tdName(r));
                tr.appendChild(tdImg(r));
                tr.appendChild(tdMd(r.d, 'wk-lt-obtain'));
                tr.appendChild(tdMd(r.x, 'wk-lt-notes'));
                tr.appendChild(tdChip(r.c));
                tbody.appendChild(tr);
            });
        }
        paintBody();
        return wrap;
    }

    /* ==== TIPO GALERÍA ==== */
    function galeriaGrid(sub) {
        const raw = Array.isArray(sub.rows) ? sub.rows : [];
        const items = raw.map(function (r) {
            r = r || {};
            return { img: r.img || '', t: r.t || '', d: r.d || '' };
        }).filter(function (it) { return !!it.img; });
        const grid = el('div', 'wk-gal');
        items.forEach(function (it, i) {
            const f = el('button', 'wk-gal-it');
            f.type = 'button';
            const im = document.createElement('img');
            im.src = it.img;
            im.alt = it.t || '';
            im.loading = 'lazy';
            f.appendChild(im);
            if (it.t || it.d) {
                const cap = el('span', 'wk-gal-cap');
                if (it.t) cap.appendChild(el('strong', null, it.t));
                if (it.d) cap.appendChild(el('span', null, it.d));
                f.appendChild(cap);
            }
            f.addEventListener('click', function () { lightbox(items, i); });
            grid.appendChild(f);
        });
        return grid;
    }

    /* ==== re-pintar cuando cambie el estado de staff ==== */
    document.addEventListener('sc:wiki-auth', function () {
        if (cur && cur.lastVal) paint(cur.lastVal);
    });

    /* ==== CSS ==== */
    const CSS = [
        '.wk-subs-sec{margin:22px 0 0}',
        '.wk-subs-head{display:flex;align-items:center;gap:10px;margin:0 0 12px}',
        '.wk-subs-head h2{display:flex;align-items:center;gap:9px;font-size:17px;margin:0}',
        '.wk-subs-head h2 i{color:var(--purple-accent,#8b5cf6);font-size:14px}',
        '.wk-sub-add{margin-left:auto;display:flex;align-items:center;gap:7px;border:1.5px dashed var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.08);color:var(--purple-accent,#8b5cf6);border-radius:999px;padding:7px 15px;font:800 11.5px Inter,sans-serif;cursor:pointer;transition:.2s}',
        '.wk-sub-add:hover{background:var(--purple-accent,#8b5cf6);color:#fff}',
        '.wk-subs-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}',
        '.wk-sub-chip{display:flex;align-items:center;gap:7px;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#16121f);color:var(--text-muted,#94a3b8);border-radius:999px;padding:6px 13px;font:700 11.5px Inter,sans-serif;cursor:pointer;transition:.2s}',
        '.wk-sub-chip:hover{color:var(--text-main,#f8fafc);border-color:var(--purple-accent,#8b5cf6)}',
        '.wk-sub-chip i{font-size:10px;color:var(--purple-accent,#8b5cf6)}',
        '.wk-sub{background:var(--bg-card,#16121f);border:1px solid var(--border-color,#2e2440);border-radius:16px;padding:18px 20px;margin:0 0 14px;scroll-margin-top:80px}',
        '.wk-sub-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid var(--border-color,#2e2440)}',
        '.wk-sub-top h3{margin:0;font-size:16.5px}',
        '.wk-sub-type{display:inline-flex;align-items:center;gap:6px;font:800 9.5px Inter,sans-serif;letter-spacing:.1em;color:var(--text-muted,#94a3b8);background:var(--bg-hover,#261f36);border:1px solid var(--border-color,#2e2440);border-radius:999px;padding:3px 9px}',
        '.wk-sub-type i{font-size:9px}',
        '.wk-sub-type-lista{color:#60a5fa}.wk-sub-type-galeria{color:#f59e0b}',
        '.wk-sub-acts{margin-left:auto;display:flex;gap:7px}',
        '.wk-sub-btn{display:flex;align-items:center;gap:6px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-muted,#94a3b8);border-radius:999px;padding:4px 11px;font:700 10.5px Inter,sans-serif;cursor:pointer;transition:.2s}',
        '.wk-sub-btn:hover{color:var(--text-main,#f8fafc);border-color:var(--purple-accent,#8b5cf6)}',
        '.wk-sub-btn-del:hover{color:#f87171;border-color:#ef4444}',
        '.wk-sub-empty{color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif}',
        '.wk-sub-normal.has-img.pos-lado{display:flex;gap:16px;align-items:flex-start}',
        '.wk-sub-normal.has-img.pos-lado .wk-sub-body{flex:1;min-width:0}',
        '.wk-sub-normal.has-img.pos-lado .wk-sub-img{width:280px;flex:none}',
        '.wk-sub-normal.has-img.pos-abajo .wk-sub-img{width:100%;max-width:560px;margin:12px auto 0;display:block}',
        '.wk-sub-body{line-height:1.7;font-size:14px}',
        '.wk-sub-img{border-radius:12px;border:1px solid var(--border-color,#2e2440);cursor:zoom-in;object-fit:cover}',
        '.wk-lt-wrap{overflow-x:auto;border:1px solid var(--border-color,#2e2440);border-radius:12px}',
        '.wk-lt{width:100%;border-collapse:collapse;min-width:640px;font-size:13px}',
        '.wk-lt th{background:var(--bg-hover,#261f36);border-bottom:2px solid var(--border-color,#2e2440);padding:0;text-align:left}',
        '.wk-lt-sort{display:flex;align-items:center;gap:6px;width:100%;background:none;border:0;color:var(--text-main,#f8fafc);font:800 11.5px Inter,sans-serif;padding:10px 12px;cursor:pointer;white-space:nowrap}',
        '.wk-lt-sort:hover{color:var(--purple-accent,#8b5cf6)}',
        '.wk-lt-arrow{font-size:9px;color:var(--text-muted,#94a3b8)}',
        '.wk-lt-arrow.is-on{color:var(--purple-accent,#8b5cf6)}',
        '.wk-lt td{padding:10px 12px;border-bottom:1px solid var(--border-color,#2e2440);vertical-align:middle}',
        '.wk-lt tbody tr:nth-child(odd){background:rgba(255,255,255,.025)}',
        '.wk-lt tbody tr:hover{background:rgba(139,92,246,.07)}',
        '.wk-lt tbody tr:last-child td{border-bottom:0}',
        '.wk-lt-num{color:var(--text-muted,#94a3b8);font-weight:700;width:34px;font-size:12px}',
        '.wk-lt-name{color:#c4b5fd;font-weight:700}',
        '.wk-lt-imgbtn{background:none;border:0;padding:0;cursor:zoom-in;display:block}',
        '.wk-lt-imgbtn img{height:52px;max-width:110px;object-fit:contain;border-radius:8px;border:1px solid var(--border-color,#2e2440);background:rgba(255,255,255,.04)}',
        '.wk-lt-cell{line-height:1.55;font-weight:600;color:var(--text-muted,#94a3b8)}',
        '.wk-lt-cell strong{color:var(--text-main,#f8fafc)}',
        '.wk-lt-cell code{background:var(--bg-hover,#261f36);border:1px solid var(--border-color,#2e2440);border-radius:6px;padding:1px 5px;font-size:11.5px;color:#fbbf24}',
        '.wk-lt-notes{max-width:340px}',
        '.wk-lt-none{color:var(--text-muted,#94a3b8);opacity:.6}',
        '.wk-lt-pill{display:inline-block;background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.4);color:#c4b5fd;border-radius:999px;padding:2px 10px;font:700 10.5px Inter,sans-serif;white-space:nowrap}',
        '.wk-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}',
        '.wk-gal-it{position:relative;overflow:hidden;border-radius:12px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);padding:0;cursor:zoom-in;aspect-ratio:4/3}',
        '.wk-gal-it img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s ease}',
        '.wk-gal-it:hover{border-color:var(--purple-accent,#8b5cf6)}',
        '.wk-gal-it:hover img{transform:scale(1.06)}',
        '.wk-gal-cap{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:2px;padding:22px 10px 8px;background:linear-gradient(transparent,rgba(0,0,0,.85));text-align:left}',
        '.wk-gal-cap strong{color:#fff;font-size:12px}',
        '.wk-gal-cap span{color:rgba(255,255,255,.75);font-size:10.5px;font-weight:600}',
        '.wk-lb{position:fixed;inset:0;z-index:5000;background:rgba(5,3,10,.92);display:flex;align-items:center;justify-content:center;padding:30px}',
        '.wk-lb img{max-width:min(86vw,1000px);max-height:80vh;border-radius:14px;border:1px solid var(--border-color,#2e2440);box-shadow:0 30px 90px rgba(0,0,0,.7)}',
        '.wk-lb-cap{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;max-width:80vw;text-align:center}',
        '.wk-lb-cap strong{color:#fff;font-size:14px}',
        '.wk-lb-cap span{color:rgba(255,255,255,.7);font:600 12px Inter,sans-serif}',
        '.wk-lb-cnt{position:absolute;top:18px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.75);font:800 12px Inter,sans-serif;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:4px 12px}',
        '.wk-lb-x{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:50%;width:38px;height:38px;font-size:15px;cursor:pointer}',
        '.wk-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:50%;width:44px;height:44px;font-size:15px;cursor:pointer;transition:.2s}',
        '.wk-lb-nav:hover{background:var(--purple-accent,#8b5cf6)}',
        '.wk-lb-prev{left:18px}.wk-lb-next{right:18px}',
        '@media (max-width:720px){.wk-sub-normal.has-img.pos-lado{flex-direction:column}.wk-sub-normal.has-img.pos-lado .wk-sub-img{width:100%}}'
    ].join('\n');
    if (!document.getElementById('wk-subs-style')) {
        const st = document.createElement('style');
        st.id = 'wk-subs-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ==== API (aliases por compatibilidad) ==== */
    WK.subs = {
        mountSection: mountSection,
        mount: mountSection,
        render: mountSection,
        lightbox: lightbox
    };

    console.log('[Stevscon] wiki_subs.js listo (v2) — render de sub-páginas (tabla ordenable + galería + lightbox).');
})(window, document);