/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/edit/avatar.js
 * PERFILES · EDIT · Avatar: presets morados O subida desde tu PC.
 * Guarda en users/{uid}/profile: avatarPreset (ID) o avatarUrl (Storage).
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.edit = SCp.edit || {};
    SCp.edit.fields = SCp.edit.fields || [];

    const BTN = 'margin-top:12px;padding:8px 16px;border-radius:9px;border:0;background:#7c3aed;color:#ffffff;font-family:Inter,sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;';

    let previewBox = null;
    let statusEl = null;
    let saveBtn = null;
    let swatches = null;
    let pendingPreset = null;
    let pendingUrl = null;
    let dirty = false;
    let busy = false;

    function currentData() {
        const p = SCp.profile || {};
        if (pendingUrl) return { avatarPreset: p.avatarPreset, avatarUrl: pendingUrl };
        if (pendingPreset) return { avatarPreset: pendingPreset, avatarUrl: '' };
        return p;
    }

    function setStatus(msg, isError, isOk) {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
        statusEl.style.color = isError ? '#f87171' : (isOk ? '#86efac' : '#8f7fc0');
    }

    function paintSwatches() {
        if (!swatches) return;
        const cur = currentData();
        while (swatches.firstChild) swatches.removeChild(swatches.firstChild);
        (SCp.presets.avatar || []).forEach(function (pr) {
            const b = document.createElement('button');
            b.type = 'button';
            b.title = 'Preset ' + pr.id;
            const selected = !cur.avatarUrl && cur.avatarPreset === pr.id;
            b.style.cssText = 'width:36px;height:36px;border-radius:50%;padding:0;cursor:pointer;background:' + pr.css + ';border:2px solid ' + (selected ? '#ffffff' : 'rgba(167,139,250,.4)') + ';';
            b.addEventListener('click', function () {
                pendingPreset = pr.id;
                pendingUrl = null;
                dirty = true;
                paintSwatches();
                paintPreview();
                setStatus('');
                enableSave();
            });
            swatches.appendChild(b);
        });
    }

    function paintPreview() {
        if (!previewBox) return;
        while (previewBox.firstChild) previewBox.removeChild(previewBox.firstChild);
        const letter = ((SCp.profile && SCp.profile.username) || 'S').charAt(0).toUpperCase();
        previewBox.appendChild(SCp.ui.avatarEl(currentData(), 64, letter));
    }

    function enableSave() {
        if (!saveBtn) return;
        saveBtn.disabled = !dirty;
        saveBtn.style.opacity = dirty ? '1' : '.5';
    }

    function uploadError(err) {
        const c = (err && (err.code || err.message)) || '';
        if (c === 'no-storage') return 'Falta Firebase Storage: agrégalo a memory_acc.js y habilita Storage en la consola.';
        if (c === 'tipo') return 'Ese archivo no es una imagen.';
        if (c === 'grande') return 'La imagen pesa demasiado (máximo 8 MB).';
        if (c === 'img') return 'No pudimos leer esa imagen.';
        return 'No se pudo subir la imagen. Detalle: ' + c;
    }

    function save() {
        if (pendingUrl) {
            return SCp.saveField('avatarUrl', pendingUrl).then(function () {
                return SCp.saveField('avatarPreset', null);
            });
        }
        return SCp.saveField('avatarPreset', pendingPreset).then(function () {
            return SCp.saveField('avatarUrl', null);
        });
    }

    function render(container) {
        const group = document.createElement('div');
        group.style.cssText = 'border:1px solid rgba(167,139,250,.25);border-radius:12px;padding:14px;background:rgba(139,92,246,.06);';

        const label = document.createElement('p');
        label.textContent = 'AVATAR';
        label.style.cssText = 'margin:0 0 10px;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#a78bfa;';
        group.appendChild(label);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;';

        previewBox = document.createElement('div');
        previewBox.style.cssText = 'flex:none;';
        paintPreview();
        row.appendChild(previewBox);

        const controls = document.createElement('div');
        controls.style.cssText = 'flex:1;min-width:180px;';

        swatches = document.createElement('div');
        swatches.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
        paintSwatches();
        controls.appendChild(swatches);

        const fileRow = document.createElement('div');
        fileRow.style.cssText = 'display:flex;gap:10px;align-items:center;margin-top:12px;';
        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.textContent = 'Subir imagen';
        upBtn.style.cssText = 'padding:7px 14px;border-radius:9px;border:1px solid rgba(167,139,250,.5);background:none;color:#c4b5fd;font-family:Inter,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        upBtn.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function () {
            const f = fileInput.files && fileInput.files[0];
            if (!f) return;
            setStatus('Subiendo imagen...', false, false);
            SCp.uploadImage(f, 'avatar').then(function (url) {
                pendingUrl = url;
                pendingPreset = null;
                dirty = true;
                paintPreview();
                paintSwatches();
                setStatus('');
                enableSave();
            }).catch(function (err) {
                setStatus(uploadError(err), true, false);
            });
        });
        fileRow.appendChild(upBtn);
        fileRow.appendChild(fileInput);
        controls.appendChild(fileRow);

        row.appendChild(controls);
        group.appendChild(row);

        statusEl = document.createElement('p');
        statusEl.style.cssText = 'margin:10px 0 0;font-size:12px;color:#8f7fc0;';
        group.appendChild(statusEl);

        saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Guardar avatar';
        saveBtn.style.cssText = BTN;
        enableSave();
        saveBtn.addEventListener('click', function () {
            if (!dirty || busy) return;
            busy = true;
            saveBtn.textContent = 'Guardando...';
            save().then(function () {
                dirty = false; busy = false;
                pendingPreset = null; pendingUrl = null;
                saveBtn.textContent = 'Guardar avatar';
                paintSwatches(); paintPreview(); enableSave();
                setStatus('Avatar actualizado.', false, true);
            }).catch(function (err) {
                busy = false;
                saveBtn.textContent = 'Guardar avatar';
                setStatus('No se pudo guardar. Detalle: ' + ((err && err.code) || 'error'), true, false);
            });
        });
        group.appendChild(saveBtn);

        container.appendChild(group);
    }

    SCp.edit.fields.push({ id: 'avatar', order: 2, render: render });
})(window, document);