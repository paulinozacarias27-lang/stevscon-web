/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_images.js (v2)
 * IMÁGENES en los MDs — base64 directo a Firebase, sin Storage.
 *
 *  v2 · DOS ARREGLOS:
 *   1) COMPRESOR: el objetivo baja de 190000 a 55000 chars (bajo el tope
 *      duro de 60000 que firman las rules). Antes casi toda foto legítima
 *      terminaba en «muy pesada».
 *   2) BLOQUEOS: sendImage() ahora pasa por C.guard() (md_contacts), el
 *      MISMO candado que el texto. Si hay bloqueo tuyo o del peer, la
 *      imagen NO viaja. Antes las imágenes se saltaban el bloqueo.
 *  Todo lo demás idéntico a v1: botón 📷, Ctrl+V, arrastrar y soltar,
 *  lightbox, watchConv envuelto, caption con anti-bad, cero innerHTML.
 *  Cargar DESPUÉS de md_button.js y md_contacts.js.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmImages) return;

    const D = SCSOC.dm, U = SCSOC.dmUI;

    const MAX_DIM = 1280;
    const TARGET_B64 = 55000;   /* v2: bajo el tope de 60000 de las rules */
    const MAX_B64 = 60000;

    const I = SCSOC.dmImages = { MAX_DIM: MAX_DIM, MAX_B64: MAX_B64 };

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function toast(t) { if (SCSOC.toast) SCSOC.toast(t); }

    /* ==== COMPRENSIÓN: File -> dataURL liviano ==== */
    function readFile(file, cb) {
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
    function shrink(im, w, h, q) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1a1625'; /* fondo para PNGs con transparencia */
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(im, 0, 0, w, h);
        return c.toDataURL('image/jpeg', q);
    }
    function toLightDataUrl(file, cb) {
        readFile(file, function (dataUrl) {
            if (!dataUrl || dataUrl.indexOf('data:image/') !== 0) { cb('bad'); return; }
            /* GIF chico pasa intacto (se conserva la animación) */
            if (/^data:image\/gif/.test(dataUrl)) {
                cb(dataUrl.length <= MAX_B64 ? dataUrl : 'big');
                return;
            }
            loadImg(dataUrl, function (im) {
                if (!im || !im.width) { cb('bad'); return; }
                let w = im.width, h = im.height;
                const sc0 = Math.min(1, MAX_DIM / Math.max(w, h));
                w = Math.max(1, Math.round(w * sc0));
                h = Math.max(1, Math.round(h * sc0));
                let q = 0.82, guard = 0;
                let out = shrink(im, w, h, q);
                while (out.length > TARGET_B64 && guard < 7) {
                    if (q > 0.5) q -= 0.14;
                    else { w = Math.max(1, Math.round(w * 0.75)); h = Math.max(1, Math.round(h * 0.75)); }
                    out = shrink(im, w, h, Math.max(0.4, q));
                    guard++;
                }
                cb(out.length <= MAX_B64 ? out : 'big');
            });
        });
    }

    /* ==== ENVIAR la imagen (misma ruta/formato que D.send, sin tocarlo) ==== */
    const _lastImg = { at: 0, len: 0 };

    I.sendImage = function (convId, dataUrl, caption, cb) {
        SCSOC.requireLogin(function (a) {
            const img = String(dataUrl || '');
            const text = String(caption || '').trim().slice(0, D.MAX_TEXT);
            if (img.indexOf('data:image/') !== 0 || img.length > MAX_B64) {
                toast('La imagen es muy pesada o inválida.'); if (cb) cb(new Error('img')); return;
            }
            /* candado: la misma imagen en <10s = bloqueado */
            if (_lastImg.len === img.length && (Date.now() - _lastImg.at) < 10000) {
                toast('Esa imagen ya se envió hace un momento.');
                if (cb) cb(new Error('dup')); return;
            }
            db().ref('dms/' + convId + '/meta').once('value').then(function (s) {
                const meta = s.val();
                if (!meta || !meta.users || meta.users[a.uid] !== true) {
                    toast('No perteneces a esta conversación.'); if (cb) cb(new Error('perm')); return;
                }
                if (D.isExpired(meta)) {
                    toast('Este MD expiró: envíale una Solicitud de Amistad.');
                    if (cb) cb(new Error('expired')); return;
                }
                const peerUid = D.peerOf(meta.users, a.uid);
                const C = SCSOC.dmContacts;
                /* v2: candado de BLOQUEOS — el mismo que respeta el texto.
                 * err: 'mine' (yo lo bloqueé) | 'theirs' (me bloqueó) | null.
                 * guard() ya muestra su propio toast. */
                const goPrefs = function () {
                D.prefOf(peerUid, function (p) {
                    const friend = !!(C && C.isFriend && C.isFriend(peerUid));
                    if (p && p.mdAllow === 'nadie' && !friend) {
                        toast('Esta persona tiene los MDs desactivados.');
                        if (cb) cb(new Error('pref')); return;
                    }
                    if (text) {
                        const AB = SCSOC.secAntiBad;
                        const ab = (AB && AB.checkChat) ? AB.checkChat(text)
                            : (AB && AB.check) ? AB.check(text) : { ok: true };
                        if (ab && ab.ok === false) {
                            toast(ab.msg || 'Mensaje bloqueado por el filtro.');
                            if (cb) cb(new Error('filter')); return;
                        }
                    }
                    D.nameOf(a.uid, function (info) {
                        const id = SCSOC.ids.make();
                        const prev = text || '📷 Imagen';
                        const msg = {
                            id: id,
                            text: text,
                            authorUid: a.uid,
                            authorName: info.name,
                            createdAt: firebase.database.ServerValue.TIMESTAMP,
                            img: img
                        };
                        const upd = {};
                        upd['msgs/' + id] = msg;
                        upd['meta/lastAt'] = firebase.database.ServerValue.TIMESTAMP;
                        upd['meta/lastFrom'] = a.uid;
                        upd['meta/lastText'] = prev.slice(0, 120);
                        if (D.peerIsFriend(meta)) upd['meta/friends'] = true;
                        db().ref('dms/' + convId).update(upd).then(function () {
                            _lastImg.len = img.length; _lastImg.at = Date.now();
                            db().ref('dms/inbox/' + a.uid + '/' + convId).update({
                                peerUid: peerUid,
                                lastAt: firebase.database.ServerValue.TIMESTAMP,
                                lastText: prev.slice(0, 120),
                                lastFrom: a.uid
                            }).catch(function () {});
                            const theirs = db().ref('dms/inbox/' + peerUid + '/' + convId);
                            theirs.update({
                                peerUid: a.uid,
                                lastAt: firebase.database.ServerValue.TIMESTAMP,
                                lastText: prev.slice(0, 120),
                                lastFrom: a.uid
                            }).catch(function () {});
                            theirs.child('unread').transaction(function (v) { return (Number(v) || 0) + 1; }, function () {});
                            if (cb) cb(null, id);
                        }).catch(function () {
                            toast('No se pudo enviar la imagen.'); if (cb) cb(new Error('write'));
                        });
                    });
                });
                };
                if (C && typeof C.guard === 'function') {
                    C.guard(peerUid, function (err) {
                        if (err) { if (cb) cb(new Error('blocked')); return; }
                        goPrefs();
                    });
                } else goPrefs();
            }).catch(function () {
                toast('No se pudo enviar la imagen.'); if (cb) cb(new Error('meta'));
            });
        });
    };

    /* ==== RENDER: montar la imagen en la burbuja que crea md_ui ==== */
    let curWin = null;

    function paintImg(b, m) {
        if (!b || !m || !m.img || b.querySelector('.scdm-imgwrap')) return;
        const src = String(m.img);
        if (src.indexOf('data:image/') !== 0 || src.length > MAX_B64) return;
        const wrap = document.createElement('div');
        wrap.className = 'scdm-imgwrap';
        const im = document.createElement('img');
        im.className = 'scdm-img';
        im.alt = 'Imagen';
        im.loading = 'lazy';
        im.src = src; /* img.src SIEMPRE — jamás innerHTML con datos */
        im.addEventListener('click', function () { lightbox(src); });
        wrap.appendChild(im);
        if (b._txt && b._txt.parentNode === b) b.insertBefore(wrap, b._txt);
        else b.insertBefore(wrap, b.firstChild);
    }

    function lightbox(src) {
        const ov = document.createElement('div');
        ov.className = 'scdm-lightbox';
        const im = document.createElement('img');
        im.alt = 'Imagen';
        im.src = src;
        ov.appendChild(im);
        const close = function () {
            window.removeEventListener('keydown', esc, true);
            if (ov.parentNode) ov.parentNode.removeChild(ov);
        };
        const esc = function (e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        };
        ov.addEventListener('click', close);
        window.addEventListener('keydown', esc, true);
        document.body.appendChild(ov);
    }

    /* envuelve D.watchConv: tras el onAdd de md_ui, monta la imagen */
    if (D && typeof D.watchConv === 'function' && !D.__imgWatch) {
        D.__imgWatch = true;
        const oldWatch = D.watchConv;
        D.watchConv = function (convId, cbs) {
            if (!cbs || typeof cbs.onAdd !== 'function') return oldWatch.call(D, convId, cbs);
            const origAdd = cbs.onAdd;
            const wrapped = {};
            for (const k in cbs) wrapped[k] = cbs[k];
            wrapped.onAdd = function (m, key) {
                origAdd(m, key);
                if (m && m.img) {
                    const msgsEl = (curWin && curWin.querySelector('.scdm-msgs')) ||
                        document.querySelector('.scdm-msgs');
                    const b = msgsEl ? msgsEl.lastElementChild : null;
                    if (b && b.classList.contains('scdm-bub')) paintImg(b, m);
                }
            };
            return oldWatch.call(D, convId, wrapped);
        };
    }

    /* ==== COMPOSER: botón 📷 + pegar + soltar (sin editar md_ui) ==== */
    let obs = null;

    function hookComposer(win) {
        const comp = win.querySelector('.scdm-comp');
        if (!comp || comp.dataset.scImgHook) return;
        comp.dataset.scImgHook = '1';
        const ta = comp.querySelector('.scdm-ta');
        if (!ta) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scdm-imgbtn';
        btn.setAttribute('aria-label', 'Enviar imagen');
        btn.title = 'Enviar imagen (o pega con Ctrl+V)';
        btn.innerHTML = '<i class="fa-solid fa-image" aria-hidden="true"></i>';
        btn.addEventListener('click', filePick);
        comp.insertBefore(btn, ta);
        ta.addEventListener('paste', onPaste);
        const msgsEl = win.querySelector('.scdm-msgs');
        if (msgsEl && !msgsEl.dataset.scImgDrag) {
            msgsEl.dataset.scImgDrag = '1';
            ['dragenter', 'dragover'].forEach(function (t) {
                msgsEl.addEventListener(t, function (e) { e.preventDefault(); msgsEl.classList.add('scdm-drag'); });
            });
            msgsEl.addEventListener('dragleave', function () { msgsEl.classList.remove('scdm-drag'); });
            msgsEl.addEventListener('drop', function (e) {
                e.preventDefault();
                msgsEl.classList.remove('scdm-drag');
                const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null;
                const conv = U && U.state ? U.state() : null;
                if (f && conv && conv.convId) handleFile(f, conv.convId);
            });
        }
    }

    function filePick() {
        const conv = U && U.state ? U.state() : null;
        if (!conv || !conv.convId) return;
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.display = 'none';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () {
            const f = inp.files && inp.files[0];
            if (f) handleFile(f, conv.convId);
            if (inp.parentNode) inp.parentNode.removeChild(inp);
        });
        inp.click();
    }

    function handleFile(file, convId) {
        if (!file || String(file.type || '').indexOf('image/') !== 0) { toast('Ese file no es una imagen.'); return; }
        if (file.size > 8 * 1024 * 1024) { toast('Imagen muy pesada (máx 8 MB).'); return; }
        toast('Procesando imagen…');
        toLightDataUrl(file, function (out) {
            if (out === 'bad') { toast('No se pudo leer la imagen.'); return; }
            if (out === 'big') { toast('La imagen quedó muy pesada incluso comprimida.'); return; }
            I.sendImage(convId, out, '', function () {});
        });
    }

    function onPaste(e) {
        const items = (e.clipboardData && e.clipboardData.items) || [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.indexOf('image/') === 0) {
                e.preventDefault();
                const conv = U && U.state ? U.state() : null;
                const f = items[i].getAsFile();
                if (f && conv && conv.convId) handleFile(f, conv.convId);
                return;
            }
        }
    }

    /* md_ui avisa en cada cambio de vista (mismo patrón que md_actions) */
    document.addEventListener('sc:dm-view', function (e) {
        const d = (e && e.detail) || {};
        if (d.view === 'chat' && d.win) {
            curWin = d.win;
            hookComposer(d.win);
            if (obs) obs.disconnect();
            obs = new MutationObserver(function () {
                if (!curWin || !curWin.isConnected) return;
                hookComposer(curWin);
            });
            obs.observe(d.win, { childList: true, subtree: true });
        } else {
            if (obs) { obs.disconnect(); obs = null; }
            curWin = null;
        }
    });

    /* ==== CSS ==== */
    (function injectCss() {
        if (document.querySelector('style[data-scdmi]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scdmi', '1');
        css.textContent = ''
            + '.scdm-imgbtn{flex:none;width:40px;height:40px;border-radius:12px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:color .15s ease,border-color .15s ease,background .15s ease;padding:0;}'
            + '.scdm-imgbtn:hover{color:var(--purple-accent,#8b5cf6);border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.12);}'
            + '.scdm-imgwrap{margin:2px 0 4px;}'
            + '.scdm-img{display:block;max-width:min(300px,100%);max-height:260px;width:auto;border-radius:10px;border:1px solid rgba(255,255,255,.14);box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:zoom-in;background:rgba(0,0,0,.2);}'
            + '.scdm-msgs.scdm-drag{outline:2px dashed rgba(139,92,246,.6);outline-offset:-6px;}'
            + '.scdm-lightbox{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2600;background:rgba(5,3,12,.86);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:22px;cursor:zoom-out;animation:scdmLb .18s ease;}'
            + '.scdm-lightbox img{max-width:94vw;max-height:88vh;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.6);}'
            + '@keyframes scdmLb{from{opacity:0}to{opacity:1}}';
        document.head.appendChild(css);
    })();

    console.log('[Stevscon] md_images.js listo (v2) — compresor a 55KB + bloqueos respetados 📷');
})(window, document);