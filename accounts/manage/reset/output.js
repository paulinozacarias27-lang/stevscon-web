/**
 * ====
 * STEVSCON.COM - accounts/manage/reset/output.js
 * RESET · Campo de CORREO + orquestador propio (SC.reset.fields).
 * Registro separado del de ACCESS y del de CREATE para no
 * mezclarnos. Un solo campo: el correo de la cuenta.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.reset = SC.reset || {};
    SC.reset.fields = SC.reset.fields || [];

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    let inputEl = null;
    let hintEl = null;

    const EMPTY_HINT = 'Escribe el correo de tu cuenta y te enviaremos un enlace.';

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'reset-email';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'reset-email-input');
        label.textContent = 'Correo de tu cuenta';

        inputEl = document.createElement('input');
        inputEl.type = 'email';
        inputEl.id = 'reset-email-input';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'tucorreo@gmail.com';
        inputEl.autocomplete = 'username';
        inputEl.autocapitalize = 'none';
        inputEl.spellcheck = false;
        inputEl.maxLength = 254;

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', function () { setState('', EMPTY_HINT); });

        group.appendChild(label);
        group.appendChild(inputEl);
        group.appendChild(hintEl);
        return group;
    }

    function setState(kind, msg) {
        if (!inputEl || !hintEl) return;
        inputEl.classList.toggle('is-invalid', kind === 'error');
        inputEl.classList.toggle('is-valid', kind === 'ok');
        hintEl.className = 'field-hint' + (kind === 'error' ? ' hint-error' : kind === 'ok' ? ' hint-ok' : '');
        hintEl.textContent = msg || '';
    }

    function getValue() {
        return inputEl ? inputEl.value.trim() : '';
    }

    function setValue(v) {
        if (inputEl && v) inputEl.value = String(v).trim();
    }

    function validate() {
        const val = getValue();
        if (!val) return { ok: false, msg: 'Escribe el correo de tu cuenta.' };
        if (!EMAIL_RE.test(val)) return { ok: false, msg: 'El correo no tiene un formato válido.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        if (inputEl) inputEl.value = '';
        setState('', EMPTY_HINT);
    }

    const FIELD = { id: 'reset-email', order: 1, render, getValue, setValue, validate, clear };
    SC.reset.fields.push(FIELD);

    // ---- Orquestador propio de RESET (mismo patrón que ACCESS) ----
    if (typeof SC.reset.get !== 'function') {
        SC.reset.get = function (id) {
            return SC.reset.fields.find(function (f) { return f.id === id; }) || null;
        };
    }
    if (typeof SC.reset.values !== 'function') {
        SC.reset.values = function () {
            const out = {};
            SC.reset.fields.forEach(function (f) {
                out[f.id] = typeof f.getValue === 'function' ? f.getValue() : '';
            });
            return out;
        };
    }
    if (typeof SC.reset.validateAll !== 'function') {
        SC.reset.validateAll = function () {
            const result = { ok: true, firstError: '', errors: {} };
            SC.reset.fields.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (f) {
                const r = f.validate();
                result.errors[f.id] = r;
                if (!r.ok && result.ok) { result.ok = false; result.firstError = r.msg; }
            });
            return result;
        };
    }
    if (typeof SC.reset.resetAll !== 'function') {
        SC.reset.resetAll = function () {
            SC.reset.fields.forEach(function (f) {
                if (typeof f.clear === 'function') f.clear();
            });
        };
    }
})(window, document);