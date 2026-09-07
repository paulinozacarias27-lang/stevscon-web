// accounts.js - Motor de Base de Datos y Lógica de Autenticación Sincronizado

// dbUsuarios es solo un alias de los datos globales de Firebase (memory.js)
var dbUsuarios = typeof obtenerUsuariosGlobales === 'function' ? obtenerUsuariosGlobales() : [];

var sesionActual = typeof obtenerSesionGuardada === 'function' ? obtenerSesionGuardada() : null;

// Devuelve siempre la lista de cuentas más reciente de la nube
function refrescarUsuarios() {
    dbUsuarios = typeof obtenerUsuariosGlobales === 'function' ? obtenerUsuariosGlobales() : dbUsuarios;
    return dbUsuarios;
}

// Fija la sesión activa a partir del perfil global
function establecerSesion(usuario) {
    sesionActual = usuario;
    if (typeof guardarSesionLocal === 'function') {
        guardarSesionLocal(usuario);
    } else {
        localStorage.setItem('stevscon_sesion', JSON.stringify(usuario));
    }
    if (typeof sincronizarCuentaActual === 'function') sincronizarCuentaActual();
}

// Expresión regular para validar la contraseña
const regexPassword = /^(?=.*[0-9])(?=.*[!@#$%^&*_\-+=]).{9,}$/;

// Registrar una nueva cuenta web tradicional
function registrarCuenta(nombre, handle, gmail, password) {
    if (!handle.startsWith('@')) handle = '@' + handle;
    handle = handle.toLowerCase().trim();
    gmail = gmail.toLowerCase().trim();

    refrescarUsuarios();

    const existeHandle = dbUsuarios.find(u => u.handle === handle);
    if (existeHandle) return { exito: false, msj: "El nombre de usuario (@handle) ya está ocupado." };

    const existeGmail = dbUsuarios.find(u => u.gmail === gmail);
    if (existeGmail) return { exito: false, msj: "El correo electrónico ya está registrado." };

    if (!regexPassword.test(password)) {
        return { 
            exito: false, 
            msj: "La contraseña debe tener al menos 9 caracteres, e incluir números y un símbolo (ej: @, _, -)." 
        };
    }

    const nuevoUsuario = {
        id: Date.now(),
        nombre: nombre.trim(),
        handle: handle,
        gmail: gmail,
        password: password,
        avatar: "",
        provider: 'web',
        verified: false,
        createdAt: Date.now(),
        rol: typeof obtenerRolUsuario === 'function' ? obtenerRolUsuario(handle) : 'user'
    };

    // Guardado global: la cuenta queda disponible en cualquier dispositivo
    if (typeof guardarUsuarioGlobal === 'function') {
        guardarUsuarioGlobal(nuevoUsuario);
    }
    refrescarUsuarios();

    if (typeof enviarCorreoBienvenidaBot === 'function') {
        enviarCorreoBienvenidaBot(nuevoUsuario.nombre, nuevoUsuario.gmail, nuevoUsuario.handle);
    }

    return { exito: true, msj: "Cuenta de Stevscon creada con éxito." };
}

// Registrar o completar la vinculación de cuenta mediante Google
function registrarCuentaGoogle(googlePayload, handle, password, nombrePersonalizado) {
    if (!handle.startsWith('@')) handle = '@' + handle;
    handle = handle.toLowerCase().trim();
    const gmail = googlePayload.email.toLowerCase().trim();

    refrescarUsuarios();

    const existeHandle = dbUsuarios.find(u => u.handle === handle);
    if (existeHandle) return { exito: false, msj: "El @handle seleccionado ya está en uso." };

    const existeGmail = dbUsuarios.find(u => u.gmail === gmail);
    if (existeGmail) return { exito: false, msj: "Este correo de Google ya tiene una cuenta activa." };

    if (!regexPassword.test(password)) {
        return { 
            exito: false, 
            msj: "La contraseña debe tener al menos 9 caracteres, incluir números y un símbolo especial." 
        };
    }

    const nuevoUsuario = {
        id: Date.now(),
        nombre: nombrePersonalizado ? nombrePersonalizado.trim() : (googlePayload.name || "Usuario Google"),
        handle: handle,
        gmail: gmail,
        password: password,
        avatar: googlePayload.picture || "",
        provider: 'google',
        googleId: googlePayload.sub || "",
        verified: googlePayload.email_verified || false,
        createdAt: Date.now(),
        rol: typeof obtenerRolUsuario === 'function' ? obtenerRolUsuario(handle) : 'user'
    };

    if (typeof guardarUsuarioGlobal === 'function') {
        guardarUsuarioGlobal(nuevoUsuario);
    }
    refrescarUsuarios();

    establecerSesion(nuevoUsuario);

    if (typeof enviarCorreoBienvenidaBot === 'function') {
        enviarCorreoBienvenidaBot(nuevoUsuario.nombre, nuevoUsuario.gmail, nuevoUsuario.handle);
    }

    return { exito: true, msj: "¡Bienvenido a Stevscon Accounts! Tu cuenta con Google fue configurada correctamente." };
}

// Iniciar sesión tradicional
function iniciarSesionDB(identificador, password) {
    identificador = identificador.toLowerCase().trim();

    // Siempre contra la lista global sincronizada desde Firebase
    refrescarUsuarios();

    const usuario = dbUsuarios.find(u => 
        u && ((u.handle || '').toLowerCase() === identificador || (u.gmail || '').toLowerCase() === identificador) && 
        u.password === password
    );

    if (usuario) {
        establecerSesion(usuario);

        if (typeof enviarCorreoBienvenidaBot === 'function') {
            enviarCorreoBienvenidaBot(usuario.nombre, usuario.gmail, usuario.handle);
        }

        return true;
    }
    return false;
}

// Verificar inicio de sesión con Google (Sincronización forzada para móviles/iPad)
function autenticarConGooglePayload(googlePayload) {
    const gmail = googlePayload.email.toLowerCase().trim();

    // 1. Leer siempre la base de datos global de Firebase
    refrescarUsuarios();

    // 2. Buscar si la cuenta ya existe por Gmail
    let usuarioExistente = dbUsuarios.find(u => u && u.gmail && u.gmail.toLowerCase().trim() === gmail);

    if (usuarioExistente) {
        // Actualizar foto de perfil si no tenía una asignada
        if (!usuarioExistente.avatar && googlePayload.picture) {
            usuarioExistente.avatar = googlePayload.picture;
            if (typeof guardarUsuarioGlobal === 'function') {
                guardarUsuarioGlobal(usuarioExistente);
            }
        }

        // Establecer sesión activa
        establecerSesion(usuarioExistente);

        if (typeof enviarCorreoBienvenidaBot === 'function') {
            enviarCorreoBienvenidaBot(usuarioExistente.nombre, usuarioExistente.gmail, usuarioExistente.handle);
        }

        return { estado: 'LOGGED_IN', usuario: usuarioExistente };
    }

    // Solo si realmente no existe en la base de datos global pide completar registro
    return { estado: 'NEEDS_COMPLETION', googleData: googlePayload };
}

function cerrarSesion() {
    sesionActual = null;
    localStorage.removeItem('stevscon_sesion');
    location.reload();
}