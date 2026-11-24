/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/pages/edit_page.js (v2)
 * EDITOR DEL INICIO: bloques personalizados para la portada.
 *  - Tipos: TEXTO (formatos completos), AVISO (callout destacado),
 *    IMAGEN (URL o subida optimizada) y BOTONES (hasta 10, con icono
 *    y color de su plataforma).
 *  - Botones de editar/subir/bajar/borrar SOLO para Owner y Admins.
 *  - Override seguro de MC.core.renderHome — el core NO se toca.
 *  - Datos: mc/home/{blockId} = {type, title, body, img, cap, order,
 *    createdAt, updatedAt, by} — SIN cambios de rules.
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const toast = function (m, k) { if (MC.toast) MC.toast(m, k); };
    const dbf = function () { return firebase.database(); };

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function closeOvl(ovl) { if (ovl && ovl.parentNode) ovl.parentNode.removeChild(ovl); }
    function renderMd(src) {
        if (MC.formats && typeof MC.formats.md === 'function') {
            try { return MC.formats.md(src); } catch (e) {}
        }
        const esc = function (s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
        return String(src || '').split(/\r?\n/).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    }
    function safeLink(u) {
        u = String(u || '').trim();
        if (/^#(p|c|s)\//.test(u)) return u;
        if (MC.formats && typeof MC.formats.safeUrl === 'function') {
            try { return MC.formats.safeUrl(u) || ''; } catch (e) {}
        }
        return /^https:\/\//i.test(u) ? u : '';
    }
    function isInternal(u) { return /^#(p|c|s)\//.test(String(u || '')); }

    const BRANDS = [
        { re: /discord\.(com|gg|me)/i,        icon: 'fa-brands fa-discord',    color: '#5865F2' },
        { re: /youtube\.com|youtu\.be/i,      icon: 'fa-brands fa-youtube',    color: '#FF0000' },
        { re: /x\.com|twitter\.com/i,         icon: 'fa-brands fa-x-twitter',  color: 'var(--text-main)' },
        { re: /tiktok\.com/i,                 icon: 'fa-brands fa-tiktok',     color: 'var(--text-main)' },
        { re: /twitch\.tv/i,                  icon: 'fa-brands fa-twitch',     color: '#9146FF' },
        { re: /instagram\.com/i,              icon: 'fa-brands fa-instagram',  color: '#E1306C' },
        { re: /github\.com/i,                 icon: 'fa-brands fa-github',     color: 'var(--text-main)' },
        { re: /steamcommunity\.com|steampowered\.com/i, icon: 'fa-brands fa-steam', color: '#66c0f4' },
        { re: /reddit\.com/i,                 icon: 'fa-brands fa-reddit',     color: '#FF4500' },
        { re: /t\.me|telegram\.org/i,         icon: 'fa-brands fa-telegram',   color: '#26A5E4' },
        { re: /whatsapp\.com|wa\.me/i,        icon: 'fa-brands fa-whatsapp',   color: '#25D366' },
        { re: /facebook\.com|fb\.com/i,       icon: 'fa-brands fa-facebook',   color: '#1877F2' },
        { re: /spotify\.com/i,                icon: 'fa-brands fa-spotify',    color: '#1DB954' },
        { re: /kick\.com/i,                   icon: 'fa-brands fa-kickstarter', color: '#53FC18' },
        { re: /patreon\.com/i,                icon: 'fa-brands fa-patreon',    color: '#FF424D' }
    ];
    function brandFor(url) {
        for (let i = 0; i < BRANDS.length; i++) { if (BRANDS[i].re.test(url)) return BRANDS[i]; }
        return null;
    }

    const TYPES = {
        texto:   { label: 'Texto',   icon: 'fa-align-left' },
        aviso:   { label: 'Aviso',   icon: 'fa-bullhorn' },
        imagen:  { label: 'Imagen',  icon: 'fa-image' },
        enlaces: { label: 'Botones', icon: 'fa-link' }
    };

    const CSS = `
    .mch-block{position:relative}
    .mch-has-tools h2{padding-right:150px}
    .mch-tools{position:absolute;top:-6px;right:0;display:inline-flex;gap:6px;z-index:5}
    .mch-toolrow{display:flex;justify-content:flex-end;margin:0 0 10px}
    .mch-toolrow .mch-tools{position:static}
    .mch-tbtn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);border-radius:0;cursor:pointer;font-size:12px;transition:color .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mch-tbtn:hover{color:var(--mc-accent,#7fdc3a);border-color:#000}
    .mch-tbtn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mch-tbtn.danger:hover{color:var(--redstone,#ff5545);border-color:#000}
    .mch-tbtn.arm{background:var(--redstone,#ff5545);border-color:#000;color:#fff}
    .mch-addbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:3px dashed var(--border-color,#2f3626);border-radius:0;padding:13px 16px;margin:4px 0 12px}
    .mch-addbtn{display:inline-flex;align-items:center;gap:8px;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--mc-accent,#7fdc3a);border-radius:0;padding:8px 16px;font:700 12px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:background .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mch-addbtn:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mch-addbtn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mch-addhint{color:var(--text-muted,#98a28c);font:600 12px var(--ui-font),sans-serif;line-height:1.6}

    .mch-callout{position:relative;overflow:hidden;background:rgba(127,220,58,.08);border:3px solid #000;border-left:6px solid var(--mc-accent,#7fdc3a);border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);padding:15px 18px}
    .mch-callout .mc-body{font-size:14px;line-height:1.7}
    .mch-callout .mc-body>:first-child{margin-top:0}
    .mch-callout .mc-body>:last-child{margin-bottom:0}
    html[data-theme="light"] .mch-callout{background:rgba(62,125,20,.08);border-color:#000;border-left-color:var(--mc-accent,#3e7d14)}

    .mch-links{display:flex;flex-wrap:wrap;gap:10px}
    .mch-linkbtn{display:inline-flex;align-items:center;gap:9px;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-main,#eef4e6);border-radius:0;padding:10px 18px;font:700 13px var(--ui-font),sans-serif;cursor:pointer;text-decoration:none;transition:transform .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mch-linkbtn i{color:var(--bkc,var(--mc-accent,#7fdc3a));font-size:15px}
    .mch-linkbtn.ext:hover{border-color:var(--bkc,var(--mc-accent,#7fdc3a));transform:translate(-2px,-2px);box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4),inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mch-linkbtn.int{background:var(--mc-dark,#4a8f1d);border-color:#000;color:#eaf7dd}
    .mch-linkbtn.int i{color:#eaf7dd}
    .mch-linkbtn.int:hover{background:var(--mc-accent,#7fdc3a);color:#16300a;transform:translate(-2px,-2px)}
    .mch-linkbtn.int:hover i{color:#16300a}
    .mch-linkbtn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    html[data-theme="light"] .mch-linkbtn.ext:hover{box-shadow:0 0 0 2px var(--border-color,#a8b58c),5px 5px 0 rgba(28,36,21,.25),inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}

    .mch-rows{display:flex;flex-direction:column;gap:8px}
    .mch-row{display:flex;gap:8px;align-items:center}
    .mch-row input{flex:1;min-width:0}
    .mch-rowdel{flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);border-radius:0;cursor:pointer;font-size:12px;transition:color .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mch-rowdel:hover{color:var(--redstone,#ff5545);border-color:#000}
    .mch-addrow{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--mc-accent,#7fdc3a);border-radius:0;padding:7px 14px;font:700 11.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:background .12s steps(2,end);box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mch-addrow:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mch-addrow:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}

    .mch-fig{margin:0}
    .mch-fig img{width:100%;max-height:460px;object-fit:cover;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);display:block}
    .mch-cap{margin-top:8px;color:var(--text-muted,#98a28c);font:600 12px var(--ui-font),sans-serif;text-align:center;line-height:1.6}
    .mch-imgprev{max-height:150px;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);display:block;margin-top:8px}
    `;
    function injectStyles() {
        if (document.getElementById('mch-home-style')) return;
        const st = document.createElement('style');
        st.id = 'mch-home-style';
        st.textContent = CSS;
        document.head.appendChild(st);
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
                    while (out.length > 90000 && q > 0.35) { q -= 0.15; out = cv.toDataURL('image/jpeg', q); }
                    if (out.length > 90000) return cb(null, 'La imagen es demasiado grande incluso reescalada.');
                    cb(out, null);
                };
                im.onerror = function () { cb(null, 'Ese archivo no parece una imagen válida.'); };
                im.src = String(fr.result);
            };
            fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
            fr.readAsDataURL(file);
        } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
    }

    MC.homeblocks = {
        map: {}, wrapped: false,

        start: function () {
            const self = this;
            dbf().ref('mc/home').on('value', function (s) {
                self.map = s.val() || {};
                document.dispatchEvent(new CustomEvent('sc:mc-data'));
            }, function (err) { console.warn('[StevsMCross] lectura de bloques del inicio:', err && err.code); });
        },

        all: function () {
            const out = [];
            const map = this.map;
            Object.keys(map).forEach(function (id) {
                if (map[id]) out.push(Object.assign({ id: id }, map[id]));
            });
            return out.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        },
        isStaff: function () { return !!(MC.core && MC.core.staffView && MC.core.staffView()); },

        create: function (data) {
            data.order = Date.now();
            data.createdAt = Date.now();
            return dbf().ref('mc/home').push().set(data);
        },
        save: function (id, data) {
            return dbf().ref('mc/home/' + id).update(data);
        },
        remove: function (id) {
            return dbf().ref('mc/home/' + id).remove();
        },
        move: function (id, dir) {
            const list = this.all();
            let i = -1;
            for (let k = 0; k < list.length; k++) { if (list[k].id === id) { i = k; break; } }
            const j = i + dir;
            if (i < 0 || j < 0 || j >= list.length) return Promise.resolve();
            const a = list[i], b = list[j];
            const upd = {};
            upd['mc/home/' + a.id + '/order'] = (b.order || 0);
            upd['mc/home/' + b.id + '/order'] = (a.order || 0);
            return dbf().ref().update(upd);
        },

        tools: function (bk, idx, total) {
            const self = this;
            const t = el('div', 'mch-tools');
            function mk(ic, titleTxt, fn) {
                const b = el('button', 'mch-tbtn');
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

            const del = el('button', 'mch-tbtn danger');
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

        openEditor: function (id) {
            if (!this.isStaff()) { toast('Solo el Owner y los Administradores pueden editar StevsMCross.', 'error'); return; }
            const self = this;
            const cur = id ? (this.map[id] || {}) : null;

            const ovl = el('div', 'mc-ovl');
            ovl.id = 'mch-ovl';
            const panel = el('div', 'mc-panel');
            ovl.appendChild(panel);
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);

            const close = el('button', 'mc-close');
            close.type = 'button';
            close.appendChild(icon('fa-xmark'));
            close.addEventListener('click', function () { closeOvl(ovl); });
            panel.appendChild(close);

            panel.appendChild(el('h2', null, id ? 'Editar bloque' : 'Nuevo bloque del inicio'));
            panel.appendChild(el('p', 'mc-sub', 'Los bloques se muestran en la portada, debajo de "Explorar por categoría".'));

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
            body.placeholder = '## Escribe aquí...\n\n**negrita**, *cursiva*, __subrayado__, ~~tachado~~, ==marcado==\n- listas\n`código` con color: `texto`#ff0000\n[enlaces](https://...), ![](imagen) y ||spoiler||';

            const hint = el('p', 'mc-hint', '');

            const rowsBox = el('div', 'mch-rows');
            function makeRow(txt, url) {
                const row = el('div', 'mch-row');
                const t = document.createElement('input');
                t.type = 'text'; t.maxLength = 40;
                t.placeholder = 'Texto (ej: Discord)';
                t.value = txt || '';
                const u = document.createElement('input');
                u.type = 'text';
                u.placeholder = 'https://... o #p/pagina';
                u.value = url || '';
                const del = el('button', 'mch-rowdel');
                del.type = 'button';
                del.title = 'Quitar botón';
                del.setAttribute('aria-label', 'Quitar botón');
                del.appendChild(icon('fa-xmark'));
                del.addEventListener('click', function () {
                    if (rowsBox.children.length > 1) row.parentNode.removeChild(row);
                    else { t.value = ''; u.value = ''; }
                });
                row.appendChild(t); row.appendChild(u); row.appendChild(del);
                return row;
            }
            function parseLinkLines(src) {
                const out = [];
                String(src || '').split(/\r?\n/).forEach(function (line) {
                    const parts = line.split('|');
                    if (parts.length < 2) return;
                    const txt = String(parts[0] || '').trim();
                    const url = parts.slice(1).join('|').trim();
                    if (txt && url) out.push([txt, url]);
                });
                return out;
            }
            const addRow = el('button', 'mch-addrow');
            addRow.type = 'button';
            addRow.appendChild(icon('fa-plus'));
            addRow.appendChild(document.createTextNode(' Añadir botón'));
            addRow.addEventListener('click', function () {
                if (rowsBox.children.length >= 10) return toast('Máximo 10 botones por bloque.', 'error');
                rowsBox.appendChild(makeRow('', ''));
            });
            const linksW = el('div');
            linksW.appendChild(el('label', null, 'BOTONES (HASTA 10)'));
            linksW.appendChild(rowsBox);
            linksW.appendChild(addRow);
            linksW.appendChild(hint);

            const img = document.createElement('input');
            img.type = 'text';
            img.placeholder = 'Pega una URL https o sube una imagen...';
            const imgPrev = document.createElement('img');
            imgPrev.className = 'mch-imgprev';
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
                bodyW.style.display = (t === 'texto' || t === 'aviso') ? '' : 'none';
                linksW.style.display = (t === 'enlaces') ? '' : 'none';
                imgW.style.display = (t === 'imagen') ? '' : 'none';
                capW.style.display = (t === 'imagen') ? '' : 'none';
                if (t === 'enlaces') {
                    hint.textContent = 'Cada botón detecta su icono y color solo: Discord, YouTube, X, TikTok, Twitch y más. Para páginas internas de StevsMCross usa #p/nombre-pagina.';
                } else if (t === 'aviso') {
                    hint.textContent = 'Anuncio destacado en caja verde. Mismos formatos que Texto: ## títulos, **negrita**, listas, `código` con color, ||spoiler||.';
                } else if (t === 'imagen') {
                    hint.textContent = 'Puedes subir imágenes de hasta 20MB: se optimizan solas.';
                } else {
                    hint.textContent = 'Tienes TODOS los formatos de StevsMCross: ## títulos, **negrita**, listas, `código` con color, ||spoiler||, imágenes y enlaces.';
                }
            }
            typeSel.addEventListener('change', syncType);

            img.addEventListener('change', function () {
                const u = String(img.value || '').trim();
                if (/^https:\/\//i.test(u) || /^data:image\//.test(u)) {
                    if (u.length > 90000) { toast('La imagen pasa de 9MB guardada; sube una más ligera.', 'error'); return; }
                    imgPrev.src = u;
                    imgPrev.style.display = 'block';
                } else {
                    imgPrev.style.display = 'none';
                }
            });

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
                if (MC.system && typeof MC.system.shrinkImage === 'function') {
                    MC.system.shrinkImage(f, { maxDim: 1920, targetStr: 20000, hardStr: 90000 }, finish);
                } else {
                    shrink(f, finish);
                }
            });

            const form = el('div', 'mc-form');
            form.appendChild(el('label', null, 'TIPO DE BLOQUE'));
            form.appendChild(typeSel);
            form.appendChild(el('label', null, 'TÍTULO'));
            form.appendChild(title);
            form.appendChild(bodyW);
            form.appendChild(linksW);
            form.appendChild(imgW);
            form.appendChild(capW);

            if (cur) {
                typeSel.value = TYPES[cur.type] ? cur.type : 'texto';
                title.value = cur.title || '';
                body.value = cur.body || '';
                img.value = cur.img || '';
                cap.value = cur.cap || '';
                if (cur.img) { imgPrev.src = cur.img; imgPrev.style.display = 'block'; }
                const existing = parseLinkLines(cur.body);
                existing.forEach(function (p) { rowsBox.appendChild(makeRow(p[0], p[1])); });
            } else {
                typeSel.value = 'texto';
            }
            if (!rowsBox.children.length) rowsBox.appendChild(makeRow('', ''));
            syncType();

            const bSave = el('button', 'mc-btn pri');
            bSave.type = 'button';
            bSave.appendChild(icon('fa-floppy-disk'));
            bSave.appendChild(document.createTextNode(id ? ' Guardar bloque' : ' Crear bloque'));
            bSave.addEventListener('click', function () {
                const t = typeSel.value;
                const data = {
                    type: t,
                    title: String(title.value || '').trim().slice(0, 120),
                    body: '',
                    img: '',
                    cap: '',
                    updatedAt: Date.now(),
                    by: (MC.system && MC.system.session && (MC.system.session.name || MC.system.session.username)) || 'Staff'
                };
                if (t === 'enlaces') {
                    const lines = [];
                    let bad = false;
                    Array.prototype.forEach.call(rowsBox.children, function (row) {
                        const ins = row.querySelectorAll('input');
                        const txt = String(ins[0].value || '').trim().replace(/\|/g, '').slice(0, 40);
                        const url = String(ins[1].value || '').trim();
                        if (!txt && !url) return;
                        if (!txt || !safeLink(url)) { bad = true; return; }
                        lines.push(txt + ' | ' + url);
                    });
                    if (bad) return toast('Revisa los botones: cada uno necesita texto y un enlace válido (https:// o #p/pagina).', 'error');
                    if (!lines.length) return toast('Añade al menos un botón con texto y enlace.', 'error');
                    data.body = lines.join('\n');
                } else if (t !== 'imagen') {
                    data.body = String(body.value || '').slice(0, 20000);
                    if (!data.body.trim()) return toast('Escribe el contenido del bloque.', 'error');
                }
                if (t === 'imagen') {
                    const u = String(img.value || '').trim();
                    if (u.charAt(0) === '#') return toast('Para imágenes usa una URL https o sube un archivo.', 'error');
                    if (!safeLink(u)) return toast('Pon una URL https o sube una imagen.', 'error');
                    if (u.length > 90000) return toast('La imagen es demasiado grande incluso optimizada.', 'error');
                    data.img = u;
                    data.cap = String(cap.value || '').trim().slice(0, 240);
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

        paint: function (main) {
            if (!main) return;
            const staff = this.isStaff();
            const blocks = this.all();

            Array.prototype.forEach.call(main.children, function (sec) {
                if (!sec.classList || !sec.classList.contains('mc-sec')) return;
                const h = sec.querySelector('h2');
                if (h && h.textContent.indexOf('Últimas páginas') !== -1 && sec.parentNode) {
                    sec.parentNode.removeChild(sec);
                }
            });

            if (blocks.length) {
                const emp = main.querySelector('.mc-empty');
                if (emp && emp.parentNode) {
                    const h3 = emp.querySelector('h3');
                    if (h3 && h3.textContent.indexOf('vacío') !== -1) emp.parentNode.removeChild(emp);
                }
            }

            if (staff) {
                const bar = el('div', 'mch-addbar');
                const add = el('button', 'mch-addbtn');
                add.type = 'button';
                add.appendChild(icon('fa-plus'));
                add.appendChild(document.createTextNode(' Añadir bloque'));
                add.addEventListener('click', function () { MC.homeblocks.openEditor(null); });
                bar.appendChild(add);
                bar.appendChild(el('span', 'mch-addhint', 'Bloques a medida para el inicio: texto, avisos, imágenes y botones (solo el staff ve esto).'));
                main.appendChild(bar);
            }

            if (!blocks.length) return;

            const self = this;
            blocks.forEach(function (bk, idx) {
                const type = TYPES[bk.type] ? bk.type : 'texto';
                const sec = el('section', 'mc-sec mch-block mch-' + type);
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
                        const fig = el('figure', 'mch-fig');
                        const im = document.createElement('img');
                        im.alt = bk.title || '';
                        im.loading = 'lazy';
                        im.src = u;
                        fig.appendChild(im);
                        if (bk.cap) fig.appendChild(el('figcaption', 'mch-cap', bk.cap));
                        sec.appendChild(fig);
                        has = true;
                    }
                } else if (type === 'enlaces') {
                    const wrapL = el('div', 'mch-links');
                    const lines = String(bk.body || '').split(/\r?\n/);
                    for (let i = 0; i < lines.length && wrapL.children.length < 10; i++) {
                        const parts = lines[i].split('|');
                        if (parts.length < 2) continue;
                        const txt = String(parts[0] || '').trim();
                        const url = safeLink(parts.slice(1).join('|').trim());
                        if (!txt || !url) continue;
                        if (isInternal(url)) {
                            const b = el('button', 'mch-linkbtn int');
                            b.type = 'button';
                            b.appendChild(icon('fa-angle-right'));
                            b.appendChild(el('span', null, txt));
                            b.addEventListener('click', function () { location.hash = url; MC.route(); });
                            wrapL.appendChild(b);
                        } else {
                            const a = document.createElement('a');
                            a.className = 'mch-linkbtn ext';
                            a.href = url;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            const br = brandFor(url);
                            if (br) a.style.setProperty('--bkc', br.color);
                            a.appendChild(icon(br ? br.icon : 'fa-arrow-up-right-from-square'));
                            a.appendChild(el('span', null, txt));
                            wrapL.appendChild(a);
                        }
                    }
                    if (wrapL.children.length) { sec.appendChild(wrapL); has = true; }
                    else if (staff) { sec.appendChild(el('p', 'mch-addhint', 'Este bloque de botones está vacío: edítalo para añadir botones.')); has = true; }
                } else if (type === 'aviso') {
                    if (String(bk.body || '').trim()) {
                        const co = el('div', 'mch-callout');
                        const bd = el('div', 'mc-body');
                        bd.innerHTML = renderMd(bk.body || '');
                        co.appendChild(bd);
                        if (MC.formats && typeof MC.formats.enhance === 'function') {
                            try { MC.formats.enhance(bd); } catch (e) {}
                        }
                        sec.appendChild(co);
                        has = true;
                    }
                } else {
                    const bd = el('div', 'mc-body');
                    bd.innerHTML = renderMd(bk.body || '');
                    sec.appendChild(bd);
                    if (MC.formats && typeof MC.formats.enhance === 'function') {
                        try { MC.formats.enhance(bd); } catch (e) {}
                    }
                    has = !!String(bk.body || '').trim();
                }

                if (staff) {
                    const t = self.tools(bk, idx, blocks.length);
                    if (bk.title) {
                        sec.classList.add('mch-has-tools');
                        sec.appendChild(t);
                    } else {
                        const row = el('div', 'mch-toolrow');
                        row.appendChild(t);
                        sec.appendChild(row);
                    }
                }

                if (has || staff) main.appendChild(sec);
            });
        },

        wrap: function () {
            if (this.wrapped || !MC.core || typeof MC.core.renderHome !== 'function') return;
            this.wrapped = true;
            const self = this;
            const orig = MC.core.renderHome;
            MC.core.renderHome = function (main) {
                orig.call(MC.core, main);
                try { self.paint(main); } catch (e) { console.warn('[StevsMCross] bloques del inicio:', e); }
            };
        }
    };

    function boot() {
        injectStyles();
        if (!window.firebase) { console.warn('[Stevscon] edit_page.js: Firebase no está cargado.'); return; }
        MC.homeblocks.start();
        MC.homeblocks.wrap();
        if (!MC.homeblocks.wrapped) console.warn('[Stevscon] edit_page.js: no pude conectar con mc_core.js (¿orden de scripts?).');
    }
    if (window.firebase && MC.core && typeof MC.core.renderHome === 'function') {
        boot();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        setTimeout(boot, 0);
    }

    console.log('[Stevscon] edit_page.js listo (v2) — bloques del inicio de StevsMCross (solo staff edita).');
})(window, document);
