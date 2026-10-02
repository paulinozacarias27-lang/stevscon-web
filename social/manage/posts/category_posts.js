/**
 * ====
 * STEVSCON.COM - social/manage/category_posts.js (v1)
 * Página SOCIAL completa: composer de staff + feed público EN TIEMPO REAL.
 * - Monta el motor (admin_post.js):
 *     SCSOC.posts.mountCompose(host) -> composer (solo staff lo ve activo)
 *     SCSOC.posts.mountFeed(host)    -> feed en tiempo real (todos lo ven)
 * - La página es una capa fija de pantalla completa: la home queda
 *   intacta debajo y ningún otro category se entera.
 * - API pública: SCSOC.pages.open() / close() / toggle() / isOpen().
 * - Botón "Volver" + tecla Escape (sin robarle el Escape a los modals)
 *   + badge EN VIVO. La pestaña de entrada (category_social.js) se
 *   esconde sola mientras esta página está abierta.
 * - Defensa: si el core no cargó, avisa en pantalla sin romperse NUNCA.
 * Cargar AL FINAL del bloque social (después de category_social.js).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    SCSOC.pages = SCSOC.pages || {};

    const PAGE_ID = 'scsoc-social-page';

    let pageEl = null;
    let composerHost = null;
    let feedHost = null;
    let feedLoader = null;
    let loaderTimer = null;
    let mounted = false;
    let isOpen = false;
    let lastFocus = null;

    /* ---- Estilos propios de la página ---- */
    const CSS = [
        '#' + PAGE_ID + ' .scsoc-composer-host:empty { display: none; }',
        '#' + PAGE_ID + ' .scsoc-feed-loader {',
        '  display: flex; align-items: center; justify-content: center; gap: 10px;',
        '  padding: 34px 0; color: var(--text-muted, #94a3b8);',
        '  font-size: 13px; font-weight: 600; font-family: Inter, sans-serif;',
        '}',
        '#' + PAGE_ID + ' .scsoc-spin {',
        '  width: 18px; height: 18px; border-radius: 50%; flex: none;',
        '  border: 2.5px solid var(--bg-hover, #261f36);',
        '  border-top-color: var(--purple-accent, #8b5cf6);',
        '  animation: scsoc-spin .7s linear infinite;',
        '}',
        '@keyframes scsoc-spin { to { transform: rotate(360deg); } }',
        '#' + PAGE_ID + ' .scsoc-live-dot {',
        '  width: 8px; height: 8px; border-radius: 50%; background: #22c55e;',
        '  animation: scsoc-live 1.6s ease-in-out infinite;',
        '}',
        '@keyframes scsoc-live {',
        '  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, .45); }',
        '  70%      { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }',
        '}',
        '#' + PAGE_ID + ' .scsoc-core-error {',
        '  border: 1px solid rgba(239, 68, 68, .35); background: rgba(239, 68, 68, .08);',
        '  color: #f87171; border-radius: 12px; padding: 14px 16px;',
        '  font-size: 13px; font-weight: 600; line-height: 1.5;',
        '}'
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('scsoc-category-posts-style')) return;
        const st = document.createElement('style');
        st.id = 'scsoc-category-posts-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    function coreReady() {
        return !!(SCSOC.posts &&
            typeof SCSOC.posts.mountCompose === 'function' &&
            typeof SCSOC.posts.mountFeed === 'function');
    }

    function removeLoader() {
        if (loaderTimer) { clearTimeout(loaderTimer); loaderTimer = null; }
        if (feedLoader && feedLoader.parentNode) feedLoader.parentNode.removeChild(feedLoader);
        feedLoader = null;
    }

    function paintCoreError() {
        removeLoader();
        if (!composerHost || !feedHost) return;
        while (composerHost.firstChild) composerHost.removeChild(composerHost.firstChild);
        while (feedHost.firstChild) feedHost.removeChild(feedHost.firstChild);
        const box = document.createElement('div');
        box.className = 'scsoc-core-error';
        box.textContent = 'El Social no pudo arrancar su motor. Revisa que existan y se carguen EN ORDEN en el index: ' +
            'numbers.js, utils.js, likes.js, comments.js, responses.js, profiles_show.js y admin_post.js.';
        feedHost.appendChild(box);
    }

    /* ---- Construcción de la página (UNA sola vez) ---- */
    function buildPage() {
        if (pageEl) return;

        pageEl = document.createElement('div');
        pageEl.id = PAGE_ID;
        pageEl.setAttribute('aria-label', 'Social');
        pageEl.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:1500;display:none;flex-direction:column;' +
            'background:var(--bg-main,#0d0b14);font-family:Inter,sans-serif;';

        // ---- Cabecera: Volver | Social | EN VIVO ----
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:14px;padding:13px 20px;flex:none;' +
            'border-bottom:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);';

        const back = document.createElement('button');
        back.type = 'button';
        back.style.cssText = 'display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--border-color,#2e2440);' +
            'color:var(--text-main,#f8fafc);border-radius:10px;padding:8px 14px;font-family:Inter,sans-serif;' +
            'font-size:13px;font-weight:700;cursor:pointer;';
        back.addEventListener('mouseenter', function () { back.style.background = 'var(--bg-hover,#261f36)'; });
        back.addEventListener('mouseleave', function () { back.style.background = 'none'; });
        back.addEventListener('click', close);
        const backIcon = document.createElement('i');
        backIcon.className = 'fa-solid fa-arrow-left';
        const backText = document.createElement('span');
        backText.textContent = 'Volver';
        back.appendChild(backIcon);
        back.appendChild(backText);

        const title = document.createElement('div');
        title.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 auto;';
        const tIcon = document.createElement('i');
        tIcon.className = 'fa-solid fa-hashtag';
        tIcon.style.cssText = 'color:var(--purple-accent,#8b5cf6);font-size:17px;';
        const tText = document.createElement('strong');
        tText.textContent = 'Social';
        tText.style.cssText = 'font-size:16px;font-weight:800;color:var(--text-main,#f8fafc);letter-spacing:-.2px;';
        title.appendChild(tIcon);
        title.appendChild(tText);

        const live = document.createElement('div');
        live.title = 'Feed en tiempo real';
        live.style.cssText = 'display:flex;align-items:center;gap:7px;flex:none;';
        const liveDot = document.createElement('span');
        liveDot.className = 'scsoc-live-dot';
        const liveText = document.createElement('span');
        liveText.textContent = 'EN VIVO';
        liveText.style.cssText = 'font-size:11px;font-weight:800;letter-spacing:.8px;color:#22c55e;';
        live.appendChild(liveDot);
        live.appendChild(liveText);

        header.appendChild(back);
        header.appendChild(title);
        header.appendChild(live);

        // ---- Cuerpo: columna centrada con composer + feed ----
        const scroll = document.createElement('div');
        scroll.style.cssText = 'flex:1;overflow-y:auto;min-height:0;';

        const col = document.createElement('div');
        col.style.cssText = 'max-width:660px;margin:0 auto;padding:18px 16px 70px;display:flex;flex-direction:column;gap:14px;';

        composerHost = document.createElement('div');
        composerHost.className = 'scsoc-composer-host';

        feedLoader = document.createElement('div');
        feedLoader.className = 'scsoc-feed-loader';
        const spin = document.createElement('span');
        spin.className = 'scsoc-spin';
        const spinText = document.createElement('span');
        spinText.textContent = 'Cargando el feed...';
        feedLoader.appendChild(spin);
        feedLoader.appendChild(spinText);

        feedHost = document.createElement('div');
        feedHost.className = 'scsoc-feed-host';

        col.appendChild(composerHost);
        col.appendChild(feedLoader);
        col.appendChild(feedHost);
        scroll.appendChild(col);

        pageEl.appendChild(header);
        pageEl.appendChild(scroll);
        document.body.appendChild(pageEl);

        // El loader se va cuando el feed pinta su primer bloque
        const obs = new MutationObserver(function () {
            if (feedHost && feedHost.firstChild) { removeLoader(); obs.disconnect(); }
        });
        obs.observe(feedHost, { childList: true });
        // Red de seguridad: si el feed está vacío y no pinta nada,
        // el loader no puede quedarse girando para siempre.
        loaderTimer = setTimeout(removeLoader, 4000);
    }

    /* ---- Montaje del motor (UNA sola vez: los listeners quedan vivos) ---- */
    function mountCore() {
        if (mounted) return;
        if (!coreReady()) { paintCoreError(); return; }
        mounted = true;
        try { SCSOC.posts.mountCompose(composerHost); }
        catch (e) { console.error('[Stevscon] category_posts: fallo mountCompose ->', e); }
        try { SCSOC.posts.mountFeed(feedHost); }
        catch (e) { console.error('[Stevscon] category_posts: fallo mountFeed ->', e); }
    }

    /* ---- Abrir / cerrar (API pública SCSOC.pages) ---- */
    function open() {
        buildPage();
        if (!pageEl || isOpen) return;
        lastFocus = document.activeElement;
        pageEl.style.display = 'flex';
        isOpen = true;
        document.body.style.overflow = 'hidden';
        mountCore();
        document.dispatchEvent(new CustomEvent('sc:social-opened'));
    }

    function close() {
        if (!pageEl || !isOpen) return;
        pageEl.style.display = 'none';
        isOpen = false;
        document.body.style.overflow = '';
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
        document.dispatchEvent(new CustomEvent('sc:social-closed'));
    }

    function toggle() { if (isOpen) close(); else open(); }

    SCSOC.pages.open = open;
    SCSOC.pages.close = close;
    SCSOC.pages.toggle = toggle;
    SCSOC.pages.isOpen = function () { return isOpen; };

    // Escape cierra la página, PERO si hay un modal abierto por encima
    // (perfil, ajustes...), el Escape es de ese modal y no nuestro.
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !isOpen) return;
        if (document.querySelector('.modal-overlay:not(.hidden)')) return;
        close();
    });

    /* ---- Init ---- */
    function init() { injectStyles(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Stevscon] category_posts.js listo (v1) — página Social: SCSOC.pages.open().');
})(window, document);