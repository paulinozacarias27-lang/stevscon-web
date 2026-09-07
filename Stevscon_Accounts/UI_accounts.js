// UI_accounts.js - Interfaz de Usuario para Stevscon Accounts

let tempGooglePayload = null;

// Vista Portal de Stevscon Accounts
function getStevsconAccountsHTML(modo = 'login') {
    const esLogin = modo === 'login';

    return `
    <div class="card auth-container stevscon-accounts-card" style="position: relative;">
        <div style="position: absolute; top: 15px; right: 15px;">
            ${typeof getBotonCerrarHomeHTML === 'function' ? getBotonCerrarHomeHTML() : ''}
        </div>

        <div class="accounts-header">
            <i class="fa-solid fa-shield-halved accounts-logo"></i>
            <h2 class="auth-title" style="margin: 0;">Stevscon Accounts</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin-top: 4px;">
                Acceso unificado para la red Stevscon
            </p>
        </div>

        <!-- Pestañas de modo -->
        <div class="auth-tabs">
            <button class="auth-tab-btn ${esLogin ? 'active' : ''}" onclick="cargarCategoria('login')">
                <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión
            </button>
            <button class="auth-tab-btn ${!esLogin ? 'active' : ''}" onclick="cargarCategoria('register')">
                <i class="fa-solid fa-user-plus"></i> Crear Cuenta
            </button>
        </div>

        <!-- Botón de autenticación oficial de Google -->
        <div class="google-auth-box">
            <button class="btn btn-google-custom" onclick="simularGoogleAuth()">
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72L.97 13.01C2.47 15.98 5.48 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.87 10.8c-.18-.53-.28-1.1-.28-1.8s.1-1.27.28-1.8L.97 4.99C.35 6.22 0 7.57 0 9s.35 2.78.97 4.01l2.9-2.21z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.47 2.02.97 4.99l2.9 2.21C4.59 5.05 6.62 3.58 9 3.58z"/>
                </svg>
                Continuar con Google
            </button>
        </div>

        <div class="auth-divider">
            <span>o con credenciales web</span>
        </div>

        <div id="auth-form-body">
            ${esLogin ? getFormularioLoginHTML() : getFormularioRegistroHTML()}
        </div>
    </div>
    `;
}

function getLoginHTML() {
    return getStevsconAccountsHTML('login');
}

function getRegisterHTML() {
    return getStevsconAccountsHTML('register');
}

function getFormularioLoginHTML() {
    return `
    <div class="form-group">
        <label class="form-label">Handler (@usuario) o Correo</label>
        <input type="text" id="log-identificador" class="form-input" placeholder="@usuario o correo@gmail.com">
    </div>

    <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" id="log-password" class="form-input" placeholder="Tu contraseña">
        <div id="log-error" class="error-msg"></div>
    </div>

    <button class="btn btn-primary" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px;" onclick="procesarLogin()">
        <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión
    </button>
    `;
}

function getFormularioRegistroHTML() {
    return `
    <div class="form-group">
        <label class="form-label">Nombre visible</label>
        <input type="text" id="reg-nombre" class="form-input" placeholder="Ej: Stevscon Dev">
    </div>
    
    <div class="form-group">
        <label class="form-label">Handler (@usuario único)</label>
        <input type="text" id="reg-handle" class="form-input" placeholder="@ejemplo">
    </div>

    <div class="form-group">
        <label class="form-label">Correo Gmail</label>
        <input type="email" id="reg-gmail" class="form-input" placeholder="correo@gmail.com">
    </div>

    <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" id="reg-password" class="form-input" placeholder="Mínimo 9 caracteres, números y símbolos">
        <div id="reg-error" class="error-msg"></div>
    </div>

    <button class="btn btn-primary" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px;" onclick="procesarRegistro()">
        <i class="fa-solid fa-user-plus"></i> Crear Cuenta
    </button>
    `;
}

// Modal para completar el registro cuando se usa Google por primera vez
function abrirModalCompletarGoogle(googlePayload) {
    tempGooglePayload = googlePayload;

    const modalHTML = `
    <div id="modal-google-complete" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 2000;">
        <div class="card auth-container stevscon-accounts-card" style="width: 90%; max-width: 440px; border: 1px solid var(--purple-accent); box-shadow: 0 0 25px rgba(139, 92, 246, 0.3);">
            
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${googlePayload.picture || ''}" style="width: 65px; height: 65px; border-radius: 50%; border: 2px solid var(--purple-accent); margin-bottom: 10px;">
                <h3 style="margin: 0; color: var(--text-main);">Configura tu Stevscon Account</h3>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                    Sincronizado con: <strong>${googlePayload.email}</strong>
                </p>
            </div>

            <div class="form-group">
                <label class="form-label">Nombre Visible</label>
                <input type="text" id="goog-nombre" class="form-input" value="${googlePayload.name || ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Handler Asignado (@usuario)</label>
                <input type="text" id="goog-handle" class="form-input" placeholder="@tu_usuario">
            </div>

            <div class="form-group">
                <label class="form-label">Crea una Contraseña para Stevscon</label>
                <input type="password" id="goog-password" class="form-input" placeholder="Mínimo 9 caracteres, números y símbolos">
                <div id="goog-error" class="error-msg"></div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn btn-outline" style="flex: 1;" onclick="cerrarModalGoogle()">Cancelar</button>
                <button class="btn btn-primary" style="flex: 2;" onclick="procesarCompletadoGoogle()">Finalizar Cuenta</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModalGoogle() {
    const modal = document.getElementById('modal-google-complete');
    if (modal) modal.remove();
    tempGooglePayload = null;
}

// Simulador interactivo / Conector de Google OAuth 2.0
async function simularGoogleAuth() {
    const emailPrompt = prompt("Paso de autenticación de Google:\nIngresa tu correo de Google para conectarte:", "usuario@gmail.com");
    if (!emailPrompt) return;

    const googlePayloadFake = {
        email: emailPrompt.toLowerCase().trim(),
        name: emailPrompt.split('@')[0],
        picture: "https://lh3.googleusercontent.com/a/default-user",
        sub: "google_" + Date.now(),
        email_verified: true
    };

    // Esperar la base de datos global antes de decidir si la cuenta existe
    if (typeof esperarSincronizacionGlobal === 'function') {
        await esperarSincronizacionGlobal();
    }

    const res = autenticarConGooglePayload(googlePayloadFake);

    if (res.estado === 'LOGGED_IN') {
        if (typeof actualizarHeaderAuth === 'function') actualizarHeaderAuth();
        if (typeof cargarCategoria === 'function') cargarCategoria('social');
        alert(`¡Bienvenido de nuevo, ${res.usuario.nombre}!`);
    } else if (res.estado === 'NEEDS_COMPLETION') {
        abrirModalCompletarGoogle(res.googleData);
    }
}

function procesarCompletadoGoogle() {
    if (!tempGooglePayload) return;

    const nombre = document.getElementById('goog-nombre').value;
    const handle = document.getElementById('goog-handle').value;
    const pass = document.getElementById('goog-password').value;
    const errorBox = document.getElementById('goog-error');

    if (!nombre || !handle || !pass) {
        errorBox.innerText = "Por favor, completa todos los campos requeridos.";
        errorBox.style.display = 'block';
        return;
    }

    const resultado = registrarCuentaGoogle(tempGooglePayload, handle, pass, nombre);
    if (resultado.exito) {
        cerrarModalGoogle();
        if (typeof actualizarHeaderAuth === 'function') actualizarHeaderAuth();
        if (typeof cargarCategoria === 'function') cargarCategoria('social');
        alert(resultado.msj);
    } else {
        errorBox.innerText = resultado.msj;
        errorBox.style.display = 'block';
    }
}

async function procesarRegistro() {
    if (typeof esperarSincronizacionGlobal === 'function') {
        await esperarSincronizacionGlobal();
    }

    const nombre = document.getElementById('reg-nombre').value;
    const handle = document.getElementById('reg-handle').value;
    const gmail = document.getElementById('reg-gmail').value;
    const pass = document.getElementById('reg-password').value;
    const errorBox = document.getElementById('reg-error');

    if (!nombre || !handle || !gmail || !pass) {
        errorBox.innerText = "Por favor, llena todos los campos.";
        errorBox.style.display = 'block';
        return;
    }

    const resultado = registrarCuenta(nombre, handle, gmail, pass);
    if (resultado.exito) {
        // Auto-login: la sesión se establece en registrarCuenta
        if (resultado.usuario) {
            if (typeof establecerSesion === 'function') {
                establecerSesion(resultado.usuario);
            }
        }
        if (typeof actualizarHeaderAuth === 'function') actualizarHeaderAuth();
        if (typeof cargarCategoria === 'function') cargarCategoria('social');
        alert(resultado.msj);
    } else {
        errorBox.innerText = resultado.msj;
        errorBox.style.display = 'block';
    }
}

async function procesarLogin() {
    const identificador = document.getElementById('log-identificador').value;
    const pass = document.getElementById('log-password').value;
    const errorBox = document.getElementById('log-error');

    // En un dispositivo nuevo (celular/iPad) hay que esperar los datos de la nube
    if (typeof esperarSincronizacionGlobal === 'function') {
        errorBox.innerText = "Conectando con el servidor...";
        errorBox.style.display = 'block';
        await esperarSincronizacionGlobal();
        errorBox.style.display = 'none';
    }

    if (iniciarSesionDB(identificador, pass)) {
        if (typeof actualizarHeaderAuth === 'function') actualizarHeaderAuth();
        if (typeof cargarCategoria === 'function') cargarCategoria('social');
    } else {
        errorBox.innerText = "Usuario/Correo o contraseña incorrectos.";
        errorBox.style.display = 'block';
    }
}