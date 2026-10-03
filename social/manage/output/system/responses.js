/**
 * ====
 * STEVSCON.COM — social/manage/output/system/responses.js (v2)
 * HILOS estilo Discord, SIEMPRE en tiempo real.
 *  Nodo: social/responses/{commentId}/{responseId} (plano + campo depth)
 *  - comentario -> respuesta(1) -> respuesta(2) -> respuesta(3) = MÁXIMO
 *  - Si alguien quiere responder una respuesta de nivel 3, se hace PING:
 *    se manda "@handler" al usuario que está siendo respondido.
 *  - v2 FIX: create usa users.once() (antes get() dejaba el callback
 *    suscrito y las respuestas se DUPLICABAN con cada cambio de status).
 * ==== */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    const CONFIG = SCSOC.CONFIG;

    const R = SCSOC.responses = {};

    /* ==== crear respuesta (v2: una lectura, una escritura) ==== */
    R.create = function (commentId, postId, text, depth, replyTo) {
        SCSOC.requireLogin(function (auth) {
            const userOnce = SCSOC.users.once || SCSOC.users.get;
            userOnce(auth.uid, function (u) {
                const id = SCSOC.ids.make();
                SCSOC.db().ref(CONFIG.RESPONSES).child(commentId).child(id).set({
                    id: id,
                    text: text,
                    depth: depth,
                    replyTo: replyTo || '',
                    authorUid: auth.uid,
                    authorName: (u && u._name) || 'Usuario',
                    authorHandler: (u && u._handler) || '',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    editedAt: null
                }).catch(function () { SCSOC.toast('No se pudo responder.'); });
                SCSOC.counters.bump('comment', commentId, 'responses', 1);
                SCSOC.counters.bump('post', postId, 'responses', 1);
            });
        });
    };

    /* ==== tarjeta de respuesta ==== */
    R.render = function (parent, postId, commentId, r, parentCtx) {
        let live = r;
        const el = SCSOC.el('div', 'border-left:2px solid var(--border-color,#2e2440);padding:6px 0 4px 12px;margin-top:6px;');

        const head = SCSOC.el('div', 'display:flex;align-items:flex-start;gap:8px;');
        head.appendChild(SCSOC.userHead(r.authorUid, 26, { nameSize: 12.5, handlerSize: 11, badgeSize: 12 }));
        const timeEl = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font:500 10.5px Inter,sans-serif;white-space:nowrap;margin-left:auto;');
        head.appendChild(timeEl);
        el.appendChild(head);

        const pingEl = SCSOC.el('div', 'color:var(--purple-accent,#8b5cf6);font:700 10.5px Inter,sans-serif;margin:3px 0 0 34px;display:none;');
        el.appendChild(pingEl);

        const txt = SCSOC.el('div', 'color:var(--text-main,#f8fafc);font:400 12.5px/1.55 Inter,sans-serif;white-space:pre-wrap;word-break:break-word;margin:4px 0 2px 34px;');
        el.appendChild(txt);

        const foot = SCSOC.el('div', 'display:flex;align-items:center;gap:14px;margin:2px 0 0 34px;');
        const likeBtn = SCSOC.el('button', 'display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 11px Inter,sans-serif;cursor:pointer;padding:2px 5px;border-radius:7px;');
        likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
        const likeCnt = SCSOC.el('span');
        likeBtn.appendChild(likeCnt);
        likeBtn.dataset.scsocLikeBtn = '1';
        likeCnt.dataset.scsocLikeCount = '1';
        const repBtn = SCSOC.el('button', 'border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 11px Inter,sans-serif;cursor:pointer;padding:2px 5px;border-radius:7px;');
        repBtn.textContent = 'Responder';
        foot.appendChild(likeBtn); foot.appendChild(repBtn);
        el.appendChild(foot);
        parent.appendChild(el);

        const offCnt = SCSOC.counters.watch('response', r.id, function (v) {
            likeCnt.textContent = SCSOC.nums.fmt(v.likes);
        });

        function paint() {
            timeEl.textContent = SCSOC.timeAgo(live.createdAt) + (live.editedAt ? ' · editado' : '');
            pingEl.style.display = live.replyTo ? 'block' : 'none';
            pingEl.textContent = live.replyTo ? '↳ respondiendo a @' + live.replyTo : '';
            txt.innerHTML = '';
            txt.appendChild(SCSOC.richText(live.text));
        }
        paint();

        const ctx = {
            el: el, postId: postId, commentId: commentId, responseId: r.id, response: live
        };
        SCSOC.runHooks('responseCard', ctx);

        repBtn.addEventListener('click', function () {
            SCSOC.requireLogin(function () {
                const d = Number(live.depth) || 1;
                if (d >= CONFIG.DEPTH_MAX) {
                    /* nivel máximo alcanzado -> PING al usuario respondido */
                    if (parentCtx && parentCtx.ping) parentCtx.ping(live.authorHandler || live.authorName);
                } else if (parentCtx && parentCtx.openReply) {
                    parentCtx.openReply(d + 1, live.authorHandler || live.authorName);
                }
            });
        });

        return {
            el: el,
            update: function (nr) { live = nr; ctx.response = nr; paint(); },
            off: offCnt
        };
    };

    /* ==== engancharse a cada comentario ==== */
    SCSOC.onHook('commentCard', function (ctx) {
        const host = ctx.responsesHost;

        /* hilo en vivo, siempre visible */
        const cards = {};
        const ref = SCSOC.db().ref(CONFIG.RESPONSES).child(ctx.commentId).orderByChild('createdAt').limitToLast(200);
        const onAdd = function (s) {
            const r = s.val();
            if (!r || !r.id || cards[r.id]) return;
            cards[r.id] = R.render(host, ctx.postId, ctx.commentId, r, ctx);
        };
        const onCh = function (s) {
            const r = s.val();
            if (r && cards[r.id]) cards[r.id].update(r);
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
        ctx.offThread = function () {
            ref.off('child_added', onAdd);
            ref.off('child_changed', onCh);
            ref.off('child_removed', onRm);
        };

        /* composer de respuesta (inline, oculto hasta pulsar Responder) */
        const box = SCSOC.el('div', 'display:none;margin-top:8px;');
        const ta = SCSOC.el('textarea', 'width:100%;box-sizing:border-box;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:8px 11px;font:400 12.5px/1.5 Inter,sans-serif;min-height:34px;resize:none;outline:none;');
        const row = SCSOC.el('div', 'display:flex;justify-content:flex-end;gap:8px;margin-top:6px;');
        const cancel = SCSOC.el('button', 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:700 11px Inter,sans-serif;padding:6px 12px;border-radius:999px;cursor:pointer;');
        cancel.textContent = 'Cancelar';
        const send = SCSOC.el('button', 'border:0;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 11px Inter,sans-serif;padding:6px 14px;border-radius:999px;cursor:pointer;');
        send.textContent = 'Responder';
        row.appendChild(cancel); row.appendChild(send);
        box.appendChild(ta); box.appendChild(row);
        host.appendChild(box);

        const hide = function () { box.style.display = 'none'; ta.value = ''; box.dataset.ping = ''; box.dataset.replyTo = ''; box.dataset.depth = '1'; };
        cancel.addEventListener('click', hide);

        const sendIt = function () {
            const text = ta.value.trim();
            if (!text) return;
            const d = Math.min(Number(box.dataset.depth) || 1, CONFIG.DEPTH_MAX);
            R.create(ctx.commentId, ctx.postId, text.slice(0, CONFIG.MAX_RESPONSE), d, box.dataset.replyTo || '');
            hide();
        };
        send.addEventListener('click', sendIt);
        ta.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIt(); }
        });

        /* Responder al comentario raíz -> nivel 1 */
        ctx.openReply = function (depth, replyHandler) {
            box.style.display = 'block';
            box.dataset.depth = String(depth || 1);
            box.dataset.replyTo = replyHandler || '';
            box.dataset.ping = '';
            ta.placeholder = 'Responder' + (replyHandler ? ' a @' + replyHandler : '') + '...';
            ta.focus();
        };

        /* PING desde una respuesta de nivel 3 -> respuesta con @handler */
        ctx.ping = function (handler) {
            box.style.display = 'block';
            box.dataset.depth = String(CONFIG.DEPTH_MAX);
            box.dataset.replyTo = handler || '';
            box.dataset.ping = handler ? '@' + handler : '';
            ta.value = handler ? '@' + handler + ' ' : '';
            ta.focus();
        };
    });

    console.log('[Stevscon] responses.js listo (v2) — hilos de 3 niveles + PING @, sin duplicados.');
})(window, document);