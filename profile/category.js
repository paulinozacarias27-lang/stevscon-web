const CategoryApp = {
    _escape(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    _currentView: null,

    init() {
        if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
            UIButtons.renderHeaderAuth();
        }

        const currentUser = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser)
            ? MemoryAcc.getLocalUser()
            : null;

        if (!currentUser) {
            this.renderAuth('login');
        } else {
            this.renderHomeScreen(currentUser);
        }
    },

    onAuthReady(fbUser) {
        if (!fbUser) {
            const currentAuthForm = document.querySelector('.stevscon-accounts-card');
            if (!currentAuthForm) {
                this.renderAuth('login');
            }
        } else {
            const currentUser = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser)
                ? MemoryAcc.getLocalUser()
                : null;
            if (currentUser && this._currentView !== 'profile' && this._currentView !== 'messages' && this._currentView !== 'friends') {
                this.renderHomeScreen(currentUser);
            }
        }
    },

    renderAuth(tab) {
        this._currentView = 'auth';
        if (typeof UIAuth !== 'undefined' && UIAuth.renderAuthForm) {
            UIAuth.renderAuthForm(tab || 'login');
        }
    },

    // MEJORA A: pantalla de inicio rediseñada como panel (dashboard) con avatar, roles/insignias,
    // y tarjetas de acceso rapido con contadores dinamicos (solicitudes pendientes y mensajes sin leer).
    renderHomeScreen(user) {
        this._currentView = 'home';
        if (typeof MessagesSystem !== 'undefined' && MessagesSystem.unsubscribeFromConversation) {
            MessagesSystem.unsubscribeFromConversation();
        }
        const root = document.getElementById('app-root');
        if (!root) return;

        const esc = this._escape.bind(this);
        const escapedUsername = esc(user.username || 'Usuario');
        const escapedHandle = esc(user.handle || '');
        const avatarInitial = esc((user.username || 'U').charAt(0).toUpperCase());
        const avatarHTML = user.avatarURL
            ? '<div class="home-avatar" style="background-image:url(' + esc(user.avatarURL) + ');background-size:cover;background-position:center;"></div>'
            : '<div class="home-avatar home-avatar-initial">' + avatarInitial + '</div>';

        const isOwner = (typeof OwnerSystem !== 'undefined' && OwnerSystem.isOwner) ? OwnerSystem.isOwner(user) : false;
        const isAdmin = (typeof AdminSystem !== 'undefined' && AdminSystem.isAdmin) ? AdminSystem.isAdmin(user) : false;
        let roleBadge = '';
        if (isOwner) roleBadge = '<span class="home-role-badge" style="color:#f59e0b;border-color:#f59e0b;"><i class="fa-solid fa-crown"></i> Owner</span>';
        else if (isAdmin) roleBadge = '<span class="home-role-badge" style="color:var(--purple-accent);border-color:var(--purple-accent);"><i class="fa-solid fa-shield-halved"></i> Admin</span>';
        else roleBadge = '<span class="home-role-badge" style="color:var(--text-muted);border-color:var(--border-color);"><i class="fa-solid fa-user"></i> Usuario</span>';

        const verifiedIcon = user.verified ? ' <i class="fa-solid fa-circle-check" style="color:var(--purple-accent);font-size:0.9rem;"></i>' : '';

        root.innerHTML = `
            <div class="home-dashboard">
                <div class="home-hero">
                    ${avatarHTML}
                    <div class="home-hero-info">
                        <h2 class="home-hero-name">${escapedUsername}${verifiedIcon}</h2>
                        <p class="home-hero-handle">${escapedHandle}</p>
                        <div class="home-hero-badges">${roleBadge}</div>
                    </div>
                </div>

                <div class="home-cards-grid">
                    <div class="home-card" onclick="CategoryApp.openMyProfile()">
                        <div class="home-card-icon" style="background:rgba(139,92,246,0.15);color:var(--purple-accent);"><i class="fa-solid fa-user"></i></div>
                        <div class="home-card-body">
                            <div class="home-card-title">Mi perfil</div>
                            <div class="home-card-desc">Edita tu informacion y estado</div>
                        </div>
                        <i class="fa-solid fa-chevron-right home-card-arrow"></i>
                    </div>

                    <div class="home-card" onclick="CategoryApp.openFriends()">
                        <div class="home-card-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;"><i class="fa-solid fa-users"></i></div>
                        <div class="home-card-body">
                            <div class="home-card-title">Amigos <span id="home-friends-badge" class="home-badge" style="display:none;"></span></div>
                            <div class="home-card-desc" id="home-friends-desc">Ver tu lista de amigos</div>
                        </div>
                        <i class="fa-solid fa-chevron-right home-card-arrow"></i>
                    </div>

                    <div class="home-card" onclick="CategoryApp.openMessages()">
                        <div class="home-card-icon" style="background:rgba(59,130,246,0.15);color:#3b82f6;"><i class="fa-solid fa-envelope"></i></div>
                        <div class="home-card-body">
                            <div class="home-card-title">Mensajes <span id="home-messages-badge" class="home-badge" style="display:none;"></span></div>
                            <div class="home-card-desc" id="home-messages-desc">Tus conversaciones directas</div>
                        </div>
                        <i class="fa-solid fa-chevron-right home-card-arrow"></i>
                    </div>

                    <div class="home-card" onclick="CategoryApp.openMyProfile()">
                        <div class="home-card-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b;"><i class="fa-solid fa-compass"></i></div>
                        <div class="home-card-body">
                            <div class="home-card-title">Explorar</div>
                            <div class="home-card-desc">Descubre la comunidad de Stevscon</div>
                        </div>
                        <i class="fa-solid fa-chevron-right home-card-arrow"></i>
                    </div>
                </div>

                <div class="home-actions">
                    <button onclick="if(typeof FuncAuth!=='undefined')FuncAuth.logout()" class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger);"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesion</button>
                </div>
            </div>
        `;

        // Cargar contadores de forma asincrona sin bloquear el render inicial.
        this._loadHomeCounters(user);
    },

    // MEJORA A: carga los contadores del panel (solicitudes de amistad y mensajes sin leer).
    async _loadHomeCounters(user) {
        // Solicitudes de amistad entrantes.
        try {
            if (typeof FriendsSystem !== 'undefined' && FriendsSystem.getIncomingRequests) {
                const incoming = await FriendsSystem.getIncomingRequests(user.uid);
                const count = Array.isArray(incoming) ? incoming.length : 0;
                const badge = document.getElementById('home-friends-badge');
                const desc = document.getElementById('home-friends-desc');
                if (badge && count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-flex';
                    if (desc) desc.textContent = count === 1 ? '1 solicitud pendiente' : count + ' solicitudes pendientes';
                }
            }
        } catch (e) {
            console.warn('No se pudieron cargar las solicitudes:', e.message);
        }

        // Mensajes sin leer.
        try {
            if (typeof MessagesSystem !== 'undefined' && MessagesSystem.getTotalUnreadCount) {
                const unread = await MessagesSystem.getTotalUnreadCount();
                const count = unread || 0;
                const badge = document.getElementById('home-messages-badge');
                const desc = document.getElementById('home-messages-desc');
                if (badge && count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-flex';
                    if (desc) desc.textContent = count === 1 ? '1 mensaje sin leer' : count + ' mensajes sin leer';
                }
            }
        } catch (e) {
            console.warn('No se pudieron cargar los mensajes:', e.message);
        }
    },

    openMyProfile() {
        this._currentView = 'profile';
        const user = (typeof MemoryAcc !== 'undefined') ? MemoryAcc.getLocalUser() : null;
        if (user && typeof ProfileSystem !== 'undefined') {
            ProfileSystem.openProfile(user.uid);
        }
    },

    openProfile(handleOrUid) {
        this._currentView = 'profile';
        if (typeof ProfileSystem !== 'undefined') {
            ProfileSystem.openProfile(handleOrUid);
        }
    },

    openEditProfile() {
        if (typeof ProfileSystem !== 'undefined') {
            ProfileSystem.openEditProfile();
        }
    },

    openFriends() {
        this._currentView = 'friends';
        if (typeof FriendsSystem !== 'undefined') {
            FriendsSystem.renderFriendsPage();
        }
    },

    openMessages(convId) {
        this._currentView = 'messages';
        if (typeof MessagesSystem !== 'undefined') {
            if (convId) {
                MessagesSystem.renderConversation(convId);
            } else {
                MessagesSystem.renderMessagesPage();
            }
        }
    },

    returnHome() {
        if (typeof MessagesSystem !== 'undefined' && MessagesSystem.unsubscribeFromConversation) {
            MessagesSystem.unsubscribeFromConversation();
        }
        this.init();
    }
};

function regresarASocial() {
    CategoryApp.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CategoryApp.init());
} else {
    CategoryApp.init();
}
