/**
 * STEVSON.COM :: func_auth.js
 * Lógica pura de autenticación con Firebase Auth.
 * NO toca el DOM: eso lo hacen los ui_*.js
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsAuth !== 'undefined') { return; }

    function _fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }
    function _mem() {
        return (typeof window.AccountsMemory !== 'undefined') ? window.AccountsMemory : null;
    }
    function _err() {
        return (typeof window.AccountsErrors !== 'undefined') ? window.AccountsErrors : null;
    }

    var AccountsAuth = {

        /* ---------- REGISTRO ---------- */
        register: async function (email, password, handle, displayName) {
            var fb = _fb(), mem = _mem(), err = _err();
            if (!fb || !mem || !err) { throw new Error('FIREBASE_NOT_READY'); }

            var vEmail = err.validateEmail(email);
            if (!vEmail.ok) { throw new Error(vEmail.code); }

            var vPass = err.validatePassword(password);
            if (!vPass.ok) { throw new Error(vPass.code); }

            var vHandle = err.validateHandler(handle);
            if (!vHandle.ok) { throw new Error(vHandle.code); }

            var vName = err.validateDisplayName(displayName);
            if (!vName.ok) { throw new Error(vName.code); }

            /* Fail-fast: ¿handler libre? (evita crear cuentas huérfanas) */
            var available = await mem.isHandleAvailable(vHandle.value);
            if (!available) { throw new Error('HANDLE_TAKEN'); }

            /* Crear credencial en Firebase Auth */
            var cred = await fb.auth.createUserWithEmailAndPassword(vEmail.value, vPass.value);
            var user = cred.user;

            /* Perfil visible de Auth */
            try { await user.updateProfile({ displayName: vName.value }); } catch (e) { /* no crítico */ }

            /* Crear registro en /users/{uid} (aquí se guarda TODA cuenta nueva) */
            var record = await mem.ensureUserRecord(user, {
                handle: vHandle.value,
                displayName: vName.value
            });

            /* Correo de verificación (no bloquea el flujo) */
            try { await user.sendEmailVerification(); } catch (e2) { /* opcional */ }

            return { user: user, record: record };
        },

        /* ---------- LOGIN CON CORREO ---------- */
        login: async function (email, password) {
            var fb = _fb(), mem = _mem(), err = _err();
            if (!fb || !err) { throw new Error('FIREBASE_NOT_READY'); }

            var vEmail = err.validateEmail(email);
            if (!vEmail.ok) { throw new Error(vEmail.code); }
            if (!password) { throw new Error('FIELD_EMPTY'); }

            var cred = await fb.auth.signInWithEmailAndPassword(vEmail.value, String(password));

            /* Comprobación de estado de la cuenta */
            var record = await mem.getUserById(cred.user.uid);
            if (record && record.banned) {
                await fb.auth.signOut();
                throw new Error('ACCOUNT_BANNED');
            }
            return cred.user;
        },

        /* ---------- LOGIN CON GOOGLE ---------- */
        loginWithGoogle: async function () {
            var fb = _fb(), mem = _mem();
            if (!fb || !mem) { throw new Error('FIREBASE_NOT_READY'); }

            var provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            var cred = await fb.auth.signInWithPopup(provider);
            var user = cred.user;

            /* Crea el registro si es la primera vez (handle auto) */
            var record = await mem.ensureUserRecord(user, {
                displayName: user.displayName || ''
            });
            if (record && record.banned) {
                await fb.auth.signOut();
                throw new Error('ACCOUNT_BANNED');
            }
            return user;
        },

        /* ---------- RECUPERAR CONTRASEÑA ---------- */
        resetPassword: async function (email) {
            var fb = _fb(), err = _err();
            if (!fb || !err) { throw new Error('FIREBASE_NOT_READY'); }
            var vEmail = err.validateEmail(email);
            if (!vEmail.ok) { throw new Error(vEmail.code); }
            await fb.auth.sendPasswordResetEmail(vEmail.value);
            return true;
        },

        /* ---------- CERRAR SESIÓN ---------- */
        logout: async function () {
            var fb = _fb();
            if (!fb) { throw new Error('FIREBASE_NOT_READY'); }
            await fb.auth.signOut();
            return true;
        }
    };

    window.AccountsAuth = AccountsAuth;
    console.log('[Stevscon] func_auth.js listo.');

})(window);