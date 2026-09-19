const UIFriends = {
    _esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    renderFriendsPage(currentProfile, friends, incoming, outgoing) {
        const root = document.getElementById('app-root');
        if (!root) return;

        const esc = this._esc.bind(this);

        const renderFriendItem = (friend) => {
            const avatarHTML = ProfileSystem.getAvatarMarkup(friend, 'small');
            const statusColor = ProfileSystem.STATUS_COLORS[friend.status] || '#6b7280';
            return `
                <div class="card" style="display:flex;align-items:center;gap:15px;padding:15px;">
                    <div style="position:relative;">
                        ${avatarHTML}
                        <span style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-radius:50%;background:${statusColor};border:2px solid var(--bg-card);"></span>
                    </div>
                    <div style="flex-grow:1;">
                        <div style="font-weight:700;font-size:0.95rem;">${esc(friend.username)}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${esc(friend.handle)}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="MessagesSystem.openConversationWithUser('${esc(friend.uid)}')"><i class="fa-solid fa-envelope"></i></button>
                        <button class="btn btn-outline btn-sm" onclick="ProfileSystem.openProfile('${esc(friend.uid)}')"><i class="fa-solid fa-user"></i></button>
                        <button class="btn btn-outline btn-sm" onclick="FriendsSystem.removeFriend('${esc(friend.uid)}')" style="border-color:var(--danger);color:var(--danger);"><i class="fa-solid fa-user-minus"></i></button>
                    </div>
                </div>
            `;
        };

        const renderRequestItem = (req) => {
            const avatarHTML = ProfileSystem.getAvatarMarkup(req, 'small');
            return `
                <div class="card" style="display:flex;align-items:center;gap:15px;padding:15px;">
                    ${avatarHTML}
                    <div style="flex-grow:1;">
                        <div style="font-weight:700;font-size:0.95rem;">${esc(req.senderUsername || req.username)}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${esc(req.senderHandle || req.handle)}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-primary btn-sm" onclick="FriendsSystem.acceptRequest('${esc(req.uid)}')"><i class="fa-solid fa-check"></i> Aceptar</button>
                        <button class="btn btn-outline btn-sm" onclick="FriendsSystem.rejectRequest('${esc(req.uid)}')"><i class="fa-solid fa-times"></i> Rechazar</button>
                    </div>
                </div>
            `;
        };

        const renderOutgoingItem = (req) => {
            const avatarHTML = ProfileSystem.getAvatarMarkup(req, 'small');
            return `
                <div class="card" style="display:flex;align-items:center;gap:15px;padding:15px;">
                    ${avatarHTML}
                    <div style="flex-grow:1;">
                        <div style="font-weight:700;font-size:0.95rem;">${esc(req.senderUsername || 'Usuario')}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${esc(req.senderHandle || '')}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="FriendsSystem.cancelRequest('${esc(req.targetUid)}')"><i class="fa-solid fa-clock"></i> Pendiente</button>
                </div>
            `;
        };

        root.innerHTML = `
            <div style="max-width:700px;margin:0 auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="color:var(--purple-accent);"><i class="fa-solid fa-users"></i> Amigos</h2>
                    <button class="btn btn-outline btn-sm" onclick="CategoryApp.returnHome()"><i class="fa-solid fa-arrow-left"></i> Volver</button>
                </div>

                ${(incoming && incoming.length > 0) ? `
                    <h3 class="profile-section-title">Solicitudes recibidas (${incoming.length})</h3>
                    ${incoming.map(renderRequestItem).join('')}
                ` : ''}

                ${(outgoing && outgoing.length > 0) ? `
                    <h3 class="profile-section-title">Solicitudes enviadas (${outgoing.length})</h3>
                    ${outgoing.map(renderOutgoingItem).join('')}
                ` : ''}

                <h3 class="profile-section-title">Tus amigos (${friends.length})</h3>
                ${friends.length > 0 ? `
                    <input type="text" class="form-input" id="friend-search" placeholder="Buscar amigos..." style="margin-bottom:15px;" oninput="UIFriends.filterFriends()">
                    <div id="friends-list">${friends.map(renderFriendItem).join('')}</div>
                ` : `
                    <div class="card" style="text-align:center;padding:40px;">
                        <i class="fa-solid fa-user-group" style="font-size:2.5rem;color:var(--text-muted);"></i>
                        <p style="margin-top:10px;color:var(--text-muted);">Aun no tienes amigos. ¡Explora perfiles y envia solicitudes!</p>
                    </div>
                `}
            </div>
        `;
    },

    filterFriends() {
        const query = (document.getElementById('friend-search') || {}).value || '';
        const list = document.getElementById('friends-list');
        if (!list) return;
        const items = list.querySelectorAll('[data-friend-name]');
        const lowerQuery = query.toLowerCase();
        items.forEach(item => {
            const name = (item.getAttribute('data-friend-name') || '').toLowerCase();
            item.style.display = name.includes(lowerQuery) ? '' : 'none';
        });
    }
};
