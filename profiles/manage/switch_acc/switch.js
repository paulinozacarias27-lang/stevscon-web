/**
 * ====
 * STEVSCON.COM - profiles/manage/switch_acc/switch.js
 * SWITCH · Motor de cambio de cuenta (Firebase Auth).
 * - Resuelve @handler → correo (handlers/ → ids/ → users/{uid}).
 * - Entra con email+password (Firebase reemplaza la sesión actual).
 * - Tras cambiar, recarga la página: TODOS los sistemas se reenganchean.
 * - Si la contraseña de una cuenta cambió, la saca de la lista y
 *   abre el acceso normal (como Discord cuando pierde la sesión).
 * Cargar DESPUÉS de store.js y ANTES de panel.js.
 * ====
 */
(function (window) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.switchAcc = SCp.switchAcc || {};

    function fb() { return window.StevsconFirebase || null; }
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function errEs(code) {
        switch (code) {
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'Contraseña incorrecta para esa cuenta.';
            case 'auth/user-not-found': return 'Esa cuenta ya no existe.';
            case 'auth/too-many-requests': return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
            case 'auth/network-request-failed': return 'Sin conexión con el servidor. Revisa tu internet.';
            case 'auth/invalid-email': return 'Ese correo no es válido.';
            default: return 'No se pudo completar el cambio de cuenta.';
        }
    }
    SCp.switchAcc.errEs = errEs;

    function readUser(uid) {
        const F = fb();
        if (!F || !F.database) return Promise.resolve({});
        return F.database.ref('users/' + uid).once('value').then(function (s) {
            return s.val() || {};
        }).catch(function () { return {}; });
    }

    function entryFrom(uid, email, pass, u) {
        const p = u.profile || {};
        return {
            uid: uid,
            email: email,
            pass: pass,
            username: u.username || '',
            handler: u.handler || '',
            rank: u.rank || 'USER',
            avatarPreset: p.avatarPreset || 'g1',
            avatarUrl: p.avatarUrl || '',
            savedAt: Date.now()
        };
    }

    // @handler → correo (mejor esfuerzo; si no se puede, pide el correo).
    SCp.switchAcc.resolveEmail = function (identifier) {
        const val = String(identifier || '').trim();
        if (EMAIL_RE.test(val)) return Promise.resolve(val.toLowerCase());
        const h = val.replace(/^@/, '').toLowerCase();
        const F = fb();
        if (!F || !F.database || h.length < 2) {
            return Promise.reject({ code: 'resolver', msg: 'Escribe el correo o un @handler válido.' });
        }
        function mailFromUser(uid) {
            return readUser(uid).then(function (u) {
                const mail = u.email || u.mail || u.correo ||
                             (u.profile && (u.profile.email || u.profile.mail)) || '';
                if (mail) return String(mail).toLowerCase();
                throw { code: 'resolver', msg: 'No encontré el correo de ese handler. Entra con el CORREO de la cuenta.' };
            });
        }
        return F.database.ref('handlers/' + h).once('value').then(function (s) {
            if (s.val()) return mailFromUser(s.val());
            return F.database.ref('ids/' + h).once('value').then(function (s2) {
                if (s2.val()) return mailFromUser(s2.val());
                throw { code: 'resolver', msg: 'No encontré ese handler. Prueba con el correo de la cuenta.' };
            });
        }).catch(function (e) {
            if (e && e.code === 'resolver') throw e;
            throw { code: 'resolver', msg: 'No pude resolver ese handler. Entra con el correo de la cuenta.' };
        });
    };

    // El corazón: entrar con una cuenta GUARDADA (1 clic).
    SCp.switchAcc.enter = function (entry) {
        const F = fb();
        if (!F || !F.auth) return Promise.reject({ code: 'no-fb', msg: 'Firebase no está listo.' });
        const pass = SCp.switchAcc.decode(entry);
        if (!pass) return Promise.reject({ code: 'roto', msg: 'Esta cuenta guardada se dañó. Añádela de nuevo.' });

        return F.auth.signInWithEmailAndPassword(entry.email, pass).then(function (cred) {
            // Refrescamos la ficha de la cuenta por si cambió algo.
            return readUser(cred.user.uid).then(function (u) {
                SCp.switchAcc.upsert(entryFrom(cred.user.uid, entry.email, pass, u));
            });
        }).then(function () {
            // Recarga total: header, perfiles, social y demás quedan limpios.
            try { window.location.reload(); } catch (e) {}
            return { reloaded: true };
        }).catch(function (e) {
            const code = e && e.code ? e.code : 'error';
            if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                // La contraseña cambió en otro lado: la ficha guardada ya no sirve.
                SCp.switchAcc.remove(entry.uid);
                const SC = window.StevsconCreate;
                if (SC && SC.access && typeof SC.access.open === 'function') {
                    try { SC.access.open(); } catch (err) {}
                }
            }
            if (code === 'auth/user-not-found') SCp.switchAcc.remove(entry.uid);
            throw { code: code, msg: errEs(code) };
        });
    };

    // Añadir cuenta desde el panel (identificador + contraseña).
    SCp.switchAcc.addAccount = function (identifier, password) {
        const val = String(identifier || '').trim();
        const pass = String(password || '');
        if (!val) return Promise.reject({ code: 'campo', msg: 'Escribe el correo o @handler de la cuenta.' });
        if (pass.length < 6) return Promise.reject({ code: 'campo', msg: 'Escribe la contraseña de esa cuenta.' });

        const F = fb();
        if (!F || !F.auth) return Promise.reject({ code: 'no-fb', msg: 'Firebase no está listo.' });
        const cur = F.auth.currentUser;

        return SCp.switchAcc.resolveEmail(val).then(function (email) {
            // ¿Es la cuenta ACTUAL? Solo se guarda, sin re-login ni recarga.
            if (cur && cur.email && cur.email.toLowerCase() === email.toLowerCase()) {
                return readUser(cur.uid).then(function (u) {
                    SCp.switchAcc.upsert(entryFrom(cur.uid, email, pass, u));
                    return { current: true };
                });
            }

            // Límite por rango (las cuentas ya guardadas no cuentan de nuevo).
            const list = SCp.switchAcc.list();
            const dup = list.some(function (a) {
                return a.email && a.email.toLowerCase() === email.toLowerCase();
            });
            const limite = SCp.switchAcc.limitFor();
            if (!dup && list.length >= limite) {
                throw { code: 'limite', msg: 'Llegaste a tu límite de ' + limite + ' cuentas guardadas (según tu rango). Quítala una para añadir otra.' };
            }

            return F.auth.signInWithEmailAndPassword(email, pass).then(function (cred) {
                return readUser(cred.user.uid).then(function (u) {
                    SCp.switchAcc.upsert(entryFrom(cred.user.uid, email, pass, u));
                    return { switched: !cur || cred.user.uid !== cur.uid };
                });
            });
        }).then(function (res) {
            if (res && res.switched) {
                try { window.location.reload(); } catch (e) {}
            }
            return res || {};
        }).catch(function (e) {
            if (e && e.msg) throw e;
            throw { code: (e && e.code) || 'error', msg: errEs((e && e.code) || 'error') };
        });
    };
})(window);