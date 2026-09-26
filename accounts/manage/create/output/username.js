/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/output/username.js
 * Bloque OUTPUT: campo de NOMBRE VISIBLE (username).
 * No es único y sí puede llevar mayúsculas; es el nombre que
 * se muestra en toda la web. Se puede cambiar a futuro.
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.outputs = SC.outputs || [];

    const MIN = 2;
    const MAX = 32;

    let inputEl = null;
    let hintEl = null;
    let counterEl = null;

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'username';

        const labelRow = document.createElement('div');
        labelRow.className = 'field-label-row';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'create-account-username');
        label.textContent = 'Nombre visible';

        counterEl = document.createElement('span');
        counterEl.className = 'field-counter';
        counterEl.textContent = '0/' + MAX;

        labelRow.appendChild(label);
        labelRow.appendChild(counterEl);

        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = 'create-account-username';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'Ej: StevsLoL';
        inputEl.autocomplete = 'nickname';
        inputEl.maxLength = MAX;

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', onInput);
        inputEl.addEventListener('blur', function () {
            const r = validate();
            if (!r.ok) setState('error', r.msg);
        });

        group.appendChild(labelRow);
        group.appendChild(inputEl);
        group.appendChild(hintEl);
        return group;
    }

    function onInput() {
        counterEl.textContent = inputEl.value.length + '/' + MAX;
        const val = getValue();
        if (!val) {
            setState('', 'Así te verán los demás en Stevscon.');
            return;
        }
        if (val.length < MIN) {
            setState('error', 'Muy corto: mínimo ' + MIN + ' caracteres.');
            return;
        }
        setState('ok', 'Perfecto, ¡hola ' + val + '!');
    }

    function setState(kind, msg) {
        if (!inputEl || !hintEl) return;
        inputEl.classList.toggle('is-invalid', kind === 'error');
        inputEl.classList.toggle('is-valid', kind === 'ok');
        hintEl.className = 'field-hint' + (kind === 'error' ? ' hint-error' : kind === 'ok' ? ' hint-ok' : '');
        hintEl.textContent = msg || '';
    }

    function getValue() {
        // Limpia espacios dobles y de los extremos
        return inputEl ? inputEl.value.replace(/\s+/g, ' ').trim() : '';
    }

    function validate() {
        const val = getValue();
        if (!val) return { ok: false, msg: 'Escribe tu nombre visible.' };
        if (val.length < MIN) return { ok: false, msg: 'El nombre debe tener al menos ' + MIN + ' caracteres.' };
        if (val.length > MAX) return { ok: false, msg: 'El nombre no puede pasar de ' + MAX + ' caracteres.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        if (inputEl) inputEl.value = '';
        if (counterEl) counterEl.textContent = '0/' + MAX;
        setState('', 'Así te verán los demás en Stevscon.');
    }

    const FIELD = { id: 'username', order: 2, render, getValue, validate, clear };
    SC.outputs.push(FIELD);
})(window, document);