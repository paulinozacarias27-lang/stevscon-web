/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/create/buttons/acc_create.js
 * Botón CREATE: crea la cuenta completa.
 *
 * Flujo: validar todo → verificar anti-bot → crear usuario en
 * Firebase Auth → reservar ID numérico (16 dígitos, transacción)
 * → reservar handler (transacción) → escribir perfil en users/.
 * Si cualquier paso de base de datos falla, se borra el usuario
 * de Auth para que NUNCA queden cuentas a medias.
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    // Correo del Owner: se le asigna rango OWNER automáticamente.
    // (Más adelante el sistema de admin/owner gestionará esto solo.)
    const OWNER_EMAIL = 'steven23hd@gmail.com';

    const ID_LENGTH = 16;   // dígitos del ID estilo Discord
    const ID_MAX_TRIES = 5; // reintentos si un ID colisiona

    let btnEl = null;
    let labelEl = null;
    let spinnerEl = null;
    let busy = false;

    // ---------- Utilidades de generación/reserva ----------

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
            return current === null ? uid : undefined; // si está ocupado, aborta
        }).then(function (res) {
            if (res.committed) return id;
            if (tries >= ID_MAX_TRIES) throw new Error('id_exhausted');
            return reserveId(uid, tries + 1);
        });
    }

    // Reserva el handler en handlers/ vía transacción atómica
    function reserveHandler(handler, uid) {
        const db = getDatabase();
        const key = (typeof SC.handlerKey === 'function')
            ? SC.handlerKey(handler)
            : String(handler).toLowerCase().replace(/\./g, ',');
        return db.ref('handlers/' + key).transaction(function (current) {
            return current === null ? uid : undefined;
        }).then(function (res) {
            if (!res.committed) throw new Error('handler_taken');
            return key;
        });
    }

    // Limpieza total si algo falla a mitad del registro
    function cleanup(authUser, uid, reservedId, reservedHandlerKey) {
        const db = getDatabase();
        const tasks = [];
        if (uid && db) {
            tasks.push(db.ref('users/' + uid).remove().catch(function () {}));
            if (reservedId) tasks.push(db.ref('ids/' + reservedId).remove().catch(function () {}));
            if (reservedHandlerKey) tasks.push(db.ref('handlers/' + reservedHandlerKey).remove().catch(function () {}));
        }
        return Promise.all(tasks).then(function () {
            if (authUser && typeof authUser.delete === 'function') {
                return authUser.delete().catch(function () {});
            }
        });
    }

    // ---------- Render y estados del botón ----------

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

        // Estado inicial según el checkbox anti-bot
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

    // ---------- El registro completo ----------

    function submit() {
        if (busy) return;
        const errors = SC.buttons && SC.buttons.errors;
        if (!errors) return;
        errors.clear();

        // 1. Validar todos los campos OUTPUT
        const v = (typeof SC.output !== 'undefined' && typeof SC.output.validateAll === 'function')
            ? SC.output.validateAll() : { ok: false, firstError: 'Error interno: no hay formulario cargado.' };
        if (!v.ok) {
            errors.show(v.firstError);
            return;
        }

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

        setBusy(true, 'Creando tu cuenta...');

        // 4. Verificación rápida del handler (fail-fast antes de crear nada)
        const handlerKey = (typeof SC.handlerKey === 'function')
            ? SC.handlerKey(handler) : handler.toLowerCase().replace(/\./g, ',');

        db.ref('handlers/' + handlerKey).once('value')
            .then(function (snap) {
                if (snap.exists()) throw new Error('handler_taken');
                // 5. Crear usuario en Firebase Auth (queda autologgeado)
                return auth.createUserWithEmailAndPassword(email, password);
            })
            .then(function (cred) {
                const uid = cred.user.uid;
                // 6. Reservar ID numérico y handler, y escribir el perfil
                return reserveId(uid, 0).then(function (userId) {
                    return reserveHandler(handler, uid).then(function (hKey) {
                        const isOwner = email.toLowerCase() === OWNER_EMAIL;
                        const profile = {
                            userId: userId,
                            username: username,
                            handler: handler,
                            email: email,
                            rank: isOwner ? 'OWNER' : 'USER',
                            createdAt: window.firebase.database.ServerValue.TIMESTAMP
                        };
                        return db.ref('users/' + uid).set(profile).then(function () {
                            return { uid: uid, userId: userId, handlerKey: hKey, profile: profile };
                        });
                    });
                });
            })
            .then(function (done) {
                // 7. Éxito: correo de bienvenida (no bloquea la UI) + evento
                if (SC.mail && typeof SC.mail.sendWelcome === 'function') {
                    SC.mail.sendWelcome({
                        email: email,
                        username: username,
                        handler: handler,
                        userId: done.userId
                    });
                }
                setBusy(false, '¡Cuenta creada!');
                btnEl.classList.add('is-success');
                errors.success('¡Bienvenido a Stevscon, ' + username + '! Tu ID es ' + done.userId + '.');
                SC.emit('create:success', {
                    uid: done.uid,
                    userId: done.userId,
                    username: username,
                    handler: handler,
                    email: email,
                    rank: done.profile.rank
                });
            })
            .catch(function (err) {
                // 8. Errores: traducir, limpiar restos y volver al formulario
                const authUser = (err && err.user) ? err.user : null;
                const uid = authUser ? authUser.uid : null;

                if (err && err.message === 'handler_taken') {
                    if (authUser) cleanup(authUser, uid, null, null);
                    errors.show('El handler @' + handler + ' acaba de ser tomado. Prueba otro.');
                } else if (err && err.message === 'id_exhausted') {
                    if (authUser) cleanup(authUser, uid, null, null);
                    errors.show('No pudimos asignarte un ID. Inténtalo de nuevo.');
                } else if (err && err.code && err.code.indexOf('auth/') === 0) {
                    if (uid && authUser && authUser.metadata.createdAt === authUser.metadata.lastSignInTime) {
                        // Solo borramos si la cuenta se acaba de crear en este intento
                        cleanup(authUser, uid, null, null);
                    }
                    errors.show(SC.translateAuthError ? SC.translateAuthError(err.code) : 'No pudimos crear tu cuenta.');
                } else {
                    if (authUser) {
                        cleanup(authUser, uid, err && err.reservedId, err && err.handlerKey);
                    }
                    errors.show('No pudimos terminar tu registro. Inténtalo de nuevo.');
                }

                setBusy(false, 'Crear cuenta');
                console.error('[Stevscon Create] Error en el registro:', err);
            });
    }

    function reset() {
        setBusy(false, 'Crear cuenta');
        btnEl.classList.remove('is-success');
    }

    SC.buttons = SC.buttons || {};
    SC.buttons.create = { id: 'create', render, reset };
})(window, document);