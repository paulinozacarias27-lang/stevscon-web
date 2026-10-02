/**
 * ====
 * STEVSCON.COM - accounts/manage/settings/output/ui_settings.js
 * AJUSTES · CASCARÓN (v7): blanco inline visible en modo claro
 *
 * v3: engranaje en cluster horizontal junto al avatar.
 * v4: badge "PRONTO" genérico (cualquier pestaña con badge: 'TEXTO').
 * v5: mapeo rgb() de estilos inline (textos negros + acentos morados).
 * v6: redefinición de variables CSS de styles.css dentro de body.theme-light
 *     (modal, navbar, category-cards, labels y toasts se pintan claros solos).
 *
 * v7 (ESTA):
 * - FIX NOMBRE/TÍTULO INVISIBLE: el blanco puro inline (#fff, white,
 *   rgb(255,255,255)) usado por acc_access.js (título del modal) y por la
 *   tarjeta "Mi perfil" (nombre grande) no se mapeaba -> texto blanco sobre
 *   panel blanco. Ahora el blanco inline pasa a tinta en claro.
 * - EXCEPCIONES: el blanco inline se CONSERVA sobre fondos sólidos de color
 *   (botones violeta/rojo/verde, avatares de sesión), porque ahí sí es legible.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};

    SCSET.tabs = {};
    SCSET.order = ['preferencias', 'privacidad', 'datos', 'seguridad'];
    SCSET.authed = false;
    SCSET.settings = {
        lang: 'es', theme: 'dark', defaultStatus: 'online',
        privacy: { invisible: false, profileVis: 'public', hideAge: false, hideGender: false }
    };
    SCSET.data = { record: null };

    let overlayEl = null;
    let escHandler = null;
    let changeHandler = null;
    let gearEl = null;
    let currentTab = 'preferencias';

    /* ==== REGISTRO DE PESTAÑAS ==== */

    SCSET.registerTab = function (t) {
        if (!t || !t.id || typeof t.render !== 'function') return;
        SCSET.tabs[t.id] = t;
    };

    /* ==== HELPERS DE UI ==== */

    const ui = SCSET.ui = {};

    ui.row = function (label, desc, control) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:16px;padding:13px 2px;border-bottom:1px solid #2e2440;';
        const left = document.createElement('div');
        left.style.cssText = 'max-width:360px;';
        const l = document.createElement('p');
        l.textContent = label;
        l.style.cssText = 'margin:0;font-size:13.5px;font-weight:600;color:#f8fafc;';
        const d = document.createElement('p');
        d.textContent = desc;
        d.style.cssText = 'margin:2px 0 0;font-size:11.5px;color:#94a3b8;line-height:1.45;';
        left.appendChild(l); left.appendChild(d);
        row.appendChild(left);
        if (control) row.appendChild(control);
        return row;
    };

    ui.toggle = function (on, onChange) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'switch');
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.style.cssText = 'width:42px;height:23px;border-radius:999px;border:0;cursor:pointer;position:relative;flex:none;transition:background .15s ease;';
        const knob = document.createElement('i');
        knob.style.cssText = 'position:absolute;top:2.5px;left:3px;width:18px;height:18px;border-radius:50%;transition:left .15s ease,background .15s ease;';
        b.appendChild(knob);
        const paint = function (v) {
            b.style.background = v ? '#8b5cf6' : '#2e2440';
            knob.style.left = v ? '21px' : '3px';
            knob.style.background = v ? '#ffff' : '#94a3b8';
        };
        paint(on);
        b.addEventListener('click', function () {
            const nv = !b.getAttribute('aria-checked') || b.getAttribute('aria-checked') === 'false';
            b.setAttribute('aria-checked', nv ? 'true' : 'false');
            paint(nv);
            onChange(nv);
        });
        return b;
    };

    ui.seg = function (options, activeIndex, onChange) {
        const wrap = document.createElement('span');
        wrap.style.cssText = 'display:inline-flex;border:1px solid #2e2440;border-radius:8px;overflow:hidden;flex:none;';
        options.forEach(function (opt, i) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = opt;
            b.style.cssText = 'border:0;background:transparent;color:#94a3b8;font:600 12px Inter,sans-serif;padding:7px 12px;cursor:pointer;transition:background .15s ease,color .15s ease;';
            if (i === activeIndex) { b.style.background = '#8b5cf6'; b.style.color = '#ffff'; }
            b.addEventListener('click', function () {
                Array.prototype.forEach.call(wrap.children, function (c) { c.style.background = 'transparent'; c.style.color = '#94a3b8'; });
                b.style.background = '#8b5cf6'; b.style.color = '#ffff';
                onChange(i);
            });
            wrap.appendChild(b);
        });
        return wrap;
    };

    ui.btn = function (label, kind, onClick) {
        const colors = {
            violet: '#8b5cf6|#c4b5fd', red: '#ef4444|#f87171', green: '#22c55e|#4ade80'
        };
        const parts = (colors[kind] || colors.violet).split('|');
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'border:1px solid ' + parts[0] + ';color:' + parts[1] + ';background:transparent;font:600 12px Inter,sans-serif;padding:7px 13px;border-radius:8px;cursor:pointer;flex:none;transition:background .15s ease;';
        b.addEventListener('mouseenter', function () { b.style.background = 'rgba(139,92,246,.12)'; });
        b.addEventListener('mouseleave', function () { b.style.background = 'transparent'; });
        b.addEventListener('click', onClick);
        return b;
    };

    ui.mono = function (text) {
        const s = document.createElement('span');
        s.textContent = text;
        s.style.cssText = 'font-family:monospace;font-size:12px;color:#cbd5e1;flex:none;user-select:all;';
        return s;
    };

    ui.note = function (text, color) {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.cssText = 'margin:12px 2px 0;font-size:11.5px;font-weight:600;color:' + (color || '#a78bfa') + ';line-height:1.5;';
        return p;
    };

    ui.card = function () {
        const c = document.createElement('div');
        c.style.cssText = 'background:#120f1b;border:1px solid #2e2440;border-radius:14px;padding:20px 22px 14px;max-width:560px;';
        return c;
    };

    /* ==== TOAST PROPIO ==== */

    SCSET.toast = function (msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:4000;background:#1a1625;' +
            'border:1px solid #8b5cf6;color:#ede9fe;font:600 13px Inter,sans-serif;padding:10px 18px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.5);';
        document.body.appendChild(t);
        try { t.animate([{ opacity: 0, transform: 'translate(-50%,8px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 160, easing: 'ease-out' }); } catch (e) {}
        setTimeout(function () {
            try { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' }); } catch (e) {}
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
        }, 2300);
    };

    /* ==== TEMA (v7: claro real + blancos inline legibles) ==== */

    const LIGHT_STYLE_ID = 'sc-theme-light';

    /*
     * ESTRATEGIA v7 (3 capas):
     *
     * CAPA 1 · VARIABLES: redefinimos las variables de styles.css dentro de
     *   body.theme-light. Los componentes con var() se pintan solos.
     *
     * CAPA 2 · CLASES con color fijo en styles.css que en claro no leían bien.
     *
     * CAPA 3 · INLINE: lo generado por JS con colores escritos a mano.
     *   - Barrido de fondos -> claros, con restauración de los que eran COLOR.
     *   - Textos de tu paleta -> tinta/grises/morados.
     *   - NUEVO v7: blanco puro inline -> tinta (nombre de "Mi perfil",
     *     título de ACCESS), con excepciones para conservarlo sobre fondos
     *   sólidos de color (botones violeta/rojo/verde, avatares).
     */
    const LIGHT_CSS = [
        /* ===== CAPA 1 · VARIABLES (fix maestro) ===== */
        'body.theme-light{',
        '  --bg-main:#f4f2fa; --bg-card:#ffffff; --bg-hover:#ece7f8; --bg-elevated:#f1edf9;',
        '  --purple-accent:#7c3aed; --purple-dark:#6d28d9; --purple-light:#6d28d9;',
        '  --purple-glow:rgba(139,92,246,.18);',
        '  --text-main:#1e1b2e; --text-muted:#5b5570; --border-color:#ddd5f0;',
        '  color-scheme:light;',
        '}',
        'body.theme-light{background:#f4f2fa !important;color:#1e1b2e !important}',

        /* ===== CAPA 2 · CLASES con color fijo ===== */
        'body.theme-light .navbar{background:rgba(244,242,250,.92) !important;border-bottom-color:#e2dcf3 !important;box-shadow:none !important}',
        'body.theme-light .field-hint.hint-ok{color:#15803d !important}',
        'body.theme-light .field-hint.hint-error{color:#b91c1c !important}',
        'body.theme-light .success-box{color:#15803d !important;border-color:rgba(34,197,94,.45) !important}',
        'body.theme-light .errors-box{color:#b91c1c !important;border-color:rgba(239,68,68,.45) !important}',
        'body.theme-light .toast-success{color:#15803d !important}',
        'body.theme-light .strength-bar{background:#ddd5f0 !important}',
        'body.theme-light .modal-overlay{background:rgba(30,27,46,.45) !important}',

        /* ===== CAPA 3 · INLINE ===== */

        /* 3a) BARRIDO: todo fondo rgb/rgba oscuro conocido -> claro */
        'body.theme-light [style*="background-color: rgb"],body.theme-light [style*="background: rgb"]{background-color:#ffff !important}',

        /* 3b) Fondos oscuros escritos como hex (innerHTML no normaliza) */
        'body.theme-light [style*="background-color:#0d0b14"],body.theme-light [style*="background:#0d0b14"]{background-color:#f4f2fa !important}',
        'body.theme-light [style*="background-color:#1a1625"],body.theme-light [style*="background:#1a1625"]{background-color:#ffff !important}',
        'body.theme-light [style*="background-color:#120f1b"],body.theme-light [style*="background:#120f1b"]{background-color:#ffff !important}',
        'body.theme-light [style*="background-color:#221b33"],body.theme-light [style*="background:#221b33"]{background-color:#f1edf9 !important}',
        'body.theme-light [style*="background-color:#261f36"],body.theme-light [style*="background:#261f36"]{background-color:#ece7f8 !important}',

        /* 3c) RESTAURAR fondos que eran COLOR a propósito (pisan el barrido) */
        'body.theme-light [style*="background: rgb(139"],body.theme-light [style*="background-color: rgb(139"]{background-color:#8b5cf6 !important}',
        'body.theme-light [style*="background:#8b5cf6"],body.theme-light [style*="background-color:#8b5cf6"]{background-color:#8b5cf6 !important}',
        'body.theme-light [style*="background: rgb(239"],body.theme-light [style*="background-color: rgb(239"]{background-color:#ef4444 !important}',
        'body.theme-light [style*="background: rgb(34"],body.theme-light [style*="background-color: rgb(34"]{background-color:#22c55e !important}',
        'body.theme-light [style*="background: rgb(74"],body.theme-light [style*="background-color: rgb(74"]{background-color:#4ade80 !important}',
        'body.theme-light [style*="background: rgb(46"],body.theme-light [style*="background-color: rgb(46"]{background-color:#ddd5f0 !important}',
        'body.theme-light [style*="background: rgb(148"],body.theme-light [style*="background-color: rgb(148"]{background-color:#8a7fa3 !important}',
        'body.theme-light [style*="background:#2e2440"],body.theme-light [style*="background-color:#2e2440"]{background-color:#ddd5f0 !important}',
        'body.theme-light [style*="background:#94a3b8"],body.theme-light [style*="background-color:#94a3b8"]{background-color:#8a7fa3 !important}',
        'body.theme-light [style*="background: rgba(139"],body.theme-light [style*="background-color: rgba(139"]{background-color:rgba(139,92,246,.13) !important}',
        'body.theme-light [style*="background: rgba(239"],body.theme-light [style*="background-color: rgba(239"]{background-color:rgba(239,68,68,.1) !important}',
        'body.theme-light [style*="background: rgba(34"],body.theme-light [style*="background-color: rgba(34"]{background-color:rgba(34,197,94,.1) !important}',
        'body.theme-light [style*="background: rgba(251"],body.theme-light [style*="background-color: rgba(251"]{background-color:rgba(251,191,36,.12) !important}',
        'body.theme-light [style*="background: rgba(5"],body.theme-light [style*="background-color: rgba(5"]{background-color:rgba(15,12,24,.55) !important}',
        'body.theme-light [style*="background: rgba(13"],body.theme-light [style*="background-color: rgba(13"]{background-color:rgba(244,242,250,.92) !important}',
        'body.theme-light [style*="background: rgba(0"],body.theme-light [style*="background-color: rgba(0"]{background-color:rgba(0,0,0,.45) !important}',

        /* 3d) TEXTOS: hex (innerHTML) y rgb (element.style), negro tinta + morados */
        'body.theme-light [style*="color:#f8fafc"],body.theme-light [style*="color: rgb(248, 250, 252)"]{color:#1e1b2e !important}',
        'body.theme-light [style*="color:#e2e8f0"],body.theme-light [style*="color: rgb(226, 232, 240)"]{color:#2a2740 !important}',
        'body.theme-light [style*="color:#cbd5e1"],body.theme-light [style*="color: rgb(203, 213, 225)"]{color:#3a3654 !important}',
        'body.theme-light [style*="color:#94a3b8"],body.theme-light [style*="color: rgb(148, 163, 184)"]{color:#5b5570 !important}',
        'body.theme-light [style*="color:#64748b"],body.theme-light [style*="color: rgb(100, 116, 139)"]{color:#6b6480 !important}',
        'body.theme-light [style*="color:#8b5cf6"],body.theme-light [style*="color: rgb(139, 92, 246)"]{color:#6d28d9 !important}',
        'body.theme-light [style*="color:#a78bfa"],body.theme-light [style*="color: rgb(167, 139, 250)"]{color:#6d28d9 !important}',
        'body.theme-light [style*="color:#c4b5fd"],body.theme-light [style*="color: rgb(196, 181, 253)"]{color:#5b21b6 !important}',
        'body.theme-light [style*="color:#ede9fe"],body.theme-light [style*="color: rgb(237, 233, 254)"]{color:#4c1d95 !important}',
        'body.theme-light [style*="color:#fbbf24"],body.theme-light [style*="color: rgb(251, 191, 36)"]{color:#b45309 !important}',
        'body.theme-light [style*="color:#f87171"],body.theme-light [style*="color: rgb(248, 113, 113)"]{color:#b91c1c !important}',
        'body.theme-light [style*="color:#ef4444"],body.theme-light [style*="color: rgb(239, 68, 68)"]{color:#b91c1c !important}',
        'body.theme-light [style*="color:#4ade80"],body.theme-light [style*="color: rgb(74, 222, 128)"]{color:#15803d !important}',
        'body.theme-light [style*="color:#22c55e"],body.theme-light [style*="color: rgb(34, 197, 94)"]{color:#15803d !important}',

        /* 3d+) BLANCO PURO inline -> tinta (v7: nombre de "Mi perfil", título de ACCESS) */
        'body.theme-light [style*="color: rgb(255, 255, 255)"]{color:#1e1b2e !important}',
        'body.theme-light [style*="color: rgb(255,255,255)"]{color:#1e1b2e !important}',
        'body.theme-light [style*="color:#fff"],body.theme-light [style*="color: #fff"]{color:#1e1b2e !important}',
        'body.theme-light [style*="color:#FFF"],body.theme-light [style*="color: #FFF"]{color:#1e1b2e !important}',
        'body.theme-light [style*="color:white"],body.theme-light [style*="color: white"]{color:#1e1b2e !important}',

        /* 3d++) EXCEPCIONES: el blanco se conserva sobre fondos sólidos de color */
        /* mismo elemento lleva fondo de color + texto blanco */
        'body.theme-light [style*="background: rgb(139"][style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(139"][style*="color: rgb(255"]{color:#ffff !important}',
        'body.theme-light [style*="background: rgb(239"][style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(239"][style*="color: rgb(255"]{color:#ffff !important}',
        'body.theme-light [style*="background: rgb(34"][style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(34"][style*="color: rgb(255"]{color:#ffff !important}',
        'body.theme-light [style*="background: rgb(74"][style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(74"][style*="color: rgb(255"]{color:#ffff !important}',
        /* texto blanco dentro de un botón/bloque con fondo de color inline */
        'body.theme-light [style*="background: rgb(139"] [style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(139"] [style*="color: rgb(255"]{color:#ffff !important}',
        'body.theme-light [style*="background: rgb(239"] [style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(239"] [style*="color: rgb(255"]{color:#ffff !important}',
        'body.theme-light [style*="background: rgb(34"] [style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(34"] [style*="color: rgb(255"]{color:#ffff !important}',
        'body.theme-light [style*="background: rgb(74"] [style*="color: rgb(255"],body.theme-light [style*="background-color: rgb(74"] [style*="color: rgb(255"]{color:#ffff !important}',
        /* versiones hex (innerHTML) */
        'body.theme-light [style*="background:#8b5cf6"][style*="color:#fff"],body.theme-light [style*="background-color:#8b5cf6"][style*="color:#fff"]{color:#ffff !important}',
        'body.theme-light [style*="background:#ef4444"][style*="color:#fff"],body.theme-light [style*="background-color:#ef4444"][style*="color:#fff"]{color:#ffff !important}',
        'body.theme-light [style*="background:#22c55e"][style*="color:#fff"],body.theme-light [style*="background-color:#22c55e"][style*="color:#fff"]{color:#ffff !important}',
        /* avatares/iconos con fondo violeta por clase: su blanco inline no se toca */
        'body.theme-light .session-avatar [style*="color: rgb(255"],body.theme-light .session-avatar [style*="color:#fff"],body.theme-light .category-icon [style*="color: rgb(255"],body.theme-light .category-icon [style*="color:#fff"]{color:#ffff !important}',

        /* 3e) BORDES: lila suave */
        'body.theme-light [style*="rgb(46, 36, 64"]{border-color:#ddd5f0 !important}',
        'body.theme-light [style*="#2e2440"]{border-color:#ddd5f0 !important}',

        /* 3f) TOQUES MORADOS EXTRA en claro */
        'body.theme-light p[data-sc-title]{color:#5b21b6 !important}',
        'body.theme-light [data-sc-tab][style*="rgba(139"]{color:#5b21b6 !important}'
    ].join('\n');

    SCSET.applyTheme = function (theme) {
        const body = document.body;
        body.classList.remove('theme-dark', 'theme-light');
        body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
        try { localStorage.setItem('stevscon_theme', theme); } catch (e) {}
        let st = document.getElementById(LIGHT_STYLE_ID);
        if (theme === 'light') {
            if (!st) {
                st = document.createElement('style');
                st.id = LIGHT_STYLE_ID;
                document.head.appendChild(st);
            }
            st.textContent = LIGHT_CSS;
        } else if (st && st.parentNode) {
            st.parentNode.removeChild(st);
        }
    };

    /* ==== ENGRANAJE JUNTO AL AVATAR (cluster horizontal) ==== */

    function findHeaderAvatar(host) {
        const els = host.querySelectorAll('img, div, span, button');
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el.dataset && el.dataset.scSettingsGear) continue;
            const w = el.offsetWidth || parseInt(el.style.width, 10) || 0;
            if (w < 26 || w > 90) continue;
            let r = parseFloat(el.style.borderTopLeftRadius);
            if (!r && r !== 0) r = parseFloat(window.getComputedStyle(el).borderTopLeftRadius) || 0;
            if (r >= w * 0.45) return el;
        }
        return null;
    }

    function makeGear() {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.scSettingsGear = '1';
        b.title = 'Configuraciones';
        b.setAttribute('aria-label', 'Configuraciones');
        b.style.cssText = 'width:38px;height:38px;flex:none;border:1px solid #2e2440;border-radius:50%;' +
            'background:#1a1625;color:#94a3b8;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;' +
            'transition:transform .25s ease,color .15s ease,border-color .15s ease;box-sizing:border-box;';
        const ic = document.createElement('i');
        ic.className = 'fa-solid fa-gear';
        ic.style.cssText = 'font-size:16px;';
        b.appendChild(ic);
        b.addEventListener('mouseenter', function () { b.style.color = '#8b5cf6'; b.style.borderColor = '#8b5cf6'; b.style.transform = 'rotate(40deg)'; });
        b.addEventListener('mouseleave', function () { b.style.color = '#94a3b8'; b.style.borderColor = '#2e2440'; b.style.transform = 'rotate(0deg)'; });
        b.addEventListener('click', function (e) { e.stopPropagation(); SCSET.open(); });
        return b;
    }

    function injectGear() {
        const host = document.getElementById('user-header-actions');
        if (!host) return;

        // Sin sesión: desarmar el cluster si quedó alguno
        if (!SCSET.authed) {
            const stale = host.querySelector('[data-sc-settings-cluster]');
            if (stale) {
                if (stale.firstChild) host.insertBefore(stale.firstChild, stale);
                host.removeChild(stale);
            }
            gearEl = null;
            return;
        }

        // Forzar el contenedor del header a fila horizontal (arregla el apilado)
        host.style.display = 'flex';
        host.style.flexDirection = 'row';
        host.style.flexWrap = 'nowrap';
        host.style.alignItems = 'center';
        host.style.justifyContent = 'flex-end';
        host.style.gap = '10px';
        host.style.width = 'auto';
        host.style.maxWidth = 'none';
        host.style.flex = '0 0 auto';

        const av = findHeaderAvatar(host);
        if (!av) return;
        const wrap = av.closest ? av.closest('[data-sc-status-wrap]') : null;
        const anchor = wrap || av;

        let cluster = host.querySelector('[data-sc-settings-cluster]');

        // session.js re-pintó el avatar y quedó fuera del cluster: reconstruir
        if (cluster && !cluster.contains(anchor)) {
            host.removeChild(cluster);
            cluster = null;
            gearEl = null;
        }

        if (!cluster) {
            cluster = document.createElement('span');
            cluster.dataset.scSettingsCluster = '1';
            cluster.style.cssText = 'display:inline-flex;align-items:center;gap:10px;flex:none;';
            anchor.parentNode.insertBefore(cluster, anchor);
            cluster.appendChild(anchor);
        }

        if (!gearEl || !gearEl.isConnected) gearEl = makeGear();
        if (gearEl.parentNode !== cluster) cluster.appendChild(gearEl);
    }

    function watchHeader() {
        const host = document.getElementById('user-header-actions');
        if (!host) { setTimeout(watchHeader, 300); return; }
        injectGear();
        new MutationObserver(injectGear).observe(host, { childList: true, subtree: true });
        let n = 0;
        const iv = setInterval(function () { injectGear(); if (++n > 40) clearInterval(iv); }, 500);
    }

    /* ==== PANEL ==== */

    function navItem(t) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.scTab = t.id;
        b.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;border:0;background:transparent;' +
            'color:#94a3b8;font:600 13px Inter,sans-serif;padding:10px 12px;border-radius:9px;cursor:pointer;text-align:left;' +
            'margin-bottom:2px;transition:background .15s ease,color .15s ease;';
        const ic = document.createElement('i');
        ic.className = 'fa-solid ' + t.icon;
        ic.style.cssText = 'font-size:14px;width:18px;text-align:center;';
        const lb = document.createElement('span');
        lb.textContent = t.label;
        lb.style.flex = '1';
        b.appendChild(ic); b.appendChild(lb);
        if (t.badge) {
            const bd = document.createElement('span');
            bd.textContent = t.badge;
            bd.style.cssText = 'font-size:9px;font-weight:800;letter-spacing:.08em;color:#fbbf24;border:1px solid rgba(251,191,36,.4);padding:2px 7px;border-radius:999px;';
            b.appendChild(bd);
        }
        b.addEventListener('click', function () { showTab(t.id); });
        return b;
    }

    function showTab(id) {
        currentTab = id;
        if (!overlayEl) return;
        const t = SCSET.tabs[id];
        if (!t) return;
        Array.prototype.forEach.call(overlayEl.querySelectorAll('[data-sc-tab]'), function (b) {
            const on = b.dataset.scTab === id;
            b.style.background = on ? 'rgba(139,92,246,.16)' : 'transparent';
            b.style.color = on ? '#f8fafc' : '#94a3b8';
        });
        const title = overlayEl.querySelector('[data-sc-title]');
        const body = overlayEl.querySelector('[data-sc-body]');
        if (title) title.textContent = t.label;
        if (body) {
            while (body.firstChild) body.removeChild(body.firstChild);
            try { t.render(body); } catch (err) { console.error('[Stevscon Settings] Error pintando la pestaña ' + id + ':', err); }
        }
    }

    SCSET.open = function () {
        if (overlayEl || !SCSET.authed) return;
        overlayEl = document.createElement('div');
        overlayEl.dataset.scSettingsOverlay = '1';
        overlayEl.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(5,4,10,.78);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;font-family:Inter,sans-serif;';

        const shell = document.createElement('div');
        shell.style.cssText = 'width:min(920px,100%);height:min(620px,100%);background:#0d0b14;border:1px solid #2e2440;border-radius:16px;display:flex;overflow:hidden;box-sizing:border-box;';

        const side = document.createElement('div');
        side.style.cssText = 'width:230px;flex:none;background:#120f1b;border-right:1px solid #2e2440;padding:18px 12px 14px;display:flex;flex-direction:column;box-sizing:border-box;';
        const eyebrow = document.createElement('p');
        eyebrow.textContent = 'CONFIGURACIONES';
        eyebrow.style.cssText = 'margin:0 0 2px 6px;font-size:10.5px;font-weight:800;letter-spacing:.12em;color:#a78bfa;';
        const sub = document.createElement('p');
        sub.textContent = 'Stevscon.com';
        sub.style.cssText = 'margin:0 0 16px 6px;font-size:11px;color:#64748b;';
        side.appendChild(eyebrow); side.appendChild(sub);

        const ids = SCSET.order.slice();
        Object.keys(SCSET.tabs).forEach(function (k) { if (ids.indexOf(k) === -1) ids.push(k); });
        ids.forEach(function (id) { if (SCSET.tabs[id]) side.appendChild(navItem(SCSET.tabs[id])); });

        const hint = document.createElement('p');
        hint.textContent = 'ESC para cerrar';
        hint.style.cssText = 'margin:auto 0 0 6px;padding-top:12px;font-size:10.5px;color:#64748b;';
        side.appendChild(hint);

        const content = document.createElement('div');
        content.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0;';
        const head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 22px 10px;';
        const title = document.createElement('p');
        title.dataset.scTitle = '1';
        title.style.cssText = 'margin:0;font-size:17px;font-weight:800;color:#f8fafc;';
        const x = document.createElement('button');
        x.type = 'button';
        x.setAttribute('aria-label', 'Cerrar ajustes');
        x.style.cssText = 'width:30px;height:30px;border:1px solid #2e2440;border-radius:50%;background:transparent;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;';
        const xi = document.createElement('i');
        xi.className = 'fa-solid fa-xmark';
        x.appendChild(xi);
        x.addEventListener('click', SCSET.close);
        head.appendChild(title); head.appendChild(x);
        const body = document.createElement('div');
        body.dataset.scBody = '1';
        body.style.cssText = 'flex:1;overflow-y:auto;padding:4px 22px 20px;';
        content.appendChild(head); content.appendChild(body);
        shell.appendChild(side); shell.appendChild(content);
        overlayEl.appendChild(shell);
        document.body.appendChild(overlayEl);

        overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) SCSET.close(); });
        escHandler = function (e) { if (e.key === 'Escape') SCSET.close(); };
        document.addEventListener('keydown', escHandler);

        changeHandler = function () { if (overlayEl) showTab(currentTab); };
        document.addEventListener('sc:settings-changed', changeHandler);

        try {
            overlayEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
            shell.animate([{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 210, easing: 'cubic-bezier(.2,.8,.3,1.1)' });
        } catch (e) {}
        showTab(currentTab);
    };

    SCSET.close = function () {
        if (!overlayEl) return;
        const el = overlayEl;
        overlayEl = null;
        if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
        if (changeHandler) { document.removeEventListener('sc:settings-changed', changeHandler); changeHandler = null; }
        try { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-in' }); } catch (e) {}
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 140);
    };

    /* ==== PESTAÑA INTEGRADA: SEGURIDAD (cascarón, solo si ui_security.js no carga) ==== */

    SCSET.registerTab({
        id: 'seguridad', label: 'Seguridad', icon: 'fa-user-shield', badge: 'PRONTO',
        render: function (body) {
            const c = ui.card();
            const ic = document.createElement('i');
            ic.className = 'fa-solid fa-user-shield';
            ic.style.cssText = 'font-size:22px;color:#8b5cf6;display:block;margin-bottom:12px;';
            const h = document.createElement('p');
            h.textContent = 'Seguridad';
            h.style.cssText = 'margin:0 0 6px;font-size:17px;font-weight:800;color:#f8fafc;';
            const d = document.createElement('p');
            d.textContent = 'Aquí vivirá la Zona de Seguridad: cambiar contraseña, cambiar correo y eliminar cuenta.';
            d.style.cssText = 'margin:0 0 10px;font-size:13px;color:#94a3b8;line-height:1.5;';
            c.appendChild(ic); c.appendChild(h); c.appendChild(d);
            c.appendChild(ui.note('PRONTO · si ves esto, ui_security.js no cargó (revisa la ruta o el index).', '#fbbf24'));
            body.appendChild(c);
        }
    });

    /* ==== INIT ==== */
    try {
        const saved = localStorage.getItem('stevscon_theme');
        if (saved === 'light' || saved === 'dark') SCSET.applyTheme(saved);
    } catch (e) {}

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchHeader);
    else watchHeader();

    console.log('[Stevscon] ui_settings.js listo (cascarón v7 · blancos inline legibles en claro).');
})(window, document);