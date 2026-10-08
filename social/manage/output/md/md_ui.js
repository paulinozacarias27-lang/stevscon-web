/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_ui.js (v1)
 * INTERFAZ de Mensajes Directos — drawer estilo Discord sobre el Social.
 *  - Lista de conversaciones EN VIVO (dms/inbox) + chat con burbujas.
 *  - Todo en tiempo real (child_added/changed/removed, patrón comments).
 *  - Ventana de 10 h: chip «Activo 9h 59m» en vivo; al expirar, el
 *    composer se congela y aparece la Solicitud de Amistad (próxima).
 *  - Reportar MD: botón 🚩 en los mensajes del otro -> security/reports
 *    (cae al Box REPORTS de security, mismo flujo que comentarios).
 *  - Cierre TRIPLE: botón X · clic afuera · Escape (captura, sin fugas;
 *    en el chat ESC primero vuelve a la lista, como Discord).
 *  - richText() de format_text.js => formato Discord en las burbujas.
 *  API pública: SCSOC.dmUI.open() · openConv(convId, peerUid) · close().
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmUI) return;

    const D = SCSOC.dm;
    const PURPLE = 'var(--purple-accent,#8b5cf6)';

    const U = SCSOC.dmUI = {
        open: function (cb) { open(cb); },
        openConv: function (convId, peerUid) { openConv(convId, peerUid); },
        close: close,
        isOpen: function () { return !!S.on; }
    };

    const S = { on: false, view: 'list', convId: null, peerUid: null, inbox: null, offInbox: null, offMsgs: null, meta: null, timer: null, markT: null };
    const cards = {};

    let bd = null, win = null, body = null;

    function el(tag, css, cls) {
        const n = document.createElement(tag);
        if (css) n.style.cssText = css;
        if (cls) n.className = cls;
        return n;
    }
    function E(tag, cls) { return el(tag, '', cls); }
    function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

    function fmtLeft(ms) {
        if (ms <= 0) return 'EXPIRADO';
        const m = Math.floor(ms / 60000);
        const h = Math.floor(m / 60);
        if (h >= 1) return 'Activo ' + h + 'h ' + (m % 60) + 'm';
        if (m >= 1) return 'Activo ' + m + 'm';
        return 'Activo menos de 1m';
    }

    function stopChat() {
        if (S.offMsgs) { try { S.offMsgs(); } catch (e) {} S.offMsgs = null; }
        if (S.timer) { clearInterval(S.timer); S.timer = null; }
        if (S.markT) { clearTimeout(S.markT); S.markT = null; }
        Object.keys(cards).forEach(function (k) { delete cards[k]; });
        S.convId = null; S.peerUid = null; S.meta = null;
    }

    function escClose(e) {
        if (e.key !== 'Escape' || !S.on) return;
        e.preventDefault(); e.stopPropagation();
        if (S.view === 'chat') { renderList(); return; }
        close();
    }

    function close() {
        if (!S.on) return;
        S.on = false;
        S.view = 'list';
        stopChat();
        if (S.offInbox) { try { S.offInbox(); } catch (e) {} S.offInbox = null; }
        if (win) win.classList.remove('scdm-on');
        if (bd) bd.classList.remove('scdm-on');
        const w = win, b = bd;
        win = null; body = null;
        document.removeEventListener('keydown', escClose, true);
        setTimeout(function () {
            if (w && w.parentNode) w.parentNode.removeChild(w);
            if (b && b.parentNode) b.parentNode.removeChild(b);
        }, 320);
    }

    function open(cb) {
        if (S.on) { if (typeof cb === 'function') cb(); return; }
        injectCss();
        bd = el('div', '', 'scdm-backdrop');
        bd.addEventListener('click', close);
        win = el('div', '', 'scdm-win');
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', 'Mensajes Directos');
        document.body.appendChild(bd);
        document.body.appendChild(win);
        requestAnimationFrame(function () {
            bd.classList.add('scdm-on');
            win.classList.add('scdm-on');
        });
        S.on = true;
        document.addEventListener('keydown', escClose, true);
        if (S.offInbox) { try { S.offInbox(); } catch (e) {} }
        S.offInbox = D.watchInbox(function (list) {
            S.inbox = list;
            if (S.on && S.view === 'list') renderList();
        });
        renderList();
        if (typeof cb === 'function') cb();
    }

    /* ==== VISTA 1 · LISTA DE CONVERSACIONES ==== */
    function renderList() {
        if (!S.on || !win) return;
        stopChat();
        S.view = 'list';
        clear(win);

        const head = E('div', 'scdm-head');
        const ico = E('div', 'scdm-ico');
        ico.innerHTML = '<i class="fa-solid fa-comment-dots" aria-hidden="true"></i>';
        const tt = E('div', 'scdm-tt');
        const b1 = E('b'); b1.textContent = 'MENSAJES DIRECTOS';
        const b2 = E('span'); b2.textContent = 'Privados · ventana de 10 horas por MD';
        tt.appendChild(b1); tt.appendChild(b2);
        const x = E('button', 'scdm-x');
        x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', close);
        head.appendChild(ico); head.appendChild(tt); head.appendChild(x);
        win.appendChild(head);

        body = E('div', 'scdm-body');
        body.style.overflowY = 'auto';
        win.appendChild(body);

        const meUid = me() ? me().uid : '';
        const list = S.inbox || [];
        if (!list.length) {
            const empty = E('div', 'scdm-empty');
            const ei = document.createElement('i');
            ei.className = 'fa-solid fa-inbox';
            ei.style.cssText = 'font-size:26px;color:' + PURPLE + ';opacity:.7;margin-bottom:10px;';
            empty.appendChild(ei);
            empty.appendChild(document.createTextNode('Aún no tienes MDs. Abre el perfil de cualquier usuario del Social y toca «Mensaje» para empezar una conversación privada.'));
            body.appendChild(empty);
            return;
        }
        list.forEach(function (e) {
            const row = E('div', 'scdm-row');
            const idb = E('div');
            idb.style.cssText = 'flex:none;min-width:0;';
            idb.appendChild(SCSOC.userHead(e.peerUid, 38, { nameSize: 13, handlerSize: 10.5 }));
            const meta = E('div', 'scdm-rmeta');
            const prev = E('div', 'scdm-rprev');
            prev.textContent = e.lastText
                ? (e.lastFrom === meUid ? 'Tú: ' + e.lastText : e.lastText)
                : 'Conversación nueva';
            const when = E('div', 'scdm-rwhen');
            when.textContent = e.lastAt ? SCSOC.timeAgo(e.lastAt) : '';
            meta.appendChild(prev); meta.appendChild(when);
            row.appendChild(idb); row.appendChild(meta);
            if (e.unread > 0) {
                const bg = E('span', 'scdm-badge');
                bg.textContent = e.unread > 99 ? '99+' : String(e.unread);
                row.appendChild(bg);
            }
            row.addEventListener('click', function () { openConv(e.convId, e.peerUid); });
            body.appendChild(row);
        });
    }

    /* ==== VISTA 2 · CHAT ==== */
    function openConv(convId, peerUid) {
        if (!S.on) { open(function () { renderChat(convId, peerUid); }); return; }
        renderChat(convId, peerUid);
    }

    function renderChat(convId, peerUid) {
        if (!S.on || !win || !D) return;
        stopChat();
        S.view = 'chat';
        S.convId = convId; S.peerUid = peerUid;
        clear(win);

        /* --- cabecera --- */
        const head = E('div', 'scdm-head');
        const back = E('button', 'scdm-x');
        back.type = 'button'; back.setAttribute('aria-label', 'Volver a la lista');
        back.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
        back.addEventListener('click', renderList);
        const idb = E('div');
        idb.style.cssText = 'flex:1;min-width:0;';
        idb.appendChild(SCSOC.userHead(peerUid, 32, { nameSize: 13, handlerSize: 10.5 }));
        const timer = E('span', 'scdm-timer');
        const tIc = document.createElement('i');
        tIc.className = 'fa-solid fa-hourglass-half';
        tIc.style.fontSize = '9px';
        const tTx = document.createElement('span');
        tTx.textContent = '—';
        timer.appendChild(tIc); timer.appendChild(tTx);
        const x = E('button', 'scdm-x');
        x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', close);
        head.appendChild(back); head.appendChild(idb); head.appendChild(timer); head.appendChild(x);
        win.appendChild(head);

        /* --- cuerpo: mensajes + composer --- */
        body = E('div', 'scdm-body');
        const msgs = E('div', 'scdm-msgs');
        body.appendChild(msgs);
        const compSlot = E('div');
        body.appendChild(compSlot);
        win.appendChild(body);

        /* estado de expiración */
        D.metaOnce(convId, function (meta) { S.meta = meta; paintTimer(); paintLock(); });
        S.timer = setInterval(paintTimer, 30000);

        let composerMode = null;
        function paintTimer() {
            if (!S.meta) { tTx.textContent = '—'; return; }
            tTx.textContent = fmtLeft(D.msLeft(S.meta));
            timer.style.color = D.isExpired(S.meta) ? '#fbbf24' : '';
            paintLock();
        }
        function paintLock() {
            const mode = !S.meta ? 'loading' : (D.isExpired(S.meta) ? 'expired' : 'send');
            if (mode === composerMode) return;
            composerMode = mode;
            clear(compSlot);
            if (mode === 'loading') return;
            if (mode === 'expired') {
                const bar = E('div', 'scdm-expbar');
                const l1 = E('div');
                l1.textContent = 'Este MD expiró (10 horas). Para volver a hablar con esta persona, envíale una Solicitud de Amistad.';
                const btn = el('button', 'display:inline-flex;align-items:center;gap:7px;margin-top:8px;border:1px solid rgba(139,92,246,.55);background:rgba(139,92,246,.14);color:#c4b5fd;font:800 11px Inter,sans-serif;letter-spacing:.06em;padding:8px 14px;border-radius:999px;cursor:pointer;');
                btn.type = 'button';
                btn.innerHTML = '<i class="fa-solid fa-user-plus" aria-hidden="true"></i>';
                btn.appendChild(document.createTextNode(' SOLICITUD DE AMISTAD'));
                btn.addEventListener('click', function () { SCSOC.toast('Las Solicitudes de Amistad llegan muy pronto.'); });
                bar.appendChild(l1); bar.appendChild(btn);
                compSlot.appendChild(bar);
                return;
            }
            const comp = E('div', 'scdm-comp');
            const ta = el('textarea', '', 'scdm-ta');
            ta.rows = 1;
            ta.placeholder = 'Mensaje privado para esta persona...';
            ta.maxLength = D.MAX_TEXT;
            const send = el('button', '', 'scdm-send');
            send.type = 'button'; send.setAttribute('aria-label', 'Enviar');
            send.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>';
            const sendIt = function () {
                const text = ta.value.trim();
                if (!text) return;
                send.disabled = true; send.style.opacity = '.55';
                D.send(convId, text, function (err) {
                    send.disabled = false; send.style.opacity = '1';
                    if (err) return;
                    ta.value = '';
                    ta.focus();
                });
            };
            send.addEventListener('click', sendIt);
            ta.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIt(); }
            });
            comp.appendChild(ta); comp.appendChild(send);
            compSlot.appendChild(comp);
            ta.focus();
        }
        paintLock();

        /* --- mensajes en vivo --- */
        const meUid = me() ? me().uid : '';
        function scrollBottom() {
            requestAnimationFrame(function () { msgs.scrollTop = msgs.scrollHeight; });
        }
        function scheduleMark() {
            if (S.markT) clearTimeout(S.markT);
            S.markT = setTimeout(function () { try { D.markRead(convId); } catch (e) {} }, 400);
        }
        S.offMsgs = D.watchConv(convId, {
            onAdd: function (m, key) {
                if (!m || !m.id || cards[key]) return;
                const b = bubble(m, m.authorUid === meUid);
                cards[key] = b;
                msgs.appendChild(b);
                scrollBottom();
                scheduleMark();
            },
            onChange: function (m, key) {
                const b = cards[key];
                if (!b || !m || !b._txt) return;
                clear(b._txt);
                b._txt.appendChild(SCSOC.richText(String(m.text || '')));
            },
            onRemove: function (m, key) {
                const b = cards[key];
                if (b && b.parentNode) b.parentNode.removeChild(b);
                delete cards[key];
            }
        });
        scheduleMark();
    }

    function bubble(m, mine) {
        const b = E('div', 'scdm-bub ' + (mine ? 'scdm-mine' : 'scdm-theirs'));
        const txt = E('div');
        txt.appendChild(SCSOC.richText(String(m.text || '')));
        b.appendChild(txt);
        b._txt = txt;
        const t = E('span', 'scdm-btime');
        t.textContent = SCSOC.timeAgo(m.createdAt);
        b.appendChild(t);
        if (!mine) {
            const fl = el('button', '', 'scdm-flag');
            fl.type = 'button';
            fl.innerHTML = '<i class="fa-regular fa-flag" aria-hidden="true"></i>';
            fl.appendChild(document.createTextNode(' Reportar'));
            fl.addEventListener('click', function (e) {
                e.stopPropagation();
                reportMsg(m);
            });
            b.appendChild(fl);
        }
        return b;
    }

    /* ==== reportar un MD (mismo flujo que report.js -> security/reports) ==== */
    const REASONS = [
        { v: 'Ofensivo', icon: 'fa-face-angry' },
        { v: 'Spam', icon: 'fa-envelope' },
        { v: 'Acoso', icon: 'fa-user-slash' },
        { v: 'Inapropiado', icon: 'fa-triangle-exclamation' },
        { v: 'Otros', icon: 'fa-ellipsis' }
    ];
    const _recentR = {};

    function reportMsg(m) {
        const u = me();
        if (!u || !m || !m.id) return;
        if (m.authorUid === u.uid) return;
        const key = 'dm:' + m.id;
        if (_recentR[key] && Date.now() - _recentR[key] < 60000) {
            SCSOC.toast('Ya reportaste este mensaje hace un momento.');
            return;
        }
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
        h.textContent = 'Reportar mensaje';
        const sub = E('div', 'margin:0 0 12px;color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;');
        sub.textContent = 'El staff lo revisará y tomará acción.';
        box.appendChild(h); box.appendChild(sub);

        const quote = E('div', 'background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-left:3px solid var(--purple-accent,#8b5cf6);border-radius:10px;padding:10px 12px;margin-bottom:12px;');
        const qName = E('div', 'font:800 12px Inter,sans-serif;color:var(--purple-accent,#a78bfa);margin-bottom:3px;');
        qName.textContent = (m.authorName || 'Usuario');
        const qTxt = E('div', 'font:500 12px/1.5 Inter,sans-serif;color:var(--text-muted,#94a3b8);word-break:break-word;');
        const rawTxt = String(m.text || '');
        qTxt.textContent = rawTxt.length > 180 ? rawTxt.slice(0, 180) + '…' : rawTxt;
        quote.appendChild(qName); quote.appendChild(qTxt);
        box.appendChild(quote);

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
            D.nameOf(u.uid, function (meInfo) {
                const payload = {
                    type: 'dm',
                    postId: '',
                    commentId: '',
                    responseId: String(m.id),
                    reason: sel,
                    contentUid: String(m.authorUid || ''),
                    contentName: String(m.authorName || 'Usuario').slice(0, 60),
                    contentText: rawTxt.slice(0, 600),
                    byUid: u.uid,
                    byName: meInfo.name,
                    status: 'pendiente',
                    at: firebase.database.ServerValue.TIMESTAMP
                };
                SCSOC.db().ref('security/reports').push(payload).then(function () {
                    _recentR[key] = Date.now();
                    close();
                    SCSOC.toast('Reporte enviado ✓ — el staff lo revisará.');
                }).catch(function () {
                    sending = false;
                    ok.disabled = false; ok.style.opacity = '1'; ok.textContent = 'Enviar reporte';
                    SCSOC.toast('No se pudo enviar el reporte.');
                });
            });
        });
        row.appendChild(cBtn); row.appendChild(ok);
        box.appendChild(row);
    }

    function me() {
        try { return firebase.auth().currentUser; } catch (e) { return null; }
    }

    /* ==== CSS ==== */
    function injectCss() {
        if (document.querySelector('style[data-scdm]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scdm', '1');
        css.textContent = ''
            + '.scdm-backdrop{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(5,3,12,.62);backdrop-filter:blur(3px);z-index:1590;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
            + '.scdm-backdrop.scdm-on{opacity:1;pointer-events:auto;}'
            + '.scdm-win{position:fixed;top:0;right:0;bottom:0;z-index:1600;width:min(500px,100vw);background:var(--bg-card,#1a1625);border-left:1px solid var(--border-color,#2e2440);transform:translateX(103%);transition:transform .3s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;font-family:Inter,sans-serif;box-sizing:border-box;}'
            + '.scdm-win.scdm-on{transform:none;}'
            + '.scdm-head{flex:none;display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border-color,#2e2440);}'
            + '.scdm-ico{flex:none;width:34px;height:34px;border-radius:50%;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.4);display:flex;align-items:center;justify-content:center;color:var(--purple-accent,#8b5cf6);font-size:13px;}'
            + '.scdm-tt{flex:1;min-width:0;}'
            + '.scdm-tt b{display:block;font:800 13px Inter,sans-serif;letter-spacing:.1em;color:var(--text-main,#f8fafc);}'
            + '.scdm-tt span{display:block;font:600 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:1px;}'
            + '.scdm-x{flex:none;width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;padding:0;}'
            + '.scdm-x:hover{color:var(--text-main,#f8fafc);background:var(--bg-hover,#261f36);}'
            + '.scdm-body{flex:1;min-height:0;display:flex;flex-direction:column;}'
            + '.scdm-row{display:flex;align-items:center;gap:11px;padding:11px 16px;border-bottom:1px solid var(--border-color,#2e2440);cursor:pointer;transition:background .15s ease;}'
            + '.scdm-row:hover{background:var(--bg-hover,#261f36);}'
            + '.scdm-rmeta{flex:1;min-width:0;}'
            + '.scdm-rprev{font:500 12px/1.45 Inter,sans-serif;color:var(--text-muted,#94a3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
            + '.scdm-rwhen{font:600 9.5px Inter,sans-serif;color:#6d5fa8;margin-top:2px;}'
            + '.scdm-badge{flex:none;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font:800 10.5px Inter,sans-serif;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(239,68,68,.4);box-sizing:border-box;}'
            + '.scdm-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 26px;color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;line-height:1.7;}'
            + '.scdm-msgs{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:9px;}'
            + '.scdm-bub{max-width:78%;padding:9px 12px;border-radius:14px;font:400 13px/1.5 Inter,sans-serif;word-break:break-word;}'
            + '.scdm-mine{align-self:flex-end;background:var(--purple-accent,#8b5cf6);color:#fff;border-bottom-right-radius:4px;}'
            + '.scdm-theirs{align-self:flex-start;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-bottom-left-radius:4px;}'
            + '.scdm-btime{display:block;margin-top:3px;font:600 9.5px Inter,sans-serif;opacity:.75;}'
            + '.scdm-flag{display:inline-flex;align-items:center;gap:4px;margin-top:4px;border:0;background:transparent;color:var(--text-muted,#94a3b8);font:700 9.5px Inter,sans-serif;cursor:pointer;opacity:0;transition:opacity .15s ease;padding:2px 0;}'
            + '.scdm-theirs:hover .scdm-flag{opacity:1;}'
            + '.scdm-flag:hover{color:#f87171;}'
            + '.scdm-comp{flex:none;display:flex;align-items:flex-end;gap:8px;padding:11px 14px;border-top:1px solid var(--border-color,#2e2440);}'
            + '.scdm-ta{flex:1;min-width:0;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:10px 12px;font:400 13px/1.5 Inter,sans-serif;resize:none;outline:none;max-height:110px;box-sizing:border-box;}'
            + '.scdm-ta:focus{border-color:var(--purple-accent,#8b5cf6);}'
            + '.scdm-send{flex:none;width:40px;height:40px;border-radius:50%;border:0;background:var(--purple-accent,#8b5cf6);color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s ease,opacity .15s ease;padding:0;}'
            + '.scdm-send:hover{transform:scale(1.06);}'
            + '.scdm-send:active{transform:scale(.95);}'
            + '.scdm-expbar{flex:none;margin:10px 14px;border:1px solid rgba(251,191,36,.4);background:rgba(251,191,36,.08);color:#fbbf24;border-radius:11px;padding:10px 12px;font:600 11.5px Inter,sans-serif;line-height:1.55;text-align:center;}'
            + '.scdm-timer{flex:none;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border-color,#2e2440);border-radius:999px;padding:4px 9px;font:800 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);white-space:nowrap;}'
            + '@media (max-width:640px){.scdm-win{width:100vw;}}';
        document.head.appendChild(css);
    }

    console.log('[Stevscon] md_ui.js listo (v1) — drawer de MDs: lista + chat + expiración 10 h + reportes.');
})(window, document);