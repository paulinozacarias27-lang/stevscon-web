// memory.js - Sistema central de persistencia global sincronizado en la nube (Firebase)

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

// Inicialización de Firebase Database
let db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log("☁️ Conectado exitosamente a la Base de Datos Global de Stevscon");
    }
} catch (e) {
    console.warn("⚠️ Firebase no disponible, usando almacenamiento local como respaldo.", e);
}

// --- CARGA INICIAL DESDE LOCALSTORAGE (RESPALDO) ---
let postsData = JSON.parse(localStorage.getItem('stevscon_posts')) || [];
let mdData = JSON.parse(localStorage.getItem('stevscon_mds')) || [];
let globalAccountsData = JSON.parse(localStorage.getItem('stevscon_accounts')) || [];

// Migración automática para corregir likes globales en posts viejos
postsData = postsData.map(post => {
    if (!Array.isArray(post.likedBy)) {
        post.likedBy = [];
    }
    delete post.liked;
    delete post.likes;
    return post;
});

// --- MÓDULO DE POSTS ---
function guardarPosts() {
    localStorage.setItem('stevscon_posts', JSON.stringify(postsData));
    if (db) {
        db.ref('posts').set(postsData);
    }
}

if (db) {
    db.ref('posts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            postsData = Array.isArray(data) ? data : Object.values(data);
            postsData = postsData.map(post => {
                if (!Array.isArray(post.likedBy)) post.likedBy = [];
                return post;
            });
            localStorage.setItem('stevscon_posts', JSON.stringify(postsData));
            if (typeof renderFeed === 'function') renderFeed();
        }
    });
}

// --- MÓDULO DE MENSAJES (MD) ---
function guardarMDs() {
    localStorage.setItem('stevscon_mds', JSON.stringify(mdData));
    if (db) {
        db.ref('mds').set(mdData);
    }
}

if (db) {
    db.ref('mds').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            mdData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_mds', JSON.stringify(mdData));
            if (typeof renderMensajes === 'function' && typeof currentChatUser !== 'undefined' && currentChatUser) {
                renderMensajes(); 
                if (typeof marcarChatComoLeido === 'function') marcarChatComoLeido(currentChatUser);
            }
            if (typeof renderContactList === 'function') renderContactList();
            if (typeof actualizarNotificacionesGlobales === 'function') actualizarNotificacionesGlobales();
        }
    });
}

// --- MÓDULO DE CUENTAS GLOBALES ---
function guardarCuentasGlobales(cuentas) {
    globalAccountsData = cuentas;
    localStorage.setItem('stevscon_accounts', JSON.stringify(cuentas));
    if (db) {
        db.ref('accounts').set(cuentas);
    }
}

if (db) {
    db.ref('accounts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            globalAccountsData = Array.isArray(data) ? data : Object.values(data);
            localStorage.setItem('stevscon_accounts', JSON.stringify(globalAccountsData));
        }
    });
}

// Escuchador de cambios entre pestañas del mismo navegador
window.addEventListener('storage', (event) => {
    if (event.key === 'stevscon_mds') {
        mdData = JSON.parse(event.newValue) || [];
        if (typeof renderMensajes === 'function' && typeof currentChatUser !== 'undefined' && currentChatUser) {
            renderMensajes(); 
            if (typeof marcarChatComoLeido === 'function') marcarChatComoLeido(currentChatUser);
        }
        if (typeof renderContactList === 'function') renderContactList();
        if (typeof actualizarNotificacionesGlobales === 'function') actualizarNotificacionesGlobales();
    }
});

// --- PERSISTENCIA DE INSIGNIAS Y CUENTAS VERIFICADAS ---
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