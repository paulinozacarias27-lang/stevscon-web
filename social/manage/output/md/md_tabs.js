/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_tabs.js (v1)
 * PESTAÑAS del drawer de MD — Amigos · MD temporales · Ignorados.
 *  - AMIGOS:        aceptaron Solicitud de Amistad (users/{uid}/friends).
 *  - MD TEMPORALES: conversaciones de MD vivas, sin solicitud aceptada.
 *  - IGNORADOS:     MDs que ignoraste con el botón; sin badge global y
 *                   con «Quitar» para recuperarlos.
 *  - md_ui.js detecta este file SOLO y le pasa la lista (hook v3).
 *  Cargar DESPUÉS de md_contacts.js (usa sus datos en vivo).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmTabs) return;

    const D = SCSOC.dm, C = SCSOC.dmContacts, U = SCSOC.dmUI;
    const PURPLE = 'var(--purple-accent,#8b5cf6)';
    const MAIN = 'var(--text-main,#f8fafc)';
    const MUTED = 'var(--text-muted,#94a3b8)';
    const BORDER = 'var(--border-color,#2e2440)';

    const T = SCSOC.dmTabs = { active: 'temp' };

    let curWin = null, curBody = null, curList = [], curMe = '';
    let friends = {};

    function E(tag, cls, css) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (css) n.style.cssText = css;
        return n;
    }
    function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

    function injectCss() {
        if (document.querySelector('style[data-scdmt]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scdmt', '1');
        css.textContent = ''
            + '.scdm-tabs{flex:none;display:flex;gap:6px;padding:10px 14px;border-bottom:1px solid ' + BORDER + ';}'
            + '.scdm-tab{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid ' + BORDER + ';background:transparent;color:' + MUTED + ';font:800 10.5px Inter,sans-serif;letter-spacing:.04em;padding:8px 6px;border-radius:999px;cursor:pointer;transition:background .16s ease,color .16s ease,border-color .16s ease;}'
            + '.scdm-tab:hover{color:' + MAIN + ';background:var(--bg-hover,#261f36);}'
            + '.scdm-tab.scdm-on{color:' + PURPLE + ';border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.14);}'
            + '.scdm-tcount{flex:none;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:rgba(139,92,246,.18);border:1px solid rgba(139,92,246,.45);color:var(--purple-accent,#8b5cf6);font:800 9px Inter,sans-serif;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;}'
            + '.scdm-tag{flex:none;font:800 8.5px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid ' + BORDER + ';color:' + MUTED + ';}'
            + '.scdm-rowbtn{flex:none;width:28px;height:28px;border-radius:8px;border:1px solid ' + BORDER + ';background:transparent;color:' + MUTED + ';cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0;}'
            + '.scdm-rowbtn:hover{color:' + PURPLE + ';border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.12);}';
        document.head.appendChild(css);
    }

    /* filas estilo md_ui (misma pinta: userHead + preview + badge) */
    function rowFor(peerUid, opts) {
        const row = E('div', 'scdm-row');
        const idb = E('div');
        idb.style.cssText = 'flex:none;min-width:0;';
        idb.appendChild(SCSOC.userHead(peerUid, 38, { nameSize: 13, handlerSize: 10.5 }));
        const meta = E('div', 'scdm-rmeta');
        if (opts.tag) {
            const tg = E('div');
            tg.style.marginBottom = '2px';
            tg.appendChild(opts.tag);
            meta.appendChild(tg);
        }
        const prev = E('div', 'scdm-rprev');
        const _p = (D && D.myPrefs) ? D.myPrefs() : {};
        prev.textContent = opts.noPrev ? 'Vista previa oculta'
            : (opts.text ? (opts.mine ? 'Tú: ' + opts.text : opts.text) : (opts.hint || 'Conversación nueva'));
        const when = E('div', 'scdm-rwhen');
        when.textContent = opts.at ? SCSOC.timeAgo(opts.at) : '';
        meta.appendChild(prev); meta.appendChild(when);
        row.appendChild(idb); row.appendChild(meta);
        if (opts.action) row.appendChild(opts.action);
        if (opts.unread > 0) {
            const bg = E('span', 'scdm-badge');
            bg.textContent = opts.unread > 99 ? '99+' : String(opts.unread);
            row.appendChild(bg);
        }
        return row;
    }

    function emptyBox(icon, text) {
        const empty = E('div', 'scdm-empty');
        const ei = document.createElement('i');
        ei.className = 'fa-solid ' + icon;
        ei.style.cssText = 'font-size:26px;color:' + PURPLE + ';opacity:.7;margin-bottom:10px;';
        empty.appendChild(ei);
        empty.appendChild(document.createTextNode(text));
        return empty;
    }

    function paintList(host) {
        const list = curList || [];
        if (T.active === 'fr') {
            /* v2 · SOLICITUDES DE AMISTAD pendientes (aceptar / rechazar) */
            const F = SCSOC.dmFriends;
            const pend = (F && F.pendingList) ? F.pendingList() : [];
            pend.forEach(function (p) {
                const no = E('button', 'scdm-rowbtn');
                no.type = 'button';
                no.title = 'Rechazar solicitud';
                no.setAttribute('aria-label', 'Rechazar solicitud');
                no.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
                no.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    F.decline(p.uid, function (err) {
                        if (err) SCSOC.toast('No se pudo rechazar. Intenta de nuevo.');
                    });
                });
                const ok = E('button', 'scdm-rowbtn');
                ok.type = 'button';
                ok.title = 'Aceptar solicitud';
                ok.setAttribute('aria-label', 'Aceptar solicitud');
                ok.style.color = '#4ade80';
                ok.innerHTML = '<i class="fa-solid fa-user-check" aria-hidden="true"></i>';
                ok.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    F.accept(p.uid, function (err) {
                        if (err) SCSOC.toast('No se pudo aceptar. Intenta de nuevo.');
                    });
                });
                const wrap = E('div');
                wrap.style.cssText = 'flex:none;display:flex;gap:6px;';
                wrap.appendChild(no); wrap.appendChild(ok);
                const row = rowFor(p.uid, {
                    at: p.at, hint: 'Quiere ser tu amigo', tag: mkTag('Solicitud'), action: wrap
                });
                host.appendChild(row);
            });
            const ids = Object.keys(friends);
            if (!ids.length && !pend.length) {
                host.appendChild(emptyBox('fa-user-group',
                    'Aún no tienes amigos. Cuando aceptes una Solicitud de Amistad, esa persona aparecerá aquí y sus MDs ya no serán temporales.'));
                return;
            }
            ids.forEach(function (fid) {
                const f = friends[fid] || {};
                const row = rowFor(fid, { at: f.at, hint: 'Amigos · MD ilimitado', tag: mkTag('Amigo') });
                row.addEventListener('click', function () {
                    D.open(fid, function (convId) { if (convId && U) U.openConv(convId, fid); });
                });
                host.appendChild(row);
            });
            return;
        }
        if (T.active === 'ign') {
            const rows = list.filter(function (e) { return C && C.isIgnored && C.isIgnored(e.convId); });
            if (!rows.length) {
                host.appendChild(emptyBox('fa-ban',
                    'No ignoraste a nadie. Cuando ignores un MD, aparecerá aquí y dejará de avisarte con el punto rojo.'));
                return;
            }
            rows.forEach(function (e) {
                const quit = E('button', 'scdm-rowbtn');
                quit.type = 'button';
                quit.title = 'Quitar de ignorados';
                quit.setAttribute('aria-label', 'Quitar de ignorados');
                quit.innerHTML = '<i class="fa-solid fa-rotate-left" aria-hidden="true"></i>';
                quit.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    C.unignore(e.convId, e.peerUid, function (err) {
                        if (err) { SCSOC.toast('No se pudo quitar. Intenta de nuevo.'); return; }
                        SCSOC.toast('Ya no está ignorado ✓');
                    });
                });
                const row = rowFor(e.peerUid, {
                    at: e.lastAt, text: e.lastText, mine: e.lastFrom === curMe, unread: e.unread, action: quit
                });
                row.addEventListener('click', function () { U.openConv(e.convId, e.peerUid); });
                host.appendChild(row);
            });
            return;
        }
        /* MD TEMPORALES · conversaciones vivas que NO son amigos ni ignorados */
        const rows = list.filter(function (e) {
            return !(C && C.isIgnored && C.isIgnored(e.convId)) && !friends[e.peerUid];
        });
        if (!rows.length) {
            host.appendChild(emptyBox('fa-inbox',
                'Aún no tienes MDs. Abre el perfil de cualquier usuario del Social y toca «Mensaje» para empezar una conversación privada.'));
            return;
        }
        rows.forEach(function (e) {
            const _p = (D && D.myPrefs) ? D.myPrefs() : {};
            const row = rowFor(e.peerUid, {
                at: e.lastAt, text: e.lastText, mine: e.lastFrom === curMe,
                unread: e.unread, noPrev: _p.mdPreview === 'no'
            });
            row.addEventListener('click', function () { U.openConv(e.convId, e.peerUid); });
            host.appendChild(row);
        });
    }

    function mkTag(txt) {
        const tg = E('span', 'scdm-tag');
        tg.textContent = txt;
        return tg;
    }

    function paint() {
        if (!curWin || !curBody || !document.contains(curBody)) return;
        const Fp = SCSOC.dmFriends;
        const nPend = (Fp && Fp.pendingList) ? Fp.pendingList().length : 0;
        const n = { fr: Object.keys(friends).length + nPend, temp: 0, ign: 0 };
        (curList || []).forEach(function (e) {
            if (C && C.isIgnored && C.isIgnored(e.convId)) n.ign++;
            else if (!friends[e.peerUid]) n.temp++;
        });
        clear(curBody);
        const bar = E('div', 'scdm-tabs');
        [
            { id: 'fr', icon: 'fa-user-group', label: 'Amigos', count: n.fr },
            { id: 'temp', icon: 'fa-comment-dots', label: 'MD temporales', count: n.temp },
            { id: 'ign', icon: 'fa-ban', label: 'Ignorados', count: n.ign }
        ].forEach(function (t) {
            const b = E('button', 'scdm-tab' + (T.active === t.id ? ' scdm-on' : ''));
            b.type = 'button';
            const ic = document.createElement('i');
            ic.className = 'fa-solid ' + t.icon;
            b.appendChild(ic);
            b.appendChild(document.createTextNode(' ' + t.label));
            if (t.count > 0) {
                const c = E('span', 'scdm-tcount');
                c.textContent = t.count > 99 ? '99+' : String(t.count);
                b.appendChild(c);
            }
            b.addEventListener('click', function () { T.active = t.id; paint(); });
            bar.appendChild(b);
        });
        curBody.appendChild(bar);
        const host = E('div', 'scdm-tlist');
        host.style.cssText = 'flex:1;min-height:0;overflow-y:auto;';
        curBody.appendChild(host);
        paintList(host);
    }

    /* md_ui.js llama a render() cada vez que la bandeja cambia */
    T.render = function (win, body, list, meUid) {
        curWin = win; curBody = body; curList = list || []; curMe = meUid || '';
        injectCss();
        paint();
    };

    /* refresco en vivo por amigos (la bandeja ya repinta sola vía md_ui) */
    if (C) {
        C.watchFriends(function (f) { friends = f || {}; paint(); });
        C.watchIgnored(function () { paint(); });
    }

    console.log('[Stevscon] md_tabs.js listo (v1) — pestañas Amigos / MD temporales / Ignorados.');
})(window, document);