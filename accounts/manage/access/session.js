/**
 * ====
 * STEVSCON.COM - accounts/manage/access/session.js
 * ACCESS · Sesión visible en el header (#user-header-actions).
 * - Sin sesión: botón "Iniciar sesión" (abre el modal de ACCESS).
 * - Con sesión: avatar con tu inicial + menú (datos, copiar ID,
 *   insignia de rango y cerrar sesión).
 * Reacciona SOLO con onAuthStateChanged: al crear tu cuenta ya
 * quedas logueado y tu avatar aparece al instante.
 * Si una cuenta vieja no tiene perfil en users/, no rompe: muestra
 * lo básico con el correo.
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    let menuRef = null;

    function fb() {
        return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null;
    }

    // Clic en cualquier parte del documento → cierra el menú abierto
    document.addEventListener('click', function () {
        if (menuRef) { menuRef.hidden = true; menuRef = null; }
    });

    function infoRow(label, value, copyValue) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(167,139,250,.15);font-size:12.5px;';

        const l = document.createElement('span');
        l.textContent = label;
        l.style.cssText = 'color:#8f7fc0;font-weight:600;flex:none;';

        const v = document.createElement('span');
        v.textContent = value || '—';
        v.style.cssText = 'color:#ede9fe;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;';

        row.appendChild(l);
        row.appendChild(v);

        if (copyValue) {
            const cp = document.createElement('button');
            cp.type = 'button';
            cp.textContent = 'Copiar';
            cp.style.cssText = 'flex:none;background:none;border:0;color:#a78bfa;font-family:Inter,sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;padding:0;';
            cp.addEventListener('click', function (e) {
                e.stopPropagation();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(copyValue);
                }
                cp.textContent = '¡Copiado!';
                setTimeout(function () { cp.textContent = 'Copiar'; }, 1200);
            });
            row.appendChild(cp);
        }
        return row;
    }

    function renderLoggedOut(slot) {
        slot.textContent = '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-primary';
        btn.textContent = 'Iniciar sesión';
        btn.style.cssText = 'padding:8px 18px;border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:Inter,sans-serif;';
        btn.addEventListener('click', function () {
            if (SC.access && typeof SC.access.open === 'function') SC.access.open();
        });
        slot.appendChild(btn);
    }

    function renderLoggedIn(slot, authUser, profile) {
        slot.textContent = '';
        const p = profile || {};
        const name = p.username || p.handler || (authUser.email ? authUser.email.split('@')[0] : 'Usuario');
        const userId = p.userId || '';
        const rank = p.rank || 'USER';
        const letter = String(name).trim().charAt(0).toUpperCase() || 'S';

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;';

        const avatar = document.createElement('button');
        avatar.type = 'button';
        avatar.setAttribute('aria-label', 'Menú de tu sesión');
        avatar.style.cssText = 'width:38px;height:38px;border-radius:50%;border:2px solid rgba(167,139,250,.6);background:#7c3aed;color:#ffffff;font-weight:800;font-size:16px;font-family:Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;';
        const letterSpan = document.createElement('span');
        letterSpan.textContent = letter;
        avatar.appendChild(letterSpan);

        const menu = document.createElement('div');
        menu.hidden = true;
        menu.style.cssText = 'position:absolute;right:0;top:46px;width:264px;background:#1a1526;border:1px solid rgba(167,139,250,.35);border-radius:12px;padding:16px;z-index:60;color:#ede9fe;font-family:Inter,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.45);';
        // Los clics DENTRO del menú no lo cierran
        menu.addEventListener('click', function (e) { e.stopPropagation(); });

        const head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;';

        const bigAvatar = document.createElement('div');
        bigAvatar.textContent = letter;
        bigAvatar.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#7c3aed;color:#ffffff;font-weight:800;font-size:19px;display:flex;align-items:center;justify-content:center;flex:none;';

        const headInfo = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.textContent = name;
        nameEl.style.cssText = 'font-weight:700;font-size:14.5px;color:#ffffff;';
        const handlerEl = document.createElement('div');
        handlerEl.textContent = p.handler ? '@' + p.handler : (authUser.email || '');
        handlerEl.style.cssText = 'font-size:12.5px;color:#a78bfa;';

        headInfo.appendChild(nameEl);
        headInfo.appendChild(handlerEl);
        head.appendChild(bigAvatar);
        head.appendChild(headInfo);
        menu.appendChild(head);

        if (rank && rank !== 'USER') {
            const badge = document.createElement('span');
            badge.textContent = rank;
            badge.style.cssText = 'display:inline-block;margin-bottom:10px;padding:3px 10px;border-radius:999px;background:rgba(167,139,250,.16);border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font-size:10.5px;font-weight:800;letter-spacing:.14em;';
            menu.appendChild(badge);
        }

        if (userId) menu.appendChild(infoRow('ID', userId, userId));
        if (authUser.email) menu.appendChild(infoRow('Correo', authUser.email, null));

        const out = document.createElement('button');
        out.type = 'button';
        out.textContent = 'Cerrar sesión';
        out.style.cssText = 'width:100%;margin-top:12px;padding:9px 0;border-radius:10px;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.08);color:#f87171;font-weight:700;font-size:13px;font-family:Inter,sans-serif;cursor:pointer;';
        out.addEventListener('click', function () {
            const F = fb();
            if (F && F.auth) F.auth.signOut();
        });
        menu.appendChild(out);

        avatar.addEventListener('click', function (e) {
            e.stopPropagation();
            if (menuRef && menuRef !== menu) menuRef.hidden = true;
            menu.hidden = !menu.hidden;
            menuRef = menu.hidden ? null : menu;
        });

        wrap.appendChild(avatar);
        wrap.appendChild(menu);
        slot.appendChild(wrap);
    }

    function init() {
        const F = fb();
        if (!F || !F.auth) return;
        F.auth.onAuthStateChanged(function (user) {
            const slot = document.getElementById('user-header-actions');
            if (!slot) return;
            if (!user) { renderLoggedOut(slot); return; }
            slot.textContent = '';
            F.database.ref('users/' + user.uid).once('value').then(function (snap) {
                renderLoggedIn(slot, user, snap.val());
            }).catch(function () {
                renderLoggedIn(slot, user, null);
            });
        });
    }

    // Espera a que existan el header y Firebase (orden de scripts)
    function boot(tries) {
        const slot = document.getElementById('user-header-actions');
        const F = fb();
        if (slot && F && F.auth) { init(); return; }
        if (tries > 20) return;
        setTimeout(function () { boot(tries + 1); }, 250);
    }
    boot(0);
})(window, document);