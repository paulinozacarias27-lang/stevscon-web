// Genera el botón circular con icono 'X'
function getBotonCerrarHomeHTML(estiloExtra = '') {
    return `
        <button type="button" 
                class="btn-cerrar-circulo" 
                onclick="regresarASocial()" 
                title="Cerrar y volver a Social"
                style="background: rgba(255,255,255,0.1); border: 1px solid var(--border-color, #333); color: var(--text-muted, #a0a0a0); width: 32px; height: 32px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; padding: 0; ${estiloExtra}"
                onmouseover="this.style.color='#fff'; this.style.background='var(--danger, red)'; this.style.transform='scale(1.1)';"
                onmouseout="this.style.color='var(--text-muted, #a0a0a0)'; this.style.background='rgba(255,255,255,0.1)'; this.style.transform='scale(1)';">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
}

// Función global para cerrar modales y regresar a Social
function regresarASocial() {
    const modales = document.querySelectorAll('#mini-perfil-social, .modal-flotante, .menu-desplegable');
    modales.forEach(modal => modal.remove());

    if (typeof cargarCategoria === 'function') {
        cargarCategoria('social');
    }

    if (typeof actualizarNotificacionesGlobales === 'function') {
        actualizarNotificacionesGlobales();
    }
    
    setTimeout(() => {
        if (typeof actualizarNotificacionesGlobales === 'function') {
            actualizarNotificacionesGlobales();
        }
    }, 100);
}