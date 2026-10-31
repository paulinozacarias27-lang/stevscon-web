/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/sub_panels.js (v1)
 * EL CREADOR · 2/7 — SUB-PANELES: LAS PREGUNTAS del formulario.
 *
 *  - C.TYPES: los 9 tipos de pregunta (texto corto, párrafo, opción
 *    múltiple, casillas, desplegable, número, fecha, imagen 20MB, URL).
 *  - C.questions: CRUD de preguntas — add/update/remove/move/get/byPanel.
 *    El orden es DENTRO de su categoría: mover sube/baja solo entre las
 *    preguntas de la misma categoría.
 *  - C.questions.renderRows(): dibuja las filas de preguntas dentro de la
 *    tarjeta de su categoría (la llama panels.js).
 *  - C.typeOf(typeId): busca un tipo (lo usa la validación).
 *  - Sin Firebase: TODO es sobre el draft en memoria.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var C = FM.creator = FM.creator || {};
var core = FM.core;

/* ==== LOS 9 TIPOS ==== */
C.TYPES = [
    { id: 'text',      label: 'Texto corto',       icon: 'fa-font' },
    { id: 'paragraph', label: 'Párrafo',           icon: 'fa-align-left' },
    { id: 'multiple',  label: 'Opción múltiple',   icon: 'fa-circle-dot',    options: true },
    { id: 'checkbox',  label: 'Casillas (varias)', icon: 'fa-square-check',  options: true },
    { id: 'dropdown',  label: 'Desplegable',       icon: 'fa-chevron-down',  options: true },
    { id: 'number',    label: 'Número',            icon: 'fa-hashtag' },
    { id: 'date',      label: 'Fecha',             icon: 'fa-calendar' },
    { id: 'image',     label: 'Imagen (20MB)',     icon: 'fa-image' },
    { id: 'url',       label: 'Enlace / URL',      icon: 'fa-link' }
];
C.typeOf = function (id) {
    for (var i = 0; i < C.TYPES.length; i++) if (C.TYPES[i].id === id) return C.TYPES[i];
    return null;
};

function touch() { C.draft.dirty = true; }

/* ==== PREGUNTAS ==== */
C.questions = {
    add: function (panelId, data) {
        var q = {
            id: C.nid('q'),
            panelId: panelId,
            type: (data && data.type) || 'text',
            label: (data && data.label) || '',
            required: !!(data && data.required),
            options: (data && data.options) ? data.options.slice() : []
        };
        C.draft.questions.push(q);
        touch();
        return q;
    },
    update: function (id, patch) {
        var q = this.get(id);
        if (!q) return;
        if (patch.type != null) q.type = patch.type;
        if (patch.label != null) q.label = patch.label;
        if (patch.required !== undefined) q.required = !!patch.required;
        if (patch.options !== undefined) q.options = patch.options.slice();
        touch();
    },
    remove: function (id) {
        C.draft.questions = C.draft.questions.filter(function (q) { return q.id !== id; });
        touch();
    },
    get: function (id) {
        var a = C.draft.questions;
        for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
        return null;
    },
    byPanel: function (panelId) {
        return C.draft.questions.filter(function (q) { return q.panelId === panelId; });
    },
    count: function () { return C.draft.questions.length; },
    move: function (id, dir) {
        var q = this.get(id);
        if (!q) return;
        var same = this.byPanel(q.panelId);
        var i = -1;
        for (var k = 0; k < same.length; k++) if (same[k].id === id) { i = k; break; }
        var j = i + (dir === 'up' ? -1 : 1);
        if (i === -1 || j < 0 || j >= same.length) return;
        var flat = C.draft.questions;
        var a = flat.indexOf(same[i]), b = flat.indexOf(same[j]);
        if (a === -1 || b === -1) return;
        var tmp = flat[a]; flat[a] = flat[b]; flat[b] = tmp;
        touch();
    }
};

/* ==== FILAS DE PREGUNTAS (dentro de la tarjeta de su categoría) ==== */
C.questions.renderRows = function (panelId, container) {
    var qs = this.byPanel(panelId);
    container.textContent = '';

    qs.forEach(function (q) {
        var t = C.typeOf(q.type) || { icon: 'fa-question', label: q.type };
        var row = document.createElement('div');
        row.className = 'fmc-qrow';

        var ico = document.createElement('span');
        ico.className = 'fmc-q-ico';
        var ii = document.createElement('i');
        ii.className = 'fa-solid ' + t.icon;
        ico.appendChild(ii);
        row.appendChild(ico);

        var main = core.el('div', 'min-width:0;flex:1');
        var lab = core.el('div', '', q.label || '(sin texto)');
        lab.className = 'fmc-q-label';
        if (q.required) {
            var req = core.el('span', '', ' *');
            req.className = 'fmc-req';
            lab.appendChild(req);
        }
        var meta = core.el('div', '', t.label + (q.required ? ' · obligatoria' : ' · opcional'));
        meta.className = 'fmc-q-meta';
        main.appendChild(lab);
        main.appendChild(meta);
        row.appendChild(main);

        var tools = core.el('div', 'display:flex;gap:6px;flex:none');
        tools.appendChild(C.iconbtn('fa-arrow-up', 'Subir', function () { C.questions.move(q.id, 'up'); C.rerender(); }));
        tools.appendChild(C.iconbtn('fa-arrow-down', 'Bajar', function () { C.questions.move(q.id, 'down'); C.rerender(); }));
        tools.appendChild(C.iconbtn('fa-pen', 'Editar pregunta', function () { if (C.questionEditor) C.questionEditor.open(q.id, panelId); }));
        tools.appendChild(C.iconbtn('fa-trash', 'Eliminar pregunta', function () {
            C.ui.confirm('Eliminar pregunta', '¿Borrar "' + ((q.label || '').trim() || 'esta pregunta') + '"?', function () {
                C.questions.remove(q.id);
                C.rerender();
            });
        }, true));
        row.appendChild(tools);
        container.appendChild(row);
    });

    if (C.questions.count() < 60) {
        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'fmc-add';
        add.style.margin = '10px 13px 13px';
        add.style.width = 'calc(100% - 26px)';
        var ai = document.createElement('i');
        ai.className = 'fa-solid fa-plus';
        add.appendChild(ai);
        add.appendChild(document.createTextNode(' Añadir pregunta'));
        add.addEventListener('click', function () { if (C.questionEditor) C.questionEditor.open(null, panelId); });
        container.appendChild(add);
    }
};

console.log('[Stevscon] create_form/sub_panels.js listo (v1) — preguntas + 9 tipos.');
})(window, document);