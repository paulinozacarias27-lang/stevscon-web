/**
 * ====
 * STEVSCON.COM — profiles/manage/badges/badges_core.js (v1)
 * BADGES · Orgullo de la web. Catálogo + motor de render.
 *  - El catálogo vive AQUÍ: agregar un badge nuevo = agregar UNA entrada.
 *  - Quién tiene qué vive en Firebase: social/badges/{uid}/{badgeId} = { by, at }
 *    (todos leen; solo Owner/Admins escriben — reglas aparte).
 *  - Owner SIEMPRE primero (order: 0) y con el LOGO real de la web.
 *  - Se engancha SOLO: envuelve a StevsconProfiles.ui.renderProfileCard
 *    (página de Perfiles + modal del Social) y pinta los badges DEBAJO
 *    del @handler. Cero ediciones en ui_profile.js o profiles_show.js.
 *  - textContent SIEMPRE para datos; innerHTML solo con SVG estático
 *    (mismo patrón de tu verifiedBadge en utils.js). Cero XSS.
 * ====
 */
(function (window, document) {
    'use strict';

    const SB = window.StevsconBadges = window.StevsconBadges || {};
    if (SB._coreLoaded) return;
    SB._coreLoaded = true;

    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const LOGO_SRC = '/SC-LOGO-20260825013121.png';
    const NODE = 'social/badges'; // social/badges/{uid}/{badgeId} = { by, at }

    /* ==== CATÁLOGO (el único lugar donde se declaran badges) ==== */
    SB.CATALOG = {
        owner: {
            id: 'owner',
            order: 0, /* SIEMPRE el primero de todos */
            label: 'OWNER',
            desc: 'Fundador de Stevscon — el orgullo de la web 💜',
            icon: 'logo', /* 'logo' = el logo real de la web · 'crown' = corona dorada */
            color: '#fbbf24',
            bg: 'linear-gradient(135deg, rgba(124,58,237,.32), rgba(251,191,36,.20))',
            border: 'rgba(251,191,36,.8)',
            glow: '0 0 12px rgba(251,191,36,.35), 0 0 26px rgba(139,92,246,.28)'
        }
    };

    function db() { return firebase.database(); }
    function el(tag, css, cls) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (cls) e.className = cls;
        return e;
    }

    /* ==== ESTILOS (una sola vez, con variables de tu tema) ==== */
    (function injectStyles() {
        if (document.getElementById('sc-badges-style')) return;
        const st = document.createElement('style');
        st.id = 'sc-badges-style';
        st.textContent =
            '.sc-badges-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0 2px}' +
            '.sc-badge-pill{position:relative;display:inline-flex;align-items:center;gap:6px;padding:3px 11px 3px 5px;border-radius:999px;cursor:default;user-select:none}' +
            '.sc-badge-tip{position:absolute;bottom:calc(100% + 9px);left:0;transform:translateY(4px);opacity:0;pointer-events:none;' +
            'transition:opacity .16s ease,transform .16s ease;display:flex;flex-direction:column;gap:2px;background:var(--bg-card,#1a1625);' +
            'border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:8px 12px;box-shadow:0 14px 40px rgba(0,0,0,.5);z-index:60;white-space:nowrap}' +
            '.sc-badge-pill:hover .sc-badge-tip{opacity:1;transform:translateY(0)}' +
            '.sc-badge-tip b{font:800 11px Inter,sans-serif;letter-spacing:.12em}' +
            '.sc-badge-tip span{font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8)}';
        document.head.appendChild(st);
    })();

    /* ==== ICONOS: logo real de la web (con corona dorada de respaldo) ==== */
    function crownEl() {
        const s = el('span', 'display:inline-flex;flex:none;');
        s.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" aria-label="Corona">' +
            '<defs><linearGradient id="sc-crown-g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>' +
            '<path d="M3 8.5 7.5 12 12 5.5 16.5 12 21 8.5 19.2 17.5a1.6 1.6 0 0 1-1.57 1.3H6.37a1.6 1.6 0 0 1-1.57-1.3Z" fill="url(#sc-crown-g)" stroke="#b45309" stroke-width=".8" stroke-linejoin="round"/>' +
            '<circle cx="12" cy="4.6" r="1.5" fill="#fde68a"/></svg>';
        return s;
    }
    function iconFor(b) {
        if (b.icon === 'logo') {
            const im = document.createElement('img');
            im.src = b.logoSrc || LOGO_SRC;
            im.alt = 'Owner'; im.draggable = false; im.referrerPolicy = 'no-referrer';
            im.style.cssText = 'width:17px;height:17px;border-radius:50%;object-fit:cover;flex:none;' +
                'box-sizing:content-box;padding:1.5px;background:linear-gradient(135deg,#fbbf24,#f59e0b);';
            im.onerror = function () {
                const c = crownEl();
                if (im.parentNode) im.parentNode.replaceChild(c, im);
            };
            return im;
        }
        return crownEl();
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
        for (let i = 0; i < ids.length; i++) row.appendChild(pillFor(ids[i], val[ids[i]]));
    }

    function pillFor(id, meta) {
        const b = SB.CATALOG[id];
        const pill = el('span', null, 'sc-badge-pill');
        pill.style.cssText = 'background:' + b.bg + ';border:1px solid ' + b.border + ';box-shadow:' + b.glow + ';';
        pill.dataset.scBadge = id;
        pill.appendChild(iconFor(b));
        const t = el('span', 'font:800 10px Inter,sans-serif;letter-spacing:.16em;color:' + b.color + ';');
        t.textContent = b.label;
        pill.appendChild(t);

        /* Tooltip (orgullo): nombre + descripción + fecha de otorgado */
        const tip = el('span', null, 'sc-badge-tip');
        const l1 = el('b'); l1.style.color = b.color; l1.textContent = b.label;
        const l2 = el('span'); l2.textContent = b.desc;
        tip.appendChild(l1); tip.appendChild(l2);
        if (meta && meta.at) {
            const d = new Date(meta.at);
            if (!isNaN(d.getTime())) {
                const l3 = el('span');
                l3.textContent = 'Otorgado el ' + d.toLocaleDateString();
                tip.appendChild(l3);
            }
        }
        pill.appendChild(tip);
        return pill;
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

    /* Pill estático (para el panel de manage, sin Firebase) */
    SB.staticPill = function (id) { return pillFor(id, null); };

    console.log('[Stevscon] badges_core.js listo (v1) — catálogo + motor, Owner primero 👑');
})(window, document);