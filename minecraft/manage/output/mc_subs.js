/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_subs.js (v2)
 * SUBS (RENDER): pinta las sub-páginas debajo de la página.
 *  - LISTA: tabla estilo Fandom con las columnas # | Nombre | Imagen
 *    | Cómo conseguirlo | Notas | Versión. Columnas ORDENABLES al
 *    clic (▲▼), cebra, miniaturas de imagen en celdas (clic =
 *    lightbox) y notas con TODOS los formatos (mc_formats.js).
 *  - GALERÍA: rejilla responsive con caption y lightbox con flechas
 *    + teclado (← → ESC).
 *  - NORMAL: cuerpo con mc_formats.js + imagen al lado o debajo.
 *  - Chips de navegación con scroll suave a cada sub-página.
 *  - Lectura EN VIVO de mc/subs/{pageId} (listener value).
 *  - Botones de staff delegan en MC.subsManage (añadir/editar/borrar).
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const db = function () { return firebase.database(); };

    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    function isStaff() {
        return !!(MC.system && MC.system.session && MC.system.session.isStaff);
    }
    function toast(m, k) { if (MC.toast) MC.toast(m, k); }
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
        if (MC.formats && typeof MC.formats.md === 'function') {
            try { return MC.formats.md(src); } catch (e) {}
        }
        return localMd(src);
    }
    function cellMd(src) {
        let h = renderMd(src);
        const m = h.match(/^<p>([\s\S]*)<\/p>$/);
        if (m) h = m[1];
        return h;
    }
    function safeUrl(u) {
        if (MC.formats && typeof MC.formats.safeUrl === 'function') {
            try { return MC.formats.safeUrl(u) || ''; } catch (e) {}
        }
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function enhance(box) {
        if (MC.formats && typeof MC.formats.enhance === 'function') {
            try { MC.formats.enhance(box); } catch (e) {}
        }
    }

    const TYPES = {
        normal: ['fa-file-lines', 'Texto'],
        lista: ['fa-table-list', 'Lista'],
        galeria: ['fa-images', 'Galería']
    };
    function typeChip(t) {
        const m = TYPES[t] || TYPES.normal;
        const c = el('span', 'mc-sub-type mc-sub-type-' + (t || 'normal'));
        c.appendChild(fa(m[0]));
        c.appendChild(document.createTextNode(m[1]));
        return c;
    }

    let cur = null;
    const sorts = {};

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
        const ovl = el('div', 'mc-lb');
        const img = document.createElement('img');
        img.alt = '';
        const cap = el('div', 'mc-lb-cap');
        const cnt = el('span', 'mc-lb-cnt');
        const prev = el('button', 'mc-lb-nav mc-lb-prev');
        prev.type = 'button';
        prev.appendChild(fa('fa-chevron-left'));
        const next = el('button', 'mc-lb-nav mc-lb-next');
        next.type = 'button';
        next.appendChild(fa('fa-chevron-right'));
        const x = el('button', 'mc-lb-x');
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

    function mountSection(main, artId) {
        if (!main || !artId) return;
        unmount();

        const sec = el('section', 'mc-subs-sec');
        const head = el('div', 'mc-subs-head');
        const h = el('h2');
        h.appendChild(fa('fa-layer-group'));
        h.appendChild(document.createTextNode(' Sub páginas'));
        head.appendChild(h);

        const addBtn = el('button', 'mc-sub-add');
        addBtn.type = 'button';
        addBtn.appendChild(fa('fa-plus'));
        addBtn.appendChild(document.createTextNode(' Añadir sub-página'));
        addBtn.style.display = isStaff() ? '' : 'none';
        addBtn.addEventListener('click', function () {
            if (MC.subsManage && MC.subsManage.openModal) MC.subsManage.openModal(artId, null);
            else toast('Falta mc_subs_manage.js', 'error');
        });
        head.appendChild(addBtn);

        const nav = el('div', 'mc-subs-nav');
        const list = el('div', 'mc-subs-list');
        sec.appendChild(head);
        sec.appendChild(nav);
        sec.appendChild(list);
        main.appendChild(sec);

        cur = {
            artId: artId, sec: sec, nav: nav, list: list, addBtn: addBtn,
            ref: db().ref('mc/subs/' + artId), lastVal: null
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
            cur.list.appendChild(el('p', 'mc-sub-empty', 'Aún no hay sub-páginas: con tu cuenta de staff puedes añadir la primera con el botón de arriba.'));
            return;
        }
        cur.nav.style.display = '';
        ids.forEach(function (id) {
            const sub = val[id];
            const chip = el('button', 'mc-sub-chip');
            chip.type = 'button';
            const m = TYPES[sub.type] || TYPES.normal;
            chip.appendChild(fa(m[0]));
            chip.appendChild(document.createTextNode(sub.title));
            chip.addEventListener('click', function () {
                const t = document.getElementById('mc-sub-' + id);
                if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            cur.nav.appendChild(chip);

            cur.list.appendChild(block(id, sub, staff));
        });
    }

    function block(id, sub, staff) {
        const b = el('section', 'mc-sub mc-sub-' + (sub.type || 'normal'));
        b.id = 'mc-sub-' + id;

        const top = el('div', 'mc-sub-top');
        top.appendChild(el('h3', null, sub.title));
        top.appendChild(typeChip(sub.type));
        if (staff) {
            const acts = el('span', 'mc-sub-acts');
            const ed = el('button', 'mc-sub-btn');
            ed.type = 'button';
            ed.appendChild(fa('fa-pen'));
            ed.appendChild(document.createTextNode(' Editar'));
            ed.addEventListener('click', function () {
                if (cur && MC.subsManage && MC.subsManage.openModal) MC.subsManage.openModal(cur.artId, id);
            });
            const del = el('button', 'mc-sub-btn mc-sub-btn-del');
            del.type = 'button';
            del.appendChild(fa('fa-trash'));
            del.appendChild(document.createTextNode(' Borrar'));
            del.addEventListener('click', function () {
                if (!cur) return;
                if (!window.confirm('¿Borrar la sub-página «' + (sub.title || '') + '»? No se puede deshacer.')) return;
                MC.subsSystem.remove(cur.artId, id).then(function () {
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

    function normalBody(sub) {
        const pos = sub.imgPos === 'lado' ? 'lado' : 'abajo';
        const u = safeUrl(sub.image);
        const w = el('div', 'mc-sub-normal' + (u ? ' has-img pos-' + pos : ''));
        const body = el('div', 'mc-sub-body');
        body.innerHTML = renderMd(sub.body || '');
        w.appendChild(body);
        enhance(body);
        if (u) {
            const im = document.createElement('img');
            im.className = 'mc-sub-img';
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

        const wrap = el('div', 'mc-lt-wrap');
        const table = el('table', 'mc-lt');
        const thead = el('thead');
        const trh = el('tr');

        const arrows = [];
        function headCell(title, colIdx) {
            const th = el('th');
            const btn = el('button', 'mc-lt-sort');
            btn.type = 'button';
            btn.appendChild(document.createTextNode(title));
            const ar = el('span', 'mc-lt-arrow', '⇅');
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
            const td = el('td', 'mc-lt-name');
            if (r.t) td.textContent = r.t;
            else td.appendChild(el('span', 'mc-lt-none', '—'));
            return td;
        }
        function tdImg(r) {
            const td = el('td');
            if (r.img) {
                const b = el('button', 'mc-lt-imgbtn');
                b.type = 'button';
                const im = document.createElement('img');
                im.src = r.img;
                im.alt = r.t || '';
                im.loading = 'lazy';
                b.appendChild(im);
                b.addEventListener('click', function () { lightbox(imgsAll(), imgIdx(r)); });
                td.appendChild(b);
            } else {
                td.appendChild(el('span', 'mc-lt-none', '—'));
            }
            return td;
        }
        function tdMd(text, extra) {
            const td = el('td', 'mc-lt-cell' + (extra ? ' ' + extra : ''));
            const t = String(text || '');
            if (!t) { td.appendChild(el('span', 'mc-lt-none', '—')); return td; }
            td.innerHTML = cellMd(t);
            return td;
        }
        function tdChip(c) {
            const td = el('td');
            if (c) td.appendChild(el('span', 'mc-lt-pill', c));
            else td.appendChild(el('span', 'mc-lt-none', '—'));
            return td;
        }
        function colKey(ci) {
            return ['t', 'img', 'd', 'x', 'c'][ci];
        }
        function paintBody() {
            arrows.forEach(function (ar, pos) {
                const c = pos - 1;
                ar.textContent = st.col === c ? (st.dir === 1 ? '▲' : '▼') : '⇅';
                ar.className = 'mc-lt-arrow' + (st.col === c ? ' is-on' : '');
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
                tr.appendChild(el('td', 'mc-lt-num', String(r._i)));
                tr.appendChild(tdName(r));
                tr.appendChild(tdImg(r));
                tr.appendChild(tdMd(r.d, 'mc-lt-obtain'));
                tr.appendChild(tdMd(r.x, 'mc-lt-notes'));
                tr.appendChild(tdChip(r.c));
                tbody.appendChild(tr);
            });
        }
        paintBody();
        return wrap;
    }

    function galeriaGrid(sub) {
        const raw = Array.isArray(sub.rows) ? sub.rows : [];
        const items = raw.map(function (r) {
            r = r || {};
            return { img: r.img || '', t: r.t || '', d: r.d || '' };
        }).filter(function (it) { return !!it.img; });
        const grid = el('div', 'mc-gal');
        items.forEach(function (it, i) {
            const f = el('button', 'mc-gal-it');
            f.type = 'button';
            const im = document.createElement('img');
            im.src = it.img;
            im.alt = it.t || '';
            im.loading = 'lazy';
            f.appendChild(im);
            if (it.t || it.d) {
                const cap = el('span', 'mc-gal-cap');
                if (it.t) cap.appendChild(el('strong', null, it.t));
                if (it.d) cap.appendChild(el('span', null, it.d));
                f.appendChild(cap);
            }
            f.addEventListener('click', function () { lightbox(items, i); });
            grid.appendChild(f);
        });
        return grid;
    }

    document.addEventListener('sc:mc-auth', function () {
        if (cur && cur.lastVal) paint(cur.lastVal);
    });

    const CSS = [
        '.mc-subs-sec{margin:22px 0 0}',
        '.mc-subs-head{display:flex;align-items:center;gap:10px;margin:0 0 12px}',
        '.mc-subs-head h2{display:flex;align-items:center;gap:9px;font:400 12px var(--px-font),monospace;line-height:1.6;margin:0;text-shadow:2px 2px 0 rgba(0,0,0,.6)}',
        '.mc-subs-head h2 i{color:var(--mc-accent,#7fdc3a);font-size:14px}',
        '.mc-sub-add{margin-left:auto;display:flex;align-items:center;gap:7px;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--mc-accent,#7fdc3a);border-radius:0;padding:7px 15px;font:700 11.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:background .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-sub-add:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}',
        '.mc-sub-add:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}',
        '.mc-subs-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}',
        '.mc-sub-chip{display:flex;align-items:center;gap:7px;border:2px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);border-radius:0;padding:6px 13px;font:700 11.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:color .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-sub-chip:hover{color:var(--text-main,#eef4e6);border-color:var(--mc-accent,#7fdc3a)}',
        '.mc-sub-chip i{font-size:10px;color:var(--mc-accent,#7fdc3a)}',
        '.mc-sub{background:var(--bg-card,#181c14);border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);padding:18px 20px;margin:0 0 14px;scroll-margin-top:80px}',
        '.mc-sub-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding-bottom:10px;border-bottom:2px solid var(--border-color,#2f3626)}',
        '.mc-sub-top h3{margin:0;font:400 12px var(--px-font),monospace;line-height:1.6;text-shadow:2px 2px 0 rgba(0,0,0,.6)}',
        '.mc-sub-type{display:inline-flex;align-items:center;gap:6px;font:700 9.5px var(--ui-font),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted,#98a28c);background:var(--bg-hover,#232a1b);border:2px solid #000;border-radius:0;padding:3px 9px;box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-sub-type i{font-size:9px}',
        '.mc-sub-type-lista{color:var(--diamond,#4aedd9)}.mc-sub-type-galeria{color:var(--gold,#f4c542)}',
        '.mc-sub-acts{margin-left:auto;display:flex;gap:7px}',
        '.mc-sub-btn{display:flex;align-items:center;gap:6px;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);border-radius:0;padding:4px 11px;font:700 10.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:color .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-sub-btn:hover{color:var(--text-main,#eef4e6);border-color:var(--mc-accent,#7fdc3a)}',
        '.mc-sub-btn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}',
        '.mc-sub-btn-del:hover{color:var(--redstone,#ff5545);border-color:var(--redstone,#ff5545)}',
        '.mc-sub-empty{color:var(--text-muted,#98a28c);font:600 12.5px var(--ui-font),sans-serif;line-height:1.6}',
        '.mc-sub-normal.has-img.pos-lado{display:flex;gap:16px;align-items:flex-start}',
        '.mc-sub-normal.has-img.pos-lado .mc-sub-body{flex:1;min-width:0}',
        '.mc-sub-normal.has-img.pos-lado .mc-sub-img{width:280px;flex:none}',
        '.mc-sub-normal.has-img.pos-abajo .mc-sub-img{width:100%;max-width:560px;margin:12px auto 0;display:block}',
        '.mc-sub-body{line-height:1.7;font-size:14px;font-family:var(--ui-font),sans-serif}',
        '.mc-sub-img{border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);cursor:zoom-in;object-fit:cover}',
        '.mc-lt-wrap{overflow-x:auto;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626)}',
        '.mc-lt{width:100%;border-collapse:collapse;min-width:640px;font-size:13px;font-family:var(--ui-font),sans-serif}',
        '.mc-lt th{background:var(--bg-hover,#232a1b);border-bottom:2px solid var(--border-color,#2f3626);padding:0;text-align:left}',
        '.mc-lt-sort{display:flex;align-items:center;gap:6px;width:100%;background:none;border:0;color:var(--gold,#f4c542);font:700 11.5px var(--ui-font),sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:10px 12px;cursor:pointer;white-space:nowrap}',
        '.mc-lt-sort:hover{color:var(--mc-accent,#7fdc3a)}',
        '.mc-lt-arrow{font-size:9px;color:var(--text-muted,#98a28c)}',
        '.mc-lt-arrow.is-on{color:var(--mc-accent,#7fdc3a)}',
        '.mc-lt td{padding:10px 12px;border-bottom:2px solid var(--border-color,#2f3626);vertical-align:middle}',
        '.mc-lt tbody tr:nth-child(odd){background:rgba(255,255,255,.03)}',
        '.mc-lt tbody tr:hover{background:rgba(127,220,58,.08)}',
        '.mc-lt tbody tr:last-child td{border-bottom:0}',
        '.mc-lt-num{color:var(--text-muted,#98a28c);font-weight:700;width:34px;font-size:12px}',
        '.mc-lt-name{color:var(--mc-accent,#7fdc3a);font-weight:700}',
        '.mc-lt-imgbtn{background:none;border:0;padding:0;cursor:zoom-in;display:block}',
        '.mc-lt-imgbtn img{height:52px;max-width:110px;object-fit:contain;border-radius:0;border:2px solid #000;background:rgba(255,255,255,.04)}',
        '.mc-lt-cell{line-height:1.6;font-weight:600;color:var(--text-muted,#98a28c)}',
        '.mc-lt-cell strong{color:var(--text-main,#eef4e6)}',
        '.mc-lt-cell code{background:#0b0d09;border:2px solid #000;border-radius:0;padding:1px 5px;font-size:11.5px;color:var(--gold,#f4c542)}',
        '.mc-lt-notes{max-width:340px}',
        '.mc-lt-none{color:var(--text-muted,#98a28c);opacity:.6}',
        '.mc-lt-pill{display:inline-block;background:rgba(127,220,58,.12);border:2px solid #000;color:var(--mc-accent,#7fdc3a);border-radius:0;padding:2px 10px;font:700 10.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}',
        '.mc-gal-it{position:relative;overflow:hidden;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626),4px 4px 0 rgba(0,0,0,.4);background:var(--bg-hover,#232a1b);padding:0;cursor:zoom-in;aspect-ratio:4/3}',
        '.mc-gal-it img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s steps(3,end)}',
        '.mc-gal-it:hover{border-color:var(--mc-accent,#7fdc3a)}',
        '.mc-gal-it:hover img{transform:scale(1.06)}',
        '.mc-gal-cap{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:2px;padding:22px 10px 8px;background:rgba(10,12,8,.85);border-top:2px solid #000;text-align:left}',
        '.mc-gal-cap strong{color:#fff;font:700 12px var(--ui-font),sans-serif}',
        '.mc-gal-cap span{color:rgba(255,255,255,.75);font:600 10.5px var(--ui-font),sans-serif}',
        '.mc-lb{position:fixed;inset:0;z-index:5000;background:rgba(10,12,8,.92);display:flex;align-items:center;justify-content:center;padding:30px}',
        '.mc-lb img{max-width:min(86vw,1000px);max-height:80vh;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626),8px 8px 0 rgba(0,0,0,.5)}',
        '.mc-lb-cap{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;max-width:80vw;text-align:center;background:var(--bg-card,#181c14);border-top:3px solid #000;border-bottom:3px solid #000;padding:8px 16px}',
        '.mc-lb-cap strong{color:#fff;font:400 12px var(--px-font),monospace;line-height:1.6;text-shadow:2px 2px 0 rgba(0,0,0,.6)}',
        '.mc-lb-cap span{color:rgba(255,255,255,.7);font:600 12px var(--ui-font),sans-serif}',
        '.mc-lb-cnt{position:absolute;top:18px;left:50%;transform:translateX(-50%);color:var(--text-main,#eef4e6);font:700 12px var(--ui-font),sans-serif;background:var(--bg-card,#181c14);border:3px solid #000;border-radius:0;padding:4px 12px;box-shadow:0 0 0 2px var(--border-color,#2f3626)}',
        '.mc-lb-x{position:absolute;top:16px;right:18px;background:var(--bg-hover,#232a1b);border:3px solid #000;color:#fff;border-radius:0;width:38px;height:38px;font-size:15px;cursor:pointer;box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-lb-x:hover{background:var(--redstone,#ff5545);color:#fff}',
        '.mc-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:var(--bg-hover,#232a1b);border:3px solid #000;color:#fff;border-radius:0;width:44px;height:44px;font-size:15px;cursor:pointer;transition:background .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mc-lb-nav:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}',
        '.mc-lb-nav:active{transform:translateY(-50%) translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}',
        '.mc-lb-prev{left:18px}.mc-lb-next{right:18px}',
        '@media (max-width:720px){.mc-sub-normal.has-img.pos-lado{flex-direction:column}.mc-sub-normal.has-img.pos-lado .mc-sub-img{width:100%}}'
    ].join('\n');
    if (!document.getElementById('mc-subs-style')) {
        const st = document.createElement('style');
        st.id = 'mc-subs-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    MC.subs = {
        mountSection: mountSection,
        mount: mountSection,
        render: mountSection,
        lightbox: lightbox
    };

    console.log('[Stevscon] mc_subs.js listo (v2) — render de sub-páginas (tabla ordenable + galería + lightbox).');
})(window, document);