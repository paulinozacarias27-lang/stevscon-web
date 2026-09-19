const UIFriends = {
    // Escapa cualquier texto antes de insertarlo en el DOM.
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

        // BUG 1 CORREGIDO: se añade data-friend-name al div raíz de cada card.
        // filterFriends() lo consulta con querySelectorAll('[data-friend-name]').
        const renderFriendItem = (friend) => {
            const avatarHTML = ProfileSystem.getAvatarMarkup(friend, 'small');
            const statusSvg = (typeof ProfileSystem !== 'undefined' && ProfileSystem.STATUS_SVG) ? (ProfileSystem.STATUS_SVG[friend.status] || ProfileSystem.STATUS_SVG.offline) : '';
            const friendName = esc(friend.username) + ' ' + esc(friend.handle);
            return `
                <div class="card friend-card" data-friend-name="${friendName}" style="display:flex;align-items:center;gap:15px;padding:15px;">
                    <div style="position:relative;">
                        ${avatarHTML}
                        <span class="friend-status-dot" style="width:16px;height:16px;">${statusSvg}</span>
                    </div>
                    <div style="flex-grow:1;min-width:0;">
                        <div style="font-weight:700;font-size:0.95rem;">${esc(friend.username)}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${esc(friend.handle)}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="MessagesSystem.openConversationWithUser('${esc(friend.uid)}')" title="Mensaje"><i class="fa-solid fa-envelope"></i></button>
                        <button class="btn btn-outline btn-sm" onclick="ProfileSystem.openProfile('${esc(friend.uid)}')" title="Ver perfil"><i class="fa-solid fa-user"></i></button>
                        <button class="btn btn-outline btn-sm" onclick="FriendsSystem.removeFriend('${esc(friend.uid)}')" style="border-color:var(--danger);color:var(--danger);" title="Eliminar amigo"><i class="fa-solid fa-user-minus"></i></button>
                    </div>
                </div>
            `;
        };

        const renderRequestItem = (req) => {
            const avatarHTML = ProfileSystem.getAvatarMarkup(req, 'small');
            return `
                <div class="card friend-card" style="display:flex;align-items:center;gap:15px;padding:15px;">
                    ${avatarHTML}
                    <div style="flex-grow:1;min-width:0;">
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
                <div class="card friend-card" style="display:flex;align-items:center;gap:15px;padding:15px;">
                    ${avatarHTML}
                    <div style="flex-grow:1;min-width:0;">
                        <div style="font-weight:700;font-size:0.95rem;">${esc(req.senderUsername || 'Usuario')}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${esc(req.senderHandle || '')}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="FriendsSystem.cancelRequest('${esc(req.targetUid)}')"><i class="fa-solid fa-clock"></i> Pendiente</button>
                </div>
            `;
        };

        const incomingCount = incoming ? incoming.length : 0;
        const outgoingCount = outgoing ? outgoing.length : 0;

        root.innerHTML = `
            <div style="max-width:700px;margin:0 auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="color:var(--purple-accent);"><i class="fa-solid fa-users"></i> Amigos</h2>
                    <button class="btn btn-outline btn-sm" onclick="CategoryApp.returnHome()"><i class="fa-solid fa-arrow-left"></i> Volver</button>
                </div>

                <!-- MEJORA C: buscador de nuevos amigos por @handle -->
                <div class="card" style="padding:18px;margin-bottom:20px;">
                    <h3 class="profile-section-title" style="margin-top:0;"><i class="fa-solid fa-user-plus"></i> Buscar nuevos amigos</h3>
                    <div style="display:flex;gap:10px;">
                        <input type="text" class="form-input" id="user-search-input" placeholder="Escribe un @handle..." style="flex-grow:1;" onkeydown="UIFriends.handleSearchKey(event)">
                        <button class="btn btn-primary" onclick="UIFriends.searchNewFriends()"><i class="fa-solid fa-magnifying-glass"></i> Buscar</button>
                    </div>
                    <div id="user-search-results" style="margin-top:15px;"></div>
                </div>

                ${incomingCount > 0 ? `
                    <h3 class="profile-section-title">Solicitudes recibidas (${incomingCount})</h3>
                    ${incoming.map(renderRequestItem).join('')}
                ` : ''}

                ${outgoingCount > 0 ? `
                    <h3 class="profile-section-title">Solicitudes enviadas (${outgoingCount})</h3>
                    ${outgoing.map(renderOutgoingItem).join('')}
                ` : ''}

                <h3 class="profile-section-title">Tus amigos (${friends.length})</h3>
                ${friends.length > 0 ? `
                    <input type="text" class="form-input" id="friend-search" placeholder="Filtrar tus amigos..." style="margin-bottom:15px;" oninput="UIFriends.filterFriends()">
                    <div id="friends-list">${friends.map(renderFriendItem).join('')}</div>
                    <div id="friends-empty-filter" style="display:none;text-align:center;padding:20px;color:var(--text-muted);">No hay amigos que coincidan con el filtro.</div>
                ` : `
                    <div class="card" style="text-align:center;padding:40px;">
                        <i class="fa-solid fa-user-group" style="font-size:2.5rem;color:var(--text-muted);"></i>
                        <p style="margin-top:10px;color:var(--text-muted);">Aún no tienes amigos. ¡Busca usuarios por su @handle y envía solicitudes!</p>
                    </div>
                `}
            </div>
        `;
    },

    // BUG 1 CORREGIDO: ahora los items sí tienen el atributo data-friend-name.
    filterFriends() {
        const query = (document.getElementById('friend-search') || {}).value || '';
        const list = document.getElementById('friends-list');
        if (!list) return;
        const items = list.querySelectorAll('[data-friend-name]');
        const lowerQuery = query.toLowerCase();
        let visibleCount = 0;
        items.forEach(item => {
            const name = (item.getAttribute('data-friend-name') || '').toLowerCase();
            const match = name.includes(lowerQuery);
            item.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });
        const emptyMsg = document.getElementById('friends-empty-filter');
        if (emptyMsg) emptyMsg.style.display = (visibleCount === 0 && items.length > 0) ? 'block' : 'none';
    },

    // MEJORA C: permite buscar con la tecla Enter.
    handleSearchKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.searchNewFriends();
        }
    },

    // MEJORA C: busca usuarios por @handle y muestra resultados con foto/nombre/handle y botón Agregar.
    async searchNewFriends() {
        const input = document.getElementById('user-search-input');
        const resultsDiv = document.getElementById('user-search-results');
        if (!input || !resultsDiv) return;

        const query = input.value.trim();
        if (!query || query.replace('@', '').length < 1) {
            resultsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Escribe al menos un carácter para buscar.</p>';
            return;
        }

        resultsDiv.innerHTML = '<p style="color:var(--purple-accent);font-size:0.9rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Buscando...</p>';

        const esc = this._esc.bind(this);
        const current = ProfileSystem.getCurrentProfile();
        let results = [];
        if (typeof FriendsSystem !== 'undefined' && FriendsSystem.searchUsers) {
            results = await FriendsSystem.searchUsers(query);
        }

        // Excluimos al propio usuario de los resultados.
        results = results.filter(u => !current || u.uid !== current.uid);

        if (!results.length) {
            resultsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No se encontraron usuarios con ese handle.</p>';
            return;
        }

        resultsDiv.innerHTML = results.map(user => {
            const avatarHTML = ProfileSystem.getAvatarMarkup(user, 'small');
            return `
                <div class="card friend-card" style="display:flex;align-items:center;gap:15px;padding:12px;margin-bottom:10px;">
                    ${avatarHTML}
                    <div style="flex-grow:1;min-width:0;">
                        <div style="font-weight:700;font-size:0.95rem;">${esc(user.username)}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${esc(user.handle)}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="ProfileSystem.openProfile('${esc(user.uid)}')" title="Ver perfil"><i class="fa-solid fa-user"></i></button>
                        <button class="btn btn-primary btn-sm" onclick="FriendsSystem.sendRequest('${esc(user.uid)}')"><i class="fa-solid fa-user-plus"></i> Agregar</button>
                    </div>
                </div>
            `;
        }).join('');
    }
};
