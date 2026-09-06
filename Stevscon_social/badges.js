// Lógica, UI e interacción de Badges (Insignias) al estilo Discord

function renderBadgesHTML(usuario) {
    const listaKeys = typeof obtenerInsigniasUsuario === 'function' 
        ? obtenerInsigniasUsuario(usuario) 
        : (usuario?.badges || []);

    if (!listaKeys || listaKeys.length === 0) return '';

    const badgesHTML = listaKeys.map(key => {
        const info = BADGES_DATABASE[key];
        if (!info) return '';

        return `
        <div class="badge-item-discord" 
             tabindex="0"
             onclick="mostrarDetalleBadge(event, '${info.nombre}', '${info.descripcion}')"
             title="${info.nombre}: ${info.descripcion}">
            <i class="${info.icono}"></i>
            <span class="badge-tooltip-popover">${info.descripcion}</span>
        </div>
        `;
    }).join('');

    return `<div class="badges-container-discord">${badgesHTML}</div>`;
}

function mostrarDetalleBadge(event, nombre, descripcion) {
    event.stopPropagation();
    const tooltipExistente = document.getElementById('badge-custom-toast');
    if (tooltipExistente) tooltipExistente.remove();

    const toast = document.createElement('div');
    toast.id = 'badge-custom-toast';
    toast.className = 'badge-toast-popup';
    toast.innerHTML = `<strong>${nombre}</strong><p>${descripcion}</p>`;
    
    document.body.appendChild(toast);

    const rect = event.currentTarget.getBoundingClientRect();
    toast.style.top = `${rect.top - 45}px`;
    toast.style.left = `${rect.left + (rect.width / 2)}px`;

    setTimeout(() => {
        if (toast) toast.remove();
    }, 2500);
}