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

// Carga inicial local
let postsData = JSON.parse(localStorage.getItem('stevscon_posts')) || [];
let mdData = JSON.parse(localStorage.getItem('stevscon_mds')) || [];
let globalAccountsData = JSON.parse(localStorage.getItem('stevscon_accounts')) || [];

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
    localStorage.setItem('stevscon_accounts', JSON.stringify(cuentas));
    if (db) db.ref('accounts').set(cuentas);
}

// --- ESCUCHADORES EN TIEMPO REAL CON MIGRACIÓN AUTO ---
if (db) {
    // Sincronizar Posts
    db.ref('posts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            postsData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_posts', JSON.stringify(postsData));
            if (typeof renderFeed === 'function') renderFeed();
        } else if (postsData.length > 0) {
            // Migrar datos locales existentes a Firebase si la nube está vacía
            db.ref('posts').set(postsData);
        }
    });

    // Sincronizar Cuentas
    db.ref('accounts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            globalAccountsData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_accounts', JSON.stringify(globalAccountsData));
        } else if (globalAccountsData.length > 0) {
            // Migrar cuentas locales a Firebase
            db.ref('accounts').set(globalAccountsData);
        }
    });

    // Sincronizar Mensajes
    db.ref('mds').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            mdData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_mds', JSON.stringify(mdData));
            if (typeof renderMensajes === 'function' && typeof currentChatUser !== 'undefined' && currentChatUser) {
                renderMensajes();
            }
        }
    });
}

// --- UTILIDADES DE INSIGNIAS Y VERIFICACIÓN ---
const BADGES_DATABASE = {
    admin: {
        id: 'admin',
        nombre: 'Admin',
        descripcion: 'Stevscon.com Admin',
        icono: 'fa-solid fa-shield-halved',
        color: 'var(--purple-accent)'
    }
};

function obtenerEstadoVerificado(usuario) {
    if (!usuario) return false;
    return Boolean(usuario.verified || usuario.rol === 'owner' || usuario.rol === 'admin');
}

function obtenerInsigniasUsuario(usuario) {
    if (!usuario) return [];
    let insignias = Array.isArray(usuario.badges) ? [...usuario.badges] : [];
    if ((usuario.rol === 'admin' || usuario.rol === 'owner') && !insignias.includes('admin')) {
        insignias.push('admin');
    }
    return insignias;
}