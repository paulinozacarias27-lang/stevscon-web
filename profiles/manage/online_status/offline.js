/**
 * ====
 * STEVSCON.COM - profiles/manage/online_status/offline.js
 * ONLINE STATUS · Estado DESCONECTADO (círculo gris con agujero)
 * + DETECTOR DE INACTIVIDAD: 5 minutos sin tocar la web → evento
 *   'sc:status-auto' (type: 'away'). Al volver la actividad → 'back'.
 *   status_online.js es quien hace la escritura en Firebase.
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
        id: 'offline',
        label: 'Desconectado',
        color: '#80848e',
        icon: function (px) {
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', String(px));
            svg.setAttribute('height', String(px));
            const ring = document.createElementNS(NS, 'circle');
            ring.setAttribute('cx', '12');
            ring.setAttribute('cy', '12');
            ring.setAttribute('r', '7.5');
            ring.setAttribute('fill', 'none');
            ring.setAttribute('stroke', '#80848e');
            ring.setAttribute('stroke-width', '5');
            svg.appendChild(ring);
            return svg;
        }
    });

    /* ==== DETECTOR DE INACTIVIDAD (5 minutos) ==== */
    SCST.auto = SCST.auto || (function () {
        const LIMIT_MS = 5 * 60 * 1000; // 5 minutos sin actividad
        const EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
        let last = Date.now();
        let away = false;
        let timer = null;
        let bound = [];

        function mark() {
            last = Date.now();
            if (away) {
                away = false;
                document.dispatchEvent(new CustomEvent('sc:status-auto', { detail: { type: 'back' } }));
            }
        }

        function tick() {
            if (!away && Date.now() - last >= LIMIT_MS) {
                away = true;
                document.dispatchEvent(new CustomEvent('sc:status-auto', { detail: { type: 'away' } }));
            }
        }

        function start() {
            if (timer) return;
            bound = EVENTS.map(function (name) {
                const fn = mark;
                document.addEventListener(name, fn, { passive: true });
                return [name, fn];
            });
            timer = setInterval(tick, 1000);
        }

        function stop() {
            if (timer) { clearInterval(timer); timer = null; }
            bound.forEach(function (p) { document.removeEventListener(p[0], p[1]); });
            bound = [];
            away = false;
        }

        function isAway() { return away; }

        // poke(): silencioso — resetea el timer SIN disparar 'back'
        // (lo usa status_online.js cuando eliges un estado del panel).
        function poke() { last = Date.now(); away = false; }

        return { LIMIT_MS: LIMIT_MS, start: start, stop: stop, isAway: isAway, poke: poke };
    })();

    console.log('[Stevscon] offline.js listo (estado: Desconectado + detector 5 min, v1).');
})(window, document);