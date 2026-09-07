// memory.js - Sistema central de persistencia global con migración automática

const firebaseConfig = {
    apiKey: "AIzaSyDfDX4KEUTM3C8vsMGOqWpuEY2Qa-m7PQ",
    authDomain: "stevscondb.firebaseapp.com",
    databaseURL: "https://stevscondb-default-rtdb.firebaseio.com",
    projectId: "stevscondb",
    storageBucket: "stevscondb.firebasestorage.app",
    messagingSenderId: "641464432011",
    appId: "1:641464432011:web:22b8d1e1141b2615476b8e",
    measurementId: "G-DQ34P81GJH"
};

let db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log("☁️ Conectado a Firebase Database");
    }
} catch (e) {
    console.warn("⚠️ Firebase no disponible, usando respaldo local.", e);
}

// Carga inicial local unificada
let postsData = JSON.parse(localStorage.getItem('stevscon_posts')) || [];
let mdData = JSON.parse(localStorage.getItem('stevscon_mds')) || [];
let globalAccountsData = JSON.parse(localStorage.getItem('stevscon_usuarios')) || JSON.parse(localStorage.getItem('stevscon_accounts')) || [];

// --- FUNCIONES DE GUARDADO GLOBAL ---
function guardarPosts() {
    localStorage.setItem('stevscon_posts', JSON.stringify(postsData));
    if (db) db.ref('posts').set(postsData);
}

function guardarMDs() {
    localStorage.setItem('stevscon_mds', JSON.stringify(mdData));
    if (db) db.ref('mds').set(mdData);
}

function guardarCuentasGlobales(cuentas) {
    globalAccountsData = cuentas;
    if (typeof dbUsuarios !== 'undefined') dbUsuarios = cuentas;
    localStorage.setItem('stevscon_accounts', JSON.stringify(cuentas));
    localStorage.setItem('stevscon_usuarios', JSON.stringify(cuentas));
    if (db) db.ref('accounts').set(cuentas);
}

// --- ESCUCHADORES EN TIEMPO REAL MULTIDISPOSITIVO ---
if (db) {
    // Sincronizar Posts
    db.ref('posts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            postsData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_posts', JSON.stringify(postsData));
            if (typeof renderFeed === 'function') renderFeed();
            if (typeof renderizarFeed === 'function') renderizarFeed();
        } else if (postsData.length > 0) {
            db.ref('posts').set(postsData);
        }
    });

    // Sincronizar Cuentas y Perfiles Crossplay
    db.ref('accounts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            globalAccountsData = Array.isArray(data) ? data : Object.values(data);
            if (typeof dbUsuarios !== 'undefined') dbUsuarios = globalAccountsData;
            localStorage.setItem('stevscon_accounts', JSON.stringify(globalAccountsData));
            localStorage.setItem('stevscon_usuarios', JSON.stringify(globalAccountsData));
            
            // Actualizar sesión activa si cambió el perfil en la nube desde otro dispositivo
            if (typeof sesionActual !== 'undefined' && sesionActual) {
                const updated = globalAccountsData.find(u => u.handle === sesionActual.handle);
                if (updated) {
                    sesionActual = updated;
                    localStorage.setItem('stevscon_sesion', JSON.stringify(sesionActual));
                }
            }
        } else if (globalAccountsData.length > 0) {
            db.ref('accounts').set(globalAccountsData);
        }
    });

    // Sincronizar Mensajes Directos (MDs)
    db.ref('mds').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            mdData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_mds', JSON.stringify(mdData));
            if (typeof renderMensajes === 'function') renderMensajes();
        }
    });
}