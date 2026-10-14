/**
 * ====
 * STEVSCON.COM — profiles/manage/badges/badges_core.js (v7)
 * BADGES · LA CARA: catálogo + render + auto-mount en perfiles. SOLO LECTURA.
 *  ARQUITECTURA (v4): cada file tiene UN solo trabajo:
 *    · badges_core.js   → LA CARA   (catálogo, iconos, tooltips, mount)  ← este file
 *    · badges_system.js → EL CEREBRO (grant/revoke/validaciones/log)
 *    · badges_manage.js → EL PANEL  (UI de staff, llama al system)
 *  v7 — FIX tooltip cortado: el tooltip ya NO vive dentro de la tarjeta
 *    (el overflow:hidden de la card lo decapitaba y sus capas lo tapaban).
 *    Ahora es UN solo elemento "portal" en <body> con position:fixed y
 *    z-index máximo: se centra sobre el icono, se recorta a los bordes de
 *    la pantalla, hace flip hacia abajo si no cabe arriba y la flecha
 *    apunta siempre al badge (CSS var --ax). Funciona igual en "Mi
 *    Perfil", en el modal del Social y en el panel de manage. Además se
 *    oculta al hacer scroll/repaint para no quedar flotando huérfano.
 *  v6 — 4 badges nuevos: ADMIN (llave roja, order 1 tras la corona),
 *    CAMPEÓN (trofeo dorado), TRYHARD (gamepad naranja con rayo) y
 *    PREMIUM (diamante hielo). Catálogo de 9 badges.
 *  v5 — 4 badges: DEV (brackets morados), OG (estrella bronce),
 *    CAZABUGS (lupa verde) y CREADOR (cámara violeta).
 *  v4 — reset de arquitectura. Expone SB.repaint(uid) para que el system
 *    repinte perfiles al instante tras otorgar/quitar. Sin cambios visuales.
 *  v3 — FIX corona sin color (IDs de gradiente únicos por instancia).
 *  v2 — icono puro estilo Discord + tooltip (nombre + desc + fecha).
 *  - El catálogo vive AQUÍ: nuevo badge = agregar UNA entrada con su `svg`
 *    estática (placeholders {S}=tamaño y {G}=gradiente único por instancia).
 *    Opcional: `manageBy: ['owner','admin']` para limitar quién lo maneja.
 *  - Datos en Firebase: social/badges/{uid}/{badgeId} = { by, at }
 *    (todos leen; solo Owner/Admin escriben — vía badges_system.js).
 *  - Se engancha SOLO: envuelve renderProfileCard (Perfiles + modal Social)
 *    y pinta los iconos DEBAJO del @handler. Cero ediciones ajenas.
 *  - textContent SIEMPRE para datos; innerHTML solo con SVG estático del
 *    catálogo (nunca datos de usuario). Cero XSS.
 * ====
 */
(function (window, document) {
    'use strict';

    const SB = window.StevsconBadges = window.StevsconBadges || {};
    if (SB._coreLoaded) return;
    SB._coreLoaded = true;

    const NODE = 'social/badges'; /* social/badges/{uid}/{badgeId} = { by, at } */

    /* ==== CORONA OWNER (SVG estático — SIEMPRE corona, fondo transparente) ==== */
    /* {S} = tamaño px · {G} = ID de gradiente ÚNICO por instancia (fix v3) */
    const CROWN_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#fef3c7"/><stop offset=".55" stop-color="#fbbf24"/><stop offset="1" stop-color="#d97706"/>' +
        '</linearGradient></defs>' +
        '<path d="M2.8 8.4 7.6 12.1 12 5.4 16.4 12.1 21.2 8.4 19.4 17.7a1.7 1.7 0 0 1-1.67 1.4H6.27a1.7 1.7 0 0 1-1.67-1.4Z" fill="url(#{G})" stroke="#92400e" stroke-width=".9" stroke-linejoin="round"/>' +
        '<circle cx="2.9" cy="7.6" r="1.45" fill="#fde68a" stroke="#92400e" stroke-width=".7"/>' +
        '<circle cx="12" cy="4.6" r="1.55" fill="#fde68a" stroke="#92400e" stroke-width=".7"/>' +
        '<circle cx="21.1" cy="7.6" r="1.45" fill="#fde68a" stroke="#92400e" stroke-width=".7"/>' +
        '<rect x="5.7" y="19.4" width="12.6" height="1.9" rx=".95" fill="url(#{G})" stroke="#92400e" stroke-width=".7"/>' +
        '<circle cx="12" cy="14.3" r="1.7" fill="#a78bfa" stroke="#6d28d9" stroke-width=".8"/></svg>';

    /* ==== ADMIN (v6) — llave roja estilo empleados de Discord: autoridad pura ==== */
    const ADMIN_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#fecaca"/><stop offset=".55" stop-color="#f87171"/><stop offset="1" stop-color="#dc2626"/>' +
        '</linearGradient></defs>' +
        '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="url(#{G})" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="19.6" cy="17.6" r="1.1" fill="#fee2e2" stroke="#b91c1c" stroke-width=".5"/></svg>';

    /* ==== DEV (v5) — brackets </> morados, estilo Active Developer de Discord ==== */
    const DEV_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#ede9fe"/><stop offset=".55" stop-color="#a78bfa"/><stop offset="1" stop-color="#7c3aed"/>' +
        '</linearGradient></defs>' +
        '<path d="M8.6 6.7 3.8 12l4.8 5.3" fill="none" stroke="url(#{G})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M15.4 6.7 20.2 12l-4.8 5.3" fill="none" stroke="url(#{G})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M13.4 4.6 10.6 19.4" fill="none" stroke="url(#{G})" stroke-width="2.3" stroke-linecap="round"/>' +
        '<circle cx="20.9" cy="4.9" r="1.25" fill="#c4b5fd" stroke="#5b21b6" stroke-width=".6"/></svg>';

    /* ==== OG (v5) — estrella bronce vintage con cintas, "estuvo desde el principio" ==== */
    const OG_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#fdeaca"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#9a6310"/>' +
        '</linearGradient></defs>' +
        '<path d="M6.3 13.6 4.2 20.2l3.3-1.2 1.4 2.7 1.8-5" fill="url(#{G})" stroke="#7c4a04" stroke-width=".8" stroke-linejoin="round"/>' +
        '<path d="M17.7 13.6 19.8 20.2l-3.3-1.2-1.4 2.7-1.8-5" fill="url(#{G})" stroke="#7c4a04" stroke-width=".8" stroke-linejoin="round"/>' +
        '<path d="M12 2.2l2.7 5.4 6 .9-4.3 4.2 1 6L12 15.9l-5.4 2.8 1-6L3.3 8.5l6-.9Z" fill="url(#{G})" stroke="#7c4a04" stroke-width=".9" stroke-linejoin="round"/>' +
        '<circle cx="10.1" cy="8.2" r="1" fill="#fff3d6" opacity=".9"/></svg>';

    /* ==== CAZABUGS (v5) — lupa esmeralda sobre un bichito, para los del Discord oficial ==== */
    const BUG_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#d9f99d"/><stop offset=".5" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/>' +
        '</linearGradient></defs>' +
        '<circle cx="10.4" cy="9.9" r="6.1" fill="rgba(74,222,128,.13)" stroke="url(#{G})" stroke-width="2"/>' +
        '<path d="M15 14.7 20.4 20" fill="none" stroke="url(#{G})" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M8.4 9.6 6.7 8.7M8.5 11.3 6.8 12M12.4 9.6 14.1 8.7M12.3 11.3 14 12" stroke="#166534" stroke-width=".9" stroke-linecap="round" fill="none"/>' +
        '<path d="M9.7 7.5 8.9 6.3M11.1 7.5 11.9 6.3" stroke="#166534" stroke-width=".9" stroke-linecap="round" fill="none"/>' +
        '<ellipse cx="10.4" cy="10.7" rx="2.2" ry="2.7" fill="#4ade80" stroke="#14532d" stroke-width=".7"/>' +
        '<circle cx="10.4" cy="8.1" r="1.2" fill="#86efac" stroke="#14532d" stroke-width=".7"/>' +
        '<path d="M10.4 9.4v3.2M9.2 10.2h2.4M9.1 11.1h2.6" stroke="#14532d" stroke-width=".6" fill="none"/>' +
        '<circle cx="17.6" cy="3.9" r="1.1" fill="#bbf7d0" stroke="#15803d" stroke-width=".5"/></svg>';

    /* ==== CREADOR (v5) — cámara de video violeta, para creadores de contenido ==== */
    const CAM_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#f3e8ff"/><stop offset=".55" stop-color="#c084fc"/><stop offset="1" stop-color="#7c3aed"/>' +
        '</linearGradient></defs>' +
        '<rect x="2.6" y="6.9" width="12.4" height="10.2" rx="2.6" fill="url(#{G})" stroke="#5b21b6" stroke-width=".9"/>' +
        '<path d="M15 10.6 19.9 7.9a.98.98 0 0 1 1.5.86v6.5a.98.98 0 0 1-1.5.86L15 13.4Z" fill="url(#{G})" stroke="#5b21b6" stroke-width=".9" stroke-linejoin="round"/>' +
        '<circle cx="7.4" cy="12" r="2" fill="#f5d0fe" stroke="#6d28d9" stroke-width=".8"/>' +
        '<circle cx="12.6" cy="9.2" r="1" fill="#f5d0fe" opacity=".85"/></svg>';

    /* ==== CAMPEÓN (v6) — trofeo dorado con asas, ganador de eventos oficiales ==== */
    const TROPHY_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#fef9c3"/><stop offset=".55" stop-color="#facc15"/><stop offset="1" stop-color="#b45309"/>' +
        '</linearGradient></defs>' +
        '<path d="M7.6 4.8H4.5v.9a3.1 3.1 0 0 0 3.1 3.1" fill="none" stroke="url(#{G})" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M16.4 4.8h3.1v.9a3.1 3.1 0 0 1-3.1 3.1" fill="none" stroke="url(#{G})" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M7.6 3.4h8.8v4.6a4.4 4.4 0 0 1-8.8 0Z" fill="url(#{G})" stroke="#92400e" stroke-width=".9" stroke-linejoin="round"/>' +
        '<path d="M12 12.5v2.9" stroke="#92400e" stroke-width="2" stroke-linecap="round" fill="none"/>' +
        '<rect x="8.6" y="15.4" width="6.8" height="1.6" rx=".8" fill="url(#{G})" stroke="#92400e" stroke-width=".7"/>' +
        '<rect x="6.8" y="17.2" width="10.4" height="1.9" rx=".95" fill="url(#{G})" stroke="#92400e" stroke-width=".7"/>' +
        '<circle cx="10.1" cy="6.3" r="1" fill="#fffbeb" opacity=".9"/>' +
        '<circle cx="20.6" cy="3.9" r="1.05" fill="#fef08a" stroke="#a16207" stroke-width=".5"/></svg>';

    /* ==== TRYHARD (v6) — gamepad naranja con rayo, jugadores super avanzados ==== */
    const PAD_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#fed7aa"/><stop offset=".55" stop-color="#fb923c"/><stop offset="1" stop-color="#c2410c"/>' +
        '</linearGradient></defs>' +
        '<path d="M8.9 5.9h6.2a6 6 0 0 1 5.9 4.8l.7 3.4a3.1 3.1 0 0 1-5.6 2.5l-1.2-1.6h-4.8l-1.2 1.6a3.1 3.1 0 0 1-5.6-2.5l.7-3.4a6 6 0 0 1 4.9-4.8Z" fill="url(#{G})" stroke="#7c2d12" stroke-width=".9" stroke-linejoin="round"/>' +
        '<path d="M7.1 9.7v3.6M5.3 11.5h3.6" stroke="#7c2d12" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="15.6" cy="10.2" r="1.15" fill="#ffedd5" stroke="#7c2d12" stroke-width=".7"/>' +
        '<circle cx="17.9" cy="12.5" r="1.15" fill="#ffedd5" stroke="#7c2d12" stroke-width=".7"/>' +
        '<path d="M20.8 1.7l-2.1 3.1h1.6l-1 2.7 2.8-3.4h-1.7Z" fill="#fde047" stroke="#a16207" stroke-width=".55" stroke-linejoin="round"/></svg>';

    /* ==== PREMIUM (v6) — diamante hielo con facetas, apoyo con dinero real ==== */
    const DIAMOND_SVG =
        '<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="{G}" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#cffafe"/><stop offset=".55" stop-color="#38bdf8"/><stop offset="1" stop-color="#0369a1"/>' +
        '</linearGradient></defs>' +
        '<path d="M7.3 4h9.4l4.1 5.1L12 20.9 3.2 9.1Z" fill="url(#{G})" stroke="#155e75" stroke-width=".9" stroke-linejoin="round"/>' +
        '<path d="M3.2 9.1h17.6" stroke="#155e75" stroke-width=".8" fill="none"/>' +
        '<path d="M7.3 4l2.6 5.1L12 20.7M16.7 4l-2.6 5.1L12 20.7M9.9 9.1h4.2" stroke="#155e75" stroke-width=".8" fill="none" stroke-linecap="round"/>' +
        '<circle cx="21" cy="3" r="1" fill="#e0f2fe" stroke="#0e7490" stroke-width=".5"/></svg>';

    /* ==== CATÁLOGO (el único lugar donde se declaran badges) ==== */
    SB.CATALOG = {
        owner: {
            id: 'owner',
            order: 0, /* SIEMPRE el primero de todos */
            label: 'OWNER',
            desc: 'Fundador de Stevscon — el orgullo de la web 💜',
            color: '#fbbf24',
            glow: 'drop-shadow(0 0 5px rgba(251,191,36,.5)) drop-shadow(0 0 13px rgba(139,92,246,.4))',
            svg: CROWN_SVG
            /* manageBy: sin declarar -> lo manejan Owner/Admin (ver badges_system.js) */
        },
        admin: {
            id: 'admin',
            order: 1, /* staff primero: justo después de la corona */
            label: 'ADMIN',
            desc: 'Administrador de Stevscon — mantiene la web en orden 🛠️',
            color: '#ef4444',
            glow: 'drop-shadow(0 0 5px rgba(239,68,68,.5))',
            svg: ADMIN_SVG
        },
        dev: {
            id: 'dev',
            order: 2,
            label: 'DEV',
            desc: 'Developer de Stevscon — del equipo que construye la web 💜',
            color: '#a78bfa',
            glow: 'drop-shadow(0 0 5px rgba(167,139,250,.55))',
            svg: DEV_SVG
        },
        og: {
            id: 'og',
            order: 3,
            label: 'OG',
            desc: 'Miembro OG — se unió a Stevscon desde el principio 🏅',
            color: '#d9a441',
            glow: 'drop-shadow(0 0 5px rgba(217,164,65,.5))',
            svg: OG_SVG
        },
        cazabugs: {
            id: 'cazabugs',
            order: 4,
            label: 'CAZABUGS',
            desc: 'Encontró bugs en el Discord oficial de Stevscon.com 🐛',
            color: '#4ade80',
            glow: 'drop-shadow(0 0 5px rgba(74,222,128,.5))',
            svg: BUG_SVG
        },
        creador: {
            id: 'creador',
            order: 5,
            label: 'CREADOR',
            desc: 'Creador de contenido oficial de Stevscon.com 🎬',
            color: '#c084fc',
            glow: 'drop-shadow(0 0 5px rgba(192,132,252,.55))',
            svg: CAM_SVG
        },
        campeon: {
            id: 'campeon',
            order: 6,
            label: 'CAMPEÓN',
            desc: 'Ganador de eventos oficiales de Stevscon.com 🏆',
            color: '#facc15',
            glow: 'drop-shadow(0 0 5px rgba(250,204,21,.5))',
            svg: TROPHY_SVG
        },
        tryhard: {
            id: 'tryhard',
            order: 7,
            label: 'TRYHARD',
            desc: 'Jugador avanzado de Stevscon.com — nivel tryhard 🎮',
            color: '#fb923c',
            glow: 'drop-shadow(0 0 5px rgba(251,146,60,.5))',
            svg: PAD_SVG
        },
        premium: {
            id: 'premium',
            order: 8,
            label: 'PREMIUM',
            desc: 'Apoyó a Stevscon.com con dinero real 💎',
            color: '#38bdf8',
            glow: 'drop-shadow(0 0 5px rgba(56,189,248,.55))',
            svg: DIAMOND_SVG
        }
    };

    let _svgN = 0; /* contador para IDs de gradiente únicos */

    function db() { return firebase.database(); }
    function el(tag, css, cls) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (cls) e.className = cls;
        return e;
    }

    /* ==== ESTILOS (una sola vez) — icono puro + tooltip PORTAL (v7) ==== */
    (function injectStyles() {
        if (document.getElementById('sc-badges-style')) return;
        const st = document.createElement('style');
        st.id = 'sc-badges-style';
        st.textContent =
            '.sc-badges-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:7px 0 2px}' +
            '.sc-badge{position:relative;display:inline-flex;cursor:default;user-select:none;padding:1px}' +
            '.sc-badge-ic{display:inline-flex;transition:transform .16s ease}' +
            '.sc-badge:hover .sc-badge-ic{transform:scale(1.18)}' +
            /* Tooltip PORTAL (v7): vive en <body>, position:fixed, z-index máximo.
               Nada de overflow de tarjetas ni capas ajenas lo cortan o tapan. */
            '.sc-badge-tip{position:fixed;left:0;top:0;z-index:2147483000;display:flex;flex-direction:column;gap:2px;text-align:left;' +
            'opacity:0;pointer-events:none;transition:opacity .14s ease,transform .14s ease;transform:translateY(4px);' +
            'background:linear-gradient(135deg,rgba(22,15,36,.98),rgba(12,9,20,.98));border:1px solid rgba(139,92,246,.45);' +
            'border-radius:10px;padding:8px 13px;box-shadow:0 18px 44px rgba(0,0,0,.6),0 0 20px rgba(124,58,237,.28);white-space:nowrap}' +
            '.sc-badge-tip.show{opacity:1;transform:translateY(0)}' +
            /* Flecha: apunta al centro del badge (offset vía --ax). Abajo por defecto. */
            '.sc-badge-tip::after{content:"";position:absolute;bottom:-4.5px;left:var(--ax,10px);width:8px;height:8px;transform:rotate(45deg);' +
            'background:#150e24;border-right:1px solid rgba(139,92,246,.45);border-bottom:1px solid rgba(139,92,246,.45)}' +
            /* Flip: si el tooltip se dibuja DEBAJO del badge, la flecha va arriba. */
            '.sc-badge-tip.below::after{bottom:auto;top:-4.5px;border-right:none;border-bottom:none;' +
            'border-left:1px solid rgba(139,92,246,.45);border-top:1px solid rgba(139,92,246,.45)}' +
            '.sc-badge-tip b{font:800 11px Inter,sans-serif;letter-spacing:.14em}' +
            '.sc-badge-tip span{font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)}' +
            '.sc-badge-tip i{font:600 9.5px Inter,sans-serif;font-style:normal;color:var(--text-muted,#94a3b8);opacity:.75}';
        document.head.appendChild(st);
    })();

    /* ==== TOOLTIP PORTAL (v7): UN solo elemento en <body>, reutilizado ==== */
    let _tip = null;
    function tipEl() {
        if (_tip) return _tip;
        _tip = el('div', null, 'sc-badge-tip');
        _tip.setAttribute('role', 'tooltip');
        document.body.appendChild(_tip);
        return _tip;
    }
    function hideTip() { if (_tip) _tip.classList.remove('show'); }
    /* Si la página hace scroll o se redimensiona, el ancla se mueve: ocultar. */
    document.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);

    function showTip(wrap, b, meta) {
        const tip = tipEl();
        while (tip.firstChild) tip.removeChild(tip.firstChild);
        const l1 = el('b'); l1.style.color = b.color; l1.textContent = b.label;
        const l2 = el('span'); l2.textContent = b.desc;
        tip.appendChild(l1); tip.appendChild(l2);
        if (meta && meta.at) {
            const d = new Date(meta.at);
            if (!isNaN(d.getTime())) {
                const l3 = el('i');
                l3.textContent = 'Otorgado el ' + d.toLocaleDateString();
                tip.appendChild(l3);
            }
        }
        /* Medir con el tooltip ya en DOM (opacity:0 no afecta a offsetWidth) */
        tip.classList.remove('show', 'below');
        const r = wrap.getBoundingClientRect();
        const tw = tip.offsetWidth || 0, th = tip.offsetHeight || 0;
        const vw = window.innerWidth || document.documentElement.clientWidth;
        const vh = window.innerHeight || document.documentElement.clientHeight;
        /* Horizontal: centrado sobre el icono, recortado a los bordes */
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, vw - tw - 8));
        /* Vertical: arriba por defecto; si no cabe, flip hacia abajo */
        let top = r.top - th - 10, below = false;
        if (top < 8) { top = r.bottom + 10; below = true; }
        if (top + th > vh - 8) top = Math.max(8, vh - th - 8);
        /* La flecha sigue al centro real del badge aunque el tooltip se recorte */
        const ax = Math.max(6, Math.min(r.left + r.width / 2 - left - 4, tw - 14));
        tip.style.setProperty('--ax', ax + 'px');
        tip.style.left = Math.round(left) + 'px';
        tip.style.top = Math.round(top) + 'px';
        if (below) tip.classList.add('below');
        tip.classList.add('show');
    }

    /* ==== ICONO del badge: SVG estático del catálogo, fondo transparente ==== */
    function iconEl(b, size) {
        const s = el('span', null, 'sc-badge-ic');
        s.style.filter = b.glow || 'none';
        /* ID de gradiente ÚNICO por instancia — la corona NUNCA pierde su color */
        const gid = 'scbg' + (++_svgN);
        s.innerHTML = String(b.svg || '').split('{G}').join(gid).split('{S}').join(String(size || 22));
        return s;
    }

    /* ==== LISTENER ÚNICO por uid + repintado de todas las filas vivas ==== */
    const _cache = {}, _on = {}, _rows = [];
    function repaint(uid) {
        for (let i = _rows.length - 1; i >= 0; i--) {
            const r = _rows[i];
            if (!r.isConnected) { _rows.splice(i, 1); continue; }
            if (r.dataset.scBadgesUid === uid) paintRow(r, uid);
        }
    }
    function listen(uid) {
        if (_on[uid]) return;
        _on[uid] = true;
        db().ref(NODE + '/' + uid).on('value', function (s) {
            _cache[uid] = s.val() || {};
            repaint(uid);
        }, function (err) {
            console.warn('[StevsconBadges] lectura de ' + NODE + '/' + uid, err);
        });
    }

    function paintRow(row, uid) {
        hideTip(); /* el hover target puede desaparecer al repintar: ocultar portal */
        while (row.firstChild) row.removeChild(row.firstChild);
        const val = _cache[uid];
        const ids = val ? Object.keys(val).filter(function (id) { return SB.CATALOG[id]; }) : [];
        ids.sort(function (a, b) {
            return (SB.CATALOG[a].order || 99) - (SB.CATALOG[b].order || 99) || a.localeCompare(b);
        });
        if (!ids.length) { row.style.display = 'none'; return; }
        row.style.display = 'flex';
        for (let i = 0; i < ids.length; i++) row.appendChild(badgeFor(ids[i], val[ids[i]], 22));
    }

    /* Icono + tooltip portal (nombre, descripción y fecha al acercar el mouse) */
    function badgeFor(id, meta, size) {
        const b = SB.CATALOG[id];
        const wrap = el('span', null, 'sc-badge');
        wrap.dataset.scBadge = id;
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', b.label);
        wrap.appendChild(iconEl(b, size));
        /* v7: el tooltip NO se mete dentro de la tarjeta; se pinta en <body> */
        wrap.addEventListener('mouseenter', function () { showTip(wrap, b, meta); });
        wrap.addEventListener('mouseleave', hideTip);
        return wrap;
    }

    /* ==== API pública ==== */
    SB.rowFor = function (uid) {
        if (!uid) return null;
        const row = el('div', null, 'sc-badges-row');
        row.dataset.scBadgesUid = uid;
        _rows.push(row);
        listen(uid);
        paintRow(row, uid);
        return row;
    };

    SB.repaint = repaint; /* el system llama esto tras escribir (v4) */

    SB.uidFromHandler = function (h, cb) {
        h = String(h || '').toLowerCase().replace(/^@/, '');
        if (!h) { if (cb) cb(null); return; }
        db().ref('handlers/' + h).once('value').then(function (s) {
            if (cb) cb(s.val() || null);
        }).catch(function () { if (cb) cb(null); });
    };

    /* ==== MONTAJE: justo DEBAJO del @handler ==== */
    function findHandlerP(container) {
        const ps = container.querySelectorAll('p');
        for (let i = 0; i < ps.length; i++) {
            if ((ps[i].textContent || '').charAt(0) === '@') return ps[i];
        }
        const h3 = container.querySelector('h3');
        if (h3 && h3.nextElementSibling && h3.nextElementSibling.tagName === 'P') return h3.nextElementSibling;
        return null;
    }
    SB.mount = function (container, uid) {
        if (!container || !uid || container.querySelector('.sc-badges-row')) return;
        const h = findHandlerP(container);
        if (!h || !h.parentNode) return;
        h.parentNode.insertBefore(SB.rowFor(uid), h.nextSibling);
    };

    /* ==== ENGANCHE AUTOMÁTICO (Perfiles + modal del Social, sin tocar files) ==== */
    const _panelUid = new WeakMap(); /* cardHost del modal -> uid (vía hook) */
    if (window.SCSOC && typeof SCSOC.onHook === 'function') {
        SCSOC.onHook('profilePanel', function (uid, modal, cardHost) {
            if (uid && cardHost) _panelUid.set(cardHost, uid);
        });
    }

    function autoMount(container, data) {
        if (!container) return;
        const uid = (data && (data.uid || data._uid || data.authorUid)) ||
            (_panelUid.get(container)) || null;
        if (uid) { SB.mount(container, uid); return; }
        const h = data && data.handler;
        if (h) {
            SB.uidFromHandler(h, function (u) {
                if (u && container.isConnected) SB.mount(container, u);
            });
            return;
        }
        /* Página de Perfiles sin handler a la vista: es TU tarjeta */
        const a = firebase.auth().currentUser;
        if (a) SB.mount(container, a.uid);
    }

    function hookProfiles() {
        const SCp = window.StevsconProfiles;
        if (!SCp || !SCp.ui || typeof SCp.ui.renderProfileCard !== 'function') return false;
        if (SCp.ui.__badgesWrapped) return true;
        const orig = SCp.ui.renderProfileCard;
        SCp.ui.renderProfileCard = function (container, data, authUser, opts) {
            const out = orig.apply(this, arguments);
            try { autoMount(container, data); } catch (e) { console.error('[StevsconBadges]', e); }
            return out;
        };
        SCp.ui.__badgesWrapped = true;
        return true;
    }
    hookProfiles();
    let tries = 0;
    const waitWrap = setInterval(function () {
        if (hookProfiles() || ++tries > 50) clearInterval(waitWrap);
    }, 200);

    /* Icono estático (para el panel de manage, sin Firebase) — size opcional */
    SB.staticIcon = function (id, size) { return badgeFor(id, null, size || 22); };
    SB.staticPill = SB.staticIcon; /* alias de compatibilidad v1 */

    console.log('[Stevscon] badges_core.js listo (v7) — LA CARA: 9 badges + tooltip portal anti-cortes 👑');
})(window, document);