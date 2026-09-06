// Retorna la estructura principal de la pantalla de Mensajes
function getMDLayoutHTML() {
    return `
    <div class="wiki-container" style="height: calc(100vh - 100px); position: relative;">
        <!-- Botón X integrado en la esquina superior derecha -->
        <div style="position: absolute; top: -10px; right: 0; z-index: 10;">
            ${getBotonCerrarHomeHTML()}
        </div>

        <aside class="sidebar" style="width: 320px; display: flex; flex-direction: column; overflow-y: auto; padding: 15px;">
            <h3 style="display:flex; justify-content:space-between; align-items:center;">
                Mensajes Directos <i class="fa-solid fa-envelope" style="color: var(--purple-accent);"></i>
            </h3>
            <div id="md-contact-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;"></div>
        </aside>

        <section class="content" id="md-chat-area" style="display: flex; flex-direction: column; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); flex-grow: 1; position: relative; overflow: hidden;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
                <i class="fa-solid fa-comments" style="font-size: 4rem; margin-bottom: 20px; color: var(--purple-accent); opacity: 0.5;"></i>
                <h2>Tus Mensajes</h2>
                <p>Selecciona un amigo en la lista para empezar a chatear.</p>
            </div>
        </section>
    </div>
    `;
}

// Retorna la ventana de chat una vez que seleccionas un usuario
function getChatWindowHTML(targetUser) {
    const avatarHTML = targetUser.avatar ? `<img src="${targetUser.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : targetUser.nombre.charAt(0).toUpperCase();

    return `
        <!-- Cabecera del Chat -->
        <div class="chat-header">
            <div class="avatar" style="width: 45px; height: 45px;">${avatarHTML}</div>
            <div>
                <strong style="font-size: 1.1rem;">${targetUser.nombre}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">@${targetUser.handle}</div>
            </div>
        </div>

        <!-- Área donde se renderizan los mensajes -->
        <div id="chat-messages-container" class="chat-messages">
            <!-- Mensajes inyectados por JS -->
        </div>

        <!-- Previsualización de Imagen/GIF seleccionada -->
        <div id="md-image-preview-container" style="display: none; padding: 8px 15px; background: rgba(0,0,0,0.3); border-top: 1px solid var(--border-color); align-items: center; gap: 10px;">
            <i class="fa-solid fa-image" style="color: var(--purple-accent);"></i>
            <span id="md-image-preview-name" style="font-size: 0.85rem; color: var(--purple-accent); font-style: italic; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
            <button onclick="cancelarImagenMD()" style="background: transparent; border: none; color: var(--danger, #ff4d4d); cursor: pointer; font-size: 1rem; padding: 2px 6px;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <!-- Caja para escribir y botón de adjuntar -->
        <div class="chat-input-area" style="display: flex; align-items: center; gap: 10px; padding: 10px;">
            <label for="md-input-file" style="cursor: pointer; color: var(--purple-accent); font-size: 1.3rem; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; min-width: 40px;" title="Adjuntar imagen o GIF desde tu equipo">
                <i class="fa-solid fa-image"></i>
            </label>
            <input type="file" id="md-input-file" accept="image/*,image/gif" style="display: none;" onchange="previewImagenMD(event)">

            <input type="text" id="md-input-text" class="form-input" placeholder="Enviar un mensaje a @${targetUser.handle}..." onkeydown="manejarEnterMD(event, '${targetUser.handle}')" style="background: rgba(0,0,0,0.3); border: none; flex-grow: 1;">
            
            <button class="btn btn-primary" onclick="enviarMensaje('${targetUser.handle}')" style="border-radius: 50%; width: 45px; height: 45px; min-width: 45px; display:flex; justify-content:center; align-items:center; padding: 0;">
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </div>
    `;
}