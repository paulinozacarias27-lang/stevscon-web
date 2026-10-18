/**
 * ====
 * STEVSCON.COM — wiki/manage/category_wiki.js (v2)
 * La PUERTA hacia la Wiki — MISMA LIGA que category_social.js v2.
 *
 * - Pestaña FIJA a la izquierda, APILADA debajo de la de Social.
 * - El círculo es la WikiFace (wiki/manage/WikiFace.png): se inclina
 *   al hover, shimmer que la cruza, flecha dorada, squish al click.
 * - Pantalla de carga ÉPICA: WikiFace en anillo doble (contra-rotan),
 *   glows flotantes, partículas, barra de progreso REAL (sigue la
 *   precarga de verdad), mensajes con chips SUERTE/CONSEJO/PREGUNTA,
 *   easter egg raro y la WikiFace es TOCABLE (boing + frases).
 * - PRECARGA todo: descarga wiki.html, lee sus <script>/<link> y los
 *   calienta en caché + ping a Firebase. Aterriza en cuanto TODO se
 *   cargó Y pasaron 2.4s mínimos (tope 6.5s por seguridad).
 * - Respeta prefers-reduced-motion. Dentro de /wiki/ no aparece.
 * Cargar DESPUÉS de category_social.js en el index (con ?v=2).
 * ====
 */
(function (window, document) {
    'use strict';

    /* Dentro de la wiki la puerta no existe */
    if (location.pathname.toLowerCase().indexOf('/wiki/') !== -1) {
        console.log('[Stevscon] category_wiki.js: dentro de la Wiki, pestaña oculta.');
        return;
    }

    /* ==== CONFIG ==== */
    var WIKI_URL = '/wiki/wiki.html';
    var WIKIFACE_URL = '/wiki/manage/WikiFace.png';  /* ← tu imagen */
    var LOGO_FALLBACK = '/SC-LOGO-20260825013121.png';
    var TAB_ID = 'sc-wiki-tab';
    var LOADER_ID = 'sc-wiki-loader';

    var MIN_SHOW = 2400;   /* ms mínimos (se lee el mensaje) */
    var MAX_SHOW = 6500;   /* ms máximos (nunca atrapar al usuario) */
    var MSG_EVERY = 1700;  /* ms entre mensajes */

    var state = { opened: false, going: false, prewarm: false, msgTimer: 0 };
    var loader = {};

    /* ==== MENSAJES ==== */
    var MSGS = [
        { chip: 'SUERTE', color: 'gold', text: 'Hoy los easter eggs se dejan encontrar. Es ley.' },
        { chip: 'SUERTE', color: 'gold', text: 'Dicen que quien entra a la Wiki un viernes encuentra un devlog épico.' },
        { chip: 'SUERTE', color: 'gold', text: 'Suerte de lectores: máxima. Los artículos caen del lado bueno.' },
        { chip: 'SUERTE', color: 'gold', text: 'Nivel de suerte de hoy: legendario (aprobado por el Owner).' },
        { chip: 'SUERTE', color: 'gold', text: 'La fortuna vive en la wiki… y hoy está de tu lado.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Los sub-artículos viven debajo del original: más páginas por artículo.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Solo Owner y admins editan la wiki. Tu modo lectura es sagrado.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Toca el avatar de un autor para ver su perfil completo.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Los `` esconden colores personalizados. Experimenta.' },
        { chip: 'CONSEJO', color: 'purple', text: 'El buscador de la wiki encuentra todo al instante. Todo ES todo.' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Ya viste los devlogs de hoy?' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Cuál proyecto de Stevscon es tu favorito hasta ahora?' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Ya encontraste algún easter egg en los artículos?' },
        { chip: 'PREGUNTA', color: 'sky', text: 'Morado o dorado… la wiki ya eligió. ¿Tú qué?' },
        { chip: 'PREGUNTA', color: 'sky', text: 'Si la WikiFace hablara, ¿qué contaría? … Probablemente secretos.' }
    ];
    var FACE_QUOTES = [
        'WikiFace: «Bienvenido al archivo infinito.»',
        'WikiFace: «Yo guardo, tú lees.»',
        'WikiFace: «Cada página esconde algo. Hasta yo.»',
        'WikiFace: «Ya casi. Un último scroll mental.»'
    ];
    var RARE_MSG = 'EASTER EGG: Encontraste la WikiFace dorada de los secretos. La wiki siempre estuvo observando… y ya te vio llegar.';

    /* ==== ESTILOS (prefijo scw- para no pisar NADA, ni al de Social) ==== */
    var CSS = [
        '/* ---- Pestaña Wiki ---- */',
        '#' + TAB_ID + ' {',
        '  position: fixed; left: 0; top: calc(50% + 74px); z-index: 1200;',
        '  transform: translateY(-50%);',
        '  display: flex; align-items: center; gap: 11px;',
        '  height: 62px; width: 66px; padding: 0 0 0 11px; box-sizing: border-box;',
        '  border: 1px solid rgba(139,92,246,.35); border-left: 0; border-radius: 0 999px 999px 0;',
        '  background: rgba(23,18,38,.96); overflow: hidden; cursor: pointer;',
        '  font-family: Inter, system-ui, sans-serif; color: #f8fafc;',
        '  box-shadow: 0 8px 30px rgba(0,0,0,.5);',
        '  transition: width .38s cubic-bezier(.22,1,.36,1), transform .38s cubic-bezier(.22,1,.36,1),',
        '              box-shadow .3s ease, background .3s ease, border-color .3s ease;',
        '  animation: scw-tab-pulse 3.4s ease-in-out infinite; animation-delay: .4s;',
        '}',
        '#' + TAB_ID + ':hover {',
        '  width: 196px; background: linear-gradient(135deg, rgba(139,92,246,.28), rgba(23,18,38,.98));',
        '  border-color: rgba(240,180,41,.55); animation: none;',
        '  box-shadow: 0 12px 38px rgba(0,0,0,.55), 0 0 24px rgba(139,92,246,.4);',
        '}',
        '#' + TAB_ID + ':focus-visible { outline: 2px solid #f0b429; outline-offset: 3px; }',
        '#' + TAB_ID + '.is-pressing { animation: scw-squish .45s cubic-bezier(.34,1.56,.64,1); }',
        '#' + TAB_ID + '.is-hidden { transform: translateY(-50%) translateX(-120%); opacity: 0; pointer-events: none; }',
        '',
        '#' + TAB_ID + ' .scw-face {',
        '  width: 42px; height: 42px; flex: none; border-radius: 50%; padding: 2px;',
        '  background: linear-gradient(135deg, #a78bfa, #6d28d9);',
        '  display: grid; place-items: center; box-sizing: border-box;',
        '  transition: transform .35s cubic-bezier(.34,1.56,.64,1);',
        '}',
        '#' + TAB_ID + ' .scw-face img, #' + TAB_ID + ' .scw-face .scw-face-fb {',
        '  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;',
        '}',
        '#' + TAB_ID + ' .scw-face-fb {',
        '  background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff;',
        '  display: grid; place-items: center; font-weight: 800; font-size: 15px;',
        '}',
        '#' + TAB_ID + ':hover .scw-face { transform: rotate(-14deg) scale(1.08); }',
        '',
        '#' + TAB_ID + ' .scw-label {',
        '  font-size: 15px; font-weight: 800; letter-spacing: .5px; white-space: nowrap;',
        '  opacity: 0; transform: translateX(-8px);',
        '  transition: opacity .25s ease .08s, transform .32s cubic-bezier(.22,1,.36,1) .08s;',
        '}',
        '#' + TAB_ID + ':hover .scw-label { opacity: 1; transform: translateX(0); }',
        '#' + TAB_ID + ' .scw-arrow {',
        '  flex: none; width: 8px; height: 8px; margin-right: 16px;',
        '  border-top: 2.5px solid #f0b429; border-right: 2.5px solid #f0b429;',
        '  transform: rotate(45deg); opacity: 0; translate: -6px 0;',
        '  transition: opacity .25s ease .12s, translate .3s ease .12s;',
        '}',
        '#' + TAB_ID + ':hover .scw-arrow { opacity: 1; translate: 0 0; }',
        '',
        '#' + TAB_ID + ' .scw-shimmer {',
        '  position: absolute; top: -20%; bottom: -20%; width: 36px;',
        '  background: rgba(255,255,255,.14); transform: skewX(-22deg);',
        '  left: -30%; opacity: 0;',
        '}',
        '#' + TAB_ID + ':hover .scw-shimmer { animation: scw-shine .9s ease .05s; }',
        '',
        '@keyframes scw-shine { 0% { left: -30%; opacity: 0; } 25% { opacity: 1; } 100% { left: 115%; opacity: 0; } }',
        '@keyframes scw-squish { 0% { transform: translateY(-50%) scale(1); } 40% { transform: translateY(-50%) scale(.88,.8); } 100% { transform: translateY(-50%) scale(1); } }',
        '@keyframes scw-tab-pulse {',
        '  0%,100% { box-shadow: 0 8px 30px rgba(0,0,0,.5); }',
        '  50%     { box-shadow: 0 8px 30px rgba(0,0,0,.5), 0 0 22px rgba(139,92,246,.4); }',
        '}',
        '@media (hover: none) {',
        '  #' + TAB_ID + ' { width: auto; padding-right: 18px; }',
        '  #' + TAB_ID + ' .scw-label { opacity: 1; transform: translateX(0); }',
        '}',
        '',
        '/* ---- Pantalla de carga ---- */',
        '#' + LOADER_ID + ' {',
        '  position: fixed; inset: 0; z-index: 2147483000; background: #0d0b14;',
        '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
        '  opacity: 0; transition: opacity .35s ease; font-family: Inter, system-ui, sans-serif;',
        '  overflow: hidden; user-select: none;',
        '}',
        '#' + LOADER_ID + '.is-on { opacity: 1; }',
        '#' + LOADER_ID + ' .scw-glow-a, #' + LOADER_ID + ' .scw-glow-b {',
        '  position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none;',
        '}',
        '#' + LOADER_ID + ' .scw-glow-a { width: 460px; height: 460px; background: rgba(139,92,246,.16); top: -140px; left: -120px; animation: scw-drift 9s ease-in-out infinite; }',
        '#' + LOADER_ID + ' .scw-glow-b { width: 420px; height: 420px; background: rgba(240,180,41,.1); bottom: -140px; right: -110px; animation: scw-drift 11s ease-in-out infinite reverse; }',
        '@keyframes scw-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,30px); } }',
        '#' + LOADER_ID + ' .scw-pt { position: absolute; bottom: -24px; border-radius: 50%; pointer-events: none; animation: scw-rise linear infinite; }',
        '@keyframes scw-rise { to { transform: translateY(-115vh); opacity: 0; } }',
        '',
        '#' + LOADER_ID + ' .scw-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 0 24px; }',
        '#' + LOADER_ID + ' .scw-ring {',
        '  width: 138px; height: 138px; border-radius: 50%; position: relative;',
        '  border: 2px dashed rgba(139,92,246,.6); display: grid; place-items: center;',
        '  animation: scw-spin 10s linear infinite;',
        '}',
        '#' + LOADER_ID + ' .scw-ring::before {',
        '  content: ""; position: absolute; inset: -22px; border-radius: 50%;',
        '  background: radial-gradient(circle, rgba(139,92,246,.22), transparent 65%);',
        '  animation: scw-breathe 2.6s ease-in-out infinite;',
        '}',
        '#' + LOADER_ID + ' .scw-ring-outer {',
        '  position: absolute; inset: -14px; border-radius: 50%;',
        '  border: 1px dashed rgba(240,180,41,.35);',
        '  animation: scw-spin-rev 16s linear infinite;',
        '}',
        '@keyframes scw-spin-rev { to { transform: rotate(-360deg); } }',
        '#' + LOADER_ID + ' .scw-face-big {',
        '  width: 98px; height: 98px; border-radius: 50%; object-fit: cover; cursor: pointer;',
        '  box-shadow: 0 14px 44px rgba(139,92,246,.4), 0 0 0 6px rgba(139,92,246,.08);',
        '  animation: scw-bob 2.8s ease-in-out infinite;',
        '  -webkit-tap-highlight-color: transparent;',
        '}',
        '#' + LOADER_ID + ' .scw-face-fb {',
        '  width: 98px; height: 98px; border-radius: 50%; background: linear-gradient(135deg,#8b5cf6,#6d28d9);',
        '  display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 34px;',
        '  box-shadow: 0 14px 44px rgba(139,92,246,.4); animation: scw-bob 2.8s ease-in-out infinite; cursor: pointer;',
        '}',
        '#' + LOADER_ID + ' .scw-boing { animation: scw-boing .6s cubic-bezier(.34,1.56,.64,1) !important; }',
        '@keyframes scw-spin { to { transform: rotate(360deg); } }',
        '@keyframes scw-bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(3deg); } }',
        '@keyframes scw-breathe { 0%,100% { transform: scale(.92); opacity:.7; } 50% { transform: scale(1.06); opacity:1; } }',
        '@keyframes scw-boing { 0% { transform: scale(1) rotate(0); } 35% { transform: scale(1.28) rotate(180deg); } 70% { transform: scale(.94) rotate(330deg); } 100% { transform: scale(1) rotate(360deg); } }',
        '',
        '#' + LOADER_ID + ' .scw-chip {',
        '  font-size: 11px; font-weight: 800; letter-spacing: 2.4px; text-transform: uppercase;',
        '  padding: 6px 15px; border-radius: 999px; border: 1px solid;',
        '}',
        '#' + LOADER_ID + ' .scw-chip.gold   { color: #f0b429; border-color: rgba(240,180,41,.55); background: rgba(240,180,41,.1); }',
        '#' + LOADER_ID + ' .scw-chip.purple { color: #c4b5fd; border-color: rgba(139,92,246,.55); background: rgba(139,92,246,.12); }',
        '#' + LOADER_ID + ' .scw-chip.sky    { color: #7dd3fc; border-color: rgba(56,189,248,.45); background: rgba(56,189,248,.1); }',
        '#' + LOADER_ID + ' .scw-chip.rare { box-shadow: 0 0 18px rgba(240,180,41,.5); }',
        '',
        '#' + LOADER_ID + ' .scw-msg {',
        '  max-width: 480px; min-height: 3.6em; text-align: center; color: #f1f5f9;',
        '  font-size: 17px; font-weight: 600; line-height: 1.55;',
        '  transition: opacity .26s ease, transform .26s ease;',
        '  text-wrap: balance;',
        '}',
        '#' + LOADER_ID + ' .scw-msg-out { opacity: 0; transform: translateY(9px); }',
        '',
        '#' + LOADER_ID + ' .scw-progress { width: 264px; height: 6px; border-radius: 999px; background: #261f36; overflow: hidden; }',
        '#' + LOADER_ID + ' .scw-progress .scw-bar { height: 100%; width: 0%; border-radius: 999px; background: linear-gradient(90deg, #8b5cf6, #f0b429); transition: width .3s ease; }',
        '#' + LOADER_ID + ' .scw-hint { color: #94a3b8; font-size: 13px; font-weight: 700; }',
        '#' + LOADER_ID + ' .scw-hint .scw-dots span { animation: scw-blink 1.2s infinite; }',
        '#' + LOADER_ID + ' .scw-hint .scw-dots span:nth-child(2) { animation-delay: .2s; }',
        '#' + LOADER_ID + ' .scw-hint .scw-dots span:nth-child(3) { animation-delay: .4s; }',
        '@keyframes scw-blink { 0%,80%,100% { opacity: .2; } 40% { opacity: 1; } }',
        '#' + LOADER_ID + ' .scw-tip-mini { color: #64748b; font-size: 11px; font-weight: 600; position: absolute; bottom: 26px; }',
        '#' + LOADER_ID + ' .scw-brand { color: #475569; font-size: 11px; font-weight: 700; letter-spacing: 1px; position: absolute; bottom: 10px; }',
        '',
        '@media (max-width: 640px) {',
        '  #' + LOADER_ID + ' .scw-ring { width: 118px; height: 118px; }',
        '  #' + LOADER_ID + ' .scw-face-big, #' + LOADER_ID + ' .scw-face-fb { width: 84px; height: 84px; }',
        '  #' + LOADER_ID + ' .scw-msg { font-size: 15px; min-height: 4.6em; }',
        '  #' + TAB_ID + ' { height: 54px; }  #' + TAB_ID + ' .scw-face { width: 38px; height: 38px; }',
        '}',
        '@media (prefers-reduced-motion: reduce) {',
        '  #' + LOADER_ID + ' .scw-pt, #' + LOADER_ID + ' .scw-glow-a, #' + LOADER_ID + ' .scw-glow-b { display: none; }',
        '  #' + LOADER_ID + ' .scw-ring, #' + LOADER_ID + ' .scw-face-big, #' + LOADER_ID + ' .scw-face-fb,',
        '  #' + LOADER_ID + ' .scw-ring-outer, #' + LOADER_ID + ' .scw-ring::before, #' + TAB_ID + ' { animation: none !important; }',
        '}'
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('sc-wiki-style')) return;
        var st = document.createElement('style');
        st.id = 'sc-wiki-style';
        st.textContent = CSS;
        document.head.appendChild(st);
        /* Inter por si el index no la carga aún (la pantalla de carga la usa) */
        if (!document.querySelector('link[href*="family=Inter"]')) {
            var f = document.createElement('link');
            f.rel = 'stylesheet';
            f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap';
            document.head.appendChild(f);
        }
    }

    /* ==== PRECARGA de TODA la wiki (cache warm-up real) ==== */
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
        fetch(WIKI_URL, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) throw 0;
            return r.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var urls = [], seen = {};
            var scripts = doc.querySelectorAll('script[src]');
            var links = doc.querySelectorAll('link[rel="stylesheet"][href]');
            function push(raw) {
                var abs = sameOriginAbs(raw, WIKI_URL);
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

    /* ==== LA PESTAÑA ==== */
    function buildTab() {
        if (document.getElementById(TAB_ID)) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.id = TAB_ID;
        b.title = 'Wiki';
        b.setAttribute('aria-label', 'Abrir Wiki');

        var face = document.createElement('span');
        face.className = 'scw-face';
        var img = document.createElement('img');
        img.src = WIKIFACE_URL;
        img.alt = '';
        img.onerror = function () {          /* fallback: logo SC -> letra W */
            var fb = document.createElement('span');
            fb.className = 'scw-face-fb';
            var lgo = new Image();
            lgo.onload = function () {
                fb.style.background = 'none'; fb.textContent = '';
                fb.appendChild(lgo); lgo.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            };
            lgo.onerror = function () { fb.textContent = 'W'; };
            lgo.src = LOGO_FALLBACK;
            face.replaceChild(fb, img);
        };
        face.appendChild(img);

        var label = document.createElement('span');
        label.className = 'scw-label';
        label.textContent = 'Wiki';

        var arrow = document.createElement('span');
        arrow.className = 'scw-arrow';

        var shimmer = document.createElement('span');
        shimmer.className = 'scw-shimmer';

        b.appendChild(shimmer);
        b.appendChild(face);
        b.appendChild(label);
        b.appendChild(arrow);

        b.addEventListener('mouseenter', startPrewarm);
        b.addEventListener('touchstart', startPrewarm, { passive: true });
        b.addEventListener('click', function () {
            b.classList.remove('is-pressing');
            void b.offsetWidth;              /* reinicia el squish */
            b.classList.add('is-pressing');
            setTimeout(openWiki, 140);
        });

        document.body.appendChild(b);
    }

    function startPrewarm() {
        if (state.prewarm) return;
        state.prewarm = true;
        ensurePrefetch();
    }

    /* ==== PANTALLA DE CARGA ==== */
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

        var ga = document.createElement('span'); ga.className = 'scw-glow-a';
        var gb = document.createElement('span'); gb.className = 'scw-glow-b';
        ov.appendChild(ga); ov.appendChild(gb);

        /* partículas moradas/doradas */
        for (var i = 0; i < 18; i++) {
            var p = document.createElement('span');
            p.className = 'scw-pt';
            var size = 3 + Math.random() * 6;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * 100) + '%';
            p.style.background = Math.random() > .5 ? 'rgba(139,92,246,.4)' : 'rgba(240,180,41,.4)';
            p.style.animationDuration = (6 + Math.random() * 7) + 's';
            p.style.animationDelay = (-Math.random() * 10) + 's';
            ov.appendChild(p);
        }

        var stage = document.createElement('div');
        stage.className = 'scw-stage';

        var ring = document.createElement('div');
        ring.className = 'scw-ring';
        var outer = document.createElement('span');
        outer.className = 'scw-ring-outer';
        ring.appendChild(outer);

        var face = document.createElement('img');
        face.className = 'scw-face-big';
        face.src = WIKIFACE_URL;
        face.alt = 'WikiFace';
        face.title = 'Tócame';
        face.onerror = function () {
            var fb = document.createElement('div');
            fb.className = 'scw-face-fb';
            fb.textContent = 'W';
            fb.title = 'Tócame';
            fb.addEventListener('click', onFaceClick);
            ring.replaceChild(fb, face);
            loader.faceEl = fb;
        };
        face.addEventListener('click', onFaceClick);
        ring.appendChild(face);
        stage.appendChild(ring);

        var chip = document.createElement('div');
        chip.className = 'scw-chip gold';
        var msg = document.createElement('div');
        msg.className = 'scw-msg';
        stage.appendChild(chip);
        stage.appendChild(msg);

        var prog = document.createElement('div');
        prog.className = 'scw-progress';
        var bar = document.createElement('div');
        bar.className = 'scw-bar';
        prog.appendChild(bar);
        stage.appendChild(prog);

        var hint = document.createElement('div');
        hint.className = 'scw-hint';
        hint.innerHTML = 'Entrando a Stevscon.wiki <span class="scw-dots"><span>.</span><span>.</span><span>.</span></span>';
        stage.appendChild(hint);

        ov.appendChild(stage);

        var tip = document.createElement('div');
        tip.className = 'scw-tip-mini';
        tip.textContent = 'Psst… la WikiFace se puede tocar.';
        ov.appendChild(tip);

        var brand = document.createElement('div');
        brand.className = 'scw-brand';
        brand.textContent = 'Stevscon.wiki';
        ov.appendChild(brand);

        document.body.appendChild(ov);
        loader.el = ov; loader.chipEl = chip; loader.msgEl = msg;
        loader.barEl = bar; loader.faceEl = face;

        /* primer mensaje al instante (6% de que toque el easter egg raro) */
        if (Math.random() < 0.06) {
            setMsg('WIKIFACE', 'gold', RARE_MSG, true);
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
        c.className = 'scw-chip ' + color + (rare ? ' rare' : '');
        c.textContent = chip;
        m.classList.add('scw-msg-out');
        setTimeout(function () {
            m.textContent = text;
            m.classList.remove('scw-msg-out');
        }, 260);
    }

    function onFaceClick() {
        var f = loader.faceEl;
        if (!f) return;
        f.classList.remove('scw-boing');
        void f.offsetWidth;
        f.classList.add('scw-boing');
        if (!state.going) {
            var q = FACE_QUOTES[Math.floor(Math.random() * FACE_QUOTES.length)];
            setMsg('WIKIFACE', 'gold', q, loader.rareMode);
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
        var creep = Math.min(88, (elapsed / MIN_SHOW) * 88);       /* se arrastra con el tiempo */
        var real = load.total ? (load.done / load.total) * 100 : 0; /* y salta con la carga real */
        var pct = allDone ? 100 : Math.max(creep, real);
        loader.barEl.style.width = Math.min(100, pct) + '%';
    }

    function openWiki() {
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
            setTimeout(function () { location.href = WIKI_URL; }, 280);
        }

        /* navega cuando TODO se precargó Y el mínimo pasó; cap duro de seguridad */
        Promise.all([prefetch, new Promise(function (r) { setTimeout(r, MIN_SHOW); })]).then(go);
        setTimeout(go, MAX_SHOW);
    }

    /* ==== INIT ==== */
    function init() {
        injectStyles();
        buildTab();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Stevscon] category_wiki.js listo (v2) — puerta Wiki con WikiFace + precarga real.');
})(window, document);