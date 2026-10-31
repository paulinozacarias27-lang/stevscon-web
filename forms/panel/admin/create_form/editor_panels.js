/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_form/editor_panels.js (v1)
 * EL CREADOR · 3/7 — EL EDITOR DE CATEGORÍAS (modal).
 *
 *  - C.panelEditor.open(panelId | null): null = crear categoría nueva.
 *  - Campos: título, descripción e imagen opcional (base64, tope 20MB
 *    del core — gifs incluidos, videos no).
 *  - Al Guardar: crea/actualiza en el draft y refresca la columna.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var C = FM.creator = FM.creator || {};
var core = FM.core;

C.panelEditor = {
    open: function (panelId) {
        var ui = C.ui;
        if (!ui) return;
        var isNew = !panelId;
        var p = isNew ? null : C.panels.get(panelId);
        if (!isNew && !p) return;

        var img = p ? (p.image || null) : null;

        var m = ui.modal(isNew ? 'Nueva categoría' : 'Editar categoría', { icon: 'fa-layer-group' }, function (body, foot) {

            /* título */
            var inTitle = ui.input(p ? p.title : '', 'Ej: Sobre ti');
            body.appendChild(ui.field('Título de la categoría', inTitle, 'Máximo 120 caracteres.'));

            /* descripción */
            var inDesc = ui.textarea(p ? p.description : '', 'Descripción opcional de la categoría…');
            body.appendChild(ui.field('Descripción (opcional)', inDesc, 'Se muestra debajo del título.'));

            /* imagen opcional */
            var zone = document.createElement('div');
            zone.className = 'fmc-bzone';
            var zi = document.createElement('i');
            zi.className = 'fa-solid fa-image';
            zone.appendChild(zi);
            zone.appendChild(document.createTextNode(' Imagen opcional de la categoría (hasta ' + core.LIMITS.imgMB + 'MB)'));
            var prev = document.createElement('div');
            prev.className = 'fmc-bprev';
            prev.style.display = 'none';
            var fImg = ui.field('Imagen (opcional)', zone);
            var file = document.createElement('input');
            file.type = 'file';
            file.accept = 'image/*';
            file.style.display = 'none';
            fImg.appendChild(file);
            fImg.appendChild(prev);
            body.appendChild(fImg);

            function drawPrev() {
                prev.textContent = '';
                prev.style.display = img ? 'block' : 'none';
                if (!img) return;
                var im = document.createElement('img');
                im.src = img;
                im.alt = '';
                var rm = document.createElement('button');
                rm.type = 'button';
                rm.title = 'Quitar imagen';
                var rmi = document.createElement('i');
                rmi.className = 'fa-solid fa-trash';
                rm.appendChild(rmi);
                rm.addEventListener('click', function () { img = null; drawPrev(); });
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
                    img = b64;
                    drawPrev();
                });
            });
            drawPrev();

            /* footer */
            foot.appendChild(ui.btn('Cancelar', 'ghost', function () { m.close(); }));
            foot.appendChild(ui.btn(isNew ? 'Crear categoría' : 'Guardar cambios', '', function () {
                var t = (inTitle.value || '').trim();
                if (!t) return core.toast('La categoría necesita un título.', 'error');
                if (t.length > 120) return core.toast('El título no puede pasar de 120 caracteres.', 'error');
                if (isNew) C.panels.add({ title: t, description: (inDesc.value || '').trim(), image: img });
                else C.panels.update(p.id, { title: t, description: (inDesc.value || '').trim(), image: img });
                m.close();
                C.rerender();
            }));
        });
    }
};

console.log('[Stevscon] create_form/editor_panels.js listo (v1) — editor de categorías.');
})(window, document);