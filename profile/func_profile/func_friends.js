const AdminSystem = {
    ROLES: {
        OWNER: 'Owner',
        ADMIN: 'Admin',
        USER: 'User'
    },

    isAdmin(user) {
        if (!user) return false;
        const role = user.role || this.ROLES.USER;
        return role === this.ROLES.ADMIN || role === this.ROLES.OWNER;
    },

    hasPermission(user, requiredRole) {
        if (!user) return false;
        if (user.role === this.ROLES.OWNER) return true;
        return user.role === requiredRole;
    },

    async setAdminRole(targetHandle, roleToAssign) {
        const currentUser = MemoryAcc.getLocalUser();

        if (!OwnerSystem.isOwner(currentUser)) {
            console.error("Acceso denegado: Solo la cuenta Owner puede modificar permisos de administrador.");
            return false;
        }

        try {
            const targetProfile = await MemoryAcc.getProfileByHandle(targetHandle);
            if (!targetProfile || !targetProfile.uid) {
                console.error("Usuario no encontrado:", targetHandle);
                return false;
            }

            await MemoryAcc.saveUserProfile(targetProfile.uid, {
                role: roleToAssign
            });
            return true;
        } catch (e) {
            console.error("Error setting admin role:", e);
            return false;
        }
    }
};