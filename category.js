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

    renderHomeScreen(user) {
        this._currentView = 'home';
        if (typeof MessagesSystem !== 'undefined' && MessagesSystem.unsubscribeFromConversation) {
            MessagesSystem.unsubscribeFromConversation();
        }
        const root = document.getElementById('app-root');
        if (!root) return;

        const escapedUsername = this._escape(user.username || 'Usuario');
        const escapedHandle = this._escape(user.handle || '');
        const escapedEmail = this._escape(user.email || 'N/A');
        const avatarInitial = this._escape((user.username || 'U').charAt(0).toUpperCase());
        const avatarHTML = user.avatarURL
            ? '<div style="width:75px;height:75px;margin:0 auto 15px auto;background-image:url(' + this._escape(user.avatarURL) + ');background-size:cover;border-radius:50%;border:3px solid var(--purple-accent);"></div>'
            : '<div style="width:75px;height:75px;font-size:2.2rem;margin:0 auto 15px auto;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">' + avatarInitial + '</div>';

        const isOwner = (typeof OwnerSystem !== 'undefined' && OwnerSystem.isOwner) ? OwnerSystem.isOwner(user) : false;
        const isAdmin = (typeof AdminSystem !== 'undefined' && AdminSystem.isAdmin) ? AdminSystem.isAdmin(user) : false;
        let badgeIcon = '';
        if (isOwner) badgeIcon = '<i class="fa-solid fa-crown" style="color:#f59e0b;"></i> Owner';
        else if (isAdmin) badgeIcon = '<i class="fa-solid fa-shield-halved" style="color:var(--purple-accent);"></i> Admin';
        else badgeIcon = '<i class="fa-solid fa-user" style="color:var(--text-muted);"></i> Usuario';

        root.innerHTML = `
            <div style="max-width:600px;margin:40px auto;text-align:center;padding:35px 25px;background:#12121a;border:1px solid #232333;border-radius:12px;color:white;">
                ${avatarHTML}
                <h2 style="font-size:1.8rem;margin-bottom:5px;">¡Bienvenido, ${escapedUsername}!</h2>
                <p style="color:#aaa;font-size:1rem;margin-bottom:5px;">${escapedHandle}</p>
                <p style="color:#aaa;font-size:0.85rem;margin-bottom:15px;">${badgeIcon}</p>
                <div style="background:#1a1a26;border:1px solid #333;border-radius:10px;padding:18px;text-align:left;font-size:0.9rem;color:#aaa;margin-bottom:20px;">
                    <p style="margin-bottom:8px;"><strong style="color:#fff;">Correo:</strong> ${escapedEmail}</p>
                    <p><strong style="color:#fff;">Estado:</strong> Sesion activa en Stevscon.</p>
                </div>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <button onclick="CategoryApp.openMyProfile()" class="btn btn-primary btn-sm"><i class="fa-solid fa-user"></i> Mi perfil</button>
                    <button onclick="CategoryApp.openFriends()" class="btn btn-outline btn-sm"><i class="fa-solid fa-users"></i> Amigos</button>
                    <button onclick="CategoryApp.openMessages()" class="btn btn-outline btn-sm"><i class="fa-solid fa-envelope"></i> Mensajes</button>
                    <button onclick="if(typeof FuncAuth!=='undefined')FuncAuth.logout()" class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger);"><i class="fa-solid fa-right-from-bracket"></i> Salir</button>
                </div>
            </div>
        `;
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
