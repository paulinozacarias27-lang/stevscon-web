/**
 * ====
 * STEVSCON.COM — profiles/manage/badges/badges_manage.js (v3)
 * PANEL DE BADGES (Owner/Admins) — otorgar / quitar.
 *  v3 — navegador de usuarios en vivo:
 *    · Lista de TODOS los usuarios (avatar, nombre, @handler, rango, registro).
 *    · Buscador filtra al instante (nombre, @handler, correo o UID).
 *    · Botón de ORDEN cíclico: A–Z → antigüedad de cuenta → rango
 *      (Owner → Admin → Mod → Usuario).
 *    · Catálogo de badges ordenado por rango (plegable, no estorba).
 *    · Chips de rango y contador de badges por usuario.
 *  v2 — panel grande (620px) + iconos estilo Discord en la lista.
 *  - Botón 👑 abajo a la derecha (SOLO staff) · cierra con X o ESC.
 *  - El badge 'owner' SOLO lo maneja steven23hd@gmail.com (reglas de Firebase).
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
    const MAX_ROWS = 100; /* tope de filas visibles antes de "…y N más" */

    function db() { return firebase.database(); }
    function el(tag, css, cls) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (cls) e.className = cls;
        return e;
    }

    const state = {
        open: false, uid: null, name: '', canOwner: false,
        backdrop: null, list: null, fb: null, esc: null,
        ulist: null, catBox: null, catBody: null, catOpen: true,
        prev: null, pav: null, pn: null, pu: null, sortBtnIc: null, sortBtnLb: null,
        dir: {}, staff: {}, badgesAll: {},
        loaded: false, loading: false, permErr: '',
        q: '', sort: 'az' /* 'az' | 'old' | 'rank' */
    };

    const SORTS = [
        { id: 'az',   icon: 'fa-arrow-down-a-z', label: 'A–Z',        title: 'Orden alfabético (A → Z). Clic para cambiar.' },
        { id: 'old',  icon: 'fa-hourglass-half', label: 'ANTIGÜEDAD', title: 'Por edad de la cuenta (veterano primero). Clic para cambiar.' },
        { id: 'rank', icon: 'fa-user-shield',    label: 'RANGO',      title: 'Por rango: Owner → Admin → Mod → Usuario. Clic para cambiar.' }
    ];
    const RANK_ORDER = { owner: 0, admin: 1, mod: 2, user: 3 };
    const RANK_META = {
        owner: { t: 'OWNER', bg: 'rgba(250,204,21,.14)', fg: '#facc15' },
        admin: { t: 'ADMIN', bg: 'rgba(139,92,246,.16)', fg: '#c4b5fd' },
        mod:   { t: 'MOD',   bg: 'rgba(59,130,246,.16)', fg: '#93c5fd' },
        user:  { t: 'USER',  bg: 'rgba(148,163,184,.12)', fg: '#94a3b8' }
    };

    (function injectStyles() {
        if (document.getElementById('sc-badges-manage-style')) return;
        const st = document.createElement('style');
        st.id = 'sc-badges-manage-style';
        st.textContent =
            '.scbm-row{display:flex;align-items:center;gap:14px;padding:13px 14px;border:1px solid var(--border-color,#2e2440);border-radius:14px;background:var(--bg-hover,#261f36)}' +
            '.scbm-urow{display:flex;align-items:center;gap:11px;padding:9px 12px;border-bottom:1px solid var(--border-color,#2e2440);cursor:pointer;transition:background .12s ease}' +
            '.scbm-urow:hover{background:var(--bg-hover,#261f36)}' +
            '.scbm-chip{font:800 9px Inter,sans-serif;letter-spacing:.1em;padding:2.5px 7px;border-radius:6px;flex:none}' +
            '.scbm-btn{border:0;border-radius:10px;padding:9px 16px;font:800 12.5px Inter,sans-serif;letter-spacing:.06em;cursor:pointer;transition:transform .12s,filter .12s}' +
            '.scbm-btn:hover{transform:translateY(-1px);filter:brightness(1.15)}' +
            '.scbm-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;filter:none}' +
            '.scbm-cat-row{display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:11px;background:var(--bg-hover,#261f36);border:1px solid var(--border-color,#2e2440)}';
        document.head.appendChild(st);
    })();

    /* ==== HELPERS de usuarios (mismos campos que tu accounts.js) ==== */
    function adapt(raw) {
        raw = raw || {};
        const p = raw.profile || {};
        return {
            name: raw.name || raw.displayName || raw.username || p.name || p.username || 'Usuario',
            handler: String(raw.handler || raw.tag || p.handler || '').toLowerCase().replace(/^@/, ''),
            avatar: raw.avatarUrl || raw.avatar || p.avatarUrl || p.avatar ||
                (raw.media && (raw.media.avatar || raw.media.avatarUrl)) || '',
            email: raw.email || ''
        };
    }
    function statusOf(raw) {
        const st = raw && raw.status;
        if (st && typeof st === 'object') return String(st.state || '') || (raw && raw.presence) || '';
        if (typeof st === 'string' && st) return st;
        return (raw && raw.presence) || '';
    }
    function roleOf(st) { if (!st) return null; if (typeof st === 'string') return st; return st.role || null; }
    function rankOf(uid) {
        const r = state.dir[uid] || {};
        if (String(r.email || '').toLowerCase() === OWNER_EMAIL) return 'owner';
        return roleOf(state.staff[uid]) || 'user';
    }
    function badgeCount(uid) { const b = state.badgesAll[uid]; return b ? Object.keys(b).length : 0; }
    function chip(txt, bg, fg) {
        const c = el('span', null, 'scbm-chip');
        c.style.cssText = 'background:' + bg + ';color:' + fg + ';';
        c.textContent = txt;
        return c;
    }
    function avatarFor(raw, size) {
        const a = adapt(raw);
        if (window.SCSOC && SCSOC.avatarEl) {
            try { return SCSOC.avatarEl(a, size, statusOf(raw)); } catch (e) {}
        }
        const d = el('div', 'flex:none;width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
            'background:linear-gradient(135deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;' +
            'color:#fff;font:800 ' + Math.max(11, Math.round(size * .42)) + 'px Inter,sans-serif;overflow:hidden;');
        if (a.avatar) {
            const im = document.createElement('img');
            im.src = a.avatar; im.alt = ''; im.referrerPolicy = 'no-referrer';
            im.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            d.appendChild(im);
        } else {
            d.textContent = String(a.name || '?').charAt(0).toUpperCase();
        }
        return d;
    }
    function regTxt(raw) {
        const n = Number(raw && raw.createdAt) || 0;
        if (!n) return '';
        if (window.SCSOC && SCSOC.timeAgo) { try { return SCSOC.timeAgo(n); } catch (e) {} }
        return new Date(n).toLocaleDateString();
    }

    function fb(msg, isErr) {
        if (!state.fb) return;
        state.fb.textContent = msg;
        state.fb.style.color = isErr ? '#f87171' : '#4ade80';
    }

    /* ==== CARGA del directorio (users + staff + badges) — igual que ACCOUNTS ==== */
    function loadDirectory(cb) {
        if (state.loaded) { if (cb) cb(); return; }
        if (state.loading) return; /* el render está pendiente; cae al terminar */
        state.loading = true;
        renderUserList();
        Promise.all([
            db().ref('users').once('value'),
            db().ref('social/staff').once('value'),
            db().ref(NODE).once('value')
        ]).then(function (rs) {
            state.dir = rs[0].val() || {};
            state.staff = rs[1].val() || {};
            state.badgesAll = rs[2].val() || {};
            state.loaded = true; state.loading = false; state.permErr = '';
        }).catch(function (e) {
            state.loading = false; state.loaded = true;
            state.permErr = String((e && e.code) || 'error');
        }).then(function () {
            renderUserList(); renderCatalog();
            if (cb) cb();
        });
    }
    function refreshBadges() {
        db().ref(NODE).once('value').then(function (s) {
            state.badgesAll = s.val() || {};
            renderCatalog(); renderUserList();
        }).catch(function () {});
    }

    /* ==== LISTA DE USUARIOS (filtrar + ordenar + render) ==== */
    function filteredUids() {
        const q = state.q.trim().toLowerCase();
        let uids = Object.keys(state.dir).filter(function (u) { return state.dir[u]; });
        if (q) uids = uids.filter(function (uid) {
            const r = state.dir[uid], a = adapt(r);
            return (a.name || '').toLowerCase().indexOf(q) !== -1 ||
                a.handler.indexOf(q) !== -1 ||
                (a.email || '').toLowerCase().indexOf(q) !== -1 ||
                uid.toLowerCase().indexOf(q) !== -1;
        });
        return uids;
    }
    function sortedUids(uids) {
        const out = uids.slice();
        if (state.sort === 'az') {
            out.sort(function (a, b) { return adapt(state.dir[a]).name.localeCompare(adapt(state.dir[b]).name, 'es'); });
        } else if (state.sort === 'old') {
            out.sort(function (a, b) {
                return (Number(state.dir[a].createdAt) || 0) - (Number(state.dir[b].createdAt) || 0);
            });
        } else { /* rank: Owner → Admin → Mod → Usuario (empate: más nuevo primero) */
            out.sort(function (a, b) {
                const ra = RANK_ORDER[rankOf(a)], rb = RANK_ORDER[rankOf(b)];
                if (ra !== rb) return ra - rb;
                return (Number(state.dir[b].createdAt) || 0) - (Number(state.dir[a].createdAt) || 0);
            });
        }
        return out;
    }

    function renderUserList() {
        const host = state.ulist;
        if (!host) return;
        while (host.firstChild) host.removeChild(host.firstChild);

        if (state.loading) {
            const l = el('div', 'padding:22px 14px;text-align:center;color:var(--text-muted,#94a3b8);font:700 12px Inter,sans-serif;');
            l.textContent = 'Cargando usuarios…';
            host.appendChild(l);
            return;
        }
        if (state.permErr) {
            const err = el('div', 'margin:8px 0;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171;border-radius:12px;padding:13px;font:600 12px Inter,sans-serif;line-height:1.6;');
            err.textContent = 'PERMISSION_DENIED leyendo users/ — el panel es solo staff; publica las reglas de Firebase que dan lectura de users/ a Owner/Admins/Mods y recarga.';
            host.appendChild(err);
            return;
        }
        if (!Object.keys(state.dir).length) {
            const e0 = el('div', 'padding:22px 14px;text-align:center;color:var(--text-muted,#94a3b8);font:700 12px Inter,sans-serif;');
            e0.textContent = 'Aún no hay cuentas registradas.';
            host.appendChild(e0);
            return;
        }

        const all = sortedUids(filteredUids());
        const info = el('div', 'display:flex;justify-content:space-between;align-items:center;padding:2px 2px 6px;');
        const cnt = el('span', 'font:800 9.5px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);');
        cnt.textContent = all.length + ' USUARIOS';
        info.appendChild(cnt);
        const hint = el('span', 'font:700 9.5px Inter,sans-serif;letter-spacing:.1em;color:var(--text-muted,#94a3b8);opacity:.7;');
        hint.textContent = 'CLIC EN UNO PARA MANEJAR SUS BADGES';
        info.appendChild(hint);
        host.appendChild(info);

        const shown = all.slice(0, MAX_ROWS);
        shown.forEach(function (uid) {
            const raw = state.dir[uid], a = adapt(raw), rk = rankOf(uid), meta = RANK_META[rk];
            const row = el('div', null, 'scbm-urow');
            if (uid === state.uid) row.style.cssText = 'background:rgba(139,92,246,.12);box-shadow:inset 3px 0 0 var(--purple-accent,#8b5cf6);';

            row.appendChild(avatarFor(raw, 36));

            const mid = el('div', 'flex:1;min-width:0;');
            const l1 = el('div', 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;');
            const nm = el('b', 'font:800 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;');
            nm.textContent = a.name;
            l1.appendChild(nm);
            l1.appendChild(chip(meta.t, meta.bg, meta.fg));
            const bc = badgeCount(uid);
            if (bc) l1.appendChild(chip('👑 ' + bc, 'rgba(251,191,36,.12)', '#fbbf24'));
            mid.appendChild(l1);

            const l2 = el('div', 'font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;');
            l2.textContent = (a.handler ? '@' + a.handler : 'sin handler') + (raw.createdAt ? ' · registrado ' + regTxt(raw) : '');
            mid.appendChild(l2);
            row.appendChild(mid);

            const ar = el('span', 'flex:none;color:var(--text-muted,#94a3b8);font-size:12px;opacity:.6;');
            ar.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
            row.appendChild(ar);

            row.addEventListener('click', function () { selectUser(uid); });
            host.appendChild(row);
        });

        if (all.length > shown.length) {
            const more = el('div', 'padding:10px 12px;text-align:center;color:var(--text-muted,#94a3b8);font:700 11px Inter,sans-serif;');
            more.textContent = '…y ' + (all.length - shown.length) + ' más — afina tu búsqueda.';
            host.appendChild(more);
        }
    }

    /* ==== CATÁLOGO (lista de TODOS los badges, ordenada por rango) ==== */
    function renderCatalog() {
        const box = state.catBox, body = state.catBody;
        if (!box || !body) return;
        while (body.firstChild) body.removeChild(body.firstChild);
        body.style.display = state.catOpen ? 'flex' : 'none';

        const CATALOG = SB.CATALOG || {};
        const ids = Object.keys(CATALOG).sort(function (a, b) {
            return (CATALOG[a].order || 99) - (CATALOG[b].order || 99) || a.localeCompare(b);
        });
        const cntEl = box.querySelector('.scbm-cat-count');
        if (cntEl) cntEl.textContent = String(ids.length);

        if (!state.catOpen) return;
        ids.forEach(function (id) {
            const b = CATALOG[id];
            const users = Object.keys(state.badgesAll).filter(function (u) {
                return state.badgesAll[u] && state.badgesAll[u][id];
            }).length;
            const row = el('div', null, 'scbm-cat-row');
            row.appendChild(SB.staticIcon(id, 22));
            const tx = el('div', 'flex:1;min-width:0;');
            const n1 = el('b', 'font:800 11.5px Inter,sans-serif;color:var(--text-main,#f8fafc);');
            n1.textContent = b.label;
            const n2 = el('span', 'font:600 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);display:block;margin-top:1px;');
            n2.textContent = b.desc;
            tx.appendChild(n1); tx.appendChild(n2);
            row.appendChild(tx);
            const cnt = el('span', 'font:800 9.5px Inter,sans-serif;letter-spacing:.08em;flex:none;color:var(--text-muted,#94a3b8);');
            cnt.textContent = users ? (users + (users === 1 ? ' usuario' : ' usuarios')) : 'nadie aún';
            row.appendChild(cnt);
            body.appendChild(row);
        });
    }

    /* ==== SELECCIÓN de usuario (desde lista o búsqueda exacta) ==== */
    function selectUser(uid) {
        state.uid = uid;
        const raw = state.dir[uid];
        state.name = raw ? adapt(raw).name : 'Usuario';
        if (state.prev) {
            state.pn.textContent = state.name;
            state.pu.textContent = 'UID: ' + uid;
            state.pav.textContent = String(state.name).charAt(0).toUpperCase();
            state.prev.style.display = 'flex';
        }
        fb('Usuario cargado: ' + (state.name || uid) + '. Otorga o quita badges abajo.', false);
        renderList();
        renderUserList();
    }

    /* ==== BÚSQUEDA EXACTA (@handler -> uid, o UID directo) ==== */
    function resolve(q, cb) {
        const raw = String(q || '').trim();
        const h = raw.toLowerCase().replace(/^@/, '');
        if (!h) { cb(null); return; }
        if (raw.charAt(0) !== '@' && /^[a-zA-Z0-9]{20,}$/.test(h)) {
            return db().ref('users/' + h + '/username').once('value').then(function (s) {
                cb(s.val() ? h : null);
            }).catch(function () { cb(null); });
        }
        db().ref('handlers/' + h).once('value').then(function (s) {
            cb(s.val() || null);
        }).catch(function () { cb(null); });
    }

    /* ==== LISTA DE BADGES del usuario seleccionado ==== */
    function renderList() {
        const host = state.list;
        if (!host) return;
        while (host.firstChild) host.removeChild(host.firstChild);
        const CATALOG = SB.CATALOG || {};
        if (!state.uid) return;
        db().ref(NODE + '/' + state.uid).once('value').then(function (s) {
            while (host.firstChild) host.removeChild(host.firstChild);
            const mine = s.val() || {};
            const ids = Object.keys(CATALOG).sort(function (a, b) {
                return (CATALOG[a].order || 99) - (CATALOG[b].order || 99) || a.localeCompare(b);
            });
            for (let i = 0; i < ids.length; i++) host.appendChild(rowFor(ids[i], !!mine[ids[i]]));
        }).catch(function (e) { fb('❌ No se pudo leer los badges: ' + (e && e.message || e), true); });
    }

    function rowFor(id, has) {
        const b = SB.CATALOG[id];
        const row = el('div', null, 'scbm-row');

        const left = el('div', 'display:flex;align-items:center;gap:14px;min-width:0;flex:1;');
        left.appendChild(SB.staticIcon(id, 28));
        const txt = el('div', 'display:flex;flex-direction:column;gap:2px;min-width:0;');
        const nm = el('b', 'font:800 13.5px Inter,sans-serif;color:var(--text-main,#f8fafc);');
        nm.textContent = b.label;
        const ds = el('span', 'font:600 11px Inter,sans-serif;color:var(--text-muted,#94a3b8);');
        ds.textContent = b.desc;
        txt.appendChild(nm); txt.appendChild(ds);
        left.appendChild(txt);
        row.appendChild(left);

        const st = el('span', 'font:800 10.5px Inter,sans-serif;letter-spacing:.1em;flex:none;');
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
                renderList(); refreshBadges();
            })
            .catch(function (e) { fb('❌ No se pudo otorgar: ' + (e && e.message || e), true); });
    }
    function revoke(id) {
        if (id === 'owner' && !state.canOwner) { fb('❌ Solo el Owner puede manejar el badge Owner.', true); return; }
        db().ref(NODE + '/' + state.uid + '/' + id).remove()
            .then(function () {
                fb('🗑️ Badge "' + SB.CATALOG[id].label + '" quitado a ' + (state.name || state.uid) + '.', false);
                renderList(); refreshBadges();
            })
            .catch(function (e) { fb('❌ No se pudo quitar: ' + (e && e.message || e), true); });
    }

    /* ==== PANEL ==== */
    function buildPanel() {
        const backdrop = el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:4600;background:rgba(5,4,10,.7);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Inter,sans-serif;');
        const panel = el('div', 'width:620px;max-width:92vw;max-height:88vh;overflow-y:auto;background:var(--bg-card,#1a1625);border:1px solid rgba(251,191,36,.45);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 30px rgba(251,191,36,.12);color:var(--text-main,#f8fafc);box-sizing:border-box;');

        const head = el('div', 'display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid var(--border-color,#2e2440);background:linear-gradient(135deg,rgba(124,58,237,.25),rgba(251,191,36,.12));');
        const crown = el('span', 'font-size:26px;'); crown.textContent = '👑';
        const ht = el('div', 'display:flex;flex-direction:column;flex:1;');
        const h1 = el('h2', 'margin:0;font:800 17px Inter,sans-serif;letter-spacing:.02em;'); h1.textContent = 'Badges — Orgullo de la web';
        const h2 = el('span', 'font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);'); h2.textContent = 'Otorga insignias que se muestran en los perfiles';
        ht.appendChild(h1); ht.appendChild(h2);
        const x = el('button', 'width:34px;height:34px;border-radius:10px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:15px;flex:none;');
        x.type = 'button'; x.textContent = '✕';
        x.addEventListener('click', close);
        head.appendChild(crown); head.appendChild(ht); head.appendChild(x);
        panel.appendChild(head);

        const body = el('div', 'padding:20px 22px 22px;');

        /* buscador + botón de orden cíclico */
        const srow = el('div', 'display:flex;gap:10px;');
        const inp = el('input', 'flex:1;min-width:0;padding:12px 15px;border-radius:12px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);font:600 14px Inter,sans-serif;outline:none;box-sizing:border-box;');
        inp.placeholder = 'Filtrar por nombre, @handler, correo o UID…';
        const go = el('button', null, 'scbm-btn'); go.type = 'button';
        go.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;flex:none;';
        go.textContent = 'Buscar';
        go.title = 'Búsqueda exacta por @handler o UID';
        const sortBtn = el('button', 'display:inline-flex;align-items:center;gap:7px;flex:none;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);border-radius:12px;padding:0 13px;color:var(--text-main,#f8fafc);cursor:pointer;transition:filter .12s;');
        sortBtn.type = 'button';
        const sIc = el('span', 'font-size:13px;display:inline-flex;');
        const sLb = el('span', 'font:800 10.5px Inter,sans-serif;letter-spacing:.08em;');
        sortBtn.appendChild(sIc); sortBtn.appendChild(sLb);
        srow.appendChild(inp); srow.appendChild(go); srow.appendChild(sortBtn);
        body.appendChild(srow);

        function paintSortBtn() {
            const m = SORTS.find(function (s) { return s.id === state.sort; }) || SORTS[0];
            sIc.innerHTML = '<i class="fa-solid ' + m.icon + '" aria-hidden="true"></i>';
            sLb.textContent = m.label;
            sortBtn.title = m.title;
        }
        function cycleSort() {
            const i = SORTS.findIndex(function (s) { return s.id === state.sort; });
            state.sort = SORTS[(i + 1) % SORTS.length].id;
            paintSortBtn(); renderUserList();
        }
        sortBtn.addEventListener('click', cycleSort);
        paintSortBtn();

        /* CATÁLOGO (plegable) */
        state.catBox = el('div', 'margin-top:16px;border:1px solid var(--border-color,#2e2440);border-radius:14px;overflow:hidden;background:rgba(124,58,237,.06);');
        const catHead = el('button', 'display:flex;align-items:center;gap:9px;width:100%;box-sizing:border-box;border:0;background:transparent;padding:11px 14px;cursor:pointer;color:var(--text-main,#f8fafc);');
        catHead.type = 'button';
        const ct1 = el('span', 'font:800 10.5px Inter,sans-serif;letter-spacing:.16em;color:var(--purple-accent,#8b5cf6);flex:1;text-align:left;');
        ct1.textContent = 'CATÁLOGO DE BADGES';
        const catCnt = el('span', null, 'scbm-cat-count');
        catCnt.style.cssText = 'font:800 10px Inter,sans-serif;background:rgba(139,92,246,.16);color:#c4b5fd;border-radius:7px;padding:2px 8px;';
        const chev = el('span', 'font-size:11px;color:var(--text-muted,#94a3b8);transition:transform .18s ease;');
        chev.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
        catHead.appendChild(ct1); catHead.appendChild(catCnt); catHead.appendChild(chev);
        catHead.addEventListener('click', function () {
            state.catOpen = !state.catOpen;
            chev.style.transform = state.catOpen ? '' : 'rotate(-90deg)';
            renderCatalog();
        });
        state.catBody = el('div', 'display:flex;flex-direction:column;gap:8px;padding:10px 12px 12px;');
        state.catBox.appendChild(catHead); state.catBox.appendChild(state.catBody);
        body.appendChild(state.catBox);

        /* NAVEGADOR DE USUARIOS */
        state.ulist = el('div', 'margin-top:14px;border:1px solid var(--border-color,#2e2440);border-radius:14px;background:var(--bg-main,#0d0b14);max-height:250px;overflow-y:auto;');
        body.appendChild(state.ulist);

        /* preview del usuario seleccionado */
        const prev = el('div', 'display:none;align-items:center;gap:12px;margin-top:14px;padding:12px 14px;border-radius:14px;border:1px dashed var(--border-color,#2e2440);');
        const pav = el('span', 'width:44px;height:44px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font:800 16px Inter,sans-serif;');
        const ptx = el('div', 'display:flex;flex-direction:column;min-width:0;');
        const pn = el('b', 'font:800 15px Inter,sans-serif;');
        const pu = el('span', 'font:600 11px Inter,sans-serif;color:var(--text-muted,#94a3b8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;');
        ptx.appendChild(pn); ptx.appendChild(pu);
        prev.appendChild(pav); prev.appendChild(ptx);
        body.appendChild(prev);
        state.prev = prev; state.pav = pav; state.pn = pn; state.pu = pu;

        /* badges del usuario seleccionado */
        state.list = el('div', 'display:flex;flex-direction:column;gap:10px;margin-top:14px;');
        body.appendChild(state.list);

        state.fb = el('p', 'margin:14px 0 0;font:700 12px Inter,sans-serif;min-height:16px;');
        body.appendChild(state.fb);

        panel.appendChild(body);
        backdrop.appendChild(panel);
        backdrop.addEventListener('click', function () { close(); });
        panel.addEventListener('click', function (e) { e.stopPropagation(); });

        inp.addEventListener('input', function () { state.q = inp.value; renderUserList(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            resolve(inp.value, function (uid) {
                if (!uid) { fb('❌ Usuario no encontrado. Prueba con su @handler exacto o elige de la lista.', true); return; }
                if (!state.dir[uid]) state.dir[uid] = { username: 'Usuario' };
                selectUser(uid);
            });
        });
        go.addEventListener('click', function () {
            resolve(inp.value, function (uid) {
                if (!uid) { fb('❌ Usuario no encontrado. Prueba con su @handler exacto o elige de la lista.', true); return; }
                if (!state.dir[uid]) state.dir[uid] = { username: 'Usuario' };
                selectUser(uid);
            });
        });

        return backdrop;
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

    function open() {
        if (state.open) return;
        state.open = true;
        state.backdrop = buildPanel();
        document.body.appendChild(state.backdrop);
        try { state.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }); } catch (e) {}
        state.esc = function (e) {
            if (!state.open || e.key !== 'Escape') return;
            e.preventDefault(); e.stopPropagation(); close();
        };
        document.addEventListener('keydown', state.esc, true);
        renderUserList(); renderCatalog();
        loadDirectory();
    }
    function close() {
        if (!state.open) return;
        state.open = false;
        if (state.esc) { document.removeEventListener('keydown', state.esc, true); state.esc = null; }
        const b = state.backdrop;
        state.backdrop = null; state.list = null; state.fb = null; state.uid = null; state.name = '';
        state.ulist = null; state.catBox = null; state.catBody = null;
        state.prev = null; state.pav = null; state.pn = null; state.pu = null;
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

    console.log('[Stevscon] badges_manage.js listo (v3) — navegador de usuarios + catálogo + orden cíclico 👑');
})(window, document);