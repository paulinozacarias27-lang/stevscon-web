/**
 * ============================================================
 * STEVSCON.COM - accounts/manage/category_acc.js
 * Coordinador visual de la categoría CREATE.
 * - Pinta la categoría "Crear cuenta" como principal de la web.
 * - Abre el modal con todos los bloques OUTPUT + BUTTONS.
 * - Vigila la sesión: con usuario activo, CREATE cede su lugar.
 * Cargar SIEMPRE al final (después de outputs y buttons).
 * ============================================================
 */
(function (window, document) {
    'use strict';

    const SC = window.StevsconCreate = window.StevsconCreate || {};

    const LOGO_SRC = 'SC-LOGO-20260825013121.png'; // mismo nombre que en el navbar

    let modalEl = null;
    let modalOpen = false;
    let lastFocus = null;
    let successTimer = null;

    // ---------- HOME: categoría "Crear cuenta" ----------

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

        // Tarjeta de acceso a la categoría CREATE
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'category-card';
        card.id = 'home-create-card';
        card.addEventListener('click', openModal);

        const iconWrap = document.createElement('span');
        iconWrap.className = 'category-icon';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-user-plus';
        iconWrap.appendChild(icon);

        const textWrap = document.createElement('span');
        textWrap.className = 'category-text';
        const cTitle = document.createElement('strong');
        cTitle.textContent = 'Crear cuenta';
        const cDesc = document.createElement('span');
        cDesc.textContent = 'Únete gratis: elige tu @handler, tu nombre y tu contraseña.';
        textWrap.appendChild(cTitle);
        textWrap.appendChild(cDesc);

        const arrow = document.createElement('i');
        arrow.className = 'fa-solid fa-chevron-right category-arrow';

        card.appendChild(iconWrap);
        card.appendChild(textWrap);
        card.appendChild(arrow);

        // Zona donde vive la tarjeta de sesión (si el usuario ya inició sesión)
        const sessionBox = document.createElement('div');
        sessionBox.className = 'hidden';
        sessionBox.id = 'home-session-box';

        home.appendChild(logo);
        home.appendChild(title);
        home.appendChild(subtitle);
        home.appendChild(card);
        home.appendChild(sessionBox);
        viewport.appendChild(home);
    }

    // ---------- Sesión: CREATE cede cuando ya hay usuario ----------

    function watchSession() {
        if (typeof window.StevsconFirebase === 'undefined' || !window.StevsconFirebase.auth) return;
        window.StevsconFirebase.auth.onAuthStateChanged(function (user) {
            const card = document.getElementById('home-create-card');
            const sessionBox = document.getElementById('home-session-box');
            if (!card || !sessionBox) return;

            while (sessionBox.firstChild) sessionBox.removeChild(sessionBox.firstChild);

            if (user) {
                card.classList.add('hidden');
                sessionBox.classList.remove('hidden');
                renderSessionCard(sessionBox, user);
            } else {
                card.classList.remove('hidden');
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
        copyBtn.appendChild(copyBtnIcon(copyIcon));

        card.appendChild(avatar);
        card.appendChild(text);
        card.appendChild(copyBtn);
        container.appendChild(card);

        // Cerebro propio: el perfil vive en users/{uid}
        if (typeof window.StevsconFirebase !== 'undefined' && window.StevsconFirebase.database) {
            window.StevsconFirebase.database.ref('users/' + user.uid).once('value')
                .then(function (snap) {
                    const p = snap.val() || {};
                    avatar.textContent = (p.username || 'S').charAt(0).toUpperCase();
                    name.textContent = p.username || 'Sesión iniciada';
                    detail.textContent = '@' + (p.handler || '') + ' · ID: ' + (p.userId || '—');
                    copyBtn.addEventListener('click', function () { copyId(p.userId); });
                })
                .catch(function () { /* sin perfil aún: dejamos el correo */ });
        }
    }

    // El icono vive dentro del botón (helper por claridad)
    function copyBtnIcon(icon) { return icon; }

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

    // ---------- MODAL: ensambla OUTPUT + BUTTONS ----------

    function buildModal() {
        const root = document.getElementById('modals-root');
        if (!root) return;
        while (root.firstChild) root.removeChild(root.firstChild);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay hidden';

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
        closeBtn.addEventListener('click', closeModal);

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

        body.appendChild(form);
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        root.appendChild(overlay);
        modalEl = overlay;
    }

    function openModal() {
        if (!modalEl) buildModal();
        if (!modalEl) return;
        lastFocus = document.activeElement;
        modalEl.classList.remove('hidden');
        modalOpen = true;
        document.body.style.overflow = 'hidden';
        const firstInput = modalEl.querySelector('input');
        if (firstInput) setTimeout(function () { firstInput.focus(); }, 60);
    }

    function closeModal() {
        if (!modalEl || !modalOpen) return;
        modalEl.classList.add('hidden');
        modalOpen = false;
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

    // ---------- Éxito del registro + toast global ----------

    function onCreateSuccess(data) {
        showToast('¡Cuenta creada! Bienvenido, ' + data.username + ' (ID: ' + data.userId + ')');
        successTimer = setTimeout(closeModal, 5000);
    }

    function showToast(msg) {
        const wrap = document.getElementById('alerts-container');
        if (!wrap) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-circle-check';

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

    // ---------- Init ----------

    function init() {
        renderHome();
        buildModal();
        watchSession();
        if (typeof SC.on === 'function') SC.on('create:success', onCreateSuccess);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modalOpen) closeModal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);