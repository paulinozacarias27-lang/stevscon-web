const UIButtons = {
    _escape(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    _menuOpen: false,

    renderHeaderAuth() {
        const container = document.getElementById('auth-header-section');
        if (!container) return;

        const activeUser = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser)
            ? MemoryAcc.getLocalUser()
            : null;

        if (activeUser) {
            const isOwner = (typeof OwnerSystem !== 'undefined' && OwnerSystem.isOwner) ? OwnerSystem.isOwner(activeUser) : false;
            const isAdmin = (typeof AdminSystem !== 'undefined' && AdminSystem.isAdmin) ? AdminSystem.isAdmin(activeUser) : false;

            let badgeIcon = '';
            if (isOwner) {
                badgeIcon = '<i class="fa-solid fa-crown" style="color:#f59e0b;" title="Owner"></i>';
            } else if (isAdmin) {
                badgeIcon = '<i class="fa-solid fa-shield-halved" style="color:var(--purple-accent);" title="Admin"></i>';
            }

            const escapedUsername = this._escape(activeUser.username || 'Usuario');
            const escapedHandle = this._escape(activeUser.handle || '');
            const avatarInitial = this._escape((activeUser.username || 'U').charAt(0).toUpperCase());
            const avatarHTML = activeUser.avatarURL
                ? '<div class="avatar" style="width:38px;height:38px;background-image:url(' + this._escape(activeUser.avatarURL) + ');background-size:cover;background-position:center;"></div>'
                : '<div class="avatar" style="width:38px;height:38px;font-size:0.9rem;">' + avatarInitial + '</div>';

            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <button class="btn btn-outline btn-sm" onclick="if(typeof MessagesSystem!=='undefined')MessagesSystem.renderMessagesPage()" style="position:relative;" title="Mensajes">
                        <i class="fa-solid fa-envelope"></i>
                        <span id="unread-badge-header" style="display:none;position:absolute;top:-5px;right:-5px;background:var(--danger);color:white;border-radius:50px;padding:1px 6px;font-size:0.65rem;font-weight:800;min-width:16px;text-align:center;">0</span>
                    </button>
                    <div style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:4px 10px;border-radius:8px;transition:0.2s;" onclick="UIButtons.toggleUserMenu()" id="user-menu-trigger">
                        ${avatarHTML}
                        <div style="display:flex;flex-direction:column;line-height:1.2;">
                            <span style="font-weight:700;font-size:0.92rem;color:var(--text-main);display:flex;align-items:center;gap:6px;">${escapedUsername} ${badgeIcon}</span>
                            <span style="font-size:0.78rem;color:var(--text-muted);">${escapedHandle}</span>
                        </div>
                        <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;color:var(--text-muted);"></i>
                    </div>
                </div>
                <div id="user-dropdown-menu" style="display:none;position:absolute;top:55px;right:30px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:200;min-width:200px;overflow:hidden;">
                    <div onclick="UIButtons.goToProfile()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-user"></i> Ver mi perfil</div>
                    <div onclick="UIButtons.goToEditProfile()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-pen"></i> Editar perfil</div>
                    <div onclick="UIButtons.goToFriends()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-users"></i> Amigos</div>
                    <div onclick="UIButtons.goToMessages()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-envelope"></i> Mensajes</div>
                    <div style="border-top:1px solid var(--border-color);"></div>
                    <div onclick="if(typeof FuncAuth!=='undefined')FuncAuth.logout();" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--danger);font-size:0.9rem;" onmouseover="this.style.background='rgba(239,68,68,0.15)';" onmouseout="this.style.background='';"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesion</div>
                </div>
            `;

            this.updateUnreadBadge();
        } else {
            container.innerHTML = `
                <button class="btn btn-outline btn-sm" onclick="if(typeof UIAuth !== 'undefined') UIAuth.renderAuthForm('login')">
                    <i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesion
                </button>
                <button class="btn btn-primary btn-sm" onclick="if(typeof UIAuth !== 'undefined') UIAuth.renderAuthForm('register')">
                    <i class="fa-solid fa-user-plus"></i> Crear Cuenta
                </button>
            `;
        }
    },

    toggleUserMenu() {
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) {
            this._menuOpen = !this._menuOpen;
            menu.style.display = this._menuOpen ? 'block' : 'none';
            if (this._menuOpen) {
                setTimeout(() => {
                    document.addEventListener('click', this._outsideClickHandler = (e) => {
                        const trigger = document.getElementById('user-menu-trigger');
                        if (trigger && !trigger.contains(e.target) && menu && !menu.contains(e.target)) {
                            menu.style.display = 'none';
                            this._menuOpen = false;
                            document.removeEventListener('click', this._outsideClickHandler);
                        }
                    });
                }, 0);
            }
        }
    },

    goToProfile() {
        this._closeMenu();
        const user = (typeof MemoryAcc !== 'undefined') ? MemoryAcc.getLocalUser() : null;
        if (user && typeof ProfileSystem !== 'undefined') ProfileSystem.openProfile(user.uid);
    },

    goToEditProfile() {
        this._closeMenu();
        if (typeof ProfileSystem !== 'undefined') ProfileSystem.openEditProfile();
    },

    goToFriends() {
        this._closeMenu();
        if (typeof FriendsSystem !== 'undefined') FriendsSystem.renderFriendsPage();
    },

    goToMessages() {
        this._closeMenu();
        if (typeof MessagesSystem !== 'undefined') MessagesSystem.renderMessagesPage();
    },

    _closeMenu() {
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) menu.style.display = 'none';
        this._menuOpen = false;
    },

    async updateUnreadBadge() {
        const badge = document.getElementById('unread-badge-header');
        if (!badge) return;
        if (typeof MessagesSystem === 'undefined' || !MessagesSystem.getTotalUnreadCount) return;
        try {
            const count = await MessagesSystem.getTotalUnreadCount();
            if (count > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = count > 99 ? '99+' : String(count);
            } else {
                badge.style.display = 'none';
            }
        } catch (e) {
            badge.style.display = 'none';
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UIButtons.renderHeaderAuth());
} else {
    UIButtons.renderHeaderAuth();
}
