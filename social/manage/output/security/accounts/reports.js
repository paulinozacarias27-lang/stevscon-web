/**
 * ====
 * STEVSCON.COM — social/manage/output/security/reports/reports.js (v1)
 * MÓDULO «REPORTS» del panel de Seguridad — SEGUNDO BOX, abajo de ACCOUNTS.
 *
 *  - BOX en el panel (SEC.body) + VENTANA tipo panel (z 2147483040).
 *  - STAFF (Owner/Admin/Mod) ve la caja; Owner y Admin ejecutan baneos
 *    desde ACCOUNTS (botón «IR A LA CUENTA» que abre su detalle).
 *  - Lista en VIVO de security/reports: búsqueda + filtros de estado
 *    (Todos/Pendientes/Revisados/Descartados), contadores en la caja.
 *  - Acciones: marcar REVISADO / DESCARTADO / volver a PENDIENTE,
 *    eliminar reporte (con confirmación) e IR A LA CUENTA del reportado.
 *  - Las reglas ya lo cubren: staff lee/escribe; usuarios solo crean.
 *  - NOTA DE REGLAS: solo se puede cambiar 'status' — el resto de campos
 *    quedan congelados ($other:false). No inventar campos extra aquí.
 *
 *  SEGURIDAD: Firebase Auth exclusivo · todo texto de usuario con
 *  textContent (NUNCA innerHTML con datos) · innerHTML solo para iconos.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.secReports) return;

    /* ==== RUTAS ==== */
    const CFG = {
        REPORTS: (SCSOC.CONFIG && SCSOC.CONFIG.REPORTS) || 'security/reports'
    };

    const R = SCSOC.secReports = {
        open: function () { openWin(); },
        close: closeWin
    };

    /* ==== ESTADO ==== */
    let myRole = null;
    let mounted = false;
    const S = {
        reports: [], permReports: false,
        win: false, q: '', filter: 'todos', refocus: false
    };

    /* ==== DOM refs ==== */
    let statT, statP, statR, listHost, winEl, backdropEl, winBody, winCount;

    /* ==== HELPERS ==== */
    function toast(m) { if (SCSOC.toast) try { SCSOC.toast(m); } catch (e) {} else console.log('[SEC reports] ' + m); }

    /* el() LOCAL — cssText y className por separado (el bug clásico) */
    function el(tag, css, cls) {
        const n = document.createElement(tag);
        if (css) n.style.cssText = css;
        if (cls) n.className = cls;
        return n;
    }
    function E(tag, cls) { return el(tag, '', cls); }

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }

    function fmtDate(ts) {
        const n = Number(ts);
        if (!n) return String(ts || '—');
        try {
            return new Date(n).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) +
                ' · ' + new Date(n).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return String(ts); }
    }
    function renderSoon() {
        if (renderSoon._p) return;
        renderSoon._p = true;
        setTimeout(function () { renderSoon._p = false; render(); }, 60);
    }

    /* ==== METADATOS DE MOTIVOS Y ESTADOS ==== */
    const REASON_META = {
        'Ofensivo':     { icon: 'fa-face-angry',           color: '#f87171' },
        'Spam':         { icon: 'fa-envelope',             color: '#facc15' },
        'Acoso':        { icon: 'fa-user-slash',           color: '#93c5fd' },
        'Inapropiado':  { icon: 'fa-triangle-exclamation', color: '#fb923c' },
        'Otros':        { icon: 'fa-ellipsis',             color: '#94a3b8' }
    };
    const STATUS_META = {
        'pendiente':  { label: 'PENDIENTE',  color: '#f59e0b' },
        'revisado':   { label: 'REVISADO',   color: '#22c55e' },
        'descartado': { label: 'DESCARTADO', color: '#6b7280' }
    };
    function reasonMeta(r) { return REASON_META[r] || { icon: 'fa-flag', color: '#94a3b8' }; }
    function statusMeta(s) { return STATUS_META[s] || { label: String(s || '—').toUpperCase(), color: '#6b7280' }; }

    function objToReports(v) {
        const out = [], o = v || {};
        Object.keys(o).forEach(function (k) {
            const e = o[k];
            if (!e) return;
            out.push({
                id: k,
                type: e.type || 'comment',
                postId: e.postId || '',
                commentId: e.commentId || '',
                responseId: e.responseId || '',
                reason: e.reason || 'Otros',
                detail: e.detail || '',
                contentUid: e.contentUid || '',
                contentName: e.contentName || 'Usuario',
                contentText: e.contentText || '',
                byUid: e.byUid || '',
                byName: e.byName || '—',
                status: e.status || 'pendiente',
                at: e.at || 0
            });
        });
        out.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        return out;
    }

    /* ==== ACCIONES (escrituras) ==== */
    function doStatus(id, st) {
        db().ref(CFG.REPORTS).child(id).update({ status: st })
            .then(function () {
                toast(st === 'pendiente' ? 'Devuelto a pendiente' : 'Marcado como ' + st + ' ✓');
                render();
            })
            .catch(function (e) { toast('⚠️ No se pudo actualizar (' + (e && e.code || 'error') + ')'); });
    }
    function doDelete(rep) {
        const kill = function () {
            db().ref(CFG.REPORTS).child(rep.id).remove()
                .then(function () { toast('Reporte eliminado'); render(); })
                .catch(function (e) { toast('⚠️ No se pudo eliminar (' + (e && e.code || 'error') + ')'); });
        };
        if (SCSOC.confirmModal) {
            SCSOC.confirmModal('Eliminar reporte',
                'Se borrará el reporte de ' + (rep.byName || '—') + ' contra ' + (rep.contentName || '—') + '. Esto no se puede deshacer.', kill);
        } else {
            if (window.confirm('¿Eliminar este reporte? No se puede deshacer.')) kill();
        }
    }
    function goAccount(uid) {
        if (!uid) return;
        if (SCSOC.secAccounts && typeof SCSOC.secAccounts.open === 'function') {
            closeWin(); /* una ventana a la vez: la de accounts queda al frente */
            SCSOC.secAccounts.open(uid);
        } else {
            toast('ACCOUNTS no está cargado.');
        }
    }

    /* ==== FILTRO / BÚSQUEDA ==== */
    function filtered() {
        const q = S.q.trim().toLowerCase();
        let list = S.reports.slice();
        if (S.filter !== 'todos') list = list.filter(function (r) { return r.status === S.filter; });
        if (q) list = list.filter(function (r) {
            return (r.contentName || '').toLowerCase().indexOf(q) !== -1 ||
                (r.byName || '').toLowerCase().indexOf(q) !== -1 ||
                (r.reason || '').toLowerCase().indexOf(q) !== -1 ||
                (r.detail || '').toLowerCase().indexOf(q) !== -1 ||
                (r.contentText || '').toLowerCase().indexOf(q) !== -1 ||
                (r.contentUid || '').toLowerCase().indexOf(q) !== -1 ||
                r.id.indexOf(q) !== -1;
        });
        return list;
    }

    /* ==== RENDER MAESTRO ==== */
    function render() {
        /* contadores de la caja (siempre, aunque la ventana esté cerrada) */
        const t = S.reports.length;
        let p = 0, done = 0;
        S.reports.forEach(function (r) {
            if (r.status === 'pendiente') p++;
            else done++;
        });
        if (statT) statT.textContent = String(t);
        if (statP) statP.textContent = String(p);
        if (statR) statR.textContent = String(done);
        if (winCount) winCount.textContent = t + ' rep.';

        if (!S.win) return;
        return renderList();
    }

    function badge(txt, color) {
        const b = el('span', 'font:800 9.5px Inter,sans-serif;letter-spacing:.08em;padding:2.5px 7px;border-radius:6px;flex:none;background:' + color + '22;color:' + color + ';');
        b.textContent = txt;
        return b;
    }
    function iconBtn(icon, title, color, onClick) {
        const b = el('button', 'flex:none;width:32px;height:32px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:' + color + ';font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s ease,transform .15s ease;');
        b.type = 'button'; b.title = title;
        b.setAttribute('aria-label', title);
        b.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
        b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
        return b;
    }
    function miniBtn(txt, kind, onClick) {
        const styles = {
            ok: 'border:1px solid rgba(34,197,94,.5);background:rgba(34,197,94,.12);color:#4ade80;',
            ghost: 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);',
            purple: 'border:1px solid rgba(139,92,246,.55);background:rgba(139,92,246,.16);color:#c4b5fd;',
            danger: 'border:1px solid rgba(239,68,68,.5);background:rgba(239,68,68,.12);color:#f87171;'
        };
        const b = el('button', (styles[kind] || styles.ghost) + 'font:800 10.5px Inter,sans-serif;letter-spacing:.06em;padding:7px 11px;border-radius:8px;cursor:pointer;transition:transform .15s ease;');
        b.type = 'button'; b.textContent = txt;
        b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
        return b;
    }

    function renderList() {
        if (!listHost) return;
        const scroll = listHost.scrollTop;
        while (listHost.firstChild) listHost.removeChild(listHost.firstChild);

        /* barra de búsqueda + filtros */
        const bar = el('div', 'display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border-color,#2e2440);position:sticky;top:0;background:var(--bg-card,#16121f);z-index:1;');
        const search = el('input', 'width:100%;box-sizing:border-box;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;color:var(--text-main,#f8fafc);font:600 13px Inter,sans-serif;padding:10px 12px;outline:none;');
        search.type = 'text';
        search.placeholder = 'Buscar por autor, reporter, motivo o texto…';
        search.value = S.q;
        search.addEventListener('input', function () { S.q = search.value; S.refocus = true; renderSoon(); });
        bar.appendChild(search);

        const chips = el('div', 'display:flex;gap:6px;flex-wrap:wrap;');
        [['todos', 'TODOS'], ['pendiente', 'PENDIENTES'], ['revisado', 'REVISADOS'], ['descartado', 'DESCARTADOS']].forEach(function (f) {
            const on = S.filter === f[0];
            const c = el('button', 'border:1px solid ' + (on ? 'var(--purple-accent,#8b5cf6)' : 'var(--border-color,#2e2440)') + ';background:' + (on ? 'rgba(139,92,246,.14)' : 'transparent') + ';color:' + (on ? 'var(--purple-accent,#8b5cf6)' : 'var(--text-muted,#94a3b8)') + ';font:800 10.5px Inter,sans-serif;letter-spacing:.08em;padding:6px 10px;border-radius:8px;cursor:pointer;');
            c.type = 'button'; c.textContent = f[1];
            c.addEventListener('click', function () { S.filter = f[0]; render(); });
            chips.appendChild(c);
        });
        bar.appendChild(chips);
        listHost.appendChild(bar);

        /* error de permisos */
        if (S.permReports) {
            const err = el('div', 'margin:16px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171;border-radius:12px;padding:14px;font:600 12.5px Inter,sans-serif;line-height:1.6;');
            err.textContent = 'PERMISSION_DENIED leyendo security/reports — publica las reglas nuevas de Firebase (nodo security/reports). Sin eso, REPORTS no puede listar los reportes.';
            listHost.appendChild(err);
            return;
        }

        const list = filtered();
        if (!list.length) {
            const empty = el('div', 'padding:44px 20px;text-align:center;color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;line-height:1.7;');
            empty.textContent = (S.q || S.filter !== 'todos')
                ? 'Ningún reporte coincide con la búsqueda/filtro.'
                : 'Sin reportes todavía. Cuando alguien use el botón 🚩 Reportar en un comentario o respuesta, aparecerá aquí.';
            listHost.appendChild(empty);
            return;
        }

        list.forEach(function (rep) {
            const rm = reasonMeta(rep.reason);
            const sm = statusMeta(rep.status);
            const isCom = rep.type === 'comment';

            const card = el('div', 'border-bottom:1px solid var(--border-color,#2e2440);padding:13px 16px;');
            card.addEventListener('mouseenter', function () { card.style.background = 'var(--bg-hover,#261f36)'; });
            card.addEventListener('mouseleave', function () { card.style.background = 'transparent'; });

            /* línea 1: icono de motivo + autor del contenido + badges */
            const top = el('div', 'display:flex;align-items:center;gap:10px;');
            const ic = el('span', 'flex:none;width:34px;height:34px;border-radius:10px;border:1px solid var(--border-color,#2e2440);display:flex;align-items:center;justify-content:center;font-size:13px;background:var(--bg-main,#0d0b14);');
            ic.style.color = rm.color;
            ic.innerHTML = '<i class="fa-solid ' + rm.icon + '" aria-hidden="true"></i>';
            top.appendChild(ic);

            const mid = el('div', 'flex:1;min-width:0;');
            const line1 = el('div', 'display:flex;align-items:center;gap:7px;flex-wrap:wrap;');
            const nm = el('b', 'color:var(--text-main,#f8fafc);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;');
            nm.textContent = rep.contentName;
            line1.appendChild(nm);
            line1.appendChild(badge(isCom ? 'COMENTARIO' : 'RESPUESTA', '#8b5cf6'));
            line1.appendChild(badge(sm.label, sm.color));
            mid.appendChild(line1);
            const sub = el('div', 'color:var(--text-muted,#94a3b8);font:600 11px Inter,sans-serif;margin-top:3px;');
            sub.textContent = 'Motivo: ' + rep.reason + ' · reportado por ' + (rep.byName || '—') + (rep.at ? ' · ' + SCSOC.timeAgo(Number(rep.at)) : '');
            mid.appendChild(sub);
            top.appendChild(mid);

            const right = el('div', 'display:flex;align-items:center;gap:7px;flex:none;');
            right.appendChild(iconBtn('fa-trash-can', 'Eliminar reporte', '#f87171', function () { doDelete(rep); }));
            top.appendChild(right);
            card.appendChild(top);

            /* cita del contenido reportado */
            if (rep.contentText) {
                const quote = el('div', 'margin-top:9px;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-left:3px solid ' + rm.color + ';border-radius:9px;padding:8px 11px;color:var(--text-main,#f8fafc);font:500 12px/1.55 Inter,sans-serif;word-break:break-word;white-space:pre-wrap;');
                quote.textContent = rep.contentText.length > 220 ? rep.contentText.slice(0, 220) + '…' : rep.contentText;
                card.appendChild(quote);
            }

            /* nota del reporter */
            if (rep.detail) {
                const note = el('div', 'margin-top:7px;color:var(--text-muted,#94a3b8);font:600 11.5px/1.55 Inter,sans-serif;word-break:break-word;');
                const nb = el('b'); nb.style.color = 'var(--purple-accent,#a78bfa)'; nb.textContent = 'Nota: ';
                note.appendChild(nb);
                const nt = document.createElement('span');
                nt.textContent = rep.detail.length > 200 ? rep.detail.slice(0, 200) + '…' : rep.detail;
                note.appendChild(nt);
                card.appendChild(note);
            }

            /* línea técnica: UID del autor del contenido (clic para copiar) + fecha completa */
            if (rep.contentUid) {
                const tech = el('div', 'margin-top:7px;color:var(--text-muted,#94a3b8);font:600 10px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;');
                tech.title = 'Clic para copiar UID';
                const ti = document.createElement('i');
                ti.className = 'fa-regular fa-id-badge';
                ti.setAttribute('aria-hidden', 'true');
                tech.appendChild(ti);
                const tu = el('span', 'font-family:monospace;font-size:10px;');
                tu.textContent = rep.contentUid;
                tech.appendChild(tu);
                tech.addEventListener('click', function (e) {
                    e.stopPropagation();
                    try {
                        navigator.clipboard.writeText(rep.contentUid).then(function () { toast('Copiado: ' + rep.contentUid); },
                            function () { toast('No se pudo copiar'); });
                    } catch (err) { toast('No se pudo copiar'); }
                });
                card.appendChild(tech);
            }
            const when = el('div', 'margin-top:5px;color:var(--text-muted,#94a3b8);font:600 10px Inter,sans-serif;');
            when.textContent = fmtDate(rep.at);
            card.appendChild(when);

            /* acciones de estado */
            const acts = el('div', 'display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:10px;');
            if (rep.status === 'pendiente') {
                acts.appendChild(miniBtn('✓ MARCAR REVISADO', 'ok', function () { doStatus(rep.id, 'revisado'); }));
                acts.appendChild(miniBtn('DESCARTAR', 'ghost', function () { doStatus(rep.id, 'descartado'); }));
            } else {
                acts.appendChild(miniBtn('↺ VOLVER A PENDIENTE', 'ghost', function () { doStatus(rep.id, 'pendiente'); }));
            }
            if (rep.contentUid) acts.appendChild(miniBtn('IR A LA CUENTA', 'purple', function () { goAccount(rep.contentUid); }));
            card.appendChild(acts);

            listHost.appendChild(card);
        });

        /* devolver el foco al buscador tras re-render */
        if (S.refocus) {
            S.refocus = false;
            const inp = listHost.querySelector('input');
            if (inp) {
                inp.focus();
                try { const L = inp.value.length; inp.setSelectionRange(L, L); } catch (e) {}
            }
        }

        listHost.scrollTop = scroll;
    }

    /* ==== VENTANA ==== */
    function openWin() {
        if (!winEl) return;
        S.win = true;
        /* si la ventana de ACCOUNTS está abierta, ciérrala (una a la vez) */
        if (document.body.classList.contains('scacc-lock') && SCSOC.secAccounts) {
            try { SCSOC.secAccounts.close(); } catch (e) {}
        }
        winEl.classList.add('sc-on');
        if (backdropEl) backdropEl.classList.add('sc-on');
        document.body.classList.add('screp-lock');
        render();
    }
    function closeWin() {
        S.win = false;
        if (winEl) winEl.classList.remove('sc-on');
        if (backdropEl) backdropEl.classList.remove('sc-on');
        document.body.classList.remove('screp-lock');
    }

    /* ==== ESTILOS ==== */
    function injectCss() {
        const css = document.createElement('style');
        css.textContent = ''
            + '.screp-backdrop{position:fixed;inset:0;background:rgba(5,3,12,.6);z-index:2147483030;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
            + '.screp-backdrop.sc-on{opacity:1;pointer-events:auto;}'
            + '.screp-win{position:fixed;top:0;right:0;bottom:0;z-index:2147483040;width:min(620px,100vw);background:var(--bg-card,#16121f);border-left:1px solid var(--border-color,#2e2440);transform:translateX(103%);transition:transform .3s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;}'
            + '.screp-win.sc-on{transform:translateX(0);}'
            + 'body.screp-lock{overflow:hidden;}'
            + '.screp-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border-color,#2e2440);}'
            + '.screp-title{font:800 12.5px Inter,sans-serif;letter-spacing:.16em;color:var(--text-main,#f8fafc);}'
            + '.screp-tag{font:700 10px Inter,sans-serif;letter-spacing:.1em;color:var(--purple-accent,#8b5cf6);border:1px solid var(--border-color,#2e2440);border-radius:6px;padding:3px 7px;}'
            + '.screp-count{font:700 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.screp-x{margin-left:auto;border:0;background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;}'
            + '.screp-body{flex:1;overflow-y:auto;}'
            + '.screp-box{border:1px solid var(--border-color,#2e2440);border-left:3px solid var(--purple-accent,#8b5cf6);border-radius:13px;padding:16px;margin-bottom:12px;background:rgba(139,92,246,.05);transition:border-color .2s ease,background .2s ease;}'
            + '.screp-box:hover{border-color:rgba(139,92,246,.55);border-left-color:var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.09);}'
            + '.screp-boxtop{display:flex;align-items:center;gap:11px;margin-bottom:8px;}'
            + '.screp-boxic{flex:none;width:38px;height:38px;border-radius:11px;background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.4);display:flex;align-items:center;justify-content:center;color:var(--purple-accent,#8b5cf6);font-size:15px;}'
            + '.screp-boxttl{font:800 13px Inter,sans-serif;letter-spacing:.12em;color:var(--text-main,#f8fafc);}'
            + '.screp-boxsub{color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;line-height:1.55;margin:2px 0 12px;}'
            + '.screp-boxstats{display:flex;border:1px solid var(--border-color,#2e2440);border-radius:10px;overflow:hidden;background:var(--bg-main,#0d0b14);margin-bottom:12px;}'
            + '.screp-openbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid rgba(139,92,246,.55);background:rgba(139,92,246,.14);color:#c4b5fd;font:800 12.5px Inter,sans-serif;letter-spacing:.08em;padding:11px 14px;border-radius:10px;cursor:pointer;transition:background .18s ease,transform .18s ease;}'
            + '.screp-openbtn:hover{background:rgba(139,92,246,.26);}'
            + '.screp-openbtn:active{transform:scale(.97);}'
            + '@media (max-width:640px){.screp-win{width:100vw;}}';
        document.head.appendChild(css);
    }

    /* ==== MONTAJE ==== */
    function mount() {
        if (mounted || !SCSOC.security || !SCSOC.security.body) return;
        mounted = true;
        injectCss();

        const bodyEl = SCSOC.security.body;
        /* limpiar restos del placeholder "zona vacía" si quedara alguno */
        Array.prototype.slice.call(bodyEl.querySelectorAll('.scsec-empty')).forEach(function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
        });

        /* --- BOX REPORTS (queda ABAJO del de ACCOUNTS por orden de carga) --- */
        const box = E('div', 'screp-box');
        const top = E('div', 'screp-boxtop');
        const ic = E('div', 'screp-boxic');
        ic.innerHTML = '<i class="fa-solid fa-flag" aria-hidden="true"></i>';
        const ttl = E('div', 'screp-boxttl');
        ttl.textContent = 'REPORTS';
        top.appendChild(ic); top.appendChild(ttl);
        const tag = E('span', 'screp-tag');
        tag.style.marginLeft = 'auto';
        tag.textContent = 'STAFF';
        top.appendChild(tag);
        box.appendChild(top);

        const sub = E('div', 'screp-boxsub');
        sub.textContent = 'Reportes de la comunidad: comentarios y respuestas señalados como ofensivos, spam o acoso. Revisa el contenido, márcalos como revisados o descartados, salta a la cuenta del autor o elimina el reporte.';
        box.appendChild(sub);

        /* contadores en 3 celdas (vivos) */
        const statsRow = E('div', 'screp-boxstats');
        const mkStat = function (label, color, first) {
            const c = el('div', 'flex:1;text-align:center;padding:9px 4px;' + (first ? '' : 'border-left:1px solid var(--border-color,#2e2440);'));
            const n = el('div', 'font:800 15px Inter,sans-serif;color:' + color + ';');
            n.textContent = '—';
            const l = el('div', 'font:800 8.5px Inter,sans-serif;letter-spacing:.12em;color:var(--text-muted,#94a3b8);margin-top:1px;');
            l.textContent = label;
            c.appendChild(n); c.appendChild(l);
            statsRow.appendChild(c);
            return n;
        };
        statT = mkStat('TOTAL', 'var(--purple-accent,#8b5cf6)', true);
        statP = mkStat('PENDIENTES', '#f59e0b', false);
        statR = mkStat('RESUELTOS', '#4ade80', false);
        box.appendChild(statsRow);

        const openBtn = E('button', 'screp-openbtn');
        openBtn.type = 'button';
        openBtn.innerHTML = '<i class="fa-solid fa-right-long" aria-hidden="true"></i>';
        const obTxt = document.createElement('span');
        obTxt.textContent = 'ABRIR REPORTS';
        openBtn.appendChild(obTxt);
        openBtn.addEventListener('click', function () { openWin(); });
        box.appendChild(openBtn);

        bodyEl.appendChild(box);

        /* --- VENTANA --- */
        backdropEl = E('div', 'screp-backdrop');
        backdropEl.addEventListener('click', closeWin);
        document.body.appendChild(backdropEl);

        winEl = E('aside', 'screp-win');
        winEl.setAttribute('role', 'dialog');
        winEl.setAttribute('aria-label', 'Reports — reportes de la comunidad');
        const head = E('div', 'screp-head');
        const hic = document.createElement('i');
        hic.className = 'fa-solid fa-flag';
        hic.style.color = 'var(--purple-accent,#8b5cf6)';
        hic.setAttribute('aria-hidden', 'true');
        const ht = E('span', 'screp-title');
        ht.textContent = 'REPORTS';
        winCount = E('span', 'screp-count');
        const tag2 = E('span', 'screp-tag');
        tag2.textContent = 'SECURITY';
        const x = E('button', 'screp-x');
        x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', closeWin);
        head.appendChild(hic); head.appendChild(ht); head.appendChild(winCount); head.appendChild(tag2); head.appendChild(x);
        winEl.appendChild(head);

        winBody = E('div', 'screp-body');
        listHost = winBody;
        winEl.appendChild(winBody);
        document.body.appendChild(winEl);

        /* Escape: cierra SOLO esta ventana (sin dejar pasar al panel) */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !S.win) return;
            e.preventDefault(); e.stopPropagation();
            closeWin();
        }, true);

        /* --- LISTENER EN VIVO --- */
        db().ref(CFG.REPORTS).on('value', function (s) {
            S.reports = objToReports(s.val()); S.permReports = false;
            renderSoon();
        }, function () { S.permReports = true; renderSoon(); });

        render();
        console.log('[Stevscon][SEC] reports.js listo (v1) — box REPORTS montado, escuchando security/reports en vivo.');
    }

    /* ==== ARRANQUE: espera motor + confirma staff (monta solo para staff) ==== */
    (function wait() {
        const ok = window.firebase && SCSOC.security && SCSOC.security.body && SCSOC.staff;
        if (!ok) return setTimeout(wait, 150);
        tryMount();
        try { firebase.auth().onAuthStateChanged(function () { tryMount(); }); } catch (e) {}
    })();

    function tryMount() {
        if (mounted) return;
        SCSOC.staff.role(function (r) {
            if (!r || mounted) return;
            myRole = r;
            mount();
        });
    }
})(window, document);