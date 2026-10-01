/**
 * STEVSCON.COM - accounts/manage/settings/output/ui_preferences.js
 * PESTAÑA: PREFERENCIAS (v1) · idioma, tema, estado por defecto
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

            const c = ui.card();

            c.appendChild(ui.row('Idioma de la web', 'Toda la web en Español o Inglés',
                ui.seg(['Español', 'English'], s.lang === 'en' ? 1 : 0, function (i) {
                    if (api) api.setLang(i === 1 ? 'en' : 'es');
                })));

            c.appendChild(ui.row('Tema', 'Oscuro o Claro para toda la web',
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
        }
    });

    console.log('[Stevscon] ui_preferences.js listo (pestaña registrada).');
})(window);