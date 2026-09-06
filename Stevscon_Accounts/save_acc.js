// save_acc.js - Gestor de Multicuentas Local

const KEY_SAVED_ACCOUNTS = 'stevscon_saved_accounts';
const KEY_USERS_DB = 'stevscon_usuarios';
const KEY_ACTIVE_SESSION = 'stevscon_sesion';

function obtenerCuentasGuardadas() {
    return JSON.parse(localStorage.getItem(KEY_SAVED_ACCOUNTS)) || [];
}

function sincronizarCuentaActual() {
    if (typeof sesionActual === 'undefined' || !sesionActual) return;

    let guardadas = obtenerCuentasGuardadas();
    const indice = guardadas.findIndex(u => u.handle === sesionActual.handle);

    if (indice !== -1) {
        guardadas[indice] = { ...sesionActual };
    } else {
        guardadas.push({ ...sesionActual });
    }

    localStorage.setItem(KEY_SAVED_ACCOUNTS, JSON.stringify(guardadas));
}

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

function eliminarCuentaCompletamente(handle) {
    if (!confirm(`¿Estás seguro de ELIMINAR permanentemente la cuenta ${handle}? Esta acción no se puede deshacer.`)) {
        return;
    }

    let dbUsuarios = JSON.parse(localStorage.getItem(KEY_USERS_DB)) || [];
    dbUsuarios = dbUsuarios.filter(u => u.handle !== handle);
    localStorage.setItem(KEY_USERS_DB, JSON.stringify(dbUsuarios));

    olvidarCuenta(handle);
}

function cambiarAEstaCuenta(handle) {
    const guardadas = obtenerCuentasGuardadas();
    const usuarioObjetivo = guardadas.find(u => u.handle === handle);

    if (usuarioObjetivo) {
        localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify(usuarioObjetivo));
        window.location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    sincronizarCuentaActual();
});