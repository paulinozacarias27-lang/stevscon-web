/*
 * ====
 *  Stevscon Translate · translate.js (v5)
 *  Traduccion automatica de TODA la web (ES <-> EN).
 *  - Diccionario base incluido: los textos de la UI se traducen
 *    al instante, sin llamar a Google (calidad garantizada).
 *  - Todo lo DEMAS (posts, comentarios, errores, contenido de
 *    usuarios) se traduce en vivo con el endpoint publico de
 *    Google Translate, con cache en localStorage y cola con
 *    limite de concurrencia (anti-flood).
 *  - Nunca se envian: @handlers, correos, URLs, numeros sueltos,
 *    ni textos de mas de 900 caracteres.
 *  - NOMBRES DE USUARIO INTOCABLES: cada @handler visible ensena
 *    su nombre al sistema; los nombres aprendidos nunca se
 *    traducen y su cache se cura sola. "StevsLoL" ya no puede
 *    volverse "StevesLoL" ni "Gatihto" volverse "Kitten".
 *  - MENSAJES DIRECTOS INTOCABLES (v5): TODO el drawer de MDs
 *    (.scdm-win: lista, chat, burbujas, composer y sus botones)
 *    y la pagina de Mensajes (#conversations-list, #chat-area)
 *    conservan su TEXTO ORIGINAL. Nada de ahi se envia a Google.
 *  - Marca protegida: "Stevscon.wiki" nunca se corrompe a "week".
 *  - Escape manual: agrega translate="no" o class="notranslate"
 *    a cualquier elemento que NO deba traducirse (o data-sctr-skip).
 *  - Boton flotante ES/EN + item en el menu del avatar.
 *    Sincroniza con Firebase (users/{uid}/settings/lang).
 *  INSTALACION:
 *    index.html   -> <script defer src="translate.js?v=5"></script>
 *    social.html  -> <script defer src="../translate.js?v=5"></script>
 *  Si se edita el file, subir la version: ?v=6, ?v=7...
 *  Guardar en UTF-8 (default de VS Code).
 * ====
 */
(function (window, document) {
    'use strict';

    var VERSION = 5;

    var PROTECTED_NAMES = ['StevsLoL'];

    var DICT = {
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
        'Ver perfil': 'View profile',
        'Editar perfil': 'Edit profile',
        'Cerrar sesión': 'Sign out',
        'Cerrar sesion': 'Sign out',
        'Correo': 'Email',
        'Copiar': 'Copy',
        '¡Copiado!': 'Copied!',
        'Mi perfil': 'My profile',
        'Tu tarjeta, estilo Stevscon.': 'Your card, Stevscon style.',
        '← Volver a mi perfil': '← Back to my profile',
        'Sin nombre': 'No name',
        'DESCRIPCIÓN': 'DESCRIPTION',
        'Sin descripción aún.': 'No description yet.',
        'MIEMBRO DESDE': 'MEMBER SINCE',
        'GÉNERO': 'GENDER',
        'Sin especificar': 'Not specified',
        'Tu avatar': 'Your avatar',
        'Tu banner': 'Your banner',
        'Editar Perfil': 'Edit Profile',
        'Nombre de usuario': 'Username',
        'Biografia (max 300 caracteres)': 'Bio (max 300 characters)',
        'Ubicacion': 'Location',
        'Sitio web': 'Website',
        'Estado personalizado (max 100 caracteres)': 'Custom status (max 100 characters)',
        'Estado de presencia': 'Presence status',
        'En linea': 'Online',
        'Ausente': 'Away',
        'No molestar': 'Do not disturb',
        'Invisible': 'Invisible',
        'Asi te veran los demas.': 'This is how others will see you.',
        'Privacidad': 'Privacy',
        'Visibilidad del perfil': 'Profile visibility',
        'Publico': 'Public',
        'Solo amigos': 'Friends only',
        'Privado': 'Private',
        'Permitir solicitudes de amistad': 'Allow friend requests',
        'Si': 'Yes',
        'Permitir mensajes directos': 'Allow direct messages',
        'Todos': 'Everyone',
        'Nadie': 'Nobody',
        'Mostrar estado online': 'Show online status',
        'Cancelar': 'Cancel',
        'Guardar cambios': 'Save changes',
        'Subiendo avatar...': 'Uploading avatar...',
        'Avatar actualizado.': 'Avatar updated.',
        'Subiendo banner...': 'Uploading banner...',
        'Banner actualizado.': 'Banner updated.',
        'Guardando...': 'Saving...',
        'Perfil actualizado correctamente.': 'Profile updated successfully.',
        'No se pudo guardar el perfil.': 'Could not save the profile.',
        'Nombre visible': 'Display name',
        'Así te verán los demás en Stevscon.': 'This is how others will see you on Stevscon.',
        'Escribe tu nombre visible.': 'Type your display name.',
        'Cuéntale a Stevscon sobre ti...': 'Tell Stevscon about yourself...',
        'Guardar descripción': 'Save description',
        'Descripción actualizada.': 'Description updated.',
        'Masculino': 'Male',
        'Femenino': 'Female',
        'Otro': 'Other',
        'Prefiero no decirlo': 'Prefer not to say',
        'Guardar género': 'Save gender',
        'Género actualizado.': 'Gender updated.',
        'Subir imagen': 'Upload image',
        'Subiendo imagen...': 'Uploading image...',
        'Guardar avatar': 'Save avatar',
        'Guardar banner': 'Save banner',
        'Ese archivo no es una imagen.': 'That file is not an image.',
        'La imagen pesa demasiado (máximo 8 MB).': 'The image is too large (max 8 MB).',
        'No pudimos leer esa imagen.': "We couldn't read that image.",
        'Falta Firebase Storage: agrégalo a memory_acc.js y habilita Storage en la consola.': 'Firebase Storage is missing: add it to memory_acc.js and enable Storage in the console.',
        'Falta el cargador de imagenes (media_acc.js). Revisa el index.': 'The image uploader (media_acc.js) is missing. Check the index.',
        'Cambiar de cuenta': 'Switch account',
        'Tus cuentas guardadas en este dispositivo.': 'Your accounts saved on this device.',
        'Actual': 'Current',
        'Quitar de la lista': 'Remove from list',
        'No se pudo cambiar de cuenta.': 'Could not switch accounts.',
        'Esta cuenta aún no está guardada aquí.': 'This account is not saved here yet.',
        'Guardar': 'Save',
        'Todavía no tienes cuentas guardadas. Añade una abajo.': "You don't have any saved accounts yet. Add one below.",
        'Añadir cuenta': 'Add account',
        'Las contraseñas se guardan ofuscadas SOLO en este dispositivo. Nunca se suben a la web.': 'Passwords are saved obfuscated ONLY on this device. They are never uploaded to the web.',
        '← Volver a las cuentas': '← Back to accounts',
        'Guardar esta cuenta': 'Save this account',
        'Cuenta actual': 'Current account',
        'Correo o handler de la cuenta': 'Account email or handler',
        'correo@gmail.com o @handler': 'email@gmail.com or @handler',
        'Contraseña de esa cuenta': 'Password for that account',
        'Entrar y guardar': 'Sign in and save',
        'Entrando…': 'Signing in…',
        'No se pudo guardar la cuenta.': 'Could not save the account.',
        'Cuenta': 'Account',
        'Contraseña incorrecta para esa cuenta.': 'Incorrect password for that account.',
        'Esa cuenta ya no existe.': 'That account no longer exists.',
        'Demasiados intentos. Espera un momento y vuelve a intentar.': 'Too many attempts. Wait a moment and try again.',
        'Sin conexión con el servidor. Revisa tu internet.': 'No connection to the server. Check your internet.',
        'Ese correo no es válido.': 'That email is not valid.',
        'No se pudo completar el cambio de cuenta.': 'Could not complete the account switch.',
        'Escribe el correo o un @handler válido.': 'Type a valid email or @handler.',
        'No encontré el correo de ese handler. Entra con el CORREO de la cuenta.': "I couldn't find the email for that handler. Sign in with the account's EMAIL.",
        'No encontré ese handler. Prueba con el correo de la cuenta.': "I couldn't find that handler. Try with the account's email.",
        'No pude resolver ese handler. Entra con el correo de la cuenta.': "I couldn't resolve that handler. Sign in with the account's email.",
        'Firebase no está listo.': 'Firebase is not ready.',
        'Esta cuenta guardada se dañó. Añádela de nuevo.': 'This saved account got corrupted. Add it again.',
        'Escribe el correo o @handler de la cuenta.': "Type the account's email or @handler.",
        'Escribe la contraseña de esa cuenta.': "Type that account's password.",
        'Fundador de Stevscon — el orgullo de la web 💜': 'Founder of Stevscon — the pride of la web 💜',
        'OTORGADO ✓': 'GRANTED ✓',
        'SIN BADGE': 'NO BADGE',
        'Otorgar': 'Grant',
        'Quitar': 'Remove',
        'Solo el Owner puede manejar este badge': 'Only the Owner can manage this badge',
        'Badges — Orgullo de la web': 'Badges — Pride of the web',
        'Otorga insignias que se muestran en los perfiles': 'Grant badges shown on profiles',
        '@handler o UID del usuario…': '@handler or user UID…',
        'Buscar': 'Search',
        '❌ Usuario no encontrado. Prueba con su @handler exacto.': '❌ User not found. Try their exact @handler.',
        'Usuario cargado. Otorga o quita badges abajo.': 'User loaded. Grant or remove badges below.',
        '❌ No se pudo leer el usuario.': '❌ Could not read the user.',
        'Usuario': 'User',
        'No hay sesión iniciada.': 'No signed-in session.',
        'Solo Owner/Admins pueden manejar este badge.': 'Only Owner/Admins can manage this badge.',
        'ESTADO': 'STATUS',
        'Cambiar mi estado': 'Change my status',
        'Activo': 'Online',
        'Inactivo': 'Inactive',
        'Ocupado': 'Busy',
        'Desconectado': 'Offline',
        'Abrir Social': 'Open Social',
        'Tócame': 'Touch me',
        'Entrando a Social': 'Entering Social',
        'Psst… la carita se puede tocar.': 'Psst… you can touch the face.',
        'No pudimos abrir Social: falta category_posts.js. Revisa el index.': "We couldn't open Social: category_posts.js is missing. Check the index.",
        'SUERTE': 'LUCK',
        'CONSEJO': 'TIP',
        'PREGUNTA': 'QUESTION',
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
        'HappyFace: «¡Buen viaje, viajero!»': 'HappyFace: «Safe travels, traveler!»',
        'HappyFace: «Yo sonrío, tú postea.»': 'HappyFace: «I smile, you post.»',
        'HappyFace: «Me tienes en el corazón… y en el centro de esta pantalla.»': 'HappyFace: «You hold me in your heart… and at the center of this screen.»',
        'HappyFace: «Eso, picándole. Ya casi.»': 'HappyFace: «That is it, keep tapping. Almost there.»',
        'EASTER EGG: Encontraste la carita dorada de la fortuna. Hoy nadie te niega un like.': 'EASTER EGG: You found the golden face of fortune. Today nobody can deny you a like.',
        'Abriendo el Social…': 'Opening Social…',
        'Abriendo el Social...': 'Opening Social...'
    };

    var ATTRS = ['placeholder', 'title', 'aria-label'];
    var STORE_KEYS = ['stevscon_lang', 'sc_lang'];
    var CACHE_PREFIX = 'sc_tr_';
    var MAX_TEXT = 900;
    var CONCURRENCY = 4;
    var FAIL_BACKOFF = 30000;

    function hasKey(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

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
        try { for (var i = 0; i < STORE_KEYS.length; i++) localStorage.setItem(STORE_KEYS[i], v); } catch (e) {}
    }

    var lang = readStore() || 'es';

    var originals = new WeakMap();
    var attrOriginals = new WeakMap();
    var mem = Object.create(null);

    var DM_SELECTORS = '.scdm-win, #conversations-list, #chat-area';
    function inDM(el) {
        return !!(el && el.closest && el.closest(DM_SELECTORS));
    }

    var nameSet = Object.create(null);
    var NAMES_KEY = 'stevscon_names_v1';
    function rememberName(t) {
        var s = String(t || '').trim();
        if (s.length < 2 || s.length > 40) return;
        if (s.charAt(0) === '@') s = s.slice(1);
        s = s.trim();
        if (s.length < 2) return;
        if (hasKey(nameSet, s.toLowerCase())) return;
        nameSet[s.toLowerCase()] = 1;
        try { localStorage.setItem(NAMES_KEY, JSON.stringify(Object.keys(nameSet).slice(0, 400))); } catch (e) {}
    }
    function isName(s) { return hasKey(nameSet, String(s || '').trim().toLowerCase()); }
    function isNameLikeToken(s) {
        if (/\s/.test(s)) return false;
        if (!/^[A-Za-z][A-Za-z0-9_.-]{1,24}$/.test(s)) return false;
        if (!/[a-z]/.test(s) || !/[A-Z]/.test(s)) return false;
        return /[a-z][A-Z]/.test(s);
    }
    function loadNames() {
        try {
            var arr = JSON.parse(localStorage.getItem(NAMES_KEY) || '[]');
            if (Array.isArray(arr)) for (var i = 0; i < arr.length && i < 400; i++) nameSet[String(arr[i]).toLowerCase()] = 1;
        } catch (e) {}
    }
    function learnFromText(t) {
        var s = String(t || '');
        if (s.indexOf('@') < 0) return;
        var re = /(?:^|\s)@([\w.-]{2,30})(?=[\s.,!?…]|$)/g;
        var m, n = 0;
        while ((m = re.exec(s)) !== null && n < 10) { rememberName(m[1]); n++; }
    }
    function learnNamesUnder(root) {
        if (!root) return;
        if (root.nodeType === 3) {
            if (root.parentNode && inDM(root.parentNode)) return;
            learnFromText(root.nodeValue);
            return;
        }
        if (root.nodeType !== 1 || skipEl(root)) return;
        try {
            var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            var node = w.nextNode();
            while (node) {
                if (!(node.parentNode && inDM(node.parentNode))) learnFromText(node.nodeValue);
                node = w.nextNode();
            }
        } catch (e) {}
    }
    function isIdentityEl(el) {
        return !!(el && el.nodeType === 1 && el.hasAttribute && el.hasAttribute('data-scsoc-profile'));
    }
    function hookIdentityPainters() {
        try {
            var S = window.SCSOC;
            if (S && typeof S.userHead === 'function' && !S.userHead.__sctrHook) {
                var orig = S.userHead;
                S.userHead = function () {
                    var el = orig.apply(this, arguments);
                    try {
                        if (el && el.setAttribute) el.setAttribute('data-sctr-skip', '1');
                        if (el && el.textContent) learnFromText(el.textContent);
                    } catch (e) {}
                    return el;
                };
                S.userHead.__sctrHook = true;
            }
        } catch (e) {}
        try {
            var SCp = window.StevsconProfiles;
            if (SCp && SCp.ui && typeof SCp.ui.renderProfileCard === 'function' && !SCp.ui.__sctrNameGuard) {
                var orig2 = SCp.ui.renderProfileCard;
                SCp.ui.renderProfileCard = function (container) {
                    var out = orig2.apply(this, arguments);
                    var mark = function () {
                        try {
                            var rootEl = (container && container.querySelector) ? container : (out && out.querySelector ? out : null);
                            if (!rootEl) return;
                            var h3 = rootEl.querySelector('h3');
                            if (h3 && h3.textContent && h3.textContent.trim().toLowerCase() !== 'sin nombre') {
                                h3.setAttribute('translate', 'no');
                                h3.setAttribute('data-sctr-skip', '1');
                                rememberName(h3.textContent);
                            }
                        } catch (e) {}
                    };
                    mark(); setTimeout(mark, 0); setTimeout(mark, 400);
                    return out;
                };
                SCp.ui.__sctrNameGuard = true;
            }
        } catch (e) {}
    }


    function cacheGet(key) {
        if (isName(key)) return key;
        if (hasKey(mem, key)) return mem[key];
        if (hasKey(DICT, key)) { mem[key] = DICT[key]; return DICT[key]; }
        try {
            var v = localStorage.getItem(CACHE_PREFIX + key);
            if (v !== null) { mem[key] = v; return v; }
        } catch (e) {}
        return null;
    }
    function cacheSet(key, val) {
        mem[key] = val;
        try { localStorage.setItem(CACHE_PREFIX + key, val); }
        catch (e) { purgeDiskCache(); try { localStorage.setItem(CACHE_PREFIX + key, val); } catch (e2) {} }
    }
    function purgeCorruptCache() {
        try {
            if (localStorage.getItem('sc_tr_clean_v3')) return;
            var kill = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(CACHE_PREFIX) === 0) kill.push(k);
            }
            for (var j = 0; j < kill.length; j++) localStorage.removeItem(kill[j]);
            localStorage.setItem('sc_tr_clean_v3', '1');
        } catch (e) {}
    }
    function purgeDiskCache() {
        try {
            var kill = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(CACHE_PREFIX) === 0) kill.push(k);
            }
            for (var j = 0; j < kill.length; j++) localStorage.removeItem(kill[j]);
        } catch (e) {}
    }


    function apiTranslate(text) {
        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text);
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (data) {
            var segs = data && data[0];
            if (!segs) throw new Error('respuesta invalida');
            var out = '';
            for (var i = 0; i < segs.length; i++) {
                if (segs[i] && segs[i][0]) out += segs[i][0];
            }
            return fixEN(out);
        });
    }

    var waiting = Object.create(null);
    var failed = Object.create(null);
    var q = [];
    var inFlight = 0;

    function onReady(key, fn) {
        var en = cacheGet(key);
        if (en !== null) { fn(en); return; }
        if (hasKey(failed, key) && Date.now() - failed[key] < FAIL_BACKOFF) return;
        if (!hasKey(waiting, key)) { waiting[key] = []; q.push(key); pump(); }
        waiting[key].push(fn);
    }
    function pump() {
        while (inFlight < CONCURRENCY && q.length) {
            var key = q.shift();
            inFlight++;
            (function (k) {
                apiTranslate(k).then(function (en) {
                    cacheSet(k, en);
                    var subs = waiting[k] || [];
                    delete waiting[k];
                    delete failed[k];
                    for (var i = 0; i < subs.length; i++) { try { subs[i](en); } catch (e) {} }
                }).catch(function () {
                    delete waiting[k];
                    failed[k] = Date.now();
                    console.warn('[Stevscon translate] Google no respondio para:', JSON.stringify(k.slice(0, 60)));
                }).then(function () { inFlight--; pump(); });
            })(key);
        }
    }


    function skipEl(el) {
        if (!el || el.nodeType !== 1) return false;
        if (inDM(el)) return true;
        if (el.closest && el.closest('[data-scsoc-profile]')) return true;
        if (el.closest && el.closest('[data-sctr-skip]')) return true;
        if (el.closest && el.closest('[translate="no"]')) return true;
        if (el.closest && el.closest('.notranslate')) return true;
        return false;
    }
    function nodeSkipped(node) {
        var p = node.parentNode;
        if (p && inDM(p)) return true;
        while (p) {
            if (p.nodeType === 1) {
                if (isIdentityEl(p)) {
                    if (p === node.parentNode) rememberName(node.nodeValue);
                    return true;
                }
                if (p.hasAttribute && (p.hasAttribute('data-sctr-skip') || p.getAttribute('translate') === 'no')) return true;
                if (p.className && typeof p.className === 'string' && p.className.indexOf('notranslate') >= 0) return true;
            }
            p = p.parentNode;
        }
        return false;
    }
    var PROTECT = ['stevscon.wiki', 'stevscon.com', 'stevscon', '.wiki', '.com', 'wiki'];
    function isProtected(t) {
        var s = t.trim().toLowerCase();
        for (var i = 0; i < PROTECT.length; i++) if (s === PROTECT[i]) return true;
        return false;
    }
    function fixEN(t) {
        return String(t)
            .replace(/stevscon\s*\.\s*week/gi, 'Stevscon.wiki')
            .replace(/\.week\b/gi, '.wiki');
    }

    function translatable(t) {
        if (!t) return false;
        var s = t.trim();
        if (s.length < 2 || s.length > MAX_TEXT) return false;
        if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(s)) return false;
        if (/^https?:\/\//i.test(s)) return false;
        if (/^[^\s]+@[^\s]+\.[^\s]+$/.test(s)) return false;
        if (/^@[\w.-]{2,}$/.test(s)) return false;
        if (isProtected(s)) return false;
        if (isName(s)) return false;
        if (isNameLikeToken(s)) return false;
        return true;
    }


    function ws(t) {
        var m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
        return m ? { a: m[1], b: m[2], c: m[3] } : { a: '', b: t, c: '' };
    }

    function translateTextNode(node) {
        if (!node || node.nodeType !== 3) return;
        var cur = node.nodeValue;
        if (!cur || !cur.trim()) return;
        if (nodeSkipped(node)) return;
        learnFromText(cur);
        if (!translatable(cur)) return;

        if (originals.has(node)) {
            var prev = originals.get(node);
            if (cur !== prev) {
                var pp = ws(prev);
                var enPrev = cacheGet(pp.b);
                if (enPrev === null || pp.a + enPrev + pp.c !== cur) {
                    originals.set(node, cur);
                }
            }
        } else {
            originals.set(node, cur);
        }
        var sp = ws(originals.get(node));
        if (lang !== 'en') return;

        var key = sp.b;
        var self = node;
        onReady(key, function (en) {
            if (lang !== 'en') return;
            var o = originals.get(self);
            if (o === undefined || ws(o).b !== key) return;
            var p = ws(o);
            var next = p.a + en + p.c;
            if (self.nodeValue !== next) self.nodeValue = next;
        });
    }

    function translateAttr(el, name) {
        if (!el || el.nodeType !== 1) return;
        var cur = el.getAttribute(name);
        if (cur === null || !cur.trim()) return;
        if (skipEl(el)) return;
        var store = attrOriginals.get(el) || {};
        if (!store[name]) store[name] = cur;
        attrOriginals.set(el, store);
        if (lang !== 'en') return;

        var original = store[name];
        if (!translatable(original)) return;
        var p = ws(original), key = p.b;
        var self = el, nm = name;
        onReady(key, function (en) {
            if (lang !== 'en') return;
            var o = attrOriginals.get(self);
            if (!o || !o[nm] || ws(o[nm]).b !== key) return;
            var op = ws(o[nm]);
            var next = op.a + en + op.c;
            if (self.getAttribute(nm) !== next) self.setAttribute(nm, next);
        });
    }

    function scanNode(root) {
        if (!root) return;
        if (root.nodeType === 3) { translateTextNode(root); return; }
        if (root.nodeType !== 1) return;
        if (skipEl(root)) return;
        var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var n = w.nextNode();
        while (n) { translateTextNode(n); n = w.nextNode(); }
        var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (!el.getAttribute || skipEl(el)) continue;
            for (var a = 0; a < ATTRS.length; a++) {
                if (el.hasAttribute(ATTRS[a])) translateAttr(el, ATTRS[a]);
            }
        }
    }

    function restoreAll() {
        var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        var n = w.nextNode();
        while (n) {
            if (originals.has(n) && n.nodeValue !== originals.get(n)) n.nodeValue = originals.get(n);
            n = w.nextNode();
        }
        var all = document.body.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var store = attrOriginals.get(all[i]);
            if (!store) continue;
            for (var k in store) {
                if (hasKey(store, k) && all[i].getAttribute(k) !== store[k]) all[i].setAttribute(k, store[k]);
            }
        }
    }

    function applyAll() {
        if (lang === 'en') scanNode(document.body); else restoreAll();
    }


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
            var hadLocalChoice = readStore() !== null;
            FB.auth.onAuthStateChanged(function (u) {
                if (!u || !FB.database || hadLocalChoice) return;
                FB.database.ref('users/' + u.uid + '/settings/lang').once('value').then(function (s) {
                    var v = s.val();
                    if ((v === 'en' || v === 'es') && v !== lang) setLang(v);
                }).catch(function () {});
            });
        } catch (e) {}
    }


    var batch = [], pending = false;
    function schedule(records) {
        batch = batch.concat(records);
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(function () {
            pending = false;
            var recs = batch; batch = [];
            var i, j, rec;
            for (i = 0; i < recs.length; i++) {
                rec = recs[i];
                if (rec.type === 'childList') {
                    for (j = 0; j < rec.addedNodes.length; j++) learnNamesUnder(rec.addedNodes[j]);
                } else if (rec.type === 'characterData') {
                    if (!(rec.target && rec.target.parentNode && inDM(rec.target.parentNode))) {
                        learnFromText(rec.target && rec.target.nodeValue);
                    }
                }
            }
            for (i = 0; i < recs.length; i++) {
                rec = recs[i];
                if (rec.type === 'childList') {
                    for (j = 0; j < rec.addedNodes.length; j++) scanNode(rec.addedNodes[j]);
                } else if (rec.type === 'characterData') {
                    translateTextNode(rec.target);
                } else if (rec.type === 'attributes') {
                    var name = rec.attributeName;
                    if (ATTRS.indexOf(name) >= 0) translateAttr(rec.target, name);
                }
            }
        });
    }


    window.StevsconTranslate = {
        version: VERSION,
        get: function () { return lang; },
        set: setLang,
        toggle: function () { setLang(lang === 'es' ? 'en' : 'es'); },
        protect: function (name) { rememberName(name); return true; },
        names: function () { return Object.keys(nameSet); },
        diagnose: function () {
            var disk = 0;
            try { for (var i = 0; i < localStorage.length; i++) if (localStorage.key(i).indexOf(CACHE_PREFIX) === 0) disk++; } catch (e) {}
            console.log('=== StevsconTranslate diagnose ===');
            console.log('- version:', VERSION, '| idioma:', lang);
            console.log('- diccionario base:', Object.keys(DICT).length, 'entradas (sin API)');
            console.log('- cache memoria:', Object.keys(mem).length, '| cache localStorage:', disk);
            console.log('- cola Google pendiente:', q.length, '| en vuelo:', inFlight);
            console.log('- nombres protegidos:', Object.keys(nameSet).length, '->', Object.keys(nameSet).slice(0, 20));
            console.log('- zonas MD excluidas:', DM_SELECTORS, '| drawer abierto:', !!document.querySelector('.scdm-win'));
        },
        debug: function () {
            console.log('[Stevscon translate] debug: los fallos de Google se imprimen con console.warn. Los textos >' + MAX_TEXT + ' caracteres, los @handles/correos/URLs, los NOMBRES DE USUARIO y TODO el MD (.scdm-win) se omiten por diseño.');
        }
    };
    try { window.StevsconLang = window.StevsconTranslate; } catch (e) {}


    function init() {
        purgeCorruptCache();
        loadNames();
        for (var i = 0; i < PROTECTED_NAMES.length; i++) rememberName(PROTECTED_NAMES[i]);
        document.documentElement.setAttribute('lang', lang);
        learnNamesUnder(document.body);
        applyAll();
        initFromFirebase();
        (function waitPainters(n) {
            hookIdentityPainters();
            if (n < 20) setTimeout(function () { waitPainters(n + 1); }, 500);
        })(0);
        var mo = new MutationObserver(schedule);
        mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['class', 'hidden']) });
        console.log('[Stevscon] translate.js listo (v' + VERSION + ' · ' + Object.keys(DICT).length + ' entradas base + Google automatico · nombres protegidos · MD intocable).');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(window, document);