/**
 * STEVSON.COM :: ui_buttons.js
 * Dibuja la zona derecha del header: botón "Iniciar Sesión" cuando no
 * hay usuario, y tarjeta de usuario (avatar con letra + estado + menú
 * desplegable) cuando hay sesión activa.
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsUIButtons !== 'undefined') { return; }

    /* Paleta de avatares por letra (morados/colores del tema) */
    var AVATAR_COLORS = ['#8b5cf6', '#6d28d9', '#a78bfa', '#7c3aed', '#d946ef', '#c026d3'];

    function _colorFor(name) {
        var hash = 0, s = String(name || 'sc');
        for (var i = 0; i < s.length; i++) { hash = (hash * 31 + s.charCodeAt(i)) >>> 0; }
        return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    }

    var AccountsUIButtons = {

        render: function (authUser, userData) {
            var zone = document.getElementById('user-header-actions');
            if (!zone) { return; }
            zone.innerHTML = '';

            if (!authUser) {
                zone.innerHTML = '<button id="btn-login-trigger" class="btn btn-primary">' +
                    '<i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión</button>';
                document.getElementById('btn-login-trigger').addEventListener('click', function () {
                    if (typeof window.AccountsUIAuth !== 'undefined') { window.AccountsUIAuth.open('login'); }
                });
                return;
            }

            /* ---------- Tarjeta de usuario con sesión ---------- */
            var uie = (typeof window.AccountsUIErrors !== 'undefined') ? window.AccountsUIErrors : null;
            var esc = uie ? uie.escape : function (s) { return s; };

            var handle = (userData && userData.handle) ? userData.handle : 'usuario';
            var name = (userData && userData.displayName) ? userData.displayName : handle;
            var letter = handle.charAt(0).toUpperCase();
            var photo = (userData && userData.photoURL) ? userData.photoURL : '';
            var rank = (userData && userData.rank) ? userData.rank : 'USER';
            var rankInfo = (typeof window.AccountsMemory !== 'undefined')
                ? window.AccountsMemory.getRankInfo(rank) : { label: rank, color: '#94a3b8', icon: 'fa-user' };

            var avatarInner = photo
                ? '<img src="' + esc(photo) + '" alt="Avatar" class="avatar-small">'
                : '<span class="avatar-letter" style="background:' + _colorFor(handle) + '">' + esc(letter) + '</span>';

            zone.innerHTML =
                '<div id="user-profile-badge" class="user-badge">' +
                    '<div class="avatar-wrapper">' + avatarInner +
                        '<span id="header-status-dot" class="user-status-dot state-online"></span>' +
                    '</div>' +
                    '<span id="header-username" class="username-display">' + esc(handle) + '</span>' +
                    '<span class="rank-badge" style="color:' + rankInfo.color + '" title="' + esc(rankInfo.label) + '">' +
                        '<i class="fa-solid ' + rankInfo.icon + '"></i>' +
                    '</span>' +
                    '<i class="fa-solid fa-chevron-down chev"></i>' +
                '</div>' +
                '<div id="user-dropdown" class="user-dropdown hidden">' +
                    '<div class="user-dropdown-header">' +
                        '<span class="user-dropdown-name">' + esc(name) + '</span>' +
                        '<span class="user-dropdown-handle">@' + esc(handle) + '</span>' +
                    '</div>' +
                    '<button class="user-dropdown-item" data-acc="profile"><i class="fa-solid fa-user"></i> Ver perfil</button>' +
                    '<button class="user-dropdown-item" data-acc="settings"><i class="fa-solid fa-gear"></i> Configuración</button>' +
                    (rank === 'OWNER' || rank === 'ADMIN' || rank === 'MOD'
                        ? '<button class="user-dropdown-item" data-acc="admin"><i class="fa-solid fa-shield-halved"></i> Panel de administración</button>'
                        : '') +
                    '<div class="user-dropdown-sep"></div>' +
                    '<button class="user-dropdown-item danger" data-acc="logout"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button>' +
                '</div>';

            /* ---------- Eventos del menú ---------- */
            var badge = document.getElementById('user-profile-badge');
            var dropdown = document.getElementById('user-dropdown');

            badge.addEventListener('click', function (ev) {
                ev.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', function () { dropdown.classList.add('hidden'); });
            dropdown.addEventListener('click', function (ev) { ev.stopPropagation(); });

            dropdown.addEventListener('click', function (ev) {
                var item = ev.target.closest('[data-acc]');
                if (!item) { return; }
                var action = item.getAttribute('data-acc');
                dropdown.classList.add('hidden');
                if (action === 'logout' && typeof window.AccountsButtons !== 'undefined') {
                    window.AccountsButtons.doLogout();
                } else if (action === 'profile' && typeof window.AccountsUISessions !== 'undefined') {
                    window.AccountsUISessions.goToProfile();
                } else if (action === 'admin' && typeof window.AccountsUISessions !== 'undefined') {
                    window.AccountsUISessions.goToAdmin();
                } else if (action === 'settings' && typeof window.AccountsUISessions !== 'undefined') {
                    window.AccountsUISessions.goToSettings();
                }
            });
        }
    };

    window.AccountsUIButtons = AccountsUIButtons;
    console.log('[Stevscon] ui_buttons.js listo.');

})(window);