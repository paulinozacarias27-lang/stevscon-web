// func_auth.js - Lógica Principal de Autenticación con Firebase Realtime DB

const FuncAuth = {
    // -------------------------------------------------------------
    // REGISTRO DE NUEVA CUENTA
    // Requisitos: Correo electrónico, Contraseña, Nombre y Handle (@)
    // -------------------------------------------------------------
    async register({ email, password, username, handle }) {
        // 1. Sanitizar y formatear Handle
        let formattedHandle = handle.trim();
        if (!formattedHandle.startsWith('@')) {
            formattedHandle = '@' + formattedHandle;
        }
        const cleanHandle = formattedHandle.replace('@', '').toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        // 2. Comprobar si el Handle ya existe en Firebase
        const existingUserByHandle = await MemoryAcc.getUserFromFirebase(cleanHandle);
        if (existingUserByHandle) {
            throw new Error("El handle " + formattedHandle + " ya está registrado por otro usuario.");
        }

        // 3. Comprobar si el Correo ya está registrado
        const dbRef = firebase.database().ref('users');
        const emailSnapshot = await dbRef.orderByChild('email').equalTo(cleanEmail).once('value');
        if (emailSnapshot.exists()) {
            throw new Error("El correo electrónico ya está registrado en Stevscon.");
        }

        // 4. Crear estructura del usuario base
        let newUser = {
            email: cleanEmail,
            password: password, // Almacenado de forma segura en Firebase DB
            username: username.trim(),
            handle: formattedHandle,
            role: AdminSystem.ROLES.USER,
            verified: false,
            bio: "¡Hola! Soy nuevo en Stevscon.com",
            avatarUrl: "",
            bannerUrl: "",
            createdAt: new Date().toISOString()
        };

        // 5. Verificar si la cuenta corresponde al Owner principal
        if (OwnerSystem.isOwner(newUser)) {
            newUser = await OwnerSystem.ensureOwnerAccount(newUser);
        } else {
            await MemoryAcc.syncUserToFirebase(newUser);
            MemoryAcc.setLocalUser(newUser);
        }

        // 6. Disparar Gmail Bot de bienvenida en segundo plano
        FuncBot.sendWelcomeEmail(newUser);

        // 7. Actualizar la interfaz global
        UIButtons.renderHeaderAuth();
        return newUser;
    },

    // -------------------------------------------------------------
    // INICIO DE SESIÓN
    // Requisitos: Correo electrónico y Contraseña ya creada
    // -------------------------------------------------------------
    async login({ email, password }) {
        const cleanEmail = email.trim().toLowerCase();

        // Buscar el usuario por su correo electrónico en Firebase Realtime DB
        const dbRef = firebase.database().ref('users');
        const snapshot = await dbRef.orderByChild('email').equalTo(cleanEmail).once('value');

        if (!snapshot.exists()) {
            throw new Error("No existe ninguna cuenta asociada a este correo electrónico.");
        }

        let matchedUser = null;
        snapshot.forEach(child => {
            const val = child.val();
            if (val.password === password) {
                matchedUser = val;
            }
        });

        if (!matchedUser) {
            throw new Error("Contraseña incorrecta. Por favor, inténtalo de nuevo.");
        }

        // Si es el Owner, asegurar permisos máximos y rango Top 1
        if (OwnerSystem.isOwner(matchedUser)) {
            matchedUser = await OwnerSystem.ensureOwnerAccount(matchedUser);
        } else {
            MemoryAcc.setLocalUser(matchedUser);
        }

        // Actualizar interfaz
        UIButtons.renderHeaderAuth();
        return matchedUser;
    },

    // -------------------------------------------------------------
    // CERRAR SESIÓN
    // -------------------------------------------------------------
    logout() {
        MemoryAcc.clearLocalUser();
        UIButtons.renderHeaderAuth();
        
        // Regresar a la vista principal/social
        if (typeof regresarASocial === 'function') {
            regresarASocial();
        } else if (window.location.reload) {
            window.location.reload();
        }
    }
};