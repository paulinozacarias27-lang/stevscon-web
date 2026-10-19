/**
 * ====
 * STEVSCON.WIKI — wiki/manage/pages/edit_page.js (v1)
 * EDITOR DEL INICIO: bloques personalizados para la portada.
 *  - El staff (Owner/Admins) añade bloques: TEXTO (título + cuerpo
 *    con TODOS los formatos de formats.js), AVISO (anuncio
 *    destacado), IMAGEN (URL o subida, se optimiza sola) y BOTONES
 *    (enlaces internos #a/... o externos https).
 *  - Botones de editar/subir/bajar/borrar SOLO para Owner y Admins;
 *    mods y usuarios normales solo ven el contenido.
 *  - Quita la sección "Últimas páginas" de la portada y deja
 *    "Explorar por categoría" intacta (override seguro de
 *    WK.core.renderHome — wiki_core.js y wiki_page.js NO se tocan).
 *  - Datos: wiki/home/{blockId} = {type, title, body, img, cap,
 *    order, createdAt, updatedAt, by}.
 *  - Botones de edición con variables de tema: se ven bien en claro
 *    y oscuro. Todo con textContent (XSS fuera; innerHTML solo para
 *    el markdown ya escapado por formats.js).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const toast = function (m, k) { if (WK.toast) WK.toast(m, k); };
    const dbf = function () { return firebase.database(); };

    /* ==== HELPERS ==== */
    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function closeOvl(ovl) { if (ovl && ovl.parentNode) ovl.parentNode.removeChild(ovl); }
    function renderMd(src) {
        if (WK.formats && typeof WK.formats.md === 'function') {
            try { return WK.formats.md(src); } catch (e) {}
        }
        const esc = function (s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
        return String(src || '').split(/\r?\n/).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    }
    function safeLink(u) {
        u = String(u || '').trim();
        if (/^#(a|c|s)\//.test(u)) return u; /* rutas internas de la wiki */
        if (WK.formats && typeof WK.formats.safeUrl === 'function') {
            try { return WK.formats.safeUrl(u) || ''; } catch (e) {}
        }
        return /^https:\/\//i.test(u) ? u : '';
    }

    const TYPES = {
        texto:   { label: 'Texto',   icon: 'fa-align-left' },
        aviso:   { label: 'Aviso',   icon: 'fa-bullhorn' },
        imagen:  { label: 'Imagen',  icon: 'fa-image' },
        enlaces: { label: 'Botones', icon: 'fa-link' }
    };

    /* ==== CSS (bloques + botones de edición, tema claro y oscuro) ==== */
    const CSS = `
    .wkh-block{position:relative}
    .wkh-has-tools h2{padding-right:150px}
    .wkh-tools{position:absolute;top:-6px;right:0;display:inline-flex;gap:6px;z-index:5}
    .wkh-tbtn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#16121f);color:var(--text-muted,#94a3b8);border-radius:9px;cursor:pointer;font-size:12px;transition:color .15s,border-color .15s,background .15s}
    .wkh-tbtn:hover{color:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6)}
    .wkh-tbtn.danger:hover{color:#f87171;border-color:rgba(239,68,68,.55)}
    .wkh-tbtn.arm{background:#ef4444;border-color:#ef4444;color:#fff}
    .wkh-addbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px dashed var(--border-color,#2e2440);border-radius:14px;padding:13px 16px;margin:4px 0 12px}
    .wkh-addbtn{display:inline-flex;align-items:center;gap:8px;border:1px dashed var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.10);color:var(--purple-accent,#8b5cf6);border-radius:999px;padding:8px 16px;font:800 12px Inter,sans-serif;cursor:pointer;transition:.15s}
    .wkh-addbtn:hover{background:var(--purple-accent,#8b5cf6);color:#fff;border-style:solid}
    .wkh-addhint{color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif}
    .wkh-aviso{background:rgba(139,92,246,.09);border:1px solid rgba(139,92,246,.35);border-left:4px solid var(--purple-accent,#8b5cf6);border-radius:14px}
    html[data-theme="light"] .wkh-aviso{background:rgba(139,92,246,.07)}
    .wkh-fig{margin:0}
    .wkh-fig img{width:100%;max-height:460px;object-fit:cover;border-radius:14px;border:1px solid var(--border-color,#2e2440);display:block}
    .wkh-cap{margin-top:8px;color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;text-align:center}
    .wkh-links{display:flex;flex-wrap:wrap;gap:10px}
    .wkh-linkbtn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#16121f);color:var(--text-main,#f8fafc);border-radius:999px;padding:9px 16px;font:700 13px Inter,sans-serif;cursor:pointer;text-decoration:none;transition:.15s}
    .wkh-linkbtn:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6)}
    .wkh-linkbtn.int{background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));border-color:transparent;color:#fff}
    .wkh-linkbtn.int:hover{color:#fff;filter:brightness(1.12)}
    .wkh-imgprev{max-height:150px;border-radius:12px;border:1px solid var(--border-color,#2e2440);display:block;margin-top:8px}
    `;
    function injectStyles() {
        if (document.getElementById('wkh-home-style')) return;
        const st = document.createElement('style');
        st.id = 'wkh-home-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ==== FALLBACK: optimizador de imágenes (si falta wiki_system v2) ==== */
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
                    while (out.length > 90000 && q > 0.35) { q -= 0.15; out = cv.toDataURL('image/jpeg', q); }
                    if (out.length > 9000000) return cb(null, 'La imagen es demasiado grande incluso reescalada.');
                    cb(out, null);
                };
                im.onerror = function () { cb(null, 'Ese archivo no parece una imagen válida.'); };
                im.src = String(fr.result);
            };
            fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
            fr.readAsDataURL(file);
        } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
    }

    /* ==== NÚCLEO ==== */
    WK.homeblocks = {
        map: {}, wrapped: false,

        start: function () {
            const self = this;
            dbf().ref('wiki/home').on('value', function (s) {
                self.map = s.val() || {};
                document.dispatchEvent(new CustomEvent('sc:wiki-data'));
            }, function (err) { console.warn('[Wiki] lectura de bloques del inicio:', err && err.code); });
        },

        all: function () {
            const out = [];
            const map = this.map;
            Object.keys(map).forEach(function (id) {
                if (map[id]) out.push(Object.assign({ id: id }, map[id]));
            });
            return out.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        },
        isStaff: function () { return !!(WK.core && WK.core.staffView && WK.core.staffView()); },

        /* ---- Escritura (solo Owner/Admins, las rules lo refuerzan) ---- */
        create: function (data) {
            data.order = Date.now();
            data.createdAt = Date.now();
            return dbf().ref('wiki/home').push().set(data);
        },
        save: function (id, data) {
            return dbf().ref('wiki/home/' + id).update(data);
        },
        remove: function (id) {
            return dbf().ref('wiki/home/' + id).remove();
        },
        move: function (id, dir) {
            const list = this.all();
            let i = -1;
            for (let k = 0; k < list.length; k++) { if (list[k].id === id) { i = k; break; } }
            const j = i + dir;
            if (i < 0 || j < 0 || j >= list.length) return Promise.resolve();
            const a = list[i], b = list[j];
            const upd = {};
            upd['wiki/home/' + a.id + '/order'] = (b.order || 0);
            upd['wiki/home/' + b.id + '/order'] = (a.order || 0);
            return dbf().ref().update(upd);
        },

        /* ---- Botones de edición (solo staff los ve) ---- */
        tools: function (bk, idx, total) {
            const self = this;
            const t = el('div', 'wkh-tools');
            function mk(ic, titleTxt, fn) {
                const b = el('button', 'wkh-tbtn');
                b.type = 'button';
                b.title = titleTxt;
                b.setAttribute('aria-label', titleTxt);
                b.appendChild(icon(ic));
                b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
                return b;
            }
            if (idx > 0) t.appendChild(mk('fa-arrow-up', 'Subir bloque', function () { self.move(bk.id, -1); }));
            if (idx < total - 1) t.appendChild(mk('fa-arrow-down', 'Bajar bloque', function () { self.move(bk.id, 1); }));
            t.appendChild(mk('fa-pen-to-square', 'Editar bloque', function () { self.openEditor(bk.id); }));

            const del = el('button', 'wkh-tbtn danger');
            del.type = 'button';
            del.title = 'Borrar bloque';
            del.setAttribute('aria-label', 'Borrar bloque');
            del.appendChild(icon('fa-trash-can'));
            let arm = false, tmr = null;
            del.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!arm) {
                    arm = true;
                    del.classList.add('arm');
                    del.title = 'Pulsa otra vez para confirmar';
                    tmr = setTimeout(function () { arm = false; del.classList.remove('arm'); del.title = 'Borrar bloque'; }, 2600);
                    return;
                }
                clearTimeout(tmr);
                self.remove(bk.id).then(function () { toast('Bloque borrado', 'ok'); })
                    .catch(function (err) { toast(err && err.message ? err.message : 'No se pudo borrar', 'error'); });
            });
            t.appendChild(del);
            return t;
        },

        /* ---- EDITOR DE BLOQUES ---- */
        openEditor: function (id) {
            if (!this.isStaff()) { toast('Solo el Owner y los Administradores pueden editar la Wiki.', 'error'); return; }
            const self = this;
            const cur = id ? (this.map[id] || {}) : null;

            const ovl = el('div', 'wk-ovl');
            ovl.id = 'wkh-ovl';
            const panel = el('div', 'wk-panel');
            ovl.appendChild(panel);
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);

            const close = el('button', 'wk-close');
            close.type = 'button';
            close.appendChild(icon('fa-xmark'));
            close.addEventListener('click', function () { closeOvl(ovl); });
            panel.appendChild(close);

            panel.appendChild(el('h2', null, id ? 'Editar bloque' : 'Nuevo bloque del inicio'));
            panel.appendChild(el('p', 'wk-sub', 'Los bloques se muestran en la portada, debajo de "Explorar por categoría".'));

            const typeSel = document.createElement('select');
            Object.keys(TYPES).forEach(function (k) {
                const op = el('option', null, TYPES[k].label);
                op.value = k;
                typeSel.appendChild(op);
            });

            const title = document.createElement('input');
            title.type = 'text';
            title.maxLength = 120;
            title.placeholder = 'Título del bloque (opcional)';

            const body = document.createElement('textarea');
            body.className = 'mono';
            body.style.minHeight = '170px';
            body.placeholder = '## Escribe aquí…\n\n**negrita**, *cursiva*, __subrayado__, ~~tachado~~, ==marcado==\n- listas\n`código` con color: `texto`#ff0000\n[enlaces](https://…), ![](imagen) y ||spoiler||';

            const hint = el('p', 'wk-hint', '');

            /* Campos de IMAGEN */
            const img = document.createElement('input');
            img.type = 'text';
            img.placeholder = 'Pega una URL https o sube una imagen…';
            const imgPrev = document.createElement('img');
            imgPrev.className = 'wkh-imgprev';
            imgPrev.style.display = 'none';
            const imgFile = document.createElement('input');
            imgFile.type = 'file';
            imgFile.accept = 'image/*';
            imgFile.style.cssText = 'color:var(--text-muted);font-size:12px';
            const cap = document.createElement('input');
            cap.type = 'text';
            cap.maxLength = 240;
            cap.placeholder = 'Pie de imagen (opcional)';

            const bodyW = el('div');
            bodyW.appendChild(el('label', null, 'CONTENIDO'));
            bodyW.appendChild(body);
            bodyW.appendChild(hint);
            const imgW = el('div');
            imgW.appendChild(el('label', null, 'IMAGEN (HASTA 20MB, SE OPTIMIZA SOLA)'));
            imgW.appendChild(img);
            imgW.appendChild(imgPrev);
            imgW.appendChild(imgFile);
            const capW = el('div');
            capW.appendChild(el('label', null, 'PIE DE IMAGEN'));
            capW.appendChild(cap);

            function syncType() {
                const t = typeSel.value;
                bodyW.style.display = (t === 'imagen') ? 'none' : '';
                imgW.style.display = (t === 'imagen') ? '' : 'none';
                capW.style.display = (t === 'imagen') ? '' : 'none';
                hint.textContent = t === 'enlaces'
                    ? 'Un botón por línea: Texto | https://enlace — o interno: Texto | #a/mi-pagina'
                    : (t === 'imagen'
                        ? 'Puedes subir imágenes de hasta 20MB: se optimizan solas.'
                        : 'Tienes TODOS los formatos de la wiki: ## títulos, **negrita**, listas, `código` con color, ||spoiler||, imágenes y enlaces.');
            }
            typeSel.addEventListener('change', syncType);

            /* URL pegada -> previsualizar */
            img.addEventListener('change', function () {
                const u = String(img.value || '').trim();
                if (/^https:\/\//i.test(u) || /^data:image\//.test(u)) {
                    if (u.length > 9000000) { toast('La imagen pasa de 9MB guardada; sube una más ligera.', 'error'); return; }
                    imgPrev.src = u;
                    imgPrev.style.display = 'block';
                } else {
                    imgPrev.style.display = 'none';
                }
            });

            /* Subida local -> optimizador (igual que las portadas) */
            imgFile.addEventListener('change', function () {
                const f = imgFile.files && imgFile.files[0];
                if (!f) return;
                if (f.size > 20 * 1024 * 1024) { toast('Máximo 20MB por imagen.', 'error'); return; }
                imgFile.disabled = true;
                const finish = function (dataURI, err) {
                    imgFile.disabled = false;
                    if (err) return toast(err, 'error');
                    img.value = dataURI;
                    imgPrev.src = dataURI;
                    imgPrev.style.display = 'block';
                    toast('Imagen lista (' + Math.round(dataURI.length / 1024) + 'KB)', 'ok');
                };
                if (WK.system && typeof WK.system.shrinkImage === 'function') {
                    WK.system.shrinkImage(f, { maxDim: 1920, targetStr: 20000, hardStr: 90000 }, finish);
                } else {
                    shrink(f, finish);
                }
            });

            const form = el('div', 'wk-form');
            form.appendChild(el('label', null, 'TIPO DE BLOQUE'));
            form.appendChild(typeSel);
            form.appendChild(el('label', null, 'TÍTULO'));
            form.appendChild(title);
            form.appendChild(bodyW);
            form.appendChild(imgW);
            form.appendChild(capW);

            if (cur) {
                typeSel.value = TYPES[cur.type] ? cur.type : 'texto';
                title.value = cur.title || '';
                body.value = cur.body || '';
                img.value = cur.img || '';
                cap.value = cur.cap || '';
                if (cur.img) { imgPrev.src = cur.img; imgPrev.style.display = 'block'; }
            } else {
                typeSel.value = 'texto';
            }
            syncType();

            const bSave = el('button', 'wk-btn pri');
            bSave.type = 'button';
            bSave.appendChild(icon('fa-floppy-disk'));
            bSave.appendChild(document.createTextNode(id ? ' Guardar bloque' : ' Crear bloque'));
            bSave.addEventListener('click', function () {
                const t = typeSel.value;
                const data = {
                    type: t,
                    title: String(title.value || '').trim().slice(0, 120),
                    body: t === 'imagen' ? '' : String(body.value || '').slice(0, 20000),
                    img: '',
                    cap: '',
                    updatedAt: Date.now(),
                    by: (WK.system && WK.system.session && (WK.system.session.name || WK.system.session.username)) || 'Staff'
                };
                if (t === 'imagen') {
                    const u = String(img.value || '').trim();
                    if (u.charAt(0) === '#') return toast('Para imágenes usa una URL https o sube un archivo.', 'error');
                    if (!safeLink(u)) return toast('Pon una URL https o sube una imagen.', 'error');
                    if (u.length > 9000000) return toast('La imagen es demasiado grande incluso optimizada.', 'error');
                    data.img = u;
                    data.cap = String(cap.value || '').trim().slice(0, 240);
                } else if (!String(data.body).trim()) {
                    return toast(t === 'enlaces' ? 'Escribe al menos un botón: Texto | https://enlace' : 'Escribe el contenido del bloque.', 'error');
                }
                bSave.disabled = true;
                const p = id ? self.save(id, data) : self.create(data);
                p.then(function () {
                    toast(id ? 'Bloque guardado' : 'Bloque añadido al inicio', 'ok');
                    closeOvl(ovl);
                }).catch(function (e) {
                    bSave.disabled = false;
                    toast(e && e.message ? e.message : 'No se pudo guardar', 'error');
                });
            });
            form.appendChild(bSave);
            panel.appendChild(form);
            setTimeout(function () { try { title.focus(); } catch (e2) {} }, 50);
        },

        /* ==== PINTAR BLOQUES (tras el render normal del home) ==== */
        paint: function (main) {
            if (!main) return;
            const staff = this.isStaff();
            const blocks = this.all();

            /* Fuera "Últimas páginas" (se queda Explorar por categoría) */
            Array.prototype.forEach.call(main.children, function (sec) {
                if (!sec.classList || !sec.classList.contains('wk-sec')) return;
                const h = sec.querySelector('h2');
                if (h && h.textContent.indexOf('Últimas páginas') !== -1 && sec.parentNode) {
                    sec.parentNode.removeChild(sec);
                }
            });

            /* Si ya hay bloques, el aviso de "wiki vacía" estorba */
            if (blocks.length) {
                const emp = main.querySelector('.wk-empty');
                if (emp && emp.parentNode) {
                    const h3 = emp.querySelector('h3');
                    if (h3 && h3.textContent.indexOf('vacía') !== -1) emp.parentNode.removeChild(emp);
                }
            }

            /* Barra staff para añadir bloques */
            if (staff) {
                const bar = el('div', 'wkh-addbar');
                const add = el('button', 'wkh-addbtn');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(document.createTextNode(' Añadir bloque'));
                add.addEventListener('click', function () { WK.homeblocks.openEditor(null); });
                bar.appendChild(add);
                bar.appendChild(el('span', 'wkh-addhint', 'Bloques a medida para el inicio: texto, avisos, imágenes y botones (solo el staff ve esto).'));
                main.appendChild(bar);
            }

            if (!blocks.length) return;

            const self = this;
            blocks.forEach(function (bk, idx) {
                const type = TYPES[bk.type] ? bk.type : 'texto';
                const sec = el('section', 'wk-sec wkh-block wkh-' + type);
                let has = false;

                if (bk.title) {
                    const h = el('h2');
                    h.appendChild(icon(TYPES[type].icon));
                    h.appendChild(document.createTextNode(' ' + bk.title));
                    sec.appendChild(h);
                    has = true;
                }

                if (type === 'imagen') {
                    const u = safeLink(bk.img || '');
                    if (u) {
                        const fig = el('figure', 'wkh-fig');
                        const im = document.createElement('img');
                        im.alt = bk.title || '';
                        im.loading = 'lazy';
                        im.src = u;
                        fig.appendChild(im);
                        if (bk.cap) fig.appendChild(el('figcaption', 'wkh-cap', bk.cap));
                        sec.appendChild(fig);
                        has = true;
                    }
                } else if (type === 'enlaces') {
                    const wrapL = el('div', 'wkh-links');
                    const lines = String(bk.body || '').split(/\r?\n/);
                    for (let i = 0; i < lines.length && wrapL.children.length < 8; i++) {
                        const parts = lines[i].split('|');
                        if (parts.length < 2) continue;
                        const txt = String(parts[0] || '').trim();
                        const url = safeLink(parts.slice(1).join('|').trim());
                        if (!txt || !url) continue;
                        if (url.charAt(0) === '#') {
                            const b = el('button', 'wkh-linkbtn int');
                            b.type = 'button';
                            b.appendChild(icon('fa-angle-right'));
                            b.appendChild(el('span', null, txt));
                            b.addEventListener('click', function () { location.hash = url; WK.route(); });
                            wrapL.appendChild(b);
                        } else {
                            const a = document.createElement('a');
                            a.className = 'wkh-linkbtn ext';
                            a.href = url;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            a.appendChild(icon('fa-arrow-up-right-from-square'));
                            a.appendChild(el('span', null, txt));
                            wrapL.appendChild(a);
                        }
                    }
                    if (wrapL.children.length) { sec.appendChild(wrapL); has = true; }
                } else {
                    /* TEXTO y AVISO: todo el poder de formats.js */
                    const bd = el('div', 'wk-body');
                    bd.innerHTML = renderMd(bk.body || '');
                    sec.appendChild(bd);
                    if (WK.formats && typeof WK.formats.enhance === 'function') {
                        try { WK.formats.enhance(bd); } catch (e) {}
                    }
                    has = !!String(bk.body || '').trim();
                }

                if (staff) {
                    sec.classList.add('wkh-has-tools');
                    sec.appendChild(self.tools(bk, idx, blocks.length));
                }

                if (has || staff) main.appendChild(sec);
            });
        },

        /* ---- Conexión segura con el Core (una sola vez) ---- */
        wrap: function () {
            if (this.wrapped || !WK.core || typeof WK.core.renderHome !== 'function') return;
            this.wrapped = true;
            const self = this;
            const orig = WK.core.renderHome;
            WK.core.renderHome = function (main) {
                orig.call(WK.core, main);
                try { self.paint(main); } catch (e) { console.warn('[Wiki] bloques del inicio:', e); }
            };
        }
    };

    /* ---- Init: envuelve renderHome ANTES del primer boot ---- */
    function boot() {
        injectStyles();
        if (!window.firebase) { console.warn('[Stevscon] edit_page.js: Firebase no está cargado.'); return; }
        WK.homeblocks.start();
        WK.homeblocks.wrap();
        if (!WK.homeblocks.wrapped) console.warn('[Stevscon] edit_page.js: no pude conectar con wiki_core.js (¿orden de scripts?).');
    }
    if (window.firebase && WK.core && typeof WK.core.renderHome === 'function') {
        boot();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        setTimeout(boot, 0);
    }

    console.log('[Stevscon] edit_page.js listo (v1) — bloques del inicio editables (solo staff).');
})(window, document);