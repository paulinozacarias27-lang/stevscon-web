/**
 * STEVSCON.COM - accounts/manage/settings/output/ui_data.js
 * PESTAÑA: DATOS Y SESIÓN (v2) · busca el ID de 16 dígitos real
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const ui = SCSET.ui || {};

    function findId16(node, depth) {
        if (!node || typeof node !== 'object' || depth > 3) return null;
        const keys = Object.keys(node);
        let i, v;
        for (i = 0; i < keys.length; i++) {
            v = node[keys[i]];
            if (typeof v === 'string' && /^\d{16}$/.test(v)) return v;
        }
        for (i = 0; i < keys.length; i++) {
            v = node[keys[i]];
            if (v && typeof v === 'object') {
                const found = findId16(v, depth + 1);
                if (found) return found;
            }
        }
        return null;
    }

    SCSET.registerTab({
        id: 'datos', label: 'Datos y Sesión', icon: 'fa-database',
        render: function (body) {
            const user = SCSET.user || {};
            const rec = (SCSET.data && SCSET.data.record) || {};
            const api = SCSET.api && SCSET.api.data;

            const c = ui.card();

            const meta = document.createElement('i');
            meta.className = 'fa-solid fa-database';
            meta.style.cssText = 'font-size:22px;color:#8b5cf6;display:block;margin-bottom:12px;';
            c.appendChild(meta);

            c.appendChild(ui.row('ID de cuenta', 'Tu identificador único de 16 dígitos',
                ui.mono(findId16(rec, 0) || rec.id || rec.accountId || user.uid || '—')));
            c.appendChild(ui.row('Usuario', 'Tu nombre en Stevscon',
                ui.mono(rec.username || rec.user || '—')));
            c.appendChild(ui.row('Correo', 'El correo con el que inicias sesión',
                ui.mono(user.email || '—')));
            if (user.metadata && user.metadata.creationTime) {
                c.appendChild(ui.row('Cuenta creada', 'La fecha en que nació tu cuenta',
                    ui.mono(user.metadata.creationTime)));
            }

            c.appendChild(ui.row('Tus datos', 'Descarga tu perfil en un archivo JSON',
                ui.btn('Descargar', 'violet', function () { if (api) api.export(); })));

            c.appendChild(ui.row('Sesión', 'Cierra la sesión en este dispositivo',
                ui.btn('Cerrar sesión', 'red', function () { if (api) api.logout(); })));

            body.appendChild(c);
        }
    });

    console.log('[Stevscon] ui_data.js listo (v2, ID real).');
})(window);