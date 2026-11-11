/**
 * ====
 * STEVSCON.COM — console_guard.js (v1) — RAÍZ DEL PROYECTO
 * DISUASIÓN de DevTools (F12, atajos, clic derecho, detección de apertura).
 * HONESTIDAD: NINGÚN JS puede bloquear DevTools de verdad — el candado
 * real son las Firebase Rules (un comando de consola que intente escribir
 * donde no debe recibe PERMISSION_DENIED del SERVIDOR). Esto solo cierra
 * la puerta del frente y espanta al troll de caúa.
 * INSTALACIÓN: <script src="/console_guard.js?v=1"></script> en cada HTML.
 * ====
 */
(function (window, document) {
    'use strict';

    if (window.__scConsoleGuard) return;
    window.__scConsoleGuard = true;

    var WARN = '%c⚠️ Stevscon.com — Zona protegida';

    /* atajos: F12 · Ctrl+Shift+I/J/C/K · Ctrl+U (ver código) */
    document.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); return false; }
        if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].indexOf(k) !== -1) {
            e.preventDefault(); e.stopPropagation(); return false;
        }
        if (e.ctrlKey && k === 'u') { e.preventDefault(); e.stopPropagation(); return false; }
    }, true);

    /* clic derecho: bloqueado, salvo en campos de texto (pegar con menú) */
    document.addEventListener('contextmenu', function (e) {
        var t = e.target;
        var tag = (t && t.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (t && t.isContentEditable)) return;
        e.preventDefault();
    });

    /* detección por diferencia de tamaño (DevTools abierto acostumbra a
     * separar window.outer de window.inner) */
    var openCount = 0;
    function isOpen() {
        var w = 170;
        return (window.outerWidth - window.innerWidth > w) ||
               (window.outerHeight - window.innerHeight > w);
    }
    setInterval(function () {
        if (!isOpen()) { openCount = 0; return; }
        if (++openCount === 2) { /* confirma en el 2º chequeo: evita falsos por zoom */
            try { console.clear(); console.log(WARN, 'color:#f87171;font:800 16px Inter,sans-serif;'); } catch (e) {}
        }
    }, 1200);

    console.log(WARN + '\nCualquier intento de escribir en la base de datos sin permiso será DENEGADO por el servidor.', 'color:#c4b5fd;font:600 12px monospace;');
})();