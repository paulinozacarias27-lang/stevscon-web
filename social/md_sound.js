/**
 * ====
 * STEVSCON.COM — social/md_sound.js (v2)
 * NOTIFICACIONES de Mensajes Directos — tu mp3 real + campana silenciadora.
 *  - El sonido es TU MP3: notify-md.mp3, en esta MISMA carpeta social/,
 *    al lado de md_sound.js. La ruta se resuelve desde donde vive el
 *    script: para llevarlo a otra categoria (wiki, forms, index) solo
 *    copia md_sound.js + notify-md.mp3 a esa carpeta y agrega la etiqueta
 *    <script> en su HTML. Cero ediciones de codigo.
 *  - v2: si el mp3 no se encuentra, avisa en consola con la ruta exacta.
 *  - Escucha dms/inbox/{uid} en vivo (el mismo nodo del badge 99+).
 *  - Cuando alguien te manda un MD: suena el mp3 + toast con el nombre y
 *    la vista previa. Clic en el toast = abrir ese MD directo.
 *  - No suena: al cargar la pagina, cuando el mensaje es tuyo, ni si
 *    estas leyendo esa conversacion con la pestana activa.
 *  - CAMPANA abajo a la IZQUIERDA: silencia sonido + toasts por completo.
 *    Se guarda en localStorage: el silencio vale en TODA la web.
 *    API: StevsconNotify.toggle() / .setMuted(v) / .test()
 *  - El toast lleva data-sctr-skip: el traductor NUNCA toca el MD.
 *  - Doble pestana abierta: solo una suena (dedupe por localStorage).
 *  INSTALACION:
 *    social.html -> <script src="/social/md_sound.js?v=2"></script>
 *    (va DESPUES del bloque de md_*.js, junto a los demas)
 *  Si se edita el file, subir la version: ?v=3, ?v=4...
 * ====
 */
(function (window, document) {
    'use strict';

    const VERSION = 2;
    const MUTE_KEY = 'sc_md_notify_muted';
    const DEDUPE_KEY = 'sc_md_lastping';

    let muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

    /* ==== AUDIO · tu mp3 real (notify-md.mp3, misma carpeta) ==== */
    var AUDIO_URL = (function () {
        try {
            var s = document.currentScript || document.querySelector('script[src*="md_sound.js"]');
            if (s && s.src) return s.src.replace(/md_sound\.js.*$/, 'notify-md.mp3');
        } catch (e) {}
        return 'notify-md.mp3';
    })();

    let pingAudio = null;
    function preloadPing() {
        if (pingAudio) return;
        try {
            pingAudio = new Audio(AUDIO_URL);
            pingAudio.preload = 'auto';
            pingAudio.volume = 0.9;   /* cambia esto si suena fuerte/bajo (0.0 a 1.0) */
            pingAudio.onerror = function () {
                console.warn('[Stevscon md_sound] NO encontró el mp3 en: ' + AUDIO_URL + ' — revisa que notify-md.mp3 esté en la misma carpeta que md_sound.js.');
            };
            pingAudio.load();          /* lo descarga de una vez, sin esperas al recibir MD */
        } catch (e) { pingAudio = null; }
    }
    function playPing() {
        preloadPing();
        if (!pingAudio) return false;
        try {
            pingAudio.currentTime = 0;
            const p = pingAudio.play();
            if (p && p.catch) p.catch(function () {
                console.warn('[Stevscon md_sound] El navegador bloqueó el audio (normal hasta tu primer clic en la página).');
            });
            return true;
        } catch (e) { return false; }
    }

    /* ==== TOASTS (abajo a la izquierda, encima de la campana) ==== */
    function injectCss() {
        if (document.querySelector('style[data-scnt]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scnt', '1');
        css.textContent = ''
            + '.scnt-host{position:fixed;left:16px;bottom:66px;z-index:10002;display:flex;flex-direction:column;gap:8px;max-width:min(320px,calc(100vw - 32px));font-family:Inter,sans-serif;}'
            + '.scnt-card{background:#1a1625;border:1px solid #2e2440;border-left:3px solid #8b5cf6;border-radius:12px;padding:10px 14px;color:#f8fafc;box-shadow:0 8px 24px rgba(5,3,12,.55);cursor:pointer;animation:scntIn .22s ease;box-sizing:border-box;}'
            + '.scnt-card b{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:#c4b5fd;}'
            + '.scnt-card b i{font-size:11px;color:#8b5cf6;}'
            + '.scnt-card span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.45;color:#94a3b8;margin-top:3px;word-break:break-word;}'
            + '.scnt-out{opacity:0;transform:translateX(-14px);transition:opacity .22s ease,transform .22s ease;}'
            + '@keyframes scntIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}'
            + '.scnt-bell{position:fixed;left:16px;bottom:16px;z-index:10001;width:42px;height:42px;border-radius:999px;background:#1a1625;border:1px solid #2e2440;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;padding:0;transition:color .15s ease,border-color .15s ease,transform .15s ease;}'
            + '.scnt-bell:hover{transform:scale(1.07);border-color:rgba(139,92,246,.55);}';
        document.head.appendChild(css);
    }

    let host = null;
    function ensureHost() {
        if (host && document.body.contains(host)) return host;
        host = document.createElement('div');
        host.className = 'scnt-host';
        host.setAttribute('data-sctr-skip', '1');
        document.body.appendChild(host);
        return host;
    }
    function nameOf(uid, cb) {
        try {
            if (window.SCSOC && SCSOC.dm && SCSOC.dm.nameOf) {
                return SCSOC.dm.nameOf(uid, function (i) { cb((i && i.name) || 'Usuario'); });
            }
        } catch (e) {}
        cb('Usuario');
    }
    function showToast(e) {
        const card = document.createElement('div');
        card.className = 'scnt-card';
        card.setAttribute('data-sctr-skip', '1');
        const b = document.createElement('b');
        const ic = document.createElement('i');
        ic.className = 'fa-solid fa-comment-dots';
        b.appendChild(ic);
        b.appendChild(document.createTextNode('Nuevo mensaje directo'));
        const sp = document.createElement('span');
        sp.textContent = String(e.lastText || '').slice(0, 120);
        card.appendChild(b); card.appendChild(sp);
        nameOf(e.peerUid, function (n) { b.textContent = ''; b.appendChild(ic); b.appendChild(document.createTextNode(n)); });
        const kill = function () {
            card.classList.add('scnt-out');
            setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 240);
        };
        card.addEventListener('click', function () {
            kill();
            try {
                if (window.SCSOC && SCSOC.dm && SCSOC.dmUI) {
                    SCSOC.dm.open(e.peerUid, function (convId) {
                        SCSOC.dmUI.open();
                        SCSOC.dmUI.openConv(convId, e.peerUid);
                    });
                }
            } catch (err) {}
        });
        ensureHost().appendChild(card);
        while (host.children.length > 3) host.removeChild(host.firstChild);
        setTimeout(kill, 6000);
    }

    /* ==== CAMPANA · silenciador completo (esquina inferior izquierda) ==== */
    let bell = null;
    function ensureBell() {
        if (bell && document.body.contains(bell)) return bell;
        bell = document.createElement('button');
        bell.type = 'button';
        bell.className = 'scnt-bell';
        bell.setAttribute('data-sctr-skip', '1');
        bell.addEventListener('click', function () { setMuted(!muted); });
        document.body.appendChild(bell);
        paintBell();
        return bell;
    }
    function paintBell() {
        if (!bell) return;
        while (bell.firstChild) bell.removeChild(bell.firstChild);
        const i = document.createElement('i');
        i.className = 'fa-solid ' + (muted ? 'fa-bell-slash' : 'fa-bell');
        i.style.color = muted ? '#f87171' : '#a78bfa';
        bell.appendChild(i);
        bell.title = muted ? 'Notificaciones de MD: silenciadas (clic para activar)' : 'Notificaciones de MD: activadas (clic para silenciar)';
        bell.setAttribute('aria-label', bell.title);
    }
    function setMuted(v) {
        muted = !!v;
        try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
        paintBell();
    }

    /* ==== NÚCLEO · escucha la bandeja dms/inbox/{uid} ==== */
    let base = null;        /* primer snapshot: línea base SIN sonido */
    let alerted = {};       /* convId -> lastAt ya notificado */
    let offInbox = null;
    let myUid = '';
    let openConvId = '';    /* conversación abierta en el drawer (si lo está) */

    document.addEventListener('sc:dm-view', function (ev) {
        const d = (ev && ev.detail) || {};
        openConvId = (d.view === 'chat' && d.convId) ? d.convId : '';
    });

    function reset() {
        if (offInbox) { try { offInbox(); } catch (e) {} offInbox = null; }
        base = null; alerted = {}; myUid = '';
    }
    function start(u) {
        reset();
        myUid = u.uid;
        const ref = firebase.database().ref('dms/inbox/' + u.uid);
        const fn = function (s) { onSnap(s.val() || {}); };
        ref.on('value', fn, function (err) { console.warn('[Stevscon md_sound] inbox:', err); });
        offInbox = function () { try { ref.off('value', fn); } catch (e) {} };
    }
    function onSnap(v) {
        const now = {};
        Object.keys(v).forEach(function (k) {
            const e = v[k];
            if (!e || !e.peerUid) return;
            now[k] = {
                unread: Number(e.unread) || 0,
                lastAt: Number(e.lastAt) || 0,
                lastFrom: String(e.lastFrom || ''),
                lastText: String(e.lastText || ''),
                peerUid: String(e.peerUid)
            };
        });
        if (!base) { base = now; return; }          /* arranque: silencio */
        if (muted) { base = now; return; }          /* silenciado: solo refresca */
        Object.keys(now).forEach(function (k) {
            const e = now[k], p = base[k] || { unread: 0, lastAt: 0 };
            const fromOther = e.lastFrom && e.lastFrom !== myUid;
            if (!fromOther || e.unread <= p.unread) return;         /* nada nuevo / tuyo */
            if (k === openConvId && document.hasFocus && document.hasFocus()) {
                alerted[k] = e.lastAt; return;                       /* ya lo estás leyendo */
            }
            if (alerted[k] === e.lastAt) return;                     /* ya sonó en esta pestaña */
            try {                                                    /* dedupe entre pestañas */
                const d = JSON.parse(localStorage.getItem(DEDUPE_KEY) || '""');
                if (d && d.k === k + '|' + e.lastAt && Date.now() - d.t < 8000) { alerted[k] = e.lastAt; return; }
                localStorage.setItem(DEDUPE_KEY, JSON.stringify({ k: k + '|' + e.lastAt, t: Date.now() }));
            } catch (e2) {}
            alerted[k] = e.lastAt;
            playPing();
            showToast(e);
        });
        base = now;
    }
    (function waitFirebase(n) {
        if (window.firebase && firebase.auth) {
            try {
                firebase.auth().onAuthStateChanged(function (u) { if (u) start(u); else reset(); });
            } catch (e) { console.warn('[Stevscon md_sound] auth:', e); }
            return;
        }
        /* páginas sin Firebase: el file queda en silencio, sin errores */
        if (n < 200) setTimeout(function () { waitFirebase(n + 1); }, 250);
    })(0);

    /* ==== API pública ==== */
    window.StevsconNotify = {
        version: VERSION,
        get muted() { return muted; },
        setMuted: setMuted,
        toggle: function () { setMuted(!muted); return muted; },
        test: function () { return playPing(); }   /* prueba el sonido desde la consola */
    };

    /* ==== Init ==== */
    function init() {
        injectCss();
        ensureBell();
        ensureHost();
        preloadPing();   /* deja tu mp3 cargado desde el arranque */
        console.log('[Stevscon] md_sound listo (v' + VERSION + ') — MD con notify-md.mp3' + (muted ? ' (silenciado por ahora)' : '') + '.');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window, document);