/**
 * ====
 * STEVSCON.COM — social/manage/output/security/security_panel.js (v2)
 * CATEGORÍA «SECURITY» — BOTÓN DE HERRAMIENTAS SOLO PARA ADMINS.
 *
 * v2 — FIX: el botón no aparecía al entrar a social.html.
 *  Causa real: social.html no carga memory_acc.js, así que la detección
 *  dependía solo de Firebase, cuya sesión tarda segundos en restaurarse;
 *  la v1 se colgaba tarde al evento y re-chequeaba cada 2.5s -> el botón
 *  debutaba cuando ya estabas saliendo. Ahora:
 *   1) El listener de Firebase se registra en el INSTANTE 0 (no espera
 *      DOMContentLoaded) -> detecta el admin en cuanto la sesión existe.
 *   2) Re-chequeo rápido cada 400ms (antes 2500ms).
 *   3) REVELACIÓN SINCRONIZADA con la pantalla de arranque: el botón
 *      hace su entrada animada justo cuando #sc-boot se apaga (con tope
 *      de 20s de emergencia para no quedar nunca invisible).
 *   4) Si algún script reconstruye el <body>, el botón se re-ancla solo.
 *  Detección (igual que v1, tus sistemas, cero inventos):
 *      OwnerSystem.isOwner / AdminSystem.isAdmin / role 'admin'|'owner'
 *      / email owner vía Firebase Auth.
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
    const BOOT_ID = 'sc-boot';        /* pantalla de arranque de social.html */
    const BOOT_MAX_WAIT = 20000;      /* tope de espera a la pantalla de arranque */

    const SEC = SCSOC.security = {
        ready: false, isAdmin: false,
        open: function () { open(); },
        close: function () { close(); },
        refresh: function () { refresh(); },
        body: null /* <- aquí vamos a trabajar después (scsec-body) */
    };

    /* ==== DETECCIÓN DE ADMIN (tus sistemas, cero adivinanzas) ==== */
    function resolveAdmin() {
        try {
            const u = (typeof MemoryAcc !== 'undefined' && MemoryAcc.getLocalUser)
                ? MemoryAcc.getLocalUser() : null;
            if (u) {
                if (typeof OwnerSystem !== 'undefined' && OwnerSystem.isOwner && OwnerSystem.isOwner(u)) return true;
                if (typeof AdminSystem !== 'undefined' && AdminSystem.isAdmin && AdminSystem.isAdmin(u)) return true;
                const role = String(u.role || '').toLowerCase();
                if (role === 'admin' || role === 'owner') return true;
            }
        } catch (e) { /* esta página no carga memory_acc.js -> Firebase respalda */ }
        try {
            const fb = (window.firebase && firebase.auth) ? firebase.auth().currentUser : null;
            if (fb && String(fb.email || '').toLowerCase() === OWNER_EMAIL) return true;
        } catch (e) {}
        return false;
    }

    /* ==== PANTALLA DE ARRANQUE: ¿ya terminó? ==== */
    let bootDeadline = 0;
    function bootDone() {
        const b = document.getElementById(BOOT_ID);
        if (!b) return true;                          /* no hay pantalla -> revelar ya */
        if (b.style.display === 'none') return true;  /* hideBoot() ya pasó */
        try { if (getComputedStyle(b).display === 'none') return true; } catch (e) {}
        if (!bootDeadline) bootDeadline = Date.now() + BOOT_MAX_WAIT;
        if (Date.now() > bootDeadline) return true;   /* emergencia: nunca ocultar de más */
        return false;
    }

    /* ==== ESTILOS (idénticos a v1) ==== */
    const css = document.createElement('style');
    css.textContent = ''
        + '.scsec-btn{position:fixed;right:0;top:50%;transform:translateY(-50%) translateX(4px);z-index:960;'
        +   'width:46px;height:52px;border:1px solid var(--border-color,#2e2440);border-right:0;'
        +   'border-radius:12px 0 0 12px;background:var(--bg-card,#16121f);color:var(--purple-accent,#8b5cf6);'
        +   'font-size:17px;cursor:pointer;display:none;align-items:center;justify-content:center;'
        +   'box-shadow:-4px 0 18px rgba(0,0,0,.35);transition:transform .22s cubic-bezier(.2,.8,.2,1),background .22s,color .22s,box-shadow .22s;}'
        + '.scsec-btn.sc-on{display:flex;animation:scsec-in .45s cubic-bezier(.2,.8,.2,1) both;}'
        + '.scsec-btn:hover{transform:translateY(-50%) translateX(6px);background:var(--purple-accent,#8b5cf6);color:#fff;box-shadow:-6px 0 24px rgba(139,92,246,.45);}'
        + '.scsec-btn:hover i{transform:rotate(-25deg);}'
        + '.scsec-btn i{transition:transform .3s cubic-bezier(.2,.8,.2,1);}'
        + '.scsec-btn:active{transform:translateY(-50%) translateX(2px) scale(.92);}'
        + '@keyframes scsec-in{from{opacity:0;transform:translateY(-50%) translateX(30px);}to{opacity:1;transform:translateY(-50%) translateX(4px);}}'
        + '.scsec-backdrop{position:fixed;inset:0;background:rgba(5,3,12,.55);z-index:970;opacity:0;pointer-events:none;transition:opacity .25s ease;}'
        + 'body.scsec-open .scsec-backdrop{opacity:1;pointer-events:auto;}'
        + '.scsec-panel{position:fixed;top:0;right:0;bottom:0;z-index:980;width:min(430px,94vw);'
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
        if (!SEC.isAdmin) return; /* doble chequeo: ni con consola se abre sin ser admin */
        document.body.classList.add('scsec-open', 'scsec-lock');
    }
    function close() {
        document.body.classList.remove('scsec-open', 'scsec-lock');
    }

    /* ==== REFRESCO: admin confirmado + pantalla de arranque terminada ==== */
    function refresh() {
        if (!btn) return;
        SEC.isAdmin = resolveAdmin();
        const show = SEC.isAdmin && bootDone();
        if (!document.contains(btn)) { reattach(); } /* seguro anti-reconstrucción del body */
        btn.classList.toggle('sc-on', show);
        if (!show) close();
    }
    function reattach() {
        if (btn && !document.contains(btn)) document.body.appendChild(btn);
        if (back && !document.contains(back)) document.body.appendChild(back);
        if (panel && !document.contains(panel)) document.body.appendChild(panel);
    }

    /* ==== INSTANTE 0: colgarnos a Firebase YA MISMO (no espera DOM) ==== */
    try {
        if (window.firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(function () { if (btn) refresh(); });
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
        setInterval(refresh, 400); /* ritmo rápido: sesión o rol tardíos se cazan al instante */
        refresh();
        SEC.ready = true;
        console.log('[Stevscon] security_panel.js listo (v2) — aparece al terminar la pantalla de carga, solo admins.');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window, document);