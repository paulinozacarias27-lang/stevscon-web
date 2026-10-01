/**
 * STEVSCON.COM - accounts/manage/settings/output/ui_data.js
 * PESTAÑA: DATOS Y SESIÓN (v1) · info de cuenta, exportar JSON, cerrar sesión
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const ui = SCSET.ui || {};

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
                ui.mono(rec.id || rec.accountId || user.uid || '—')));
            c.appendChild(ui.row('Usuario', 'Tu nombre en Stevscon',
                ui.mono(rec.username || rec.user || '—')));
            c.appendChild(ui.row('Correo', 'El correo con el que inicias sesión',
                ui.mono(user.email || '—')));
            if (user.metadata && user.metadata.creationTime) {
                c.appendChild(ui.row('Cuenta creada', 'La fecha en que nació tu cuenta',
                    ui.mono(user.metadata.creationTime)));
            }

            const actions = ui.row('Tus datos', 'Descarga tu perfil en un archivo JSON',
                ui.btn('Descargar', 'violet', function () { if (api) api.export(); }));
            c.appendChild(actions);

            c.appendChild(ui.row('Sesión', 'Cierra la sesión en este dispositivo',
                ui.btn('Cerrar sesión', 'red', function () { if (api) api.logout(); })));

            body.appendChild(c);
        }
    });

    console.log('[Stevscon] ui_data.js listo (pestaña registrada).');
})(window);