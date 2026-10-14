/**
 * ====
 * STEVSCON.COM — profiles/manage/badges/badges_manage.js (v1)
 * PANEL DE BADGES (Owner/Admins) — otorgar / quitar.
 *  - Botón 👑 abajo a la derecha (SOLO visible para staff).
 *  - Buscar por @handler o UID -> preview -> Otorgar / Quitar.
 *  - El badge 'owner' SOLO lo maneja steven23hd@gmail.com (reglas de Firebase).
 *  - Cierra con X o ESC (mismo estilo que unban). Feedback verde/rojo inline.
 *  - API de consola: StevsconBadges.manage.open()
 * ====
 */
(function (window, document) {
    'use strict';

    const SB = window.StevsconBadges = window.StevsconBadges || {};
    if (SB._manageLoaded) return;
    SB._manageLoaded = true;

    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const NODE = 'social/badges';

    function db() { return firebase.database(); }
    function el(tag, css, cls) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (cls) e.className = cls;
        return e;
    }

    const state = { open: false, uid: null, name: '', canOwner: false, backdrop: null, list: null, fb: null, esc: null };

    (function injectStyles() {
        if (document.getElementById('sc-badges-manage-style')) return;
        const st = document.createElement('style');
        st.id = 'sc-badges-manage-style';
        st.textContent =
            '.scbm-row{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--border-color,#2e2440);border-radius:12px;background:var(--bg-hover,#261f36)}' +
            '.scbm-btn{border:0;border-radius:9px;padding:7px 13px;font:800 11.5px Inter,sans-serif;letter-spacing:.06em;cursor:pointer;transition:transform .12s,filter .12s}' +
            '.scbm-btn:hover{transform:translateY(-1px);filter:brightness(1.15)}' +
            '.scbm-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;filter:none}';
        document.head.appendChild(st);
    })();

    function isOwnerEmail() {
        const a = firebase.auth().currentUser;
        return !!(a && String(a.email || '').toLowerCase() === OWNER_EMAIL);
    }

    /* staff: owner automático por email + social/staff/{uid} ({role} o plano) */
    function checkStaff(cb) {
        const a = firebase.auth().currentUser;
        if (!a) { cb(false, false); return; }
        if (String(a.email || '').toLowerCase() === OWNER_EMAIL) { cb(true, true); return; }
        db().ref('social/staff/' + a.uid).once('value').then(function (s) {
            const v = s.val();
            const role = v ? (v.role || v) : null;
            cb(!!(role === 'admin' || role === 'mod'), role === 'admin');
        }).catch(function () { cb(false, false); });
    }

    function fb(msg, isErr) {
        if (!state.fb) return;
        state.fb.textContent = msg;
        state.fb.style.color = isErr ? '#f87171' : '#4ade80';
    }

    /* ==== BUSCAR: @handler -> uid, o UID directo (verificado) ==== */
    function resolve(q, cb) {
        const raw = String(q || '').trim();
        const h = raw.toLowerCase().replace(/^@/, '');
        if (!h) { cb(null); return; }
        if (raw.charAt(0) !== '@' && /^[a-zA-Z0-9]{20,}$/.test(h)) {
            return verifyUid(h, cb);
        }
        db().ref('handlers/' + h).once('value').then(function (s) {
            cb(s.val() || null);
        }).catch(function () { cb(null); });
    }
    function verifyUid(uid, cb) {
        db().ref('users/' + uid + '/username').once('value').then(function (s) {
            cb(s.val() ? uid : null);
        }).catch(function () { cb(null); });
    }

    /* ==== LISTA DE BADGES del usuario cargado ==== */
    function renderList() {
        while (state.list.firstChild) state.list.removeChild(state.list.firstChild);
        const CATALOG = SB.CATALOG || {};
        if (!state.uid) return;
        db().ref(NODE + '/' + state.uid).once('value').then(function (s) {
            const mine = s.val() || {};
            const ids = Object.keys(CATALOG).sort(function (a, b) {
                return (CATALOG[a].order || 99) - (CATALOG[b].order || 99) || a.localeCompare(b);
            });
            for (let i = 0; i < ids.length; i++) state.list.appendChild(rowFor(ids[i], !!mine[ids[i]]));
        }).catch(function (e) { fb('❌ No se pudo leer los badges: ' + (e && e.message || e), true); });
    }

    function rowFor(id, has) {
        const b = SB.CATALOG[id];
        const row = el('div', null, 'scbm-row');

        const left = el('div', 'display:flex;align-items:center;gap:10px;min-width:0;flex:1;');
        left.appendChild(SB.staticPill(id));
        const txt = el('div', 'display:flex;flex-direction:column;gap:1px;min-width:0;');
        const nm = el('b', 'font:800 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);');
        nm.textContent = b.label;
        const ds = el('span', 'font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);');
        ds.textContent = b.desc;
        txt.appendChild(nm); txt.appendChild(ds);
        left.appendChild(txt);
        row.appendChild(left);

        const st = el('span', 'font:800 10px Inter,sans-serif;letter-spacing:.1em;flex:none;');
        st.textContent = has ? 'OTORGADO ✓' : 'SIN BADGE';
        st.style.color = has ? '#4ade80' : 'var(--text-muted,#94a3b8)';
        row.appendChild(st);

        const g = el('button', null, 'scbm-btn'); g.type = 'button';
        g.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;';
        g.textContent = 'Otorgar';
        const r = el('button', null, 'scbm-btn'); r.type = 'button';
        r.style.cssText = 'background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.55);color:#f87171;';
        r.textContent = 'Quitar';
        g.style.display = has ? 'none' : '';
        r.style.display = has ? '' : 'none';
        if (id === 'owner' && !state.canOwner) {
            g.disabled = true; r.disabled = true;
            g.title = 'Solo el Owner puede manejar este badge';
            r.title = 'Solo el Owner puede manejar este badge';
        }
        g.addEventListener('click', function () { grant(id); });
        r.addEventListener('click', function () { revoke(id); });
        row.appendChild(g); row.appendChild(r);
        return row;
    }

    function grant(id) {
        if (id === 'owner' && !state.canOwner) { fb('❌ Solo el Owner (' + OWNER_EMAIL + ') puede manejar el badge Owner.', true); return; }
        const a = firebase.auth().currentUser;
        db().ref(NODE + '/' + state.uid + '/' + id).set({ by: a ? a.uid : '', at: Date.now() })
            .then(function () {
                fb('✅ Badge "' + SB.CATALOG[id].label + '" otorgado a ' + (state.name || state.uid) + '. Se ve AL INSTANTE en su perfil.', false);
                renderList();
            })
            .catch(function (e) { fb('❌ No se pudo otorgar: ' + (e && e.message || e), true); });
    }
    function revoke(id) {
        if (id === 'owner' && !state.canOwner) { fb('❌ Solo el Owner puede manejar el badge Owner.', true); return; }
        db().ref(NODE + '/' + state.uid + '/' + id).remove()
            .then(function () {
                fb('🗑️ Badge "' + SB.CATALOG[id].label + '" quitado a ' + (state.name || state.uid) + '.', false);
                renderList();
            })
            .catch(function (e) { fb('❌ No se pudo quitar: ' + (e && e.message || e), true); });
    }

    /* ==== PANEL ==== */
    function buildPanel() {
        const CATALOG = SB.CATALOG || {};
        const backdrop = el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:4600;background:rgba(5,4,10,.7);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Inter,sans-serif;');
        const panel = el('div', 'width:420px;max-width:100%;max-height:86vh;overflow-y:auto;background:var(--bg-card,#1a1625);border:1px solid rgba(251,191,36,.45);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 30px rgba(251,191,36,.12);color:var(--text-main,#f8fafc);box-sizing:border-box;');

        const head = el('div', 'display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--border-color,#2e2440);background:linear-gradient(135deg,rgba(124,58,237,.25),rgba(251,191,36,.12));');
        const crown = el('span', 'font-size:22px;'); crown.textContent = '👑';
        const ht = el('div', 'display:flex;flex-direction:column;flex:1;');
        const h1 = el('h2', 'margin:0;font:800 15px Inter,sans-serif;letter-spacing:.02em;'); h1.textContent = 'Badges — Orgullo de la web';
        const h2 = el('span', 'font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);'); h2.textContent = 'Otorga insignias que se muestran en los perfiles';
        ht.appendChild(h1); ht.appendChild(h2);
        const x = el('button', 'width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:13px;flex:none;');
        x.type = 'button'; x.textContent = '✕';
        x.addEventListener('click', close);
        head.appendChild(crown); head.appendChild(ht); head.appendChild(x);
        panel.appendChild(head);

        const body = el('div', 'padding:16px 18px 18px;');

        const srow = el('div', 'display:flex;gap:8px;');
        const inp = el('input', 'flex:1;min-width:0;padding:10px 13px;border-radius:11px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);font:600 13px Inter,sans-serif;outline:none;box-sizing:border-box;');
        inp.placeholder = '@handler o UID del usuario…';
        const go = el('button', null, 'scbm-btn'); go.type = 'button';
        go.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;flex:none;';
        go.textContent = 'Buscar';
        srow.appendChild(inp); srow.appendChild(go);
        body.appendChild(srow);

        const prev = el('div', 'display:none;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border-radius:12px;border:1px dashed var(--border-color,#2e2440);');
        const pav = el('span', 'width:34px;height:34px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font:800 14px Inter,sans-serif;');
        const ptx = el('div', 'display:flex;flex-direction:column;min-width:0;');
        const pn = el('b', 'font:800 13px Inter,sans-serif;'); 
        const pu = el('span', 'font:600 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;');
        ptx.appendChild(pn); ptx.appendChild(pu);
        prev.appendChild(pav); prev.appendChild(ptx);
        body.appendChild(prev);

        state.list = el('div', 'display:flex;flex-direction:column;gap:9px;margin-top:12px;');
        body.appendChild(state.list);

        state.fb = el('p', 'margin:12px 0 0;font:700 11.5px Inter,sans-serif;min-height:15px;');
        body.appendChild(state.fb);

        panel.appendChild(body);
        backdrop.appendChild(panel);
        backdrop.addEventListener('click', function () { close(); });
        panel.addEventListener('click', function (e) { e.stopPropagation(); });

        function search() { resolve(inp.value, onFound); }
        go.addEventListener('click', search);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') search(); });

        function onFound(uid) {
            if (!uid) { prev.style.display = 'none'; state.uid = null; fb('❌ Usuario no encontrado. Prueba con su @handler exacto.', true); return; }
            state.uid = uid;
            db().ref('users/' + uid + '/username').once('value').then(function (s) {
                state.name = s.val() || 'Usuario';
                pn.textContent = state.name;
                pu.textContent = 'UID: ' + uid;
                pav.textContent = String(state.name).charAt(0).toUpperCase();
                prev.style.display = 'flex';
                fb('Usuario cargado. Otorga o quita badges abajo.', false);
                renderList();
            }).catch(function () { fb('❌ No se pudo leer el usuario.', true); });
        }

        return backdrop;
    }

    function open() {
        if (state.open) return;
        state.open = true;
        state.backdrop = buildPanel();
        document.body.appendChild(state.backdrop);
        try {
            state.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
        } catch (e) {}
        state.esc = function (e) {
            if (!state.open || e.key !== 'Escape') return;
            e.preventDefault(); e.stopPropagation(); close();
        };
        document.addEventListener('keydown', state.esc, true);
    }
    function close() {
        if (!state.open) return;
        state.open = false;
        if (state.esc) { document.removeEventListener('keydown', state.esc, true); state.esc = null; }
        const b = state.backdrop;
        state.backdrop = null; state.list = null; state.fb = null; state.uid = null; state.name = '';
        if (!b) return;
        try { b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-out' }); } catch (e) {}
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 140);
    }

    SB.manage = { open: open, close: close };

    /* Botón flotante 👑 — SOLO para staff */
    function ensureButton() {
        checkStaff(function (staff, admin) {
            if (!staff) return;
            if (document.getElementById('sc-badges-manage-btn')) return;
            state.canOwner = !!admin;
            const b = el('button', 'position:fixed;right:18px;bottom:18px;z-index:3900;width:46px;height:46px;border-radius:50%;' +
                'border:1px solid rgba(251,191,36,.7);background:linear-gradient(135deg,#2e1065,#1a1526);color:#fbbf24;font-size:19px;' +
                'cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 14px rgba(251,191,36,.3);display:flex;align-items:center;justify-content:center;transition:transform .15s;');
            b.id = 'sc-badges-manage-btn';
            b.type = 'button';
            b.title = 'Badges (staff) — ' + (admin ? 'Owner' : 'Staff');
            b.textContent = '👑';
            b.addEventListener('click', open);
            b.addEventListener('mouseenter', function () { b.style.transform = 'scale(1.08)'; });
            b.addEventListener('mouseleave', function () { b.style.transform = ''; });
            document.body.appendChild(b);
        });
    }

    if (firebase.auth) firebase.auth().onAuthStateChanged(function () { ensureButton(); });

    console.log('[Stevscon] badges_manage.js listo (v1) — panel de badges para staff 👑');
})(window, document);