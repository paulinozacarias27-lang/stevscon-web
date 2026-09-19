const UIMessages = {
    // Escapa cualquier texto antes de insertarlo en el DOM.
    _esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    _formatTime(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now - date;
            if (diff < 60000) return 'ahora';
            if (diff < 3600000) return Math.floor(diff / 60000) + 'min';
            if (diff < 86400000) return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
            return date.getDate() + '/' + (date.getMonth() + 1);
        } catch (e) { return ''; }
    },

    // BUG 5 CORREGIDO: layout responsivo mediante clases CSS (md-layout, md-sidebar, md-chat).
    // En desktop se muestran lado a lado; en móvil se apilan en columna.
    renderMessagesPage(currentProfile, conversations) {
        const root = document.getElementById('app-root');
        if (!root) return;

        MessagesSystem.unsubscribeFromConversation();
        const esc = this._esc.bind(this);

        const renderConvItem = (conv) => {
            const otherProfile = conv.participantProfiles && conv.participantProfiles[conv.otherUserUid];
            const username = esc(otherProfile ? otherProfile.username : 'Usuario');
            const avatarURL = otherProfile ? otherProfile.avatarURL : '';
            const initial = esc((otherProfile ? otherProfile.username : 'U').charAt(0).toUpperCase());
            const preview = esc(conv.lastMessageText || 'Sin mensajes aún');
            const time = this._formatTime(conv.lastMessageAt);
            const unread = conv.unreadCount > 0 ? '<span class="notif-badge-global">' + conv.unreadCount + '</span>' : '';

            const avatarHTML = avatarURL
                ? '<div class="avatar" style="width:40px;height:40px;background-image:url(' + esc(avatarURL) + ');background-size:cover;border-radius:50%;"></div>'
                : '<div class="avatar" style="width:40px;height:40px;font-size:0.9rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;background:var(--bg-main);">' + initial + '</div>';

            return `
                <div class="md-contact-item" onclick="MessagesSystem.renderConversation('${esc(conv.id)}')">
                    ${avatarHTML}
                    <div style="flex-grow:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:0.9rem;">${username}</span>
                            <span style="font-size:0.72rem;color:var(--text-muted);">${time}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:5px;">
                            <span style="font-size:0.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${preview}</span>
                            ${unread}
                        </div>
                    </div>
                </div>
            `;
        };

        root.innerHTML = `
            <div style="max-width:900px;margin:0 auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="color:var(--purple-accent);"><i class="fa-solid fa-envelope"></i> Mensajes</h2>
                    <button class="btn btn-outline btn-sm" onclick="CategoryApp.returnHome()"><i class="fa-solid fa-arrow-left"></i> Volver</button>
                </div>
                <div class="md-layout">
                    <div class="md-sidebar" id="conversations-list">
                        ${conversations.length > 0 ? conversations.map(renderConvItem).join('') : `
                            <div style="text-align:center;padding:30px 10px;">
                                <i class="fa-solid fa-inbox" style="font-size:2rem;color:var(--text-muted);"></i>
                                <p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem;">No tienes conversaciones.</p>
                            </div>
                        `}
                    </div>
                    <div class="md-chat" id="chat-area">
                        <div style="text-align:center;color:var(--text-muted);margin:auto;">
                            <i class="fa-solid fa-comments" style="font-size:2.5rem;"></i>
                            <p style="margin-top:10px;">Selecciona una conversación.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderConversation(currentProfile, convId, conv, otherUid, otherProfile) {
        const chatArea = document.getElementById('chat-area');
        if (!chatArea) return;

        const esc = this._esc.bind(this);
        const username = esc(otherProfile ? (otherProfile.username || 'Usuario') : 'Usuario');
        const handle = esc(otherProfile ? (otherProfile.handle || '') : '');
        const avatarURL = otherProfile ? otherProfile.avatarURL : '';

        const avatarHTML = avatarURL
            ? '<div class="avatar" style="width:36px;height:36px;background-image:url(' + esc(avatarURL) + ');background-size:cover;border-radius:50%;"></div>'
            : '<div class="avatar" style="width:36px;height:36px;font-size:0.8rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;background:var(--bg-main);">' + esc((otherProfile ? otherProfile.username : 'U').charAt(0).toUpperCase()) + '</div>';

        chatArea.innerHTML = `
            <div style="display:flex;flex-direction:column;height:100%;width:100%;">
                <div class="chat-header">
                    ${avatarHTML}
                    <div style="flex-grow:1;min-width:0;">
                        <div style="font-weight:700;font-size:0.95rem;">${username}</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);">${handle}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="ProfileSystem.openProfile('${esc(otherUid)}')" title="Ver perfil"><i class="fa-solid fa-user"></i></button>
                </div>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input-area">
                    <div id="chat-error-area" style="width:100%;margin-bottom:5px;"></div>
                    <textarea class="form-input" id="msg-input" rows="1" placeholder="Escribe un mensaje..." style="flex-grow:1;resize:none;max-height:120px;" onkeydown="UIMessages.handleKeyPress(event, '${esc(convId)}')" oninput="UIMessages.autoResize(this)"></textarea>
                    <button class="btn btn-primary" id="btn-send-msg" onclick="UIMessages.handleSend('${esc(convId)}')" title="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;

        const input = document.getElementById('msg-input');
        if (input) input.focus();
    },

    // MEJORA B: ajusta la altura del textarea automáticamente según su contenido.
    autoResize(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    renderMessageList(convId, messages, currentUid) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const esc = this._esc.bind(this);
        const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-comment-dots" style="font-size:1.5rem;"></i><p style="margin-top:8px;font-size:0.85rem;">Aún no hay mensajes. ¡Envía el primero!</p></div>';
            return;
        }

        let html = '';
        let lastSender = null;

        messages.forEach((msg) => {
            const isMine = msg.senderUid === currentUid;
            const sameSender = lastSender === msg.senderUid;

            if (msg.deleted) {
                html += '<div class="msg-bubble ' + (isMine ? 'msg-mine' : 'msg-theirs') + '" style="opacity:0.5;font-style:italic;">Mensaje eliminado</div>';
            } else {
                if (isMine) {
                    html += `
                        <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;${sameSender ? 'margin-top:2px;' : 'margin-top:10px;'}">
                            <button onclick="MessagesSystem.deleteOwnMessage('${esc(convId)}','${esc(msg.id)}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.7rem;opacity:0.6;" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                            <div class="msg-bubble msg-mine">${esc(msg.text)}</div>
                        </div>
                        <div class="msg-timestamp" style="text-align:right;">${this._formatTime(msg.createdAt)}</div>
                    `;
                } else {
                    html += `
                        <div style="margin-top:${sameSender ? '2px' : '10px'};">
                            <div class="msg-bubble msg-theirs">${esc(msg.text)}</div>
                            <div class="msg-timestamp">${this._formatTime(msg.createdAt)}</div>
                        </div>
                    `;
                }
            }
            lastSender = msg.senderUid;
        });

        container.innerHTML = html;

        // MEJORA B: al abrir la conversación (primer render) siempre bajamos al último mensaje.
        if (wasNearBottom || this._forceScroll) {
            container.scrollTop = container.scrollHeight;
            this._forceScroll = false;
        }
    },

    // Marca que el próximo render debe hacer scroll hasta el final (usado al abrir conversación).
    requestScrollToBottom() {
        this._forceScroll = true;
    },

    handleKeyPress(event, convId) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSend(convId);
        }
    },

    // MEJORA B: indicador visual de "enviando..." mientras se procesa el mensaje.
    async handleSend(convId) {
        const input = document.getElementById('msg-input');
        const btn = document.getElementById('btn-send-msg');
        if (!input || !btn) return;

        const text = input.value.trim();
        if (!text) return;

        const originalBtnHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        input.disabled = true;

        try {
            this.requestScrollToBottom();
            await MessagesSystem.sendMessage(convId, text);
            input.value = '';
            input.style.height = 'auto';
        } catch (e) {
            console.warn('Error al enviar:', e);
        }

        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
        input.disabled = false;
        input.focus();
    }
};
