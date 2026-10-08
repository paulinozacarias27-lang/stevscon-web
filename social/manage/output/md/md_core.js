/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_core.js (v1)
 * NÚCLEO de Mensajes Directos (MD) — estilo Discord, ventana de 10 h.
 *  - Nodo PRIVADO en la RAÍZ de la BD: dms/{convId}/meta · /msgs · /read
 *    + bandeja personal dms/inbox/{uid}/{convId} (alimenta el badge 99+).
 *  - convId = los 2 uids ordenados y unidos: la conversación entre A y B
 *    es SIEMPRE la misma (nunca se duplica).
 *  - VENTANA DE 10 HORAS: la conversación nace con expiresAt; pasado ese
 *    tiempo el MD se CONGELA (el cliente y las REGLAS con `now` lo firman)
 *    y solo queda la Solicitud de Amistad (sistema aparte, ya viene).
 *  - FILTRO: todo MD pasa por SCSOC.secAntiBad.check() (anti-bad v2)
 *    antes de enviarse; los intentos caen en security/moderation/logs.
 *  - CANDADOS v5: requireLogin + users.once() + anti-duplicado 10s.
 *  - API pública: SCSOC.dm
 *      .open(peerUid, cb)        .send(convId, text, cb)
 *      .watchInbox(cb) -> off    .watchConv(convId, cbs) -> off
 *      .metaOnce(convId, cb)     .markRead(convId)
 *      .isExpired(meta)          .msLeft(meta)       .convIdFor(a, b)
 *      .unreadTotal(list)        .nameOf(uid, cb)    .peerOf(users, my)
 *      .WINDOW_MS / .MAX_TEXT
 *  SEGURIDAD: todo texto via textContent (NUNCA innerHTML con datos).
 * Cargar ANTES de md_ui.js y md_button.js, y ANTES del motor.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dm) return;

    const D = SCSOC.dm = {};

    D.WINDOW_MS = 10 * 60 * 60 * 1000;   /* 10 horas de ventana activa */
    D.MAX_TEXT = 2000;                    /* mismo tope que los comentarios */

    /* candado anti-duplicado (mismo patrón que admin_post v10) */
    const _lastSend = { uid: '', text: '', at: 0 };
    const _peerCache = {};

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function convRef(id) { return db().ref('dms/' + id); }

    D.convIdFor = function (a, b) {
        return [String(a || ''), String(b || '')].sort().join('__');
    };

    D.isExpired = function (meta) {
        if (!meta || !Number(meta.expiresAt)) return false;
        return Date.now() > Number(meta.expiresAt);
    };

    D.msLeft = function (meta) {
        if (!meta || !Number(meta.expiresAt)) return 0;
        return Math.max(0, Number(meta.expiresAt) - Date.now());
    };

    D.peerOf = function (usersObj, myUid) {
        const keys = Object.keys(usersObj || {});
        for (let i = 0; i < keys.length; i++) if (keys[i] !== myUid) return keys[i];
        return '';
    };

    D.nameOf = function (uid, cb) {
        if (!uid) { cb({ name: 'Usuario', handler: '' }); return; }
        if (_peerCache[uid]) { cb(_peerCache[uid]); return; }
        const once = SCSOC.users.once || SCSOC.users.get;
        once(uid, function (u) {
            const info = { name: (u && u._name) || 'Usuario', handler: (u && u._handler) || '', status: (u && u._status) || '' };
            _peerCache[uid] = info;
            cb(info);
        });
    };

    /* ==== abrir (o recuperar) una conversación ==== */
    D.open = function (peerUid, cb) {
        const a = me();
        if (!a) { if (SCSOC.deny) SCSOC.deny(); return; }
        if (!peerUid || peerUid === a.uid) {
            SCSOC.toast('No puedes abrir un MD contigo mismo.');
            return;
        }
        const id = D.convIdFor(a.uid, peerUid);
        convRef(id).child('meta').once('value').then(function (s) {
            if (s.exists()) {
                touchInboxEntry(a.uid, peerUid, id);
                if (cb) cb(id, s.val());
                return;
            }
            const users = {};
            users[a.uid] = true;
            users[peerUid] = true;
            const meta = {
                users: users,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                expiresAt: Date.now() + D.WINDOW_MS,
                lastAt: firebase.database.ServerValue.TIMESTAMP,
                lastFrom: a.uid,
                lastText: ''
            };
            convRef(id).child('meta').set(meta).then(function () {
                touchInboxEntry(a.uid, peerUid, id);
                if (cb) cb(id, meta);
            }).catch(function () {
                /* carrera: la otra persona la creó en el mismo instante */
                convRef(id).child('meta').once('value').then(function (s2) {
                    if (s2.exists()) {
                        touchInboxEntry(a.uid, peerUid, id);
                        if (cb) cb(id, s2.val());
                    } else {
                        SCSOC.toast('No se pudo abrir el MD.');
                    }
                }).catch(function () { SCSOC.toast('No se pudo abrir el MD.'); });
            });
        }).catch(function () { SCSOC.toast('No se pudo abrir el MD.'); });
    };

    /* crea mi entrada de bandeja SOLO si no existe (no toca unread) */
    function touchInboxEntry(uid, peerUid, convId) {
        const ref = db().ref('dms/inbox/' + uid + '/' + convId);
        ref.once('value').then(function (s) {
            if (s.exists()) return;
            ref.set({
                peerUid: peerUid,
                lastAt: Date.now(),
                lastText: '',
                lastFrom: '',
                unread: 0
            }).catch(function () {});
        }).catch(function () {});
    }

    /* ==== enviar (filtro anti-bad + candados) ==== */
    D.send = function (convId, raw, cb) {
        SCSOC.requireLogin(function (a) {
            const text = String(raw || '').trim();
            if (!text) return;
            if (text.length > D.MAX_TEXT) {
                SCSOC.toast('Muy largo: máx ' + SCSOC.nums.full(D.MAX_TEXT) + ' caracteres.');
                if (cb) cb(new Error('long'));
                return;
            }
            /* candado 1: mismo texto en <10s = bloqueado */
            if (_lastSend.uid === a.uid && _lastSend.text === text && (Date.now() - _lastSend.at) < 10000) {
                SCSOC.toast('Ese mensaje ya se envió hace un momento.');
                if (cb) cb(new Error('dup'));
                return;
            }
            convRef(convId).child('meta').once('value').then(function (s) {
                const meta = s.val();
                if (!meta || !meta.users || meta.users[a.uid] !== true) {
                    SCSOC.toast('No perteneces a esta conversación.');
                    if (cb) cb(new Error('perm'));
                    return;
                }
                if (D.isExpired(meta)) {
                    SCSOC.toast('Este MD expiró: envíale una Solicitud de Amistad.');
                    if (cb) cb(new Error('expired'));
                    return;
                }
                /* candado 2: filtro anti-bad v2 (el staff pasa libre) */
                const ab = (SCSOC.secAntiBad && SCSOC.secAntiBad.check) ? SCSOC.secAntiBad.check(text) : { ok: true };
                if (ab && ab.ok === false) {
                    logBlocked(a, text, ab);
                    SCSOC.toast(ab.msg || 'Mensaje bloqueado por el filtro.');
                    if (cb) cb(new Error('filter'));
                    return;
                }
                D.nameOf(a.uid, function (info) {
                    const id = SCSOC.ids.make();
                    const msg = {
                        id: id,
                        text: text,
                        authorUid: a.uid,
                        authorName: info.name,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    const peerUid = D.peerOf(meta.users, a.uid);
                    const upd = {};
                    upd['msgs/' + id] = msg;
                    upd['meta/lastAt'] = firebase.database.ServerValue.TIMESTAMP;
                    upd['meta/lastFrom'] = a.uid;
                    upd['meta/lastText'] = text.slice(0, 120);
                    convRef(convId).update(upd).then(function () {
                        _lastSend.uid = a.uid; _lastSend.text = text; _lastSend.at = Date.now();
                        /* mi bandeja: refresca posición (unread intacto) */
                        db().ref('dms/inbox/' + a.uid + '/' + convId).update({
                            peerUid: peerUid,
                            lastAt: firebase.database.ServerValue.TIMESTAMP,
                            lastText: text.slice(0, 120),
                            lastFrom: a.uid
                        }).catch(function () {});
                        /* bandeja del otro: entrada + unread +1 (transacción) */
                        const theirs = db().ref('dms/inbox/' + peerUid + '/' + convId);
                        theirs.update({
                            peerUid: a.uid,
                            lastAt: firebase.database.ServerValue.TIMESTAMP,
                            lastText: text.slice(0, 120),
                            lastFrom: a.uid
                        }).catch(function () {});
                        theirs.child('unread').transaction(function (v) { return (Number(v) || 0) + 1; }, function (err) {
                            if (err) console.warn('[MD] unread bloqueado (revisa las reglas de dms/inbox):', err);
                        });
                        if (cb) cb(null, id);
                    }).catch(function () {
                        SCSOC.toast('No se pudo enviar el mensaje.');
                        if (cb) cb(new Error('write'));
                    });
                });
            }).catch(function () {
                SCSOC.toast('No se pudo enviar el mensaje.');
                if (cb) cb(new Error('meta'));
            });
        });
    };

    /* intento bloqueado -> registro del staff (mismo nodo que anti-bad) */
    function logBlocked(u, text, ab) {
        try {
            db().ref('security/moderation/logs').push({
                by: u.uid,
                name: u.displayName || '',
                kind: ab.kind || 'palabra',
                where: 'MD',
                match: '',
                text: String(text || '').slice(0, 240),
                at: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) {}
    }

    /* ==== bandeja EN VIVO (badge + lista) ==== */
    D.watchInbox = function (cb) {
        const a = me();
        if (!a || typeof cb !== 'function') return function () {};
        const ref = db().ref('dms/inbox/' + a.uid);
        const fn = function (s) {
            const v = s.val() || {};
            const out = [];
            Object.keys(v).forEach(function (k) {
                const e = v[k];
                if (!e || !e.peerUid) return;
                out.push({
                    convId: k,
                    peerUid: e.peerUid,
                    lastAt: Number(e.lastAt) || 0,
                    lastText: String(e.lastText || ''),
                    lastFrom: String(e.lastFrom || ''),
                    unread: Number(e.unread) || 0
                });
            });
            out.sort(function (x, y) { return y.lastAt - x.lastAt; });
            cb(out);
        };
        ref.on('value', fn, function (err) {
            console.warn('[MD] Bandeja bloqueada por reglas (badge muerto):', err);
        });
        return function () { ref.off('value', fn); };
    };

    D.unreadTotal = function (list) {
        let t = 0;
        (list || []).forEach(function (e) { if (e.unread > 0) t += e.unread; });
        return t;
    };

    /* ==== conversación EN VIVO ==== */
    D.metaOnce = function (convId, cb) {
        convRef(convId).child('meta').once('value')
            .then(function (s) { cb(s.val() || null); })
            .catch(function () { cb(null); });
    };

    D.watchConv = function (convId, cbs) {
        const ref = convRef(convId).child('msgs').orderByChild('createdAt').limitToLast(300);
        const onAdd = function (s) { if (cbs && cbs.onAdd) cbs.onAdd(s.val(), s.key); };
        const onCh = function (s) { if (cbs && cbs.onChange) cbs.onChange(s.val(), s.key); };
        const onRm = function (s) { if (cbs && cbs.onRemove) cbs.onRemove(s.val(), s.key); };
        ref.on('child_added', onAdd);
        ref.on('child_changed', onCh);
        ref.on('child_removed', onRm);
        return function () {
            ref.off('child_added', onAdd);
            ref.off('child_changed', onCh);
            ref.off('child_removed', onRm);
        };
    };

    D.markRead = function (convId) {
        const a = me();
        if (!a || !convId) return;
        db().ref('dms/' + convId + '/read/' + a.uid)
            .set(firebase.database.ServerValue.TIMESTAMP).catch(function () {});
        db().ref('dms/inbox/' + a.uid + '/' + convId + '/unread')
            .transaction(function () { return 0; });
    };

    console.log('[Stevscon] md_core.js listo (v1) — SCSOC.dm: MDs privados con ventana de 10 h.');
})(window, document);