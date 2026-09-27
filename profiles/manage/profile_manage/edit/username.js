/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/edit/username.js
 * PERFILES · EDIT · Nombre visible. El @handler NO se toca (único, fijo).
 * Guarda en users/{uid}/username con las mismas reglas de registro.
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.edit = SCp.edit || {};
    SCp.edit.fields = SCp.edit.fields || [];

    const BTN = 'margin-top:12px;padding:8px 16px;border-radius:9px;border:0;background:#7c3aed;color:#ffffff;font-family:Inter,sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;';
    const INPUT = 'width:100%;box-sizing:border-box;background:#120e1c;border:1px solid rgba(167,139,250,.35);border-radius:9px;padding:9px 11px;color:#ede9fe;font-family:Inter,sans-serif;font-size:13.5px;';

    let inputEl = null;
    let statusEl = null;
    let saveBtn = null;
    let dirty = false;
    let busy = false;

    function valid(v) {
        if (v.length < 2 || v.length > 32) return false;
        return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 _.-]+$/.test(v);
    }

    function setStatus(msg, isError, isOk) {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
        statusEl.style.color = isError ? '#f87171' : (isOk ? '#86efac' : '#8f7fc0');
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
        label.textContent = 'NOMBRE VISIBLE';
        label.style.cssText = 'margin:0 0 10px;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#a78bfa;';
        group.appendChild(label);

        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.className = 'field-input';
        inputEl.maxLength = 32;
        inputEl.value = (SCp.profile && SCp.profile.username) || '';
        inputEl.style.cssText = INPUT;
        inputEl.addEventListener('input', function () {
            dirty = inputEl.value.trim() !== ((SCp.profile && SCp.profile.username) || '');
            setStatus('');
            enableSave();
        });
        group.appendChild(inputEl);

        const hint = document.createElement('p');
        hint.textContent = 'Tu @handler único no se puede cambiar (por ahora).';
        hint.style.cssText = 'margin:6px 0 0;font-size:11.5px;color:#8f7fc0;';
        group.appendChild(hint);

        statusEl = document.createElement('p');
        statusEl.style.cssText = 'margin:10px 0 0;font-size:12px;color:#8f7fc0;';
        group.appendChild(statusEl);

        saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Guardar nombre';
        saveBtn.style.cssText = BTN;
        enableSave();
        saveBtn.addEventListener('click', function () {
            if (!dirty || busy) return;
            const v = inputEl.value.trim();
            if (!valid(v)) {
                setStatus('Nombre inválido: 2 a 32 caracteres (letras, números, espacios, _ . -).', true, false);
                return;
            }
            busy = true;
            saveBtn.textContent = 'Guardando...';
            SCp.saveUsername(v).then(function () {
                dirty = false; busy = false;
                saveBtn.textContent = 'Guardar nombre';
                enableSave();
                setStatus('Nombre actualizado.', false, true);
            }).catch(function (err) {
                busy = false;
                saveBtn.textContent = 'Guardar nombre';
                setStatus('No se pudo guardar. Detalle: ' + ((err && err.code) || 'error'), true, false);
            });
        });
        group.appendChild(saveBtn);

        container.appendChild(group);
    }

    SCp.edit.fields.push({ id: 'username', order: 3, render: render });
})(window, document);