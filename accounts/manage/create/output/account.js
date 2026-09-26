/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/output/account.js
 * Bloque OUTPUT: campo de CORREO ELECTRÓNICO.
 * Es el bloque blanco donde el usuario escribe su cuenta.
 * Cerebro propio: verifica contra Firebase Auth si el correo ya existe.
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    // Registro compartido de campos y utilidad anti-XSS (basada en textContent)
    SC.outputs = SC.outputs || [];
    if (typeof SC._escape !== 'function') {
        SC._escape = function (str) {
            const el = document.createElement('div');
            el.textContent = String(str == null ? '' : str);
            return el.innerHTML;
        };
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    let inputEl = null;
    let hintEl = null;
    let checkTimer = null;

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'account';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'create-account-email');
        label.textContent = 'Correo electrónico';

        inputEl = document.createElement('input');
        inputEl.type = 'email';
        inputEl.id = 'create-account-email';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'tucorreo@gmail.com';
        inputEl.autocomplete = 'email';
        inputEl.spellcheck = false;
        inputEl.maxLength = 254;

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', onInput);
        inputEl.addEventListener('blur', function () {
            const r = validate();
            if (!r.ok) setState('error', r.msg);
        });

        group.appendChild(label);
        group.appendChild(inputEl);
        group.appendChild(hintEl);
        return group;
    }

    function onInput() {
        const val = getValue();
        if (!val) {
            setState('', 'Esta será tu cuenta para iniciar sesión.');
            return;
        }
        if (!EMAIL_RE.test(val)) {
            setState('error', 'Escribe un correo válido (ej: tucorreo@gmail.com).');
            return;
        }
        setState('ok', 'Formato correcto.');
        clearTimeout(checkTimer);
        checkTimer = setTimeout(checkRegistered, 700);
    }

    // Cerebro propio: pregunta a Firebase Auth si el correo ya está registrado.
    // Es la mejor estimación: la decisión final la toma acc_create.js al registrar.
    function checkRegistered() {
        const val = getValue();
        if (!EMAIL_RE.test(val)) return;
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.auth) return;

        window.StevsconFirebase.auth.fetchSignInMethodsForEmail(val)
            .then(function (methods) {
                if (getValue() !== val) return; // el usuario siguió escribiendo
                if (methods && methods.length > 0) {
                    setState('error', 'Este correo ya tiene una cuenta. Inicia sesión con él.');
                }
            })
            .catch(function () {
                // Si la protección anti-enumeración de Firebase bloquea la consulta,
                // se ignora en silencio: no es un error del usuario.
            });
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

    function validate() {
        const val = getValue();
        if (!val) return { ok: false, msg: 'Escribe tu correo electrónico.' };
        if (!EMAIL_RE.test(val)) return { ok: false, msg: 'El correo no tiene un formato válido.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        clearTimeout(checkTimer);
        if (inputEl) inputEl.value = '';
        setState('', 'Esta será tu cuenta para iniciar sesión.');
    }

    const FIELD = { id: 'account', order: 1, render, getValue, validate, clear };
    SC.outputs.push(FIELD);

    // ---- Orquestador compartido (lo define el primer file cargado) ----
    if (typeof SC.output !== 'object') SC.output = {};

    if (typeof SC.output.renderAll !== 'function') {
        SC.output.renderAll = function (container) {
            while (container.firstChild) container.removeChild(container.firstChild);
            const fields = SC.outputs.slice().sort(function (a, b) { return a.order - b.order; });
            fields.forEach(function (f) {
                try { container.appendChild(f.render()); }
                catch (e) { console.error('[Stevscon Create] Error renderizando campo:', f.id, e); }
            });
            return fields;
        };
    }
    if (typeof SC.output.get !== 'function') {
        SC.output.get = function (id) {
            return SC.outputs.find(function (f) { return f.id === id; }) || null;
        };
    }
    if (typeof SC.output.values !== 'function') {
        SC.output.values = function () {
            const out = {};
            SC.outputs.forEach(function (f) {
                out[f.id] = typeof f.getValue === 'function' ? f.getValue() : '';
            });
            return out;
        };
    }
    if (typeof SC.output.validateAll !== 'function') {
        SC.output.validateAll = function () {
            const result = { ok: true, firstError: '', errors: {} };
            SC.outputs.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (f) {
                if (typeof f.validate !== 'function') return;
                const r = f.validate();
                result.errors[f.id] = r;
                if (!r.ok && result.ok) {
                    result.ok = false;
                    result.firstError = r.msg || 'Revisa el campo ' + f.id + '.';
                }
            });
            return result;
        };
    }
    if (typeof SC.output.resetAll !== 'function') {
        SC.output.resetAll = function () {
            SC.outputs.forEach(function (f) {
                if (typeof f.clear === 'function') f.clear();
            });
        };
    }
})(window, document);