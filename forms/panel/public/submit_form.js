/**
 * ====
 * STEVSCON.COM — forms/panel/public/submit_form.js (v1)
 * PÚBLICO · 3/4 — EL MOTOR DE ENVÍO (FM.public.submit).
 *
 *  Todo lo que pasa cuando un usuario llena el form:
 *   - wireUploads(def, host): prende las zonas de imagen de FM.formView
 *     (click → elegir file → tope 20MB → miniatura + quitar).
 *   - setImg(host, qid, b64): siembra una imagen ya enviada al editar.
 *   - lock(host, on): bloquea/libera TODOS los controles del form.
 *   - collect(def, host): junta las respuestas de las 9 tipos (las
 *     opciones de radio se guardan como TEXTO, no como índice).
 *   - validate(def, answers, host): obligatorias — marca en rojo las
 *     que faltan y lleva el scroll hasta la primera.
 *   - attach(zone, def, formId, mode, onDone): la barra de acción:
 *       fresh    → "Enviar apostulación" (con confirmación: es 1 sola vez)
 *       edit     → "Guardar cambios" + "Cancelar" (no pisa el veredicto)
 *       resubmit → "Reenviar apostulación" (tras un rechazo)
 *     Todo pasa por FM.data.writeResponse (Parte 3), que decide el modo
 *     real en el servidor de datos y escribe atómico en Firebase.
 *
 *  Depende de forms_core.js y (en runtime) de FM.data.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;
FM.public = FM.public || {};

if (!core) { console.warn('[Stevscon] submit_form.js: falta forms_core.js'); return; }
FM.public.submit = FM.public.submit || {};

var IMGS = {};   /* qid -> base64 de esta sesión */

function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}
function addCls(e, c) { if (e && (' ' + e.className + ' ').indexOf(' ' + c + ' ') === -1) e.className += (e.className ? ' ' : '') + c; }
function rmCls(e, c) { if (!e) return; e.className = (' ' + e.className + ' ').split(' ' + c + ' ').join(' ').trim(); }

var styled = false;
function style() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-fm', 'pub-submit');
    st.textContent = ''
    + '.fmu-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px;padding:15px 16px;border-radius:14px;border:1px solid var(--border-color,#2e2440);background:var(--bg-card,#1a1625)}'
    + '.fmu-btn{padding:11px 20px;border-radius:11px;border:1px solid var(--purple-accent,#8b5cf6);background:var(--purple-accent,#8b5cf6);color:#fff;font:800 13px Inter,sans-serif;cursor:pointer;transition:all .15s ease}'
    + '.fmu-btn:hover{background:var(--purple-dark,#6d28d9);transform:translateY(-1px);box-shadow:0 8px 20px var(--purple-glow,rgba(139,92,246,.35))}'
    + '.fmu-btn:disabled{opacity:.55;cursor:wait;transform:none}'
    + '.fmu-btn.ghost{background:transparent;color:var(--text-muted,#94a3b8);border-color:var(--border-color,#2e2440)}'
    + '.fmu-btn.ghost:hover{color:var(--text-main,#f8fafc);border-color:var(--purple-accent,#8b5cf6);background:var(--purple-glow,rgba(139,92,246,.35));box-shadow:none}'
    + '.fmu-hint{flex:1;min-width:220px;font:600 12px/1.55 Inter,sans-serif;color:var(--text-muted,#94a3b8)}'
    + '.fmu-hint b{color:var(--text-main,#f8fafc)}'
    /* zonas de imagen prendidas */
    + '.fmv-drop.fmu-has{display:flex;align-items:center;gap:12px;padding:10px;flex-wrap:wrap}'
    + '.fmu-thumb{width:74px;height:54px;object-fit:cover;border-radius:9px;border:1px solid var(--border-color,#2e2440)}'
    + '.fmu-zinfo{flex:1;min-width:140px}'
    + '.fmu-zinfo b{display:block;font:700 12.5px Inter,sans-serif;color:var(--text-main,#f8fafc);word-break:break-all}'
    + '.fmu-zinfo span{display:block;font:600 11px Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:2px}'
    + '.fmu-zrm{width:30px;height:30px;border-radius:9px;border:1px solid rgba(248,113,113,.4);background:rgba(248,113,113,.1);color:#f87171;font-size:12px;cursor:pointer;transition:all .15s ease;flex:none}'
    + '.fmu-zrm:hover{background:rgba(248,113,113,.22)}'
    /* bloqueo y error */
    + '.fmu-locked .fmv-inp,.fmu-locked .fmv-ta,.fmu-locked .fmv-select{opacity:.55;cursor:not-allowed}'
    + '.fmu-locked .fmv-drop{pointer-events:none;opacity:.5}'
    + '.fmu-locked .fmv-opt{opacity:.6}'
    + '.fmu-miss{outline:1px solid rgba(248,113,113,.6);outline-offset:3px;border-radius:10px}'
    /* éxito */
    + '.fmu-ok{border-color:rgba(52,211,153,.45);display:block}'
    + '.fmu-okwrap{text-align:center;padding:6px 4px 2px}'
    + '.fmu-okwrap i{font-size:34px;color:#34d399}'
    + '.fmu-okwrap b{display:block;font:800 16px Inter,sans-serif;color:var(--text-main,#f8fafc);margin-top:10px}'
    + '.fmu-okwrap span{display:block;font:600 12.5px/1.6 Inter,sans-serif;color:var(--text-muted,#94a3b8);margin-top:6px;max-width:480px;margin-left:auto;margin-right:auto}'
    + '.fmu-okbtns{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:15px}';
    (document.head || document.documentElement).appendChild(st);
}

function fmtSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + 'MB';
    return Math.max(1, Math.round(bytes / 1024)) + 'KB';
}

/* ==== estado por sesión ==== */
FM.public.submit.reset = function () { IMGS = {}; };

/* imagen ya enviada (al editar): se siembra para que no se pierda */
FM.public.submit.setImg = function (host, qid, dataUrl) {
    IMGS[qid] = dataUrl;
    var zone = host && host.querySelector('.fmv-drop[data-fmq="' + qid + '"]');
    if (zone) paintZone(zone, qid, dataUrl, 'Imagen ya enviada', 'se conserva al guardar — o quítala y sube otra');
};

/* ==== zonas de imagen ==== */
FM.public.submit.wireUploads = function (def, host) {
    if (!host) return;
    var zones = host.querySelectorAll('.fmv-drop[data-fmq]');
    for (var i = 0; i < zones.length; i++) {
        (function (zone) {
            var qid = zone.getAttribute('data-fmq');
            zone.addEventListener('click', function () {
                if ((' ' + host.className + ' ').indexOf(' fmu-locked ') !== -1) return;
                pickImage(function (b64, err, file) {
                    if (!b64) return core.toast(err || 'No se pudo leer la imagen.', 'error');
                    IMGS[qid] = b64;
                    paintZone(zone, qid, b64, file.name, fmtSize(file.size) + ' · lista para enviar');
                });
            });
        })(zones[i]);
    }
};

function pickImage(cb) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.style.display = 'none';
    inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        try { inp.value = ''; } catch (e) {}
        if (inp.parentNode) inp.parentNode.removeChild(inp);
        if (!f) return;
        if (!/^image\//i.test(f.type || '')) return cb(null, 'Solo imágenes (JPG, PNG, GIF, WEBP…).', f);
        if (f.size > core.LIMITS.imgBytes) {
            return cb(null, 'La imagen pesa ' + fmtSize(f.size) + ' — el tope es ' + core.LIMITS.imgMB + 'MB.', f);
        }
        var fr = new FileReader();
        fr.onload = function () {
            var s = String(fr.result || '');
            if (s.length > Math.floor(core.LIMITS.imgBytes * 1.4)) {
                return cb(null, 'La imagen es demasiado pesada ya convertida — prueba una más chica.', f);
            }
            cb(s, null, f);
        };
        fr.onerror = function () { cb(null, 'No se pudo leer la imagen.', f); };
        fr.readAsDataURL(f);
    });
    document.body.appendChild(inp);
    inp.click();
}

function paintZone(zone, qid, dataUrl, label, note) {
    zone.className = 'fmv-drop fmu-has';
    zone.textContent = '';
    var img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '';
    img.className = 'fmu-thumb';
    zone.appendChild(img);

    var info = el('div', 'fmu-zinfo');
    info.appendChild(el('b', '', label || 'Imagen lista'));
    if (note) info.appendChild(el('span', '', note));
    zone.appendChild(info);

    var rm = el('button', 'fmu-zrm');
    rm.type = 'button';
    rm.title = 'Quitar imagen';
    var ri = document.createElement('i');
    ri.className = 'fa-solid fa-xmark';
    rm.appendChild(ri);
    rm.addEventListener('click', function (ev) {
        ev.stopPropagation();
        delete IMGS[qid];
        restoreZone(zone);
    });
    zone.appendChild(rm);
}

function restoreZone(zone) {
    zone.className = 'fmv-drop';
    zone.textContent = '';
    var i = document.createElement('i');
    i.className = 'fa-solid fa-image';
    zone.appendChild(i);
    zone.appendChild(document.createTextNode(' Subir imagen (hasta ' + core.LIMITS.imgMB + 'MB)'));
}

/* ==== bloquear / liberar ==== */
FM.public.submit.lock = function (host, on) {
    if (!host) return;
    var all = host.querySelectorAll('[data-fmq]');
    for (var i = 0; i < all.length; i++) {
        try { all[i].disabled = !!on; } catch (e) {}
    }
    if (on) addCls(host, 'fmu-locked'); else rmCls(host, 'fmu-locked');
};

/* ==== juntar respuestas ==== */
FM.public.submit.collect = function (def, host) {
    var answers = {};
    var qs = (def && def.questions) || {};
    var map = {};
    var all = host.querySelectorAll('[data-fmq]');
    for (var i = 0; i < all.length; i++) {
        var qid = all[i].getAttribute('data-fmq');
        if (!map[qid]) map[qid] = [];
        map[qid].push(all[i]);
    }
    Object.keys(qs).forEach(function (qid) {
        var q = qs[qid] || {};
        var els = map[qid] || [];
        var t = q.type;

        if (t === 'image') {
            if (IMGS[qid]) answers[qid] = IMGS[qid];
            return;
        }
        if (t === 'checkbox') {
            var arr = [];
            els.forEach(function (e) { if (e.type === 'checkbox' && e.checked) arr.push(String(e.value)); });
            if (arr.length) answers[qid] = arr;
            return;
        }
        if (t === 'multiple') {
            var sel = null;
            els.forEach(function (e) { if (e.type === 'radio' && e.checked) sel = String(e.value); });
            if (sel !== null) {
                /* el radio guarda el ÍNDICE — lo volvemos texto de opción */
                var idx = parseInt(sel, 10);
                var opts = q.options || [];
                answers[qid] = (idx >= 0 && idx < opts.length) ? String(opts[idx]) : sel;
            }
            return;
        }
        /* text, paragraph, number, date, url, dropdown */
        var c = els[0];
        if (!c) return;
        var v = String(c.value == null ? '' : c.value).trim();
        if (v !== '') answers[qid] = v;
    });
    return answers;
};

/* ==== obligatorias ==== */
FM.public.submit.validate = function (def, answers, host) {
    var qs = (def && def.questions) || {};
    var missing = [];
    var firstCtl = null;

    var blocks = host.querySelectorAll('.fmv-q');
    for (var b = 0; b < blocks.length; b++) rmCls(blocks[b], 'fmu-miss');

    Object.keys(qs).forEach(function (qid) {
        var q = qs[qid] || {};
        if (!q.required) return;
        var v = answers ? answers[qid] : undefined;
        var empty = (v === undefined || v === null || v === '' ||
            (Object.prototype.toString.call(v) === '[object Array]' && !v.length));
        if (!empty) return;

        missing.push(q.label || 'Pregunta');
        var ctl = host.querySelector('[data-fmq="' + qid + '"]');
        if (ctl) {
            if (!firstCtl) firstCtl = ctl;
            var node = ctl;
            while (node && node !== host) {
                if ((' ' + node.className + ' ').indexOf(' fmv-q ') !== -1) { addCls(node, 'fmu-miss'); break; }
                node = node.parentNode;
            }
        }
    });

    if (firstCtl) {
        try { firstCtl.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        catch (e) { try { firstCtl.scrollIntoView(); } catch (e2) {} }
    }
    return missing;
};

/* ==== LA BARRA DE ENVÍO ==== */
var LABELS = {
    fresh:    { btn: 'Enviar apostulación', hint: 'Se envía <b>una sola vez</b>. Después puedes editarla mientras esté Pendiente.' },
    edit:     { btn: 'Guardar cambios',     hint: 'Estás editando tu apostulación ya enviada — el veredicto del staff no se toca.' },
    resubmit: { btn: 'Reenviar apostulación', hint: 'Tu anterior fue rechazada — corrige lo que falte y esta va con todo.' }
};

FM.public.submit.attach = function (zone, def, formId, mode, onDone) {
    if (!zone || !def) return;
    style();
    var spec = LABELS[mode] || LABELS.fresh;

    zone.textContent = '';
    var bar = el('div', 'fmu-bar');
    var btn = el('button', 'fmu-btn', spec.btn);
    btn.type = 'button';
    bar.appendChild(btn);

    if (mode === 'edit') {
        var cancel = el('button', 'fmu-btn ghost', 'Cancelar');
        cancel.type = 'button';
        cancel.addEventListener('click', function () {
            if (onDone) onDone();   /* re-bloquea y repinta el estado */
        });
        bar.appendChild(cancel);
    }

    /* hint con <b> sin innerHTML: texto plano equivalente */
    var hint = el('div', 'fmu-hint');
    var b = el('b', '', mode === 'fresh' ? 'una sola vez' : (mode === 'edit' ? 'editar' : 'reenvío'));
    hint.appendChild(document.createTextNode(mode === 'fresh'
        ? 'Se envía '
        : (mode === 'edit' ? 'Estás en modo ' : 'Esto es un ')));
    hint.appendChild(b);
    hint.appendChild(document.createTextNode(mode === 'fresh'
        ? '. Después puedes editarla mientras esté Pendiente.'
        : (mode === 'edit' ? ' de tu apostulación ya enviada — el veredicto del staff no se toca.' : ' tras un rechazo — corrige lo que falte y esta va con todo.')));
    bar.appendChild(hint);
    zone.appendChild(bar);

    btn.addEventListener('click', function () {
        var answers = FM.public.submit.collect(def, zone.ownerDocument ? findHost(zone) : zone);
        /* el form vive en see_form: lo buscamos subiendo desde la barra */
        var host = findHost(zone);
        var missing = FM.public.submit.validate(def, answers, host);
        if (missing.length) {
            core.toast('Falta responder: ' + missing.slice(0, 3).join(', ') +
                (missing.length > 3 ? ' y ' + (missing.length - 3) + ' más' : '') + '.', 'error');
            return;
        }
        if (mode === 'fresh' || mode === 'resubmit') {
            confirmSend(function () { send(); });
        } else {
            send();
        }
    });

    function findHost(from) {
        /* la barra cuelga de actionHost (hermano del form) — subimos hasta el contenedor de see_form */
        var node = from.parentNode;
        while (node && node !== document.body) {
            if (node.querySelector && node.querySelector('.fmv-q')) return node;
            node = node.parentNode;
        }
        return from;
    }

    function confirmSend(ok) {
        var ui = (FM.creator && FM.creator.ui) ? FM.creator.ui : null;
        if (!ui || !ui.modal) { ok(); return; }   /* sin modal disponible: directo */
        ui.modal('¿Enviar tu apostulación?', { icon: 'fa-paper-plane', dismiss: true, maxW: 440 }, function (body, foot, ov) {
            body.appendChild(el('div', 'font:600 13px/1.6 Inter,sans-serif;color:var(--text-muted,#94a3b8)',
                'Se puede enviar UNA sola vez por formulario. Después podrás editarla mientras esté Pendiente, y si te rechazan, reintentarlo.'));
            foot.appendChild(ui.btn('Todavía no', 'ghost', function () { ov.close(); }));
            foot.appendChild(ui.btn('Sí, enviar', '', function () { ov.close(); ok(); }));
        });
    }

    function send() {
        if (!FM.data || !FM.data.writeResponse) {
            core.toast('Falta data_save/public_forms.js — no se puede enviar.', 'error');
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Enviando…';

        var host = findHost(zone);
        var answers = FM.public.submit.collect(def, host);

        FM.data.writeResponse(formId, answers, function (r) {
            if (r && r.ok) {
                core.toast(r.mode === 'edit' ? 'Cambios guardados ✓' : '¡Apostulación enviada! ✓', 'ok');
                success(r.mode || mode);
            } else {
                btn.disabled = false;
                btn.textContent = spec.btn;
                core.toast((r && r.error) || 'No se pudo enviar.', 'error');
            }
        });
    }

    function success(m) {
        var TIT = { fresh: '¡Apostulación enviada!', edit: 'Cambios guardados', resubmit: '¡Reenviada!' };
        var DES = {
            fresh: 'Quedó Pendiente — puedes editarla mientras el staff la revisa. El aviso del veredicto te llega en Mis apostulaciones.',
            edit: 'Tu apostulación sigue Pendiente, ahora con tus respuestas actualizadas.',
            resubmit: 'Vuelve a estar Pendiente con tus nuevas respuestas — cruza los dedos.'
        };
        zone.textContent = '';
        var card = el('div', 'fmu-bar fmu-ok');
        var wrap = el('div', 'fmu-okwrap');
        var i = document.createElement('i');
        i.className = 'fa-solid fa-circle-check';
        wrap.appendChild(i);
        wrap.appendChild(el('b', '', TIT[m] || TIT.fresh));
        wrap.appendChild(el('span', '', DES[m] || DES.fresh));

        var btns = el('div', 'fmu-okbtns');
        var goMine = el('button', 'fmu-btn', 'Ver mis apostulaciones');
        goMine.type = 'button';
        goMine.addEventListener('click', function () { try { location.hash = '#mis'; } catch (e) {} });
        var stay = el('button', 'fmu-btn ghost', 'Ver el estado aquí');
        stay.type = 'button';
        stay.addEventListener('click', function () { if (onDone) onDone(); });
        btns.appendChild(goMine);
        btns.appendChild(stay);
        wrap.appendChild(btns);
        card.appendChild(wrap);
        zone.appendChild(card);
        try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
};

console.log('[Stevscon] public/submit_form.js listo (v1) — motor de envío: obligatorias, imagen 20MB, 1 vez, editar y reenviar.');
})(window, document);