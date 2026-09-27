/**
 * ====
 * STEVSCON.COM - accounts/manage/create/buttons/acc_create.js
 * Botón CREATE: crea la cuenta completa.  ·  v2 BLINDADO
 *
 * Flujo: validar → anti-bot → crear usuario en Firebase Auth
 * (queda autenticado) → verificar handler → reservar ID (transacción)
 * → reservar handler (transacción) → perfil en users/.
 * Si algo falla después de crear el usuario, se limpia TODO
 * (Auth + base de datos) y se muestra el detalle real del error.
 * El correo de bienvenida NUNCA puede bloquear el registro.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const ID_LENGTH = 16;
    const ID_MAX_TRIES = 5;

    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;

    // Rastreo de lo reservado en este intento (para limpieza total)
    let currentAuthUser = null;
    let reservedId = null;
    let reservedHandlerKey = null;

    function generateId() {
        let id = String(Math.floor(Math.random() * 9) + 1); // primer dígito 1-9
        for (let i = 1; i < ID_LENGTH; i++) {
            id += String(Math.floor(Math.random() * 10));
        }
        return id;
    }

    function getDatabase() {
        return (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.database)
            ? window.StevsconFirebase.database : null;
    }

    // Reserva un ID numérico único en ids/ vía transacción atómica
    function reserveId(uid, tries) {
        const db = getDatabase();
        const id = generateId();
        return db.ref('ids/' + id).transaction(function (current) {
            return current === null ? uid : undefined;
        }).then(function (res) {
            if (res.committed) { reservedId = id; return id; }
            if (tries >= ID_MAX_TRIES) throw new Error('id_exhausted');
            return reserveId(uid, tries + 1);
        });
    }

    // Reserva el handler en handlers/ vía transacción atómica
    function reserveHandler(handler, uid) {
        const db = getDatabase();
        const key = (typeof SC.handlerKey === 'function')
            ? SC.handlerKey(handler)
            : String(handler).toLowerCase().replace(/[.$#\[\]]/g, function (ch) {
                return ch === '.' ? ',' : { '#': '~a', '$': '~b', '[': '~c', ']': '~d' }[ch];
            });
        return db.ref('handlers/' + key).transaction(function (current) {
            return current === null ? uid : undefined;
        }).then(function (res) {
            if (!res.committed) throw new Error('handler_taken');
            reservedHandlerKey = key;
            return key;
        });
    }

    // Limpieza total: base de datos + usuario de Auth recién creado
    function cleanup() {
        const db = getDatabase();
        const tasks = [];
        if (currentAuthUser && db) {
            tasks.push(db.ref('users/' + currentAuthUser.uid).remove().catch(function () {}));
            if (reservedId) tasks.push(db.ref('ids/' + reservedId).remove().catch(function () {}));
            if (reservedHandlerKey) tasks.push(db.ref('handlers/' + reservedHandlerKey).remove().catch(function () {}));
        }
        return Promise.all(tasks).then(function () {
            if (currentAuthUser && typeof currentAuthUser.delete === 'function') {
                return currentAuthUser.delete().catch(function () {});
            }
        }).then(function () {
            currentAuthUser = null;
            reservedId = null;
            reservedHandlerKey = null;
        });
    }

    // ---- Render y estados del botón ----

    function render() {
        btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.className = 'btn btn-primary btn-create';
        btnEl.addEventListener('click', submit);

        labelEl = document.createElement('span');
        labelEl.className = 'btn-create-label';
        labelEl.textContent = 'Crear cuenta';

        spinnerEl = document.createElement('span');
        spinnerEl.className = 'spinner hidden';

        btnEl.appendChild(spinnerEl);
        btnEl.appendChild(labelEl);

        btnEl.disabled = !isAllowChecked();
        if (typeof SC.on === 'function') {
            SC.on('allow:change', function (checked) {
                if (!busy && btnEl) btnEl.disabled = !checked;
            });
        }

        return btnEl;
    }

    function isAllowChecked() {
        return Boolean(SC.buttons && SC.buttons.allow && SC.buttons.allow.isChecked());
    }

    function setBusy(state, labelText) {
        busy = state;
        if (!btnEl) return;
        btnEl.disabled = state || !isAllowChecked();
        btnEl.classList.toggle('is-busy', state);
        spinnerEl.classList.toggle('hidden', !state);
        labelEl.textContent = labelText || 'Crear cuenta';
    }

    // ---- El registro completo ----

    function submit() {
        if (busy) return;
        const errors = SC.buttons && SC.buttons.errors;
        if (!errors) return;
        errors.clear();

        // 1. Validar todos los campos OUTPUT
        const v = (typeof SC.output !== 'undefined' && typeof SC.output.validateAll === 'function')
            ? SC.output.validateAll() : { ok: false, firstError: 'Error interno: no hay formulario cargado.' };
        if (!v.ok) { errors.show(v.firstError); return; }

        // 2. Verificar anti-bot
        if (!isAllowChecked()) {
            errors.show('Confirma que no eres un robot para continuar.');
            return;
        }

        // 3. Firebase disponible
        const db = getDatabase();
        const auth = (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase.auth : null;
        if (!db || !auth) {
            errors.show('Firebase no está disponible ahora mismo. Recarga la página.');
            return;
        }

        const values = (typeof SC.output.values === 'function') ? SC.output.values() : {};
        const email = values.account || '';
        const username = values.username || '';
        const handler = values.handler || '';
        const password = values.password || '';

        const handlerKey = (typeof SC.handlerKey === 'function')
            ? SC.handlerKey(handler) : handler.toLowerCase().replace(/\./g, ',');

        currentAuthUser = null;
        reservedId = null;
        reservedHandlerKey = null;

        setBusy(true, 'Creando tu cuenta...');

        // 4. Crear usuario en Auth (queda autenticado desde ya)
        auth.createUserWithEmailAndPassword(email, password)
            .then(function (cred) {
                currentAuthUser = cred.user;

                // 5. Ya autenticados: handler único y reserva del ID
                return db.ref('handlers/' + handlerKey).once('value').then(function (snap) {
                    if (snap.exists()) throw new Error('handler_taken');
                    return reserveId(currentAuthUser.uid, 0);
                }).then(function (userId) {
                    return reserveHandler(handler, currentAuthUser.uid).then(function (hKey) {
                        const isOwner = email.toLowerCase() === OWNER_EMAIL;
                        const profile = {
                            userId: userId,
                            username: username,
                            handler: handler,
                            email: email,
                            rank: isOwner ? 'OWNER' : 'USER',
                            createdAt: window.firebase.database.ServerValue.TIMESTAMP
                        };
                        return db.ref('users/' + currentAuthUser.uid).set(profile)
                            .then(function () {
                                return { userId: userId, handlerKey: hKey, profile: profile };
                            });
                    });
                });
            })
            .then(function (done) {
                // 6. Éxito: el correo de bienvenida va blindado — si falla, no importa
                try {
                    const mailResult = (SC.mail && typeof SC.mail.sendWelcome === 'function')
                        ? SC.mail.sendWelcome({
                            email: email, username: username,
                            handler: handler, userId: done.userId
                        }) : null;
                    if (mailResult && typeof mailResult.catch === 'function') {
                        mailResult.catch(function (e) {
                            console.warn('[Stevscon] El correo de bienvenida falló (tu cuenta SÍ fue creada):', e);
                        });
                    }
                } catch (mailErr) {
                    console.warn('[Stevscon] El correo de bienvenida falló (tu cuenta SÍ fue creada):', mailErr);
                }

                setBusy(false, '¡Cuenta creada!');
                btnEl.classList.add('is-success');
                errors.success('¡Bienvenido a Stevscon, ' + username + '! Tu ID es ' + done.userId + '.');
                SC.emit('create:success', {
                    uid: currentAuthUser.uid,
                    userId: done.userId,
                    username: username,
                    handler: handler,
                    email: email,
                    rank: done.profile.rank
                });
                currentAuthUser = null;
                reservedId = null;
                reservedHandlerKey = null;
            })
            .catch(function (err) {
                // 7. Error real en consola + detalle visible en pantalla
                console.error('[Stevscon Create] Error en el registro:', err);

                if (currentAuthUser) cleanup();

                if (err && err.message === 'handler_taken') {
                    errors.show('El handler @' + handler + ' acaba de ser tomado. Prueba otro.');
                } else if (err && err.message === 'id_exhausted') {
                    errors.show('No pudimos asignarte un ID. Inténtalo de nuevo.');
                } else if (err && err.code && err.code.indexOf('auth/') === 0) {
                    errors.show(SC.translateAuthError ? SC.translateAuthError(err.code) : 'No pudimos crear tu cuenta.');
                } else {
                    const detail = (err && (err.code || err.message)) ? String(err.code || err.message) : 'desconocido';
                    errors.show('No pudimos terminar tu registro. Detalle: ' + detail);
                }

                setBusy(false, 'Crear cuenta');
            });
    }

    function reset() {
        setBusy(false, 'Crear cuenta');
        btnEl.classList.remove('is-success');
    }

    SC.buttons = SC.buttons || {};
    SC.buttons.create = { id: 'create', render, reset };
})(window, document);