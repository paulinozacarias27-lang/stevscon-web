/**
 * ====
 * STEVSCON.COM - profiles/category_prf.js
 * Coordinador visual de la categoría PERFILES.
 * - Entra por el menú del avatar del header: "Ver perfil" / "Editar perfil".
 * - Modal estilo Discord: modo VER (tarjeta) y modo EDITAR (campos).
 * - Los datos van y vienen SOLO por account_conec.js (Firebase).
 * Cargar SIEMPRE al final (después de utils/, edit/ y account_conec.js).
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};

    let overlay = null;
    let contentBox = null;
    let isOpen = false;
    let lastFocus = null;
    let headerObserver = null;

    // ---- Inyección en el menú del avatar (el que pinta session.js) ----

    function startMenuInjection() {
        if (headerObserver) return;
        const slot = document.getElementById('user-header-actions');
        if (!slot) return;
        headerObserver = new MutationObserver(function () { injectIntoMenu(); });
        headerObserver.observe(slot, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
        injectIntoMenu();
    }

    function stopMenuInjection() {
        if (headerObserver) { headerObserver.disconnect(); headerObserver = null; }
    }

    function makeMenuItem(iconClass, text, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.style.cssText = 'display:flex;align-items:center;gap:9px;width:100%;box-sizing:border-box;background:none;border:0;border-radius:8px;padding:8px 10px;color:#ede9fe;font-family:Inter,sans-serif;font-size:13px;font-weight:600;cursor:pointer;text-align:left;';
        const ic = document.createElement('i');
        ic.className = iconClass;
        ic.style.color = '#a78bfa';
        const sp = document.createElement('span');
        sp.textContent = text;
        b.appendChild(ic);
        b.appendChild(sp);
        b.addEventListener('mouseenter', function () { b.style.background = 'rgba(139,92,246,.15)'; });
        b.addEventListener('mouseleave', function () { b.style.background = 'none'; });
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            onClick();
        });
        return b;
    }

    function injectIntoMenu() {
        const slot = document.getElementById('user-header-actions');
        if (!slot) return;
        const divs = slot.getElementsByTagName('div');
        for (let i = 0; i < divs.length; i++) {
            const m = divs[i];
            if (m.style.position !== 'absolute') continue;   // el menú de session.js
            if (m.dataset.prfInjected === '1') continue;
            m.dataset.prfInjected = '1';

            // Insertar antes del botón "Cerrar sesión" para quedar arriba
            const kids = m.children;
            let ref = null;
            for (let j = 0; j < kids.length; j++) {
                if (kids[j].tagName === 'BUTTON' && kids[j].textContent === 'Cerrar sesión') { ref = kids[j]; break; }
            }
            const item1 = makeMenuItem('fa-solid fa-user', 'Ver perfil', function () { m.hidden = true; openView(); });
            const item2 = makeMenuItem('fa-solid fa-pen-to-square', 'Editar perfil', function () { m.hidden = true; openEdit(); });
            if (ref) { m.insertBefore(item1, ref); m.insertBefore(item2, ref); }
            else { m.appendChild(item1); m.appendChild(item2); }
        }
    }

    // ---- MODAL: modo VER y modo EDITAR ----

    function buildModal() {
        if (overlay) return;
        const root = document.getElementById('modals-root');
        if (!root) return;

        overlay = document.createElement('div');
        overlay.className = 'modal-overlay hidden';
        overlay.id = 'prf-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'prf-modal-title');

        const header = document.createElement('div');
        header.className = 'modal-header';

        const titles = document.createElement('div');
        titles.className = 'modal-titles';
        const mTitle = document.createElement('h2');
        mTitle.id = 'prf-modal-title';
        mTitle.textContent = 'Mi perfil';
        const mSub = document.createElement('p');
        mSub.textContent = 'Tu tarjeta, estilo Stevscon.';
        titles.appendChild(mTitle);
        titles.appendChild(mSub);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fa-solid fa-xmark';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', close);

        header.appendChild(titles);
        header.appendChild(closeBtn);

        contentBox = document.createElement('div');
        contentBox.className = 'modal-body';

        modal.appendChild(header);
        modal.appendChild(contentBox);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
        root.appendChild(overlay);
    }

    function openView() {
        if (!SCp.user) return;
        buildModal();
        if (!overlay) return;
        lastFocus = document.activeElement;
        overlay.classList.remove('hidden');
        isOpen = true;
        document.body.style.overflow = 'hidden';
        renderView();
    }

    function openEdit() {
        if (!SCp.user) return;
        buildModal();
        if (!overlay) return;
        lastFocus = document.activeElement;
        overlay.classList.remove('hidden');
        isOpen = true;
        document.body.style.overflow = 'hidden';
        renderEdit();
    }

    function close() {
        if (!overlay || !isOpen) return;
        overlay.classList.add('hidden');
        isOpen = false;
        document.body.style.overflow = '';
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    // ---- MODO VER: la tarjeta ----

    function renderView() {
        if (!contentBox) return;
        while (contentBox.firstChild) contentBox.removeChild(contentBox.firstChild);
        if (!SCp.user) return;

        const load = SCp.profile ? Promise.resolve(SCp.profile) : SCp.load().catch(function () { return null; });
        load.then(function () { paintView(); });
    }

    function paintView() {
        while (contentBox.firstChild) contentBox.removeChild(contentBox.firstChild);

        const actions = document.createElement('button');
        actions.type = 'button';
        actions.textContent = 'Editar perfil';
        actions.style.cssText = 'padding:8px 16px;border-radius:9px;border:0;background:#7c3aed;color:#ffffff;font-family:Inter,sans-serif;font-size:12.5px;font-weight:800;cursor:pointer;';
        actions.addEventListener('click', renderEdit);

        const cardBox = document.createElement('div');
        SCp.ui.renderProfileCard(cardBox, SCp.profile, {
            email: SCp.user.email,
            metadata: SCp.user.metadata
        }, { actions: actions });
        contentBox.appendChild(cardBox);
    }

    // ---- MODO EDITAR: los campos ----

    function renderEdit() {
        if (!SCp.user) return;
        const load = SCp.profile ? Promise.resolve() : SCp.load().catch(function () { return null; });
        load.then(function () { paintEdit(); });
    }

    function paintEdit() {
        if (!contentBox) return;
        while (contentBox.firstChild) contentBox.removeChild(contentBox.firstChild);

        const back = document.createElement('button');
        back.type = 'button';
        back.textContent = '← Volver a mi perfil';
        back.style.cssText = 'display:block;background:none;border:0;padding:0;margin:0 0 12px;color:#a78bfa;font-family:Inter,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;';
        back.addEventListener('click', renderView);
        contentBox.appendChild(back);

        // Banner primero, avatar, nombre, descripción y género al final
        SCp.edit.fields.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (f) {
            const wrap = document.createElement('div');
            wrap.style.marginBottom = '12px';
            f.render(wrap);
            contentBox.appendChild(wrap);
        });
    }

    // ---- Init ----

    function init() {
        SCp.onAuth(function (user) {
            if (user) startMenuInjection();
            else { stopMenuInjection(); if (isOpen) close(); }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen) close();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);