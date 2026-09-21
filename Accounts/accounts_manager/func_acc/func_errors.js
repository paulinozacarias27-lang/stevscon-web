/**
 * STEVSON.COM :: func_errors.js
 * Traducción de errores de Firebase a español + reglas de validación
 * (handler, correo, contraseña, palabras prohibidas).
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsErrors !== 'undefined') { return; }

    /* Palabras no permitidas en handlers/nombres (agrega más si quieres) */
    var FORBIDDEN_WORDS = [
        'admin', 'owner', 'root', 'staff', 'moderator', 'mod', 'system', 'sistema',
        'stevscon', 'stevslol', 'steven23hd', 'null', 'undefined', 'nazi',
        'puta', 'puto', 'mierda', 'pendejo', 'zorra', 'coño', 'verga', 'chinga',
        'fuck', 'shit', 'bitch', 'whore', 'nigger', 'faggot'
    ];

    var ERROR_MAP = {
        'auth/email-already-in-use': 'Ese correo ya está registrado en Stevscon.',
        'auth/invalid-email': 'El formato del correo no es válido.',
        'auth/weak-password': 'La contraseña es muy débil (mínimo 8 caracteres).',
        'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
        'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
        'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Google. Permite ventanas emergentes.',
        'auth/network-request-failed': 'Error de red. Revisa tu conexión.',
        'FIREBASE_NOT_READY': 'Firebase no está listo. Recarga la página.',
        'HANDLE_INVALID': 'El handler debe tener 3-20 caracteres (letras, números y _).',
        'HANDLE_RESERVED': 'Ese handler está reservado y no puede usarse.',
        'HANDLE_TAKEN': 'Ese handler ya está ocupado. Elige otro.',
        'NAME_INVALID': 'El nombre debe tener entre 2 y 25 caracteres.',
        'NAME_FORBIDDEN': 'Ese nombre contiene palabras no permitidas.',
        'PASSWORD_MISMATCH': 'Las contraseñas no coinciden.',
        'PASSWORD_INVALID': 'La contraseña necesita mínimo 8 caracteres, con al menos una letra y un número.',
        'EMAIL_INVALID': 'Escribe un correo electrónico válido.',
        'FIELD_EMPTY': 'Completa todos los campos.',
        'ACCOUNT_BANNED': 'Tu cuenta ha sido baneada de Stevscon.',
        'ACCOUNT_SUSPENDED': 'Tu cuenta está suspendida temporalmente.',
        'PERMISSION_DENIED': 'No tienes permisos para hacer eso.',
        'ONLY_OWNER': 'Solo el Owner puede hacer eso.'
    };

    var AccountsErrors = {
        FORBIDDEN_WORDS: FORBIDDEN_WORDS,

        /* Convierte cualquier error (Firebase o propio) a mensaje en español */
        translate: function (err) {
            if (!err) { return 'Ocurrió un error inesperado.'; }
            var code = err.code || err.message || String(err);
            if (ERROR_MAP[code]) { return ERROR_MAP[code]; }
            for (var key in ERROR_MAP) {
                if (Object.prototype.hasOwnProperty.call(ERROR_MAP, key) && code.indexOf(key) !== -1) {
                    return ERROR_MAP[key];
                }
            }
            return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
        },

        /* Handler: 3-20 chars, letras/números/_, sin prohibidos ni reservados */
        validateHandler: function (handle) {
            var clean = String(handle || '').trim();
            if (!clean) { return { ok: false, code: 'FIELD_EMPTY' }; }
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) { return { ok: false, code: 'HANDLE_INVALID' }; }
            var lower = clean.toLowerCase();
            for (var i = 0; i < FORBIDDEN_WORDS.length; i++) {
                if (lower.indexOf(FORBIDDEN_WORDS[i]) !== -1) { return { ok: false, code: 'HANDLE_RESERVED' }; }
            }
            if (typeof window.AccountsMemory !== 'undefined' &&
                window.AccountsMemory._reservedHandles.indexOf(lower) !== -1) {
                return { ok: false, code: 'HANDLE_RESERVED' };
            }
            return { ok: true, value: clean };
        },

        validateDisplayName: function (name) {
            var clean = String(name || '').trim();
            if (clean.length < 2 || clean.length > 25) { return { ok: false, code: 'NAME_INVALID' }; }
            var lower = clean.toLowerCase();
            for (var i = 0; i < FORBIDDEN_WORDS.length; i++) {
                if (lower.indexOf(FORBIDDEN_WORDS[i]) !== -1) { return { ok: false, code: 'NAME_FORBIDDEN' }; }
            }
            return { ok: true, value: clean };
        },

        validateEmail: function (email) {
            var clean = String(email || '').trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) { return { ok: false, code: 'EMAIL_INVALID' }; }
            return { ok: true, value: clean };
        },

        validatePassword: function (password) {
            var pass = String(password || '');
            if (pass.length < 8 || !/[a-zA-Z]/.test(pass) || !/[0-9]/.test(pass)) {
                return { ok: false, code: 'PASSWORD_INVALID' };
            }
            return { ok: true, value: pass };
        }
    };

    window.AccountsErrors = AccountsErrors;
    console.log('[Stevscon] func_errors.js listo.');

})(window);