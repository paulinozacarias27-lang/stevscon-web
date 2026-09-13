// memory_acc.js - Gestión de memoria local y sincronización con Firebase

// Credenciales oficiales de Firebase Stevscon
const firebaseConfig = {
    apiKey: "AIzaSyAJN6uAVY65MAXJW1_0aHHP0L5okE9Tytw",
    authDomain: "stevscon-protocole-base.firebaseapp.com",
    projectId: "stevscon-protocole-base",
    storageBucket: "stevscon-protocole-base.firebasestorage.app",
    messagingSenderId: "308982842818",
    appId: "1:308982842818:web:4205b4d49c7347898d825b",
    measurementId: "G-X93QHQYQPM"
};

// Inicializar Firebase si aún no está inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

const MemoryAcc = {
    // Guardar usuario en almacenamiento local
    setLocalUser(userData) {
        localStorage.setItem('stevscon_active_user', JSON.stringify(userData));
    },

    // Obtener usuario activo actual
    getLocalUser() {
        const user = localStorage.getItem('stevscon_active_user');
        return user ? JSON.parse(user) : null;
    },

    // Cerrar sesión local
    clearLocalUser() {
        localStorage.removeItem('stevscon_active_user');
    },

    // Sincronizar o guardar datos del usuario en Firebase Realtime Database
    async syncUserToFirebase(userData) {
        if (!userData || !userData.handle) return;
        const cleanHandle = userData.handle.replace('@', '').toLowerCase();
        await db.ref('users/' + cleanHandle).update(userData);
    },

    // Consultar datos de un usuario en Firebase por su handle
    async getUserFromFirebase(handle) {
        if (!handle) return null;
        const cleanHandle = handle.replace('@', '').toLowerCase();
        const snapshot = await db.ref('users/' + cleanHandle).once('value');
        return snapshot.val();
    }
};