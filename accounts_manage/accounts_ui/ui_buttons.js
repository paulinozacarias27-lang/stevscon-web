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
                badgeIcon = '<span class="badge-tooltip-wrapper"><i class="fa-solid fa-crown" style="color:#f59e0b;"></i><span class="badge-tooltip"><span class="badge-tooltip-title">Owner</span><span class="badge-tooltip-desc">Owner of Stevscon.com</span></span></span>';
            } else if (isAdmin) {
                badgeIcon = '<span class="badge-tooltip-wrapper"><i class="fa-solid fa-shield-halved" style="color:var(--purple-accent);"></i><span class="badge-tooltip"><span class="badge-tooltip-title">Admin</span><span class="badge-tooltip-desc">Administrador de Stevscon.com</span></span></span>';
            }

            const escapedUsername = this._escape(activeUser.username || 'Usuario');
            const escapedHandle = this._escape(activeUser.handle || '');
            const avatarInitial = this._escape((activeUser.username || 'U').charAt(0).toUpperCase());
            const statusSvg = (typeof ProfileSystem !== 'undefined' && ProfileSystem.STATUS_SVG) ? (ProfileSystem.STATUS_SVG[activeUser.status] || ProfileSystem.STATUS_SVG.offline) : '';
            const showStatusDot = activeUser.privacy && activeUser.privacy.showOnlineStatus !== false;
            const statusDot = showStatusDot ? '<span class="avatar-status-overlay" style="width:16px;height:16px;">' + statusSvg + '</span>' : '';
            const avatarHTML = activeUser.avatarURL
                ? '<div class="avatar avatar-with-status" style="width:38px;height:38px;background-image:url(' + this._escape(activeUser.avatarURL) + ');background-size:cover;background-position:center;position:relative;">' + statusDot + '</div>'
                : '<div class="avatar avatar-with-status" style="width:38px;height:38px;font-size:0.9rem;position:relative;">' + avatarInitial + statusDot + '</div>';
            const statusPickerHTML = (typeof ProfileSystem !== 'undefined' && ProfileSystem.getStatusPickerHTML) ? ProfileSystem.getStatusPickerHTML(activeUser.status || 'offline') : '';

            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <button class="btn btn-outline btn-sm" onclick="if(typeof MessagesSystem!=='undefined')MessagesSystem.renderMessagesPage()" style="position:relative;" title="Mensajes">
                        <i class="fa-solid fa-envelope"></i>
                        <span id="unread-badge-header" style="display:none;position:absolute;top:-5px;right:-5px;background:var(--danger);color:white;border-radius:50px;padding:1px 6px;font-size:0.65rem;font-weight:800;min-width:16px;text-align:center;">0</span>
                    </button>
                    <div style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:4px 10px;border-radius:8px;transition:0.2s;position:relative;" onclick="UIButtons.toggleUserMenu()" id="user-menu-trigger">
                        ${avatarHTML}
                        <div style="display:flex;flex-direction:column;line-height:1.2;">
                            <span style="font-weight:700;font-size:0.92rem;color:var(--text-main);display:flex;align-items:center;gap:6px;">${escapedUsername} ${badgeIcon}</span>
                            <span style="font-size:0.78rem;color:var(--text-muted);">${escapedHandle}</span>
                        </div>
                        <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;color:var(--text-muted);"></i>
                        <div id="user-dropdown-menu" style="display:none;position:absolute;top:100%;right:0;margin-top:8px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:200;min-width:220px;overflow:visible;">
                            <div onclick="event.stopPropagation();UIButtons.goToProfile()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-user"></i> Ver mi perfil</div>
                            <div onclick="event.stopPropagation();UIButtons.goToEditProfile()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-pen"></i> Editar perfil</div>
                            <div onclick="event.stopPropagation();ProfileSystem.toggleStatusPicker(event)" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;position:relative;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><span class="status-indicator" style="width:18px;height:18px;">${statusSvg}</span> Cambiar estado <i class="fa-solid fa-chevron-right" style="font-size:0.6rem;margin-left:auto;color:var(--text-muted);"></i></div>
                            ${statusPickerHTML}
                            <div onclick="event.stopPropagation();UIButtons.goToFriends()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-users"></i> Amigos</div>
                            <div onclick="event.stopPropagation();UIButtons.goToMessages()" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-main);font-size:0.9rem;" onmouseover="this.style.background='var(--bg-hover)';" onmouseout="this.style.background='';"><i class="fa-solid fa-envelope"></i> Mensajes</div>
                            <div style="border-top:1px solid var(--border-color);"></div>
                            <div onclick="event.stopPropagation();if(typeof FuncAuth!=='undefined')FuncAuth.logout();" style="padding:10px 15px;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--danger);font-size:0.9rem;" onmouseover="this.style.background='rgba(239,68,68,0.15)';" onmouseout="this.style.background='';"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesion</div>
                        </div>
                    </div>
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
        if (!menu) return;
        const isShown = menu.style.display === 'block';
        menu.style.display = isShown ? 'none' : 'block';
        this._menuOpen = !isShown;
        if (!isShown) {
            setTimeout(() => {
                document.addEventListener('click', this._outsideClickHandler = (e) => {
                    const trigger = document.getElementById('user-menu-trigger');
                    if (trigger && !trigger.contains(e.target)) {
                        menu.style.display = 'none';
                        this._menuOpen = false;
                        document.removeEventListener('click', this._outsideClickHandler);
                        this._outsideClickHandler = null;
                    }
                });
            }, 0);
        } else {
            if (this._outsideClickHandler) {
                document.removeEventListener('click', this._outsideClickHandler);
                this._outsideClickHandler = null;
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
        if (this._outsideClickHandler) {
            document.removeEventListener('click', this._outsideClickHandler);
            this._outsideClickHandler = null;
        }
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
