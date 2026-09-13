// ui_auth.js - Vista de Formularios Cuentas (Login & Register Modal/Screen)

const UIAuth = {
    activeTab: 'login', // 'login' | 'register'

    // Renderiza la tarjeta de cuentas dentro de #app-root
    renderAuthForm(defaultTab = 'login') {
        this.activeTab = defaultTab;
        const root = document.getElementById('app-root');
        if (!root) return;

        root.innerHTML = `
            <div class="auth-container">
                <div class="stevscon-accounts-card">
                    <!-- LOGO Y TÍTULO -->
                    <div class="accounts-header">
                        <i class="fa-solid fa-shield-cat accounts-logo"></i>
                        <h2 style="font-weight: 800; color: var(--text-main);">Stevscon Accounts</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            Ingresa a la comunidad oficial de StevsLoL
                        </p>
                    </div>

                    <!-- PESTAÑAS DUALES (LOGIN / REGISTRO) -->
                    <div class="auth-tabs">
                        <button class="auth-tab-btn ${this.activeTab === 'login' ? 'active' : ''}" onclick="UIAuth.switchTab('login')">
                            <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión
                        </button>
                        <button class="auth-tab-btn ${this.activeTab === 'register' ? 'active' : ''}" onclick="UIAuth.switchTab('register')">
                            <i class="fa-solid fa-user-plus"></i> Crear Cuenta
                        </button>
                    </div>

                    <!-- CONTENEDOR DE ALERTAS -->
                    <div id="auth-alert-box"></div>

                    <!-- FORMULARIO 1: INICIAR SESIÓN -->
                    <form id="form-login" class="${this.activeTab === 'login' ? '' : 'hidden'}" onsubmit="UIAuth.handleLoginSubmit(event)">
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

                    <!-- FORMULARIO 2: CREAR CUENTA -->
                    <form id="form-register" class="${this.activeTab === 'register' ? '' : 'hidden'}" onsubmit="UIAuth.handleRegisterSubmit(event)">
                        <div class="form-group">
                            <label class="form-label"><i class="fa-solid fa-user"></i> Nombre de Usuario</label>
                            <input type="text" id="reg-username" class="form-input" placeholder="Tu Nombre" required maxlength="25">
                        </div>
                        <div class="form-group">
                            <label class="form-label"><i class="fa-solid fa-at"></i> Handle Unico (@)</label>
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
                </div>
            </div>
        `;
    },

    // Cambiar de pestaña
    switchTab(tab) {
        this.activeTab = tab;
        UIAlerts.clear('auth-alert-box');

        const loginForm = document.getElementById('form-login');
        const regForm = document.getElementById('form-register');
        const tabBtns = document.querySelectorAll('.auth-tab-btn');

        tabBtns.forEach(btn => btn.classList.remove('active'));

        if (tab === 'login') {
            tabBtns[0].classList.add('active');
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
        } else {
            tabBtns[1].classList.add('active');
            regForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    },

    // Procesar Inicio de Sesión
    async handleLoginSubmit(event) {
        event.preventDefault();
        UIAlerts.clear('auth-alert-box');

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('btn-login-submit');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verificando...`;

            await FuncAuth.login({ email, password });
            UIAlerts.showSuccess('auth-alert-box', '¡Sesión iniciada con éxito! Redirigiendo...');

            setTimeout(() => {
                if (typeof regresarASocial === 'function') {
                    regresarASocial();
                }
            }, 1000);
        } catch (error) {
            UIAlerts.showError('auth-alert-box', error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi cuenta`;
        }
    },

    // Procesar Registro de Cuenta
    async handleRegisterSubmit(event) {
        event.preventDefault();
        UIAlerts.clear('auth-alert-box');

        const username = document.getElementById('reg-username').value;
        const handle = document.getElementById('reg-handle').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const submitBtn = document.getElementById('btn-reg-submit');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...`;

            await FuncAuth.register({ username, handle, email, password });
            UIAlerts.showSuccess('auth-alert-box', '¡Cuenta creada con éxito! Bienvenido a Stevscon.com.');

            setTimeout(() => {
                if (typeof regresarASocial === 'function') {
                    regresarASocial();
                }
            }, 1200);
        } catch (error) {
            UIAlerts.showError('auth-alert-box', error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> Registrarse Ahora`;
        }
    }
};