/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/editor_sub_panels.js (v1)
 * EL CREADOR · 4/7 — EL EDITOR DE PREGUNTAS (modal).
 *
 *  - C.questionEditor.open(questionId | null, panelId): null = crear
 *    pregunta nueva dentro de esa categoría.
 *  - Selector visual de los 9 tipos + texto de la pregunta + switch de
 *    obligatoria + editor de opciones (para múltiple/casillas/desplegable,
 *    una opción por línea).
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var C = FM.creator = FM.creator || {};
var core = FM.core;

C.questionEditor = {
    open: function (questionId, panelId) {
        var ui = C.ui;
        if (!ui) return;
        var isNew = !questionId;
        var q = isNew ? null : C.questions.get(questionId);
        if (!isNew && !q) return;
        if (!panelId) return;

        var type = q ? q.type : 'text';
        var req = q ? !!q.required : false;
        var lastOpts = q && q.options ? q.options.join('\n') : '';

        var m = ui.modal(isNew ? 'Nueva pregunta' : 'Editar pregunta', { icon: 'fa-circle-question' }, function (body, foot) {

            /* 1 · tipo de respuesta */
            var tWrap = document.createElement('div');
            tWrap.className = 'fmc-types';
            body.appendChild(ui.field('Tipo de respuesta', tWrap));
            var typeCards = {};
            C.TYPES.forEach(function (t) {
                var c = document.createElement('button');
                c.type = 'button';
                c.className = 'fmc-type' + (t.id === type ? ' fmc-type-on' : '');
                var i = document.createElement('i');
                i.className = 'fa-solid ' + t.icon;
                c.appendChild(i);
                c.appendChild(document.createTextNode(t.label));
                c.addEventListener('click', function () {
                    type = t.id;
                    Object.keys(typeCards).forEach(function (k) {
                        typeCards[k].classList.toggle('fmc-type-on', k === type);
                    });
                    drawOpts();
                });
                typeCards[t.id] = c;
                tWrap.appendChild(c);
            });

            /* 2 · texto de la pregunta */
            var inLabel = ui.input(q ? q.label : '', 'Ej: ¿Cuál es tu nombre de usuario en Discord?');
            body.appendChild(ui.field('Pregunta', inLabel, 'Máximo 500 caracteres.'));

            /* 3 · obligatoria */
            var sw = document.createElement('label');
            sw.className = 'fmc-switch';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = req;
            var track = document.createElement('span');
            track.className = 'fmc-track';
            sw.appendChild(cb);
            sw.appendChild(track);
            sw.appendChild(document.createTextNode(' Respuesta obligatoria'));
            cb.addEventListener('change', function () { req = cb.checked; });
            body.appendChild(ui.field('¿Obligatoria?', sw, 'Si es obligatoria, no se puede enviar sin responderla.'));

            /* 4 · opciones (solo tipos con opciones) */
            var optsBox = document.createElement('div');
            body.appendChild(optsBox);
            var inOpts = null;
            function drawOpts() {
                optsBox.textContent = '';
                inOpts = null;
                var t = C.typeOf(type);
                if (!t || !t.options) return;
                inOpts = ui.textarea(lastOpts, 'Una opción por línea…\nEj: Sí\nEj: No\nEj: Tal vez');
                inOpts.addEventListener('input', function () { lastOpts = inOpts.value; });
                optsBox.appendChild(ui.field('Opciones', inOpts, 'Mínimo 2 · máximo 30 · una por línea.'));
            }
            drawOpts();

            /* footer */
            foot.appendChild(ui.btn('Cancelar', 'ghost', function () { m.close(); }));
            foot.appendChild(ui.btn(isNew ? 'Añadir pregunta' : 'Guardar cambios', '', function () {
                var label = (inLabel.value || '').trim();
                if (!label) return core.toast('Escribe la pregunta.', 'error');
                if (label.length > 500) return core.toast('La pregunta no puede pasar de 500 caracteres.', 'error');
                var t = C.typeOf(type);
                if (!t) return core.toast('Elige un tipo de respuesta.', 'error');
                var opts = [];
                if (t.options) {
                    if (!inOpts) return core.toast('Editor de opciones no listo, abre de nuevo la pregunta.', 'error');
                    (inOpts.value || '').split('\n').forEach(function (line) {
                        var v = line.trim();
                        if (v) opts.push(v);
                    });
                    if (opts.length < 2) return core.toast('Este tipo necesita al menos 2 opciones (una por línea).', 'error');
                    if (opts.length > 30) return core.toast('Máximo 30 opciones.', 'error');
                }
                if (isNew) C.questions.add(panelId, { type: type, label: label, required: req, options: opts });
                else C.questions.update(q.id, { type: type, label: label, required: req, options: opts });
                m.close();
                C.rerender();
            }));
        });
    }
};

console.log('[Stevscon] create_form/editor_sub_panels.js listo (v1) — editor de preguntas.');
})(window, document);