/**
 * STEVSCON.COM - accounts/manage/settings/security/output/ui_sec_password.js
 * FORMULARIO: CAMBIAR CONTRASEÑA (v1)
 * Reglas del proyecto: Owner mínimo 6, normal mínimo 8.
 * La contraseña NUNCA va a la RTDB ni a localStorage.
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const sec = SCSET.security || (SCSET.security = { forms: {} });
    sec.forms = sec.forms || {};

    sec.forms.password = function (body) {
        const min = sec.minPass();
        const card = (SCSET.ui && SCSET.ui.card) ? SCSET.ui.card() : document.createElement('div');

        const head = document.createElement('i');
        head.className = 'fa-solid fa-key';
        head.style.cssText = 'font-size:20px;color:#8b5cf6;display:block;margin-bottom:12px;';
        card.appendChild(head);

        const fCur = sec.inputField('Contraseña actual', 'sec-pw-cur', 'password');
        const fNew = sec.inputField('Nueva contraseña', 'sec-pw-new', 'password');
        const fRep = sec.inputField('Repetir nueva contraseña', 'sec-pw-rep', 'password');
        card.appendChild(fCur.wrap); card.appendChild(fNew.wrap); card.appendChild(fRep.wrap);

        card.appendChild(SCSET.ui.note(
            'Mínimo ' + min + ' caracteres' + (min === 6 ? ' (Owner Mode).' : '.') +
            ' Al cambiarla se cierra la sesión en tus otros dispositivos.'
        ));

        const err = document.createElement('p');
        err.style.cssText = 'margin:10px 2px 0;font-size:12px;font-weight:600;color:#f87171;min-height:0;';

        const save = SCSET.ui.btn('Guardar nueva contraseña', 'violet', function () {
            err.textContent = '';
            const cur = fCur.input.value;
            const nw = fNew.input.value;
            const rep = fRep.input.value;
            if (!cur) { err.textContent = 'Escribe tu contraseña actual.'; return; }
            if (nw.length < min) { err.textContent = 'La nueva contraseña necesita mínimo ' + min + ' caracteres.'; return; }
            if (nw !== rep) { err.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
            if (nw === cur) { err.textContent = 'La nueva contraseña debe ser distinta a la actual.'; return; }
            SCSET.api.security.changePassword(cur, nw).then(function () {
                fCur.input.value = ''; fNew.input.value = ''; fRep.input.value = '';
                SCSET.toast('Contraseña actualizada');
            }).catch(function (e) {
                if (e && e.cancelled) return;
                err.textContent = sec.errMsg(e);
            });
        });
        save.style.marginTop = '12px';
        card.appendChild(save);
        card.appendChild(err);
        body.appendChild(card);
    };

    console.log('[Stevscon] ui_sec_password.js listo (formulario registrado).');
})(window);