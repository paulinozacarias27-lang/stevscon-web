/**
 * ====
 * STEVSCON.COM — social/move.js (v2)
 * MOVE — La barra de scroll del sitio (adiós línea blanca del navegador)
 *
 *  - Cárgalo en TODAS las páginas (index, social, profiles…). Pinta la
 *    barra del documento al estilo de la web: púrpura, redondeada, con glow.
 *  - NUEVO v2: si la página no scrollea en el documento sino en una capa
 *    interna GRANDE (como la página Social de social.html), MOVE la ADOPTA:
 *    esconde su barra nativa y la misma barra púrpura sigue al feed.
 *  - NUEVO v3: la barra SIGUE a cualquier panel interno que el usuario
 *    scrollee (chats MD, paneles de seguridad, reportes, listas grandes):
 *    al scrollear un panel adoptable, MOVE cambia a ese panel al instante.
 *    Además ESCANEA las capas de la página (al abrir, al cerrar, en resize
 *    y con un MutationObserver): la barra aparece ANTES del primer scroll
 *    y se libera sola cuando el panel se cierra o se esconde.
 *  - Animación fluida: el pulido PERSIGUE el scroll con easing suave,
 *    aparece al scroll y se desvanece solo; crece y brilla al hover.
 *  - Interactiva: se puede ARRASTRAR, y clic en la pista salta de página
 *    con desplazamiento suave.
 *  - Los contenedores internos pequeños (modales, drawers, listas)
 *    conservan su barra nativa pero re-pintada al tema (fina, púrpura al hover).
 *  - CERO dependencias: sin SCSOC ni Firebase. En móvil/touch no dibuja
 *    nada (el scroll de toque no tiene barra). Respeta prefers-reduced-motion.
 *  - A prueba de fallos: la barra nativa del documento SOLO se oculta
 *    cuando move.js ya montó todo. Si el script falla, nunca te quedas
 *    sin scrollbar.
 * ====
 */
(function (window, document) {
    'use strict';

    if (window.__SCMOVE__) return;
    window.__SCMOVE__ = true;

    var root = document.documentElement;

    var reduced = false, coarse = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

    function injectCss() {
        var st = document.createElement('style');
        st.setAttribute('data-scmove', '1');
        st.textContent = ''
            + '.scm-theming *::-webkit-scrollbar{width:10px;height:10px;}'
            + '.scm-theming *::-webkit-scrollbar-track{background:transparent;}'
            + '.scm-theming *::-webkit-scrollbar-thumb{background:#332a4d;border:3px solid transparent;background-clip:padding-box;border-radius:999px;}'
            + '.scm-theming *::-webkit-scrollbar-thumb:hover{background:#8b5cf6;}'
            + '.scm-theming *::-webkit-scrollbar-corner{background:transparent;}'
            + '.scm-theming *{scrollbar-color:#332a4d transparent;scrollbar-width:thin;}'
            + 'html.scm-on::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}'
            + 'html.scm-on{scrollbar-width:none;-ms-overflow-style:none;}'
            + '.scm-hidesb{scrollbar-width:none!important;-ms-overflow-style:none!important;}'
            + '.scm-hidesb::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}'
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

    var bar, thumb;
    var sc = null, doc = null;
    var adopted = false;
    var awake = false, rafId = 0;
    var visible = false, hover = false, dragging = false, active = false;
    var curY = -1, targetY = 0, thumbH = 46;
    var hideTimer = 0, dragGuard = 0;

    function setVis(v) {
        if (v === visible) return;
        visible = v;
        if (v) bar.classList.add('scm-vis'); else bar.classList.remove('scm-vis');
    }
    function pulse() {
        active = true;
        setVis(true);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { active = false; maybeHide(); }, 800);
    }
    function maybeHide() {
        if (!active && !hover && !dragging) setVis(false);
    }

    function docMax() { return doc.scrollHeight - doc.clientHeight; }
    function adoptable(el) {
        if (!el || el.nodeType !== 1 || el === doc || el === document.body) return false;
        try {
            var r = el.getBoundingClientRect();
            if (!r.width || !r.height) return false;
            if (r.height < window.innerHeight * 0.45) return false;
            if (r.left >= window.innerWidth || r.top >= window.innerHeight || r.right <= 0 || r.bottom <= 0) return false;
        } catch (e) { return false; }
        return el.scrollHeight - el.clientHeight > 2;
    }
    function adopt(el) {
        if (sc === el) return;
        if (sc && adopted) sc.classList.remove('scm-hidesb');
        adopted = !!el;
        sc = el || doc;
        if (adopted) sc.classList.add('scm-hidesb');
        curY = -1;
    }
    function scan() {
        if (docMax() > 2) return;
        if (adopted && adoptable(sc)) return;
        var best = null, bestH = 0;
        try {
            var els = document.querySelectorAll('div,section,aside,main,ul,ol');
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                if (!adoptable(el)) continue;
                var oy = '';
                try { oy = getComputedStyle(el).overflowY; } catch (err) {}
                if (oy !== 'auto' && oy !== 'scroll') continue;
                var r = el.getBoundingClientRect();
                if (r.height > bestH) { bestH = r.height; best = el; }
            }
        } catch (e) {}
        if (best) adopt(best);
    }
    function release() {
        if (adopted) adopt(null);
        scan();
    }
    function onScroll(e) {
        var t = e.target;
        var isDoc = (t === document || t === document.documentElement || t === window);
        if (isDoc) {
            if (adopted && docMax() > 2) release();
        } else if (adopted && t !== sc && adoptable(t)) {
            adopt(t);
        } else if (adopted && t === sc && !adoptable(sc)) {
            release();
        } else if (!adopted && docMax() <= 2 && adoptable(t)) {
            adopt(t);
        }
        wake(); pulse();
    }

    function compute() {
        if (!sc) return;
        if (adopted && sc.scrollHeight - sc.clientHeight <= 2) release();

        var view = sc.clientHeight;
        var total = sc.scrollHeight;
        var max = total - view;
        if (max <= 2) { setVis(false); return; }

        var hMax = view - 12;
        var h = view * (view / Math.max(total, 1));
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
        else awake = false;
    }
    function wake() {
        awake = true;
        if (!rafId) rafId = requestAnimationFrame(tick);
    }

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

        bar.addEventListener('click', function (e) {
            if (dragging || Date.now() - dragGuard < 150) return;
            if (e.target === thumb) return;
            var max = sc.scrollHeight - sc.clientHeight;
            if (max <= 2) return;
            var rect = bar.getBoundingClientRect();
            var dir = e.clientY > rect.top + rect.height / 2 ? 1 : -1;
            var step = dir * sc.clientHeight * 0.85;
            try { sc.scrollBy({ top: step, behavior: reduced ? 'auto' : 'smooth' }); }
            catch (err) { sc.scrollTop += step; }
            pulse();
        });

        bar.addEventListener('pointerenter', function () { hover = true; bar.classList.add('scm-hover'); wake(); });
        bar.addEventListener('pointerleave', function () { hover = false; bar.classList.remove('scm-hover'); maybeHide(); });
    }

    function bind() {
        document.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', function () { wake(); pulse(); scan(); });
        var mutTimer = 0;
        try {
            new MutationObserver(function (recs) {
                for (var i = 0; i < recs.length; i++) {
                    var tg = recs[i].target;
                    if (tg && tg.nodeType === 1 && (tg === bar || (bar && bar.contains(tg)))) return;
                }
                clearTimeout(mutTimer);
                mutTimer = setTimeout(function () {
                    if (sc && adopted && !adoptable(sc)) { adopt(null); scan(); }
                    else if (!adopted && docMax() <= 2) scan();
                    wake();
                }, 150);
            }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
        } catch (e) {}
        window.SCMOVE = { refresh: function () { scan(); wake(); pulse(); } };
    }

    function init() {
        if (!document.body) { document.addEventListener('DOMContentLoaded', init); return; }
        injectCss();
        root.classList.add('scm-theming');

        if (coarse) return;

        bar = document.createElement('div');
        bar.className = 'scm-bar';
        bar.setAttribute('aria-hidden', 'true');
        thumb = document.createElement('div');
        thumb.className = 'scm-thumb';
        bar.appendChild(thumb);
        document.body.appendChild(bar);

        doc = document.scrollingElement || root;
        sc = doc;

        root.classList.add('scm-on');

        bind(); bindDrag();
        wake(); scan();
        console.log('[Stevscon] move.js listo (v3) — barra MOVE activa (documento + paneles internos).');
    }
    init();
})(window, document);