/**
 * ====
 * STEVSCON.COM - accounts/manage/category_acc.js
 * Coordinador visual de las categorías CREATE + ACCESS (UNIDAS).
 * - Pinta la home con las DOS tarjetas: "Iniciar sesión" y "Crear cuenta".
 * - CREATE: modal propio ensamblando OUTPUT + BUTTONS.
 * - ACCESS: delega en acc_access.js (SC.access.open).
 * - Los dos se abren, se cierran y se alternan sin pisarse.
 * - Vigila la sesión: con usuario activo, ambas tarjetas ceden.
 * Cargar SIEMPRE al final (después de outputs, buttons y access).
 * ====
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const LOGO_SRC = 'SC-LOGO-20260825013121.png'; // mismo nombre que en el navbar

    let createModalEl = null;
    let createModalOpen = false;
    let lastFocus = null;
    let successTimer = null;

    // ---- HOME: las dos categorías juntas ----

    // Helper: una tarjeta de categoría (icono + título + descripción + flecha)
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
        subtitle.textContent = 'Tu plataforma social, mensajería y comunidad en tiempo real.';

        // ---- Tarjetas ACCESS + CREATE, juntas y unidas ----
        const stack = document.createElement('div');
        stack.className = 'category-stack';

        stack.appendChild(makeCategoryCard(
            'home-access-card',
            'fa-solid fa-right-to-bracket',
            'Iniciar sesión',
            'Ya tienes cuenta: entra con tu correo o tu @handler.',
            openAccess
        ));

        stack.appendChild(makeCategoryCard(
            'home-create-card',
            'fa-solid fa-user-plus',
            'Crear cuenta',
            'Únete gratis: elige tu @handler, tu nombre y tu contraseña.',
            openCreateModal
        ));

        // Zona donde vive la tarjeta de sesión (si el usuario ya inició sesión)
        const sessionBox = document.createElement('div');
        sessionBox.className = 'hidden';
        sessionBox.id = 'home-session-box';

        home.appendChild(logo);
        home.appendChild(title);
        home.appendChild(subtitle);
        home.appendChild(stack);
        home.appendChild(sessionBox);
        viewport.appendChild(home);
    }

    // ---- Sesión: CREATE y ACCESS ceden cuando ya hay usuario ----

    function watchSession() {
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.auth) return;
        window.StevsconFirebase.auth.onAuthStateChanged(function (user) {
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

function renderSessionCard(container, user) {
        const card = document.createElement('div');
        card.className = 'category-card is-static';

        const avatar = document.createElement('span');
        avatar.className = 'session-avatar';
        avatar.textContent = 'S';

        const text = document.createElement('span');
        text.className = 'category-text';
        const name = document.createElement('strong');
        name.textContent = 'Sesión iniciada';
        const detail = document.createElement('span');
        detail.textContent = user.email || 'Cargando tu perfil...';
        text.appendChild(name);
        text.appendChild(detail);

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-id-btn';
        copyBtn.title = 'Copiar tu ID';
        copyBtn.setAttribute('aria-label', 'Copiar tu ID');
        const copyIcon = document.createElement('i');
        copyIcon.className = 'fa-solid fa-copy';
        copyBtn.appendChild(copyIcon);

        card.appendChild(avatar);
        card.appendChild(text);
        card.appendChild(copyBtn);
        container.appendChild(card);

        // Cerebro propio: el perfil vive en users/{uid} y el avatar
        // (imagen base64 o preset) en users/{uid}/profile
        if (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.database) {
            window.StevsconFirebase.database.ref('users/' + user.uid).once('value')
                .then(function (snap) {
                    const p = snap.val() || {};
                    paintSessionAvatar(avatar, p.profile || {}, p);
                    name.textContent = p.username || 'Sesión iniciada';
                    detail.textContent = '@' + (p.handler || '') + ' · ID: ' + (p.userId || '—');
                    copyBtn.addEventListener('click', function () { copyId(p.userId); });
                })
                .catch(function () { /* sin perfil aún: dejamos el correo */ });
        }
    }

    // Avatar de la tarjeta: imagen del perfil (base64) si existe,
    // degradado del preset si no, y letra de respaldo.
    function paintSessionAvatar(avatarEl, profile, userRow) {
        const letter = String((userRow && userRow.username) || 'S').charAt(0).toUpperCase();

        if (profile && profile.avatarUrl) {
            const img = document.createElement('img');
            img.src = profile.avatarUrl;
            img.alt = 'Tu avatar';
            img.referrerPolicy = 'no-referrer';
            img.className = avatarEl.className;
            img.style.cssText = 'object-fit:cover;';
            img.onerror = function () {
                if (img.parentNode) img.parentNode.replaceChild(avatarEl, img);
                avatarEl.textContent = letter;
            };
            avatarEl.parentNode.replaceChild(img, avatarEl);
            return;
        }

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

    // ---- MODAL CREATE: ensambla OUTPUT + BUTTONS ----

    function buildCreateModal() {
        // Sin limpiar modals-root: ahí también vive el modal de ACCESS.
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
        mSub.textContent = 'Únete a Stevscon en menos de un minuto.';
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

        // Defensa: si los módulos no cargaron, avisamos en vez de fallar
        if (typeof SC.output === 'undefined' || typeof SC.output.renderAll !== 'function') {
            const warn = document.createElement('p');
            warn.className = 'field-hint hint-error';
            warn.textContent = 'Error interno: los módulos OUTPUT no cargaron. Revisa el orden de los <script> en el index.';
            form.appendChild(warn);
        } else {
            // 1) Campos: account, username, handler, password
            SC.output.renderAll(form);

            // 2) Caja de errores/éxito de los botones
            if (SC.buttons && SC.buttons.errors && typeof SC.buttons.errors.render === 'function') {
                form.appendChild(SC.buttons.errors.render());
            }
            // 3) Checkbox "No soy un robot"
            if (SC.buttons && SC.buttons.allow && typeof SC.buttons.allow.render === 'function') {
                form.appendChild(SC.buttons.allow.render());
            }
            // 4) Botón Crear cuenta
            if (SC.buttons && SC.buttons.create && typeof SC.buttons.create.render === 'function') {
                form.appendChild(SC.buttons.create.render());
            }
        }

        // Puente entre categorías: desde CREATE también puedes ir a ACCESS
        const toAccess = document.createElement('button');
        toAccess.type = 'button';
        toAccess.textContent = '¿Ya tienes cuenta? Inicia sesión';
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
        // Alternancia limpia: si ACCESS está abierto, se cierra primero
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

    // ---- ACCESS: se delega en acc_access.js (modal propio) ----

    function openAccess() {
        // Alternancia limpia: si CREATE está abierto, se cierra primero
        closeCreateModal();
        if (SC.access && typeof SC.access.open === 'function') {
            SC.access.open();
        } else {
            showToast('No pudimos abrir el inicio de sesión: falta acc_access.js. Revisa el index.', 'error');
        }
    }

    // Enlace "¿Aún no tienes cuenta? Crear una" del modal ACCESS
    document.addEventListener('sc:open-create', openCreateModal);

    // ---- Éxito de cada categoría + toast global ----

    function onCreateSuccess(data) {
        showToast('¡Cuenta creada! Bienvenido, ' + data.username + ' (ID: ' + data.userId + ')');
        successTimer = setTimeout(closeCreateModal, 5000);
    }

    function onAccessSuccess() {
        showToast('Sesión iniciada. ¡Hola de nuevo!');
    }

    function showToast(msg, kind) {
        const wrap = document.getElementById('alerts-container');
        if (!wrap) return;
        const toast = document.createElement('div');
        toast.className = 'toast ' + (kind === 'error' ? 'toast-error' : 'toast-success');

        const icon = document.createElement('i');
        icon.className = kind === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';

        const text = document.createElement('span');
        text.textContent = msg; // siempre textContent: nunca innerHTML

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

    // ---- Init ----

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