/**
 * ====
 * STEVSCON.COM — wiki/manage/category_wiki.js (v1)
 * Coordinador visual de ENTRADA a la categoria WIKI.
 * - Segunda pestaña hermana de Social (se apila justo debajo).
 * - Hover: se despliega hacia la derecha (->) revelando "Wiki".
 * - Click: squish + pantalla de carga épica (logo SC en anillo,
 *   partículas moradas/doradas, mensajes "¿Sabías que...?" con
 *   easter egg raro) mientras precarga /wiki/wiki.html.
 * - Se auto-detecta: si ya estás dentro de /wiki/, no aparece.
 * Cargar DESPUÉS de category_social.js en el index.
 * ====
 */
(function (window, document) {
    'use strict';

    /* Dentro de la wiki la puerta no existe */
    if (location.pathname.toLowerCase().indexOf('/wiki/') !== -1) {
        console.log('[Stevscon] category_wiki.js: dentro de la Wiki, pestaña oculta.');
        return;
    }

    const TAB_ID = 'sc-wiki-tab';
    const WIKI_URL = '/wiki/wiki.html';
    const LOGO = '/SC-LOGO-20260825013121.png';
    const LOGO_FALLBACK = 'SC-LOGO-20260825013121.png';

    /* ---- Mensajes de carga (el último es un easter egg raro) ---- */
    const FACTS = [
        '¿Sabías que…? La wiki guarda el historial de cada edición, como las wikis de verdad.',
        '¿Sabías que…? Tus proyectos terminados pueden brillar en la portada.',
        '¿Sabías que…? Los devlogs viven aquí como artículos con fecha y autor.',
        '¿Sabías que…? Las categorías se crean al vuelo desde el panel de staff.',
        '¿Sabías que…? Cada artículo puede esconder easter eggs.',
        '¿Sabías que…? El buscador de la wiki encuentra todo al instante.',
        '¿Sabías que…? Stevscon.wiki crece con cada avance que publicas.'
    ];
    const SECRET = '🥚 Mensaje secreto: la wiki siempre estuvo observando… y ya te vio llegar.';

    /* ---- Estilos propios (prefijo scw- para no pisar NADA) ---- */
    const CSS = [
        '#' + TAB_ID + ' {',
        '  position: fixed; left: 0; top: calc(50% + 74px); z-index: 1200;',
        '  transform: translateY(-50%);',
        '  display: flex; align-items: center;',
        '  height: 58px; width: 58px; padding: 0 18px; box-sizing: border-box;',
        '  border: 0; border-radius: 0 999px 999px 0;',
        '  background: linear-gradient(135deg, var(--purple-accent, #8b5cf6), var(--purple-dark, #6d28d9));',
        '  color: #fff; cursor: pointer; overflow: hidden;',
        '  font-family: Inter, sans-serif;',
        '  box-shadow: 0 6px 22px var(--purple-glow, rgba(139, 92, 246, .35));',
        '  transition: width .38s cubic-bezier(.22, 1, .36, 1), transform .38s cubic-bezier(.22, 1, .36, 1),',
        '              opacity .25s ease, box-shadow .25s ease;',
        '  animation: scw-pulse 3.2s ease-in-out infinite; animation-delay: .4s;',
        '}',
        '#' + TAB_ID + ':hover {',
        '  width: 178px; transform: translateY(-50%) translateX(5px); animation: none;',
        '  box-shadow: 0 10px 34px rgba(245, 158, 11, .45);',
        '}',
        '#' + TAB_ID + '.is-squish { transform: translateY(-50%) scale(1.18, .78); animation: none; transition: transform .16s ease; }',
        '#' + TAB_ID + ' .scw-tab-icon { font-size: 20px; flex: none; }',
        '#' + TAB_ID + ' .scw-tab-label {',
        '  margin-left: 12px; font-size: 14px; font-weight: 800; letter-spacing: .6px;',
        '  white-space: nowrap; opacity: 0; transform: translateX(-10px);',
        '  transition: opacity .25s ease .1s, transform .32s cubic-bezier(.22, 1, .36, 1) .1s;',
        '}',
        '#' + TAB_ID + ':hover .scw-tab-label { opacity: 1; transform: translateX(0); }',
        '@keyframes scw-pulse {',
        '  0%, 100% { box-shadow: 0 6px 22px var(--purple-glow, rgba(139, 92, 246, .35)); }',
        '  50%      { box-shadow: 0 6px 30px rgba(245, 158, 11, .40); }',
        '}',

        /* ---- Pantalla de carga épica ---- */
        '#sc-wiki-loader { position: fixed; inset: 0; z-index: 2147000; background: #0d0b14;',
        '  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;',
        '  font-family: Inter, sans-serif; color: #f8fafc; overflow: hidden; }',
        '#sc-wiki-loader .scw-ring { position: relative; width: 116px; height: 116px; }',
        '#sc-wiki-loader .scw-ring::before { content: ""; position: absolute; inset: 0; border-radius: 50%;',
        '  border: 3px solid rgba(139, 92, 246, .18); border-top-color: #8b5cf6; border-right-color: #f59e0b;',
        '  animation: scw-spin .9s linear infinite; }',
        '#sc-wiki-loader .scw-ring img { position: absolute; inset: 16px; width: 84px; height: 84px;',
        '  border-radius: 22px; object-fit: cover; box-shadow: 0 8px 30px rgba(139, 92, 246, .5); }',
        '#sc-wiki-loader .scw-title { font-size: 25px; font-weight: 800; letter-spacing: -.02em; }',
        '#sc-wiki-loader .scw-title span { color: #8b5cf6; }',
        '#sc-wiki-loader .scw-fact { min-height: 22px; color: #94a3b8; font-size: 13px; font-weight: 600;',
        '  max-width: 520px; text-align: center; padding: 0 20px; transition: opacity .3s ease; }',
        '#sc-wiki-loader .scw-fact.is-secret { color: #f59e0b; }',
        '#sc-wiki-loader .scw-dots { display: flex; gap: 8px; }',
        '#sc-wiki-loader .scw-dots i { width: 9px; height: 9px; border-radius: 50%; background: #8b5cf6;',
        '  animation: scw-bounce 1s ease-in-out infinite; }',
        '#sc-wiki-loader .scw-dots i:nth-child(2) { animation-delay: .15s; background: #a78bfa; }',
        '#sc-wiki-loader .scw-dots i:nth-child(3) { animation-delay: .3s; background: #f59e0b; }',
        '#sc-wiki-loader .scw-part { position: absolute; bottom: -14px; width: 8px; height: 8px;',
        '  border-radius: 50%; opacity: .8; animation: scw-rise linear infinite; pointer-events: none; }',
        '@keyframes scw-spin { to { transform: rotate(360deg); } }',
        '@keyframes scw-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }',
        '@keyframes scw-rise {',
        '  0%   { transform: translateY(0) scale(1); opacity: .85; }',
        '  100% { transform: translateY(-110vh) scale(.2); opacity: 0; }',
        '}'
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('sc-wiki-style')) return;
        const st = document.createElement('style');
        st.id = 'sc-wiki-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ---- Precarga real de la wiki (calienta caché al primer hover) ---- */
    let warmed = false;
    function warm() {
        if (warmed) return; warmed = true;
        try {
            if (window.fetch) fetch(WIKI_URL, { cache: 'default' }).catch(function () {});
        } catch (e) {}
        const im = new Image();
        im.src = LOGO;
    }

    /* ---- Pantalla de carga ---- */
    function openLoader() {
        if (document.getElementById('sc-wiki-loader')) return;

        const ld = document.createElement('div');
        ld.id = 'sc-wiki-loader';

        const ring = document.createElement('div');
        ring.className = 'scw-ring';
        const img = document.createElement('img');
        img.alt = 'Wiki';
        img.src = LOGO;
        img.addEventListener('error', function () { img.src = LOGO_FALLBACK; });
        ring.appendChild(img);
        ld.appendChild(ring);

        const title = document.createElement('div');
        title.className = 'scw-title';
        title.textContent = 'Abriendo Stevscon';
        const dot = document.createElement('span');
        dot.textContent = '.wiki';
        title.appendChild(dot);
        ld.appendChild(title);

        const fact = document.createElement('div');
        fact.className = 'scw-fact';
        const secret = Math.random() < 0.03;
        fact.textContent = secret ? SECRET : FACTS[Math.floor(Math.random() * FACTS.length)];
        if (secret) fact.classList.add('is-secret');
        ld.appendChild(fact);

        const dots = document.createElement('div');
        dots.className = 'scw-dots';
        for (let i = 0; i < 3; i++) dots.appendChild(document.createElement('i'));
        ld.appendChild(dots);

        /* Partículas moradas/doradas */
        for (let i = 0; i < 26; i++) {
            const p = document.createElement('span');
            p.className = 'scw-part';
            p.style.left = (Math.random() * 100) + '%';
            p.style.background = Math.random() < 0.6 ? '#8b5cf6' : '#f59e0b';
            p.style.animationDuration = (3.2 + Math.random() * 3.4) + 's';
            p.style.animationDelay = '-' + (Math.random() * 4) + 's';
            const s = 4 + Math.random() * 7;
            p.style.width = s + 'px'; p.style.height = s + 'px';
            ld.appendChild(p);
        }
        document.body.appendChild(ld);

        /* Mensajes rotando mientras carga */
        let f = 0;
        const rot = setInterval(function () {
            const el = document.querySelector('#sc-wiki-loader .scw-fact');
            if (!el) { clearInterval(rot); return; }
            el.style.opacity = '0';
            setTimeout(function () {
                if (!el.parentNode) return;
                f = (f + 1) % FACTS.length;
                el.classList.remove('is-secret');
                el.textContent = FACTS[f];
                el.style.opacity = '1';
            }, 300);
        }, 1900);

        /* Navegar: mínimo 1.5s para saborear la entrada, tope 3.5s */
        const t0 = Date.now();
        const go = function () {
            const wait = Math.max(0, 1500 - (Date.now() - t0));
            setTimeout(function () { location.href = WIKI_URL; }, wait);
        };
        let done = false;
        const once = function () { if (!done) { done = true; go(); } };
        try {
            if (window.fetch) fetch(WIKI_URL, { cache: 'default' }).then(once).catch(once);
            else setTimeout(once, 400);
        } catch (e) { setTimeout(once, 400); }
        setTimeout(once, 3500);
    }

    /* ---- La pestaña ---- */
    function buildTab() {
        if (document.getElementById(TAB_ID)) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.id = TAB_ID;
        b.title = 'Wiki';
        b.setAttribute('aria-label', 'Abrir Wiki');

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-book-open scw-tab-icon';

        const label = document.createElement('span');
        label.className = 'scw-tab-label';
        label.textContent = 'Wiki';

        b.appendChild(icon);
        b.appendChild(label);
        b.addEventListener('mouseenter', warm);
        b.addEventListener('click', function () {
            b.classList.add('is-squish');
            setTimeout(openLoader, 180);
        });
        document.body.appendChild(b);
    }

    /* ---- Init ---- */
    function init() {
        injectStyles();
        buildTab();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Stevscon] category_wiki.js listo (v1) — pestaña Wiki debajo de Social.');
})(window, document);