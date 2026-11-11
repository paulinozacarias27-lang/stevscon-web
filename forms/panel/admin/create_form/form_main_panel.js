/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/form_main_panel.js (v1)
 * EL CREADOR · 5/7 — LA PANTALLA PRINCIPAL + EL MANAGER + EL GUARDADO.
 *
 *  C.ui (el kit de TODOS los modales del creador):
 *   - overlay/modal con ESC + cierre por fondo, input/textarea/select/
 *     field/chip/confirm/empty — todo con las variables de tema
 *     (claro/oscuro automático, cero duplicados).
 *
 *  C.main (la pantalla del editor):
 *   - open(editId|null): null = formulario nuevo. Gate: solo Owner/Admins.
 *   - Izquierda: nombre, descripción, banner opcional, "creado por".
 *   - Derecha: las categorías (panels.js) con sus preguntas.
 *   - Guardar / Publicar / Despublicar / Vista previa / cerrar con
 *     confirmación si hay cambios sin guardar (y ESC también pregunta).
 *
 *  C.main.openManager(): lista de TODOS los formularios (crear, editar,
 *   publicar/despublicar, copiar enlace, revisión, eliminar).
 *
 *  GUARDADO (Firebase — replaces completos, nunca quedan partes viejas):
 *   forms/defs/{id}/meta      → nombre, descripción, banner, published,
 *                               createdBy, byName, createdAt, updatedAt
 *   forms/defs/{id}/panels    → categorías (order = posición)
 *   forms/defs/{id}/questions → preguntas (order = posición en su panel)
 *   Y al EDITAR un form que ya tiene respuestas: notifica a cada
 *   postulado → forms/notifications/{uid}/{nId} = { type:'form_edited',
 *   formId, formName, at, read:false, by } (misma forma que usará
 *   accept_decline.js en la Parte 3).
 *
 *  El id se genera UNA vez (push key) y se reusa en cada Guardar.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var C = FM.creator = FM.creator || {};
var core = FM.core;

/* ================= ESTILOS (inyectados UNA vez) ================= */
var CSS = ''
+ '@keyframes fmcFade{from{opacity:0}to{opacity:1}}'
+ '@keyframes fmcPop{from{transform:translateY(12px) scale(.985);opacity:0}to{transform:none;opacity:1}}'
+ '.fmc-overlay{position:fixed;inset:0;z-index:50000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,2,9,.66);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);animation:fmcFade .18s ease}'
+ '.fmc-win{width:100%;max-width:min(1400px,100%);min-width:0;height:min(94vh,1000px);background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 34px 90px rgba(0,0,0,.55);animation:fmcPop .22s ease}'
+ '.fmc-modal{width:100%;max-width:600px;max-height:90vh;background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 34px 90px rgba(0,0,0,.55);animation:fmcPop .22s ease}'
+ '.fmc-modal-wide{max-width:780px}'
+ '.fmc-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border-color,#2e2440);flex-wrap:wrap}'
+ '.fmc-title{display:flex;align-items:center;gap:9px;font-weight:800;font-size:15.5px;color:var(--text-main,#f8fafc);min-width:0}'
+ '.fmc-title>i:first-child{color:var(--purple-accent,#8b5cf6);font-size:16px}'
+ '.fmc-title span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
+ '.fmc-spacer{flex:1}'
+ '.fmc-body{flex:1;overflow:auto;padding:16px}'
+ '.fmc-body::-webkit-scrollbar{width:9px}'
+ '.fmc-body::-webkit-scrollbar-thumb{background:var(--bg-hover,#261f36);border-radius:9px;border:2px solid var(--bg-card,#1a1625)}'
+ '.fmc-body::-webkit-scrollbar-thumb:hover{background:var(--purple-accent,#8b5cf6)}'
+ '.fmc-foot{display:flex;align-items:center;gap:10px;padding:11px 16px;border-top:1px solid var(--border-color,#2e2440);flex-wrap:wrap}'
+ '.fmc-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:11px;border:1px solid transparent;font:700 13px Inter,sans-serif;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,background .15s ease;color:#fff;background:var(--purple-accent,#8b5cf6)}'
+ '.fmc-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px var(--purple-glow,rgba(139,92,246,.35))}'
+ '.fmc-btn:active{transform:translateY(0)}'
+ '.fmc-btn-ghost{background:transparent;color:var(--text-main,#f8fafc);border-color:var(--border-color,#2e2440)}'
+ '.fmc-btn-ghost:hover{background:var(--bg-hover,#261f36);box-shadow:none}'
+ '.fmc-btn-danger{background:#dc2626}'
+ '.fmc-btn-ok{background:#059669}'
+ '.fmc-btn-sm{padding:6px 10px;font-size:12px;border-radius:9px}'
+ '.fmc-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:12.5px;transition:all .15s ease;flex:none}'
+ '.fmc-iconbtn:hover{color:var(--text-main,#f8fafc);background:var(--bg-hover,#261f36);border-color:var(--purple-accent,#8b5cf6)}'
+ '.fmc-iconbtn.fmc-del:hover{color:#f87171;border-color:#f87171;background:rgba(239,68,68,.09)}'
+ '.fmc-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font:700 11px Inter,sans-serif;letter-spacing:.02em;white-space:nowrap}'
+ '.fmc-chip-ok{background:rgba(16,185,129,.14);color:#34d399}'
+ '.fmc-chip-warn{background:rgba(245,158,11,.14);color:#fbbf24}'
+ '.fmc-chip-err{background:rgba(239,68,68,.14);color:#f87171}'
+ '.fmc-chip-info{background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6)}'
+ '.fmc-field{margin:0 0 14px}'
+ '.fmc-lab{display:block;font:700 11px Inter,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--text-muted,#94a3b8);margin:0 0 6px}'
+ '.fmc-hint{font-size:11.5px;color:var(--text-muted,#94a3b8);margin-top:5px}'
+ '.fmc-inp,.fmc-ta,.fmc-select{width:100%;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;color:var(--text-main,#f8fafc);font:500 13.5px Inter,sans-serif;outline:none;transition:border-color .15s ease,box-shadow .15s ease;box-sizing:border-box}'
+ '.fmc-ta{min-height:88px;resize:vertical;line-height:1.55}'
+ '.fmc-inp:focus,.fmc-ta:focus,.fmc-select:focus{border-color:var(--purple-accent,#8b5cf6);box-shadow:0 0 0 3px var(--purple-glow,rgba(139,92,246,.35))}'
+ '.fmc-select{appearance:none;-webkit-appearance:none;cursor:pointer}'
+ '.fmc-grid{display:grid;grid-template-columns:minmax(280px,340px) minmax(0,1fr);gap:18px}'
+ '.fmc-grid>*{min-width:0}'
+ '@media (max-width:920px){.fmc-grid{grid-template-columns:1fr}}'
+ '.fmc-card{background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:15px}'
+ '.fmc-card-title{display:flex;align-items:center;gap:8px;font:800 13px Inter,sans-serif;color:var(--text-main,#f8fafc);margin:0 0 12px}'
+ '.fmc-card-title i{color:var(--purple-accent,#8b5cf6);font-size:12.5px}'
+ '.fmc-bzone{border:1.5px dashed var(--border-color,#2e2440);border-radius:12px;padding:16px;text-align:center;color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
+ '.fmc-bzone:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35))}'
+ '.fmc-bprev{position:relative;margin-top:10px;border-radius:12px;overflow:hidden;border:1px solid var(--border-color,#2e2440)}'
+ '.fmc-bprev img{display:block;width:100%;max-height:150px;object-fit:cover}'
+ '.fmc-bprev button{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:8px;border:none;background:rgba(0,0,0,.65);color:#f87171;cursor:pointer;font-size:12px}'
+ '.fmc-panel{background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:14px;margin-bottom:14px;overflow:hidden}'
+ '.fmc-panel-head{display:flex;align-items:center;gap:10px;padding:11px 13px;flex-wrap:wrap}'
+ '.fmc-panel-idx{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 6px;border-radius:8px;background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6);font:800 12px Inter,sans-serif}'
+ '.fmc-panel-title{font:800 14px Inter,sans-serif;color:var(--text-main,#f8fafc);overflow-wrap:anywhere;word-break:break-word}'
+ '.fmc-panel-desc{font:500 12px/1.55 Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:2px;overflow-wrap:anywhere;word-break:break-word}'
+ '.fmc-panel-thumb{width:46px;height:36px;border-radius:8px;object-fit:cover;border:1px solid var(--border-color,#2e2440)}'
+ '.fmc-qwrap{border-top:1px dashed var(--border-color,#2e2440)}'
+ '.fmc-qrow{display:flex;align-items:center;gap:10px;padding:8px 13px}'
+ '.fmc-qrow+.fmc-qrow{border-top:1px solid rgba(148,163,184,.07)}'
+ '.fmc-q-ico{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:var(--bg-hover,#261f36);color:var(--purple-accent,#8b5cf6);font-size:11.5px;flex:none}'
+ '.fmc-q-label{font:700 13px/1.5 Inter,sans-serif;color:var(--text-main,#f8fafc);overflow-wrap:anywhere;word-break:break-word}'
+ '.fmc-q-meta{font:600 11px Inter,sans-serif;color:var(--text-muted,#94a3b8)}'
+ '.fmc-req{color:#f87171;font-weight:800}'
+ '.fmc-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px;border:1.5px dashed var(--border-color,#2e2440);border-radius:12px;background:transparent;color:var(--text-muted,#94a3b8);font:700 12.5px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
+ '.fmc-add:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35))}'
+ '.fmc-types{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
+ '@media (max-width:560px){.fmc-types{grid-template-columns:repeat(2,1fr)}}'
+ '.fmc-type{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border:1.5px solid var(--border-color,#2e2440);border-radius:12px;background:var(--bg-main,#0d0b14);color:var(--text-muted,#94a3b8);font:700 11.5px Inter,sans-serif;cursor:pointer;text-align:center;transition:all .15s ease}'
+ '.fmc-type i{font-size:15px}'
+ '.fmc-type:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--text-main,#f8fafc)}'
+ '.fmc-type-on{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35));box-shadow:0 0 0 3px var(--purple-glow,rgba(139,92,246,.35))}'
+ '.fmc-switch{display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none;font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);width:fit-content}'
+ '.fmc-switch input{display:none}'
+ '.fmc-switch .fmc-track{width:38px;height:21px;border-radius:999px;background:var(--bg-hover,#261f36);border:1px solid var(--border-color,#2e2440);position:relative;transition:background .15s ease;flex:none}'
+ '.fmc-switch .fmc-track:after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:var(--text-muted,#94a3b8);transition:all .15s ease}'
+ '.fmc-switch input:checked+.fmc-track{background:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6)}'
+ '.fmc-switch input:checked+.fmc-track:after{left:19px;background:#fff}'
+ '.fmc-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border-color,#2e2440);border-radius:13px;background:var(--bg-main,#0d0b14);margin-bottom:10px;flex-wrap:wrap}'
+ '.fmc-row-main{min-width:180px;flex:1}'
+ '.fmc-row-name{font:800 14px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
+ '.fmc-row-meta{font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:3px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
+ '.fmc-row-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}'
+ '.fmc-empty{padding:38px 16px;text-align:center;color:var(--text-muted,#94a3b8)}'
+ '.fmc-empty i{font-size:30px;color:var(--purple-accent,#8b5cf6);opacity:.75;margin-bottom:10px;display:block}'
+ '.fmc-empty b{display:block;font:800 14.5px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-bottom:4px}'
+ '.fmc-empty span{font:600 12px Inter,sans-serif;display:block}';

var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'creator');
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
}

/* ================= UI KIT ================= */
var openStack = [];   /* pila de overlays: ESC cierra el de arriba */

document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) return;
    if (!openStack.length) return;
    var top = openStack[openStack.length - 1];
    if (top && typeof top.close === 'function') top.close();
});

C.ui = {
    style: style,

    overlay: function (dismiss) {
        style();
        var root = document.createElement('div');
        root.className = 'fmc-overlay';
        var rec = { root: root, dead: false, close: function () {} };
        rec.close = function () {
            if (rec.dead) return;
            rec.dead = true;
            var i = openStack.indexOf(rec);
            if (i !== -1) openStack.splice(i, 1);
            root.style.transition = 'opacity .16s ease';
            root.style.opacity = '0';
            setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 170);
        };
        if (dismiss) root.addEventListener('click', function (e) { if (e.target === root) rec.close(); });
        document.body.appendChild(root);
        openStack.push(rec);
        return rec;
    },

    modal: function (title, opts, builder) {
        if (typeof opts === 'function') { builder = opts; opts = {}; }
        opts = opts || {};
        var self = this;
        var ov = this.overlay(!!opts.dismiss);
        var m = document.createElement('div');
        m.className = 'fmc-modal' + (opts.wide ? ' fmc-modal-wide' : '');
        if (opts.maxW) m.style.maxWidth = opts.maxW + 'px';

        var head = document.createElement('div');
        head.className = 'fmc-head';
        var t = document.createElement('div');
        t.className = 'fmc-title';
        var ti = document.createElement('i');
        ti.className = 'fa-solid ' + (opts.icon || 'fa-pen');
        t.appendChild(ti);
        t.appendChild(document.createTextNode(title));
        head.appendChild(t);
        var sp = core.el('div', 'flex:1');
        head.appendChild(sp);
        head.appendChild(C.iconbtn('fa-xmark', 'Cerrar', function () { ov.close(); }));

        var body = document.createElement('div');
        body.className = 'fmc-body';
        var foot = document.createElement('div');
        foot.className = 'fmc-foot';

        m.appendChild(head);
        m.appendChild(body);
        m.appendChild(foot);
        ov.root.appendChild(m);
        if (builder) builder(body, foot, ov);
        return ov;
    },

    input: function (value, placeholder, oninput) {
        var i = document.createElement('input');
        i.type = 'text';
        i.className = 'fmc-inp';
        i.value = value || '';
        i.placeholder = placeholder || '';
        if (oninput) i.addEventListener('input', function () { oninput(i.value); });
        return i;
    },

    textarea: function (value, placeholder) {
        var t = document.createElement('textarea');
        t.className = 'fmc-ta';
        t.value = value || '';
        t.placeholder = placeholder || '';
        return t;
    },

    select: function (options, value) {
        var s = document.createElement('select');
        s.className = 'fmc-select';
        (options || []).forEach(function (o) {
            var op = document.createElement('option');
            op.value = o.v;
            op.textContent = o.t;
            if (o.v === value) op.selected = true;
            s.appendChild(op);
        });
        return s;
    },

    field: function (label, control, hint) {
        var f = document.createElement('div');
        f.className = 'fmc-field';
        var l = document.createElement('label');
        l.className = 'fmc-lab';
        l.textContent = label;
        f.appendChild(l);
        f.appendChild(control);
        if (hint) {
            var h = core.el('div', '', hint);
            h.className = 'fmc-hint';
            f.appendChild(h);
        }
        return f;
    },

    btn: function (text, kind, onclick, small) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'fmc-btn' + (kind ? ' fmc-btn-' + kind : '') + (small ? ' fmc-btn-sm' : '');
        b.appendChild(document.createTextNode(text));
        b.addEventListener('click', onclick);
        return b;
    },

    chip: function (text, kind) {
        var s = document.createElement('span');
        s.className = 'fmc-chip fmc-chip-' + (kind || 'info');
        s.textContent = text;
        return s;
    },

    confirm: function (title, msg, onYes, yesLabel) {
        var self = this;
        return this.modal(title, { icon: 'fa-triangle-exclamation', dismiss: true, maxW: 420 }, function (body, foot, ov) {
            body.appendChild(core.el('div', 'font:500 13px Inter,sans-serif;color:var(--text-main,#f8fafc);line-height:1.6', msg));
            foot.appendChild(self.btn('Cancelar', 'ghost', function () { ov.close(); }));
            foot.appendChild(self.btn(yesLabel || 'Sí, seguro', 'danger', function () { ov.close(); onYes(); }));
        });
    },

    empty: function (icon, title, sub) {
        var e = document.createElement('div');
        e.className = 'fmc-empty';
        var i = document.createElement('i');
        i.className = 'fa-solid ' + (icon || 'fa-inbox');
        e.appendChild(i);
        var b = core.el('b', '', title || 'Nada por aquí');
        e.appendChild(b);
        if (sub) {
            var s = core.el('span', '', sub);
            e.appendChild(s);
        }
        return e;
    }
};

/* ================= PERFIL · nombre del creador ================= */
C.main = C.main || {};

C.main.readCreatorName = function (uid, cb) {
    if (!uid) return cb('Staff');
    core.db().ref('users/' + uid).once('value').then(function (s) {
        var v = s.val() || {};
        cb(v.username || v.name || v.displayName || v.handler || 'Staff');
    }).catch(function () { cb('Staff'); });
};

/* ================= ABRIR EL EDITOR ================= */
C.main.open = function (editId) {
    if (!core || !core.db) return;
    core.session(function (s) {
        if (!s.isStaff) return core.toast('Solo el Owner y los Admins pueden crear formularios.', 'error');
        if (editId) {
            C.loadDraft(editId, function (ok, err) {
                if (!ok) return core.toast(err || 'No se pudo abrir.', 'error');
                C.main._build();
            });
        } else {
            C.main.readCreatorName(s.uid, function (name) {
                C.draft = C.newDraft(name || 'Staff', s.uid);
                C.main._build();
            });
        }
    });
};

C.main._build = function () {
    var ui = C.ui;
    ui.style();
    var draft = C.draft;          /* el que acabamos de cargar/crear */
    C.main._teardown(true);       /* cierra overlays viejos SIN tocar el draft */
    C.draft = draft;

    var ov = ui.overlay(false);
    var rawClose = ov.close;
    ov.close = function () { C.main.close(false); };   /* ESC también pregunta por lo sin guardar */
    C.main._ov = ov;
    C.main._rawClose = rawClose;

    var win = document.createElement('div');
    win.className = 'fmc-win';

    /* ---- header ---- */
    var head = document.createElement('div');
    head.className = 'fmc-head';
    var t = document.createElement('div');
    t.className = 'fmc-title';
    var ti = document.createElement('i');
    ti.className = 'fa-solid fa-clipboard-list';
    t.appendChild(ti);
    var tName = core.el('span', '', C.draft.meta.name || 'Formulario nuevo');
    t.appendChild(tName);
    head.appendChild(t);
    var stChip = ui.chip('…', 'info');
    head.appendChild(stChip);
    head.appendChild(core.el('div', 'flex:1'));
    var bPrev = ui.btn('Vista previa', 'ghost', function () { if (C.preview) C.preview.open(); });
    var bPub = ui.btn('Publicar', '', function () { C.main.save({ publish: !C.draft.meta.published }); });
    var bSave = ui.btn('Guardar', 'ghost', function () { C.main.save({}); });
    var bX = C.iconbtn('fa-xmark', 'Cerrar', function () { C.main.close(false); });
    head.appendChild(bPrev);
    head.appendChild(bSave);
    head.appendChild(bPub);
    head.appendChild(bX);

    /* ---- cuerpo ---- */
    var body = document.createElement('div');
    body.className = 'fmc-body';
    var grid = document.createElement('div');
    grid.className = 'fmc-grid';

    /* izquierda: ajustes */
    var left = document.createElement('div');
    var card = document.createElement('div');
    card.className = 'fmc-card';
    var ct = document.createElement('div');
    ct.className = 'fmc-card-title';
    var cti = document.createElement('i');
    cti.className = 'fa-solid fa-sliders';
    ct.appendChild(cti);
    ct.appendChild(document.createTextNode(' Ajustes del formulario'));
    card.appendChild(ct);

    var inName = ui.input(C.draft.meta.name, 'Ej: Postulación a PotForce Mod', function (v) {
        C.draft.meta.name = v;
        C.draft.dirty = true;
        C.main.refreshHead();
    });
    card.appendChild(ui.field('Nombre del formulario', inName, 'Se ve en las tarjetas y arriba del formulario. Máximo 120.'));

    var inDesc = ui.textarea(C.draft.meta.description, '¿Para qué es esta apostulación? Cuéntales a los usuarios…');
    inDesc.addEventListener('input', function () {
        C.draft.meta.description = inDesc.value;
        C.draft.dirty = true;
    });
    card.appendChild(ui.field('Descripción', inDesc, 'Máximo 2000 caracteres.'));

    /* banner opcional */
    var zone = document.createElement('div');
    zone.className = 'fmc-bzone';
    var zi = document.createElement('i');
    zi.className = 'fa-solid fa-image';
    zone.appendChild(zi);
    zone.appendChild(document.createTextNode(' Banner opcional (hasta ' + core.LIMITS.imgMB + 'MB)'));
    var file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.style.display = 'none';
    var prev = document.createElement('div');
    prev.className = 'fmc-bprev';
    prev.style.display = 'none';
    var fB = ui.field('Banner (opcional)', zone);
    fB.appendChild(file);
    fB.appendChild(prev);
    card.appendChild(fB);

    function drawBanner() {
        prev.textContent = '';
        prev.style.display = C.draft.meta.banner ? 'block' : 'none';
        if (!C.draft.meta.banner) return;
        var im = document.createElement('img');
        im.src = C.draft.meta.banner;
        im.alt = '';
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.title = 'Quitar banner';
        var rmi = document.createElement('i');
        rmi.className = 'fa-solid fa-trash';
        rm.appendChild(rmi);
        rm.addEventListener('click', function () {
            C.draft.meta.banner = null;
            C.draft.dirty = true;
            drawBanner();
        });
        prev.appendChild(im);
        prev.appendChild(rm);
    }
    zone.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        core.imgToB64(f, function (b64, err) {
            if (err) return core.toast(err, 'error');
            C.draft.meta.banner = b64;
            C.draft.dirty = true;
            drawBanner();
        });
    });
    drawBanner();

    /* creado por (se muestra al final del formulario — respuesta #15) */
    var by = core.el('div', 'display:flex;align-items:center;gap:8px;margin-top:4px;padding-top:12px;border-top:1px solid var(--border-color,#2e2440);font:700 12px Inter,sans-serif;color:var(--text-muted,#94a3b8)');
    var byi = document.createElement('i');
    byi.className = 'fa-solid fa-user-pen';
    byi.style.color = 'var(--purple-accent,#8b5cf6)';
    by.appendChild(byi);
    by.appendChild(document.createTextNode(' Creado por ' + (C.draft.meta.byName || 'Staff') + ' · se muestra al final'));
    card.appendChild(by);
    left.appendChild(card);
    grid.appendChild(left);

    /* derecha: categorías + preguntas */
    var right = document.createElement('div');
    var rCard = document.createElement('div');
    rCard.className = 'fmc-card';
    var rt = document.createElement('div');
    rt.className = 'fmc-card-title';
    var rti = document.createElement('i');
    rti.className = 'fa-solid fa-layer-group';
    rt.appendChild(rti);
    rt.appendChild(document.createTextNode(' Categorías y preguntas'));
    rCard.appendChild(rt);
    var panelHost = document.createElement('div');
    rCard.appendChild(panelHost);
    right.appendChild(rCard);
    grid.appendChild(right);
    body.appendChild(grid);

    /* ---- footer ---- */
    var foot = document.createElement('div');
    foot.className = 'fmc-foot';
    foot.appendChild(core.el('div', 'font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)', 'Las categorías son los paneles principales · las preguntas van dentro de cada una · Guardar antes de cerrar.'));

    win.appendChild(head);
    win.appendChild(body);
    win.appendChild(foot);
    ov.root.appendChild(win);

    C.main._els = { tName: tName, stChip: stChip, bPub: bPub };
    C.panels.render(panelHost);
    C.main.refreshHead();
};

C.main.refreshHead = function () {
    var e = C.main._els;
    if (!e || !C.main._ov || C.main._ov.dead) return;
    var d = C.draft;
    e.tName.textContent = (d.meta.name || '').trim() || 'Formulario nuevo';
    if (d.dirty) {
        e.stChip.className = 'fmc-chip fmc-chip-warn';
        e.stChip.textContent = 'Cambios sin guardar';
    } else if (d.meta.published) {
        e.stChip.className = 'fmc-chip fmc-chip-ok';
        e.stChip.textContent = 'Publicado';
    } else {
        e.stChip.className = 'fmc-chip fmc-chip-warn';
        e.stChip.textContent = 'Borrador';
    }
    e.bPub.textContent = d.meta.published ? 'Despublicar' : 'Publicar';
    e.bPub.className = 'fmc-btn' + (d.meta.published ? ' fmc-btn-ghost' : '');
};

C.main.close = function (force) {
    if (!C.main._ov || C.main._ov.dead) return;
    if (!force && C.draft.dirty) {
        C.ui.confirm('Cambios sin guardar', 'Si cierras ahora se pierden los cambios que no guardaste. ¿Cerrar igual?', function () {
            C.main._destroy();
        }, 'Cerrar sin guardar');
        return;
    }
    C.main._destroy();
};

C.main._teardown = function (keepDraft) {
    if (C.main._rawClose) { try { C.main._rawClose(); } catch (e) {} }
    C.main._ov = null;
    C.main._rawClose = null;
    C.main._els = null;
    if (!keepDraft) {
        C.draft = C.newDraft();
        C.panels.renderInto = null;
    }
};
C.main._destroy = function () { C.main._teardown(false); };

/* ================= GUARDAR / PUBLICAR ================= */
C.main.save = function (opts, cb) {
    opts = opts || {};
    var v = C.validateDraft();
    if (!v.ok) {
        core.toast(v.errors[0], 'error');
        if (v.errors.length > 1) console.warn('[Forms] validación:', v.errors);
        if (cb) cb(false);
        return;
    }
    var d = C.draft;
    var db = core.db();
    var isNew = !d.id;
    var id = d.id || db.ref('forms/defs').push().key;
    d.id = id;

    var def = C.draftToDef();
    var now = Date.now();
    def.meta.updatedAt = now;
    def.meta.createdAt = d.meta.createdAt || now;
    if (opts.publish !== undefined) def.meta.published = !!opts.publish;
    d.meta.published = def.meta.published;
    d.meta.createdAt = def.meta.createdAt;

    var updates = {};
    updates['forms/defs/' + id + '/meta'] = def.meta;
    updates['forms/defs/' + id + '/panels'] = def.panels;
    updates['forms/defs/' + id + '/questions'] = def.questions;

    function finish() {
        db.ref().update(updates).then(function () {
            d.dirty = false;
            C.main.refreshHead();
            if (cb) cb(true);
            if (opts.publish === true && def.meta.published) {
                core.toast('¡Formulario publicado! Copia el enlace y compártelo.', 'ok');
                if (C.share) C.share.open(id, def.meta.name);
            } else if (opts.publish === false) {
                core.toast('Formulario despublicado — ya no lo ven los usuarios.', 'info');
            } else {
                core.toast('Guardado.', 'ok');
            }
        }).catch(function (e) {
            core.toast('No se pudo guardar: ' + ((e && e.message) || e), 'error');
            if (cb) cb(false);
        });
    }

    if (!isNew) {
        /* EDITADO → avisar a quien ya se postuló (respuesta #19) */
        db.ref('forms/responses/' + id).once('value').then(function (s) {
            var resp = s.val();
            if (resp && typeof resp === 'object') {
                Object.keys(resp).forEach(function (uid) {
                    updates['forms/notifications/' + uid + '/' + db.ref().push().key] = {
                        type: 'form_edited',
                        formId: id,
                        formName: def.meta.name,
                        at: now,
                        read: false,
                        by: def.meta.byName
                    };
                });
            }
            finish();
        }).catch(finish);
    } else {
        finish();
    }
};

/* ================= ACCIONES RÁPIDAS DEL MANAGER ================= */
C.main.setPublished = function (formId, pub) {
    core.db().ref('forms/defs/' + formId + '/meta').update({ published: !!pub, updatedAt: Date.now() })
        .then(function () { core.toast(pub ? 'Publicado.' : 'Despublicado.', 'ok'); })
        .catch(function (e) { core.toast('No se pudo: ' + ((e && e.message) || e), 'error'); });
};

C.main.removeForm = function (formId) {
    core.db().ref('forms/defs/' + formId).remove()
        .then(function () { core.toast('Formulario eliminado.', 'ok'); })
        .catch(function (e) { core.toast('No se pudo: ' + ((e && e.message) || e), 'error'); });
};

C.main.copyLink = function (formId) {
    var url = (location.origin || 'https://stevscon.com') + '/forms/forms.html#form/' + formId;
    var done = function () { core.toast('Enlace copiado — pégalo donde quieras.', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { legacyCopy(url, done); });
    } else legacyCopy(url, done);
};
function legacyCopy(text, done) {
    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
    } catch (e) { core.toast('No se pudo copiar: ' + text, 'info'); }
}

/* ================= MANAGER · la lista de formularios ================= */
C.main.openManager = function () {
    core.session(function (s) {
        if (!s.isStaff) return core.toast('Solo el Owner y los Admins ven esto.', 'error');
        var ui = C.ui;
        var m = ui.modal('Formularios', { icon: 'fa-clipboard-list', dismiss: true, wide: true }, function (body, foot) {
            body.appendChild(core.el('div', 'text-align:center;padding:30px 10px;font:600 12.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)', 'Cargando formularios…'));
            foot.appendChild(ui.btn('+ Crear nuevo', '', function () { m.close(); C.main.open(null); }));

            core.db().ref('forms/defs').once('value').then(function (snap) {
                body.textContent = '';
                var defs = snap.val() || {};
                var keys = Object.keys(defs);
                if (!keys.length) {
                    body.appendChild(ui.empty('fa-clipboard-list', 'Todavía no hay formularios', 'Crea el primero con el botón "Crear nuevo".'));
                    return;
                }
                keys.forEach(function (id) {
                    var d = defs[id] || {};
                    var meta = d.meta || {};
                    var pCount = d.panels ? Object.keys(d.panels).length : 0;
                    var qCount = d.questions ? Object.keys(d.questions).length : 0;
                    var complete = pCount > 0 && qCount > 0;

                    var row = document.createElement('div');
                    row.className = 'fmc-row';
                    var main = document.createElement('div');
                    main.className = 'fmc-row-main';
                    var nm = core.el('div', '', meta.name || '(sin nombre)');
                    nm.className = 'fmc-row-name';
                    var mt = document.createElement('div');
                    mt.className = 'fmc-row-meta';
                    mt.appendChild(ui.chip(meta.published ? 'Publicado' : 'Borrador', meta.published ? 'ok' : 'warn'));
                    mt.appendChild(core.el('span', '', pCount + (pCount === 1 ? ' categoría' : ' categorías') + ' · ' + qCount + (qCount === 1 ? ' pregunta' : ' preguntas')));
                    if (meta.byName) {
                        var byS = core.el('span', '', 'por ' + meta.byName);
                        mt.appendChild(byS);
                    }
                    if (meta.updatedAt) {
                        var upS = core.el('span', '', core.timeAgo(meta.updatedAt));
                        mt.appendChild(upS);
                    }
                    main.appendChild(nm);
                    main.appendChild(mt);
                    row.appendChild(main);

                    var tools = document.createElement('div');
                    tools.className = 'fmc-row-tools';
                    tools.appendChild(ui.btn('Editar', 'ghost', function () { m.close(); C.main.open(id); }, true));
                    tools.appendChild(C.iconbtn('fa-clipboard-check', 'Revisión de apostulaciones', function () {
                        m.close();
                        if (FM.review && FM.review.panel) FM.review.panel.open(id);
                        else core.toast('view_panel.js no cargó.', 'error');
                    }));
                    tools.appendChild(C.iconbtn('fa-link', 'Copiar enlace', function () { C.main.copyLink(id); }));
                    if (complete) {
                        tools.appendChild(ui.btn(meta.published ? 'Despublicar' : 'Publicar', meta.published ? 'ghost' : '', function () {
                            C.main.setPublished(id, !meta.published);
                            m.close();
                        }, true));
                    } else {
                        tools.appendChild(ui.chip('Incompleto', 'err'));
                    }
                    tools.appendChild(C.iconbtn('fa-trash', 'Eliminar formulario', function () {
                        ui.confirm('Eliminar formulario', 'Se borra "' + (meta.name || id) + '". Las respuestas ya guardadas se conservan en la base de datos. ¿Seguro?', function () {
                            C.main.removeForm(id);
                            m.close();
                        });
                    }, true));
                    row.appendChild(tools);
                    body.appendChild(row);
                });
            }).catch(function (e) {
                body.textContent = '';
                body.appendChild(ui.empty('fa-triangle-exclamation', 'No se pudieron cargar', (e && e.message) || 'Error de Firebase.'));
            });
        });
    });
};

console.log('[Stevscon] create_form/form_main_panel.js listo (v1) — editor + manager + guardado.');
})(window, document);