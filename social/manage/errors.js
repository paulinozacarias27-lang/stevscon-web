/**
 * ====
 * STEVSCON.COM - social/manage/category_social.js (v1)
 * Coordinador visual de ENTRADA a la categoria SOCIAL.
 * - Pestaña/botón FIJO en el lado IZQUIERDO de la pantalla.
 * - Animación simple y bonita: al pasar el mouse se despliega hacia
 *   la derecha (->) revelando el texto "Social", con brillo morado.
 * - Click: abre la página Social (category_posts.js -> SCSOC.pages).
 * - Visible para TODOS: los visitantes pueden VER el feed (no tocar;
 *   errors.js y el core se encargan de negarles la interacción).
 * - Se esconde solo mientras la página Social está abierta
 *   (escucha 'sc:social-opened' y 'sc:social-closed').
 * Cargar DESPUÉS de los files core del social (numbers, utils, etc.).
 * ====
 */
(function (window, document) {
    'use strict';

    const TAB_ID = 'scsoc-social-tab';

    /* ---- Estilos propios (prefijo scsoc- para no pisar NADA) ---- */
    const CSS = [
        '#' + TAB_ID + ' {',
        '  position: fixed; left: 0; top: 50%; z-index: 1200;',
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
        '  animation: scsoc-pulse 3.2s ease-in-out infinite;',
        '}',
        '#' + TAB_ID + ':hover {',
        '  width: 178px; transform: translateY(-50%) translateX(5px); animation: none;',
        '  box-shadow: 0 10px 34px var(--purple-glow, rgba(139, 92, 246, .55));',
        '}',
        '#' + TAB_ID + ' .scsoc-tab-icon { font-size: 20px; flex: none; }',
        '#' + TAB_ID + ' .scsoc-tab-label {',
        '  margin-left: 12px; font-size: 14px; font-weight: 800; letter-spacing: .6px;',
        '  white-space: nowrap; opacity: 0; transform: translateX(-10px);',
        '  transition: opacity .25s ease .1s, transform .32s cubic-bezier(.22, 1, .36, 1) .1s;',
        '}',
        '#' + TAB_ID + ':hover .scsoc-tab-label { opacity: 1; transform: translateX(0); }',
        '#' + TAB_ID + '.is-hidden {',
        '  transform: translateY(-50%) translateX(-115%); opacity: 0; pointer-events: none;',
        '}',
        '@keyframes scsoc-pulse {',
        '  0%, 100% { box-shadow: 0 6px 22px var(--purple-glow, rgba(139, 92, 246, .35)); }',
        '  50%      { box-shadow: 0 6px 30px rgba(139, 92, 246, .65); }',
        '}',
        '@media (max-width: 640px) {',
        '  #' + TAB_ID + ' { height: 50px; width: 50px; padding: 0 15px; }',
        '  #' + TAB_ID + ':hover { width: 156px; }',
        '}'
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('scsoc-category-social-style')) return;
        const st = document.createElement('style');
        st.id = 'scsoc-category-social-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ---- Toast global (mismo estilo de category_acc.js) ---- */
    function showToast(msg, kind) {
        const wrap = document.getElementById('alerts-container');
        if (!wrap) return;
        const t = document.createElement('div');
        t.className = 'toast ' + (kind === 'error' ? 'toast-error' : 'toast-success');
        const icon = document.createElement('i');
        icon.className = kind === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
        const text = document.createElement('span');
        text.textContent = msg;
        t.appendChild(icon);
        t.appendChild(text);
        wrap.appendChild(t);
        setTimeout(function () {
            t.classList.add('toast-out');
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
        }, 4500);
    }

    /* ---- La pestaña ---- */
    function buildTab() {
        if (document.getElementById(TAB_ID)) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.id = TAB_ID;
        b.title = 'Social';
        b.setAttribute('aria-label', 'Abrir Social');

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-comments scsoc-tab-icon';

        const label = document.createElement('span');
        label.className = 'scsoc-tab-label';
        label.textContent = 'Social';

        b.appendChild(icon);
        b.appendChild(label);
        b.addEventListener('click', function () {
            const S = window.SCSOC;
            if (S && S.pages && typeof S.pages.open === 'function') { S.pages.open(); return; }
            showToast('No pudimos abrir Social: falta category_posts.js. Revisa el index.', 'error');
        });
        document.body.appendChild(b);
    }

    /* ---- Se esconde mientras la página Social está abierta ---- */
    function watchPageEvents() {
        document.addEventListener('sc:social-opened', function () {
            const t = document.getElementById(TAB_ID);
            if (t) t.classList.add('is-hidden');
        });
        document.addEventListener('sc:social-closed', function () {
            const t = document.getElementById(TAB_ID);
            if (t) t.classList.remove('is-hidden');
        });
    }

    /* ---- Init ---- */
    function init() {
        injectStyles();
        buildTab();
        watchPageEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Stevscon] category_social.js listo (v1) — pestaña Social a la izquierda.');
})(window, document);