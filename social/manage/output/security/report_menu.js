/**
 * ====
 * STEVSCON.COM — social/manage/output/security/reports/report_menu.js (v1)
 * BOTÓN «REPORTAR» PÚBLICO (posts, comentarios y respuestas) con
 * LIMITADOR de 5 reportes por día.
 *
 *  · Cada usuario escribe SOLO en security/reports/{suUid}/r0..r4.
 *  · Las REGLAS liberan una ranura sólo si está vacía, si su reporte
 *    sigue 'pendiente' o si tiene MÁS DE 24h -> imposible pasar de
 *    5 reportes/día, NI SIQUIERA con consola (el servidor lo impone).
 *  · Si no hay ranura libre: «Reportas demasiado, espera un dia para
 *    reportar» + te dice exactamente cuánto falta.
 *  · Se engancha solo a los menús ⋯ vía hooks (commentMenu, responseMenu,
 *    postMenu). NO toca comments.js, responses.js ni admin_post.js.
 *  · OJO: si tenías OTRO file que agregaba el botón Reportar, ELIMÍNALO
 *    (quedaría duplicado y sus reportes ya no pasan las reglas nuevas).
 *
 *  SEGURIDAD: Firebase Auth · textContent SIEMPRE para datos de usuario.
 * ==== */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.reportMenu) return;

    const REPORTS = 'security/reports';
    const SLOTS = ['r0', 'r1', 'r2', 'r3', 'r4'];
    const DAY = 86400000;
    const MAX_DETAIL = 500;
    const REASONS = [
        { k: 'Ofensivo', icon: 'fa-face-angry', color: '#f87171' },
        { k: 'Spam', icon: 'fa-envelope', color: '#facc15' },
        { k: 'Acoso', icon: 'fa-user-slash', color: '#93c5fd' },
        { k: 'Inapropiado', icon: 'fa-triangle-exclamation', color: '#fb923c' },
        { k: 'Otros', icon: 'fa-ellipsis', color: '#94a3b8' }
    ];

    const M = SCSOC.reportMenu = {};
    const REPORT_TYPE = { commentMenu: 'comment', responseMenu: 'response', postMenu: 'post' };

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function toast(t) { if (SCSOC.toast) SCSOC.toast(t); }
    function el(tag, css, cls) { const n = document.createElement(tag); if (css) n.style.cssText = css; if (cls) n.className = cls; return n; }
    function E(tag, cls) { return el(tag, '', cls); }

    /* ==== CSS ==== */
    (function injectCss() {
        if (document.querySelector('style[data-scrm]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scrm', '1');
        css.textContent = ''
            + '.scrm-bd{position:fixed;inset:0;background:rgba(5,3,12,.66);backdrop-filter:blur(3px);z-index:2147483050;display:flex;align-items:center;justify-content:center;padding:16px;}'
            + '.scrm-win{width:min(420px,100%);background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:16px;padding:18px;font-family:Inter,sans-serif;box-sizing:border-box;max-height:88vh;overflow:auto;}'
            + '.scrm-h{margin:0 0 4px;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);}'
            + '.scrm-sub{margin:0 0 14px;font:600 11.5px/1.55 Inter,sans-serif;color:var(--text-muted,#94a3b8);word-break:break-word;}'
            + '.scrm-lbl{margin:0 0 8px;font:800 10px Inter,sans-serif;letter-spacing:.12em;color:var(--text-muted,#94a3b8);}'
            + '.scrm-reasons{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}'
            + '.scrm-r{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);font:700 11.5px Inter,sans-serif;padding:8px 12px;border-radius:999px;cursor:pointer;}'
            + '.scrm-r.scrm-on{border-color:var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.16);color:#c4b5fd;}'
            + '.scrm-ta{width:100%;box-sizing:border-box;min-height:84px;resize:vertical;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;font:400 12.5px/1.55 Inter,sans-serif;outline:none;margin-bottom:4px;}'
            + '.scrm-ta:focus{border-color:var(--purple-accent,#8b5cf6);}'
            + '.scrm-cnt{text-align:right;font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-bottom:12px;}'
            + '.scrm-row{display:flex;justify-content:flex-end;gap:8px;}'
            + '.scrm-btn{border:0;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 12px Inter,sans-serif;padding:9px 18px;border-radius:999px;cursor:pointer;}'
            + '.scrm-btn:disabled{opacity:.5;cursor:wait;}'
            + '.scrm-sec{border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:800 12px Inter,sans-serif;padding:9px 16px;border-radius:999px;cursor:pointer;}'
            + '.scrm-quote{margin:0 0 14px;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-left:3px solid var(--purple-accent,#8b5cf6);border-radius:9px;padding:8px 11px;color:var(--text-main,#f8fafc);font:500 11.5px/1.5 Inter,sans-serif;word-break:break-word;white-space:pre-wrap;max-height:110px;overflow:auto;}';
        document.head.appendChild(css);
    })();

    /* ==== ¿hay ranura libre? -> {ok, slot, waitMs} ==== */
    function slotState(myUid, cb) {
        db().ref(REPORTS).child(myUid).once('value').then(function (s) {
            const v = s.val() || {};
            const now = Date.now();
            let free = null, soonest = Infinity;
            for (let i = 0; i < SLOTS.length; i++) {
                const r = v[SLOTS[i]];
                if (!r || typeof r !== 'object') { if (!free) free = SLOTS[i]; continue; }
                const at = Number(r.at) || 0;
                const pend = r.status === 'pendiente';
                if (!pend && at < now - DAY) { if (!free) free = SLOTS[i]; continue; } /* expirado: se libera */
                if (pend && !free) free = SLOTS[i];                                    /* pendiente propio: se reemplaza */
                if (!pend && at < soonest) soonest = at;
            }
            if (free) return cb({ ok: true, slot: free });
            cb({ ok: false, waitMs: Math.max(0, (soonest === Infinity ? now : soonest) + DAY - now) });
        }).catch(function () { cb({ ok: true, slot: 'r0' }); }); /* si la lectura falla, las reglas decidirán */
    }

    function human(ms) {
        const m = Math.ceil(ms / 60000);
        if (m < 60) return m + ' min';
        const h = Math.floor(m / 60);
        return h + ' h ' + (m % 60) + ' min';
    }

    /* ==== EL FORMULARIO ==== */
    M.open = function (content) {
        SCSOC.requireLogin(function (auth) {
            slotState(auth.uid, function (st) {
                if (!st.ok) {
                    toast('Reportas demasiado, espera un dia para reportar');
                    console.log('[ReportMenu] próxima ranura libre en ' + human(st.waitMs));
                    return;
                }
                openForm(auth, content);
            });
        });
    };

    function openForm(auth, content) {
        const bd = el('div', '', 'scrm-bd');
        const win = E('div', 'scrm-win');

        const h = E('h3', 'scrm-h');
        h.textContent = 'Reportar ' + (content.typeLabel || 'contenido');
        win.appendChild(h);

        const sub = E('p', 'scrm-sub');
        sub.textContent = 'Vas a reportar a ' + (content.name || 'un usuario') + '. El staff revisará tu reporte.';
        win.appendChild(sub);

        if (content.text) {
            const q = E('div', 'scrm-quote');
            q.textContent = content.text.length > 220 ? content.text.slice(0, 220) + '…' : content.text;
            win.appendChild(q);
        }

        const lbl = E('p', 'scrm-lbl');
        lbl.textContent = 'MOTIVO';
        win.appendChild(lbl);

        let reason = null;
        const rRow = E('div', 'scrm-reasons');
        REASONS.forEach(function (r) {
            const b = el('button', '', 'scrm-r');
            b.type = 'button';
            b.innerHTML = '<i class="fa-solid ' + r.icon + '" style="color:' + r.color + '"></i>';
            b.appendChild(document.createTextNode(r.k));
            b.addEventListener('click', function () {
                reason = r.k;
                Array.prototype.forEach.call(rRow.children, function (c) { c.classList.remove('scrm-on'); });
                b.classList.add('scrm-on');
            });
            rRow.appendChild(b);
        });
        win.appendChild(rRow);

        const lbl2 = E('p', 'scrm-lbl');
        lbl2.textContent = 'DETALLE (OPCIONAL)';
        win.appendChild(lbl2);

        const ta = el('textarea', '', 'scrm-ta');
        ta.maxLength = MAX_DETAIL;
        ta.placeholder = 'Cuéntale al staff qué pasó (máx ' + MAX_DETAIL + ' caracteres)...';
        win.appendChild(ta);

        const cnt = E('div', 'scrm-cnt');
        cnt.textContent = '0 / ' + MAX_DETAIL;
        ta.addEventListener('input', function () { cnt.textContent = ta.value.length + ' / ' + MAX_DETAIL; });
        win.appendChild(cnt);

        const row = E('div', 'scrm-row');
        const cancel = el('button', '', 'scrm-sec');
        cancel.type = 'button'; cancel.textContent = 'Cancelar';
        const send = el('button', '', 'scrm-btn');
        send.type = 'button'; send.textContent = 'Enviar reporte';
        row.appendChild(cancel); row.appendChild(send);
        win.appendChild(row);

        let closed = false;
        const close = function () {
            if (closed) return;
            closed = true;
            document.removeEventListener('keydown', esc, true);
            if (bd.parentNode) bd.parentNode.removeChild(bd);
        };
        const esc = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
        document.addEventListener('keydown', esc, true);
        cancel.addEventListener('click', close);

        send.addEventListener('click', function () {
            if (!reason) { toast('Elige un motivo primero.'); return; }
            send.disabled = true;
            const userOnce = SCSOC.users && (SCSOC.users.once || SCSOC.users.get);
            const nameOf = function (cb) {
                if (userOnce) return userOnce(auth.uid, function (u) { cb((u && u._name) || 'Usuario'); });
                cb('Usuario');
            };
            nameOf(function (myName) {
                const rep = {
                    type: content.type,
                    reason: reason,
                    detail: String(ta.value || '').trim().slice(0, MAX_DETAIL),
                    byUid: auth.uid,
                    byName: String(myName || 'Usuario').slice(0, 60),
                    contentUid: String(content.uid || ''),
                    contentName: String(content.name || 'Usuario').slice(0, 60),
                    contentText: String(content.text || '').slice(0, 600),
                    postId: String(content.postId || '').slice(0, 200),
                    commentId: String(content.commentId || '').slice(0, 200),
                    responseId: String(content.responseId || '').slice(0, 200),
                    at: firebase.database.ServerValue.TIMESTAMP,
                    status: 'pendiente'
                };
                slotState(auth.uid, function (st2) {
                    if (!st2.ok) {
                        close();
                        toast('Reportas demasiado, espera un dia para reportar');
                        return;
                    }
                    db().ref(REPORTS).child(auth.uid).child(st2.slot).set(rep)
                        .then(function () {
                            close();
                            toast('Reporte enviado. Gracias por cuidar la comunidad ✓');
                        })
                        .catch(function (e) {
                            send.disabled = false;
                            const c = e && e.code;
                            if (c === 'PERMISSION_DENIED') toast('Reportas demasiado, espera un dia para reportar');
                            else toast('No se pudo enviar el reporte (' + (c || 'error') + ').');
                        });
                });
            });
        });

        bd.appendChild(win);
        document.body.appendChild(bd);
        setTimeout(function () { ta.focus(); }, 0);
    }

    /* ==== ENGANCHE a los menús ⋯ (sin tocar ningún file) ==== */
    function contentOf(type, ctx) {
        if (type === 'comment' && ctx.comment) {
            return { type: 'comment', typeLabel: 'comentario', uid: ctx.comment.authorUid,
                name: ctx.comment.authorName, text: ctx.comment.text,
                postId: ctx.postId, commentId: ctx.comment.id };
        }
        if (type === 'response' && ctx.response) {
            return { type: 'response', typeLabel: 'respuesta', uid: ctx.response.authorUid,
                name: ctx.response.authorName, text: ctx.response.text,
                postId: ctx.postId, commentId: ctx.commentId, responseId: ctx.response.id };
        }
        if (type === 'post' && ctx.post) {
            return { type: 'post', typeLabel: 'publicación', uid: ctx.post.authorUid,
                name: ctx.post.authorName, text: ctx.post.text, postId: ctx.post.id };
        }
        return null;
    }
    function hook(name) {
        SCSOC.onHook(name, function (ctx) {
            if (!SCSOC.menuAdd) return;
            const c = contentOf(REPORT_TYPE[name], ctx);
            if (!c) return;
            SCSOC.menuAdd(ctx, {
                label: 'Reportar',
                icon: 'fa-flag',
                fn: function () { M.open(c); }
            });
        });
    }
    hook('commentMenu'); hook('responseMenu'); hook('postMenu');

    console.log('[Stevscon] report_menu.js listo (v1) — botón Reportar con límite de 5 reportes/día 🚩');
})(window, document);