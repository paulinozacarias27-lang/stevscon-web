// bot_acc.js - Módulo Bot de Correos y Notificaciones para Stevscon Accounts

const EMAILJS_PUBLIC_KEY = "RYyF8BFvKEL2CwV4y"; 
const SERVICE_ID = "stevscon_servicebot";
const TEMPLATE_WELCOME = "template_md8rdiq";

// Inicializar EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Muestra una notificación visual en vivo (Toast) en la esquina de la web
 */
function mostrarNotificacionBot(mensaje, esError = false) {
    let toast = document.getElementById('bot-toast-notification');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'bot-toast-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 14px 20px;
            background: #111827;
            color: #ffffff;
            border: 1px solid ${esError ? '#ef4444' : '#8b5cf6'};
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            z-index: 99999;
            font-family: system-ui, sans-serif;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }
    
    toast.style.borderColor = esError ? '#ef4444' : '#8b5cf6';
    toast.innerHTML = esError ? `❌ <b>Bot Gmail:</b> ${mensaje}` : `🤖 <b>Stevscon Bot:</b> ${mensaje}`;
    
    // Forzar reflow para animación
    setTimeout(() => { toast.style.opacity = '1'; }, 50);

    setTimeout(() => {
        if (toast) toast.style.opacity = '0';
    }, 6000);
}

/**
 * Envía el correo de bienvenida/acceso y muestra notificación en pantalla
 */
async function enviarCorreoBienvenidaBot(nombre, gmail, handle) {
    if (!gmail || !gmail.includes('@')) {
        mostrarNotificacionBot("El usuario no tiene un correo válido.", true);
        return false;
    }

    mostrarNotificacionBot(`Enviando notificación a ${gmail}...`);

    const templateParams = {
        to_name: nombre || "Usuario",
        to_email: gmail.trim(),
        handle: handle || "@usuario"
    };

    try {
        if (typeof emailjs === 'undefined') {
            throw new Error("El SDK de EmailJS no cargó correctamente en index.html");
        }

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_WELCOME, templateParams, EMAILJS_PUBLIC_KEY);
        console.log("✨ Respuesta de EmailJS:", response.status, response.text);
        
        mostrarNotificacionBot(`¡Correo de bienvenida enviado a ${gmail}!`);
        return true;
    } catch (error) {
        console.error("❌ Error devuelto por EmailJS:", error);
        const mensajeError = error.text || error.message || "Error al conectar con el servidor";
        mostrarNotificacionBot(`Fallo al enviar correo: ${mensajeError}`, true);
        return false;
    }
}