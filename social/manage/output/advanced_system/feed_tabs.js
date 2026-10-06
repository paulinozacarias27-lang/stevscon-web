/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/feed_tabs.js (v1)
 * PESTAÑAS DE CATEGORÍA del feed Social.
 *  - Cada categoría (General · Anuncios · Actualizaciones — las que
 *    salen de SCSOC.categories()) es SU PROPIA página: el feed muestra
 *    SOLO los posts de la pestaña activa. El post nace con su categoría
 *    (admin_post.js) y cae solo en la suya. Sin tocar la BD ni reglas.
 *  - Barra sticky arriba del feed: se inserta sola vía el hook
 *    'feedMount' que lanza admin_post.js v10 (cero invadir files).
 *  - URL compartible: social.html#c/anuncios (slug sin acentos/mayús).
 *  - Contadores en vivo por pestaña (chips, solo cuando >0), gracias
 *    al evento 'sc:social-feed-cats' de admin_post.js v10.
 *  - Si en el feed existe una categoría fuera de la lista base, sale
 *    como pestaña EXTRA automática (nada se pierde de vista).
 *  - Deep links #post/ y #u/ se respetan: la pestaña NO pisa el hash.
 * REQUIERE: utils.js + admin_post.js v10. CARGAR DESPUÉS de post_media.js.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.feedTabs) return;
    if (!SCSOC.CONFIG) { console.warn('[Stevscon] feed_tabs: carga utils.js ANTES.'); return; }

    const BORDER = 'var(--border-color,#2e2440)';
    const PURPLE = 'var(--purple-accent,#8b5cf6)';

    const T = SCSOC.feedTabs = {};
    let _active = null;
    let _bar = null;
    let _counts = {};

    /* ---- slugs para la URL (#c/anuncios): sin acentos, minúsculas ---- */
    function slugOf(s) {
        return String(s || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-');
    }
    function allCats() {
        const base = SCSOC.categories().slice();
        const extra = (SCSOC.posts && SCSOC.posts.extraCats) ? SCSOC.posts.extraCats() : [];
        extra.forEach(function (c) { if (base.indexOf(c) === -1) base.push(c); });
        return base;
    }
    function catFromSlug(slug) {
        const all = allCats();
        for (let i = 0; i < all.length; i++) if (slugOf(all[i]) === slug) return all[i];
        return null;
    }
    const ICONS = { general: 'fa-comments', anuncios: 'fa-bullhorn', actualizaciones: 'fa-arrows-rotate' };

    /* ---- LA BARRA ---- */
    function buildBar(host) {
        if (_bar && _bar.parentNode) _bar.parentNode.removeChild(_bar);
        _bar = SCSOC.el('nav', 'position:sticky;top:10px;z-index:5;display:flex;align-items:stretch;gap:4px;background:var(--bg-card,#1a1625);border:1px solid ' + BORDER + ';border-radius:14px;padding:6px;margin-bottom:14px;font-family:Inter,sans-serif;overflow-x:auto;box-sizing:border-box;');
        _bar.setAttribute('role', 'tablist');
        _bar.setAttribute('aria-label', 'Categorías del Social');
        host.insertBefore(_bar, host.firstChild);
        paintBar();
    }

    function paintBar() {
        if (!_bar) return;
        while (_bar.firstChild) _bar.removeChild(_bar.firstChild);
        allCats().forEach(function (cat) {
            const on = _active === cat;
            const b = SCSOC.el('button', 'flex:1 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;border:0;border-radius:9px;padding:9px 14px;cursor:pointer;transition:background .2s ease,color .2s ease,box-shadow .2s ease;' +
                (on
                    ? 'background:' + PURPLE + ';color:#fff;box-shadow:0 4px 16px rgba(139,92,246,.35);'
                    : 'background:transparent;color:var(--text-muted,#94a3b8);'));
            b.type = 'button';
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', on ? 'true' : 'false');
            b.title = cat;
            const ic = SCSOC.el('i', 'font-size:12.5px;');
            ic.className = 'fa-solid ' + (ICONS[slugOf(cat)] || 'fa-hashtag');
            ic.setAttribute('aria-hidden', 'true');
            const lbl = SCSOC.el('span', 'font:700 12.5px Inter,sans-serif;');
            lbl.textContent = cat;
            b.appendChild(ic); b.appendChild(lbl);
            const n = _counts[cat] || 0;
            if (n > 0) {
                const chip = SCSOC.el('span', 'font:800 10px Inter,sans-serif;padding:2px 7px;border-radius:999px;' +
                    (on ? 'background:rgba(255,255,255,.22);color:#fff;' : 'background:var(--bg-hover,#261f36);color:var(--text-muted,#94a3b8);'));
                chip.textContent = SCSOC.nums.fmt(n);
                b.appendChild(chip);
            }
            b.addEventListener('click', function () { setTab(cat); });
            _bar.appendChild(b);
        });
    }

    /* ---- CAMBIO DE PESTAÑA ---- */
    function setTab(cat, opts) {
        opts = opts || {};
        if (_active === cat) { if (!opts.noHash) syncHash(); return; }
        _active = cat;
        paintBar();
        if (SCSOC.posts && SCSOC.posts.setFilter) SCSOC.posts.setFilter(cat);
        try {
            document.dispatchEvent(new CustomEvent('sc:social-tab', { detail: { category: cat, slug: slugOf(cat) } }));
        } catch (e) {}
        if (!opts.noHash) syncHash();
    }

    function syncHash() {
        if (!_active) return;
        try {
            const want = '#c/' + slugOf(_active);
            if ((location.hash || '') !== want) history.replaceState(null, '', want);
        } catch (e) {}
    }

    function readHash() {
        const h = (location.hash || '').replace(/^#\/?/, '');
        if (h.indexOf('c/') === 0) {
            try { return catFromSlug(decodeURIComponent(h.slice(2))); }
            catch (e) { return null; }
        }
        return null;
    }

    /* Primera vez: pestaña del hash (#c/...) o la primera categoría.
     * Con noHash para NO pisar deep links (#post/... / #u/...). */
    function restore() {
        const fromHash = readHash();
        setTab(fromHash || (SCSOC.categories()[0] || 'General'), { noHash: !fromHash });
    }

    /* ==== CONEXIONES ==== */
    SCSOC.onHook('feedMount', function (ctx) {
        if (!ctx || !ctx.host) return;
        buildBar(ctx.host);
        restore();
    });

    window.addEventListener('hashchange', function () {
        const c = readHash();
        if (c && c !== _active) setTab(c, { noHash: true });
    });

    /* Contadores en vivo (admin_post.js v10 dispara en cada add/chg/rm) */
    document.addEventListener('sc:social-feed-cats', function (e) {
        const d = (e && e.detail) || {};
        _counts = d.counts || {};
        paintBar();
    });

    T.active = function () { return _active; };

    console.log('[Stevscon] feed_tabs.js listo (v1) — pestañas de categoría con URL propia (#c/...).');
})(window, document);