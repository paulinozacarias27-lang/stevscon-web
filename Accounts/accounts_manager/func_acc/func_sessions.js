/**
 * STEVSON.COM :: func_sessions.js
 * Coordina Auth -> Memoria -> UI. Presencia online/offline,
 * bloqueo de cuentas baneadas y arranque automático del sistema.
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsSessions !== 'undefined') { return; }

    var AccountsSessions = {

        _presenceBound: false,

        init: function () {
            var mem = window.AccountsMemory;
            if (typeof mem === 'undefined') {
                console.error('[AccountsSessions] memory_acc.js no está cargado.');
                return;
            }

            /* Arranca la sincronización oficial de sesión */
            mem.initAuthSync();

            /* Orquestador: cada cambio de sesión actualiza datos, presencia y UI */
            var self = this;
            mem.onChange(function (authUser, userData) {
                self._onAuthChange(authUser, userData);
            });

            console.log('[Stevscon] func_sessions.js: sistema de sesiones activo.');
        },

        _onAuthChange: async function (authUser, userData) {
            /* 1. Refrescar botones del header */
            if (typeof window.AccountsUIButtons !== 'undefined') {
                try { window.AccountsUIButtons.render(authUser, userData); } catch (e) { console.error(e); }
            }

            if (!authUser) {
                if (typeof window.AccountsUISessions !== 'undefined') {
                    window.AccountsUISessions.onLogout();
                }
                return;
            }

            /* 2. Presencia online/offline en tiempo real */
            this._setupPresence(authUser.uid);

            /* 3. Bloqueo de cuentas baneadas */
            if (userData && userData.banned) {
                await this.logout();
                if (typeof window.AccountsUISessions !== 'undefined') {
                    window.AccountsUISessions.onBanned();
                }
                return;
            }

            /* 4. Aviso de suspensión temporal */
            if (userData && userData.suspended) {
                if (typeof window.AccountsUISessions !== 'undefined') {
                    window.AccountsUISessions.onSuspended();
                }
            }

            /* 5. Aviso visual de bienvenida */
            if (typeof window.AccountsUISessions !== 'undefined') {
                window.AccountsUISessions.onLogin(userData);
            }
        },

        /* Marca online y programa offline automático al cerrar pestaña */
        _setupPresence: function (uid) {
            if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.database) { return; }
            var db = window.StevsconFirebase.database;
            var self = this;

            if (this._presenceBound) {
                /* Ya escuchando .info/connected: solo refresca el estado */
                db.ref('users/' + uid + '/presence').set({ state: 'online', lastSeen: Date.now() });
                return;
            }
            this._presenceBound = true;

            db.ref('.info/connected').on('value', function (snap) {
                if (!snap.val()) { return; }                     // sin conexión
                var current = (typeof window.AccountsMemory !== 'undefined')
                    ? window.AccountsMemory.getCurrentUser() : null;
                if (!current) { return; }

                var presenceRef = db.ref('users/' + current.uid + '/presence');
                presenceRef.onDisconnect().set({ state: 'offline', lastSeen: Date.now() });
                presenceRef.set({ state: 'online', lastSeen: Date.now() });
            });
        },

        logout: async function () {
            if (typeof window.AccountsAuth !== 'undefined') {
                await window.AccountsAuth.logout();
            }
        },

        /* Datos rápidos del usuario actual para otros módulos */
        getSession: function () {
            if (typeof window.AccountsMemory === 'undefined') { return null; }
            return {
                user: window.AccountsMemory.getCurrentUser(),
                data: window.AccountsMemory.getCurrentData(),
                rank: window.AccountsMemory.getCurrentRank()
            };
        },

        isLoggedIn: function () {
            return this.getSession() ? !!this.getSession().user : false;
        }
    };

    /* Auto-arranque (los scripts son defer => el DOM ya existe) */
    AccountsSessions.init();

    window.AccountsSessions = AccountsSessions;

})(window);