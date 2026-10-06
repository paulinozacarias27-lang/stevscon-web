/**
 * ====
 * STEVSCON.COM — social/manage/output/security/security_panel.js (v4)
 * CATEGORÍA «SECURITY» — BOTÓN 🛠 SOLO PARA STAFF (Admin/Owner).
 *
 * v4 — FIX RAÍZ: EL BOTÓN ESTABA ENTERRADO (guerra de capas).
 *  La página del Social (category_posts.js) es una capa de pantalla
 *  completa POR ENCIMA de z-index 960 -> el botón existía pero quedaba
 *  debajo: invisible e intocable, y solo asomaba cuando esa capa se
 *  cerraba al pulsar "Volver". Ahora el trío (botón/backdrop/panel)
 *  vive en la CÚSPIDE de capas (mismo cielo que tu loader del index):
 *   · Botón  2147483020  (se oculta solo mientras el panel está abierto)
 *   · Panel  2147483010
 *   · Fondo  2147483000
 *  Todo lo demás se conserva de v3:
 *   · Detección = SCSOC.staff.role() — EL MISMO semáforo del composer.
 *   · Espera el final de #sc-boot (cualquier forma de ocultado, tope 6s).
 *   · Listener de Firebase desde el instante 0 + re-chequeo cada segundo.
 *   · Se re-ancla si algún script reconstruye el <body>.
 *  NUEVO: log de estado en consola ([Stevscon][SEC]) — si algo falla,
 *  la consola DIRÁ por qué (se acabó adivinar).
 *  ESCAPE HATCH: social.html?nosecurity=1 oculta el botón.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.security) return;
    if (/[?&]nosecurity=1/.test(location.search)) {
        console.log('[Stevscon] security_panel: desactivado (?nosecurity=1).');
        return;
    }

    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const BOOT_ID = 'sc-boot';       /* pantalla de arranque de social.html */
    const BOOT_MAX_WAIT = 6000;      /* tope: jamás ocultar de más */

    const SEC = SCSOC.security = {
        ready: false, isAdmin: false, _lastLog: '',
        open: function () { open(); },
        close: function () { close(); },
        refresh: function () { refresh(); },
        body: null /* <- aquí vamos a trabajar después (scsec-body) */
    };

    function log(msg) {
        if (SEC._lastLog === msg) return;
        SEC._lastLog = msg;
        console.log('[Stevscon][SEC] ' + msg);
    }

    /* ==== SESIÓN (Firebase puro, como admin_post.js) ==== */
    function sessionUser() {
        try { return (window.firebase && firebase.auth) ? firebase.auth().currentUser : null; }
        catch (e) { return null; }
    }
    function isOwnerEmail(u) {
        return !!(u && String(u.email || '').toLowerCase() === OWNER_EMAIL);
    }

    /* ==== ¿STAFF? — EL MISMO semáforo que el composer (SCSOC.staff.role) ==== */
    function staffCheck(cb) {
        try {
            if (SCSOC.staff && typeof SCSOC.staff.role === 'function') {
                SCSOC.staff.role(function (r) { cb(!!r); });
            } else {
                cb(isOwnerEmail(sessionUser())); /* motor aún no carga -> owner por email */
            }
        } catch (e) { cb(isOwnerEmail(sessionUser())); }
    }

    /* ==== PANTALLA DE ARRANQUE: ¿terminó? (entiende TODO tipo de ocultado) ==== */
    let bootDeadline = 0;
    function bootDone() {
        const b = document.getElementById(BOOT_ID);
        if (!b || !b.isConnected) return true;
        let hidden = false;
        try {
            const cs = getComputedStyle(b);
            hidden = b.style.display === 'none' || cs.display === 'none'
                  || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05
                  || b.getAttribute('aria-hidden') === 'true';
        } catch (e) { hidden = (b.style.display === 'none'); }
        if (hidden) return true;
        if (!bootDeadline) bootDeadline = Date.now() + BOOT_MAX_WAIT;
        return Date.now() > bootDeadline;
    }

    /* ==== ESTILOS — AHORA EN LA CÚSPIDE DE CAPAS ==== */
    const css = document.createElement('style');
    css.textContent = ''
        + '.scsec-btn{position:fixed;right:0;top:50%;transform:translateY(-50%) translateX(4px);z-index:2147483020;'
        +   'width:46px;height:52px;border:1px solid var(--border-color,#2e2440);border-right:0;'
        +   'border-radius:12px 0 0 12px;background:var(--bg-card,#16121f);color:var(--purple-accent,#8b5cf6);'
        +   'font-size:17px;cursor:pointer;display:none;align-items:center;justify-content:center;'
        +   'box-shadow:-4px 0 18px rgba(0,0,0,.35);transition:transform .22s cubic-bezier(.2,.8,.2,1),background .22s,color .22s,box-shadow .22s,opacity .2s ease;}'
        + '.scsec-btn.sc-on{display:flex;animation:scsec-in .45s cubic-bezier(.2,.8,.2,1) both;}'
        + 'body.scsec-open .scsec-btn{opacity:0;pointer-events:none;}' /* el botón no flota sobre su propio panel */
        + '.scsec-btn:hover{transform:translateY(-50%) translateX(6px);background:var(--purple-accent,#8b5cf6);color:#fff;box-shadow:-6px 0 24px rgba(139,92,246,.45);}'
        + '.scsec-btn:hover i{transform:rotate(-25deg);}'
        + '.scsec-btn i{transition:transform .3s cubic-bezier(.2,.8,.2,1);}'
        + '.scsec-btn:active{transform:translateY(-50%) translateX(2px) scale(.92);}'
        + '@keyframes scsec-in{from{opacity:0;transform:translateY(-50%) translateX(30px);}to{opacity:1;transform:translateY(-50%) translateX(4px);}}'
        + '.scsec-backdrop{position:fixed;inset:0;background:rgba(5,3,12,.55);z-index:2147483000;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
        + 'body.scsec-open .scsec-backdrop{opacity:1;pointer-events:auto;}'
        + '.scsec-panel{position:fixed;top:0;right:0;bottom:0;z-index:2147483010;width:min(430px,94vw);'
        +   'background:var(--bg-card,#16121f);border-left:1px solid var(--border-color,#2e2440);'
        +   'transform:translateX(105%);transition:transform .3s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;}'
        + 'body.scsec-open .scsec-panel{transform:translateX(0);}'
        + 'body.scsec-lock{overflow:hidden;}'
        + '.scsec-head{display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid var(--border-color,#2e2440);}'
        + '.scsec-title{font:800 12.5px Inter,sans-serif;letter-spacing:.16em;color:var(--text-main,#f8fafc);}'
        + '.scsec-tag{font:700 10px Inter,sans-serif;letter-spacing:.1em;color:var(--purple-accent,#8b5cf6);border:1px solid var(--border-color,#2e2440);border-radius:6px;padding:3px 7px;}'
        + '.scsec-x{margin-left:auto;border:0;background:var(--bg-hover,#261f36);color:var(--text-main,#f8fafc);width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;}'
        + '.scsec-body{flex:1;overflow-y:auto;padding:18px;}'
        + '.scsec-empty{border:1.5px dashed var(--border-color,#2e2440);border-radius:12px;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}'
        + '.scsec-emptytxt{color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif;text-align:center;padding:0 20px;}'
        + '@media (max-width:899px){.scsec-btn{width:40px;height:46px;font-size:15px;}}';
    document.head.appendChild(css);

    function open() {
        if (!SEC.isAdmin) return; /* doble chequeo: ni con consola se abre sin ser staff */
        document.body.classList.add('scsec-open', 'scsec-lock');
    }
    function close() {
        document.body.classList.remove('scsec-open', 'scsec-lock');
    }

    /* ==== REFRESCO: staff confirmado + pantalla de arranque terminada ==== */
    function paint(show) {
        if (!btn) return;
        btn.classList.toggle('sc-on', show);
        if (!show) close();
    }
    function refresh() {
        if (!btn) return;
        if (!document.contains(btn)) reattach(); /* seguro anti-reconstrucción del body */
        const u = sessionUser();
        if (!u) { SEC.isAdmin = false; paint(false); log('esperando sesión de Firebase…'); return; }
        staffCheck(function (is) {
            if (!btn) return;
            SEC.isAdmin = !!is;
            if (!SEC.isAdmin) { paint(false); log('oculto: no eres staff (esto NO debe salirte a ti)'); return; }
            if (!bootDone()) { paint(false); log('staff ✓ — esperando la pantalla de arranque…'); return; }
            paint(true); log('MOSTRADO — staff ✓ y página del Social encima, botón en la cúspide de capas ✓');
        });
    }
    function reattach() {
        if (btn && !document.contains(btn)) document.body.appendChild(btn);
        if (back && !document.contains(back)) document.body.appendChild(back);
        if (panel && !document.contains(panel)) document.body.appendChild(panel);
    }

    /* ==== INSTANTE 0: colgarnos a Firebase YA MISMO (no espera DOM) ==== */
    try {
        if (window.firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(function () { refresh(); });
        }
    } catch (e) { /* el intervalo de abajo cubre este caso */ }

    /* ==== CONSTRUCCIÓN (cuando el body exista) ==== */
    let btn, back, panel;
    function boot() {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scsec-btn';
        btn.setAttribute('aria-label', 'Panel de seguridad');
        btn.title = 'Seguridad';
        btn.innerHTML = '<i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i>';
        btn.addEventListener('click', open);
        document.body.appendChild(btn);

        back = document.createElement('div');
        back.className = 'scsec-backdrop';
        back.addEventListener('click', close);
        document.body.appendChild(back);

        panel = document.createElement('aside');
        panel.className = 'scsec-panel';
        const head = document.createElement('div'); head.className = 'scsec-head';
        const ic = document.createElement('i'); ic.className = 'fa-solid fa-shield-halved';
        ic.style.color = 'var(--purple-accent,#8b5cf6)';
        const tt = document.createElement('span'); tt.className = 'scsec-title'; tt.textContent = 'SEGURIDAD';
        const tag = document.createElement('span'); tag.className = 'scsec-tag'; tag.textContent = 'ADMIN';
        const x = document.createElement('button'); x.type = 'button'; x.className = 'scsec-x';
        x.setAttribute('aria-label', 'Cerrar');
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.addEventListener('click', close);
        head.appendChild(ic); head.appendChild(tt); head.appendChild(tag); head.appendChild(x);

        const bodyEl = document.createElement('div'); bodyEl.className = 'scsec-body';
        const empty = document.createElement('div'); empty.className = 'scsec-empty';
        const eic = document.createElement('i'); eic.className = 'fa-solid fa-hammer';
        eic.style.cssText = 'font-size:22px;color:var(--border-color,#2e2440);';
        const etx = document.createElement('div'); etx.className = 'scsec-emptytxt';
        etx.textContent = 'Zona de trabajo vacía — aquí va el módulo de seguridad.';
        empty.appendChild(eic); empty.appendChild(etx);
        bodyEl.appendChild(empty);

        panel.appendChild(head); panel.appendChild(bodyEl);
        document.body.appendChild(panel);

        SEC.body = bodyEl; /* <- ancla para construir el módulo después */

        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        document.addEventListener('sc:social-closed', close); /* si cierran el Social, el panel se cierra */
        setInterval(refresh, 1000);
        refresh();
        SEC.ready = true;
        console.log('[Stevscon] security_panel.js listo (v4) — botón en la CÚSPIDE de capas: ya nada lo entierra.');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window, document);