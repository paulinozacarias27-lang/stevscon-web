// owner.js - Identidad, privilegios e inmutabilidad de la cuenta Owner (Top 1)

const OWNER_CONFIG = {
    email: "steven23hd@gmail.com",
    username: "StevsLoL",
    handle: "@StevsLoL",
    role: "Owner",
    rank: 1,
    badge: "👑 Owner / Creator"
};

const OwnerSystem = {
    // Verifica si el usuario proporcionado es la cuenta Owner oficial
    isOwner(user) {
        if (!user) return false;
        const userEmail = (user.email || "").toLowerCase();
        const userHandle = (user.handle || "").toLowerCase();
        
        return userEmail === OWNER_CONFIG.email.toLowerCase() || 
               userHandle === OWNER_CONFIG.handle.toLowerCase();
    },

    // Sincroniza y asegura los permisos e insignias de la cuenta Owner en Firebase
    async ensureOwnerAccount(userData) {
        if (!this.isOwner(userData)) return userData;

        const cleanHandle = OWNER_CONFIG.handle.replace('@', '').toLowerCase();
        const ownerRef = firebase.database().ref('users/' + cleanHandle);

        const snapshot = await ownerRef.once('value');
        const existingData = snapshot.val() || {};

        // Combinar datos manteniendo siempre los permisos y rango Top 1 de Owner
        const verifiedOwnerData = {
            ...existingData,
            ...userData,
            email: OWNER_CONFIG.email,
            username: OWNER_CONFIG.username,
            handle: OWNER_CONFIG.handle,
            role: OWNER_CONFIG.role,
            rank: OWNER_CONFIG.rank,
            verified: true,
            badge: OWNER_CONFIG.badge
        };

        // Guardar en Firebase y en la memoria local
        await ownerRef.update(verifiedOwnerData);
        MemoryAcc.setLocalUser(verifiedOwnerData);

        return verifiedOwnerData;
    }
};