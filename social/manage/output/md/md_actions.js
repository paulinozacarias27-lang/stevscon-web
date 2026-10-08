/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_actions.js (v1)
 * ACCIONES del chat de MD — Reportar · Bloquear · Ignorar.
 *  - Barra fina bajo la cabecera del chat (solo con conversación abierta).
 *  - REPORTAR: overlay con motivos -> security/reports (type dm, persona).
 *    (el 🚩 por mensaje de md_ui sigue funcionando; este es de la persona).
 *  - BLOQUEAR: confirmación en 2 pasos; bloqueado = no te puede escribir
 *    (md_contacts envuelve open/send) y puedes desbloquear con un clic.
 *  - IGNORAR: mueve la conversación a la pestaña Ignorados y vuelve a la
 *    lista. En Ignorados se puede quitar cuando quieras.
 *  - md_ui.js avisa con el evento 'sc:dm-view' (view: chat | list).
 *  Cargar DESPUÉS de md_tabs.js.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmActions) return;

    const D = SCSOC.dm, C = SCSOC.dmContacts, U = SCSOC.dmUI;
    const MAIN = 'var(--text-main,#f8fafc)';
    const MUTED = 'var(--text-muted,#94a3b8)';
    const BORDER = 'var(--border-color,#2e2440)';

    const A = SCSOC.dmActions = {};

    let cur = null;            /* { convId, peerUid, row, bRep, bBlk, bIgn, armT } */

    function E(tag, cls, css) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (css) n.style.cssText = css;
        return n;
    }
    function el(tag, css, cls) {
        const n = document.createElement(tag);
        if (css) n.style.cssText = css;
        if (cls) n.className = cls;
        return n;
    }

    function injectCss() {
        if (document.querySelector('style[data-scdma]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scdma', '1');
        css.textContent = ''
            + '.scdm-actrow{flex:none;display:flex;gap:7px;padding:9px 14px;border-bottom:1px solid ' + BORDER + ';}'
            + '.scdm-act{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid ' + BORDER + ';background:transparent;color:' + MUTED + ';font:800 10px Inter,sans-serif;letter-spacing:.05em;padding:7px 4px;border-radius:10px;cursor:pointer;transition:color .15s ease,border-color .15s ease,background .15s ease;}'
            + '.scdm-act:hover{color:' + MAIN + ';background:var(--bg-hover,#261f36);}'
            + '.scdm-act.scdm-danger:hover{color:#f87171;border-color:rgba(239,68,68,.5);}'
            + '.scdm-act.scdm-arm{color:#fff;background:rgba(239,68,68,.85);border-color:rgba(239,68,68,.9);}'
            + '.scdm-act.scdm-on{color:' + 'var(--purple-accent,#8b5cf6)' + ';border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.12);}';
        document.head.appendChild(css);
    }

    /* ==== overlay de reporte (misma pinta que el de md_ui) ==== */
    const REASONS = [
        { v: 'Ofensivo', icon: 'fa-face-angry' },
        { v: 'Spam', icon: 'fa-envelope' },
        { v: 'Acoso', icon: 'fa-user-slash' },
        { v: 'Inapropiado', icon: 'fa-triangle-exclamation' },
        { v: 'Otros', icon: 'fa-ellipsis' }
    ];

    function openReport() {
        if (!cur || !cur.peerUid) return;
        const u = firebase.auth().currentUser;
        if (!u) { if (SCSOC.deny) SCSOC.deny(); return; }
        const ov = el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2500;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;');
        const box = el('div', 'width:min(440px,100%);max-height:calc(100vh - 32px);overflow-y:auto;background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:18px;font-family:Inter,sans-serif;box-sizing:border-box;');
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

        const h = E('h3', 'margin:0 0 4px;color:var(--text-main,#f8fafc);font:800 15px Inter,sans-serif;');
        h.textContent = 'Reportar a esta persona';
        const sub = E('div', 'margin:0 0 12px;color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;');
        sub.textContent = 'El staff lo revisará y tomará acción.';
        box.appendChild(h); box.appendChild(sub);

        const lbl = E('div', 'font:800 10px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#94a3b8);margin-bottom:7px;');
        lbl.textContent = 'Motivo del reporte';
        box.appendChild(lbl);

        let sel = null;
        const grid = E('div', 'display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;');
        const chips = [];
        REASONS.forEach(function (r) {
            const c = el('button', 'display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-main,#f8fafc);font:700 11.5px Inter,sans-serif;padding:7px 11px;border-radius:999px;cursor:pointer;');
            c.type = 'button';
            const ic = document.createElement('i');
            ic.className = 'fa-solid ' + r.icon + ' fa-sm';
            c.appendChild(ic);
            c.appendChild(document.createTextNode(' ' + r.v));
            c.addEventListener('click', function () {
                sel = r.v;
                chips.forEach(function (o) {
                    const on = o._reason === sel;
                    o.style.borderColor = on ? 'var(--purple-accent,#8b5cf6)' : 'var(--border-color,#2e2440)';
                    o.style.background = on ? 'rgba(139,92,246,.14)' : 'transparent';
                    o.style.color = on ? 'var(--purple-accent,#c4b5fd)' : 'var(--text-main,#f8fafc)';
                });
            });
            c._reason = r.v;
            chips.push(c);
            grid.appendChild(c);
        });
        box.appendChild(grid);

        const ta = el('textarea', 'width:100%;box-sizing:border-box;min-height:64px;resize:vertical;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;font:400 13px/1.55 Inter,sans-serif;outline:none;');
        ta.placeholder = 'Detalle extra (opcional)...';
        ta.maxLength = 500;
        box.appendChild(ta);

        const row = E('div', 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px;');
        const cBtn = el('button', 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:800 12px Inter,sans-serif;padding:8px 16px;border-radius:999px;cursor:pointer;');
        cBtn.type = 'button'; cBtn.textContent = 'Cancelar';
        cBtn.addEventListener('click', close);
        const ok = el('button', 'border:0;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 12px Inter,sans-serif;padding:8px 16px;border-radius:999px;cursor:pointer;');
        ok.type = 'button'; ok.textContent = 'Enviar reporte';
        let sending = false;
        ok.addEventListener('click', function () {
            if (sending) return;
            if (!sel) { SCSOC.toast('Elige un motivo para el reporte.'); return; }
            sending = true;
            ok.disabled = true; ok.style.opacity = '.6'; ok.textContent = 'Enviando…';
            C.reportPeer(cur.convId, cur.peerUid, sel, ta.value.trim(), function (err) {
                if (err) {
                    sending = false;
                    ok.disabled = false; ok.style.opacity = '1'; ok.textContent = 'Enviar reporte';
                    return;
                }
                close();
            });
        });
        row.appendChild(cBtn); row.appendChild(ok);
        box.appendChild(row);
    }

    /* ==== botones ==== */
    function mkAct(icon, label) {
        const b = E('button', 'scdm-act');
        b.type = 'button';
        const ic = document.createElement('i');
        ic.className = 'fa-solid ' + icon;
        b.appendChild(ic);
        b.appendChild(document.createTextNode(' ' + label));
        return b;
    }

    function paintStates() {
        if (!cur || !cur.bBlk) return;
        const blk = C.isBlocked(cur.peerUid);
        const ign = C.isIgnored(cur.convId);
        /* Bloquear <-> Desbloquear */
        cur.bBlk.classList.toggle('scdm-on', blk);
        cur.bBlk.classList.remove('scdm-arm');
        cur.bBlk._label = blk ? 'Desbloquear' : 'Bloquear';
        setLabel(cur.bBlk, blk ? 'lock-open' : 'ban', cur.bBlk._label);
        /* Ignorar <-> Quitar de ignorados */
        cur.bIgn._label = ign ? 'Quitar ignorados' : 'Ignorar';
        setLabel(cur.bIgn, ign ? 'rotate-left' : 'comment-slash', cur.bIgn._label);
    }

    function setLabel(btn, icon, label) {
        while (btn.firstChild) btn.removeChild(btn.firstChild);
        const ic = document.createElement('i');
        ic.className = 'fa-solid ' + icon;
        btn.appendChild(ic);
        btn.appendChild(document.createTextNode(' ' + label));
    }

    function disarm() {
        if (cur && cur.armT) { clearTimeout(cur.armT); cur.armT = null; }
        if (cur && cur.bBlk) cur.bBlk.classList.remove('scdm-arm');
    }

    function mount(win, convId, peerUid) {
        injectCss();
        if (!C || !D) return;
        cur = { convId: convId, peerUid: peerUid, armT: null };

        const row = E('div', 'scdm-actrow');

        cur.bRep = mkAct('flag', 'Reportar');
        cur.bRep.classList.add('scdm-danger');
        cur.bRep.addEventListener('click', function (e) { e.stopPropagation(); openReport(); });

        cur.bBlk = mkAct('ban', 'Bloquear');
        cur.bBlk.classList.add('scdm-danger');
        cur.bBlk.addEventListener('click', function (e) {
            e.stopPropagation();
            const peer = cur ? cur.peerUid : '';
            if (!peer) return;
            if (C.isBlocked(peer)) {
                C.unblock(peer, function (err) {
                    if (err) { SCSOC.toast('No se pudo desbloquear.'); return; }
                    SCSOC.toast('Desbloqueado ✓ — ya puede mandarte MDs.');
                });
                return;
            }
            /* confirmación en 2 pasos: el botón se arma rojo 2.6s */
            if (cur.bBlk.classList.contains('scdm-arm')) {
                disarm();
                C.block(peer, '', function (err) {
                    if (err) { SCSOC.toast('No se pudo bloquear.'); return; }
                    SCSOC.toast('Bloqueado ✕ — no podrá mandarte MDs.');
                });
                return;
            }
            cur.bBlk.classList.add('scdm-arm');
            setLabel(cur.bBlk, 'triangle-exclamation', '¿Seguro?');
            cur.armT = setTimeout(function () {
                if (cur && cur.bBlk) { cur.bBlk.classList.remove('scdm-arm'); paintStates(); }
            }, 2600);
        });

        cur.bIgn = mkAct('comment-slash', 'Ignorar');
        cur.bIgn.addEventListener('click', function (e) {
            e.stopPropagation();
            const c = cur ? cur.convId : '';
            if (!c) return;
            if (C.isIgnored(c)) {
                C.unignore(c, cur.peerUid, function (err) {
                    if (err) { SCSOC.toast('No se pudo quitar.'); return; }
                    SCSOC.toast('Ya no está ignorado ✓');
                });
                return;
            }
            C.ignore(c, cur.peerUid, function (err) {
                if (err) { SCSOC.toast('No se pudo ignorar.'); return; }
                SCSOC.toast('Ignorado — pasó a la pestaña Ignorados.');
                if (U && U.backToList) U.backToList();
            });
        });

        row.appendChild(cur.bRep);
        row.appendChild(cur.bBlk);
        row.appendChild(cur.bIgn);

        const bodyEl = win.querySelector('.scdm-body');
        if (bodyEl) win.insertBefore(row, bodyEl);
        else win.appendChild(row);
        cur.row = row;
        paintStates();
    }

    function reset() {
        if (cur && cur.armT) { clearTimeout(cur.armT); cur.armT = null; }
        cur = null;
    }

    /* md_ui avisa en cada cambio de vista */
    document.addEventListener('sc:dm-view', function (e) {
        const d = (e && e.detail) || {};
        if (d.view === 'chat' && d.win && d.convId && d.peerUid) mount(d.win, d.convId, d.peerUid);
        else reset();
    });

    /* si cambian bloqueos/ignorados en vivo, refresca los botones */
    if (C) {
        C.watchBlocked(function () { paintStates(); });
        C.watchIgnored(function () { paintStates(); });
    }

    console.log('[Stevscon] md_actions.js listo (v1) — chat con Reportar · Bloquear · Ignorar.');
})(window, document);