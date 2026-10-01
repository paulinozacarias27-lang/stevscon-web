/**
 * ====
 * STEVSCON.COM - profiles/manage/online_status/inactive.js
 * ESTADO: INACTIVO (luna naranja) (v2)
 *
 * Registra el estado "Inactivo" en el cerebro (status_online.js).
 * v2: file reconstruido - el anterior llegó corrupto/vacío y por eso
 * la fila "Inactivo" no aparecía en el panel de estados.
 * ====
 */
(function (window) {
    'use strict';

    const SCST = window.StevsconStatus = window.StevsconStatus || {};
    SCST.states = SCST.states || [];

    const ORANGE = '#f59e0b';
    const NS = 'http://www.w3.org/2000/svg';

    // Luna creciente estilo Discord (SVG puro, sin innerHTML)
    function icon(px) {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', px);
        svg.setAttribute('height', px);
        svg.setAttribute('aria-hidden', 'true');

        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
        path.setAttribute('fill', ORANGE);
        svg.appendChild(path);
        return svg;
    }

    // Evita registros duplicados si el file se cargara dos veces
    for (let i = 0; i < SCST.states.length; i++) {
        if (SCST.states[i].id === 'inactive') return;
    }

    SCST.states.push({
        id: 'inactive',
        label: 'Inactivo',
        icon: icon
    });

    console.log('[Stevscon] inactive.js listo (luna naranja registrada).');
})(window);