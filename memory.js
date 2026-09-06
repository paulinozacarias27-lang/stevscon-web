// memory.js - Sistema central de persistencia de datos (Posteos)
let postsData = JSON.parse(localStorage.getItem('stevscon_posts')) || [];

// Migración automática para corregir likes globales en posts viejos
postsData = postsData.map(post => {
    if (!Array.isArray(post.likedBy)) {
        post.likedBy = [];
    }
    delete post.liked;
    delete post.likes;
    return post;
});

function guardarPosts() {
    localStorage.setItem('stevscon_posts', JSON.stringify(postsData));
}

// memory.js - Sistema central de persistencia de datos (MDs)
let mdData = JSON.parse(localStorage.getItem('stevscon_mds')) || [];

function guardarMDs() {
    localStorage.setItem('stevscon_mds', JSON.stringify(mdData));
}

window.addEventListener('storage', (event) => {
    if (event.key === 'stevscon_mds') {
        mdData = JSON.parse(event.newValue) || [];
        if (typeof renderMensajes === 'function' && currentChatUser) {
            renderMensajes(); 
            marcarChatComoLeido(currentChatUser);
        }
        if (typeof renderContactList === 'function') renderContactList();
        if (typeof actualizarNotificacionesGlobales === 'function') actualizarNotificacionesGlobales();
    }
});

// Memoria y persistencia para Insignias y Cuentas Verificadas

// Base de datos general de Insignias registradas
const BADGES_DATABASE = {
    admin: {
        id: 'admin',
        nombre: 'Admin',
        descripcion: 'Stevscon.com Admin',
        icono: 'fa-solid fa-shield-halved',
        color: 'var(--purple-accent)'
    }
};

// Devuelve el estado de verificación de un usuario
function obtenerEstadoVerificado(usuario) {
    if (!usuario) return false;
    // Cuentas verificadas explicitamente o administradores/propietarios
    return Boolean(usuario.verified || usuario.rol === 'owner' || usuario.rol === 'admin');
}

// Devuelve el listado de insignias que posee un usuario
function obtenerInsigniasUsuario(usuario) {
    if (!usuario) return [];
    let insignias = Array.isArray(usuario.badges) ? [...usuario.badges] : [];
    
    // Asignación automática de badge Admin según rol
    if ((usuario.rol === 'admin' || usuario.rol === 'owner') && !insignias.includes('admin')) {
        insignias.push('admin');
    }
    return insignias;
}