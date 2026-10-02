/**
 * ============================================================
 * STEVSCON.COM — social/manage/output/system/likes.js (v1)
 * Likes con TOGGLE para posts, comentarios y respuestas.
 *  Nodo:   social/likes/{tipo}/{id}/{uid} = true
 *  Contador: social/counters/{tipo}/{id}/likes
 * Se engancha SOLO a las tarjetas vía hooks (no toca admin_post.js).
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    const CONFIG = SCSOC.CONFIG;

    const L = SCSOC.likes = {
        node: function (type, id) {
            return SCSOC.db().ref(CONFIG.LIKES).child(type).child(id);
        },

        /* observa en vivo: { count, me } */
        watch: function (type, id, cb) {
            const r = L.node(type, id);
            const h = r.on('value', function (s) {
                const v = s.val() || {};
                let count = 0;
                for (const k in v) if (v[k] === true) count++;
                const me = firebase.auth().currentUser ? v[firebase.auth().currentUser.uid] === true : false;
                cb({ count: count, me: me });
            });
            return function () { r.off('value', h); };
        },

        /* toggle con contador (transacción: nunca se desincroniza) */
        toggle: function (type, id) {
            const auth = firebase.auth().currentUser;
            if (!auth) { SCSOC.deny(); return; }
            L.node(type, id).child(auth.uid).transaction(function (cur) {
                return cur === true ? null : true;
            }, function (err, committed, snap) {
                if (err || !committed) return;
                SCSOC.counters.bump(type, id, 'likes', snap.val() === true ? 1 : -1);
            });
        },

        /* une un botón [data-scsoc-like-btn] + [data-scsoc-like-count] */
        bind: function (btn, cntEl, type, id) {
            btn.dataset.scsocLikeBound = '1';
            L.watch(type, id, function (v) {
                if (cntEl) cntEl.textContent = SCSOC.nums.fmt(v.count);
                btn.style.color = v.me ? 'var(--purple-accent,#8b5cf6)' : 'var(--text-muted,#94a3b8)';
                const ic = btn.querySelector('i');
                if (ic) ic.className = v.me ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            });
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                L.toggle(type, id);
            });
        },

        /* engancha todos los botones de like dentro de una tarjeta */
        attach: function (scope, type, id) {
            const btn = scope.querySelector ? scope.querySelector('[data-scsoc-like-btn]') : null;
            if (!btn || btn.dataset.scsocLikeBound) return;
            L.bind(btn, scope.querySelector('[data-scsoc-like-count]'), type, id);
        }
    };

    /* conexiones automáticas con las tarjetas */
    SCSOC.onHook('postCard', function (ctx) { L.attach(ctx.el, 'post', ctx.postId); });
    SCSOC.onHook('commentCard', function (ctx) { L.attach(ctx.el, 'comment', ctx.commentId); });
    SCSOC.onHook('responseCard', function (ctx) { L.attach(ctx.el, 'response', ctx.responseId); });

    console.log('[Stevscon] likes.js listo (v1) — toggle en vivo para posts, comentarios y respuestas.');
})(window, document);