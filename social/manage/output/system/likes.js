/**
 * ====
 * STEVSCON.COM — social/manage/output/system/likes.js (v2)
 * Likes con TOGGLE para posts, comentarios y respuestas.
 *  Nodo:   social/likes/{tipo}/{id}/{uid} = true   (1 like por persona)
 *  Contador: social/counters/{tipo}/{id}/likes  -> CONGELADO por reglas.
 *
 *  v2 — ANTI-INFLACIÓN:
 *   · La cifra visible SIEMPRE se cuenta desde el nodo likes (la verdad:
 *     las reglas solo dejan escribir likes/{tipo}/{id}/MI-uid).
 *   · Ya no se escribe en counters/likes (las reglas lo bloquean).
 *   · CORRECTOR: si el contador viejo (editable por trolls antes del
 *     parche) llega con un número falso, se re-escribe al instante con
 *     el conteo real. El troll ve cómo su 999999 se convierte en el
 *     número verdadero en milisegundos.
 *   · Throttle de 250ms por botón: spam de clics no genera escrituras.
 *  Formato K/M/B lo hace numbers.js (SCSOC.nums.fmt) — sin cambios.
 * ==== */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    const CONFIG = SCSOC.CONFIG;

    const L = SCSOC.likes = {
        node: function (type, id) {
            return SCSOC.db().ref(CONFIG.LIKES).child(type).child(id);
        },

        /* observa en vivo: { count, me } — el conteo REAL (fuente de verdad) */
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

        /* toggle: 1 like por usuario (transacción sobre TU ranura) */
        toggle: function (type, id) {
            const auth = firebase.auth().currentUser;
            if (!auth) { SCSOC.deny(); return; }
            const key = type + '/' + id;
            const now = Date.now();
            if (L._last[key] && now - L._last[key] < 250) return; /* anti martilleo */
            L._last[key] = now;
            L.node(type, id).child(auth.uid).transaction(function (cur) {
                return cur === true ? null : true;
            });
            /* v2: SIN bump al contador — las reglas congelan counters/likes
             * y la cifra visible nace del nodo likes (incorruptible). */
        },
        _last: {},

        /* une un botón [data-scsoc-like-btn] + [data-scsoc-like-count] */
        bind: function (btn, cntEl, type, id) {
            btn.dataset.scsocLikeBound = '1';
            let trueCount = 0;
            const paintCount = function () { if (cntEl) cntEl.textContent = SCSOC.nums.fmt(trueCount); };
            L.watch(type, id, function (v) {
                trueCount = v.count;
                paintCount();
                btn.style.color = v.me ? 'var(--purple-accent,#8b5cf6)' : 'var(--text-muted,#94a3b8)';
                const ic = btn.querySelector('i');
                if (ic) ic.className = v.me ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            });
            /* CORRECTOR: el contador viejo (o un troll con consola) puede
             * escribir basura en counters/likes -> se pisa con el real. */
            if (SCSOC.counters && SCSOC.counters.watch) {
                SCSOC.counters.watch(type, id, function () { paintCount(); });
            }
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

    SCSOC.onHook('postCard', function (ctx) { L.attach(ctx.el, 'post', ctx.postId); });
    SCSOC.onHook('commentCard', function (ctx) { L.attach(ctx.el, 'comment', ctx.commentId); });
    SCSOC.onHook('responseCard', function (ctx) { L.attach(ctx.el, 'response', ctx.responseId); });

    console.log('[Stevscon] likes.js listo (v2) — contador incorruptible (nace del nodo likes) + corrector.');
})(window, document);