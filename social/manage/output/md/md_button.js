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
    let btn = null, badge = null, offInbox = null;
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

    /* pinta el badge con el último total conocido (aunque el botón sea nuevo) */
    function paintBadge() {
        if (!badge) return;
        badge.textContent = lastTotal > 99 ? '99+' : String(lastTotal);
        badge.classList.toggle('scdm-show', lastTotal > 0);
    }

    /* ==== inyección del botón en el header de la página Social ==== */
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
        paintBadge(); /* FIX: nace con lo que ya se sabía */
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

    /* FIX: si la página Social ya estaba abierta al cargar (orden raro de
       scripts o recarga), no esperamos ningún evento: nos inyectamos ya. */
    injectCss();
    (function bootWait() {
        if (ensureBtn()) return;
        let tries = 0;
        if (++tries < 200) setTimeout(bootWait, 150);
    })();

    /* si la página Social se cierra, el drawer también */
    document.addEventListener('sc:social-closed', function () {
        if (SCSOC.dmUI) { try { SCSOC.dmUI.close(); } catch (e) {} }
    });

    /* ==== badge EN VIVO (requiere sesión) ==== */
    function startBadge() {
        if (offInbox || !SCSOC.dm || !SCSOC.dm.watchInbox) return;
        offInbox = SCSOC.dm.watchInbox(function (list) {
            lastTotal = SCSOC.dm.unreadTotal(list);
            paintBadge(); /* FIX: ya no depende de que el botón exista */
        });
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

    /* ==== «Mensaje» en el panel de perfil (hook defensivo) ==== */
    function addProfileBtn(uid, host) {
        if (!host || host.nodeType !== 1) return;
        if (host.querySelector('[data-scdm-prof="' + uid + '"]')) return;
        const meU = firebase.auth().currentUser;
        if (!meU || meU.uid === uid) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'scdm-profbtn';
        b.setAttribute('data-scdm-prof', uid);
        const ic = document.createElement('i');
        ic.className = 'fa-solid fa-paper-plane';
        const sp = document.createElement('span');
        sp.textContent = 'Mensaje';
        b.appendChild(ic); b.appendChild(sp);
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            SCSOC.dm.open(uid, function (convId) {
                SCSOC.dmUI.open();
                SCSOC.dmUI.openConv(convId, uid);
            });
        });
        host.appendChild(b);
    }

    function hookProfile() {
        if (!SCSOC.onHook) return false;
        SCSOC.onHook('profilePanel', function () {
            const args = Array.prototype.slice.call(arguments);
            let uid = null, host = null;
            args.forEach(function (a) {
                if (typeof a === 'string' && a.length > 8 && !uid) uid = a;
                else if (a && a.nodeType === 1 && !host) host = a;
                else if (a && typeof a === 'object') {
                    if (a.uid && !uid) uid = a.uid;
                    if (a.cardHost && a.cardHost.nodeType === 1) host = a.cardHost;
                    else if (a.modal && a.modal.nodeType === 1) host = a.modal;
                }
            });
            if (!uid) return;
            addProfileBtn(uid, host);
        });
        return true;
    }
    (function waitHook() {
        if (hookProfile()) return;
        setTimeout(waitHook, 300);
    })();

    console.log('[Stevscon] md_button.js listo (v2) — badge a prueba de todo: late-inject + auto-boot + reset.');
})(window, document);