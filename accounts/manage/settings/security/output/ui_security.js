/**
 * STEVSCON.COM - accounts/manage/settings/security/output/ui_security.js
 * ZONA DE SEGURIDAD · PESTAÑA MADRE (v1)
 * - Registra la pestaña 'seguridad' y PISA el cascarón "PRONTO" de ui_settings.
 * - Expone SCSET.security: isOwner, minPass, errMsg, inputs, modal.
 * - Los formularios viven en ui_sec_password / ui_sec_mail / ui_sec_delete.
 * - Cero innerHTML con datos externos (anti-XSS).
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const sec = SCSET.security = {};
    sec.forms = {};

    /* ==== OWNER MODE (misma regla del proyecto) ==== */

    sec.isOwner = function () {
        const u = SCSET.user || {};
        const rec = (SCSET.data && SCSET.data.record) || {};
        const email = (u.email || '').toLowerCase();
        const uname = rec.username || rec.user || '';
        return email === 'steven23hd@gmail.com' || /^stevscon$/i.test(uname);
    };

    /* Owner: mínimo 6 · Normal: mínimo 8 */
    sec.minPass = function () { return sec.isOwner() ? 6 : 8; };

    /* ==== ERRORES DE FIREBASE -> MENSAJES CLAROS ==== */

    sec.errMsg = function (err) {
        const code = (err && err.code) || '';
        const map = {
            'auth/wrong-password': 'La contraseña actual no es correcta.',
            'auth/invalid-credential': 'La contraseña actual no es correcta.',
            'auth/invalid-login-credentials': 'La contraseña actual no es correcta.',
            'auth/weak-password': 'La contraseña es muy débil (mínimo ' + sec.minPass() + ' caracteres).',
            'auth/requires-recent-login': 'Necesitamos confirmar que eres tú otra vez.',
            'auth/email-already-in-use': 'Ese correo ya está en uso por otra cuenta.',
            'auth/invalid-email': 'El correo no tiene un formato válido.',
            'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
            'auth/network-request-failed': 'Fallo de red. Revisa tu conexión.',
            'owner-locked': 'El correo oficial del Owner no se puede cambiar.'
        };
        return map[code] || 'No se pudo completar. Intenta de nuevo.';
    };

    /* ==== FÁBRICA DE INPUTS ==== */

    sec.inputField = function (label, id, type) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'margin-bottom:12px;';
        const l = document.createElement('p');
        l.textContent = label;
        l.style.cssText = 'margin:0 0 6px;font-size:11.5px;font-weight:600;color:#94a3b8;';
        const input = document.createElement('input');
        input.type = type || 'text';
        input.id = id;
        input.autocomplete = 'off';
        input.style.cssText = 'width:100%;box-sizing:border-box;background:#0d0b14;border:1px solid #2e2440;' +
            'border-radius:10px;padding:11px 13px;color:#f8fafc;font:400 13px Inter,sans-serif;outline:none;' +
            'transition:border-color .15s ease;';
        input.addEventListener('focus', function () { input.style.borderColor = '#8b5cf6'; });
        input.addEventListener('blur', function () { input.style.borderColor = '#2e2440'; });
        wrap.appendChild(l); wrap.appendChild(input);
        return { wrap: wrap, input: input };
    };

    /* ==== MODAL (lo usan re-auth y la zona peligrosa) ==== */

    sec.modal = function (cfg) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(5,4,10,.8);' +
            'display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:Inter,sans-serif;';

        const shell = document.createElement('div');
        shell.style.cssText = 'width:min(400px,100%);background:#120f1b;border:1px solid #2e2440;border-radius:16px;' +
            'padding:24px;box-sizing:border-box;';

        const ic = document.createElement('i');
        ic.className = 'fa-solid ' + (cfg.icon || 'fa-shield-halved');
        ic.style.cssText = 'font-size:20px;color:' + (cfg.danger ? '#ef4444' : '#8b5cf6') + ';display:block;margin-bottom:10px;';

        const title = document.createElement('p');
        title.textContent = cfg.title || 'Confirmar';
        title.style.cssText = 'margin:0 0 6px;font-size:16px;font-weight:800;color:#f8fafc;';

        const desc = document.createElement('p');
        desc.textContent = cfg.desc || '';
        desc.style.cssText = 'margin:0 0 16px;font-size:12.5px;color:#94a3b8;line-height:1.5;';

        shell.appendChild(ic); shell.appendChild(title); shell.appendChild(desc);
        const inputs = [];
        (cfg.fields || []).forEach(function (f) {
            const made = sec.inputField(f.label, f.id, f.type);
            shell.appendChild(made.wrap);
            inputs.push(made.input);
        });

        const errEl = document.createElement('p');
        errEl.style.cssText = 'margin:0 0 12px;font-size:12px;font-weight:600;color:#f87171;min-height:0;line-height:1.4;';

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;';

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = cfg.cancelLabel || 'Cancelar';
        cancel.style.cssText = 'border:1px solid #2e2440;background:transparent;color:#94a3b8;font:600 12.5px Inter,sans-serif;' +
            'padding:9px 15px;border-radius:9px;cursor:pointer;';

        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.textContent = cfg.confirmLabel || 'Confirmar';
        confirm.style.cssText = 'border:0;background:' + (cfg.danger ? '#ef4444' : '#8b5cf6') + ';color:#ffffff;' +
            'font:700 12.5px Inter,sans-serif;padding:9px 17px;border-radius:9px;cursor:pointer;';

        row.appendChild(cancel); row.appendChild(confirm);
        shell.appendChild(errEl); shell.appendChild(row);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);

        const close = function () {
            document.removeEventListener('keydown', onKey);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        };
        const fail = function (msg) { errEl.textContent = msg; };

        function onKey(e) {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter' && !confirm.disabled) confirm.click();
        }
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        cancel.addEventListener('click', close);

        /* Cuenta atrás opcional (zona peligrosa) */
        if (cfg.countdown && cfg.countdown > 0) {
            let left = cfg.countdown;
            confirm.disabled = true;
            confirm.style.opacity = '.5';
            const base = confirm.textContent;
            confirm.textContent = base + ' (' + left + ')';
            const iv = setInterval(function () {
                left--;
                if (left <= 0) {
                    clearInterval(iv);
                    confirm.disabled = false;
                    confirm.style.opacity = '1';
                    confirm.textContent = base;
                } else {
                    confirm.textContent = base + ' (' + left + ')';
                }
            }, 1000);
        }

        confirm.addEventListener('click', function () {
            if (confirm.disabled) return;
            const values = {};
            inputs.forEach(function (inp) { values[inp.id] = inp.value; });
            if (typeof cfg.onConfirm === 'function') cfg.onConfirm(values, { fail: fail, close: close });
        });

        try {
            overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
        } catch (e) {}
        if (inputs[0]) inputs[0].focus();
        return { close: close };
    };

    /* ==== PESTAÑA 'seguridad' (pisa el cascarón PRONTO) ==== */

    SCSET.registerTab({
        id: 'seguridad', label: 'Seguridad', icon: 'fa-user-shield',
        render: function (body) {
            const user = SCSET.user || {};
            const meta = user.metadata || {};

            const intro = document.createElement('div');
            intro.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';
            const dot = document.createElement('i');
            dot.className = 'fa-solid fa-circle-check';
            dot.style.cssText = 'color:#22c55e;font-size:13px;';
            const itxt = document.createElement('p');
            itxt.textContent = meta.lastSignInTime
                ? 'Sesión iniciada: ' + meta.lastSignInTime
                : 'Sesión activa.';
            itxt.style.cssText = 'margin:0;font-size:12px;font-weight:600;color:#94a3b8;';
            intro.appendChild(dot); intro.appendChild(itxt);
            body.appendChild(intro);

            const F = sec.forms;
            if (F.password) F.password(body);
            if (F.mail) F.mail(body);
            if (F.delete) F.delete(body);
        }
    });

    console.log('[Stevscon] ui_security.js listo (pestaña Seguridad activa).');
})(window);