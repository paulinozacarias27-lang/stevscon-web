/**
 * STEVSCON.COM - accounts/manage/settings/output/ui_preferences.js
 * PESTAÑA: PREFERENCIAS (v2) · idioma, tema, estado + MENSAJES DIRECTOS
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const ui = SCSET.ui || {};

    SCSET.registerTab({
        id: 'preferencias', label: 'Preferencias', icon: 'fa-sliders',
        render: function (body) {
            const s = SCSET.settings || {};
            const api = SCSET.api && SCSET.api.preferences;

            /* ==== GENERAL · idioma, tema, estado ==== */
            const c = ui.card();

            c.appendChild(ui.row('Idioma de la web', 'Toda la web en Español o Inglés',
                ui.seg(['Español', 'English'], s.lang === 'en' ? 1 : 0, function (i) {
                    if (api) api.setLang(i === 1 ? 'en' : 'es');
                })));

            c.appendChild(ui.row('Tema', 'Oscuro o Claro para toda la web (incluye el Social)',
                ui.seg(['Oscuro', 'Claro'], s.theme === 'light' ? 1 : 0, function (i) {
                    if (api) api.setTheme(i === 1 ? 'light' : 'dark');
                })));

            const states = ['online', 'inactive', 'busy', 'offline'];
            const labels = ['Activo', 'Inactivo', 'Ocupado', 'Desconectado'];
            const cur = states.indexOf(s.defaultStatus) === -1 ? 0 : states.indexOf(s.defaultStatus);
            c.appendChild(ui.row('Estado por defecto', 'Con qué estado entrarás siempre a Stevscon',
                ui.seg(labels, cur, function (i) {
                    if (api) api.setDefaultStatus(states[i]);
                })));

            c.appendChild(ui.note('El estado por defecto se aplica cada vez que inicias sesión.'));
            body.appendChild(c);

            /* ==== MENSAJES DIRECTOS · control total de tu bandeja ==== */
            const m = ui.card();

            m.appendChild(ui.row('Recibir Mensajes Directos', 'Quién puede abrirte un MD en el Social',
                ui.seg(['Todos', 'Nadie'], s.mdAllow === 'nadie' ? 1 : 0, function (i) {
                    if (api) api.setMD({ mdAllow: i === 1 ? 'nadie' : 'todos' },
                        i === 1 ? 'MDs desactivados' : 'MDs activados');
                })));

            m.appendChild(ui.row('Solicitudes de Amistad', 'Quién puede enviarte solicitud cuando un MD expira',
                ui.seg(['Todos', 'Nadie'], s.mdRequests === 'nadie' ? 1 : 0, function (i) {
                    if (api) api.setMD({ mdRequests: i === 1 ? 'nadie' : 'todos' },
                        i === 1 ? 'Solicitudes bloqueadas' : 'Solicitudes abiertas');
                })));

            m.appendChild(ui.row('Sonido de notificaciones', 'Aviso sonoro al llegar un MD nuevo',
                ui.seg(['Sí', 'No'], s.mdSound === 'no' ? 1 : 0, function (i) {
                    if (api) api.setMD({ mdSound: i === 1 ? 'no' : 'si' });
                })));

            m.appendChild(ui.row('Vista previa en la lista', 'Muestra el inicio del último mensaje en tu bandeja',
                ui.seg(['Sí', 'No'], s.mdPreview === 'no' ? 1 : 0, function (i) {
                    if (api) api.setMD({ mdPreview: i === 1 ? 'no' : 'si' });
                })));

            m.appendChild(ui.row('Badge de no leídos', 'El punto rojo con el total de MDs sin leer',
                ui.seg(['Sí', 'No'], s.mdBadge === 'no' ? 1 : 0, function (i) {
                    if (api) api.setMD({ mdBadge: i === 1 ? 'no' : 'si' });
                })));

            m.appendChild(ui.note('«Nadie» te bloquea los MDs al instante, incluso en conversaciones ya abiertas. El sonido y las Solicitudes se activan al llegar esos sistemas.'));
            body.appendChild(m);
        }
    });

    console.log('[Stevscon] ui_preferences.js listo (v2 · pestaña con bloque de Mensajes Directos).');
})(window);