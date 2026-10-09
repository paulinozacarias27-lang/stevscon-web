/**
 * ====
 * STEVSCON.COM — unban.js (v1) — RAÍZ DEL PROYECTO
 * EJECUTOR DEL AVISO DE DESBANEO.
 *
 * accounts.js (security) escribe  security/accounts/unbans/{uid}
 *   { by, byName, reason, at }  y quita  security/accounts/bans/{uid}.
 * unban.js lo EJECUTA del lado del usuario:
 *   1) Detecta el desban en vivo (logueado o solo con la bandera del dispositivo).
 *   2) Quita la bandera de baneo del navegador AL INSTANTE.
 *   3) Pide a banned.js esconder la pantalla roja (StevsconBan.hide(), v3).
 *   4) Muestra el AVISO VERDE con HappyFace.png: quién lo quitó y la razón.
 *      Se cierra con la X o presionando ESC. Es solo aviso, no bloquea nada.
 *   5) Anti-repeticiones: cada aviso se muestra UNA vez (por fecha del evento)
 *      y NUNCA se muestra si la cuenta está baneada de nuevo (re-ban seguro).
 *
 * INSTALACIÓN (una línea por HTML, SIEMPRE después de banned.js):
 *   index.html  -> <script defer src="unban.js?v=1"></script>
 *   social.html -> <script src="/unban.js?v=1"></script>
 *
 * SEGURIDAD: todo texto con textContent (NUNCA innerHTML con datos);
 * innerHTML solo para iconos. Sin datos de usuario en HTML.
 * ====
 */
(function (window, document) {
    'use strict';

    /* ==== CONFIG ==== */
    var UNBANS_PATH = 'security/accounts/unbans';  // {uid}: {by, byName, reason, at}
    var BANS_PATH = 'security/accounts/bans';      // para el seguro anti re-ban
    var FACE_IMG = '/HappyFace.png';               // tu imagen en la raíz
    var FACE_IMG_FALLBACK = 'HappyFace.png';       // por si la página sirve de otra carpeta
    var BAN_LS = 'sc_ban_device_v1';               // MISMA llave que banned.js
    var SEEN_LS = 'sc_unban_seen_v1';              // avisos ya mostrados
    var SPARK_COUNT = 12;                          // destellos verdos en el fondo

    var panelOpen = false, panelEl = null;
    var watching = {};

    /* ==== HELPERS BASE ==== */
    function db() { return firebase.database(); }
    function fmtDate(ts) {
        var n = Number(ts);
        if (!n) return '—';
        try {
            return new Date(n).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) +
                ' · ' + new Date(n).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return String(ts); }
    }
    function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    /* ==== BANDERA DE BAN (lectura/limpieza — misma llave que banned.js) ==== */
    function banHasUid(uid) {
        var d = lsGet(BAN_LS);
        return !!(d.u && d.u[uid]);
    }
    function devEmailOf(uid) {
        var d = lsGet(BAN_LS), ks = d.e ? Object.keys(d.e) : [];
        for (var i = 0; i < ks.length; i++) {
            var r = d.e[ks[i]];
            if (r && r.uid === uid && r.email) return r.email;
        }
        return '';
    }
    function banClearUid(uid) {
        var d = lsGet(BAN_LS), ch = false;
        if (d.u && d.u[uid]) { delete d.u[uid]; ch = true; }
        var ks = d.e ? Object.keys(d.e) : [];
        for (var i = 0; i < ks.length; i++) {
            var r = d.e[ks[i]];
            if (r && r.uid === uid) {
                if (d.last && d.last === ks[i]) d.last = '';
                delete d.e[ks[i]];
                ch = true;
            }
        }
        if (d.last === uid) { d.last = ''; ch = true; }
        if (ch) lsSet(BAN_LS, d);
    }

    /* ==== AVISOS YA MOSTRADOS (por fecha del evento) ==== */
    function seenGet(uid) { var s = lsGet(SEEN_LS); return Number(s[uid]) || 0; }
    function seenSet(uid, at) { var s = lsGet(SEEN_LS); s[uid] = at; lsSet(SEEN_LS, s); }

    /* ==== ESCONDER LA PANTALLA ROJA (banned.js v3 o fallback) ==== */
    function hideBanScreen() {
        try {
            if (window.StevsconBan && typeof window.StevsconBan.hide === 'function') {
                window.StevsconBan.hide();
                return;
            }
        } catch (e) {}
        /* Fallback si banned.js aún no expone hide() */
        try {
            var o = document.getElementById('sc-ban-overlay');
            if (o && o.parentNode) o.parentNode.removeChild(o);
            if (window.StevsconBanData) window.StevsconBanData.showing = false;
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            var kids = document.body.children;
            for (var i = 0; i < kids.length; i++) {
                if (kids[i].id === 'sc-unban-overlay') continue;
                kids[i].style.display = '';
            }
        } catch (e) {}
    }

    /* ==== CSS DEL AVISO (destellos y brillos verdes) ==== */
    function injectCSS() {
        if (document.getElementById('sc-unban-css')) return;
        var st = document.createElement('style');
        st.id = 'sc-unban-css';
        st.textContent =
            '@keyframes scUnbanFall{0%{transform:translate3d(0,-12vh,0);opacity:0}8%{opacity:var(--op,.4)}90%{opacity:var(--op,.4)}100%{transform:translate3d(0,112vh,0);opacity:0}}' +
            '@keyframes scUnbanSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}' +
            '@keyframes scUnbanPop{0%{transform:scale(.92) translateY(16px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}' +
            '@keyframes scUnbanGlow{0%,100%{text-shadow:0 0 16px rgba(34,197,94,.45),0 0 44px rgba(34,197,94,.2)}50%{text-shadow:0 0 26px rgba(74,222,128,.8),0 0 64px rgba(34,197,94,.32)}}' +
            '@keyframes scUnbanFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
            '#sc-unban-overlay .sc-unban-spark{pointer-events:none}' +
            '@media (prefers-reduced-motion:reduce){#sc-unban-overlay .sc-unban-spark{display:none}#sc-unban-overlay .sc-unban-img,#sc-unban-overlay .sc-unban-title{animation:none!important}}';
        document.head.appendChild(st);
    }

    /* ==== DESTELLO VERDE (SVG, cae lento y gira, como la lluvia del ban pero en modo feliz) ==== */
    function mkSpark() {
        var size = Math.round(10 + Math.random() * 14);
        var left = (-4 + Math.random() * 104).toFixed(1);
        var dur = (6 + Math.random() * 5).toFixed(1);
        var delay = (-(Math.random() * 12)).toFixed(1);
        var spin = (4 + Math.random() * 4).toFixed(1);
        var op = (0.18 + Math.random() * 0.34).toFixed(2);
        var far = size < 16;

        var outer = document.createElement('div');
        outer.className = 'sc-unban-spark';
        outer.style.cssText = 'position:absolute;top:0;left:' + left + '%;width:' + size + 'px;height:' + size + 'px;will-change:transform;animation:scUnbanFall ' + dur + 's linear infinite;animation-delay:' + delay + 's;';
        outer.style.setProperty('--op', op);

        var inner = document.createElement('div');
        inner.style.cssText = 'width:100%;height:100%;animation:scUnbanSpin ' + spin + 's linear infinite;animation-delay:' + delay + 's;filter:drop-shadow(0 0 5px rgba(34,197,94,.45))' + (far ? ' blur(1px)' : '') + ';';

        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('aria-hidden', 'true');
        var star = document.createElementNS(NS, 'path');
        star.setAttribute('d', 'M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z');
        star.setAttribute('fill', '#4ade80');
        svg.appendChild(star);

        inner.appendChild(svg);
        outer.appendChild(inner);
        return outer;
    }

    /* ==== AVISO VERDE ==== */
    function metaRow(labelTxt, valueTxt) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;gap:14px;padding:8px 2px;border-bottom:1px solid var(--border-color,#2e2440);text-align:left;';
        var l = document.createElement('span');
        l.textContent = labelTxt;
        l.style.cssText = 'flex:none;font:800 10px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);padding-top:3px;';
        var v = document.createElement('span');
        v.textContent = valueTxt || '—';
        v.style.cssText = 'font:600 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);word-break:break-word;text-align:right;';
        row.appendChild(l); row.appendChild(v);
        return row;
    }

    function buildPanel(rec, email) {
        injectCSS();

        var o = document.createElement('div');
        o.id = 'sc-unban-overlay';
        o.setAttribute('role', 'dialog');
        o.setAttribute('aria-label', 'Cuenta desbaneada');
        o.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;background:rgba(4,12,7,.9);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;overflow:hidden;';

        /* FONDO: destellos verdes cayendo lento */
        var sparks = document.createElement('div');
        sparks.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none;';
        for (var i = 0; i < SPARK_COUNT; i++) sparks.appendChild(mkSpark());
        o.appendChild(sparks);

        var card = document.createElement('div');
        card.style.cssText = 'position:relative;width:min(430px,94vw);background:var(--bg-card,#16121f);border:1px solid rgba(74,222,128,.4);border-radius:18px;padding:26px 24px 20px;text-align:center;box-sizing:border-box;box-shadow:0 0 70px rgba(34,197,94,.16),0 0 26px rgba(34,197,94,.12),0 30px 90px rgba(0,0,0,.7);animation:scUnbanPop .5s cubic-bezier(.2,.9,.3,1.15) both;';

        /* X para cerrar */
        var x = document.createElement('button');
        x.type = 'button';
        x.setAttribute('aria-label', 'Cerrar aviso');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.style.cssText = 'position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:9px;border:1px solid rgba(34,197,94,.4);background:rgba(34,197,94,.1);color:#4ade80;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-sizing:border-box;';
        x.addEventListener('click', closePanel);
        card.appendChild(x);

        /* Imagen feliz: flotando con resplandor verde */
        var img = document.createElement('img');
        img.className = 'sc-unban-img';
        img.alt = 'Desbaneado';
        img.src = FACE_IMG;
        img.style.cssText = 'width:132px;height:132px;border-radius:26px;object-fit:cover;display:block;margin:0 auto 4px;filter:drop-shadow(0 0 26px rgba(34,197,94,.45));animation:scUnbanFloat 3.4s ease-in-out infinite;';
        img.addEventListener('error', function () {
            if (img.dataset.fb === '2') {
                var ic = document.createElement('i');
                ic.className = 'fa-solid fa-face-smile';
                ic.style.cssText = 'display:flex;align-items:center;justify-content:center;width:132px;height:132px;margin:0 auto 4px;color:#4ade80;font-size:56px;filter:drop-shadow(0 0 22px rgba(34,197,94,.5));box-sizing:border-box;';
                if (img.parentNode) img.parentNode.replaceChild(ic, img);
                return;
            }
            img.dataset.fb = '2';
            img.src = FACE_IMG_FALLBACK;
        });
        card.appendChild(img);

        /* Píldora */
        var pill = document.createElement('span');
        pill.textContent = 'BAN LEVANTADO';
        pill.style.cssText = 'display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.5);color:#4ade80;font:800 10px Inter,sans-serif;letter-spacing:.16em;';
        card.appendChild(pill);

        /* Título */
        var h = document.createElement('h1');
        h.className = 'sc-unban-title';
        h.textContent = 'Desbaneado!';
        h.style.cssText = 'margin:10px 0 0;font:800 36px/1.1 Inter,sans-serif;letter-spacing:-.02em;color:#4ade80;animation:scUnbanGlow 2.6s ease-in-out infinite;';
        card.appendChild(h);

        /* Subtítulo */
        var sub = document.createElement('p');
        sub.textContent = 'Tu cuenta vuelve a tener acceso completo a Stevscon.com.';
        sub.style.cssText = 'margin:6px 0 14px;font:600 13px Inter,sans-serif;line-height:1.6;color:var(--text-muted,#94a3b8);';
        card.appendChild(sub);

        /* Razón del desban */
        var rl = document.createElement('p');
        rl.textContent = 'RAZÓN DEL DESBAN';
        rl.style.cssText = 'margin:0 0 4px;text-align:left;font:800 10px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);';
        card.appendChild(rl);
        var fReason = document.createElement('p');
        fReason.textContent = rec.reason || 'No especificada';
        fReason.style.cssText = 'margin:0 0 12px;text-align:left;font:600 13px Inter,sans-serif;line-height:1.6;color:var(--text-main,#f8fafc);background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;word-break:break-word;white-space:pre-wrap;';
        card.appendChild(fReason);

        card.appendChild(metaRow('DESBANEADO POR', rec.byName || 'Staff'));
        card.appendChild(metaRow('FECHA', fmtDate(rec.at)));
        card.appendChild(metaRow('CUENTA', email || '—'));

        var note = document.createElement('p');
        note.textContent = '¡Bienvenido de vuelta! Ya puedes iniciar sesión y usar la web con normalidad.';
        note.style.cssText = 'margin:14px 0 0;font:600 11.5px Inter,sans-serif;line-height:1.6;color:#bbf7d0;';
        card.appendChild(note);

        var foot = document.createElement('p');
        foot.textContent = 'Stevscon.com · Sistema de Seguridad';
        foot.style.cssText = 'margin:12px 0 0;font:800 9.5px Inter,sans-serif;letter-spacing:.18em;color:var(--text-muted,#94a3b8);opacity:.7;';
        card.appendChild(foot);

        o.appendChild(card);
        return o;
    }

    function showPanel(rec, email) {
        if (panelOpen) return;
        panelOpen = true;
        panelEl = buildPanel(rec || {}, email || '');
        document.body.appendChild(panelEl);
        console.log('[Stevscon][UNBAN] aviso verde mostrado para:', email || '');
    }
    function closePanel() {
        panelOpen = false;
        if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
        panelEl = null;
    }

    /* ==== NÚCLEO: mirar unbans/{uid} ==== */
    function watchUid(uid) {
        if (!uid || watching[uid]) return;
        watching[uid] = true;
        db().ref(UNBANS_PATH + '/' + uid).on('value', function (s) {
            var rec = s.val();
            if (!rec || !rec.at) return;
            if (Number(rec.at) <= seenGet(uid)) return;      // aviso ya mostrado antes
            seenSet(uid, Number(rec.at));                    // se consume aunque no se muestre
            if (!banHasUid(uid)) return;                     // este dispositivo nunca vio el ban (staff, etc.)
            /* Seguro anti re-ban: si la cuenta está baneada OTRA VEZ, la pantalla roja manda */
            db().ref(BANS_PATH + '/' + uid).once('value').then(function (bs) {
                if (bs && bs.val()) return;
                var email = devEmailOf(uid);
                banClearUid(uid);
                hideBanScreen();
                showPanel(rec, email);
            }).catch(function () {});
        }, function (err) {
            console.warn('[Stevscon][UNBAN] sin lectura de ' + UNBANS_PATH + '/' + uid + ' — publica las reglas nuevas:', err && err.code);
        });
    }

    /* ==== API PÚBLICA ==== */
    window.StevsconUnban = {
        version: 1,
        close: closePanel,
        isShowing: function () { return panelOpen; }
    };
    try { window.SCSOC = window.SCSOC || {}; window.SCSOC.unban = window.StevsconUnban; } catch (e) {}

    /* ==== ARRANQUE ==== */
    var tries = 0;
    (function boot() {
        tries++;
        var ok = false;
        try { ok = !!(window.firebase && firebase.database && firebase.auth && firebase.apps && firebase.apps.length > 0); } catch (e) { ok = false; }
        if (!ok) {
            if (tries < 150) return setTimeout(boot, 120);
            console.warn('[Stevscon][UNBAN] Firebase nunca estuvo listo; el aviso de desban queda en espera.');
            return;
        }
        /* Mirar a: el uid logueado + todos los uids en la bandera del dispositivo */
        try {
            var cu = firebase.auth().currentUser;
            if (cu && cu.uid) watchUid(cu.uid);
            firebase.auth().onAuthStateChanged(function (u) {
                if (u && u.uid) watchUid(u.uid);
            });
        } catch (e) {}
        var d = lsGet(BAN_LS);
        if (d.u) Object.keys(d.u).forEach(function (uid) { watchUid(uid); });
        /* ESC cierra el aviso */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panelOpen) { e.preventDefault(); closePanel(); }
        });
        console.log('[Stevscon][UNBAN] unban.js listo (v1) — aviso verde ACTIVO. Cierra con X o ESC.');
    })();
})(window, document);