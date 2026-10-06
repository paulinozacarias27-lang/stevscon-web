/**
 * ====
 * STEVSCON.COM — social/manage/output/edit/edit_comment/report.js (v1)
 * REPORTAR COMENTARIOS Y RESPUESTAS → security/reports
 *  - Botón "Reportar" en el menú ⋯ de comentarios (hook 'commentMenu')
 *    y de respuestas (hook 'responseMenu').
 *  - Solo usuarios logueados; NADIE reporta su propio contenido.
 *  - Modal a estilo Styles.css: motivo + detalle opcional (máx 500).
 *  - Guarda en security/reports/{reportId}: tipo, IDs, autor del contenido,
 *    pedacito del texto, motivo, quién reporta y fecha (status 'pendiente').
 *  - Las reglas ya dejan crear (byUid = tuyo) y al staff leer/cambiar
 *    status/borrar — el Box de Reportes (security) leerá de ahí después.
 *  - Anti-doble-envío en memoria (60s por contenido).
 *  - TODO via textContent (cero innerHTML con datos) — XSS imposible.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};

    const REPORTS_PATH = (SCSOC.CONFIG && SCSOC.CONFIG.REPORTS) || 'security/reports';

    const REASONS = [
        { v: 'Ofensivo',    icon: 'fa-face-angry' },
        { v: 'Spam',        icon: 'fa-envelope' },
        { v: 'Acoso',       icon: 'fa-user-slash' },
        { v: 'Inapropiado', icon: 'fa-triangle-exclamation' },
        { v: 'Otros',       icon: 'fa-ellipsis' }
    ];

    /* anti-doble-envío: contenido -> timestamp del último reporte */
    const _recent = {};

    function nameOf(raw) {
        raw = raw || {};
        const p = raw.profile || {};
        return String(raw.name || raw.displayName || raw.username || p.name || p.username || 'Usuario').slice(0, 60);
    }

    function myName(uid, cb) {
        SCSOC.db().ref('users/' + uid).once('value')
            .then(function (s) { cb(nameOf(s.val())); })
            .catch(function () { cb('Usuario'); });
    }

    function authorNameOf(data, cb) {
        if (data.authorName) { cb(String(data.authorName).slice(0, 60)); return; }
        if (!data.authorUid) { cb('Usuario'); return; }
        SCSOC.db().ref('users/' + data.authorUid).once('value')
            .then(function (s) { cb(nameOf(s.val())); })
            .catch(function () { cb('Usuario'); });
    }

    function mkBtn(txt, kind) {
        const st = {
            sec: 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);',
            pri: 'border:0;background:var(--purple-accent,#8b5cf6);color:#fff;'
        }[kind];
        const b = SCSOC.el('button', st + 'font:800 12px Inter,sans-serif;padding:8px 16px;border-radius:999px;cursor:pointer;');
        b.type = 'button'; b.textContent = txt;
        return b;
    }

    /* ==== modal de reporte (mismo shell que editTextModal, z-index propio) ==== */
    function openModal(ctx, data, me) {
        const isComment = !!ctx.comment;
        const key = (isComment ? 'c:' : 'r:') + data.id;
        if (_recent[key] && Date.now() - _recent[key] < 60000) {
            SCSOC.toast('Ya enviaste un reporte de esto hace un momento.');
            return;
        }

        const ov = SCSOC.el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2500;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;');
        const box = SCSOC.el('div', 'width:min(460px,100%);max-height:calc(100vh - 32px);overflow-y:auto;background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:18px;font-family:Inter,sans-serif;box-sizing:border-box;');
        ov.appendChild(box);
        let closed = false;
        const close = function () {
            if (closed) return;
            closed = true;
            if (ov.parentNode) ov.parentNode.removeChild(ov);
            document.removeEventListener('keydown', esc2, true);
        };
        const esc2 = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        document.addEventListener('keydown', esc2, true);
        document.body.appendChild(ov);

        /* header: bandera + título */
        const head = SCSOC.el('div', 'display:flex;align-items:center;gap:10px;margin-bottom:12px;');
        const icoBox = SCSOC.el('div', 'width:34px;height:34px;border-radius:10px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.35);display:flex;align-items:center;justify-content:center;color:var(--purple-accent,#8b5cf6);font-size:14px;flex:0 0 auto;');
        const ico = SCSOC.el('i', ''); ico.className = 'fa-solid fa-flag';
        icoBox.appendChild(ico);
        const hWrap = SCSOC.el('div', 'min-width:0;');
        const h = SCSOC.el('h3', 'margin:0;color:var(--text-main,#f8fafc);font:800 15px Inter,sans-serif;');
        h.textContent = 'Reportar ' + (isComment ? 'comentario' : 'respuesta');
        const sub = SCSOC.el('div', 'margin:2px 0 0;color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;');
        sub.textContent = 'El staff lo revisará y tomará acción.';
        hWrap.appendChild(h); hWrap.appendChild(sub);
        head.appendChild(icoBox); head.appendChild(hWrap);
        box.appendChild(head);

        /* cita del contenido reportado (solo lectura) */
        const quote = SCSOC.el('div', 'background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-left:3px solid var(--purple-accent,#8b5cf6);border-radius:10px;padding:10px 12px;margin-bottom:12px;');
        const qName = SCSOC.el('div', 'font:800 12px Inter,sans-serif;color:var(--purple-accent,#a78bfa);margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;');
        qName.textContent = (data.authorName || 'Usuario') + (data.authorHandler ? ' · @' + data.authorHandler : '');
        const qTxt = SCSOC.el('div', 'font:500 12px/1.5 Inter,sans-serif;color:var(--text-muted,#94a3b8);word-break:break-word;');
        const rawTxt = String(data.text || '');
        qTxt.textContent = rawTxt.length > 180 ? rawTxt.slice(0, 180) + '…' : rawTxt;
        quote.appendChild(qName); quote.appendChild(qTxt);
        box.appendChild(quote);

        /* motivo */
        const lbl = SCSOC.el('div', 'font:800 10px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#94a3b8);margin-bottom:7px;');
        lbl.textContent = 'Motivo del reporte';
        box.appendChild(lbl);

        let sel = null;
        const grid = SCSOC.el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;');
        const optBtns = [];
        REASONS.forEach(function (r) {
            const b = SCSOC.el('button', 'display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-main,#f8fafc);font:700 12px Inter,sans-serif;padding:9px 10px;border-radius:9px;cursor:pointer;text-align:left;' + (r.v === 'Otros' ? 'grid-column:1 / -1;' : ''));
            b.type = 'button';
            const ic = SCSOC.el('i', ''); ic.className = 'fa-solid ' + r.icon + ' fa-sm';
            const sp = SCSOC.el('span', ''); sp.textContent = r.v;
            b.appendChild(ic); b.appendChild(sp);
            b.addEventListener('mouseenter', function () { if (sel !== r.v) b.style.background = 'var(--bg-hover,#261f36)'; });
            b.addEventListener('mouseleave', function () { b.style.background = sel === r.v ? 'rgba(139,92,246,.14)' : 'transparent'; });
            b.addEventListener('click', function () {
                sel = r.v;
                optBtns.forEach(function (o) {
                    const on = o._reason === sel;
                    o.style.borderColor = on ? 'var(--purple-accent,#8b5cf6)' : 'var(--border-color,#2e2440)';
                    o.style.background = on ? 'rgba(139,92,246,.14)' : 'transparent';
                    o.style.color = on ? 'var(--purple-accent,#c4b5fd)' : 'var(--text-main,#f8fafc)';
                });
            });
            b._reason = r.v;
            optBtns.push(b);
            grid.appendChild(b);
        });
        box.appendChild(grid);

        /* detalle opcional */
        const ta = SCSOC.el('textarea', 'width:100%;box-sizing:border-box;min-height:70px;resize:vertical;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;font:400 13px/1.55 Inter,sans-serif;outline:none;');
        ta.placeholder = 'Detalle extra (opcional): qué pasó, links, contexto…';
        ta.maxLength = 500;
        const cnt = SCSOC.el('div', 'text-align:right;color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;margin:4px 0 14px;');
        const paint = function () { cnt.textContent = ta.value.length + ' / 500'; };
        ta.addEventListener('input', paint); paint();
        box.appendChild(ta); box.appendChild(cnt);

        /* footer */
        const row = SCSOC.el('div', 'display:flex;justify-content:flex-end;gap:8px;');
        const c = mkBtn('Cancelar', 'sec'), ok = mkBtn('Enviar reporte', 'pri');
        c.addEventListener('click', close);
        let sending = false;
        ok.addEventListener('click', function () {
            if (sending) return;
            if (!sel) { SCSOC.toast('Elige un motivo para el reporte.'); return; }
            sending = true;
            ok.disabled = true; ok.style.opacity = '.6'; ok.textContent = 'Enviando…';
            const detail = ta.value.trim().slice(0, 500);
            Promise.all([
                new Promise(function (res) { myName(me.uid, res); }),
                new Promise(function (res) { authorNameOf(data, res); })
            ]).then(function (names) {
                const payload = {
                    type: isComment ? 'comment' : 'response',
                    postId: String(ctx.postId || ''),
                    commentId: isComment ? String(data.id) : String(ctx.commentId || ''),
                    responseId: isComment ? '' : String(data.id),
                    reason: sel,
                    contentUid: String(data.authorUid || ''),
                    contentName: names[1],
                    contentText: rawTxt.slice(0, 600),
                    byUid: me.uid,
                    byName: names[0],
                    status: 'pendiente',
                    at: firebase.database.ServerValue.TIMESTAMP
                };
                if (detail) payload.detail = detail;
                return SCSOC.db().ref(REPORTS_PATH).push(payload);
            }).then(function () {
                _recent[key] = Date.now();
                close();
                SCSOC.toast('Reporte enviado ✓ — el staff lo revisará.');
            }).catch(function () {
                sending = false;
                ok.disabled = false; ok.style.opacity = '1'; ok.textContent = 'Enviar reporte';
                SCSOC.toast('No se pudo enviar el reporte.');
            });
        });
        row.appendChild(c); row.appendChild(ok);
        box.appendChild(row);
    }

    /* ==== ofrecer "Reportar" (logueado y NUNCA sobre contenido propio) ==== */
    function offer(ctx, data) {
        if (!data || !data.id) return;
        const u = firebase.auth().currentUser;
        if (!u) return;                        /* visitantes: nada (el menú hace deny) */
        if (data.authorUid === u.uid) return;  /* lo tuyo no se reporta */
        SCSOC.menuAdd(ctx, {
            label: 'Reportar',
            icon: 'fa-flag',
            fn: function () {
                SCSOC.requireLogin(function (me) {
                    if (data.authorUid === me.uid) return;
                    openModal(ctx, data, me);
                });
            }
        });
    }

    SCSOC.onHook('commentMenu', function (ctx) { offer(ctx, ctx.comment); });
    SCSOC.onHook('responseMenu', function (ctx) { offer(ctx, ctx.response); });

    console.log('[Stevscon] edit_comment/report.js listo (v1) — reportar comentarios/respuestas a security/reports.');
})(window, document);