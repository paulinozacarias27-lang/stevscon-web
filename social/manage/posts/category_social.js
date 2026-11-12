/**
 * ====
 * STEVSCON.COM - social/manage/posts/category_social.js (v3)
 * La PUERTA hacia el Social — ahora en el DOCK SUPERIOR, centrada arriba.
 *
 * - v3: la pestaña ya NO vive a media pantalla a la izquierda. Ahora es
 *   una píldora de cristal en la parte de ARRIBA de la web, centrada,
 *   junto a la de Wiki (comparten dock). Misma alma, otro cuerpo:
 *   glow pulsante, shimmer al hover, carita que se inclina feliz y
 *   squish al click. La etiqueta "Social" siempre visible.
 * - GUARDIA NUEVA: dentro de /social/social.html la puerta NO se pinta
 *   (la puerta no se muestra dentro de su propia casa).
 * - Click: misma pantalla de carga épica de HappyFace (intacta):
 *   partículas, barra REAL, mensajes, easter egg raro, carita tocable.
 * - Sigue PRECARGANDO todo el Social antes de aterrizar (2.4s mín / 6.5s máx).
 * - Respeta prefers-reduced-motion.
 * ====
 */
(function (window, document) {
    'use strict';

    /* GUARDIA · dentro del Social la puerta no existe */
    var __p = location.pathname.replace(/\/+$/, '').toLowerCase();
    if (__p.indexOf('/social/social.html') !== -1) {
        console.log('[Stevscon] category_social.js v3: ya estás DENTRO del Social, puerta oculta.');
        return;
    }

    /* ==== CONFIG ==== */
    var SOCIAL_URL = '/social/social.html';
    var HAPPYFACE_URL = '/HappyFace.png';
    var TAB_ID = 'scsoc-social-tab';
    var DOCK_ID = 'sc-top-dock';
    var LOADER_ID = 'scsoc-loader';

    var MIN_SHOW = 2400;
    var MAX_SHOW = 6500;
    var MSG_EVERY = 1700;

    var state = { opened: false, going: false, prewarm: false, msgTimer: 0 };

    /* ==== MENSAJES DE LA PANTALLA DE CARGA ==== */
    var MSGS = [
        { chip: 'SUERTE', color: 'gold', text: 'Hoy el algoritmo está de tu lado. Todo te va a salir bien.' },
        { chip: 'SUERTE', color: 'gold', text: 'Dicen que quien entra a Social un viernes recibe un like inesperado.' },
        { chip: 'SUERTE', color: 'gold', text: 'Si la carita sonríe, tu día va a sonreír también. Es ciencia.' },
        { chip: 'SUERTE', color: 'gold', text: 'Nivel de suerte de hoy: legendario.' },
        { chip: 'SUERTE', color: 'gold', text: 'La fortuna te busca… pero estás aquí. Perfecto, se espera.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Toca los 3 puntos de tus comentarios para editarlos o borrarlos.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Responde a una respuesta y crea un hilo de hasta 3 niveles.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Da like sin miedo: si lo vuelves a tocar, se quita. Cero drama.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Menciona con @ a alguien y le llegará tu respuesta más rápido.' },
        { chip: 'CONSEJO', color: 'purple', text: 'Tu avatar y tu perfil se arman en la sección Profiles.' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Ya saludaste a alguien en Social hoy?' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Qué postearías si tuvieras el poder del Owner por un día?' },
        { chip: 'PREGUNTA', color: 'sky', text: 'Morado o dorado… el SC ya eligió. ¿Tú qué?' },
        { chip: 'PREGUNTA', color: 'sky', text: 'Si la carita hablara, ¿qué diría? … Probablemente "holi".' },
        { chip: 'PREGUNTA', color: 'sky', text: '¿Ya revisaste quién te dejó un like hoy?' }
    ];
    var FACE_QUOTES = [
        'HappyFace: «¡Buen viaje, viajero!»',
        'HappyFace: «Yo sonrío, tú postea.»',
        'HappyFace: «Me tienes en el corazón… y en el centro de esta pantalla.»',
        'HappyFace: «Eso, picándole. Ya casi.»'
    ];
    var RARE_MSG = 'EASTER EGG: Encontraste la carita dorada de la fortuna. Hoy nadie te niega un like.';

    /* ==== ESTILOS (prefijo scsoc-) ==== */
    var CSS = [
        '/* ---- DOCK SUPERIOR · casa compartida de las puertas ---- */',
        '#' + DOCK_ID + ' {',
        '  position: fixed; top: 8px; left: 50%; transform: translateX(-50%);',
        '  z-index: 1200; display: flex; align-items: center; gap: 10px;',
        '  flex-wrap: nowrap; pointer-events: none;',
        '}',
        '#' + DOCK_ID + ' > * { pointer-events: auto; }',
        '',
        '/* ---- Pestaña Social · píldora superior ---- */',
        '#' + TAB_ID + ' {',
        '  position: relative;',
        '  display: flex; align-items: center; gap: 9px;',
        '  height: 44px; padding: 0 16px 0 6px; box-sizing: border-box;',
        '  border: 1px solid rgba(139,92,246,.4); border-radius: 999px;',
        '  background: rgba(23,18,38,.9);',
        '  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);',
        '  overflow: hidden; cursor: pointer;',
        '  font-family: Inter, system-ui, sans-serif; color: #f8fafc;',
        '  box-shadow: 0 6px 24px rgba(0,0,0,.45);',
        '  transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease,',
        '              border-color .3s ease, background .3s ease, opacity .3s ease;',
        '  animation: scsoc-tab-pulse 3.4s ease-in-out infinite;',
        '}',
        '#' + TAB_ID + ':hover {',
        '  transform: translateY(-2px) scale(1.05);',
        '  border-color: rgba(240,180,41,.6);',
        '  background: linear-gradient(135deg, rgba(139,92,246,.3), rgba(23,18,38,.95));',
        '  animation: none;',
        '  box-shadow: 0 10px 30px rgba(0,0,0,.5), 0 0 26px rgba(139,92,246,.45);',
        '}',
        '#' + TAB_ID + ':focus-visible { outline: 2px solid #f0b429; outline-offset: 3px; }',
        '#' + TAB_ID + '.is-pressing { animation: scsoc-squish .45s cubic-bezier(.34,1.56,.64,1); }',
        '#' + TAB_ID + '.is-hidden { opacity: 0; transform: scale(.85); pointer-events: none; }',
        '',
        '#' + TAB_ID + ' .scsoc-face {',
        '  width: 34px; height: 34px; flex: none; border-radius: 50%; padding: 2px;',
        '  background: linear-gradient(135deg, #f0b429, #b45309);',
        '  display: grid; place-items: center; box-sizing: border-box;',
        '  transition: transform .35s cubic-bezier(.34,1.56,.64,1);',
        '}',
        '#' + TAB_ID + ' .scsoc-face img, #' + TAB_ID + ' .scsoc-face .scsoc-face-fallback {',
        '  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;',
        '}',
        '#' + TAB_ID + ' .scsoc-face-fallback {',
        '  background: #f0b429; color: #1c1404; display: grid; place-items:center;',
        '  font-weight: 800; font-size: 13px; letter-spacing: -.5px;',
        '}',
        '#' + TAB_ID + ':hover .scsoc-face { transform: rotate(-14deg) scale(1.08); }',
        '',
        '#' + TAB_ID + ' .scsoc-label {',
        '  font-size: 14px; font-weight: 800; letter-spacing: .4px; white-space: nowrap;',
        '}',
        '',
        '/* shimmer que cruza al hacer hover (el de siempre) */',
        '#' + TAB_ID + ' .scsoc-shimmer {',
        '  position: absolute; top: -20%; bottom: -20%; width: 36px;',
        '  background: rgba(255,255,255,.14); transform: skewX(-22deg);',
        '  left: -30%; opacity: 0;',
        '}',
        '#' + TAB_ID + ':hover .scsoc-shimmer { animation: scsoc-shine .9s ease .05s; }',
        '',
        '@keyframes scsoc-shine { 0% { left: -30%; opacity: 0; } 25% { opacity: 1; } 100% { left: 115%; opacity: 0; } }',
        '@keyframes scsoc-squish { 0% { transform: scale(1); } 40% { transform: scale(.86,.78); } 100% { transform: scale(1); } }',
        '@keyframes scsoc-tab-pulse {',
        '  0%,100% { box-shadow: 0 6px 24px rgba(0,0,0,.45); }',
        '  50%     { box-shadow: 0 6px 24px rgba(0,0,0,.45), 0 0 22px rgba(240,180,41,.4); }',
        '}',
        '',
        '/* ---- Pantalla de carga (INTACTA de v2) ---- */',
        '#' + LOADER_ID + ' {',
        '  position: fixed; inset: 0; z-index: 2147483000; background: #0d0b14;',
        '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
        '  opacity: 0; transition: opacity .35s ease; font-family: Inter, system-ui, sans-serif;',
        '  overflow: hidden; user-select: none;',
        '}',
        '#' + LOADER_ID + '.is-on { opacity: 1; }',
        '#' + LOADER_ID + ' .sc-glow-a, #' + LOADER_ID + ' .sc-glow-b {',
        '  position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none;',
        '}',
        '#' + LOADER_ID + ' .sc-glow-a { width: 460px; height: 460px; background: rgba(139,92,246,.16); top: -140px; left: -120px; animation: sc-drift 9s ease-in-out infinite; }',
        '#' + LOADER_ID + ' .sc-glow-b { width: 420px; height: 420px; background: rgba(240,180,41,.1); bottom: -140px; right: -110px; animation: sc-drift 11s ease-in-out infinite reverse; }',
        '@keyframes sc-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,30px); } }',
        '#' + LOADER_ID + ' .sc-pt { position: absolute; bottom: -24px; border-radius: 50%; pointer-events: none; animation: sc-rise linear infinite; }',
        '@keyframes sc-rise { to { transform: translateY(-115vh); opacity: 0; } }',
        '',
        '#' + LOADER_ID + ' .sc-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 0 24px; }',
        '#' + LOADER_ID + ' .sc-ring {',
        '  width: 138px; height: 138px; border-radius: 50%; position: relative;',
        '  border: 2px dashed rgba(240,180,41,.55); display: grid; place-items: center;',
        '  animation: sc-spin 10s linear infinite;',
        '}',
        '#' + LOADER_ID + ' .sc-ring::before {',
        '  content: ""; position: absolute; inset: -22px; border-radius: 50%;',
        '  background: radial-gradient(circle, rgba(240,180,41,.2), transparent 65%);',
        '  animation: sc-breathe 2.6s ease-in-out infinite;',
        '}',
        '#' + LOADER_ID + ' .sc-face {',
        '  width: 98px; height: 98px; border-radius: 50%; object-fit: cover; cursor: pointer;',
        '  box-shadow: 0 14px 44px rgba(240,180,41,.35), 0 0 0 6px rgba(240,180,41,.08);',
        '  animation: sc-bob 2.8s ease-in-out infinite;',
        '  -webkit-tap-highlight-color: transparent;',
        '}',
        '#' + LOADER_ID + ' .sc-face-fallback {',
        '  width: 98px; height: 98px; border-radius: 50%; background: linear-gradient(135deg,#f0b429,#b45309);',
        '  display: grid; place-items: center; color: #1c1404; font-weight: 800; font-size: 34px;',
        '  box-shadow: 0 14px 44px rgba(240,180,41,.35); animation: sc-bob 2.8s ease-in-out infinite; cursor: pointer;',
        '}',
        '#' + LOADER_ID + ' .sc-boing { animation: sc-boing .6s cubic-bezier(.34,1.56,.64,1) !important; }',
        '@keyframes sc-spin { to { transform: rotate(360deg); } }',
        '@keyframes sc-bob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(3deg); } }',
        '@keyframes sc-breathe { 0%,100% { transform: scale(.92); opacity:.7; } 50% { transform: scale(1.06); opacity:1; } }',
        '@keyframes sc-boing { 0% { transform: scale(1) rotate(0); } 35% { transform: scale(1.28) rotate(180deg); } 70% { transform: scale(.94) rotate(330deg); } 100% { transform: scale(1) rotate(360deg); } }',
        '',
        '#' + LOADER_ID + ' .sc-chip {',
        '  font-size: 11px; font-weight: 800; letter-spacing: 2.4px; text-transform: uppercase;',
        '  padding: 6px 15px; border-radius: 999px; border: 1px solid;',
        '}',
        '#' + LOADER_ID + ' .sc-chip.gold   { color: #f0b429; border-color: rgba(240,180,41,.55); background: rgba(240,180,41,.1); }',
        '#' + LOADER_ID + ' .sc-chip.purple { color: #c4b5fd; border-color: rgba(139,92,246,.55); background: rgba(139,92,246,.12); }',
        '#' + LOADER_ID + ' .sc-chip.sky    { color: #7dd3fc; border-color: rgba(56,189,248,.45); background: rgba(56,189,248,.1); }',
        '#' + LOADER_ID + ' .sc-chip.rare { box-shadow: 0 0 18px rgba(240,180,41,.5); }',
        '',
        '#' + LOADER_ID + ' .sc-msg {',
        '  max-width: 480px; min-height: 3.6em; text-align: center; color: #f1f5f9;',
        '  font-size: 17px; font-weight: 600; line-height: 1.55;',
        '  transition: opacity .26s ease, transform .26s ease;',
        '  text-wrap: balance;',
        '}',
        '#' + LOADER_ID + ' .sc-msg-out { opacity: 0; transform: translateY(9px); }',
        '',
        '#' + LOADER_ID + ' .sc-progress { width: 264px; height: 6px; border-radius: 999px; background: #261f36; overflow: hidden; }',
        '#' + LOADER_ID + ' .sc-progress .sc-bar { height: 100%; width: 0%; border-radius: 999px; background: linear-gradient(90deg, #f0b429, #8b5cf6); transition: width .3s ease; }',
        '#' + LOADER_ID + ' .sc-hint { color: #94a3b8; font-size: 13px; font-weight: 700; }',
        '#' + LOADER_ID + ' .sc-hint .sc-dots span { animation: sc-blink 1.2s infinite; }',
        '#' + LOADER_ID + ' .sc-hint .sc-dots span:nth-child(2) { animation-delay: .2s; }',
        '#' + LOADER_ID + ' .sc-hint .sc-dots span:nth-child(3) { animation-delay: .4s; }',
        '@keyframes sc-blink { 0%,80%,100% { opacity: .2; } 40% { opacity: 1; } }',
        '#' + LOADER_ID + ' .sc-tip-mini { color: #64748b; font-size: 11px; font-weight: 600; position: absolute; bottom: 26px; }',
        '#' + LOADER_ID + ' .sc-brand { color: #475569; font-size: 11px; font-weight: 700; letter-spacing: 1px; position: absolute; bottom: 10px; }',
        '',
        '/* ---- Responsive ---- */',
        '@media (max-width: 760px) {',
        '  #' + DOCK_ID + ' { top: 58px; gap: 8px; }',
        '  #' + TAB_ID + ' { height: 40px; padding: 0 13px 0 5px; }',
        '  #' + TAB_ID + ' .scsoc-face { width: 30px; height: 30px; }',
        '  #' + TAB_ID + ' .scsoc-label { font-size: 13px; }',
        '}',
        '@media (max-width: 640px) {',
        '  #' + LOADER_ID + ' .sc-ring { width: 118px; height: 118px; }',
        '  #' + LOADER_ID + ' .sc-face, #' + LOADER_ID + ' .sc-face-fallback { width: 84px; height: 84px; }',
        '  #' + LOADER_ID + ' .sc-msg { font-size: 15px; min-height: 4.6em; }',
        '}',
        '@media (prefers-reduced-motion: reduce) {',
        '  #' + LOADER_ID + ' .sc-pt, #' + LOADER_ID + ' .sc-glow-a, #' + LOADER_ID + ' .sc-glow-b { display: none; }',
        '  #' + LOADER_ID + ' .sc-ring, #' + LOADER_ID + ' .sc-face, #' + LOADER_ID + ' .sc-face-fallback,',
        '  #' + LOADER_ID + ' .sc-ring::before, #' + TAB_ID + ' { animation: none !important; }',
        '}'
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('scsoc-category-social-style')) return;
        var st = document.createElement('style');
        st.id = 'scsoc-category-social-style';
        st.textContent = CSS;
        document.head.appendChild(st);
        if (!document.querySelector('link[href*="family=Inter"]')) {
            var f = document.createElement('link');
            f.rel = 'stylesheet';
            f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap';
            document.head.appendChild(f);
        }
    }

    /* ==== DOCK SUPERIOR · se crea solo una vez (lo comparte la Wiki) ==== */
    function ensureDock() {
        var d = document.getElementById(DOCK_ID);
        if (!d) {
            d = document.createElement('div');
            d.id = DOCK_ID;
            document.body.appendChild(d);
        }
        return d;
    }

    /* ==== PRECARGA de TODO el social (cache warm-up real) ==== */
    var load = { total: 0, done: 0, promise: null, resolve: null };

    function ensurePrefetch() {
        if (load.promise) return load.promise;
        load.promise = new Promise(function (res) { load.resolve = res; });
        try { warmFirebase(); } catch (e) { /* silencio */ }
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
        fetch(SOCIAL_URL, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) throw 0;
            return r.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var urls = [], seen = {};
            var scripts = doc.querySelectorAll('script[src]');
            var links = doc.querySelectorAll('link[rel="stylesheet"][href]');
            function push(raw) {
                var abs = sameOriginAbs(raw, SOCIAL_URL);
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

    /* ==== LA PESTAÑA (v3 · píldora superior) ==== */
    function buildTab() {
        if (document.getElementById(TAB_ID)) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.id = TAB_ID;
        b.title = 'Social';
        b.setAttribute('aria-label', 'Abrir Social');

        var face = document.createElement('span');
        face.className = 'scsoc-face';
        var img = document.createElement('img');
        img.src = HAPPYFACE_URL;
        img.alt = '';
        img.onerror = function () {
            var fb = document.createElement('span');
            fb.className = 'scsoc-face-fallback';
            fb.textContent = 'SC';
            face.replaceChild(fb, img);
        };
        face.appendChild(img);

        var label = document.createElement('span');
        label.className = 'scsoc-label';
        label.textContent = 'Social';

        var shimmer = document.createElement('span');
        shimmer.className = 'scsoc-shimmer';

        b.appendChild(shimmer);
        b.appendChild(face);
        b.appendChild(label);

        b.addEventListener('mouseenter', startPrewarm);
        b.addEventListener('touchstart', startPrewarm, { passive: true });
        b.addEventListener('click', function () {
            b.classList.remove('is-pressing');
            void b.offsetWidth;              /* reinicia el squish */
            b.classList.add('is-pressing');
            setTimeout(openSocial, 140);
        });

        ensureDock().appendChild(b);
    }

    function startPrewarm() {
        if (state.prewarm) return;
        state.prewarm = true;
        ensurePrefetch();
    }

    /* ==== PANTALLA DE CARGA (intacta) ==== */
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

        var ga = document.createElement('span'); ga.className = 'sc-glow-a';
        var gb = document.createElement('span'); gb.className = 'sc-glow-b';
        ov.appendChild(ga); ov.appendChild(gb);

        for (var i = 0; i < 14; i++) {
            var p = document.createElement('span');
            p.className = 'sc-pt';
            var size = 3 + Math.random() * 6;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * 100) + '%';
            p.style.background = Math.random() > .5 ? 'rgba(240,180,41,.4)' : 'rgba(139,92,246,.4)';
            p.style.animationDuration = (6 + Math.random() * 7) + 's';
            p.style.animationDelay = (-Math.random() * 10) + 's';
            ov.appendChild(p);
        }

        var stage = document.createElement('div');
        stage.className = 'sc-stage';

        var ring = document.createElement('div');
        ring.className = 'sc-ring';
        var face = document.createElement('img');
        face.className = 'sc-face';
        face.src = HAPPYFACE_URL;
        face.alt = 'HappyFace';
        face.title = 'Tócame';
        face.onerror = function () {
            var fb = document.createElement('div');
            fb.className = 'sc-face-fallback';
            fb.textContent = 'SC';
            fb.title = 'Tócame';
            fb.addEventListener('click', onFaceClick);
            ring.replaceChild(fb, face);
            loader.faceEl = fb;
        };
        face.addEventListener('click', onFaceClick);
        ring.appendChild(face);
        stage.appendChild(ring);

        var chip = document.createElement('div');
        chip.className = 'sc-chip gold';
        var msg = document.createElement('div');
        msg.className = 'sc-msg';
        stage.appendChild(chip);
        stage.appendChild(msg);

        var prog = document.createElement('div');
        prog.className = 'sc-progress';
        var bar = document.createElement('div');
        bar.className = 'sc-bar';
        prog.appendChild(bar);
        stage.appendChild(prog);

        var hint = document.createElement('div');
        hint.className = 'sc-hint';
        hint.innerHTML = 'Entrando a Social <span class="sc-dots"><span>.</span><span>.</span><span>.</span></span>';
        stage.appendChild(hint);

        ov.appendChild(stage);

        var tip = document.createElement('div');
        tip.className = 'sc-tip-mini';
        tip.textContent = 'Psst… la carita se puede tocar.';
        ov.appendChild(tip);

        var brand = document.createElement('div');
        brand.className = 'sc-brand';
        brand.textContent = 'STEvscon.com';
        ov.appendChild(brand);

        document.body.appendChild(ov);
        loader.el = ov; loader.chipEl = chip; loader.msgEl = msg;
        loader.barEl = bar; loader.faceEl = face;

        if (Math.random() < 0.06) {
            setMsg('HAPPYFACE', 'gold', RARE_MSG, true);
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
        c.className = 'sc-chip ' + color + (rare ? ' rare' : '');
        c.textContent = chip;
        m.classList.add('sc-msg-out');
        setTimeout(function () {
            m.textContent = text;
            m.classList.remove('sc-msg-out');
        }, 260);
    }

    function onFaceClick() {
        var f = loader.faceEl;
        if (!f) return;
        f.classList.remove('sc-boing');
        void f.offsetWidth;
        f.classList.add('sc-boing');
        if (!state.going) {
            var q = FACE_QUOTES[Math.floor(Math.random() * FACE_QUOTES.length)];
            setMsg('HAPPYFACE', 'gold', q, loader.rareMode);
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

    function openSocial() {
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
            setTimeout(function () { location.href = SOCIAL_URL; }, 280);
        }

        Promise.all([prefetch, new Promise(function (r) { setTimeout(r, MIN_SHOW); })]).then(go);
        setTimeout(go, MAX_SHOW);
    }

    var loader = {};

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

    console.log('[Stevscon] category_social.js listo (v3) — puerta Social en el DOCK SUPERIOR + precarga real.');
})(window, document);