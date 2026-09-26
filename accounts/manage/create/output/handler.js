/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/output/handler.js
 * Bloque OUTPUT: campo de HANDLER (@usuario único).
 * Reglas del sistema: solo minúsculas, puntos (.) y guiones bajos (_).
 * Máximo 15 caracteres. Único en toda la web.
 * Cerebro propio: verifica disponibilidad en vivo contra handlers/.
 *
 * NOTA: Realtime Database no admite "." en llaves, por eso
 * handlerKey() codifica el punto como coma al guardar/leer.
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.outputs = SC.outputs || [];

    const MAX = 15;
    const MIN = 3; // cámbialo aquí si quieres permitir handlers más cortos
    const VALID_RE = /^[a-z._]+$/;
    const RESERVED = ['admin', 'owner', 'stevscon', 'stevslol', 'soporte', 'support', 'null', 'undefined'];

    let inputEl = null;
    let hintEl = null;
    let wrapEl = null;
    let checkTimer = null;
    let lastChecked = null;

    // Codifica el handler para usarlo como llave en handlers/
    // (los puntos no se permiten como llave en Realtime Database)
    function handlerKey(handler) {
        return String(handler || '').toLowerCase().replace(/\./g, ',');
    }
    SC.handlerKey = handlerKey;

    function render() {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.dataset.field = 'handler';

        const label = document.createElement('label');
        label.className = 'field-label';
        label.setAttribute('for', 'create-account-handler');
        label.textContent = 'Handler';

        wrapEl = document.createElement('div');
        wrapEl.className = 'handler-wrap';

        const at = document.createElement('span');
        at.className = 'at-sign';
        at.textContent = '@';
        at.setAttribute('aria-hidden', 'true');

        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = 'create-account-handler';
        inputEl.className = 'field-input';
        inputEl.placeholder = 'tu_handler';
        inputEl.autocomplete = 'off';
        inputEl.autocapitalize = 'none';
        inputEl.spellcheck = false;
        inputEl.maxLength = MAX;

        hintEl = document.createElement('p');
        hintEl.className = 'field-hint';
        hintEl.setAttribute('aria-live', 'polite');

        inputEl.addEventListener('input', onInput);
        inputEl.addEventListener('blur', function () {
            const r = validate();
            if (!r.ok) setState('error', r.msg);
            else checkAvailability();
        });

        wrapEl.appendChild(at);
        wrapEl.appendChild(inputEl);

        group.appendChild(label);
        group.appendChild(wrapEl);
        group.appendChild(hintEl);
        return group;
    }

    function onInput() {
        // Normalización en vivo: minúsculas, solo a-z . y _, tope 15
        const clean = inputEl.value.toLowerCase().replace(/[^a-z._]/g, '').slice(0, MAX);
        if (clean !== inputEl.value) {
            inputEl.value = clean;
            setState('error', 'Solo minúsculas, puntos (.) y guiones bajos (_).');
            return;
        }

        const val = getValue();
        if (!val) {
            setState('', 'Minúsculas, puntos y _ · máximo ' + MAX + ' caracteres.');
            return;
        }
        if (val.length < MIN) {
            setState('error', 'Muy corto: mínimo ' + MIN + ' caracteres.');
            return;
        }
        clearTimeout(checkTimer);
        checkTimer = setTimeout(checkAvailability, 450);
    }

    // Cerebro propio: consulta el nodo handlers/ en tiempo real
    function checkAvailability() {
        const val = getValue();
        if (!VALID_RE.test(val) || val.length < MIN) return;
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.database) return;

        lastChecked = val;
        window.StevsconFirebase.database.ref('handlers/' + handlerKey(val)).once('value')
            .then(function (snap) {
                if (getValue() !== lastChecked) return; // siguió escribiendo
                if (snap.exists()) setState('error', 'El handler @' + val + ' ya está en uso.');
                else setState('ok', '@' + val + ' está disponible.');
            })
            .catch(function () {
                // Sin bloqueo: acc_create.js vuelve a verificar al momento de registrar
            });
    }

    function setState(kind, msg) {
        if (!inputEl || !hintEl || !wrapEl) return;
        inputEl.classList.toggle('is-invalid', kind === 'error');
        inputEl.classList.toggle('is-valid', kind === 'ok');
        wrapEl.classList.toggle('has-error', kind === 'error');
        wrapEl.classList.toggle('has-ok', kind === 'ok');
        hintEl.className = 'field-hint' + (kind === 'error' ? ' hint-error' : kind === 'ok' ? ' hint-ok' : '');
        hintEl.textContent = msg || '';
    }

    function getValue() {
        return inputEl ? inputEl.value.trim() : '';
    }

    function validate() {
        const val = getValue();
        if (!val) return { ok: false, msg: 'Escribe tu handler (@).' };
        if (!VALID_RE.test(val)) return { ok: false, msg: 'Solo minúsculas, puntos (.) y guiones bajos (_).' };
        if (val.length < MIN) return { ok: false, msg: 'El handler debe tener al menos ' + MIN + ' caracteres.' };
        if (val.length > MAX) return { ok: false, msg: 'El handler no puede pasar de ' + MAX + ' caracteres.' };
        if (RESERVED.indexOf(val) !== -1) return { ok: false, msg: 'Ese handler está reservado. Prueba otro.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        clearTimeout(checkTimer);
        lastChecked = null;
        if (inputEl) inputEl.value = '';
        setState('', 'Minúsculas, puntos y _ · máximo ' + MAX + ' caracteres.');
    }

    const FIELD = { id: 'handler', order: 3, render, getValue, validate, clear, checkAvailability };
    SC.outputs.push(FIELD);
})(window, document);