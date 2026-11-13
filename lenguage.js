/**
 * ====
 * STEVSCON.COM - lenguage.js  (RAIZ del proyecto)
 * IDIOMA · Traduccion ES/EN de TODA la web en UN solo file · v4
 * - v4 PROFILES: agrega el diccionario COMPLETO de profiles (modal Mi
 *   perfil, modal Editar Perfil, campo username/crear cuenta, descripcion,
 *   genero, avatar, banner, panel Cambiar de cuenta, panel de Badges,
 *   estados de presencia y errores de Firebase). Profiles corre dentro del
 *   index, asi que NO necesita files extra: este mismo file lo cubre todo.
 * - v3 BIDIRECCIONAL: diccionario espanol -> ingles + inverso automatico
 *   (ingles -> espanol) para restaurar textos pintados en ingles.
 * - v3 SINCRONIZADO: guarda AMBAS claves ('stevscon_lang' y 'sc_lang').
 * - v3 TU ELECCION MANDA: Firebase solo aplica si nunca elegiste idioma.
 * - Nota de diseno: el GENERO y los ESTADOS se guardan en Firebase con su
 *   valor espanol (asi la base de datos no se mezcla); aqui se traduce solo
 *   lo que se MUESTRA. Cero migracion de datos.
 * - StevsconLang.diagnose() / StevsconLang.debug() igual que siempre.
 * Tag EXACTO en index: <script defer src="lenguage.js?v=4"></script>
 * ====
 */
(function (window, document) {
    'use strict';

    var VERSION = 4;

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
        '¡Copiado!': 'Copied!',

        // Perfiles · tarjeta (ui_profile v3 · SCp.ui.renderProfileCard)
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

        // Perfiles · modal Editar Perfil (UIProfile)
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

        // Perfiles · EDIT · username (crear cuenta), descripcion, genero
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

        // Perfiles · EDIT · avatar y banner (subida de imagen)
        'Subir imagen': 'Upload image',
        'Subiendo imagen...': 'Uploading image...',
        'Guardar avatar': 'Save avatar',
        'Guardar banner': 'Save banner',
        'Ese archivo no es una imagen.': 'That file is not an image.',
        'La imagen pesa demasiado (máximo 8 MB).': 'The image is too large (max 8 MB).',
        'No pudimos leer esa imagen.': "We couldn't read that image.",
        'Falta Firebase Storage: agrégalo a memory_acc.js y habilita Storage en la consola.': 'Firebase Storage is missing: add it to memory_acc.js and enable Storage in the console.',
        'Falta el cargador de imagenes (media_acc.js). Revisa el index.': 'The image uploader (media_acc.js) is missing. Check the index.',

        // Perfiles · panel Cambiar de cuenta (panel.js)
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

        // Perfiles · motor de switch (switch.js · errores)
        'Contraseña incorrecta para esa cuenta.': 'Incorrect password for that account.',
        'Esa cuenta ya no existe.': 'That account no longer exists.',
        'Demasiados intentos. Espera un momento y vuelve a intentar.': 'Too many attempts. Wait a moment and try again.',
        'Sin conexión con el servidor. Revisa tu internet.': 'No connection to the server. Check your internet.',
        'Ese correo no es válido.': 'That email is not valid.',
        'No se pudo completar el cambio de cuenta.': 'Could not complete the account switch.',
        'Escribe el correo o un @handler válido.': 'Type a valid email or @handler.',
        'No encontré el correo de ese handler. Entra con el CORREO de la cuenta.': "I couldn't find the email for that handler. Sign in with the account's EMAIL.",
        'No encontré ese handler. Prueba con el correo de la cuenta.': "I couldn't find that handler. Try the account's email.",
        'No pude resolver ese handler. Entra con el correo de la cuenta.': "I couldn't resolve that handler. Sign in with the account's email.",
        'Firebase no está listo.': 'Firebase is not ready.',
        'Esta cuenta guardada se dañó. Añádela de nuevo.': 'This saved account got corrupted. Add it again.',
        'Escribe el correo o @handler de la cuenta.': "Type the account's email or @handler.",
        'Escribe la contraseña de esa cuenta.': "Type that account's password.",

        // Badges · catalogo + panel 👑 (badges_core / system / manage)
        'Fundador de Stevscon — el orgullo de la web 💜': 'Founder of Stevscon — the pride of the web 💜',
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

        // Estado de presencia (status_online + online/inactive/busy/offline)
        'ESTADO': 'STATUS',
        'Cambiar mi estado': 'Change my status',
        'Activo': 'Online',
        'Inactivo': 'Inactive',
        'Ocupado': 'Busy',
        'Desconectado': 'Offline',

        // ---- Social · la puerta (category_social.js) ----
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

    // ---- Inverso automatico: ingles -> espanol ----
    var REV = {};
    (function () {
        for (var k in DICT) {
            if (hasKey(DICT, k) && !hasKey(REV, DICT[k])) REV[DICT[k]] = k;
        }
    })();

    // ---- Textos con partes dinamicas (usernames, IDs, numeros, emails) ----
    var PATTERNS = [
        { re: /^¡Cuenta creada! Bienvenido, (.+) \(ID: (\d+)\)$/, en: 'Account created! Welcome, $1 (ID: $2)',
          revRe: /^Account created! Welcome, (.+) \(ID: (\d+)\)$/, es: '¡Cuenta creada! Bienvenido, $1 (ID: $2)' },
        { re: /^ID copiado: (.+)$/, en: 'ID copied: $1',
          revRe: /^ID copied: (.+)$/, es: 'ID copiado: $1' },

        // Profiles · crear cuenta / username
        { re: /^Muy corto: mínimo (\d+) caracteres\.$/, en: 'Too short: minimum $1 characters.',
          revRe: /^Too short: minimum (\d+) characters\.$/, es: 'Muy corto: mínimo $1 caracteres.' },
        { re: /^Perfecto, ¡hola (.+)!$/, en: 'Perfect, hello $1!',
          revRe: /^Perfect, hello (.+)!$/, es: 'Perfecto, ¡hola $1!' },
        { re: /^El nombre debe tener al menos (\d+) caracteres\.$/, en: 'The name must be at least $1 characters.',
          revRe: /^The name must be at least (\d+) characters\.$/, es: 'El nombre debe tener al menos $1 caracteres.' },
        { re: /^El nombre no puede pasar de (\d+) caracteres\.$/, en: 'The name cannot exceed $1 characters.',
          revRe: /^The name cannot exceed (\d+) characters\.$/, es: 'El nombre no puede pasar de $1 caracteres.' },

        // Profiles · errores con detalle tecnico
        { re: /^No se pudo guardar\. Detalle: (.+)$/, en: 'Could not save. Detail: $1',
          revRe: /^Could not save\. Detail: (.+)$/, es: 'No se pudo guardar. Detalle: $1' },
        { re: /^No se pudo subir la imagen\. Detalle: (.+)$/, en: 'Could not upload the image. Detail: $1',
          revRe: /^Could not upload the image\. Detail: (.+)$/, es: 'No se pudo subir la imagen. Detalle: $1' },

        // Profiles · switch de cuentas con numeros
        { re: /^(\d+) de (\d+) cuentas guardadas \(según tu rango\)\.$/, en: '$1 of $2 accounts saved (based on your rank).',
          revRe: /^(\d+) of (\d+) accounts saved \(based on your rank\)\.$/, es: '$1 de $2 cuentas guardadas (según tu rango).' },
        { re: /^Llegaste a tu límite de (\d+) cuentas guardadas \(según tu rango\)\. Quítala una para añadir otra\.$/,
          en: 'You reached your limit of $1 saved accounts (based on your rank). Remove one to add another.',
          revRe: /^You reached your limit of (\d+) saved accounts \(based on your rank\)\. Remove one to add another\.$/,
          es: 'Llegaste a tu límite de $1 cuentas guardadas (según tu rango). Quítala una para añadir otra.' },

        // Badges · feedback dinámico del panel 👑
        { re: /^✅ Badge "(.+)" otorgado a (.+)\. Se ve AL INSTANTE en su perfil\.$/,
          en: '✅ Badge "$1" granted to $2. It shows INSTANTLY on their profile.',
          revRe: /^✅ Badge "(.+)" granted to (.+)\. It shows INSTANTLY on their profile\.$/,
          es: '✅ Badge "$1" otorgado a $2. Se ve AL INSTANTE en su perfil.' },
        { re: /^🗑️ Badge "(.+)" quitado a (.+)\.$/, en: '🗑️ Badge "$1" removed from $2.',
          revRe: /^🗑️ Badge "(.+)" removed from (.+)\.$/, es: '🗑️ Badge "$1" quitado a $2.' },
        { re: /^❌ No se pudo otorgar: (.+)$/, en: '❌ Could not grant: $1',
          revRe: /^❌ Could not grant: (.+)$/, es: '❌ No se pudo otorgar: $1' },
        { re: /^❌ No se pudo quitar: (.+)$/, en: '❌ Could not remove: $1',
          revRe: /^❌ Could not remove: (.+)$/, es: '❌ No se pudo quitar: $1' },
        { re: /^❌ No se pudo leer los badges: (.+)$/, en: '❌ Could not read badges: $1',
          revRe: /^❌ Could not read badges: (.+)$/, es: '❌ No se pudo leer los badges: $1' },
        { re: /^❌ Solo el Owner \((.+)\) puede manejar el badge Owner\.$/, en: '❌ Only the Owner ($1) can manage the Owner badge.',
          revRe: /^❌ Only the Owner \((.+)\) can manage the Owner badge\.$/, es: '❌ Solo el Owner ($1) puede manejar el badge Owner.' },
        { re: /^Solo el Owner \((.+)\) puede manejar el badge Owner\.$/, en: 'Only the Owner ($1) can manage the Owner badge.',
          revRe: /^Only the Owner \((.+)\) can manage the Owner badge\.$/, es: 'Solo el Owner ($1) puede manejar el badge Owner.' },
        { re: /^Badge desconocido: "(.+)"\.$/, en: 'Unknown badge: "$1".',
          revRe: /^Unknown badge: "(.+)"\.$/, es: 'Badge desconocido: "$1".' },

        // Badges · tooltip con fecha
        { re: /^Otorgado el (.+)$/, en: 'Awarded on $1',
          revRe: /^Awarded on (.+)$/, es: 'Otorgado el $1' }
    ];

    var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

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

    var originals = new WeakMap();
    var attrOriginals = new WeakMap();
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

    // ---- MENU del avatar: deteccion POR CONTENIDO en AMBOS idiomas ----

    function looksLikeMenu(el) {
        if (!el || el.nodeType !== 1 || !el.textContent) return false;
        var t = el.textContent;
        if (!/ver\s+perfil|view\s+profile/i.test(t)) return false;
        return (/editar\s+perfil|edit\s+profile/i.test(t) || /cerrar\s+sesi|sign\s+out/i.test(t));
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
            console.log('- Si nada de esto aparece, revisa que index tenga: <script defer src="lenguage.js?v=4"></script> (nombre EXACTO)');
        },
        debug: function () {
            debugOn = true;
            debugSeen = {};
            console.log('[Stevscon i18n] debug ON. Recorre la home, el modal Mi perfil, Editar Perfil, Cambiar de cuenta, el panel 👑 y el ESTADO: cada texto sin traducir se imprimira aqui. Pasame esa lista y amplio el diccionario.');
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