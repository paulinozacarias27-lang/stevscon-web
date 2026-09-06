// Lógica y renderizado del icono de Cuenta Verificada con vida visual y Tooltip
function getVerifiedBadgeHTML(usuario) {
    const esVerificado = typeof obtenerEstadoVerificado === 'function' 
        ? obtenerEstadoVerificado(usuario) 
        : (usuario && (usuario.verified || usuario.rol === 'admin' || usuario.rol === 'owner'));

    if (!esVerificado) return '';

    return `
    <span class="verified-badge-icon" 
          title="Miembro verificado de Stevscon.com" 
          onclick="event.stopPropagation();" 
          style="display: inline-flex; align-items: center; color: #00d2ff; filter: drop-shadow(0 0 4px rgba(0, 210, 255, 0.6)); font-size: 0.9em; vertical-align: middle; cursor: pointer;">
        <i class="fa-solid fa-circle-check"></i>
    </span>
    `;
}