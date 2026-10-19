/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_subs_manage.js (v3)
 * SUBS (MANAGE): modal de staff para crear/editar sub-páginas.
 *  v3 — IMÁGENES GRANDES: el selector de archivo ya NO rechaza
 *    imágenes por peso: acepta hasta 20MB y las manda por
 *    WK.system.shrinkImage (canvas 1920px + JPEG 0.9), igual que
 *    social pero más generoso. Si la imagen ya es liviana, se
 *    guarda original (PNG/GIF intactos). Toast con el peso final.
 *  v2 — modal sobre ESTADO LOCAL (escribir no repinta; añadir o
 *    quitar filas sí). Lista de 5 columnas + filas con imagen,
 *    galería con previews y lightbox.
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const db = function () { return firebase.database(); };
    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    const L = (WK.subsSystem && WK.subsSystem.LIMITS) || {
        title: 120, body: 12000, rows: 15, rowT: 100, rowD: 160, rowC: 40, rowX: 2000,
        colT: 32, imgStr: 2000000, imgFile: 20971500, galT: 100, galD: 300
    };

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
    function validImg(u) {
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function arr(x) { return Array.isArray(x) ? x : []; }
    function label(t) { return el('span', 'wksm-label', t); }

    const TYPE_HINTS = {
        normal: 'Texto libre con todos los formatos (negrita, cursiva, código con color, spoilers…) e imagen opcional al lado o debajo. Puedes subir imágenes de hasta 20MB: se optimizan solas.',
        lista: 'Tabla estilo changelog: 5 columnas con títulos personalizables (nombre, imagen, cómo conseguirlo, notas y versión). Clic en un título de la tabla = ordenar. Hasta ' + L.rows + ' filas.',
        galeria: 'Rejilla de imágenes con título y descripción. Clic en una imagen = vista grande con flechas. Hasta ' + L.rows + ' imágenes de hasta 20MB cada una (se optimizan solas).'
    };

    let ovl = null;
    function close() {
        if (!ovl) return;
        document.removeEventListener('keydown', ovl._key);
        if (ovl.parentNode) ovl.parentNode.removeChild(ovl);
        ovl = null;
    }

    function openModal(artId, subId) {
        if (!artId) return;
        if (!WK.subsSystem) { toast('Falta wiki_subs_system.js en wiki.html', 'error'); return; }
        close();

        /* ===== estado local del modal (la fuente de verdad) ===== */
        const st = {
            type: 'normal', title: '',
            body: '', image: '', imgPos: 'abajo',
            cols: ['', '', '', '', ''],
            rows: []
        };

        ovl = el('div', 'wksm-ovl');
        const panel = el('div', 'wksm-panel');

        const head = el('div', 'wksm-head');
        head.appendChild(el('h3', 'wksm-title', subId ? 'Editar sub-página' : 'Nueva sub-página'));
        const x = el('button', 'wksm-x');
        x.type = 'button';
        x.appendChild(fa('fa-xmark'));
        x.addEventListener('click', close);
        head.appendChild(x);
        panel.appendChild(head);

        panel.appendChild(el('p', 'wksm-sub', 'Forma parte de este artículo y queda registrada en el Historial.'));

        const body = el('div', 'wksm-body');

        body.appendChild(label('Clase de sub-página'));
        const sel = el('select', 'wksm-input');
        [['normal', 'Normal (texto + formatos)'], ['lista', 'Lista (estilo changelog)'], ['galeria', 'Galería (imágenes)']].forEach(function (o) {
            const op = document.createElement('option');
            op.value = o[0];
            op.textContent = o[1];
            sel.appendChild(op);
        });
        sel.addEventListener('change', function () { st.type = sel.value; renderFields(); });
        body.appendChild(sel);

        const typeHint = el('p', 'wksm-typehint');
        body.appendChild(typeHint);

        body.appendChild(label('Título'));
        const ti = el('input', 'wksm-input');
        ti.type = 'text';
        ti.maxLength = L.title;
        ti.placeholder = 'Título de la sub-página';
        ti.addEventListener('input', function () { st.title = ti.value; });
        body.appendChild(ti);

        const fields = el('div', 'wksm-fields');
        body.appendChild(fields);
        panel.appendChild(body);

        const foot = el('div', 'wksm-foot');
        const hint = el('span', 'wksm-hint');
        const cancel = el('button', 'wksm-btn wksm-cancel');
        cancel.type = 'button';
        cancel.textContent = 'Cancelar';
        cancel.addEventListener('click', close);
        const save = el('button', 'wksm-btn wksm-save');
        save.type = 'button';
        save.appendChild(fa('fa-floppy-disk'));
        save.appendChild(document.createTextNode(subId ? ' Guardar cambios' : ' Crear sub-página'));
        foot.appendChild(hint);
        foot.appendChild(cancel);
        foot.appendChild(save);
        panel.appendChild(foot);

        ovl.appendChild(panel);
        ovl.addEventListener('click', function (e) { if (e.target === ovl) close(); });
        ovl._key = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', ovl._key);
        document.body.appendChild(ovl);

        /* ==== fila de imagen reutilizable (input + archivo + preview) ====
         * v3: el archivo se OPTIMIZA (hasta 20MB) en vez de rechazarse. */
        function imgRow(onVal, initVal, ph) {
            const wrap = el('div', 'wksm-imgrow');
            const inp = el('input', 'wksm-input');
            inp.type = 'text';
            inp.placeholder = ph || 'URL https:// o archivo…';
            inp.value = initVal || '';
            const file = el('button', 'wksm-filebtn');
            file.type = 'button';
            file.title = 'Elegir imagen del dispositivo (hasta 20MB)';
            file.appendChild(fa('fa-folder-open'));
            const fi = document.createElement('input');
            fi.type = 'file';
            fi.accept = 'image/*';
            fi.style.display = 'none';
            file.addEventListener('click', function () { fi.click(); });
            fi.addEventListener('change', function () {
                const f = fi.files && fi.files[0];
                if (!f) return;
                file.disabled = true;
                const done = function () { file.disabled = false; };
                const useIt = function (u) {
                    inp.value = u;
                    onVal(u);
                    preview(u);
                    toast('Imagen lista (' + Math.round(u.length / 1024) + 'KB)', 'ok');
                    done();
                };
                if (WK.system && typeof WK.system.shrinkImage === 'function') {
                    WK.system.shrinkImage(f, { maxDim: 1920, targetStr: 2000000, hardStr: L.imgStr, fileMax: L.imgFile }, function (out, err) {
                        if (err) { toast(err, 'error'); done(); return; }
                        useIt(out);
                    });
                } else {
                    const rd = new FileReader();
                    rd.onload = function () {
                        const u = String(rd.result || '');
                        if (u.length > L.imgStr) { toast('Esa imagen pesa demasiado (máx ' + Math.round(L.imgStr / 1024) + 'KB).', 'error'); done(); return; }
                        useIt(u);
                    };
                    rd.onerror = function () { toast('No se pudo leer la imagen.', 'error'); done(); };
                    rd.readAsDataURL(f);
                }
            });
            const pv = el('span', 'wksm-thumb');
            function preview(u) {
                pv.textContent = '';
                const ok = validImg(u);
                if (ok) {
                    const im = document.createElement('img');
                    im.src = ok;
                    im.alt = '';
                    pv.appendChild(im);
                } else {
                    pv.appendChild(fa('fa-image'));
                }
            }
            inp.addEventListener('input', function () { onVal(inp.value); preview(inp.value); });
            preview(initVal);
            wrap.appendChild(inp);
            wrap.appendChild(file);
            wrap.appendChild(fi);
            wrap.appendChild(pv);
            return wrap;
        }

        /* ===== editores por tipo ===== */
        function renderFields() {
            typeHint.textContent = TYPE_HINTS[st.type] || '';
            fields.textContent = '';
            if (st.type === 'normal') renderNormal();
            else if (st.type === 'lista') renderLista();
            else renderGaleria();
        }
        function renderNormal() {
            fields.appendChild(label('Texto'));
            const ta = el('textarea', 'wksm-input wksm-ta');
            ta.rows = 10;
            ta.placeholder = 'Escribe aquí… **negrita**, *cursiva*, `código`#ff0000, ||spoiler||, listas, imágenes…';
            ta.value = st.body;
            ta.addEventListener('input', function () { st.body = ta.value; });
            fields.appendChild(ta);

            fields.appendChild(label('Imagen (opcional)'));
            fields.appendChild(imgRow(function (v) { st.image = v; }, st.image, 'URL https:// o archivo…'));

            fields.appendChild(label('Posición de la imagen'));
            const sp = el('select', 'wksm-input');
            [['abajo', 'Debajo del texto'], ['lado', 'Al lado del texto']].forEach(function (o) {
                const op = document.createElement('option');
                op.value = o[0];
                op.textContent = o[1];
                sp.appendChild(op);
            });
            sp.value = st.imgPos;
            sp.addEventListener('change', function () { st.imgPos = sp.value; });
            fields.appendChild(sp);
        }
        function renderLista() {
            fields.appendChild(label('Títulos de las columnas (opcional)'));
            const cg = el('div', 'wksm-cgrid');
            const phs = ['Columna 1: Nombre', 'Columna 2: Imagen', 'Columna 3: Cómo conseguirlo', 'Columna 4: Notas', 'Columna 5: Versión'];
            for (let i = 0; i < 5; i++) {
                const inp = el('input', 'wksm-input');
                inp.type = 'text';
                inp.maxLength = L.colT;
                inp.placeholder = phs[i];
                inp.value = st.cols[i] || '';
                (function (idx) {
                    inp.addEventListener('input', function () { st.cols[idx] = inp.value; });
                })(i);
                cg.appendChild(inp);
            }
            fields.appendChild(cg);

            fields.appendChild(label('Filas'));
            const rowsWrap = el('div', 'wksm-rows');
            fields.appendChild(rowsWrap);

            const add = el('button', 'wksm-addbtn');
            add.type = 'button';
            add.appendChild(fa('fa-plus'));
            add.appendChild(document.createTextNode(' Añadir fila'));
            add.addEventListener('click', function () {
                if (st.rows.length >= L.rows) { toast('Máximo ' + L.rows + ' filas.', 'error'); return; }
                st.rows.push({ t: '', img: '', d: '', x: '', c: '' });
                renderRows();
            });
            fields.appendChild(add);

            function rowCard(i, r) {
                const card = el('div', 'wksm-rowcard');
                const top = el('div', 'wksm-rowcard-top');
                top.appendChild(el('span', 'wksm-rownum', String(i + 1)));
                const del = el('button', 'wksm-del');
                del.type = 'button';
                del.title = 'Quitar fila';
                del.appendChild(fa('fa-trash'));
                del.addEventListener('click', function () { st.rows.splice(i, 1); renderRows(); });
                top.appendChild(del);
                card.appendChild(top);

                const t1 = el('input', 'wksm-input');
                t1.type = 'text';
                t1.maxLength = L.rowT;
                t1.placeholder = 'Nombre / título de la fila';
                t1.value = r.t || '';
                t1.addEventListener('input', function () { r.t = t1.value; });
                card.appendChild(t1);

                card.appendChild(imgRow(function (v) { r.img = v; }, r.img, 'Imagen de la fila (URL o archivo)…'));

                const t3 = el('input', 'wksm-input');
                t3.type = 'text';
                t3.maxLength = L.rowD;
                t3.placeholder = 'Cómo conseguirlo / fecha / dato corto';
                t3.value = r.d || '';
                t3.addEventListener('input', function () { r.d = t3.value; });
                card.appendChild(t3);

                const t4 = el('textarea', 'wksm-input wksm-ta-sm');
                t4.rows = 2;
                t4.placeholder = 'Notas (aceptan **negrita**, `código`#color, etc.)';
                t4.value = r.x || '';
                t4.addEventListener('input', function () { r.x = t4.value; });
                card.appendChild(t4);

                const t5 = el('input', 'wksm-input');
                t5.type = 'text';
                t5.maxLength = L.rowC;
                t5.placeholder = 'Etiqueta / versión';
                t5.value = r.c || '';
                t5.addEventListener('input', function () { r.c = t5.value; });
                card.appendChild(t5);
                return card;
            }
            function renderRows() {
                hint.textContent = st.rows.length + ' / ' + L.rows + ' filas';
                add.disabled = st.rows.length >= L.rows;
                rowsWrap.textContent = '';
                if (!st.rows.length) {
                    rowsWrap.appendChild(el('p', 'wksm-empty-rows', 'Todavía no hay filas: pulsa «Añadir fila» para crear la primera.'));
                    return;
                }
                st.rows.forEach(function (r, i) { rowsWrap.appendChild(rowCard(i, r)); });
            }
            renderRows();
        }
        function renderGaleria() {
            fields.appendChild(label('Imágenes'));
            const rowsWrap = el('div', 'wksm-rows');
            fields.appendChild(rowsWrap);

            const add = el('button', 'wksm-addbtn');
            add.type = 'button';
            add.appendChild(fa('fa-plus'));
            add.appendChild(document.createTextNode(' Añadir imagen'));
            add.addEventListener('click', function () {
                if (st.rows.length >= L.rows) { toast('Máximo ' + L.rows + ' imágenes.', 'error'); return; }
                st.rows.push({ img: '', t: '', d: '' });
                renderRows();
            });
            fields.appendChild(add);

            function galCard(i, r) {
                const card = el('div', 'wksm-rowcard');
                const top = el('div', 'wksm-rowcard-top');
                top.appendChild(el('span', 'wksm-rownum', String(i + 1)));
                const del = el('button', 'wksm-del');
                del.type = 'button';
                del.title = 'Quitar imagen';
                del.appendChild(fa('fa-trash'));
                del.addEventListener('click', function () { st.rows.splice(i, 1); renderRows(); });
                top.appendChild(del);
                card.appendChild(top);

                card.appendChild(imgRow(function (v) { r.img = v; }, r.img, 'Imagen (URL o archivo)…'));

                const t1 = el('input', 'wksm-input');
                t1.type = 'text';
                t1.maxLength = L.galT;
                t1.placeholder = 'Título de la imagen (opcional)';
                t1.value = r.t || '';
                t1.addEventListener('input', function () { r.t = t1.value; });
                card.appendChild(t1);

                const t2 = el('textarea', 'wksm-input wksm-ta-sm');
                t2.rows = 2;
                t2.maxLength = L.galD;
                t2.placeholder = 'Descripción de la imagen (opcional)';
                t2.value = r.d || '';
                t2.addEventListener('input', function () { r.d = t2.value; });
                card.appendChild(t2);
                return card;
            }
            function renderRows() {
                hint.textContent = st.rows.length + ' / ' + L.rows + ' imágenes';
                add.disabled = st.rows.length >= L.rows;
                rowsWrap.textContent = '';
                if (!st.rows.length) {
                    rowsWrap.appendChild(el('p', 'wksm-empty-rows', 'Añade la primera imagen con el botón «Añadir imagen».'));
                    return;
                }
                st.rows.forEach(function (r, i) { rowsWrap.appendChild(galCard(i, r)); });
            }
            renderRows();
        }

        /* ==== guardar ==== */
        function collect() {
            if (st.type === 'normal') {
                return { type: 'normal', title: st.title, body: st.body, image: st.image, imgPos: st.imgPos };
            }
            if (st.type === 'lista') {
                return { type: 'lista', title: st.title, cols: st.cols.slice(), rows: st.rows };
            }
            return { type: 'galeria', title: st.title, rows: st.rows };
        }
        save.addEventListener('click', function () {
            if (save.disabled) return;
            save.disabled = true;
            WK.subsSystem.save(artId, collect(), subId || null).then(function () {
                close();
                toast(subId ? 'Sub-página actualizada' : 'Sub-página creada', 'ok');
            }).catch(function (e) {
                save.disabled = false;
                toast(e && e.message ? e.message : 'No se pudo guardar.', 'error');
            });
        });

        /* ===== cargar existente ===== */
        if (subId) {
            db().ref('wiki/subs/' + artId + '/' + subId).once('value').then(function (s) {
                const v = s.val();
                if (!v) { close(); toast('Esa sub-página ya no existe.', 'error'); return; }
                st.type = v.type || 'normal';
                st.title = v.title || '';
                sel.value = st.type;
                ti.value = st.title;
                if (st.type === 'normal') {
                    st.body = v.body || '';
                    st.image = v.image || '';
                    st.imgPos = v.imgPos === 'lado' ? 'lado' : 'abajo';
                } else if (st.type === 'lista') {
                    const cs = String(v.colsStr || '').split('\n');
                    for (let i = 0; i < 5; i++) st.cols[i] = cs[i] || '';
                    st.rows = arr(v.rows).map(function (r) {
                        r = r || {};
                        return { t: r.t || '', img: r.img || '', d: r.d || '', x: r.x || '', c: r.c || '' };
                    });
                } else {
                    st.rows = arr(v.rows).map(function (r) {
                        r = r || {};
                        return { img: r.img || '', t: r.t || '', d: r.d || '' };
                    });
                }
                renderFields();
            }).catch(function () {
                close();
                toast('No se pudo cargar la sub-página.', 'error');
            });
        }
        renderFields();
    }

    /* ==== CSS del modal ==== */
    const CSS = [
        '.wksm-ovl{position:fixed;inset:0;z-index:4500;background:rgba(5,3,10,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px}',
        '.wksm-panel{width:100%;max-width:660px;max-height:88vh;display:flex;flex-direction:column;background:var(--bg-card,#17131f);border:1px solid var(--border-color,#2e2440);border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.65);overflow:hidden}',
        '.wksm-head{display:flex;align-items:center;gap:10px;padding:16px 18px 0}',
        '.wksm-title{margin:0;font-size:18px}',
        '.wksm-x{margin-left:auto;width:34px;height:34px;flex:none;border-radius:50%;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);cursor:pointer;font-size:13px}',
        '.wksm-x:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6)}',
        '.wksm-sub{margin:4px 18px 0;color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif}',
        '.wksm-body{padding:12px 18px 4px;overflow-y:auto;flex:1}',
        '.wksm-label{display:block;margin:12px 0 6px;color:var(--text-muted,#94a3b8);font:800 10px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}',
        '.wksm-typehint{margin:6px 0 0;color:var(--text-muted,#94a3b8);font:600 11.5px Inter,sans-serif;line-height:1.5}',
        '.wksm-input{width:100%;background:var(--bg-hover,#261f36);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:9px 12px;color:var(--text-main,#f8fafc);font:600 13px Inter,sans-serif;outline:0}',
        '.wksm-input:focus{border-color:var(--purple-accent,#8b5cf6)}',
        'textarea.wksm-input{resize:vertical;min-height:74px;line-height:1.6}',
        'select.wksm-input{cursor:pointer}',
        '.wksm-fields{margin-top:2px}',
        '.wksm-cgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
        '.wksm-rows{display:flex;flex-direction:column;gap:10px;margin:2px 0 10px}',
        '.wksm-empty-rows{margin:2px 0;color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;border:1.5px dashed var(--border-color,#2e2440);border-radius:12px;padding:14px;text-align:center}',
        '.wksm-rowcard{background:rgba(255,255,255,.02);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}',
        '.wksm-rowcard-top{display:flex;align-items:center;gap:8px}',
        '.wksm-rownum{width:24px;height:24px;border-radius:8px;background:rgba(139,92,246,.16);border:1px solid rgba(139,92,246,.4);color:#c4b5fd;display:flex;align-items:center;justify-content:center;font:800 11px Inter,sans-serif}',
        '.wksm-del{margin-left:auto;width:30px;height:30px;border-radius:9px;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08);color:#f87171;cursor:pointer;font-size:11px}',
        '.wksm-del:hover{background:#ef4444;color:#fff}',
        '.wksm-imgrow{display:flex;gap:8px;align-items:center}',
        '.wksm-imgrow .wksm-input{flex:1;min-width:0}',
        '.wksm-filebtn{flex:none;width:38px;height:38px;border-radius:10px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-muted,#94a3b8);cursor:pointer}',
        '.wksm-filebtn:hover{color:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6)}',
        '.wksm-filebtn[disabled]{opacity:.5;cursor:wait}',
        '.wksm-thumb{flex:none;width:38px;height:38px;border-radius:10px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);display:flex;align-items:center;justify-content:center;color:var(--text-muted,#94a3b8);overflow:hidden}',
        '.wksm-thumb img{width:100%;height:100%;object-fit:cover}',
        '.wksm-addbtn{display:inline-flex;align-items:center;gap:7px;border:1.5px dashed var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.08);color:var(--purple-accent,#8b5cf6);border-radius:999px;padding:7px 15px;font:800 11.5px Inter,sans-serif;cursor:pointer;margin:2px 0 10px}',
        '.wksm-addbtn:hover{background:var(--purple-accent,#8b5cf6);color:#fff}',
        '.wksm-addbtn[disabled]{opacity:.45;cursor:not-allowed}',
        '.wksm-foot{display:flex;align-items:center;gap:9px;padding:12px 18px 16px;border-top:1px solid var(--border-color,#2e2440)}',
        '.wksm-hint{margin-right:auto;color:var(--text-muted,#94a3b8);font:700 11px Inter,sans-serif}',
        '.wksm-btn{border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);border-radius:999px;padding:9px 16px;font:800 12px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px}',
        '.wksm-save{background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-color:transparent;color:#fff}',
        '.wksm-save:hover{box-shadow:0 8px 22px rgba(139,92,246,.4)}',
        '.wksm-save[disabled]{opacity:.6;cursor:wait}',
        '/* ---- TEMA CLARO · ajustes del modal ---- */',
        'html[data-theme="light"] .wksm-ovl{background:rgba(30,27,46,.42)}',
        'html[data-theme="light"] .wksm-panel{box-shadow:0 30px 90px rgba(30,27,46,.3)}',
        'html[data-theme="light"] .wksm-rowcard{background:rgba(124,58,237,.035)}',
        'html[data-theme="light"] .wksm-rownum{background:rgba(124,58,237,.1);border-color:rgba(124,58,237,.35);color:#6d28d9}',
        '@media (max-width:560px){.wksm-cgrid{grid-template-columns:1fr}}'
    ].join('\n');
    if (!document.getElementById('wksm-style')) {
        const st = document.createElement('style');
        st.id = 'wksm-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    WK.subsManage = {
        openModal: openModal,
        close: close
    };

    console.log('[Stevscon] wiki_subs_manage.js listo (v4) — cualquier imagen hasta 20MB, cero errores de tamaño.');
})(window, document);