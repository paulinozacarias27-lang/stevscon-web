const FuncBot = {
    PUBLIC_KEY: "RYyF8BFvKEL2CwV4y",
    SERVICE_ID: "stevscon_servicebot",
    WELCOME_TEMPLATE_ID: "template_md8rdiq",

    init() {
        if (window.emailjs) {
            try {
                emailjs.init(this.PUBLIC_KEY);
            } catch (e) {
                console.error("Error initializing EmailJS:", e);
            }
        }
    },

    async sendWelcomeEmail(userData) {
        if (!window.emailjs || !userData || !userData.email) return false;

        const templateParams = {
            to_email: userData.email,
            user_name: userData.username || "",
            user_handle: userData.handle || "",
            platform_name: "Stevscon.com",
            login_url: "https://stevscon.com"
        };

        try {
            const response = await emailjs.send(
                this.SERVICE_ID,
                this.WELCOME_TEMPLATE_ID,
                templateParams
            );
            console.log("Bot: Welcome email sent successfully.", response.status);
            return true;
        } catch (error) {
            console.error("Bot Error: Could not send welcome email.", error);
            return false;
        }
    }
};

FuncBot.init();