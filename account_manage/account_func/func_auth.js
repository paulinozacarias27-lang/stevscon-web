const FuncAuth = {
    _traducirErrorFirebase(error) {
        const code = error.code || '';
        const translations = {
            'auth/email-already-in-use': 'El correo electrónico ya está registrado.',
            'auth/invalid-email': 'El correo electrónico no es válido.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/user-not-found': 'No existe una cuenta con este correo.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/invalid-credential': 'Credenciales inválidas.',
            'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet.'
        };
        return translations[code] || error.message || 'Error de autenticación.';
    },

    async register({ email, password, username, handle }) {
        if (!email || !password || !username || !handle) {
            throw new Error('Todos los campos son requeridos.');
        }

        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const cleanHandle = handle.replace('@', '').toLowerCase();
        if (!/^[a-z0-9_]+$/.test(cleanHandle)) {
            throw new Error('El handle solo puede contener letras minúsculas, números y guion bajo.');
        }

        const formattedHandle = '@' + cleanHandle;
        const cleanEmail = email.trim().toLowerCase();

        try {
            const existingProfile = await MemoryAcc.getProfileByHandle(formattedHandle);
            if (existingProfile) {
                throw new Error(`El handle ${formattedHandle} ya está en uso.`);
            }
        } catch (e) {
            console.warn("Handle check skipped:", e.message);
        }

        let credential;
        try {
            credential = await auth.createUserWithEmailAndPassword(cleanEmail, password);
        } catch (e) {
            throw new Error(this._traducirErrorFirebase(e));
        }

        const uid = credential.user.uid;
        const newProfile = {
            uid: uid,
            email: cleanEmail,
            username: username.trim(),
            handle: formattedHandle,
            handleLower: cleanHandle,
            role: 'User',
            verified: false,
            createdAt: new Date().toISOString()
        };

        try {
            await credential.user.updateProfile({ displayName: username.trim() });
        } catch (e) {
            console.warn("Could not update display name:", e);
        }

        MemoryAcc.saveUserProfile(uid, newProfile);

        let finalProfile = newProfile;
        if (OwnerSystem.isOwner(newProfile)) {
            finalProfile = await OwnerSystem.ensureOwnerAccount(uid, newProfile);
        }

        MemoryAcc.setLocalUser(finalProfile);

        if (typeof FuncBot !== 'undefined' && FuncBot.sendWelcomeEmail) {
            FuncBot.sendWelcomeEmail(finalProfile);
        }

        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        return finalProfile;
    },

    async login({ email, password }) {
        if (!email || !password) {
            throw new Error('Email y contraseña son requeridos.');
        }

        const cleanEmail = email.trim().toLowerCase();

        let credential;
        try {
            credential = await auth.signInWithEmailAndPassword(cleanEmail, password);
        } catch (e) {
            throw new Error(this._traducirErrorFirebase(e));
        }

        const uid = credential.user.uid;
        let profile = await MemoryAcc.getUserProfile(uid);

        if (!profile) {
            profile = {
                uid: uid,
                email: cleanEmail,
                username: credential.user.displayName || 'Usuario',
                handle: '@usuario',
                handleLower: 'usuario',
                role: 'User',
                verified: false,
                createdAt: new Date().toISOString()
            };
            MemoryAcc.saveUserProfile(uid, profile);
        }

        if (OwnerSystem.isOwner(profile)) {
            profile = await OwnerSystem.ensureOwnerAccount(uid, profile);
        }

        MemoryAcc.setLocalUser(profile);

        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        return profile;
    },

    async logout() {
        try {
            await auth.signOut();
        } catch (e) {
            console.error("Error signing out:", e);
        }

        MemoryAcc.clearLocalUser();

        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        if (typeof regresarASocial === 'function') {
            regresarASocial();
        } else {
            window.location.reload();
        }
    }
};

if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged(async (fbUser) => {
        if (!fbUser) {
            MemoryAcc.clearLocalUser();
        } else {
            const cachedUser = MemoryAcc.getLocalUser();
            if (cachedUser && cachedUser.uid === fbUser.uid) {
                if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
                    UIButtons.renderHeaderAuth();
                }
                if (typeof CategoryApp !== 'undefined' && CategoryApp.onAuthReady) {
                    CategoryApp.onAuthReady(fbUser);
                }
                MemoryAcc.getUserProfile(fbUser.uid).then(profile => {
                    if (profile) {
                        if (OwnerSystem.isOwner(profile)) {
                            OwnerSystem.ensureOwnerAccount(fbUser.uid, profile).then(verified => {
                                MemoryAcc.setLocalUser(verified);
                                if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
                                    UIButtons.renderHeaderAuth();
                                }
                            });
                        } else {
                            MemoryAcc.setLocalUser(profile);
                        }
                    }
                });
                return;
            }

            const profile = await MemoryAcc.getUserProfile(fbUser.uid);
            if (profile) {
                if (OwnerSystem.isOwner(profile)) {
                    const verifiedProfile = await OwnerSystem.ensureOwnerAccount(fbUser.uid, profile);
                    MemoryAcc.setLocalUser(verifiedProfile);
                } else {
                    MemoryAcc.setLocalUser(profile);
                }
            }
        }

        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        if (typeof CategoryApp !== 'undefined' && CategoryApp.onAuthReady) {
            CategoryApp.onAuthReady(fbUser);
        }
    });
}
