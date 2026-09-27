/**
 * ====
 * STEVSCON.COM - accounts/manage/access/output/access_password.js
 * ACCESS · Campo de CONTRASEÑA para iniciar sesión.
 * Sin reglas de creación (eso decide Firebase al validar):
 * aquí solo se exige que no venga vacía. Ojito para verla.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.access = SC.access || {};
    SC.access.fields = SC.access.fields || [];

    let inputEl = null;
    let hintEl = null;
    let iconEl = null;

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'access-password';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'access-password-input');
        label.textContent = 'Contraseña';

        const wrap = document.createElement('div');
        wrap.className = 'password-wrap';

        inputEl = document.createElement('input');
        inputEl.type = 'password';
        inputEl.id = 'access-password-input';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'Tu contraseña';
        inputEl.autocomplete = 'current-password';
        inputEl.maxLength = 128;

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

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', function () {
            if (inputEl.value) setState('ok', 'Lista. Presiona ENTRAR.');
            else setState('', 'Escribe tu contraseña para entrar.');
        });

        group.appendChild(label);
        group.appendChild(wrap);
        group.appendChild(hintEl);
        return group;
    }

    function toggleVisibility() {
        const show = inputEl.type === 'password';
        inputEl.type = show ? 'text' : 'password';
        iconEl.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        eyeBtnAria(show);
    }

    function eyeBtnAria(showing) {
        const btn = inputEl.closest('.password-wrap').querySelector('.field-eye');
        if (btn) btn.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
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
        if (!getValue()) return { ok: false, msg: 'Escribe tu contraseña.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        if (inputEl) inputEl.value = '';
        if (iconEl) iconEl.className = 'fa-solid fa-eye';
        if (inputEl) inputEl.type = 'password';
        setState('', 'Escribe tu contraseña para entrar.');
    }

    const FIELD = { id: 'access-password', order: 2, render, getValue, validate, clear };
    SC.access.fields.push(FIELD);
})(window, document);