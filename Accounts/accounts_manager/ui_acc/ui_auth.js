/**
 * STEVSON.COM :: ui_auth.js
 * Dibuja la tarjeta de autenticación (login / registro / recuperación)
 * dentro de #modals-root, usando las clases de styles.css.
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsUIAuth !== 'undefined') { return; }

    var AccountsUIAuth = {

        _mode: 'login',   // login | register | reset
        _built: false,

        /* ---------- CONSTRUCCIÓN ---------- */
        build: function () {
            if (this._built) { return; }
            var root = document.getElementById('modals-root');
            if (!root) { return; }

            var overlay = document.createElement('div');
            overlay.id = 'auth-modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML =
                '<div class="stevscon-accounts-card auth-modal-card">' +
                    '<button class="auth-close-btn" id="auth-close-btn" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
                    '<div class="accounts-header">' +
                        '<div class="accounts-logo"><i class="fa-solid fa-user-astronaut"></i></div>' +
                        '<h2 id="auth-card-title">Bienvenido a Stevscon</h2>' +
                    '</div>' +
                    '<div class="auth-tabs">' +
                        '<button type="button" class="auth-tab-btn active" data-mode="login"><i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión</button>' +
                        '<button type="button" class="auth-tab-btn" data-mode="register"><i class="fa-solid fa-user-plus"></i> Crear Cuenta</button>' +
                    '</div>' +
                    '<form id="auth-form" novalidate>' +
                        '<div class="form-group acc-only acc-register">' +
                            '<label class="form-label" for="acc-display-name">Nombre visible</label>' +
                            '<input type="text" id="acc-display-name" class="form-input" maxlength="25" placeholder="Ej: Steven" autocomplete="nickname">' +
                        '</div>' +
                        '<div class="form-group acc-only acc-register">' +
                            '<label class="form-label" for="acc-handle">Tu handler único</label>' +
                            '<div class="handler-input-wrap">' +
                                '<span class="handler-at">@</span>' +
                                '<input type="text" id="acc-handle" class="form-input" maxlength="20" placeholder="StevsLoL" autocomplete="off" spellcheck="false">' +
                            '</div>' +
                            '<p class="input-hint" id="handle-hint"></p>' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label class="form-label" for="acc-email">Correo electrónico</label>' +
                            '<input type="email" id="acc-email" class="form-input" placeholder="tucorreo@gmail.com" autocomplete="email">' +
                        '</div>' +
                        '<div class="form-group acc-hide-reset">' +
                            '<label class="form-label" for="acc-password">Contraseña</label>' +
                            '<div class="password-wrap">' +
                                '<input type="password" id="acc-password" class="form-input" placeholder="Mínimo 8 caracteres" autocomplete="current-password">' +
                                '<button type="button" class="password-toggle" id="acc-pass-toggle"><i class="fa-regular fa-eye"></i></button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-group acc-only acc-register">' +
                            '<label class="form-label" for="acc-password2">Confirmar contraseña</label>' +
                            '<input type="password" id="acc-password2" class="form-input" placeholder="Repite la contraseña" autocomplete="new-password">' +
                        '</div>' +
                        '<p class="error-msg" id="auth-form-error"></p>' +
                        '<button type="submit" id="auth-submit-btn" class="btn btn-primary btn-block">Iniciar Sesión</button>' +
                    '</form>' +
                    '<div class="auth-divider"><span>o</span></div>' +
                    '<button type="button" id="acc-google-btn" class="btn-google-custom">' +
                        '<i class="fa-brands fa-google"></i> Continuar con Google' +
                    '</button>' +
                    '<button type="button" id="acc-forgot-btn" class="auth-forgot-link">¿Olvidaste tu contraseña?</button>' +
                '</div>';

            root.appendChild(overlay);
            this._bind(overlay);
            this._built = true;
        },

        _bind: function (overlay) {
            var self = this;

            /* Cerrar: botón X o clic fuera de la tarjeta */
            document.getElementById('auth-close-btn').addEventListener('click', function () { self.close(); });
            overlay.addEventListener('click', function (ev) { if (ev.target === overlay) { self.close(); } });

            /* Pestañas */
            var tabs = overlay.querySelectorAll('.auth-tab-btn');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].addEventListener('click', function () { self.switchMode(this.getAttribute('data-mode')); });
            }
            document.getElementById('acc-forgot-btn').addEventListener('click', function () { self.switchMode('reset'); });

            /* Ojo de contraseña */
            document.getElementById('acc-pass-toggle').addEventListener('click', function () {
                if (typeof window.AccountsButtons !== 'undefined') {
                    window.AccountsButtons.togglePassword('acc-password', this);
                }
            });

            /* Verificación en vivo del handler (debounce 500ms) */
            var handleInput = document.getElementById('acc-handle');
            var debounceT = null;
            handleInput.addEventListener('input', function () {
                clearTimeout(debounceT);
                debounceT = setTimeout(function () { self._checkHandle(handleInput); }, 500);
            });

            /* Google */
            document.getElementById('acc-google-btn').addEventListener('click', function () {
                if (typeof window.AccountsButtons !== 'undefined') { window.AccountsButtons.doGoogle(); }
            });

            /* Submit */
            document.getElementById('auth-form').addEventListener('submit', function (ev) {
                ev.preventDefault();
                self._submit();
            });
        },

        _checkHandle: function (input) {
            var hint = document.getElementById('handle-hint');
            if (!hint) { return; }
            var val = input.value.trim();
            if (!val) { hint.textContent = ''; hint.className = 'input-hint'; return; }
            if (typeof window.AccountsErrors === 'undefined') { return; }

            var v = window.AccountsErrors.validateHandler(val);
            if (!v.ok) {
                hint.textContent = (v.code === 'HANDLE_TAKEN') ? 'Ese handler ya está ocupado.' :
                    (v.code === 'HANDLE_RESERVED') ? 'Ese handler no está permitido.' :
                    '3-20 caracteres: letras, números y _';
                hint.className = 'input-hint hint-bad';
                return;
            }
            /* Disponibilidad real en la base de datos */
            var self = this;
            if (typeof window.AccountsMemory !== 'undefined') {
                window.AccountsMemory.isHandleAvailable(val).then(function (free) {
                    hint.textContent = free ? '@' + val + ' está disponible' : '@' + val + ' ya está ocupado';
                    hint.className = 'input-hint ' + (free ? 'hint-ok' : 'hint-bad');
                }).catch(function () { self._noop(); });
            }
        },
        _noop: function () {},

        _submit: function () {
            var uie = (typeof window.AccountsUIErrors !== 'undefined') ? window.AccountsUIErrors : null;
            var btn = document.getElementById('auth-submit-btn');
            if (!btn || btn.disabled) { return; }

            var email = document.getElementById('acc-email').value;
            var password = document.getElementById('acc-password').value;
            var errBox = document.getElementById('auth-form-error');
            if (errBox) { errBox.style.display = 'none'; }
            if (uie) { uie.clearFieldError(document.getElementById('acc-email')); }

            btn.disabled = true;
            var original = btn.textContent;
            btn.textContent = 'Procesando...';

            var self = this;
            var restore = function () { btn.disabled = false; btn.textContent = original; };

            var run;
            if (self._mode === 'reset') {
                run = (typeof window.AccountsButtons !== 'undefined')
                    ? window.AccountsButtons.doReset(email) : Promise.resolve();
            } else if (self._mode === 'login') {
                run = (typeof window.AccountsButtons !== 'undefined')
                    ? window.AccountsButtons.doLogin(email, password) : Promise.resolve();
            } else {
                run = (typeof window.AccountsButtons !== 'undefined')
                    ? window.AccountsButtons.doRegister(
                        email, password,
                        document.getElementById('acc-password2').value,
                        document.getElementById('acc-handle').value,
                        document.getElementById('acc-display-name').value
                    ) : Promise.resolve();
            }

            Promise.resolve(run).then(restore, restore);
        },

        /* ---------- MODOS ---------- */
        switchMode: function (mode) {
            if (!this._built) { this.build(); }
            this._mode = (mode === 'register' || mode === 'reset') ? mode : 'login';

            var overlay = document.getElementById('auth-modal-overlay');
            if (!overlay) { return; }

            var titles = { login: 'Bienvenido a Stevscon', register: 'Únete a Stevscon', reset: 'Recuperar contraseña' };
            var submits = { login: 'Iniciar Sesión', register: 'Crear Cuenta', reset: 'Enviar enlace' };
            document.getElementById('auth-card-title').textContent = titles[this._mode];
            document.getElementById('auth-submit-btn').textContent = submits[this._mode];

            var tabs = overlay.querySelectorAll('.auth-tab-btn');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.toggle('active', tabs[i].getAttribute('data-mode') === this._mode);
            }

            var showRegister = this._mode === 'register';
            var regFields = overlay.querySelectorAll('.acc-only');
            for (var j = 0; j < regFields.length; j++) {
                regFields[j].classList.toggle('hidden', !showRegister);
            }
            var hideOnReset = overlay.querySelectorAll('.acc-hide-reset');
            for (var k = 0; k < hideOnReset.length; k++) {
                hideOnReset[k].classList.toggle('hidden', this._mode === 'reset');
            }
            document.getElementById('acc-forgot-btn').style.display = (this._mode === 'login') ? '' : 'none';
        },

        open: function (mode) {
            this.build();
            var overlay = document.getElementById('auth-modal-overlay');
            this.switchMode(mode || 'login');
            requestAnimationFrame(function () { overlay.classList.add('visible'); });
        },

        close: function () {
            var overlay = document.getElementById('auth-modal-overlay');
            if (overlay) { overlay.classList.remove('visible'); }
        }
    };

    window.AccountsUIAuth = AccountsUIAuth;
    console.log('[Stevscon] ui_auth.js listo.');

})(window);