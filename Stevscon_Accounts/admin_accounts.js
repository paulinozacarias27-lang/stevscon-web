// admin_accounts.js - Jerarquía de Permisos y Administración

const ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    OWNER: 'owner'
};

const ADMIN_LIST = ['@stevslol', '@admin_principal'];

function esAdministrador(handle) {
    if (!handle) return false;
    const cleanHandle = handle.toLowerCase().trim();
    return ADMIN_LIST.includes(cleanHandle);
}

function obtenerRolUsuario(handle) {
    if (!handle) return ROLES.USER;
    const cleanHandle = handle.toLowerCase().trim();
    if (cleanHandle === '@stevslol') return ROLES.OWNER;
    if (esAdministrador(cleanHandle)) return ROLES.ADMIN;
    return ROLES.USER;
}