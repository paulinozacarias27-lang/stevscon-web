/**
 * ====
 * STEVSCON.COM - accounts/manage/access/output/access_account.js
 * ACCESS · Campo identificador: CORREO o HANDLER (@usuario).
 * Usa su propio registro (SC.access.fields) para NO mezclarse
 * con los campos de CREATE. La resolución real ocurre en el botón.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.access = SC.access || {};
    SC.access.fields = SC.access.fields || [];

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    let inputEl = null;
    let hintEl = null;

    const EMPTY_HINT = 'Puedes entrar con tu correo o con tu @handler.';

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'access-id';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'access-identifier');
        label.textContent = 'Correo o handler';

        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = 'access-identifier';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'tucorreo@gmail.com o @tu_handler';
        inputEl.autocomplete = 'username';
        inputEl.autocapitalize = 'none';
        inputEl.spellcheck = false;
        inputEl.maxLength = 254;

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', function () { setState('', EMPTY_HINT); });
        inputEl.addEventListener('blur', function () {
            const r = validate();
            if (!r.ok) setState('error', r.msg);
            else setState('ok', 'Presiona ENTRAR o Enter para continuar.');
        });

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

    function isEmailValue() {
        return EMAIL_RE.test(getValue());
    }

    // Handler limpio (sin @, en minúsculas) o null si es correo
    function handlerValue() {
        if (isEmailValue()) return null;
        return getValue().replace(/^@/, '').toLowerCase();
    }

    function validate() {
        const val = getValue();
        if (!val) return { ok: false, msg: 'Escribe tu correo o tu @handler.' };
        if (isEmailValue()) return { ok: true, msg: '' };
        const h = handlerValue();
        if (!h || h.length < 2) return { ok: false, msg: 'Ese handler es muy corto.' };
        if (h.length > 32) return { ok: false, msg: 'Ese handler es muy largo.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        if (inputEl) inputEl.value = '';
        setState('', EMPTY_HINT);
    }

    const FIELD = { id: 'access-id', order: 1, render, getValue, validate, clear, isEmailValue, handlerValue };
    SC.access.fields.push(FIELD);

    // ---- Orquestador propio de ACCESS (independiente del de CREATE) ----
    if (typeof SC.access.get !== 'function') {
        SC.access.get = function (id) {
            return SC.access.fields.find(function (f) { return f.id === id; }) || null;
        };
    }
    if (typeof SC.access.values !== 'function') {
        SC.access.values = function () {
            const out = {};
            SC.access.fields.forEach(function (f) {
                out[f.id] = typeof f.getValue === 'function' ? f.getValue() : '';
            });
            return out;
        };
    }
    if (typeof SC.access.validateAll !== 'function') {
        SC.access.validateAll = function () {
            const result = { ok: true, firstError: '', errors: {} };
            SC.access.fields.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (f) {
                const r = f.validate();
                result.errors[f.id] = r;
                if (!r.ok && result.ok) { result.ok = false; result.firstError = r.msg; }
            });
            return result;
        };
    }
    if (typeof SC.access.resetAll !== 'function') {
        SC.access.resetAll = function () {
            SC.access.fields.forEach(function (f) {
                if (typeof f.clear === 'function') f.clear();
            });
        };
    }
})(window, document);