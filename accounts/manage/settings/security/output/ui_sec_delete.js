/**
 * STEVSCON.COM - accounts/manage/settings/security/output/ui_sec_delete.js
 * FORMULARIO: ELIMINAR CUENTA (v1) · zona peligrosa estilo Discord
 * Doble confirmación: casilla + modal con contraseña y cuenta atrás de 5s.
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const sec = SCSET.security || (SCSET.security = { forms: {} });
    sec.forms = sec.forms || {};

    sec.forms.delete = function (body) {
        const card = document.createElement('div');
        card.style.cssText = 'background:#120f1b;border:1px solid rgba(239,68,68,.45);border-radius:14px;padding:20px 22px 16px;max-width:560px;';

        const head = document.createElement('i');
        head.className = 'fa-solid fa-triangle-exclamation';
        head.style.cssText = 'font-size:20px;color:#ef4444;display:block;margin-bottom:12px;';
        const t = document.createElement('p');
        t.textContent = 'Eliminar mi cuenta';
        t.style.cssText = 'margin:0 0 6px;font-size:15px;font-weight:800;color:#f8fafc;';
        const d = document.createElement('p');
        d.textContent = 'Esto borra TODO: tu perfil, banner, avatar, ajustes, estados y tu cuenta en Stevscon.com. No hay vuelta atrás.';
        d.style.cssText = 'margin:0 0 14px;font-size:12.5px;color:#94a3b8;line-height:1.5;';
        card.appendChild(head); card.appendChild(t); card.appendChild(d);

        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:14px;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.style.cssText = 'width:16px;height:16px;margin-top:1px;accent-color:#ef4444;cursor:pointer;flex:none;';
        const cbTxt = document.createElement('span');
        cbTxt.textContent = 'Entiendo que esta acción es permanente e irreversible.';
        cbTxt.style.cssText = 'font-size:12px;font-weight:600;color:#f87171;line-height:1.5;';
        label.appendChild(cb); label.appendChild(cbTxt);
        card.appendChild(label);

        const del = SCSET.ui.btn('Eliminar mi cuenta', 'red', function () {
            if (!cb.checked) return;
            sec.modal({
                title: '¿Eliminar tu cuenta para siempre?',
                desc: 'Se borrarán tu perfil, tus imágenes y todos tus datos. Este paso no se puede deshacer.',
                icon: 'fa-skull',
                danger: true,
                countdown: 5,
                confirmLabel: 'Eliminar todo',
                fields: [{ label: 'Tu contraseña', id: 'pwd', type: 'password' }],
                onConfirm: function (vals, h) {
                    if (!vals.pwd) { h.fail('Escribe tu contraseña para confirmar.'); return; }
                    SCSET.api.security.deleteAccount(vals.pwd)
                        .then(function () { h.close(); })
                        .catch(function (e) {
                            if (e && e.cancelled) return;
                            h.fail(sec.errMsg(e));
                        });
                }
            });
        });
        del.disabled = true;
        del.style.opacity = '.5';
        del.style.pointerEvents = 'none';
        cb.addEventListener('change', function () {
            del.disabled = !cb.checked;
            del.style.opacity = cb.checked ? '1' : '.5';
            del.style.pointerEvents = cb.checked ? 'auto' : 'none';
        });
        card.appendChild(del);
        body.appendChild(card);
    };

    console.log('[Stevscon] ui_sec_delete.js listo (zona peligrosa registrada).');
})(window);