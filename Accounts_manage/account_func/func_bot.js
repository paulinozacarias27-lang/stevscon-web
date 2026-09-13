// func_bot.js - Módulo de Gmail Bot (EmailJS) para Correos de Bienvenida

const FuncBot = {
    PUBLIC_KEY: "RYyF8BFvKEL2CwV4y",
    SERVICE_ID: "stevscon_servicebot",
    WELCOME_TEMPLATE_ID: "template_md8rdiq",

    // Inicializar EmailJS SDK
    init() {
        if (window.emailjs) {
            emailjs.init(this.PUBLIC_KEY);
        }
    },

    // Enviar correo de bienvenida al usuario recién registrado
    async sendWelcomeEmail(userData) {
        if (!window.emailjs) return false;

        const templateParams = {
            to_email: userData.email,
            user_name: userData.username,
            user_handle: userData.handle,
            platform_name: "Stevscon.com",
            login_url: "https://stevscon.com"
        };

        try {
            const response = await emailjs.send(
                this.SERVICE_ID,
                this.WELCOME_TEMPLATE_ID,
                templateParams
            );
            console.log(" Bot: Correo de bienvenida enviado exitosamente.", response.status);
            return true;
        } catch (error) {
            console.error(" Bot Error: No se pudo enviar el correo de bienvenida.", error);
            return false;
        }
    }
};

// Inicializar al cargar el script
FuncBot.init();