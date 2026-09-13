// category.js - Enrutador Principal Robusto con Fallback
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
                this.renderFallbackAuth(root, params.tab || 'login');
            }
        } else {
            this.renderHomeScreen(root, currentUser);
        }
    },

    renderFallbackAuth(container, tab = 'login') {
        const isLogin = tab === 'login';
        container.innerHTML = `
            <div style="max-width: 400px; margin: 40px auto; padding: 30px; background: #12121a; border: 1px solid #232333; border-radius: 12px; color: #fff; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                <h2 style="margin-bottom: 20px; font-size: 1.5rem; color: #fff;">Stevscon Accounts</h2>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px; background: #1a1a26; padding: 4px; border-radius: 8px;">
                    <button onclick="CategoryApp.renderFallbackAuth(document.getElementById('app-root'), 'login')" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: ${isLogin ? '#6366f1' : 'transparent'}; color: white; cursor: pointer; font-weight: bold;">Iniciar Sesión</button>
                    <button onclick="CategoryApp.renderFallbackAuth(document.getElementById('app-root'), 'register')" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: ${!isLogin ? '#6366f1' : 'transparent'}; color: white; cursor: pointer; font-weight: bold;">Registrarse</button>
                </div>

                <form onsubmit="event.preventDefault(); alert('${isLogin ? 'Iniciando sesión...' : 'Registrando cuenta...'}');" style="display: flex; flex-direction: column; gap: 14px;">
                    ${!isLogin ? `<input type="text" placeholder="Nombre de usuario" required style="padding: 12px; background: #1a1a26; border: 1px solid #333; color: white; border-radius: 6px; outline: none;">` : ''}
                    <input type="email" placeholder="Correo electrónico" required style="padding: 12px; background: #1a1a26; border: 1px solid #333; color: white; border-radius: 6px; outline: none;">
                    <input type="password" placeholder="Contraseña" required style="padding: 12px; background: #1a1a26; border: 1px solid #333; color: white; border-radius: 6px; outline: none;">
                    <button type="submit" style="padding: 12px; background: #6366f1; border: none; color: white; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px;">
                        ${isLogin ? 'Ingresar' : 'Crear Cuenta'}
                    </button>
                </form>
            </div>
        `;
    },

    renderHomeScreen(container, user) {
        container.innerHTML = `
            <div style="max-width: 600px; margin: 40px auto; text-align: center; padding: 35px 25px; background: #12121a; border: 1px solid #232333; border-radius: 12px; color: white;">
                <div style="width: 75px; height: 75px; font-size: 2.2rem; margin: 0 auto 15px auto; background: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <h2 style="font-size: 1.8rem; margin-bottom: 5px;">¡Bienvenido, ${user.username}!</h2>
                <p style="color: #aaa; font-size: 1rem; margin-bottom: 15px;">${user.handle || ''}</p>
                <div style="background: #1a1a26; border: 1px solid #333; border-radius: 10px; padding: 18px; text-align: left; font-size: 0.9rem; color: #aaa;">
                    <p style="margin-bottom: 8px;"><strong style="color: #fff;">Correo:</strong> ${user.email || 'N/A'}</p>
                    <p><strong style="color: #fff;">Estado:</strong> Sesión activa en Stevscon Accounts.</p>
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