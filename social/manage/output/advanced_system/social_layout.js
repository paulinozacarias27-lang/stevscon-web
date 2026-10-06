/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/social_layout.js (v1)
 * PARTE 2 DEL OVERHAUL — LAYOUT DE 2 COLUMNAS + BOTÓN FLOTANTE MÓVIL.
 *  - IZQUIERDA: el feed con sus pestañas (feed_tabs.js) y los posts.
 *  - DERECHA (LA ESQUINA): tarjeta «POSTEAR» que contiene ÚNICAMENTE
 *    el composer de admin_post.js. Nada de comentarios, posts ni
 *    respuestas ahí — solo el editor para publicar.
 *  - MÓVIL (<900px): la tarjeta se convierte en panel deslizante desde
 *    abajo y aparece un botón flotante (pluma) SOLO para el staff.
 *
 * CÓMO FUNCIONA (0 invasión): envuelve SCSOC.posts.mountCompose y
 * SCSOC.posts.mountFeed (definidos por admin_post.js v10). Cuando
 * category_posts.js los llame, se toman los hosts y se reacomodan en
 * un grid: los listeners y el render en vivo NO se pierden (mover un
 * nodo conserva todo). Si algo falla, el layout se cancela y la página
 * queda exactamente como siempre.
 *  - Visitantes / no-staff: NO ven la tarjeta ni el botón flotante.
 *  - ESCAPE HATCH: social.html?nolayout=1 deja todo como estaba.
 * REQUIERE: admin_post.js v10 cargado ANTES. Colocar este file DESPUÉS
 * de feed_tabs.js y ANTES de category_social.js / category_posts.js.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.layout) return;
    if (!SCSOC.posts || typeof SCSOC.posts.mountCompose !== 'function' || typeof SCSOC.posts.mountFeed !== 'function') {
        console.warn('[Stevscon] social_layout: necesita admin_post.js v10 cargado ANTES.');
        return;
    }
    if (/[?&]nolayout=1/.test(location.search)) {
        console.log('[Stevscon] social_layout: desactivado (?nolayout=1).');
        return;
    }

    const L = SCSOC.layout = {
        ready: false, failed: false,
        composerHost: null, feedHost: null,
        refs: null, fab: null,
        openComposer: function () { open(); },
        closeComposer: function () { close(); }
    };

    const MQ = window.matchMedia('(max-width: 899px)');

    /* ==== ESTILOS (con clases, para que el móvil pueda sobreescribir) ==== */
    const css = document.createElement('style');
    css.textContent = ''
        + '.scsoc-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start;}'
        + '.scsoc-grid.sc-nopost{grid-template-columns:minmax(0,1fr);}'
        + '.scsoc-main{min-width:0;}'
        + '.scsoc-side{position:sticky;top:12px;z-index:20;}'
        + '.scsoc-postcard{background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;overflow:hidden;font-family:Inter,sans-serif;box-sizing:border-box;}'
        + '.scsoc-posthead{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border-color,#2e2440);}'
        + '.scsoc-posticon{color:var(--purple-accent,#8b5cf6);font-size:14px;}'
        + '.scsoc-posttitle{font:800 12.5px Inter,sans-serif;letter-spacing:.14em;color:var(--text-main,#f8fafc);}'
        + '.scsoc-x{display:none;margin-left:auto;border:0;background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);width:30px;height:30px;border-radius:8px;align-items:center;justify-content:center;cursor:pointer;font-size:14px;}'
        + '.scsoc-slot{padding:14px 16px 16px;}'
        + '.scsoc-slot > *{margin-bottom:0 !important;}'
        + '.scsoc-fab{display:none;position:fixed;right:18px;bottom:18px;z-index:940;width:58px;height:58px;border:0;border-radius:999px;background:var(--purple-accent,#8b5cf6);color:#fff;font-size:19px;cursor:pointer;box-shadow:0 10px 26px rgba(139,92,246,.45);align-items:center;justify-content:center;transition:transform .15s ease;}'
        + '.scsoc-fab:active{transform:scale(.92);}'
        + '.scsoc-fab.sc-on{display:flex;}'
        + '.scsoc-backdrop{display:none;position:fixed;inset:0;background:rgba(5,3,12,.55);z-index:890;}'
        + 'body.scsoc-compose-open .scsoc-backdrop{display:block;}'
        + 'body.scsoc-lock{overflow:hidden;}'
        + '@media (max-width:899px){'
        + '.scsoc-grid{grid-template-columns:minmax(0,1fr);}'
        + '.scsoc-side{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:900;max-height:82vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,0);transform:translateY(105%);transition:transform .28s cubic-bezier(.2,.8,.2,1);}'
        + 'body.scsoc-compose-open .scsoc-side{transform:translateY(0);}'
        + '.scsoc-postcard{border-radius:16px 16px 0 0;}'
        + '.scsoc-x{display:flex;}'
        + '}';
    document.head.appendChild(css);

    /* ==== CONSTRUCCIÓN DEL LAYOUT (idempotente, con guardias de seguridad) ==== */
    function tryBuild() {
        if (L.ready || L.failed) return;
        const c = L.composerHost, f = L.feedHost;
        if (!c || !f) return; /* falta uno de los dos; se reintenta en el siguiente mount */

        /* seguridad: hosts iguales o anidados -> no tocar nada */
        if (c === f || c.contains(f) || f.contains(c)) {
            L.failed = true;
            console.warn('[Stevscon] social_layout: hosts anidados; layout cancelado (todo queda como estaba).');
            return;
        }
        const anchor = c.parentNode ? c : f;
        if (!anchor.parentNode) return; /* aún fuera del DOM; se reintenta */

        const grid = SCSOC.el('div');
        grid.className = 'scsoc-grid';
        const left = SCSOC.el('div');
        left.className = 'scsoc-main';
        const side = SCSOC.el('div');
        side.className = 'scsoc-side';

        /* la tarjeta «POSTEAR» — SOLO el composer vive aquí */
        const card = SCSOC.el('div');
        card.className = 'scsoc-postcard';
        const head = SCSOC.el('div');
        head.className = 'scsoc-posthead';
        const ic = SCSOC.el('i');
        ic.className = 'fa-solid fa-feather-pointed scsoc-posticon';
        ic.setAttribute('aria-hidden', 'true');
        const t = SCSOC.el('span');
        t.className = 'scsoc-posttitle';
        t.textContent = 'POSTEAR';
        const x = SCSOC.el('button');
        x.type = 'button';
        x.className = 'scsoc-x';
        x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', close);
        head.appendChild(ic); head.appendChild(t); head.appendChild(x);

        const slot = SCSOC.el('div');
        slot.className = 'scsoc-slot';
        card.appendChild(head);
        card.appendChild(slot);
        side.appendChild(card);
        grid.appendChild(left);
        grid.appendChild(side);

        /* mudanza: el composer a la esquina, el feed a la izquierda */
        const parent = anchor.parentNode;
        slot.appendChild(c);
        if (!c.firstChild) {
            const ph = SCSOC.el('p', 'color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;text-align:center;padding:18px 0;');
            ph.textContent = 'Cargando editor…';
            c.appendChild(ph); /* admin_post.js lo borra solo al montar el box real */
        }
        parent.insertBefore(grid, anchor);
        if (f.parentNode !== left) left.appendChild(f);

        L.ready = true;
        L.refs = { grid: grid, left: left, side: side, slot: slot, card: card };
        setupMobile();
        refreshStaff();
        console.log('[Stevscon] social_layout: 2 columnas listas — feed a la izquierda, POSTEAR en la esquina.');
    }

    /* re-mounts de category_posts.js: nuevos hosts se re-colocan solos */
    function ensureComposer() {
        if (!L.ready) return;
        const r = L.refs, c = L.composerHost;
        if (!c || c.parentNode === r.slot) return;
        const old = r.slot.firstChild;
        if (old && old.__scsocComposeOff) { try { old.__scsocComposeOff(); } catch (e) {} }
        while (r.slot.firstChild) r.slot.removeChild(r.slot.firstChild);
        r.slot.appendChild(c);
    }
    function ensureFeed() {
        if (!L.ready) return;
        const r = L.refs, f = L.feedHost;
        if (!f || f.parentNode === r.left) return;
        const old = r.left.firstChild;
        if (old && old.__scsocFeedOff) { try { old.__scsocFeedOff(); } catch (e) {} }
        while (r.left.firstChild) r.left.removeChild(r.left.firstChild);
        r.left.appendChild(f);
    }

    /* ==== MÓVIL: FAB + panel deslizante ==== */
    function setupMobile() {
        if (L.fab) return;
        const fab = SCSOC.el('button');
        fab.type = 'button';
        fab.className = 'scsoc-fab';
        fab.setAttribute('aria-label', 'Postear');
        fab.title = 'Postear';
        fab.innerHTML = '<i class="fa-solid fa-feather" aria-hidden="true"></i>';
        fab.addEventListener('click', toggle);
        document.body.appendChild(fab);
        L.fab = fab;

        const back = SCSOC.el('div');
        back.className = 'scsoc-backdrop';
        back.addEventListener('click', close);
        document.body.appendChild(back);

        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        const onMq = function () { if (!MQ.matches) close(); };
        if (MQ.addEventListener) MQ.addEventListener('change', onMq);
        else if (MQ.addListener) MQ.addListener(onMq);
    }

    function open() { document.body.classList.add('scsoc-compose-open', 'scsoc-lock'); }
    function close() { document.body.classList.remove('scsoc-compose-open', 'scsoc-lock'); }
    function toggle() {
        if (document.body.classList.contains('scsoc-compose-open')) close();
        else open();
    }

    /* ==== VISIBILIDAD SEGÚN STAFF (visitantes no ven NADA de esto) ==== */
    function refreshStaff() {
        SCSOC.posts.canPost(function (can) {
            const r = L.refs;
            if (r) {
                r.side.style.display = can ? '' : 'none';
                r.grid.classList.toggle('sc-nopost', !can);
            }
            if (L.fab) L.fab.classList.toggle('sc-on', !!can);
        });
    }
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function () { refreshStaff(); });
    }

    /* ==== ENVOLTURIOS (interceptamos la API de admin_post v10) ==== */
    const _mountCompose = SCSOC.posts.mountCompose;
    SCSOC.posts.mountCompose = function (host) {
        L.composerHost = host || null;
        try { tryBuild(); ensureComposer(); }
        catch (e) { L.failed = true; console.error('[Stevscon] social_layout:', e); }
        return _mountCompose.apply(this, arguments);
    };
    const _mountFeed = SCSOC.posts.mountFeed;
    SCSOC.posts.mountFeed = function (host) {
        L.feedHost = host || null;
        try { tryBuild(); ensureFeed(); }
        catch (e) { L.failed = true; console.error('[Stevscon] social_layout:', e); }
        return _mountFeed.apply(this, arguments);
    };

    console.log('[Stevscon] social_layout.js listo (v1) — feed a la izquierda, POSTEAR en la esquina, FAB en móvil.');
})(window, document);