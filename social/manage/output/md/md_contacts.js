/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_contacts.js (v1)
 * CONTACTOS del MD — Amigos · Ignorados · Bloqueados · Reporte de persona.
 *  - AMIGOS:     users/{uid}/friends/{peerUid} = { at, by }
 *                (la Solicitud de Amistad escribirá aquí cuando llegue).
 *  - IGNORADOS:  bandera ignored=true en TU bandeja dms/inbox/{uid}/{convId};
 *                se puede quitar y NO cuenta para el badge global.
 *  - BLOQUEADOS: users/{uid}/blocked/{peerUid} = { at, name }.
 *                md_core.js queda ENVUELTO: open() y send() revisan los
 *                bloqueos (tuyos Y de la otra persona) antes de escribir.
 *  - REPORTES:   security/reports (type:'dm') con tope de 1 por persona/min.
 *  API: SCSOC.dmContacts
 *      .watchFriends(cb)->off  .watchBlocked(cb)->off  .watchIgnored(cb)->off
 *      .isFriend(uid)  .isBlocked(uid)  .isIgnored(convId)  .peerOfConv(convId)
 *      .blockedBy(peer, cb)     .guard(peer, cb)
 *      .ignore(convId, peer)    .unignore(convId, peer)
 *      .block(peer, name)       .unblock(peer)
 *      .reportPeer(convId, peer, reason, detail, cb)
 *  Cargar DESPUÉS de md_core.js y ANTES de md_tabs.js / md_actions.js.
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmContacts) return;

    const D = SCSOC.dm;
    const C = SCSOC.dmContacts = {};

    const S = { inbox: {}, ignored: {}, friends: {}, blocked: {} };
    const cbs = { inbox: [], friends: [], blocked: [], ignored: [] };
    const offs = [];
    const _recent = {};

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }

    function emit(key, v) { cbs[key].forEach(function (fn) { try { fn(v); } catch (e) {} }); }
    function offFn(arr, fn) { return function () { const i = arr.indexOf(fn); if (i > -1) arr.splice(i, 1); }; }

    function rebuildInbox(v) {
        S.inbox = v || {};
        S.ignored = {};
        Object.keys(S.inbox).forEach(function (cid) {
            if (S.inbox[cid] && S.inbox[cid].ignored === true) S.ignored[cid] = S.inbox[cid];
        });
        emit('inbox', S.inbox);
        emit('ignored', S.ignored);
    }

    function startWatchers(u) {
        stopWatchers();
        const r1 = db().ref('dms/inbox/' + u.uid);
        const f1 = function (s) { rebuildInbox(s.val()); };
        r1.on('value', f1, function (err) { console.warn('[MDc] inbox:', err); });
        offs.push(function () { r1.off('value', f1); });

        const r2 = db().ref('users/' + u.uid + '/friends');
        const f2 = function (s) { S.friends = s.val() || {}; emit('friends', S.friends); };
        r2.on('value', f2, function (err) { console.warn('[MDc] friends:', err); });
        offs.push(function () { r2.off('value', f2); });

        const r3 = db().ref('users/' + u.uid + '/blocked');
        const f3 = function (s) { S.blocked = s.val() || {}; emit('blocked', S.blocked); };
        r3.on('value', f3, function (err) { console.warn('[MDc] blocked:', err); });
        offs.push(function () { r3.off('value', f3); });
    }

    function stopWatchers() {
        while (offs.length) { const f = offs.pop(); try { f(); } catch (e) {} }
        S.inbox = {}; S.ignored = {}; S.friends = {}; S.blocked = {};
    }

    try {
        firebase.auth().onAuthStateChanged(function (u) {
            if (u) startWatchers(u);
            else {
                stopWatchers();
                emit('inbox', {}); emit('friends', {}); emit('blocked', {}); emit('ignored', {});
            }
        });
    } catch (e) { console.warn('[MDc] auth:', e); }

    /* ==== lecturas en vivo ==== */
    C.isFriend = function (uid) { return !!(S.friends && S.friends[uid]); };
    C.isBlocked = function (uid) { return !!(S.blocked && S.blocked[uid]); };
    C.isIgnored = function (convId) { return !!(S.ignored && S.ignored[convId]); };
    C.peerOfConv = function (convId) {
        const e = S.inbox[convId];
        return (e && e.peerUid) ? e.peerUid : '';
    };
    C.watchFriends = function (fn) { cbs.friends.push(fn); fn(S.friends); return offFn(cbs.friends, fn); };
    C.watchBlocked = function (fn) { cbs.blocked.push(fn); fn(S.blocked); return offFn(cbs.blocked, fn); };
    C.watchIgnored = function (fn) { cbs.ignored.push(fn); fn(S.ignored); return offFn(cbs.ignored, fn); };

    /* ==== ¿el OTRO me bloqueó a mí? ==== */
    C.blockedBy = function (peerUid, cb) {
        const a = me();
        if (!a || !peerUid || peerUid === a.uid) { cb(false); return; }
        db().ref('users/' + peerUid + '/blocked/' + a.uid).once('value')
            .then(function (s) { cb(!!s.val()); })
            .catch(function () { cb(false); });
    };

    /* candado total: mis bloqueos + los suyos. err = null | 'mine' | 'theirs' */
    C.guard = function (peerUid, cb) {
        const a = me();
        if (!a || !peerUid || peerUid === a.uid) { cb(null); return; }
        if (C.isBlocked(peerUid)) {
            SCSOC.toast('Desbloquea a esta persona para escribirle.');
            cb('mine');
            return;
        }
        C.blockedBy(peerUid, function (b) {
            if (b) { SCSOC.toast('No puedes escribirle a esta persona.'); cb('theirs'); return; }
            cb(null);
        });
    };

    /* ==== ENVOLTURIO de md_core: open() y send() ahora respetan bloqueos ==== */
    if (D) {
        const _open = D.open;
        D.open = function (peerUid, cb) {
            const a = me();
            if (!a) { _open(peerUid, cb); return; }
            C.guard(peerUid, function (err) { if (!err) _open(peerUid, cb); });
        };
        const _send = D.send;
        D.send = function (convId, raw, cb) {
            const a = me();
            if (!a) { _send(convId, raw, cb); return; }
            const peer = C.peerOfConv(convId);
            if (!peer) { _send(convId, raw, cb); return; }
            C.guard(peer, function (err) { if (!err) _send(convId, raw, cb); });
        };
        /* el badge global NO cuenta lo ignorado */
        if (D.unreadTotal) {
            const _total = D.unreadTotal;
            D.unreadTotal = function (list) {
                return _total((list || []).filter(function (e) {
                    return !(e && S.ignored[e.convId]);
                }));
            };
        }
    }

    /* ==== acciones ==== */
    function inboxRef(convId) {
        const a = me();
        return (a && convId) ? db().ref('dms/inbox/' + a.uid + '/' + convId) : null;
    }

    C.ignore = function (convId, peerUid, cb) {
        const r = inboxRef(convId);
        if (!r) { if (cb) cb(new Error('auth')); return; }
        r.update({ ignored: true, unread: 0 }).then(function () { if (cb) cb(null); })
            .catch(function (err) { console.warn('[MDc] ignore:', err); if (cb) cb(err); });
    };

    C.unignore = function (convId, peerUid, cb) {
        const r = inboxRef(convId);
        if (!r) { if (cb) cb(new Error('auth')); return; }
        r.child('ignored').remove().then(function () { if (cb) cb(null); })
            .catch(function (err) { console.warn('[MDc] unignore:', err); if (cb) cb(err); });
    };

    C.block = function (peerUid, name, cb) {
        const a = me();
        if (!a || !peerUid) { if (cb) cb(new Error('auth')); return; }
        db().ref('users/' + a.uid + '/blocked/' + peerUid)
            .set({ at: firebase.database.ServerValue.TIMESTAMP, name: String(name || '').slice(0, 60) })
            .then(function () { if (cb) cb(null); })
            .catch(function (err) { console.warn('[MDc] block:', err); if (cb) cb(err); });
    };

    C.unblock = function (peerUid, cb) {
        const a = me();
        if (!a || !peerUid) { if (cb) cb(new Error('auth')); return; }
        db().ref('users/' + a.uid + '/blocked/' + peerUid).remove()
            .then(function () { if (cb) cb(null); })
            .catch(function (err) { console.warn('[MDc] unblock:', err); if (cb) cb(err); });
    };

    /* ==== reportar a la PERSONA (type dm -> Box REPORTS del staff) ==== */
    C.reportPeer = function (convId, peerUid, reason, detail, cb) {
        const a = me();
        if (!a || !peerUid) { if (cb) cb(new Error('auth')); return; }
        const key = 'peer:' + peerUid;
        if (_recent[key] && Date.now() - _recent[key] < 60000) {
            SCSOC.toast('Ya reportaste a esta persona hace un momento.');
            if (cb) cb(new Error('spam'));
            return;
        }
        D.nameOf(a.uid, function (meInfo) {
            const payload = {
                type: 'dm',
                postId: String(convId || '').slice(0, 200),
                commentId: '',
                responseId: '',
                reason: String(reason || 'Otros').slice(0, 40),
                detail: String(detail || '').slice(0, 500),
                contentUid: String(peerUid || ''),
                contentName: '',
                contentText: '',
                byUid: a.uid,
                byName: (meInfo && meInfo.name) || '',
                status: 'pendiente',
                at: firebase.database.ServerValue.TIMESTAMP
            };
            /* nombre del reportado + último texto como evidencia */
            db().ref('users/' + peerUid).once('value').then(function (s) {
                const p = s.val() || {};
                payload.contentName = String(p._name || p.name || 'Usuario').slice(0, 60);
                const entry = S.inbox[convId];
                payload.contentText = String((entry && entry.lastText) || '').slice(0, 600);
                return SCSOC.db().ref('security/reports').push(payload);
            }).then(function () {
                _recent[key] = Date.now();
                SCSOC.toast('Reporte enviado ✓ — el staff lo revisará.');
                if (cb) cb(null);
            }).catch(function (err) {
                console.warn('[MDc] report:', err);
                if (cb) cb(err);
            });
        });
    };

    console.log('[Stevscon] md_contacts.js listo (v1) — amigos, ignorados, bloqueos y reportes de MD.');
})(window, document);