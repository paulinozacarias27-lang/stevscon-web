// category.js - Enrutador Principal Robusto

const CategoryApp = {
    init() {
        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        const currentUser = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser) 
            ? MemoryAcc.getLocalUser() 
            : null;

        if (!currentUser) {
            this.navigate('auth');
        } else {
            this.navigate('home');
        }
    },

    navigate(view, params = {}) {
        const root = document.getElementById('app-root');
        if (!root) return;

        const currentUser = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser) 
            ? MemoryAcc.getLocalUser() 
            : null;

        if (view === 'auth' || !currentUser) {
            if (typeof UIAuth !== 'undefined' && UIAuth.renderAuthForm) {
                UIAuth.renderAuthForm(params.tab || 'login');
            } else {
                root.innerHTML = '<p style="color:white; text-align:center; padding: 20px;">Cargando formulario de autenticación...</p>';
            }
        } else {
            this.renderHomeScreen(root, currentUser);
        }
    },

    renderHomeScreen(container, user) {
        container.innerHTML = `
            <div class="card" style="max-width: 600px; margin: 40px auto; text-align: center; padding: 35px 25px;">
                <div class="avatar" style="width: 75px; height: 75px; font-size: 2.2rem; margin: 0 auto 15px auto;">
                    ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <h2 style="font-size: 1.8rem; margin-bottom: 5px;">¡Bienvenido, ${user.username}!</h2>
                <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 15px;">${user.handle || ''}</p>
                
                <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 18px; text-align: left; font-size: 0.9rem; color: var(--text-muted);">
                    <p style="margin-bottom: 8px;"><strong style="color: var(--text-main);">Correo:</strong> ${user.email || 'N/A'}</p>
                    <p><strong style="color: var(--text-main);">Estado:</strong> Sesión activa en Stevscon Accounts.</p>
                </div>
            </div>
        `;
    }
};

function regresarASocial() {
    CategoryApp.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CategoryApp.init());
} else {
    CategoryApp.init();
}