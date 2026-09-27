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

    const LOGO_SRC = 'SC-LOGO-20260825013121.png'; // mismo nombre que en el navbar

    let createModalEl = null;
    let createModalOpen = false;
    let lastFocus = null;
    let successTimer = null;
    let lastSessionUser = null;

    // ---- HOME: las dos categorias juntas ----

    // Helper: una tarjeta de categoria (icono + titulo + descripcion + flecha)
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

        // ---- Tarjetas ACCESS + CREATE, juntas y unidas ----
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

        // Zona donde vive la tarjeta de sesion (si el usuario ya inicio sesion)
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

    // ---- Sesion: CREATE y ACCESS ceden cuando ya hay usuario ----

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

    // Refresca la tarjeta de sesion (avatar nuevo, username nuevo, etc.)
    // sin recargar la web. Lo dispara el evento 'stevscon:profile-updated'.
    function refreshSessionCard() {
        if (!lastSessionUser) return;
        const box = document.getElementById('home-session-box');
        if (!box) return;
        while (box.firstChild) box.removeChild(box.firstChild);
        renderSessionCard(box, lastSessionUser);
    }
    document.addEventListener('stevscon:profile-updated', refreshSessionCard);

    // ---- TARJETA DE SESION: autocontenida, con estilos inline ----

    function renderSessionCard(container, user) {
        const card = document.createElement('div');
        card.className = 'category-card is-static session-card';
        // Layout FIJO con inline: avatar | columna de texto | boton copiar.
        card.style.cssText = 'display:flex;align-items:center;gap:14px;text-align:left;';

        // 1) AVATAR: span circular GARANTIZADO con inline (aunque el CSS no
        //    tenga la clase). Aqui se pinta la imagen/GIF con background.
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

        // 2) COLUMNA de texto SIEMPRE al lado del avatar:
        //    username GRANDE / handler pequeno / ID normal hasta abajo.
        const info = document.createElement('span');
        info.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:2px;flex:1;min-width:0;overflow:hidden;';

        const name = document.createElement('strong');
        name.textContent = 'Sesion iniciada';
        name.style.cssText = 'font-size:1.05rem;font-weight:800;color:#f8fafc;letter-spacing:-.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const handlerEl = document.createElement('span');
        handlerEl.textContent = user.email || '';
        handlerEl.style.cssText = 'font-size:.8rem;font-weight:600;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        const idEl = document.createElement('span');
        idEl.textContent = 'ID: —';
        idEl.style.cssText = 'font-size:.85rem;font-weight:500;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

        info.appendChild(name);
        info.appendChild(handlerEl);
        info.appendChild(idEl);

        // 3) Boton de copiar ID: fijo a la derecha, sin pisar la columna.
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-id-btn';
        copyBtn.style.cssText = 'flex:none;margin-left:auto;';
        copyBtn.title = 'Copiar tu ID';
        copyBtn.setAttribute('aria-label', 'Copiar tu ID');
        const copyIcon = document.createElement('i');
        copyIcon.className = 'fa-solid fa-copy';
        copyBtn.appendChild(copyIcon);

        card.appendChild(avatar);
        card.appendChild(info);
        card.appendChild(copyBtn);
        container.appendChild(card);

        let currentId = null;
        copyBtn.addEventListener('click', function () { if (currentId) copyId(currentId); });

        // Cerebro propio: el perfil vive en users/{uid} y el avatar
        // (base64 o GIF animado) en users/{uid}/profile
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
                .catch(function () { /* sin perfil aun: dejamos el correo */ });
        }
    }

    // Pintor LOCAL de la tarjeta: SOLO background-image sobre el span.
    // NUNCA crea <img> y NUNCA llama a media_acc.js: la tarjeta no puede
    // romperse por ninguna otra version de ningun otro file.
    function paintSessionAvatar(avatarEl, profile, userRow) {
        const letter = String((userRow && userRow.username) || (profile && profile.username) || 'S').charAt(0).toUpperCase();
        const url = profile && (profile.avatarUrl || profile.avatarURL);

        // Limpieza: sin URL (o antes de pintar) volvemos al color de fabrica
        // y al preset guardado si existe, con la letra de respaldo.
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

    // ---- MODAL CREATE: ensambla OUTPUT + BUTTONS ----

    function buildCreateModal() {
        // Sin limpiar modals-root: ahi tambien vive el modal de ACCESS.
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

        // Defensa: si los modulos no cargaron, avisamos en vez de fallar
        if (typeof SC.output === 'undefined' || typeof SC.output.renderAll !== 'function') {
            const warn = document.createElement('p');
            warn.className = 'field-hint hint-error';
            warn.textContent = 'Error interno: los modulos OUTPUT no cargaron. Revisa el orden de los scripts en el index.';
            form.appendChild(warn);
        } else {
            // 1) Campos: account, username, handler, password
            SC.output.renderAll(form);

            // 2) Caja de errores/exito de los botones
            if (SC.buttons && SC.buttons.errors && typeof SC.buttons.errors.render === 'function') {
                form.appendChild(SC.buttons.errors.render());
            }
            // 3) Checkbox "No soy un robot"
            if (SC.buttons && SC.buttons.allow && typeof SC.buttons.allow.render === 'function') {
                form.appendChild(SC.buttons.allow.render());
            }
            // 4) Boton Crear cuenta
            if (SC.buttons && SC.buttons.create && typeof SC.buttons.create.render === 'function') {
                form.appendChild(SC.buttons.create.render());
            }
        }

        // Puente entre categorias: desde CREATE tambien puedes ir a ACCESS
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
        // Alternancia limpia: si ACCESS esta abierto, se cierra primero
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
        // Alternancia limpia: si CREATE esta abierto, se cierra primero
        closeCreateModal();
        if (SC.access && typeof SC.access.open === 'function') {
            SC.access.open();
        } else {
            showToast('No pudimos abrir el inicio de sesion: falta acc_access.js. Revisa el index.', 'error');
        }
    }

    // Enlace "¿Aun no tienes cuenta? Crear una" del modal ACCESS
    document.addEventListener('sc:open-create', openCreateModal);

    // ---- Exito de cada categoria + toast global ----

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