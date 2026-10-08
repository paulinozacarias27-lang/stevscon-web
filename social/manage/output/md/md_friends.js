/**
 * ====
 * STEVSCON.COM — social/manage/output/md/md_friends.js (v1)
 * SOLICITUDES DE AMISTAD + BARRA DE ACCIONES del panel de perfil.
 *  - NODO nuevo: friendReqs/{toUid}/{fromUid} = { at, name, handler, status }
 *    status: 'pendiente' | 'aceptada' | 'rechazada' (requiere reglas nuevas).
 *  - Espejo del remitente: users/{uid}/frSent/{peerUid} = { at }
 *    (para que el botón muestre «Solicitud enviada» aunque recargues).
 *  - Al ACEPTAR, cada lado escribe SU users/{uid}/friends/{peer}: el
 *    receptor al instante y el remitente cuando su listener ve el status
 *    'aceptada' (mismo patrón async que la bandeja de MDs). Los amigos
 *    caen solos en la pestaña AMIGOS vía md_contacts.watchFriends.
 *  - BARRA DE ACCIONES: hook 'profilePanel' -> fila abajo del todo del
 *    modal: [Solicitud de amistad] [Mensaje]. md_button.js ya NO pinta
 *    su botón suelto; este file es el ÚNICO dueño del pie del perfil.
 *    Estados: Solicitud de amistad · Solicitud enviada (click 2 pasos =
 *    cancelar) · Aceptar solicitud · Amigos ✓ (click 2 pasos = quitar).
 *  API: SCSOC.dmFriends
 *      .send(peer, cb)       .cancel(peer, cb)
 *      .accept(peer, cb)     .decline(peer, cb)    .removeFriend(peer, cb)
 *      .stateOf(peer)        .pendingList()
 *      .watchIncoming(cb)->off   .watchSent(cb)->off
 *  Cargar DESPUÉS de md_contacts.js y ANTES de md_tabs.js.
 *  SEGURIDAD: todo texto via textContent (NUNCA innerHTML con datos).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    if (SCSOC.dmFriends) return;

    const D = SCSOC.dm, C = SCSOC.dmContacts;
    const F = SCSOC.dmFriends = {};

    const S = { incoming: {}, sent: {} };
    const cbsIn = [], cbsSent = [];
    const sentOffs = {};
    const _recent = {};
    let inRef = null, sentRef = null;

    function db() { return firebase.database(); }
    function me() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
    function emit(arr, v) { arr.forEach(function (fn) { try { fn(v); } catch (e) {} }); }

    /* ==== sincronizar UNA solicitud enviada (escucha su status) ==== */
    function watchSentOne(peerUid) {
        const a = me();
        if (!a || sentOffs[peerUid]) return;
        const ref = db().ref('friendReqs/' + peerUid + '/' + a.uid);
        const fn = function (s) {
            if (!s.exists()) return;
            const v = s.val() || {};
            if (v.status === 'aceptada') {
                db().ref('users/' + a.uid + '/friends/' + peerUid)
                    .update({ at: Number(v.at) || firebase.database.ServerValue.TIMESTAMP, by: 'req' })
                    .catch(function (err) { console.warn('[mdF] friends:', err); });
                ref.remove().catch(function () {});
                db().ref('users/' + a.uid + '/frSent/' + peerUid).remove().catch(function () {});
                SCSOC.toast('¡Solicitud de amistad aceptada! 🎉');
            } else if (v.status === 'rechazada') {
                ref.remove().catch(function () {});
                db().ref('users/' + a.uid + '/frSent/' + peerUid).remove().catch(function () {});
            } else if (v.status === 'pendiente' && C && C.isFriend && C.isFriend(peerUid)) {
                /* ya son amigos (solicitud mutua aceptada): limpio lo viejo */
                ref.remove().catch(function () {});
                db().ref('users/' + a.uid + '/frSent/' + peerUid).remove().catch(function () {});
            }
        };
        ref.on('value', fn, function (err) { console.warn('[mdF] status:', err); });
        sentOffs[peerUid] = function () { try { ref.off('value', fn); } catch (e) {} };
    }
    function unwatchSentOne(peerUid) {
        if (sentOffs[peerUid]) { try { sentOffs[peerUid](); } catch (e) {} delete sentOffs[peerUid]; }
    }

    function start(u) {
        stop();
        inRef = db().ref('friendReqs/' + u.uid);
        inRef.on('value', function (s) {
            S.incoming = s.val() || {};
            emit(cbsIn, S.incoming);
        }, function (err) { console.warn('[mdF] incoming:', err); });
        sentRef = db().ref('users/' + u.uid + '/frSent');
        sentRef.on('value', function (s) {
            S.sent = s.val() || {};
            Object.keys(S.sent).forEach(watchSentOne);
            Object.keys(sentOffs).forEach(function (k) { if (!S.sent[k]) unwatchSentOne(k); });
            emit(cbsSent, S.sent);
        }, function (err) { console.warn('[mdF] frSent:', err); });
    }
    function stop() {
        if (inRef) { try { inRef.off(); } catch (e) {} inRef = null; }
        if (sentRef) { try { sentRef.off(); } catch (e) {} sentRef = null; }
        Object.keys(sentOffs).forEach(unwatchSentOne);
        S.incoming = {}; S.sent = {};
    }
    try {
        firebase.auth().onAuthStateChanged(function (u) { if (u) start(u); else stop(); });
    } catch (e) { console.warn('[mdF] auth:', e); }

    /* ==== lecturas en vivo ==== */
    function pendingIncoming() {
        const out = [];
        Object.keys(S.incoming || {}).forEach(function (uid) {
            if (C && C.isFriend && C.isFriend(uid)) return;   /* ya son amigos */
            const r = S.incoming[uid];
            if (r && r.status === 'pendiente') {
                out.push({ uid: uid, name: r.name || 'Usuario', handler: r.handler || '', at: Number(r.at) || 0 });
            }
        });
        out.sort(function (a, b) { return b.at - a.at; });
        return out;
    }
    F.pendingList = pendingIncoming;
    F.watchIncoming = function (fn) { cbsIn.push(fn); fn(S.incoming); return function () { const i = cbsIn.indexOf(fn); if (i > -1) cbsIn.splice(i, 1); }; };
    F.watchSent = function (fn) { cbsSent.push(fn); fn(S.sent); return function () { const i = cbsSent.indexOf(fn); if (i > -1) cbsSent.splice(i, 1); }; };

    F.stateOf = function (peerUid) {
        const a = me();
        if (!a || !peerUid || peerUid === a.uid) return '';
        if (C && C.isFriend && C.isFriend(peerUid)) return 'friend';
        if (S.incoming && S.incoming[peerUid] && S.incoming[peerUid].status === 'pendiente') return 'incoming';
        if (S.sent && S.sent[peerUid]) return 'sent';
        return '';
    };

    /* ==== acciones ==== */
    F.send = function (peerUid, cb) {
        const a = me();
        if (!a || !peerUid || peerUid === a.uid) { if (cb) cb(new Error('auth')); return; }
        const st = F.stateOf(peerUid);
        if (st) {
            SCSOC.toast(st === 'incoming'
                ? '¡Esta persona ya te mandó una solicitud! Acéptala en Amigos.'
                : 'Ya hay una solicitud con esta persona.');
            if (cb) cb(new Error('state'));
            return;
        }
        if (_recent[peerUid] && Date.now() - _recent[peerUid] < 30000) {
            SCSOC.toast('Espera un momentito antes de reintentar.');
            if (cb) cb(new Error('spam'));
            return;
        }
        if (!C || !C.blockedBy) { if (cb) cb(new Error('no-contacts')); return; }
        C.blockedBy(peerUid, function (b) {
            if (b) {
                SCSOC.toast('No puedes enviarle una solicitud a esta persona.');
                if (cb) cb(new Error('blk'));
                return;
            }
            D.nameOf(a.uid, function (info) {
                D.prefOf(peerUid, function (p) {
                    if (p && p.mdRequests === 'nadie') {
                        SCSOC.toast('Esta persona no acepta Solicitudes de Amistad.');
                        if (cb) cb(new Error('pref'));
                        return;
                    }
                    const req = {
                        at: firebase.database.ServerValue.TIMESTAMP,
                        name: (info && info.name) || 'Usuario',
                        handler: (info && info.handler) || '',
                        status: 'pendiente'
                    };
                    db().ref('friendReqs/' + peerUid + '/' + a.uid).set(req).then(function () {
                        _recent[peerUid] = Date.now();
                        return db().ref('users/' + a.uid + '/frSent/' + peerUid)
                            .set({ at: firebase.database.ServerValue.TIMESTAMP });
                    }).then(function () {
                        SCSOC.toast('Solicitud enviada ✓');
                        if (cb) cb(null);
                    }).catch(function (err) {
                        console.warn('[mdF] send:', err);
                        SCSOC.toast('No se pudo enviar la solicitud.');
                        if (cb) cb(err);
                    });
                });
            });
        });
    };

    F.cancel = function (peerUid, cb) {
        const a = me();
        if (!a || !peerUid) { if (cb) cb(new Error('auth')); return; }
        db().ref('friendReqs/' + peerUid + '/' + a.uid).remove().then(function () {
            return db().ref('users/' + a.uid + '/frSent/' + peerUid).remove();
        }).then(function () {
            SCSOC.toast('Solicitud cancelada.');
            if (cb) cb(null);
        }).catch(function (err) { console.warn('[mdF] cancel:', err); if (cb) cb(err); });
    };

    F.accept = function (fromUid, cb) {
        const a = me();
        if (!a || !fromUid) { if (cb) cb(new Error('auth')); return; }
        db().ref('users/' + a.uid + '/friends/' + fromUid)
            .set({ at: firebase.database.ServerValue.TIMESTAMP, by: 'req' })
            .then(function () {
                return db().ref('friendReqs/' + a.uid + '/' + fromUid + '/status').set('aceptada');
            })
            .then(function () {
                SCSOC.toast('¡Ahora son amigos! 🎉');
                if (cb) cb(null);
            })
            .catch(function (err) { console.warn('[mdF] accept:', err); if (cb) cb(err); });
    };

    F.decline = function (fromUid, cb) {
        const a = me();
        if (!a || !fromUid) { if (cb) cb(new Error('auth')); return; }
        db().ref('friendReqs/' + a.uid + '/' + fromUid + '/status').set('rechazada')
            .then(function () { if (cb) cb(null); })
            .catch(function (err) { console.warn('[mdF] decline:', err); if (cb) cb(err); });
    };

    F.removeFriend = function (peerUid, cb) {
        const a = me();
        if (!a || !peerUid) { if (cb) cb(new Error('auth')); return; }
        db().ref('users/' + a.uid + '/friends/' + peerUid).remove()
            .then(function () { SCSOC.toast('Amigo eliminado.'); if (cb) cb(null); })
            .catch(function (err) { console.warn('[mdF] removeFriend:', err); if (cb) cb(err); });
    };

    /* ==== BARRA DE ACCIONES del perfil ==== */
    const MAIN = 'var(--text-main,#f8fafc)';
    const MUTED = 'var(--text-muted,#94a3b8)';
    const BORDER = 'var(--border-color,#2e2440)';
    let bar = null, bFr = null, bMsg = null, armT = null, curUid = '';

    function E(tag, cls, css) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (css) n.style.cssText = css;
        return n;
    }
    function setBtn(btn, icon, label) {
        while (btn.firstChild) btn.removeChild(btn.firstChild);
        const ic = document.createElement('i');
        ic.className = 'fa-solid ' + icon;
        btn.appendChild(ic);
        btn.appendChild(document.createTextNode(' ' + label));
    }
    function injectCss() {
        if (document.querySelector('style[data-scdmf]')) return;
        const css = document.createElement('style');
        css.setAttribute('data-scdmf', '1');
        css.textContent = ''
            + '.scdm-profbar{flex:none;display:flex;gap:10px;width:100%;box-sizing:border-box;padding:12px 18px 16px;border-top:1px solid ' + BORDER + ';}'
            + '.scdm-pbtn{flex:1;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;border-radius:12px;border:1px solid rgba(139,92,246,.55);background:transparent;color:var(--purple-accent,#8b5cf6);font:800 12.5px Inter,sans-serif;letter-spacing:.03em;cursor:pointer;padding:0 14px;box-sizing:border-box;transition:background .16s ease,color .16s ease,border-color .16s ease;}'
            + '.scdm-pbtn:hover{background:rgba(139,92,246,.14);}'
            + '.scdm-pbtn.scdm-solid{background:var(--purple-accent,#8b5cf6);border-color:var(--purple-accent,#8b5cf6);color:#fff;}'
            + '.scdm-pbtn.scdm-solid:hover{background:var(--purple-dark,#6d28d9);border-color:var(--purple-dark,#6d28d9);}'
            + '.scdm-pbtn.scdm-arm{background:rgba(239,68,68,.85);border-color:rgba(239,68,68,.9);color:#fff;}'
            + '.scdm-pbtn:disabled{opacity:.55;cursor:default;}';
        document.head.appendChild(css);
    }
    /* el modal-card real: profiles_show manda (uid, modal, cardHost) */
    function cardOf(modal, host) {
        const cands = [modal, host];
        for (let i = 0; i < cands.length; i++) {
            const n = cands[i];
            if (!n || n.nodeType !== 1) continue;
            if (n.classList && n.classList.contains('modal')) return n;
            if (n.querySelector) {
                const inner = n.querySelector('.modal');
                if (inner) return inner;
            }
            if (n.closest) {
                const up = n.closest('.modal');
                if (up) return up;
            }
        }
        return (modal && modal.nodeType === 1) ? modal : host;
    }

    function paintBar() {
        if (!bar || !bFr || !curUid) return;
        if (armT) { clearTimeout(armT); armT = null; }
        const st = F.stateOf(curUid);
        bFr.classList.remove('scdm-solid', 'scdm-arm');
        bFr.disabled = false;
        if (st === 'friend') {
            bFr._mode = 'unfriend';
            setBtn(bFr, 'fa-user-check', 'Amigos ✓');
        } else if (st === 'incoming') {
            bFr._mode = 'accept';
            bFr.classList.add('scdm-solid');
            setBtn(bFr, 'fa-user-check', 'Aceptar solicitud');
        } else if (st === 'sent') {
            bFr._mode = 'cancel';
            setBtn(bFr, 'fa-clock', 'Solicitud enviada ✓');
        } else {
            bFr._mode = 'send';
            setBtn(bFr, 'fa-user-plus', 'Solicitud de amistad');
        }
        setBtn(bMsg, 'fa-paper-plane', 'Mensaje');
    }

    function mount(uid, modal, host) {
        const a = me();
        if (!a || !uid || uid === a.uid) return;      /* en tu propio perfil no hay barra */
        const card = cardOf(modal, host);
        if (!card || card.nodeType !== 1) return;
        injectCss();
        /* red de seguridad: si algún file viejo aún pinta el botón suelto, fuera */
        Array.prototype.forEach.call(card.querySelectorAll('[data-scdm-prof]'), function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
        });
        const old = card.querySelector('[data-scdm-profbar]');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (armT) { clearTimeout(armT); armT = null; }

        curUid = uid;
        bar = E('div', 'scdm-profbar');
        bar.setAttribute('data-scdm-profbar', uid);

        bFr = E('button', 'scdm-pbtn');
        bFr.type = 'button';
        bMsg = E('button', 'scdm-pbtn scdm-solid');
        bMsg.type = 'button';
        bar.appendChild(bFr);
        bar.appendChild(bMsg);

        bFr.addEventListener('click', function (e) {
            e.stopPropagation();
            const mode = bFr._mode;
            if (mode === 'send') {
                bFr.disabled = true;
                F.send(curUid, function () { if (bar && document.contains(bar)) paintBar(); });
            } else if (mode === 'accept') {
                bFr.disabled = true;
                F.accept(curUid, function () { if (bar && document.contains(bar)) paintBar(); });
            } else if (mode === 'cancel' || mode === 'unfriend') {
                /* confirmación en 2 pasos, mismo patrón que Bloquear */
                if (bFr.classList.contains('scdm-arm')) {
                    bFr.classList.remove('scdm-arm');
                    if (mode === 'cancel') F.cancel(curUid, function () { if (bar && document.contains(bar)) paintBar(); });
                    else F.removeFriend(curUid, function () { if (bar && document.contains(bar)) paintBar(); });
                    return;
                }
                bFr.classList.add('scdm-arm');
                setBtn(bFr, 'fa-triangle-exclamation', mode === 'cancel' ? '¿Cancelar solicitud?' : '¿Quitar amigo?');
                armT = setTimeout(function () { if (bar && document.contains(bar)) paintBar(); }, 2600);
            }
        });

        bMsg.addEventListener('click', function (e) {
            e.stopPropagation();
            const peer = curUid;
            if (!peer || !D) return;
            const open = function () {
                D.open(peer, function (convId) {
                    if (SCSOC.dmUI) { SCSOC.dmUI.open(); SCSOC.dmUI.openConv(convId, peer); }
                });
            };
            if (C && C.guard) C.guard(peer, function (err) { if (!err) open(); });
            else open();
        });

        card.appendChild(bar);
        paintBar();
    }

    /* refresco en vivo: amigos, solicitudes que llegan y estados enviados */
    if (C && C.watchFriends) C.watchFriends(function () { if (bar && document.contains(bar)) paintBar(); });
    F.watchIncoming(function () { if (bar && document.contains(bar)) paintBar(); });
    F.watchSent(function () { if (bar && document.contains(bar)) paintBar(); });

    /* hook defensivo (mismo patrón que md_button) */
    (function waitHook() {
        if (SCSOC.onHook) {
            SCSOC.onHook('profilePanel', function () {
                const args = Array.prototype.slice.call(arguments);
                let uid = null, modal = null, host = null;
                args.forEach(function (x) {
                    if (typeof x === 'string' && x.length > 8 && !uid) uid = x;
                    else if (x && x.nodeType === 1) { if (!modal) modal = x; else if (!host) host = x; }
                    else if (x && typeof x === 'object') {
                        if (x.uid && !uid) uid = x.uid;
                        if (x.modal && x.modal.nodeType === 1) modal = x.modal;
                        if (x.cardHost && x.cardHost.nodeType === 1) host = x.cardHost;
                    }
                });
                if (uid) mount(uid, modal, host);
            });
            return;
        }
        setTimeout(waitHook, 300);
    })();

    console.log('[Stevscon] md_friends.js listo (v1) — Solicitudes de Amistad + barra de acciones del perfil.');
})(window, document);