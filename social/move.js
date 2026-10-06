/**
 * ====
 * STEVSCON.COM — social/move.js (v1)
 * MOVE — La barra de scroll del sitio (adiós línea blanca del navegador)
 *
 *  - Cárgalo en TODAS las páginas (index, social, profiles…). Pinta la
 *    barra del documento al estilo de la web: púrpura, redondeada, con glow.
 *  - Animación fluida: el pulido PERSIGUE el scroll con easing suave,
 *    aparece al scroll y se desvanece solo; crece y brilla al hover.
 *  - Interactiva: se puede ARRASTRAR, y clic en la pista salta de página
 *    con desplazamiento suave.
 *  - Los contenedores internos (modales, drawers de security, listas)
 *    conservan su barra nativa pero re-pintada al tema (fina, púrpura al hover).
 *  - CERO dependencias: sin SCSOC ni Firebase. En móvil/touch no dibuja
 *    nada (el scroll de toque no tiene barra). Respeta prefers-reduced-motion.
 *  - A prueba de fallos: la barra nativa del documento SOLO se oculta
 *    cuando move.js ya montó todo. Si el script falla, nunca te quedas
 *    sin scrollbar.
 * ==== */
(function (window, document) {
    'use strict';

    if (window.__SCMOVE__) return;
    window.__SCMOVE__ = true;

    var root = document.documentElement;

    var reduced = false, coarse = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

    /* ==== CSS global (inyectado) ==== */
    function injectCss() {
        var st = document.createElement('style');
        st.setAttribute('data-scmove', '1');
        st.textContent = ''
            /* -- Barras nativas de contenedores INTERNOS, al tema de la web -- */
            + '.scm-theming *::-webkit-scrollbar{width:10px;height:10px;}'
            + '.scm-theming *::-webkit-scrollbar-track{background:transparent;}'
            + '.scm-theming *::-webkit-scrollbar-thumb{background:#332a4d;border:3px solid transparent;background-clip:padding-box;border-radius:999px;}'
            + '.scm-theming *::-webkit-scrollbar-thumb:hover{background:#8b5cf6;}'
            + '.scm-theming *::-webkit-scrollbar-corner{background:transparent;}'
            + '.scm-theming *{scrollbar-color:#332a4d transparent;scrollbar-width:thin;}'
            /* -- La barra del DOCUMENTO se oculta solo cuando MOVE ya corre -- */
            + 'html.scm-on::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}'
            + 'html.scm-on{scrollbar-width:none;-ms-overflow-style:none;}'
            /* -- Barra personalizada del documento -- */
            + '.scm-bar{position:fixed;top:0;right:0;bottom:0;width:14px;z-index:2147483020;opacity:0;transition:opacity .35s ease;pointer-events:none;will-change:opacity;}'
            + '.scm-bar.scm-vis{opacity:1;pointer-events:auto;}'
            + '.scm-track{position:absolute;top:6px;right:2px;bottom:6px;width:10px;border-radius:999px;background:rgba(139,92,246,.09);box-shadow:inset 0 0 0 1px rgba(139,92,246,.13);opacity:0;transition:opacity .25s ease;}'
            + '.scm-bar.scm-hover .scm-track,.scm-bar.scm-drag .scm-track{opacity:1;}'
            + '.scm-thumb{position:absolute;top:6px;right:3px;width:8px;height:46px;border-radius:999px;background:#8b5cf6;box-shadow:0 0 10px rgba(139,92,246,.45);opacity:.85;cursor:grab;touch-action:none;will-change:transform;transition:width .22s cubic-bezier(.2,.8,.2,1),right .22s cubic-bezier(.2,.8,.2,1),opacity .25s ease,background .25s ease,box-shadow .25s ease;}'
            + '.scm-bar.scm-hover .scm-thumb{right:2px;width:10px;opacity:1;background:#a78bfa;box-shadow:0 0 16px rgba(139,92,246,.65);}'
            + '.scm-bar.scm-drag .scm-thumb{background:#c4b5fd;box-shadow:0 0 22px rgba(139,92,246,.85);cursor:grabbing;}'
            + 'body.scm-nosel{user-select:none;-webkit-user-select:none;}'
            + '@media (prefers-reduced-motion:reduce){.scm-bar,.scm-track,.scm-thumb{transition:none!important;}}';
        document.head.appendChild(st);
    }

    /* ==== ESTADO ==== */
    var bar, thumb;
    var sc = null;                       /* el scroller del documento */
    var awake = false, rafId = 0;        /* bucle de animación bajo demanda */
    var visible = false, hover = false, dragging = false, active = false;
    var curY = -1, targetY = 0, thumbH = 46;
    var hideTimer = 0, dragGuard = 0;

    function setVis(v) {
        if (v === visible) return;
        visible = v;
        if (v) bar.classList.add('scm-vis'); else bar.classList.remove('scm-vis');
    }
    function pulse() {          /* aparece y reinicia su auto-desvanecer */
        active = true;
        setVis(true);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { active = false; maybeHide(); }, 800);
    }
    function maybeHide() {
        if (!active && !hover && !dragging) setVis(false);
    }

    /* ==== MEDIR + ANIMAR (lerp: el pulido persigue al scroll) ==== */
    function compute() {
        if (!sc) return;
        var view = sc.clientHeight;
        var total = sc.scrollHeight;
        var max = total - view;
        if (max <= 2) { setVis(false); return; }   /* no hay nada que scrollear */

        var hMax = view - 12;                       /* pista: 6px arriba y abajo */
        var h = view * (view / Math.max(total, 1)); /* pulido proporcional */
        h = Math.max(46, Math.min(hMax, h));
        if (Math.abs(h - thumbH) > 0.5) { thumbH = h; thumb.style.height = h.toFixed(2) + 'px'; }

        var travel = hMax - thumbH;
        targetY = max > 0 ? (sc.scrollTop / max) * travel : 0;

        if (dragging || reduced || curY < 0) curY = targetY;
        else {
            curY += (targetY - curY) * 0.24;
            if (Math.abs(targetY - curY) < 0.35) curY = targetY;
        }
        thumb.style.transform = 'translateY(' + curY.toFixed(2) + 'px)';
    }

    function tick() {
        rafId = 0;
        compute();
        if (visible || hover || dragging) rafId = requestAnimationFrame(tick);
        else awake = false;                      /* a dormir: cero CPU en reposo */
    }
    function wake() {
        awake = true;
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

    /* ==== INTERACCIÓN: drag + clic en pista + hover ==== */
    function bindDrag() {
        var startY = 0, startTop = 0;

        thumb.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragging = true;
            dragGuard = Date.now();
            startY = e.clientY;
            startTop = sc.scrollTop;
            bar.classList.add('scm-drag');
            document.body.classList.add('scm-nosel');
            try { thumb.setPointerCapture(e.pointerId); } catch (err) {}
            e.preventDefault();
        });
        thumb.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var view = sc.clientHeight, total = sc.scrollHeight, max = total - view;
            if (max <= 2) return;
            var travel = (view - 12) - thumbH;
            var dy = e.clientY - startY;
            sc.scrollTop = startTop + dy * (max / Math.max(travel, 1));
        });
        function endDrag() {
            if (!dragging) return;
            dragging = false;
            dragGuard = Date.now();
            bar.classList.remove('scm-drag');
            document.body.classList.remove('scm-nosel');
            pulse(); maybeHide();
        }
        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);

        /* clic en la pista (no en el pulido): salto de página suave */
        bar.addEventListener('click', function (e) {
            if (dragging || Date.now() - dragGuard < 150) return;
            if (e.target === thumb) return;
            var max = sc.scrollHeight - sc.clientHeight;
            if (max <= 2) return;
            var rect = bar.getBoundingClientRect();
            var dir = e.clientY > rect.top + rect.height / 2 ? 1 : -1;
            try {
                window.scrollBy({ top: dir * sc.clientHeight * 0.85, behavior: reduced ? 'auto' : 'smooth' });
            } catch (err) { window.scrollBy(0, dir * sc.clientHeight * 0.85); }
            pulse();
        });

        bar.addEventListener('pointerenter', function () { hover = true; bar.classList.add('scm-hover'); wake(); });
        bar.addEventListener('pointerleave', function () { hover = false; bar.classList.remove('scm-hover'); maybeHide(); });
    }

    function bind() {
        window.addEventListener('scroll', function () { wake(); pulse(); }, { passive: true });
        window.addEventListener('resize', function () { wake(); pulse(); });
        /* API mínima para tus files: SCSOC no requerido, pero se lleva bien */
        window.SCMOVE = { refresh: function () { wake(); pulse(); } };
    }

    /* ==== ARRANQUE ==== */
    function init() {
        if (!document.body) { document.addEventListener('DOMContentLoaded', init); return; }
        injectCss();
        root.classList.add('scm-theming');

        if (coarse) return;   /* móvil/touch: scroll nativo, no se dibuja nada */

        bar = document.createElement('div');
        bar.className = 'scm-bar';
        bar.setAttribute('aria-hidden', 'true');
        thumb = document.createElement('div');
        thumb.className = 'scm-thumb';
        bar.appendChild(thumb);
        document.body.appendChild(bar);

        sc = document.scrollingElement || root;

        /* Recién AHORA escondemos la barra nativa del documento */
        root.classList.add('scm-on');

        bind(); bindDrag();
        wake();   /* posiciona el pulido si el navegador restauró el scroll */
        console.log('[Stevscon] move.js listo (v1) — barra MOVE activa en todo el sitio.');
    }
    init();
})(window, document);