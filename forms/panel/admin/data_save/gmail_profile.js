/**
 * ====
 * STEVSCON.COM — forms/panel/admin/data_save/gmail_profile.js (v1)
 * DATA_SAVE · 1/4 — EL PERFIL + GMAIL DEL POSTULADO (respuestas #5 y #17).
 *
 *  QUÉ HACE:
 *  - Cuando un usuario ENVÍA una apostulación, se congela una COPIA de
 *    su perfil completo (nombre, @handler, avatar, descripción y su
 *    GMAIL) dentro de la respuesta:
 *        forms/responses/{formId}/{uid}/meta/profile
 *  - Así el staff siempre ve QUIÉN se postuló de verdad, aunque después
 *    cambie su perfil — y si un troll anda de chistoso, ahí está su
 *    Gmail para banearlo (respuesta #5).
 *  - Ese perfil solo lo leen el propio usuario y el staff (rules).
 *
 *  API (la usa public_forms.writeResponse y la Parte 4):
 *  - FM.profile.capture(cb)     → cb(profile, null) del usuario LOGUEADO
 *  - FM.profile.forUid(uid, cb) → igual, para un uid dado
 *    profile = { uid, email, name, handler, avatar, description, capturedAt }
 *
 *  LEE: users/{uid} (con fallbacks a auth: email, displayName, photoURL).
 *  CERO escrituras. Depende solo de forms_core.js.
 * ====
 */
(function (window, document) {
'use strict';

var FM = window.StevsconForms = window.StevsconForms || {};
var core = FM.core;
FM.profile = FM.profile || {};

if (!core) { console.warn('[Stevscon] gmail_profile.js: falta forms_core.js'); return; }

/* primer valor no-vacío entre claves posibles (la web ha usado nombres
   distintos para lo mismo a lo largo del tiempo — los leemos todos) */
function pick(src, keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
        var v = src ? src[keys[i]] : null;
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return fallback || '';
}

function authUser() {
    try { return firebase.auth().currentUser || null; } catch (e) { return null; }
}

/* arma el perfil normalizado desde users/{uid} + auth */
function build(uid, src, au) {
    src = src || {};
    au = au || {};
    var email = String(pick(src, ['email', 'gmail'], au.email || ''));
    var name = String(pick(src, ['name', 'username', 'displayName', 'nick'], au.displayName || ''));
    if (!name && email) name = email.split('@')[0];
    return {
        uid: uid,
        email: email,                                   /* el Gmail (respuesta #17) */
        name: name || 'Usuario',
        handler: String(pick(src, ['handler', 'handle', 'user', 'at'], '')),
        avatar: String(pick(src, ['avatar', 'photo', 'photoURL', 'img', 'image'], au.photoURL || '')),
        description: String(pick(src, ['description', 'bio', 'about'], '')),
        capturedAt: Date.now()
    };
}

FM.profile.forUid = function (uid, cb) {
    if (!uid) return cb(null, 'Falta el usuario.');
    var au = authUser() || {};
    core.db().ref('users/' + uid).once('value').then(function (s) {
        cb(build(uid, s.val() || {}, (au && au.uid === uid) ? au : {}), null);
    }).catch(function () {
        /* sin permiso o sin users/{uid}: igual armamos el perfil con lo que haya */
        cb(build(uid, {}, (au && au.uid === uid) ? au : {}), null);
    });
};

FM.profile.capture = function (cb) {
    var au = authUser();
    if (!au) return cb(null, 'Necesitas iniciar sesión para postularte.');
    FM.profile.forUid(au.uid, cb);
};

console.log('[Stevscon] data_save/gmail_profile.js listo (v1) — perfil + Gmail congelado al postularse.');
})(window, document);