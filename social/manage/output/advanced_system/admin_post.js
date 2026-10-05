/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/admin_post.js (v6)
 * SISTEMA DE POSTEO — solo el STAFF publica (owner + elegidos).
 *  - Composer con contador "0 / 15.000" y categoría
 *  - Feed en TIEMPO REAL (nada de refrescar)
 *  - v2 FIX ANTI-DUPLICADOS: users.once() + candados + dedupe doble.
 *  - v3 FIX: el 💬 del post ahora muestra COMENTARIOS + RESPUESTAS.
 *  - v4 FIX: composer reactivo a la sesión (espera a Auth).
 *  - v6 MULTIMEDIA: publish() acepta un array `media` (dataURLs) que
 *    vive DENTRO del nodo del post (social/posts/{id}/media). El
 *    botón 🖼️ y las previsualizaciones los pone post_media.js vía el
 *    hook 'composer' — si ese file no carga, todo sigue funcionando
 *    igual que v5 (llamadas protegidas con if).
 * ==== 
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    const CONFIG = SCSOC.CONFIG;
    const CARD_BG = 'var(--bg-card,#1a1625)';
    const BORDER = 'var(--border-color,#2e2440)';

    const P = SCSOC.posts = {};

    /* ==== ¿puede postear? (solo staff) ==== */
    P.canPost = function (cb) { SCSOC.staff.role(function (r) { if (cb) cb(!!r, r); }); };

    /* ==== v4: WATCHER DE SESIÓN ==== */
    function watchAuth(cb) {
        return firebase.auth().onAuthStateChanged(function (u) { cb(u || null); });
    }

    /* ==== PUBLICAR (v2: a prueba de duplicados · v6: con multimedia) ==== */
    const _lastPub = { uid: '', text: '', at: 0 };

    P.publish = function (text, category, media, cb) {
        if (typeof media === 'function') { cb = media; media = null; }
        const auth = firebase.auth().currentUser;
        if (!auth) { SCSOC.deny(); return; }
        SCSOC.staff.role(function (role) {
            if (!role) { SCSOC.toast('Solo el staff puede publicar.'); if (cb) cb(new Error('no-staff')); return; }
            text = String(text || '').trim();
            const hasMedia = !!(media && media.length);
            if (!text && !hasMedia) { SCSOC.toast('Escribe algo antes de publicar.'); if (cb) cb(new Error('empty')); return; }
            if (text.length > CONFIG.MAX_POST) { SCSOC.toast('Muy largo: máx ' + SCSOC.nums.full(CONFIG.MAX_POST) + ' caracteres.'); if (cb) cb(new Error('too-long')); return; }

            /* Candado 1: mismo autor + mismo texto en <10s = bloqueado */
            if (_lastPub.uid === auth.uid && _lastPub.text === text && (Date.now() - _lastPub.at) < 10000) {
                SCSOC.toast('Ese post ya se publicó hace un momento.');
                if (cb) cb(new Error('duplicated'));
                return;
            }

            /* Candado 2 (LA RAÍZ del bug): lectura de UNA sola vez. */
            const userOnce = SCSOC.users.once || SCSOC.users.get;
            userOnce(auth.uid, function (u) {
                const id = SCSOC.ids.make();
                const post = {
                    id: id,
                    text: text,
                    category: category || 'General',
                    authorUid: auth.uid,
                    authorName: (u && u._name) || 'Usuario',
                    authorHandler: (u && u._handler) || '',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    editedAt: null,
                    pinned: false
                };
                /* v6: la multimedia viaja DENTRO del post (1 write, cero reglas) */
                post.media = hasMedia ? media : null;
                _lastPub.uid = auth.uid;
                _lastPub.text = text;
                _lastPub.at = Date.now();
                SCSOC.db().ref(CONFIG.POSTS).child(id).set(post)
                    .then(function () { if (cb) cb(null, id); })
                    .catch(function (e) { if (cb) cb(e); });
            });
        });
    };

    /* ==== COMPOSER (v4 reactivo a la sesión · v6: hook 'composer') ==== */
    P.mountCompose = function (host) {
        if (host.__scsocComposeOff) { try { host.__scsocComposeOff(); } catch (e) {} host.__scsocComposeOff = null; }

        function clear() { while (host.firstChild) host.removeChild(host.firstChild); }

        function buildBox(authUser) {
            const box = SCSOC.el('div', 'background:' + CARD_BG + ';border:1px solid ' + BORDER + ';border-radius:14px;padding:16px 18px;margin-bottom:18px;box-sizing:border-box;font-family:Inter,sans-serif;');
            const row = SCSOC.el('div', 'display:flex;gap:12px;align-items:flex-start;');
            const avSlot = SCSOC.el('span', 'flex:none;');
            SCSOC.users.get(authUser.uid, function (u) {
                avSlot.innerHTML = '';
                avSlot.appendChild(SCSOC.avatarEl(u, 42, u ? u._status : ''));
            });
            const col = SCSOC.el('div', 'flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;');
            const ta = SCSOC.el('textarea', 'width:100%;box-sizing:border-box;min-height:92px;resize:vertical;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid ' + BORDER + ';border-radius:10px;padding:12px 14px;font:400 14px/1.55 Inter,sans-serif;outline:none;');
            ta.placeholder = 'Publica algo para la comunidad...';
            const foot = SCSOC.el('div', 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;');
            const left = SCSOC.el('div', 'display:flex;align-items:center;gap:10px;');
            const sel = SCSOC.el('select', 'background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid ' + BORDER + ';border-radius:8px;padding:7px 10px;font:600 12.5px Inter,sans-serif;outline:none;cursor:pointer;');
            SCSOC.categories().forEach(function (c) {
                const o = SCSOC.el('option');
                o.value = c; o.textContent = c;
                sel.appendChild(o);
            });
            const cnt = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font:600 11.5px Inter,sans-serif;');
            const paintCnt = function () {
                const n = ta.value.length;
                cnt.textContent = SCSOC.nums.full(n) + ' / ' + SCSOC.nums.full(CONFIG.MAX_POST);
                cnt.style.color = n > CONFIG.MAX_POST ? '#ef4444' : 'var(--text-muted,#94a3b8)';
            };
            ta.addEventListener('input', paintCnt);
            paintCnt();
            const btn = SCSOC.el('button', 'border:0;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 13px Inter,sans-serif;padding:9px 20px;border-radius:999px;cursor:pointer;flex:none;');
            btn.textContent = 'Publicar';
            btn.addEventListener('click', function () {
                btn.disabled = true; btn.style.opacity = '.6';
                /* v6: multimedia del composer (post_media.js la guarda) */
                const media = (SCSOC.postMedia && SCSOC.postMedia.composerGet) ? SCSOC.postMedia.composerGet(box) : null;
                P.publish(ta.value, sel.value, media, function (err) {
                    btn.disabled = false; btn.style.opacity = '1';
                    if (err) { SCSOC.toast('No se pudo publicar (¿multimedia muy pesada para la BD?).'); return; }
                    ta.value = '';
                    if (SCSOC.postMedia && SCSOC.postMedia.composerClear) SCSOC.postMedia.composerClear(box);
                    paintCnt();
                    SCSOC.toast('Publicado ✓');
                });
            });
            left.appendChild(sel); left.appendChild(cnt);
            foot.appendChild(left); foot.appendChild(btn);
            /* v6: post_media.js agrega aquí el botón 🖼️ + previews */
            SCSOC.runHooks('composer', { box: box, ta: ta, sel: sel, btn: btn, left: left, foot: foot, col: col });
            col.appendChild(ta); col.appendChild(foot);
            row.appendChild(avSlot); row.appendChild(col);
            box.appendChild(row);
            return box;
        }

        function evaluate(u) {
            if (!u) { clear(); return; }
            P.canPost(function (can) {
                const live = firebase.auth().currentUser;
                if (!live || live.uid !== u.uid) return;
                if (!can) { clear(); return; }
                clear();
                try { host.appendChild(buildBox(live)); }
                catch (e) { console.error('[Stevscon] admin_post: fallo el composer ->', e); }
            });
        }

        host.__scsocComposeOff = watchAuth(evaluate);
    };

    /* ==== TARJETA DE POST (v6: host de galería multimedia) ==== */
    P.renderCard = function (post, fbKey) {
        const k = fbKey || post.id;
        let live = post;
        const card = SCSOC.el('article', 'background:' + CARD_BG + ';border:1px solid ' + BORDER + ';border-radius:14px;padding:16px 18px 12px;margin-bottom:14px;box-sizing:border-box;font-family:Inter,sans-serif;');
        card.dataset.scsocPost = k;

        /* cabeza */
        const head = SCSOC.el('div', 'display:flex;align-items:flex-start;gap:12px;');
        head.appendChild(SCSOC.userHead(post.authorUid, 42, {}));
        const meta = SCSOC.el('div', 'display:flex;flex-direction:column;gap:2px;justify-content:center;min-width:0;flex:1;');
        const timeEl = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font:500 11.5px Inter,sans-serif;');
        const catEl = SCSOC.el('span', 'color:var(--purple-accent,#8b5cf6);font:700 11px Inter,sans-serif;');
        meta.appendChild(timeEl); meta.appendChild(catEl);
        head.appendChild(meta);
        const dots = SCSOC.el('button', 'border:0;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:16px;padding:4px 8px;border-radius:8px;flex:none;');
        dots.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
        dots.addEventListener('click', function (e) {
            e.stopPropagation();
            SCSOC.runHooks('postMenu', { post: live, card: card, dots: dots });
        });
        head.appendChild(dots);
        card.appendChild(head);

        /* texto */
        const txt = SCSOC.el('div', 'color:var(--text-main,#f8fafc);font:400 14.5px/1.6 Inter,sans-serif;white-space:pre-wrap;word-break:break-word;margin:10px 0 4px 54px;');
        card.appendChild(txt);

        /* v6: galería multimedia (post_media.js la pinta; invisible si no hay) */
        const mHost = SCSOC.el('div', 'display:none;margin:10px 0 2px 54px;');
        card.appendChild(mHost);

        /* barra de acciones */
        const bar = SCSOC.el('div', 'display:flex;align-items:center;gap:22px;margin:8px 0 0 54px;');
        const likeBtn = SCSOC.el('button', 'display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 12.5px Inter,sans-serif;cursor:pointer;padding:5px 8px;border-radius:8px;');
        likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
        const likeCnt = SCSOC.el('span');
        likeBtn.appendChild(likeCnt);
        likeBtn.dataset.scsocLikeBtn = '1';
        likeCnt.dataset.scsocLikeCount = '1';
        const comBtn = SCSOC.el('button', 'display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 12.5px Inter,sans-serif;cursor:pointer;padding:5px 8px;border-radius:8px;');
        comBtn.innerHTML = '<i class="fa-regular fa-comment"></i>';
        const comCnt = SCSOC.el('span');
        comBtn.appendChild(comCnt);
        comBtn.dataset.scsocCommentsBtn = '1';
        comCnt.dataset.scsocCommentsCount = '1';
        bar.appendChild(likeBtn); bar.appendChild(comBtn);
        card.appendChild(bar);

        /* host de comentarios */
        const cHost = SCSOC.el('div', 'display:none;margin-top:10px;');
        card.appendChild(cHost);

        /* pintado */
        function paint(p) {
            timeEl.textContent = SCSOC.timeAgo(p.createdAt) + (p.editedAt ? ' · editado' : '');
            timeEl.title = p.createdAt ? new Date(p.createdAt).toLocaleString('es') : '';
            catEl.textContent = p.category ? '· ' + p.category : '';
            txt.innerHTML = '';
            txt.appendChild(SCSOC.richText(p.text));
            if (SCSOC.postMedia) SCSOC.postMedia.paint(mHost, p.media);   /* v6 */
        }

        /* contadores en vivo (v3: 💬 = comentarios + respuestas) */
        const offCnt = SCSOC.counters.watch('post', post.id, function (v) {
            const total = (Number(v.comments) || 0) + (Number(v.responses) || 0);
            likeCnt.textContent = SCSOC.nums.fmt(v.likes);
            comCnt.textContent = SCSOC.nums.fmt(total);
            likeBtn.title = SCSOC.nums.full(Number(v.likes) || 0) + ' me gusta';
            comBtn.title = SCSOC.nums.full(total) + ' comentarios';
        });

        paint(post);

        /* ctx para los hooks */
        const ctx = {
            el: card, postId: post.id, commentsHost: cHost, mediaHost: mHost, _open: false,
            openComments: function () { SCSOC.comments.mount(cHost, ctx.postId); ctx._open = true; },
            closeComments: function () { SCSOC.comments.unmount(ctx.postId); cHost.style.display = 'none'; ctx._open = false; },
            isOpen: function () { return !!ctx._open; }
        };
        if (SCSOC.comments) SCSOC.runHooks('postCard', ctx);

        return {
            el: card,
            update: function (p) { live = p; paint(p); },
            off: function () { offCnt(); }
        };
    };

    /* ==== FEED EN TIEMPO REAL (v2: UNA instancia por host, dedupe doble) ==== */
    P.mountFeed = function (host) {
        if (host.__scsocFeedOff) { try { host.__scsocFeedOff(); } catch (e) {} host.__scsocFeedOff = null; }

        host.innerHTML = '';
        const empty = SCSOC.el('p', 'color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;text-align:center;padding:30px 0;font-family:Inter,sans-serif;');
        empty.textContent = 'No hay publicaciones todavía.';
        host.appendChild(empty);

        const ref = SCSOC.db().ref(CONFIG.POSTS).orderByChild('createdAt').limitToLast(CONFIG.FEED_SIZE);
        const cards = {};
        const onAdd = function (s) {
            const p = s.val();
            const k = s.key;
            if (!p || !k) return;
            if (empty.parentNode) host.removeChild(empty);
            if (cards[k]) return;
            if (host.querySelector('[data-scsoc-post="' + k + '"]')) return;
            const c = P.renderCard(p, k);
            cards[k] = c;
            host.insertBefore(c.el, host.firstChild);
        };
        const onCh = function (s) {
            const p = s.val();
            if (p && cards[s.key]) cards[s.key].update(p);
        };
        const onRm = function (s) {
            const c = cards[s.key];
            if (c) {
                if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
                if (c.off) c.off();
                delete cards[s.key];
            }
        };
        ref.on('child_added', onAdd);
        ref.on('child_changed', onCh);
        ref.on('child_removed', onRm);

        host.__scsocFeedOff = function () {
            ref.off('child_added', onAdd);
            ref.off('child_changed', onCh);
            ref.off('child_removed', onRm);
        };
        return host.__scsocFeedOff;
    };

    console.log('[Stevscon] admin_post.js listo (v6) — composer reactivo + feed en tiempo real + soporte multimedia.');
})(window, document);