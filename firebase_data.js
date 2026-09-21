/**
 * ==========================================================================
 * STEVSON.COM - FIREBASE CONFIGURATION & INITIALIZATION
 * Proyecto: stevscon-protocole-base
 * ==========================================================================
 */

(function (window) {
    'use strict';

    // 1. Configuración del proyecto Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyAJN6uAVY65MAXJW1_0aHHP0L5okE9Tytw",
        authDomain: "stevscon-protocole-base.firebaseapp.com",
        databaseURL: "https://stevscon-protocole-base-default-rtdb.firebaseio.com",
        projectId: "stevscon-protocole-base",
        storageBucket: "stevscon-protocole-base.firebasestorage.app",
        messagingSenderId: "308982842818",
        appId: "1:308982842818:web:4205b4d49c7347898d825b",
        measurementId: "G-X93QHQYQPM"
    };

    // 2. Comprobación defensiva del SDK de Firebase
    if (typeof firebase === 'undefined') {
        console.error("[Stevscon Firebase] Error: El SDK de Firebase no ha sido cargado en el HTML.");
        return;
    }

    // 3. Inicializar app evitando duplicados
    let app;
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }

    // 4. Instancias principales de servicios
    const auth = firebase.auth();
    const database = firebase.database();
    const storage = firebase.storage();

    // 5. Exposición global para los módulos de la aplicación
    window.StevsconFirebase = {
        app: app,
        auth: auth,
        database: database,
        storage: storage,
        config: firebaseConfig,

        // Atajos rápidos para referencias comunes
        usersRef: () => database.ref('users'),
        userRef: (uid) => database.ref(`users/${uid}`),
        profilesRef: () => database.ref('profiles'),
        conversationsRef: () => database.ref('conversations'),
        messagesRef: () => database.ref('messages'),
        friendsRef: () => database.ref('friends')
    };

    console.log("[Stevscon Firebase] Conectado exitosamente a:", firebaseConfig.projectId);

})(window);