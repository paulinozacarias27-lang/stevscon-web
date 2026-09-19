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
                        <h2 style="font-weight: 800; color: var(--text-main, #ffffff);">Stevscon Accounts</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted, #aaaaaa); margin-top: 4px;">
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
                            <label class="form-label"><i class="fa-solid fa-at"></i> Handle Único (@)</label>
                            <input type="text" id="reg-handle" class="form-input" placeholder="@StevsLoL" required maxlength="20" oninput="UIAuth._validateHandle()">
                            <div id="handle-feedback" style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><i class="fa-solid fa-envelope"></i> Correo Electrónico</label>
                            <input type="email" id="reg-email" class="form-input" placeholder="ejemplo@stevscon.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label"><i class="fa-solid fa-lock"></i> Contraseña para la Web</label>
                            <input type="password" id="reg-password" class="form-input" placeholder="Crea una contraseña segura" required minlength="6" oninput="UIAuth._updatePasswordStrength()">
                            <div id="password-strength" style="margin-top:6px;">
                                <div style="height:6px;border-radius:3px;background:var(--border-color);overflow:hidden;">
                                    <div id="password-strength-bar" style="height:100%;width:0%;transition:width 0.3s ease,background 0.3s ease;"></div>
                                </div>
                                <div id="password-strength-label" style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;"></div>
                            </div>
                        </div>
                        <button type="submit" id="btn-reg-submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                            <i class="fa-solid fa-user-check"></i> Registrarse Ahora
                        </button>
                    </form>
                </div>
            </div>
        `;
    },

    // MEJORA I: valida el handle en tiempo real (solo minusculas, numeros y guion bajo).
    _validateHandle() {
        const input = document.getElementById('reg-handle');
        const feedback = document.getElementById('handle-feedback');
        if (!input || !feedback) return true;
        // Se ignora la @ inicial para la validacion del contenido.
        const raw = input.value.trim().replace(/^@+/, '');
        if (raw.length === 0) {
            feedback.textContent = 'El handle es obligatorio.';
            feedback.style.color = 'var(--danger)';
            return false;
        }
        if (raw.length < 3) {
            feedback.textContent = 'Debe tener al menos 3 caracteres.';
            feedback.style.color = 'var(--danger)';
            return false;
        }
        if (!/^[a-z0-9_]+$/.test(raw.toLowerCase())) {
            feedback.textContent = 'Solo se permiten letras, numeros y guion bajo (_).';
            feedback.style.color = 'var(--danger)';
            return false;
        }
        feedback.textContent = 'Handle valido: @' + raw.toLowerCase();
        feedback.style.color = '#22c55e';
        return true;
    },

    // MEJORA I: medidor visual de fuerza de contraseña.
    _updatePasswordStrength() {
        const input = document.getElementById('reg-password');
        const bar = document.getElementById('password-strength-bar');
        const label = document.getElementById('password-strength-label');
        if (!input || !bar || !label) return;

        const value = input.value;
        let score = 0;
        if (value.length >= 6) score++;
        if (value.length >= 10) score++;
        if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        if (value.length === 0) {
            bar.style.width = '0%';
            label.textContent = '';
            return;
        }

        let width, color, text;
        if (score <= 2) {
            width = '33%'; color = 'var(--danger)'; text = 'Contraseña debil';
        } else if (score === 3 || score === 4) {
            width = '66%'; color = '#eab308'; text = 'Contraseña media';
        } else {
            width = '100%'; color = '#22c55e'; text = 'Contraseña fuerte';
        }
        bar.style.width = width;
        bar.style.background = color;
        label.textContent = text;
        label.style.color = color;
    },

    // Cambiar de pestaña
    switchTab(tab) {
        this.activeTab = tab;
        // MEJORA I: limpiar alertas y feedback al cambiar de pestaña para no arrastrar errores viejos.
        if (typeof UIAlerts !== 'undefined') UIAlerts.clear('auth-alert-box');

        const loginForm = document.getElementById('form-login');
        const regForm = document.getElementById('form-register');
        const tabBtns = document.querySelectorAll('.auth-tab-btn');

        tabBtns.forEach(btn => btn.classList.remove('active'));

        if (tab === 'login') {
            if (tabBtns[0]) tabBtns[0].classList.add('active');
            if (loginForm) loginForm.classList.remove('hidden');
            if (regForm) regForm.classList.add('hidden');
        } else {
            if (tabBtns[1]) tabBtns[1].classList.add('active');
            if (regForm) regForm.classList.remove('hidden');
            if (loginForm) loginForm.classList.add('hidden');
        }

        // Reiniciar el feedback del formulario de registro.
        const handleFeedback = document.getElementById('handle-feedback');
        if (handleFeedback) handleFeedback.textContent = '';
        const passLabel = document.getElementById('password-strength-label');
        const passBar = document.getElementById('password-strength-bar');
        if (passLabel) passLabel.textContent = '';
        if (passBar) passBar.style.width = '0%';
    },

    async handleLoginSubmit(event) {
        event.preventDefault();
        if (typeof UIAlerts !== 'undefined') UIAlerts.clear('auth-alert-box');

        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const submitBtn = document.getElementById('btn-login-submit');

        if (!emailInput || !passwordInput || !submitBtn) {
            console.error("Login form elements not found");
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verificando...`;

            if (typeof FuncAuth !== 'undefined' && FuncAuth.login) {
                await FuncAuth.login({ email, password });

                if (typeof UIAlerts !== 'undefined') {
                    UIAlerts.showSuccess('auth-alert-box', '¡Sesión iniciada con éxito! Redirigiendo...');
                }

                setTimeout(() => {
                    if (typeof CategoryApp !== 'undefined' && CategoryApp.init) {
                        CategoryApp.init();
                    } else if (typeof regresarASocial === 'function') {
                        regresarASocial();
                    } else {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                throw new Error("Módulo de autenticación no encontrado.");
            }
        } catch (error) {
            console.error("Error en Login:", error);
            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showError('auth-alert-box', error.message || 'Error al iniciar sesión.');
            } else {
                alert(error.message || 'Error al iniciar sesión.');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Entrar a mi cuenta`;
        }
    },

    async handleRegisterSubmit(event) {
        event.preventDefault();
        if (typeof UIAlerts !== 'undefined') UIAlerts.clear('auth-alert-box');

        const usernameInput = document.getElementById('reg-username');
        const handleInput = document.getElementById('reg-handle');
        const emailInput = document.getElementById('reg-email');
        const passwordInput = document.getElementById('reg-password');
        const submitBtn = document.getElementById('btn-reg-submit');

        if (!usernameInput || !handleInput || !emailInput || !passwordInput || !submitBtn) {
            console.error("Register form elements not found");
            return;
        }

        // MEJORA I: bloquear el envio si el handle no es valido (validacion en el cliente).
        if (!this._validateHandle()) {
            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showError('auth-alert-box', 'Corrige el handle antes de continuar.');
            }
            handleInput.focus();
            return;
        }

        const username = usernameInput.value;
        const handle = handleInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...`;

            if (typeof FuncAuth !== 'undefined' && FuncAuth.register) {
                await FuncAuth.register({ username, handle, email, password });
            }

            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showSuccess('auth-alert-box', '¡Cuenta creada con éxito! Bienvenido a Stevscon.com.');
            }

            setTimeout(() => {
                if (typeof CategoryApp !== 'undefined' && CategoryApp.init) {
                    CategoryApp.init();
                } else if (typeof regresarASocial === 'function') {
                    regresarASocial();
                } else {
                    window.location.reload();
                }
            }, 1200);
        } catch (error) {
            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showError('auth-alert-box', error.message || 'Error al registrar la cuenta.');
            } else {
                alert(error.message || 'Error al registrar la cuenta.');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> Registrarse Ahora`;
        }
    }
};
