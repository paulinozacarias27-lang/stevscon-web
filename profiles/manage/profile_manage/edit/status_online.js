/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/edit/status_online.js
 * ONLINE STATUS · CEREBRO (cargar DESPUÉS de los 4 files de
 * online_status/ y DESPUÉS de utils/ui_profile.js).
 *
 * - Envuelve SCp.ui.renderProfileCard: cada vez que "Ver perfil" pinta
 *   la tarjeta, le pega el BADGE de estado a la esquina del avatar.
 * - CLIC en el avatar → panel estilo Discord con animación fluida hacia
 *   arriba → clic en un estado → cambia AL INSTANTE (Firebase).
 * - Firebase: users/{uid}/status = { state, manual, updated }.
 *     state  → lo que todos ven.
 *     manual → lo que TÚ elegiste (se restaura al volver la actividad).
 * - onDisconnect(): si cierras la web, Firebase te pone Desconectado.
 * - offline.js dispara 'sc:status-auto' (away/back) y este file escribe.
 * - Ocupado y Desconectado elegidos a mano NUNCA se sobreescriben solos.
 * - Todo con createElement/textContent: cero innerHTML, cero XSS.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCST = window.StevsconStatus = window.StevsconStatus || {};
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};

    const ORDER = ['online', 'inactive', 'busy', 'offline'];
    const PANEL_W = 236;
    const RING = '#1a1625'; // color de la tarjeta: el aro del badge

    let authUser = null;
    let statusRef = null;
    let connectedRef = null;
    let detachValue = null;
    let cached = { state: 'online', manual: 'online' };
    let panelEl = null;
    let panelAnchor = null;
    let outsideHandler = null;
    let escHandler = null;
    const badges = new Set();   // badges vivos en el DOM
    const rows = {};            // filas del panel por id de estado

    /* ==== Puentes Firebase ==== */

    function fb() { return (typeof window.StevsconFirebase !== 'undefined') ? window.StevsconFirebase : null; }

    function db() {
        const F = fb();
        if (F && F.database && typeof F.database.ref === 'function') return F.database;
        if (typeof firebase !== 'undefined' && firebase.database) return firebase.database();
        return null;
    }

    function authObj() {
        const F = fb();
        if (F && F.auth) return F.auth;
        if (typeof firebase !== 'undefined' && firebase.auth) return firebase.auth();
        return null;
    }

    function TS() {
        try { return firebase.database.ServerValue.TIMESTAMP; } catch (e) { return Date.now(); }
    }

    function def(id) {
        for (let i = 0; i < SCST.states.length; i++) {
            if (SCST.states[i].id === id) return SCST.states[i];
        }
        return null;
    }

    function fallbackDef() { return def(cached.state) || def('offline') || (SCST.states[0] || null); }

    // Lo que DEBERÍA verse según tu elección manual + la inactividad.
    function effectiveWant() {
        const m = cached.manual || 'online';
        if (m === 'busy' || m === 'offline') return m;          // elegidos a mano: sagrados
        if (SCST.auto && SCST.auto.isAway && SCST.auto.isAway()) return 'offline';
        return m;
    }

    /* ==== BADGES ==== */

    function setIcon(badge, stateId) {
        const d = def(stateId) || fallbackDef();
        if (!d) return;
        badge.dataset.state = d.id;
        while (badge.firstChild) badge.removeChild(badge.firstChild);
        const px = parseInt(badge.dataset.iconPx || '14', 10);
        badge.appendChild(d.icon(px));
    }

    function repaintBadges() {
        badges.forEach(function (b) {
            if (!b.isConnected) { badges.delete(b); return; }
            setIcon(b, cached.state);
        });
    }

    function makeBadge(px) {
        const badge = document.createElement('span');
        badge.dataset.scStatusBadge = '1';
        badge.dataset.iconPx = String(Math.round(px * 0.62));
        badge.style.cssText = 'position:absolute;right:-2px;bottom:-2px;width:' + px + 'px;height:' + px + 'px;' +
            'background:' + RING + ';border:2.5px solid ' + RING + ';border-radius:50%;' +
            'display:flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;box-sizing:border-box;';
        badges.add(badge);
        return badge;
    }

    /* ==== PANEL ESTILO DISCORD ==== */

    function refreshPanelChecks() {
        ORDER.forEach(function (id) {
            const row = rows[id];
            if (!row) return;
            const isCurrent = (cached.state === id);
            row.check.style.visibility = isCurrent ? 'visible' : 'hidden';
            row.el.style.background = isCurrent ? 'rgba(139,92,246,.16)' : 'transparent';
        });
    }

    function closePanel() {
        if (!panelEl) return;
        const p = panelEl;
        panelEl = null;
        panelAnchor = null;
        if (outsideHandler) { document.removeEventListener('pointerdown', outsideHandler, true); outsideHandler = null; }
        if (escHandler) { document.removeEventListener('keydown', escHandler, true); escHandler = null; }
        try {
            p.animate(
                [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(8px) scale(.97)' }],
                { duration: 120, easing: 'ease-out' }
            );
        } catch (e) { /* sin animación de cierre */ }
        setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 130);
    }

    function openPanel(anchor) {
        if (panelEl) { closePanel(); return; }
        if (!SCST.states.length) {
            console.error('[Stevscon Status] No hay estados registrados: ¿cargan online/inactive/busy/offline.js antes de status_online.js?');
            return;
        }

        panelAnchor = anchor;
        panelEl = document.createElement('div');
        panelEl.dataset.scStatusPanel = '1';
        panelEl.style.cssText = 'position:fixed;z-index:2600;width:' + PANEL_W + 'px;background:#1a1625;' +
            'border:1px solid #2e2440;border-radius:12px;padding:10px;font-family:Inter,sans-serif;color:#ede9fe;' +
            'box-shadow:0 14px 40px rgba(0,0,0,.55);transform-origin:bottom left;';

        const eyebrow = document.createElement('p');
        eyebrow.textContent = 'ESTADO';
        eyebrow.style.cssText = 'margin:2px 6px 8px;font-size:10.5px;font-weight:800;letter-spacing:.12em;color:#a78bfa;';
        panelEl.appendChild(eyebrow);

        ORDER.forEach(function (id) {
            const d = def(id);
            if (!d) return;

            const row = document.createElement('button');
            row.type = 'button';
            row.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;background:transparent;' +
                'border:0;border-radius:9px;padding:9px 10px;cursor:pointer;text-align:left;transition:background .15s ease;';

            const ic = document.createElement('span');
            ic.style.cssText = 'width:22px;height:22px;flex:none;display:flex;align-items:center;justify-content:center;';
            ic.appendChild(d.icon(18));

            const lb = document.createElement('span');
            lb.textContent = d.label;
            lb.style.cssText = 'flex:1;font-size:13.5px;font-weight:600;color:#ede9fe;';

            const ck = document.createElement('i');
            ck.className = 'fa-solid fa-check';
            ck.style.cssText = 'color:#a78bfa;font-size:12px;';

            row.appendChild(ic);
            row.appendChild(lb);
            row.appendChild(ck);

            row.addEventListener('mouseenter', function () {
                if (cached.state !== id) row.style.background = 'rgba(139,92,246,.15)';
            });
            row.addEventListener('mouseleave', function () {
                row.style.background = (cached.state === id) ? 'rgba(139,92,246,.16)' : 'transparent';
            });
            row.addEventListener('click', function (e) {
                e.stopPropagation();
                choose(id);
                closePanel();
            });

            rows[id] = { el: row, check: ck };
            panelEl.appendChild(row);
        });

        document.body.appendChild(panelEl);
        refreshPanelChecks();

        // ---- Posición: anclado al avatar, sin salirse de la pantalla ----
        const r = anchor.getBoundingClientRect();
        let left = Math.max(12, Math.min(r.left, window.innerWidth - PANEL_W - 12));
        let top = r.bottom + 10;
        panelEl.style.left = left + 'px';
        panelEl.style.top = top + 'px';
        const ph = panelEl.offsetHeight || 240;
        if (top + ph > window.innerHeight - 12) {
            top = Math.max(12, r.top - ph - 10);
            panelEl.style.top = top + 'px';
            panelEl.style.transformOrigin = 'top left';
        }

        // ---- Animación fluida hacia arriba ----
        try {
            panelEl.animate(
                [{ opacity: 0, transform: 'translateY(14px) scale(.95)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
                { duration: 190, easing: 'cubic-bezier(.2,.8,.3,1.12)' }
            );
        } catch (e) { /* navegador viejo: se muestra sin animación */ }

        // Cerrar: clic afuera o Escape
        outsideHandler = function (e) {
            if (!panelEl) return;
            const t = e.target;
            if (panelEl.contains(t)) return;
            if (panelAnchor && panelAnchor.contains(t)) return;
            closePanel();
        };
        escHandler = function (e) { if (e.key === 'Escape') closePanel(); };
        document.addEventListener('pointerdown', outsideHandler, true);
        document.addEventListener('keydown', escHandler, true);
    }

    function choose(id) {
        const d = def(id);
        if (!d || !statusRef) return;
        cached = { state: id, manual: id };
        if (SCST.auto && SCST.auto.poke) SCST.auto.poke(); // silencioso: sin 'back' fantasma
        repaintBadges();
        statusRef.update({ state: id, manual: id, updated: TS() })
            .catch(function (err) { console.error('[Stevscon Status] No se pudo guardar el estado:', err); });
        document.dispatchEvent(new CustomEvent('sc:status-changed', {
            detail: { uid: authUser ? authUser.uid : null, state: id }
        }));
    }

    /* ==== CONEXIÓN FIREBASE ==== */

    function armDisconnect() {
        if (!statusRef) return;
        try { statusRef.onDisconnect().update({ state: 'offline', updated: TS() }); }
        catch (e) { console.error('[Stevscon Status] onDisconnect falló:', e); }
    }

    function onValue(snap) {
        const v = snap.val() || {};
        cached = { state: v.state || 'online', manual: v.manual || v.state || 'online' };
        repaintBadges();
        if (panelEl) refreshPanelChecks();
        // Auto-curación: si otra pestaña/connection me dejó en offline
        // pero AQUÍ sí hay actividad, me restauro solo.
        if (statusRef && !(SCST.auto && SCST.auto.isAway && SCST.auto.isAway())) {
            const want = effectiveWant();
            if (cached.state !== want) {
                statusRef.update({ state: want, updated: TS() }).catch(function () {});
            }
        }
    }

    function onConnected(s) {
        if (!s.val() || !statusRef) return;
        armDisconnect(); // re-armar tras cada reconexión
        const want = effectiveWant();
        statusRef.update({ state: want, updated: TS() }).catch(function () {});
    }

    function onAuto(e) {
        if (!statusRef) return;
        const t = (e.detail && e.detail.type) || '';
        const m = cached.manual || 'online';
        if (m === 'busy' || m === 'offline') return; // elegidos a mano: no se tocan
        if (t === 'away' && cached.state !== 'offline') {
            statusRef.update({ state: 'offline', updated: TS() }).catch(function () {});
        } else if (t === 'back' && cached.state === 'offline') {
            statusRef.update({ state: m, updated: TS() }).catch(function () {});
        }
    }

    function startForUser(user) {
        const D = db();
        if (!D || !user) return;
        authUser = user;
        statusRef = D.ref('users/' + user.uid + '/status');

        statusRef.once('value').then(function (snap) {
            const v = snap.val() || {};
            const manual = v.manual || v.state || 'online';
            cached = { state: manual, manual: manual };
            // Al entrar estás activo: restauramos tu estado elegido.
            return statusRef.update({ state: manual, manual: manual, updated: TS() });
        }).then(function () {
            armDisconnect();
            detachValue = statusRef.on('value', onValue);
            connectedRef = D.ref('.info/connected');
            connectedRef.on('value', onConnected);
            repaintBadges();
        }).catch(function (err) {
            console.error('[Stevscon Status] Error preparando el estado:', err);
        });

        if (SCST.auto && SCST.auto.start) SCST.auto.start();
        document.addEventListener('sc:status-auto', onAuto);
    }

    function stopForUser() {
        if (statusRef) { try { statusRef.onDisconnect().cancel(); } catch (e) {} }
        if (detachValue) { try { detachValue(); } catch (e) {} detachValue = null; }
        if (connectedRef) { try { connectedRef.off('value', onConnected); } catch (e) {} connectedRef = null; }
        statusRef = null;
        authUser = null;
        cached = { state: 'online', manual: 'online' };
        if (SCST.auto && SCST.auto.stop) SCST.auto.stop();
        document.removeEventListener('sc:status-auto', onAuto);
        closePanel();
        repaintBadges();
    }

    /* ==== ENGANCHE CON LA TARJETA DE PERFIL ==== */

    function findAvatarInCard(box) {
        const els = box.querySelectorAll('img, div, span');
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el.dataset && el.dataset.scStatusWrap) continue;
            const w = el.offsetWidth || parseInt(el.style.width, 10) || 0;
            if (w < 48 || w > 160) continue;
            let r = parseFloat(el.style.borderTopLeftRadius);
            if (!r && r !== 0) {
                const cs = window.getComputedStyle(el);
                r = parseFloat(cs.borderTopLeftRadius) || 0;
            }
            if (r >= w * 0.45) return el; // el único círculo de la tarjeta: el avatar
        }
        return null;
    }

    function enhanceCard(box) {
        closePanel(); // la tarjeta se repintó: el panel viejo queda huérfano
        const av = findAvatarInCard(box);
        if (!av || av.dataset.scStatusDone === '1') return;

        // Envolver el avatar SIN romper el layout: las márgenes negativas
        // (el -38px estilo Discord) se trasladan al wrapper.
        const wrap = document.createElement('span');
        wrap.dataset.scStatusWrap = '1';
        wrap.style.cssText = 'position:relative;display:inline-block;flex:none;';

        const cs = window.getComputedStyle(av);
        ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(function (k) {
            wrap.style[k] = cs[k];
            av.style[k] = '0px';
        });

        av.parentNode.insertBefore(wrap, av);
        wrap.appendChild(av);

        const aw = av.offsetWidth || parseInt(av.style.width, 10) || 80;
        const badge = makeBadge(Math.max(18, Math.min(30, Math.round(aw * 0.34))));
        wrap.appendChild(badge);
        setIcon(badge, cached.state);

        // Solo en TU tarjeta se puede cambiar el estado (hoy la tarjeta
        // de "Ver perfil" siempre es tuya; cuando exista ver perfiles
        // ajenos, aquí se compara uid y solo se muestra el badge).
        if (authUser) {
            wrap.style.cursor = 'pointer';
            wrap.setAttribute('role', 'button');
            wrap.setAttribute('aria-label', 'Cambiar mi estado');
            wrap.title = 'Cambiar mi estado';
            wrap.addEventListener('click', function (e) {
                e.stopPropagation();
                openPanel(wrap);
            });
        }

        av.dataset.scStatusDone = '1';
    }

    function installCardHook() {
        if (!SCp.ui || typeof SCp.ui.renderProfileCard !== 'function') {
            console.error('[Stevscon Status] ui_profile.js no expone renderProfileCard: el badge no aparecerá.');
            return;
        }
        if (SCp.ui.renderProfileCard.__scStatusHook) return;
        const orig = SCp.ui.renderProfileCard;
        SCp.ui.renderProfileCard = function (box) {
            const r = orig.apply(this, arguments);
            try { if (box) enhanceCard(box); } catch (e) { console.error('[Stevscon Status] Error decorando la tarjeta:', e); }
            return r;
        };
        SCp.ui.renderProfileCard.__scStatusHook = true;
        console.log('[Stevscon Status] Enganchado a renderProfileCard.');
    }

    /* ==== INIT ==== */

    function init() {
        installCardHook();
        const A = authObj();
        if (!A) {
            console.error('[Stevscon Status] Firebase Auth no disponible.');
            return;
        }
        A.onAuthStateChanged(function (user) {
            if (user) startForUser(user);
            else stopForUser();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    console.log('[Stevscon] status_online.js listo (cerebro del Online Status, v1).');
})(window, document);