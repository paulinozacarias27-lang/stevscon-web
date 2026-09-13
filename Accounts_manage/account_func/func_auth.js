// func_auth.js - Lógica Principal de Autenticación Unificada

const FuncAuth = {
    // -------------------------------------------------------------
    // REGISTRO DE NUEVA CUENTA
    // -------------------------------------------------------------
    async register({ email, password, username, handle }) {
        const cleanEmail = email.trim().toLowerCase();
        let formattedHandle = handle.trim();
        if (!formattedHandle.startsWith('@')) {
            formattedHandle = '@' + formattedHandle;
        }

        // 1. Comprobar si el Handle ya existe
        const existingHandle = await MemoryAcc.getUserByHandle(formattedHandle);
        if (existingHandle) {
            throw new Error(`El handle ${formattedHandle} ya está registrado por otro usuario.`);
        }

        // 2. Comprobar si el Correo ya existe
        const existingEmail = await MemoryAcc.getUserByEmail(cleanEmail);
        if (existingEmail) {
            throw new Error("El correo electrónico ya está registrado en Stevscon.");
        }

        // 3. Crear estructura del usuario
        const newUser = {
            email: cleanEmail,
            password: password,
            username: username.trim(),
            handle: formattedHandle,
            role: "USER",
            verified: false,
            createdAt: new Date().toISOString()
        };

        // 4. Guardar cuenta
        await MemoryAcc.syncUserToFirebase(newUser);
        MemoryAcc.setLocalUser(newUser);

        // 5. Enviar correo de bienvenida si existe el módulo
        if (typeof FuncBot !== 'undefined' && FuncBot.sendWelcomeEmail) {
            FuncBot.sendWelcomeEmail(newUser);
        }

        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        return newUser;
    },

    // -------------------------------------------------------------
    // INICIO DE SESIÓN
    // -------------------------------------------------------------
    async login({ email, password }) {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Verificar si la cuenta existe
        const user = await MemoryAcc.getUserByEmail(cleanEmail);
        if (!user) {
            throw new Error("¡No tienes una cuenta hecha aún! Regístrate primero.");
        }

        // 2. Validar la contraseña
        if (user.password !== password) {
            throw new Error("Contraseña incorrecta. Por favor, inténtalo de nuevo.");
        }

        // 3. Establecer Sesión Activa
        MemoryAcc.setLocalUser(user);

        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        return user;
    },

    // -------------------------------------------------------------
    // CERRAR SESIÓN
    // -------------------------------------------------------------
    logout() {
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