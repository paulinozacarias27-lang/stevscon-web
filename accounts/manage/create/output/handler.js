/**
 * ==== 
 * STEVSCON.COM - accounts/manage/create/output/handler.js
 * Bloque OUTPUT: campo de HANDLER (@usuario único).
 * Reglas normales: minúsculas, . y _, máximo 15, único en la web.
 * MODO OWNER (correo del Owner o username "StevsLoL"): handler LIBRE —
 * mayúsculas, números, sin mínimo/máximo y puede reclamar
 * reservados. Único requisito universal: no repetido en handlers/.
 * BLINDAJE: detecta el Modo Owner por sí mismo (owner.js → campos → DOM),
 * así no depende de la versión ni carga correcta de los otros files.
 * ==== 
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};
    SC.outputs = SC.outputs || [];

    const MAX = 15;
    const MIN = 3;
    const VALID_RE = /^[a-z._]+$/;
    const RESERVED = ['admin', 'owner', 'stevscon', 'stevslol', 'soporte', 'support', 'null', 'undefined'];

    let inputEl = null;
    let hintEl = null;
    let wrapEl = null;
    let checkTimer = null;
    let lastChecked = null;

    // Codifica el handler como llave de handlers/ (Firebase no
    // admite . # $ [ ] en llaves). El Owner puede usarlos: aquí
    // se codifican sin romper la base de datos.
    function handlerKey(handler) {
        return String(handler || '').toLowerCase().replace(/[.$#\[\]]/g, function (ch) {
            return ch === '.' ? ',' : { '#': '~a', '$': '~b', '[': '~c', ']': '~d' }[ch];
        });
    }
    SC.handlerKey = handlerKey;

    // ---- Detección BLINDADA del Modo Owner (3 capas) ----
    function norm(s) { return String(s || '').trim().toLowerCase(); }

    // Capa 2: lee el valor en vivo desde el registro OUTPUT compartido
    function outputValue(id) {
        try {
            const sc = window.StevsconCreate || {};
            const f = sc.output && typeof sc.output.get === 'function' ? sc.output.get(id) : null;
            return f && typeof f.getValue === 'function' ? norm(f.getValue()) : '';
        } catch (e) { return ''; }
    }

    // Capa 3: lee el valor directo del DOM (funciona incluso con files viejos)
    function domValue(elId) {
        try {
            const el = document.getElementById(elId);
            return el ? norm(el.value) : '';
        } catch (e) { return ''; }
    }

    function isOwnerMode() {
        // Capa 1: la autoridad es owner.js
        const R = window.StevsconRanks;
        if (R && typeof R.ownerMode === 'function') {
            try { if (R.ownerMode()) return true; } catch (e) { /* sigue a los fallbacks */ }
        }
        // Capas 2 y 3: identidad del Owner comprobada AQUÍ también.
        // (si owner.js existe usamos SU identidad; si no, la de respaldo)
        const ownerEmail = norm((R && R.OWNER && R.OWNER.email) || 'steven23hd@gmail.com');
        const ownerUser = norm((R && R.OWNER && R.OWNER.username) || 'StevsLoL');
        if (outputValue('account') === ownerEmail || domValue('create-account-email') === ownerEmail) return true;
        if (outputValue('username') === ownerUser || domValue('create-account-username') === ownerUser) return true;
        return false;
    }

    function modeHint() {
        return isOwnerMode()
            ? 'Modo Owner: handler libre (mayúsculas, números, símbolos). Solo debe ser único.'
            : 'Minúsculas, puntos y _ · máximo ' + MAX + ' caracteres.';
    }

    // Aplica las reglas del modo activo al input
    function applyMode() {
        if (!inputEl) return;
        if (isOwnerMode()) {
            inputEl.removeAttribute('maxlength');
            inputEl.placeholder = 'handler libre (Owner)';
        } else {
            inputEl.maxLength = MAX;
            inputEl.placeholder = 'tu_handler';
        }
    }

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
        inputEl.autocomplete = 'off';
        inputEl.autocapitalize = 'none';
        inputEl.spellcheck = false;

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

        applyMode();
        setState('', modeHint());
        return group;
    }

    function onInput() {
        const owner = isOwnerMode();

        if (!owner) {
            // Normalización estricta de siempre
            const clean = inputEl.value.toLowerCase().replace(/[^a-z._]/g, '').slice(0, MAX);
            if (clean !== inputEl.value) {
                inputEl.value = clean;
                setState('error', 'Solo minúsculas, puntos (.) y guiones bajos (_).');
                return;
            }
        } else {
            // Owner: libre, solo quitamos caracteres que rompen llaves
            const clean = inputEl.value.replace(/[#$\[\]]/g, '');
            if (clean !== inputEl.value) inputEl.value = clean;
        }

        const val = getValue();
        if (!val) {
            setState('', modeHint());
            return;
        }
        if (!owner && val.length < MIN) {
            setState('error', 'Muy corto: mínimo ' + MIN + ' caracteres.');
            return;
        }
        clearTimeout(checkTimer);
        checkTimer = setTimeout(checkAvailability, 450);
    }

    // Cerebro propio: consulta handlers/ en tiempo real
    // (única regla que aplica TAMBIÉN al Owner: el handler es único)
    function checkAvailability() {
        const val = getValue();
        if (!val) return;
        const owner = isOwnerMode();
        if (!owner && (!VALID_RE.test(val) || val.length < MIN)) return;
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.database) return;

        lastChecked = val;
        window.StevsconFirebase.database.ref('handlers/' + handlerKey(val)).once('value')
            .then(function (snap) {
                if (getValue() !== lastChecked) return;
                if (snap.exists()) setState('error', 'El handler @' + val + ' ya está en uso.');
                else setState('ok', '@' + val + ' está disponible.');
            })
            .catch(function () {
                // Sin bloqueo: acc_create.js vuelve a verificar al registrar
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
        const owner = isOwnerMode();
        const val = getValue();
        if (!val) return { ok: false, msg: 'Escribe tu handler (@).' };
        if (!owner && !VALID_RE.test(val)) return { ok: false, msg: 'Solo minúsculas, puntos (.) y guiones bajos (_).' };
        if (!owner && val.length < MIN) return { ok: false, msg: 'El handler debe tener al menos ' + MIN + ' caracteres.' };
        if (!owner && val.length > MAX) return { ok: false, msg: 'El handler no puede pasar de ' + MAX + ' caracteres.' };
        if (!owner && RESERVED.indexOf(val) !== -1) return { ok: false, msg: 'Ese handler está reservado. Prueba otro.' };
        return { ok: true, msg: '' };
    }

    function clear() {
        clearTimeout(checkTimer);
        lastChecked = null;
        if (inputEl) inputEl.value = '';
        applyMode();
        setState('', modeHint());
    }

    // Re-evaluación cuando entra/sale el Modo Owner
    function refresh() {
        applyMode();
        if (!inputEl) return;
        if (inputEl.value) onInput();
        else setState('', modeHint());
    }

    const FIELD = { id: 'handler', order: 3, render, getValue, validate, clear, refresh, checkAvailability };
    SC.outputs.push(FIELD);
})(window, document);