/**
 * ====
 * STEVSCON.COM - profiles/manage/switch_acc/panel.js
 * SWITCH · Panel "Cambiar de cuenta" (ventana estilo Discord).
 * - Monta el botón al final del panel "Mi perfil" (via category_prf.js).
 * - Lista de cuentas guardadas, guardar la actual, añadir y quitar.
 * - Todo con textContent y style: cero innerHTML, cero XSS.
 * Cargar AL FINAL de este grupo (store.js y switch.js ANTES).
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.switchAcc = SCp.switchAcc || {};

    let overlay = null;
    let body = null;
    let isOpen = false;
    let lastFocus = null;
    let switching = false;

    function fb() { return window.StevsconFirebase || null; }
    function currentUid() {
        const F = fb();
        return F && F.auth && F.auth.currentUser ? F.auth.currentUser.uid : null;
    }
    function currentEmail() {
        const F = fb();
        return F && F.auth && F.auth.currentUser && F.auth.currentUser.email ? F.auth.currentUser.email : '';
    }

    // ---- Ventana (reusa .modal-overlay/.modal de tu styles.css) ----
    function build() {
        if (overlay) return;
        const root = document.getElementById('modals-root');
        if (!root) return;

        overlay = document.createElement('div');
        overlay.className = 'modal-overlay hidden';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.maxWidth = '420px';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Cambiar de cuenta');

        const header = document.createElement('div');
        header.className = 'modal-header';
        const titles = document.createElement('div');
        titles.className = 'modal-titles';
        const t = document.createElement('h2');
        t.textContent = 'Cambiar de cuenta';
        const s = document.createElement('p');
        s.textContent = 'Tus cuentas guardadas en este dispositivo.';
        titles.appendChild(t);
        titles.appendChild(s);
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'modal-close';
        x.setAttribute('aria-label', 'Cerrar');
        const xi = document.createElement('i');
        xi.className = 'fa-solid fa-xmark';
        x.appendChild(xi);
        x.addEventListener('click', close);
        header.appendChild(titles);
        header.appendChild(x);

        body = document.createElement('div');
        body.className = 'modal-body';

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        root.appendChild(overlay);
    }

    function open() {
        if (!SCp.user) return;
        build();
        if (!overlay) return;
        lastFocus = document.activeElement;
        overlay.classList.remove('hidden');
        isOpen = true;
        document.body.style.overflow = 'hidden';
        renderList();
    }

    function close() {
        if (!overlay || !isOpen) return;
        overlay.classList.add('hidden');
        isOpen = false;
        // Si el modal de perfil sigue abierto detrás, no devolvemos el scroll.
        const prf = document.getElementById('prf-modal-overlay');
        const prfOpen = prf && !prf.classList.contains('hidden');
        document.body.style.overflow = prfOpen ? 'hidden' : '';
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) close();
    });

    // ---- Piezas visuales ----
    function errorBox(msg) {
        const b = document.createElement('div');
        b.className = 'errors-box';
        const i = document.createElement('i');
        i.className = 'fa-solid fa-triangle-exclamation';
        const sp = document.createElement('span');
        sp.textContent = msg;
        b.appendChild(i);
        b.appendChild(sp);
        return b;
    }

    function rankBadge(rank) {
        const b = document.createElement('span');
        b.textContent = rank;
        b.style.cssText = 'padding:2px 8px;border-radius:999px;background:rgba(167,139,250,.16);border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font-size:9.5px;font-weight:800;letter-spacing:.12em;';
        return b;
    }

    function currentPill() {
        const b = document.createElement('span');
        b.textContent = 'Actual';
        b.style.cssText = 'padding:2px 8px;border-radius:999px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.45);color:#4ade80;font-size:9.5px;font-weight:800;letter-spacing:.12em;';
        return b;
    }

    function accountRow(entry, isCurrent) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(167,139,250,.18);border-radius:12px;background:#171320;margin-bottom:8px;cursor:' + (isCurrent ? 'default' : 'pointer') + ';transition:border-color .15s ease,background .15s ease;';
        if (!isCurrent) {
            row.addEventListener('mouseenter', function () { row.style.borderColor = 'rgba(167,139,250,.5)'; row.style.background = '#261f36'; });
            row.addEventListener('mouseleave', function () { row.style.borderColor = 'rgba(167,139,250,.18)'; row.style.background = '#171320'; });
        }

        const letter = String(entry.username || entry.handler || entry.email || 'S').trim().charAt(0).toUpperCase() || 'S';
        const av = (SCp.ui && SCp.ui.avatarEl) ? SCp.ui.avatarEl(entry, 40, letter) : document.createElement('div');
        row.appendChild(av);

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';
        const nameLine = document.createElement('div');
        nameLine.style.cssText = 'display:flex;align-items:center;gap:7px;flex-wrap:wrap;';
        const nm = document.createElement('span');
        nm.textContent = entry.username || entry.handler || entry.email || 'Cuenta';
        nm.style.cssText = 'font-size:13.5px;font-weight:800;color:#ede9fe;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nameLine.appendChild(nm);
        if (entry.rank && entry.rank !== 'USER') nameLine.appendChild(rankBadge(entry.rank));
        if (isCurrent) nameLine.appendChild(currentPill());
        const sub = document.createElement('div');
        sub.textContent = entry.handler ? '@' + entry.handler : (entry.email || '');
        sub.style.cssText = 'font-size:12px;color:#8f7fc0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        info.appendChild(nameLine);
        info.appendChild(sub);
        row.appendChild(info);

        if (!isCurrent) {
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.setAttribute('aria-label', 'Quitar de la lista');
            rm.style.cssText = 'width:28px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;background:none;border:1px solid transparent;border-radius:8px;color:#8f7fc0;cursor:pointer;transition:color .15s ease,border-color .15s ease;';
            const rmi = document.createElement('i');
            rmi.className = 'fa-solid fa-xmark';
            rm.appendChild(rmi);
            rm.addEventListener('mouseenter', function () { rm.style.color = '#f87171'; rm.style.borderColor = 'rgba(239,68,68,.4)'; });
            rm.addEventListener('mouseleave', function () { rm.style.color = '#8f7fc0'; rm.style.borderColor = 'transparent'; });
            rm.addEventListener('click', function (e) {
                e.stopPropagation();
                SCp.switchAcc.remove(entry.uid);
                renderList();
            });
            row.appendChild(rm);

            row.addEventListener('click', function () {
                if (switching) return;
                switching = true;
                SCp.switchAcc.enter(entry).catch(function (err) {
                    switching = false;
                    if (err && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')) {
                        close(); // el motor ya abrió el acceso normal para re-ingresar
                        return;
                    }
                    renderList(err && err.msg ? err.msg : 'No se pudo cambiar de cuenta.');
                });
            });
        }
        return row;
    }

    // ---- Vista: lista de cuentas ----
    function renderList(errMsg) {
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        if (errMsg) body.appendChild(errorBox(errMsg));

        const uid = currentUid();
        const list = SCp.switchAcc.list();

        // Cuenta actual SIN guardar → atajo para guardarla (como Discord).
        if (uid && !SCp.switchAcc.find(uid)) {
            const warn = document.createElement('div');
            warn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px dashed rgba(167,139,250,.45);border-radius:12px;background:rgba(139,92,246,.07);margin-bottom:10px;';
            const wi = document.createElement('i');
            wi.className = 'fa-solid fa-circle-info';
            wi.style.cssText = 'color:#a78bfa;flex:none;';
            const wt = document.createElement('span');
            wt.textContent = 'Esta cuenta aún no está guardada aquí.';
            wt.style.cssText = 'flex:1;font-size:12.5px;font-weight:600;color:#c4b5fd;';
            const wb = document.createElement('button');
            wb.type = 'button';
            wb.textContent = 'Guardar';
            wb.style.cssText = 'padding:6px 12px;border-radius:8px;border:0;background:#7c3aed;color:#fff;font-family:Inter,sans-serif;font-size:12px;font-weight:800;cursor:pointer;';
            wb.addEventListener('click', function () { renderAddForm({ lockedEmail: currentEmail() }); });
            warn.appendChild(wi);
            warn.appendChild(wt);
            warn.appendChild(wb);
            body.appendChild(warn);
        }

        if (!list.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Todavía no tienes cuentas guardadas. Añade una abajo.';
            empty.style.cssText = 'text-align:center;color:#8f7fc0;font-size:13px;font-weight:600;padding:14px 0;';
            body.appendChild(empty);
        }

        list.forEach(function (entry) {
            body.appendChild(accountRow(entry, entry.uid === uid));
        });

        // Añadir cuenta
        const add = document.createElement('button');
        add.type = 'button';
        add.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:11px 0;border-radius:10px;border:1px dashed rgba(167,139,250,.45);background:none;color:#c4b5fd;font-family:Inter,sans-serif;font-size:13px;font-weight:800;cursor:pointer;transition:background .2s ease,border-color .2s ease;';
        const ai = document.createElement('i');
        ai.className = 'fa-solid fa-plus';
        const asp = document.createElement('span');
        asp.textContent = 'Añadir cuenta';
        add.appendChild(ai);
        add.appendChild(asp);
        add.addEventListener('mouseenter', function () { add.style.background = 'rgba(139,92,246,.12)'; add.style.borderColor = '#8b5cf6'; });
        add.addEventListener('mouseleave', function () { add.style.background = 'none'; add.style.borderColor = 'rgba(167,139,250,.45)'; });
        add.addEventListener('click', function () { renderAddForm({}); });
        body.appendChild(add);

        // Contador por rango + nota honesta
        const meta = document.createElement('p');
        meta.textContent = list.length + ' de ' + SCp.switchAcc.limitFor() + ' cuentas guardadas (según tu rango).';
        meta.style.cssText = 'margin-top:10px;text-align:center;font-size:11.5px;color:#8f7fc0;font-weight:600;';
        body.appendChild(meta);
        const note = document.createElement('p');
        note.textContent = 'Las contraseñas se guardan ofuscadas SOLO en este dispositivo. Nunca se suben a la web.';
        note.style.cssText = 'margin-top:6px;text-align:center;font-size:11px;color:#6b6486;font-weight:600;line-height:1.5;';
        body.appendChild(note);
    }

    // ---- Vista: formulario añadir / guardar actual ----
    function renderAddForm(opts) {
        if (!body) return;
        const o = opts || {};
        while (body.firstChild) body.removeChild(body.firstChild);

        const back = document.createElement('button');
        back.type = 'button';
        back.textContent = '← Volver a las cuentas';
        back.style.cssText = 'display:block;background:none;border:0;padding:0;margin:0 0 14px;color:#a78bfa;font-family:Inter,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;';
        back.addEventListener('click', function () { renderList(); });
        body.appendChild(back);

        const title = document.createElement('p');
        title.textContent = o.lockedEmail ? 'Guardar esta cuenta' : 'Añadir cuenta';
        title.style.cssText = 'margin:0 0 12px;font-size:15px;font-weight:800;color:#ede9fe;';
        body.appendChild(title);

        const g1 = document.createElement('div');
        g1.className = 'form-group';
        const l1 = document.createElement('label');
        l1.className = 'field-label';
        l1.textContent = o.lockedEmail ? 'Cuenta actual' : 'Correo o handler de la cuenta';
        const inId = document.createElement('input');
        inId.type = 'text';
        inId.className = 'field-input';
        inId.placeholder = 'correo@gmail.com o @handler';
        inId.autocomplete = 'off';
        inId.autocapitalize = 'none';
        inId.spellcheck = false;
        if (o.lockedEmail) { inId.value = o.lockedEmail; inId.disabled = true; }
        g1.appendChild(l1);
        g1.appendChild(inId);

        const g2 = document.createElement('div');
        g2.className = 'form-group';
        const l2 = document.createElement('label');
        l2.className = 'field-label';
        l2.textContent = 'Contraseña de esa cuenta';
        const inPass = document.createElement('input');
        inPass.type = 'password';
        inPass.className = 'field-input';
        inPass.placeholder = '••••••••';
        inPass.autocomplete = 'current-password';
        g2.appendChild(l2);
        g2.appendChild(inPass);

        const slot = document.createElement('div');

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'btn-create';
        submitBtn.textContent = 'Entrar y guardar';

        submitBtn.addEventListener('click', function () {
            if (switching) return;
            const ident = o.lockedEmail || inId.value;
            const pass = inPass.value;
            switching = true;
            submitBtn.disabled = true;
            while (submitBtn.firstChild) submitBtn.removeChild(submitBtn.firstChild);
            const sp = document.createElement('span');
            sp.className = 'spinner';
            const spTx = document.createElement('span');
            spTx.textContent = 'Entrando…';
            submitBtn.appendChild(sp);
            submitBtn.appendChild(spTx);
            slot.textContent = '';

            SCp.switchAcc.addAccount(ident, pass).then(function (res) {
                if (res && res.switched) return;   // la web se recarga sola
                switching = false;
                renderList();                      // guardada la actual → refresca
            }).catch(function (err) {
                switching = false;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar y guardar';
                slot.textContent = '';
                slot.appendChild(errorBox((err && err.msg) || 'No se pudo guardar la cuenta.'));
            });
        });

        inPass.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click();
        });

        body.appendChild(g1);
        body.appendChild(g2);
        body.appendChild(slot);
        body.appendChild(submitBtn);

        setTimeout(function () { (o.lockedEmail ? inPass : inId).focus(); }, 50);
    }

    // ---- El botón que vive al final del panel "Mi perfil" ----
    SCp.switchAcc.mountButton = function (container) {
        if (!container) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:14px;padding:11px 0;border-radius:10px;border:1px solid rgba(167,139,250,.35);background:rgba(139,92,246,.10);color:#c4b5fd;font-family:Inter,sans-serif;font-size:13px;font-weight:800;cursor:pointer;transition:background .2s ease,border-color .2s ease,color .2s ease;';
        const i = document.createElement('i');
        i.className = 'fa-solid fa-arrow-right-arrow-left';
        const sp = document.createElement('span');
        sp.textContent = 'Cambiar de cuenta';
        b.appendChild(i);
        b.appendChild(sp);
        b.addEventListener('mouseenter', function () {
            b.style.background = 'rgba(139,92,246,.22)';
            b.style.borderColor = '#8b5cf6';
            b.style.color = '#ede9fe';
        });
        b.addEventListener('mouseleave', function () {
            b.style.background = 'rgba(139,92,246,.10)';
            b.style.borderColor = 'rgba(167,139,250,.35)';
            b.style.color = '#c4b5fd';
        });
        b.addEventListener('click', open);
        container.appendChild(b);
    };
})(window, document);