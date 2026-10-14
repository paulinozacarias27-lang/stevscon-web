/**
 * ====
 * STEVSCON.COM — profiles/manage/badges/badges_core.js (v3)
 * BADGES · Orgullo de la web. Catálogo + motor de render.
 *  v3 — FIX: la corona perdía su color amarillo al otorgarse (IDs de
 *    gradiente duplicados entre SVGs: al repintar una instancia, las demás
 *    apuntaban a un gradiente inexistente y se pintaban marrón/negro).
 *    Ahora CADA instancia genera su propio ID de gradiente único.
 *  v2 — estilo ICONO puro (tipo Discord): sin fondo, sin borde, sin texto;
 *    Owner = SIEMPRE corona dorada con gema morada; tooltip estilo Discord
 *    (nombre + descripción + fecha) al acercar el mouse.
 *  - El catálogo vive AQUÍ: agregar un badge nuevo = agregar UNA entrada
 *    (con su `svg` estática, placeholders {S}=tamaño y {G}=gradiente único).
 *  - Quién tiene qué vive en Firebase: social/badges/{uid}/{badgeId} = { by, at }
 *    (todos leen; solo Owner/Admins escriben — reglas aparte).
 *  - Se engancha SOLO: envuelve renderProfileCard (Perfiles + modal del
 *    Social) y pinta los iconos DEBAJO del @handler. Cero ediciones ajenas.
 *  - textContent SIEMPRE para datos; innerHTML solo con SVG estático del
 *    catálogo (nunca datos de usuario). Cero XSS.
 * ====
 */
(function (window, document) {
    'use strict';

    const SB = window.StevsconBadges = window.StevsconBadges || {};
    if (SB._coreLoaded) return;
    SB._coreLoaded = true;

    const NODE = 'social/badges'; // social/badges/{uid}/{badgeId} = { by, at }

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

    /* ==== ESTILOS (una sola vez) — icono puro + tooltip Discord ==== */
    (function injectStyles() {
        if (document.getElementById('sc-badges-style')) return;
        const st = document.createElement('style');
        st.id = 'sc-badges-style';
        st.textContent =
            '.sc-badges-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:7px 0 2px}' +
            '.sc-badge{position:relative;display:inline-flex;cursor:default;user-select:none;padding:1px}' +
            '.sc-badge-ic{display:inline-flex;transition:transform .16s ease}' +
            '.sc-badge:hover .sc-badge-ic{transform:scale(1.18)}' +
            '.sc-badge-tip{position:absolute;bottom:calc(100% + 10px);left:0;transform:translateY(5px);opacity:0;pointer-events:none;' +
            'transition:opacity .16s ease,transform .16s ease;display:flex;flex-direction:column;gap:2px;text-align:left;' +
            'background:linear-gradient(135deg,rgba(22,15,36,.98),rgba(12,9,20,.98));border:1px solid rgba(139,92,246,.45);' +
            'border-radius:10px;padding:8px 13px;box-shadow:0 18px 44px rgba(0,0,0,.6),0 0 20px rgba(124,58,237,.28);z-index:60;white-space:nowrap}' +
            '.sc-badge-tip::after{content:"";position:absolute;left:9px;bottom:-4.5px;width:8px;height:8px;transform:rotate(45deg);' +
            'background:#150e24;border-right:1px solid rgba(139,92,246,.45);border-bottom:1px solid rgba(139,92,246,.45)}' +
            '.sc-badge:hover .sc-badge-tip{opacity:1;transform:translateY(0)}' +
            '.sc-badge-tip b{font:800 11px Inter,sans-serif;letter-spacing:.14em}' +
            '.sc-badge-tip span{font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)}' +
            '.sc-badge-tip i{font:600 9.5px Inter,sans-serif;font-style:normal;color:var(--text-muted,#94a3b8);opacity:.75}';
        document.head.appendChild(st);
    })();

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

    /* Icono + tooltip (nombre, descripción y fecha al acercar el mouse) */
    function badgeFor(id, meta, size) {
        const b = SB.CATALOG[id];
        const wrap = el('span', null, 'sc-badge');
        wrap.dataset.scBadge = id;
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', b.label);
        wrap.appendChild(iconEl(b, size));

        const tip = el('span', null, 'sc-badge-tip');
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
        wrap.appendChild(tip);
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

    console.log('[Stevscon] badges_core.js listo (v3) — corona SIEMPRE dorada, Owner primero 👑');
})(window, document);