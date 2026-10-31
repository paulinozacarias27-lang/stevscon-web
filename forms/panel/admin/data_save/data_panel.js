/**
 * ====
 * STEVSCON.COM — forms/panel/admin/data_save/data_panel.js (v1)
 * DATA_SAVE · 3/4 — "MIS APOSTULACIONES" + NOTIFICACIONES (FM.mine).
 *
 *  QUÉ HACE (respuestas #9, #12 y #19):
 *  - FM.mine.render(container) monta el panel completo:
 *      · KPIs: enviadas / pendientes / aceptadas / rechazadas
 *      · Notificaciones: te aceptaron, te rechazaron, el form fue
 *        editado, volvió a pendiente — con nota y calificación.
 *        Las "nuevas" se marcan en morado; se dan por vistas al abrir
 *        (local, sin tocar rules). FM.mine.unseenCount(cb) deja el
 *        número para el badge del conector (Parte 4).
 *      · Una tarjeta por apostulación con el estado AL SEGUNDO (leído
 *        vivo de tu respuesta, nunca de una copia): estado, ★ puntos,
 *        nota del staff, quién la revisó, cuántas veces la editaste o
 *        re-enviaste, y botones: Editar (pendiente) / Reenviar
 *        (rechazada) / Ver formulario → #form/{id} (lo rutea la Parte 4).
 *  - El conector (Parte 4) lo monta en la ruta #mis; hasta entonces se
 *    puede probar desde consola (ver receta del deploy).
 *
 *  Depende de forms_core.js y public_forms.js (cargan antes). Cero innerHTML.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;
FM.mine = FM.mine || {};

if (!core) { console.warn('[Stevscon] data_panel.js: falta forms_core.js'); return; }

/* FM.data se resuelve al vuelo (este file carga después que public_forms) */
var D = function () { return FM.data; };

function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

/* vistas: la última vez que viste tus notificaciones (local) */
function seenKey(uid) { return 'fm_notif_seen_' + uid; }
function getSeen(uid) { try { return Number(localStorage.getItem(seenKey(uid))) || 0; } catch (e) { return 0; } }
function setSeen(uid) { try { localStorage.setItem(seenKey(uid), String(Date.now())); } catch (e) {} }

var STATUS = {
    pending:  { label: 'Pendiente', cls: 'warn', icon: 'fa-clock' },
    accepted: { label: 'Aceptada',  cls: 'ok',   icon: 'fa-circle-check' },
    declined: { label: 'Rechazada', cls: 'err',  icon: 'fa-circle-xmark' }
};
var NOTIF = {
    accepted: { icon: 'fa-circle-check', cls: 'ok',   title: function (n) { return '¡Te ACEPTARON en «' + (n.formName || 'un formulario') + '»!'; } },
    declined: { icon: 'fa-circle-xmark', cls: 'err',  title: function (n) { return 'Tu apostulación de «' + (n.formName || 'un formulario') + '» fue rechazada'; } },
    edited:   { icon: 'fa-pen',          cls: 'info', title: function (n) { return 'El formulario «' + (n.formName || 'un formulario') + '» fue editado'; } },
    reset:    { icon: 'fa-rotate-left',  cls: 'info', title: function (n) { return 'Tu apostulación de «' + (n.formName || 'un formulario') + '» volvió a Pendiente'; } }
};

var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'mine');
    st.textContent = ''
    + '.fmm-wrap{display:flex;flex-direction:column;gap:16px}'
    + '.fmm-title{font:800 21px Inter,sans-serif;color:var(--text-main,#f8fafc);letter-spacing:-.02em}'
    + '.fmm-sub{font:600 13px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:3px}'
    + '.fmm-kpis{display:flex;gap:10px;flex-wrap:wrap}'
    + '.fmm-kpi{flex:1;min-width:120px;border:1px solid var(--border-color,#2e2440);border-radius:13px;background:var(--bg-card,#1a1625);padding:12px 14px}'
    + '.fmm-kpi b{display:block;font:800 20px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fmm-kpi span{font:800 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);letter-spacing:.08em}'
    + '.fmm-sec{display:flex;align-items:center;gap:8px;font:800 14px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fmm-sec i{color:var(--purple-accent,#8b5cf6);font-size:13px}'
    + '.fmm-badge{background:#ef4444;color:#fff;border-radius:999px;padding:2px 8px;font:800 11px Inter,sans-serif}'
    + '.fmm-notif{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border:1px solid var(--border-color,#2e2440);border-radius:12px;background:var(--bg-card,#1a1625);margin-bottom:8px}'
    + '.fmm-notif.fmm-new{border-color:rgba(139,92,246,.55)}'
    + '.fmm-nicon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;flex:none;margin-top:1px}'
    + '.fmm-nicon.ok{background:rgba(52,211,153,.13);color:#34d399}'
    + '.fmm-nicon.err{background:rgba(248,113,113,.13);color:#f87171}'
    + '.fmm-nicon.info{background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6)}'
    + '.fmm-nbody{flex:1;min-width:0}'
    + '.fmm-ntitle{font:700 13px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fmm-nnote{font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:3px;font-style:italic}'
    + '.fmm-ntime{font:600 11px Inter,sans-serif;color:var(--text-muted,#94a3b8);flex:none;margin-top:2px}'
    + '.fmm-card{border:1px solid var(--border-color,#2e2440);border-radius:14px;background:var(--bg-card,#1a1625);padding:14px 16px;margin-bottom:10px}'
    + '.fmm-crow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}'
    + '.fmm-cname{font:800 14.5px Inter,sans-serif;color:var(--text-main,#f8fafc);flex:1;min-width:150px}'
    + '.fmm-chip{padding:4px 11px;border-radius:999px;font:800 11px Inter,sans-serif;flex:none}'
    + '.fmm-chip.warn{background:rgba(245,158,11,.13);color:#f59e0b}'
    + '.fmm-chip.ok{background:rgba(52,211,153,.13);color:#34d399}'
    + '.fmm-chip.err{background:rgba(248,113,113,.13);color:#f87171}'
    + '.fmm-chip.info{background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6)}'
    + '.fmm-cmeta{font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:7px}'
    + '.fmm-note{font:600 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:9px 11px;margin-top:9px}'
    + '.fmm-note em{color:var(--text-muted,#94a3b8);font-style:normal;font-size:11px;display:block;margin-bottom:3px}'
    + '.fmm-actions{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}'
    + '.fmm-btn{padding:8px 15px;border-radius:10px;border:1px solid var(--purple-accent,#8b5cf6);background:var(--purple-accent,#8b5cf6);color:#fff;font:800 12px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
    + '.fmm-btn:hover{background:var(--purple-dark,#6d28d9);transform:translateY(-1px)}'
    + '.fmm-btn.ghost{background:transparent;color:var(--purple-accent,#8b5cf6);border-color:var(--border-color,#2e2440)}'
    + '.fmm-btn.ghost:hover{border-color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35));transform:none}'
    + '.fmm-big{border:1px dashed var(--border-color,#2e2440);border-radius:16px;background:var(--bg-card,#1a1625);padding:38px 20px;text-align:center}'
    + '.fmm-big i{font-size:30px;color:var(--purple-accent,#8b5cf6)}'
    + '.fmm-big b{display:block;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-top:10px}'
    + '.fmm-big span{display:block;font:600 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:5px}'
    + '.fmm-muted{font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8)}';
    (document.head || document.documentElement).appendChild(st);
}

/* ==== RENDER PRINCIPAL (lo llama el conector en #mis) ==== */
FM.mine.render = function (container) {
    if (!container) return;
    style();
    container.textContent = '';
    if (!FM.data) {
        container.appendChild(el('div', 'fmm-muted', 'Falta public_forms.js — revisa que esté subido en forms/panel/admin/data_save/.'));
        return;
    }
    core.session(function (s) {
        if (!s.user) { container.appendChild(loginCard()); return; }
        load(container, s);
    });
};

/* cuántas notificaciones tienes sin ver (para el badge de la Parte 4) */
FM.mine.unseenCount = function (cb) {
    cb = cb || function () {};
    core.session(function (s) {
        if (!s.user) return cb(0);
        D().myNotifications(function (arr) {
            var seen = getSeen(s.uid);
            cb((arr || []).filter(function (n) { return (n.at || 0) > seen; }).length);
        });
    });
};

function loginCard() {
    var big = el('div', 'fmm-big');
    var ic = document.createElement('i');
    ic.className = 'fa-solid fa-right-to-bracket';
    big.appendChild(ic);
    big.appendChild(el('b', '', 'Inicia sesión para ver tus apostulaciones'));
    big.appendChild(el('span', '', 'Solo personas con cuenta pueden enviar y seguir apostulaciones (así ningún troll anda de chistoso).'));
    var a = el('a', 'fmm-btn', 'Ir a Stevscon.com');
    a.href = '/';
    a.style.marginTop = '14px';
    a.style.display = 'inline-block';
    big.appendChild(a);
    return big;
}

function emptyCard() {
    var big = el('div', 'fmm-big');
    var ic = document.createElement('i');
    ic.className = 'fa-solid fa-paper-plane';
    big.appendChild(ic);
    big.appendChild(el('b', '', 'Todavía no te has postulado a nada'));
    big.appendChild(el('span', '', 'Cuando envíes tu primera apostulación, aquí vas a seguir su estado al segundo.'));
    var b = el('button', 'fmm-btn', 'Ver formularios disponibles');
    b.type = 'button';
    b.style.marginTop = '14px';
    b.addEventListener('click', function () { try { location.hash = ''; } catch (e) {} });
    big.appendChild(b);
    return big;
}

function load(container, s) {
    var uid = s.uid;

    var wrap = el('div', 'fmm-wrap');
    var head = el('div', '');
    head.appendChild(el('div', 'fmm-title', 'Mis apostulaciones'));
    head.appendChild(el('div', 'fmm-sub', 'Todo lo que has enviado y su estado, al segundo.'));
    wrap.appendChild(head);

    var kpis = el('div', 'fmm-kpis');
    wrap.appendChild(kpis);

    var nsec = el('div', 'fmm-sec');
    var ni = document.createElement('i');
    ni.className = 'fa-solid fa-bell';
    nsec.appendChild(ni);
    nsec.appendChild(document.createTextNode('Notificaciones'));
    var nbadge = el('span', 'fmm-badge', '');
    nbadge.style.display = 'none';
    nsec.appendChild(nbadge);
    wrap.appendChild(nsec);

    var nhost = el('div', '');
    wrap.appendChild(nhost);

    var csec = el('div', 'fmm-sec');
    var ci = document.createElement('i');
    ci.className = 'fa-solid fa-paper-plane';
    csec.appendChild(ci);
    csec.appendChild(document.createTextNode('Mis envíos'));
    wrap.appendChild(csec);

    var chost = el('div', '');
    wrap.appendChild(chost);

    container.appendChild(wrap);

    /* datos en paralelo: índice propio + defs (nombres) + notificaciones */
    var ids = null, defsMap = null, notifs = null;
    function tick() {
        if (ids === null || defsMap === null || notifs === null) return;
        readLive();
    }
    D().myResponses(function (list) { ids = list || []; tick(); });
    D().listDefs(function (all) {
        defsMap = {};
        (all || []).forEach(function (d) { defsMap[d.id] = d; });
        tick();
    });
    D().myNotifications(function (arr) { notifs = arr || []; tick(); });

    /* estado AL SEGUNDO: se lee vivo de cada respuesta (nunca de una copia) */
    function readLive() {
        var live = {};
        var left = ids.length;
        if (!left) return paint(live);
        ids.forEach(function (fid) {
            core.db().ref('forms/responses/' + fid + '/' + uid).once('value').then(function (s2) {
                live[fid] = s2.val() || null;
            }).catch(function () {
                live[fid] = null;
            }).then(function () {
                if (--left === 0) paint(live);
            });
        });
    }

    function paint(live) {
        /* KPIs */
        var counts = { all: ids.length, pending: 0, accepted: 0, declined: 0 };
        ids.forEach(function (fid) {
            var st = (((live[fid] || {}).meta) || {}).status || 'pending';
            if (counts[st] !== undefined) counts[st]++;
        });
        kpis.textContent = '';
        [['all', 'ENVIADAS'], ['pending', 'PENDIENTES'], ['accepted', 'ACEPTADAS'], ['declined', 'RECHAZADAS']].forEach(function (k) {
            var box = el('div', 'fmm-kpi');
            box.appendChild(el('b', '', String(counts[k[0]])));
            box.appendChild(el('span', '', k[1]));
            kpis.appendChild(box);
        });

        /* notificaciones */
        var seen = getSeen(uid);
        var fresh = notifs.filter(function (n) { return (n.at || 0) > seen; });
        nbadge.textContent = String(fresh.length);
        nbadge.style.display = fresh.length ? '' : 'none';
        nhost.textContent = '';
        if (!notifs.length) {
            nhost.appendChild(el('div', 'fmm-muted', 'Sin notificaciones todavía — cuando el staff revise tus apostulaciones, el aviso llega aquí.'));
        } else {
            notifs.slice(0, 12).forEach(function (n) { nhost.appendChild(notifRow(n, (n.at || 0) > seen)); });
            if (notifs.length > 12) nhost.appendChild(el('div', 'fmm-muted', '…y ' + (notifs.length - 12) + ' más'));
        }
        setSeen(uid);   /* ya las viste */

        /* tarjetas */
        chost.textContent = '';
        if (!ids.length) { chost.appendChild(emptyCard()); return; }
        var rows = ids.map(function (fid) {
            var meta = ((live[fid] || {}).meta) || {};
            return { fid: fid, def: defsMap[fid] || null, meta: meta, at: meta.submittedAt || 0 };
        }).sort(function (a, b) { return b.at - a.at; });
        rows.forEach(function (r) { chost.appendChild(cardFor(r)); });
    }
}

function notifRow(n, isNew) {
    var spec = NOTIF[n.type] || { icon: 'fa-bell', cls: 'info', title: function (x) { return x.formName || 'Apostulación'; } };
    var row = el('div', 'fmm-notif' + (isNew ? ' fmm-new' : ''));

    var ic = el('div', 'fmm-nicon ' + spec.cls);
    var ii = document.createElement('i');
    ii.className = 'fa-solid ' + spec.icon;
    ic.appendChild(ii);
    row.appendChild(ic);

    var body = el('div', 'fmm-nbody');
    body.appendChild(el('div', 'fmm-ntitle', spec.title(n)));
    if (typeof n.score === 'number' && n.score > 0) {
        var sc = el('div', 'fmm-ntitle', 'Calificación: ' + n.score + '/10');
        sc.style.color = '#34d399';
        body.appendChild(sc);
    }
    if (n.note) body.appendChild(el('div', 'fmm-nnote', '«' + n.note + '»'));
    row.appendChild(body);

    row.appendChild(el('div', 'fmm-ntime', n.at ? core.timeAgo(n.at) : ''));
    return row;
}

function cardFor(r) {
    var meta = r.meta || {};
    var def = r.def;
    var st = STATUS[meta.status || 'pending'] || STATUS.pending;

    var card = el('div', 'fmm-card');
    var row = el('div', 'fmm-crow');

    var name = el('div', 'fmm-cname', def ? (def.meta.name || 'Formulario') : 'Formulario eliminado');
    if (!def) name.style.textDecoration = 'line-through';
    row.appendChild(name);

    row.appendChild(el('span', 'fmm-chip ' + st.cls, st.label));
    if (typeof meta.score === 'number' && meta.score > 0) {
        row.appendChild(el('span', 'fmm-chip info', '★ ' + meta.score + '/10'));
    }
    card.appendChild(row);

    var sub = [];
    if (meta.submittedAt) sub.push('Enviada ' + core.timeAgo(meta.submittedAt));
    if (meta.resubmitCount > 0) sub.push('re-envío #' + meta.resubmitCount);
    if (meta.editedCount > 0) sub.push('editada ' + meta.editedCount + (meta.editedCount === 1 ? ' vez' : ' veces'));
    if (meta.reviewedAt && meta.reviewedByName) sub.push('revisada por ' + meta.reviewedByName);
    if (sub.length) card.appendChild(el('div', 'fmm-cmeta', sub.join(' · ')));

    if (meta.staffNote) {
        var note = el('div', 'fmm-note');
        note.appendChild(el('em', '', 'Nota del staff'));
        note.appendChild(document.createTextNode(meta.staffNote));
        card.appendChild(note);
    }

    if (def) {
        var actions = el('div', 'fmm-actions');
        if (meta.status === 'pending') {
            actions.appendChild(btn('Editar respuestas', '', r.fid));
            actions.appendChild(btn('Ver formulario', 'ghost', r.fid));
        } else if (meta.status === 'declined') {
            actions.appendChild(btn('Reenviar apostulación', '', r.fid));
            actions.appendChild(btn('Ver formulario', 'ghost', r.fid));
        } else {
            actions.appendChild(btn('Ver formulario', '', r.fid));
        }
        card.appendChild(actions);
    }
    return card;
}

function btn(label, kind, fid) {
    var b = el('button', 'fmm-btn' + (kind ? ' ' + kind : ''), label);
    b.type = 'button';
    b.addEventListener('click', function () {
        /* el CONECTADOR (Parte 4) rutea #form/{id}; si aún no está, nada rompe */
        try { location.hash = '#form/' + fid; } catch (e) {}
    });
    return b;
}

console.log('[Stevscon] data_save/data_panel.js listo (v1) — Mis apostulaciones + notificaciones.');
})(window, document);