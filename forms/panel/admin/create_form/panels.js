/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/panels.js (v1)
 * EL CREADOR · 1/7 — PANELES PRINCIPALES (las categorías del formulario)
 * + el MODELO COMPLETO del draft (el formulario en memoria mientras se edita).
 *
 *  - C.draft: el formulario abierto ahora mismo. C.newDraft() lo reinicia.
 *  - C.panels: CRUD de categorías (add/update/remove/move/get/list).
 *    La POSICIÓN en el array ES el orden — al guardar se numeran solas.
 *  - C.loadDraft(formId): abre un formulario guardado para editarlo.
 *  - C.draftToDef(): serializa al formato EXACTO de Firebase:
 *       forms/defs/{formId}/meta      → nombre, descripción, banner,
 *                                      publicado, createdBy/byName, fechas
 *       forms/defs/{formId}/panels    → categorías con order
 *       forms/defs/{formId}/questions → preguntas colgadas de su panel
 *  - C.validateDraft(): reglas (nombre, categorías, preguntas, opciones)
 *    con mensajes en español listos para el toast.
 *  - C.panels.render(): dibuja la columna de categorías con sus preguntas
 *    dentro (las filas de preguntas las dibuja sub_panels.js).
 *  - C.rerender(): refresca la columna + el header — lo llaman TODOS los
 *    edits del creador.
 *  - Este file NUNCA toca Firebase al arrancar: solo al LLAMAR loadDraft.
 *  - Topes: 20 categorías y 60 preguntas por formulario.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
FM.creator = FM.creator || {};
var C = FM.creator;
var core = FM.core;

/* ==== ids cortos de cliente (categorías y preguntas) ==== */
C.nid = function (p) {
    return (p || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

/* ==== DRAFT · el formulario en memoria ==== */
C.newDraft = function (byName, uid) {
    return {
        id: null,                 /* null = nuevo; se asigna al primer Guardar */
        dirty: false,
        meta: {
            name: '', description: '', banner: null, published: false,
            createdBy: uid || null, byName: byName || 'Staff',
            createdAt: null
        },
        panels: [],               /* [{id,title,description,image}] — posición = orden */
        questions: []             /* [{id,panelId,type,label,required,options}] */
    };
};
C.draft = C.newDraft();

function touch() { if (C.draft) C.draft.dirty = true; }

/* ==== PANELES (categorías) ==== */
C.panels = {
    add: function (p) {
        var panel = {
            id: C.nid('p'),
            title: (p && p.title) || 'Nueva categoría',
            description: (p && p.description) || '',
            image: (p && p.image) || null
        };
        C.draft.panels.push(panel);
        touch();
        return panel;
    },
    update: function (id, patch) {
        var p = this.get(id);
        if (!p) return;
        if (patch.title != null) p.title = patch.title;
        if (patch.description != null) p.description = patch.description;
        if (patch.image !== undefined) p.image = patch.image;
        touch();
    },
    remove: function (id) {
        C.draft.panels = C.draft.panels.filter(function (p) { return p.id !== id; });
        C.draft.questions = C.draft.questions.filter(function (q) { return q.panelId !== id; });
        touch();
    },
    get: function (id) {
        var a = C.draft.panels;
        for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
        return null;
    },
    move: function (id, dir) {
        var a = C.draft.panels, i = -1;
        for (var k = 0; k < a.length; k++) if (a[k].id === id) { i = k; break; }
        if (i === -1) return;
        var j = i + (dir === 'up' ? -1 : 1);
        if (j < 0 || j >= a.length) return;
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        touch();
    },
    list: function () { return C.draft.panels.slice(); }
};

/* ==== ABRIR UN FORMULARIO GUARDADO (para editarlo) ==== */
C.loadDraft = function (formId, cb) {
    if (!core || !core.db) return cb(false, 'forms_core.js no cargó.');
    core.db().ref('forms/defs/' + formId).once('value').then(function (snap) {
        var def = snap.val();
        if (!def || !def.meta) return cb(false, 'Ese formulario no existe.');
        var d = C.newDraft(def.meta.byName || 'Staff', def.meta.createdBy || null);
        d.id = formId;
        d.meta.name = def.meta.name || '';
        d.meta.description = def.meta.description || '';
        d.meta.banner = def.meta.banner || null;
        d.meta.published = !!def.meta.published;
        d.meta.createdAt = def.meta.createdAt || null;

        var ps = def.panels || {}, qs = def.questions || {};
        var pArr = [];
        Object.keys(ps).forEach(function (k) {
            pArr.push({
                id: k,
                title: ps[k].title || '',
                description: ps[k].description || '',
                image: ps[k].image || null,
                order: typeof ps[k].order === 'number' ? ps[k].order : 0
            });
        });
        pArr.sort(function (a, b) { return a.order - b.order; });
        d.panels = pArr;

        /* preguntas agrupadas por categoría, en el orden de cada una */
        d.questions = [];
        pArr.forEach(function (p) {
            var qArr = [];
            Object.keys(qs).forEach(function (k) {
                if (qs[k].panelId === p.id) qArr.push({
                    id: k, panelId: p.id,
                    type: qs[k].type || 'text',
                    label: qs[k].label || '',
                    required: !!qs[k].required,
                    options: qs[k].options || [],
                    order: typeof qs[k].order === 'number' ? qs[k].order : 0
                });
            });
            qArr.sort(function (a, b) { return a.order - b.order; });
            d.questions = d.questions.concat(qArr);
        });

        C.draft = d;
        cb(true, null);
    }).catch(function (e) {
        cb(false, (e && e.message) || 'Error de Firebase al abrir el formulario.');
    });
};

/* ==== SERIALIZAR · el formato EXACTO que vive en Firebase ==== */
C.draftToDef = function () {
    var d = C.draft;
    var def = {
        meta: {
            name: (d.meta.name || '').trim(),
            description: (d.meta.description || '').trim(),
            banner: d.meta.banner || null,
            published: !!d.meta.published,
            createdBy: d.meta.createdBy || null,
            byName: d.meta.byName || 'Staff',
            createdAt: d.meta.createdAt || null,
            updatedAt: null
        },
        panels: {},
        questions: {}
    };
    d.panels.forEach(function (p, i) {
        def.panels[p.id] = {
            title: (p.title || '').trim(),
            description: (p.description || '').trim(),
            image: p.image || null,
            order: i
        };
    });
    var n = {};
    d.questions.forEach(function (q) {
        var c = n[q.panelId] || 0;
        n[q.panelId] = c + 1;
        def.questions[q.id] = {
            panelId: q.panelId,
            type: q.type,
            label: (q.label || '').trim(),
            required: !!q.required,
            options: (q.options || []).slice(),
            order: c
        };
    });
    return def;
};

/* ==== VALIDACIÓN (mensajes listos para el toast) ==== */
C.validateDraft = function () {
    var d = C.draft, errs = [];
    if (!d.meta.name || !d.meta.name.trim()) errs.push('Ponle un nombre al formulario.');
    else if (d.meta.name.trim().length > 120) errs.push('El nombre no puede pasar de 120 caracteres.');
    if ((d.meta.description || '').length > 2000) errs.push('La descripción no puede pasar de 2000 caracteres.');
    if (!d.panels.length) errs.push('Añade al menos una categoría (panel).');
    if (d.panels.length > 20) errs.push('Máximo 20 categorías por formulario.');
    if (!d.questions.length) errs.push('Añade al menos una pregunta.');
    if (d.questions.length > 60) errs.push('Máximo 60 preguntas por formulario.');
    d.panels.forEach(function (p, i) {
        if (!p.title || !p.title.trim()) errs.push('La categoría #' + (i + 1) + ' no tiene título.');
        else if (p.title.trim().length > 120) errs.push('El título de "' + p.title.trim() + '" no puede pasar de 120 caracteres.');
    });
    d.questions.forEach(function (q) {
        var t = C.typeOf ? C.typeOf(q.type) : null;
        var label = (q.label || '').trim();
        if (!label) { errs.push('Hay una pregunta sin texto.'); return; }
        if (label.length > 500) errs.push('La pregunta "' + label + '" no puede pasar de 500 caracteres.');
        if (!t) errs.push('La pregunta "' + label + '" tiene un tipo inválido.');
        if (t && t.options) {
            var opts = (q.options || []).filter(function (o) { return o && String(o).trim(); });
            if (opts.length < 2) errs.push('La pregunta "' + label + '" necesita al menos 2 opciones.');
            if ((q.options || []).length > 30) errs.push('La pregunta "' + label + '" no puede pasar de 30 opciones.');
        }
    });
    return { ok: errs.length === 0, errors: errs };
};

/* ==== RENDER · la columna de categorías (con sus preguntas dentro) ==== */
C.panels.render = function (container) {
    C.panels.renderInto = container;
    container.textContent = '';
    var d = C.draft;

    d.panels.forEach(function (p, i) {
        var card = document.createElement('div');
        card.className = 'fmc-panel';

        /* cabecera de la categoría */
        var head = document.createElement('div');
        head.className = 'fmc-panel-head';
        var idx = core.el('span', '', String(i + 1));
        idx.className = 'fmc-panel-idx';
        var main = core.el('div', 'min-width:0;flex:1');
        var t = core.el('div', '', p.title || '(sin título)');
        t.className = 'fmc-panel-title';
        main.appendChild(t);
        if (p.description) {
            var ds = core.el('div', '', p.description);
            ds.className = 'fmc-panel-desc';
            main.appendChild(ds);
        }
        head.appendChild(idx);
        head.appendChild(main);
        if (p.image) {
            var th = document.createElement('img');
            th.src = p.image; th.className = 'fmc-panel-thumb'; th.alt = '';
            head.appendChild(th);
        }
        var tools = core.el('div', 'display:flex;gap:6px;flex:none');
        tools.appendChild(C.iconbtn('fa-arrow-up', 'Subir', function () { C.panels.move(p.id, 'up'); C.rerender(); }));
        tools.appendChild(C.iconbtn('fa-arrow-down', 'Bajar', function () { C.panels.move(p.id, 'down'); C.rerender(); }));
        tools.appendChild(C.iconbtn('fa-pen', 'Editar categoría', function () { if (C.panelEditor) C.panelEditor.open(p.id); }));
        tools.appendChild(C.iconbtn('fa-trash', 'Eliminar categoría', function () {
            C.ui.confirm('Eliminar categoría', 'Se borra "' + (p.title || 'sin título') + '" y TODAS sus preguntas. ¿Seguro?', function () {
                C.panels.remove(p.id);
                C.rerender();
            });
        }, true));
        head.appendChild(tools);
        card.appendChild(head);

        /* preguntas de esta categoría (las dibuja sub_panels.js) */
        var qwrap = document.createElement('div');
        qwrap.className = 'fmc-qwrap';
        if (C.questions && typeof C.questions.renderRows === 'function') C.questions.renderRows(p.id, qwrap);
        card.appendChild(qwrap);
        container.appendChild(card);
    });

    /* botón de añadir categoría */
    if (d.panels.length < 20) {
        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'fmc-add';
        var ai = document.createElement('i');
        ai.className = 'fa-solid fa-plus';
        add.appendChild(ai);
        add.appendChild(document.createTextNode(' Añadir categoría'));
        add.addEventListener('click', function () { if (C.panelEditor) C.panelEditor.open(null); });
        container.appendChild(add);
    } else {
        var max = core.el('div', 'text-align:center;font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);padding:6px', 'Máximo 20 categorías alcanzado');
        container.appendChild(max);
    }
};

/* ==== iconbtn · botón de icono reusado por TODOS los files del creador ==== */
C.iconbtn = function (icon, title, fn, danger) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fmc-iconbtn' + (danger ? ' fmc-del' : '');
    b.title = title || '';
    var i = document.createElement('i');
    i.className = 'fa-solid ' + icon;
    b.appendChild(i);
    b.addEventListener('click', fn);
    return b;
};

/* ==== RERENDER · refresca categorías + header (lo llaman todos los edits) ==== */
C.rerender = function () {
    if (C.panels.renderInto) C.panels.render(C.panels.renderInto);
    if (C.main && typeof C.main.refreshHead === 'function') C.main.refreshHead();
};

console.log('[Stevscon] create_form/panels.js listo (v1) — modelo del draft + categorías.');
})(window, document);