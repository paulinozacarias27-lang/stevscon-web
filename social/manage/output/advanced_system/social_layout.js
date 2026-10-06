/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/social_layout.js (v2)
 * PARTE 2 DEL OVERHAUL — LAYOUT DE 2 COLUMNAS + BOTÓN FLOTANTE MÓVIL.
 *
 * v2 — FIX DEL COMPOSER DESAPARECIDO:
 *  v1 movía el host del composer al grid y LUEGO insertaba el grid usando
 *  ese host (ya mudado) como ancla -> NotFoundError -> el grid quedaba
 *  fuera del documento y el botón de postear desaparecía. v2 ancla el
 *  grid al host del FEED (que aún no se movió) y es AUTOSUFICIENTE:
 *   · Si category_posts.js nunca llama a mountCompose, el layout crea su
 *     PROPIO host y monta el composer él mismo.
 *   · Si el host oficial llega después, se adopta y el de respaldo se
 *     desmonta limpio (cero duplicados).
 *   · La tarjeta «POSTEAR» y el FAB aparecen SOLO cuando el composer
 *     renderizó de verdad (MutationObserver) — visitantes no ven nada.
 *   · FIX: el FAB ya no puede salir en PC (solo <900px).
 *   · El grid se centra al ancho de la ventana para que quepan las 2
 *     columnas aunque el contenedor sea angosto; si detecta riesgo de
 *     recorte, cae a 1 columna con la tarjeta encima del feed.
 *  ESCAPE HATCH: social.html?nolayout=1 deja todo como estaba.
 * REQUIERE: admin_post.js v10 cargado ANTES. Colocar DESPUÉS de
 * feed_tabs.js y ANTES de category_social.js / category_posts.js.
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
        composerHost: null, feedHost: null, ownComposer: null,
        refs: null, fab: null,
        openComposer: function () { open(); },
        closeComposer: function () { close(); },
        refresh: function () { updateVis(); }
    };

    const MQ = window.matchMedia('(max-width: 899px)');

    /* ==== ESTILOS v2 ==== */
    const css = document.createElement('style');
    css.textContent = ''
        + '.scsoc-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start;'
        +   'width:calc(100vw - 40px);margin-left:calc(50% - 50vw + 20px);}'
        + '.scsoc-grid.sc-contained{width:100%;margin-left:0;grid-template-columns:minmax(0,1fr);}'
        + '.scsoc-grid.sc-contained .scsoc-side{position:static;order:-1;}'
        + '.scsoc-main{min-width:0;}'
        + '.scsoc-side{position:sticky;top:64px;z-index:20;display:none;}'
        + '.scsoc-side.sc-on{display:block;}'
        + '.scsoc-postcard{background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;overflow:hidden;font-family:Inter,sans-serif;box-sizing:border-box;}'
        + '.scsoc-posthead{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border-color,#2e2440);}'
        + '.scsoc-posticon{color:var(--purple-accent,#8b5cf6);font-size:14px;}'
        + '.scsoc-posttitle{font:800 12.5px Inter,sans-serif;letter-spacing:.14em;color:var(--text-main,#f8fafc);}'
        + '.scsoc-x{display:none;margin-left:auto;border:0;background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);width:30px;height:30px;border-radius:8px;align-items:center;justify-content:center;cursor:pointer;font-size:14px;}'
        + '.scsoc-slot{padding:14px 16px 16px;}'
        + '.scsoc-slot > *{margin-bottom:0 !important;}'
        + '.scsoc-fab{display:none;position:fixed;right:18px;bottom:18px;z-index:940;width:58px;height:58px;border:0;border-radius:999px;'
        +   'background:var(--purple-accent,#8b5cf6);color:#fff;font-size:19px;cursor:pointer;box-shadow:0 10px 26px rgba(139,92,246,.45);align-items:center;justify-content:center;transition:transform .15s ease;}'
        + '.scsoc-fab:active{transform:scale(.92);}'
        + '.scsoc-backdrop{display:none;position:fixed;inset:0;background:rgba(5,3,12,.55);z-index:890;}'
        + 'body.scsoc-compose-open .scsoc-backdrop{display:block;}'
        + 'body.scsoc-lock{overflow:hidden;}'
        + '@media (max-width:899px){'
        +   '.scsoc-grid,.scsoc-grid.sc-contained{grid-template-columns:minmax(0,1fr) !important;width:100% !important;margin-left:0 !important;}'
        +   '.scsoc-grid .scsoc-side{position:fixed !important;order:0 !important;left:0 !important;right:0 !important;top:auto !important;bottom:0 !important;'
        +     'z-index:900;max-height:82vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,0);transform:translateY(105%);transition:transform .28s cubic-bezier(.2,.8,.2,1);}'
        +   'body.scsoc-compose-open .scsoc-grid .scsoc-side{transform:translateY(0) !important;}'
        +   '.scsoc-postcard{border-radius:16px 16px 0 0;}'
        +   '.scsoc-x{display:flex;}'
        +   '.scsoc-fab.sc-on{display:flex;}'
        + '}';
    document.head.appendChild(css);

    /* ==== SEGURIDAD: ¿algún abuelo recortaría el grid ancho? ==== */
    function hasClipper(el) {
        let p = el.parentElement;
        while (p && p !== document.body) {
            const ov = (window.getComputedStyle(p).overflowX || 'visible');
            if (ov !== 'visible') return true;
            p = p.parentElement;
        }
        return false;
    }

    /* ==== CONSTRUCCIÓN (a prueba de crash: el grid se ancla al FEED) ==== */
    function tryBuild() {
        if (L.ready || L.failed) return;
        const f = L.feedHost;
        if (!f || !f.parentNode) return; /* el feed aún no está en el DOM; se reintenta */

        /* host del composer: el oficial (category_posts.js) o uno de respaldo */
        let c = L.composerHost;
        if (c && (c === f || c.contains(f))) c = L.composerHost = null; /* inválido -> respaldo */
        if (!c) {
            c = SCSOC.el('div');
            const ph = SCSOC.el('p', 'color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;text-align:center;padding:18px 0;');
            ph.className = 'scsoc-ph';
            ph.textContent = 'Cargando editor…';
            c.appendChild(ph);
            L.ownComposer = c;
            L.composerHost = c;
        }

        const grid = SCSOC.el('div'); grid.className = 'scsoc-grid';
        const left = SCSOC.el('div'); left.className = 'scsoc-main';
        const side = SCSOC.el('aside'); side.className = 'scsoc-side';
        const card = SCSOC.el('div'); card.className = 'scsoc-postcard';
        const head = SCSOC.el('div'); head.className = 'scsoc-posthead';
        const ic = SCSOC.el('i'); ic.className = 'fa-solid fa-feather-pointed scsoc-posticon';
        ic.setAttribute('aria-hidden', 'true');
        const t = SCSOC.el('span'); t.className = 'scsoc-posttitle'; t.textContent = 'POSTEAR';
        const x = SCSOC.el('button'); x.type = 'button'; x.className = 'scsoc-x';
        x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', close);
        head.appendChild(ic); head.appendChild(t); head.appendChild(x);
        const slot = SCSOC.el('div'); slot.className = 'scsoc-slot';
        card.appendChild(head); card.appendChild(slot);
        side.appendChild(card);
        grid.appendChild(left); grid.appendChild(side);

        slot.appendChild(c);                    /* 1: composer a la tarjeta (si vivía dentro del feed, se rescata) */
        f.parentNode.insertBefore(grid, f);     /* 2: el grid ocupa el lugar del feed — f TODAVÍA es hijo de su padre */
        left.appendChild(f);                    /* 3: el feed baja a la columna izquierda */

        L.ready = true;
        L.refs = { grid: grid, left: left, side: side, slot: slot, card: card };

        /* breakout seguro: si el ancho completo no cabe, modo contenido */
        requestAnimationFrame(function () {
            if (!L.refs || !document.contains(grid)) return;
            const r = grid.getBoundingClientRect();
            if (r.left < 2 || r.right > window.innerWidth - 2 || hasClipper(grid)) {
                grid.classList.add('sc-contained');
            }
        });

        setupMobile();
        watchSlot();
        updateVis();

        /* respaldo: si el composer es nuestro, lo montamos nosotros */
        if (L.ownComposer) {
            try { _mountCompose.call(SCSOC.posts, c); }
            catch (e) { console.error('[Stevscon] social_layout: respaldo del composer ->', e); }
        }

        console.log('[Stevscon] social_layout v2: columnas listas — feed a la izquierda, POSTEAR en la esquina.');
    }

    /* re-mounts: nuevos hosts se re-colocan solos, sin duplicados */
    function ensureComposer() {
        if (!L.ready) return;
        const r = L.refs, c = L.composerHost;
        if (!c || c.parentNode === r.slot) return;
        const old = r.slot.firstElementChild;
        if (old && old !== c && old.__scsocComposeOff) { try { old.__scsocComposeOff(); } catch (e) {} }
        while (r.slot.firstChild) r.slot.removeChild(r.slot.firstChild);
        r.slot.appendChild(c);
        updateVis();
    }
    function ensureFeed() {
        if (!L.ready) return;
        const r = L.refs, f = L.feedHost;
        if (!f) return;
        if (!document.contains(r.grid)) {
            if (!f.parentNode) return;
            f.parentNode.insertBefore(r.grid, f); /* la página se reconstruyó: re-ancla */
        }
        if (f.parentNode !== r.left) {
            const kids = r.left.children;
            for (let i = 0; i < kids.length; i++) {
                if (kids[i] !== f && kids[i].__scsocFeedOff) { try { kids[i].__scsocFeedOff(); } catch (e) {} }
            }
            while (r.left.firstChild) r.left.removeChild(r.left.firstChild);
            r.left.appendChild(f);
        }
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

    /* ==== VISIBILIDAD por contenido REAL (nada de adivinar el staff) ==== */
    function hasBox() {
        const c = L.composerHost;
        if (!c) return false;
        const kids = c.children;
        for (let i = 0; i < kids.length; i++) {
            if (String(kids[i].className || '').indexOf('scsoc-ph') === -1) return true;
        }
        return false;
    }
    function updateVis() {
        const r = L.refs;
        const on = !!r && hasBox();
        if (r) r.side.classList.toggle('sc-on', on);
        if (L.fab) L.fab.classList.toggle('sc-on', on);
        if (!on) close();
    }
    function watchSlot() {
        if (!window.MutationObserver || !L.refs) return;
        new MutationObserver(function () { updateVis(); })
            .observe(L.refs.slot, { childList: true, subtree: true });
    }

    /* ==== ENVOLTURIOS (interceptamos la API de admin_post v10) ==== */
    const _mountCompose = SCSOC.posts.mountCompose;
    const _mountFeed = SCSOC.posts.mountFeed;

    SCSOC.posts.mountCompose = function (host) {
        L.composerHost = host || null;
        try { tryBuild(); ensureComposer(); }
        catch (e) { L.failed = true; console.error('[Stevscon] social_layout:', e); }
        return _mountCompose.apply(this, arguments);
    };
    SCSOC.posts.mountFeed = function (host) {
        L.feedHost = host || null;
        try { tryBuild(); ensureFeed(); }
        catch (e) { L.failed = true; console.error('[Stevscon] social_layout:', e); }
        return _mountFeed.apply(this, arguments);
    };

    console.log('[Stevscon] social_layout.js listo (v2) — feed a la izquierda, POSTEAR en la esquina, FAB en móvil.');
})(window, document);