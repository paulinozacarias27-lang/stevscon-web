// save_acc.js — Gestor central de Cuentas y Multicuentas (Firebase como fuente de verdad)
// Todas las cuentas creadas en Stevscon.com se guardan y sincronizan aquí con Firebase.
// localStorage solo guarda la lista de acceso rápido de ESTE dispositivo.

const KEY_SAVED_ACCOUNTS = 'stevscon_saved_accounts';
const KEY_ACTIVE_SESSION = 'stevscon_sesion';

// Campos completos que define una cuenta de Stevscon
const CAMPOS_CUENTA = [
    'id', 'nombre', 'handle', 'gmail', 'password', 'avatar', 'banner',
    'descripcion', 'cumpleanos', 'edad', 'genero', 'provider',
    'verified', 'createdAt', 'rol'
];

// --- UTILIDADES DE CLAVE ---
function claveHandleSave(handle) {
    return String(handle || '')
        .replace('@', '').trim().toLowerCase()
        .replace(/[.#$\[\]\/]/g, '_');
}

// Limpiar un objeto de cuenta para que solo tenga campos válidos
function limpiarCuenta(usuario) {
    if (!usuario || typeof usuario !== 'object') return null;
    const limpia = {};
    CAMPOS_CUENTA.forEach(campo => {
        if (usuario[campo] !== undefined && usuario[campo] !== null) {
            limpia[campo] = usuario[campo];
        }
    });
    return limpia;
}

// --- ACCESO A CUENTAS DESDE FIREBASE (vía memory.js) ---

// Obtiene TODAS las cuentas registradas en la plataforma (de Firebase)
function obtenerTodasLasCuentas() {
    if (typeof obtenerUsuariosGlobales === 'function') {
        return obtenerUsuariosGlobales();
    }
    return [];
}

// Busca una cuenta por handle en la base global de Firebase
function buscarCuentaPorHandle(handle) {
    if (typeof buscarUsuarioGlobal === 'function') {
        return buscarUsuarioGlobal(handle);
    }
    const todas = obtenerTodasLasCuentas();
    const clean = claveHandleSave(handle);
    return todas.find(u => claveHandleSave(u.handle) === clean) || null;
}

// Busca una cuenta por correo electrónico
function buscarCuentaPorGmail(gmail) {
    if (!gmail) return null;
    const lower = gmail.toLowerCase().trim();
    return obtenerTodasLasCuentas().find(u => u && u.gmail && u.gmail.toLowerCase().trim() === lower) || null;
}

// --- GUARDADO COMPLETO EN FIREBASE ---

// Guarda TODOS los datos de una cuenta en Firebase (crea o actualiza)
function guardarCuentaCompleta(usuario) {
    if (!usuario || !usuario.handle) {
        console.warn('guardarCuentaCompleta: se requiere handle');
        return;
    }

    const limpia = limpiarCuenta(usuario);
    if (!limpia) return;

    // Asegurar campos obligatorios
    if (!limpia.id) limpia.id = Date.now();
    if (!limpia.provider) limpia.provider = 'web';
    if (!limpia.verified) limpia.verified = false;
    if (!limpia.rol) limpia.rol = 'user';
    if (!limpia.createdAt) limpia.createdAt = Date.now();
    if (!limpia.avatar) limpia.avatar = '';
    if (!limpia.banner) limpia.banner = '';
    if (!limpia.descripcion) limpia.descripcion = '';
    if (!limpia.cumpleanos) limpia.cumpleanos = '';
    if (!limpia.edad) limpia.edad = '';
    if (!limpia.genero) limpia.genero = '';

    if (typeof guardarUsuarioGlobal === 'function') {
        guardarUsuarioGlobal(limpia);
    }

    return limpia;
}

// Actualiza campos específicos de una cuenta sin pisar los demás
function actualizarCampoCuenta(handle, campo, valor) {
    if (!handle || !campo) return;

    const cuenta = buscarCuentaPorHandle(handle);
    if (!cuenta) {
        console.warn('actualizarCampoCuenta: no se encontró la cuenta', handle);
        return;
    }

    cuenta[campo] = valor;
    guardarCuentaCompleta(cuenta);
}

// Actualiza múltiples campos de perfil a la vez (banner, descripcion, cumple, etc.)
function actualizarPerfilCuenta(handle, datos) {
    if (!handle || !datos) return;

    const cuenta = buscarCuentaPorHandle(handle);
    if (!cuenta) {
        console.warn('actualizarPerfilCuenta: no se encontró la cuenta', handle);
        return;
    }

    // Fusionar los datos nuevos sobre la cuenta existente
    Object.keys(datos).forEach(campo => {
        if (CAMPOS_CUENTA.includes(campo) && datos[campo] !== undefined) {
            cuenta[campo] = datos[campo];
        }
    });

    guardarCuentaCompleta(cuenta);
}

// --- MULTICUENTAS (lista de acceso rápido del dispositivo) ---

// Devuelve las cuentas guardadas en este dispositivo, con datos frescos de Firebase
function obtenerCuentasGuardadas() {
    const guardadas = JSON.parse(localStorage.getItem(KEY_SAVED_ACCOUNTS)) || [];

    return guardadas.map(acc => {
        if (!acc || !acc.handle) return acc;
        const global = buscarCuentaPorHandle(acc.handle);
        // Si está en Firebase, usar los datos de la nube; si no, mantener lo local
        return global ? { ...acc, ...global } : acc;
    }).filter(Boolean);
}

// Sincroniza la sesión activa con la lista de cuentas guardadas del dispositivo
function sincronizarCuentaActual() {
    if (typeof sesionActual === 'undefined' || !sesionActual) return;

    // Guardar la cuenta completa en Firebase
    guardarCuentaCompleta(sesionActual);

    // Actualizar la lista de acceso rápido local
    let guardadas = obtenerCuentasGuardadas();
    const indice = guardadas.findIndex(u => u.handle === sesionActual.handle);

    const snapshot = { handle: sesionActual.handle, nombre: sesionActual.nombre, avatar: sesionActual.avatar || '' };

    if (indice !== -1) {
        guardadas[indice] = { ...guardadas[indice], ...snapshot };
    } else {
        guardadas.push(snapshot);
    }

    localStorage.setItem(KEY_SAVED_ACCOUNTS, JSON.stringify(guardadas));
}

// Olvidar una cuenta de la lista de acceso rápido (no la borra de Firebase)
function olvidarCuenta(handle) {
    let guardadas = obtenerCuentasGuardadas();
    guardadas = guardadas.filter(u => u.handle !== handle);
    localStorage.setItem(KEY_SAVED_ACCOUNTS, JSON.stringify(guardadas));

    if (typeof sesionActual !== 'undefined' && sesionActual && sesionActual.handle === handle) {
        localStorage.removeItem(KEY_ACTIVE_SESSION);
        window.location.reload();
    } else if (typeof renderizarModalMulticuentas === 'function') {
        renderizarModalMulticuentas();
    }
}

// Elimina una cuenta PERMANENTEMENTE de Firebase y de todos los dispositivos
function eliminarCuentaCompletamente(handle) {
    if (!confirm(`¿Estás seguro de ELIMINAR permanentemente la cuenta ${handle}? Esta acción no se puede deshacer.`)) {
        return;
    }

    // Borrado global en Firebase
    if (typeof eliminarUsuarioGlobal === 'function') {
        eliminarUsuarioGlobal(handle);
    }

    olvidarCuenta(handle);
}

// Cambia la sesión activa a otra cuenta guardada
function cambiarAEstaCuenta(handle) {
    // Priorizar los datos frescos de Firebase
    const global = buscarCuentaPorHandle(handle);
    const usuarioObjetivo = global || obtenerCuentasGuardadas().find(u => u.handle === handle);

    if (usuarioObjetivo) {
        if (typeof establecerSesion === 'function') {
            establecerSesion(usuarioObjetivo);
        } else {
            localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(usuarioObjetivo));
        }
        window.location.reload();
    } else {
        alert('No se pudo encontrar la cuenta. Es posible que haya sido eliminada.');
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    sincronizarCuentaActual();
});
