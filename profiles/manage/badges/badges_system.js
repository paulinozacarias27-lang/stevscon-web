/**
 * ====
 * STEVSCON.COM — profiles/manage/badges/badges_system.js (v4) · NUEVO
 * BADGES · EL CEREBRO: ÚNICA puerta hacia Firebase. Toda escritura de badges
 *   pasa por aquí (panel, consola, reglas automáticas futuras…).
 *  ARQUITECTURA (v4): core (cara) -> SYSTEM (cerebro) -> manage (panel).
 *  - MATRIZ DE PERMISOS (coincide con tus reglas de Firebase, cero
 *    PERMISSION_DENIED sorpresas):
 *        badge 'owner' → SOLO steven23hd@gmail.com
 *        badge 'admin' → Owner + Admins
 *        badge 'mod'   → Owner + Admins
 *        futuros badges (sin entrada en WHO) → Owner + Admins
 *        (un badge puede declarar `manageBy: ['owner','admin','mod']` en el
 *         catálogo de core para ampliar quién lo maneja)
 *    Mods ven el panel y el directorio, pero NO pueden otorgar/quitar.
 *  - LOG DE AUDITORÍA: cada grant/revoke guarda en
 *    social/badges_log/{uid}/{entryId} = { action, badge, by, byEmail, at }
 *    (best-effort: si aún no publicaste las reglas del log, los badges
 *    funcionan igual y solo se pierde el registro).
 *  - REGLAS AUTOMÁTICAS (preparado a futuro): SB.system.addRule(nombre, fn)
 *    registra una función que se ejecuta en cada SB.system.emit(evento, datos).
 *    Nada la llama todavía — es el gancho para cosas tipo "badge OG a los
 *    primeros 20 registros" cuando lo queramos.
 *  - API: SB.system = { who, canManage, roleCan, grant, revoke, has, list,
 *    logFor, addRule, emit }
 *    Ejemplo de consola: StevsconBadges.system.grant(uid, 'owner')
 * ====
 */
(function (window, document) {
    'use strict';

    const SB = window.StevsconBadges = window.StevsconBadges || {};
    if (SB._systemLoaded) return;
    SB._systemLoaded = true;

    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const NODE = 'social/badges';        /* social/badges/{uid}/{badgeId} = { by, at } */
    const NODE_LOG = 'social/badges_log'; /* social/badges_log/{uid}/{entryId} */

    /* ==== MATRIZ DE PERMISOS: roles que pueden manejar cada badge ==== */
    const WHO = {
        owner: ['owner'],
        admin: ['owner', 'admin'],
        mod:   ['owner', 'admin']
        /* badges futuros sin entrada aquí -> ['owner','admin'] */
    };

    let _who = null, _whoP = null;

    function db() { return firebase.database(); }

    /* ==== QUIÉN SOY (rol del actor): owner por email, staff por social/staff ==== */
    function who() {
        if (_who) return Promise.resolve(_who);
        const a = firebase.auth && firebase.auth().currentUser;
        if (!a) return Promise.resolve(null);
        if (String(a.email || '').toLowerCase() === OWNER_EMAIL) {
            _who = { uid: a.uid, email: a.email || '', role: 'owner' };
            return Promise.resolve(_who);
        }
        if (_whoP) return _whoP;
        _whoP = db().ref('social/staff/' + a.uid).once('value').then(function (s) {
            const v = s.val();
            const role = v ? (v.role || v) : null;
            _who = { uid: a.uid, email: a.email || '', role: (role === 'admin' || role === 'mod') ? role : 'user' };
            _whoP = null;
            return _who;
        }).catch(function () {
            _whoP = null;
            _who = { uid: a.uid, email: a.email || '', role: 'user' };
            return _who;
        });
        return _whoP;
    }

    function allowedRoles(badgeId) {
        const b = SB.CATALOG && SB.CATALOG[badgeId];
        return (b && b.manageBy) || WHO[badgeId] || ['owner', 'admin'];
    }
    function roleCan(role, badgeId) {
        return !!role && allowedRoles(badgeId).indexOf(role) !== -1;
    }
    function canManage(badgeId) {
        return who().then(function (w) {
            if (!w) return { ok: false, reason: 'No hay sesión iniciada.' };
            if (!SB.CATALOG || !SB.CATALOG[badgeId]) return { ok: false, reason: 'Badge desconocido: "' + badgeId + '".' };
            if (!roleCan(w.role, badgeId)) {
                return {
                    ok: false,
                    reason: (badgeId === 'owner' && w.role !== 'owner')
                        ? 'Solo el Owner (' + OWNER_EMAIL + ') puede manejar el badge Owner.'
                        : 'Solo Owner/Admins pueden manejar este badge.'
                };
            }
            return { ok: true };
        });
    }

    /* ==== LOG DE AUDITORÍA (best-effort: nunca rompe el grant/revoke) ==== */
    function log(uid, action, badgeId, w) {
        const entry = { action: action, badge: badgeId, by: (w && w.uid) || '', at: Date.now() };
        if (w && w.email) entry.byEmail = w.email;
        return db().ref(NODE_LOG + '/' + uid).push(entry).catch(function () { /* sin reglas de log aún */ });
    }

    /* ==== ÚNICA puerta de escritura ==== */
    function write(uid, badgeId, action) {
        if (!SB.CATALOG || !SB.CATALOG[badgeId]) {
            return Promise.reject(new Error('Badge desconocido: "' + badgeId + '" (¿está en SB.CATALOG de badges_core.js?)'));
        }
        if (!uid) return Promise.reject(new Error('Falta el UID del usuario.'));
        return canManage(badgeId).then(function (p) {
            if (!p.ok) {
                const e = new Error(p.reason);
                e.code = 'SC_BADGES_FORBIDDEN';
                throw e;
            }
            return who();
        }).then(function (w) {
            const ref = db().ref(NODE + '/' + uid + '/' + badgeId);
            const job = (action === 'grant')
                ? ref.set({ by: (w && w.uid) || '', at: Date.now() })
                : ref.remove();
            return job.then(function () { return log(uid, action, badgeId, w); });
        }).then(function () {
            try { if (typeof SB.repaint === 'function') SB.repaint(uid); } catch (e) {}
            return { ok: true, badge: badgeId, uid: uid, action: action };
        });
    }

    function grant(uid, badgeId) { return write(uid, badgeId, 'grant'); }
    function revoke(uid, badgeId) { return write(uid, badgeId, 'revoke'); }

    /* ==== LECTURAS ==== */
    function has(uid, badgeId) {
        return db().ref(NODE + '/' + uid + '/' + badgeId).once('value').then(function (s) { return !!s.val(); });
    }
    function list(uid) {
        return db().ref(NODE + '/' + uid).once('value').then(function (s) { return s.val() || {}; });
    }
    function logFor(uid, limit) {
        return db().ref(NODE_LOG + '/' + uid).limitToLast(limit || 10).once('value').then(function (s) {
            const v = s.val() || {};
            return Object.keys(v).map(function (k) { return v[k]; })
                .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        }).catch(function () { return []; });
    }

    /* ==== REGRAS AUTOMÁTICAS (gancho a futuro, hoy sin uso) ==== */
    const _rules = [];
    function addRule(name, fn) {
        _rules.push({ name: name, fn: fn });
        return SB.system;
    }
    function emit(event, payload) {
        for (let i = 0; i < _rules.length; i++) {
            try { _rules[i].fn(event, payload, SB.system); }
            catch (e) { console.warn('[StevsconBadges] regla "' + _rules[i].name + '" falló:', e); }
        }
        return _rules.length;
    }

    /* ==== API pública ==== */
    SB.system = {
        who: who, canManage: canManage, roleCan: roleCan,
        grant: grant, revoke: revoke,
        has: has, list: list, logFor: logFor,
        addRule: addRule, emit: emit
    };
    SB.addRule = addRule; /* alias corto */

    console.log('[Stevscon] badges_system.js listo (v4) — EL CEREBRO: permisos + escrituras + auditoría 🧠');
})(window, document);