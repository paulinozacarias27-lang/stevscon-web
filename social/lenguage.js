/* ====
   STEVSCON.COM — social/lenguage.js (v1)
   TRADUCTOR ES/EN de TODO el Social, en UN solo file.
   - No toca ningún otro file: observa el DOM (MutationObserver) y
     cambia cada texto con nodeValue/textContent (NUNCA innerHTML).
   - El texto de usuarios NO se altera: solo se traducen los strings
     exactos de la interfaz (diccionario) y sus patrones dinámicos
     ("5 me gusta", "hace 3 min", "Activo 2h 15m", "Motivo: ...", etc.).
   - Idioma PERMANENTE: se guarda en la MISMA clave de localStorage
     que el lenguage.js principal (LANG_KEY, más abajo).
   - Píldora ES/EN fija abajo a la derecha (right:18px;bottom:18px),
     el mismo punto del toggle principal: la corona de badges que
     subimos a bottom:74px convive con ella sin taparse.
   - Al cambiar, dispara 'sc:lang-changed' y escucha 'storage'
     (cambiar el idioma en otra pestaña actualiza esta también).
   - API: SCSOC.lang.get() · set('es'|'en') · t(texto)
   Cargar PRIMERO en social.html (en el <head>, antes del stack).
   ==== */
(function (window, document) {
    'use strict';

    var SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.lang) return;

    /* ⚠️ SINCRONIZACIÓN CON EL LENGUAJE PRINCIPAL:
     * esta es la clave compartida. Si tu lenguage.js de la raíz usa
     * otra clave (p.ej. 'lang' o 'stevscon_lang'), cambia SOLO esta
     * línea y los dos toggles quedan conectados al mismo idioma.
     * (Al arranque también revisa las claves candidatas de abajo
     * por si tu file principal ya guardó con otro nombre.) */
    var LANG_KEY = 'sc_lang';
    var CANDIDATES = ['lang', 'language', 'stevscon_lang', 'sc_lenguage', 'lenguage'];

    var lang = 'es';

    /* ============ DICCIONARIO EXACTO (texto completo -> EN) ============ */
    var DICT = {
        /* — Página / arranque (social.html, category_posts.js) — */
        'Abriendo el Social…': 'Opening Social…',
        'Algo falló:': 'Something broke:',
        'El Social no pudo arrancar. Revisa que existan y se carguen EN ORDEN: numbers.js, utils.js, verified.js, likes.js, comments.js, responses.js, edit (post y comment), profiles_show.js, admin_post.js y social/manage/posts/category_posts.js. Pulsa F12 > Console/Network para ver qué file falló (404).': 'Social could not start. Check that these exist and load IN ORDER: numbers.js, utils.js, verified.js, likes.js, comments.js, responses.js, edit (post and comment), profiles_show.js, admin_post.js and social/manage/posts/category_posts.js. Open F12 > Console/Network to see which file failed (404).',
        'El Social no pudo arrancar su motor. Revisa que existan y se carguen EN ORDEN en el index: numbers.js, utils.js, likes.js, comments.js, responses.js, profiles_show.js y admin_post.js.': 'Social could not start its engine. Check that these exist and load IN ORDER on the index: numbers.js, utils.js, likes.js, comments.js, responses.js, profiles_show.js and admin_post.js.',
        'Volver': 'Back',
        'EN VIVO': 'LIVE',
        'Feed en tiempo real': 'Real-time feed',
        'Cargando el feed...': 'Loading the feed...',
        'Abrir Social': 'Open Social',
        'Tócame': 'Touch me',
        'Psst… la carita se puede tocar.': 'Psst… the smiley can be touched.',
        'Entrando a Social…': 'Entering Social…',

        /* — Feed / composer / edición — */
        'Publicar': 'Publish',
        'Postear': 'Post',
        'POSTEAR': 'POST',
        'Cerrrar': 'Close',
        'Cerrar': 'Close',
        'Cargando editor…': 'Loading editor…',
        'Publica algo para la comunidad...': 'Post something for the community...',
        'Solo el staff puede publicar.': 'Only staff can post.',
        'Escribe algo antes de publicar.': 'Write something before posting.',
        'Publicado ✓': 'Posted ✓',
        'No hay publicaciones todavía.': 'No posts yet.',
        '· editado': '· edited',
        'Responder': 'Reply',
        'Escribe un comentario...': 'Write a comment...',
        'Comentar': 'Comment',
        'Comentario muy largo.': 'Comment too long.',
        'Inicia sesión para poder comentar.': 'Log in to comment.',
        'Cancelar': 'Cancel',
        'Guardar': 'Save',
        'No puede quedar vacío.': "This can't be left empty.",
        'Editar post': 'Edit post',
        'Multimedia': 'Media',
        'Multimedia del post': 'Post media',
        'Guardar multimedia': 'Save media',
        'Multimedia actualizada ✓': 'Media updated ✓',
        'Multimedia demasiado pesada para este post (límite ~2.8 MB).': 'Media is too heavy for this post (limit ~2.8 MB).',
        'No se pudo guardar (¿archivos muy pesados para la BD?).': "Couldn't save (files too heavy for the DB?).",
        'Imágenes o videos (máx 10)': 'Images or videos (max 10)',
        'Máximo 10 archivos por post.': 'Max 10 files per post.',
        'El post llegó a su límite de multimedia (~2.8 MB).': 'The post reached its media limit (~2.8 MB).',
        'Video muy pesado (máx 2 MB).': 'Video too heavy (max 2 MB).',
        'Imagen muy pesada incluso comprimida.': 'Image too heavy even compressed.',
        'Ese GIF es muy pesado (máx ~90KB).': 'That GIF is too heavy (max ~90KB).',
        'Archivo no válido (solo imágenes o videos).': 'Invalid file (images or videos only).',
        'Imagen del post': 'Post image',
        'Quitar': 'Remove',
        'Necesitas una cuenta para interactuar 🔒': 'You need an account to interact 🔒',
        'Usuario': 'User',
        'Verificado': 'Verified',
        'Mención': 'Mention',

        /* — Perfiles — */
        'Cargando perfil...': 'Loading profile...',
        'DESCRIPCIÓN': 'DESCRIPTION',
        'MIEMBRO DESDE': 'MEMBER SINCE',
        'GÉNERO': 'GENDER',
        'Sin descripción aún.': 'No description yet.',
        'Sin especificar': 'Not specified',
        'Sin handler aún': 'No handler yet',
        'En línea': 'Online',
        'Inactivo': 'Inactive',
        'Ocupado': 'Busy',
        'Desconectado': 'Offline',

        /* — Reportes públicos (report_menu.js + modal de MD) — */
        'MOTIVO': 'REASON',
        'DETALLE (OPCIONAL)': 'DETAIL (OPTIONAL)',
        'Enviar reporte': 'Send report',
        'Elige un motivo primero.': 'Pick a reason first.',
        'Elige un motivo para el reporte.': 'Pick a reason for the report.',
        'Reportas demasiado, espera un dia para reportar': 'You are reporting too much, wait a day to report',
        'Reporte enviado. Gracias por cuidar la comunidad ✓': 'Report sent. Thanks for looking after the community ✓',
        'Reporte enviado ✓ — el staff lo revisará.': 'Report sent ✓ — staff will review it.',
        'No se pudo enviar el reporte.': "Couldn't send the report.",
        'Ya reportaste este mensaje hace un momento.': 'You already reported this message a moment ago.',
        'Ya reportaste a esta persona hace un momento.': 'You already reported this person a moment ago.',
        'Reportar mensaje': 'Report message',
        'El staff lo revisará y tomará acción.': 'Staff will review it and take action.',
        'Motivo del reporte': 'Report reason',
        'Detalle extra (opcional)...': 'Extra detail (optional)...',
        'Enviando…': 'Sending…',
        'Reportar': 'Report',
        'Ofensivo': 'Offensive',
        'Spam': 'Spam',
        'Acoso': 'Harassment',
        'Inapropiado': 'Inappropriate',
        'Otros': 'Other',

        /* — Mensajes Directos (md_ui / md_core / md_tabs / md_actions) — */
        'MENSAJES DIRECTOS': 'DIRECT MESSAGES',
        'Mensajes Directos': 'Direct Messages',
        'Privados · ventana de 10 horas por MD': 'Private · 10-hour window per DM',
        'Aún no tienes MDs. Abre el perfil de cualquier usuario del Social y toca «Mensaje» para empezar una conversación privada.': "You have no DMs yet. Open any user's profile on Social and tap «Message» to start a private conversation.",
        'Vista previa oculta': 'Preview hidden',
        'Conversación nueva': 'New conversation',
        'EXPIRADO': 'EXPIRED',
        'Activo menos de 1m': 'Active for less than 1m',
        'Amigos': 'Friends',
        'Amigos ✓': 'Friends ✓',
        'MD temporales': 'Temporary DMs',
        'Ignorados': 'Ignored',
        'Quiere ser tu amigo': 'Wants to be your friend',
        'SOLICITUD DE AMISTAD': 'FRIEND REQUEST',
        'Solicitud de amistad': 'Friend request',
        'Solicitud enviada ✓': 'Request sent ✓',
        'Aceptar solicitud': 'Accept request',
        '¿Cancelar solicitud?': 'Cancel request?',
        '¿Quitar amigo?': 'Remove friend?',
        'Mensaje': 'Message',
        'Mensaje privado para esta persona...': 'Private message for this person...',
        'Enviar': 'Send',
        'Volver a la lista': 'Back to the list',
        'Bloquear': 'Block',
        'Desbloquear': 'Unblock',
        'Ignorar': 'Ignore',
        '¿Seguro?': 'Sure?',
        'Las Solicitudes de Amistad llegan muy pronto.': 'Friend Requests are coming very soon.',
        'Este MD expiró (10 horas). Para volver a hablar con esta persona, envíale una Solicitud de Amistad.': 'This DM expired (10 hours). To talk with this person again, send them a Friend Request.',
        'Este MD expiró: envíale una Solicitud de Amistad.': 'This DM expired: send them a Friend Request.',
        '¡Solicitud de amistad aceptada! 🎉': 'Friend request accepted! 🎉',
        '¡Esta persona ya te mandó una solicitud! Acéptala en Amigos.': 'This person already sent you a request! Accept it in Friends.',
        'Ya hay una solicitud con esta persona.': 'There is already a request with this person.',
        'Espera un momentito antes de reintentar.': 'Wait a moment before trying again.',
        'No puedes enviarle una solicitud a esta persona.': "You can't send a request to this person.",
        'Esta persona no acepta Solicitudes de Amistad.': "This person doesn't accept Friend Requests.",
        'No se pudo enviar la solicitud.': "Couldn't send the request.",
        'Solicitud cancelada.': 'Request canceled.',
        '¡Ahora son amigos! 🎉': "You're friends now! 🎉",
        'Amigo eliminado.': 'Friend removed.',
        'Desbloquea a esta persona para escribirle.': 'Unblock this person to message them.',
        'No puedes escribirle a esta persona.': "You can't message this person.",
        'Esta persona tiene los MDs desactivados.': 'This person has DMs turned off.',
        'Mensaje bloqueado por el filtro.': 'Message blocked by the filter.',
        'Imagen': 'Image',
        'La imagen es muy pesada o inválida.': 'The image is too heavy or invalid.',
        'Esa imagen ya se envió hace un momento.': 'That image was just sent.',
        'No perteneces a esta conversación.': "You don't belong to this conversation.",
        'No se pudo enviar la imagen.': "Couldn't send the image.",
        'Ese file no es una imagen.': "That file isn't an image.",
        'Imagen muy pesada (máx 8 MB).': 'Image too heavy (max 8 MB).',
        'Procesando imagen…': 'Processing image…',
        'No se pudo leer la imagen.': "Couldn't read the image.",
        'La imagen quedó muy pesada incluso comprimida.': 'The image was still too heavy even after compressing.',
        'Enviar imagen': 'Send image',
        'Enviar imagen (o pega con Ctrl+V)': 'Send image (or paste with Ctrl+V)',
        '📷 Imagen': '📷 Image',

        /* — Errores (errors.js) — */
        'Algo falló en Social. Reintenta; si sigue, avísale a Stevs.': 'Something broke in Social. Try again; if it keeps failing, let Stevs know.',
        'Esa acción falló. Intenta de nuevo.': 'That action failed. Try again.',

        /* — SECURITY · panel / ACCOUNTS — */
        '(cuenta eliminada)': '(deleted account)',
        'sin correo': 'no email',
        'sistema': 'system',
        'No se pudo copiar': "Couldn't copy",
        'BANEÓ': 'BANNED',
        'DESBANEÓ': 'UNBANNED',
        'VERIFICÓ': 'VERIFIED',
        'QUITÓ VERIFICACIÓN': 'REMOVED VERIFICATION',
        'DIO RANGO': 'GAVE RANK',
        'QUITÓ RANGO': 'REMOVED RANK',
        'Cuenta baneada': 'Account banned',
        '✅ Ban quitado — cuenta libre': '✅ Ban removed — account free',
        'Verificación aplicada ✅': 'Verification applied ✅',
        'Verificación quitada': 'Verification removed',
        'Rango staff retirado': 'Staff rank removed',
        '⚠️ Solo Owner y Admins pueden banear': '⚠️ Only Owner and Admins can ban',
        '⚠️ El Owner no puede ser baneado': "⚠️ The Owner can't be banned",
        '⚠️ No puedes banearte a ti mismo': "⚠️ You can't ban yourself",
        '⚠️ Solo Owner y Admins pueden desbanear': '⚠️ Only Owner and Admins can unban',
        '⚠️ Solo el Owner cambia rangos staff': '⚠️ Only the Owner changes staff ranks',
        '⚠️ Solo el Owner puede cambiar rangos staff': '⚠️ Only the Owner can change staff ranks',
        '⚠️ El Owner ya tiene el rango máximo': '⚠️ The Owner already has the top rank',
        '⚠️ No puedes cambiar tu propio rango aquí': "⚠️ You can't change your own rank here",
        'El ban queda registrado en el historial con tu nombre.': 'The ban is logged in the history under your name.',
        'Razón del ban (opcional)…': 'Ban reason (optional)...',
        'Nota: esto registra el ban en la base de datos. Que la web lo ejecute (bloquear publicar/comentar) lo conectamos en el siguiente paso.': 'Note: this logs the ban in the database. Making the site enforce it (block posting/commenting) comes in the next step.',
        'Banear cuenta': 'Ban account',
        'Banear a ': 'Ban ',
        'Se quitará el ban y el usuario recibirá un aviso verde con tu nombre y esta razón.': 'The ban will be removed and the user will get a green notice with your name and this reason.',
        'Razón del desban (opcional)…': 'Unban reason (optional)...',
        'Quitar ban': 'Remove ban',
        'Desbanear a ': 'Unban ',
        'Banear': 'Ban',
        'Ver información completa': 'View full info',
        'Buscar por nombre, @handler, correo o UID…': 'Search by name, @handler, email or UID...',
        'TODOS': 'ALL',
        'VERIFICADOS': 'VERIFIED',
        'BANEADOS': 'BANNED',
        'PERMISSION_DENIED leyendo users/ — publica las reglas nuevas de Firebase (lectura staff de users + nodo security). Sin eso, ACCOUNTS no puede listar las cuentas.': 'PERMISSION_DENIED reading users/ — publish the new Firebase rules (staff read of users + security node). Without that, ACCOUNTS cannot list accounts.',
        'Ninguna cuenta coincide con la búsqueda/filtro.': 'No accounts match the search/filter.',
        'Aún no hay cuentas registradas.': 'No registered accounts yet.',
        'TODAS LAS CUENTAS': 'ALL ACCOUNTS',
        'Esta cuenta ya no existe en users/.': "This account no longer exists in users/.",
        'CUENTA': 'ACCOUNT',
        'Correo': 'Email',
        'Handler': 'Handler',
        'Nombre': 'Name',
        'Rango': 'Rank',
        'Verificación': 'Verification',
        'Sin verificación': 'No verification',
        'Dar verificación': 'Grant verification',
        'Quitar verificación': 'Remove verification',
        'Estado': 'Status',
        'Registrado': 'Registered',
        'Descripción': 'Description',
        'ACTIVIDAD': 'ACTIVITY',
        'COMENTARIOS': 'COMMENTS',
        'RESPUESTAS': 'REPLIES',
        'Sin posts publicados.': 'No posts published.',
        'Sin comentarios.': 'No comments.',
        'Sin respuestas.': 'No replies.',
        'ACCIONES': 'ACTIONS',
        'Tu rango es MOD: puedes consultar todo, pero las acciones quedan para Owner y Admins.': 'Your rank is MOD: you can view everything, but actions are left to Owner and Admins.',
        'QUITAR BAN': 'REMOVE BAN',
        'BANEAR CUENTA': 'BAN ACCOUNT',
        'APLICAR VERIFICACIÓN': 'APPLY VERIFICATION',
        'GUARDAR RANGO': 'SAVE RANK',
        '— sin rango —': '— no rank —',
        'HISTORIAL DE LA CUENTA': 'ACCOUNT HISTORY',
        'Sin acciones registradas para esta cuenta.': 'No actions logged for this account.',
        'Sin acciones registradas todavía. Cada ban, verificación o cambio de rango aparecerá aquí.': 'No actions logged yet. Every ban, verification or rank change will appear here.',
        'Cuentas registradas de la web: información completa línea por línea, verificaciones, rango staff, baneos, su contenido (posts, comentarios y respuestas) e historial de acciones.': 'Registered accounts of the site: full line-by-line info, verifications, staff rank, bans, their content (posts, comments and replies) and action history.',
        'CUENTAS': 'ACCOUNTS',
        'ABRIR ACCOUNTS': 'OPEN ACCOUNTS',
        'Accounts — cuentas registradas': 'Accounts — registered accounts',
        'HISTORIAL': 'HISTORY',
        'Clic para copiar': 'Click to copy',
        'Clic para copiar UID del autor': 'Click to copy author UID',
        'BANEADO': 'BANNED',

        /* — SECURITY · REPORTS — */
        'PENDIENTE': 'PENDING',
        'REVISADO': 'REVIEWED',
        'DESCARTADO': 'DISCARDED',
        'COMENTARIO': 'COMMENT',
        'RESPUESTA': 'REPLY',
        'REPORTE': 'REPORT',
        'Devuelto a pendiente': 'Back to pending',
        'Reporte eliminado': 'Report deleted',
        'Eliminar reporte': 'Delete report',
        '¿Eliminar este reporte? No se puede deshacer.': "Delete this report? This can't be undone.",
        'ACCOUNTS no está cargado.': 'ACCOUNTS is not loaded.',
        'Buscar por autor, reporter, motivo o texto…': 'Search by author, reporter, reason or text...',
        'PENDIENTES': 'PENDING',
        'REVISADOS': 'REVIEWED',
        'DESCARTADOS': 'DISCARDED',
        'PERMISSION_DENIED leyendo security/reports — publica las reglas nuevas de Firebase (nodo security/reports). Sin eso, REPORTS no puede listar los reportes.': 'PERMISSION_DENIED reading security/reports — publish the new Firebase rules (security/reports node). Without that, REPORTS cannot list reports.',
        'Ningún reporte coincide con la búsqueda/filtro.': 'No reports match the search/filter.',
        'Sin reportes todavía. Cuando alguien use el botón 🚩 Reportar, aparecerá aquí.': 'No reports yet. When someone uses the 🚩 Report button, it will appear here.',
        'Nota: ': 'Note: ',
        '✓ MARCAR REVISADO': '✓ MARK REVIEWED',
        'DESCARTAR': 'DISCARD',
        '↺ VOLVER A PENDIENTE': '↺ BACK TO PENDING',
        'IR A LA CUENTA': 'GO TO ACCOUNT',
        'Reportes de la comunidad (máx 5 por usuario al día). Revisa, marca como revisados o descartados, salta a la cuenta del autor o elimina el reporte.': 'Community reports (max 5 per user per day). Review, mark as reviewed or discarded, jump to the author\'s account or delete the report.',
        'RESUELTOS': 'RESOLVED',
        'ABRIR REPORTS': 'OPEN REPORTS',
        'Reports — reportes de la comunidad': 'Reports — community reports',

        /* — SECURITY · ANTI-BAD — */
        'Anti-spam · palabras · enlaces · flood': 'Anti-spam · words · links · flood',
        'ABRIR': 'OPEN',
        'BLOQUEOS': 'BLOCKS',
        'HOY': 'TODAY',
        'PALABRAS': 'WORDS',
        'REGISTRO': 'LOG',
        'AJUSTES': 'SETTINGS',
        '🗑 LIMPIAR REGISTRO': '🗑 CLEAR LOG',
        '¿Borrar TODO el registro de intentos bloqueados?': 'Delete the ENTIRE log of blocked attempts?',
        'Registro limpio ✓': 'Log cleared ✓',
        'Aún no hay intentos bloqueados. Cuando alguien intente spam, malas palabras o links, aparecerá aquí al instante.': 'No blocked attempts yet. When someone tries spam, bad words or links, it will show up here instantly.',
        'PALABRA': 'WORD',
        'ENLACE': 'LINK',
        'Copiado ✓': 'Copied ✓',
        '✓ SE GUARDA SOLO — sin botón': '✓ SAVES ON ITS OWN — no button',
        'Palabra nueva (o varias, separadas por comas)': 'New word (or several, comma-separated)',
        'Solo lectura para mods': 'Read-only for mods',
        'Lista vacía. Agrega las palabras que quieres bloquear (se detectan aunque usen acentos, símbolos o letras repetidas).': 'Empty list. Add the words you want to block (detected even with accents, symbols or repeated letters).',
        'Filtro inteligente: pu.u.ta, puuuta, p@uta y 9u74 caen igual. El staff nunca es filtrado.': 'Smart filter: pu.u.ta, puuuta, p@uta and 9u74 all get caught. Staff is never filtered.',
        'Filtro de palabras': 'Word filter',
        'Bloquea las palabras de la lista PALABRAS': 'Blocks the words on the WORDS list',
        'Bloquear enlaces': 'Block links',
        'Prohíbe links en comentarios y respuestas (respeta la lista permitida)': 'Blocks links in comments and replies (respects the allowed list)',
        'Control de flood': 'Flood control',
        'Limita cuán rápido puede comentar una misma persona': 'Limits how fast the same person can comment',
        'Límites del flood': 'Flood limits',
        'MENSAJES': 'MESSAGES',
        'VENTANA (SEG)': 'WINDOW (SEC)',
        'COOLDOWN (SEG)': 'COOLDOWN (SEC)',
        'Dominios permitidos (enlaces)': 'Allowed domains (links)',
        'Sin excepciones: se bloquean TODOS los enlaces.': 'No exceptions: ALL links are blocked.',
        'Solo el Owner y los Admin pueden editar estos ajustes.': 'Only the Owner and Admins can edit these settings.',
        '💾 GUARDAR LÍMITES DEL FLOOD': '💾 SAVE FLOOD LIMITS',
        'Anti-Bad guardado ✓': 'Anti-Bad saved ✓',

        /* — SECURITY · ANALYTICS — */
        'Métricas en vivo de toda la web: cuentas, contenido, actividad de los últimos 7 días, top usuarios y salud del sitio.': 'Live metrics for the whole site: accounts, content, last-7-days activity, top users and site health.',
        'INTERACCIONES': 'INTERACTIONS',
        'ABRIR ANALYTICS': 'OPEN ANALYTICS',
        'Cargando métricas de la web…': 'Loading site metrics…',
        'RESUMEN GENERAL': 'GENERAL SUMMARY',
        'NUEVAS (7 DÍAS)': 'NEW (7 DAYS)',
        'ACTIVIDAD · ÚLTIMOS 7 DÍAS': 'ACTIVITY · LAST 7 DAYS',
        'TOP USUARIOS · MÁS APORTES': 'TOP USERS · MOST CONTRIBUTIONS',
        'SALUD DEL SITIO': 'SITE HEALTH',
        'LIKES TOTALES': 'TOTAL LIKES',
        'REPORTES PEND.': 'PENDING REPORTS',
        'ANTI-BAD HOY': 'ANTI-BAD TODAY',
        'REFRESCAR': 'REFRESH',
        'Sin actividad en los últimos 7 días todavía.': 'No activity in the last 7 days yet.',
        'Aún no hay actividad para armar el ranking.': 'No activity yet to build the ranking.',

        /* — v1.1 · verificaciones (verified.js) — */
        'Verificado clásico': 'Classic verified',
        'Creador de contenido (CC)': 'Content creator (CC)',
        'Verificado Mods': 'Mods verified',
        'Verificado Developer': 'Developer verified',
        'Verificado de Oro': 'Gold verified',
        'VERIFICACIÓN': 'VERIFICATION',
        'ACTUAL': 'CURRENT',
        'Cambiar / Quitar': 'Change / Remove',
        '⚠️ No se pudo verificar': "⚠️ Couldn't verify",
        '⚠️ No se pudo quitar': "⚠️ Couldn't remove",
        '⚠️ Verificación inválida': '⚠️ Invalid verification',
        '⚠️ Solo Owner y Admins pueden verificar': '⚠️ Only Owner and Admins can verify',
        '⚠️ Solo Owner y Admins pueden quitar': '⚠️ Only Owner and Admins can remove',
        '⚠️ Falta el usuario': '⚠️ Missing user',
        'Verificación inválida': 'Invalid verification',
        'Solo Owner y Admins pueden verificar': 'Only Owner and Admins can verify',
        'Solo Owner y Admins pueden quitar': 'Only Owner and Admins can remove',
        'Falta el usuario': 'Missing user',

        /* — v1.1 · categorías (feed_tabs.js) + security_panel.js — */
        'Anuncios': 'Announcements',
        'Actualizaciones': 'Updates',
        'Categorías del Social': 'Social categories',
        'Panel de seguridad': 'Security panel',
        'Seguridad': 'Security',
        'Zona de trabajo vacía — aquí va el módulo de seguridad.': 'Empty work area — the security module goes here.'
    };

    /* palabras sueltas que se traducen DENTRO de frases dinámicas */
    var WORDS = {
        'Ofensivo': 'Offensive', 'Spam': 'Spam', 'Acoso': 'Harassment',
        'Inapropiado': 'Inappropriate', 'Otros': 'Other',
        'pendiente': 'pending', 'revisado': 'reviewed', 'descartado': 'discarded',
        'comentario': 'comment', 'respuesta': 'reply', 'contenido': 'content',
        'Usuario': 'User',
        'comentar': 'comment', 'responder': 'reply', 'publicar': 'post',
        'reportar': 'report', 'enviar': 'send', 'interactuar': 'interact'
    };
    function w(s) { return (s && (DICT[s] || WORDS[s])) || s; }

    /* v1.1: labels que aparecen DENTRO de frases dinámicas (categorías,
     * verificaciones). Los nombres reales en BD quedan intactos. */
    var LBL = {
        'General': 'General', 'Anuncios': 'Announcements', 'Actualizaciones': 'Updates',
        'Verificado clásico': 'Classic verified', 'Creador de contenido (CC)': 'Content creator (CC)',
        'Verificado Mods': 'Mods verified', 'Verificado Developer': 'Developer verified',
        'Verificado de Oro': 'Gold verified'
    };
    function lb(s) { return (s && LBL[s]) || w(s) || s; }

    function timeEn(t) {
        var m = /^hace (\d+) min$/.exec(t); if (m) return m[1] + ' min ago';
        m = /^hace (\d+) h$/.exec(t);       if (m) return m[1] + 'h ago';
        m = /^hace (\d+) d$/.exec(t);       if (m) return m[1] + 'd ago';
        if (t === 'ahora') return 'now';
        return t;
    }

    /* ============ REGLAS DINÁMICAS (frases con números/nombres) ============ */
    var RX = [
        { re: /^hace (\d+) min$/, fn: function (s, a) { return a + ' min ago'; } },
        { re: /^hace (\d+) h$/, fn: function (s, a) { return a + 'h ago'; } },
        { re: /^hace (\d+) d$/, fn: function (s, a) { return a + 'd ago'; } },
        { re: /^([\d.,]+\s*[KMB]?) me gusta$/, rep: '$1 likes' },
        { re: /^([\d.,]+\s*[KMB]?) comentarios$/, rep: '$1 comments' },
        { re: /^([\d.,]+\s*[KMB]?) respuestas$/, rep: '$1 replies' },
        { re: /^Nada en «(.+)» por ahora\.$/, fn: function (s, c) { return 'Nothing in «' + lb(c) + '» yet.'; } },
        { re: /^Verificación aplicada: (.+) ✅$/, fn: function (s, v) { return 'Verification applied: ' + lb(v) + ' ✅'; } },
        { re: /^Muy largo: máx (\d+) caracteres\.$/, rep: 'Too long: max $1 characters.' },
        { re: /^↳ respondiendo a (@.+)$/, rep: '↳ replying to $1' },
        { re: /^Ese (post|comentario) ya se envió hace un momento\.$/, fn: function (s, k) { return k === 'post' ? 'That post was just sent.' : 'That comment was just sent.'; } },
        { re: /^(En línea|Inactivo|Ocupado|Desconectado) · visto (ahora|hace \d+ (?:min|h|d))$/, fn: function (s, st, t) { return w(st) + ' · last seen ' + timeEn(t); } },
        { re: /^Activo (\d+)h (\d+)m$/, rep: 'Active $1h $2m' },
        { re: /^Activo (\d+)m$/, rep: 'Active $1m' },
        { re: /^Banear a (.+)$/, rep: 'Ban $1' },
        { re: /^Desbanear a (.+)$/, rep: 'Unban $1' },
        { re: /^Copiado: (.+)$/, rep: 'Copied: $1' },
        { re: /^Detectado: "(.+)"$/, rep: 'Detected: "$1"' },
        { re: /^UID: (.+) · clic para copiar$/, rep: 'UID: $1 · click to copy' },
        { re: /^⚠️ No se pudo (banear|desbanear|actualizar|eliminar) \((.+)\)$/, fn: function (s, v, c) { return "⚠️ Couldn't " + w(v === 'banear' ? 'enviar' : v) + ' (' + c + ')'; } },
        { re: /^Rango (\S+) asignado$/, rep: '$1 rank assigned' },
        { re: /^Razón: (.+)$/, rep: 'Reason: $1' },
        { re: /^Motivo: (.+) · reportado por (.+)$/, fn: function (s, r, b) { return 'Reason: ' + w(r) + ' · reported by ' + b; } },
        { re: /^Marcado como (.+) ✓$/, fn: function (s, st) { return 'Marked as ' + w(st) + ' ✓'; } },
        { re: /^(\d+) reg\.$/, rep: '$1 accounts' },
        { re: /^(\d+) rep\.$/, rep: '$1 reports' },
        { re: /^Se borrará el reporte de (.+) contra (.+)\. Esto no se puede deshacer\.$/, rep: "The report by $1 against $2 will be deleted. This can't be undone." },
        { re: /^Actualizado (.+) · se refresca solo cada 60s$/, rep: 'Updated $1 · auto-refreshes every 60s' },
        { re: /^([\d.,]+\s*[KMB]?) posts · ([\d.,]+\s*[KMB]?) comentarios · ([\d.,]+\s*[KMB]?) respuestas$/, rep: '$1 posts · $2 comments · $3 replies' },
        { re: /^Inicia sesión para (.+)\.$/, fn: function (s, a) { return 'Log in to ' + w(a) + '.'; } },
        { re: /^(.*) · en (comentario|respuesta|contenido)$/, fn: function (s, n, k) { return w(n) + ' · in ' + w(k); } },
        { re: /^No se pudo leer el contenido \((.+)\)\.$/, rep: "Couldn't read content ($1)." },
        { re: /^No se pudo limpiar \((.+)\)\.$/, rep: "Couldn't clear ($1)." },
        { re: /^Firebase rechazó el guardado \((.+)\)\. Quedó en este navegador; reintento automático…$/, rep: 'Firebase rejected the save ($1). It stayed in this browser; auto-retrying…' }
    ];

    /* reemplazos PARCIALES (dentro de líneas más largas) */
    var SUB = [
        { re: /· con multimedia/g, rep: '· with media' },
        { re: /^en post /g, rep: 'in post ' },
        { re: /^respuesta nivel /g, rep: 'reply level ' },
        { re: /^Tú: /g, rep: 'You: ' }
    ];

    /* ============ MOTOR DE TRADUCCIÓN ============ */
    function tr(raw) {
        if (typeof raw !== 'string') return null;
        var s = raw.trim();
        if (!s || s.length > 400) return null;
        var out = null, i, r;
        if (Object.prototype.hasOwnProperty.call(DICT, s)) out = DICT[s];
        if (out === null) {
            for (i = 0; i < RX.length; i++) {
                r = RX[i];
                if (r.re.test(s)) {
                    var m = s.match(r.re);
                    out = r.fn ? r.fn.apply(null, m) : s.replace(r.re, r.rep);
                    break;
                }
            }
        }
        if (out === null) {
            for (i = 0; i < SUB.length; i++) {
                r = SUB[i];
                if (s.search(r.re) !== -1) { out = s.replace(r.re, r.rep); break; }
            }
        }
        if (out === null || out === s) return null;
        return raw.replace(/^\s+/, '').replace(/\s+$/, '') && (raw.match(/^\s*/)[0] + out + raw.match(/\s*$/)[0]);
    }

    /* originales para poder VOLVER al español sin recompilar nada */
    var ORIG = new WeakMap();   /* textNode -> string original */
    var ORIGA = new WeakMap();  /* element -> { ph, ti, al } */

    var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };

    function walk(root) {
        var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var n, base, t;
        while ((n = tw.nextNode())) {
            var p = n.parentNode;
            if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-sc-lang-skip]'))) continue;
            base = ORIG.has(n) ? ORIG.get(n) : n.nodeValue;
            if (!base || !base.trim()) continue;
            if (lang === 'es') {
                if (ORIG.has(n) && n.nodeValue !== base) n.nodeValue = base;
                continue;
            }
            t = tr(base);
            if (t && t !== base) { ORIG.set(n, base); n.nodeValue = t; }
        }
    }

    function walkAttrs(root) {
        var list = root.querySelectorAll('[placeholder],[title],[aria-label]');
        var i, el2, rec, key, val, t;
        for (i = 0; i < list.length; i++) {
            el2 = list[i];
            if (el2.closest && el2.closest('[data-sc-lang-skip]')) continue;
            rec = ORIGA.get(el2);
            if (!rec) { rec = {}; ORIGA.set(el2, rec); }
            for (key in { placeholder: 1, title: 1, 'aria-label': 1 }) {
                val = el2.getAttribute(key);
                if (val === null || !val.trim()) continue;
                var origKey = key === 'placeholder' ? 'ph' : key === 'title' ? 'ti' : 'al';
                if (rec[origKey] === undefined) rec[origKey] = val;
                if (lang === 'es') {
                    if (el2.getAttribute(key) !== rec[origKey]) el2.setAttribute(key, rec[origKey]);
                    continue;
                }
                t = tr(rec[origKey]);
                if (t && t !== rec[origKey]) el2.setAttribute(key, t);
            }
        }
    }

    /* ============ APLICAR + OBSERVAR ============ */
    var applying = false, timer = null;

    function apply() {
        if (!document.body) return;
        applying = true;
        try { walk(document.body); walkAttrs(document.body); } finally { applying = false; }
        paintPill();
    }
    function schedule() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(apply, 60);
    }

    var mo = new MutationObserver(function () { if (!applying) schedule(); });

    /* ============ PÍLDORA ES/EN ============ */
    var pill = null, bES = null, bEN = null;
    function mkBtn(code) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = code;
        b.style.cssText = 'border:0;background:transparent;color:var(--text-muted,#94a3b8);font:800 11px Inter,sans-serif;letter-spacing:.06em;padding:6px 11px;border-radius:999px;cursor:pointer;transition:background .15s ease,color .15s ease;';
        b.addEventListener('click', function () { set(code.toLowerCase()); });
        return b;
    }
    function buildPill() {
        if (pill) return;
        pill = document.createElement('div');
        pill.id = 'sc-lang-pill';
        pill.setAttribute('data-sc-lang-skip', '1');
        pill.setAttribute('role', 'group');
        pill.setAttribute('aria-label', 'Idioma / Language');
        pill.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2450;display:flex;gap:2px;padding:4px;border-radius:999px;' +
            'background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);' +
            'box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:Inter,sans-serif;';
        bES = mkBtn('ES'); bEN = mkBtn('EN');
        pill.appendChild(bES); pill.appendChild(bEN);
        document.body.appendChild(pill);
        paintPill();
    }
    function paintPill() {
        if (!bES || !bEN) return;
        var on = 'background:var(--purple-accent,#8b5cf6);color:#fff;';
        var off = 'background:transparent;color:var(--text-muted,#94a3b8);';
        bES.style.cssText = bES.style.cssText.replace(/background:[^;]+;color:[^;]+;/, lang === 'es' ? on : off);
        bEN.style.cssText = bEN.style.cssText.replace(/background:[^;]+;color:[^;]+;/, lang === 'en' ? on : off);
    }

    /* ============ API PÚBLICA ============ */
    function set(l) {
        if (l !== 'es' && l !== 'en') return;
        lang = l;
        try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
        schedule();
        try { document.dispatchEvent(new CustomEvent('sc:lang-changed', { detail: { lang: l } })); } catch (e) {}
    }
    function t(s) {
        if (lang !== 'en') return s;
        var r = tr(String(s === undefined ? '' : s));
        return r === null ? s : r;
    }

    SCSOC.lang = {
        get: function () { return lang; },
        set: set,
        toggle: function () { set(lang === 'es' ? 'en' : 'es'); },
        t: t
    };

    /* ============ ARRANQUE ============ */
    (function boot() {
        try {
            var v = localStorage.getItem(LANG_KEY);
            if (v !== 'es' && v !== 'en') {
                for (var i = 0; i < CANDIDATES.length; i++) {
                    var c = localStorage.getItem(CANDIDATES[i]);
                    if (c === 'es' || c === 'en') { v = c; break; }
                }
                if (v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} }
            }
            if (v === 'es' || v === 'en') lang = v;
        } catch (e) {}

        window.addEventListener('storage', function (e) {
            if (e.key === LANG_KEY && (e.newValue === 'es' || e.newValue === 'en') && e.newValue !== lang) {
                lang = e.newValue;
                schedule();
            }
        });

        mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { buildPill(); apply(); });
        } else {
            buildPill(); apply();
        }
    })();

    console.log('[Stevscon] social/lenguage.js listo (v1) — ES/EN en TODO el Social: SCSOC.lang.get/set/t().');
})(window, document);