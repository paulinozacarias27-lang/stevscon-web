const firebaseConfig = {
    apiKey: "AIzaSyAJN6uAVY65MAXJW1_0aHHP0L5okE9Tytw",
    authDomain: "stevscon-protocole-base.firebaseapp.com",
    databaseURL: "https://stevscon-protocole-base-default-rtdb.firebaseio.com",
    projectId: "stevscon-protocole-base",
    storageBucket: "stevscon-protocole-base.firebasestorage.app",
    messagingSenderId: "308982842818",
    appId: "1:308982842818:web:4205b4d49c7347898d825b",
    measurementId: "G-X93QHQYQPM"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = (typeof firebase !== 'undefined' && firebase.apps.length) ? firebase.database() : null;
const auth = (typeof firebase !== 'undefined' && firebase.apps.length) ? firebase.auth() : null;

const MemoryAcc = {
    setLocalUser(userData) {
        localStorage.setItem('stevscon_active_user', JSON.stringify(userData));
    },

    getLocalUser() {
        const user = localStorage.getItem('stevscon_active_user');
        return user ? JSON.parse(user) : null;
    },

    clearLocalUser() {
        localStorage.removeItem('stevscon_active_user');
        localStorage.removeItem('stevscon_user');
        localStorage.removeItem('stevscon_accounts_db');
    },

    async getUserProfile(uid) {
        if (!uid || !db) return null;
        try {
            const snapshot = await db.ref('users/' + uid).once('value');
            return snapshot.exists() ? snapshot.val() : null;
        } catch (e) {
            console.error("Error reading user profile:", e);
            return null;
        }
    },

    async saveUserProfile(uid, profileData) {
        if (!uid || !db || !profileData) return false;
        try {
            await db.ref('users/' + uid).update(profileData);
            return true;
        } catch (e) {
            console.error("Error saving user profile:", e);
            return false;
        }
    },

    async getProfileByHandle(handle) {
        if (!handle || !db) return null;
        try {
            const cleanHandle = handle.replace('@', '').toLowerCase();
            const snapshot = await db.ref('users').orderByChild('handleLower').equalTo(cleanHandle).once('value');
            if (snapshot.exists()) {
                let foundProfile = null;
                let foundUid = null;
                snapshot.forEach(child => {
                    foundUid = child.key;
                    foundProfile = child.val();
                });
                return foundProfile ? { uid: foundUid, ...foundProfile } : null;
            }
            return null;
        } catch (e) {
            console.error("Error getting profile by handle:", e);
            return null;
        }
    }
};