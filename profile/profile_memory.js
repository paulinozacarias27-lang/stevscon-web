const FriendsSystem = {
    // Escapa cualquier texto antes de insertarlo en el DOM.
    _esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    async sendRequest(targetUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) { this._showError('Debes iniciar sesión.'); return; }
        if (current.uid === targetUid) { this._showError('No puedes enviarte una solicitud a ti mismo.'); return; }

        const blocked = await ProfileMemory.isEitherBlocked(current.uid, targetUid);
        if (blocked) { this._showError('No puedes enviar una solicitud a este usuario.'); return; }

        this._showLoading('Enviando solicitud...');
        const success = await ProfileMemory.sendFriendRequest(current.uid, current, targetUid);
        if (success) {
            this._showSuccess('Solicitud de amistad enviada.');
            ProfileSystem.openProfile(targetUid);
        } else {
            this._showError('No se pudo enviar la solicitud.');
        }
    },

    async cancelRequest(targetUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        this._showLoading('Cancelando solicitud...');
        const success = await ProfileMemory.cancelFriendRequest(current.uid, targetUid);
        if (success) {
            this._showSuccess('Solicitud cancelada.');
            ProfileSystem.openProfile(targetUid);
        } else {
            this._showError('No se pudo cancelar la solicitud.');
        }
    },

    // MEJORA H: tras aceptar, recargamos la página de amigos (no el perfil del remitente).
    async acceptRequest(senderUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        this._showLoading('Aceptando solicitud...');

        const senderProfile = await ProfileMemory.getProfile(senderUid);
        if (!senderProfile) { this._showError('Usuario no encontrado.'); return; }

        const success = await ProfileMemory.acceptFriendRequest(current.uid, senderUid, senderProfile, current);
        if (success) {
            this.renderFriendsPage();
        } else {
            this._showError('No se pudo aceptar la solicitud.');
        }
    },

    // MEJORA H: tras rechazar, recargamos la página de amigos.
    async rejectRequest(senderUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        const success = await ProfileMemory.rejectFriendRequest(current.uid, senderUid);
        if (success) {
            this.renderFriendsPage();
        } else {
            this._showError('No se pudo rechazar la solicitud.');
        }
    },

    async removeFriend(friendUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;

        if (typeof UIAlerts !== 'undefined' && UIAlerts.showConfirm) {
            UIAlerts.showConfirm({
                title: 'Eliminar amigo',
                message: '¿Seguro que quieres eliminar a este amigo?',
                confirmText: 'Eliminar',
                cancelText: 'Cancelar',
                danger: true,
                onConfirm: async () => {
                    const success = await ProfileMemory.removeFriend(current.uid, friendUid);
                    if (success) {
                        ProfileSystem.openProfile(friendUid);
                    }
                }
            });
        } else {
            const success = await ProfileMemory.removeFriend(current.uid, friendUid);
            if (success) ProfileSystem.openProfile(friendUid);
        }
    },

    confirmBlockUser(targetUid) {
        if (typeof UIAlerts !== 'undefined' && UIAlerts.showConfirm) {
            UIAlerts.showConfirm({
                title: 'Bloquear usuario',
                message: '¿Seguro que quieres bloquear a este usuario? Se eliminará la amistad y no podrá enviarte mensajes.',
                confirmText: 'Bloquear',
                cancelText: 'Cancelar',
                danger: true,
                onConfirm: async () => {
                    await this.blockUser(targetUid);
                }
            });
        } else {
            this.blockUser(targetUid);
        }
    },

    async blockUser(targetUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        const success = await ProfileMemory.blockUser(current.uid, targetUid);
        if (success) {
            this._showSuccess('Usuario bloqueado.');
            ProfileSystem.openProfile(targetUid);
        } else {
            this._showError('No se pudo bloquear al usuario.');
        }
    },

    async unblockUser(targetUid) {
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        const success = await ProfileMemory.unblockUser(current.uid, targetUid);
        if (success) {
            this._showSuccess('Usuario desbloqueado.');
            ProfileSystem.openProfile(targetUid);
        } else {
            this._showError('No se pudo desbloquear al usuario.');
        }
    },

    async getFriends(uid) {
        return await ProfileMemory.getFriends(uid);
    },

    async getIncomingRequests(uid) {
        return await ProfileMemory.getIncomingRequests(uid);
    },

    async getOutgoingRequests(uid) {
        return await ProfileMemory.getOutgoingRequests(uid);
    },

    async getRelationshipStatus(currentUid, targetUid) {
        return await ProfileMemory.getRelationshipStatus(currentUid, targetUid);
    },

    // MEJORA H: método para buscar usuarios por handle desde la UI de amigos.
    async searchUsers(query) {
        if (!query) return [];
        return await ProfileMemory.searchUsersByHandle(query, 10);
    },

    async renderFriendsPage() {
        if (typeof UIFriends === 'undefined' || !UIFriends.renderFriendsPage) {
            console.warn('Módulo UIFriends no cargado.');
            return;
        }
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;

        if (typeof CategoryApp !== 'undefined') CategoryApp._currentView = 'friends';

        const [friends, incoming, outgoing] = await Promise.all([
            this.getFriends(current.uid),
            this.getIncomingRequests(current.uid),
            this.getOutgoingRequests(current.uid)
        ]);

        UIFriends.renderFriendsPage(current, friends, incoming, outgoing);
    },

    _showLoading(msg) {
        const div = document.getElementById('profile-action-result');
        if (div) div.innerHTML = '<p style="color:var(--purple-accent);"><i class="fa-solid fa-circle-notch fa-spin"></i> ' + this._esc(msg) + '</p>';
    },

    _showSuccess(msg) {
        const div = document.getElementById('profile-action-result');
        if (div) div.innerHTML = '<p style="color:#22c55e;"><i class="fa-solid fa-circle-check"></i> ' + this._esc(msg) + '</p>';
    },

    _showError(msg) {
        const div = document.getElementById('profile-action-result');
        if (div) {
            div.innerHTML = '<p style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> ' + this._esc(msg) + '</p>';
        } else {
            console.warn('FriendsSystem:', msg);
        }
    }
};
