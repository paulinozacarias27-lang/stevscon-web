/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/buttons/acc_allow.js
 * Botón ALLOW: checkbox "No soy un robot".
 * Obligatorio: sin marcarlo, el botón de crear cuenta
 * permanece deshabilitado. Emit 'allow:change' avisa al resto.
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    // ---- Mini bus de eventos compartido (lo define el primer file cargado) ----
    SC.listeners = SC.listeners || {};
    if (typeof SC.on !== 'function') {
        SC.on = function (evt, cb) {
            (SC.listeners[evt] = SC.listeners[evt] || []).push(cb);
        };
    }
    if (typeof SC.emit !== 'function') {
        SC.emit = function (evt, data) {
            (SC.listeners[evt] || []).forEach(function (cb) {
                try { cb(data); } catch (e) { console.error('[Stevscon Create] Error en listener de ' + evt + ':', e); }
            });
        };
    }

    let inputEl = null;

    function render() {
        const row = document.createElement('div');
        row.className = 'checkbox-row';
        row.dataset.field = 'allow';

        inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.id = 'create-account-allow';
        inputEl.className = 'checkbox-input';
        inputEl.addEventListener('change', function () {
            SC.emit('allow:change', inputEl.checked);
        });

        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.setAttribute('for', 'create-account-allow');
        label.textContent = 'No soy un robot';

        row.appendChild(inputEl);
        row.appendChild(label);
        return row;
    }

    function isChecked() {
        return Boolean(inputEl && inputEl.checked);
    }

    function reset() {
        if (inputEl) inputEl.checked = false;
        SC.emit('allow:change', false);
    }

    SC.buttons = SC.buttons || {};
    SC.buttons.allow = { id: 'allow', render, isChecked, reset };
})(window, document);