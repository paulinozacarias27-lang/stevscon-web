/**
 * ====
 * STEVSCON.COM — forms/forms_core.js (v1)
 * FM CORE · la base compartida de APOSTULACIONES.
 * Namespace: window.StevsconForms (FM) — igual que SCSOC y WK.
 *
 *  - Helpers de TODOS los files de forms: el() (DOM seguro con
 *    textContent, jamás innerHTML), esc(), toast(), timeAgo(), db().
 *  - LIMITS: imágenes de 20MB (una sola constante; sube a 30 y todo
 *    el sistema la obedece al toque).
 *  - session(): usuario + rango en una sola lectura — Owner (tu gmail)
 *    y Admins (social/staff/{uid} = 'admin', como tus rules). Los mods
 *    NO entran en forms: solo Owner y Admins crean y revisan.
 *  - imgToB64(): imágenes a base64 con el tope de peso (banners,
 *    preguntas de imagen y respuestas).
 *  - CERO dependencias al cargar; Firebase se toca solo al LLAMAR
 *    db()/session(), nunca al arrancar el file.
 * ====
 */
(function (window, document) {
    'use strict';

    var FM = window.StevsconForms = window.StevsconForms || {};
    var core = FM.core = FM.core || {};

    var OWNER_EMAIL = 'steven23hd@gmail.com';      /* el Owner, igual que tus rules */
    var LIMITS = core.LIMITS = {
        imgMB: 20,                                  /* 20MB — cambia a 30 y listo */
        imgBytes: 20 * 1024 * 1024,
        textMax: 15000
    };

    /* ==== HELPERS ==== */
    core.el = function (tag, style, text) {
        var e = document.createElement(tag);
        if (style) e.style.cssText = style;
        if (text != null) e.textContent = text;     /* XSS fuera: nunca innerHTML */
        return e;
    };

    core.esc = function (s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    core.db = function () { return firebase.database(); };

    core.isOwnerEmail = function (u) {
        return !!(u && u.email && String(u.email).toLowerCase() === OWNER_EMAIL);
    };

    core.timeAgo = function (ts) {
        var d = Date.now() - (Number(ts) || 0);
        if (d < 0) d = 0;
        var m = Math.floor(d / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
        if (m < 1) return 'ahora mismo';
        if (m < 60) return 'hace ' + m + ' min';
        if (h < 24) return 'hace ' + h + ' h';
        if (dd < 30) return 'hace ' + dd + ' d';
        return new Date(Number(ts) || 0).toLocaleDateString('es');
    };

    /* ==== SESIÓN + RANGO (una sola lectura, cacheada) ====
       Acepta el staff guardado como string 'admin' o como {role:'admin'},
       exactamente como lo leen tus Firebase rules. */
    var sess = null;
    core.session = function (cb) {
        if (sess) return cb(sess);
        var out = function (o) { sess = o; cb(o); };
        try {
            var a = firebase.auth();
            var u = a.currentUser;
            if (!u) return out({ user: null, uid: null, email: '', isOwner: false, isAdmin: false, isStaff: false });
            var isOwner = core.isOwnerEmail(u);
            core.db().ref('social/staff/' + u.uid).once('value').then(function (s) {
                var v = s.val();
                var role = (v && typeof v === 'object') ? (v.role || '') : (v || '');
                var isAdmin = role === 'admin';
                out({ user: u, uid: u.uid, email: u.email || '', isOwner: isOwner, isAdmin: isAdmin, isStaff: isOwner || isAdmin });
            }).catch(function () {
                out({ user: u, uid: u.uid, email: u.email || '', isOwner: isOwner, isAdmin: false, isStaff: isOwner });
            });
        } catch (e) {
            out({ user: null, uid: null, email: '', isOwner: false, isAdmin: false, isStaff: false });
        }
    };
    /* al cerrar sesión / cambiar de cuenta: que se vuelva a leer */
    core.clearSession = function () { sess = null; };

    /* ==== IMÁGENES → base64 (tope LIMITS.imgBytes, gifs incluidos) ==== */
    core.imgToB64 = function (file, cb) {
        if (!file) return cb(null, 'No seleccionaste ninguna imagen.');
        if (!/^image\//.test(file.type)) return cb(null, 'Solo imágenes (JPG, PNG, GIF, WebP…). Los videos no.');
        if (file.size > LIMITS.imgBytes) return cb(null, 'La imagen pesa más de ' + LIMITS.imgMB + 'MB.');
        var r = new FileReader();
        r.onload = function () { cb(String(r.result), null); };
        r.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
        r.readAsDataURL(file);
    };

    /* ==== TOAST (claro/oscuro automático, se apaga solo) ==== */
    var toastCss = false;
    core.toast = function (msg, kind) {
        if (!toastCss) {
            toastCss = true;
            var st = document.createElement('style');
            st.setAttribute('data-fm', 'toast');
            st.textContent = ''
                + '.fm-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147483000;'
                + 'display:flex;align-items:center;gap:9px;max-width:min(480px,92vw);padding:11px 16px;border-radius:12px;'
                + 'font:600 13px Inter,sans-serif;background:var(--bg-card,#1a1625);color:var(--text-main,#f8fafc);'
                + 'border:1px solid var(--border-color,#2e2440);box-shadow:0 12px 34px rgba(0,0,0,.45);'
                + 'opacity:0;transition:opacity .22s ease,transform .22s ease;}'
                + '.fm-toast.fm-on{opacity:1;transform:translateX(-50%) translateY(-4px);}'
                + '.fm-toast i{font-size:13px;}'
                + '.fm-toast.fm-ok i{color:#34d399;}'
                + '.fm-toast.fm-error i{color:#f87171;}'
                + '.fm-toast.fm-info i{color:var(--purple-accent,#8b5cf6);}';
            (document.head || document.documentElement).appendChild(st);
        }
        var t = document.createElement('div');
        t.className = 'fm-toast fm-' + (kind === 'ok' ? 'ok' : kind === 'error' ? 'error' : 'info');
        var i = document.createElement('i');
        i.className = 'fa-solid ' + (kind === 'ok' ? 'fa-circle-check' : kind === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
        t.appendChild(i);
        t.appendChild(document.createTextNode(String(msg)));
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.classList.add('fm-on'); });
        setTimeout(function () {
            t.classList.remove('fm-on');
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
        }, 2600);
    };

    console.log('[Stevscon] forms_core.js listo (v1) — namespace FM activo (Owner/Admins = creadores).');
})(window, document);