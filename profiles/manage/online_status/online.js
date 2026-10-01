/**
 * ====
 * STEVSCON.COM - profiles/manage/online_status/online.js
 * ONLINE STATUS · Estado ACTIVO (circulito verde).
 * Se auto-registra en window.StevsconStatus. Cargar ANTES de
 * status_online.js. Nada de innerHTML: el ícono es SVG puro.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCST = window.StevsconStatus = window.StevsconStatus || {};
    SCST.states = SCST.states || [];
    SCST.register = SCST.register || function (def) {
        for (let i = 0; i < SCST.states.length; i++) {
            if (SCST.states[i].id === def.id) { SCST.states[i] = def; return; }
        }
        SCST.states.push(def);
    };

    const NS = 'http://www.w3.org/2000/svg';

    SCST.register({
        id: 'online',
        label: 'Activo',
        color: '#22c55e',
        icon: function (px) {
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', String(px));
            svg.setAttribute('height', String(px));
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', '12');
            c.setAttribute('cy', '12');
            c.setAttribute('r', '10');
            c.setAttribute('fill', '#22c55e');
            svg.appendChild(c);
            return svg;
        }
    });

    console.log('[Stevscon] online.js listo (estado: Activo, v1).');
})(window, document);