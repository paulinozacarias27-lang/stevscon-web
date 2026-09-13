// ui_alerts.js - Componente de Mensajes y Alertas Flotantes / En Formulario

const UIAlerts = {
    // Mostrar mensaje de error dentro de un contenedor específico
    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-msg" style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: 8px;">
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                <span>${message}</span>
            </div>
        `;
    },

    // Mostrar mensaje de éxito
    showSuccess(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; padding: 10px 14px; background: rgba(139, 92, 246, 0.15); border: 1px solid var(--purple-accent); color: var(--text-main); border-radius: 8px; font-size: 0.9rem;">
                <i class="fa-solid fa-circle-check" style="color: var(--purple-accent);"></i>
                <span>${message}</span>
            </div>
        `;
    },

    // Limpiar alertas anteriores
    clear(containerId) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    }
};