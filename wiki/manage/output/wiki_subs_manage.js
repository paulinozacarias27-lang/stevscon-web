/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_subs_manage.js (v1)
 * SUBS (MANAGE): UI de STAFF para los sub-artículos.
 * - Cuelga "Editar"/"Borrar" en cada sub-página (solo staff ve esto).
 * - Botón "Añadir sub-página" al final de la sección.
 * - Editor con 3 clases:
 *     normal  -> texto (formatos) + imagen al lado/abajo (subida o URL).
 *     lista   -> 4 columnas con títulos personalizables + filas
 *                (título, fecha, notas con formato, etiqueta), máx 12.
 *     galeria -> imágenes (subida o URL) con título y descripción, máx 12.
 * - Guarda vía wiki_subs_system.js; el Core repinta solo (listener vivo).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const toast = function (m, k) { if (window.StevsconWiki && window.StevsconWiki.toast) window.StevsconWiki.toast(m, k); };
    const MAX_ROWS = 12;
    const DEF_COLS = ['Título', 'Fecha', 'Notas', 'Etiqueta'];

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function lbl(t) { return el('span', 'wk-sm-lbl', t); }
    function closeOvl(o) { if (o && o.parentNode) o.parentNode.removeChild(o); }
    function armed(btn, fn) {
        let on = false;
        btn.addEventListener('click', function () {
            if (!on) {
                on = true;
                btn.classList.add('arm');
                btn.textContent = '¿Seguro?';
                setTimeout(function () { on = false; btn.classList.remove('arm'); btn.textContent = 'Borrar'; }, 2600);
                return;
            }
            fn();
        });
    }
    /* Misma técnica del editor de artículos: reescala a dataURI liviano */
    function shrink(file, cb) {
        try {
            const fr = new FileReader();
            fr.onload = function () {
                const im = new Image();
                im.onload = function () {
                    const sc = Math.min(1, 900 / im.width);
                    const cv = document.createElement('canvas');
                    cv.width = Math.round(im.width * sc);
                    cv.height = Math.round(im.height * sc);
                    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                    let out = cv.toDataURL('image/jpeg', 0.82), q = 0.82;
                    while (out.length > 30000 && q > 0.35) { q -= 0.15; out = cv.toDataURL('image/jpeg', q); }
                    if (out.length > 30000) return cb(null, 'La imagen es demasiado grande incluso reescalada.');
                    cb(out, null);
                };
                im.onerror = function () { cb(null, 'Ese archivo no parece una imagen válida.'); };
                im.src = String(fr.result);
            };
            fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
            fr.readAsDataURL(file);
        } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
    }

    const CSS = `
    .wk-sbtn{border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border-radius:8px;padding:4px 10px;font:700 11px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
    .wk-sbtn:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6)}
    .wk-sbtn.danger{color:#f87171;border-color:rgba(239,68,68,.4)}
    .wk-sbtn.danger:hover{background:rgba(239,68,68,.12)}
    .wk-sbtn.danger.arm{background:#ef4444;color:#fff;border-color:#ef4444}
    #wk-sub-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1.5px dashed rgba(139,92,246,.55);background:rgba(139,92,246,.06);color:var(--purple-accent,#8b5cf6);border-radius:14px;padding:13px;font:800 12.5px Inter,sans-serif;cursor:pointer;transition:.2s}
    #wk-sub-add:hover{background:rgba(139,92,246,.14);border-color:var(--purple-accent,#8b5cf6)}
    .wk-subsm-sub{margin:0 0 14px;color:var(--text-muted,#94a3b8);font-size:12.5px;font-weight:600}
    .wk-sm-lbl{display:block;font:800 10px Inter,sans-serif;letter-spacing:.12em;color:var(--text-muted,#94a3b8);margin:10px 0 4px}
    .wk-sm-in{width:100%;box-sizing:border-box;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;color:var(--text-main,#f8fafc);padding:9px 11px;font:600 13px Inter,sans-serif;outline:0}
    .wk-sm-in:focus{border-color:var(--purple-accent,#8b5cf6)}
    select.wk-sm-in{cursor:pointer}
    textarea.wk-sm-in{min-height:70px;resize:vertical}
    textarea.wk-sm-in.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;min-height:200px;line-height:1.6}
    input[type=file].wk-sm-in{color:var(--text-muted,#94a3b8);font-size:12px}
    .wk-sm-hint{color:var(--text-muted,#94a3b8);font-size:11px;font-weight:600;margin-top:4px}
    .wk-sm-row{background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:12px;margin-bottom:10px}
    .wk-sm-rowhead{display:flex;gap:6px;align-items:center;margin-bottom:8px}
    .wk-sm-rowhead strong{font:800 10px Inter,sans-serif;letter-spacing:.1em;color:var(--text-muted,#94a3b8)}
    .wk-sm-rowhead .wk-sbtn{margin-left:auto}
    .wk-sm-thumb{width:100%;max-height:130px;object-fit:cover;border-radius:10px;border:1px solid var(--border-color,#2e2440);display:block;margin-bottom:8px}
    .wk-sm-add{border:1.5px dashed rgba(139,92,246,.55);background:rgba(139,92,246,.06);color:var(--purple-accent,#8b5cf6);border-radius:10px;padding:9px 12px;font:800 12px Inter,sans-serif;cursor:pointer;width:100%}
    .wk-sm-add:hover{background:rgba(139,92,246,.14)}
    `;
    function injectStyles() {
        if (document.getElementById('wk-subsm-style')) return;
        const st = document.createElement('style');
        st.id = 'wk-subsm-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    WK.subsManage = {

        init: function () { injectStyles(); },

        /* ---- Botones Editar/Borrar en cada sub-página ---- */
        decorate: function (card, articleId, subId, a) {
            const top = card.querySelector('.wk-sub-top');
            if (!top || top.querySelector('.wk-s-tools')) return;
            const tools = el('div', 'wk-s-tools');

            const bE = el('button', 'wk-sbtn');
            bE.type = 'button';
            bE.appendChild(icon('fa-pen-to-square'));
            bE.appendChild(document.createTextNode(' Editar'));
            bE.addEventListener('click', function () { WK.subsManage.openEditor(articleId, subId, a); });
            tools.appendChild(bE);

            const bD = el('button', 'wk-sbtn danger');
            bD.type = 'button';
            bD.textContent = 'Borrar';
            armed(bD, function () {
                WK.subsSystem.del(articleId, subId)
                    .then(function () { toast('Sub-página borrada', 'ok'); })
                    .catch(function (e) { toast(e.message, 'error'); });
            });
            tools.appendChild(bD);

            top.appendChild(tools);
        },

        /* ---- Botón de añadir al final de la sección ---- */
        attachAddBar: function (sec, articleId) {
            if (sec.querySelector('#wk-sub-add')) return;
            const b = el('button');
            b.type = 'button';
            b.id = 'wk-sub-add';
            b.appendChild(icon('fa-plus'));
            b.appendChild(document.createTextNode(' Añadir sub-página (texto, lista o galería)'));
            b.addEventListener('click', function () { WK.subsManage.openEditor(articleId, null, null); });
            sec.appendChild(b);
        },

        /* ---- EDITOR ---- */
        openEditor: function (articleId, subId, src) {
            if (document.getElementById('wk-sub-editor-ovl')) return;
            const self = this;

            const draft = {
                type: (src && src.type) || 'normal',
                title: (src && src.title) || '',
                body: (src && src.body) || '',
                image: (src && src.image) || '',
                imagePos: (src && src.imagePos) || 'below',
                cols: (src && Array.isArray(src.cols) && src.cols.length) ? src.cols.slice(0, 4) : ['', '', '', ''],
                rows: (src && Array.isArray(src.rows) && src.rows.length)
                    ? src.rows.map(function (r) { return { i: r.i || '', t: r.t || '', d: r.d || '', x: r.x || '', n: r.n || '' }; })
                    : [{ i: '', t: '', d: '', x: '', n: '' }]
            };

            const ovl = el('div', 'wk-ovl');
            ovl.id = 'wk-sub-editor-ovl';
            const panel = el('div', 'wk-panel');
            panel.style.maxWidth = '760px';
            ovl.appendChild(panel);
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);

            const closeBtn = el('button', 'wk-close');
            closeBtn.type = 'button';
            closeBtn.appendChild(icon('fa-xmark'));
            closeBtn.addEventListener('click', function () { closeOvl(ovl); });
            panel.appendChild(closeBtn);

            panel.appendChild(el('h2', null, subId ? 'Editar sub-página' : 'Nueva sub-página'));
            panel.appendChild(el('p', 'wk-subsm-sub', 'Forma parte de este artículo y queda registrada en el Historial.'));

            /* Tipo */
            const typeSel = document.createElement('select');
            typeSel.className = 'wk-sm-in';
            [['normal', 'Texto (con formatos e imagen)'],
             ['lista', 'Lista (estilo changelog)'],
             ['galeria', 'Galería (imágenes)']].forEach(function (o) {
                const op = el('option', null, o[1]);
                op.value = o[0];
                typeSel.appendChild(op);
            });
            typeSel.value = draft.type;
            panel.appendChild(lbl('CLASE DE SUB-PÁGINA'));
            panel.appendChild(typeSel);

            /* Título */
            const title = document.createElement('input');
            title.className = 'wk-sm-in';
            title.maxLength = 120;
            title.placeholder = 'Título de la sub-página';
            title.value = draft.title;
            title.addEventListener('input', function () { draft.title = title.value; });
            panel.appendChild(lbl('TÍTULO'));
            panel.appendChild(title);

            /* Zona dinámica según tipo */
            const dyn = el('div');
            panel.appendChild(dyn);

            function renderDyn() {
                dyn.textContent = '';
                if (draft.type === 'normal') self.normalFields(dyn, draft);
                else if (draft.type === 'lista') self.listaFields(dyn, draft);
                else self.galeriaFields(dyn, draft);
            }
            typeSel.addEventListener('change', function () { draft.type = typeSel.value; renderDyn(); });
            renderDyn();

            /* Guardar */
            const bSave = el('button', 'wk-btn pri');
            bSave.type = 'button';
            bSave.style.marginTop = '14px';
            bSave.appendChild(icon('fa-floppy-disk'));
            bSave.appendChild(document.createTextNode(subId ? ' Guardar sub-página' : ' Crear sub-página'));
            bSave.addEventListener('click', function () {
                const rows = draft.rows.filter(function (r) {
                    if (draft.type === 'lista') return (r.t || r.d || r.x || r.n);
                    return (r.i || r.t || r.n);
                });
                const data = {
                    type: draft.type,
                    title: draft.title,
                    body: draft.body, image: draft.image, imagePos: draft.imagePos,
                    cols: draft.cols, rows: rows
                };
                bSave.disabled = true;
                WK.subsSystem.save(articleId, data, subId)
                    .then(function () {
                        toast(subId ? 'Sub-página guardada' : '¡Sub-página creada!', 'ok');
                        closeOvl(ovl);
                    })
                    .catch(function (e) { toast(e.message, 'error'); bSave.disabled = false; });
            });
            panel.appendChild(bSave);
        },

        /* ---- Campos: NORMAL ---- */
        normalFields: function (box, draft) {
            const body = document.createElement('textarea');
            body.className = 'wk-sm-in mono';
            body.placeholder = 'Escribe con formato: ## títulos, **negrita**, ||spoilers||, `código`#22c55e, [enlaces](https://…), ![](imagen)…';
            body.value = draft.body;
            body.addEventListener('input', function () { draft.body = body.value; });
            box.appendChild(lbl('TEXTO (ACEPTA TODOS LOS FORMATOS)'));
            box.appendChild(body);

            const prev = document.createElement('img');
            prev.className = 'wk-sm-thumb';
            prev.style.display = 'none';

            const url = document.createElement('input');
            url.className = 'wk-sm-in';
            url.placeholder = 'Pega una URL https de la imagen (opcional)…';
            url.value = draft.image;
            url.addEventListener('input', function () {
                draft.image = url.value.trim();
                if (/^https:\/\//i.test(draft.image)) { prev.src = draft.image; prev.style.display = 'block'; }
                else prev.style.display = 'none';
            });
            box.appendChild(lbl('IMAGEN (OPCIONAL)'));
            box.appendChild(url);

            const file = document.createElement('input');
            file.type = 'file';
            file.accept = 'image/*';
            file.className = 'wk-sm-in';
            file.addEventListener('change', function () {
                const f = file.files && file.files[0];
                if (!f) return;
                shrink(f, function (dataURI, err) {
                    if (err) return toast(err, 'error');
                    draft.image = dataURI;
                    prev.src = dataURI;
                    prev.style.display = 'block';
                    toast('Imagen lista (' + Math.round(dataURI.length / 1024) + 'KB)', 'ok');
                });
            });
            box.appendChild(file);
            box.appendChild(prev);
            box.appendChild(el('p', 'wk-sm-hint', 'La imagen se reescala sola para no pasar el límite.'));

            const pos = document.createElement('select');
            pos.className = 'wk-sm-in';
            [['below', 'Imagen DEBAJO del texto'], ['side', 'Imagen AL LADO del texto (derecha)']].forEach(function (o) {
                const op = el('option', null, o[1]);
                op.value = o[0];
                pos.appendChild(op);
            });
            pos.value = draft.imagePos;
            pos.addEventListener('change', function () { draft.imagePos = pos.value; });
            box.appendChild(lbl('POSICIÓN DE LA IMAGEN'));
            box.appendChild(pos);
        },

        /* ---- Campos: LISTA ---- */
        listaFields: function (box, draft) {
            box.appendChild(el('p', 'wk-sm-hint', 'Estilo changelog: cada fila es una entrada con título, fecha, notas (con formatos) y etiqueta. Hasta ' + MAX_ROWS + ' filas.'));

            const cw = el('div');
            cw.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
            for (let i = 0; i < 4; i++) {
                const c = document.createElement('input');
                c.className = 'wk-sm-in';
                c.maxLength = 24;
                c.placeholder = 'Columna ' + (i + 1) + ': ' + DEF_COLS[i] + ' (título personalizado)';
                c.value = draft.cols[i] || '';
                (function (idx, input) {
                    input.addEventListener('input', function () { draft.cols[idx] = input.value; });
                })(i, c);
                cw.appendChild(c);
            }
            box.appendChild(lbl('TÍTULOS DE LAS COLUMNAS (OPCIONAL)'));
            box.appendChild(cw);

            const list = el('div');
            box.appendChild(lbl('FILAS'));
            box.appendChild(list);

            function paintRows() {
                list.textContent = '';
                draft.rows.forEach(function (r, idx) {
                    list.appendChild(self.rowCard('FILA ' + (idx + 1), draft, idx, paintRows, [
                        ['t', 'Título de la fila (ej: 1.0.26)'],
                        ['d', 'Fecha (ej: 5 de agosto, 2026)'],
                        ['x', 'Etiqueta (ej: Medium)']
                    ], true));
                });
                const add = el('button', 'wk-sm-add');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(document.createTextNode(' Añadir fila (máx ' + MAX_ROWS + ')'));
                add.addEventListener('click', function () {
                    if (draft.rows.length >= MAX_ROWS) return toast('Máximo ' + MAX_ROWS + ' filas.', 'error');
                    draft.rows.push({ i: '', t: '', d: '', x: '', n: '' });
                    paintRows();
                });
                list.appendChild(add);
            }
            paintRows();
        },

        /* ---- Campos: GALERÍA ---- */
        galeriaFields: function (box, draft) {
            box.appendChild(el('p', 'wk-sm-hint', 'Rejilla de imágenes con título y descripción. Clic en una imagen = vista grande. Hasta ' + MAX_ROWS + '.'));
            const list = el('div');
            box.appendChild(lbl('IMÁGENES'));
            box.appendChild(list);

            function paintRows() {
                list.textContent = '';
                draft.rows.forEach(function (r, idx) {
                    const card = el('div', 'wk-sm-row');

                    const head = el('div', 'wk-sm-rowhead');
                    head.appendChild(el('strong', null, 'IMAGEN ' + (idx + 1)));
                    const tools = el('div');
                    tools.style.marginLeft = 'auto';
                    tools.style.display = 'flex';
                    tools.style.gap = '6px';
                    tools.appendChild(self.moveBtns(draft, idx, paintRows));
                    card.appendChild(head);
                    head.appendChild(tools);

                    if (r.i && /^https:/i.test(r.i) || (r.i && r.i.indexOf('data:image') === 0)) {
                        const th = document.createElement('img');
                        th.className = 'wk-sm-thumb';
                        th.src = r.i;
                        th.alt = '';
                        card.appendChild(th);
                    }

                    const url = document.createElement('input');
                    url.className = 'wk-sm-in';
                    url.placeholder = 'URL https de la imagen…';
                    url.value = r.i;
                    url.addEventListener('input', function () { r.i = url.value.trim(); paintThumbOnly(card, r); });
                    card.appendChild(url);

                    const file = document.createElement('input');
                    file.type = 'file';
                    file.accept = 'image/*';
                    file.className = 'wk-sm-in';
                    file.addEventListener('change', function () {
                        const f = file.files && file.files[0];
                        if (!f) return;
                        shrink(f, function (dataURI, err) {
                            if (err) return toast(err, 'error');
                            r.i = dataURI;
                            url.value = '';
                            paintRows();
                        });
                    });
                    card.appendChild(file);

                    const t = document.createElement('input');
                    t.className = 'wk-sm-in';
                    t.maxLength = 100;
                    t.placeholder = 'Título de la imagen…';
                    t.value = r.t;
                    t.addEventListener('input', function () { r.t = t.value; });
                    card.appendChild(el('span', 'wk-sm-lbl', 'TÍTULO (OPCIONAL)'));
                    card.appendChild(t);

                    const n = document.createElement('textarea');
                    n.className = 'wk-sm-in';
                    n.placeholder = 'Descripción (acepta formatos)…';
                    n.value = r.n;
                    n.addEventListener('input', function () { r.n = n.value; });
                    card.appendChild(el('span', 'wk-sm-lbl', 'DESCRIPCIÓN (OPCIONAL)'));
                    card.appendChild(n);

                    function paintThumbOnly(cardEl, row) {
                        const th = cardEl.querySelector('.wk-sm-thumb');
                        if (th && row.i) { th.src = row.i; th.style.display = 'block'; }
                    }

                    list.appendChild(card);
                });
                const add = el('button', 'wk-sm-add');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(document.createTextNode(' Añadir imagen (máx ' + MAX_ROWS + ')'));
                add.addEventListener('click', function () {
                    if (draft.rows.length >= MAX_ROWS) return toast('Máximo ' + MAX_ROWS + ' imágenes.', 'error');
                    draft.rows.push({ i: '', t: '', d: '', x: '', n: '' });
                    paintRows();
                });
                list.appendChild(add);
            }
            paintRows();
        },

        /* ---- Fila genérica para LISTA ---- */
        rowCard: function (label, draft, idx, repaint, fields, withNotes) {
            const card = el('div', 'wk-sm-row');
            const head = el('div', 'wk-sm-rowhead');
            head.appendChild(el('strong', null, label));
            const tools = el('div');
            tools.style.cssText = 'margin-left:auto;display:flex;gap:6px';
            tools.appendChild(this.moveBtns(draft, idx, repaint));
            const del = el('button', 'wk-sbtn danger');
            del.type = 'button';
            del.appendChild(icon('fa-xmark'));
            del.addEventListener('click', function () {
                draft.rows.splice(idx, 1);
                if (!draft.rows.length) draft.rows.push({ i: '', t: '', d: '', x: '', n: '' });
                repaint();
            });
            tools.appendChild(del);
            head.appendChild(tools);
            card.appendChild(head);

            fields.forEach(function (f) {
                const r = draft.rows[idx];
                const inp = document.createElement('input');
                inp.className = 'wk-sm-in';
                inp.maxLength = f[0] === 't' ? 100 : 40;
                inp.placeholder = f[1];
                inp.value = r[f[0]] || '';
                inp.addEventListener('input', function () { r[f[0]] = inp.value; });
                card.appendChild(inp);
            });

            if (withNotes) {
                const n = document.createElement('textarea');
                n.className = 'wk-sm-in';
                n.placeholder = 'Notas de la fila (acepta TODOS los formatos: **negrita**, listas, `código` con color…)';
                n.value = draft.rows[idx].n || '';
                n.addEventListener('input', function () { draft.rows[idx].n = n.value; });
                card.appendChild(n);
            }
            return card;
        },

        /* ---- Botones mover ↑ ↓ ---- */
        moveBtns: function (draft, idx, repaint) {
            const wrap = el('div');
            wrap.style.display = 'flex';
            wrap.style.gap = '6px';
            const up = el('button', 'wk-sbtn');
            up.type = 'button';
            up.title = 'Subir';
            up.appendChild(icon('fa-arrow-up'));
            up.addEventListener('click', function () {
                if (idx === 0) return;
                const tmp = draft.rows[idx - 1];
                draft.rows[idx - 1] = draft.rows[idx];
                draft.rows[idx] = tmp;
                repaint();
            });
            const dn = el('button', 'wk-sbtn');
            dn.type = 'button';
            dn.title = 'Bajar';
            dn.appendChild(icon('fa-arrow-down'));
            dn.addEventListener('click', function () {
                if (idx >= draft.rows.length - 1) return;
                const tmp = draft.rows[idx + 1];
                draft.rows[idx + 1] = draft.rows[idx];
                draft.rows[idx] = tmp;
                repaint();
            });
            wrap.appendChild(up);
            wrap.appendChild(dn);
            return wrap;
        }
    };

    /* ---- Init ---- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { WK.subsManage.init(); });
    } else {
        WK.subsManage.init();
    }

    console.log('[Stevscon] wiki_subs_manage.js listo (v1) — panel de staff de sub-artículos.');
})(window, document);