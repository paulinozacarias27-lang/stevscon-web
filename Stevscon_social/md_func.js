let currentChatUser = null;
let imagenMDTemporal = "";

function obtenerMDsFrescos() {
    return JSON.parse(localStorage.getItem('stevscon_mds')) || [];
}

function initMDLogic() {
    const sesion = obtenerSesionActiva();
    if (!sesion) {
        alert("🔒 Debes iniciar sesión para acceder a tus mensajes.");
        cargarCategoria('login');
        return;
    }
    renderContactList();
    actualizarNotificacionesGlobales(); 
}

function obtenerSesionActiva() {
    if (typeof sesionActual !== 'undefined' && sesionActual) return sesionActual;
    return JSON.parse(localStorage.getItem('stevscon_sesion') || 'null');
}

function getCleanHandle(handle) {
    if (!handle) return '';
    return handle.replace('@', '').trim().toLowerCase();
}

function getChatId(user1, user2) {
    const u1 = getCleanHandle(user1);
    const u2 = getCleanHandle(user2);
    return [u1, u2].sort().join('_');
}

function previewImagenMD(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('md-image-preview-container');
    const previewName = document.getElementById('md-image-preview-name');

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagenMDTemporal = e.target.result;
            if (previewName) previewName.textContent = `📷 ${file.name}`;
            if (previewContainer) previewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else {
        cancelarImagenMD();
    }
}

function cancelarImagenMD() {
    imagenMDTemporal = "";
    const fileInput = document.getElementById('md-input-file');
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('md-image-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    const previewName = document.getElementById('md-image-preview-name');
    if (previewName) previewName.textContent = '';
}

function renderContactList() {
    const sesion = obtenerSesionActiva();
    if (!sesion) return;
    const miHandle = getCleanHandle(sesion.handle);

    const dbUsuarios = JSON.parse(localStorage.getItem('stevscon_usuarios')) || [];
    const dbMensajes = obtenerMDsFrescos();
    
    const contactList = document.getElementById('md-contact-list');
    if (!contactList) return;
    
    contactList.innerHTML = '';
    
    dbUsuarios.forEach(user => {
        const targetHandleClean = getCleanHandle(user.handle);
        if (targetHandleClean === miHandle) return; 

        const chatId = getChatId(miHandle, targetHandleClean);
        const chat = dbMensajes.find(c => c.idChat === chatId);
        
        let lastMsgText = "<i>Haz clic para chatear</i>";
        let unreadCount = 0; 
        
        if (chat && chat.messages && chat.messages.length > 0) {
            const lastMsg = chat.messages[chat.messages.length - 1];
            const isMe = (getCleanHandle(lastMsg.sender) === miHandle);
            const prefix = isMe ? "Yo: " : `${user.nombre}: `;
            const txtContent = lastMsg.text ? lastMsg.text : (lastMsg.image ? '📷 Imagen' : '');
            lastMsgText = prefix + txtContent;

            chat.messages.forEach(msg => {
                if (getCleanHandle(msg.sender) !== miHandle && !msg.read) unreadCount++;
            });
        }

        const avatarHTML = user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : user.nombre.charAt(0).toUpperCase();

        const unreadHTML = unreadCount > 0 
            ? `<div style="background-color: var(--danger, #ef4444); color: white; border-radius: 50%; min-width: 22px; height: 22px; display: flex; justify-content: center; align-items: center; font-size: 0.75rem; font-weight: bold; padding: 0 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${unreadCount > 99 ? '99+' : unreadCount}</div>` 
            : '';

        contactList.innerHTML += `
            <div class="md-contact-item" onclick="abrirChat('${targetHandleClean}')">
                <div class="avatar" style="width: 45px; height: 45px; min-width: 45px;">${avatarHTML}</div>
                <div style="overflow: hidden; flex-grow: 1;">
                    <strong style="color: var(--text-main); display: block;">${user.nombre}</strong>
                    <span style="color: var(--text-muted); font-size: 0.85rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsgText}</span>
                </div>
                <div style="display: flex; align-items: center;">
                    ${unreadHTML}
                </div>
            </div>
        `;
    });
}

function abrirChat(targetHandle) {
    const cleanTarget = getCleanHandle(targetHandle);
    const dbUsuarios = JSON.parse(localStorage.getItem('stevscon_usuarios')) || [];
    const targetUser = dbUsuarios.find(u => getCleanHandle(u.handle) === cleanTarget);
    if (!targetUser) return;

    currentChatUser = cleanTarget;
    const chatArea = document.getElementById('md-chat-area');
    if (!chatArea) return;
    
    chatArea.innerHTML = getChatWindowHTML(targetUser);

    chatArea.style.opacity = '0';
    chatArea.style.transform = 'translateX(30px)';
    setTimeout(() => {
        chatArea.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
        chatArea.style.opacity = '1';
        chatArea.style.transform = 'translateX(0)';
    }, 10);

    marcarChatComoLeido(cleanTarget);
    renderMensajes();
}

function manejarEnterMD(event, targetHandle) {
    if (event.key === 'Enter') {
        event.preventDefault();
        enviarMensaje(targetHandle);
    }
}

function enviarMensaje(targetHandle) {
    const sesion = obtenerSesionActiva();
    if (!sesion) return;
    const miHandle = getCleanHandle(sesion.handle);
    const targetClean = getCleanHandle(targetHandle);

    const input = document.getElementById('md-input-text');
    if (!input) return;
    const text = input.value.trim();

    if (text === "" && !imagenMDTemporal) return;

    const mds = obtenerMDsFrescos();
    const chatId = getChatId(miHandle, targetClean);
    let chat = mds.find(c => c.idChat === chatId);

    if (!chat) {
        chat = { idChat: chatId, messages: [] };
        mds.push(chat);
    }

    chat.messages.push({
        sender: miHandle,
        text: text,
        image: imagenMDTemporal || "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
    });

    localStorage.setItem('stevscon_mds', JSON.stringify(mds));
    input.value = '';
    cancelarImagenMD();
    
    renderMensajes();
    renderContactList();
    actualizarNotificacionesGlobales();
}

function renderMensajes() {
    if (!currentChatUser) return;
    const sesion = obtenerSesionActiva();
    if (!sesion) return;
    
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const mds = obtenerMDsFrescos();
    const chatId = getChatId(sesion.handle, currentChatUser);
    const chat = mds.find(c => c.idChat === chatId);
    
    container.innerHTML = '';
    if (chat && chat.messages) {
        chat.messages.forEach(msg => {
            const isMe = (getCleanHandle(msg.sender) === getCleanHandle(sesion.handle));
            
            const mensajeFormateado = typeof formatearTexto === 'function' ? formatearTexto(msg.text) : msg.text;
            const imagenHTML = msg.image 
                ? `<div style="margin-top: ${msg.text ? '8px' : '0'}; border-radius: 8px; overflow: hidden; max-width: 280px;"><img src="${msg.image}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; display: block;"></div>` 
                : '';

            container.innerHTML += `
                <div class="msg-bubble ${isMe ? 'msg-mine' : 'msg-theirs'}" style="align-self: ${isMe ? 'flex-end' : 'flex-start'};">
                    ${mensajeFormateado}
                    ${imagenHTML}
                </div>`;
        });
    }
    container.scrollTop = container.scrollHeight;
}

function marcarChatComoLeido(targetHandle) {
    const sesion = obtenerSesionActiva();
    if (!sesion) return;
    const miHandle = getCleanHandle(sesion.handle);
    const targetClean = getCleanHandle(targetHandle);

    const mds = obtenerMDsFrescos();
    const chatId = getChatId(miHandle, targetClean);
    const chat = mds.find(c => c.idChat === chatId);
    let cambio = false;
    
    if (chat && chat.messages) {
        chat.messages.forEach(msg => {
            if (getCleanHandle(msg.sender) !== miHandle && !msg.read) {
                msg.read = true;
                cambio = true;
            }
        });
    }
    if (cambio) {
        localStorage.setItem('stevscon_mds', JSON.stringify(mds));
    }
}

// SISTEMA DE NOTIFICACIONES GLOBALES
function actualizarNotificacionesGlobales() {
    const sesion = obtenerSesionActiva();
    if (!sesion || !sesion.handle) return;
    const miHandle = getCleanHandle(sesion.handle);
    
    const chatArea = document.getElementById('md-chat-area');
    if (chatArea && currentChatUser) {
        marcarChatComoLeido(currentChatUser);
        renderMensajes();
        renderContactList();
    }

    let totalUnread = 0;
    const bdMensajesFresca = obtenerMDsFrescos();

    bdMensajesFresca.forEach(chat => {
        const partes = chat.idChat.split('_');
        if (partes.includes(miHandle)) {
            if (Array.isArray(chat.messages)) {
                chat.messages.forEach(msg => {
                    if (getCleanHandle(msg.sender) !== miHandle && !msg.read) {
                        totalUnread++;
                    }
                });
            }
        }
    });

    const badges = document.querySelectorAll('.notif-badge-global');
    badges.forEach(badge => {
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.classList.remove('hidden');
            badge.style.display = 'inline-flex';
        } else {
            badge.classList.add('hidden');
            badge.style.display = 'none';
        }
    });

    if (totalUnread > 0) {
        document.title = `(${totalUnread}) Stevscon.com`;
    } else {
        document.title = `Stevscon.com`;
    }
}

// Escuchadores automáticos en tiempo real
window.addEventListener('storage', actualizarNotificacionesGlobales);
setInterval(actualizarNotificacionesGlobales, 1000);