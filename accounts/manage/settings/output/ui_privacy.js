/**
 * STEVSCON.COM - accounts/manage/settings/output/ui_privacy.js
 * PESTAÑA: PRIVACIDAD (v1) · invisible, visibilidad, ocultar edad/género
 */
(function (window) {
    'use strict';

    const SCSET = window.StevsconSettings = window.StevsconSettings || {};
    const ui = SCSET.ui || {};

    SCSET.registerTab({
        id: 'privacidad', label: 'Privacidad', icon: 'fa-shield-halved',
        render: function (body) {
            const s = (SCSET.settings && SCSET.settings.privacy) || {};
            const api = SCSET.api && SCSET.api.privacy;

            const c = ui.card();

            c.appendChild(ui.row('Modo invisible', 'Pareces Desconectado para los demás aunque estés dentro. Se aplica al instante.',
                ui.toggle(!!s.invisible, function (v) { if (api) api.setInvisible(v); })));

            c.appendChild(ui.row('Visibilidad del perfil', 'Quién puede ver tu perfil',
                ui.seg(['Público', 'Solo amigos'], s.profileVis === 'friends' ? 1 : 0, function (i) {
                    if (api) api.setProfileVis(i === 1 ? 'friends' : 'public');
                })));

            c.appendChild(ui.row('Ocultar edad', 'Tu edad no se mostrará en tu perfil',
                ui.toggle(!!s.hideAge, function (v) { if (api) api.setHideAge(v); })));

            c.appendChild(ui.row('Ocultar género', 'Tu género no se mostrará en tu perfil',
                ui.toggle(!!s.hideGender, function (v) { if (api) api.setHideGender(v); })));

            c.appendChild(ui.note('Visibilidad y ocultar edad/género ya se guardan; el perfil público las leerá cuando conectemos el visor de perfiles.'));
            body.appendChild(c);
        }
    });

    console.log('[Stevscon] ui_privacy.js listo (pestaña registrada).');
})(window);