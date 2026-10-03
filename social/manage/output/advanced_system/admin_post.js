/**
 * ====
 * STEVSCON.COM — social/manage/output/system/comments.js (v2)
 * Comentarios en TIEMPO REAL por post.
 *  Nodo: social/comments/{postId}/{commentId}
 *  - El botón 💬 de cada post abre/cierra la sección (listener en vivo)
 *  - Usuarios: comentan y (en la tanda de edit_comment) borran los suyos
 *  - Enter envía · Shift+Enter salto de línea
 *  - v2 FIX: create usa users.once() (antes get() dejaba el callback
 *    suscrito y los comentarios se DUPLICABAN con cada cambio de status).
 * ==== */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    const CONFIG = SCSOC.CONFIG;

    const C = SCSOC.comments = {};
    const open = {}; // postId -> unmount

    /* ==== crear comentario (v2: una lectura, una escritura) ==== */
    C.create = function (postId, text) {
        SCSOC.requireLogin(function (auth) {
            const userOnce = SCSOC.users.once || SCSOC.users.get;
            userOnce(auth.uid, function (u) {
                const id = SCSOC.ids.make();
                SCSOC.db().ref(CONFIG.COMMENTS).child(postId).child(id).set({
                    id: id,
                    text: text,
                    authorUid: auth.uid,
                    authorName: (u && u._name) || 'Usuario',
                    authorHandler: (u && u._handler) || '',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    editedAt: null
                }).catch(function () { SCSOC.toast('No se pudo comentar.'); });
                SCSOC.counters.bump('post', postId, 'comments', 1);
            });
        });
    };

    /* ==== tarjeta de comentario ==== */
    C.render = function (parent, postId, c) {
        let live = c;
        const el = SCSOC.el('div', 'background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:12px 14px;box-sizing:border-box;');

        const head = SCSOC.el('div', 'display:flex;align-items:flex-start;gap:10px;');
        head.appendChild(SCSOC.userHead(c.authorUid, 32, { nameSize: 13.5, handlerSize: 11.5, badgeSize: 13 }));
        const right = SCSOC.el('span', 'flex:none;display:inline-flex;align-items:center;gap:8px;margin-left:auto;');
        const timeEl = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font:500 11px Inter,sans-serif;white-space:nowrap;');
        right.appendChild(timeEl);
        if (SCSOC.hooks.commentMenu.length) {
            const dots = SCSOC.el('button', 'border:0;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:7px;');
            dots.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
            dots.addEventListener('click', function (e) {
                e.stopPropagation();
                SCSOC.runHooks('commentMenu', { postId: postId, comment: live, el: el, dots: dots });
            });
            right.appendChild(dots);
        }
        head.appendChild(right);
        el.appendChild(head);

        const txt = SCSOC.el('div', 'color:var(--text-main,#f8fafc);font:400 13px/1.55 Inter,sans-serif;white-space:pre-wrap;word-break:break-word;margin:6px 0 4px 42px;');
        el.appendChild(txt);

        const foot = SCSOC.el('div', 'display:flex;align-items:center;gap:14px;margin:2px 0 0 42px;');
        const likeBtn = SCSOC.el('button', 'display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 11.5px Inter,sans-serif;cursor:pointer;padding:3px 6px;border-radius:7px;');
        likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
        const likeCnt = SCSOC.el('span');
        likeBtn.appendChild(likeCnt);
        likeBtn.dataset.scsocLikeBtn = '1';
        likeCnt.dataset.scsocLikeCount = '1';
        const repBtn = SCSOC.el('button', 'border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 11.5px Inter,sans-serif;cursor:pointer;padding:3px 6px;border-radius:7px;');
        repBtn.textContent = 'Responder';
        const repInfo = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font:600 11px Inter,sans-serif;');
        foot.appendChild(likeBtn); foot.appendChild(repBtn); foot.appendChild(repInfo);
        el.appendChild(foot);

        /* hilo de respuestas (responses.js lo llena) */
        const rHost = SCSOC.el('div', 'margin:8px 0 0 42px;');
        el.appendChild(rHost);
        parent.appendChild(el);

        const offs = [];
        offs.push(SCSOC.counters.watch('comment', c.id, function (v) {
            likeCnt.textContent = SCSOC.nums.fmt(v.likes);
            repInfo.textContent = (Number(v.responses) || 0) > 0 ? SCSOC.nums.fmt(v.responses) + ' respuestas' : '';
        }));

        function paint() {
            timeEl.textContent = SCSOC.timeAgo(live.createdAt) + (live.editedAt ? ' · editado' : '');
            timeEl.title = live.createdAt ? new Date(live.createdAt).toLocaleString('es') : '';
            txt.innerHTML = '';
            txt.appendChild(SCSOC.richText(live.text));
        }
        paint();

        const ctx = {
            el: el, postId: postId, commentId: c.id, comment: live,
            responsesHost: rHost, replyBtn: repBtn, offThread: null
        };
        SCSOC.runHooks('commentCard', ctx);
        if (ctx.offThread) offs.push(ctx.offThread);

        return {
            el: el,
            update: function (nc) { live = nc; ctx.comment = nc; paint(); },
            off: function () { offs.forEach(function (f) { f(); }); }
        };
    };

    /* ==== montar / desmontar la sección de un post ==== */
    C.mount = function (host, postId) {
        if (open[postId]) return;
        host.innerHTML = '';
        host.style.display = 'block';

        const auth = firebase.auth().currentUser;
        if (auth) {
            const row = SCSOC.el('div', 'display:flex;gap:10px;align-items:flex-start;margin:6px 0 14px;');
            const avSlot = SCSOC.el('span', 'flex:none;');
            SCSOC.users.get(auth.uid, function (u) {
                avSlot.innerHTML = '';
                avSlot.appendChild(SCSOC.avatarEl(u, 34, u ? u._status : ''));
            });
            const col = SCSOC.el('div', 'flex:1;display:flex;gap:8px;align-items:flex-start;');
            const ta = SCSOC.el('textarea', 'flex:1;box-sizing:border-box;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:9px 12px;font:400 13px/1.5 Inter,sans-serif;min-height:38px;resize:none;outline:none;');
            ta.placeholder = 'Escribe un comentario...';
            const send = SCSOC.el('button', 'flex:none;border:0;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 12px Inter,sans-serif;padding:8px 14px;border-radius:999px;cursor:pointer;');
            send.textContent = 'Comentar';
            const submit = function () {
                const text = ta.value.trim();
                if (!text) return;
                if (text.length > CONFIG.MAX_COMMENT) { SCSOC.toast('Comentario muy largo.'); return; }
                ta.value = '';
                C.create(postId, text);
            };
            send.addEventListener('click', submit);
            ta.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            });
            col.appendChild(ta); col.appendChild(send);
            row.appendChild(avSlot); row.appendChild(col);
            host.appendChild(row);
        } else {
            const p = SCSOC.el('p', 'color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;margin:4px 0 12px;');
            p.textContent = 'Inicia sesión para poder comentar.';
            host.appendChild(p);
        }

        const list = SCSOC.el('div', 'display:flex;flex-direction:column;gap:10px;');
        host.appendChild(list);

        const ref = SCSOC.db().ref(CONFIG.COMMENTS).child(postId).orderByChild('createdAt').limitToLast(200);
        const cards = {};
        const onAdd = function (s) {
            const c = s.val();
            if (!c || !c.id || cards[c.id]) return;
            cards[c.id] = C.render(list, postId, c);
        };
        const onCh = function (s) {
            const c = s.val();
            if (c && cards[c.id]) cards[c.id].update(c);
        };
        const onRm = function (s) {
            const id = (s.val() || {}).id || s.key;
            if (cards[id]) {
                if (cards[id].el.parentNode) cards[id].el.parentNode.removeChild(cards[id].el);
                cards[id].off();
                delete cards[id];
            }
        };
        ref.on('child_added', onAdd);
        ref.on('child_changed', onCh);
        ref.on('child_removed', onRm);

        open[postId] = function () {
            ref.off('child_added', onAdd);
            ref.off('child_changed', onCh);
            ref.off('child_removed', onRm);
            Object.keys(cards).forEach(function (k) { if (cards[k].off) cards[k].off(); });
            delete open[postId];
        };
    };

    C.unmount = function (postId) { if (open[postId]) open[postId](); };

    /* botón 💬 de cada post -> abrir/cerrar */
    SCSOC.onHook('postCard', function (ctx) {
        const btn = ctx.el.querySelector('[data-scsoc-comments-btn]');
        if (!btn || btn.dataset.scsocCommentsBound) return;
        btn.dataset.scsocCommentsBound = '1';
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (ctx.isOpen()) ctx.closeComments();
            else ctx.openComments();
        });
    });

    console.log('[Stevscon] comments.js listo (v2) — comentarios en tiempo real, sin duplicados.');
})(window, document);