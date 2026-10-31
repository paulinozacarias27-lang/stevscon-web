/**
 * ====
 * STEVSCON.COM — forms/panel/admin/create_button.js (v1)
 * EL BOTÓN DE LA ESQUINA — SOLO Owner y Admins (respuestas #3 y #29).
 *
 *  - Se enciende solo: escucha el login y comprueba el rango con
 *    FM.core.session() (tu gmail = Owner · social/staff/{uid} = admin).
 *  - Flota abajo a la derecha con el morado + glow del sitio (pulsa
 *    suave, como el resto de la web).
 *  - Al clic abre el MANAGER: crear nuevo, editar, publicar, copiar
 *    enlace, revisión y eliminar.
 *  - Se esconde solo al cerrar sesión (y limpia la sesión cacheada).
 *  - FM.createButton.mount()/hide(): para que connect_form.js (Parte 4)
 *    lo integre si quiere — aquí ya funciona solo, sin conector.
 *  - Depende solo de firebase.auth (ya cargado en forms.html) y
 *    forms_core.js.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;

var fab = null;

function style() {
    if (document.getElementById('fm-fab-style')) return;
    var st = document.createElement('style');
    st.id = 'fm-fab-style';
    st.textContent = ''
    + '.fm-fab{position:fixed;right:26px;bottom:26px;width:56px;height:56px;border-radius:50%;'
    + 'background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));'
    + 'color:#fff;display:flex;align-items:center;justify-content:center;font-size:21px;cursor:pointer;'
    + 'z-index:40000;border:1px solid rgba(255,255,255,.16);'
    + 'box-shadow:0 10px 30px var(--purple-glow,rgba(139,92,246,.35)),0 4px 14px rgba(0,0,0,.4);'
    + 'transition:transform .18s ease,box-shadow .18s ease;animation:fmFabPulse 2.8s ease-in-out infinite;}'
    + '.fm-fab:hover{transform:translateY(-3px) scale(1.07);box-shadow:0 16px 40px var(--purple-glow,rgba(139,92,246,.5)),0 6px 18px rgba(0,0,0,.45);animation:none;}'
    + '.fm-fab:active{transform:translateY(0) scale(1);animation:none;}'
    + '@keyframes fmFabPulse{0%,100%{box-shadow:0 10px 30px var(--purple-glow,rgba(139,92,246,.35)),0 4px 14px rgba(0,0,0,.4);}'
    + '50%{box-shadow:0 10px 34px var(--purple-glow,rgba(139,92,246,.55)),0 4px 16px rgba(0,0,0,.45);}}';
    (document.head || document.documentElement).appendChild(st);
}

FM.createButton = {
    mount: function () {
        var self = this;
        if (!core || !core.session) return;
        core.session(function (s) {
            if (s && s.isStaff) self.show();
            else self.hide();
        });
    },
    hide: function () {
        if (fab && fab.parentNode) fab.parentNode.removeChild(fab);
        fab = null;
    },
    show: function () {
        if (fab) return;
        style();
        fab = document.createElement('div');
        fab.className = 'fm-fab';
        fab.title = 'Crear formulario';
        fab.setAttribute('aria-label', 'Crear formulario');
        var i = document.createElement('i');
        i.className = 'fa-solid fa-plus';
        fab.appendChild(i);
        fab.addEventListener('click', function () {
            if (FM.creator && FM.creator.main && typeof FM.creator.main.openManager === 'function') {
                FM.creator.main.openManager();
            } else {
                core.toast('El creador no cargó — revisa los files de panel/admin/create_form/.', 'error');
            }
        });
        document.body.appendChild(fab);
    }
};

/* Encendido automático: escucha el login desde forms.html */
(function boot() {
    function wire() {
        try {
            firebase.auth().onAuthStateChanged(function (u) {
                if (core && typeof core.clearSession === 'function') core.clearSession();
                if (u) FM.createButton.mount();
                else FM.createButton.hide();
            });
        } catch (e) { /* firebase no inicializado todavía */ }
    }
    if (typeof firebase !== 'undefined' && firebase.auth) wire();
    else window.addEventListener('load', wire);
})();

console.log('[Stevscon] create_button.js listo (v1) — botón de la esquina (Owner/Admins).');
})(window, document);