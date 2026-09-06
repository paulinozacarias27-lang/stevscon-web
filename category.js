// Función para actualizar los botones del header según la sesión
function actualizarHeaderAuth() {
    const headerSection = document.getElementById('auth-header-section');
    if (!headerSection) return;
    
    if (typeof sesionActual !== 'undefined' && sesionActual) {
        headerSection.innerHTML = `
            <button class="btn btn-primary" onclick="cargarCategoria('profile')">
                <i class="fa-solid fa-user"></i> Perfil
            </button>
            <button class="btn btn-outline" onclick="cargarCategoria('messengers')" style="position: relative; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-envelope"></i> Mensajes
                <span class="notif-badge-global hidden" style="background-color: var(--danger, #ef4444); color: white; border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; justify-content: center; align-items: center; font-size: 0.7rem; font-weight: 800; padding: 0 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></span>
            </button>
            <button class="btn btn-outline" onclick="cerrarSesion()">
                <i class="fa-solid fa-right-from-bracket"></i> Salir
            </button>
        `;
    } else {
        headerSection.innerHTML = `
            <button class="btn btn-outline" onclick="cargarCategoria('login')">Iniciar sesión</button>
            <button class="btn btn-primary" onclick="cargarCategoria('register')">Crear cuenta</button>
        `;
    }
}

// Reemplaza cargarCategoria en category.js
function cargarCategoria(categoria) {
    const root = document.getElementById('app-root');
    if (!root) return;
    
    try {
        // Al salir de la sección de mensajes, limpiamos el chat activo
        if (categoria !== 'messengers' && typeof currentChatUser !== 'undefined') {
            currentChatUser = null;
        }

        root.innerHTML = ''; // Limpiar pantalla

        if (categoria === 'social') {
            root.innerHTML = getSocialLayoutHTML();
            initSocialLogic();
        } 
        else if (categoria === 'messengers') { 
            root.innerHTML = getMDLayoutHTML();
            initMDLogic();
        }
        else if (categoria === 'login') {
            root.innerHTML = getLoginHTML();
        }
        else if (categoria === 'register') {
            root.innerHTML = getRegisterHTML();
        }
        else if (categoria === 'profile') {
            root.innerHTML = getProfileView();
        }

        // Ejecutar SIEMPRE la actualización de notificaciones globales en cualquier vista
        if (typeof actualizarNotificacionesGlobales === 'function') {
            actualizarNotificacionesGlobales();
        }

    } catch (error) {
        console.error("Error al cargar la categoría:", error);
        root.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger); padding: 20px; border-radius: 8px; color: white; margin-top: 20px;">
                <h3 style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Error del sistema</h3>
                <p style="margin-top: 10px;">${error.message}</p>
            </div>`;
    }
}

// Iniciar la web al cargar de forma segura
document.addEventListener('DOMContentLoaded', () => {
    try {
        actualizarHeaderAuth();
        cargarCategoria('social'); 
    } catch (error) {
        console.error("Error crítico al iniciar:", error);
        document.body.innerHTML += `
            <div style="background: var(--danger); padding: 15px; text-align: center; color: white; width: 100%; position: absolute; top: 60px; left: 0; z-index: 1000;">
                <b>Error fatal:</b> ${error.message}
            </div>`;
    }
});