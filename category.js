const CategoryApp = {
    _escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

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
            if (currentUser) {
                this.renderHomeScreen(currentUser);
            }
        }
    },

    renderAuth(tab = 'login') {
        if (typeof UIAuth !== 'undefined' && UIAuth.renderAuthForm) {
            UIAuth.renderAuthForm(tab);
        }
    },

    renderHomeScreen(user) {
        const root = document.getElementById('app-root');
        if (!root) return;

        const escapedUsername = this._escape(user.username || 'Usuario');
        const escapedHandle = this._escape(user.handle || '');
        const escapedEmail = this._escape(user.email || 'N/A');
        const avatarInitial = this._escape((user.username || 'U').charAt(0).toUpperCase());

        root.innerHTML = `
            <div style="max-width: 600px; margin: 40px auto; text-align: center; padding: 35px 25px; background: #12121a; border: 1px solid #232333; border-radius: 12px; color: white;">
                <div style="width: 75px; height: 75px; font-size: 2.2rem; margin: 0 auto 15px auto; background: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${avatarInitial}
                </div>
                <h2 style="font-size: 1.8rem; margin-bottom: 5px;">¡Bienvenido, ${escapedUsername}!</h2>
                <p style="color: #aaa; font-size: 1rem; margin-bottom: 15px;">${escapedHandle}</p>
                <div style="background: #1a1a26; border: 1px solid #333; border-radius: 10px; padding: 18px; text-align: left; font-size: 0.9rem; color: #aaa; margin-bottom: 20px;">
                    <p style="margin-bottom: 8px;"><strong style="color: #fff;">Correo:</strong> ${escapedEmail}</p>
                    <p><strong style="color: #fff;">Estado:</strong> Sesión activa en Stevscon Accounts.</p>
                </div>
                <button onclick="if(typeof FuncAuth !== 'undefined'){FuncAuth.logout();}else{MemoryAcc.clearLocalUser();location.reload();}" class="btn btn-outline" style="padding: 10px 20px; border: 1px solid #ef4444; color: #ef4444; background: transparent; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    Cerrar Sesión
                </button>
            </div>
        `;
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
