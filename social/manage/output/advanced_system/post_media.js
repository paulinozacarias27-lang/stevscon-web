/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/post_media.js (v1)
 * MULTIMEDIA EN POSTS — imágenes y videos (SOLO posts; comentarios y
 * respuestas quedan como siempre).
 *
 *  - La MISMA mecánica de media_acc.js de Profiles: base64 directo al
 *    Realtime Database (sin Storage, sin reglas nuevas). Queda UNIDO a
 *    Profiles como StevsconProfiles.media.postProcess.
 *  - DIFERENCIA con media_acc.js: ese recorta a 256x256/1200x480 para
 *    avatares/banners. Aquí el archivo viaja TAL CUAL — sin recorte,
 *    sin bajar resolución, sin comprimir (los GIF animan, el PNG
 *    mantiene transparencia).
 *  - Máximo 10 archivos por post. La multimedia vive DENTRO del post:
 *    social/posts/{postId}/media  -> un solo write, cero reglas nuevas.
 *  - Conexión por HOOKS (sin invadir sistemas):
 *      · admin_post.js v6 lanza el hook 'composer' -> aquí ponemos el
 *        botón 🖼️ + previsualizaciones en el composer.
 *      · admin_post.js v6 llama postMedia.paint() al pintar cada
 *        tarjeta -> galería + lightbox con flechas.
 *      · El modal "Editar post" (editTextModal con max=MAX_POST) se
 *        POTENCIA aquí: gana el botón de multimedia.
 *      · El menú ⋯ de cada post gana la entrada "Multimedia" para
 *        cambiar solo las imágenes/videos.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.postMedia) return;
    const CONFIG = SCSOC.CONFIG;

    const PM = SCSOC.postMedia = { MAX: 10 };

    /* ==== UNIÓN con Profiles (media_acc.js): mismo sistema base64 ==== */
    function processFile(file) {
        return new Promise(function (resolve, reject) {
            if (!file || !file.type) return reject({ code: 'tipo' });
            const t = String(file.type);
            if (t.indexOf('image/') !== 0 && t.indexOf('video/') !== 0) return reject({ code: 'tipo' });
            const reader = new FileReader();
            reader.onerror = function () { reject({ code: 'lectura' }); };
            reader.onload = function () {
                const url = String(reader.result);
                if (/^data:(image|video)\//i.test(url)) resolve(url);
                else reject({ code: 'tipo' });
            };
            reader.readAsDataURL(file);
        });
    }
    try {
        const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
        SCp.media = SCp.media || {};
        SCp.media.postProcess = processFile;
    } catch (e) {}

    /* Normaliza lo guardado en la BD a un array limpio de dataURLs */
    function norm(media) {
        const out = [];
        const ok = function (u) { return typeof u === 'string' && /^data:(image|video)\//i.test(u); };
        if (Array.isArray(media)) media.forEach(function (u) { if (ok(u)) out.push(u); });
        else if (media && typeof media === 'object') {
            Object.keys(media).forEach(function (k) { if (ok(media[k])) out.push(media[k]); });
            out.sort(function (a, b) { return 0; }); /* orden de inserción */
        }
        return out;
    }

    /* ==== PICKER reutilizable (composer + modales de edición) ==== */
    function picker(host, initial) {
        const items = [];
        const bar = SCSOC.el('div', 'display:flex;align-items:center;gap:10px;');
        const btn = SCSOC.el('button', 'display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:700 12px Inter,sans-serif;padding:7px 12px;border-radius:8px;cursor:pointer;');
        btn.type = 'button';
        btn.innerHTML = '<i class="fa-solid fa-image"></i>';
        btn.title = 'Imágenes o videos (máx ' + PM.MAX + ')';
        const cnt = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font:600 11px Inter,sans-serif;');
        bar.appendChild(btn); bar.appendChild(cnt);
        const wrap = SCSOC.el('div', 'display:none;flex-wrap:wrap;gap:8px;align-items:flex-start;');
        host.appendChild(bar); host.appendChild(wrap);

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;
        input.style.display = 'none';
        host.appendChild(input);

        function paint() {
            while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
            items.forEach(function (url, i) {
                const cell = SCSOC.el('span', 'position:relative;width:84px;height:84px;border-radius:10px;overflow:hidden;border:1px solid var(--border-color,#2e2440);flex:none;');
                if (/^data:image\//i.test(url)) {
                    const im = document.createElement('img');
                    im.src = url; im.alt = ''; im.draggable = false;
                    im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                    cell.appendChild(im);
                } else {
                    const v = document.createElement('video');
                    v.src = url; v.muted = true; v.preload = 'metadata';
                    v.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                    cell.appendChild(v);
                    const play = SCSOC.el('span', 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff;font-size:15px;text-shadow:0 2px 6px rgba(0,0,0,.8);pointer-events:none;');
                    play.innerHTML = '<i class="fa-solid fa-play"></i>';
                    cell.appendChild(play);
                }
                const x = SCSOC.el('button', 'position:absolute;top:3px;right:3px;width:20px;height:20px;border:0;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font:800 10px Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;');
                x.type = 'button'; x.textContent = '✕'; x.title = 'Quitar';
                x.addEventListener('click', function () { items.splice(i, 1); paint(); });
                cell.appendChild(x);
                wrap.appendChild(cell);
            });
            wrap.style.display = items.length ? 'flex' : 'none';
            cnt.textContent = items.length ? (items.length + ' / ' + PM.MAX) : '';
            btn.style.opacity = items.length >= PM.MAX ? '.5' : '1';
        }

        btn.addEventListener('click', function () {
            if (items.length >= PM.MAX) { SCSOC.toast('Máximo ' + PM.MAX + ' archivos por post.'); return; }
            input.click();
        });
        input.addEventListener('change', function () {
            let files = Array.prototype.slice.call(input.files || []);
            input.value = '';
            if (!files.length) return;
            const room = PM.MAX - items.length;
            if (files.length > room) {
                SCSOC.toast('Máximo ' + PM.MAX + ' archivos por post.');
                files = files.slice(0, room);
            }
            btn.disabled = true; btn.style.opacity = '.5';
            let done = 0;
            files.forEach(function (f) {
                processFile(f)
                    .then(function (url) { if (items.length < PM.MAX) items.push(url); })
                    .catch(function () { SCSOC.toast('Archivo no válido (solo imágenes o videos).'); })
                    .then(function () {
                        if (++done === files.length) { btn.disabled = false; paint(); }
                    });
            });
        });

        norm(initial).forEach(function (u) { if (items.length < PM.MAX) items.push(u); });
        paint();

        return {
            get: function () { return items.slice(); },
            clear: function () { items.length = 0; paint(); }
        };
    }

    /* ==== GALERÍA en la tarjeta del post (+ lightbox de imágenes) ==== */
    PM.paint = function (host, media) {
        const arr = norm(media);
        /* firma barata (solo longitudes) para NO re-pintar en cada
         * child_changed de texto -> los videos no parpadean */
        const sig = arr.length + ':' + arr.map(function (u) { return u.length; }).join(',');
        if (host.dataset.scsocMediaSig === sig && (arr.length === 0 || host.firstChild)) return;
        host.dataset.scsocMediaSig = sig;

        while (host.firstChild) host.removeChild(host.firstChild);
        host.style.display = arr.length ? 'block' : 'none';
        if (!arr.length) return;

        const grid = SCSOC.el('div', arr.length > 1
            ? 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;'
            : 'display:block;');
        const imgs = [];
        arr.forEach(function (url) {
            if (/^data:image\//i.test(url)) {
                const im = document.createElement('img');
                im.src = url; im.alt = 'Imagen del post'; im.draggable = false;
                im.style.cssText = 'display:block;cursor:zoom-in;border:1px solid var(--border-color,#2e2440);border-radius:10px;' +
                    (arr.length > 1 ? 'width:100%;height:170px;object-fit:cover;' : 'max-width:100%;max-height:360px;');
                im.addEventListener('click', function () { lightbox(imgs, im); });
                imgs.push(im);
                grid.appendChild(im);
            } else {
                const v = document.createElement('video');
                v.src = url; v.controls = true; v.preload = 'metadata'; v.playsInline = true;
                v.style.cssText = 'display:block;border:1px solid var(--border-color,#2e2440);border-radius:10px;' +
                    (arr.length > 1 ? 'width:100%;height:170px;object-fit:cover;' : 'max-width:100%;max-height:480px;');
                grid.appendChild(v);
            }
        });
        host.appendChild(grid);
    };

    function lightbox(imgs, cur) {
        if (!imgs.length) return;
        let i = Math.max(0, imgs.indexOf(cur));
        const ov = SCSOC.el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2600;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;');
        const im = document.createElement('img');
        im.alt = ''; im.draggable = false;
        im.style.cssText = 'max-width:92vw;max-height:88vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.7);';
        ov.appendChild(im);
        const paint = function () { im.src = imgs[i].src; };
        const close = function () {
            if (ov.parentNode) ov.parentNode.removeChild(ov);
            document.removeEventListener('keydown', key, true);
        };
        const key = function (e) {
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
            else if (e.key === 'ArrowRight') { i = (i + 1) % imgs.length; paint(); }
            else if (e.key === 'ArrowLeft') { i = (i - 1 + imgs.length) % imgs.length; paint(); }
        };
        if (imgs.length > 1) {
            const mk = function (icon, side, fn) {
                const b = SCSOC.el('button', 'position:fixed;' + side + ':16px;top:50%;transform:translateY(-50%);width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:17px;cursor:pointer;');
                b.type = 'button'; b.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
                b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
                ov.appendChild(b);
            };
            mk('fa-chevron-left', 'left', function () { i = (i - 1 + imgs.length) % imgs.length; paint(); });
            mk('fa-chevron-right', 'right', function () { i = (i + 1) % imgs.length; paint(); });
        }
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        document.addEventListener('keydown', key, true);
        paint();
        document.body.appendChild(ov);
    }

    /* ==== COMPOSER (admin_post.js v6 invita vía hook 'composer') ==== */
    const _pickers = new WeakMap();
    SCSOC.onHook('composer', function (ctx) {
        if (!ctx || !ctx.box || !ctx.col || !ctx.foot || _pickers.has(ctx.box)) return;
        const slot = SCSOC.el('div', 'display:flex;flex-direction:column;gap:8px;');
        if (ctx.foot.parentNode === ctx.col) ctx.col.insertBefore(slot, ctx.foot);
        else ctx.col.appendChild(slot);
        _pickers.set(ctx.box, picker(slot, null));
    }); 

    PM.composerGet = function (box) {
        const pk = box && _pickers.get(box);
        const arr = pk ? pk.get() : [];
        return arr.length ? arr : null;
    };
    PM.composerClear = function (box) {
        const pk = box && _pickers.get(box);
        if (pk) pk.clear();
    };

    /* ==== GUARDAR multimedia de un post existente ==== */
    function saveMedia(postId, arr, withToast) {
        SCSOC.db().ref(CONFIG.POSTS).child(postId).child('media')
            .set(arr && arr.length ? arr : null)
            .then(function () { if (withToast) SCSOC.toast('Multimedia actualizada ✓'); })
            .catch(function () { SCSOC.toast('No se pudo guardar (¿archivos muy pesados para la BD?).'); });
    }

    /* ==== EDITOR: modal de post CON botón de multimedia ====
     * onSave presente  -> "Editar post" (textarea + multimedia; al
     *                     guardar, edit.js actualiza el texto y aquí
     *                     la multimedia).
     * onSave ausente   -> "Multimedia del post" (solo archivos). */
    function openEditor(post, text, max, onSave) {
        const isEdit = typeof onSave === 'function';
        const ov = SCSOC.el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2500;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;');
        const box = SCSOC.el('div', 'width:min(520px,100%);background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:18px;font-family:Inter,sans-serif;box-sizing:border-box;max-height:86vh;overflow:auto;');
        ov.appendChild(box);
        let closed = false;
        const close = function () {
            if (closed) return;
            closed = true;
            if (ov.parentNode) ov.parentNode.removeChild(ov);
            document.removeEventListener('keydown', esc, true);
        };
        const esc = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        document.addEventListener('keydown', esc, true);
        document.body.appendChild(ov);

        const h = SCSOC.el('h3', 'margin:0 0 10px;color:var(--text-main,#f8fafc);font:800 15px Inter,sans-serif;');
        h.textContent = isEdit ? 'Editar post' : 'Multimedia del post';
        box.appendChild(h);

        let ta = null, paintCnt = null;
        if (isEdit) {
            ta = SCSOC.el('textarea', 'width:100%;box-sizing:border-box;min-height:130px;resize:vertical;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;font:400 13px/1.55 Inter,sans-serif;outline:none;');
            ta.value = text || ''; ta.maxLength = max;
            const cnt = SCSOC.el('div', 'text-align:right;color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;margin:4px 0 10px;');
            paintCnt = function () { cnt.textContent = ta.value.length + ' / ' + max; };
            ta.addEventListener('input', paintCnt); paintCnt();
            box.appendChild(ta); box.appendChild(cnt);
        }

        const slot = SCSOC.el('div', 'display:flex;flex-direction:column;gap:8px;');
        box.appendChild(slot);
        const pk = picker(slot, post ? post.media : null);

        const row = SCSOC.el('div', 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px;');
        const mkBtn = function (txt, kind) {
            const st = {
                sec: 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);',
                pri: 'border:0;background:var(--purple-accent,#8b5cf6);color:#fff;'
            }[kind];
            const b = SCSOC.el('button', st + 'font:800 12px Inter,sans-serif;padding:8px 16px;border-radius:999px;cursor:pointer;');
            b.type = 'button'; b.textContent = txt;
            return b;
        };
        const c = mkBtn('Cancelar', 'sec'), ok = mkBtn(isEdit ? 'Guardar' : 'Guardar multimedia', 'pri');
        c.addEventListener('click', close);
        ok.addEventListener('click', function () {
            const media = pk.get();
            if (isEdit) {
                const t = ta.value.trim();
                if (!t) { SCSOC.toast('No puede quedar vacío.'); return; }
                close();
                onSave(t);                       /* texto + editedAt (edit_post.js) */
                saveMedia(post.id, media, false);/* multimedia (aquí, sin doble toast) */
            } else {
                close();
                saveMedia(post.id, media, true);
            }
        });
        row.appendChild(c); row.appendChild(ok);
        box.appendChild(row);
        if (isEdit) setTimeout(function () { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
    }

    /* El modal compartido editTextModal, cuando es de POST (max = MAX_POST),
     * se potencia con multimedia. Comentarios/respuestas pasan intactos. */
    if (SCSOC.editTextModal) {
        const _origModal = SCSOC.editTextModal;
        SCSOC.editTextModal = function (title, text, max, onSave) {
            if (max === CONFIG.MAX_POST && _menuPost && typeof onSave === 'function') {
                const post = _menuPost;
                _menuPost = null;
                openEditor(post, text, max, onSave);
                return;
            }
            return _origModal.apply(null, arguments);
        };
    }

    /* El post abierto en el menú ⋯ de ahora (para saber a quién editar) */
    let _menuPost = null;
    SCSOC.onHook('postMenu', function (ctx) {
        _menuPost = (ctx && ctx.post) || null;
        if (!SCSOC.menuAdd || !ctx || !ctx.post || !firebase.auth().currentUser) return;
        SCSOC.isStaff(function (ok) {
            if (!ok) return;
            SCSOC.menuAdd(ctx, {
                label: 'Multimedia',
                icon: 'fa-images',
                fn: function () { openEditor(ctx.post, null, 0, null); }
            });
        });
    });

    console.log('[Stevscon] post_media.js listo (v1) — multimedia en posts vía base64 (mecánica media_acc), máx ' + PM.MAX + ' archivos.');
})(window, document);