/**
 * ====
 * STEVSCON.COM — social/manage/output/security/accounts/accounts.js (v2)
 * MÓDULO «ACCOUNTS» del panel de Seguridad.
 *
 *  v2: el() local arreglado (cssText + className separados) · botón ABRIR
 *      funcional · openDetail() definido · caja rediseñada con contadores
 *      en celdas · pestañas con estado · búsqueda ya no pierde el foco.
 *
 *  - BOX en el panel (SEC.body) + VENTANA tipo panel (z 2147483040).
 *  - Lista completa con búsqueda y filtros (Todos/Staff/Verificados/Baneados).
 *  - Detalle por cuenta: UID, email, handler, rango, verificación, estado,
 *    registro, descripción, contadores y su contenido (posts/comentarios/
 *    respuestas) + acciones (ban, verificar 5 tipos, rango staff) + historial.
 *
 *  SEGURIDAD: Firebase Auth exclusivo · todo texto de usuario con
 *  textContent (NUNCA innerHTML con datos) · innerHTML solo para iconos.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.secAccounts) return;

    /* ==== RUTAS (alineadas a tu árbol real) ==== */
    const CFG = {
        USERS: 'users',
        STAFF: 'social/staff',
        POSTS: 'social/posts',
        COMMENTS: 'social/comments',
        RESPONSES: 'social/responses',
        BANS: 'security/accounts/bans',
        LOGS: 'security/accounts/logs'
    };
    const OWNER_EMAIL = (SCSOC.CONFIG && SCSOC.CONFIG.OWNER_EMAIL) || 'steven23hd@gmail.com';

    const A = SCSOC.secAccounts = {
        open: function (uid) { openWin(uid || null); },
        close: closeWin
    };

    /* ==== ESTADO ==== */
    let myRole = null;
    let mounted = false;
    const S = {
        users: {}, bans: {}, staff: {}, logs: [], verified: {},
        attachedVerified: {},
        permUsers: false, permBans: false, permLogs: false,
        tab: 'cuentas',
        detail: null,
        q: '', filter: 'todos', refocus: false,
        act: null, actAt: 0, actFor: null,
        detailSub: 'posts',
        win: false, modalFor: null
    };

    /* ==== DOM refs ==== */
    let statN, statS, statB, listHost, winEl, backdropEl, winBody, winCount, tabBtnC, tabBtnH, modalEl, modalTitle, modalReason;

    /* ==== HELPERS ==== */
    function toast(m) { if (SCSOC.toast) try { SCSOC.toast(m); } catch (e) {} else console.log('[SEC accounts] ' + m); }

    /* el() LOCAL — css inline y clase van por SEPARADO (este era el bug v1) */
    function el(tag, css, cls) {
        const n = document.createElement(tag);
        if (css) n.style.cssText = css;
        if (cls) n.className = cls;
        return n;
    }
    function E(tag, cls) { return el(tag, '', cls); }

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function isOwnerEmail(e) { return String(e || '').toLowerCase() === OWNER_EMAIL; }
    function roleOf(st) { if (!st) return null; if (typeof st === 'string') return st; return st.role || null; }
    function isOwnerAcc(uid) { const r = S.users[uid]; return !!(r && isOwnerEmail(r.email)); }
    function canAct() { const r = roleNow(); return r === 'owner' || r === 'admin'; }
    function roleNow() {
        const u = me();
        if (u && isOwnerEmail(u.email)) return 'owner';
        if (u && S.staff[u.uid]) return roleOf(S.staff[u.uid]) || myRole;
        return myRole;
    }
    function adapt(raw) {
        raw = raw || {};
        const p = raw.profile || {};
        return {
            _name: raw.name || raw.displayName || raw.username || p.name || p.username || 'Usuario',
            _handler: String(raw.handler || raw.tag || p.handler || '').toLowerCase().replace(/^@/, ''),
            _avatar: raw.avatarUrl || raw.avatar || p.avatarUrl || p.avatar ||
                (raw.media && (raw.media.avatar || raw.media.avatarUrl)) || '',
            _avatarPreset: raw.avatarPreset || p.avatarPreset || ''
        };
    }
    function presenceOf(raw) { return (raw && raw.online && raw.online.state) || (raw && raw.presence) || ''; }
    function statusOf(raw) {
        const st = raw && raw.status;
        if (st && typeof st === 'object') return String(st.state || '') || presenceOf(raw);
        if (typeof st === 'string' && st) return st;
        return presenceOf(raw);
    }
    const STATUS = {
        online:   { label: 'En línea',     color: '#22c55e' },
        inactive: { label: 'Inactivo',     color: '#f59e0b' },
        busy:     { label: 'Ocupado',      color: '#ef4444' },
        offline:  { label: 'Desconectado', color: '#6b7280' }
    };
    function nameOf(uid) {
        const r = S.users[uid];
        if (!r) return '(cuenta eliminada)';
        return adapt(r)._name;
    }
    function myName() {
        const u = me();
        if (!u) return 'sistema';
        const r = S.users[u.uid];
        return r ? adapt(r)._name : String(u.email || u.uid);
    }
    function avatarEl(a, size, st) {
        if (SCSOC.avatarEl) { try { return SCSOC.avatarEl(a, size, st); } catch (e) {} }
        const d = el('div', 'flex:none;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--bg-hover,#261f36);display:flex;align-items:center;justify-content:center;font:800 ' + Math.max(10, Math.round(size * .4)) + 'px Inter,sans-serif;color:var(--text-main,#f8fafc);border:2px solid ' + ((STATUS[st] || {}).color || '#6b7280') + ';overflow:hidden;box-sizing:border-box;');
        d.textContent = String(a._name || '?').charAt(0).toUpperCase();
        return d;
    }
    function copyText(t) {
        try {
            navigator.clipboard.writeText(t).then(function () { toast('Copiado: ' + t); },
                function () { toast('No se pudo copiar'); });
        } catch (e) { toast('No se pudo copiar'); }
    }
    function fmtDate(ts) {
        const n = Number(ts);
        if (!n) return String(ts || '—');
        try {
            return new Date(n).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) +
                ' · ' + new Date(n).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return String(ts); }
    }
    function renderSoon() {
        if (renderSoon._p) return;
        renderSoon._p = true;
        setTimeout(function () { renderSoon._p = false; render(); }, 60);
    }

    /* ==== LOG / HISTORIAL ==== */
    const LOG_META = {
        ban:          { icon: 'fa-ban',         color: '#f87171', label: 'BANEÓ' },
        unban:        { icon: 'fa-unlock',      color: '#22c55e', label: 'DESBANEÓ' },
        verify:       { icon: 'fa-certificate', color: '#facc15', label: 'VERIFICÓ' },
        unverify:     { icon: 'fa-certificate', color: '#94a3b8', label: 'QUITÓ VERIFICACIÓN' },
        staff_add:    { icon: 'fa-user-shield', color: '#8b5cf6', label: 'DIO RANGO' },
        staff_remove: { icon: 'fa-user-slash',  color: '#94a3b8', label: 'QUITÓ RANGO' }
    };
    function addLog(action, targetUid, detail) {
        const u = me();
        db().ref(CFG.LOGS).push({
            action: action,
            uid: targetUid || '',
            name: nameOf(targetUid),
            detail: String(detail || ''),
            byUid: u ? u.uid : '',
            byName: myName(),
            at: firebase.database.ServerValue.TIMESTAMP
        }).catch(function (e) {
            console.warn('[SEC accounts] historial falló:', e && e.code);
        });
    }
    function objToLogs(v) {
        const out = [], o = v || {};
        Object.keys(o).forEach(function (k) {
            const e = o[k];
            if (e && e.action) out.push({
                id: k, action: e.action, uid: e.uid || '', name: e.name || '',
                detail: e.detail || '', byUid: e.byUid || '', byName: e.byName || '', at: e.at || 0
            });
        });
        out.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        return out;
    }

    /* ==== ACCIONES (escrituras) ==== */
    function doBan(uid, reason) {
        if (!canAct()) return toast('⚠️ Solo Owner y Admins pueden banear');
        if (isOwnerAcc(uid)) return toast('⚠️ El Owner no puede ser baneado');
        if (me() && uid === me().uid) return toast('⚠️ No puedes banearte a ti mismo');
        const u = me();
        db().ref(CFG.BANS).child(uid).set({
            reason: String(reason || ''),
            by: u ? u.uid : '',
            byName: myName(),
            at: firebase.database.ServerValue.TIMESTAMP
        }).then(function () {
            addLog('ban', uid, reason ? ('Razón: ' + reason) : '');
            toast('Cuenta baneada');
            closeModal(); render();
        }).catch(function (e) { toast('⚠️ No se pudo banear (' + (e && e.code || 'error') + ')'); });
    }
    function emailKey(e) {
        /* Firebase no permite . # $ [ ] en llaves: el punto va a coma (igual que banned.js) */
        return String(e || '').trim().toLowerCase().replace(/[.#$\[\]]/g, function (ch) {
            return ch === '.' ? ',' : '_';
        });
    }
    function doUnban(uid, reason) {
        if (!canAct()) return toast('⚠️ Solo Owner y Admins pueden desbanear');
        const u = me();
        const rec = {
            by: String((u && u.uid) || 'owner'),
            byName: String(myName() || 'Staff'),
            reason: String(reason || '').slice(0, 300),
            at: firebase.database.ServerValue.TIMESTAMP
        };
        /* 1) Intentar aviso (si falla, el desban IGUAL procede) → 2) quitar ban → 3) limpiar espejo */
        db().ref(CFG.UNBANS).child(uid).set(rec).catch(function (err) {
            console.warn('[SC-ACC] aviso de unban no guardado:', err && err.code);
            return null;
        }).then(function () {
            return db().ref(CFG.BANS).child(uid).remove();
        }).then(function () {
            const em = (S.users[uid] || {}).email;
            if (em) db().ref(CFG.BAN_EMAILS).child(emailKey(em)).remove().catch(function () {});
            try { addLog('unban', uid, rec.reason ? ('Razón: ' + rec.reason) : ''); } catch (e) {}
            toast('✅ Ban quitado — cuenta libre');
            closeUnbanModal();
            render();
        }).catch(function (e) {
            toast('⚠️ No se pudo desbanear (' + (e && e.code || 'error') + ')');
        });
    }
    function vLabel(type) {
        try { const t = SCSOC.verified && SCSOC.verified.TYPES && SCSOC.verified.TYPES[type]; return (t && t.label) || type; } catch (e) { return type; }
    }
    function doVerify(uid, type) {
        if (!SCSOC.verified) return;
        SCSOC.verified.grant(uid, type).then(function () {
            addLog('verify', uid, vLabel(type));
            toast('Verificación aplicada ✅');
            render();
        }).catch(function (err) { toast('⚠️ ' + (err && err.message ? err.message : 'No se pudo verificar')); });
    }
    function doUnverify(uid) {
        if (!SCSOC.verified) return;
        SCSOC.verified.revoke(uid).then(function () {
            addLog('unverify', uid, '');
            toast('Verificación quitada');
            render();
        }).catch(function (err) { toast('⚠️ ' + (err && err.message ? err.message : 'No se pudo quitar')); });
    }
    function doStaff(uid, role) {
        if (roleNow() !== 'owner') return toast('⚠️ Solo el Owner cambia rangos staff');
        if (isOwnerAcc(uid)) return toast('⚠️ El Owner ya tiene el rango máximo');
        if (me() && uid === me().uid) return toast('⚠️ No puedes cambiar tu propio rango aquí');
        const ref = db().ref(CFG.STAFF).child(uid);
        const done = function () {
            addLog(role ? 'staff_add' : 'staff_remove', uid, role ? ('Rango: ' + role) : '');
            toast(role ? ('Rango ' + role + ' asignado') : 'Rango staff retirado');
            render();
        };
        const fail = function () { toast('⚠️ Solo el Owner puede cambiar rangos staff'); };
        if (role) ref.set({ role: role }).then(done, fail);
        else ref.remove().then(done, fail);
    }

    /* ==== MODAL DE BANEO ==== */
    function ensureModal() {
        if (modalEl) return;
        const back = el('div', 'position:fixed;inset:0;background:rgba(5,3,12,.7);z-index:2147483050;display:none;align-items:center;justify-content:center;padding:20px;');
        const card = el('div', 'width:min(430px,94vw);background:var(--bg-card,#16121f);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.6);');
        modalTitle = el('div', 'font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-bottom:6px;');
        const hint = el('div', 'font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-bottom:12px;');
        hint.textContent = 'El ban queda registrado en el historial con tu nombre.';
        modalReason = document.createElement('textarea');
        modalReason.placeholder = 'Razón del ban (opcional)…';
        modalReason.rows = 3;
        modalReason.style.cssText = 'width:100%;box-sizing:border-box;resize:vertical;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;color:var(--text-main,#f8fafc);font:600 13px Inter,sans-serif;padding:10px 12px;outline:none;';
        const note = el('div', 'font:600 11.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:10px;line-height:1.5;');
        note.textContent = 'Nota: esto registra el ban en la base de datos. Que la web lo ejecute (bloquear publicar/comentar) lo conectamos en el siguiente paso.';
        const btns = el('div', 'display:flex;gap:10px;justify-content:flex-end;margin-top:14px;');
        const c = el('button', 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-main,#f8fafc);font:700 12.5px Inter,sans-serif;padding:9px 14px;border-radius:9px;cursor:pointer;');
        c.type = 'button'; c.textContent = 'Cancelar';
        c.addEventListener('click', closeModal);
        const go = el('button', 'border:1px solid rgba(239,68,68,.5);background:rgba(239,68,68,.12);color:#f87171;font:800 12.5px Inter,sans-serif;padding:9px 14px;border-radius:9px;cursor:pointer;');
        go.type = 'button'; go.textContent = 'Banear cuenta';
        go.addEventListener('click', function () { if (S.modalFor) doBan(S.modalFor, modalReason.value); });
        btns.appendChild(c); btns.appendChild(go);
        card.appendChild(modalTitle); card.appendChild(hint); card.appendChild(modalReason);
        card.appendChild(note); card.appendChild(btns);
        back.appendChild(card);
        back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
        document.body.appendChild(back);
        modalEl = back;
    }
    function openBanModal(uid) {
        ensureModal();
        S.modalFor = uid;
        modalTitle.textContent = 'Banear a ' + nameOf(uid);
        modalReason.value = '';
        modalEl.style.display = 'flex';
        try { modalReason.focus(); } catch (e) {}
    }
    function closeModal() {
        S.modalFor = null;
        if (modalEl) modalEl.style.display = 'none';
    }

    /* ==== MODAL DE DESBANEO (v3) ==== */
    let unbanModalEl = null, unbanTitleEl = null, unbanReasonEl = null;
    function ensureUnbanModal() {
        if (unbanModalEl) return;
        const back = el('div', 'position:fixed;inset:0;background:rgba(5,3,12,.7);z-index:2147483050;display:none;align-items:center;justify-content:center;padding:20px;');
        const card = el('div', 'width:min(430px,94vw);background:var(--bg-card,#16121f);border:1px solid rgba(34,197,94,.45);border-radius:14px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.6);');
        unbanTitleEl = el('div', 'font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-bottom:6px;');
        const hint = el('div', 'font:600 12px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-bottom:12px;');
        hint.textContent = 'Se quitará el ban y el usuario recibirá un aviso verde con tu nombre y esta razón.';
        unbanReasonEl = document.createElement('textarea');
        unbanReasonEl.placeholder = 'Razón del desban (opcional)…';
        unbanReasonEl.rows = 3;
        unbanReasonEl.style.cssText = 'width:100%;box-sizing:border-box;resize:vertical;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;color:var(--text-main,#f8fafc);font:600 13px Inter,sans-serif;padding:10px 12px;outline:none;';
        const btns = el('div', 'display:flex;gap:10px;justify-content:flex-end;margin-top:14px;');
        const c = el('button', 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-main,#f8fafc);font:700 12.5px Inter,sans-serif;padding:9px 14px;border-radius:9px;cursor:pointer;');
        c.type = 'button'; c.textContent = 'Cancelar';
        c.addEventListener('click', closeUnbanModal);
        const go = el('button', 'border:1px solid rgba(34,197,94,.5);background:rgba(34,197,94,.12);color:#4ade80;font:800 12.5px Inter,sans-serif;padding:9px 14px;border-radius:9px;cursor:pointer;');
        go.type = 'button'; go.textContent = 'Quitar ban';
        go.addEventListener('click', function () { if (S.unbanFor) doUnban(S.unbanFor, unbanReasonEl.value); });
        btns.appendChild(c); btns.appendChild(go);
        card.appendChild(unbanTitleEl); card.appendChild(hint); card.appendChild(unbanReasonEl);
        card.appendChild(btns);
        back.appendChild(card);
        back.addEventListener('click', function (e) { if (e.target === back) closeUnbanModal(); });
        document.body.appendChild(back);
        unbanModalEl = back;
    }
    function openUnbanModal(uid) {
        ensureUnbanModal();
        S.unbanFor = uid;
        unbanTitleEl.textContent = 'Desbanear a ' + nameOf(uid);
        unbanReasonEl.value = '';
        unbanModalEl.style.display = 'flex';
        try { unbanReasonEl.focus(); } catch (e) {}
    }
    function closeUnbanModal() {
        S.unbanFor = null;
        if (unbanModalEl) unbanModalEl.style.display = 'none';
    }

    /* ==== ACTIVIDAD (posts/comentarios/respuestas del usuario) ==== */
    function loadActivity(uid, cb) {
        const now = Date.now();
        if (S.act && S.actFor === uid && now - S.actAt < 30000) return cb(S.act);
        Promise.all([
            db().ref(CFG.POSTS).once('value'),
            db().ref(CFG.COMMENTS).once('value'),
            db().ref(CFG.RESPONSES).once('value')
        ]).then(function (rs) {
            const posts = [], comments = [], responses = [];
            const pv = rs[0].val() || {};
            Object.keys(pv).forEach(function (pid) {
                const p = pv[pid]; if (!p) return;
                const mediaN = p.media ? (Array.isArray(p.media) ? p.media.length : Object.keys(p.media).length) : 0;
                posts.push({ id: pid, uid: p.authorUid || '', text: p.text || '', at: p.createdAt || 0, cat: p.category || '', media: mediaN });
            });
            const cv = rs[1].val() || {};
            Object.keys(cv).forEach(function (pid) {
                const cs = cv[pid] || {};
                Object.keys(cs).forEach(function (cid) {
                    const c = cs[cid]; if (!c) return;
                    comments.push({ id: cid, uid: c.authorUid || '', postId: pid, text: c.text || '', at: c.createdAt || 0 });
                });
            });
            const rv = rs[2].val() || {};
            Object.keys(rv).forEach(function (cid) {
                const rr = rv[cid] || {};
                Object.keys(rr).forEach(function (rid) {
                    const r = rr[rid]; if (!r) return;
                    responses.push({ id: rid, uid: r.authorUid || '', commentId: cid, text: r.text || '', depth: r.depth || 1, at: r.createdAt || 0 });
                });
            });
            const byNew = function (a, b) { return (b.at || 0) - (a.at || 0); };
            posts.sort(byNew); comments.sort(byNew); responses.sort(byNew);
            S.act = { posts: posts, comments: comments, responses: responses };
            S.actAt = now; S.actFor = uid;
            cb(S.act);
        }).catch(function (e) { cb(null, e); });
    }

    /* ==== RENDER MAESTRO ==== */
    function render() {
        /* contadores de la caja (siempre, aunque la ventana esté cerrada) */
        const n = Object.keys(S.users).length;
        let st = 0; Object.keys(S.staff).forEach(function (k) { if (roleOf(S.staff[k])) st++; });
        const b = Object.keys(S.bans).length;
        if (statN) statN.textContent = String(n);
        if (statS) statS.textContent = String(st);
        if (statB) statB.textContent = String(b);
        if (winCount) winCount.textContent = n + ' reg.';

        if (tabBtnC && tabBtnH) {
            tabBtnC.classList.toggle('sc-on', S.win && !S.detail && S.tab === 'cuentas');
            tabBtnH.classList.toggle('sc-on', S.win && !S.detail && S.tab === 'historial');
        }
        if (!S.win) return;
        if (S.detail) return renderDetail();
        if (S.tab === 'historial') return renderHistory();
        return renderList();
    }

    function openDetail(uid) {
        S.detail = uid;
        S.detailSub = 'posts';
        S.act = null; S.actFor = null;
        render();
        if (winBody) winBody.scrollTop = 0;
    }

    function filteredUids() {
        const q = S.q.trim().toLowerCase();
        let uids = Object.keys(S.users);
        if (S.filter === 'staff') uids = uids.filter(function (u) { return roleOf(S.staff[u]); });
        if (S.filter === 'verificados') uids = uids.filter(function (u) { return S.verified[u]; });
        if (S.filter === 'baneados') uids = uids.filter(function (u) { return S.bans[u]; });
        if (q) uids = uids.filter(function (uid) {
            const r = S.users[uid] || {}, a = adapt(r);
            return (a._name || '').toLowerCase().indexOf(q) !== -1 ||
                (a._handler || '').indexOf(q) !== -1 ||
                String(r.email || '').toLowerCase().indexOf(q) !== -1 ||
                uid.indexOf(q) !== -1;
        });
        uids.sort(function (a, b) {
            const oa = isOwnerAcc(a) ? 0 : (roleOf(S.staff[a]) ? 1 : 2);
            const ob = isOwnerAcc(b) ? 0 : (roleOf(S.staff[b]) ? 1 : 2);
            if (oa !== ob) return oa - ob;
            return (Number(S.users[b] && S.users[b].createdAt) || 0) - (Number(S.users[a] && S.users[a].createdAt) || 0);
        });
        return uids;
    }

    function badgesFor(uid) {
        const frag = document.createDocumentFragment();
        const mk = function (txt, bg, fg) {
            const b = el('span', 'font:800 9.5px Inter,sans-serif;letter-spacing:.08em;padding:2.5px 7px;border-radius:6px;flex:none;' + (bg ? 'background:' + bg + ';' : 'border:1px solid var(--border-color,#2e2440);') + 'color:' + fg + ';');
            b.textContent = txt; return b;
        };
        if (isOwnerAcc(uid)) frag.appendChild(mk('OWNER', 'rgba(250,204,21,.14)', '#facc15'));
        const ro = roleOf(S.staff[uid]);
        if (ro === 'admin') frag.appendChild(mk('ADMIN', 'rgba(139,92,246,.16)', '#c4b5fd'));
        if (ro === 'mod') frag.appendChild(mk('MOD', 'rgba(59,130,246,.16)', '#93c5fd'));
        if (S.bans[uid]) frag.appendChild(mk('BANEADO', 'rgba(239,68,68,.14)', '#f87171'));
        return frag;
    }

    function iconBtn(icon, title, color, onClick) {
        const b = el('button', 'flex:none;width:32px;height:32px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:' + color + ';font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s ease,transform .15s ease;');
        b.type = 'button'; b.title = title;
        b.setAttribute('aria-label', title);
        b.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
        b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
        return b;
    }

    function renderList() {
        if (!listHost) return;
        const scroll = listHost.scrollTop;
        while (listHost.firstChild) listHost.removeChild(listHost.firstChild);

        /* barra de búsqueda + filtros */
        const bar = el('div', 'display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border-color,#2e2440);position:sticky;top:0;background:var(--bg-card,#16121f);z-index:1;');
        const search = el('input', 'width:100%;box-sizing:border-box;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;color:var(--text-main,#f8fafc);font:600 13px Inter,sans-serif;padding:10px 12px;outline:none;');
        search.type = 'text';
        search.placeholder = 'Buscar por nombre, @handler, correo o UID…';
        search.value = S.q;
        search.addEventListener('input', function () { S.q = search.value; S.refocus = true; renderSoon(); });
        bar.appendChild(search);

        const chips = el('div', 'display:flex;gap:6px;flex-wrap:wrap;');
        [['todos', 'TODOS'], ['staff', 'STAFF'], ['verificados', 'VERIFICADOS'], ['baneados', 'BANEADOS']].forEach(function (f) {
            const on = S.filter === f[0];
            const c = el('button', 'border:1px solid ' + (on ? 'var(--purple-accent,#8b5cf6)' : 'var(--border-color,#2e2440)') + ';background:' + (on ? 'rgba(139,92,246,.14)' : 'transparent') + ';color:' + (on ? 'var(--purple-accent,#8b5cf6)' : 'var(--text-muted,#94a3b8)') + ';font:800 10.5px Inter,sans-serif;letter-spacing:.08em;padding:6px 10px;border-radius:8px;cursor:pointer;');
            c.type = 'button'; c.textContent = f[1];
            c.addEventListener('click', function () { S.filter = f[0]; render(); });
            chips.appendChild(c);
        });
        bar.appendChild(chips);
        listHost.appendChild(bar);

        /* error de permisos */
        if (S.permUsers) {
            const err = el('div', 'margin:16px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171;border-radius:12px;padding:14px;font:600 12.5px Inter,sans-serif;line-height:1.6;');
            err.textContent = 'PERMISSION_DENIED leyendo users/ — publica las reglas nuevas de Firebase (lectura staff de users + nodo security). Sin eso, ACCOUNTS no puede listar las cuentas.';
            listHost.appendChild(err);
            return;
        }

        const uids = filteredUids();
        if (!uids.length) {
            const empty = el('div', 'padding:44px 20px;text-align:center;color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;');
            empty.textContent = (S.q || S.filter !== 'todos') ? 'Ninguna cuenta coincide con la búsqueda/filtro.' : 'Aún no hay cuentas registradas.';
            listHost.appendChild(empty);
            return;
        }

        uids.forEach(function (uid) {
            const raw = S.users[uid] || {};
            const a = adapt(raw);
            const st = statusOf(raw);
            const stM = STATUS[st] || { label: st || '—', color: '#6b7280' };
            const row = el('div', 'display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-color,#2e2440);cursor:pointer;transition:background .15s ease;');
            row.addEventListener('click', function () { openDetail(uid); });
            row.addEventListener('mouseenter', function () { row.style.background = 'var(--bg-hover,#261f36)'; });
            row.addEventListener('mouseleave', function () { row.style.background = 'transparent'; });

            row.appendChild(avatarEl(a, 40, st));

            const mid = el('div', 'flex:1;min-width:0;');
            const nameLine = el('div', 'display:flex;align-items:center;gap:7px;flex-wrap:wrap;');
            const nm = el('b', 'color:var(--text-main,#f8fafc);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;');
            nm.textContent = a._name;
            nameLine.appendChild(nm);
            const badgeSlot = el('span', 'display:inline-flex;flex:none;align-items:center;');
            nameLine.appendChild(badgeSlot);
            if (SCSOC.verified) SCSOC.verified.watch(uid, function (type) {
                while (badgeSlot.firstChild) badgeSlot.removeChild(badgeSlot.firstChild);
                S.verified[uid] = type;
                if (type) badgeSlot.appendChild(SCSOC.verified.badgeEl(type, 14));
            });
            nameLine.appendChild(badgesFor(uid));
            mid.appendChild(nameLine);

            const sub = el('div', 'display:flex;align-items:center;gap:6px;margin-top:3px;color:var(--text-muted,#94a3b8);font:600 11.5px Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
            const dot = el('span', 'width:8px;height:8px;border-radius:50%;flex:none;background:' + stM.color + ';');
            sub.appendChild(dot);
            const subTxt = el('span');
            subTxt.textContent = (a._handler ? '@' + a._handler + ' · ' : '') + (raw.email || 'sin correo') + ' · ' + stM.label;
            sub.appendChild(subTxt);
            mid.appendChild(sub);
            row.appendChild(mid);

            const right = el('div', 'display:flex;align-items:center;gap:7px;flex:none;');
            const reg = el('span', 'color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;text-align:right;');
            reg.textContent = raw.createdAt ? SCSOC.timeAgo(Number(raw.createdAt)) : '';
            right.appendChild(reg);
            if (canAct() && !isOwnerAcc(uid) && !(me() && uid === me().uid)) {
                if (S.bans[uid]) right.appendChild(iconBtn('fa-unlock', 'Quitar ban', '#22c55e', function () { openUnbanModal(uid); }));
                else right.appendChild(iconBtn('fa-ban', 'Banear', '#f87171', function () { openBanModal(uid); }));
            }
            right.appendChild(iconBtn('fa-circle-info', 'Ver información completa', 'var(--purple-accent,#8b5cf6)', function () { openDetail(uid); }));
            row.appendChild(right);

            listHost.appendChild(row);
        });

        /* devolver el foco al buscador tras re-render (no perder teclas) */
        if (S.refocus) {
            S.refocus = false;
            const inp = listHost.querySelector('input');
            if (inp) {
                inp.focus();
                try { const L = inp.value.length; inp.setSelectionRange(L, L); } catch (e) {}
            }
        }

        listHost.scrollTop = scroll;
    }

    function renderHistory() {
        if (!listHost) return;
        while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
        if (S.permLogs) {
            const err = el('div', 'margin:16px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#f87171;border-radius:12px;padding:14px;font:600 12.5px Inter,sans-serif;line-height:1.6;');
            err.textContent = 'PERMISSION_DENIED leyendo security/accounts/logs — publica las reglas nuevas.';
            listHost.appendChild(err);
            return;
        }
        if (!S.logs.length) {
            const empty = el('div', 'padding:44px 20px;text-align:center;color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;line-height:1.6;');
            empty.textContent = 'Sin acciones registradas todavía. Cada ban, verificación o cambio de rango aparecerá aquí.';
            listHost.appendChild(empty);
            return;
        }
        const wrap = el('div', 'padding:6px 0;');
        S.logs.slice(0, 200).forEach(function (e) {
            const m = LOG_META[e.action] || { icon: 'fa-shield-halved', color: '#94a3b8', label: e.action.toUpperCase() };
            const row = el('div', 'display:flex;gap:12px;align-items:flex-start;padding:11px 16px;border-bottom:1px solid var(--border-color,#2e2440);');
            const ic = el('span', 'flex:none;width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--bg-main,#0d0b14);');
            ic.style.color = m.color;
            ic.innerHTML = '<i class="fa-solid ' + m.icon + '" aria-hidden="true"></i>';
            row.appendChild(ic);
            const mid = el('div', 'flex:1;min-width:0;');
            const l1 = el('div', 'color:var(--text-main,#f8fafc);font:700 12.5px Inter,sans-serif;line-height:1.45;word-break:break-word;');
            const b = el('b'); b.style.color = m.color; b.textContent = m.label + ' ';
            l1.appendChild(b);
            const tgt = document.createElement('span');
            tgt.textContent = (e.name || (e.uid ? e.uid.slice(0, 10) + '…' : '')) + (e.detail ? ' · ' + e.detail : '');
            l1.appendChild(tgt);
            mid.appendChild(l1);
            const l2 = el('div', 'color:var(--text-muted,#94a3b8);font:600 11px Inter,sans-serif;margin-top:2px;');
            l2.textContent = 'por ' + (e.byName || '—') + (e.at ? ' · ' + SCSOC.timeAgo(e.at) : '');
            mid.appendChild(l2);
            row.appendChild(mid);
            wrap.appendChild(row);
        });
        listHost.appendChild(wrap);
    }

    function line(key, valNode, copyVal) {
        const row = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:14px;padding:9px 0;border-bottom:1px solid var(--border-color,#2e2440);');
        const k = el('span', 'color:var(--text-muted,#94a3b8);font:800 10px Inter,sans-serif;letter-spacing:.14em;flex:none;');
        k.textContent = key.toUpperCase();
        row.appendChild(k);
        const v = el('span', 'color:var(--text-main,#f8fafc);font:600 12.5px Inter,sans-serif;text-align:right;word-break:break-word;display:inline-flex;align-items:center;gap:7px;min-width:0;');
        if (typeof valNode === 'string') v.textContent = valNode;
        else v.appendChild(valNode);
        if (copyVal) {
            v.style.cursor = 'pointer';
            v.title = 'Clic para copiar';
            v.addEventListener('click', function () { copyText(copyVal); });
        }
        row.appendChild(v);
        return row;
    }
    function sectTtl(txt) {
        const t = el('div', 'font:800 10.5px Inter,sans-serif;letter-spacing:.16em;color:var(--purple-accent,#8b5cf6);margin:20px 0 8px;');
        t.textContent = txt;
        return t;
    }
    function actionBtn(txt, kind, onClick) {
        const styles = {
            danger: 'border:1px solid rgba(239,68,68,.5);background:rgba(239,68,68,.12);color:#f87171;',
            ok: 'border:1px solid rgba(34,197,94,.5);background:rgba(34,197,94,.12);color:#4ade80;',
            purple: 'border:1px solid rgba(139,92,246,.55);background:rgba(139,92,246,.16);color:#c4b5fd;',
            ghost: 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);'
        };
        const b = el('button', (styles[kind] || styles.ghost) + 'font:800 12px Inter,sans-serif;padding:9px 14px;border-radius:9px;cursor:pointer;transition:transform .15s ease;');
        b.type = 'button'; b.textContent = txt;
        b.addEventListener('click', onClick);
        return b;
    }
    function selectEl(opts, current) {
        const s = document.createElement('select');
        s.style.cssText = 'background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:9px;color:var(--text-main,#f8fafc);font:700 12px Inter,sans-serif;padding:8px 10px;outline:none;cursor:pointer;';
        opts.forEach(function (o) {
            const op = document.createElement('option');
            op.value = o[0]; op.textContent = o[1];
            if (o[0] === current) op.selected = true;
            s.appendChild(op);
        });
        return s;
    }

    function renderDetail() {
        if (!listHost) return;
        const uid = S.detail;
        const raw = S.users[uid];
        while (listHost.firstChild) listHost.removeChild(listHost.firstChild);

        const back = el('button', 'display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);font:800 11.5px Inter,sans-serif;letter-spacing:.06em;padding:8px 13px;border-radius:9px;cursor:pointer;margin:14px 16px 4px;');
        back.type = 'button';
        back.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
        const backTxt = document.createElement('span');
        backTxt.textContent = 'TODAS LAS CUENTAS';
        back.appendChild(backTxt);
        back.addEventListener('click', function () { S.detail = null; S.act = null; S.actFor = null; render(); });
        listHost.appendChild(back);

        if (!raw) {
            const e = el('div', 'padding:30px 20px;color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;');
            e.textContent = 'Esta cuenta ya no existe en users/.';
            listHost.appendChild(e);
            return;
        }

        const a = adapt(raw);
        const st = statusOf(raw);
        const stM = STATUS[st] || { label: st || '—', color: '#6b7280' };
        const p = raw.profile || {};
        const role = isOwnerAcc(uid) ? 'owner' : roleOf(S.staff[uid]);

        const pad = el('div', 'padding:10px 16px 26px;');

        /* cabecera del detalle */
        const head = el('div', 'display:flex;align-items:center;gap:14px;margin:8px 0 4px;');
        head.appendChild(avatarEl(a, 62, st));
        const hmid = el('div', 'min-width:0;');
        const hname = el('div', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;');
        const hn = el('b', 'color:var(--text-main,#f8fafc);font-size:17px;letter-spacing:-.01em;');
        hn.textContent = a._name;
        hname.appendChild(hn);
        const vSlot = el('span', 'display:inline-flex;flex:none;align-items:center;');
        hname.appendChild(vSlot);
        if (SCSOC.verified) SCSOC.verified.watch(uid, function (type) {
            while (vSlot.firstChild) vSlot.removeChild(vSlot.firstChild);
            if (type) vSlot.appendChild(SCSOC.verified.badgeEl(type, 18));
        });
        hname.appendChild(badgesFor(uid));
        hmid.appendChild(hname);
        if (a._handler) {
            const hh = el('div', 'color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;margin-top:2px;');
            hh.textContent = '@' + a._handler;
            hmid.appendChild(hh);
        }
        head.appendChild(hmid);
        pad.appendChild(head);

        /* líneas de info */
        pad.appendChild(sectTtl('CUENTA'));
        const lines = el('div');
        const uidVal = el('span', 'font-family:monospace;font-size:11.5px;');
        uidVal.textContent = uid;
        lines.appendChild(line('UID', uidVal, uid));
        lines.appendChild(line('Correo', raw.email || '—', raw.email || null));
        lines.appendChild(line('Handler', a._handler ? '@' + a._handler : '—'));
        lines.appendChild(line('Nombre', a._name));
        lines.appendChild(line('Rango', role === 'owner' ? 'OWNER' : role ? role.toUpperCase() : '—'));
        const verWrap = el('span');
        lines.appendChild(line('Verificación', verWrap));
        if (SCSOC.verified) SCSOC.verified.watch(uid, function (type) {
            while (verWrap.firstChild) verWrap.removeChild(verWrap.firstChild);
            if (type) {
                verWrap.appendChild(SCSOC.verified.badgeEl(type, 14));
                const t = document.createElement('span');
                t.textContent = vLabel(type);
                verWrap.appendChild(t);
            } else verWrap.textContent = 'Sin verificación';
        });
        const stWrap = el('span');
        const stDot = el('span', 'width:9px;height:9px;border-radius:50%;display:inline-flex;background:' + stM.color + ';');
        const stTxt2 = document.createElement('span');
        stTxt2.textContent = stM.label + (raw.online && raw.online.lastSeen ? ' · visto ' + SCSOC.timeAgo(Number(raw.online.lastSeen)) : '');
        stWrap.appendChild(stDot); stWrap.appendChild(stTxt2);
        lines.appendChild(line('Estado', stWrap));
        lines.appendChild(line('Registrado', raw.createdAt ? fmtDate(Number(raw.createdAt)) : '—'));
        lines.appendChild(line('Descripción', p.description ? String(p.description).slice(0, 220) : '—'));
        pad.appendChild(lines);

        /* contadores + contenido */
        pad.appendChild(sectTtl('ACTIVIDAD'));
        const stats = el('div', 'display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border-color,#2e2440);border-radius:12px;overflow:hidden;margin-bottom:12px;');
        const cPosts = el('div', 'padding:12px 8px;text-align:center;border-right:1px solid var(--border-color,#2e2440);');
        const cCom = el('div', 'padding:12px 8px;text-align:center;border-right:1px solid var(--border-color,#2e2440);');
        const cRes = el('div', 'padding:12px 8px;text-align:center;');
        [[cPosts, 'POSTS'], [cCom, 'COMENTARIOS'], [cRes, 'RESPUESTAS']].forEach(function (x) {
            const n = el('div', 'font:800 17px Inter,sans-serif;color:var(--text-main,#f8fafc);');
            n.textContent = '…';
            const l = el('div', 'font:800 9px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);margin-top:2px;');
            l.textContent = x[1];
            x[0].appendChild(n); x[0].appendChild(l);
        });
        stats.appendChild(cPosts); stats.appendChild(cCom); stats.appendChild(cRes);
        pad.appendChild(stats);

        const subTabs = el('div', 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;');
        [['posts', 'POSTS'], ['comments', 'COMENTARIOS'], ['responses', 'RESPUESTAS']].forEach(function (t) {
            const on = S.detailSub === t[0];
            const b = el('button', 'border:1px solid ' + (on ? 'var(--purple-accent,#8b5cf6)' : 'var(--border-color,#2e2440)') + ';background:' + (on ? 'rgba(139,92,246,.14)' : 'transparent') + ';color:' + (on ? 'var(--purple-accent,#8b5cf6)' : 'var(--text-muted,#94a3b8)') + ';font:800 10px Inter,sans-serif;letter-spacing:.08em;padding:6px 10px;border-radius:8px;cursor:pointer;');
            b.type = 'button'; b.textContent = t[1];
            b.addEventListener('click', function () { S.detailSub = t[0]; render(); });
            subTabs.appendChild(b);
        });
        pad.appendChild(subTabs);

        const feedBox = el('div', 'border:1px solid var(--border-color,#2e2440);border-radius:12px;overflow:hidden;');
        pad.appendChild(feedBox);

        loadActivity(uid, function (act, err) {
            if (S.detail !== uid) return;
            const posts = [], comments = [], responses = [];
            if (act) {
                act.posts.forEach(function (x) { if (x.uid === uid) posts.push(x); });
                act.comments.forEach(function (x) { if (x.uid === uid) comments.push(x); });
                act.responses.forEach(function (x) { if (x.uid === uid) responses.push(x); });
            }
            cPosts.firstChild.textContent = act ? String(posts.length) : '!';
            cCom.firstChild.textContent = act ? String(comments.length) : '!';
            cRes.firstChild.textContent = act ? String(responses.length) : '!';

            while (feedBox.firstChild) feedBox.removeChild(feedBox.firstChild);
            if (err) {
                const e = el('div', 'padding:16px;color:#f87171;font:600 12px Inter,sans-serif;line-height:1.6;');
                e.textContent = 'No se pudo leer el contenido (' + (err.code || 'error') + ').';
                feedBox.appendChild(e);
                return;
            }
            const data = S.detailSub === 'posts' ? posts : S.detailSub === 'comments' ? comments : responses;
            if (!data.length) {
                const e = el('div', 'padding:22px;text-align:center;color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;');
                e.textContent = S.detailSub === 'posts' ? 'Sin posts publicados.' : S.detailSub === 'comments' ? 'Sin comentarios.' : 'Sin respuestas.';
                feedBox.appendChild(e);
                return;
            }
            data.slice(0, 50).forEach(function (x) {
                const it = el('div', 'padding:11px 14px;border-bottom:1px solid var(--border-color,#2e2440);');
                const meta = el('div', 'display:flex;align-items:center;gap:7px;color:var(--text-muted,#94a3b8);font:700 10px Inter,sans-serif;letter-spacing:.08em;margin-bottom:4px;');
                const ic = document.createElement('i');
                ic.className = 'fa-solid ' + (S.detailSub === 'posts' ? 'fa-newspaper' : S.detailSub === 'comments' ? 'fa-comment' : 'fa-reply');
                ic.setAttribute('aria-hidden', 'true');
                ic.style.color = 'var(--purple-accent,#8b5cf6)';
                meta.appendChild(ic);
                const mt = document.createElement('span');
                if (S.detailSub === 'posts') mt.textContent = (x.cat ? String(x.cat).toUpperCase() + ' · ' : '') + SCSOC.timeAgo(x.at) + (x.media ? ' · con multimedia' : '');
                else if (S.detailSub === 'comments') mt.textContent = 'en post ' + String(x.postId).slice(0, 10) + '… · ' + SCSOC.timeAgo(x.at);
                else mt.textContent = 'respuesta nivel ' + x.depth + ' · ' + SCSOC.timeAgo(x.at);
                meta.appendChild(mt);
                it.appendChild(meta);
                const tx = el('div', 'color:var(--text-main,#f8fafc);font:600 12.5px Inter,sans-serif;line-height:1.5;word-break:break-word;white-space:pre-wrap;');
                tx.textContent = x.text.length > 220 ? x.text.slice(0, 220) + '…' : x.text;
                it.appendChild(tx);
                feedBox.appendChild(it);
            });
        });

        /* acciones */
        pad.appendChild(sectTtl('ACCIONES'));
        const isMe = me() && uid === me().uid;
        const acts = el('div', 'display:flex;flex-wrap:wrap;gap:9px;align-items:center;');

        if (!canAct()) {
            const note = el('div', 'color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;line-height:1.6;');
            note.textContent = 'Tu rango es MOD: puedes consultar todo, pero las acciones quedan para Owner y Admins.';
            acts.appendChild(note);
        } else {
            if (!isOwnerAcc(uid) && !isMe) {
                if (S.bans[uid]) acts.appendChild(actionBtn('QUITAR BAN', 'ok', function () { openUnbanModal(uid); }));
                else acts.appendChild(actionBtn('BANEAR CUENTA', 'danger', function () { openBanModal(uid); }));
            }
            if (SCSOC.verified && !isMe) {
                const vTypes = Object.keys(SCSOC.verified.TYPES || {});
                if (vTypes.length) {
                    const sel = selectEl(vTypes.map(function (k) { return [k, vLabel(k)]; }), vTypes[0]);
                    acts.appendChild(sel);
                    acts.appendChild(actionBtn('APLICAR VERIFICACIÓN', 'purple', function () { doVerify(uid, sel.value); }));
                    acts.appendChild(actionBtn('QUITAR VERIFICACIÓN', 'ghost', function () { doUnverify(uid); }));
                }
            }
            if (roleNow() === 'owner' && !isOwnerAcc(uid) && !isMe) {
                const selR = selectEl([['none', '— sin rango —'], ['mod', 'MOD'], ['admin', 'ADMIN']], roleOf(S.staff[uid]) || 'none');
                acts.appendChild(selR);
                acts.appendChild(actionBtn('GUARDAR RANGO', 'purple', function () { doStaff(uid, selR.value === 'none' ? null : selR.value); }));
            }
        }
        pad.appendChild(acts);

        /* historial de esta cuenta */
        pad.appendChild(sectTtl('HISTORIAL DE LA CUENTA'));
        const own = S.logs.filter(function (e) { return e.uid === uid; });
        const hbox = el('div', 'border:1px solid var(--border-color,#2e2440);border-radius:12px;overflow:hidden;');
        if (!own.length) {
            const e = el('div', 'padding:18px;text-align:center;color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;');
            e.textContent = 'Sin acciones registradas para esta cuenta.';
            hbox.appendChild(e);
        } else {
            own.slice(0, 50).forEach(function (e) {
                const m = LOG_META[e.action] || { icon: 'fa-shield-halved', color: '#94a3b8', label: e.action.toUpperCase() };
                const r2 = el('div', 'display:flex;gap:10px;align-items:center;padding:9px 13px;border-bottom:1px solid var(--border-color,#2e2440);');
                const ic = E('i', 'fa-solid ' + m.icon);
                ic.style.color = m.color;
                ic.setAttribute('aria-hidden', 'true');
                r2.appendChild(ic);
                const tx = el('span', 'flex:1;color:var(--text-main,#f8fafc);font:600 12px Inter,sans-serif;word-break:break-word;');
                tx.textContent = m.label + (e.detail ? ' · ' + e.detail : '') + ' — por ' + (e.byName || '—') + (e.at ? ', ' + SCSOC.timeAgo(e.at) : '');
                r2.appendChild(tx);
                hbox.appendChild(r2);
            });
        }
        pad.appendChild(hbox);

        listHost.appendChild(pad);
    }

    /* ==== VENTANA (ahora SÍ con clases bien puestas) ==== */
    function openWin(uid) {
        if (!winEl) return;
        S.win = true;
        if (uid) { S.detail = uid; S.act = null; S.actFor = null; }
        winEl.classList.add('sc-on');
        if (backdropEl) backdropEl.classList.add('sc-on');
        document.body.classList.add('scacc-lock');
        render();
    }
    function closeWin() {
        S.win = false;
        S.detail = null;
        if (winEl) winEl.classList.remove('sc-on');
        if (backdropEl) backdropEl.classList.remove('sc-on');
        document.body.classList.remove('scacc-lock');
        closeModal();
    }

    /* ==== ESTILOS ==== */
    function injectCss() {
        const css = document.createElement('style');
        css.textContent = ''
            + '.scacc-backdrop{position:fixed;inset:0;background:rgba(5,3,12,.6);z-index:2147483030;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
            + '.scacc-backdrop.sc-on{opacity:1;pointer-events:auto;}'
            + '.scacc-win{position:fixed;top:0;right:0;bottom:0;z-index:2147483040;width:min(620px,100vw);background:var(--bg-card,#16121f);border-left:1px solid var(--border-color,#2e2440);transform:translateX(103%);transition:transform .3s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;}'
            + '.scacc-win.sc-on{transform:translateX(0);}'
            + 'body.scacc-lock{overflow:hidden;}'
            + '.scacc-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border-color,#2e2440);}'
            + '.scacc-title{font:800 12.5px Inter,sans-serif;letter-spacing:.16em;color:var(--text-main,#f8fafc);}'
            + '.scacc-tag{font:700 10px Inter,sans-serif;letter-spacing:.1em;color:var(--purple-accent,#8b5cf6);border:1px solid var(--border-color,#2e2440);border-radius:6px;padding:3px 7px;}'
            + '.scacc-count{font:700 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scacc-x{margin-left:auto;border:0;background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;}'
            + '.scacc-tabs{display:flex;gap:4px;padding:10px 16px 0;border-bottom:1px solid var(--border-color,#2e2440);}'
            + '.scacc-tab{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted,#94a3b8);font:800 11px Inter,sans-serif;letter-spacing:.1em;padding:9px 12px;cursor:pointer;}'
            + '.scacc-tab.sc-on{color:var(--purple-accent,#8b5cf6);border-bottom-color:var(--purple-accent,#8b5cf6);}'
            + '.scacc-body{flex:1;overflow-y:auto;}'
            + '.scacc-box{border:1px solid var(--border-color,#2e2440);border-left:3px solid var(--purple-accent,#8b5cf6);border-radius:13px;padding:16px;margin-bottom:12px;background:rgba(139,92,246,.05);transition:border-color .2s ease,background .2s ease;}'
            + '.scacc-box:hover{border-color:rgba(139,92,246,.55);border-left-color:var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.09);}'
            + '.scacc-boxtop{display:flex;align-items:center;gap:11px;margin-bottom:8px;}'
            + '.scacc-boxic{flex:none;width:38px;height:38px;border-radius:11px;background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.4);display:flex;align-items:center;justify-content:center;color:var(--purple-accent,#8b5cf6);font-size:15px;}'
            + '.scacc-boxttl{font:800 13px Inter,sans-serif;letter-spacing:.12em;color:var(--text-main,#f8fafc);}'
            + '.scacc-boxsub{color:var(--text-muted,#94a3b8);font:600 12px Inter,sans-serif;line-height:1.55;margin:2px 0 12px;}'
            + '.scacc-boxstats{display:flex;border:1px solid var(--border-color,#2e2440);border-radius:10px;overflow:hidden;background:var(--bg-main,#0d0b14);margin-bottom:12px;}'
            + '.scacc-openbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid rgba(139,92,246,.55);background:rgba(139,92,246,.14);color:#c4b5fd;font:800 12.5px Inter,sans-serif;letter-spacing:.08em;padding:11px 14px;border-radius:10px;cursor:pointer;transition:background .18s ease,transform .18s ease;}'
            + '.scacc-openbtn:hover{background:rgba(139,92,246,.26);}'
            + '.scacc-openbtn:active{transform:scale(.97);}'
            + '@media (max-width:640px){.scacc-win{width:100vw;}}';
        document.head.appendChild(css);
    }

    /* ==== MONTAJE ==== */
    function mount() {
        if (mounted || !SCSOC.security || !SCSOC.security.body) return;
        mounted = true;
        injectCss();

        /* quitar el placeholder "zona vacía" del panel */
        const bodyEl = SCSOC.security.body;
        Array.prototype.slice.call(bodyEl.querySelectorAll('.scsec-empty')).forEach(function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
        });

        /* --- BOX ACCOUNTS dentro del panel de seguridad --- */
        const box = E('div', 'scacc-box');
        const top = E('div', 'scacc-boxtop');
        const ic = E('div', 'scacc-boxic');
        ic.innerHTML = '<i class="fa-solid fa-users" aria-hidden="true"></i>';
        const ttl = E('div', 'scacc-boxttl');
        ttl.textContent = 'ACCOUNTS';
        top.appendChild(ic); top.appendChild(ttl);
        const tag = E('span', 'scacc-tag');
        tag.style.marginLeft = 'auto';
        tag.textContent = 'ADMIN';
        top.appendChild(tag);
        box.appendChild(top);

        const sub = E('div', 'scacc-boxsub');
        sub.textContent = 'Cuentas registradas de la web: información completa línea por línea, verificaciones, rango staff, baneos, su contenido (posts, comentarios y respuestas) e historial de acciones.';
        box.appendChild(sub);

        /* contadores en 3 celdas (vivos) */
        const statsRow = E('div', 'scacc-boxstats');
        const mkStat = function (label, color, first) {
            const c = el('div', 'flex:1;text-align:center;padding:9px 4px;' + (first ? '' : 'border-left:1px solid var(--border-color,#2e2440);'));
            const n = el('div', 'font:800 15px Inter,sans-serif;color:' + color + ';');
            n.textContent = '—';
            const l = el('div', 'font:800 8.5px Inter,sans-serif;letter-spacing:.12em;color:var(--text-muted,#94a3b8);margin-top:1px;');
            l.textContent = label;
            c.appendChild(n); c.appendChild(l);
            statsRow.appendChild(c);
            return n;
        };
        statN = mkStat('CUENTAS', 'var(--purple-accent,#8b5cf6)', true);
        statS = mkStat('STAFF', '#c4b5fd', false);
        statB = mkStat('BANEADOS', '#f87171', false);
        box.appendChild(statsRow);

        const openBtn = E('button', 'scacc-openbtn');
        openBtn.type = 'button';
        openBtn.innerHTML = '<i class="fa-solid fa-right-long" aria-hidden="true"></i>';
        const obTxt = document.createElement('span');
        obTxt.textContent = 'ABRIR ACCOUNTS';
        openBtn.appendChild(obTxt);
        openBtn.addEventListener('click', function () { openWin(null); });
        box.appendChild(openBtn);

        bodyEl.appendChild(box);

        /* --- VENTANA --- */
        backdropEl = E('div', 'scacc-backdrop');
        backdropEl.addEventListener('click', closeWin);
        document.body.appendChild(backdropEl);

        winEl = E('aside', 'scacc-win');
        winEl.setAttribute('role', 'dialog');
        winEl.setAttribute('aria-label', 'Accounts — cuentas registradas');
        const head = E('div', 'scacc-head');
        const hic = document.createElement('i');
        hic.className = 'fa-solid fa-users';
        hic.style.color = 'var(--purple-accent,#8b5cf6)';
        hic.setAttribute('aria-hidden', 'true');
        const ht = E('span', 'scacc-title');
        ht.textContent = 'ACCOUNTS';
        winCount = E('span', 'scacc-count');
        const tag2 = E('span', 'scacc-tag');
        tag2.textContent = 'SECURITY';
        const x = E('button', 'scacc-x');
        x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', closeWin);
        head.appendChild(hic); head.appendChild(ht); head.appendChild(winCount); head.appendChild(tag2); head.appendChild(x);
        winEl.appendChild(head);

        const tabs = E('div', 'scacc-tabs');
        tabBtnC = E('button', 'scacc-tab sc-on');
        tabBtnC.type = 'button'; tabBtnC.textContent = 'CUENTAS';
        tabBtnH = E('button', 'scacc-tab');
        tabBtnH.type = 'button'; tabBtnH.textContent = 'HISTORIAL';
        tabBtnC.addEventListener('click', function () { S.tab = 'cuentas'; S.detail = null; render(); });
        tabBtnH.addEventListener('click', function () { S.tab = 'historial'; S.detail = null; render(); });
        tabs.appendChild(tabBtnC); tabs.appendChild(tabBtnH);
        winEl.appendChild(tabs);

        winBody = E('div', 'scacc-body');
        listHost = winBody;
        winEl.appendChild(winBody);
        document.body.appendChild(winEl);

        /* Escape: cierra modal > detalle > ventana (sin dejar pasar al panel) */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !S.win) return;
            e.preventDefault(); e.stopPropagation();
            if (S.modalFor) return closeModal();
            if (S.unbanFor) return closeUnbanModal();
            if (S.detail) { S.detail = null; render(); return; }
            closeWin();
        }, true);

        /* --- LISTENERS EN VIVO --- */
        db().ref(CFG.USERS).on('value', function (s) {
            S.users = s.val() || {}; S.permUsers = false;
            Object.keys(S.users).forEach(function (uid) {
                if (S.attachedVerified[uid]) return;
                S.attachedVerified[uid] = true;
                if (SCSOC.verified) SCSOC.verified.watch(uid, function (t) { S.verified[uid] = t; });
            });
            renderSoon();
        }, function () { S.permUsers = true; renderSoon(); });

        db().ref(CFG.BANS).on('value', function (s) { S.bans = s.val() || {}; renderSoon(); },
            function () { S.permBans = true; });

        db().ref(CFG.STAFF).on('value', function (s) { S.staff = s.val() || {}; renderSoon(); });

        db().ref(CFG.LOGS).on('value', function (s) { S.logs = objToLogs(s.val()); renderSoon(); },
            function () { S.permLogs = true; });

        render();
        console.log('[Stevscon][SEC] accounts.js listo (v2) — el() arreglado, botón funcional, caja con contadores.');
    }

    /* ==== ARRANQUE: espera motor + confirma staff (monta solo para staff) ==== */
    (function wait() {
        const ok = window.firebase && SCSOC.security && SCSOC.security.body &&
            SCSOC.verified && SCSOC.staff;
        if (!ok) return setTimeout(wait, 150);
        tryMount();
        try { firebase.auth().onAuthStateChanged(function () { tryMount(); }); } catch (e) {}
    })();

    function tryMount() {
        if (mounted) return;
        SCSOC.staff.role(function (r) {
            if (!r || mounted) return;
            myRole = r;
            mount();
        });
    }
})(window, document);