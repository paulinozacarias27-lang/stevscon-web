const UIMessages = {
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

    renderMessagesPage(currentProfile, conversations) {
        const root = document.getElementById('app-root');
        if (!root) return;

        MessagesSystem.unsubscribeFromConversation();
        const esc = this._esc.bind(this);

        const renderConvItem = (conv) => {
            const otherProfile = conv.participantProfiles && conv.participantProfiles[conv.otherUserUid];
            const username = esc(otherProfile ? otherProfile.username : 'Usuario');
            const handle = esc(otherProfile ? otherProfile.handle : '');
            const avatarURL = otherProfile ? otherProfile.avatarURL : '';
            const initial = esc((otherProfile ? otherProfile.username : 'U').charAt(0).toUpperCase());
            const preview = esc(conv.lastMessageText || 'Sin mensajes aun');
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
                <div style="display:flex;gap:20px;min-height:500px;">
                    <div style="width:300px;background:var(--bg-card);border-radius:12px;border:1px solid var(--border-color);padding:15px;overflow-y:auto;max-height:70vh;" id="conversations-list">
                        ${conversations.length > 0 ? conversations.map(renderConvItem).join('') : `
                            <div style="text-align:center;padding:30px 10px;">
                                <i class="fa-solid fa-inbox" style="font-size:2rem;color:var(--text-muted);"></i>
                                <p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem;">No tienes conversaciones.</p>
                            </div>
                        `}
                    </div>
                    <div style="flex-grow:1;background:var(--bg-card);border-radius:12px;border:1px solid var(--border-color);display:flex;align-items:center;justify-content:center;" id="chat-area">
                        <div style="text-align:center;color:var(--text-muted);">
                            <i class="fa-solid fa-comments" style="font-size:2.5rem;"></i>
                            <p style="margin-top:10px;">Selecciona una conversacion.</p>
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
                    <div style="flex-grow:1;">
                        <div style="font-weight:700;font-size:0.95rem;">${username}</div>
                        <div style="font-size:0.78rem;color:var(--text-muted);">${handle}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="ProfileSystem.openProfile('${esc(otherUid)}')"><i class="fa-solid fa-user"></i></button>
                </div>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input-area">
                    <div id="chat-error-area" style="width:100%;margin-bottom:5px;"></div>
                    <textarea class="form-input" id="msg-input" rows="1" placeholder="Escribe un mensaje..." style="flex-grow:1;resize:none;max-height:100px;" onkeydown="UIMessages.handleKeyPress(event, '${esc(convId)}')"></textarea>
                    <button class="btn btn-primary" id="btn-send-msg" onclick="UIMessages.handleSend('${esc(convId)}')"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;

        const input = document.getElementById('msg-input');
        if (input) input.focus();
    },

    renderMessageList(convId, messages, currentUid) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const esc = this._esc.bind(this);
        const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (messages.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-comment-dots" style="font-size:1.5rem;"></i><p style="margin-top:8px;font-size:0.85rem;">Aun no hay mensajes. ¡Envia el primero!</p></div>';
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
                        <div style="text-align:right;font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${this._formatTime(msg.createdAt)}</div>
                    `;
                } else {
                    html += `
                        <div style="margin-top:${sameSender ? '2px' : '10px'};">
                            <div class="msg-bubble msg-theirs">${esc(msg.text)}</div>
                            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${this._formatTime(msg.createdAt)}</div>
                        </div>
                    `;
                }
            }
            lastSender = msg.senderUid;
        });

        container.innerHTML = html;

        if (wasNearBottom) {
            container.scrollTop = container.scrollHeight;
        }
    },

    handleKeyPress(event, convId) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSend(convId);
        }
    },

    async handleSend(convId) {
        const input = document.getElementById('msg-input');
        const btn = document.getElementById('btn-send-msg');
        if (!input || !btn) return;

        const text = input.value.trim();
        if (!text) return;

        btn.disabled = true;
        input.value = '';
        input.style.height = 'auto';

        try {
            await MessagesSystem.sendMessage(convId, text);
        } catch (e) {
            console.warn('Send error:', e);
        }

        btn.disabled = false;
        input.focus();
    }
};
