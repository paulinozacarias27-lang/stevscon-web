/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/post_media.js (v2)
 * MULTIMEDIA EN POSTS — imágenes y videos (SOLO posts).
 *
 *  v2 · LÍMITES Y COMPRESIÓN (el admin postea, pero la BD no es basurero):
 *   - Imagen ≤ IMG_PASS_B64  -> pasa INTACTA (GIF anima, PNG transparente).
 *   - Imagen grande          -> canvas: PNG se re-escala (transparencia se
 *      conserva si puede), cae a JPEG si no alcanza. Objetivo ~90KB b64.
 *   - Video                  -> máx 2 MB reales (sin compresión posible).
 *   - Presupuesto TOTAL por post: ~2.8 MB en base64 (los 10 archivos juntos).
 *   - Reglas nuevas validan media/$i ≤ 2.8MB en el servidor (parche v2).
 *  Lo demás IDÉNTICO a v1: hooks composer/paint/postMenu, editTextModal
 *  potenciado, galería + lightbox, unión con StevsconProfiles.media.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.postMedia) return;
    const CONFIG = SCSOC.CONFIG;

    const IMG_PASS_B64 = 120000;    /* pasa intacta hasta ~90KB reales */
    const IMG_TARGET_B64 = 90000;   /* objetivo tras comprimir */
    const VID_MAX_RAW = 2 * 1024 * 1024;
    const TOTAL_MAX_B64 = 2800000;  /* presupuesto de TODO el post */

    const PM = SCSOC.postMedia = {
        MAX: 10,
        LIMITS: { IMG_PASS_B64: IMG_PASS_B64, IMG_TARGET_B64: IMG_TARGET_B64, VID_MAX_RAW: VID_MAX_RAW, TOTAL_MAX_B64: TOTAL_MAX_B64 }
    };

    /* ==== UNIÓN con Profiles (media_acc.js): misma mecánica base64 ====
     * Este va SIN comprimir: avatares/banners se recortan pequeños
     * aguas abajo y la transparencia del PNG es sagrada ahí. */
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

    /* ==== NORMALIZA lo guardado en la BD a un array limpio de dataURLs ==== */
    function norm(media) {
        const out = [];
        const ok = function (u) { return typeof u === 'string' && /^data:(image|video)\//i.test(u) && u.length <= TOTAL_MAX_B64; };
        if (Array.isArray(media)) media.forEach(function (u) { if (ok(u)) out.push(u); });
        else if (media && typeof media === 'object') {
            Object.keys(media).forEach(function (k) { if (ok(media[k])) out.push(media[k]); });
        }
        return out;
    }

    /* ==== LECTURA + COMPRESIÓN (solo para POSTS; Profiles sigue intacto) ==== */
    function readAsDataURL(file, cb) {
        const r = new FileReader();
        r.onload = function () { cb(String(r.result || '')); };
        r.onerror = function () { cb(''); };
        r.readAsDataURL(file);
    }
    function loadImg(dataUrl, cb) {
        const im = new Image();
        im.onload = function () { cb(im); };
        im.onerror = function () { cb(null); };
        im.src = dataUrl;
    }
    function shrink(im, w, h, q, png, fill) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (fill) { ctx.fillStyle = '#1a1625'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(im, 0, 0, w, h);
        return c.toDataURL(png ? 'image/png' : 'image/jpeg', q);
    }
    /* File -> dataURL liviano o rechazo {code:'big'} */
    function fitFile(file) {
        return new Promise(function (resolve, reject) {
            const t = String(file.type || '');
            const isVid = t.indexOf('video/') === 0;
            const isImg = t.indexOf('image/') === 0;
            if (!isVid && !isImg) return reject({ code: 'tipo' });
            if (isVid) {
                if (file.size > VID_MAX_RAW) return reject({ code: 'bigvideo' });
                return readAsDataURL(file, function (u) {
                    if (u.indexOf('data:video/') !== 0) reject({ code: 'tipo' });
                    else if (u.length > TOTAL_MAX_B64) reject({ code: 'bigvideo' });
                    else resolve(u);
                });
            }
            readAsDataURL(file, function (dataUrl) {
                if (dataUrl.indexOf('data:image/') !== 0) return reject({ code: 'tipo' });
                /* liviana: intacta (GIF anima, PNG transparente, cero pérdida) */
                if (dataUrl.length <= IMG_PASS_B64) return resolve(dataUrl);
                /* GIF grande NO se toca: el canvas mataría la animación */
                if (/^data:image\/gif/.test(dataUrl)) return reject({ code: 'big' });
                loadImg(dataUrl, function (im) {
                    if (!im || !im.width) return reject({ code: 'tipo' });
                    const isPng = /^data:image\/png/.test(dataUrl);
                    let w = im.width, h = im.height;
                    const sc0 = Math.min(1, 1600 / Math.max(w, h));
                    w = Math.max(1, Math.round(w * sc0));
                    h = Math.max(1, Math.round(h * sc0));
                    /* intento 1: PNG re-escala conservando transparencia */
                    if (isPng) {
                        let tries = 0, out = shrink(im, w, h, 1, true, false);
                        while (out.length > IMG_TARGET_B64 && tries < 3) {
                            w = Math.max(1, Math.round(w * 0.75));
                            h = Math.max(1, Math.round(h * 0.75));
                            out = shrink(im, w, h, 1, true, false);
                            tries++;
                        }
                        if (out.length <= IMG_TARGET_B64) return resolve(out);
                    }
                    /* intento 2: bucle JPEG progresivo (transparencia -> fondo) */
                    let q = 0.82, guard = 0, out = shrink(im, w, h, q, false, true);
                    while (out.length > IMG_TARGET_B64 && guard < 6) {
                        if (q > 0.52) q -= 0.16;
                        else { w = Math.max(1, Math.round(w * 0.72)); h = Math.max(1, Math.round(h * 0.72)); }
                        out = shrink(im, w, h, Math.max(0.42, q), false, true);
                        guard++;
                    }
                    if (out.length <= IMG_TARGET_B64 * 1.15) resolve(out);
                    else reject({ code: 'big' });
                });
            });
        });
    }

    /* ==== PICKER reutilizable (composer + modales de edición) ==== */
    function picker(host, initial) {
        const items = [];
        const totalLen = function () { return items.reduce(function (a, u) { return a + u.length; }, 0); };
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
                fitFile(f)
                    .then(function (url) {
                        if (items.length >= PM.MAX) return;
                        if (totalLen() + url.length > TOTAL_MAX_B64) {
                            SCSOC.toast('El post llegó a su límite de multimedia (~2.8 MB).');
                            return;
                        }
                        items.push(url);
                    })
                    .catch(function (e) {
                        const c = e && e.code;
                        if (c === 'bigvideo') SCSOC.toast('Video muy pesado (máx 2 MB).');
                        else if (c === 'big') SCSOC.toast('Imagen muy pesada incluso comprimida.');
                        else if (c === 'biggif') SCSOC.toast('Ese GIF es muy pesado (máx ~90KB).');
                        else SCSOC.toast('Archivo no válido (solo imágenes o videos).');
                    })
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

    /* ==== COMPOSER (admin_post.js invita vía hook 'composer') ==== */
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
        const list = arr || [];
        const total = list.reduce(function (a, u) { return a + u.length; }, 0);
        if (total > TOTAL_MAX_B64) {
            SCSOC.toast('Multimedia demasiado pesada para este post (límite ~2.8 MB).');
            return;
        }
        SCSOC.db().ref(CONFIG.POSTS).child(postId).child('media')
            .set(list.length ? list : null)
            .then(function () { if (withToast) SCSOC.toast('Multimedia actualizada ✓'); })
            .catch(function () { SCSOC.toast('No se pudo guardar (¿archivos muy pesados para la BD?).'); });
    }

    /* ==== EDITOR: modal de post CON botón de multimedia ==== */
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
                onSave(t);
                saveMedia(post.id, media, false);
            } else {
                close();
                saveMedia(post.id, media, true);
            }
        });
        row.appendChild(c); row.appendChild(ok);
        box.appendChild(row);
        if (isEdit) setTimeout(function () { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
    }

    /* El modal compartido editTextModal, cuando es de POST, se potencia aquí */
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

    console.log('[Stevscon] post_media.js listo (v2) — multimedia con límites: imagen ~90KB, video 2MB, post ~2.8MB.');
})(window, document);