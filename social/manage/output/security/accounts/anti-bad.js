/**
 * ====
 * STEVSCON.COM — social/manage/output/security/accounts/anti-bad.js (v1)
 * MÓDULO «ANTI-BAD» del panel de Seguridad (tercer box, bajo REPORTS).
 *
 *  - FILTRO DE PALABRAS: lista editable desde el panel. Detecta trampas
 *    (acentos, pu.u.ta, puuuta, p@uta, 9u74...) normalizando el texto.
 *  - ANTI-ENLACES: bloquea links en comentarios/respuestas, con lista de
 *    dominios permitidos (whitelist) editable.
 *  - ANTI-FLOOD: X mensajes en Y segundos => cooldown de Z segundos.
 *  - REGISTRO en vivo: todo intento bloqueado queda en
 *    security/moderation/logs (tipo, autor, cita, hora) para el staff.
 *  - El staff (Owner/Admin/Mod) publicar SIEMPRE libre de filtros.
 *  - CERO toques a comments.js/responses.js: los envuelve por fuera
 *    (wrap de SCSOC.comments.create y SCSOC.responses.create).
 *
 *  SEGURIDAD: Firebase Auth exclusivo · todo texto de usuario con
 *  textContent (NUNCA innerHTML con datos) · innerHTML solo iconos fijos.
 *  ESCAPE HATCH: hereda ?nosecurity=1 (el panel no monta y listo).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.secAntiBad) return;

    /* ==== RUTAS ==== */
    const CFG = {
        CONFIG: 'security/moderation/config',
        LOGS: 'security/moderation/logs'
    };
    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const LOG_CAP = 300;              /* cuántos registros mantiene en vivo */

    const A = SCSOC.secAntiBad = {
        open: function () { openWin(); },
        close: closeWin,
        /* API pública: por si otros files quieren consultar el filtro */
        check: function (text) {
            const u = me();
            const v = verdict(u, 'contenido', String(text || ''));
            return { ok: v.ok, kind: v.kind || null, msg: v.msg || '' };
        }
    };

    /* ==== ESTADO ==== */
    let myRole = null;
    let mounted = false;
    const S = {
        cfg: DEFAULTS(), cfgOk: false,
        logs: [], tab: 'registro', win: false
    };
    const FLOOD = {};        /* uid -> timestamps de intentos */
    const lastLogAt = {};    /* anti-spam del propio log */

    let statTotal, statHoy, statWords;
    let winEl, winBody, tabBtns = [];

    /* ==== HELPERS ==== */
    function toast(m) { if (SCSOC.toast) try { SCSOC.toast(m); } catch (e) {} else console.log('[Anti-Bad] ' + m); }
    function el(tag, css, cls) {
        const n = document.createElement(tag);
        if (css) n.style.cssText = css;
        if (cls) n.className = cls;
        return n;
    }
    function E(tag, cls) { return el(tag, '', cls); }
    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function isOwner() { const u = me(); return !!u && String(u.email || '').toLowerCase() === OWNER_EMAIL; }
    function canCfg() { return isOwner() || myRole === 'admin' || myRole === 'owner'; }
    function plural(kind) { return kind === 'post' ? 'los posts' : (kind === 'respuesta' ? 'las respuestas' : 'los comentarios'); }

    /* ==== DEFAULTS (se usan si aún no existe config en Firebase) ==== */
    function DEFAULTS() {
        return {
            filters: { words: true, links: true, flood: true },
            words: ['puta', 'puto', 'mierda', 'pendejo', 'pendeja', 'chinga', 'chingar',
                'verga', 'culero', 'zorra', 'gilipollas', 'coño'],
            links: { allow: ['stevscon.com', 'youtube.com', 'youtu.be'] },
            flood: { max: 5, window: 30, cooldown: 60 }
        };
    }
    function mergeCfg(v) {
        const d = DEFAULTS();
        if (!v || typeof v !== 'object') return d;
        if (v.filters && typeof v.filters === 'object') {
            d.filters.words = v.filters.words !== false;
            d.filters.links = v.filters.links !== false;
            d.filters.flood = v.filters.flood !== false;
        }
        if (v.words) {
            const raw = Array.isArray(v.words) ? v.words : Object.keys(v.words).map(function (k) { return v.words[k]; });
            d.words = cleanWords(raw);
        }
        if (v.links && typeof v.links === 'object' && v.links.allow) {
            const raw = Array.isArray(v.links.allow) ? v.links.allow : Object.keys(v.links.allow).map(function (k) { return v.links.allow[k]; });
            d.links.allow = cleanWords(raw);
        }
        if (v.flood && typeof v.flood === 'object') {
            d.flood.max = clamp(Number(v.flood.max) || d.flood.max, 1, 30);
            d.flood.window = clamp(Number(v.flood.window) || d.flood.window, 5, 600);
            d.flood.cooldown = clamp(Number(v.flood.cooldown) || d.flood.cooldown, 5, 3600);
        }
        return d;
    }
    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
    function cleanWords(arr) {
        const out = [], seen = {};
        (arr || []).forEach(function (w) {
            const s = String(w || '').trim().toLowerCase().slice(0, 40);
            if (s && !seen[s]) { seen[s] = 1; out.push(s); }
        });
        return out.slice(0, 300);
    }

    /* ==== DETECCIÓN ==== */
    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
            .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
            .replace(/@/g, 'a').replace(/\$/g, 's')
            .replace(/[^a-z]/g, '')
            .replace(/(.)\1{2,}/g, '$1');
    }
    function findWord(text) {
        const list = S.cfg.words || [];
        if (!list.length) return null;
        const n = norm(text);
        if (!n) return null;
        for (let i = 0; i < list.length; i++) {
            const w = norm(list[i]);
            if (w && n.indexOf(w) !== -1) return list[i];
        }
        return null;
    }
    const LINK_RE = /(https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|xyz|info|io|gg|me|tv|tk|ml|ga|cf|to|link|site|store|app|dev))/i;
    function hasLink(text) {
        const t = String(text || '');
        if (!LINK_RE.test(t)) return false;
        const low = t.toLowerCase();
        const allow = (S.cfg.links && S.cfg.links.allow) || [];
        for (let i = 0; i < allow.length; i++) {
            const d = String(allow[i] || '').toLowerCase().trim();
            if (d && low.indexOf(d) !== -1) return false;   /* dominio permitido */
        }
        return true;
    }
    function floodHit(uid) {
        if (!uid) return 0;
        const c = S.cfg.flood || {};
        const max = Math.max(1, Number(c.max) || 5);
        const winMs = Math.max(5, Number(c.window) || 30) * 1000;
        const cd = Math.max(5, Number(c.cooldown) || 60);
        const now = Date.now();
        const arr = FLOOD[uid] = (FLOOD[uid] || []).filter(function (t) { return now - t < winMs; });
        arr.push(now);
        return arr.length > max ? cd : 0;
    }

    /* ==== VEREDICTO (núcleo, síncrono) ==== */
    function verdict(u, kind, text) {
        if (!S.cfgOk) return { ok: true };                    /* sin config: no frenar nada */
        if (!text || !String(text).trim()) return { ok: true };
        if (!u) return { ok: true };                          /* invitados no publican igual */
        if (isOwner() || myRole) return { ok: true };         /* staff publicar libre */
        const f = S.cfg.filters || {};
        if (f.flood !== false) {
            const wait = floodHit(u.uid);
            if (wait) return { ok: false, kind: 'flood', match: '', text: text,
                msg: 'Vas muy rápido. Espera ' + wait + 's para volver a comentar.' };
        }
        if (f.words !== false) {
            const w = findWord(text);
            if (w) return { ok: false, kind: 'palabra', match: w, text: text,
                msg: 'Tu ' + kind + ' contiene una palabra no permitida.' };
        }
        if (f.links !== false && hasLink(text)) {
            return { ok: false, kind: 'enlace', match: '', text: text,
                msg: 'Los enlaces no están permitidos en ' + plural(kind) + '.' };
        }
        return { ok: true };
    }

    /* ==== LOG del intento (con anti-flood del propio log) ==== */
    function logAttempt(u, kind, v) {
        try {
            if (!u) return;
            const key = u.uid + ':' + v.kind;
            const now = Date.now();
            if (lastLogAt[key] && now - lastLogAt[key] < 10000) return;
            lastLogAt[key] = now;
            db().ref(CFG.LOGS).push({
                by: u.uid,
                name: u.displayName || '',
                kind: v.kind,
                where: kind,
                match: String(v.match || '').slice(0, 40),
                text: String(v.text || '').slice(0, 240),
                at: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) {}
    }

    /* ==== ENVOLTURA de los publishes (sin tocar tus files) ==== */
    function wrapCreate(mod, kind) {
        if (!mod || typeof mod.create !== 'function' || mod.create.__scab) return false;
        const orig = mod.create;
        const wrapped = function () {
            const args = Array.prototype.slice.call(arguments);
            try {
                let text = '';
                for (let i = 1; i < args.length; i++) {
                    if (typeof args[i] === 'string' && args[i].length) { text = args[i]; break; }
                }
                const v = verdict(me(), kind, text);
                if (v.ok) return orig.apply(this, args);
                logAttempt(me(), kind, v);
                toast(v.msg);
                for (let i = args.length - 1; i >= 0; i--) {
                    if (typeof args[i] === 'function') { try { args[i](new Error(v.msg)); } catch (e) {} break; }
                }
                return Promise.reject(new Error('[Anti-Bad] ' + v.msg));
            } catch (e) {
                console.warn('[Anti-Bad] wrapper:', e);
                return orig.apply(this, args);   /* jamás romper el flujo real */
            }
        };
        wrapped.__scab = true;
        mod.create = wrapped;
        console.log('[Anti-Bad] protección activa en ' + kind + 's.');
        return true;
    }
    let wrapTries = 0;
    (function wrapWatch() {
        try {
            const a = wrapCreate(SCSOC.comments, 'comentario');
            const b = wrapCreate(SCSOC.responses, 'respuesta');
            if (!(a && b) && ++wrapTries < 60) return setTimeout(wrapWatch, 500);
        } catch (e) {}
    })();

    /* ==== ESCUCHAS EN VIVO (config para TODOS, logs para staff) ==== */
    function startEngine() {
        db().ref(CFG.CONFIG).on('value', function (s) {
            S.cfg = mergeCfg(s.val());
            S.cfgOk = !!s.val();
            paintStats();
        }, function () { S.cfgOk = false; });

        db().ref(CFG.LOGS).limitToLast(LOG_CAP).on('value', function (s) {
            const out = [];
            s.forEach(function (c) { const v = c.val(); if (v) { v.id = c.key; out.push(v); } });
            S.logs = out.reverse();   /* push keys van de viejo a nuevo */
            paintStats();
            if (S.win && S.tab === 'registro') renderLogs();
        }, function () { /* sin permiso de lectura: nada */ });
    }

    /* ==== CSS ==== */
    function injectCss() {
        if (document.querySelector('style[data-scab]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scab', '1');
        css.textContent = ''
            + '.scab-box{border:1px solid var(--border-color,#2e2440);background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.03)),#151027;border-radius:16px;padding:14px;margin-top:10px;}'
            + '.scab-boxtop{display:flex;align-items:center;gap:11px;}'
            + '.scab-ico{flex:none;width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;font-size:15px;box-shadow:0 4px 14px rgba(139,92,246,.35);}'
            + '.scab-tt{flex:1;min-width:0;}'
            + '.scab-tt h3{margin:0;font:800 13.5px Inter,sans-serif;color:var(--text-main,#f8fafc);letter-spacing:.02em;}'
            + '.scab-tt p{margin:2px 0 0;font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scab-openbtn{flex:none;display:inline-flex;align-items:center;gap:7px;border:0;border-radius:10px;padding:9px 13px;background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;font:800 11px Inter,sans-serif;letter-spacing:.06em;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,.3);transition:transform .15s ease,box-shadow .15s ease;}'
            + '.scab-openbtn:hover{transform:translateY(-1px);box-shadow:0 7px 20px rgba(139,92,246,.45);}'
            + '.scab-openbtn:active{transform:scale(.97);}'
            + '.scab-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;}'
            + '.scab-cell{background:#0f0b1d;border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:9px 10px;text-align:center;}'
            + '.scab-cell b{display:block;font:800 17px Inter,sans-serif;color:var(--purple-accent,#8b5cf6);}'
            + '.scab-cell span{display:block;margin-top:2px;font:700 8.5px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);}'
            + '.scab-backdrop{position:fixed;inset:0;background:rgba(5,3,10,.62);backdrop-filter:blur(3px);z-index:2147483048;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
            + '.scab-backdrop.scab-on{opacity:1;pointer-events:auto;}'
            + '.scab-win{position:fixed;top:0;right:0;height:100vh;width:460px;max-width:96vw;background:#151027;border-left:1px solid var(--border-color,#2e2440);box-shadow:-18px 0 50px rgba(0,0,0,.5);z-index:2147483049;display:flex;flex-direction:column;transform:translateX(103%);transition:transform .32s cubic-bezier(.2,.8,.2,1);}'
            + '.scab-win.scab-on{transform:none;}'
            + '.scab-winhead{display:flex;align-items:center;gap:10px;padding:16px 16px 12px;border-bottom:1px solid var(--border-color,#2e2440);}'
            + '.scab-winhead h2{margin:0;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);flex:1;}'
            + '.scab-x{flex:none;width:30px;height:30px;border-radius:9px;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:13px;}'
            + '.scab-x:hover{color:var(--text-main,#f8fafc);background:var(--bg-hover,#261f36);}'
            + '.scab-tabs{display:flex;gap:6px;padding:12px 16px 0;}'
            + '.scab-tab{flex:1;border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);border-radius:10px;padding:8px 4px;font:800 10.5px Inter,sans-serif;letter-spacing:.08em;cursor:pointer;}'
            + '.scab-tab.scab-ontab{background:rgba(139,92,246,.16);border-color:var(--purple-accent,#8b5cf6);color:#c4b5fd;}'
            + '.scab-body{flex:1;overflow-y:auto;padding:14px 16px 20px;}'
            + '.scab-log{border:1px solid var(--border-color,#2e2440);background:#0f0b1d;border-radius:12px;padding:10px 12px;margin-bottom:8px;}'
            + '.scab-logrow{display:flex;align-items:center;gap:8px;margin-bottom:6px;}'
            + '.scab-kind{flex:none;font:800 9px Inter,sans-serif;letter-spacing:.1em;border-radius:999px;padding:3px 8px;}'
            + '.scab-when{margin-left:auto;font:600 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scab-who{font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);}'
            + '.scab-quote{margin-top:6px;border-left:3px solid var(--border-color,#2e2440);padding:5px 9px;font:400 12px/1.5 Inter,sans-serif;color:var(--text-muted,#94a3b8);word-break:break-word;white-space:pre-wrap;}'
            + '.scab-uid{margin-top:6px;font:600 9.5px Inter,sans-serif;color:#6d5fa8;cursor:pointer;word-break:break-all;}'
            + '.scab-uid:hover{color:var(--purple-accent,#8b5cf6);}'
            + '.scab-empty{text-align:center;padding:34px 16px;color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;line-height:1.7;}'
            + '.scab-empty i{display:block;margin:0 auto 10px;font-size:26px;color:var(--purple-accent,#8b5cf6);opacity:.7;}'
            + '.scab-addrow{display:flex;gap:8px;margin-bottom:12px;}'
            + '.scab-inp{flex:1;min-width:0;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;font:600 12.5px Inter,sans-serif;outline:none;}'
            + '.scab-inp:focus{border-color:var(--purple-accent,#8b5cf6);}'
            + '.scab-inp::placeholder{color:#6d5fa8;font-weight:600;}'
            + '.scab-plus{flex:none;width:42px;border:0;border-radius:10px;background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;font-size:15px;cursor:pointer;}'
            + '.scab-chips{display:flex;flex-wrap:wrap;gap:7px;}'
            + '.scab-chip{display:inline-flex;align-items:center;gap:7px;background:#0f0b1d;border:1px solid var(--border-color,#2e2440);color:#ede9fe;border-radius:999px;padding:5px 8px 5px 11px;font:600 12px Inter,sans-serif;}'
            + '.scab-chipx{border:0;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;font-size:11px;padding:1px 3px;}'
            + '.scab-chipx:hover{color:#f87171;}'
            + '.scab-set{border:1px solid var(--border-color,#2e2440);background:#0f0b1d;border-radius:12px;padding:12px;margin-bottom:10px;}'
            + '.scab-setrow{display:flex;align-items:center;gap:10px;}'
            + '.scab-setrow b{flex:1;font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);}'
            + '.scab-setrow small{display:block;margin-top:2px;font:600 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);}'
            + '.scab-sw{flex:none;position:relative;width:40px;height:22px;border-radius:999px;border:0;background:#2e2440;cursor:pointer;transition:background .2s ease;padding:0;}'
            + '.scab-sw.scab-onsw{background:var(--purple-accent,#8b5cf6);}'
            + '.scab-knob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s ease;}'
            + '.scab-sw.scab-onsw .scab-knob{left:21px;}'
            + '.scab-flood{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}'
            + '.scab-flood label{font:700 9.5px Inter,sans-serif;letter-spacing:.1em;color:var(--text-muted,#94a3b8);display:block;margin-bottom:5px;text-align:center;}'
            + '.scab-save{width:100%;border:0;border-radius:11px;padding:12px;background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;font:800 12px Inter,sans-serif;letter-spacing:.06em;cursor:pointer;box-shadow:0 4px 14px rgba(139,92,246,.3);}'
            + '.scab-save:hover{box-shadow:0 7px 20px rgba(139,92,246,.45);}'
            + '.scab-note{margin-top:10px;text-align:center;font:600 10.5px Inter,sans-serif;color:var(--text-muted,#94a3b8);line-height:1.6;}'
            + '.scab-clear{width:100%;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08);color:#f87171;border-radius:10px;padding:9px;font:800 11px Inter,sans-serif;letter-spacing:.06em;cursor:pointer;margin-bottom:12px;}'
            + '.scab-clear:hover{background:rgba(239,68,68,.16);}'
            + '@media (max-width:640px){.scab-win{width:100vw;}}';
        document.head.appendChild(css);
    }

    /* ==== BOX en el panel ==== */
    function mount() {
        if (mounted || !SCSOC.security || !SCSOC.security.body) return;
        mounted = true;
        injectCss();

        const bodyEl = SCSOC.security.body;

        /* --- BOX ANTI-BAD (queda abajo de REPORTS por orden de carga) --- */
        const box = E('div', 'scab-box');
        const top = E('div', 'scab-boxtop');
        const ic = E('div', 'scab-ico');
        ic.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        const tt = E('div', 'scab-tt');
        const h = E('h3', ''); h.textContent = 'ANTI-BAD';
        const p = E('p', ''); p.textContent = 'Anti-spam · palabras · enlaces · flood';
        tt.appendChild(h); tt.appendChild(p);
        top.appendChild(ic); top.appendChild(tt);
        const btn = el('button', '', 'scab-openbtn');
        btn.type = 'button';
        btn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i>';
        btn.appendChild(document.createTextNode('ABRIR'));
        btn.addEventListener('click', function () { openWin(); });
        top.appendChild(btn);
        box.appendChild(top);

        const grid = E('div', 'scab-stats');
        statTotal = mkCell(grid, 'BLOQUEOS');
        statHoy = mkCell(grid, 'HOY');
        statWords = mkCell(grid, 'PALABRAS');
        box.appendChild(grid);
        bodyEl.appendChild(box);

        /* Escape cierra SOLO esta ventana */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !S.win) return;
            e.preventDefault(); e.stopPropagation();
            closeWin();
        }, true);

        paintStats();
        /* Primera vez del staff: si aún no existe config, se crea al momento */
        if (!S.cfgOk && canCfg()) {
            try { db().ref(CFG.CONFIG).set(S.cfg); } catch (e) {}
        }
        console.log('[Stevscon][SEC] anti-bad.js listo (v1) — box ANTI-BAD montado, filtro activo en comentarios y respuestas.');
    }

    function mkCell(host, label) {
        const c = E('div', 'scab-cell');
        const b = E('b', ''); b.textContent = '—';
        const sp = E('span', ''); sp.textContent = label;
        c.appendChild(b); c.appendChild(sp);
        host.appendChild(c);
        return b;
    }

    function paintStats() {
        const day0 = new Date(); day0.setHours(0, 0, 0, 0);
        let hoy = 0;
        S.logs.forEach(function (l) { if ((l.at || 0) >= day0.getTime()) hoy++; });
        if (statTotal) statTotal.textContent = String(S.logs.length);
        if (statHoy) statHoy.textContent = String(hoy);
        if (statWords) statWords.textContent = String((S.cfg.words || []).length);
    }

    /* ==== VENTANA ==== */
    function openWin() {
        if (S.win) return;
        const bd = el('div', '', 'scab-backdrop');
        bd.addEventListener('click', closeWin);
        const win = E('div', 'scab-win');

        const head = E('div', 'scab-winhead');
        const h2 = E('h2', ''); h2.textContent = '🛡 ANTI-BAD';
        const x = el('button', '', 'scab-x'); x.type = 'button';
        x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        x.addEventListener('click', closeWin);
        head.appendChild(h2); head.appendChild(x);

        const tabs = E('div', 'scab-tabs');
        tabBtns = [];
        [['registro', 'REGISTRO'], ['palabras', 'PALABRAS'], ['ajustes', 'AJUSTES']].forEach(function (t) {
            const b = el('button', '', 'scab-tab'); b.type = 'button'; b.textContent = t[1];
            b.addEventListener('click', function () { S.tab = t[0]; markTabs(); renderTab(); });
            b._tab = t[0];
            tabs.appendChild(b); tabBtns.push(b);
        });

        winBody = E('div', 'scab-body');
        win.appendChild(head); win.appendChild(tabs); win.appendChild(winBody);
        document.body.appendChild(bd); document.body.appendChild(win);

        requestAnimationFrame(function () {
            bd.classList.add('scab-on');
            win.classList.add('scab-on');
        });
        S.win = true;
        markTabs(); renderTab();
    }
    function closeWin() {
        if (!S.win || !winEl) return;
        const bd = winEl.previousSibling;
        winEl.classList.remove('scab-on');
        if (bd && bd.classList) bd.classList.remove('scab-on');
        const w = winEl, b = bd;
        S.win = false; winEl = null; winBody = null;
        setTimeout(function () {
            if (w && w.parentNode) w.parentNode.removeChild(w);
            if (b && b.parentNode) b.parentNode.removeChild(b);
        }, 330);
    }
    function markTabs() {
        tabBtns.forEach(function (b) {
            if (b._tab === S.tab) b.classList.add('scab-ontab');
            else b.classList.remove('scab-ontab');
        });
    }
    function renderTab() {
        if (!winBody) return;
        winBody.textContent = '';
        if (S.tab === 'registro') renderLogs();
        else if (S.tab === 'palabras') renderWords();
        else renderAjustes();
    }

    /* ==== TAB 1 · REGISTRO ==== */
    function fmtWhen(ts) {
        try {
            return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ''; }
    }
    const KIND_STYLE = {
        palabra: { bg: 'rgba(239,68,68,.14)', fg: '#f87171', txt: 'PALABRA' },
        enlace: { bg: 'rgba(251,191,36,.14)', fg: '#fbbf24', txt: 'ENLACE' },
        flood: { bg: 'rgba(139,92,246,.16)', fg: '#c4b5fd', txt: 'FLOOD' }
    };
    function renderLogs() {
        if (!winBody) return;
        winBody.textContent = '';

        if (canCfg() && S.logs.length) {
            const clr = el('button', '', 'scab-clear');
            clr.type = 'button'; clr.textContent = '🗑 LIMPIAR REGISTRO';
            clr.addEventListener('click', function () {
                if (!window.confirm('¿Borrar TODO el registro de intentos bloqueados?')) return;
                db().ref(CFG.LOGS).remove().then(function () {
                    toast('Registro limpio ✓');
                }).catch(function () { toast('No se pudo limpiar el registro.'); });
            });
            winBody.appendChild(clr);
        }

        if (!S.logs.length) {
            const em = E('div', 'scab-empty');
            em.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
            em.appendChild(document.createTextNode('Aún no hay intentos bloqueados. Cuando alguien intente spam, malas palabras o links, aparecerá aquí al instante.'));
            winBody.appendChild(em);
            return;
        }
        S.logs.slice(0, 200).forEach(function (l) {
            const st = KIND_STYLE[l.kind] || KIND_STYLE.palabra;
            const item = E('div', 'scab-log');

            const row = E('div', 'scab-logrow');
            const k = el('span', 'background:' + st.bg + ';color:' + st.fg + ';', 'scab-kind');
            k.textContent = st.txt;
            const w = E('div', 'scab-who');
            w.textContent = (l.name || 'Usuario') + ' · en ' + (l.where || 'comentario');
            const t = E('span', 'scab-when'); t.textContent = fmtWhen(l.at);
            row.appendChild(k); row.appendChild(w); row.appendChild(t);
            item.appendChild(row);

            if (l.match) {
                const m = E('div', 'scab-who');
                m.style.cssText = 'font-size:10.5px;color:#f87171;margin-top:2px;';
                m.textContent = 'Detectado: "' + l.match + '"';
                item.appendChild(m);
            }
            if (l.text) {
                const q = E('div', 'scab-quote');
                q.textContent = l.text.length >= 240 ? l.text + '…' : l.text;
                item.appendChild(q);
            }
            if (l.by) {
                const u = E('div', 'scab-uid');
                u.textContent = 'UID: ' + l.by + ' · clic para copiar';
                u.title = 'Copiar UID';
                u.addEventListener('click', function () { copyTxt(l.by); });
                item.appendChild(u);
            }
            winBody.appendChild(item);
        });
    }
    function copyTxt(t) {
        try {
            navigator.clipboard.writeText(String(t || '')).then(function () { toast('Copiado ✓'); }, function () {});
        } catch (e) {}
    }

    /* ==== TAB 2 · PALABRAS ==== */
    function renderWords() {
        if (!winBody) return;
        winBody.textContent = '';

        const addrow = E('div', 'scab-addrow');
        const inp = el('input', '', 'scab-inp');
        inp.type = 'text'; inp.maxLength = 300;
        inp.placeholder = canCfg() ? 'Palabra nueva (o varias, separadas por comas)' : 'Solo lectura para mods';
        inp.value = ''; inp.disabled = !canCfg();
        const plus = el('button', '', 'scab-plus'); plus.type = 'button';
        plus.innerHTML = '<i class="fa-solid fa-plus"></i>';
        plus.disabled = !canCfg();
        plus.addEventListener('click', function () { addWords(inp.value); inp.value = ''; });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { addWords(inp.value); inp.value = ''; }
        });
        addrow.appendChild(inp); addrow.appendChild(plus);
        if (canCfg()) winBody.appendChild(addrow);

        const chips = E('div', 'scab-chips');
        const list = S.cfg.words || [];
        if (!list.length) {
            const em = E('div', 'scab-empty');
            em.innerHTML = '<i class="fa-solid fa-comment-slash"></i>';
            em.appendChild(document.createTextNode('Lista vacía. Agrega las palabras que quieres bloquear (se detectan aunque usen acentos, símbolos o letras repetidas).'));
            chips.appendChild(em);
        } else {
            list.forEach(function (w) {
                const c = E('span', 'scab-chip');
                const t = E('b', ''); t.style.cssText = 'font:600 12px Inter,sans-serif;'; t.textContent = w;
                c.appendChild(t);
                if (canCfg()) {
                    const x = el('button', '', 'scab-chipx'); x.type = 'button';
                    x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    x.title = 'Quitar';
                    x.addEventListener('click', function () {
                        S.cfg.words = S.cfg.words.filter(function (q) { return q !== w; });
                        saveCfg();
                    });
                    c.appendChild(x);
                }
                chips.appendChild(c);
            });
        }
        winBody.appendChild(chips);

        const note = E('div', 'scab-note');
        note.textContent = 'Filtro inteligente: pu.u.ta, puuuta, p@uta y 9u74 caen igual. El staff nunca es filtrado.';
        winBody.appendChild(note);
    }
    function addWords(raw) {
        if (!canCfg()) return;
        const parts = String(raw || '').split(/[,;\n]+/);
        const cur = {};
        (S.cfg.words || []).forEach(function (w) { cur[w] = 1; });
        let added = 0;
        parts.forEach(function (p) {
            const s = String(p || '').trim().toLowerCase().slice(0, 40);
            if (s && !cur[s]) { cur[s] = 1; added++; }
        });
        if (!added) return;
        S.cfg.words = cleanWords(Object.keys(cur));
        saveCfg();
    }

    /* ==== TAB 3 · AJUSTES ==== */
    function renderAjustes() {
        if (!winBody) return;
        winBody.textContent = '';
        const edit = canCfg();

        function setRow(host, title, desc, on, cb) {
            const box = E('div', 'scab-set');
            const row = E('div', 'scab-setrow');
            const lbl = E('div', '');
            lbl.style.cssText = 'flex:1;min-width:0;';
            const b = E('b', ''); b.textContent = title;
            const sm = E('small', ''); sm.textContent = desc;
            lbl.appendChild(b); lbl.appendChild(sm);
            const sw = el('button', '', 'scab-sw' + (on ? ' scab-onsw' : ''));
            sw.type = 'button'; sw.disabled = !edit;
            sw.setAttribute('role', 'switch');
            sw.setAttribute('aria-checked', on ? 'true' : 'false');
            const kn = E('span', 'scab-knob');
            sw.appendChild(kn);
            sw.addEventListener('click', function () {
                const nv = !sw.classList.contains('scab-onsw');
                sw.classList.toggle('scab-onsw', nv);
                sw.setAttribute('aria-checked', nv ? 'true' : 'false');
                cb(nv);
            });
            row.appendChild(lbl); row.appendChild(sw);
            box.appendChild(row);
            host.appendChild(box);
        }

        setRow(winBody, 'Filtro de palabras', 'Bloquea las palabras de la lista PALABRAS', S.cfg.filters.words !== false,
            function (v) { S.cfg.filters.words = v; });
        setRow(winBody, 'Bloquear enlaces', 'Prohíbe links en comentarios y respuestas (respeta la lista permitida)', S.cfg.filters.links !== false,
            function (v) { S.cfg.filters.links = v; });
        setRow(winBody, 'Control de flood', 'Limita cuán rápido puede comentar una misma persona', S.cfg.filters.flood !== false,
            function (v) { S.cfg.filters.flood = v; });

        /* Flood: números */
        const fbox = E('div', 'scab-set');
        const flbl = E('b', ''); flbl.style.cssText = 'display:block;font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-bottom:9px;';
        flbl.textContent = 'Límites del flood';
        fbox.appendChild(flbl);
        const grid = E('div', 'scab-flood');
        const fInp = {};
        [['max', 'MENSAJES'], ['window', 'VENTANA (SEG)'], ['cooldown', 'COOLDOWN (SEG)']].forEach(function (f) {
            const cell = E('div', '');
            const l = E('label', ''); l.textContent = f[1];
            const i = el('input', '', 'scab-inp');
            i.type = 'number'; i.min = '1'; i.max = '3600';
            i.value = String(S.cfg.flood[f[0]]); i.disabled = !edit;
            fInp[f[0]] = i;
            cell.appendChild(l); cell.appendChild(i);
            grid.appendChild(cell);
        });
        fbox.appendChild(grid);
        winBody.appendChild(fbox);

        /* Whitelist de enlaces */
        const lbox = E('div', 'scab-set');
        const llbl = E('b', ''); llbl.style.cssText = 'display:block;font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-bottom:9px;';
        llbl.textContent = 'Dominios permitidos (enlaces)';
        lbox.appendChild(llbl);
        if (edit) {
            const addrow = E('div', 'scab-addrow');
            addrow.style.cssText = 'margin-bottom:10px;';
            const inp = el('input', '', 'scab-inp');
            inp.type = 'text'; inp.maxLength = 80;
            inp.placeholder = 'dominio.com';
            const plus = el('button', '', 'scab-plus'); plus.type = 'button';
            plus.innerHTML = '<i class="fa-solid fa-plus"></i>';
            plus.addEventListener('click', function () { addAllow(inp.value); inp.value = ''; });
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { addAllow(inp.value); inp.value = ''; } });
            addrow.appendChild(inp); addrow.appendChild(plus);
            lbox.appendChild(addrow);
        }
        const chips = E('div', 'scab-chips');
        const allow = S.cfg.links.allow || [];
        if (!allow.length) {
            const em = E('div', 'scab-note'); em.textContent = 'Sin excepciones: se bloquean TODOS los enlaces.';
            chips.appendChild(em);
        } else {
            allow.forEach(function (d) {
                const c = E('span', 'scab-chip');
                const t = E('b', ''); t.style.cssText = 'font:600 12px Inter,sans-serif;'; t.textContent = d;
                c.appendChild(t);
                if (edit) {
                    const x = el('button', '', 'scab-chipx'); x.type = 'button';
                    x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    x.addEventListener('click', function () {
                        S.cfg.links.allow = S.cfg.links.allow.filter(function (q) { return q !== d; });
                        saveCfg();
                    });
                    c.appendChild(x);
                }
                chips.appendChild(c);
            });
        }
        lbox.appendChild(chips);
        winBody.appendChild(lbox);

        if (!edit) {
            const note = E('div', 'scab-note');
            note.textContent = 'Solo el Owner y los Admin pueden editar estos ajustes.';
            winBody.appendChild(note);
            return;
        }

        const save = el('button', '', 'scab-save');
        save.type = 'button'; save.textContent = '💾 GUARDAR AJUSTES';
        save.addEventListener('click', function () {
            S.cfg.flood.max = clamp(parseInt(fInp.max.value, 10) || S.cfg.flood.max, 1, 30);
            S.cfg.flood.window = clamp(parseInt(fInp.window.value, 10) || S.cfg.flood.window, 5, 600);
            S.cfg.flood.cooldown = clamp(parseInt(fInp.cooldown.value, 10) || S.cfg.flood.cooldown, 5, 3600);
            saveCfg();
        });
        winBody.appendChild(save);
    }
    function addAllow(raw) {
        const s = String(raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').slice(0, 80);
        if (!s) return;
        S.cfg.links.allow = S.cfg.links.allow || [];
        if (S.cfg.links.allow.indexOf(s) !== -1) return;
        S.cfg.links.allow.push(s);
        renderAjustes();
    }

    /* ==== GUARDAR config (solo admin/owner; reglas lo refuerzan) ==== */
    let saving = false;
    function saveCfg() {
        if (!canCfg() || saving) return;
        saving = true;
        const payload = {
            filters: S.cfg.filters,
            words: S.cfg.words,
            links: { allow: S.cfg.links.allow || [] },
            flood: S.cfg.flood
        };
        db().ref(CFG.CONFIG).set(payload).then(function () {
            saving = false;
            toast('Anti-Bad actualizado ✓');
            paintStats();
            if (S.win && S.tab === 'palabras') renderWords();
        }).catch(function (err) {
            saving = false;
            toast('No se pudo guardar (' + ((err && err.code) || 'permisos') + ').');
        });
    }

    /* ==== ARRANQUE: motor (todos) + panel (solo staff) ==== */
    (function wait() {
        const ok = window.firebase;
        if (!ok) return setTimeout(wait, 150);
        startEngine();

        const waitPanel = function () {
            const okP = SCSOC.security && SCSOC.security.body && SCSOC.staff;
            if (!okP) return setTimeout(waitPanel, 150);
            tryMount();
            try { firebase.auth().onAuthStateChanged(function () { tryMount(); }); } catch (e) {}
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