/**
 * ====
 * STEVSCON.COM — social/manage/output/system/verified.js (v1)
 * SISTEMA DE VERIFICACIONES del Social (estilo X):
 *  - 5 tipos: clasico (celeste), cc/YouTube (rojo), mods (verde),
 *    dev (azul), gold (oro).
 *  - Guardado en social/verified/{uid} = { type, by, at }.
 *    SOLO Owner y Admins pueden escribir (reglas de Firebase) —
 *    nadie puede auto-verificarse porque NO vive en users/{uid}.
 *  - TIEMPO REAL: todas las cabezas de usuario (posts, comentarios,
 *    respuestas vía SCSOC.userHead) muestran la insignia al instante,
 *    y también junto al nombre dentro del panel de perfil.
 *  - BOTÓN STAFF: abajo de todo del panel de perfil, los Owner/Admins
 *    ven la barra VERIFICACIÓN con las 5 opciones + quitar.
 *  - Se conecta con: utils.js (userHead monta el hueco) y
 *    profiles_show.js (dispara el hook 'profilePanel').
 * ==== */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC._verifiedLoaded) return;
    SCSOC._verifiedLoaded = true;

    /* ==== CONFIG ==== */
    const REF = 'social/verified';              // social/verified/{uid} = { type, by, at }
    const ALLOWED_ROLES = ['owner', 'admin'];   // quién otorga (los mods NO)

    /* ==== LOS 5 TIPOS DE VERIFICACIÓN (cambia colores aquí) ==== */
    const TYPES = SCSOC.verifiedTypes = {
        classic: { label: 'Verificado clásico',        color: '#38bdf8', icon: 'check' },
        cc:      { label: 'Creador de contenido (CC)', color: '#ff0033', icon: 'youtube' },
        mods:    { label: 'Verificado Mods',           color: '#22c55e', icon: 'check' },
        dev:     { label: 'Verificado Developer',      color: '#3b82f6', icon: 'check' },
        gold:    { label: 'Verificado de Oro',         color: '#facc15', icon: 'check' }
    };

    /* ==== SVG de la insignia (estático, sin datos de usuario) ==== */
    function svgFor(type, px) {
        const t = TYPES[type] || TYPES.classic;
        const w = px || 15;
        if (t.icon === 'youtube') {
            return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" aria-label="' + t.label + '">' +
                '<rect x="2.4" y="5.6" width="19.2" height="12.8" rx="4" fill="' + t.color + '"/>' +
                '<path d="M10.3 9.2v5.6l5-2.8-5-2.8z" fill="#fff"/></svg>';
        }
        return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" aria-label="' + t.label + '">' +
            '<circle cx="12" cy="12" r="10.5" fill="' + t.color + '"/>' +
            '<path d="m7.3 12.6 3 3 6.4-6.8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    function badgeEl(type, px) {
        const t = TYPES[type];
        if (!t) return null;
        const s = SCSOC.el('span', 'display:inline-flex;flex:none;align-items:center;');
        s.title = t.label;
        s.innerHTML = svgFor(type, px);
        return s;
    }

    /* ==== ESCUCHA EN VIVO por usuario (cache estilo SCSOC.users) ==== */
    const _cache = {};
    function watch(uid, cb) {
        if (!uid) { if (cb) cb(null); return; }
        const c = _cache[uid] || (_cache[uid] = { cbs: [], ready: false, type: null, on: false });
        if (cb) c.cbs.push(cb);
        if (c.on) { if (c.ready) cb(c.type); return; }
        c.on = true;
        SCSOC.db().ref(REF).child(uid).on('value', function (snap) {
            const v = snap.val();
            c.type = (v && v.type && TYPES[v.type]) ? v.type : null;
            c.ready = true;
            for (let i = 0; i < c.cbs.length; i++) { try { c.cbs[i](c.type); } catch (e) {} }
        }, function (err) {
            console.error('[SCSOC verified] sin acceso a ' + REF, err);
            c.ready = true; c.type = null;
            for (let i = 0; i < c.cbs.length; i++) { try { c.cbs[i](null); } catch (e) {} }
        });
    }

    /* ==== OTORGAR / QUITAR (Owner y Admins; las reglas lo refuerzan) ==== */
    function canGrant(cb) {
        SCSOC.staff.role(function (role) { cb(ALLOWED_ROLES.indexOf(role) !== -1); });
    }

    function grant(uid, type) {
        return new Promise(function (resolve, reject) {
            if (!uid || !TYPES[type]) { reject(new Error('Verificación inválida')); return; }
            canGrant(function (ok) {
                if (!ok) { reject(new Error('Solo Owner y Admins pueden verificar')); return; }
                const me = firebase.auth().currentUser;
                SCSOC.db().ref(REF).child(uid).set({
                    type: type,
                    by: me ? me.uid : '',
                    at: firebase.database.ServerValue.TIMESTAMP
                }).then(resolve, reject);
            });
        });
    }

    function revoke(uid) {
        return new Promise(function (resolve, reject) {
            if (!uid) { reject(new Error('Falta el usuario')); return; }
            canGrant(function (ok) {
                if (!ok) { reject(new Error('Solo Owner y Admins pueden quitar')); return; }
                SCSOC.db().ref(REF).child(uid).remove().then(resolve, reject);
            });
        });
    }

    /* ==== MONTAR HUECO DE INSIGNIA (lo usa userHead de utils.js) ==== */
    function mount(uid, line, px) {
        const slot = SCSOC.el('span', 'display:inline-flex;flex:none;align-items:center;');
        line.appendChild(slot);
        watch(uid, function (type) {
            while (slot.firstChild) slot.removeChild(slot.firstChild);
            if (!slot.isConnected) return;
            const b = type ? badgeEl(type, px) : null;
            if (b) slot.appendChild(b);
        });
        return slot;
    }

    /* ==== PANEL DE PERFIL: insignia junto al nombre + barra staff abajo ==== */
    function ensureSlotAfterName(cardHost, slot) {
        if (!cardHost || !slot || slot.isConnected) return;
        const nameEl = cardHost.querySelector('h3');   // el nombre grande de la tarjeta
        if (!nameEl || !nameEl.parentNode) return;
        nameEl.parentNode.insertBefore(slot, nameEl.nextSibling);
    }

    SCSOC.onHook('profilePanel', function (uid, modal, cardHost) {
        if (!modal || !cardHost || modal.querySelector('[data-sc-verified-bar]')) return;

        /* insignia junto al nombre (para TODOS, en vivo) */
        const nameSlot = SCSOC.el('span', 'display:inline-flex;flex:none;align-items:center;');
        watch(uid, function (type) {
            while (nameSlot.firstChild) nameSlot.removeChild(nameSlot.firstChild);
            const b = type ? badgeEl(type, 18) : null;
            if (b) nameSlot.appendChild(b);
        });
        ensureSlotAfterName(cardHost, nameSlot);
        const obs = new MutationObserver(function () { ensureSlotAfterName(cardHost, nameSlot); });
        obs.observe(cardHost, { childList: true });

        /* barra de staff abajo de todo del panel */
        canGrant(function (ok) {
            if (!ok || !modal.isConnected) return;
            modal.appendChild(buildBar(uid));
        });
    });

    function buildBar(uid) {
        const bar = SCSOC.el('div', 'border-top:1px solid rgba(167,139,250,.25);margin:4px 14px 0;padding:12px 4px 14px;display:flex;flex-direction:column;gap:10px;');
        bar.dataset.scVerifiedBar = '1';

        const top = SCSOC.el('div', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;');
        const ttl = SCSOC.el('span', 'font:800 10.5px Inter,sans-serif;letter-spacing:.14em;color:#8f7fc0;');
        ttl.textContent = 'VERIFICACIÓN';
        const cur = SCSOC.el('span', 'display:inline-flex;align-items:center;gap:6px;font:700 12px Inter,sans-serif;color:#c4b5fd;margin-left:auto;');
        const btn = SCSOC.el('button', 'border:0;border-radius:999px;padding:7px 14px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;font:700 12px Inter,sans-serif;cursor:pointer;');
        btn.textContent = 'Dar verificación';
        top.appendChild(ttl); top.appendChild(cur); top.appendChild(btn);
        bar.appendChild(top);

        const picker = SCSOC.el('div', 'display:none;flex-direction:column;gap:6px;');
        bar.appendChild(picker);

        const rows = {};
        Object.keys(TYPES).forEach(function (k) {
            const t = TYPES[k];
            const row = SCSOC.el('button', 'display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid rgba(167,139,250,.25);background:rgba(26,21,38,.6);border-radius:10px;padding:9px 12px;cursor:pointer;color:#ede9fe;font:600 13px Inter,sans-serif;box-sizing:border-box;');
            row.appendChild(badgeEl(k, 17));
            const name = SCSOC.el('span', 'flex:1;');
            name.textContent = t.label;
            row.appendChild(name);
            const chip = SCSOC.el('span', 'display:none;font:800 9.5px Inter,sans-serif;letter-spacing:.12em;color:#22c55e;');
            chip.textContent = 'ACTUAL';
            row.appendChild(chip);
            row.addEventListener('click', function () {
                grant(uid, k).then(function () {
                    SCSOC.toast('Verificación aplicada: ' + t.label + ' ✅');
                    picker.style.display = 'none';
                }).catch(function (err) {
                    SCSOC.toast('⚠️ ' + (err && err.message ? err.message : 'No se pudo verificar'));
                });
            });
            rows[k] = { chip: chip };
            picker.appendChild(row);
        });

        const rm = SCSOC.el('button', 'display:flex;align-items:center;width:100%;text-align:left;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);border-radius:10px;padding:9px 12px;cursor:pointer;color:#fca5a5;font:700 13px Inter,sans-serif;box-sizing:border-box;');
        rm.textContent = 'Quitar verificación';
        rm.addEventListener('click', function () {
            revoke(uid).then(function () {
                SCSOC.toast('Verificación quitada');
                picker.style.display = 'none';
            }).catch(function (err) {
                SCSOC.toast('⚠️ ' + (err && err.message ? err.message : 'No se pudo quitar'));
            });
        });
        picker.appendChild(rm);

        btn.addEventListener('click', function () {
            picker.style.display = (picker.style.display === 'none' || !picker.style.display) ? 'flex' : 'none';
        });

        /* estado actual en vivo + marca ACTUAL en las filas */
        watch(uid, function (type) {
            while (cur.firstChild) cur.removeChild(cur.firstChild);
            Object.keys(rows).forEach(function (k) {
                rows[k].chip.style.display = (k === type) ? 'inline' : 'none';
            });
            if (type) {
                cur.appendChild(badgeEl(type, 14));
                const tx = SCSOC.el('span');
                tx.textContent = TYPES[type].label;
                cur.appendChild(tx);
                btn.textContent = 'Cambiar / Quitar';
            } else {
                cur.textContent = 'Sin verificación';
                btn.textContent = 'Dar verificación';
            }
        });

        return bar;
    }

    /* ==== API pública ==== */
    SCSOC.verified = {
        TYPES: TYPES,
        badgeEl: badgeEl,
        mount: mount,
        watch: watch,
        canGrant: canGrant,
        grant: grant,
        revoke: revoke
    };

    console.log('[Stevscon] verified.js listo (v1) — 5 verificaciones en tiempo real + botón staff en el panel.');
})(window, document);