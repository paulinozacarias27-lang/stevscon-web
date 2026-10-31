/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/view_panel.js (v1)
 * EL CREADOR · 7/7 — REVISIÓN DE APOSTULACIONES (solo Owner/Admins).
 *
 *  FM.review.panel.open(formId?):
 *   - Selector de formulario + filtros: Pendientes / Aceptadas /
 *     Rechazadas / Todas (con conteo).
 *   - Cada ficha: postulado (nombre, handler, avatar), cuándo envió,
 *     estado y calificación si ya la tiene.
 *   - Detalle: perfil + Gmail del postulado (visible SOLO para el
 *     staff — respuesta #17), todas las respuestas agrupadas por
 *     categorías, y el veredicto: nota + calificación del 1 al 10
 *     + Aceptar / Rechazar (respuesta #1 y #9).
 *   - El veredicto lo EJECUTA data_save/accept_decline.js (Parte 3):
 *     FM.review.decide({...}). Si todavía no cargó, avisa con toast —
 *     y como hasta la Parte 4 nadie puede postularse, hoy siempre
 *     verás el estado vacío correcto ("nadie ha enviado todavía").
 *
 *  ESTRUCTURA QUE LEE (la escriben las Partes 3 y 4):
 *   forms/responses/{formId}/{uid}/meta = { submittedAt, status:
 *   'pending'|'accepted'|'declined', score, staffNote, reviewedBy,
 *   reviewedByName, reviewedAt, profile:{ name, handler, email,
 *   avatar, description } }
 *   forms/responses/{formId}/{uid}/answers/{qId} = respuesta
 *   (string | array de strings | base64 para imagen)
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
FM.review = FM.review || {};
var C = FM.creator = FM.creator || {};
var core = FM.core;

/* estilos propios de la revisión */
var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'review');
    st.textContent = ''
    + '.fmr-filters{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--border-color,#2e2440)}'
    + '.fmr-filter{padding:7px 12px;border-radius:999px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:700 12px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
    + '.fmr-filter:hover{color:var(--text-main,#f8fafc)}'
    + '.fmr-filter-on{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmr-card{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border-color,#2e2440);border-radius:13px;background:var(--bg-main,#0d0b14);margin-bottom:10px;cursor:pointer;transition:all .15s ease}'
    + '.fmr-card:hover{border-color:var(--purple-accent,#8b5cf6);transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.25)}'
    + '.fmr-ava{width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color,#2e2440);flex:none}'
    + '.fmr-ava-ph{width:40px;height:40px;border-radius:50%;background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6);display:flex;align-items:center;justify-content:center;font:800 15px Inter,sans-serif;flex:none}'
    + '.fmr-name{font:800 13.5px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fmr-sub{font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:2px}'
    + '.fmr-chips{display:flex;gap:6px;align-items:center;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}'
    + '.fmr-profile{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--border-color,#2e2440);border-radius:12px;background:var(--bg-main,#0d0b14);margin-bottom:14px;flex-wrap:wrap}'
    + '.fmr-mail{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:11px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);color:#f87171;font:700 12px Inter,sans-serif;margin-bottom:14px}'
    + '.fmr-mail i{font-size:12px}'
    + '.fmr-ptitle{font:800 13.5px Inter,sans-serif;color:var(--purple-accent,#8b5cf6);margin:16px 0 2px;display:flex;align-items:center;gap:7px}'
    + '.fmr-qlab{font:700 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin:12px 0 4px}'
    + '.fmr-ans{font:500 13px Inter,sans-serif;color:var(--text-main,#f8fafc);line-height:1.55;word-break:break-word;white-space:pre-wrap}'
    + '.fmr-ansimg{max-width:300px;max-height:220px;border-radius:10px;border:1px solid var(--border-color,#2e2440);display:block}'
    + '.fmr-score{display:flex;gap:5px;flex-wrap:wrap}'
    + '.fmr-sc{width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:800 12px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .13s ease}'
    + '.fmr-sc:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--text-main,#f8fafc)}'
    + '.fmr-sc-on{background:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6);color:#fff}';
    (document.head || document.documentElement).appendChild(st);
}

var STATUS = {
    pending:  { label: 'Pendiente', chip: 'warn' },
    accepted: { label: 'Aceptada',  chip: 'ok' },
    declined: { label: 'Rechazada', chip: 'err' }
};

FM.review.panel = {
    open: function (formId) {
        var self = this;
        style();
        core.session(function (s) {
            if (!s.isStaff) return core.toast('Solo el Owner y los Admins pueden revisar.', 'error');
            self._boot(formId);
        });
    },

    _boot: function (formId) {
        var ui = C.ui;
        var state = { formId: formId || null, defs: null, def: null, responses: null, filter: 'pending' };

        var ov = ui.overlay(false);
        var win = document.createElement('div');
        win.className = 'fmc-win';
        win.style.maxWidth = '920px';

        var head = document.createElement('div');
        head.className = 'fmc-head';
        var t = document.createElement('div');
        t.className = 'fmc-title';
        var ti = document.createElement('i');
        ti.className = 'fa-solid fa-clipboard-check';
        t.appendChild(ti);
        t.appendChild(document.createTextNode(' Revisión de apostulaciones'));
        head.appendChild(t);
        var selHost = core.el('div', 'flex:1;display:flex;justify-content:flex-end;min-width:160px');
        head.appendChild(selHost);
        head.appendChild(C.iconbtn('fa-rotate-right', 'Recargar', function () { loadResponses(); }));
        head.appendChild(C.iconbtn('fa-xmark', 'Cerrar', function () { ov.close(); }));

        var filters = document.createElement('div');
        filters.className = 'fmr-filters';
        var body = document.createElement('div');
        body.className = 'fmc-body';

        win.appendChild(head);
        win.appendChild(filters);
        win.appendChild(body);
        ov.root.appendChild(win);

        function wait(txt) {
            return core.el('div', 'text-align:center;padding:30px 10px;font:600 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)', txt);
        }
        function setDef(id) {
            var d = state.defs[id] || {};
            state.def = { meta: d.meta || {}, panels: d.panels || {}, questions: d.questions || {} };
        }

        function drawFilters() {
            filters.textContent = '';
            var all = state.responses || {};
            var counts = { pending: 0, accepted: 0, declined: 0, all: 0 };
            Object.keys(all).forEach(function (uid) {
                var st = (all[uid] && all[uid].meta && all[uid].meta.status) || 'pending';
                counts.all++;
                if (counts[st] !== undefined) counts[st]++;
            });
            [['pending', 'Pendientes'], ['accepted', 'Aceptadas'], ['declined', 'Rechazadas'], ['all', 'Todas']].forEach(function (f) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'fmr-filter' + (state.filter === f[0] ? ' fmr-filter-on' : '');
                b.textContent = f[1] + ' (' + counts[f[0]] + ')';
                b.addEventListener('click', function () {
                    state.filter = f[0];
                    drawFilters();
                    drawList();
                });
                filters.appendChild(b);
            });
        }

        function loadResponses() {
            body.textContent = '';
            if (!state.formId) {
                body.appendChild(ui.empty('fa-clipboard-list', 'Elige un formulario', 'No hay formularios guardados todavía.'));
                drawFilters();
                return;
            }
            body.appendChild(wait('Cargando apostulaciones…'));
            core.db().ref('forms/responses/' + state.formId).once('value').then(function (snap) {
                state.responses = snap.val() || {};
                drawFilters();
                drawList();
            }).catch(function (e) {
                body.textContent = '';
                body.appendChild(ui.empty('fa-triangle-exclamation', 'No se pudieron cargar', (e && e.message) || 'Error de Firebase.'));
            });
        }

        function drawList() {
            body.textContent = '';
            var all = state.responses || {};
            var uids = Object.keys(all).filter(function (uid) {
                if (state.filter === 'all') return true;
                var st = (all[uid] && all[uid].meta && all[uid].meta.status) || 'pending';
                return st === state.filter;
            });
            if (!uids.length) {
                body.appendChild(ui.empty('fa-inbox', 'Nada por aquí',
                    state.filter === 'pending' ? 'Nadie ha enviado esta apostulación todavía.' : 'No hay apostulaciones con ese estado.'));
                return;
            }
            uids.sort(function (a, b) {
                var ta = (all[a].meta && all[a].meta.submittedAt) || 0;
                var tb = (all[b].meta && all[b].meta.submittedAt) || 0;
                return tb - ta;
            });
            uids.forEach(function (uid) { body.appendChild(card(uid, all[uid])); });
        }

        function card(uid, resp) {
            var meta = (resp && resp.meta) || {};
            var prof = meta.profile || {};
            var st = STATUS[meta.status || 'pending'] || STATUS.pending;
            var el = document.createElement('div');
            el.className = 'fmr-card';

            if (prof.avatar) {
                var av = document.createElement('img');
                av.src = prof.avatar;
                av.className = 'fmr-ava';
                av.alt = '';
                el.appendChild(av);
            } else {
                var ph = core.el('div', '', (prof.name || '?').charAt(0).toUpperCase());
                ph.className = 'fmr-ava-ph';
                el.appendChild(ph);
            }
            var main = core.el('div', 'min-width:0;flex:1');
            var nm = core.el('div', '', prof.name || prof.handler || 'Usuario');
            nm.className = 'fmr-name';
            main.appendChild(nm);
            var sub = core.el('div', '', (prof.handler ? '@' + prof.handler + ' · ' : '') + (meta.submittedAt ? core.timeAgo(meta.submittedAt) : ''));
            sub.className = 'fmr-sub';
            main.appendChild(sub);
            el.appendChild(main);

            var chips = core.el('div', '');
            chips.className = 'fmr-chips';
            chips.appendChild(ui.chip(st.label, st.chip));
            if (typeof meta.score === 'number' && meta.score > 0) chips.appendChild(ui.chip('★ ' + meta.score + '/10', 'info'));
            el.appendChild(chips);

            el.addEventListener('click', function () { detail(uid, resp); });
            return el;
        }

        function detail(uid, resp) {
            var meta = (resp && resp.meta) || {};
            var prof = meta.profile || {};
            var def = state.def || { panels: {}, questions: {} };
            var qs = def.questions, ps = def.panels;

            ui.modal('Apostulación', { icon: 'fa-user', wide: true, maxW: 680 }, function (bd, ft, mo) {

                /* perfil + gmail (solo staff) */
                var pf = document.createElement('div');
                pf.className = 'fmr-profile';
                if (prof.avatar) {
                    var av = document.createElement('img');
                    av.src = prof.avatar;
                    av.className = 'fmr-ava';
                    av.alt = '';
                    pf.appendChild(av);
                } else {
                    var ph = core.el('div', '', (prof.name || '?').charAt(0).toUpperCase());
                    ph.className = 'fmr-ava-ph';
                    pf.appendChild(ph);
                }
                var pmain = core.el('div', 'min-width:0;flex:1');
                var pn = core.el('div', '', prof.name || prof.handler || 'Usuario');
                pn.className = 'fmr-name';
                pmain.appendChild(pn);
                if (prof.handler) {
                    var hd = core.el('div', '', '@' + prof.handler);
                    hd.className = 'fmr-sub';
                    pmain.appendChild(hd);
                }
                if (prof.description) {
                    var pd = core.el('div', '', prof.description);
                    pd.className = 'fmr-sub';
                    pmain.appendChild(pd);
                }
                pf.appendChild(pmain);
                if (typeof meta.score === 'number' && meta.score > 0) pf.appendChild(ui.chip('★ ' + meta.score + '/10', 'info'));
                bd.appendChild(pf);

                if (prof.email) {
                    var mail = document.createElement('div');
                    mail.className = 'fmr-mail';
                    var mi = document.createElement('i');
                    mi.className = 'fa-solid fa-envelope';
                    mail.appendChild(mi);
                    mail.appendChild(document.createTextNode(' ' + prof.email));
                    var lk = core.el('span', '', 'solo el staff ve esto');
                    lk.style.marginLeft = 'auto';
                    lk.style.fontWeight = '600';
                    lk.style.fontSize = '11px';
                    mail.appendChild(lk);
                    bd.appendChild(mail);
                }

                /* respuestas agrupadas por categorías */
                var answers = (resp && resp.answers) || {};
                var pArr = Object.keys(ps).map(function (k) { return { id: k, v: ps[k], order: ps[k].order || 0 }; })
                    .sort(function (a, b) { return a.order - b.order; });
                pArr.forEach(function (p) {
                    var pt = core.el('div', '', p.v.title || '(sin título)');
                    pt.className = 'fmr-ptitle';
                    bd.appendChild(pt);
                    var qArr = Object.keys(qs).map(function (k) { return { id: k, v: qs[k], order: qs[k].order || 0 }; })
                        .filter(function (q) { return q.v.panelId === p.id; })
                        .sort(function (a, b) { return a.order - b.order; });
                    qArr.forEach(function (q) {
                        bd.appendChild(answerBlock(q.v, answers[q.id]));
                    });
                });

                /* veredicto anterior, si ya lo revisaron */
                if (meta.status && meta.status !== 'pending') {
                    var info = document.createElement('div');
                    info.className = 'fmr-profile';
                    info.style.marginTop = '4px';
                    var st = STATUS[meta.status];
                    info.appendChild(ui.chip(st.label, st.chip));
                    if (meta.reviewedByName) {
                        var rb = core.el('span', '', 'por ' + meta.reviewedByName);
                        rb.className = 'fmr-sub';
                        info.appendChild(rb);
                    }
                    if (meta.reviewedAt) {
                        var ra = core.el('span', '', core.timeAgo(meta.reviewedAt));
                        ra.className = 'fmr-sub';
                        info.appendChild(ra);
                    }
                    if (meta.staffNote) {
                        var nt = core.el('div', '', 'Nota: ' + meta.staffNote);
                        nt.className = 'fmr-sub';
                        nt.style.width = '100%';
                        info.appendChild(nt);
                    }
                    bd.appendChild(info);
                }

                /* veredicto */
                var inNote = ui.textarea(meta.staffNote || '', 'Nota para el postulado (opcional)…');
                bd.appendChild(ui.field('Nota para el postulado (opcional)', inNote));

                var score = (typeof meta.score === 'number' && meta.score > 0) ? meta.score : 0;
                var scWrap = document.createElement('div');
                scWrap.className = 'fmr-score';
                var scBtns = [];
                for (var n = 1; n <= 10; n++) {
                    (function (n) {
                        var b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'fmr-sc' + (score === n ? ' fmr-sc-on' : '');
                        b.textContent = String(n);
                        b.addEventListener('click', function () {
                            score = (score === n) ? 0 : n;   /* clic de nuevo = quitar */
                            for (var i = 0; i < scBtns.length; i++) {
                                scBtns[i].className = 'fmr-sc' + (score === i + 1 ? ' fmr-sc-on' : '');
                            }
                        });
                        scBtns.push(b);
                        scWrap.appendChild(b);
                    })(n);
                }
                bd.appendChild(ui.field('Calificación (1 a 10, opcional)', scWrap, 'Clic de nuevo en el mismo número la quita.'));

                function decide(action) {
                    if (FM.review && typeof FM.review.decide === 'function') {
                        FM.review.decide({
                            formId: state.formId,
                            uid: uid,
                            action: action,
                            note: (inNote.value || '').trim(),
                            score: score
                        }, function (ok) {
                            if (ok) { mo.close(); loadResponses(); }
                        });
                    } else {
                        core.toast('Falta data_save/accept_decline.js (viene en la Parte 3) para ejecutar el veredicto.', 'error');
                    }
                }
                ft.appendChild(ui.btn('Rechazar', 'danger', function () { decide('declined'); }));
                ft.appendChild(ui.btn('Aceptar', 'ok', function () { decide('accepted'); }));
            });
        }

        function answerBlock(q, val) {
            var wrap = document.createElement('div');
            wrap.style.margin = '10px 0';
            var lab = core.el('div', '', q.label || 'Pregunta');
            lab.className = 'fmr-qlab';
            if (q.required) {
                var rs = core.el('span', '', ' *');
                rs.style.color = '#f87171';
                lab.appendChild(rs);
            }
            wrap.appendChild(lab);

            if (val === undefined || val === null || val === '' || (Object.prototype.toString.call(val) === '[object Array]' && !val.length)) {
                wrap.appendChild(core.el('div', 'font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8)', '(sin responder)'));
                return wrap;
            }
            var t = q.type;
            if (t === 'image') {
                var im = document.createElement('img');
                im.src = String(val);
                im.className = 'fmr-ansimg';
                im.alt = '';
                wrap.appendChild(im);
            } else if (t === 'url') {
                var a = document.createElement('a');
                var href = String(val);
                if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
                a.href = href;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = String(val);
                a.className = 'fmr-ans';
                a.style.color = 'var(--purple-accent,#8b5cf6)';
                wrap.appendChild(a);
            } else if (t === 'checkbox' && Object.prototype.toString.call(val) === '[object Array]') {
                var cw = core.el('div', 'display:flex;gap:6px;flex-wrap:wrap');
                val.forEach(function (o) { cw.appendChild(ui.chip(String(o), 'info')); });
                wrap.appendChild(cw);
            } else {
                var tx = core.el('div', '', Object.prototype.toString.call(val) === '[object Array]' ? val.join(', ') : String(val));
                tx.className = 'fmr-ans';
                wrap.appendChild(tx);
            }
            return wrap;
        }

        /* selector de formularios + arranque */
        core.db().ref('forms/defs').once('value').then(function (snap) {
            state.defs = snap.val() || {};
            var keys = Object.keys(state.defs);
            selHost.textContent = '';
            if (!keys.length) { loadResponses(); return; }
            if (!state.formId || !state.defs[state.formId]) state.formId = keys[0];
            setDef(state.formId);
            var opts = keys.map(function (k) {
                return { v: k, t: (state.defs[k].meta && state.defs[k].meta.name) || k };
            });
            var sel = ui.select(opts, state.formId);
            sel.style.maxWidth = '260px';
            sel.addEventListener('change', function () {
                state.formId = sel.value;
                setDef(state.formId);
                loadResponses();
            });
            selHost.appendChild(sel);
            loadResponses();
        }).catch(function (e) {
            body.textContent = '';
            body.appendChild(ui.empty('fa-triangle-exclamation', 'No se pudieron cargar los formularios', (e && e.message) || 'Error de Firebase.'));
        });
    }
};

console.log('[Stevscon] create_form/view_panel.js listo (v1) — revisión de apostulaciones.');
})(window, document);