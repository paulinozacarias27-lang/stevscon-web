/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_core.js (v3)
 * NÚCLEO de Mensajes Directos (MD) — estilo Discord, ventana de 10 h.
 *  - Nodo PRIVADO en la RAÍZ de la BD: dms/{convId}/meta · /msgs · /read
 *    + bandeja personal dms/inbox/{uid}/{convId} (alimenta el badge 99+).
 *  - convId = los 2 uids ordenados y unidos: la conversación entre A y B
 *    es SIEMPRE la misma (nunca se duplica).
 *  - VENTANA DE 10 HORAS: la conversación nace con expiresAt; pasado ese
 *    tiempo el MD se CONGELA (el cliente y las REGLAS con `now` lo firman)
 *    y solo queda la Solicitud de Amistad (sistema aparte, ya viene).
 *  - FILTRO: todo MD pasa por SCSOC.secAntiBad.check() (anti-bad v2).
 *  - NUEVO v3 · PREFERENCIAS: lee users/{peerUid}/settings ANTES de
 *    abrir/enviar; si el otro tiene mdAllow:'nadie', el MD se bloquea
 *    (toast claro, cero escritura). Expone watchMyPrefs() para que el
 *    badge (mdBadge) y la lista (mdPreview) obedezcan tus switches.
 *  - API pública: SCSOC.dm
 *      .open(peerUid, cb)        .send(convId, text, cb)
 *      .watchInbox(cb) -> off    .watchConv(convId, cbs) -> off
 *      .metaOnce(convId, cb)     .markRead(convId)
 *      .isExpired(meta)          .msLeft(meta)       .convIdFor(a, b)
 *      .unreadTotal(list)        .nameOf(uid, cb)    .peerOf(users, my)
 *      .prefOf(uid, cb)          .watchMyPrefs(cb) -> off   .myPrefs()
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
    const _prefCache = {};          /* settings del peer (TTL 30s) */
    let _myPrefs = {};              /* mis settings (en vivo) */
    const _myPrefCbs = [];
    let _myRef = null;

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

    /* v4: ¿el peer es mi amigo? Los amigos SIEMPRE pueden escribirse,
       aunque el otro tenga mdAllow:'nadie' (eso solo frena desconocidos). */
    function isFriendOf(peerUid) {
        try {
            const C = SCSOC.dmContacts;
            return !!(C && C.isFriend && C.isFriend(peerUid));
        } catch (e) { return false; }
    }

    /* v5: AMIGOS = MD SIN VENCIMIENTO.
       peerIsFriend(meta) mira meta.users y dice si el otro es mi amigo.
       Con amigos: la ventana nunca cierra (UI, cliente Y reglas via
       meta/friends). Sin amigos: ventana de 10 h de siempre. */
    D.peerIsFriend = function (meta) {
        try {
            const a = me();
            if (!a || !meta || !meta.users) return false;
            return isFriendOf(D.peerOf(meta.users, a.uid));
        } catch (e) { return false; }
    };
    D.msLeft = function (meta) {
        if (D.peerIsFriend(meta)) return D.WINDOW_MS;
        if (!meta) return 0;
        const t = meta.expiresAt || ((meta.createdAt || 0) + D.WINDOW_MS);
        return t - Date.now();
    };
    D.isExpired = function (meta) {
        if (D.peerIsFriend(meta)) return false;
        return !meta || D.msLeft(meta) <= 0;
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

    /* ==== PREFERENCIAS (v3) ==== */
    /* settings de OTRA persona (una lectura, cache 30s) */
    D.prefOf = function (uid, cb) {
        if (!uid || !db()) { cb({}); return; }
        const c = _prefCache[uid];
        if (c && (Date.now() - c.at) < 30000) { cb(c.v); return; }
        db().ref('users/' + uid + '/settings').once('value').then(function (s) {
            const v = s.val() || {};
            _prefCache[uid] = { v: v, at: Date.now() };
            cb(v);
        }).catch(function () { cb({}); });
    };

    /* MIS settings en vivo (badge, vista previa, sonido...) */
    D.myPrefs = function () { return _myPrefs; };
    D.watchMyPrefs = function (cb) {
        const a = me();
        if (!a || !db() || typeof cb !== 'function') { if (typeof cb === 'function') cb({}); return function () {}; }
        _myPrefCbs.push(cb);
        if (!_myRef) {
            _myRef = db().ref('users/' + a.uid + '/settings');
            _myRef.on('value', function (s) {
                _myPrefs = s.val() || {};
                _myPrefCbs.forEach(function (fn) { try { fn(_myPrefs); } catch (e) {} });
            }, function (err) {
                console.warn('[MD] settings bloqueados por reglas:', err);
                _myPrefCbs.forEach(function (fn) { try { fn(_myPrefs); } catch (e) {} });
            });
        } else {
            cb(_myPrefs);
        }
        return function () {
            const i = _myPrefCbs.indexOf(cb);
            if (i > -1) _myPrefCbs.splice(i, 1);
        };
    };

    /* ==== abrir (o recuperar) una conversación ==== */
    D.open = function (peerUid, cb) {
        const a = me();
        if (!a) { if (SCSOC.deny) SCSOC.deny(); return; }
        if (!peerUid || peerUid === a.uid) {
            SCSOC.toast('No puedes abrir un MD contigo mismo.');
            return;
        }
        /* v4: ¿me deja mandarle MD? (si son amigos, siempre pasa) */
        D.prefOf(peerUid, function (p) {
            if (p && p.mdAllow === 'nadie' && !isFriendOf(peerUid)) {
                SCSOC.toast('Esta persona tiene los Mensajes Directos desactivados.');
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
        });
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
            }).catch(function (err) { console.warn('[MD] inbox:', err); });
        }).catch(function (err) { console.warn('[MD] inbox read:', err); });
    }

    /* ==== enviar (filtro anti-bad + preferencias + candados) ==== */
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
                const peerUid = D.peerOf(meta.users, a.uid);
                /* v4: por si nos cerró los MD hace un segundo (amigos pasan) */
                D.prefOf(peerUid, function (p) {
                    if (p && p.mdAllow === 'nadie' && !isFriendOf(peerUid)) {
                        SCSOC.toast('Esta persona tiene los MDs desactivados.');
                        if (cb) cb(new Error('pref'));
                        return;
                    }
                    /* candado 2: filtro anti-bad (v4: en MDs SIN flood —
                       escribir rápido es normal en un chat; palabras/enlaces sí filtran) */
                    const AB = SCSOC.secAntiBad;
                    const ab = (AB && AB.checkChat) ? AB.checkChat(text)
                        : (AB && AB.check) ? AB.check(text) : { ok: true };
                        /* v5: si es mi amigo, enciendo meta/friends para que las
                       REGLAS dejen pasar el mensaje aunque la ventana vieja
                       haya cerrado (1 escritura, queda para siempre). */
                    try {
                        if (D.peerIsFriend(meta)) {
                            convRef(convId).child('meta/friends').set(true).catch(function () {});
                        }
                    } catch (e) {}
                    
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

    console.log('[Stevscon] md_core.js listo (v3) — MDs con ventana de 10 h + preferencias de MD.');
})(window, document);