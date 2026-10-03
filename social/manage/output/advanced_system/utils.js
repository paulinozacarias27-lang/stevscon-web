/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/utils.js (v3)
 * AYUDANTE SUPREMO del Social. Debe ser el PRIMER file del social
 * en cargarse en el index (después de numbers.js).
 *
 * Expone el namespace global `SCSOC`:
 *   CONFIG (rutas Firebase + límites) · IDs de 16 dígitos ·
 *   escape anti-XSS · texto con pings @ · "hace 5 min" ·
 *   avatares Base64/GIF + circulito de status · nombre + verificado ·
 *   cache LIVE de usuarios (get vivo + once de una lectura) ·
 *   staff (owner + elegidos) · hooks (los demás files se enganchan
 *   solos) · negación a visitantes.
 * v2: SCSOC.users.once() — lecturas de UNA sola vez para crear
 *   posts/comentarios/respuestas sin dejar listeners vivos.
 * v3: AVATARES REALES — ahora lee profile/avatarUrl (la ruta que
 *   ESCRIBE Profiles; antes mirábamos profile.avatar y por eso
 *   salía solo la LETRA del nombre). Acepta Base64/GIF y URLs
 *   http(s), y usa los presets de Profiles (StevsconProfiles.ui)
 *   para que el avatar se vea IGUAL que en la página de Perfiles.
 *   Además _status entiende el objeto { state:'online' } que guarda
 *   Profiles (los circulitos de estado vuelven a salir).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC._utilsLoaded) return;
    SCSOC._utilsLoaded = true;

    /* ==== CONFIG GENERAL (todo se ajusta SOLO aquí) ==== */
    const CONFIG = SCSOC.CONFIG = {
        POSTS: 'social/posts',            // social/posts/{postId}
        COMMENTS: 'social/comments',      // social/comments/{postId}/{commentId}
        RESPONSES: 'social/responses',    // social/responses/{commentId}/{responseId}
        LIKES: 'social/likes',            // social/likes/{tipo}/{id}/{uid} = true
        COUNTERS: 'social/counters',      // social/counters/{tipo}/{id}/{campo} = n
        STAFF: 'social/staff',            // social/staff/{uid} = { role: 'admin'|'mod' }
        USERS: 'users',
        OWNER_EMAIL: 'steven23hd@gmail.com',
        MAX_POST: 15000,                  // límite de caracteres por post
        MAX_COMMENT: 2000,
        MAX_RESPONSE: 1000,
        FEED_SIZE: 50,
        DEPTH_MAX: 3                    // comentario -> resp -> resp (máx 3)
    };

    const db = SCSOC.db = function () { return firebase.database(); };

    /* ==== IDs numéricos de 16 dígitos (convención Stevscon) ==== */
    SCSOC.ids = {
        make: function () {
            return String(Date.now()) + String(100 + Math.floor(Math.random() * 900));
        }
    };

    /* ==== ANTI-XSS ==== */
    SCSOC.esc = function (s) {
        const d = document.createElement('div');
        d.textContent = String(s == null ? '' : s);
        return d.innerHTML;
    };

    /* Creador rápido de elementos */
    SCSOC.el = function (tag, css, cls) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (cls) e.className = cls;
        return e;
    };

    /* ==== TIEMPO: "ahora", "hace 5 min", "hace 2 h", "hace 3 d" ==== */
    SCSOC.timeAgo = function (ts) {
        if (!ts) return '';
        const s = Math.max(0, (Date.now() - ts) / 1000);
        if (s < 45) return 'ahora';
        if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
        if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
        if (s < 604800) return 'hace ' + Math.floor(s / 86400) + ' d';
        return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    /* ==== TEXTO con PING @handler (100% seguro: textContent) ==== */
    const PING_RE = /@([a-z0-9_.-]{3,20})/gi;
    SCSOC.richText = function (text) {
        const frag = document.createDocumentFragment();
        const s = String(text == null ? '' : text);
        let last = 0, m;
        PING_RE.lastIndex = 0;
        while ((m = PING_RE.exec(s))) {
            if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
            const ping = SCSOC.el('span', 'color:var(--purple-accent,#8b5cf6);font-weight:700;');
            ping.textContent = m[0];
            frag.appendChild(ping);
            last = m.index + m[0].length;
        }
        if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
        return frag;
    };

    /* ==== INSIGNIA VERIFICADO (estilo X, morado Stevscon) ==== */
    SCSOC.verifiedBadge = function (px) {
        const s = SCSOC.el('span', 'display:inline-flex;flex:none;');
        s.title = 'Verificado';
        const w = px || 15;
        s.innerHTML = '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" aria-label="Verificado">' +
            '<circle cx="12" cy="12" r="10.5" fill="#8b5cf6"/>' +
            '<path d="m7.3 12.6 3 3 6.4-6.8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        return s;
    };

    /* ==== AVATAR (v3): imagen propia (Base64/GIF o URL http) + presets
     * de Profiles + letra inicial de respaldo + circulito de status ==== */
    const STATUS_COLORS = { online: '#22c55e', inactive: '#f59e0b', busy: '#ef4444', offline: '#6b7280' };

    function initialOf(u) {
        return (u && u._name ? String(u._name).trim().charAt(0).toUpperCase() : '') || '?';
    }

    function innerAvatar(u, size) {
        const av = (u && u._avatar) || '';
        /* 1) Imagen propia: Base64/GIF o URL http(s). Antes solo se
         *    aceptaba data:image -> muchas caían a la letra por error. */
        if (av && /^(data:image|https?:\/\/)/i.test(av)) {
            const img = SCSOC.el('img', 'width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;background:var(--bg-hover,#221b33);');
            img.src = av; img.alt = 'Avatar'; img.draggable = false;
            return img;
        }
        /* 2) Preset de Profiles (el MISMO look que la página de Perfiles) */
        const preset = (u && u._avatarPreset) || '';
        if (preset && window.StevsconProfiles && window.StevsconProfiles.ui &&
            typeof window.StevsconProfiles.ui.avatarEl === 'function') {
            try {
                const el = window.StevsconProfiles.ui.avatarEl(
                    { avatarUrl: '', avatarPreset: preset }, size, initialOf(u));
                if (el) return el;
            } catch (e) { /* cae al fallback de letra */ }
        }
        /* 3) Letra inicial (igual que siempre) */
        const f = SCSOC.el('span', 'width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
            'background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;font-weight:800;user-select:none;' +
            'font-size:' + Math.round(size * 0.42) + 'px;font-family:Inter,sans-serif;');
        f.textContent = initialOf(u);
        return f;
    }

    SCSOC.avatarEl = function (u, size, status) {
        size = size || 40;
        const wrap = SCSOC.el('span', 'position:relative;display:inline-flex;width:' + size + 'px;height:' + size + 'px;flex:none;');
        wrap.appendChild(innerAvatar(u, size));
        const c = STATUS_COLORS[status];
        if (c) {
            const d = Math.max(10, Math.round(size * 0.3));
            wrap.appendChild(SCSOC.el('span', 'position:absolute;right:-1px;bottom:-1px;width:' + d + 'px;height:' + d + 'px;' +
                'border-radius:50%;background:' + c + ';border:2.5px solid var(--bg-main,#0d0b14);box-sizing:border-box;'));
        }
        return wrap;
    };

    /* ==== CACHE LIVE DE USUARIOS ====
     * ADAPTADOR (v3): alineado a como escribe Profiles — campos de
     * cuenta (username, handler) en la RAÍZ de users/{uid} y campos
     * editables (avatarUrl, bannerUrl, description, gender...) en
     * users/{uid}/profile. Si un día cambias rutas, toca SOLO aquí. */
    const _ucache = {};

    function presenceOf(raw) {
        return (raw && raw.online && raw.online.state) || (raw && raw.presence) || '';
    }
    function statusOf(raw) {
        const st = raw && raw.status;
        if (st && typeof st === 'object') return String(st.state || '') || presenceOf(raw);
        if (typeof st === 'string' && st) return st;
        return presenceOf(raw);
    }

    function adaptUser(raw) {
        raw = raw || {};
        const p = raw.profile || {};
        return {
            _name: raw.name || raw.displayName || raw.username || p.name || p.username || 'Usuario',
            _handler: String(raw.handler || raw.tag || p.handler || '').toLowerCase().replace(/^@/, ''),
            /* v3: el avatar vive en profile/avatarUrl (y puede ser URL http,
             * no solo Base64). profile/avatar era una ruta que NADIE escribe. */
            _avatar: raw.avatarUrl || raw.avatar || p.avatarUrl || p.avatar ||
                (raw.media && (raw.media.avatar || raw.media.avatarUrl)) || '',
            _avatarPreset: raw.avatarPreset || p.avatarPreset || '',
            _verified: !!(raw.verified || p.verified),
            _status: statusOf(raw)
        };
    }

    SCSOC.users = {
        /* get: suscripción VIVA (avatar, nombre, status en pantalla) */
        get: function (uid, cb) {
            if (!uid) { if (cb) cb(null); return null; }
            const c = _ucache[uid] || (_ucache[uid] = { cbs: [], ready: false, data: null, on: false });
            if (cb) c.cbs.push(cb);
            if (c.on) { if (c.ready && cb) cb(c.data); return c.data; }
            c.on = true;
            SCSOC.db().ref(CONFIG.USERS).child(uid).on('value', function (s) {
                c.data = adaptUser(s.val());
                c.ready = true;
                for (let i = 0; i < c.cbs.length; i++) { try { c.cbs[i](c.data); } catch (e) {} }
            });
            return null;
        },
        /* once: UNA sola lectura (crear posts/comentarios/respuestas
         * sin dejar listeners vivos = cero duplicados) */
        once: function (uid, cb) {
            if (!uid) { if (cb) cb(null); return; }
            const c = _ucache[uid];
            if (c && c.ready) { if (cb) cb(c.data); return; }
            SCSOC.db().ref(CONFIG.USERS).child(uid).once('value', function (s) {
                const d = adaptUser(s.val());
                if (c) { c.data = d; c.ready = true; }
                if (cb) cb(d);
            }, function () { if (cb) cb(null); });
        }
    };

    /* ==== CABEZA DE USUARIO: avatar + nombre + verificado + @handler ====
     * Cliqueable: lleva data-scsoc-profile -> profiles_show.js abre el panel. */
    SCSOC.userHead = function (uid, size, opts) {
        opts = opts || {};
        const head = SCSOC.el('span', 'display:inline-flex;align-items:center;gap:10px;min-width:0;flex:1;cursor:pointer;');
        head.dataset.scsocProfile = uid;
        const avSlot = SCSOC.el('span', 'display:inline-flex;flex:none;');
        const line = SCSOC.el('span', 'display:inline-flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap;');
        head.appendChild(avSlot); head.appendChild(line);
        SCSOC.users.get(uid, function (u) {
            avSlot.innerHTML = '';
            avSlot.appendChild(SCSOC.avatarEl(u, size, u ? u._status : ''));
            line.innerHTML = '';
            const nm = SCSOC.el('b', 'color:var(--text-main,#f8fafc);font-size:' + (opts.nameSize || 14.5) + 'px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;');
            nm.textContent = u ? u._name : 'Usuario';
            line.appendChild(nm);
            if (u && u._verified) line.appendChild(SCSOC.verifiedBadge(opts.badgeSize || 15));
            if (u && u._handler) {
                const h = SCSOC.el('span', 'color:var(--text-muted,#94a3b8);font-size:' + (opts.handlerSize || 12) + 'px;white-space:nowrap;');
                h.textContent = '@' + u._handler;
                line.appendChild(h);
            }
        });
        return head;
    };

    /* ==== STAFF: owner automático + elegidos en social/staff/{uid} ==== */
    let _staffCache = null;
    SCSOC.staff = {
        role: function (cb) {
            const u = firebase.auth().currentUser;
            if (!u) { if (cb) cb(null); return; }
            if (_staffCache && _staffCache[u.uid] !== undefined) { if (cb) cb(_staffCache[u.uid]); return; }
            const done = function (r) {
                _staffCache = _staffCache || {};
                _staffCache[u.uid] = r;
                if (cb) cb(r);
            };
            if (String(u.email || '').toLowerCase() === CONFIG.OWNER_EMAIL) return done('owner');
            SCSOC.db().ref(CONFIG.STAFF).child(u.uid).once('value').then(function (s) {
                const v = s.val();
                done(v ? (v.role || 'mod') : null);
            }).catch(function () { done(null); });
        }
    };
    SCSOC.isStaff = function (cb) { SCSOC.staff.role(function (r) { if (cb) cb(!!r); }); };

    /* ==== VISITANTES: negación (se conecta con errors.js) ====
     * errors.js puede escuchar 'sc:social-deny' y mostrar SU panel;
     * si hace SCSOC.denySilent = true, el toast de respaldo se apaga. */
    SCSOC.toast = function (msg) {
        const t = SCSOC.el('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:4000;' +
            'background:var(--bg-card,#1a1625);border:1px solid var(--purple-accent,#8b5cf6);color:var(--text-main,#f8fafc);' +
            'font:600 13px Inter,sans-serif;padding:10px 18px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.5);';
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2300);
    };
    SCSOC.deny = function (msg) {
        try {
            document.dispatchEvent(new CustomEvent('sc:social-deny', { detail: { msg: msg || null, at: Date.now() } }));
        } catch (e) {}
        if (!SCSOC.denySilent) SCSOC.toast(msg || 'Necesitas una cuenta para interactuar 🔒');
    };
    SCSOC.requireLogin = function (fn) {
        const u = firebase.auth().currentUser;
        if (!u) { SCSOC.deny(); return false; }
        fn(u);
        return true;
    };

    /* ==== HOOKS: los files se conectan entre sí sin tocarse ==== */
    const HOOKS = SCSOC.hooks = { postCard: [], commentCard: [], postMenu: [], commentMenu: [] };
    SCSOC.onHook = function (name, fn) { (HOOKS[name] || (HOOKS[name] = [])).push(fn); };
    SCSOC.runHooks = function (name) {
        const list = HOOKS[name] || [];
        for (let i = 0; i < list.length; i++) {
            try { list[i].apply(null, Array.prototype.slice.call(arguments, 1)); }
            catch (e) { console.error('[SCSOC hook:' + name + ']', e); }
        }
    };

    /* ==== CONTADORES (nodos aparte para que las reglas queden limpias) ==== */
    SCSOC.counters = {
        ref: function (type, id, field) { return SCSOC.db().ref(CONFIG.COUNTERS).child(type).child(id).child(field); },
        bump: function (type, id, field, delta) {
            SCSOC.counters.ref(type, id, field).transaction(function (n) {
                return Math.max(0, (Number(n) || 0) + delta);
            });
        },
        watch: function (type, id, cb) {
            const r = SCSOC.db().ref(CONFIG.COUNTERS).child(type).child(id);
            const h = r.on('value', function (s) { cb(s.val() || {}); });
            return function () { r.off('value', h); };
        }
    };

    /* ==== CATEGORÍAS (conecta aquí la variable de tu category_set.js) ==== */
    SCSOC.categories = function () {
        const g = window.StevsconSocialCategories;
        if (Array.isArray(g) && g.length) return g;
        return ['General', 'Anuncios', 'Actualizaciones'];
    };

    /* fallback por si numbers.js no cargó antes */
    if (!SCSOC.nums) SCSOC.nums = {
        fmt: function (n) { return String(n || 0); },
        full: function (n) { return String(n || 0); }
    };

    console.log('[Stevscon] utils.js listo (v3) — ayudante supremo con avatares REALES (avatarUrl + presets) y users.once.');
})(window, document);