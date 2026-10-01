/**
 * ====
 * STEVSCON.COM - profiles/manage/online_status/busy.js
 * ONLINE STATUS · Estado OCUPADO (círculo rojo con línea blanca).
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
        id: 'busy',
        label: 'Ocupado',
        color: '#ef4444',
        icon: function (px) {
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', String(px));
            svg.setAttribute('height', String(px));
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', '12');
            c.setAttribute('cy', '12');
            c.setAttribute('r', '10');
            c.setAttribute('fill', '#ef4444');
            const bar = document.createElementNS(NS, 'rect');
            bar.setAttribute('x', '5.5');
            bar.setAttribute('y', '10.75');
            bar.setAttribute('width', '13');
            bar.setAttribute('height', '2.5');
            bar.setAttribute('rx', '1.25');
            bar.setAttribute('fill', '#ffffff');
            svg.appendChild(c);
            svg.appendChild(bar);
            return svg;
        }
    });

    console.log('[Stevscon] busy.js listo (estado: Ocupado, v1).');
})(window, document);