// accounts.js - Motor de Base de Datos y Lógica de Autenticación Sincronizado

let dbUsuarios = typeof globalAccountsData !== 'undefined' && globalAccountsData.length > 0 
    ? globalAccountsData 
    : (JSON.parse(localStorage.getItem('stevscon_usuarios')) || []);

let sesionActual = JSON.parse(localStorage.getItem('stevscon_sesion')) || null;

// Expresión regular para validar la contraseña
const regexPassword = /^(?=.*[0-9])(?=.*[!@#$%^&*_\-+=]).{9,}$/;

// Registrar una nueva cuenta web tradicional
function registrarCuenta(nombre, handle, gmail, password) {
    if (!handle.startsWith('@')) handle = '@' + handle;
    handle = handle.toLowerCase().trim();
    gmail = gmail.toLowerCase().trim();

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

    dbUsuarios.push(nuevoUsuario);
    localStorage.setItem('stevscon_usuarios', JSON.stringify(dbUsuarios));
    
    // Sincronización en la nube mediante Firebase
    if (typeof guardarCuentasGlobales === 'function') {
        guardarCuentasGlobales(dbUsuarios);
    }
    
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

    dbUsuarios.push(nuevoUsuario);
    localStorage.setItem('stevscon_usuarios', JSON.stringify(dbUsuarios));

    if (typeof guardarCuentasGlobales === 'function') {
        guardarCuentasGlobales(dbUsuarios);
    }

    sesionActual = nuevoUsuario;
    localStorage.setItem('stevscon_sesion', JSON.stringify(sesionActual));
    if (typeof sincronizarCuentaActual === 'function') sincronizarCuentaActual();

    if (typeof enviarCorreoBienvenidaBot === 'function') {
        enviarCorreoBienvenidaBot(nuevoUsuario.nombre, nuevoUsuario.gmail, nuevoUsuario.handle);
    }

    return { exito: true, msj: "¡Bienvenido a Stevscon Accounts! Tu cuenta con Google fue configurada correctamente." };
}

// Iniciar sesión tradicional
function iniciarSesionDB(identificador, password) {
    identificador = identificador.toLowerCase().trim();

    // Actualizar referencia por si llegaron datos de Firebase
    if (typeof globalAccountsData !== 'undefined' && globalAccountsData.length > 0) {
        dbUsuarios = globalAccountsData;
    }
    
    const usuario = dbUsuarios.find(u => 
        (u.handle === identificador || u.gmail === identificador) && 
        u.password === password
    );

    if (usuario) {
        sesionActual = usuario;
        localStorage.setItem('stevscon_sesion', JSON.stringify(sesionActual));
        if (typeof sincronizarCuentaActual === 'function') sincronizarCuentaActual();

        if (typeof enviarCorreoBienvenidaBot === 'function') {
            enviarCorreoBienvenidaBot(usuario.nombre, usuario.gmail, usuario.handle);
        }

        return true;
    }
    return false;
}

// Verificar inicio de sesión con Google
function autenticarConGooglePayload(googlePayload) {
    const gmail = googlePayload.email.toLowerCase().trim();

    if (typeof globalAccountsData !== 'undefined' && globalAccountsData.length > 0) {
        dbUsuarios = globalAccountsData;
    }

    const usuarioExistente = dbUsuarios.find(u => u.gmail === gmail);

    if (usuarioExistente) {
        if (!usuarioExistente.avatar && googlePayload.picture) {
            usuarioExistente.avatar = googlePayload.picture;
            if (typeof guardarCuentasGlobales === 'function') {
                guardarCuentasGlobales(dbUsuarios);
            }
        }
        sesionActual = usuarioExistente;
        localStorage.setItem('stevscon_usuarios', JSON.stringify(dbUsuarios));
        localStorage.setItem('stevscon_sesion', JSON.stringify(sesionActual));
        if (typeof sincronizarCuentaActual === 'function') sincronizarCuentaActual();

        if (typeof enviarCorreoBienvenidaBot === 'function') {
            enviarCorreoBienvenidaBot(usuarioExistente.nombre, usuarioExistente.gmail, usuarioExistente.handle);
        }

        return { estado: 'LOGGED_IN', usuario: usuarioExistente };
    } else {
        return { estado: 'NEEDS_COMPLETION', googleData: googlePayload };
    }
}

function cerrarSesion() {
    sesionActual = null;
    localStorage.removeItem('stevscon_sesion');
    location.reload();
}