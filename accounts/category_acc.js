/**
 * ====
 * STEVSCON.COM - accounts/manage/category_acc.js
 * Coordinador visual de las categorias CREATE + ACCESS (UNIDAS).
 * - Pinta la home con las DOS tarjetas: "Iniciar sesion" y "Crear cuenta".
 * - CREATE: modal propio ensamblando OUTPUT + BUTTONS.
 * - ACCESS: delega en acc_access.js (SC.access.open).
 * - Los dos se abren, se cierran y se alternan sin pisarse.
 * - Vigila la sesion: con usuario activo, ambas tarjetas ceden.
 * - NUEVO v3: tarjeta de sesion AUTOCONTENIDA e IRROMPIBLE — el avatar se
 *   pinta AQUI dentro con estilos inline (background-image sobre el span
 *   circular, GIFs animados incluidos) y NO depende de media_acc.js.
 *   Layout fijo: avatar circulo | username grande / handler pequeno / ID
 *   en texto normal | boton de copiar a la derecha.
 *   Se refresca sola cuando Perfiles dispara 'stevscon:profile-updated'.
 * Cargar SIEMPRE al final (despues de outputs, buttons y access).
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const LOGO_SRC = 'SC-LOGO-20260825013121.png';

    let createModalEl = null;
    let createModalOpen = false;
    let lastFocus = null;
    let successTimer = null;
    let lastSessionUser = null;


    function makeCategoryCard(id, iconClass, title, desc, onClick) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'category-card';
        card.id = id;
        card.addEventListener('click', onClick);

        const iconWrap = document.createElement('span');
        iconWrap.className = 'category-icon';
        const icon = document.createElement('i');
        icon.className = iconClass;
        iconWrap.appendChild(icon);

        const textWrap = document.createElement('span');
        textWrap.className = 'category-text';
        const cTitle = document.createElement('strong');
        cTitle.textContent = title;
        const cDesc = document.createElement('span');
        cDesc.textContent = desc;
        textWrap.appendChild(cTitle);
        textWrap.appendChild(cDesc);

        const arrow = document.createElement('i');
        arrow.className = 'fa-solid fa-chevron-right category-arrow';

        card.appendChild(iconWrap);
        card.appendChild(textWrap);
        card.appendChild(arrow);
        return card;
    }

    function renderHome() {
        const viewport = document.getElementById('app-main-viewport');
        if (!viewport) return;
        while (viewport.firstChild) viewport.removeChild(viewport.firstChild);

        const home = document.createElement('section');
        home.className = 'home-hero';

        const logo = document.createElement('img');
        logo.src = LOGO_SRC;
        logo.alt = 'Stevscon Logo';
        logo.className = 'home-logo';

        const title = document.createElement('h1');
        title.className = 'home-title';
        title.textContent = 'Bienvenido a Stevscon';

        const subtitle = document.createElement('p');
        subtitle.className = 'home-subtitle';
        subtitle.textContent = 'Tu plataforma social, mensajeria y comunidad en tiempo real.';

        const chips = document.createElement('div');
        chips.className = 'home-chips';
        [
            ['fa-solid fa-bolt', 'Todo en tiempo real'],
            ['fa-solid fa-gift', '100% gratis'],
            ['fa-solid fa-shield-halved', 'Con moderacion'],
            ['fa-solid fa-language', 'En espanol']
        ].forEach(function (c) {
            const chip = document.createElement('span');
            chip.className = 'home-chip';
            const ic = document.createElement('i');
            ic.className = c[0];
            chip.appendChild(ic);
            chip.appendChild(document.createTextNode(c[1]));
            chips.appendChild(chip);
        });

        const stack = document.createElement('div');
        stack.className = 'category-stack';

        stack.appendChild(makeCategoryCard(
            'home-access-card',
            'fa-solid fa-right-to-bracket',
            'Iniciar sesion',
            'Ya tienes cuenta: entra con tu correo o tu @handler.',
            openAccess
        ));

        stack.appendChild(makeCategoryCard(
            'home-create-card',
            'fa-solid fa-user-plus',
            'Crear cuenta',
            'Unete gratis: elige tu @handler, tu nombre y tu contrasena.',
            openCreateModal
        ));

        const sessionBox = document.createElement('div');
        sessionBox.className = 'hidden';
        sessionBox.id = 'home-session-box';

        const stats = document.createElement('div');
        stats.className = 'home-stats';
        const statMembers = makeStat('—', 'Miembros');
        const statArticles = makeStat('—', 'Articulos en la Wiki');
        const statEdits = makeStat('—', 'Ediciones de la comunidad');
        stats.appendChild(statMembers);
        stats.appendChild(statArticles);
        stats.appendChild(statEdits);
        loadStats(statMembers, statArticles, statEdits);

        const features = document.createElement('div');
        features.className = 'home-features';
        features.appendChild(makeFeature('fa-solid fa-comments', 'Social', 'Publica, comenta y chatea por mensajes directos con la comunidad.', '/social/social.html'));
        features.appendChild(makeFeature('fa-solid fa-book', 'Wiki', 'La documentacion oficial de todos los proyectos de Stevscon.', '/wiki/wiki.html'));
        features.appendChild(makeFeature('fa-solid fa-file-pen', 'Apostulaciones', 'Aplica para entrar al staff y a los proyectos abiertos.', '/forms/forms.html'));

        home.appendChild(logo);
        home.appendChild(title);
        home.appendChild(subtitle);
        home.appendChild(chips);
        home.appendChild(stack);
        home.appendChild(sessionBox);
        home.appendChild(stats);
        home.appendChild(features);
        viewport.appendChild(home);
    }

    function makeStat(val, label) {
        const s = document.createElement('div');
        s.className = 'home-stat';
        const b = document.createElement('b');
        b.textContent = val;
        const l = document.createElement('span');
        l.textContent = label;
        s.appendChild(b);
        s.appendChild(l);
        return s;
    }

    function loadStats(membersEl, articlesEl, editsEl) {
        try {
            fetch('https://stevscon-protocole-base-default-rtdb.firebaseio.com/handlers.json?shallow=true')
                .then(function (r) { return r.json(); })
                .then(function (j) {
                    if (j && typeof j === 'object') membersEl.firstChild.textContent = String(Object.keys(j).length);
                })
                .catch(function () {});
        } catch (e) {}
        if (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.database) {
            const D = window.StevsconFirebase.database;
            try {
                D.ref('wiki/counters/articles').on('value', function (s) { articlesEl.firstChild.textContent = String(s.val() || 0); });
                D.ref('wiki/counters/edits').on('value', function (s) { editsEl.firstChild.textContent = String(s.val() || 0); });
            } catch (e) {}
        }
    }

    function makeFeature(icon, name, desc, href) {
        const a = document.createElement('a');
        a.className = 'home-feature';
        a.href = href;
        const ic = document.createElement('span');
        ic.className = 'home-fico';
        const i = document.createElement('i');
        i.className = icon;
        ic.appendChild(i);
        const b = document.createElement('b');
        b.textContent = name;
        const p = document.createElement('p');
        p.textContent = desc;
        a.appendChild(ic);
        a.appendChild(b);
        a.appendChild(p);
        return a;
    }


    function watchSession() {
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.auth) return;
        window.StevsconFirebase.auth.onAuthStateChanged(function (user) {
            lastSessionUser = user || null;

            const accessCard = document.getElementById('home-access-card');
            const createCard = document.getElementById('home-create-card');
            const sessionBox = document.getElementById('home-session-box');
            if (!sessionBox) return;

            while (sessionBox.firstChild) sessionBox.removeChild(sessionBox.firstChild);

            if (user) {
                if (accessCard) accessCard.classList.add('hidden');
                if (createCard) createCard.classList.add('hidden');
                sessionBox.classList.remove('hidden');
                renderSessionCard(sessionBox, user);
            } else {
                if (accessCard) accessCard.classList.remove('hidden');
                if (createCard) createCard.classList.remove('hidden');
                sessionBox.classList.add('hidden');
            }
        });
    }

    function refreshSessionCard() {
        if (!lastSessionUser) return;
        const box = document.getElementById('home-session-box');
        if (!box) return;
        while (box.firstChild) box.removeChild(box.firstChild);
        renderSessionCard(box, lastSessionUser);
    }
    document.addEventListener('stevscon:profile-updated', refreshSessionCard);


    function renderSessionCard(container, user) {
        const card = document.createElement('div');
        card.className = 'category-card is-static session-card';
        card.style.cssText = 'display:flex;align-items:center;gap:14px;text-align:left;';

        const avatar = document.createElement('span');
        avatar.className = 'session-avatar';
        avatar.style.cssText = [
            'flex:none', 'width:56px', 'height:56px',
            'border-radius:50%', 'overflow:hidden',
            'display:flex', 'align-items:center', 'justify-content:center',
            'background-color:#2e2440', 'background-size:cover',
            'background-position:center', 'background-repeat:no-repeat',
            'color:#f8fafc', 'font-weight:800', 'font-size:1.2rem',
            'box-sizing:border-box'
        ].join(';');
        avatar.textContent = 'S';

        const avatarWrap = document.createElement('span');
        avatarWrap.style.cssText = 'position:relative;flex:none;display:inline-flex;';
        avatarWrap.appendChild(avatar);

        const info = document.createElement('span');
        info.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:2px;flex:1;min-width:0;overflow:hidden;';

        const name = document.createElement('strong');
        name.textContent = 'Sesion iniciada';
        name.style.cssText = 'font-size:1.05rem;font-weight:800;color:var(--text-main,#f8fafc);letter-spacing:-.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const handlerEl = document.createElement('span');
        handlerEl.textContent = user.email || '';
        handlerEl.style.cssText = 'font-size:.8rem;font-weight:600;color:var(--text-muted,#94a3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const idEl = document.createElement('span');
        idEl.textContent = 'ID: —';
        idEl.style.cssText = 'font-size:.85rem;font-weight:500;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        info.appendChild(name);
        info.appendChild(handlerEl);
        info.appendChild(idEl);

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-id-btn';
        copyBtn.style.cssText = 'flex:none;margin-left:auto;';
        copyBtn.title = 'Copiar tu ID';
        copyBtn.setAttribute('aria-label', 'Copiar tu ID');
        const copyIcon = document.createElement('i');
        copyIcon.className = 'fa-solid fa-copy';
        copyBtn.appendChild(copyIcon);

        card.appendChild(avatarWrap);
        card.appendChild(info);
        card.appendChild(copyBtn);
        container.appendChild(card);

        const SCST = window.StevsconStatus;
        if (SCST && typeof SCST.badge === 'function') SCST.badge(avatarWrap, 18);

        let currentId = null;
        copyBtn.addEventListener('click', function () { if (currentId) copyId(currentId); });

        if (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.database) {
            window.StevsconFirebase.database.ref('users/' + user.uid).once('value')
                .then(function (snap) {
                    const p = snap.val() || {};
                    paintSessionAvatar(avatar, p.profile || {}, p);
                    name.textContent = p.username || 'Sesion iniciada';
                    handlerEl.textContent = p.handler ? '@' + p.handler : (user.email || '');
                    currentId = p.userId || null;
                    idEl.textContent = 'ID: ' + (p.userId || '—');
                })
                .catch(function () {  });
        }
    }

    function paintSessionAvatar(avatarEl, profile, userRow) {
        const letter = String((userRow && userRow.username) || (profile && profile.username) || 'S').charAt(0).toUpperCase();
        const url = profile && (profile.avatarUrl || profile.avatarURL);

        avatarEl.style.background = '';
        avatarEl.style.backgroundColor = '#2e2440';

        if (!url) {
            const SCp = window.StevsconProfiles;
            if (profile && profile.avatarPreset && SCp && SCp.presets && SCp.presets.avatar) {
                for (let i = 0; i < SCp.presets.avatar.length; i++) {
                    if (SCp.presets.avatar[i].id === profile.avatarPreset) {
                        avatarEl.style.background = SCp.presets.avatar[i].css;
                        break;
                    }
                }
            }
            avatarEl.textContent = letter;
            return;
        }

        avatarEl.textContent = letter;
        const probe = new Image();
        probe.onerror = function () {
            avatarEl.style.backgroundImage = 'none';
            avatarEl.textContent = letter;
        };
        probe.onload = function () {
            avatarEl.style.background = '';
            avatarEl.style.backgroundColor = '#2e2440';
            avatarEl.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.style.backgroundRepeat = 'no-repeat';
            avatarEl.textContent = '';
        };
        probe.src = String(url);
    }

    function copyId(id) {
        if (!id) return;
        const done = function () { showToast('ID copiado: ' + id); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(id).then(done).catch(function () {});
        } else {
            const tmp = document.createElement('textarea');
            tmp.value = id;
            document.body.appendChild(tmp);
            tmp.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            document.body.removeChild(tmp);
        }
    }


    function buildCreateModal() {
        if (document.getElementById('create-modal-overlay')) {
            createModalEl = document.getElementById('create-modal-overlay');
            return;
        }
        const root = document.getElementById('modals-root');
        if (!root) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay hidden';
        overlay.id = 'create-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'create-modal-title');

        const header = document.createElement('div');
        header.className = 'modal-header';

        const titles = document.createElement('div');
        titles.className = 'modal-titles';
        const mTitle = document.createElement('h2');
        mTitle.id = 'create-modal-title';
        mTitle.textContent = 'Crear cuenta';
        const mSub = document.createElement('p');
        mSub.textContent = 'Unete a Stevscon en menos de un minuto.';
        titles.appendChild(mTitle);
        titles.appendChild(mSub);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fa-solid fa-xmark';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', closeCreateModal);

        header.appendChild(titles);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body';

        const form = document.createElement('form');
        form.className = 'create-form';
        form.noValidate = true;
        form.addEventListener('submit', function (e) { e.preventDefault(); });

        if (typeof SC.output === 'undefined' || typeof SC.output.renderAll !== 'function') {
            const warn = document.createElement('p');
            warn.className = 'field-hint hint-error';
            warn.textContent = 'Error interno: los modulos OUTPUT no cargaron. Revisa el orden de los scripts en el index.';
            form.appendChild(warn);
        } else {
            SC.output.renderAll(form);

            if (SC.buttons && SC.buttons.errors && typeof SC.buttons.errors.render === 'function') {
                form.appendChild(SC.buttons.errors.render());
            }
            if (SC.buttons && SC.buttons.allow && typeof SC.buttons.allow.render === 'function') {
                form.appendChild(SC.buttons.allow.render());
            }
            if (SC.buttons && SC.buttons.create && typeof SC.buttons.create.render === 'function') {
                form.appendChild(SC.buttons.create.render());
            }
        }

        const toAccess = document.createElement('button');
        toAccess.type = 'button';
        toAccess.textContent = '¿Ya tienes cuenta? Inicia sesion';
        toAccess.style.cssText = 'display:block;background:none;border:0;padding:0;margin:12px auto 0;font-family:Inter,sans-serif;font-size:12.5px;color:#8b5cf6;cursor:pointer;';
        toAccess.addEventListener('click', function () {
            closeCreateModal();
            openAccess();
        });
        form.appendChild(toAccess);

        body.appendChild(form);
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeCreateModal();
        });

        root.appendChild(overlay);
        createModalEl = overlay;
    }

    function openCreateModal() {
        if (SC.access && typeof SC.access.close === 'function') SC.access.close();
        if (!createModalEl) buildCreateModal();
        if (!createModalEl) return;
        lastFocus = document.activeElement;
        createModalEl.classList.remove('hidden');
        createModalOpen = true;
        document.body.style.overflow = 'hidden';
        const firstInput = createModalEl.querySelector('input');
        if (firstInput) setTimeout(function () { firstInput.focus(); }, 60);
    }

    function closeCreateModal() {
        if (!createModalEl || !createModalOpen) return;
        createModalEl.classList.add('hidden');
        createModalOpen = false;
        document.body.style.overflow = '';
        if (successTimer) { clearTimeout(successTimer); successTimer = null; }
        resetAll();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function resetAll() {
        if (typeof SC.output !== 'undefined' && typeof SC.output.resetAll === 'function') SC.output.resetAll();
        if (SC.buttons) {
            if (SC.buttons.errors && SC.buttons.errors.clear) SC.buttons.errors.clear();
            if (SC.buttons.allow && SC.buttons.allow.reset) SC.buttons.allow.reset();
            if (SC.buttons.create && SC.buttons.create.reset) SC.buttons.create.reset();
        }
    }


    function openAccess() {
        closeCreateModal();
        if (SC.access && typeof SC.access.open === 'function') {
            SC.access.open();
        } else {
            showToast('No pudimos abrir el inicio de sesion: falta acc_access.js. Revisa el index.', 'error');
        }
    }

    document.addEventListener('sc:open-create', openCreateModal);


    function onCreateSuccess(data) {
        showToast('¡Cuenta creada! Bienvenido, ' + data.username + ' (ID: ' + data.userId + ')');
        successTimer = setTimeout(closeCreateModal, 5000);
    }

    function onAccessSuccess() {
        showToast('Sesion iniciada. ¡Hola de nuevo!');
    }

    function showToast(msg, kind) {
        const wrap = document.getElementById('alerts-container');
        if (!wrap) return;
        const toast = document.createElement('div');
        toast.className = 'toast ' + (kind === 'error' ? 'toast-error' : 'toast-success');

        const icon = document.createElement('i');
        icon.className = kind === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';

        const text = document.createElement('span');
        text.textContent = msg;

        toast.appendChild(icon);
        toast.appendChild(text);
        wrap.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('toast-out');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 350);
        }, 4500);
    }


    function init() {
        renderHome();
        buildCreateModal();
        watchSession();
        if (typeof SC.on === 'function') {
            SC.on('create:success', onCreateSuccess);
            SC.on('access:success', onAccessSuccess);
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && createModalOpen) closeCreateModal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);