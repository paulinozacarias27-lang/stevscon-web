/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/submit_form_panels.js (v1)
 * EL CREADOR · 6/7 — VISTA PREVIA + COMPARTIR (+ el RENDER PÚBLICO).
 *
 *  FM.formView.render(def, container): dibuja un formulario EXACTAMENTE
 *  como lo ve el usuario — banner, nombre, descripción, categorías con
 *  sus preguntas (los 9 tipos) y abajo del todo el "Creado por {byName}"
 *  (respuesta #15). SIN Firebase: solo recibe el def.
 *  Ese MISMO renderer lo reusará see_form.js (Parte 4) para la vista
 *  pública — una sola fuente de verdad visual.
 *  Los controles llevan data-fmq="{id}" para que submit_form.js
 *  (Parte 4) recoja las respuestas sin adivinar nada.
 *
 *  C.preview.open(): vista previa del draft (se ve real pero no se
 *  puede tocar; el botón de enviar avisa que es preview).
 *  C.share.open(id, name): el panel de "publicado ✔" con el enlace
 *  copiable (deep link #form/{id}).
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
FM.creator = FM.creator || {};
var C = FM.creator;
var core = FM.core;

/* ================= ESTILOS DEL FORMULARIO (vista pública) ================= */
var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'formview');
    st.textContent = ''
    + '@keyframes fmvIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
    + '.fmv-wrap{animation:fmvIn .25s ease}'
    + '.fmv-banner{width:100%;max-height:210px;object-fit:cover;border-radius:14px;border:1px solid var(--border-color,#2e2440);display:block;margin-bottom:16px}'
    + '.fmv-title{font:800 24px Inter,sans-serif;color:var(--text-main,#f8fafc);margin:0 0 6px;letter-spacing:-.01em}'
    + '.fmv-desc{font:500 13.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);line-height:1.6;margin:0 0 20px}'
    + '.fmv-panel{background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:16px;margin-bottom:14px}'
    + '.fmv-panel-title{display:flex;align-items:center;gap:8px;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin:0 0 4px}'
    + '.fmv-idx{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 5px;border-radius:7px;background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6);font:800 11.5px Inter,sans-serif;flex:none}'
    + '.fmv-panel-desc{font:500 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin:0 0 12px}'
    + '.fmv-pimg{width:100%;max-height:170px;object-fit:cover;border-radius:10px;border:1px solid var(--border-color,#2e2440);margin:0 0 12px;display:block}'
    + '.fmv-q{padding:11px 0 4px;margin-top:6px}'
    + '.fmv-q+.fmv-q{border-top:1px solid rgba(148,163,184,.09)}'
    + '.fmv-q-label{font:700 13.5px Inter,sans-serif;color:var(--text-main,#f8fafc);margin:0 0 8px}'
    + '.fmv-req{color:#f87171;font-weight:800}'
    + '.fmv-opts{display:flex;flex-direction:column;gap:8px}'
    + '.fmv-opt{display:flex;align-items:center;gap:9px;font:600 13px Inter,sans-serif;color:var(--text-main,#f8fafc);cursor:pointer}'
    + '.fmv-opt input{accent-color:var(--purple-accent,#8b5cf6);width:15px;height:15px;cursor:pointer}'
    + '.fmv-inp,.fmv-ta,.fmv-select{width:100%;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;color:var(--text-main,#f8fafc);font:500 13.5px Inter,sans-serif;outline:none;transition:border-color .15s ease,box-shadow .15s ease;box-sizing:border-box}'
    + '.fmv-ta{min-height:90px;resize:vertical;line-height:1.55}'
    + '.fmv-inp:focus,.fmv-ta:focus,.fmv-select:focus{border-color:var(--purple-accent,#8b5cf6);box-shadow:0 0 0 3px var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmv-select{appearance:none;-webkit-appearance:none;cursor:pointer}'
    + '.fmv-drop{display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px 12px;border:1.5px dashed var(--border-color,#2e2440);border-radius:12px;color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;cursor:pointer;transition:all .15s ease;text-align:center}'
    + '.fmv-drop i{font-size:19px;color:var(--purple-accent,#8b5cf6)}'
    + '.fmv-drop:hover{border-color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmv-creator{display:flex;align-items:center;gap:8px;justify-content:center;margin:18px 0 4px;padding-top:14px;border-top:1px solid var(--border-color,#2e2440);font:700 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)}'
    + '.fmv-creator i{color:var(--purple-accent,#8b5cf6)}'
    + '.fmv-send{display:flex;justify-content:center;margin-top:10px}'
    + '.fmv-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:12px;border:none;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 13.5px Inter,sans-serif;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;box-shadow:0 8px 22px var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmv-btn:hover{transform:translateY(-2px)}'
    + '.fmv-ro .fmv-wrap{pointer-events:none;opacity:.9}';
    (document.head || document.documentElement).appendChild(st);
}

/* ================= EL RENDER PÚBLICO ================= */
FM.formView = FM.formView || {};

FM.formView.render = function (def, container) {
    style();
    var meta = (def && def.meta) || {};
    container.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'fmv-wrap';

    if (meta.banner) {
        var b = document.createElement('img');
        b.src = meta.banner;
        b.className = 'fmv-banner';
        b.alt = '';
        wrap.appendChild(b);
    }
    var h = core.el('div', '', meta.name || 'Formulario');
    h.className = 'fmv-title';
    wrap.appendChild(h);
    if (meta.description) {
        var dsc = core.el('div', '', meta.description);
        dsc.className = 'fmv-desc';
        wrap.appendChild(dsc);
    }

    var ps = def.panels || {};
    var qs = def.questions || {};
    var pList = Object.keys(ps).map(function (k) {
        return { id: k, v: ps[k], order: typeof ps[k].order === 'number' ? ps[k].order : 0 };
    }).sort(function (a, b) { return a.order - b.order; });

    pList.forEach(function (p, i) {
        var card = document.createElement('div');
        card.className = 'fmv-panel';
        var t = document.createElement('div');
        t.className = 'fmv-panel-title';
        var ix = core.el('span', '', String(i + 1));
        ix.className = 'fmv-idx';
        t.appendChild(ix);
        t.appendChild(document.createTextNode(' ' + (p.v.title || '(sin título)')));
        card.appendChild(t);
        if (p.v.description) {
            var pd = core.el('div', '', p.v.description);
            pd.className = 'fmv-panel-desc';
            card.appendChild(pd);
        }
        if (p.v.image) {
            var pi = document.createElement('img');
            pi.src = p.v.image;
            pi.className = 'fmv-pimg';
            pi.alt = '';
            card.appendChild(pi);
        }
        var qList = Object.keys(qs).map(function (k) {
            return { id: k, v: qs[k], order: typeof qs[k].order === 'number' ? qs[k].order : 0 };
        }).filter(function (q) { return q.v.panelId === p.id; })
          .sort(function (a, b) { return a.order - b.order; });

        qList.forEach(function (q) {
            card.appendChild(buildQuestion(q.id, q.v));
        });
        wrap.appendChild(card);
    });

    if (!pList.length) {
        wrap.appendChild(core.el('div', 'text-align:center;font:600 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);padding:20px', 'Este formulario todavía no tiene categorías.'));
    }

    /* el creador, al final del formulario */
    var cr = document.createElement('div');
    cr.className = 'fmv-creator';
    var cri = document.createElement('i');
    cri.className = 'fa-solid fa-user-pen';
    cr.appendChild(cri);
    cr.appendChild(document.createTextNode(' Creado por ' + (meta.byName || 'Staff')));
    wrap.appendChild(cr);

    container.appendChild(wrap);
    return wrap;
};

function buildQuestion(qid, q) {
    var box = document.createElement('div');
    box.className = 'fmv-q';
    var lab = document.createElement('div');
    lab.className = 'fmv-q-label';
    lab.appendChild(document.createTextNode(q.label || ''));
    if (q.required) {
        var r = core.el('span', '', ' *');
        r.className = 'fmv-req';
        lab.appendChild(r);
    }
    box.appendChild(lab);

    var body = document.createElement('div');
    var t = q.type;

    if (t === 'text') {
        body.appendChild(ctrl('input', qid, 'text', 'Tu respuesta…'));
    } else if (t === 'paragraph') {
        body.appendChild(ctrl('textarea', qid, 'paragraph', 'Tu respuesta…'));
    } else if (t === 'multiple') {
        var w = document.createElement('div');
        w.className = 'fmv-opts';
        (q.options || []).forEach(function (o, i) {
            var l = document.createElement('label');
            l.className = 'fmv-opt';
            var r = document.createElement('input');
            r.type = 'radio';
            r.name = 'fmq_' + qid;
            r.value = String(i);
            r.setAttribute('data-fmq', qid);
            l.appendChild(r);
            l.appendChild(document.createTextNode(' ' + o));
            w.appendChild(l);
        });
        body.appendChild(w);
    } else if (t === 'checkbox') {
        var w2 = document.createElement('div');
        w2.className = 'fmv-opts';
        (q.options || []).forEach(function (o) {
            var l = document.createElement('label');
            l.className = 'fmv-opt';
            var c = document.createElement('input');
            c.type = 'checkbox';
            c.value = o;
            c.setAttribute('data-fmq', qid);
            l.appendChild(c);
            l.appendChild(document.createTextNode(' ' + o));
            w2.appendChild(l);
        });
        body.appendChild(w2);
    } else if (t === 'dropdown') {
        var s = document.createElement('select');
        s.className = 'fmv-select';
        s.setAttribute('data-fmq', qid);
        var ph = document.createElement('option');
        ph.value = '';
        ph.textContent = 'Elige una opción…';
        s.appendChild(ph);
        (q.options || []).forEach(function (o) {
            var op = document.createElement('option');
            op.value = o;
            op.textContent = o;
            s.appendChild(op);
        });
        body.appendChild(s);
    } else if (t === 'number') {
        body.appendChild(ctrl('input', qid, 'number', 'Ej: 18'));
    } else if (t === 'date') {
        body.appendChild(ctrl('input', qid, 'date', ''));
    } else if (t === 'image') {
        var dz = document.createElement('div');
        dz.className = 'fmv-drop';
        dz.setAttribute('data-fmq', qid);
        var di = document.createElement('i');
        di.className = 'fa-solid fa-image';
        dz.appendChild(di);
        dz.appendChild(document.createTextNode(' Subir imagen (hasta ' + core.LIMITS.imgMB + 'MB)'));
        body.appendChild(dz);
    } else if (t === 'url') {
        body.appendChild(ctrl('input', qid, 'url', 'https://…'));
    }
    box.appendChild(body);
    return box;
}

function ctrl(kind, qid, fmvType, ph) {
    var e = document.createElement(kind === 'textarea' ? 'textarea' : 'input');
    e.className = kind === 'textarea' ? 'fmv-ta' : 'fmv-inp';
    if (kind === 'input') e.type = fmvType === 'date' ? 'date' : (fmvType === 'number' ? 'number' : (fmvType === 'url' ? 'url' : 'text'));
    e.placeholder = ph || '';
    e.setAttribute('data-fmq', qid);
    return e;
}

/* ================= VISTA PREVIA ================= */
C.preview = C.preview || {};
C.preview.open = function () {
    var ui = C.ui;
    if (!ui) return;
    var def = C.draftToDef();

    var ov = ui.overlay(false);
    var win = document.createElement('div');
    win.className = 'fmc-modal';
    win.style.maxWidth = '760px';

    var head = document.createElement('div');
    head.className = 'fmc-head';
    var t = document.createElement('div');
    t.className = 'fmc-title';
    var ti = document.createElement('i');
    ti.className = 'fa-solid fa-eye';
    t.appendChild(ti);
    t.appendChild(document.createTextNode(' Vista previa'));
    head.appendChild(t);
    head.appendChild(ui.chip('Así lo verán los usuarios', 'info'));
    head.appendChild(core.el('div', 'flex:1'));
    head.appendChild(C.iconbtn('fa-xmark', 'Cerrar', function () { ov.close(); }));

    var body = document.createElement('div');
    body.className = 'fmc-body';
    var foot = document.createElement('div');
    foot.className = 'fmc-foot';
    foot.appendChild(ui.btn('Volver a editar', 'ghost', function () { ov.close(); }));

    win.appendChild(head);
    win.appendChild(body);
    win.appendChild(foot);
    ov.root.appendChild(win);

    var host = document.createElement('div');
    host.className = 'fmv-ro';   /* se ve real pero no se puede tocar */
    body.appendChild(host);
    FM.formView.render(def, host);

    /* botón de envío de mentira, en su posición real */
    var sendWrap = document.createElement('div');
    sendWrap.className = 'fmv-send';
    var sb = document.createElement('button');
    sb.type = 'button';
    sb.className = 'fmv-btn';
    sb.appendChild(document.createTextNode('Enviar apostulación'));
    sb.addEventListener('click', function () {
        core.toast('Vista previa: aquí el usuario enviaría su apostulación.', 'info');
    });
    sendWrap.appendChild(sb);
    host.appendChild(sendWrap);
};

/* ================= COMPARTIR (después de publicar) ================= */
C.share = C.share || {};
C.share.open = function (formId, name) {
    var ui = C.ui;
    var url = (location.origin || 'https://stevscon.com') + '/forms/forms.html#form/' + formId;
    ui.modal('¡Formulario publicado!', { icon: 'fa-circle-check', dismiss: true, maxW: 460 }, function (body, foot, ov) {
        var ok = core.el('div', 'text-align:center;font-size:34px;color:#34d399;margin:6px 0 10px');
        var oi = document.createElement('i');
        oi.className = 'fa-solid fa-circle-check';
        ok.appendChild(oi);
        body.appendChild(ok);
        body.appendChild(core.el('div', 'text-align:center;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-bottom:4px', name || 'Formulario'));
        body.appendChild(core.el('div', 'text-align:center;font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-bottom:14px', 'Ya está visible para los usuarios. Copia el enlace y compártilo donde quieras.'));

        var box = core.el('div', 'display:flex;gap:8px');
        var inp = ui.input(url, '');
        inp.readOnly = true;
        inp.style.flex = '1';
        inp.addEventListener('focus', function () { inp.select(); });
        box.appendChild(inp);
        box.appendChild(ui.btn('Copiar', '', function () { C.main.copyLink(formId); }));
        body.appendChild(ui.field('Enlace directo', box, 'Quien lo abra entra directo al formulario.'));
        foot.appendChild(ui.btn('Listo', 'ghost', function () { ov.close(); }));
    });
};

console.log('[Stevscon] create_form/submit_form_panels.js listo (v1) — vista previa + compartir + render público.');
})(window, document);