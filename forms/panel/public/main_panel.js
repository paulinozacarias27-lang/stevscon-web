/**
 * ====
 * STEVSCON.COM — forms/panel/public/main_panel.js (v1)
 * PÚBLICO · 1/4 — LA PORTADA (FM.public.main).
 *
 *  FM.public.main.render(view) pinta la landing de Apostulaciones:
 *   - Encabezado + (staff) franja con acceso a Revisión.
 *   - Tarjetas de cada formulario de forms/defs: banner (o degradado),
 *     nombre, descripción, "N preguntas", "por X · hace Y" y TU
 *     ESTADO EN VIVO (chip que se actualiza solo con .on):
 *       sin enviar → "Postularme" (morado)
 *       pending    → "Pendiente de revisión" (ámbar)
 *       accepted   → "Aceptado ★ X/10" (verde)
 *       declined   → "Rechazado — puedes reintentar" (rojo)
 *   - Borradores (meta.published === false): solo el staff los ve.
 *   - Sin forms publicados → estado vacío bonito (nunca un error).
 *  Depende de forms_core.js. Firebase solo al llamar.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;
FM.public = FM.public || {};

if (!core) { console.warn('[Stevscon] main_panel.js: falta forms_core.js'); return; }
FM.public.main = FM.public.main || {};

var GEN = 0;
var LIVE = [];   /* listeners .on de los chips (se limpian al re-pintar) */
function stopLive() {
    for (var i = 0; i < LIVE.length; i++) {
        try { LIVE[i].ref.off('value', LIVE[i].fn); } catch (e) {}
    }
    LIVE = [];
}

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
    st.setAttribute('data-fm', 'pub-main');
    st.textContent = ''
    + '.fmp-head{margin:2px 0 16px}'
    + '.fmp-title{display:flex;align-items:center;gap:11px;font:800 24px Inter,sans-serif;letter-spacing:-.02em;color:var(--text-main,#f8fafc)}'
    + '.fmp-title i{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--purple-dark,#6d28d9),var(--purple-accent,#8b5cf6));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;box-shadow:0 8px 20px var(--purple-glow,rgba(139,92,246,.35));flex:none}'
    + '.fmp-sub{font:600 13px/1.6 Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:8px;max-width:560px}'
    + '.fmp-load{text-align:center;padding:40px 10px;color:var(--text-muted,#94a3b8);font:600 12.5px Inter,sans-serif}'
    + '.fmp-staff{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:10px 14px;border-radius:12px;border:1px solid var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35));margin-bottom:14px;font:700 12px Inter,sans-serif;color:var(--text-main,#f8fafc)}'
    + '.fmp-staff i{color:var(--purple-accent,#8b5cf6)}'
    + '.fmp-staff span{flex:1;min-width:180px}'
    + '.fmp-sbtn{padding:7px 13px;border-radius:10px;border:1px solid var(--purple-accent,#8b5cf6);background:transparent;color:var(--purple-accent,#8b5cf6);font:800 11.5px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
    + '.fmp-sbtn:hover{background:var(--purple-accent,#8b5cf6);color:#fff}'
    + '.fmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}'
    + '.fmp-card{display:flex;flex-direction:column;border-radius:16px;overflow:hidden;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#1a1625);text-decoration:none;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}'
    + '.fmp-card:hover{transform:translateY(-3px);border-color:var(--purple-accent,#8b5cf6);box-shadow:0 14px 30px rgba(0,0,0,.35)}'
    + '.fmp-banner{width:100%;height:118px;object-fit:cover;display:block;border-bottom:1px solid var(--border-color,#2e2440)}'
    + '.fmp-ph{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--purple-dark,#6d28d9),var(--purple-glow,rgba(139,92,246,.35)))}'
    + '.fmp-ph i{font-size:26px;color:rgba(255,255,255,.9)}'
    + '.fmp-cardbody{display:flex;flex-direction:column;gap:7px;padding:14px 15px 15px;flex:1}'
    + '.fmp-chips{display:flex;gap:6px;flex-wrap:wrap}'
    + '.fmp-chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font:800 10.5px Inter,sans-serif;letter-spacing:.02em}'
    + '.fmp-chip.none{background:var(--purple-glow,rgba(139,92,246,.35));color:var(--purple-accent,#8b5cf6)}'
    + '.fmp-chip.pending{background:rgba(245,158,11,.13);color:#f59e0b}'
    + '.fmp-chip.accepted{background:rgba(52,211,153,.13);color:#34d399}'
    + '.fmp-chip.declined{background:rgba(248,113,113,.13);color:#f87171}'
    + '.fmp-chip.draft{background:rgba(245,158,11,.13);color:#f59e0b}'
    + '.fmp-name{font:800 15.5px Inter,sans-serif;color:var(--text-main,#f8fafc);letter-spacing:-.01em}'
    + '.fmp-desc{font:600 12px/1.55 Inter,sans-serif;color:var(--text-muted,#94a3b8);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
    + '.fmp-metaline{font:600 11px Inter,sans-serif;color:var(--text-muted,#94a3b8)}'
    + '.fmp-go{margin-top:auto;padding-top:6px;font:800 12px Inter,sans-serif;color:var(--purple-accent,#8b5cf6);display:flex;align-items:center;gap:6px}'
    + '.fmp-go i{transition:transform .15s ease}'
    + '.fmp-card:hover .fmp-go i{transform:translateX(3px)}'
    + '.fmp-empty{border:1px dashed var(--border-color,#2e2440);border-radius:16px;background:var(--bg-card,#1a1625);padding:46px 20px;text-align:center}'
    + '.fmp-empty i{font-size:30px;color:var(--purple-accent,#8b5cf6)}'
    + '.fmp-empty b{display:block;font:800 15px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-top:10px}'
    + '.fmp-empty span{display:block;font:600 12.5px/1.6 Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:5px;max-width:460px;margin-left:auto;margin-right:auto}';
    (document.head || document.documentElement).appendChild(st);
}

function isImg(s) {
    return /^data:image\//i.test(String(s || '')) || /^https?:\/\//i.test(String(s || ''));
}

/* ==== RENDER (lo llama connect_form.js) ==== */
FM.public.main.render = function (view) {
    if (!view) return;
    style();
    stopLive();
    var gen = ++GEN;

    view.textContent = '';
    var head = el('div', 'fmp-head');
    var t = el('div', 'fmp-title');
    var ti = document.createElement('i');
    ti.className = 'fa-solid fa-file-signature';
    t.appendChild(ti);
    t.appendChild(document.createTextNode('Apostulaciones'));
    head.appendChild(t);
    head.appendChild(el('div', 'fmp-sub', 'Postúlate al equipo de Stevscon — una sola vez por formulario, con revisión, nota y calificación del staff.'));
    view.appendChild(head);
    view.appendChild(el('div', 'fmp-load', 'Cargando formularios…'));

    core.session(function (s) {
        if (gen !== GEN) return;
        paintDefs(view, s || { user: null, uid: null, isStaff: false }, gen);
    });
};

function paintDefs(view, s, gen) {
    core.db().ref('forms/defs').once('value').then(function (snap) {
        if (gen !== GEN) return;
        var all = snap.val() || {};
        var ids = Object.keys(all).filter(function (id) {
            var d = all[id];
            if (!d || !d.meta) return false;
            return s.isStaff || d.meta.published !== false;   /* borradores: solo staff */
        });
        ids.sort(function (a, b) {
            return (Number(all[b].meta.createdAt) || 0) - (Number(all[a].meta.createdAt) || 0);
        });

        view.textContent = '';
        if (s.isStaff) view.appendChild(staffStrip());

        if (!ids.length) {
            view.appendChild(emptyState(s, false));
            return;
        }

        var grid = el('div', 'fmp-grid');
        view.appendChild(grid);
        ids.forEach(function (id) { grid.appendChild(card(id, all[id], s)); });
    }).catch(function () {
        if (gen !== GEN) return;
        view.textContent = '';
        view.appendChild(emptyState(s, true));
    });
}

function staffStrip() {
    var strip = el('div', 'fmp-staff');
    var i = document.createElement('i');
    i.className = 'fa-solid fa-shield-halved';
    strip.appendChild(i);
    strip.appendChild(el('span', '', 'Eres del staff — también puedes revisar y crear desde aquí.'));
    var b = el('button', 'fmp-sbtn', 'Abrir revisión');
    b.type = 'button';
    b.addEventListener('click', function () {
        if (FM.review && FM.review.panel) FM.review.panel.open();
        else core.toast('Falta create_form/view_panel.js.', 'error');
    });
    strip.appendChild(b);
    return strip;
}

function card(id, def, s) {
    var meta = def.meta || {};
    var a = el('a', 'fmp-card');
    a.href = '#form/' + encodeURIComponent(id);

    if (isImg(meta.banner)) {
        var img = document.createElement('img');
        img.src = meta.banner;
        img.alt = '';
        img.className = 'fmp-banner';
        img.loading = 'lazy';
        a.appendChild(img);
    } else {
        var ph = el('div', 'fmp-banner fmp-ph');
        var pi = document.createElement('i');
        pi.className = 'fa-solid fa-file-signature';
        ph.appendChild(pi);
        a.appendChild(ph);
    }

    var body = el('div', 'fmp-cardbody');

    var chips = el('div', 'fmp-chips');
    if (meta.published === false) chips.appendChild(el('span', 'fmp-chip draft', 'Borrador'));
    var stChip = el('span', 'fmp-chip none', 'Postularme');
    chips.appendChild(stChip);
    body.appendChild(chips);

    body.appendChild(el('div', 'fmp-name', meta.name || 'Formulario'));
    var desc = String(meta.description || meta.desc || '').trim();
    if (desc) body.appendChild(el('div', 'fmp-desc', desc));

    var line = [];
    var nq = def.questions ? Object.keys(def.questions).length : 0;
    if (nq) line.push(nq + (nq === 1 ? ' pregunta' : ' preguntas'));
    var by = meta.createdByName || meta.ownerName ||
        (meta.createdByEmail ? String(meta.createdByEmail).split('@')[0] : '');
    if (by) line.push('por ' + by);
    if (Number(meta.createdAt)) line.push(core.timeAgo(Number(meta.createdAt)));
    if (line.length) body.appendChild(el('div', 'fmp-metaline', line.join(' · ')));

    var go = el('span', 'fmp-go');
    go.appendChild(document.createTextNode('Ver formulario '));
    var gi = document.createElement('i');
    gi.className = 'fa-solid fa-arrow-right';
    go.appendChild(gi);
    body.appendChild(go);

    a.appendChild(body);

    /* TU ESTADO EN VIVO (solo con sesión; rules: lees tu propia meta) */
    if (s && s.uid) {
        try {
            var ref = core.db().ref('forms/responses/' + id + '/' + s.uid + '/meta');
            var fn = function (snap) { paintChip(stChip, snap.val()); };
            ref.on('value', fn, function () {});   /* sin permiso: silencio, queda "Postularme" */
            LIVE.push({ ref: ref, fn: fn });
        } catch (e) {}
    }
    return a;
}

function paintChip(host, meta) {
    meta = meta || {};
    var st = meta.status || null;
    if (st === 'pending') { host.className = 'fmp-chip pending'; host.textContent = 'Pendiente de revisión'; return; }
    if (st === 'accepted') {
        host.className = 'fmp-chip accepted';
        host.textContent = 'Aceptado' + (typeof meta.score === 'number' && meta.score > 0 ? ' ★ ' + meta.score + '/10' : ' ✓');
        return;
    }
    if (st === 'declined') { host.className = 'fmp-chip declined'; host.textContent = 'Rechazado — puedes reintentar'; return; }
    host.className = 'fmp-chip none';
    host.textContent = 'Postularme';
}

function emptyState(s, isErr) {
    var big = el('div', 'fmp-empty');
    var i = document.createElement('i');
    i.className = 'fa-solid ' + (isErr ? 'fa-triangle-exclamation' : 'fa-inbox');
    big.appendChild(i);
    big.appendChild(el('b', '', isErr ? 'No se pudieron cargar los formularios' : 'Todavía no hay apostulaciones abiertas'));
    big.appendChild(el('span', '', isErr
        ? 'Revisa tu conexión y recarga la página — si sigue igual, avísale al staff.'
        : (s && s.isStaff
            ? 'Crea la primera con el botón + de la esquina — aparecerá aquí en cuanto la publiques.'
            : 'Vuelve pronto: aquí aparecerán las postulaciones a Discord, PotForce Mod, Stevscon.com Mod y más.')));
    return big;
}

console.log('[Stevscon] public/main_panel.js listo (v1) — portada: tarjetas + estado en vivo por usuario.');
})(window, document);