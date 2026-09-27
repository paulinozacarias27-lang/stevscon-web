/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/edit/description.js
 * PERFILES · EDIT · Descripción con límite de 215 caracteres y
 * contador visible "n/215". Guarda en users/{uid}/profile/description.
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.edit = SCp.edit || {};
    SCp.edit.fields = SCp.edit.fields || [];

    const MAX = 215;
    const BTN = 'margin-top:12px;padding:8px 16px;border-radius:9px;border:0;background:#7c3aed;color:#ffffff;font-family:Inter,sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;';

    let taEl = null;
    let counterEl = null;
    let statusEl = null;
    let saveBtn = null;
    let dirty = false;
    let busy = false;

    function setStatus(msg, isError, isOk) {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
        statusEl.style.color = isError ? '#f87171' : (isOk ? '#86efac' : '#8f7fc0');
    }

    function paintCounter() {
        if (!counterEl || !taEl) return;
        counterEl.textContent = taEl.value.length + '/' + MAX;
    }

    function enableSave() {
        if (!saveBtn) return;
        saveBtn.disabled = !dirty;
        saveBtn.style.opacity = dirty ? '1' : '.5';
    }

    function render(container) {
        const group = document.createElement('div');
        group.style.cssText = 'border:1px solid rgba(167,139,250,.25);border-radius:12px;padding:14px;background:rgba(139,92,246,.06);';

        const label = document.createElement('p');
        label.textContent = 'DESCRIPCIÓN';
        label.style.cssText = 'margin:0 0 10px;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#a78bfa;';
        group.appendChild(label);

        taEl = document.createElement('textarea');
        taEl.rows = 3;
        taEl.maxLength = MAX;
        taEl.placeholder = 'Cuéntale a Stevscon sobre ti...';
        taEl.value = (SCp.profile && SCp.profile.description) || '';
        taEl.style.cssText = 'width:100%;box-sizing:border-box;background:#120e1c;border:1px solid rgba(167,139,250,.35);border-radius:9px;padding:9px 11px;color:#ede9fe;font-family:Inter,sans-serif;font-size:13.5px;resize:vertical;line-height:1.5;';
        taEl.addEventListener('input', function () {
            paintCounter();
            dirty = taEl.value !== ((SCp.profile && SCp.profile.description) || '');
            setStatus('');
            enableSave();
        });
        group.appendChild(taEl);

        counterEl = document.createElement('p');
        counterEl.style.cssText = 'margin:4px 0 0;font-size:11.5px;color:#8f7fc0;text-align:right;font-variant-numeric:tabular-nums;';
        paintCounter();
        group.appendChild(counterEl);

        statusEl = document.createElement('p');
        statusEl.style.cssText = 'margin:8px 0 0;font-size:12px;color:#8f7fc0;';
        group.appendChild(statusEl);

        saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Guardar descripción';
        saveBtn.style.cssText = BTN;
        enableSave();
        saveBtn.addEventListener('click', function () {
            if (!dirty || busy) return;
            busy = true;
            saveBtn.textContent = 'Guardando...';
            SCp.saveField('description', taEl.value).then(function () {
                dirty = false; busy = false;
                saveBtn.textContent = 'Guardar descripción';
                enableSave();
                setStatus('Descripción actualizada.', false, true);
            }).catch(function (err) {
                busy = false;
                saveBtn.textContent = 'Guardar descripción';
                setStatus('No se pudo guardar. Detalle: ' + ((err && err.code) || 'error'), true, false);
            });
        });
        group.appendChild(saveBtn);

        container.appendChild(group);
    }

    SCp.edit.fields.push({ id: 'description', order: 4, render: render });
})(window, document);