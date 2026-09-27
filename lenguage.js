/**
 * ====
 * STEVSCON.COM - language.js  (RAIZ del proyecto)
 * IDIOMA · Traduccion ES/EN de TODA la web en UN solo file · v1
 * - NO toca ningun otro file: los demas siguen pintando en espanol y este
 *   file traduce el DOM al vuelo (textos, placeholders, title, aria-label),
 *   INCLUYENDO lo que se renderiza despues (modals, toasts, menu del avatar)
 *   gracias a un MutationObserver.
 * - Boton de idioma en el menu del avatar (esquina) + boton flotante ES/EN
 *   en la home mientras se ven las tarjetas ACCESS / CREATE (tambien queda
 *   por encima de los modals abiertos).
 * - Preferencia: localStorage('stevscon_lang') y, si hay sesion, espejo en
 *   Firebase users/{uid}/settings/lang (solo la preferencia de idioma, nada
 *   sensible). Al iniciar, si Firebase trae otro valor, manda Firebase.
 * - Evento global 'stevscon:lang-changed' para files futuros.
 * - StevsconLang.debug(): lista en consola los textos aun sin traducir para
 *   ampliar el diccionario.
 * Cargar al FINAL del index (despues de category_acc.js).
 * ====
 */
(function (window, document) {
    'use strict';

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
        '← Volver a mi perfil': '← Back to my profile'
    };

    // Textos con partes dinamicas (usernames, IDs...)
    var PATTERNS = [
        { re: /^¡Cuenta creada! Bienvenido, (.+) \(ID: (\d+)\)$/, en: 'Account created! Welcome, $1 (ID: $2)' },
        { re: /^ID copiado: (.+)$/, en: 'ID copied: $1' }
    ];

    var ATTRS = ['placeholder', 'title', 'aria-label'];
    var STORE_KEY = 'stevscon_lang';

    var lang = 'es';
    try { if (localStorage.getItem(STORE_KEY) === 'en') lang = 'en'; } catch (e) {}

    var originals = new WeakMap();      // TextNode -> texto original (espanol)
    var attrOriginals = new WeakMap();  // Element -> { atributo: original }
    var debugOn = false;
    var debugSeen = {};

    // ---- Nucleo de traduccion ----

    function translateText(original) {
        if (lang !== 'en') return null;
        if (Object.prototype.hasOwnProperty.call(DICT, original)) return DICT[original];
        for (var i = 0; i < PATTERNS.length; i++) {
            if (PATTERNS[i].re.test(original)) return original.replace(PATTERNS[i].re, PATTERNS[i].en);
        }
        return null;
    }

    function maybeLog(original) {
        if (!debugOn) return;
        var s = original.trim();
        if (s.length < 2 || s.length > 120) return;
        if (debugSeen[s]) return;
        // omitir numeros, simbolos solos, correos y URLs
        if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ¡¿]/.test(s)) return;
        if (/^[^\s]+@[^\s]+$/.test(s)) return;
        if (/^https?:/i.test(s)) return;
        debugSeen[s] = 1;
        console.log('[Stevscon i18n] sin traduccion:', JSON.stringify(s));
    }

    function translateTextNode(node) {
        if (!node || node.nodeType !== 3) return;
        var cur = node.nodeValue;
        if (!cur || !cur.trim()) return;
        if (isSkipped(node)) return;

        // Recuperar/actualizar el original espanol de este nodo
        var original;
        if (originals.has(node)) {
            var stored = originals.get(node);
            if (stored === cur || translateText(stored) === cur) {
                original = stored;              // sin cambios o es nuestra propia traduccion
            } else {
                original = cur;                 // el file pinto texto NUEVO: nuevo original
            }
        } else {
            original = cur;
        }
        originals.set(node, original);
        maybeLog(original);

        var next = (lang === 'en') ? (translateText(original) || original) : original;
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

        var next = (lang === 'en') ? (DICT[original] || original) : original;
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
        try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
        document.documentElement.setAttribute('lang', lang);
        applyAll();
        mirrorToFirebase();
        try {
            document.dispatchEvent(new CustomEvent('stevscon:lang-changed', { detail: { lang: lang } }));
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
            FB.auth.onAuthStateChanged(function (u) {
                if (!u || !FB.database) return;
                FB.database.ref('users/' + u.uid + '/settings/lang').once('value').then(function (s) {
                    var v = s.val();
                    if ((v === 'en' || v === 'es') && v !== lang) setLang(v);
                }).catch(function () {});
            });
        } catch (e) {}
    }

    // ---- Boton de idioma en el MENU del avatar (esquina) ----

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
            var menu = b.parentNode;
            if (menu && menu.nodeType === 1) menu.hidden = true;
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

    function injectMenu() {
        var slot = document.getElementById('user-header-actions');
        if (!slot) return;
        var divs = slot.getElementsByTagName('div');
        for (var i = 0; i < divs.length; i++) {
            var m = divs[i];
            if (m.style.position !== 'absolute') continue;   // el menu de session.js
            if (m.hasAttribute('data-sclang-injected')) continue;
            m.setAttribute('data-sclang-injected', '1');
            m.insertBefore(makeMenuItem(), m.firstChild);     // primero de la lista
        }
        updateMenuItems();
    }

    // ---- Boton flotante ES/EN en la home (ACCESS / CREATE sin sesion) ----

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
            btns[i].style.color = active ? '#ffffff' : '#94a3b8';
        }
    }

    // Visible SOLO mientras se ven las tarjetas ACCESS/CREATE (sin sesion)
    function updateFloatVisibility() {
        if (!floatBtn) return;
        var access = document.getElementById('home-access-card');
        var visible = !!(access && !access.classList.contains('hidden'));
        floatBtn.style.display = visible ? 'flex' : 'none';
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
            updateFloatVisibility();
        });
    }

    // ---- API publica ----

    window.StevsconLang = {
        version: 1,
        get: function () { return lang; },
        set: setLang,
        toggle: function () { setLang(lang === 'es' ? 'en' : 'es'); },
        debug: function () {
            debugOn = true;
            debugSeen = {};
            console.log('[Stevscon i18n] debug ON. Abre la home, los modals y los menus: cada texto que siga en espanol se imprimira aqui. Pasame esa lista y amplio el diccionario.');
        }
    };

    // ---- Init ----

    function init() {
        document.documentElement.setAttribute('lang', lang);
        applyAll();
        injectMenu();
        ensureFloatBtn();
        updateFloatVisibility();
        initFromFirebase();

        var mo = new MutationObserver(schedule);
        mo.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ATTRS.concat(['class', 'hidden'])
        });

        console.log('[Stevscon] language.js listo (v1 · ES/EN · ' + Object.keys(DICT).length + ' entradas).');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);