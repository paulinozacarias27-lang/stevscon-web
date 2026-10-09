/**
 * ====
 * STEVSCON.COM — banned.js (v1) — RAÍZ DEL PROYECTO
 * EJECUTOR DEL SISTEMA DE BANEOS.
 *
 * accounts.js registra el ban en  security/accounts/bans/{uid}
 * banned.js lo EJECUTA de verdad:
 *   1) Pantalla de baneo a pantalla completa (con BannedFace.png).
 *   2) Cierra la sesión al instante si la cuenta baneada está dentro.
 *   3) Bloquea INICIAR SESIÓN de cuentas baneadas (antes y después del login).
 *   4) Bloquea CREAR cuentas con correos baneados (espejo por correo).
 *   5) Bandera de dispositivo: si tu navegador vio un ban, la pantalla
 *      aparece al instante en la próxima visita (Firebase la confirma).
 *   6) Anti-manipulación: la pantalla se re-asserta sola cada 1.2s,
 *      re-chequeo vivo cada 60s y al volver a la pestaña.
 *   7) OWNER (steven23hd@gmail.com): SIEMPRE puede INICIAR SESIÓN,
 *      aunque algo lo marque como baneado. Nadie puede CREAR cuentas
 *      con ese correo. Entrar a la cuenta exige su contraseña (Firebase).
 *
 * INSTALACIÓN (2 líneas, una por HTML):
 *   index.html  -> <script defer src="banned.js?v=1"></script>  (último del <head>)
 *   social.html -> <script src="/banned.js?v=1"></script>       (después de category_social.js)
 *
 * SEGURIDAD: todo texto con textContent (NUNCA innerHTML con datos);
 * innerHTML solo para el icono de reserva. Sin datos de usuario.
 * ====
 */
(function (window, document) {
    'use strict';

    /* ==== CONFIG ==== */
    var OWNER_EMAIL = ((window.SCSOC && window.SCSOC.CONFIG && window.SCSOC.CONFIG.OWNER_EMAIL) || 'steven23hd@gmail.com').toLowerCase();
    var BANS_PATH = 'security/accounts/bans';           // {uid}: {reason, by, byName, at}
    var BAN_EMAILS_PATH = 'security/accounts/ban_emails'; // {correo}: {uid, reason, byName, at}
    var FACE_IMG = '/BannedFace.png';                    // tu imagen en la raíz
    var FACE_IMG_FALLBACK = 'BannedFace.png';            // por si la página sirve de otra carpeta
    var LS_KEY = 'sc_ban_device_v1';

    var FB = window.StevsconBanData = { ready: false, showing: false };
    var ov = null, guardT = null, lastInfo = null;
    var banRef = null, banCb = null, watchingUid = null;
    var mirrored = {};   // uid -> emailKey (mantenimiento del espejo)
    var staffP = null;   // promesa: ¿este navegador es staff?
    var screenCbs = [];

    /* ==== HELPERS BASE ==== */
    function db() { return firebase.database(); }
    function isOwnerEmail(e) { return String(e || '').trim().toLowerCase() === OWNER_EMAIL; }
    function emailKey(e) {
        /* Firebase no permite . # $ [ ] en llaves: el punto (99% de los casos) va a coma */
        return String(e || '').trim().toLowerCase().replace(/[.#$\[\]]/g, function (ch) {
            return ch === '.' ? ',' : '_';
        });
    }
    function mkErr(code, msg) { var e = new Error(msg); e.code = code; return e; }
    function fmtDate(ts) {
        var n = Number(ts);
        if (!n) return '—';
        try {
            return new Date(n).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) +
                ' · ' + new Date(n).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return String(ts); }
    }
    function fire(on) {
        for (var i = 0; i < screenCbs.length; i++) { try { screenCbs[i](on); } catch (e) {} }
    }

    /* ==== BANDERA DE DISPOSITIVO (localStorage) ==== */
    function devRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; } }
    function devWrite(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) {} }
    function devGetEmail(email) { var d = devRead(); return (d.e && d.e[emailKey(email)]) || null; }
    function devGetUid(uid) { var d = devRead(); return !!(d.u && d.u[uid]); }
    function devAdd(uid, email, ban) {
        var d = devRead();
        d.e = d.e || {}; d.u = d.u || {};
        d.last = emailKey(email || uid || '');
        d.e[emailKey(email || uid || '')] = {
            uid: uid || '', email: email || '',
            reason: (ban && ban.reason) || '', byName: (ban && ban.byName) || '', at: (ban && ban.at) || 0
        };
        if (uid) d.u[uid] = 1;
        devWrite(d);
    }
    function devClear(uid, email) {
        var d = devRead(), ch = false;
        if (d.e && email && d.e[emailKey(email)]) { delete d.e[emailKey(email)]; ch = true; }
        if (d.u && uid && d.u[uid]) { delete d.u[uid]; ch = true; }
        if (d.last && ((email && d.last === emailKey(email)) || d.last === uid)) { delete d.last; ch = true; }
        if (ch) devWrite(d);
    }

    /* ==== ¿ESTE NAVEGADOR ES STAFF? (para mantenimiento del espejo) ==== */
    function staffCheck() {
        if (staffP) return staffP;
        var u = null;
        try { u = firebase.auth().currentUser; } catch (e) {}
        if (u && isOwnerEmail(u.email)) { staffP = Promise.resolve(true); return staffP; }
        if (!u) { staffP = Promise.resolve(false); return staffP; }
        staffP = db().ref('social/staff/' + u.uid).once('value')
            .then(function (s) { return !!s.val(); })
            .catch(function () { return false; });
        return staffP;
    }

    /* ==== PANTALLA DE BANEO ==== */
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
        return { row: row, val: v };
    }

    function buildOverlay(info) {
        lastInfo = info || {};
        var o = document.createElement('div');
        o.id = 'sc-ban-overlay';
        o.setAttribute('role', 'alertdialog');
        o.setAttribute('aria-modal', 'true');
        o.setAttribute('aria-label', 'Cuenta baneada');
        o.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;background:rgba(6,4,11,.985);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;';
        o.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        var card = document.createElement('div');
        card.style.cssText = 'width:min(430px,94vw);background:var(--bg-card,#16121f);border:1px solid rgba(239,68,68,.45);border-left:4px solid #ef4444;border-radius:16px;padding:26px 24px 20px;text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.7);box-sizing:border-box;';

        var img = document.createElement('img');
        img.id = 'sc-ban-face';
        img.alt = 'Baneado';
        img.src = FACE_IMG;
        img.style.cssText = 'width:128px;height:128px;border-radius:18px;object-fit:cover;border:3px solid rgba(239,68,68,.55);background:var(--bg-main,#0d0b14);display:block;margin:0 auto 6px;box-sizing:border-box;';
        img.addEventListener('error', function () {
            if (img.dataset.fb === '2') {
                var ic = document.createElement('i');
                ic.className = 'fa-solid fa-ban';
                ic.style.cssText = 'display:flex;align-items:center;justify-content:center;width:128px;height:128px;margin:0 auto 6px;border-radius:18px;background:rgba(239,68,68,.12);border:3px solid rgba(239,68,68,.55);color:#ef4444;font-size:52px;box-sizing:border-box;';
                if (img.parentNode) img.parentNode.replaceChild(ic, img);
                return;
            }
            img.dataset.fb = '2';
            img.src = FACE_IMG_FALLBACK;
        });
        card.appendChild(img);

        var pill = document.createElement('span');
        pill.textContent = 'BAN DEFINITIVO';
        pill.style.cssText = 'display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.5);color:#f87171;font:800 10px Inter,sans-serif;letter-spacing:.16em;';
        card.appendChild(pill);

        var h = document.createElement('h1');
        h.textContent = 'CUENTA BANEADA';
        h.style.cssText = 'margin:10px 0 0;font:800 24px Inter,sans-serif;letter-spacing:-.01em;color:#f87171;';
        card.appendChild(h);

        var sub = document.createElement('p');
        sub.textContent = 'El acceso a Stevscon.com ha sido bloqueado para esta cuenta.';
        sub.style.cssText = 'margin:6px 0 14px;font:600 13px Inter,sans-serif;line-height:1.6;color:var(--text-muted,#94a3b8);';
        card.appendChild(sub);

        var rl = document.createElement('p');
        rl.textContent = 'RAZÓN DEL BANEO';
        rl.style.cssText = 'margin:0 0 4px;text-align:left;font:800 10px Inter,sans-serif;letter-spacing:.14em;color:var(--text-muted,#94a3b8);';
        card.appendChild(rl);
        var fReason = document.createElement('p');
        fReason.textContent = info.reason || 'No especificada';
        fReason.style.cssText = 'margin:0 0 12px;text-align:left;font:600 13px Inter,sans-serif;line-height:1.6;color:var(--text-main,#f8fafc);background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;word-break:break-word;white-space:pre-wrap;';
        card.appendChild(fReason);

        var m1 = metaRow('BANEADO POR', info.byName || 'Staff');
        var m2 = metaRow('FECHA', fmtDate(info.at));
        var m3 = metaRow('CUENTA', info.email || (info.uid ? String(info.uid).slice(0, 10) + '…' : '—'));
        card.appendChild(m1.row); card.appendChild(m2.row); card.appendChild(m3.row);
        FB.fields = { reason: fReason, by: m1.val, at: m2.val, acc: m3.val };

        var note = document.createElement('p');
        note.textContent = 'Si crees que esto es un error, contacta al staff de Stevscon.';
        note.style.cssText = 'margin:14px 0 0;font:600 11.5px Inter,sans-serif;line-height:1.6;color:var(--text-muted,#94a3b8);';
        card.appendChild(note);

        var foot = document.createElement('p');
        foot.textContent = 'Stevscon.com · Sistema de Seguridad';
        foot.style.cssText = 'margin:12px 0 0;font:800 9.5px Inter,sans-serif;letter-spacing:.18em;color:var(--text-muted,#94a3b8);opacity:.7;';
        card.appendChild(foot);

        o.appendChild(card);
        return o;
    }

    function lockPage() {
        try {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            var kids = document.body.children;
            for (var i = 0; i < kids.length; i++) {
                if (kids[i].id === 'sc-ban-overlay') continue;
                kids[i].style.display = 'none';
            }
        } catch (e) {}
    }

    function updateFields(info) {
        if (!FB.fields || !info) return;
        if (info.reason !== undefined && info.reason !== null) FB.fields.reason.textContent = info.reason || 'No especificada';
        if (info.byName) FB.fields.by.textContent = info.byName;
        if (info.at) FB.fields.at.textContent = fmtDate(info.at);
        if (info.email) FB.fields.acc.textContent = info.email;
        else if (info.uid) FB.fields.acc.textContent = String(info.uid).slice(0, 10) + '…';
    }

    function showBan(info) {
        lastInfo = info || lastInfo || {};
        if (FB.showing) { updateFields(lastInfo); fire(true); return; }
        FB.showing = true;
        ov = buildOverlay(lastInfo);
        document.body.appendChild(ov);
        lockPage();
        guardT = setInterval(function () {
            if (!FB.showing) return;
            if (!document.getElementById('sc-ban-overlay')) {
                ov = buildOverlay(lastInfo);
                document.body.appendChild(ov);
            }
            lockPage();
        }, 1200);
        fire(true);
        console.warn('[Stevscon][BAN] PANTALLA DE BANEO activa para:', lastInfo.email || lastInfo.uid || '');
    }

    function hideBan() {
        FB.showing = false;
        if (guardT) { clearInterval(guardT); guardT = null; }
        var o = document.getElementById('sc-ban-overlay');
        if (o && o.parentNode) o.parentNode.removeChild(o);
        ov = null;
        try {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            var kids = document.body.children;
            for (var i = 0; i < kids.length; i++) kids[i].style.display = '';
        } catch (e) {}
        fire(false);
        console.log('[Stevscon][BAN] ban levantado: acceso restaurado.');
    }

    /* ==== EJECUCIÓN ==== */
    function kickSession() {
        try {
            var a = firebase.auth();
            if (a.currentUser) {
                a.signOut().then(function () {
                    console.warn('[Stevscon][BAN] sesión cerrada automáticamente (cuenta baneada).');
                }).catch(function () {});
            }
        } catch (e) {}
    }

    function enforceBan(uid, email, ban) {
        devAdd(uid, email, ban);
        showBan({ reason: ban.reason, byName: ban.byName, at: ban.at, uid: uid, email: email });
        kickSession();
    }

    function checkUidNow(user) {
        if (!user) return;
        var email = String(user.email || '').trim().toLowerCase();
        if (isOwnerEmail(email)) return;
        db().ref(BANS_PATH + '/' + user.uid).once('value').then(function (s) {
            var b = s.val();
            if (b) enforceBan(user.uid, email, b);
        }).catch(function () {});
    }

    function attachBanWatch(uid, email) {
        if (watchingUid === uid) return;
        if (banRef && banCb) { try { banRef.off('value', banCb); } catch (e) {} }
        watchingUid = uid;
        banRef = db().ref(BANS_PATH + '/' + uid);
        banCb = banRef.on('value', function (s) {
            var b = s.val();
            if (b) enforceBan(uid, email, b);
            else {
                devClear(uid, email);
                if (FB.showing) hideBan();
            }
        }, function (err) {
            console.warn('[Stevscon][BAN] sin lectura de ' + BANS_PATH + '/' + uid + ' — publica las reglas nuevas:', err && err.code);
        });
    }

    function onAuth(user) {
        if (!user) return;
        var email = String(user.email || '').trim().toLowerCase();
        var uid = user.uid;
        /* OWNER: nunca bloqueado. Acceder con su cuenta exige su contraseña. */
        if (isOwnerEmail(email)) {
            if (banRef && banCb) { try { banRef.off('value', banCb); } catch (e) {} banRef = null; banCb = null; }
            watchingUid = null;
            devClear(uid, email);
            if (FB.showing) hideBan();
            return;
        }
        attachBanWatch(uid, email);
    }

    /* ==== PRE-CHEQUEO POR CORREO (antes de crear/acceder) ==== */
    function precheckEmail(em) {
        var dev = devGetEmail(em);
        if (dev) return Promise.resolve({ via: 'device', info: dev });
        var k = emailKey(em);
        return new Promise(function (res) {
            var done = false, to = null;
            function fin(v) { if (done) return; done = true; if (to) clearTimeout(to); res(v); }
            to = setTimeout(function () { fin(null); }, 2500);
            db().ref(BAN_EMAILS_PATH + '/' + k).once('value').then(function (s) {
                var v = s.val();
                if (!v || !v.uid) return fin(null);
                /* La verdad SIEMPRE es el nodo del UID (auto-sanación tras un desban) */
                db().ref(BANS_PATH + '/' + v.uid).once('value').then(function (bs) {
                    if (bs.val()) return fin({ via: 'mirror', info: v });
                    db().ref(BAN_EMAILS_PATH + '/' + k).remove().catch(function () {});
                    fin(null);
                }).catch(function () { fin({ via: 'mirror', info: v }); });
            }).catch(function () { fin(null); });
        });
    }

    function blockByEmail(em, kind) {
        return precheckEmail(em).then(function (hit) {
            if (!hit) return null;
            var b = hit.info || {};
            devAdd(b.uid || '', em, b);
            showBan({ reason: b.reason, byName: b.byName, at: b.at, uid: b.uid, email: em });
            return mkErr('SC/BANNED', kind === 'create'
                ? 'No se puede crear una cuenta: este correo está baneado.'
                : 'Esta cuenta está baneada: no puede iniciar sesión.');
        });
    }

    /* ==== ENVOLTURIOS DE AUTH (bloqueo ANTES de crear/acceder) ==== */
    function patchAuth() {
        var a = null;
        try { a = firebase.auth(); } catch (e) { return; }
        if (!a || a.__scBanned) return;
        a.__scBanned = true;

        var oIn = a.signInWithEmailAndPassword;
        a.signInWithEmailAndPassword = function (email, pass) {
            var em = String(email || '').trim().toLowerCase();
            if (isOwnerEmail(em)) return oIn.call(a, email, pass);
            return blockByEmail(em, 'login').then(function (err) {
                if (err) return Promise.reject(err);
                return oIn.call(a, email, pass).then(function (cred) {
                    try { if (cred && cred.user) checkUidNow(cred.user); } catch (e) {}
                    return cred;
                });
            });
        };

        var oUp = a.createUserWithEmailAndPassword;
        a.createUserWithEmailAndPassword = function (email, pass) {
            var em = String(email || '').trim().toLowerCase();
            if (isOwnerEmail(em)) {
                return Promise.reject(mkErr('SC/OWNER_EMAIL',
                    'Ese correo pertenece al Owner de Stevscon: no puede usarse para crear cuentas. Usa "Iniciar sesión".'));
            }
            return blockByEmail(em, 'create').then(function (err) {
                if (err) return Promise.reject(err);
                return oUp.call(a, email, pass);
            });
        };

        ['signInAnonymously', 'signInWithPopup', 'signInWithRedirect'].forEach(function (m) {
            if (typeof a[m] !== 'function') return;
            var orig = a[m];
            a[m] = function () {
                return orig.apply(a, arguments).then(function (cred) {
                    try { if (cred && cred.user) checkUidNow(cred.user); } catch (e) {}
                    return cred;
                });
            };
        });
    }

    /* ==== ESPEJO POR CORREO (lo mantiene el navegador del staff) ==== */
    function watchBans() {
        db().ref(BANS_PATH).on('value', function (snap) {
            var bans = snap.val() || {};
            staffCheck().then(function (staffy) {
                if (!staffy) return;
                var seen = {};
                Object.keys(bans).forEach(function (uid) {
                    seen[uid] = true;
                    if (mirrored[uid]) return;
                    mirrored[uid] = 'pending';
                    db().ref('users/' + uid + '/email').once('value').then(function (es) {
                        var email = String(es.val() || '').trim().toLowerCase();
                        if (!email || isOwnerEmail(email)) { delete mirrored[uid]; return; }
                        var k = emailKey(email);
                        mirrored[uid] = k;
                        db().ref(BAN_EMAILS_PATH + '/' + k).set({
                            uid: uid,
                            reason: bans[uid].reason || '',
                            byName: bans[uid].byName || '',
                            at: bans[uid].at || 0
                        }).catch(function (err) {
                            console.warn('[Stevscon][BAN] espejo sin permiso (el bloqueo por UID igual funciona):', err && err.code);
                        });
                    }).catch(function () { delete mirrored[uid]; });
                });
                Object.keys(mirrored).forEach(function (uid) {
                    if (seen[uid]) return;
                    var k = mirrored[uid];
                    delete mirrored[uid];
                    if (k && k !== 'pending') db().ref(BAN_EMAILS_PATH + '/' + k).remove().catch(function () {});
                });
            });
        }, function (err) {
            console.warn('[Stevscon][BAN] sin lectura de ' + BANS_PATH + ' — publica las reglas nuevas:', err && err.code);
        });
    }

    /* ==== BANDERA DE DISPOSITIVO: pantalla instantánea + verificación ==== */
    function deviceGate() {
        var d = devRead();
        if (!d.last) return;
        var rec = d.e && d.e[d.last];
        if (rec) showBan({ reason: rec.reason, byName: rec.byName, at: rec.at, uid: rec.uid, email: rec.email });
    }
    function verifyDeviceFlag() {
        var d = devRead();
        if (!d.last) return;
        var rec = d.e && d.e[d.last];
        if (!rec || !rec.uid) return;
        db().ref(BANS_PATH + '/' + rec.uid).once('value').then(function (s) {
            if (s.val()) { kickSession(); return; }
            devClear(rec.uid, rec.email);
            if (FB.showing && !firebase.auth().currentUser) hideBan();
        }).catch(function () {});
    }

    /* ==== RE-CHEQUEOS (anti-dormido) ==== */
    function recheck() {
        try {
            var u = firebase.auth().currentUser;
            if (u) return checkUidNow(u);
            verifyDeviceFlag();
        } catch (e) {}
    }

    /* ==== API PÚBLICA (para futuros sistemas: bloquear publicar, etc.) ==== */
    window.StevsconBan = {
        version: 1,
        isBanned: function (uid, cb) {
            if (typeof cb !== 'function') return;
            try {
                db().ref(BANS_PATH + '/' + uid).once('value')
                    .then(function (s) { cb(!!s.val(), s.val() || null); })
                    .catch(function () { cb(false, null); });
            } catch (e) { cb(false, null); }
        },
        onScreen: function (cb) { if (typeof cb === 'function') screenCbs.push(cb); },
        isShowing: function () { return FB.showing; }
    };
    try { window.SCSOC = window.SCSOC || {}; window.SCSOC.ban = window.StevsconBan; } catch (e) {}

    /* ==== ARRANQUE ==== */
    var tries = 0;
    (function boot() {
        tries++;
        var ok = false;
        try { ok = !!(window.firebase && firebase.database && firebase.auth && firebase.apps && firebase.apps.length > 0); } catch (e) { ok = false; }
        if (!ok) {
            if (tries < 150) return setTimeout(boot, 120);
            console.warn('[Stevscon][BAN] Firebase nunca estuvo listo; el ejecutor de baneos queda en espera.');
            return;
        }
        patchAuth();
        try { firebase.auth().onAuthStateChanged(onAuth); } catch (e) {}
        watchBans();
        deviceGate();
        setInterval(recheck, 60000);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') recheck();
        });
        window.addEventListener('storage', function (e) { if (e && e.key === LS_KEY) recheck(); });
        FB.ready = true;
        console.log('[Stevscon][BAN] banned.js listo (v1) — ejecutor de baneos ACTIVO. Owner: acceso siempre, creación bloqueada.');
    })();
})(window, document);