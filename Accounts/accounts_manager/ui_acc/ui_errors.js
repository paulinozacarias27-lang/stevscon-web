/**
 * STEVSON.COM :: ui_errors.js
 * _escape() anti-XSS, sistema de toasts, errores de campo
 * y modal de confirmación. Se apoya en #alerts-container y #modals-root.
 */
(function (window) {
    'use strict';

    if (typeof window.AccountsUIErrors !== 'undefined') { return; }

    var AccountsUIErrors = {

        /* ---------- ANTI-XSS (regla del proyecto: SIEMPRE escapar) ---------- */
        escape: function (str) {
            var div = document.createElement('div');
            div.textContent = String(str === null || typeof str === 'undefined' ? '' : str);
            return div.innerHTML;
        },

        /* ---------- TOASTS (usa .alerts-wrapper de styles.css) ---------- */
        toast: function (message, type, title) {
            var container = document.getElementById('alerts-container');
            if (!container) { console.log('[Toast] ' + message); return; }

            var icons = {
                success: 'fa-circle-check', error: 'fa-circle-xmark',
                warn: 'fa-triangle-exclamation', info: 'fa-circle-info'
            };
            type = (typeof icons[type] !== 'undefined') ? type : 'info';

            var el = document.createElement('div');
            el.className = 'toast toast-' + type;
            el.innerHTML =
                '<i class="fa-solid ' + icons[type] + '"></i>' +
                '<div class="toast-content">' +
                    (title ? '<strong>' + this.escape(title) + '</strong>' : '') +
                    '<span>' + this.escape(message) + '</span>' +
                '</div>' +
                '<button class="toast-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>';

            container.appendChild(el);
            requestAnimationFrame(function () { el.classList.add('visible'); });

            var kill = function () {
                el.classList.remove('visible');
                setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 300);
            };
            el.querySelector('.toast-close').addEventListener('click', kill);
            setTimeout(kill, 4500);
            return el;
        },

        /* ---------- ERROR INLINE EN CAMPOS DE FORMULARIO ---------- */
        fieldError: function (inputEl, message) {
            if (!inputEl) { return; }
            inputEl.classList.add('input-error');
            var group = inputEl.closest('.form-group') || inputEl.parentNode;
            var msg = group.querySelector('.error-msg');
            if (!msg) {
                msg = document.createElement('p');
                msg.className = 'error-msg';
                group.appendChild(msg);
            }
            msg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + this.escape(message);
            msg.style.display = 'block';
        },

        clearFieldError: function (inputEl) {
            if (!inputEl) { return; }
            inputEl.classList.remove('input-error');
            var group = inputEl.closest('.form-group') || inputEl.parentNode;
            var msg = group.querySelector('.error-msg');
            if (msg) { msg.style.display = 'none'; }
        },

        /* ---------- MODAL DE CONFIRMACIÓN (Promise) ---------- */
        confirm: function (opts) {
            return new Promise(function (resolve) {
                var root = document.getElementById('modals-root');
                if (!root) { resolve(false); return; }
                opts = opts || {};

                var overlay = document.createElement('div');
                overlay.className = 'modal-overlay visible';
                overlay.innerHTML =
                    '<div class="confirm-card">' +
                        '<h3>' + AccountsUIErrors.escape(opts.title || 'Confirmar') + '</h3>' +
                        '<p>' + AccountsUIErrors.escape(opts.message || '¿Deseas continuar?') + '</p>' +
                        '<div class="confirm-actions">' +
                            '<button class="btn btn-outline" data-c="no">Cancelar</button>' +
                            '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-c="yes">' +
                                AccountsUIErrors.escape(opts.confirmText || 'Confirmar') +
                            '</button>' +
                        '</div>' +
                    '</div>';

                function done(val) {
                    if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
                    resolve(val === 'yes');
                }
                overlay.addEventListener('click', function (ev) {
                    var t = ev.target.closest('[data-c]');
                    if (t) { done(t.getAttribute('data-c')); }
                    else if (ev.target === overlay) { done('no'); }
                });
                root.appendChild(overlay);
            });
        }
    };

    window.AccountsUIErrors = AccountsUIErrors;
    console.log('[Stevscon] ui_errors.js listo.');

})(window);