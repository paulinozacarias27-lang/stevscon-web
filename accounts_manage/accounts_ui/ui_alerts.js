const UIAlerts = {
    _escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const escapedMessage = this._escape(message);
        container.innerHTML = `
            <div class="error-msg" style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: 8px;">
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
                <span>${escapedMessage}</span>
            </div>
        `;
    },

    showSuccess(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const escapedMessage = this._escape(message);
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; padding: 10px 14px; background: rgba(139, 92, 246, 0.15); border: 1px solid var(--purple-accent); color: var(--text-main); border-radius: 8px; font-size: 0.9rem;">
                <i class="fa-solid fa-circle-check" style="color: var(--purple-accent);"></i>
                <span>${escapedMessage}</span>
            </div>
        `;
    },

    clear(containerId) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    },

    showConfirm({ title, message, confirmText, cancelText, danger, onConfirm }) {
        this.closeConfirm();

        const esc = this._escape.bind(this);
        const overlay = document.createElement('div');
        overlay.id = 'confirm-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';

        const confirmBtnClass = danger ? 'btn' : 'btn btn-primary';
        const confirmBtnStyle = danger ? 'style="flex:1;background:var(--danger);color:white;border:none;border-radius:8px;padding:10px 20px;font-weight:600;cursor:pointer;"' : 'style="flex:1;"';

        overlay.innerHTML = `
            <div class="stevscon-accounts-card" style="max-width:400px;width:100%;text-align:center;">
                <h3 style="margin-bottom:10px;color:${danger ? 'var(--danger)' : 'var(--purple-accent)'};">${esc(title || 'Confirmar')}</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px;line-height:1.5;">${esc(message || '')}</p>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-outline" style="flex:1;" id="confirm-cancel-btn">${esc(cancelText || 'Cancelar')}</button>
                    <button ${confirmBtnClass} ${confirmBtnStyle} id="confirm-yes-btn">${esc(confirmText || 'Confirmar')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cancelBtn = document.getElementById('confirm-cancel-btn');
        const yesBtn = document.getElementById('confirm-yes-btn');

        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeConfirm());
        if (yesBtn) yesBtn.addEventListener('click', () => {
            this.closeConfirm();
            if (typeof onConfirm === 'function') onConfirm();
        });

        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeConfirm(); });

        this._confirmEscHandler = (e) => { if (e.key === 'Escape') this.closeConfirm(); };
        document.addEventListener('keydown', this._confirmEscHandler);
    },

    closeConfirm() {
        const overlay = document.getElementById('confirm-overlay');
        if (overlay) overlay.remove();
        if (this._confirmEscHandler) {
            document.removeEventListener('keydown', this._confirmEscHandler);
            this._confirmEscHandler = null;
        }
    }
};