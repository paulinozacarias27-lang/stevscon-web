const UIProfile = {
    _esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    renderEditModal(profile) {
        this.closeModal();
        const overlay = document.createElement('div');
        overlay.id = 'profile-edit-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';

        const esc = this._esc.bind(this);
        const avatarHTML = ProfileSystem.getAvatarMarkup(profile, 'large');
        const bannerStyle = ProfileSystem.getBannerStyle(profile);
        const statusSvg = ProfileSystem.STATUS_SVG[profile.status || 'offline'] || ProfileSystem.STATUS_SVG.offline;

        overlay.innerHTML = `
            <div class="stevscon-accounts-card" style="max-width:500px;width:100%;margin:auto;position:relative;">
                <button onclick="UIProfile.closeModal()" style="position:absolute;top:15px;right:15px;background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;"><i class="fa-solid fa-times"></i></button>
                <h2 style="text-align:center;margin-bottom:20px;color:var(--purple-accent);">Editar Perfil</h2>

                <div style="margin-bottom:20px;">
                    <div class="profile-banner" style="${bannerStyle};height:120px;border-radius:8px;position:relative;">
                        <button onclick="document.getElementById('modal-banner-input').click()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);border:none;border-radius:6px;padding:5px 10px;color:white;cursor:pointer;font-size:0.8rem;"><i class="fa-solid fa-camera"></i></button>
                    </div>
                    <div style="display:flex;align-items:flex-end;gap:10px;margin-top:-30px;padding-left:15px;">
                        <div style="position:relative;">
                            ${avatarHTML}
                            <button onclick="document.getElementById('modal-avatar-input').click()" style="position:absolute;bottom:0;right:0;background:var(--purple-accent);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;color:white;font-size:0.7rem;"><i class="fa-solid fa-camera"></i></button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Nombre de usuario</label>
                    <input type="text" class="form-input" id="edit-username" value="${esc(profile.username || '')}" maxlength="32">
                </div>

                <div class="form-group">
                    <label class="form-label">Biografia (max 300 caracteres)</label>
                    <textarea class="form-input" id="edit-bio" rows="3" maxlength="300" style="resize:vertical;">${esc(profile.bio || '')}</textarea>
                    <div id="bio-counter" style="font-size:0.75rem;color:var(--text-muted);text-align:right;">${(profile.bio || '').length}/300</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Ubicacion</label>
                    <input type="text" class="form-input" id="edit-location" value="${esc(profile.location || '')}" maxlength="100">
                </div>

                <div class="form-group">
                    <label class="form-label">Sitio web</label>
                    <input type="text" class="form-input" id="edit-website" value="${esc(profile.website || '')}" placeholder="https://...">
                </div>

                <div class="form-group">
                    <label class="form-label">Estado personalizado (max 100 caracteres)</label>
                    <input type="text" class="form-input" id="edit-custom-status" value="${esc(profile.customStatus || '')}" maxlength="100">
                </div>

                <div class="form-group">
                    <label class="form-label">Estado de presencia</label>
                    <select class="form-input" id="edit-status" onchange="UIProfile.updateStatusPreview()">
                        <option value="online" ${profile.status === 'online' ? 'selected' : ''}>En linea</option>
                        <option value="idle" ${profile.status === 'idle' ? 'selected' : ''}>Ausente</option>
                        <option value="dnd" ${profile.status === 'dnd' ? 'selected' : ''}>No molestar</option>
                        <option value="invisible" ${profile.status === 'invisible' ? 'selected' : ''}>Invisible</option>
                    </select>
                    <div id="status-preview-box" style="display:flex;align-items:center;gap:10px;margin-top:8px;padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:8px;border:1px solid var(--border-color);">
                        <span class="status-indicator" style="width:22px;height:22px;" id="status-preview-icon">${statusSvg}</span>
                        <div style="display:flex;flex-direction:column;">
                            <span style="font-size:0.88rem;font-weight:600;color:var(--text-main);" id="status-preview-label">${this._esc(ProfileSystem.getStatusLabel(profile.status))}</span>
                            <span style="font-size:0.72rem;color:var(--text-muted);">Asi te veran los demas.</span>
                        </div>
                    </div>
                </div>

                <h3 class="profile-section-title" style="margin-top:20px;">Privacidad</h3>

                <div class="form-group">
                    <label class="form-label">Visibilidad del perfil</label>
                    <select class="form-input" id="edit-visibility">
                        <option value="public" ${(profile.privacy && profile.privacy.profileVisibility === 'public') ? 'selected' : ''}>Publico</option>
                        <option value="friends" ${(profile.privacy && profile.privacy.profileVisibility === 'friends') ? 'selected' : ''}>Solo amigos</option>
                        <option value="private" ${(profile.privacy && profile.privacy.profileVisibility === 'private') ? 'selected' : ''}>Privado</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Permitir solicitudes de amistad</label>
                    <select class="form-input" id="edit-allow-friends">
                        <option value="true" ${(profile.privacy && profile.privacy.allowFriendRequests !== false) ? 'selected' : ''}>Si</option>
                        <option value="false" ${(profile.privacy && profile.privacy.allowFriendRequests === false) ? 'selected' : ''}>No</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Permitir mensajes directos</label>
                    <select class="form-input" id="edit-allow-dm">
                        <option value="everyone" ${(profile.privacy && profile.privacy.allowDirectMessages === 'everyone') ? 'selected' : ''}>Todos</option>
                        <option value="friends" ${(profile.privacy && profile.privacy.allowDirectMessages === 'friends') ? 'selected' : ''}>Solo amigos</option>
                        <option value="none" ${(profile.privacy && profile.privacy.allowDirectMessages === 'none') ? 'selected' : ''}>Nadie</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Mostrar estado online</label>
                    <select class="form-input" id="edit-show-status">
                        <option value="true" ${(profile.privacy && profile.privacy.showOnlineStatus !== false) ? 'selected' : ''}>Si</option>
                        <option value="false" ${(profile.privacy && profile.privacy.showOnlineStatus === false) ? 'selected' : ''}>No</option>
                    </select>
                </div>

                <div id="edit-profile-alert" style="margin-bottom:15px;"></div>

                <div style="display:flex;gap:10px;">
                    <button class="btn btn-outline" style="flex:1;" onclick="UIProfile.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" style="flex:1;" id="btn-save-profile" onclick="UIProfile.handleSaveProfile()">Guardar cambios</button>
                </div>
            </div>
            <input type="file" id="modal-avatar-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" onchange="UIProfile.handleModalAvatarUpload(event)">
            <input type="file" id="modal-banner-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" onchange="UIProfile.handleModalBannerUpload(event)">
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeModal(); });
        document.addEventListener('keydown', this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); });

        const bioInput = document.getElementById('edit-bio');
        if (bioInput) {
            bioInput.addEventListener('input', () => {
                const counter = document.getElementById('bio-counter');
                if (counter) counter.textContent = bioInput.value.length + '/300';
            });
        }
    },

    updateStatusPreview() {
        const select = document.getElementById('edit-status');
        const iconEl = document.getElementById('status-preview-icon');
        const labelEl = document.getElementById('status-preview-label');
        if (!select || !iconEl || !labelEl) return;
        const status = select.value;
        const svg = ProfileSystem.STATUS_SVG[status] || ProfileSystem.STATUS_SVG.offline;
        const label = ProfileSystem.STATUS_LABELS[status] || 'Desconectado';
        iconEl.innerHTML = svg;
        labelEl.textContent = label;
    },

    async handleModalAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        const alertBox = document.getElementById('edit-profile-alert');
        if (alertBox) alertBox.innerHTML = '<p style="color:var(--purple-accent);"><i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo avatar...</p>';
        try {
            const url = await ProfileMemory.uploadAvatar(current.uid, file);
            if (url) {
                if (typeof MemoryAcc !== 'undefined') MemoryAcc.setLocalUser({ ...current, avatarURL: url });
                if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) UIButtons.renderHeaderAuth();
                if (alertBox) alertBox.innerHTML = '<p style="color:#22c55e;"><i class="fa-solid fa-circle-check"></i> Avatar actualizado.</p>';
                this.closeModal();
                ProfileSystem.openProfile(current.uid);
            }
        } catch (e) {
            if (alertBox) alertBox.innerHTML = '<p style="color:var(--danger);">' + this._esc(e.message) + '</p>';
        }
        event.target.value = '';
    },

    async handleModalBannerUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const current = ProfileSystem.getCurrentProfile();
        if (!current) return;
        const alertBox = document.getElementById('edit-profile-alert');
        if (alertBox) alertBox.innerHTML = '<p style="color:var(--purple-accent);"><i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo banner...</p>';
        try {
            const url = await ProfileMemory.uploadBanner(current.uid, file);
            if (url) {
                if (typeof MemoryAcc !== 'undefined') MemoryAcc.setLocalUser({ ...current, bannerURL: url });
                if (alertBox) alertBox.innerHTML = '<p style="color:#22c55e;"><i class="fa-solid fa-circle-check"></i> Banner actualizado.</p>';
                this.closeModal();
                ProfileSystem.openProfile(current.uid);
            }
        } catch (e) {
            if (alertBox) alertBox.innerHTML = '<p style="color:var(--danger);">' + this._esc(e.message) + '</p>';
        }
        event.target.value = '';
    },

    async handleSaveProfile() {
        const btn = document.getElementById('btn-save-profile');
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

        const username = document.getElementById('edit-username').value.trim();
        const bio = document.getElementById('edit-bio').value.trim();
        const location = document.getElementById('edit-location').value.trim();
        const website = document.getElementById('edit-website').value.trim();
        const customStatus = document.getElementById('edit-custom-status').value.trim();
        const status = document.getElementById('edit-status').value;
        const visibility = document.getElementById('edit-visibility').value;
        const allowFriends = document.getElementById('edit-allow-friends').value === 'true';
        const allowDM = document.getElementById('edit-allow-dm').value;
        const showStatus = document.getElementById('edit-show-status').value === 'true';

        const data = {
            username,
            bio,
            location,
            website,
            customStatus,
            status,
            privacy: {
                profileVisibility: visibility,
                allowFriendRequests: allowFriends,
                allowDirectMessages: allowDM,
                showOnlineStatus: showStatus
            }
        };

        try {
            const success = await ProfileSystem.updateMyProfile(data);
            if (success) {
                if (typeof UIAlerts !== 'undefined') {
                    UIAlerts.showSuccess('edit-profile-alert', 'Perfil actualizado correctamente.');
                }
                setTimeout(() => {
                    this.closeModal();
                    const current = ProfileSystem.getCurrentProfile();
                    if (current) ProfileSystem.openProfile(current.uid);
                }, 800);
            } else {
                if (typeof UIAlerts !== 'undefined') {
                    UIAlerts.showError('edit-profile-alert', 'No se pudo guardar el perfil.');
                }
                if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
            }
        } catch (e) {
            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showError('edit-profile-alert', e.message);
            }
            if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
        }
    },

    closeModal() {
        const overlay = document.getElementById('profile-edit-overlay');
        if (overlay) overlay.remove();
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    }
};
