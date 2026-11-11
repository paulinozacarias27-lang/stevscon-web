/**
 * ====
 * STEVSCON.COM — forms/panel/admin/data_save/accept_decline.js (v1)
 * DATA_SAVE · 4/4 — EL VEREDICTO (FM.review.decide + FM.review.reset).
 *
 *  FM.review.decide(opts, cb) — lo llaman los botones Aceptar/Rechazar
 *  de view_panel.js (Parte 2), que hasta hoy estaban esperando este file:
 *      opts = { formId, uid, action, note, score }
 *        action: 'accepted' | 'declined'
 *        score : 1-10 ó 0 (0 = sin calificación — respuesta #1)
 *        note  : string (vacío = sin nota — respuesta #9)
 *  Escribe TODO en un solo update() atómico:
 *    · el veredicto en forms/responses/{fid}/{uid}/meta
 *      (status, score, staffNote, reviewedBy, reviewedByName, reviewedAt)
 *    · la notificación al usuario en forms/notifications/{uid}
 *  Cambiar de parecer sobreescribe el veredicto (y vuelve a notificar).
 *  Puntito 0 o nota vacía BORRAN los anteriores (update con null).
 *
 *  FM.review.reset(formId, uid, cb) — devuelve una apostulación a
 *  Pendiente (por si algo se decidió mal). Se puede llamar desde consola:
 *      StevsconForms.review.reset('formId', 'uid')
 *
 *  REQUIERE el bloque de rules v2 (el de abajo en el mensaje): sin el
 *  permiso extra en meta, el veredicto da permission_denied.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
FM.review = FM.review || {};       /* view_panel.js (Parte 2) ya puso .panel aquí */
var core = FM.core;

if (!core) { console.warn('[Stevscon] accept_decline.js: falta forms_core.js'); return; }

function nameFromEmail(em) {
    em = String(em || '');
    return em ? em.split('@')[0] : 'Staff';
}

/* nombre del revisor: users/{uid} → displayName → prefijo del email */
function reviewerNameP(s) {
    return core.db().ref('users/' + s.uid).once('value').then(function (snap) {
        var v = snap.val() || {};
        return v.name || v.username || v.displayName || v.nick ||
               (s.user && s.user.displayName) || nameFromEmail(s.email);
    }).catch(function () {
        return (s.user && s.user.displayName) || nameFromEmail(s.email);
    });
}

/* ==== DECIDIR: aceptar o rechazar ==== */
FM.review.decide = function (opts, cb) {
    cb = cb || function () {};
    opts = opts || {};
    var action = opts.action;

    if (action !== 'accepted' && action !== 'declined') {
        core.toast('Veredicto inválido.', 'error');
        return cb(false);
    }
    if (!opts.formId || !opts.uid) {
        core.toast('Faltan datos del veredicto.', 'error');
        return cb(false);
    }

    core.session(function (s) {
        if (!s.isStaff) {
            core.toast('Solo el Owner y los Admins pueden decidir apostulaciones.', 'error');
            return cb(false);
        }

        var metaRef = core.db().ref('forms/responses/' + opts.formId + '/' + opts.uid + '/meta');
        var nameRef = core.db().ref('forms/defs/' + opts.formId + '/meta/name');

        metaRef.once('value').then(function (snap) {
            if (!snap.exists()) {
                core.toast('Esa apostulación no existe (quizá ya la borraron).', 'error');
                cb(false);
                return null;   /* corta la cadena */
            }
            return reviewerNameP(s).then(function (rName) {
                return nameRef.once('value').then(function (ns) {
                    return { rName: rName, formName: ns.val() || 'Formulario' };
                });
            });
        }).then(function (ctx) {
            if (!ctx) return;

            var note = String(opts.note || '').trim();
            var score = (typeof opts.score === 'number' && opts.score >= 1 && opts.score <= 10) ? opts.score : null;
            var now = Date.now();

            var nKey = core.db().ref().push().key;
            var M = 'forms/responses/' + opts.formId + '/' + opts.uid + '/meta/';
            var patch = {};
            patch[M + 'status'] = action;
            patch[M + 'score'] = score;             /* null = sin calificación (borra la anterior) */
            patch[M + 'staffNote'] = note || null;  /* vacío = sin nota (borra la anterior) */
            patch[M + 'reviewedBy'] = s.uid;
            patch[M + 'reviewedByName'] = ctx.rName;
            patch[M + 'reviewedAt'] = now;
            patch['forms/notifications/' + opts.uid + '/' + nKey] = {
                type: action,
                formId: opts.formId,
                formName: ctx.formName,
                note: note,
                score: score || 0,
                byName: ctx.rName,
                at: now
            };

            core.db().ref().update(patch).then(function () {
                core.toast(action === 'accepted'
                    ? 'Apostulación ACEPTADA — el usuario ya está notificado.'
                    : 'Apostulación RECHAZADA — el usuario ya está notificado.', 'ok');
                cb(true);
            }).catch(function (e) {
                core.toast('No se pudo guardar el veredicto: ' + ((e && e.message) || 'error de Firebase'), 'error');
                cb(false);
            });
        }).catch(function (e) {
            core.toast('No se pudo leer la apostulación: ' + ((e && e.message) || 'error'), 'error');
            cb(false);
        });
    });
};

/* ==== RESET: devolver a Pendiente (por si algo se decidió mal) ==== */
FM.review.reset = function (formId, uid, cb) {
    cb = cb || function () {};
    core.session(function (s) {
        if (!s.isStaff) { core.toast('Solo el Owner y los Admins pueden resetear.', 'error'); return cb(false); }
        if (!formId || !uid) { core.toast('Faltan datos.', 'error'); return cb(false); }

        var metaRef = core.db().ref('forms/responses/' + formId + '/' + uid + '/meta');
        metaRef.once('value').then(function (snap) {
            if (!snap.exists()) { core.toast('Esa apostulación no existe.', 'error'); return cb(false); }
            return reviewerNameP(s).then(function (rName) {
                return core.db().ref('forms/defs/' + formId + '/meta/name').once('value').then(function (ns) {
                    var now = Date.now();
                    var nKey = core.db().ref().push().key;
                    var M = 'forms/responses/' + formId + '/' + uid + '/meta/';
                    var patch = {};
                    patch[M + 'status'] = 'pending';
                    patch[M + 'score'] = null;
                    patch[M + 'staffNote'] = null;
                    patch[M + 'reviewedBy'] = null;
                    patch[M + 'reviewedByName'] = null;
                    patch[M + 'reviewedAt'] = null;
                    patch['forms/notifications/' + uid + '/' + nKey] = {
                        type: 'reset', formId: formId, formName: ns.val() || 'Formulario',
                        at: now, byName: rName
                    };
                    return core.db().ref().update(patch).then(function () {
                        core.toast('Apostulación devuelta a Pendiente — el usuario puede editarla de nuevo.', 'ok');
                        cb(true);
                    });
                });
            });
        }).catch(function (e) {
            core.toast('No se pudo resetear: ' + ((e && e.message) || 'error'), 'error');
            cb(false);
        });
    });
};

console.log('[Stevscon] data_save/accept_decline.js listo (v1) — veredicto con nota, puntos y notificación.');
})(window, document);