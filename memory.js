// memory.js - Núcleo de memoria GLOBAL de Stevscon (Firebase es la única fuente de verdad)
// localStorage se usa solamente como caché de arranque / respaldo offline.

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

const CACHE_POSTS = 'stevscon_posts';
const CACHE_MDS = 'stevscon_mds';
const CACHE_ACCOUNTS = 'stevscon_usuarios';
const CACHE_ACCOUNTS_ALT = 'stevscon_accounts';
const CACHE_SESION = 'stevscon_sesion';

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

// --- UTILIDADES DE NORMALIZACIÓN ---
function normalizarLista(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean);
    if (typeof valor === 'object') return Object.values(valor).filter(Boolean);
    return [];
}

function leerCacheLocal(clave) {
    try {
        return normalizarLista(JSON.parse(localStorage.getItem(clave)));
    } catch (e) {
        return [];
    }
}

function guardarCacheLocal(clave, lista) {
    try {
        localStorage.setItem(clave, JSON.stringify(lista));
    } catch (e) {
        console.warn("No se pudo escribir la caché local:", clave, e);
    }
}

// Clave segura para Firebase a partir de un @handle
function claveHandle(handle) {
    return String(handle || '')
        .replace('@', '')
        .trim()
        .toLowerCase()
        .replace(/[.#$\[\]\/]/g, '_');
}

// --- ESTADO GLOBAL EN MEMORIA ---
let postsData = leerCacheLocal(CACHE_POSTS);
let mdData = leerCacheLocal(CACHE_MDS);
let globalAccountsData = leerCacheLocal(CACHE_ACCOUNTS);
if (globalAccountsData.length === 0) {
    globalAccountsData = leerCacheLocal(CACHE_ACCOUNTS_ALT);
}

// --- ACCESO GLOBAL (usar SIEMPRE estas funciones en vez de localStorage) ---
function obtenerUsuariosGlobales() {
    return Array.isArray(globalAccountsData) ? globalAccountsData : [];
}

function obtenerPostsGlobales() {
    return Array.isArray(postsData) ? postsData : [];
}

function obtenerMDsGlobales() {
    return Array.isArray(mdData) ? mdData : [];
}

function buscarUsuarioGlobal(handle) {
    const clave = claveHandle(handle);
    if (!clave) return null;
    return obtenerUsuariosGlobales().find(u => claveHandle(u && u.handle) === clave) || null;
}

// Mantiene el alias antiguo dbUsuarios apuntando a los datos globales
function sincronizarAliasUsuarios() {
    try {
        if (typeof dbUsuarios !== 'undefined') dbUsuarios = globalAccountsData;
    } catch (e) { /* dbUsuarios aún no está inicializado */ }
}

// --- GUARDADO GLOBAL (escribe en Firebase por elemento, nunca sobrescribe todo el nodo) ---
function escribirMapaEnFirebase(ruta, lista, obtenerClave) {
    if (!db) return;
    const mapa = {};
    lista.forEach(item => {
        if (!item) return;
        const clave = obtenerClave(item);
        if (clave) mapa[clave] = item;
    });
    if (Object.keys(mapa).length === 0) return;
    db.ref(ruta).update(mapa).catch(err => console.warn(`No se pudo sincronizar ${ruta}:`, err));
}

function guardarPosts() {
    postsData = normalizarLista(postsData);
    guardarCacheLocal(CACHE_POSTS, postsData);
    escribirMapaEnFirebase('posts', postsData, p => (p.id !== undefined && p.id !== null) ? String(p.id) : null);
}

function guardarPost(post) {
    if (!post || post.id === undefined || post.id === null) return;
    guardarCacheLocal(CACHE_POSTS, postsData);
    if (db) db.ref('posts/' + String(post.id)).set(post).catch(err => console.warn("No se pudo guardar la publicación:", err));
}

function eliminarPostGlobal(postId) {
    postsData = obtenerPostsGlobales().filter(p => String(p.id) !== String(postId));
    guardarCacheLocal(CACHE_POSTS, postsData);
    if (db) db.ref('posts/' + String(postId)).remove().catch(err => console.warn("No se pudo eliminar la publicación:", err));
}

function guardarMDs() {
    mdData = normalizarLista(mdData);
    guardarCacheLocal(CACHE_MDS, mdData);
    escribirMapaEnFirebase('mds', mdData, c => c.idChat || null);
}

function guardarChatMD(chat) {
    if (!chat || !chat.idChat) return;
    guardarCacheLocal(CACHE_MDS, mdData);
    if (db) db.ref('mds/' + chat.idChat).set(chat).catch(err => console.warn("No se pudo sincronizar el chat:", err));
}

function guardarCuentasGlobales(cuentas) {
    globalAccountsData = normalizarLista(cuentas);
    sincronizarAliasUsuarios();
    guardarCacheLocal(CACHE_ACCOUNTS, globalAccountsData);
    guardarCacheLocal(CACHE_ACCOUNTS_ALT, globalAccountsData);
    escribirMapaEnFirebase('accounts', globalAccountsData, u => claveHandle(u.handle));
}

// Guarda un único perfil sin pisar los cambios de los demás usuarios
function guardarUsuarioGlobal(usuario) {
    if (!usuario || !usuario.handle) return;
    const clave = claveHandle(usuario.handle);
    const lista = obtenerUsuariosGlobales();
    const indice = lista.findIndex(u => claveHandle(u && u.handle) === clave);

    if (indice !== -1) {
        lista[indice] = usuario;
    } else {
        lista.push(usuario);
    }

    globalAccountsData = lista;
    sincronizarAliasUsuarios();
    guardarCacheLocal(CACHE_ACCOUNTS, globalAccountsData);
    guardarCacheLocal(CACHE_ACCOUNTS_ALT, globalAccountsData);

    if (db) db.ref('accounts/' + clave).set(usuario).catch(err => console.warn("No se pudo sincronizar el perfil:", err));
}

function eliminarUsuarioGlobal(handle) {
    const clave = claveHandle(handle);
    globalAccountsData = obtenerUsuariosGlobales().filter(u => claveHandle(u && u.handle) !== clave);
    sincronizarAliasUsuarios();
    guardarCacheLocal(CACHE_ACCOUNTS, globalAccountsData);
    guardarCacheLocal(CACHE_ACCOUNTS_ALT, globalAccountsData);
    if (db) db.ref('accounts/' + clave).remove().catch(err => console.warn("No se pudo eliminar la cuenta:", err));
}

// --- SESIÓN (solo el vínculo del dispositivo; los datos reales viven en Firebase) ---
function guardarSesionLocal(usuario) {
    if (!usuario) {
        localStorage.removeItem(CACHE_SESION);
        return;
    }
    localStorage.setItem(CACHE_SESION, JSON.stringify(usuario));
}

function obtenerSesionGuardada() {
    try {
        return JSON.parse(localStorage.getItem(CACHE_SESION)) || null;
    } catch (e) {
        return null;
    }
}

// --- REFRESCO DE INTERFAZ CUANDO LLEGAN DATOS NUEVOS DE LA NUBE ---
function refrescarVistasGlobales(origen) {
    try {
        if (typeof actualizarHeaderAuth === 'function') actualizarHeaderAuth();

        if (origen === 'posts' || origen === 'accounts') {
            if (typeof renderizarFeed === 'function' && document.getElementById('feedContainer')) {
                renderizarFeed();
            }
        }

        if (origen === 'mds' || origen === 'accounts') {
            if (typeof renderContactList === 'function' && document.getElementById('md-contact-list')) {
                renderContactList();
            }
            if (typeof renderMensajes === 'function' && document.getElementById('chat-messages-container')) {
                renderMensajes();
            }
        }

        if (origen === 'accounts') {
            const vistaPerfil = document.getElementById('profile-read-view');
            const vistaEdicion = document.getElementById('profile-edit-view');
            const editando = vistaEdicion && !vistaEdicion.classList.contains('hidden');
            if (vistaPerfil && !editando && typeof cargarCategoria === 'function') {
                cargarCategoria('profile');
            }
        }

        if (typeof actualizarNotificacionesGlobales === 'function') {
            actualizarNotificacionesGlobales();
        }
    } catch (e) {
        console.warn("Error al refrescar la interfaz tras sincronizar:", e);
    }
}

// --- ESTADO DE LA PRIMERA SINCRONIZACIÓN (clave en móviles sin caché local) ---
let datosGlobalesListos = !db;
let resolverSincronizacion = null;
const promesaSincronizacion = new Promise(resolve => { resolverSincronizacion = resolve; });

function marcarSincronizacionLista() {
    if (datosGlobalesListos) return;
    datosGlobalesListos = true;
    if (resolverSincronizacion) resolverSincronizacion(true);
}

function esperarSincronizacionGlobal(tiempoMaximo = 5000) {
    if (datosGlobalesListos) return Promise.resolve(true);
    return Promise.race([
        promesaSincronizacion,
        new Promise(resolve => setTimeout(() => resolve(false), tiempoMaximo))
    ]);
}

// Convierte nodos guardados como array (formato antiguo) a mapa por clave
function migrarNodoAMapa(ruta, obtenerClave) {
    if (!db) return;
    db.ref(ruta).once('value').then(snapshot => {
        const valor = snapshot.val();
        if (!Array.isArray(valor)) return;

        const mapa = {};
        valor.filter(Boolean).forEach(item => {
            const clave = obtenerClave(item);
            if (clave) mapa[clave] = item;
        });

        if (Object.keys(mapa).length > 0) {
            db.ref(ruta).set(mapa).catch(err => console.warn(`No se pudo migrar ${ruta}:`, err));
        }
    }).catch(err => console.warn(`No se pudo leer ${ruta} para migrar:`, err));
}

// --- ESCUCHADORES EN TIEMPO REAL MULTIDISPOSITIVO ---
// Antes de que Firebase reemplace los datos locales, guardamos una copia para
// poder migrar lo que solo exista en localStorage (cuentas/posts/mds antiguos)
// y empujarlo a la nube.
const cacheLocalPreviaAccounts = leerCacheLocal(CACHE_ACCOUNTS);
const cacheLocalPreviaPosts = leerCacheLocal(CACHE_POSTS);
const cacheLocalPreviaMds = leerCacheLocal(CACHE_MDS);

// Empuja a Firebase los items que solo existen en localStorage y no en la nube
function migrarLocalesAFirebase(locals, ruta, obtenerClave) {
    if (!db || !Array.isArray(locals) || locals.length === 0) return;
    locals.forEach(item => {
        if (!item) return;
        const clave = obtenerClave(item);
        if (!clave) return;
        db.ref(ruta + '/' + clave).once('value').then(snap => {
            if (!snap.val()) {
                db.ref(ruta + '/' + clave).set(item)
                    .catch(err => console.warn('No se pudo migrar ' + ruta + '/' + clave, err));
            }
        }).catch(() => {});
    });
}

// Parcha posts antiguos que no tienen campo handle buscándolo en accounts
function parcharPostsSinHandle() {
    if (!db) return;
    const posts = obtenerPostsGlobales();
    const cuentas = obtenerUsuariosGlobales();

    posts.forEach(post => {
        if (!post || post.handle) return; // ya tiene handle

        // Buscar el handle por nombre de autor
        const autorLower = (post.author || '').toLowerCase().trim();
        const cuenta = cuentas.find(u => u && (
            (u.nombre || '').toLowerCase().trim() === autorLower ||
            claveHandle(u.handle) === autorLower
        ));

        if (cuenta && cuenta.handle) {
            post.handle = cuenta.handle;
            // Guardar el post parchado en Firebase
            db.ref('posts/' + String(post.id)).update({ handle: cuenta.handle })
                .catch(err => console.warn('No se pudo parchar post ' + post.id, err));
        }

        // Parchar comentarios sin handle también
        if (Array.isArray(post.comments)) {
            let cambioComentarios = false;
            post.comments.forEach(c => {
                if (!c.handle && c.author) {
                    const cAutorLower = c.author.toLowerCase().trim();
                    const cCuenta = cuentas.find(u => u && (
                        (u.nombre || '').toLowerCase().trim() === cAutorLower ||
                        claveHandle(u.handle) === cAutorLower
                    ));
                    if (cCuenta && cCuenta.handle) {
                        c.handle = cCuenta.handle;
                        cambioComentarios = true;
                    }
                }
            });
            if (cambioComentarios) {
                db.ref('posts/' + String(post.id)).update({ comments: post.comments })
                    .catch(err => console.warn('No se pudieron parchar comentarios', err));
            }
        }
    });
}

if (db) {
    migrarNodoAMapa('posts', p => (p.id !== undefined && p.id !== null) ? String(p.id) : null);
    migrarNodoAMapa('accounts', u => claveHandle(u.handle));
    migrarNodoAMapa('mds', c => c.idChat || null);

    db.ref('posts').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            postsData = normalizarLista(data);
            guardarCacheLocal(CACHE_POSTS, postsData);
        } else {
            postsData = [];
            guardarCacheLocal(CACHE_POSTS, postsData);
        }

        // Migrar posts que solo están en localStorage
        migrarLocalesAFirebase(cacheLocalPreviaPosts, 'posts', p => String(p.id));

        // Parchar posts antiguos sin handle
        parcharPostsSinHandle();

        refrescarVistasGlobales('posts');
    });

    db.ref('accounts').on('value', (snapshot) => {
        const data = snapshot.val();
        const cloudAccounts = normalizarLista(data);

        // Antes de reemplazar, migrar cuentas que solo están en localStorage
        migrarLocalesAFirebase(cacheLocalPreviaAccounts, 'accounts', u => claveHandle(u.handle));

        globalAccountsData = cloudAccounts;
        sincronizarAliasUsuarios();
        guardarCacheLocal(CACHE_ACCOUNTS, globalAccountsData);
        guardarCacheLocal(CACHE_ACCOUNTS_ALT, globalAccountsData);

        // Mantener la sesión activa siempre igual al perfil que está en la nube
        try {
            if (typeof sesionActual !== 'undefined' && sesionActual) {
                const actualizado = buscarUsuarioGlobal(sesionActual.handle);
                if (actualizado) {
                    sesionActual = actualizado;
                    guardarSesionLocal(sesionActual);
                    if (typeof sincronizarCuentaActual === 'function') sincronizarCuentaActual();
                }
            }
        } catch (e) { /* la sesión aún no se ha inicializado */ }

        marcarSincronizacionLista();

        // Parchar posts antiguos sin handle ahora que accounts está cargado
        parcharPostsSinHandle();

        refrescarVistasGlobales('accounts');
    });

    db.ref('mds').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            mdData = normalizarLista(data);
        } else {
            mdData = [];
        }

        // Migrar mensajes antiguos que solo están en localStorage
        migrarLocalesAFirebase(cacheLocalPreviaMds, 'mds', c => c.idChat || null);

        guardarCacheLocal(CACHE_MDS, mdData);
        refrescarVistasGlobales('mds');
    });
}
