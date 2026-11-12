/**
 * ====
 * STEVSCON.COM - lenguage.js  (RAIZ del proyecto)
 * IDIOMA · Traduccion ES/EN de TODA la web en UN solo file · v3
 * - v3 BIDIRECCIONAL: el diccionario sigue siendo espanol -> ingles, pero
 *   ahora se construye solo el INVERSO (ingles -> espanol). Asi, aunque un
 *   modulo o el HTML pinte texto en ingles (ej: el hero "Welcome to
 *   Stevscon"), en modo ES se restaura al espanol. Este era el bug de
 *   "puse espanol y todo sigue en ingles".
 * - v3 SINCRONIZADO con social/lenguage.js: guarda en localStorage AMBAS
 *   claves ('stevscon_lang' y 'sc_lang') y lee cualquiera de las dos, asi
 *   el toggle del index y el del Social comparten idioma siempre.
 * - v3 TU ELECCION MANDA: el espejo de Firebase solo se aplica la PRIMERA
 *   vez (si nunca elegiste idioma local). Antes Firebase podia re-imponer
 *   un 'en' viejo en cada recarga.
 * - Incluye TODO category_social.js: la puerta (Social / Abrir Social /
 *   Tócame / Entrando a Social / Psst...) y su pantalla de carga completa
 *   (15 mensajes SUERTE/CONSEJO/PREGUNTA, chips, 4 frases de HappyFace y
 *   el easter egg dorado).
 * - Sigue traduciendo al vuelo TODO lo que aparezca despues (modals,
 *   toasts, menus) con MutationObserver, usando textContent/attrs seguros.
 * - StevsconLang.diagnose() = diagnostico · StevsconLang.debug() = lista
 *   en consola de todo texto que quede sin traducir (en AMBOS idiomas).
 * Cargar al FINAL del index. El tag debe llamarse EXACTO: lenguage.js?v=3
 * ====
 */
(function (window, document) {
    'use strict';

    var VERSION = 3;

    function hasKey(obj, k) {
        return Object.prototype.hasOwnProperty.call(obj, k);
    }

    // ---- Diccionario: clave = texto EXACTO que pinta el codigo (espanol) ----
    var DICT = {
        // Home + tarjetas + modal CREATE (category_acc.js)
        'Bienvenido a Stevscon': 'Welcome to Stevscon',
        'Tu plataforma social, mensajeria y comunidad en tiempo real.': 'Your social platform, messaging and real-time community.',
        'Iniciar sesion': 'Sign in',
        'Ya tienes cuenta: entra con tu correo o tu @handler.': 'Already have an account? Sign in with your email or your @handler.',
        'Crear cuenta': 'Create account',
        'Unete gratis: elige tu @handler, tu nombre y tu contrasena.': 'Join for free: pick your @handler, your name and your password.',
        'Sesion iniciada': 'Signed in',
        'Cargando tu perfil...': 'Loading your profile...',
        '¿Ya tienes cuenta? Inicia sesion': 'Already have an account? Sign in',
        '¿Aun no tienes cuenta? Crear una': "Don't have an account yet? Create one",
        'Unete a Stevscon en menos de un minuto.': 'Join Stevscon in under a minute.',
        'Error interno: los modulos OUTPUT no cargaron. Revisa el orden de los scripts en el index.': 'Internal error: OUTPUT modules failed to load. Check the script order in the index.',
        'No pudimos abrir el inicio de sesion: falta acc_access.js. Revisa el index.': 'We could not open sign in: acc_access.js is missing. Check the index.',
        'Copiar tu ID': 'Copy your ID',
        'Sesion iniciada. ¡Hola de nuevo!': 'Signed in. Welcome back!',
        'Cerrar': 'Close',
        // Menu del avatar (session.js / category_prf.js)
        'Ver perfil': 'View profile',
        'Editar perfil': 'Edit profile',
        'Cerrar sesión': 'Sign out',
        'Cerrar sesion': 'Sign out',
        'Correo': 'Email',
        'Copiar': 'Copy',
        // Perfiles (category_prf.js)
        'Mi perfil': 'My profile',
        'Tu tarjeta, estilo Stevscon.': 'Your card, Stevscon style.',
        '← Volver a mi perfil': '← Back to my profile',

        // ---- category_social.js · la puerta del Social ----
        'Abrir Social': 'Open Social',
        'Tócame': 'Touch me',
        'Entrando a Social': 'Entering Social',
        'Psst… la carita se puede tocar.': 'Psst… you can touch the face.',
        'No pudimos abrir Social: falta category_posts.js. Revisa el index.': "We couldn't open Social: category_posts.js is missing. Check the index.",

        // Chips de la pantalla de carga
        'SUERTE': 'LUCK',
        'CONSEJO': 'TIP',
        'PREGUNTA': 'QUESTION',

        // Los 15 mensajes de la pantalla de carga
        'Hoy el algoritmo está de tu lado. Todo te va a salir bien.': 'Today the algorithm is on your side. Everything will go great.',
        'Dicen que quien entra a Social un viernes recibe un like inesperado.': 'They say whoever enters Social on a Friday gets an unexpected like.',
        'Si la carita sonríe, tu día va a sonreír también. Es ciencia.': 'If the smiley smiles, your day will smile too. It is science.',
        'Nivel de suerte de hoy: legendario.': "Today's luck level: legendary.",
        'La fortuna te busca… pero estás aquí. Perfecto, se espera.': 'Fortune is looking for you… but you are here. Fine, it can wait.',
        'Toca los 3 puntos de tus comentarios para editarlos o borrarlos.': 'Tap the 3 dots on your comments to edit or delete them.',
        'Responde a una respuesta y crea un hilo de hasta 3 niveles.': 'Reply to a reply and build threads up to 3 levels deep.',
        'Da like sin miedo: si lo vuelves a tocar, se quita. Cero drama.': 'Like without fear: tap it again and it goes away. Zero drama.',
        'Menciona con @ a alguien y le llegará tu respuesta más rápido.': 'Mention someone with @ and your reply will reach them faster.',
        'Tu avatar y tu perfil se arman en la sección Profiles.': 'Your avatar and profile are set up in the Profiles section.',
        '¿Ya saludaste a alguien en Social hoy?': 'Have you greeted anyone on Social today?',
        '¿Qué postearías si tuvieras el poder del Owner por un día?': 'What would you post if you had the power of the Owner for a day?',
        'Morado o dorado… el SC ya eligió. ¿Tú qué?': 'Purple or gold… SC already chose. What about you?',
        'Si la carita hablara, ¿qué diría? … Probablemente "holi".': 'If the smiley could talk, what would it say? … Probably "holi".',
        '¿Ya revisaste quién te dejó un like hoy?': 'Have you checked who left you a like today?',

        // Frases de HappyFace (carita tocable) + easter egg dorado
        'HappyFace: «¡Buen viaje, viajero!»': 'HappyFace: «Safe travels, traveler!»',
        'HappyFace: «Yo sonrío, tú postea.»': 'HappyFace: «I smile, you post.»',
        'HappyFace: «Me tienes en el corazón… y en el centro de esta pantalla.»': 'HappyFace: «You hold me in your heart… and at the center of this screen.»',
        'HappyFace: «Eso, picándole. Ya casi.»': 'HappyFace: «That is it, keep tapping. Almost there.»',
        'EASTER EGG: Encontraste la carita dorada de la fortuna. Hoy nadie te niega un like.': 'EASTER EGG: You found the golden face of fortune. Today nobody can deny you a like.',

        // Arranque de social.html (por si el file algun dia corre ahi tambien)
        'Abriendo el Social…': 'Opening Social…',
        'Abriendo el Social...': 'Opening Social...'
    };

    // ---- Inverso automatico: ingles -> espanol (la cura del hero en ingles) ----
    var REV = {};
    (function () {
        for (var k in DICT) {
            if (hasKey(DICT, k) && !hasKey(REV, DICT[k])) REV[DICT[k]] = k;
        }
    })();

    // Textos con partes dinamicas (usernames, IDs...) en ambas direcciones
    var PATTERNS = [
        {
            re: /^¡Cuenta creada! Bienvenido, (.+) \(ID: (\d+)\)$/,
            en: 'Account created! Welcome, $1 (ID: $2)',
            revRe: /^Account created! Welcome, (.+) \(ID: (\d+)\)$/,
            es: '¡Cuenta creada! Bienvenido, $1 (ID: $2)'
        },
        {
            re: /^ID copiado: (.+)$/,
            en: 'ID copied: $1',
            revRe: /^ID copied: (.+)$/,
            es: 'ID copiado: $1'
        }
    ];

    var ATTRS = ['placeholder', 'title', 'aria-label'];

    // v3: AMBAS claves — el toggle del Social (sc_lang) y el de la raiz
    // (stevscon_lang) quedan siempre espejados en las dos direcciones.
    var STORE_KEYS = ['stevscon_lang', 'sc_lang'];

    function readStore() {
        try {
            for (var i = 0; i < STORE_KEYS.length; i++) {
                var v = localStorage.getItem(STORE_KEYS[i]);
                if (v === 'en' || v === 'es') return v;
            }
        } catch (e) {}
        return null;
    }

    function writeStore(v) {
        try {
            for (var i = 0; i < STORE_KEYS.length; i++) localStorage.setItem(STORE_KEYS[i], v);
        } catch (e) {}
    }

    var lang = readStore() || 'es';

    var originals = new WeakMap();      // TextNode -> texto original
    var attrOriginals = new WeakMap();  // Element -> { atributo: original }
    var debugOn = false;
    var debugSeen = {};
    var menuInjectedOnce = false;

    // ---- Nucleo de traduccion (bidireccional) ----

    function translateExact(original) {
        var i;
        if (lang === 'en') {
            if (hasKey(DICT, original)) return DICT[original];
            for (i = 0; i < PATTERNS.length; i++) {
                if (PATTERNS[i].re.test(original)) return original.replace(PATTERNS[i].re, PATTERNS[i].en);
            }
        } else {
            if (hasKey(REV, original)) return REV[original];
            for (i = 0; i < PATTERNS.length; i++) {
                if (PATTERNS[i].revRe && PATTERNS[i].revRe.test(original)) {
                    return original.replace(PATTERNS[i].revRe, PATTERNS[i].es);
                }
            }
        }
        return null;
    }

    function translateText(original) {
        if (!original) return null;
        var hit = translateExact(original);
        if (hit !== null) return hit;
        // Tolerante a espacios de borde (innerHTML tipo "Entrando a Social <span>...")
        var m = original.match(/^(\s*)(\S[\s\S]*?)(\s*)$/);
        if (m) {
            var inner = translateExact(m[2]);
            if (inner !== null) return m[1] + inner + m[3];
        }
        return null;
    }

    function maybeLog(original) {
        if (!debugOn) return;
        var s = original.trim();
        if (s.length < 2 || s.length > 120) return;
        if (debugSeen[s]) return;
        if (!/[a-zA-Z]/.test(s)) return;
        if (/^[^\s]+@[^\s]+$/.test(s)) return;
        if (/^https?:/i.test(s)) return;
        if (lang === 'es') {
            // En ES solo reportamos sospechosos de estar pintados en ingles
            if (hasKey(DICT, s) || !/^[\x00-\x7F]*$/.test(s)) return;
        }
        debugSeen[s] = 1;
        console.log('[Stevscon i18n] sin traduccion (' + lang + '):', JSON.stringify(s));
    }

    function translateTextNode(node) {
        if (!node || node.nodeType !== 3) return;
        var cur = node.nodeValue;
        if (!cur || !cur.trim()) return;
        if (isSkipped(node)) return;

        var original;
        if (originals.has(node)) {
            var stored = originals.get(node);
            if (stored === cur || translateText(stored) === cur) {
                original = stored;
            } else {
                original = cur;
            }
        } else {
            original = cur;
        }
        originals.set(node, original);
        maybeLog(original);

        var next = translateText(original);
        if (next === null) next = original;
        if (next !== cur) node.nodeValue = next;
    }

    function translateAttr(el, name) {
        if (!el || el.nodeType !== 1) return;
        var cur = el.getAttribute(name);
        if (cur === null || !cur.trim()) return;
        if (el.closest && el.closest('[data-sclang-skip]')) return;

        var store = attrOriginals.get(el) || {};
        if (!store[name]) store[name] = cur;
        attrOriginals.set(el, store);
        var original = store[name];

        var next = translateText(original);
        if (next === null) next = original;
        if (next !== cur) el.setAttribute(name, next);
    }

    function isSkipped(node) {
        var p = node.parentNode;
        while (p) {
            if (p.nodeType === 1 && p.hasAttribute && p.hasAttribute('data-sclang-skip')) return true;
            p = p.parentNode;
        }
        return false;
    }

    function scanNode(root) {
        if (!root) return;
        if (root.nodeType === 3) { translateTextNode(root); return; }
        if (root.nodeType !== 1) return;
        if (root.closest && root.closest('[data-sclang-skip]')) return;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var n = walker.nextNode();
        while (n) { translateTextNode(n); n = walker.nextNode(); }

        translateAttrsOfTree(root);
    }

    function translateAttrsOfTree(root) {
        var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (!el.getAttribute) continue;
            for (var a = 0; a < ATTRS.length; a++) {
                if (el.hasAttribute(ATTRS[a])) translateAttr(el, ATTRS[a]);
            }
        }
    }

    function applyAll() {
        scanNode(document.body);
        updateMenuItems();
        updateFloatBtn();
    }

    // ---- Cambio de idioma ----

    function setLang(next) {
        lang = (next === 'en') ? 'en' : 'es';
        writeStore(lang);
        document.documentElement.setAttribute('lang', lang);
        applyAll();
        mirrorToFirebase();
        try {
            document.dispatchEvent(new CustomEvent('stevscon:lang-changed', { detail: { lang: lang } }));
            document.dispatchEvent(new CustomEvent('sc:lang-changed', { detail: { lang: lang } }));
        } catch (e) {}
    }

    function mirrorToFirebase() {
        try {
            var FB = window.StevsconFirebase;
            if (FB && FB.auth && FB.database && FB.auth.currentUser) {
                FB.database.ref('users/' + FB.auth.currentUser.uid + '/settings/lang').set(lang).catch(function () {});
            }
        } catch (e) {}
    }

    function initFromFirebase() {
        try {
            var FB = window.StevsconFirebase;
            if (!FB || !FB.auth) return;
            var hadLocalChoice = readStore() !== null; // v3: tu eleccion local manda
            FB.auth.onAuthStateChanged(function (u) {
                if (!u || !FB.database || hadLocalChoice) return;
                FB.database.ref('users/' + u.uid + '/settings/lang').once('value').then(function (s) {
                    var v = s.val();
                    if ((v === 'en' || v === 'es') && v !== lang) setLang(v);
                }).catch(function () {});
            });
        } catch (e) {}
    }

    // ---- MENU del avatar: deteccion POR CONTENIDO (a prueba de todo) ----

    function looksLikeMenu(el) {
        if (!el || el.nodeType !== 1 || !el.textContent) return false;
        var t = el.textContent;
        if (!/ver\s+perfil/i.test(t)) return false;
        return (/editar\s+perfil/i.test(t) || /cerrar\s+sesi/i.test(t));
    }

    function findMenuBoxesGlobal() {
        var boxes = [];
        var all = document.querySelectorAll('div,nav,aside,section');
        for (var i = 0; i < all.length; i++) if (looksLikeMenu(all[i])) boxes.push(all[i]);
        var deepest = [];
        for (var k = 0; k < boxes.length; k++) {
            var isWrapper = false;
            for (var m = 0; m < boxes.length; m++) {
                if (m !== k && boxes[k].contains(boxes[m])) { isWrapper = true; break; }
            }
            if (!isWrapper) deepest.push(boxes[k]);
        }
        return deepest;
    }

    function makeMenuItem() {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-sclang-skip', '1');
        b.setAttribute('data-sclang-item', '1');
        b.style.cssText = 'display:flex;align-items:center;gap:9px;width:100%;box-sizing:border-box;background:none;border:0;border-radius:8px;padding:8px 10px;color:#ede9fe;font-family:Inter,sans-serif;font-size:13px;font-weight:600;cursor:pointer;text-align:left;';
        var ic = document.createElement('i');
        ic.className = 'fa-solid fa-globe';
        ic.style.color = '#a78bfa';
        var sp = document.createElement('span');
        b.appendChild(ic);
        b.appendChild(sp);
        b.addEventListener('mouseenter', function () { b.style.background = 'rgba(139,92,246,.15)'; });
        b.addEventListener('mouseleave', function () { b.style.background = 'none'; });
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            setLang(lang === 'es' ? 'en' : 'es');
        });
        return b;
    }

    function updateMenuItems() {
        var items = document.querySelectorAll('[data-sclang-item]');
        for (var i = 0; i < items.length; i++) {
            var sp = items[i].querySelector('span');
            if (sp) sp.textContent = (lang === 'es') ? 'Idioma: Español' : 'Language: English';
        }
    }

    function injectInto(box) {
        if (box.hasAttribute('data-sclang-injected') && box.querySelector('[data-sclang-item]')) return;
        box.setAttribute('data-sclang-injected', '1');
        box.insertBefore(makeMenuItem(), box.firstChild);
        updateMenuItems();
        if (!menuInjectedOnce) {
            menuInjectedOnce = true;
            console.log('[Stevscon i18n] boton de idioma anadido al menu del avatar.');
        }
    }

    function injectMenu() {
        var slot = document.getElementById('user-header-actions');
        if (slot) {
            var divs = slot.getElementsByTagName('div');
            for (var i = 0; i < divs.length; i++) {
                if (looksLikeMenu(divs[i])) { injectInto(divs[i]); return; }
            }
        }
        if (!document.querySelector('[data-sclang-item]')) {
            var boxes = findMenuBoxesGlobal();
            for (var j = 0; j < boxes.length; j++) { injectInto(boxes[j]); return; }
        }
    }

    // ---- Boton flotante ES/EN: SIEMPRE visible ----

    var floatBtn = null;

    function ensureFloatBtn() {
        if (floatBtn && document.body.contains(floatBtn)) return;
        floatBtn = document.createElement('div');
        floatBtn.setAttribute('data-sclang-skip', '1');
        floatBtn.style.cssText = 'position:fixed;right:16px;bottom:16px;display:flex;align-items:center;gap:2px;background:#1a1625;border:1px solid #2e2440;border-radius:999px;padding:4px;z-index:10000;font-family:Inter,"Segoe UI",sans-serif;';

        var es = document.createElement('button');
        es.type = 'button';
        es.textContent = 'ES';
        es.style.cssText = 'border:0;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:800;cursor:pointer;background:none;color:#94a3b8;font-family:inherit;';
        es.addEventListener('click', function () { setLang('es'); });

        var en = document.createElement('button');
        en.type = 'button';
        en.textContent = 'EN';
        en.style.cssText = 'border:0;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:800;cursor:pointer;background:none;color:#94a3b8;font-family:inherit;';
        en.addEventListener('click', function () { setLang('en'); });

        floatBtn.appendChild(es);
        floatBtn.appendChild(en);
        document.body.appendChild(floatBtn);
        updateFloatBtn();
    }

    function updateFloatBtn() {
        if (!floatBtn) return;
        var btns = floatBtn.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
            var active = ((btns[i].textContent === 'ES' && lang === 'es') || (btns[i].textContent === 'EN' && lang === 'en'));
            btns[i].style.background = active ? '#7c3aed' : 'none';
            btns[i].style.color = active ? '#ffff' : '#94a3b8';
        }
    }

    // ---- Observador: traduce TODO lo que aparezca, siempre ----

    var batch = [];
    var pending = false;

    function schedule(records) {
        batch = batch.concat(records);
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(function () {
            pending = false;
            var recs = batch;
            batch = [];

            for (var i = 0; i < recs.length; i++) {
                var rec = recs[i];
                if (rec.type === 'childList') {
                    for (var j = 0; j < rec.addedNodes.length; j++) scanNode(rec.addedNodes[j]);
                } else if (rec.type === 'characterData') {
                    translateTextNode(rec.target);
                } else if (rec.type === 'attributes') {
                    var name = rec.attributeName;
                    if (ATTRS.indexOf(name) >= 0) translateAttr(rec.target, name);
                }
            }

            injectMenu();
            ensureFloatBtn();
        });
    }

    // ---- API publica ----

    window.StevsconLang = {
        version: VERSION,
        get: function () { return lang; },
        set: setLang,
        toggle: function () { setLang(lang === 'es' ? 'en' : 'es'); },
        diagnose: function () {
            var inMenu = document.querySelectorAll('[data-sclang-item]').length;
            var stored = '(bloqueado)';
            try { stored = readStore() || '(sin guardar)'; } catch (e) {}
            console.log('=== StevsconLang diagnose ===');
            console.log('- version:', VERSION, '| idioma actual:', lang);
            console.log('- boton de idioma en el menu:', inMenu ? 'SI (' + inMenu + ')' : 'NO (se reintentara solo al abrir el menu)');
            console.log('- boton flotante ES/EN:', floatBtn ? 'creado' : 'aun no creado');
            console.log('- localStorage (stevscon_lang / sc_lang):', stored);
            console.log('- diccionario:', Object.keys(DICT).length, 'entradas ES->EN +', Object.keys(REV).length, 'inversas EN->ES');
            console.log('- Si nada de esto aparece, revisa que index tenga: <script defer src="lenguage.js?v=3"></script> (nombre EXACTO)');
        },
        debug: function () {
            debugOn = true;
            debugSeen = {};
            console.log('[Stevscon i18n] debug ON. Recorre la home, el loader del Social (toca la carita) y los modals: cada texto que quede sin traducir se imprimira aqui. Pasame esa lista y amplio el diccionario.');
        }
    };

    // ---- Init ----

    function init() {
        document.documentElement.setAttribute('lang', lang);
        applyAll();
        injectMenu();
        ensureFloatBtn();
        initFromFirebase();

        var mo = new MutationObserver(schedule);
        mo.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ATTRS.concat(['class', 'hidden'])
        });

        console.log('[Stevscon] lenguage.js listo (v' + VERSION + ' · bidireccional ES/EN · ' + Object.keys(DICT).length + '+' + Object.keys(REV).length + ' entradas).');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);