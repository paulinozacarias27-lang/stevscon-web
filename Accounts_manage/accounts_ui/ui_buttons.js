// ui_buttons.js - Botones de Navbar con protección contra fallos

const UIButtons = {
    renderHeaderAuth() {
        const container = document.getElementById('auth-header-section');
        if (!container) return;

        // Comprobación segura: no se rompe si MemoryAcc no existe
        const activeUser = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser) 
            ? MemoryAcc.getLocalUser() 
            : null;

        if (activeUser) {
            const isOwner = (typeof OwnerSystem !== 'undefined' && OwnerSystem.isOwner) ? OwnerSystem.isOwner(activeUser) : false;
            const isAdmin = (typeof AdminSystem !== 'undefined' && AdminSystem.isAdmin) ? AdminSystem.isAdmin(activeUser) : false;
            
            let badgeIcon = '';
            if (isOwner) {
                badgeIcon = `<i class="fa-solid fa-crown" style="color: #f59e0b;" title="Owner"></i>`;
            } else if (isAdmin) {
                badgeIcon = `<i class="fa-solid fa-shield-halved" style="color: var(--purple-accent);" title="Admin"></i>`;
            }

            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 38px; height: 38px; font-size: 0.9rem;">
                        ${activeUser.username ? activeUser.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="display: flex; flex-direction: column; line-height: 1.2;">
                        <span style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                            ${activeUser.username || 'Usuario'} ${badgeIcon}
                        </span>
                        <span style="font-size: 0.78rem; color: var(--text-muted);">${activeUser.handle || ''}</span>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="if(typeof FuncAuth !== 'undefined') FuncAuth.logout();" style="margin-left: 10px;">
                        <i class="fa-solid fa-right-from-bracket"></i> Salir
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <button class="btn btn-outline btn-sm" onclick="if(typeof UIAuth !== 'undefined') UIAuth.renderAuthForm('login')">
                    <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión
                </button>
                <button class="btn btn-primary btn-sm" onclick="if(typeof UIAuth !== 'undefined') UIAuth.renderAuthForm('register')">
                    <i class="fa-solid fa-user-plus"></i> Crear Cuenta
                </button>
            `;
        }
    }
};

// Ejecución segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UIButtons.renderHeaderAuth());
} else {
    UIButtons.renderHeaderAuth();
}