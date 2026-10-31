/**
 * ====
 * STEVSCON.COM — forms/panel/admin/data_save/public_forms.js (v1)
 * DATA_SAVE · 2/4 — LA CAPA DE DATOS DE APOSTULACIONES (FM.data).
 *
 *  TODO lo que toca Firebase pasa por aquí:
 *
 *  LEER (público):
 *  - D.getDef(formId, cb) / D.listDefs(cb) / D.listPublished(cb)
 *  - D.formName(formId, cb)
 *
 *  GUARDAR DEFS (Owner/Admins — el creador de la Parte 2 sigue guardando
 *  directo como hasta hoy; esto es la API canónica para futuro y consola):
 *  - D.saveDef(def, cb) · D.setPublished(id, bool, cb) · D.deleteDef(id, cb)
 *
 *  RESPUESTAS (respuestas #6, #7 y #14 — el corazón):
 *  - D.writeResponse(formId, answers, [opts], cb)
 *      PRIMERA VEZ  → crea pending + congela perfil+Gmail
 *      PENDING      → EDITA (solo answers/perfil — JAMÁS pisa el veredicto
 *                     del staff: a prueba de carreras)
 *      DECLINED     → RE-ENVÍO: la respuesta vuelve a pending limpia
 *      ACCEPTED     → bloqueado (cb con error)
 *  - D.getMyResponse(formId, cb) → {meta, answers} | null
 *  - D.myResponses(cb) → [formId…] (índice forms/myResponses/{uid}/{fid}=true,
 *    SOLO membresía: el estado real siempre se lee vivo de la respuesta,
 *    así jamás se desincroniza y el staff no necesita escribir tu índice)
 *
 *  NOTIFICACIONES (forms/notifications/{uid} — las escribe SOLO el staff):
 *  - D.notifyUser(uid, payload, cb) · D.notifyEdited(formId, cb)
 *  - D.myNotifications(cb) → [{type, formId, formName, note, score, byName, at}…]
 *    "Leídas" = local (localStorage): no hay que tocar rules ni escribir
 *    desde el usuario.
 *
 *  VIGILANTE DE EDICIONES (respuesta #19):
 *  - D.watchEdits() — cuando el staff guarda cambios en un form (desde el
 *    Manager de la Parte 2), todos los que ya se postularon reciben
 *    "el formulario fue editado". Sin tocar los files del creador:
 *    compara huellas (SIN contar banners/imágenes) y avisa tras 30s de
 *    calma (varios guardados seguidos = UNA sola notificación). Solo corre
 *    en sesiones Owner/Admin. Se enciende solo al final del file.
 *
 *  CONTRATO DE RESPUESTAS (lo respeta submit_form.js en la Parte 4):
 *    answers/{qId}:
 *      text | paragraph | number | date | url | dropdown | multiple → STRING
 *        (multiple y dropdown guardan el TEXTO de la opción elegida)
 *      checkbox → ARRAY de textos
 *      image → dataURL base64 (data:image/…) hasta LIMITS.imgMB
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;
var D = FM.data = FM.data || {};

if (!core) { console.warn('[Stevscon] public_forms.js: falta forms_core.js'); return; }

/* ==== RUTAS (una sola fuente de verdad) ==== */
var P_DEFS = 'forms/defs';
var P_RESP = 'forms/responses';
var P_MINE = 'forms/myResponses';
var P_NOTIF = 'forms/notifications';
D.PATHS = { defs: P_DEFS, responses: P_RESP, mine: P_MINE, notif: P_NOTIF };

function needStaff(cb) {
    core.session(function (s) {
        if (!s || !s.isStaff) return cb(null);
        cb(s);
    });
}
function nameFromEmail(em) {
    em = String(em || '');
    return em ? em.split('@')[0] : 'Staff';
}
function me() {
    try { return firebase.auth().currentUser || null; } catch (e) { return null; }
}

/* ==== IDS ==== */
D.id = function () {
    return 'f_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
};

/* ==== NORMALIZAR ==== */
function normDef(id, raw) {
    raw = raw || {};
    return { id: id, meta: raw.meta || {}, panels: raw.panels || {}, questions: raw.questions || {} };
}
function toArr(map) {
    return Object.keys(map || {}).map(function (k) { return normDef(k, map[k]); })
        .sort(function (a, b) { return (b.meta.createdAt || 0) - (a.meta.createdAt || 0); });
}

/* ==== LEER DEFS (público — sin sesión) ==== */
D.getDef = function (formId, cb) {
    cb = cb || function () {};
    if (!formId) return cb(null);
    core.db().ref(P_DEFS + '/' + formId).once('value').then(function (s) {
        cb(s.exists() ? normDef(formId, s.val()) : null);
    }).catch(function () { cb(null); });
};

D.listDefs = function (cb) {
    cb = cb || function () {};
    core.db().ref(P_DEFS).once('value').then(function (s) {
        cb(toArr(s.val()));
    }).catch(function () { cb([]); });
};

/* publicados: un form sin bandera cuenta como publicado (compat con los
   defs que ya guardó el creador de la Parte 2) */
D.listPublished = function (cb) {
    D.listDefs(function (all) {
        cb((all || []).filter(function (d) { return d.meta.published !== false; }));
    });
};

D.formName = function (formId, cb) {
    cb = cb || function () {};
    core.db().ref(P_DEFS + '/' + formId + '/meta/name').once('value').then(function (s) {
        cb(s.val() || 'Formulario');
    }).catch(function () { cb('Formulario'); });
};

/* ==== GUARDAR / PUBLICAR / BORRAR DEFS (Owner y Admins) ==== */
D.saveDef = function (def, cb) {
    cb = cb || function () {};
    needStaff(function (s) {
        if (!s) { core.toast('Solo el Owner y los Admins pueden guardar formularios.', 'error'); return cb(false, 'permiso'); }
        if (!def || !def.id) return cb(false, 'Formulario inválido (falta el id).');
        var meta = def.meta || {};
        if (!meta.createdAt) meta.createdAt = Date.now();
        meta.updatedAt = Date.now();
        meta.byUid = s.uid;
        meta.byEmail = s.email;
        if (!meta.byName) meta.byName = nameFromEmail(s.email);
        core.db().ref(P_DEFS + '/' + def.id).set({
            meta: meta,
            panels: def.panels || {},
            questions: def.questions || {}
        }).then(function () { cb(true); })
          .catch(function (e) { cb(false, (e && e.message) || 'error de Firebase'); });
    });
};

D.setPublished = function (formId, published, cb) {
    cb = cb || function () {};
    needStaff(function (s) {
        if (!s) { core.toast('Solo el staff puede publicar/despublicar.', 'error'); return cb(false, 'permiso'); }
        core.db().ref(P_DEFS + '/' + formId + '/meta').update({
            published: !!published,
            updatedAt: Date.now()
        }).then(function () { cb(true); })
          .catch(function (e) { cb(false, (e && e.message) || 'error'); });
    });
};

D.deleteDef = function (formId, cb) {
    cb = cb || function () {};
    needStaff(function (s) {
        if (!s) { core.toast('Solo el staff puede eliminar formularios.', 'error'); return cb(false, 'permiso'); }
        /* las respuestas se quedan (auditoría); en "Mis apostulaciones"
           el form aparece tachado como "eliminado" */
        core.db().ref(P_DEFS + '/' + formId).remove()
            .then(function () { cb(true); })
            .catch(function (e) { cb(false, (e && e.message) || 'error'); });
    });
};

/* ==== RESPUESTAS · LEER ==== */
D.getMyResponse = function (formId, cb) {
    cb = cb || function () {};
    var u = me();
    if (!u || !formId) return cb(null);
    core.db().ref(P_RESP + '/' + formId + '/' + u.uid).once('value').then(function (s) {
        cb(s.exists() ? (s.val() || {}) : null);
    }).catch(function () { cb(null); });
};

D.myResponses = function (cb) {
    cb = cb || function () {};
    var u = me();
    if (!u) return cb([]);
    core.db().ref(P_MINE + '/' + u.uid).once('value').then(function (s) {
        var map = s.val() || {};
        cb(Object.keys(map).filter(function (k) { return !!map[k]; }));
    }).catch(function () { cb([]); });
};

/* ==== ENVIAR / EDITAR / RE-ENVIAR (lo usa submit_form.js en la Parte 4) ==== */
D.writeResponse = function (formId, answers, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = null; }
    cb = cb || function () {};
    opts = opts || {};

    var u = me();
    if (!u) return cb({ ok: false, error: 'Necesitas iniciar sesión para postularte.' });
    if (!formId) return cb({ ok: false, error: 'Falta el formulario.' });

    var clean = sanitizeAnswers(answers || {});

    /* el form debe existir y estar abierto */
    D.getDef(formId, function (def) {
        if (!def) return cb({ ok: false, error: 'Ese formulario ya no existe.' });
        if (def.meta.published === false) return cb({ ok: false, error: 'Ese formulario no está abierto ahora mismo.' });

        var base = P_RESP + '/' + formId + '/' + u.uid;
        core.db().ref(base).once('value').then(function (s) {
            var prev = s.val() || null;
            var prevMeta = (prev && prev.meta) || null;

            if (prevMeta && prevMeta.status === 'accepted') {
                return cb({ ok: false, error: 'Ya te ACEPTARON en esta apostulación — ya no se puede volver a enviar.' });
            }
            var mode = !prevMeta ? 'fresh' : (prevMeta.status === 'declined' ? 'resubmit' : 'edit');

            if (!FM.profile || typeof FM.profile.capture !== 'function') {
                return cb({ ok: false, error: 'Falta gmail_profile.js — revisa que esté subido.' });
            }
            FM.profile.capture(function (prof, perr) {
                if (!prof) return cb({ ok: false, error: perr || 'No se pudo leer tu perfil.' });

                var now = Date.now();
                var patch = {};
                patch[base + '/answers'] = clean;

                if (mode === 'edit') {
                    /* EDITAR: NO se pisa status/score/staffNote del staff */
                    patch[base + '/meta/profile'] = prof;
                    patch[base + '/meta/editedAt'] = now;
                    patch[base + '/meta/editedCount'] = (Number(prevMeta.editedCount) || 0) + 1;
                } else {
                    /* NUEVO o RE-ENVÍO tras rechazo: meta pending limpia */
                    patch[base + '/meta'] = {
                        submittedAt: now,
                        status: 'pending',
                        profile: prof,
                        resubmitCount: mode === 'resubmit' ? (Number(prevMeta.resubmitCount) || 0) + 1 : 0,
                        editedCount: 0
                    };
                }
                /* índice "mis apostulaciones" (solo membresía) */
                patch[P_MINE + '/' + u.uid + '/' + formId] = true;

                core.db().ref().update(patch).then(function () {
                    cb({ ok: true, mode: mode });
                }).catch(function (e) {
                    cb({ ok: false, error: 'No se pudo guardar: ' + ((e && e.message) || 'error de Firebase') });
                });
            });
        }).catch(function () {
            cb({ ok: false, error: 'No se pudo leer tu apostulación anterior.' });
        });
    });
};

/* saneo de respuestas: sin vacías, textos acotados y imágenes con su
   propio tope de peso (base64 ≈ +37%, por eso NO se recortan) */
function sanitizeAnswers(answers) {
    var out = {};
    var MAXB64 = Math.floor(core.LIMITS.imgBytes * 1.4);
    Object.keys(answers || {}).forEach(function (qid) {
        var v = answers[qid];
        if (v === undefined || v === null) return;
        if (Object.prototype.toString.call(v) === '[object Array]') {
            var arr = v.map(function (x) { return String(x == null ? '' : x).slice(0, core.LIMITS.textMax); })
                       .filter(function (x) { return x !== ''; });
            if (arr.length) out[qid] = arr;
        } else {
            var s = String(v);
            if (/^data:image\//i.test(s)) {
                if (s.length <= MAXB64) out[qid] = s;
            } else {
                s = s.slice(0, core.LIMITS.textMax).trim();
                if (s !== '') out[qid] = s;
            }
        }
    });
    return out;
}

/* ==== NOTIFICACIONES (forms/notifications/{uid}) ==== */
D.notifyUser = function (uid, payload, cb) {
    cb = cb || function () {};
    needStaff(function (s) {
        if (!s) return cb(false, 'Solo el staff puede notificar.');
        if (!uid) return cb(false, 'Falta el usuario.');
        var p = { type: 'info', at: Date.now(), byName: nameFromEmail(s.email) };
        Object.keys(payload || {}).forEach(function (k) { p[k] = payload[k]; });
        var key = core.db().ref().push().key;
        core.db().ref(P_NOTIF + '/' + uid + '/' + key).set(p)
            .then(function () { cb(true); })
            .catch(function (e) { cb(false, (e && e.message) || 'error'); });
    });
};

/* avisa a TODOS los que se postularon a un form que este fue editado */
D.notifyEdited = function (formId, cb) {
    cb = cb || function () {};
    needStaff(function (s) {
        if (!s) return cb(0);
        core.db().ref(P_RESP + '/' + formId).once('value').then(function (snap) {
            var uids = Object.keys(snap.val() || {});
            if (!uids.length) return cb(0);
            core.db().ref(P_DEFS + '/' + formId + '/meta/name').once('value').then(function (ns) {
                var formName = ns.val() || 'Formulario';
                var now = Date.now();
                var patch = {};
                uids.forEach(function (uid) {
                    var key = core.db().ref().push().key;
                    patch[P_NOTIF + '/' + uid + '/' + key] = {
                        type: 'edited', formId: formId, formName: formName,
                        at: now, byName: nameFromEmail(s.email)
                    };
                });
                core.db().ref().update(patch).then(function () { cb(uids.length); })
                         .catch(function () { cb(0); });
            }).catch(function () { cb(0); });
        }).catch(function () { cb(0); });
    });
};

D.myNotifications = function (cb) {
    cb = cb || function () {};
    var u = me();
    if (!u) return cb([]);
    core.db().ref(P_NOTIF + '/' + u.uid).once('value').then(function (s) {
        var map = s.val() || {};
        var arr = Object.keys(map).map(function (k) {
            var n = map[k] || {};
            n.id = k;
            return n;
        });
        arr.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        cb(arr);
    }).catch(function () { cb([]); });
};

/* ==== VIGILANTE DE EDICIONES (respuesta #19) ====
   - Solo corre en sesiones Owner/Admin (los demás ni lo intentan).
   - Primera vez que ve un form = línea base, NO avisa.
   - Huella SIN banners/imágenes (eso no cambia las preguntas).
   - 30s de calma: varios guardados seguidos = UNA notificación.
   - 2 staff con la página abierta a la vez puede duplicar el aviso
     (raro e inofensivo). */
var WKEY = 'fm_editwatch_v1';
var seenFp = null;   /* fid -> huella ya avisada */
var lastFp = {};     /* fid -> última huella vista */
var timers = {};

function fingerprint(def) {
    var m = (def && def.meta) || {};
    var panels = Object.keys(def.panels || {}).map(function (k) {
        var v = def.panels[k] || {};
        return (v.title || '') + '~' + (v.order || 0) + '~' + (v.description || '');
    }).sort();
    var questions = Object.keys(def.questions || {}).map(function (k) {
        var v = def.questions[k] || {};
        return (v.panelId || '') + '~' + (v.label || '') + '~' + (v.type || '') + '~' +
               (v.required ? 1 : 0) + '~' + ((v.options || []).join('|')) + '~' + (v.order || 0);
    }).sort();
    return JSON.stringify({
        n: m.name || '', d: m.description || '', p: m.published === false ? 0 : 1,
        panels: panels, questions: questions
    });
}

function persistSeen() {
    try { localStorage.setItem(WKEY, JSON.stringify(seenFp)); } catch (e) {}
}

function schedule(fid) {
    if (timers[fid]) clearTimeout(timers[fid]);
    timers[fid] = setTimeout(function () {
        delete timers[fid];
        D.notifyEdited(fid, function () {
            seenFp[fid] = lastFp[fid] || seenFp[fid];
            persistSeen();
        });
    }, 30000);
}

D.watchEdits = function () {
    try { seenFp = JSON.parse(localStorage.getItem(WKEY) || '{}') || {}; }
    catch (e) { seenFp = {}; }

    core.db().ref(P_DEFS).on('value', function (snap) {
        var defs = snap.val() || {};
        var changed = false;
        Object.keys(defs).forEach(function (fid) {
            var fp = fingerprint(defs[fid]);
            lastFp[fid] = fp;
            if (seenFp[fid] === undefined) { seenFp[fid] = fp; changed = true; return; }
            if (fp !== seenFp[fid]) schedule(fid);
        });
        if (changed) persistSeen();
    }, function (err) {
        console.warn('[Stevscon][Forms] vigilante de ediciones:', err && err.code);
    });
};

/* encendido automático: solo cuando un staff tiene sesión */
(function bootWatch() {
    function wire() {
        try {
            firebase.auth().onAuthStateChanged(function (u) {
                if (!u || D.__watching) return;
                core.clearSession();          /* sesión fresca tras el login */
                core.session(function (s) {
                    if (s && s.isStaff && !D.__watching) {
                        D.__watching = true;
                        D.watchEdits();
                        console.log('[Stevscon][Forms] vigilante de ediciones activo (staff).');
                    }
                });
            });
        } catch (e) { /* firebase aún no inicializado */ }
    }
    if (typeof firebase !== 'undefined' && firebase.auth) wire();
    else window.addEventListener('load', wire);
})();

console.log('[Stevscon] data_save/public_forms.js listo (v1) — capa de datos: defs, respuestas y notificaciones.');
})(window, document);