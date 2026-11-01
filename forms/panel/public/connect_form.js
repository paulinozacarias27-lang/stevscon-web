/**
 * ====
 * STEVSCON.COM — forms/panel/public/connect_form.js (v1)
 * PÚBLICO · 4/4 — EL CONECTADOR (el último script, tu regla de siempre).
 *
 *  Este file PRENDE la página de verdad:
 *   - ROLLOUT: revisa que TODOS los módulos estén cargados (core,
 *     data, formView, mine, main, see, submit + firebase). Si falta
 *     alguno, NO toca nada: la pantalla "Muy pronto — en construcción"
 *     del forms.html se queda (nunca un error en la web pública) y en
 *     consola dice exactamente qué falta.
 *   - Si todo está: apaga #sc-boot, monta la barra superior (brand,
 *     Formularios · Mis apostulaciones con badge · Revisión [solo
 *     staff] · chip de sesión) y el contenedor #fm-view.
 *   - Router de hash (los deep links prometidos en el forms.html):
 *       (vacío)          → portada con tarjetas  (main_panel.js)
 *       #form/{formId}   → ver formulario         (see_form.js)
 *       #mis             → mis apostulaciones     (data_panel.js)
 *       #staff           → revisión (solo staff)  (view_panel.js)
 *   - Reacciona al login/logout: refresca chip, badge y vista.
 *   - Badge rojo de notificaciones sin leer (FM.mine.unseenCount).
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
FM.public = FM.public || {};
var C = FM.public.connect = FM.public.connect || {};

function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'connect');
    st.textContent = ''
    + '.fmct-bar{position:sticky;top:0;z-index:500;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:13px 0;margin:-8px 0 10px;background:var(--bg-main,#0d0b14);border-bottom:1px solid var(--border-color,#2e2440)}'
    + '.fmct-brand{display:flex;align-items:center;gap:10px;text-decoration:none;flex:none}'
    + '.fmct-bico{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--purple-dark,#6d28d9),var(--purple-accent,#8b5cf6));display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;box-shadow:0 6px 16px var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmct-btxt b{display:block;font:800 14px Inter,sans-serif;color:var(--text-main,#f8fafc);letter-spacing:-.01em;line-height:1.1}'
    + '.fmct-btxt span{display:block;font:700 10px Inter,sans-serif;color:var(--text-muted,#94a3b8);letter-spacing:.1em;margin-top:1px}'
    + '.fmct-nav{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}'
    + '.fmct-tab{position:relative;display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-muted,#94a3b8);font:800 12px Inter,sans-serif;cursor:pointer;transition:all .15s ease;text-decoration:none}'
    + '.fmct-tab:hover{color:var(--text-main,#f8fafc);background:var(--bg-hover,#261f36)}'
    + '.fmct-tab.fmct-on{color:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmct-badge{background:#ef4444;color:#fff;border-radius:999px;padding:1px 7px;font:800 10.5px Inter,sans-serif;min-width:18px;text-align:center}'
    + '.fmct-right{display:flex;align-items:center;gap:9px;flex:none}'
    + '.fmct-home{width:32px;height:32px;border-radius:9px;border:1px solid var(--border-color,#2e2440);display:flex;align-items:center;justify-content:center;color:var(--text-muted,#94a3b8);font-size:13px;text-decoration:none;transition:all .15s ease}'
    + '.fmct-home:hover{color:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6)}'
    + '.fmct-user{display:flex;align-items:center;gap:8px;padding:5px 11px 5px 6px;border-radius:999px;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#1a1625);text-decoration:none;max-width:210px}'
    + '.fmct-uava{width:24px;height:24px;border-radius:50%;object-fit:cover;flex:none}'
    + '.fmct-uini{width:24px;height:24px;border-radius:50%;background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6);display:flex;align-items:center;justify-content:center;font:800 11px Inter,sans-serif;flex:none}'
    + '.fmct-uname{font:700 12px Inter,sans-serif;color:var(--text-main,#f8fafc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.fmct-login{padding:8px 14px;border-radius:10px;background:var(--purple-accent,#8b5cf6);color:#fff;font:800 12px Inter,sans-serif;text-decoration:none;transition:background .15s ease}'
    + '.fmct-login:hover{background:var(--purple-dark,#6d28d9)}'
    + '.fmct-view{outline:none}'
    + '@media(max-width:720px){.fmct-bar{padding:10px 0}.fmct-nav{margin-left:0;width:100%;order:3}.fmct-tab{flex:1;justify-content:center}.fmct-btxt span{display:none}}';
    (document.head || document.documentElement).appendChild(st);
}

/* ==== ROLLOUT: ¿está todo el stack? ==== */
var REQ = [
    ['forms_core.js (FM.core)',            function () { return FM.core; }],
    ['data_save/public_forms.js (FM.data)', function () { return FM.data; }],
    ['create_form/submit_form_panels.js (FM.formView)', function () { return FM.formView; }],
    ['data_save/data_panel.js (FM.mine)',  function () { return FM.mine; }],
    ['public/main_panel.js (FM.public.main)', function () { return FM.public && FM.public.main; }],
    ['public/see_form.js (FM.public.see)', function () { return FM.public && FM.public.see; }],
    ['public/submit_form.js (FM.public.submit)', function () { return FM.public && FM.public.submit; }],
    ['firebase_data.js (firebase)',        function () { return (typeof firebase !== 'undefined' && firebase.auth && firebase.database) ? true : null; }]
];

C.check = function () {
    var missing = [];
    REQ.forEach(function (r) {
        try { if (!r[1]()) missing.push(r[0]); }
        catch (e) { missing.push(r[0]); }
    });
    return missing;
};

/* ==== arranque ==== */
C.boot = function () {
    if (C.__booted) return;
    C.__booted = true;

    var missing = C.check();
    if (missing.length) {
        /* ROLLOUT: la pantalla "Muy pronto" del forms.html se queda sola */
        console.warn('[Stevscon][Forms] En construcción — faltan módulos: ' + missing.join(' · '));
        return;
    }

    var boot = document.getElementById('sc-boot');
    var root = document.getElementById('fm-root');
    if (!root) {
        console.warn('[Stevscon][Forms] No encontré #fm-root en forms.html.');
        return;
    }
    if (boot) boot.style.display = 'none';

    style();
    buildShell(root);
    wireAuth();
    window.addEventListener('hashchange', function () { route(); });
    /* red de seguridad: si auth no responde, arrancamos igual */
    setTimeout(firstRoute, 1500);
};

var viewEl = null, tabs = {}, badgeEl = null, staffTab = null, userHost = null;
var routed = false, lastUid = '§init§';

function buildShell(root) {
    root.textContent = '';

    var bar = el('div', 'fmct-bar');

    var brand = el('a', 'fmct-brand');
    brand.href = '#';
    var bico = el('div', 'fmct-bico');
    var bi = document.createElement('i');
    bi.className = 'fa-solid fa-file-signature';
    bico.appendChild(bi);
    brand.appendChild(bico);
    var btxt = el('div', 'fmct-btxt');
    btxt.appendChild(el('b', '', 'Apostulaciones'));
    btxt.appendChild(el('span', '', 'STEVSCON.COM'));
    brand.appendChild(btxt);
    bar.appendChild(brand);

    var nav = el('div', 'fmct-nav');
    tabs.main = tabBtn('fa-clipboard-list', 'Formularios', '');
    nav.appendChild(tabs.main);
    tabs.mine = tabBtn('fa-paper-plane', 'Mis apostulaciones', '#mis');
    badgeEl = el('span', 'fmct-badge', '');
    badgeEl.style.display = 'none';
    tabs.mine.appendChild(badgeEl);
    nav.appendChild(tabs.mine);
    staffTab = tabBtn('fa-shield-halved', 'Revisión', '#staff');
    staffTab.style.display = 'none';
    nav.appendChild(staffTab);
    bar.appendChild(nav);

    var right = el('div', 'fmct-right');
    var home = el('a', 'fmct-home');
    home.href = '/';
    home.title = 'Volver a Stevscon.com';
    var hi = document.createElement('i');
    hi.className = 'fa-solid fa-house';
    home.appendChild(hi);
    right.appendChild(home);
    userHost = el('div', '');
    userHost.style.display = 'flex';
    right.appendChild(userHost);
    bar.appendChild(right);

    viewEl = el('div', 'fmct-view');
    viewEl.id = 'fm-view';

    root.appendChild(bar);
    root.appendChild(viewEl);
}

function tabBtn(icon, label, hash) {
    var b = el('a', 'fmct-tab');
    b.href = hash || '#';
    var i = document.createElement('i');
    i.className = 'fa-solid ' + icon;
    b.appendChild(i);
    b.appendChild(document.createTextNode(' ' + label));
    return b;
}

function firstRoute() {
    if (routed) return;
    routed = true;
    route();
}

function wireAuth() {
    try {
        firebase.auth().onAuthStateChanged(function (u) {
            if (FM.core && FM.core.clearSession) FM.core.clearSession();
            var uid = u ? u.uid : null;
            refreshUser();
            refreshBadge();
            if (!routed) { lastUid = uid; firstRoute(); return; }
            if (uid !== lastUid) { lastUid = uid; route(); }
        });
    } catch (e) {
        firstRoute();
    }
}

/* chip de sesión + pestaña de staff */
function refreshUser() {
    if (!userHost) return;
    userHost.textContent = '';
    core.session(function (s) {
        if (!userHost) return;
        userHost.textContent = '';
        if (staffTab) staffTab.style.display = (s && s.isStaff) ? '' : 'none';

        if (!s || !s.user) {
            var a = el('a', 'fmct-login', 'Iniciar sesión');
            a.href = '/';
            userHost.appendChild(a);
            return;
        }
        var u = el('a', 'fmct-user');
        u.href = '/';
        u.title = 'Tu perfil en Stevscon.com';
        var av = (s.user.photoURL || (s.user.email || '?')).charAt(0).toUpperCase();
        if (s.user.photoURL) {
            var img = document.createElement('img');
            img.src = s.user.photoURL;
            img.alt = '';
            img.className = 'fmct-uava';
            u.appendChild(img);
        } else {
            u.appendChild(el('div', 'fmct-uini', av));
        }
        var name = s.user.displayName || (s.user.email ? s.user.email.split('@')[0] : 'Usuario');
        u.appendChild(el('span', 'fmct-uname', name));
        if (s.isStaff) {
            var crown = document.createElement('i');
            crown.className = 'fa-solid fa-crown';
            crown.style.color = '#f59e0b';
            crown.style.fontSize = '10px';
            u.appendChild(crown);
        }
        userHost.appendChild(u);
    });
}

function refreshBadge() {
    if (!badgeEl || !FM.mine || !FM.mine.unseenCount) return;
    FM.mine.unseenCount(function (n) {
        if (!badgeEl) return;
        badgeEl.textContent = String(n || 0);
        badgeEl.style.display = (n && n > 0) ? '' : 'none';
    });
}

/* ==== EL ROUTER ==== */
function route() {
    if (!viewEl) return;
    var hash = (location.hash || '').replace(/^#/, '');

    /* pestaña activa */
    setActive(hash === 'mis' ? 'mine' : (hash === 'staff' ? 'staff' : 'main'));
    document.title = 'Apostulaciones — Stevscon';
    viewEl.textContent = '';
    viewEl.appendChild(el('div', 'fmp-load', 'Cargando…'));

    try { window.scrollTo(0, 0); } catch (e) {}
    refreshBadge();

    if (hash === 'mis') {
        FM.mine.render(viewEl);
        /* mine.render marca las vistas al pintar → recontar al toque */
        setTimeout(refreshBadge, 900);
        return;
    }

    if (hash === 'staff') {
        /* el listado de fondo + el panel de revisión encima (se autoguarda de no-staff) */
        FM.public.main.render(viewEl);
        if (FM.review && FM.review.panel) FM.review.panel.open();
        else core.toast('Falta create_form/view_panel.js para la revisión.', 'error');
        return;
    }

    var m = hash.match(/^form\/(.+)$/);
    if (m && m[1]) {
        var id = decodeURIComponent(m[1]);
        FM.public.see.open(viewEl, id);
        return;
    }

    FM.public.main.render(viewEl);
}

function setActive(key) {
    Object.keys(tabs).forEach(function (k) {
        if (tabs[k]) rmTabCls(tabs[k], k === key);
    });
}
function rmTabCls(t, on) {
    t.className = 'fmct-tab' + (on ? ' fmct-on' : '');
}

/* arranque cuando el DOM está listo (este file carga de último) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { C.boot(); });
} else {
    C.boot();
}

console.log('[Stevscon] public/connect_form.js listo (v1) — CONECTADOR: la página de Apostulaciones está VIVA.');
})(window, document);