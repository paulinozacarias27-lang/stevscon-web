const MessagesSystem = {
    _esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    _currentSubscription: null,
    _currentConvId: null,

    getDirectConversationId(uidA, uidB) {
        return ProfileMemory.getDirectConversationId(uidA, uidB);
    },

    async canMessageUser(currentUid, targetUid) {
        if (currentUid === targetUid) return { allowed: false, reason: 'No puedes enviarte mensajes a ti mismo.' };

        const blocked = await ProfileMemory.isEitherBlocked(currentUid, targetUid);
        if (blocked) return { allowed: false, reason: 'No puedes enviar mensajes a este usuario.' };

        const targetProfile = await ProfileMemory.getProfile(targetUid);
        if (!targetProfile) return { allowed: false, reason: 'Usuario no encontrado.' };

        const dmSetting = (targetProfile.privacy && targetProfile.privacy.allowDirectMessages) || 'friends';
        if (dmSetting === 'none') return { allowed: false, reason: 'Este usuario no acepta mensajes directos.' };

        if (dmSetting === 'friends') {
            const friends = await ProfileMemory.getFriends(currentUid);
            const isFriend = friends.some(f => f.uid === targetUid);
            if (!isFriend) return { allowed: false, reason: 'Este usuario solo acepta mensajes de amigos.' };
        }

        return { allowed: true, targetProfile };
    },

    async getOrCreateDirectConversation(targetUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return null;

        const check = await this.canMessageUser(current.uid, targetUid);
        if (!check.allowed) {
            this._showError(check.reason);
            return null;
        }

        const convId = await ProfileMemory.getOrCreateDirectConversation(
            current.uid, current, targetUid, check.targetProfile
        );
        return convId;
    },

    async openConversationWithUser(targetUid) {
        const convId = await this.getOrCreateDirectConversation(targetUid);
        if (convId) {
            this.renderConversation(convId);
        }
    },

    async sendMessage(convId, text) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current || !convId || !text) return;
        try {
            await ProfileMemory.sendMessage(convId, current.uid, text);
        } catch (e) {
            this._showChatError(e.message);
        }
    },

    async deleteOwnMessage(convId, messageId) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;

        if (typeof UIAlerts !== 'undefined' && UIAlerts.showConfirm) {
            UIAlerts.showConfirm({
                title: 'Eliminar mensaje',
                message: '¿Seguro que quieres eliminar este mensaje?',
                confirmText: 'Eliminar',
                cancelText: 'Cancelar',
                danger: true,
                onConfirm: async () => {
                    const success = await ProfileMemory.deleteMessage(convId, messageId, current.uid);
                    if (!success) {
                        this._showChatError('No se pudo eliminar el mensaje.');
                    }
                }
            });
        } else {
            await ProfileMemory.deleteMessage(convId, messageId, current.uid);
        }
    },

    async loadConversationMessages(convId) {
        return await ProfileMemory.loadMessages(convId);
    },

    subscribeToConversation(convId, callback) {
        if (this._currentSubscription) {
            ProfileMemory.unsubscribeFromMessages(this._currentSubscription);
        }
        this._currentConvId = convId;
        this._currentSubscription = ProfileMemory.subscribeToMessages(convId, callback);
    },

    unsubscribeFromConversation() {
        if (this._currentSubscription) {
            ProfileMemory.unsubscribeFromMessages(this._currentSubscription);
            this._currentSubscription = null;
            this._currentConvId = null;
        }
    },

    async markConversationAsRead(convId) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        await ProfileMemory.markConversationAsRead(current.uid, convId);
        if (typeof UIButtons !== 'undefined' && UIButtons.updateUnreadBadge) {
            UIButtons.updateUnreadBadge();
        }
    },

    async getUserConversations() {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return [];
        return await ProfileMemory.getUserConversations(current.uid);
    },

    async getTotalUnreadCount() {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return 0;
        return await ProfileMemory.getTotalUnreadCount(current.uid);
    },

    async renderMessagesPage() {
        if (typeof UIMessages === 'undefined' || !UIMessages.renderMessagesPage) {
            console.warn('UIMessages module not loaded.');
            return;
        }
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        const conversations = await this.getUserConversations();
        UIMessages.renderMessagesPage(current, conversations);
    },

    async renderConversation(convId) {
        if (typeof UIMessages === 'undefined' || !UIMessages.renderConversation) {
            console.warn('UIMessages module not loaded.');
            return;
        }
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;

        const conv = await ProfileMemory.getConversation(convId);
        if (!conv) return;

        const otherUid = Object.keys(conv.participants || {}).find(uid => uid !== current.uid);
        const otherProfile = otherUid ? (conv.participantProfiles && conv.participantProfiles[otherUid]) : null;

        UIMessages.renderConversation(current, convId, conv, otherUid, otherProfile);

        await this.markConversationAsRead(convId);

        const messages = await this.loadConversationMessages(convId);
        UIMessages.renderMessageList(convId, messages, current.uid);

        this.subscribeToConversation(convId, (msgs) => {
            UIMessages.renderMessageList(convId, msgs, current.uid);
        });
    },

    _showError(msg) {
        const div = document.getElementById('profile-action-result');
        if (div) {
            div.innerHTML = '<p style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> ' + this._esc(msg) + '</p>';
        } else {
            console.warn('MessagesSystem:', msg);
        }
    },

    _showChatError(msg) {
        const div = document.getElementById('chat-error-area');
        if (div) {
            div.innerHTML = '<p style="color:var(--danger);font-size:0.85rem;"><i class="fa-solid fa-triangle-exclamation"></i> ' + this._esc(msg) + '</p>';
            setTimeout(() => { if (div) div.innerHTML = ''; }, 4000);
        }
    }
};
