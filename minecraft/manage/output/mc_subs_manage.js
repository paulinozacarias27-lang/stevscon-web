/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_subs_manage.js (v2)
 * SUBS (MANAGE): modal de staff para crear/editar sub-páginas.
 *  - Modal sobre ESTADO LOCAL (escribir no repinta; añadir o quitar
 *    filas sí). Lista de 5 columnas + filas con imagen, galería con
 *    previews y lightbox.
 *  - Selector de archivo hasta 20MB que manda por MC.system.shrinkImage
 *    (canvas 1920px + JPEG 0.9). Si la imagen ya es liviana, se
 *    guarda original (PNG/GIF intactos). Toast con el peso final.
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const db = function () { return firebase.database(); };
    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    const L = (MC.subsSystem && MC.subsSystem.LIMITS) || {
        title: 120, body: 12000, rows: 15, rowT: 100, rowD: 160, rowC: 40, rowX: 2000,
        colT: 32, imgStr: 2000000, imgFile: 20971500, galT: 100, galD: 300
    };

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
    function validImg(u) {
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function arr(x) { return Array.isArray(x) ? x : []; }
    function label(t) { return el('span', 'mcsm-label', t); }

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
        if (!MC.subsSystem) { toast('Falta mc_subs_system.js en minecraft.html', 'error'); return; }
        close();

        const st = {
            type: 'normal', title: '',
            body: '', image: '', imgPos: 'abajo',
            cols: ['', '', '', '', ''],
            rows: []
        };

        ovl = el('div', 'mcsm-ovl');
        const panel = el('div', 'mcsm-panel');

        const head = el('div', 'mcsm-head');
        head.appendChild(el('h3', 'mcsm-title', subId ? 'Editar sub-página' : 'Nueva sub-página'));
        const x = el('button', 'mcsm-x');
        x.type = 'button';
        x.appendChild(fa('fa-xmark'));
        x.addEventListener('click', close);
        head.appendChild(x);
        panel.appendChild(head);

        panel.appendChild(el('p', 'mcsm-sub', 'Forma parte de este artículo y queda registrada en el Historial.'));

        const body = el('div', 'mcsm-body');

        body.appendChild(label('Clase de sub-página'));
        const sel = el('select', 'mcsm-input');
        [['normal', 'Normal (texto + formatos)'], ['lista', 'Lista (estilo changelog)'], ['galeria', 'Galería (imágenes)']].forEach(function (o) {
            const op = document.createElement('option');
            op.value = o[0];
            op.textContent = o[1];
            sel.appendChild(op);
        });
        sel.addEventListener('change', function () { st.type = sel.value; renderFields(); });
        body.appendChild(sel);

        const typeHint = el('p', 'mcsm-typehint');
        body.appendChild(typeHint);

        body.appendChild(label('Título'));
        const ti = el('input', 'mcsm-input');
        ti.type = 'text';
        ti.maxLength = L.title;
        ti.placeholder = 'Título de la sub-página';
        ti.addEventListener('input', function () { st.title = ti.value; });
        body.appendChild(ti);

        const fields = el('div', 'mcsm-fields');
        body.appendChild(fields);
        panel.appendChild(body);

        const foot = el('div', 'mcsm-foot');
        const hint = el('span', 'mcsm-hint');
        const cancel = el('button', 'mcsm-btn mcsm-cancel');
        cancel.type = 'button';
        cancel.textContent = 'Cancelar';
        cancel.addEventListener('click', close);
        const save = el('button', 'mcsm-btn mcsm-save');
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

        function imgRow(onVal, initVal, ph) {
            const wrap = el('div', 'mcsm-imgrow');
            const inp = el('input', 'mcsm-input');
            inp.type = 'text';
            inp.placeholder = ph || 'URL https:// o archivo…';
            inp.value = initVal || '';
            const file = el('button', 'mcsm-filebtn');
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
                if (MC.system && typeof MC.system.shrinkImage === 'function') {
                    MC.system.shrinkImage(f, { maxDim: 1920, targetStr: 2000000, hardStr: L.imgStr, fileMax: L.imgFile }, function (out, err) {
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
            const pv = el('span', 'mcsm-thumb');
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

        function renderFields() {
            typeHint.textContent = TYPE_HINTS[st.type] || '';
            fields.textContent = '';
            if (st.type === 'normal') renderNormal();
            else if (st.type === 'lista') renderLista();
            else renderGaleria();
        }
        function renderNormal() {
            fields.appendChild(label('Texto'));
            const ta = el('textarea', 'mcsm-input mcsm-ta');
            ta.rows = 10;
            ta.placeholder = 'Escribe aquí… **negrita**, *cursiva*, `código`#ff0000, ||spoiler||, listas, imágenes…';
            ta.value = st.body;
            ta.addEventListener('input', function () { st.body = ta.value; });
            fields.appendChild(ta);

            fields.appendChild(label('Imagen (opcional)'));
            fields.appendChild(imgRow(function (v) { st.image = v; }, st.image, 'URL https:// o archivo…'));

            fields.appendChild(label('Posición de la imagen'));
            const sp = el('select', 'mcsm-input');
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
            const cg = el('div', 'mcsm-cgrid');
            const phs = ['Columna 1: Nombre', 'Columna 2: Imagen', 'Columna 3: Cómo conseguirlo', 'Columna 4: Notas', 'Columna 5: Versión'];
            for (let i = 0; i < 5; i++) {
                const inp = el('input', 'mcsm-input');
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
            const rowsWrap = el('div', 'mcsm-rows');
            fields.appendChild(rowsWrap);

            const add = el('button', 'mcsm-addbtn');
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
                const card = el('div', 'mcsm-rowcard');
                const top = el('div', 'mcsm-rowcard-top');
                top.appendChild(el('span', 'mcsm-rownum', String(i + 1)));
                const del = el('button', 'mcsm-del');
                del.type = 'button';
                del.title = 'Quitar fila';
                del.appendChild(fa('fa-trash'));
                del.addEventListener('click', function () { st.rows.splice(i, 1); renderRows(); });
                top.appendChild(del);
                card.appendChild(top);

                const t1 = el('input', 'mcsm-input');
                t1.type = 'text';
                t1.maxLength = L.rowT;
                t1.placeholder = 'Nombre / título de la fila';
                t1.value = r.t || '';
                t1.addEventListener('input', function () { r.t = t1.value; });
                card.appendChild(t1);

                card.appendChild(imgRow(function (v) { r.img = v; }, r.img, 'Imagen de la fila (URL o archivo)…'));

                const t3 = el('input', 'mcsm-input');
                t3.type = 'text';
                t3.maxLength = L.rowD;
                t3.placeholder = 'Cómo conseguirlo / fecha / dato corto';
                t3.value = r.d || '';
                t3.addEventListener('input', function () { r.d = t3.value; });
                card.appendChild(t3);

                const t4 = el('textarea', 'mcsm-input mcsm-ta-sm');
                t4.rows = 2;
                t4.placeholder = 'Notas (aceptan **negrita**, `código`#color, etc.)';
                t4.value = r.x || '';
                t4.addEventListener('input', function () { r.x = t4.value; });
                card.appendChild(t4);

                const t5 = el('input', 'mcsm-input');
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
                    rowsWrap.appendChild(el('p', 'mcsm-empty-rows', 'Todavía no hay filas: pulsa «Añadir fila» para crear la primera.'));
                    return;
                }
                st.rows.forEach(function (r, i) { rowsWrap.appendChild(rowCard(i, r)); });
            }
            renderRows();
        }
        function renderGaleria() {
            fields.appendChild(label('Imágenes'));
            const rowsWrap = el('div', 'mcsm-rows');
            fields.appendChild(rowsWrap);

            const add = el('button', 'mcsm-addbtn');
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
                const card = el('div', 'mcsm-rowcard');
                const top = el('div', 'mcsm-rowcard-top');
                top.appendChild(el('span', 'mcsm-rownum', String(i + 1)));
                const del = el('button', 'mcsm-del');
                del.type = 'button';
                del.title = 'Quitar imagen';
                del.appendChild(fa('fa-trash'));
                del.addEventListener('click', function () { st.rows.splice(i, 1); renderRows(); });
                top.appendChild(del);
                card.appendChild(top);

                card.appendChild(imgRow(function (v) { r.img = v; }, r.img, 'Imagen (URL o archivo)…'));

                const t1 = el('input', 'mcsm-input');
                t1.type = 'text';
                t1.maxLength = L.galT;
                t1.placeholder = 'Título de la imagen (opcional)';
                t1.value = r.t || '';
                t1.addEventListener('input', function () { r.t = t1.value; });
                card.appendChild(t1);

                const t2 = el('textarea', 'mcsm-input mcsm-ta-sm');
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
                    rowsWrap.appendChild(el('p', 'mcsm-empty-rows', 'Añade la primera imagen con el botón «Añadir imagen».'));
                    return;
                }
                st.rows.forEach(function (r, i) { rowsWrap.appendChild(galCard(i, r)); });
            }
            renderRows();
        }

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
            MC.subsSystem.save(artId, collect(), subId || null).then(function () {
                close();
                toast(subId ? 'Sub-página actualizada' : 'Sub-página creada', 'ok');
            }).catch(function (e) {
                save.disabled = false;
                toast(e && e.message ? e.message : 'No se pudo guardar.', 'error');
            });
        });

        if (subId) {
            db().ref('mc/subs/' + artId + '/' + subId).once('value').then(function (s) {
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

    const CSS = [
        '.mcsm-ovl{position:fixed;inset:0;z-index:4500;background:rgba(10,12,8,.85);display:flex;align-items:center;justify-content:center;padding:18px}',
        '.mcsm-panel{width:100%;max-width:660px;max-height:88vh;display:flex;flex-direction:column;background:var(--bg-card,#181c14);border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);overflow:hidden}',
        '.mcsm-head{display:flex;align-items:center;gap:10px;padding:16px 18px 0}',
        '.mcsm-title{margin:0;font:400 13px var(--px-font),monospace;line-height:1.6;letter-spacing:.02em;text-shadow:2px 2px 0 rgba(0,0,0,.6)}',
        '.mcsm-x{margin-left:auto;width:34px;height:34px;flex:none;border-radius:0;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-main,#eef4e6);cursor:pointer;font-size:13px;box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mcsm-x:hover{background:var(--redstone,#ff5545);color:#fff}',
        '.mcsm-sub{margin:6px 18px 0;color:var(--text-muted,#98a28c);font:600 12px var(--ui-font),sans-serif;line-height:1.6}',
        '.mcsm-body{padding:12px 18px 4px;overflow-y:auto;flex:1}',
        '.mcsm-label{display:block;margin:12px 0 6px;color:var(--text-muted,#98a28c);font:700 10px var(--ui-font),sans-serif;letter-spacing:.14em;text-transform:uppercase}',
        '.mcsm-typehint{margin:6px 0 0;color:var(--text-muted,#98a28c);font:600 11.5px var(--ui-font),sans-serif;line-height:1.6}',
        '.mcsm-input{width:100%;background:#0b0d09;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);padding:9px 12px;color:var(--text-main,#eef4e6);font:600 13px var(--ui-font),sans-serif;outline:0;box-sizing:border-box}',
        '.mcsm-input:focus{border-color:#000;box-shadow:0 0 0 2px var(--gold,#f4c542)}',
        'textarea.mcsm-input{resize:vertical;min-height:74px;line-height:1.6}',
        'select.mcsm-input{cursor:pointer}',
        '.mcsm-fields{margin-top:2px}',
        '.mcsm-cgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
        '.mcsm-rows{display:flex;flex-direction:column;gap:10px;margin:2px 0 10px}',
        '.mcsm-empty-rows{margin:2px 0;color:var(--text-muted,#98a28c);font:600 12px var(--ui-font),sans-serif;border:3px dashed var(--border-color,#2f3626);border-radius:0;padding:14px;text-align:center;line-height:1.6}',
        '.mcsm-rowcard{background:rgba(255,255,255,.03);border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);padding:10px 12px;display:flex;flex-direction:column;gap:8px}',
        '.mcsm-rowcard-top{display:flex;align-items:center;gap:8px}',
        '.mcsm-rownum{width:24px;height:24px;border-radius:0;background:rgba(127,220,58,.16);border:2px solid #000;color:var(--mc-accent,#7fdc3a);display:flex;align-items:center;justify-content:center;font:700 11px var(--ui-font),sans-serif;box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mcsm-del{margin-left:auto;width:30px;height:30px;border-radius:0;border:3px solid #000;background:rgba(255,85,69,.08);color:var(--redstone,#ff5545);cursor:pointer;font-size:11px;box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mcsm-del:hover{background:var(--redstone,#ff5545);color:#fff}',
        '.mcsm-imgrow{display:flex;gap:8px;align-items:center}',
        '.mcsm-imgrow .mcsm-input{flex:1;min-width:0}',
        '.mcsm-filebtn{flex:none;width:38px;height:38px;border-radius:0;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);cursor:pointer;box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mcsm-filebtn:hover{color:var(--mc-accent,#7fdc3a);border-color:#000}',
        '.mcsm-filebtn[disabled]{opacity:.5;cursor:wait}',
        '.mcsm-thumb{flex:none;width:38px;height:38px;border-radius:0;border:3px solid #000;background:var(--bg-hover,#232a1b);display:flex;align-items:center;justify-content:center;color:var(--text-muted,#98a28c);overflow:hidden}',
        '.mcsm-thumb img{width:100%;height:100%;object-fit:cover}',
        '.mcsm-addbtn{display:inline-flex;align-items:center;gap:7px;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--mc-accent,#7fdc3a);border-radius:0;padding:7px 15px;font:700 11.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;margin:2px 0 10px;box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mcsm-addbtn:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}',
        '.mcsm-addbtn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}',
        '.mcsm-addbtn[disabled]{opacity:.45;cursor:not-allowed}',
        '.mcsm-foot{display:flex;align-items:center;gap:9px;padding:12px 18px 16px;border-top:3px solid #000}',
        '.mcsm-hint{margin-right:auto;color:var(--text-muted,#98a28c);font:700 11px var(--ui-font),sans-serif;line-height:1.6}',
        '.mcsm-btn{border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-main,#eef4e6);border-radius:0;padding:9px 16px;font:700 12px var(--ui-font),sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px;box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}',
        '.mcsm-btn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}',
        '.mcsm-save{background:var(--mc-dark,#4a8f1d);border-color:#000;color:#eaf7dd}',
        '.mcsm-save:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}',
        '.mcsm-save[disabled]{opacity:.6;cursor:wait}',
        '/* ---- TEMA CLARO · ajustes del modal ---- */',
        'html[data-theme="light"] .mcsm-ovl{background:rgba(28,36,21,.5)}',
        'html[data-theme="light"] .mcsm-panel{box-shadow:0 0 0 2px var(--border-color,#a8b58c),5px 5px 0 rgba(28,36,21,.25)}',
        'html[data-theme="light"] .mcsm-rowcard{background:rgba(62,125,20,.04)}',
        'html[data-theme="light"] .mcsm-rownum{background:rgba(62,125,20,.12);border-color:#000;color:var(--mc-dark,#2f5f0f)}',
        '@media (max-width:560px){.mcsm-cgrid{grid-template-columns:1fr}}'
    ].join('\n');
    if (!document.getElementById('mcsm-style')) {
        const st = document.createElement('style');
        st.id = 'mcsm-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    MC.subsManage = {
        openModal: openModal,
        close: close
    };

    console.log('[Stevscon] mc_subs_manage.js listo (v2) — cualquier imagen hasta 20MB, cero errores de tamaño.');
})(window, document);