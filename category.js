// category.js - Enrutador Principal Autónomo y Robusto
const CategoryApp = {
    init() {
        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        const currentUser = this.getUserSession();

        if (!currentUser) {
            this.navigate('auth');
        } else {
            this.navigate('home', { user: currentUser });
        }
    },

    getUserSession() {
        if (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser) {
            const user = MemoryAcc.getLocalUser();
            if (user) return user;
        }
        const stored = localStorage.getItem('stevscon_user');
        return stored ? JSON.parse(stored) : null;
    },

    setUserSession(user) {
        if (typeof MemoryAcc !== 'undefined' && MemoryAcc.setLocalUser) {
            MemoryAcc.setLocalUser(user);
        }
        localStorage.setItem('stevscon_user', JSON.stringify(user));
    },

    navigate(view, params = {}) {
        const root = document.getElementById('app-root');
        if (!root) return;

        const currentUser = this.getUserSession();

        if (view === 'auth' && !currentUser) {
            if (typeof UIAuth !== 'undefined' && UIAuth.renderAuthForm) {
                UIAuth.renderAuthForm(params.tab || 'login');
            } else {
                this.renderFallbackAuth(root, params.tab || 'login');
            }
        } else if (currentUser) {
            this.renderHomeScreen(root, currentUser);
        } else {
            this.renderFallbackAuth(root, 'login');
        }
    },

    renderFallbackAuth(container, tab = 'login') {
        const isLogin = tab === 'login';
        
        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        container.innerHTML = `
            <div class="auth-container">
                <div class="stevscon-accounts-card">
                    <div class="accounts-header">
                        <i class="fa-solid fa-shield-cat accounts-logo"></i>
                        <h2 style="font-weight: 800; color: var(--text-main, #ffffff);">Stevscon Accounts</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted, #aaaaaa); margin-top: 4px;">
                            Ingresa a la comunidad oficial de StevsLoL
                        </p>
                    </div>

                    <div class="auth-tabs">
                        <button class="auth-tab-btn ${isLogin ? 'active' : ''}" onclick="CategoryApp.renderFallbackAuth(document.getElementById('app-root'), 'login')">
                            <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión
                        </button>
                        <button class="auth-tab-btn ${!isLogin ? 'active' : ''}" onclick="CategoryApp.renderFallbackAuth(document.getElementById('app-root'), 'register')">
                            <i class="fa-solid fa-user-plus"></i> Crear Cuenta
                        </button>
                    </div>

                    <div id="auth-alert-box"></div>

                    ${isLogin ? `
                        <form id="form-login" onsubmit="CategoryApp.handleFallbackLogin(event)">
                            <div class="form-group">
                                <label class="form-label"><i class="fa-solid fa-envelope"></i> Correo Electrónico</label>
                                <input type="email" id="login-email" class="form-input" placeholder="ejemplo@stevscon.com" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label"><i class="fa-solid fa-lock"></i> Contraseña</label>
                                <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                            </div>
                            <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                                <i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi cuenta
                            </button>
                        </form>
                    ` : `
                        <form id="form-register" onsubmit="CategoryApp.handleFallbackRegister(event)">
                            <div class="form-group">
                                <label class="form-label"><i class="fa-solid fa-user"></i> Nombre de Usuario</label>
                                <input type="text" id="reg-username" class="form-input" placeholder="Tu Nombre" required maxlength="25">
                            </div>
                            <div class="form-group">
                                <label class="form-label"><i class="fa-solid fa-at"></i> Handle Único (@)</label>
                                <input type="text" id="reg-handle" class="form-input" placeholder="@StevsLoL" required maxlength="20">
                            </div>
                            <div class="form-group">
                                <label class="form-label"><i class="fa-solid fa-envelope"></i> Correo Electrónico</label>
                                <input type="email" id="reg-email" class="form-input" placeholder="ejemplo@stevscon.com" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label"><i class="fa-solid fa-lock"></i> Contraseña para la Web</label>
                                <input type="password" id="reg-password" class="form-input" placeholder="Crea una contraseña segura" required minlength="6">
                            </div>
                            <button type="submit" id="btn-reg-submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                                <i class="fa-solid fa-user-check"></i> Registrarse Ahora
                            </button>
                        </form>
                    `}
                </div>
            </div>
        `;
    },

    handleFallbackLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const username = email.split('@')[0] || 'Usuario';

        const user = {
            username: username,
            handle: '@' + username.toLowerCase(),
            email: email
        };

        this.setUserSession(user);
        this.showAlert('¡Sesión iniciada con éxito! Redirigiendo...');

        setTimeout(() => {
            this.init();
        }, 1000);
    },

    handleFallbackRegister(event) {
        event.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        let handle = document.getElementById('reg-handle').value.trim();
        const email = document.getElementById('reg-email').value.trim();

        if (!handle.startsWith('@')) handle = '@' + handle;

        const user = {
            username: username,
            handle: handle,
            email: email
        };

        this.setUserSession(user);
        this.showAlert('¡Has ingresado exitosamente! Bienvenido a Stevscon.');

        setTimeout(() => {
            this.init();
        }, 1000);
    },

    showAlert(message) {
        const box = document.getElementById('auth-alert-box');
        if (box) {
            box.innerHTML = `
                <div style="padding: 10px 14px; background: rgba(139, 92, 246, 0.2); border: 1px solid #8b5cf6; color: #ffffff; border-radius: 8px; margin-bottom: 15px; font-size: 0.88rem; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-circle-check" style="color: #8b5cf6;"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    },

    renderHomeScreen(container, user) {
        container.innerHTML = `
            <div style="max-width: 600px; margin: 40px auto; text-align: center; padding: 35px 25px; background: #12121a; border: 1px solid #232333; border-radius: 12px; color: white;">
                <div style="width: 75px; height: 75px; font-size: 2.2rem; margin: 0 auto 15px auto; background: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <h2 style="font-size: 1.8rem; margin-bottom: 5px;">¡Bienvenido, ${user.username}!</h2>
                <p style="color: #aaa; font-size: 1rem; margin-bottom: 15px;">${user.handle || ''}</p>
                <div style="background: #1a1a26; border: 1px solid #333; border-radius: 10px; padding: 18px; text-align: left; font-size: 0.9rem; color: #aaa; margin-bottom: 20px;">
                    <p style="margin-bottom: 8px;"><strong style="color: #fff;">Correo:</strong> ${user.email || 'N/A'}</p>
                    <p><strong style="color: #fff;">Estado:</strong> Sesión activa en Stevscon Accounts.</p>
                </div>
                <button onclick="localStorage.removeItem('stevscon_user'); location.reload();" class="btn btn-outline" style="padding: 10px 20px; border: 1px solid #ef4444; color: #ef4444; background: transparent; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    Cerrar Sesión
                </button>
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