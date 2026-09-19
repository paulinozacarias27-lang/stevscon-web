const OWNER_CONFIG = {
    email: "steven23hd@gmail.com",
    username: "StevsLoL",
    handle: "@StevsLoL",
    role: "Owner",
    rank: 1,
    badge: "👑 Owner / Creator"
};

const OwnerSystem = {
    isOwner(user) {
        if (!user) return false;
        const userEmail = (user.email || "").toLowerCase();
        return userEmail === OWNER_CONFIG.email.toLowerCase();
    },

    async ensureOwnerAccount(uid, userData) {
        if (!uid || !userData || !this.isOwner(userData)) return userData;

        try {
            const existingProfile = await MemoryAcc.getUserProfile(uid);
            const existingData = existingProfile || {};

            const verifiedOwnerData = {
                ...existingData,
                ...userData,
                uid: uid,
                email: OWNER_CONFIG.email,
                username: OWNER_CONFIG.username,
                handle: OWNER_CONFIG.handle,
                handleLower: OWNER_CONFIG.handle.replace('@', '').toLowerCase(),
                role: OWNER_CONFIG.role,
                rank: OWNER_CONFIG.rank,
                verified: true,
                badge: OWNER_CONFIG.badge
            };

            await MemoryAcc.saveUserProfile(uid, verifiedOwnerData);
            return verifiedOwnerData;
        } catch (e) {
            console.error("Error ensuring owner account:", e);
            return { ...userData, role: OWNER_CONFIG.role, badge: OWNER_CONFIG.badge };
        }
    }
};