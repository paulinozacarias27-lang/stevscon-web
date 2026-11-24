/**
 * ====
 * STEVSCON.COM — minecraft/manage/category_minecraft.js (v2)
 * La PUERTA hacia la sección MINECRAFT (StevsMCross) — en el DOCK
 * SUPERIOR, centrada arriba, junto a la píldora de Social.
 *
 * - Píldora de cristal con glow pulsante, shimmer al hover, logo que
 *   se inclina feliz y squish al click. La etiqueta "Minecraft" siempre
 *   visible. Comparte el dock #sc-top-dock con las demás puertas.
 * - Pantalla de carga ÉPICA: logo en anillo doble (contra-rotan), glows
 *   flotantes, partículas, barra de progreso REAL, mensajes con chips
 *   SUERTE/CONSEJO/PREGUNTA, easter egg raro y el logo TOCABLE (boing +
 *   frases).
 * - PRECARGA todo: descarga minecraft.html, lee sus <script>/<link> y
 *   los calienta en caché + ping a Firebase. Aterriza cuando TODO se
 *   cargó Y pasaron 2.4s mínimos (tope 6.5s por seguridad).
 * - Respeta prefers-reduced-motion. Dentro de /minecraft/ no aparece.
 * Cargar junto a category_social.js v3 en el index (con ?v=2).
 * v2 — RESTYLE BLOQUE: botón y loader con identidad Minecraft (píxeles, bisel, barra XP), sin blur ni bordes redondeados.
 * ====
 */
(function (window, document) {
    'use strict';

    if (location.pathname.toLowerCase().indexOf('/minecraft/') !== -1) {
        console.log('[Stevscon] category_minecraft.js v2: dentro de Minecraft, puerta oculta.');
        return;
    }

    var MC_URL = '/minecraft/minecraft.html';
    var FACE_URL = '/SC-LOGO-20260825013121.png';
    var TAB_ID = 'sc-mc-tab';
    var DOCK_ID = 'sc-top-dock';
    var LOADER_ID = 'sc-mc-loader';

    var MIN_SHOW = 2400;
    var MAX_SHOW = 6500;
    var MSG_EVERY = 1700;

    var state = { opened: false, going: false, prewarm: false, msgTimer: 0 };
    var loader = {};

    var MSGS = [
        { chip: 'SUERTE', color: 'gold', text: 'Hoy los bloques rinden el doble. Es ley del servidor.' },
        { chip: 'SUERTE', color: 'gold', text: 'Dicen que quien entra a StevsMCross un viernes encuentra un yacimiento épico.' },
        { chip: 'SUERTE', color: 'gold', text: 'Suerte de minero: máxima. Los diamantes caen del lado bueno.' },
        { chip: 'SUERTE', color: 'gold', text: 'Nivel de suerte de hoy: legendario (aprobado por el Owner).' },
        { chip: 'SUERTE', color: 'gold', text: 'La fortuna vive bajo tierra... y hoy está de tu lado.' },
        { chip: 'CONSEJO', color: 'green', text: 'Elige tu bloque: minar o leer la guía.' },
        { chip: 'CONSEJO', color: 'green', text: 'Los códigos de la Tienda se canjean dentro del server.' },
        { chip: 'CONSEJO', color: 'green', text: 'Consejo: la Economía explica cómo ganar XP y Rubbie.' },
        { chip: 'CONSEJO', color: 'green', text: 'Solo Owner y admins editan esta sección. Tu modo lectura es sagrado.' },
        { chip: 'CONSEJO', color: 'green', text: 'Toca el avatar de un autor para ver su perfil completo.' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Ya viste las novedades del server de hoy?' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Cuál categoría de StevsMCross es tu favorita hasta ahora?' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Ya encontraste algún easter egg en las páginas?' },
        { chip: 'PREGUNTA', color: 'sky', text: 'Verde o dorado... StevsMCross ya eligió. ¿Tú qué?' },
        { chip: 'PREGUNTA', color: 'sky', text: 'Si el logo hablara, ¿qué contaría? ... Probablemente secretos.' }
    ];
    var FACE_QUOTES = [
        'StevsMCross: «Bienvenido al servidor.»',
        'StevsMCross: «Yo guardo la info, tú juegas.»',
        'StevsMCross: «Cada página esconde algo. Hasta yo.»',
        'StevsMCross: «Ya casi. Un último bloque mental.»'
    ];
    var RARE_MSG = 'EASTER EGG: Encontraste el bloque dorado de los secretos. StevsMCross siempre estuvo observando... y ya te vio llegar.';

    var CSS = [
        '/* ---- DOCK SUPERIOR (mismo del Social, por si esta puerta carga primero) ---- */',
        '#' + DOCK_ID + ' {',
        '  position: fixed; top: 8px; left: 50%; transform: translateX(-50%);',
        '  z-index: 1200; display: flex; align-items: center; gap: 10px;',
        '  flex-wrap: nowrap; pointer-events: none;',
        '}',
        '#' + DOCK_ID + ' > * { pointer-events: auto; }',
        '',
        '/* ---- Pestaña Minecraft · botón cuadrado estilo bloque ---- */',
        '#' + TAB_ID + ' {',
        '  position: relative;',
        '  display: flex; align-items: center; gap: 9px;',
        '  height: 44px; padding: 0 16px 0 6px; box-sizing: border-box;',
        '  border: 3px solid #000; border-radius: 0;',
        '  background: #181c14;',
        '  overflow: hidden; cursor: pointer;',
        '  font-family: \'Pixelify Sans\', \'Inter\', sans-serif; color: #eef4e6;',
        '  box-shadow: 0 0 0 2px rgba(47,54,38,.9), inset 2px 2px 0 rgba(255,255,255,.25), inset -2px -2px 0 rgba(0,0,0,.45);',
        '  transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease,',
        '              border-color .3s ease, background .3s ease, opacity .3s ease;',
        '  animation: scm-tab-pulse 3.4s ease-in-out infinite; animation-delay: .4s;',
        '}',
        '#' + TAB_ID + ':hover {',
        '  transform: translateY(-2px) scale(1.05);',
        '  border-color: #000;',
        '  background: #232a1b;',
        '  animation: none;',
        '  box-shadow: 0 0 0 2px rgba(127,220,58,.5), inset 2px 2px 0 rgba(255,255,255,.25), inset -2px -2px 0 rgba(0,0,0,.45), 4px 4px 0 rgba(0,0,0,.4);',
        '}',
        '#' + TAB_ID + ':focus-visible { outline: 2px solid #f4c542; outline-offset: 3px; }',
        '#' + TAB_ID + '.is-pressing { animation: scm-squish .45s cubic-bezier(.34,1.56,.64,1); }',
        '#' + TAB_ID + '.is-hidden { opacity: 0; transform: scale(.85); pointer-events: none; }',
        '',
        '#' + TAB_ID + ' .scm-face {',
        '  width: 34px; height: 34px; flex: none; border-radius: 0; padding: 2px;',
        '  background: #4a8f1d; border: 2px solid #000;',
        '  display: grid; place-items: center; box-sizing: border-box;',
        '  transition: transform .35s cubic-bezier(.34,1.56,.64,1);',
        '}',
        '#' + TAB_ID + ' .scm-face img, #' + TAB_ID + ' .scm-face .scm-face-fb {',
        '  width: 100%; height: 100%; border-radius: 0; object-fit: cover; display: block;',
        '  image-rendering: pixelated;',
        '}',
        '#' + TAB_ID + ' .scm-face-fb {',
        '  background: #4a8f1d; color: #eef4e6;',
        '  display: grid; place-items: center; font-family: \'Pixelify Sans\', \'Inter\', sans-serif;',
        '  font-weight: 700; font-size: 13px;',
        '}',
        '#' + TAB_ID + ':hover .scm-face { transform: rotate(-14deg) scale(1.08); }',
        '',
        '#' + TAB_ID + ' .scm-label {',
        '  font-family: \'Pixelify Sans\', \'Inter\', sans-serif;',
        '  font-size: 14px; font-weight: 700; letter-spacing: .5px; white-space: nowrap;',
        '}',
        '',
        '/* shimmer que cruza al hacer hover (el de siempre) */',
        '#' + TAB_ID + ' .scm-shimmer {',
        '  position: absolute; top: -20%; bottom: -20%; width: 36px;',
        '  background: rgba(255,255,255,.14); transform: skewX(-22deg);',
        '  left: -30%; opacity: 0;',
        '}',
        '#' + TAB_ID + ':hover .scm-shimmer { animation: scm-shine .9s ease .05s; }',
        '',
        '@keyframes scm-shine { 0% { left: -30%; opacity: 0; } 25% { opacity: 1; } 100% { left: 115%; opacity: 0; } }',
        '@keyframes scm-squish { 0% { transform: scale(1); } 40% { transform: scale(.86,.78); } 100% { transform: scale(1); } }',
        '@keyframes scm-tab-pulse {',
        '  0%,100% { box-shadow: 0 0 0 2px rgba(47,54,38,.9), inset 2px 2px 0 rgba(255,255,255,.25), inset -2px -2px 0 rgba(0,0,0,.45); }',
        '  50%     { box-shadow: 0 0 0 2px rgba(127,220,58,.5), inset 2px 2px 0 rgba(255,255,255,.25), inset -2px -2px 0 rgba(0,0,0,.45); }',
        '}',
        '',
        '/* ---- Pantalla de carga ---- */',
        '#' + LOADER_ID + ' {',
        '  position: fixed; inset: 0; z-index: 2147483000; background-color: #0e100d;',
        '  background-image: linear-gradient(45deg, rgba(255,255,255,.02) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.02) 75%), linear-gradient(45deg, rgba(0,0,0,.09) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.09) 75%);',
        '  background-size: 8px 8px; background-position: 0 0, 4px 4px;',
        '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
        '  opacity: 0; transition: opacity .35s ease; font-family: \'Pixelify Sans\', \'Inter\', sans-serif;',
        '  overflow: hidden; user-select: none;',
        '}',
        '#' + LOADER_ID + '.is-on { opacity: 1; }',
        '#' + LOADER_ID + ' .scm-glow-a, #' + LOADER_ID + ' .scm-glow-b { display: none; }',
        '@keyframes scm-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,30px); } }',
        '#' + LOADER_ID + ' .scm-pt { position: absolute; bottom: -24px; border-radius: 0; pointer-events: none; animation: scm-rise linear infinite; }',
        '@keyframes scm-rise { to { transform: translateY(-115vh); opacity: 0; } }',
        '',
        '#' + LOADER_ID + ' .scm-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 0 24px; }',
        '#' + LOADER_ID + ' .scm-ring {',
        '  width: 138px; height: 138px; border-radius: 0; position: relative;',
        '  border: 3px solid #000; box-shadow: 0 0 0 2px #2f3626; display: grid; place-items: center;',
        '  animation: scm-spin 10s steps(8) infinite;',
        '}',
        '#' + LOADER_ID + ' .scm-ring::before {',
        '  content: ""; position: absolute; inset: -22px; border-radius: 0;',
        '  background: rgba(127,220,58,.08);',
        '  animation: scm-breathe 2.6s ease-in-out infinite;',
        '}',
        '#' + LOADER_ID + ' .scm-ring-outer {',
        '  position: absolute; inset: -14px; border-radius: 0;',
        '  border: 2px solid rgba(127,220,58,.35);',
        '  animation: scm-spin-rev 16s linear infinite;',
        '}',
        '@keyframes scm-spin-rev { to { transform: rotate(-360deg); } }',
        '#' + LOADER_ID + ' .scm-face-big {',
        '  width: 98px; height: 98px; border-radius: 0; object-fit: cover; cursor: pointer;',
        '  border: 3px solid #000; image-rendering: pixelated;',
        '  box-shadow: 0 0 0 2px #2f3626, 6px 6px 0 rgba(0,0,0,.45);',
        '  animation: scm-bob 2.8s ease-in-out infinite;',
        '  -webkit-tap-highlight-color: transparent;',
        '}',
        '#' + LOADER_ID + ' .scm-face-fb {',
        '  width: 98px; height: 98px; border-radius: 0; background: #4a8f1d;',
        '  border: 3px solid #000; image-rendering: pixelated;',
        '  display: grid; place-items: center; color: #eef4e6; font-family: \'Pixelify Sans\', \'Inter\', sans-serif;',
        '  font-weight: 700; font-size: 34px;',
        '  box-shadow: 0 0 0 2px #2f3626, 6px 6px 0 rgba(0,0,0,.45); animation: scm-bob 2.8s ease-in-out infinite; cursor: pointer;',
        '}',
        '#' + LOADER_ID + ' .scm-boing { animation: scm-boing .6s cubic-bezier(.34,1.56,.64,1) !important; }',
        '@keyframes scm-spin { to { transform: rotate(360deg); } }',
        '@keyframes scm-bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(3deg); } }',
        '@keyframes scm-breathe { 0%,100% { transform: scale(.92); opacity:.7; } 50% { transform: scale(1.06); opacity:1; } }',
        '@keyframes scm-boing { 0% { transform: scale(1) rotate(0); } 35% { transform: scale(1.28) rotate(180deg); } 70% { transform: scale(.94) rotate(330deg); } 100% { transform: scale(1) rotate(360deg); } }',
        '',
        '#' + LOADER_ID + ' .scm-chip {',
        '  font-family: \'Pixelify Sans\', \'Inter\', sans-serif;',
        '  font-size: 11px; font-weight: 700; letter-spacing: 2.4px; text-transform: uppercase;',
        '  padding: 6px 15px; border-radius: 0; border: 2px solid #000;',
        '  box-shadow: inset 1px 1px 0 rgba(255,255,255,.15), inset -1px -1px 0 rgba(0,0,0,.4);',
        '}',
        '#' + LOADER_ID + ' .scm-chip.gold  { color: #f4c542; border-color: #f4c542; background: rgba(244,197,66,.15); }',
        '#' + LOADER_ID + ' .scm-chip.green { color: #7fdc3a; border-color: #7fdc3a; background: rgba(127,220,58,.12); }',
        '#' + LOADER_ID + ' .scm-chip.purple { color: #7fdc3a; border-color: #7fdc3a; background: rgba(127,220,58,.12); }',
        '#' + LOADER_ID + ' .scm-chip.sky   { color: #4aedd9; border-color: #4aedd9; background: rgba(74,237,217,.1); }',
        '#' + LOADER_ID + ' .scm-chip.rare { box-shadow: inset 1px 1px 0 rgba(255,255,255,.15), inset -1px -1px 0 rgba(0,0,0,.4), 0 0 0 2px rgba(244,197,66,.5); }',
        '',
        '#' + LOADER_ID + ' .scm-msg {',
        '  max-width: 480px; min-height: 3.6em; text-align: center; color: #eef4e6;',
        '  font-family: \'Pixelify Sans\', \'Inter\', sans-serif;',
        '  font-size: 17px; font-weight: 600; line-height: 1.55;',
        '  transition: opacity .26s ease, transform .26s ease;',
        '  text-wrap: balance;',
        '}',
        '#' + LOADER_ID + ' .scm-msg-out { opacity: 0; transform: translateY(9px); }',
        '',
        '#' + LOADER_ID + ' .scm-progress { width: 264px; height: 10px; border-radius: 0; background: #0b0d09; border: 3px solid #000; box-shadow: 0 0 0 2px #2f3626; padding: 2px; overflow: hidden; }',
        '#' + LOADER_ID + ' .scm-progress .scm-bar { height: 100%; width: 0%; border-radius: 0; background: repeating-linear-gradient(90deg, #7fdc3a 0 10px, #5fc227 10px 14px); transition: width .3s ease; }',
        '#' + LOADER_ID + ' .scm-hint { font-family: \'Pixelify Sans\', \'Inter\', sans-serif; color: #98a28c; font-size: 13px; font-weight: 700; }',
        '#' + LOADER_ID + ' .scm-hint .scm-dots span { animation: scm-blink 1.2s infinite; }',
        '#' + LOADER_ID + ' .scm-hint .scm-dots span:nth-child(2) { animation-delay: .2s; }',
        '#' + LOADER_ID + ' .scm-hint .scm-dots span:nth-child(3) { animation-delay: .4s; }',
        '@keyframes scm-blink { 0%,80%,100% { opacity: .2; } 40% { opacity: 1; } }',
        '#' + LOADER_ID + ' .scm-tip-mini { font-family: \'Pixelify Sans\', \'Inter\', sans-serif; color: #57624c; font-size: 11px; font-weight: 600; position: absolute; bottom: 26px; }',
        '#' + LOADER_ID + ' .scm-brand { font-family: \'Pixelify Sans\', \'Inter\', sans-serif; color: #57624c; font-size: 11px; font-weight: 700; letter-spacing: 1px; position: absolute; bottom: 10px; }',
        '',
        '/* ---- Responsive ---- */',
        '@media (max-width: 760px) {',
        '  #' + DOCK_ID + ' { top: 58px; gap: 8px; }',
        '  #' + TAB_ID + ' { height: 40px; padding: 0 13px 0 5px; }',
        '  #' + TAB_ID + ' .scm-face { width: 30px; height: 30px; }',
        '  #' + TAB_ID + ' .scm-label { font-size: 13px; }',
        '}',
        '@media (max-width: 640px) {',
        '  #' + LOADER_ID + ' .scm-ring { width: 118px; height: 118px; }',
        '  #' + LOADER_ID + ' .scm-face-big, #' + LOADER_ID + ' .scm-face-fb { width: 84px; height: 84px; }',
        '  #' + LOADER_ID + ' .scm-msg { font-size: 15px; min-height: 4.6em; }',
        '}',
        '@media (prefers-reduced-motion: reduce) {',
        '  #' + LOADER_ID + ' .scm-pt, #' + LOADER_ID + ' .scm-glow-a, #' + LOADER_ID + ' .scm-glow-b { display: none; }',
        '  #' + LOADER_ID + ' .scm-ring, #' + LOADER_ID + ' .scm-face-big, #' + LOADER_ID + ' .scm-face-fb,',
        '  #' + LOADER_ID + ' .scm-ring-outer, #' + LOADER_ID + ' .scm-ring::before, #' + TAB_ID + ' { animation: none !important; }',
        '}'
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('sc-mc-style')) return;
        var st = document.createElement('style');
        st.id = 'sc-mc-style';
        st.textContent = CSS;
        document.head.appendChild(st);
        if (!document.querySelector('link[href*="family=Inter"]')) {
            var f = document.createElement('link');
            f.rel = 'stylesheet';
            f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Pixelify+Sans:wght@400..700&family=Press+Start+2P&display=swap';
            document.head.appendChild(f);
        }
    }

    function ensureDock() {
        var d = document.getElementById(DOCK_ID);
        if (!d) {
            d = document.createElement('div');
            d.id = DOCK_ID;
            document.body.appendChild(d);
        }
        return d;
    }

    var load = { total: 0, done: 0, promise: null, resolve: null };

    function ensurePrefetch() {
        if (load.promise) return load.promise;
        load.promise = new Promise(function (res) { load.resolve = res; });
        try { warmFirebase(); } catch (e) {}
        warmAssets();
        return load.promise;
    }

    function warmFirebase() {
        if (window.firebase && firebase.apps && firebase.apps.length && firebase.database) {
            firebase.database().ref('.info/connected').once('value').catch(function () {});
        }
    }

    function sameOriginAbs(url, base) {
        try {
            var u = new URL(url, base);
            return u.origin === location.origin ? u.href : null;
        } catch (e) { return null; }
    }

    function warmAssets() {
        fetch(MC_URL, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) throw 0;
            return r.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var urls = [], seen = {};
            var scripts = doc.querySelectorAll('script[src]');
            var links = doc.querySelectorAll('link[rel="stylesheet"][href]');
            function push(raw) {
                var abs = sameOriginAbs(raw, MC_URL);
                if (abs && !seen[abs]) { seen[abs] = 1; urls.push(abs); }
            }
            var i;
            for (i = 0; i < scripts.length; i++) push(scripts[i].getAttribute('src'));
            for (i = 0; i < links.length; i++) push(links[i].getAttribute('href'));

            load.total = urls.length;
            if (!load.total) { load.resolve(); return; }
            urls.forEach(function (u) {
                fetch(u, { credentials: 'same-origin' }).then(warmed, warmed);
            });
        }).catch(function () {
            if (load.resolve) load.resolve();
        });
    }

    function warmed() {
        load.done++;
        if (load.total && load.done >= load.total && load.resolve) load.resolve();
    }

    function buildTab() {
        if (document.getElementById(TAB_ID)) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.id = TAB_ID;
        b.title = 'Minecraft';
        b.setAttribute('aria-label', 'Abrir Minecraft');

        var face = document.createElement('span');
        face.className = 'scm-face';
        var img = document.createElement('img');
        img.src = FACE_URL;
        img.alt = '';
        img.onerror = function () {
            var fb = document.createElement('span');
            fb.className = 'scm-face-fb';
            fb.textContent = 'MC';
            face.replaceChild(fb, img);
        };
        face.appendChild(img);

        var label = document.createElement('span');
        label.className = 'scm-label';
        label.textContent = 'Minecraft';

        var shimmer = document.createElement('span');
        shimmer.className = 'scm-shimmer';

        b.appendChild(shimmer);
        b.appendChild(face);
        b.appendChild(label);

        b.addEventListener('mouseenter', startPrewarm);
        b.addEventListener('touchstart', startPrewarm, { passive: true });
        b.addEventListener('click', function () {
            b.classList.remove('is-pressing');
            void b.offsetWidth;
            b.classList.add('is-pressing');
            setTimeout(openMinecraft, 140);
        });

        ensureDock().appendChild(b);
    }

    function startPrewarm() {
        if (state.prewarm) return;
        state.prewarm = true;
        ensurePrefetch();
    }

    function pickMsg(not) {
        var i, m;
        do { i = Math.floor(Math.random() * MSGS.length); m = MSGS[i]; }
        while (MSGS.length > 1 && not != null && i === not);
        return { msg: m, index: i };
    }

    function buildLoader() {
        if (document.getElementById(LOADER_ID)) return;

        var ov = document.createElement('div');
        ov.id = LOADER_ID;
        ov.setAttribute('role', 'status');
        ov.setAttribute('aria-live', 'polite');

        var ga = document.createElement('span'); ga.className = 'scm-glow-a';
        var gb = document.createElement('span'); gb.className = 'scm-glow-b';
        ov.appendChild(ga); ov.appendChild(gb);

        for (var i = 0; i < 18; i++) {
            var p = document.createElement('span');
            p.className = 'scm-pt';
            var size = 3 + Math.random() * 6;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * 100) + '%';
            p.style.background = Math.random() > .5 ? 'rgba(127,220,58,.4)' : 'rgba(244,197,66,.4)';
            p.style.animationDuration = (6 + Math.random() * 7) + 's';
            p.style.animationDelay = (-Math.random() * 10) + 's';
            ov.appendChild(p);
        }

        var stage = document.createElement('div');
        stage.className = 'scm-stage';

        var ring = document.createElement('div');
        ring.className = 'scm-ring';
        var outer = document.createElement('span');
        outer.className = 'scm-ring-outer';
        ring.appendChild(outer);

        var face = document.createElement('img');
        face.className = 'scm-face-big';
        face.src = FACE_URL;
        face.alt = 'StevsMCross';
        face.title = 'Tócame';
        face.onerror = function () {
            var fb = document.createElement('div');
            fb.className = 'scm-face-fb';
            fb.textContent = 'MC';
            fb.title = 'Tócame';
            fb.addEventListener('click', onFaceClick);
            ring.replaceChild(fb, face);
            loader.faceEl = fb;
        };
        face.addEventListener('click', onFaceClick);
        ring.appendChild(face);
        stage.appendChild(ring);

        var chip = document.createElement('div');
        chip.className = 'scm-chip gold';
        var msg = document.createElement('div');
        msg.className = 'scm-msg';
        stage.appendChild(chip);
        stage.appendChild(msg);

        var prog = document.createElement('div');
        prog.className = 'scm-progress';
        var bar = document.createElement('div');
        bar.className = 'scm-bar';
        prog.appendChild(bar);
        stage.appendChild(prog);

        var hint = document.createElement('div');
        hint.className = 'scm-hint';
        hint.innerHTML = 'Entrando a StevsMCross <span class="scm-dots"><span>.</span><span>.</span><span>.</span></span>';
        stage.appendChild(hint);

        ov.appendChild(stage);

        var tip = document.createElement('div');
        tip.className = 'scm-tip-mini';
        tip.textContent = 'Psst... el logo se puede tocar.';
        ov.appendChild(tip);

        var brand = document.createElement('div');
        brand.className = 'scm-brand';
        brand.textContent = 'StevsMCross';
        ov.appendChild(brand);

        document.body.appendChild(ov);
        loader.el = ov; loader.chipEl = chip; loader.msgEl = msg;
        loader.barEl = bar; loader.faceEl = face;

        if (Math.random() < 0.06) {
            setMsg('MCROSS', 'gold', RARE_MSG, true);
            loader.rareMode = true;
        } else {
            var pk = pickMsg();
            loader.lastIdx = pk.index;
            setMsg(pk.msg.chip, pk.msg.color, pk.msg.text);
        }
    }

    function setMsg(chip, color, text, rare) {
        var c = loader.chipEl, m = loader.msgEl;
        if (!m) return;
        c.className = 'scm-chip ' + color + (rare ? ' rare' : '');
        c.textContent = chip;
        m.classList.add('scm-msg-out');
        setTimeout(function () {
            m.textContent = text;
            m.classList.remove('scm-msg-out');
        }, 260);
    }

    function onFaceClick() {
        var f = loader.faceEl;
        if (!f) return;
        f.classList.remove('scm-boing');
        void f.offsetWidth;
        f.classList.add('scm-boing');
        if (!state.going) {
            var q = FACE_QUOTES[Math.floor(Math.random() * FACE_QUOTES.length)];
            setMsg('MCROSS', 'gold', q, loader.rareMode);
        }
    }

    function rotateMessages() {
        if (state.going) return;
        var pk = pickMsg(loader.lastIdx);
        loader.lastIdx = pk.index;
        setMsg(pk.msg.chip, pk.msg.color, pk.msg.text);
    }

    function paintProgress(t0, allDone) {
        if (!loader.barEl) return;
        var elapsed = Date.now() - t0;
        var creep = Math.min(88, (elapsed / MIN_SHOW) * 88);
        var real = load.total ? (load.done / load.total) * 100 : 0;
        var pct = allDone ? 100 : Math.max(creep, real);
        loader.barEl.style.width = Math.min(100, pct) + '%';
    }

    function openMinecraft() {
        if (state.opened) return;
        state.opened = true;

        buildLoader();
        var ov = loader.el;
        requestAnimationFrame(function () { ov.classList.add('is-on'); });

        var tab = document.getElementById(TAB_ID);
        if (tab) tab.classList.add('is-hidden');

        var prefetch = ensurePrefetch();
        var t0 = Date.now();

        state.msgTimer = setInterval(rotateMessages, MSG_EVERY);
        var progTimer = setInterval(function () {
            paintProgress(t0, false);
        }, 120);

        function go() {
            if (state.going) return;
            state.going = true;
            clearInterval(state.msgTimer);
            clearInterval(progTimer);
            paintProgress(t0, true);
            setTimeout(function () { location.href = MC_URL; }, 280);
        }

        Promise.all([prefetch, new Promise(function (r) { setTimeout(r, MIN_SHOW); })]).then(go);
        setTimeout(go, MAX_SHOW);
    }

    function init() {
        injectStyles();
        buildTab();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Stevscon] category_minecraft.js listo (v2) — puerta Minecraft en el DOCK SUPERIOR + precarga real.');
})(window, document);
