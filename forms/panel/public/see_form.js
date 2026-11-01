/**
 * ====
 * STEVSCON.COM — forms/panel/public/see_form.js (v1)
 * PÚBLICO · 2/4 — VER UN FORMULARIO + TU ESTADO.
 *
 *  FM.public.see.open(view, formId) monta la página de UN formulario
 *  (la que abre con #form/{id} o el enlace copiado):
 *   - El form REAL renderizado por FM.formView (Parte 2) — banner,
 *     nombre, descripción, "Creado por", categorías y preguntas.
 *   - Tu estado en vivo (leído de tu respuesta, al segundo):
 *       · Invitado → form bloqueado + tarjeta de login.
 *       · Sin enviar → desbloqueado + barra "Enviar apostulación".
 *       · Pendiente → bloqueado + caja ámbar + "Editar respuestas".
 *       · Aceptada  → bloqueado + caja verde (★ puntos + nota).
 *       · Rechazada → bloqueado + caja roja + "Reenviar apostulación".
 *   - Al editar/reenviar: el form se LLENA con tus respuestas
 *     anteriores (incluidas imágenes) y se desbloquea.
 *   - Staff: barra propia con "Revisión" y "Manager", y los
 *     borradores se pueden ver con aviso de BORRADOR.
 *
 *  Depende de forms_core.js, FM.data, FM.formView y
 *  FM.public.submit (submit_form.js — carga después, pero solo
 *  se llama en RUNTIME, por eso el orden de tags no importa).
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;
FM.public = FM.public || {};

if (!core) { console.warn('[Stevscon] see_form.js: falta forms_core.js'); return; }
FM.public.see = FM.public.see || {};

var GEN = 0;

function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'pub-see');
    st.textContent = ''
    + '.fms-back{display:inline-flex;align-items:center;gap:7px;font:800 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);text-decoration:none;padding:2px 0;margin-bottom:10px;transition:color .15s ease}'
    + '.fms-back:hover{color:var(--purple-accent,#8b5cf6)}'
    + '.fms-load{text-align:center;padding:40px 10px;color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif}'
    + '.fms-staffbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 13px;border-radius:12px;border:1px solid var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35));margin-bottom:14px;font:700 12px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fms-staffbar i{color:var(--purple-accent,#8b5cf6)}'
    + '.fms-staffbar span{flex:1;min-width:160px}'
    + '.fms-sbtn{padding:7px 13px;border-radius:10px;border:1px solid var(--purple-accent,#8b5cf6);background:transparent;color:var(--purple-accent,#8b5cf6);font:800 11.5px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
    + '.fms-sbtn:hover{background:var(--purple-accent,#8b5cf6);color:#fff}'
    + '.fms-draft{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:12px;border:1px dashed var(--border-color,#2e2440);background:var(--bg-card,#1a1625);color:var(--text-muted,#94a3b8);font:700 12px Inter,sans-serif;margin-bottom:14px}'
    + '.fms-draft i{color:#f59e0b}'
    + '.fms-box{display:flex;gap:12px;align-items:flex-start;border-radius:14px;padding:15px 16px;margin-top:18px;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#1a1625);flex-wrap:wrap}'
    + '.fms-box.pending{border-color:rgba(245,158,11,.4)}'
    + '.fms-box.accepted{border-color:rgba(52,211,153,.4)}'
    + '.fms-box.declined{border-color:rgba(248,113,113,.4)}'
    + '.fms-bico{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:16px;flex:none}'
    + '.fms-bico.pending{background:rgba(245,158,11,.13);color:#f59e0b}'
    + '.fms-bico.accepted{background:rgba(52,211,153,.13);color:#34d399}'
    + '.fms-bico.declined{background:rgba(248,113,113,.13);color:#f87171}'
    + '.fms-bmain{flex:1;min-width:220px}'
    + '.fms-btitle{font:800 14.5px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fms-bscore{font:800 13px Inter,sans-serif;color:#34d399;margin-top:3px}'
    + '.fms-bline{font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:4px}'
    + '.fms-bnote{font:600 12.5px/1.5 Inter,sans-serif;color:var(--text-main,#f8fafc);background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:9px 11px;margin-top:9px;width:100%;font-style:italic}'
    + '.fms-bnote em{color:var(--text-muted,#94a3b8);font-style:normal;font-size:10.5px;display:block;margin-bottom:3px;letter-spacing:.06em}'
    + '.fms-bdesc{font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:5px}'
    + '.fms-bbtn{padding:9px 16px;border-radius:11px;border:1px solid var(--purple-accent,#8b5cf6);background:var(--purple-accent,#8b5cf6);color:#fff;font:800 12px Inter,sans-serif;cursor:pointer;transition:all .15s ease;flex:none}'
    + '.fms-bbtn:hover{background:var(--purple-dark,#6d28d9);transform:translateY(-1px)}'
    + '.fms-big{border:1px dashed var(--border-color,#2e2440);border-radius:16px;background:var(--bg-card,#1a1625);padding:44px 20px;text-align:center}'
    + '.fms-big i{font-size:30px;color:var(--purple-accent,#8b5cf6)}'
    + '.fms-big b{display:block;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-top:10px}'
    + '.fms-big span{display:block;font:600 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:5px}'
    + '.fms-bigback{margin-top:14px;padding:9px 16px;border-radius:11px;border:1px solid var(--purple-accent,#8b5cf6);background:transparent;color:var(--purple-accent,#8b5cf6);font:800 12px Inter,sans-serif;cursor:pointer}'
    + '.fms-bigback:hover{background:var(--purple-glow,rgba(139,92,246,.35))}';
    (document.head || document.documentElement).appendChild(st);
}

function bigCard(icon, title, sub, backLabel) {
    var big = el('div', 'fms-big');
    var i = document.createElement('i');
    i.className = 'fa-solid ' + icon;
    big.appendChild(i);
    big.appendChild(el('b', '', title));
    big.appendChild(el('span', '', sub));
    if (backLabel) {
        var b = el('button', 'fms-bigback', backLabel);
        b.type = 'button';
        b.addEventListener('click', function () { try { location.hash = ''; } catch (e) {} });
        big.appendChild(b);
    }
    return big;
}

/* ==== OPEN (lo llama connect_form.js con #form/{id}) ==== */
FM.public.see.open = function (view, formId) {
    if (!view || !formId) return;
    style();
    var gen = ++GEN;
    var myGen = gen;
    view.textContent = '';

    var back = el('a', 'fms-back', '← Formularios');
    back.href = '#';
    view.appendChild(back);
    var host = el('div', '');
    host.appendChild(el('div', 'fms-load', 'Cargando formulario…'));
    view.appendChild(host);

    if (!FM.data || !FM.data.getDef) {
        host.textContent = '';
        host.appendChild(bigCard('fa-triangle-exclamation', 'Módulo sin cargar', 'Falta data_save/public_forms.js — súbelo y recarga.'));
        return;
    }

    FM.data.getDef(formId, function (def) {
        if (myGen !== GEN) return;
        if (!def || !def.meta) {
            host.textContent = '';
            host.appendChild(bigCard('fa-file-circle-question', 'Ese formulario no existe', 'Quizá lo borraron o el enlace viene mal escrito.'));
            return;
        }
        core.session(function (s) {
            if (myGen !== GEN) return;
            build(host, view, def, formId, s, myGen);
        });
    });
};

function build(host, view, def, formId, s, myGen) {
    var meta = def.meta || {};
    var isStaff = !!(s && s.isStaff);
    var isDraft = meta.published === false;
    var S = FM.public.submit;

    if (isDraft && !isStaff) {
        host.textContent = '';
        host.appendChild(bigCard('fa-hourglass-half', 'Todavía no abierto', 'Esta apostulación aún está en preparación — vuelve cuando se publique.'));
        return;
    }
    if (!FM.formView || !FM.formView.render) {
        host.textContent = '';
        host.appendChild(bigCard('fa-triangle-exclamation', 'Módulo sin cargar', 'Falta create_form/submit_form_panels.js (FM.formView) — súbelo y recarga.'));
        return;
    }

    document.title = (meta.name || 'Formulario') + ' — Apostulaciones — Stevscon';

    host.textContent = '';
    if (isDraft) {
        var dw = el('div', 'fms-draft');
        var di = document.createElement('i');
        di.className = 'fa-solid fa-pen-ruler';
        dw.appendChild(di);
        dw.appendChild(document.createTextNode('BORRADOR — solo el staff puede ver esto. Los usuarios normales ven "todavía no abierto".'));
        host.appendChild(dw);
    }
    if (isStaff) {
        var sb = el('div', 'fms-staffbar');
        var si = document.createElement('i');
        si.className = 'fa-solid fa-shield-halved';
        sb.appendChild(si);
        sb.appendChild(el('span', '', 'Vista de staff'));
        var rv = el('button', 'fms-sbtn', 'Revisión de apostulaciones');
        rv.type = 'button';
        rv.addEventListener('click', function () {
            if (FM.review && FM.review.panel) FM.review.panel.open(formId);
            else core.toast('Falta create_form/view_panel.js.', 'error');
        });
        sb.appendChild(rv);
        var mg = el('button', 'fms-sbtn', 'Abrir Manager');
        mg.type = 'button';
        mg.addEventListener('click', function () {
            if (FM.creator && FM.creator.main) FM.creator.main.openManager();
            else core.toast('Falta el creador (create_form/).', 'error');
        });
        sb.appendChild(mg);
        host.appendChild(sb);
    }

    /* el form de verdad */
    var formHost = el('div', '');
    host.appendChild(formHost);
    FM.formView.render(def, formHost);

    /* zonas de acción + estado */
    var statusHost = el('div', '');
    var actionHost = el('div', '');
    host.appendChild(statusHost);
    host.appendChild(actionHost);

    function reopen() {
        if (myGen !== GEN) return;
        FM.public.see.open(view, formId);
    }

    if (S) { S.reset(); S.wireUploads(def, formHost); }

    /* invitado: bloqueado + login */
    if (!s || !s.user) {
        if (S) S.lock(formHost, true);
        actionHost.appendChild(loginCard());
        return;
    }

    /* tu respuesta (al segundo) */
    core.db().ref('forms/responses/' + formId + '/' + s.uid).once('value').then(function (snap) {
        if (myGen !== GEN) return;
        var resp = snap.val() || null;
        var st = (resp && resp.meta && resp.meta.status) || null;

        if (!st) {
            /* primera vez: desbloqueado + enviar */
            actionHost.appendChild(firstNote());
            if (S) S.attach(actionHost, def, formId, 'fresh', reopen);
            return;
        }

        if (S) S.lock(formHost, true);
        statusHost.appendChild(statusBox(resp.meta, function (mode) {
            /* desbloquear, rellenar con lo anterior y abrir la barra */
            if (!S) return;
            S.lock(formHost, false);
            prefill(def, formHost, (resp && resp.answers) || {});
            actionHost.textContent = '';
            S.attach(actionHost, def, formId, mode, reopen);
            try { actionHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
        }));
    }).catch(function () {
        if (myGen !== GEN) return;
        actionHost.textContent = '';
        if (S) S.attach(actionHost, def, formId, 'fresh', reopen);
    });
}

function loginCard() {
    var big = el('div', 'fms-big');
    var i = document.createElement('i');
    i.className = 'fa-solid fa-right-to-bracket';
    big.appendChild(i);
    big.appendChild(el('b', '', 'Necesitas una cuenta para postularte'));
    big.appendChild(el('span', '', 'Solo personas con cuenta pueden enviar — así podemos ver quién es quién y ningún troll anda de chistoso.'));
    var a = el('a', 'fms-bigback', 'Iniciar sesión en Stevscon.com');
    a.href = '/';
    a.style.display = 'inline-block';
    a.style.marginTop = '14px';
    a.style.textDecoration = 'none';
    big.appendChild(a);
    return big;
}

function firstNote() {
    var n = el('div', 'fms-draft');
    var i = document.createElement('i');
    i.className = 'fa-solid fa-paper-plane';
    n.appendChild(i);
    n.appendChild(document.createTextNode('Aún no te has postulado aquí — esta será tu primera vez.'));
    return n;
}

function statusBox(meta, onAction) {
    var st = meta.status || 'pending';
    var box = el('div', 'fms-box ' + st);
    var ICO = { pending: 'fa-clock', accepted: 'fa-circle-check', declined: 'fa-circle-xmark' };
    var TIT = { pending: 'Pendiente de revisión', accepted: '¡Te ACEPTARON!', declined: 'Te rechazaron esta vez' };
    var DES = {
        pending: 'Puedes editar tus respuestas mientras el staff la revisa.',
        accepted: 'Ya eres parte del equipo — este formulario quedó cerrado para ti.',
        declined: 'Puedes corregir lo que falte y volver a postularte cuando quieras.'
    };
    var ico = el('div', 'fms-bico ' + st);
    var ii = document.createElement('i');
    ii.className = 'fa-solid ' + (ICO[st] || 'fa-clock');
    ico.appendChild(ii);
    box.appendChild(ico);

    var main = el('div', 'fms-bmain');
    main.appendChild(el('div', 'fms-btitle', TIT[st] || 'Pendiente de revisión'));
    if (typeof meta.score === 'number' && meta.score > 0) {
        main.appendChild(el('div', 'fms-bscore', 'Calificación: ' + meta.score + '/10 ★'));
    }
    var line = [];
    if (meta.submittedAt) line.push('Enviada ' + core.timeAgo(meta.submittedAt));
    if (meta.resubmitCount > 0) line.push('re-envío #' + meta.resubmitCount);
    if (meta.editedCount > 0) line.push('editada ' + meta.editedCount + (meta.editedCount === 1 ? ' vez' : ' veces'));
    if (meta.reviewedByName) line.push('revisada por ' + meta.reviewedByName);
    if (line.length) main.appendChild(el('div', 'fms-bline', line.join(' · ')));
    main.appendChild(el('div', 'fms-bdesc', DES[st] || ''));
    if (meta.staffNote) {
        var note = el('div', 'fms-bnote');
        note.appendChild(el('em', '', 'NOTA DEL STAFF'));
        note.appendChild(document.createTextNode(meta.staffNote));
        main.appendChild(note);
    }
    box.appendChild(main);

    if (st === 'pending' && onAction) {
        var b = el('button', 'fms-bbtn', 'Editar respuestas');
        b.type = 'button';
        b.addEventListener('click', function () { onAction('edit'); });
        box.appendChild(b);
    } else if (st === 'declined' && onAction) {
        var r = el('button', 'fms-bbtn', 'Reenviar apostulación');
        r.type = 'button';
        r.addEventListener('click', function () { onAction('resubmit'); });
        box.appendChild(r);
    }
    return box;
}

/* rellena el form con tus respuestas anteriores (las 9 tipos) */
function prefill(def, formHost, answers) {
    var qs = (def && def.questions) || {};
    var S = FM.public.submit;
    Object.keys(answers || {}).forEach(function (qid) {
        var q = qs[qid];
        var v = answers[qid];
        if (!q || v === undefined || v === null) return;
        var t = q.type;

        if (t === 'image') {
            if (S && S.setImg && /^data:image\//i.test(String(v))) S.setImg(formHost, qid, String(v));
            return;
        }
        if (t === 'multiple') {
            var idx = (q.options || []).indexOf(String(v));
            if (idx < 0) return;
            var radios = formHost.querySelectorAll('[data-fmq="' + qid + '"]');
            for (var i = 0; i < radios.length; i++) {
                if (radios[i].type === 'radio' && radios[i].value === String(idx)) radios[i].checked = true;
            }
            return;
        }
        if (t === 'checkbox') {
            var arr = (Object.prototype.toString.call(v) === '[object Array]') ? v : [v];
            var boxes = formHost.querySelectorAll('[data-fmq="' + qid + '"]');
            for (var j = 0; j < boxes.length; j++) {
                if (boxes[j].type === 'checkbox' && arr.indexOf(boxes[j].value) !== -1) boxes[j].checked = true;
            }
            return;
        }
        /* text, paragraph, number, date, url, dropdown */
        var ctl = formHost.querySelector('[data-fmq="' + qid + '"]');
        if (ctl) {
            try { ctl.value = String(v); } catch (e) {}
        }
    });
}

console.log('[Stevscon] public/see_form.js listo (v1) — ver formulario + tu estado en vivo.');
})(window, document);