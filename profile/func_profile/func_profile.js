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

function _withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
}

const MemoryAcc = {
    _dbAvailable: null,

    _getAllLocalProfiles() {
        const data = localStorage.getItem('stevscon_profiles');
        return data ? JSON.parse(data) : {};
    },

    _saveLocalProfile(uid, profile) {
        const all = this._getAllLocalProfiles();
        all[uid] = profile;
        localStorage.setItem('stevscon_profiles', JSON.stringify(all));
    },

    _getLocalProfile(uid) {
        const all = this._getAllLocalProfiles();
        return all[uid] || null;
    },

    _getLocalProfileByHandle(handle) {
        const cleanHandle = handle.replace('@', '').toLowerCase();
        const all = this._getAllLocalProfiles();
        for (const uid in all) {
            if (all[uid].handleLower === cleanHandle) {
                return { uid: uid, ...all[uid] };
            }
        }
        return null;
    },

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
        if (!uid) return null;

        const local = this._getLocalProfile(uid);

        if (this._dbAvailable === false || !db) return local;

        try {
            const snapshot = await _withTimeout(db.ref('users/' + uid).once('value'), 4000, 'getUserProfile');
            this._dbAvailable = true;
            if (snapshot.exists()) {
                const profile = snapshot.val();
                this._saveLocalProfile(uid, profile);
                return profile;
            }
            return local;
        } catch (e) {
            console.warn("DB no disponible, usando localStorage:", e.message);
            this._dbAvailable = false;
            return local;
        }
    },

    async saveUserProfile(uid, profileData) {
        if (!uid || !profileData) return false;

        this._saveLocalProfile(uid, profileData);

        if (this._dbAvailable === false || !db) return true;

        try {
            await _withTimeout(db.ref('users/' + uid).update(profileData), 4000, 'saveUserProfile');
            this._dbAvailable = true;
            return true;
        } catch (e) {
            console.warn("DB no disponible, perfil guardado solo en localStorage:", e.message);
            this._dbAvailable = false;
            return true;
        }
    },

    async getProfileByHandle(handle) {
        if (!handle) return null;

        const local = this._getLocalProfileByHandle(handle);
        if (local) return local;

        if (this._dbAvailable === false || !db) return null;

        try {
            const cleanHandle = handle.replace('@', '').toLowerCase();
            const snapshot = await _withTimeout(
                db.ref('users').orderByChild('handleLower').equalTo(cleanHandle).once('value'),
                3000,
                'getProfileByHandle'
            );
            this._dbAvailable = true;
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
            console.warn("DB no disponible para busqueda de handle, usando localStorage:", e.message);
            this._dbAvailable = false;
            return null;
        }
    }
};