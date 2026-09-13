// memory_acc.js - Central de Memoria, Firebase y Almacenamiento Local

const firebaseConfig = {
    apiKey: "AIzaSyAJN6uAVY65MAXJW1_0aHHP0L5okE9Tytw",
    authDomain: "stevscon-protocole-base.firebaseapp.com",
    projectId: "stevscon-protocole-base",
    storageBucket: "stevscon-protocole-base.firebasestorage.app",
    messagingSenderId: "308982842818",
    appId: "1:308982842818:web:4205b4d49c7347898d825b",
    measurementId: "G-X93QHQYQPM"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = (typeof firebase !== 'undefined' && firebase.apps.length) ? firebase.database() : null;

const MemoryAcc = {
    // -------------------------------------------------------------
    // SESIÓN ACTIVA DEL USUARIO
    // -------------------------------------------------------------
    setLocalUser(userData) {
        localStorage.setItem('stevscon_active_user', JSON.stringify(userData));
    },

    getLocalUser() {
        const user = localStorage.getItem('stevscon_active_user');
        return user ? JSON.parse(user) : null;
    },

    clearLocalUser() {
        localStorage.removeItem('stevscon_active_user');
        localStorage.removeItem('stevscon_user'); // Limpieza de claves obsoletas
    },

    // -------------------------------------------------------------
    // BASE DE DATOS LOCAL DE RESPALDO
    // -------------------------------------------------------------
    getAllLocalAccounts() {
        const data = localStorage.getItem('stevscon_accounts_db');
        return data ? JSON.parse(data) : {};
    },

    saveLocalAccount(userData) {
        const accounts = this.getAllLocalAccounts();
        const cleanHandle = userData.handle.replace('@', '').toLowerCase();
        accounts[cleanHandle] = userData;
        localStorage.setItem('stevscon_accounts_db', JSON.stringify(accounts));
    },

    // -------------------------------------------------------------
    // CONSULTAS DE USUARIO (FIREBASE Y LOCAL)
    // -------------------------------------------------------------
    async getUserByHandle(handle) {
        if (!handle) return null;
        const cleanHandle = handle.replace('@', '').toLowerCase();

        // 1. Consultar Firebase
        if (db) {
            try {
                const snapshot = await db.ref('users/' + cleanHandle).once('value');
                if (snapshot.exists()) return snapshot.val();
            } catch (e) {
                console.warn("Error consultando Firebase por handle:", e);
            }
        }

        // 2. Respaldo local
        const localAccounts = this.getAllLocalAccounts();
        return localAccounts[cleanHandle] || null;
    },

    async getUserByEmail(email) {
        if (!email) return null;
        const cleanEmail = email.trim().toLowerCase();

        // 1. Consultar Firebase
        if (db) {
            try {
                const snapshot = await db.ref('users').orderByChild('email').equalTo(cleanEmail).once('value');
                if (snapshot.exists()) {
                    let foundUser = null;
                    snapshot.forEach(child => {
                        foundUser = child.val();
                    });
                    if (foundUser) return foundUser;
                }
            } catch (e) {
                console.warn("Error consultando Firebase por email:", e);
            }
        }

        // 2. Respaldo local
        const localAccounts = this.getAllLocalAccounts();
        for (const key in localAccounts) {
            if (localAccounts[key].email && localAccounts[key].email.toLowerCase() === cleanEmail) {
                return localAccounts[key];
            }
        }
        return null;
    },

    // -------------------------------------------------------------
    // GUARDADO Y SINCRONIZACIÓN DE CUENTAS
    // -------------------------------------------------------------
    async syncUserToFirebase(userData) {
        if (!userData || !userData.handle) return;
        const cleanHandle = userData.handle.replace('@', '').toLowerCase();

        // Guardar localmente
        this.saveLocalAccount(userData);

        // Sincronizar en Firebase Realtime Database
        if (db) {
            try {
                await db.ref('users/' + cleanHandle).update(userData);
            } catch (e) {
                console.warn("Advertencia al sincronizar con Firebase:", e);
            }
        }
    }
};