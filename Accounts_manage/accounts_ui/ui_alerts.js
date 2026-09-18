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
    }
};