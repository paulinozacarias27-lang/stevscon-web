/**
 * STEVSCON.COM — social/manage/output/system/numbers.js (v1)
 * Formateo de números del Social: 940 -> "940" · 1200 -> "1.2K" · 3.4M
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};

    function trim(x) {
        x = Math.round(x * 10) / 10;
        return (x % 1 === 0) ? String(Math.round(x)) : x.toFixed(1);
    }

    SCSOC.nums = {
        fmt: function (n) {
            n = Number(n) || 0;
            const a = Math.abs(n);
            if (a < 1000) return String(n);
            if (a < 1e6) return trim(n / 1e3) + 'K';
            if (a < 1e9) return trim(n / 1e6) + 'M';
            return trim(n / 1e9) + 'B';
        },
        full: function (n) { return (Number(n) || 0).toLocaleString('es'); }
    };

    console.log('[Stevscon] numbers.js listo (v1).');
})(window, document);