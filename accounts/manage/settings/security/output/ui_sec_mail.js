/**
 * STEVSCON.COM - accounts/manage/settings/security/output/ui_sec_mail.js
 * FORMULARIO: CAMBIAR CORREO (v1)
 * - Owner: correo oficial BLOQUEADO (regla del proyecto).
 * - Flujo seguro: verifyBeforeUpdateEmail -> link de verificación al correo nuevo.
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const sec = SCSET.security || (SCSET.security = { forms: {} });
    sec.forms = sec.forms || {};

    sec.forms.mail = function (body) {
        const user = SCSET.user || {};

        if (sec.isOwner()) {
            const card = SCSET.ui.card();
            const lock = document.createElement('i');
            lock.className = 'fa-solid fa-lock';
            lock.style.cssText = 'font-size:20px;color:#fbbf24;display:block;margin-bottom:12px;';
            const t = document.createElement('p');
            t.textContent = 'Correo oficial del Owner';
            t.style.cssText = 'margin:0 0 6px;font-size:15px;font-weight:800;color:#f8fafc;';
            const d = document.createElement('p');
            d.textContent = 'Tu correo ' + (user.email || 'oficial') + ' está protegido por Owner Mode y no se puede cambiar desde aquí.';
            d.style.cssText = 'margin:0;font-size:12.5px;color:#94a3b8;line-height:1.5;';
            card.appendChild(lock); card.appendChild(t); card.appendChild(d);
            body.appendChild(card);
            return;
        }

        const card = SCSET.ui.card();
        const head = document.createElement('i');
        head.className = 'fa-solid fa-envelope';
        head.style.cssText = 'font-size:20px;color:#8b5cf6;display:block;margin-bottom:12px;';
        card.appendChild(head);

        card.appendChild(SCSET.ui.row('Correo actual', 'Con este correo inicias sesión',
            SCSET.ui.mono(user.email || '—')));

        const fNew = sec.inputField('Correo nuevo', 'sec-mail-new', 'email');
        const fPwd = sec.inputField('Tu contraseña actual', 'sec-mail-pwd', 'password');
        card.appendChild(fNew.wrap); card.appendChild(fPwd.wrap);

        card.appendChild(SCSET.ui.note(
            'Te llegará un correo de VERIFICACIÓN de Firebase al correo nuevo. Tu correo no cambia hasta que pulses ese link. Después tu cuenta y tu perfil se actualizan solos.'
        ));

        const err = document.createElement('p');
        err.style.cssText = 'margin:10px 2px 0;font-size:12px;font-weight:600;color:#f87171;min-height:0;';

        const save = SCSET.ui.btn('Actualizar correo', 'violet', function () {
            err.textContent = '';
            const newMail = (fNew.input.value || '').trim();
            const pwd = fPwd.input.value;
            if (!/^\S+@\S+\.\S+$/.test(newMail)) { err.textContent = 'Escribe un correo válido.'; return; }
            if (newMail.toLowerCase() === (user.email || '').toLowerCase()) { err.textContent = 'Ese ya es tu correo actual.'; return; }
            if (!pwd) { err.textContent = 'Escribe tu contraseña para confirmar.'; return; }
            SCSET.api.security.changeMail(newMail, pwd).then(function () {
                fNew.input.value = ''; fPwd.input.value = '';
                SCSET.toast('Revisa el correo nuevo y pulsa el link');
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

    console.log('[Stevscon] ui_sec_mail.js listo (formulario registrado).');
})(window);