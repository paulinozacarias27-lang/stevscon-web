const ProfileSystem = {
    _esc(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    STATUS_LABELS: {
        online: 'En linea',
        idle: 'Ausente',
        dnd: 'No molestar',
        offline: 'Desconectado',
        invisible: 'Invisible'
    },

    STATUS_SVG: {
        online: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#22c55e"/></svg>',
        idle: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#eab308"/><circle cx="15" cy="9" r="6" fill="#1a1a26"/></svg>',
        dnd: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#ef4444"/><rect x="6.5" y="10.5" width="11" height="3" rx="1.5" fill="#1a1a26"/></svg>',
        offline: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#6b7280"/><circle cx="12" cy="12" r="4.5" fill="#1a1a26"/></svg>',
        invisible: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="#6b7280"/><circle cx="12" cy="12" r="4.5" fill="#1a1a26"/></svg>'
    },

    STATUS_COLORS: {
        online: '#22c55e',
        idle: '#eab308',
        dnd: '#ef4444',
        offline: '#6b7280',
        invisible: '#6b7280'
    },

    getCurrentProfile() {
        return (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser) ? MemoryAcc.getLocalUser() : null;
    },

    async getProfile(uid) {
        if (typeof ProfileMemory === 'undefined') return null;
        return await ProfileMemory.getProfile(uid);
    },

    async getProfileByHandle(handle) {
        if (typeof ProfileMemory === 'undefined') return null;
        return await ProfileMemory.getProfileByHandle(handle);
    },

    // MEJORA G: skeleton loader (esqueleto animado) mientras carga el perfil, en vez de solo un spinner.
    _renderSkeleton() {
        return `
            <div class="profile-wrapper skeleton-wrapper" style="max-width:850px;margin:0 auto;">
                <div class="skeleton-box" style="height:200px;border-radius:0;"></div>
                <div class="profile-body">
                    <div class="skeleton-box skeleton-circle" style="width:130px;height:130px;position:absolute;top:-65px;left:30px;"></div>
                    <div class="skeleton-box" style="width:220px;height:26px;margin-top:10px;"></div>
                    <div class="skeleton-box" style="width:140px;height:16px;margin-top:12px;"></div>
                    <div class="skeleton-box" style="width:100%;height:70px;margin-top:30px;"></div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:20px;">
                        <div class="skeleton-box" style="height:60px;"></div>
                        <div class="skeleton-box" style="height:60px;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    async openProfile(uidOrHandle) {
        const root = document.getElementById('app-root');
        if (!root) return;

        root.innerHTML = this._renderSkeleton();

        let profile = null;
        if (uidOrHandle.startsWith('@')) {
            profile = await this.getProfileByHandle(uidOrHandle);
        } else {
            profile = await this.getProfile(uidOrHandle);
        }

        if (!profile) {
            root.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fa-solid fa-user-slash" style="font-size:2rem;color:var(--text-muted);"></i><p style="margin-top:10px;color:var(--text-muted);">Perfil no encontrado.</p></div>';
            return;
        }

        const currentProfile = this.getCurrentProfile();
        const isOwn = currentProfile && profile.uid === currentProfile.uid;

        let relationship = 'none';
        if (!isOwn && currentProfile) {
            if (typeof ProfileMemory !== 'undefined') {
                relationship = await ProfileMemory.getRelationshipStatus(currentProfile.uid, profile.uid);
            }
        }

        this.renderProfilePage(profile, { isOwn, relationship, currentProfile });
    },

    renderProfilePage(profile, opts) {
        opts = opts || {};
        const root = document.getElementById('app-root');
        if (!root) return;

        const esc = this._esc.bind(this);
        const isOwn = opts.isOwn || false;
        const relationship = opts.relationship || 'none';
        const currentProfile = opts.currentProfile || null;

        const avatarHTML = this.getAvatarMarkup(profile, 'large');
        const bannerStyle = this.getBannerStyle(profile);
        const statusLabel = this.getStatusLabel(profile.status);
        const statusColor = (this.STATUS_COLORS[profile.status] || '#6b7280');
        const joinDate = this.formatJoinDate(profile.createdAt);
        const bio = profile.bio ? esc(profile.bio) : '<span style="color:var(--text-muted);">Sin descripcion.</span>';
        const location = profile.location ? esc(profile.location) : null;
        const website = profile.website ? this._renderSafeLink(profile.website) : null;
        const badge = profile.badge ? '<span class="badge-tooltip-wrapper"><i class="fa-solid fa-crown" style="color:#f59e0b;font-size:0.9rem;"></i><span class="badge-tooltip"><span class="badge-tooltip-title">Owner</span><span class="badge-tooltip-desc">Owner of Stevscon.com</span></span></span>' : '';
        const verifiedIcon = profile.verified ? '<i class="fa-solid fa-circle-check verified-badge-icon"></i>' : '';

        const showStatus = profile.privacy && profile.privacy.showOnlineStatus !== false;
        const statusSvg = this.STATUS_SVG[profile.status || 'offline'] || this.STATUS_SVG.offline;
        const displayStatus = showStatus ? '<div class="profile-status-display"><span class="status-indicator" style="width:22px;height:22px;">' + statusSvg + '</span><span style="font-size:0.9rem;color:var(--text-muted);font-weight:500;">' + esc(statusLabel) + '</span></div>' : '';
        const customStatus = profile.customStatus ? '<div class="custom-status-bubble"><i class="fa-solid fa-comment-dots" style="font-size:0.75rem;color:var(--purple-accent);"></i><span style="font-size:0.85rem;color:var(--text-main);">' + esc(profile.customStatus) + '</span></div>' : '';

        let actionsHTML = '';
        if (isOwn) {
            actionsHTML = '<button class="btn btn-outline btn-sm" onclick="ProfileSystem.openEditProfile()"><i class="fa-solid fa-pen"></i> Editar perfil</button>';
        } else if (currentProfile) {
            actionsHTML = this._renderProfileActions(profile, relationship);
        }

        const friendsCount = (profile.stats && profile.stats.friendsCount) || 0;

        root.innerHTML = `
            <div class="profile-wrapper" style="max-width:850px;margin:0 auto;">
                <div class="profile-banner" style="${bannerStyle}">
                    ${isOwn ? '<button class="btn-personalizar" onclick="ProfileSystem._triggerBannerUpload()"><i class="fa-solid fa-camera"></i> Cambiar banner</button>' : ''}
                </div>
                <div class="profile-body">
                    <div class="profile-avatar-large" style="${profile.avatarURL ? 'background-image:url(' + esc(profile.avatarURL) + ');background-size:cover;' : ''}">
                        ${!profile.avatarURL ? esc((profile.username || 'U').charAt(0).toUpperCase()) : ''}
                        ${isOwn ? '<button onclick="ProfileSystem._triggerAvatarUpload()" style="position:absolute;bottom:5px;right:5px;background:var(--purple-accent);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:white;font-size:0.8rem;"><i class="fa-solid fa-camera"></i></button>' : ''}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                        <div>
                            <h2 class="profile-name">${esc(profile.username)} ${verifiedIcon} ${badge}</h2>
                            <p class="profile-handle">${esc(profile.handle)}</p>
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px;">
                                ${displayStatus}
                                ${customStatus}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">${actionsHTML}</div>
                    </div>

                    <h3 class="profile-section-title">Acerca de</h3>
                    <div class="profile-desc-box">${bio}</div>

                    <h3 class="profile-section-title">Informacion</h3>
                    <div class="info-grid">
                        <div class="info-box">
                            <div class="info-label">Miembro desde</div>
                            <div class="info-value">${esc(joinDate)}</div>
                        </div>
                        ${location ? '<div class="info-box"><div class="info-label">Ubicacion</div><div class="info-value">' + location + '</div></div>' : ''}
                        ${website ? '<div class="info-box"><div class="info-label">Sitio web</div><div class="info-value">' + website + '</div></div>' : ''}
                        <div class="info-box">
                            <div class="info-label">Amigos</div>
                            <div class="info-value">${friendsCount}</div>
                        </div>
                    </div>

                    <div id="profile-action-result" style="margin-top:15px;"></div>
                </div>
            </div>
            <input type="file" id="avatar-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" onchange="ProfileSystem._handleAvatarUpload(event)">
            <input type="file" id="banner-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" onchange="ProfileSystem._handleBannerUpload(event)">
        `;
    },

    _renderProfileActions(profile, relationship) {
        const esc = this._esc.bind(this);
        const uid = esc(profile.uid);
        let html = '';

        switch (relationship) {
            case 'friends':
                html += '<button class="btn btn-outline btn-sm" onclick="MessagesSystem.openConversationWithUser(\'' + uid + '\')"><i class="fa-solid fa-envelope"></i> Mensaje</button>';
                html += '<button class="btn btn-outline btn-sm" onclick="FriendsSystem.removeFriend(\'' + uid + '\')"><i class="fa-solid fa-user-minus"></i> Amigos</button>';
                break;
            case 'outgoing_request':
                html += '<button class="btn btn-outline btn-sm" onclick="FriendsSystem.cancelRequest(\'' + uid + '\')"><i class="fa-solid fa-clock"></i> Solicitud enviada</button>';
                break;
            case 'incoming_request':
                html += '<button class="btn btn-primary btn-sm" onclick="FriendsSystem.acceptRequest(\'' + uid + '\')"><i class="fa-solid fa-check"></i> Aceptar</button>';
                html += '<button class="btn btn-outline btn-sm" onclick="FriendsSystem.rejectRequest(\'' + uid + '\')"><i class="fa-solid fa-times"></i> Rechazar</button>';
                break;
            case 'blocked':
                html += '<button class="btn btn-outline btn-sm" onclick="FriendsSystem.unblockUser(\'' + uid + '\')"><i class="fa-solid fa-unlock"></i> Desbloquear</button>';
                break;
            default:
                if (profile.privacy && profile.privacy.allowFriendRequests !== false) {
                    html += '<button class="btn btn-primary btn-sm" onclick="FriendsSystem.sendRequest(\'' + uid + '\')"><i class="fa-solid fa-user-plus"></i> Agregar</button>';
                }
                html += '<button class="btn btn-outline btn-sm" onclick="MessagesSystem.openConversationWithUser(\'' + uid + '\')"><i class="fa-solid fa-envelope"></i> Mensaje</button>';
                break;
        }

        if (relationship !== 'blocked') {
            html += '<button class="btn btn-outline btn-sm" onclick="FriendsSystem.confirmBlockUser(\'' + uid + '\')" style="border-color:var(--danger);color:var(--danger);"><i class="fa-solid fa-ban"></i></button>';
        }

        return html;
    },

    _renderSafeLink(url) {
        if (!url) return '';
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        const esc = this._esc.bind(this);
        const display = esc(url.replace(/^https?:\/\//, '').replace(/\/$/, ''));
        return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--purple-accent);text-decoration:none;">' + display + '</a>';
    },

    getStatusIndicator(status, size) {
        const svg = this.STATUS_SVG[status] || this.STATUS_SVG.offline;
        const px = size || 20;
        return '<span class="status-indicator" style="width:' + px + 'px;height:' + px + 'px;">' + svg + '</span>';
    },

    getAvatarMarkup(profile, size, showStatusDot) {
        if (!profile) return '';
        const esc = this._esc.bind(this);
        const px = size === 'large' ? '130px' : (size === 'small' ? '38px' : '45px');
        const fontSize = size === 'large' ? '3.5rem' : (size === 'small' ? '0.9rem' : '1.1rem');
        const dotSize = size === 'large' ? '34px' : (size === 'small' ? '16px' : '18px');

        const showDot = showStatusDot !== false && (profile.privacy && profile.privacy.showOnlineStatus !== false);
        const statusDot = showDot ? '<span class="avatar-status-overlay" style="width:' + dotSize + ';height:' + dotSize + ';">' + (this.STATUS_SVG[profile.status] || this.STATUS_SVG.offline) + '</span>' : '';

        if (profile.avatarURL) {
            return '<div class="avatar avatar-with-status" style="width:' + px + ';height:' + px + ';background-image:url(' + esc(profile.avatarURL) + ');background-size:cover;background-position:center;border-radius:50%;border:2px solid var(--purple-accent);position:relative;">' + statusDot + '</div>';
        }
        return '<div class="avatar avatar-with-status" style="width:' + px + ';height:' + px + ';font-size:' + fontSize + ';border-radius:50%;border:2px solid var(--purple-accent);display:flex;align-items:center;justify-content:center;font-weight:bold;background:var(--bg-main);position:relative;">' + esc((profile.username || 'U').charAt(0).toUpperCase()) + statusDot + '</div>';
    },

    getBannerStyle(profile) {
        if (profile && profile.bannerURL) {
            return 'background-image:url(' + this._esc(profile.bannerURL) + ');background-size:cover;background-position:center;';
        }
        return 'background:linear-gradient(135deg,var(--purple-dark),var(--purple-accent));';
    },

    formatJoinDate(dateStr) {
        if (!dateStr) return 'Fecha desconocida';
        try {
            const date = new Date(dateStr);
            const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
        } catch (e) {
            return 'Fecha desconocida';
        }
    },

    getStatusLabel(status) {
        return this.STATUS_LABELS[status] || 'Desconectado';
    },

    async updateMyProfile(data) {
        const current = this.getCurrentProfile();
        if (!current) return false;

        // MEJORA G: sanitizar (recortar espacios) todos los strings antes de validar/guardar.
        if (typeof data.username === 'string') data.username = data.username.trim();
        if (typeof data.bio === 'string') data.bio = data.bio.trim();
        if (typeof data.location === 'string') data.location = data.location.trim();
        if (typeof data.website === 'string') data.website = data.website.trim();
        if (typeof data.customStatus === 'string') data.customStatus = data.customStatus.trim();

        if (data.username !== undefined) {
            if (!data.username || data.username.length < 2) {
                throw new Error('El nombre de usuario debe tener al menos 2 caracteres.');
            }
            if (data.username.length > 32) {
                throw new Error('El nombre de usuario no puede superar 32 caracteres.');
            }
        }

        if (data.bio !== undefined && data.bio.length > 300) {
            throw new Error('La bio no puede superar 300 caracteres.');
        }

        if (data.customStatus !== undefined && data.customStatus.length > 100) {
            throw new Error('El estado personalizado no puede superar 100 caracteres.');
        }

        if (data.website !== undefined && data.website) {
            if (!/^https?:\/\/.+/i.test(data.website)) {
                data.website = 'https://' + data.website;
            }
        }

        delete data.uid;
        delete data.email;
        delete data.role;
        delete data.rank;
        delete data.verified;
        delete data.badge;
        delete data.handle;
        delete data.handleLower;

        const success = await ProfileMemory.updateProfile(current.uid, data);
        if (success) {
            const updated = { ...current, ...data };
            if (typeof MemoryAcc !== 'undefined') {
                MemoryAcc.setLocalUser(updated);
            }
            if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
                UIButtons.renderHeaderAuth();
            }
        }
        return success;
    },

    openEditProfile() {
        if (typeof UIProfile === 'undefined' || !UIProfile.renderEditModal) {
            console.warn('UIProfile module not loaded.');
            return;
        }
        const current = this.getCurrentProfile();
        if (!current) return;
        UIProfile.renderEditModal(current);
    },

    _triggerAvatarUpload() {
        const input = document.getElementById('avatar-upload-input');
        if (input) input.click();
    },

    _triggerBannerUpload() {
        const input = document.getElementById('banner-upload-input');
        if (input) input.click();
    },

    async _handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const current = this.getCurrentProfile();
        if (!current) return;

        const resultDiv = document.getElementById('profile-action-result');
        if (resultDiv) resultDiv.innerHTML = '<p style="color:var(--purple-accent);"><i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo avatar...</p>';

        try {
            const url = await ProfileMemory.uploadAvatar(current.uid, file);
            if (url) {
                if (typeof MemoryAcc !== 'undefined') {
                    MemoryAcc.setLocalUser({ ...current, avatarURL: url });
                }
                if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
                    UIButtons.renderHeaderAuth();
                }
                this.openProfile(current.uid);
            }
        } catch (e) {
            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showError('profile-action-result', e.message);
            } else if (resultDiv) {
                resultDiv.innerHTML = '<p style="color:var(--danger);">' + this._esc(e.message) + '</p>';
            }
        }
        event.target.value = '';
    },

    async _handleBannerUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const current = this.getCurrentProfile();
        if (!current) return;

        const resultDiv = document.getElementById('profile-action-result');
        if (resultDiv) resultDiv.innerHTML = '<p style="color:var(--purple-accent);"><i class="fa-solid fa-circle-notch fa-spin"></i> Subiendo banner...</p>';

        try {
            const url = await ProfileMemory.uploadBanner(current.uid, file);
            if (url) {
                if (typeof MemoryAcc !== 'undefined') {
                    MemoryAcc.setLocalUser({ ...current, bannerURL: url });
                }
                this.openProfile(current.uid);
            }
        } catch (e) {
            if (typeof UIAlerts !== 'undefined') {
                UIAlerts.showError('profile-action-result', e.message);
            } else if (resultDiv) {
                resultDiv.innerHTML = '<p style="color:var(--danger);">' + this._esc(e.message) + '</p>';
            }
        }
        event.target.value = '';
    },

    async setStatus(newStatus) {
        const current = this.getCurrentProfile();
        if (!current) return false;
        const success = await ProfileMemory.updateProfile(current.uid, {
            status: newStatus,
            statusUpdatedAt: new Date().toISOString()
        });
        try { await ProfileMemory.updatePresence(current.uid, newStatus); } catch (e) { console.warn('Presence update skipped:', e.message); }
        if (success) {
            if (typeof MemoryAcc !== 'undefined') {
                MemoryAcc.setLocalUser({ ...current, status: newStatus });
            }
            if (typeof UIButtons !== 'undefined' && UIButtons.renderHeaderAuth) {
                UIButtons.renderHeaderAuth();
            }
        }
        return success;
    },

    toggleStatusPicker(e) {
        if (e) { e.stopPropagation(); }
        const picker = document.getElementById('status-picker-bubble');
        if (!picker) return;
        const isShown = picker.style.display === 'block';
        picker.style.display = isShown ? 'none' : 'block';
        if (!isShown) {
            setTimeout(() => {
                document.addEventListener('click', this._statusOutsideHandler = (ev) => {
                    if (picker && !picker.contains(ev.target)) {
                        picker.style.display = 'none';
                        document.removeEventListener('click', this._statusOutsideHandler);
                    }
                });
            }, 0);
        }
    },

    async changeStatus(newStatus) {
        const picker = document.getElementById('status-picker-bubble');
        if (picker) picker.style.display = 'none';
        const menu = document.getElementById('user-dropdown-menu');
        if (menu) menu.style.display = 'none';
        await this.setStatus(newStatus);
        if (typeof CategoryApp !== 'undefined' && CategoryApp._currentView === 'profile') {
            const current = this.getCurrentProfile();
            if (current) this.openProfile(current.uid);
        }
    },

    getStatusPickerHTML(currentStatus) {
        const statuses = [
            { key: 'online', label: 'En linea', desc: 'Disponible para chatear' },
            { key: 'idle', label: 'Ausente', desc: 'Inactivo por un rato' },
            { key: 'dnd', label: 'No molestar', desc: 'Silenciar notificaciones' },
            { key: 'invisible', label: 'Invisible', desc: 'Oculto pero conectado' }
        ];
        let html = '<div id="status-picker-bubble" class="status-picker-bubble" style="display:none;">';
        html += '<div class="status-picker-header">Estado de presencia</div>';
        for (const s of statuses) {
            const isActive = currentStatus === s.key;
            html += '<div class="status-picker-item' + (isActive ? ' active' : '') + '" onclick="ProfileSystem.changeStatus(\'' + s.key + '\')">';
            html += '<span class="status-indicator" style="width:24px;height:24px;">' + this.STATUS_SVG[s.key] + '</span>';
            html += '<div class="status-picker-text"><div class="status-picker-label">' + this._esc(s.label) + '</div><div class="status-picker-desc">' + this._esc(s.desc) + '</div></div>';
            if (isActive) html += '<i class="fa-solid fa-check" style="color:var(--purple-accent);margin-left:auto;"></i>';
            html += '</div>';
        }
        html += '</div>';
        return html;
    }
};
