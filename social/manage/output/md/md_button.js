/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_button.js (v2)
 * BOTÓN CIRCULAR de MD + badge rojo estilo Discord (99+) + «Mensaje».
 * v2: FIX NOTIFICACIONES —
 *  - El badge ya NO pierde datos si el botón aún no existía: el total
 *    se guarda en lastTotal y se pinta en cuanto el botón nace.
 *  - Auto-inyección al cargar si la página Social ya está abierta.
 *  - Reset de badge al cerrar sesión.
 * Cargar AL FINAL del bloque md (después de md_ui.js).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmButton) return;

    const B = SCSOC.dmButton = {};
    let btn = null, badge = null, offInbox = null, badgeOff = false;
    let lastTotal = 0;

    function injectCss() {
        if (document.querySelector('style[data-scdmb]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scdmb', '1');
        css.textContent = ''
            + '.scdm-fab{position:relative;flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:var(--text-muted,#94a3b8);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:15px;transition:background .18s ease,color .18s ease,transform .18s ease,border-color .18s ease;padding:0;}'
            + '.scdm-fab:hover{background:rgba(139,92,246,.16);color:var(--purple-accent,#8b5cf6);border-color:rgba(139,92,246,.55);}'
            + '.scdm-fab:active{transform:scale(.93);}'
            + '.scdm-fabdot{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font:800 9.5px Inter,sans-serif;display:none;align-items:center;justify-content:center;border:2px solid var(--bg-main,#0d0b14);box-sizing:content-box;line-height:1;}'
            + '.scdm-fabdot.scdm-show{display:inline-flex;}'
            + '.scdm-profbtn{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(139,92,246,.55);background:rgba(139,92,246,.14);color:#c4b5fd;font:800 12px Inter,sans-serif;padding:8px 14px;border-radius:999px;cursor:pointer;transition:background .18s ease;}'
            + '.scdm-profbtn:hover{background:rgba(139,92,246,.26);}';
        document.head.appendChild(css);
    }

    function paintBadge() {
        if (!badge) return;
        badge.textContent = lastTotal > 99 ? '99+' : String(lastTotal);
        badge.classList.toggle('scdm-show', lastTotal > 0);
    }

    function ensureBtn() {
        if (btn && btn.parentNode) return true;
        const page = document.getElementById('scsoc-social-page');
        if (!page) return false;
        const header = page.firstElementChild;
        if (!header) return false;
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scdm-fab';
        btn.title = 'Mensajes Directos';
        btn.setAttribute('aria-label', 'Mensajes Directos');
        const ic = document.createElement('i');
        ic.className = 'fa-solid fa-comment-dots';
        btn.appendChild(ic);
        badge = document.createElement('span');
        badge.className = 'scdm-fabdot';
        btn.appendChild(badge);
        paintBadge();
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            SCSOC.dmUI.open();
        });
        const live = header.querySelector('.scsoc-live-dot');
        const anchor = live ? live.parentNode : null;
        if (anchor && anchor.parentNode === header) header.insertBefore(btn, anchor);
        else header.appendChild(btn);
        return true;
    }

    document.addEventListener('sc:social-opened', function () {
        injectCss();
        let tries = 0;
        (function waitHead() {
            if (ensureBtn()) return;
            if (++tries < 200) setTimeout(waitHead, 120);
        })();
    });

    injectCss();
    (function bootWait() {
        if (ensureBtn()) return;
        let tries = 0;
        if (++tries < 200) setTimeout(bootWait, 150);
    })();

    document.addEventListener('sc:social-closed', function () {
        if (SCSOC.dmUI) { try { SCSOC.dmUI.close(); } catch (e) {} }
    });

    function startBadge() {
        if (offInbox || !SCSOC.dm || !SCSOC.dm.watchInbox) return;
        offInbox = SCSOC.dm.watchInbox(function (list) {
            lastTotal = SCSOC.dm.unreadTotal(list);
            if (!badgeOff) paintBadge();
            else if (badge) badge.classList.remove('scdm-show');
        });
        if (SCSOC.dm.watchMyPrefs) {
            SCSOC.dm.watchMyPrefs(function (p) {
                badgeOff = !!(p && p.mdBadge === 'no');
                if (badgeOff) { if (badge) badge.classList.remove('scdm-show'); }
                else paintBadge();
            });
        }
    }
    (function waitDm() {
        if (window.firebase && SCSOC.dm && SCSOC.dmUI) {
            try {
                firebase.auth().onAuthStateChanged(function (u) {
                    if (u) startBadge();
                    else {
                        lastTotal = 0;
                        if (badge) badge.classList.remove('scdm-show');
                        if (offInbox) { try { offInbox(); } catch (e) {} offInbox = null; }
                    }
                });
            } catch (e) { console.warn('[MD] badge auth:', e); }
        } else setTimeout(waitDm, 150);
    })();


    console.log('[Stevscon] md_button.js listo (v2) — badge a prueba de todo: late-inject + auto-boot + reset.');
})(window, document);