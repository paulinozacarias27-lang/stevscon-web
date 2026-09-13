// admin.js - Sistema de jerarquía y verificación de permisos administrativos

const AdminSystem = {
    // Jerarquía de roles
    ROLES: {
        OWNER: 'Owner',
        ADMIN: 'Admin',
        USER: 'User'
    },

    // Comprobar si un usuario es Administrador u Owner
    isAdmin(user) {
        if (!user) return false;
        const role = user.role || this.ROLES.USER;
        return role === this.ROLES.ADMIN || role === this.ROLES.OWNER;
    },

    // Verificar si el usuario tiene permiso para realizar una acción
    hasPermission(user, requiredRole) {
        if (!user) return false;
        // El Owner tiene permisos absolutos para todo
        if (user.role === this.ROLES.OWNER) return true;
        return user.role === requiredRole;
    },

    // Asignar o degradar rol de Administrador (Solo permitido para la cuenta Owner)
    async setAdminRole(targetHandle, roleToAssign) {
        const currentUser = MemoryAcc.getLocalUser();
        
        // Verificación estricta de Owner
        if (!OwnerSystem.isOwner(currentUser)) {
            console.error("Acceso denegado: Solo la cuenta Owner puede modificar permisos de administrador.");
            return false;
        }

        const cleanHandle = targetHandle.replace('@', '').toLowerCase();
        await firebase.database().ref('users/' + cleanHandle).update({
            role: roleToAssign
        });
        return true;
    }
};