/**
 * ==========================================================================
 * STEVSON.COM - ACCOUNTS MANAGER :: MEMORY (Capa de Datos)
 * --------------------------------------------------------------------------
 * - Punto de unión entre index.html, Firebase y todos los módulos.
 * - Registra y almacena TODAS las cuentas creadas en la web (/users/{uid}).
 * - Sistema de rangos: OWNER > ADMIN > MOD > USER.
 * - NO almacena contraseñas (solo Firebase Auth las guarda).
 * ==========================================================================
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsMemory !== 'undefined') { return; }

    var RANKS = {
        OWNER: { level: 100, label: 'Owner',      color: '#f59e0b', icon: 'fa-crown' },
        ADMIN: { level: 75,  label: 'Admin',      color: '#8b5cf6', icon: 'fa-shield-halved' },
        MOD:   { level: 50,  label: 'Moderador',  color: '#a78bfa', icon: 'fa-gavel' },
        USER:  { level: 10,  label: 'Usuario',    color: '#94a3b8', icon: 'fa-user' }
    };

    var AccountsMemory = {
        RANKS: RANKS,

        /* Estado en memoria (nunca persiste contraseñas) */
        state: {
            authUser: null,     // usuario de Firebase Auth actual
            userData: null,     // registro de /users/{uid} actual
            isReady: false
        },

        _subscribers: [],
        _reservedHandles: [],   // owner.js registra aquí handles protegidos
        _protectedEmails: [],   // owner.js registra aquí correos protegidos

        /* ------------------------- FIREBASE ------------------------- */
        _fb: function () {
            if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.database) {
                console.error('[AccountsMemory] Firebase no está inicializado. Carga firebase_config.js antes.');
                return null;
            }
            return window.StevsconFirebase.database;
        },

        _auth: function () {
            if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.auth) { return null; }
            return window.StevsconFirebase.auth;
        },

        refs: function () {
            var db = this._fb();
            if (!db) { return null; }
            return {
                users:   db.ref('users'),
                user:    function (uid) { return db.ref('users/' + uid); },
                handles: db.ref('handles'),   // handleLower -> uid (índice único)
                admins:  db.ref('admins')     // uid -> true (personal de staff)
            };
        },

        /* ------------------------- RANGOS ------------------------- */
        getRankInfo: function (rank) {
            return RANKS[rank] || RANKS.USER;
        },

        getRankLevel: function (rank) {
            return this.getRankInfo(rank).level;
        },

        /* ¿Puede "actorRank" gestionar a "targetRank"? Nadie toca al OWNER. */
        canManage: function (actorRank, targetRank) {
            var a = this.getRankLevel(actorRank);
            var t = this.getRankLevel(targetRank);
            if (targetRank === 'OWNER') { return false; }        // El Owner es intocable
            if (actorRank === 'OWNER')  { return true; }
            return a > t;
        },

        /* ------------------------ CONSULTAS ------------------------ */
        getUserById: async function (uid) {
            var r = this.refs();
            if (!r || !uid) { return null; }
            var snap = await r.user(uid).once('value');
            return snap.exists() ? snap.val() : null;
        },

        getUserByEmail: async function (email) {
            var r = this.refs();
            if (!r || !email) { return null; }
            var snap = await r.users.orderByChild('emailLower')
                .equalTo(String(email).trim().toLowerCase())
                .limitToFirst(1).once('value');
            var out = null;
            snap.forEach(function (c) { out = c.val(); });
            return out;
        },

        getUserByHandle: async function (handle) {
            var r = this.refs();
            if (!r || !handle) { return null; }
            var snap = await r.users.orderByChild('handleLower')
                .equalTo(String(handle).trim().toLowerCase())
                .limitToFirst(1).once('value');
            var out = null;
            snap.forEach(function (c) { out = c.val(); });
            return out;
        },

        isHandleAvailable: async function (handle) {
            var r = this.refs();
            if (!r) { return false; }
            var lower = String(handle).trim().toLowerCase();
            var snap = await r.handles.child(lower).once('value');
            return !snap.exists();
        },

        /* ------------------- REGISTRO DE CUENTAS ------------------- */
        /* Valida y reserva un handle (3-20 chars: letras, números y _). */
        claimHandle: async function (uid, desired, emailLower) {
            var r = this.refs();
            if (!r) { throw new Error('FIREBASE_NOT_READY'); }

            var clean = String(desired || '').trim();
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) { throw new Error('HANDLE_INVALID'); }

            var lower = clean.toLowerCase();
            var reserved = this._reservedHandles;
            var protectedMails = this._protectedEmails;
            var isProtected = reserved.indexOf(lower) !== -1;
            var isProtectedOwner = protectedMails.indexOf(String(emailLower || '').toLowerCase()) !== -1;

            if (isProtected && !isProtectedOwner) { throw new Error('HANDLE_RESERVED'); }

            var result = await r.handles.child(lower).transaction(function (current) {
                if (current === null) { return uid; }   // lo reclama
                return;                                  // aborta: ya está ocupado
            });

            if (!result.committed) { throw new Error('HANDLE_TAKEN'); }
            return clean;
        },

        /* Crea (o completa) el registro de una cuenta en /users/{uid}. */
        ensureUserRecord: async function (authUser, extra) {
            var r = this.refs();
            if (!r || !authUser) { return null; }
            extra = extra || {};

            var ref = r.user(authUser.uid);
            var snap = await ref.once('value');
            var emailLower = String(authUser.email || '').trim().toLowerCase();

            if (snap.exists()) {
                ref.update({ lastLogin: Date.now() });
                return snap.val();
            }

            var handle = null;
            if (extra.handle) {
                try {
                    handle = await this.claimHandle(authUser.uid, extra.handle, emailLower);
                } catch (e) {
                    handle = null;
                }
            }
            /* Fallback: si no dio handle válido, genera uno único */
            if (!handle) {
                var base = (extra.displayName || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12) || 'user';
                handle = base + '_' + Math.floor(1000 + Math.random() * 9000);
                try { await this.claimHandle(authUser.uid, handle, emailLower); }
                catch (e2) { handle = base + '_' + authUser.uid.slice(0, 5); }
            }

            var record = {
                uid: authUser.uid,
                email: authUser.email || '',
                emailLower: emailLower,
                handle: handle,
                handleLower: handle.toLowerCase(),
                displayName: extra.displayName || handle,
                photoURL: authUser.photoURL || '',
                rank: 'USER',
                verified: false,
                suspended: false,
                banned: false,
                provider: authUser.providerData && authUser.providerData[0] ? authUser.providerData[0].providerId : 'password',
                createdAt: Date.now(),
                lastLogin: Date.now()
            };

            await ref.set(record);
            r.handles.child(record.handleLower).set(authUser.uid);
            return record;
        },

        /* Actualiza campos puntuales del registro */
        updateUserFields: async function (uid, fields) {
            var r = this.refs();
            if (!r || !uid || typeof fields !== 'object') { return false; }
            await r.user(uid).update(fields);
            return true;
        },

        /* Cambia el rango de un usuario (con control jerárquico) */
        setRank: async function (targetUid, newRank, actorData) {
            var r = this.refs();
            if (!r || !RANKS[newRank]) { throw new Error('RANK_INVALID'); }
            if (newRank === 'OWNER') { throw new Error('RANK_OWNER_LOCKED'); } // Nadie crea Owners

            var target = await this.getUserById(targetUid);
            if (!target) { throw new Error('USER_NOT_FOUND'); }

            var actorRank = (actorData && actorData.rank) ? actorData.rank : 'USER';
            if (!this.canManage(actorRank, target.rank)) { throw new Error('PERMISSION_DENIED'); }

            await r.user(targetUid).update({ rank: newRank });
            if (newRank === 'ADMIN' || newRank === 'MOD') {
                r.admins.child(targetUid).set(true);
            } else {
                r.admins.child(targetUid).remove();
            }
            return true;
        },

        /* ------------------------ SESIÓN ------------------------ */
        /* Sincroniza Auth -> Memoria -> UI. Llamar 1 vez desde category.js */
        initAuthSync: function () {
            var self = this;
            var auth = this._auth();
            if (!auth) { return; }

            auth.onAuthStateChanged(async function (user) {
                self.state.authUser = user || null;

                if (user) {
                    /* Hook defensivo: owner.js fuerza el rango OWNER a su correo */
                    if (typeof window.OwnerManager !== 'undefined' && window.OwnerManager.ensureOwnerRecord) {
                        try { await window.OwnerManager.ensureOwnerRecord(user); }
                        catch (e) { console.warn('[AccountsMemory] ensureOwnerRecord:', e && e.message); }
                    }
                    self.state.userData = await self.getUserById(user.uid);
                } else {
                    self.state.userData = null;
                }

                self.state.isReady = true;
                for (var i = 0; i < self._subscribers.length; i++) {
                    try { self._subscribers[i](self.state.authUser, self.state.userData); }
                    catch (e) { console.error('[AccountsMemory] Subscriber error:', e); }
                }
            });
        },

        onChange: function (cb) {
            if (typeof cb === 'function') { this._subscribers.push(cb); }
            /* Estado inmediato si ya cargó */
            if (this.state.isReady) { cb(this.state.authUser, this.state.userData); }
        },

        getCurrentUser:  function () { return this.state.authUser; },
        getCurrentData:  function () { return this.state.userData; },
        getCurrentRank:  function () { return this.state.userData ? this.state.userData.rank : null; }
    };

    window.AccountsMemory = AccountsMemory;
    console.log('[Stevscon] memory_acc.js listo.');

})(window);