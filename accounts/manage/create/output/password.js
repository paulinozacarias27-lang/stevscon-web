/**
 * ====
 * STEVSCON.COM - accounts/manage/create/output/password.js
 * Bloque OUTPUT: campo de CONTRASEÑA.
 * Regla normal: mínimo 8 caracteres.
 * MODO OWNER (username "StevsLoL"): contraseña libre — el único
 * piso es 6, el mínimo DURO del servidor de Firebase Auth.
 * NUNCA se guarda en la base de datos: Firebase la hashea.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.outputs = SC.outputs || [];

    const MIN = 8;
    const MIN_OWNER = 6; // piso absoluto de Firebase Auth
    const MAX = 128;

    let inputEl = null;
    let hintEl = null;
    let meterEl = null;
    let iconEl = null;

    function isOwnerMode() {
        const R = window.StevsconRanks;
        return Boolean(R && typeof R.ownerMode === 'function' && R.ownerMode());
    }

    function minRequired() {
        return isOwnerMode() ? MIN_OWNER : MIN;
    }

    function hintFor(emptyState) {
        if (isOwnerMode()) return 'Modo Owner: contraseña libre (mínimo ' + MIN_OWNER + ', límite de Firebase).';
        return emptyState || ('Mínimo ' + MIN + ' caracteres. Usa mayúsculas y números para más seguridad.');
    }

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'password';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'create-account-password');
        label.textContent = 'Contraseña';

        const wrap = document.createElement('div');
        wrap.className = 'password-wrap';

        inputEl = document.createElement('input');
        inputEl.type = 'password';
        inputEl.id = 'create-account-password';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'Mínimo ' + MIN + ' caracteres';
        inputEl.autocomplete = 'new-password';
        inputEl.maxLength = MAX;

        const eyeBtn = document.createElement('button');
        eyeBtn.type = 'button';
        eyeBtn.className = 'field-eye';
        eyeBtn.setAttribute('aria-label', 'Mostrar contraseña');

        iconEl = document.createElement('i');
        iconEl.className = 'fa-solid fa-eye';
        eyeBtn.appendChild(iconEl);
        eyeBtn.addEventListener('click', toggleVisibility);

        wrap.appendChild(inputEl);
        wrap.appendChild(eyeBtn);

        // Medidor de fuerza (4 barras)
        meterEl = document.createElement('div');
        meterEl.className = 'strength-meter';
        for (let i = 0; i < 4; i++) {
            const bar = document.createElement('span');
            bar.className = 'strength-bar';
            meterEl.appendChild(bar);
        }

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', onInput);
        inputEl.addEventListener('blur', function () {
            const r = validate();
            if (!r.ok) setState('error', r.msg);
        });

        group.appendChild(label);
        group.appendChild(wrap);
        group.appendChild(meterEl);
        group.appendChild(hintEl);
        return group;
    }

    function toggleVisibility() {
        const show = inputEl.type === 'password';
        inputEl.type = show ? 'text' : 'password';
        iconEl.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        inputEl.closest('.password-wrap').querySelector('.field-eye')
            .setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    }

    function scorePassword(p) {
        if (!p) return 0;
        let s = 0;
        if (p.length >= MIN) s++;
        if (p.length >= 12) s++;
        if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
        if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
        return Math.max(1, Math.min(s, 4));
    }

    function onInput() {
        const val = inputEl.value;
        const min = minRequired();
        if (!val) {
            meterEl.className = 'strength-meter';
            setState('', hintFor());
            return;
        }
        const lvl = scorePassword(val);
        meterEl.className = 'strength-meter level-' + lvl;
        if (val.length < min) {
            setState('error', 'Te faltan ' + (min - val.length) + ' caracteres.');
        } else {
            const labels = { 1: 'Débil', 2: 'Aceptable', 3: 'Buena', 4: 'Excelente' };
            setState('ok', 'Contraseña ' + (labels[lvl] || 'válida') + '.');
        }
    }

    function setState(kind, msg) {
        if (!inputEl || !hintEl) return;
        inputEl.classList.toggle('is-invalid', kind === 'error');
        inputEl.classList.toggle('is-valid', kind === 'ok');
        hintEl.className = 'field-hint' + (kind === 'error' ? ' hint-error' : kind === 'ok' ? ' hint-ok' : '');
        hintEl.textContent = msg || '';
    }

    function getValue() {
        return inputEl ? inputEl.value : '';
    }

    function validate() {
        const val = getValue();
        const min = minRequired();
        if (!val) return { ok: false, msg: 'Escribe tu contraseña.' };
        if (val.length < min) return { ok: false, msg: 'La contraseña debe tener al menos ' + min + ' caracteres.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        if (inputEl) inputEl.value = '';
        if (meterEl) meterEl.className = 'strength-meter';
        iconEl.className = 'fa-solid fa-eye';
        if (inputEl) inputEl.type = 'password';
        setState('', hintFor());
    }

    // Re-evaluación cuando entra/sale el Modo Owner
    function refresh() {
        if (!inputEl) return;
        if (inputEl.value) onInput();
        else setState('', hintFor());
    }

    const FIELD = { id: 'password', order: 4, render, getValue, validate, clear, refresh };
    SC.outputs.push(FIELD);
})(window, document);