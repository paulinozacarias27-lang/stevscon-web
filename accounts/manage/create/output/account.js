/**
 * ====
 * STEVSCON.COM - accounts/manage/create/output/account.js
 * Bloque OUTPUT: campo de CORREO ELECTRÓNICO.
 * Cerebro propio: verifica contra Firebase Auth si el correo ya existe.
 * RANGO: la identidad del Owner vive en owner.js. Si el username
 * es "StevsLoL", este correo DEBE ser el del Owner. Y a la inversa:
 * escribir el correo del Owner activa el Modo Owner al instante.
 * BLINDAJE: si owner.js no cargó, este file crea la jerarquía él solo.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    // ---- RESPALDO: si owner.js no cargó, creamos la jerarquía AQUÍ ----
    // owner.js sigue siendo la fuente oficial; esto solo evita que la web
    // se quede sin rangos si ese file falta, falla o cambia de ruta.
    (function bootstrapRanks() {
        if (window.StevsconRanks && typeof window.StevsconRanks.ownerMode === 'function') return;
        const R = window.StevsconRanks = window.StevsconRanks || {};
        R.OWNER = R.OWNER || { email: 'steven23hd@gmail.com', username: 'StevsLoL', rank: 'OWNER' };
        R.LEVELS = R.LEVELS || { OWNER: 100, ADMIN: 80, MOD: 50, USER: 10 };
        R.ADMIN_EMAILS = R.ADMIN_EMAILS || [];
        function norm(s) { return String(s || '').trim().toLowerCase(); }
        function fieldVal(id) {
            try {
                const sc = window.StevsconCreate || {};
                const f = sc.output && typeof sc.output.get === 'function' ? sc.output.get(id) : null;
                return f && typeof f.getValue === 'function' ? f.getValue() : '';
            } catch (e) { return ''; }
        }
        R.isOwnerUsername = R.isOwnerUsername || function (u) { return norm(u) === norm(R.OWNER.username); };
        R.isOwnerEmail = R.isOwnerEmail || function (e) { return norm(e) === norm(R.OWNER.email); };
        R.ownerMode = R.ownerMode || function () {
            return R.isOwnerUsername(fieldVal('username')) || R.isOwnerEmail(fieldVal('account'));
        };
        R.rankForEmail = R.rankForEmail || function (email) {
            if (R.isOwnerEmail(email)) return 'OWNER';
            return (R.ADMIN_EMAILS.map(norm).indexOf(norm(email)) !== -1) ? 'ADMIN' : 'USER';
        };
        R.getRank = R.getRank || R.rankForEmail;
        R.atLeast = R.atLeast || function (rank, email) {
            return (R.LEVELS[rank] || 0) <= (LEVELS(R.rankForEmail(email)));
            function LEVELS(x) { return R.LEVELS[x] || 0; }
        };
        R.refresh = R.refresh || function () {
            const sc = window.StevsconCreate || {};
            ['account', 'handler', 'password'].forEach(function (id) {
                const f = sc.output && sc.output.get ? sc.output.get(id) : null;
                if (f && typeof f.refresh === 'function') {
                    try { f.refresh(); } catch (e) { /* aún no renderizado */ }
                }
            });
        };
    })();

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

    function ranks() { return window.StevsconRanks || null; }

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
            notifyRankChange();
            return;
        }
        if (!EMAIL_RE.test(val)) {
            setState('error', 'Escribe un correo válido (ej: tucorreo@gmail.com).');
            notifyRankChange();
            return;
        }
        const R = ranks();
        if (R && typeof R.isOwnerEmail === 'function' && R.isOwnerEmail(val)) {
            setState('ok', 'Correo del Owner confirmado. Modo Owner activo.');
        } else {
            setState('ok', 'Formato correcto.');
        }
        notifyRankChange();
        clearTimeout(checkTimer);
        checkTimer = setTimeout(checkRegistered, 700);
    }

    // Avisa al sistema de rangos: el correo cambió y puede
    // activar/desactivar el Modo Owner en handler y password.
    function notifyRankChange() {
        const R = ranks();
        if (R && typeof R.refresh === 'function') R.refresh();
    }

    // Valor actual del campo username (para la cerradura del nombre)
    function getUsernameValue() {
        const f = SC.output && SC.output.get ? SC.output.get('username') : null;
        return f && typeof f.getValue === 'function' ? f.getValue() : '';
    }

    // Cerebro propio: pregunta a Firebase Auth si el correo ya está registrado.
    function checkRegistered() {
        const val = getValue();
        if (!EMAIL_RE.test(val)) return;
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.auth) return;

        window.StevsconFirebase.auth.fetchSignInMethodsForEmail(val)
            .then(function (methods) {
                if (getValue() !== val) return;
                if (methods && methods.length > 0) {
                    setState('error', 'Este correo ya tiene una cuenta. Inicia sesión con él.');
                }
            })
            .catch(function () {
                // Protección anti-enumeración de Firebase: se ignora en silencio
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

        // RANGO: el nombre del Owner exige su correo oficial
        const R = ranks();
        if (R && typeof R.isOwnerUsername === 'function' && R.isOwnerUsername(getUsernameValue())
            && typeof R.isOwnerEmail === 'function' && !R.isOwnerEmail(val)) {
            return { ok: false, msg: 'El nombre "StevsLoL" pertenece al Owner de Stevscon.' };
        }
        return { ok: true, msg: '' };
    }

    function clear() {
        clearTimeout(checkTimer);
        if (inputEl) inputEl.value = '';
        setState('', 'Esta será tu cuenta para iniciar sesión.');
    }

    // Re-evaluación cuando entra/sale el Modo Owner
    function refresh() {
        if (!inputEl) return;
        const val = getValue();
        if (!val) { setState('', 'Esta será tu cuenta para iniciar sesión.'); return; }
        const r = validate();
        if (!r.ok) setState('error', r.msg);
        else setState('ok', 'Formato correcto.');
    }

    const FIELD = { id: 'account', order: 1, render, getValue, validate, clear, refresh };
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
            // RANGO: al escribir username O correo, refresca handler/password/account
            // por si el Modo Owner entra o sale en vivo.
            if (!container.dataset.rankHook) {
                container.dataset.rankHook = '1';
                container.addEventListener('input', function (e) {
                    const R = window.StevsconRanks;
                    if (!R || typeof R.refresh !== 'function') return;
                    const group = e.target && e.target.closest ? e.target.closest('.form-group') : null;
                    const field = group && group.dataset ? group.dataset.field : null;
                    if (field === 'username' || field === 'account') R.refresh();
                });
            }
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