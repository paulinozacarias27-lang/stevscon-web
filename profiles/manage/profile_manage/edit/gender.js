/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/edit/gender.js
 * PERFILES · EDIT · Género con LISTA FIJA de opciones.
 * Se muestra en el perfil abajo de todo (descripción, avatar, banner).
 * Guarda en users/{uid}/profile/gender.
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.edit = SCp.edit || {};
    SCp.edit.fields = SCp.edit.fields || [];

    const GENDERS = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'];
    const BTN = 'margin-top:12px;padding:8px 16px;border-radius:9px;border:0;background:#7c3aed;color:#ffffff;font-family:Inter,sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;';

    let chipsBox = null;
    let statusEl = null;
    let saveBtn = null;
    let pending = null;
    let dirty = false;
    let busy = false;

    function setStatus(msg, isError, isOk) {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
        statusEl.style.color = isError ? '#f87171' : (isOk ? '#86efac' : '#8f7fc0');
    }

    function paintChips() {
        if (!chipsBox) return;
        const current = dirty ? pending : ((SCp.profile && SCp.profile.gender) || '');
        while (chipsBox.firstChild) chipsBox.removeChild(chipsBox.firstChild);
        GENDERS.forEach(function (g) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = g;
            const selected = current === g;
            b.style.cssText = 'padding:7px 14px;border-radius:999px;cursor:pointer;font-family:Inter,sans-serif;font-size:12.5px;font-weight:700;' +
                (selected
                    ? 'background:#7c3aed;border:1px solid #7c3aed;color:#ffffff;'
                    : 'background:none;border:1px solid rgba(167,139,250,.5);color:#c4b5fd;');
            b.addEventListener('click', function () {
                pending = g;
                dirty = g !== ((SCp.profile && SCp.profile.gender) || '');
                paintChips();
                setStatus('');
                enableSave();
            });
            chipsBox.appendChild(b);
        });
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
        label.textContent = 'GÉNERO';
        label.style.cssText = 'margin:0 0 10px;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#a78bfa;';
        group.appendChild(label);

        chipsBox = document.createElement('div');
        chipsBox.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
        paintChips();
        group.appendChild(chipsBox);

        statusEl = document.createElement('p');
        statusEl.style.cssText = 'margin:10px 0 0;font-size:12px;color:#8f7fc0;';
        group.appendChild(statusEl);

        saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Guardar género';
        saveBtn.style.cssText = BTN;
        enableSave();
        saveBtn.addEventListener('click', function () {
            if (!dirty || busy) return;
            busy = true;
            saveBtn.textContent = 'Guardando...';
            SCp.saveField('gender', pending).then(function () {
                dirty = false; busy = false;
                saveBtn.textContent = 'Guardar género';
                paintChips(); enableSave();
                setStatus('Género actualizado.', false, true);
            }).catch(function (err) {
                busy = false;
                saveBtn.textContent = 'Guardar género';
                setStatus('No se pudo guardar. Detalle: ' + ((err && err.code) || 'error'), true, false);
            });
        });
        group.appendChild(saveBtn);

        container.appendChild(group);
    }

    SCp.edit.fields.push({ id: 'gender', order: 5, render: render });
})(window, document);