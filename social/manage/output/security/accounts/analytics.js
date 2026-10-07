/* ============================================================
   STEVSCON.COM · security/accounts/analytics.js  (v1)
   BOX #4 del panel SEGURIDAD — debajo de REPORTS.
   Métricas en vivo: cuentas, contenido, actividad 7 días,
   top usuarios y salud del sitio. 100% LECTURA (staff):
   no escribe nada en Firebase, no requiere reglas nuevas.
   ============================================================ */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC || (window.SCSOC = {});
    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const DAY = 86400000;

    const PATHS = {
        users: 'users',
        staff: 'social/staff',
        posts: 'social/posts',
        comments: 'social/comments',
        responses: 'social/responses',
        likes: 'social/likes',
        reports: 'security/reports',
        bans: 'security/accounts/bans',
        mlogs: 'security/moderation/logs'
    };
    const TS_FIELDS = ['createdAt', 'created_at', 'created', 'at', 'joined', 'registered', 'signupAt', 'fecha'];

    let mounted = false, myRole = null;
    let winEl = null, bdEl = null, winBody = null;
    let statAcc = null, statPosts = null, statInter = null;
    let timer = null;

    const S = { win: false, loading: false, data: null, updatedAt: 0 };

    /* ==== helpers ==== */
    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function isOwner() { const u = me(); return !!(u && u.email === OWNER_EMAIL); }

    function E(tag, cls) { const d = document.createElement(tag); if (cls) d.className = cls; return d; }
    function el(tag, css, cls) { const d = document.createElement(tag); if (css) d.style.cssText = css; if (cls) d.className = cls; return d; }
    function nfmt(n) {
        if (n === null || n === undefined) return '—';
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
        return String(n);
    }
    function safeName(v) {
        const s = String(v || '').trim();
        return (s ? s : 'Usuario').slice(0, 24);
    }
    function userTs(v) {
        if (!v || typeof v !== 'object') return 0;
        for (let i = 0; i < TS_FIELDS.length; i++) {
            const t = Number(v[TS_FIELDS[i]]);
            if (t > 0) return t;
        }
        return 0;
    }
    function today0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
    function dayIdx(ts) {
        const t = Number(ts) || 0;
        if (!t) return -1;
        const d0 = new Date(); d0.setHours(0, 0, 0, 0);
        const diff = Math.floor((d0.getTime() - t) / DAY);
        if (diff <= 0) return 6;
        if (diff > 6) return -1;
        return 6 - diff;
    }
    function fmtWhen(ts) {
        try {
            return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ''; }
    }

    /* ==== CÁLCULO de métricas (desde snapshots de solo lectura) ==== */
    function compute(sn) {
        const g = function (k) { return sn[k] || null; };

        const usersS = g('users'), staffS = g('staff'), bansS = g('bans');
        const accounts = usersS ? usersS.numChildren() : null;
        const staffN = staffS ? staffS.numChildren() : 0;
        const banned = bansS ? bansS.numChildren() : null;   /* null = sin permiso (mods) */

        const days = [];
        for (let i = 0; i < 7; i++) {
            const dte = new Date(); dte.setHours(0, 0, 0, 0);
            dte.setDate(dte.getDate() - (6 - i));
            let lb = '';
            try { lb = dte.toLocaleDateString('es', { weekday: 'narrow' }).toUpperCase(); } catch (e) {}
            days.push({ p: 0, c: 0, r: 0, label: lb });
        }

        const nameByUid = {}, accByUid = {};
        let newAcc = 0;
        if (usersS) usersS.forEach(function (c) {
            const v = c.val() || {};
            nameByUid[c.key] = safeName(v.name || v.displayName || v.username || v.nombre);
            const t = userTs(v);
            if (t) {
                accByUid[c.key] = t;
                if (dayIdx(t) >= 0) newAcc++;
            }
        });

        const topMap = {};
        function topAdd(uid, kind) {
            const k = uid || '_anon';
            const o = topMap[k] || (topMap[k] = { name: nameByUid[k] || '', p: 0, c: 0, r: 0 });
            if (kind === 'p') o.p++; else if (kind === 'c') o.c++; else o.r++;
        }

        const postsS = g('posts'), comS = g('comments'), resS = g('responses'), likesS = g('likes');
        const posts = postsS ? postsS.numChildren() : 0;
        let comments = 0, responses = 0, likes = 0;

        if (postsS) postsS.forEach(function (c) {
            const v = c.val() || {};
            const ix = dayIdx(v.createdAt || v.at);
            if (ix >= 0) days[ix].p++;
            topAdd(v.authorUid, 'p');
        });
        if (comS) comS.forEach(function (post) {
            post.forEach(function (c) {
                const v = c.val() || {};
                comments++;
                const ix = dayIdx(v.createdAt || v.at);
                if (ix >= 0) days[ix].c++;
                topAdd(v.authorUid, 'c');
            });
        });
        if (resS) resS.forEach(function (cm) {
            cm.forEach(function (c) {
                const v = c.val() || {};
                responses++;
                const ix = dayIdx(v.createdAt || v.at);
                if (ix >= 0) days[ix].r++;
                topAdd(v.authorUid, 'r');
            });
        });
        if (likesS) likesS.forEach(function (t) { t.forEach(function (id) { likes += id.numChildren(); }); });

        const repS = g('reports');
        let repTotal = 0, repPend = 0;
        if (repS) repS.forEach(function (c) {
            repTotal++;
            if ((c.val() || {}).status === 'pendiente') repPend++;
        });

        const mlS = g('mlogs');
        let blocksHoy = 0;
        if (mlS) { const t0 = today0(); mlS.forEach(function (c) { if (Number((c.val() || {}).at || 0) >= t0) blocksHoy++; }); }

        const top = Object.keys(topMap).map(function (uid) {
            const o = topMap[uid];
            return { uid: uid, name: o.name || nameByUid[uid] || 'Usuario', p: o.p, c: o.c, r: o.r, total: o.p + o.c + o.r };
        }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5);

        return {
            accounts: accounts, staff: staffN, banned: banned, newAcc: newAcc,
            posts: posts, comments: comments, responses: responses, likes: likes,
            repTotal: repTotal, repPend: repPend, blocksHoy: blocksHoy,
            days: days, top: top
        };
    }

    /* ==== LECTURA en vivo (solo .once; todo se recalcula local) ==== */
    function refresh() {
        if (S.loading) return;
        S.loading = true;
        const keys = Object.keys(PATHS);
        Promise.all(keys.map(function (k) {
            return db().ref(PATHS[k]).once('value').catch(function () { return null; });
        })).then(function (snaps) {
            const sn = {};
            keys.forEach(function (k, i) { sn[k] = snaps[i]; });
            S.data = compute(sn);
            S.loading = false;
            S.updatedAt = Date.now();
            paintBox();
            if (S.win) paintPanel();
        });
    }

    /* ==== CSS ==== */
    function injectCss() {
        if (document.querySelector('style[data-scan]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scan', '1');
        css.textContent = ''
            + '.scan-box{margin-top:10px;padding:14px;border-radius:16px;border:1px solid rgba(139,92,246,.35);border-left:3px solid var(--purple-accent,#8b5cf6);background:linear-gradient(135deg,rgba(139,92,246,.10),rgba(139,92,246,.02)),#151027;}'
            + '.scan-top{display:flex;align-items:center;gap:11px;}'
            + '.scan-ico{flex:none;width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;font-size:15px;box-shadow:0 4px 14px rgba(139,92,246,.35);}'
            + '.scan-tt{flex:1;min-width:0;}'
            + '.scan-tt h3{margin:0;font:800 13.5px Inter,sans-serif;color:var(--text-main,#f8fafc);letter-spacing:.06em;}'
            + '.scan-badge{flex:none;background:rgba(139,92,246,.16);border:1px solid rgba(139,92,246,.4);color:#c4b5fd;font:800 9px Inter,sans-serif;letter-spacing:.12em;padding:4px 9px;border-radius:999px;}'
            + '.scan-desc{margin:9px 0 0;font:600 11px/1.6 Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scan-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;}'
            + '.scan-cell{background:#0f0b1d;border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:9px 10px;text-align:center;}'
            + '.scan-cell b{display:block;font:800 17px Inter,sans-serif;color:var(--purple-accent,#8b5cf6);}'
            + '.scan-cell span{display:block;margin-top:2px;font:700 8.5px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);}'
            + '.scan-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;border:0;border-radius:11px;padding:12px;background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;font:800 11.5px Inter,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,.3);transition:transform .15s ease,box-shadow .15s ease;}'
            + '.scan-btn:hover{transform:translateY(-1px);box-shadow:0 7px 20px rgba(139,92,246,.45);}'
            + '.scan-btn:active{transform:scale(.98);}'
            + '.scan-backdrop{position:fixed;inset:0;background:rgba(5,3,10,.62);backdrop-filter:blur(3px);z-index:2147483048;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
            + '.scan-backdrop.scan-on{opacity:1;pointer-events:auto;}'
            + '.scan-win{position:fixed;top:0;right:0;height:100vh;width:520px;max-width:96vw;background:#151027;border-left:1px solid var(--border-color,#2e2440);box-shadow:-18px 0 50px rgba(0,0,0,.5);z-index:2147483049;display:flex;flex-direction:column;transform:translateX(103%);transition:transform .32s cubic-bezier(.2,.8,.2,1);}'
            + '.scan-win.scan-on{transform:none;}'
            + '.scan-winhead{display:flex;align-items:center;gap:10px;padding:16px 16px 12px;border-bottom:1px solid var(--border-color,#2e2440);}'
            + '.scan-winhead h2{margin:0;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);flex:1;}'
            + '.scan-x{flex:none;width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:13px;}'
            + '.scan-x:hover{color:var(--text-main,#f8fafc);background:var(--bg-hover,#261f36);}'
            + '.scan-body{flex:1;overflow-y:auto;padding:14px 16px 20px;}'
            + '.scan-sectt{margin:16px 0 8px;font:800 10px Inter,sans-serif;letter-spacing:.14em;color:#a78bfa;}'
            + '.scan-sectt:first-child{margin-top:2px;}'
            + '.scan-grid{display:grid;gap:8px;}'
            + '.scan-g3{grid-template-columns:repeat(3,1fr);}'
            + '.scan-g4{grid-template-columns:repeat(4,1fr);}'
            + '.scan-g4 .scan-cell b{font-size:14px;}'
            + '.scan-chart{background:#0f0b1d;border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:12px 12px 10px;}'
            + '.scan-bars{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;height:110px;}'
            + '.scan-barcol{display:flex;flex-direction:column;gap:5px;min-width:0;}'
            + '.scan-barstack{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;overflow:hidden;border-radius:6px;background:rgba(139,92,246,.06);}'
            + '.scan-seg{width:100%;border-radius:3px;min-height:0;transition:height .5s ease;}'
            + '.scan-segp{background:#8b5cf6;}'
            + '.scan-segc{background:#c4b5fd;}'
            + '.scan-segr{background:#f472b6;}'
            + '.scan-daylab{text-align:center;font:700 9px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scan-today .scan-daylab{color:#c4b5fd;}'
            + '.scan-legend{display:flex;gap:14px;justify-content:center;margin-top:10px;font:700 9px Inter,sans-serif;letter-spacing:.08em;color:var(--text-muted,#94a3b8);}'
            + '.scan-dot{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:5px;vertical-align:middle;}'
            + '.scan-toprow{display:flex;align-items:center;gap:10px;background:#0f0b1d;border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:9px 12px;margin-bottom:7px;}'
            + '.scan-rank{flex:none;width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:#261f36;color:#c4b5fd;font:800 11.5px Inter,sans-serif;}'
            + '.scan-rank.scan-gold{background:linear-gradient(135deg,#fbbf24,#d97706);color:#fff;}'
            + '.scan-rank.scan-silver{background:linear-gradient(135deg,#cbd5e1,#64748b);color:#fff;}'
            + '.scan-rank.scan-bronze{background:linear-gradient(135deg,#d97706,#92400e);color:#fff;}'
            + '.scan-topmid{flex:1;min-width:0;}'
            + '.scan-topname{display:block;font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
            + '.scan-topbreak{display:block;margin-top:2px;font:600 9.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scan-toptotal{flex:none;font:800 14px Inter,sans-serif;color:var(--purple-accent,#8b5cf6);}'
            + '.scan-foot{display:flex;align-items:center;gap:10px;margin-top:14px;}'
            + '.scan-updated{flex:1;font:600 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);line-height:1.5;}'
            + '.scan-refresh{flex:none;border:1px solid rgba(139,92,246,.4);background:rgba(139,92,246,.12);color:#c4b5fd;border-radius:9px;padding:8px 12px;font:800 10px Inter,sans-serif;letter-spacing:.08em;cursor:pointer;}'
            + '.scan-refresh:hover{background:rgba(139,92,246,.22);}'
            + '.scan-empty{text-align:center;padding:30px 16px;color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;line-height:1.7;}'
            + '.scan-empty i{display:block;margin:0 auto 10px;font-size:26px;color:var(--purple-accent,#8b5cf6);opacity:.7;}'
            + '.scan-empty-sm{padding:16px;font-size:11.5px;}'
            + '@media (max-width:640px){.scan-win{width:100vw;}.scan-g4{grid-template-columns:repeat(2,1fr);}}';
        document.head.appendChild(css);
    }

    /* ==== BOX en el panel (estilo ACCOUNTS / REPORTS) ==== */
    function mkCell(host, label) {
        const c = E('div', 'scan-cell');
        const b = E('b', ''); b.textContent = '—';
        const sp = E('span', ''); sp.textContent = label;
        c.appendChild(b); c.appendChild(sp);
        host.appendChild(c);
        return b;
    }
    function mount() {
        if (mounted || !SCSOC.security || !SCSOC.security.body) return;
        mounted = true;
        injectCss();

        const bodyEl = SCSOC.security.body;

        const box = E('div', 'scan-box');

        const top = E('div', 'scan-top');
        const ic = E('div', 'scan-ico');
        ic.innerHTML = '<i class="fa-solid fa-chart-column"></i>';
        const tt = E('div', 'scan-tt');
        const h = E('h3', ''); h.textContent = 'ANALYTICS';
        tt.appendChild(h);
        const badge = E('span', 'scan-badge');
        badge.textContent = (isOwner() || myRole === 'admin') ? 'ADMIN' : 'STAFF';
        top.appendChild(ic); top.appendChild(tt); top.appendChild(badge);
        box.appendChild(top);

        const desc = E('p', 'scan-desc');
        desc.textContent = 'Métricas en vivo de toda la web: cuentas, contenido, actividad de los últimos 7 días, top usuarios y salud del sitio.';
        box.appendChild(desc);

        const grid = E('div', 'scan-stats');
        statAcc = mkCell(grid, 'CUENTAS');
        statPosts = mkCell(grid, 'POSTS');
        statInter = mkCell(grid, 'INTERACCIONES');
        box.appendChild(grid);

        const btn = el('button', '', 'scan-btn');
        btn.type = 'button';
        btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>&nbsp;ABRIR ANALYTICS';
        btn.addEventListener('click', openWin);
        box.appendChild(btn);

        bodyEl.appendChild(box);

        /* ESC cierra SOLO esta ventana */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !S.win) return;
            e.preventDefault(); e.stopPropagation();
            closeWin();
        }, true);

        paintBox();
        refresh();
        console.log('[Stevscon][SEC] analytics.js listo (v1) — box ANALYTICS montado debajo de REPORTS.');
    }
    function paintBox() {
        const d = S.data;
        if (statAcc) statAcc.textContent = d ? nfmt(d.accounts) : '—';
        if (statPosts) statPosts.textContent = d ? nfmt(d.posts) : '—';
        if (statInter) statInter.textContent = d ? nfmt(d.comments + d.responses + d.likes) : '—';
    }

    /* ==== VENTANA ==== */
    function openWin() {
        if (S.win) return;
        const bd = el('div', '', 'scan-backdrop');
        bd.addEventListener('click', closeWin);
        const win = E('div', 'scan-win');

        const head = E('div', 'scan-winhead');
        const h2 = E('h2', ''); h2.textContent = '📊 ANALYTICS';
        const x = el('button', '', 'scan-x'); x.type = 'button';
        x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        x.addEventListener('click', closeWin);
        head.appendChild(h2); head.appendChild(x);

        winBody = E('div', 'scan-body');
        win.appendChild(head); win.appendChild(winBody);
        document.body.appendChild(bd); document.body.appendChild(win);

        winEl = win; bdEl = bd;
        requestAnimationFrame(function () {
            bd.classList.add('scan-on');
            win.classList.add('scan-on');
        });
        S.win = true;
        paintPanel();
        refresh();
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
            if (S.win) refresh();
            else { clearInterval(timer); timer = null; }
        }, 60000);
    }
    function closeWin() {
        if (!S.win || !winEl) return;
        const w = winEl, b = bdEl;
        w.classList.remove('scan-on');
        if (b && b.classList) b.classList.remove('scan-on');
        S.win = false; winEl = null; bdEl = null; winBody = null;
        if (timer) { clearInterval(timer); timer = null; }
        setTimeout(function () {
            if (w && w.parentNode) w.parentNode.removeChild(w);
            if (b && b.parentNode) b.parentNode.removeChild(b);
        }, 330);
    }

    /* ==== PANEL ==== */
    function sectt(txt) { const t = E('div', 'scan-sectt'); t.textContent = txt; return t; }
    function cellIn(host, val, label, color) {
        const c = E('div', 'scan-cell');
        const b = E('b', ''); b.textContent = val;
        if (color) b.style.color = color;
        const sp = E('span', ''); sp.textContent = label;
        c.appendChild(b); c.appendChild(sp);
        host.appendChild(c);
    }
    function emptyNote(msg, icon) {
        const em = E('div', 'scan-empty scan-empty-sm');
        em.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
        em.appendChild(document.createTextNode(msg));
        return em;
    }
    function buildChart(days) {
        const wrap = E('div', 'scan-chart');
        const bars = E('div', 'scan-bars');
        const max = Math.max.apply(null, days.map(function (x) { return x.p + x.c + x.r; }));
        let any = false;
        days.forEach(function (x, i) {
            const tot = x.p + x.c + x.r;
            if (tot > 0) any = true;
            const col = E('div', 'scan-barcol' + (i === 6 ? ' scan-today' : ''));
            const stack = E('div', 'scan-barstack');
            stack.title = x.label + ' · ' + tot + ' acciones (posts: ' + x.p + ', comentarios: ' + x.c + ', respuestas: ' + x.r + ')';
            [['p', x.p, 'scan-segp'], ['c', x.c, 'scan-segc'], ['r', x.r, 'scan-segr']].forEach(function (sg) {
                const b = E('div', 'scan-seg ' + sg[2]);
                b.style.height = (max && sg[1]) ? Math.max(2, Math.round(sg[1] / max * 100)) + '%' : '0';
                stack.appendChild(b);
            });
            const dl = E('span', 'scan-daylab'); dl.textContent = x.label;
            col.appendChild(stack); col.appendChild(dl);
            bars.appendChild(col);
        });
        wrap.appendChild(bars);
        const leg = E('div', 'scan-legend');
        [['scan-segp', 'POSTS'], ['scan-segc', 'COMENTARIOS'], ['scan-segr', 'RESPUESTAS']].forEach(function (l) {
            const it = E('span', '');
            const dt = E('i', 'scan-dot ' + l[0]);
            it.appendChild(dt);
            it.appendChild(document.createTextNode(l[1]));
            leg.appendChild(it);
        });
        wrap.appendChild(leg);
        if (!any) wrap.appendChild(emptyNote('Sin actividad en los últimos 7 días todavía.', 'fa-chart-column'));
        return wrap;
    }
    function buildTop(top) {
        const box = E('div', '');
        if (!top.length) {
            box.appendChild(emptyNote('Aún no hay actividad para armar el ranking.', 'fa-users'));
            return box;
        }
        top.forEach(function (u, i) {
            const row = E('div', 'scan-toprow');
            const rk = E('span', 'scan-rank' + (i === 0 ? ' scan-gold' : i === 1 ? ' scan-silver' : i === 2 ? ' scan-bronze' : ''));
            rk.textContent = String(i + 1);
            const mid = E('div', 'scan-topmid');
            const nm = E('span', 'scan-topname'); nm.textContent = u.name;
            const br = E('span', 'scan-topbreak');
            br.textContent = u.p + ' posts · ' + u.c + ' comentarios · ' + u.r + ' respuestas';
            mid.appendChild(nm); mid.appendChild(br);
            const tt = E('span', 'scan-toptotal'); tt.textContent = nfmt(u.total);
            row.appendChild(rk); row.appendChild(mid); row.appendChild(tt);
            box.appendChild(row);
        });
        return box;
    }
    function paintPanel() {
        if (!winBody) return;
        winBody.textContent = '';
        const d = S.data;

        if (!d) {
            const ld = E('div', 'scan-empty');
            ld.innerHTML = '<i class="fa-solid fa-chart-column"></i>';
            ld.appendChild(document.createTextNode('Cargando métricas de la web…'));
            winBody.appendChild(ld);
            return;
        }

        winBody.appendChild(sectt('RESUMEN GENERAL'));
        const g1 = E('div', 'scan-grid scan-g3');
        cellIn(g1, nfmt(d.accounts), 'CUENTAS');
        cellIn(g1, nfmt(d.newAcc), 'NUEVAS (7 DÍAS)', '#4ade80');
        cellIn(g1, nfmt(d.staff), 'STAFF');
        cellIn(g1, nfmt(d.posts), 'POSTS');
        cellIn(g1, nfmt(d.comments), 'COMENTARIOS');
        cellIn(g1, nfmt(d.responses), 'RESPUESTAS');
        winBody.appendChild(g1);

        winBody.appendChild(sectt('ACTIVIDAD · ÚLTIMOS 7 DÍAS'));
        winBody.appendChild(buildChart(d.days));

        winBody.appendChild(sectt('TOP USUARIOS · MÁS APORTES'));
        winBody.appendChild(buildTop(d.top));

        winBody.appendChild(sectt('SALUD DEL SITIO'));
        const g2 = E('div', 'scan-grid scan-g4');
        cellIn(g2, nfmt(d.likes), 'LIKES TOTALES');
        cellIn(g2, nfmt(d.repPend), 'REPORTES PEND.', d.repPend ? '#fbbf24' : null);
        cellIn(g2, d.banned === null ? '—' : nfmt(d.banned), 'BANEADOS');
        cellIn(g2, nfmt(d.blocksHoy), 'ANTI-BAD HOY', d.blocksHoy ? '#f87171' : null);
        winBody.appendChild(g2);

        const foot = E('div', 'scan-foot');
        const note = E('span', 'scan-updated');
        note.textContent = 'Actualizado ' + (fmtWhen(S.updatedAt) || '—') + ' · se refresca solo cada 60s';
        const rb = el('button', '', 'scan-refresh');
        rb.type = 'button';
        rb.innerHTML = '<i class="fa-solid fa-rotate"></i>&nbsp;REFRESCAR';
        rb.addEventListener('click', function () { refresh(); });
        foot.appendChild(note); foot.appendChild(rb);
        winBody.appendChild(foot);
    }

    /* ==== ARRANQUE (tras login, igual que anti-bad v2) ==== */
    (function wait() {
        const ok = window.firebase;
        if (!ok) return setTimeout(wait, 150);

        try {
            firebase.auth().onAuthStateChanged(function (u) {
                if (u) refresh();
                tryMount();
            });
        } catch (e) {}

        const waitPanel = function () {
            const okP = SCSOC.security && SCSOC.security.body && SCSOC.staff;
            if (!okP) return setTimeout(waitPanel, 150);
            tryMount();
        };
        waitPanel();
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