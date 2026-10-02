/**
 * ====
 * STEVSCON.COM — social/manage/output/edit/edit_comment/remove.js (v1)
 * ELIMINAR COMENTARIOS Y RESPUESTAS:
 *  - El AUTOR borra lo suyo, SIEMPRE.
 *  - El OWNER y el STAFF (social/staff) borran LO QUE SEA (regla #15).
 *  - Usuarios normales: solo sus propios comentarios/respuestas.
 *  - Comentarios: hook 'commentMenu' · Respuestas: hook 'responseMenu'
 * ==== 
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};

    /* ==== UI compartida del menú ⋯ (idéntica a edit.js — el guard evita duplicarla) ==== */
    if (!SCSOC.menuAdd) {
        const POP_CSS = 'position:fixed;z-index:2400;min-width:170px;background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:6px;box-shadow:0 14px 40px rgba(0,0,0,.5);font-family:Inter,sans-serif;box-sizing:border-box;';
        let pop = null;
        function closePop() {
            if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
            pop = null;
            document.removeEventListener('click', outside, true);
            document.removeEventListener('keydown', esc, true);
        }
        function outside(e) { if (pop && !pop.contains(e.target)) closePop(); }
        function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); closePop(); } }
        SCSOC.menuAdd = function (ctx, item) {
            const S = SCSOC._dots = SCSOC._dots || {};
            if (!S.session) {
                S.session = { items: [], anchor: ctx.dots || ctx.el };
                setTimeout(function () {
                    const ses = S.session; S.session = null;
                    if (!ses) return;
                    if (!ses.items.length) { if (!firebase.auth().currentUser) SCSOC.deny(); return; }
                    closePop();
                    pop = document.createElement('div');
                    pop.style.cssText = POP_CSS;
                    ses.items.forEach(function (it) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.style.cssText = 'display:flex;align-items:center;gap:9px;width:100%;border:0;background:transparent;color:' + (it.danger ? '#f87171' : 'var(--text-main,#f8fafc)') + ';font:700 12.5px Inter,sans-serif;padding:9px 10px;border-radius:8px;cursor:pointer;text-align:left;';
                        b.addEventListener('mouseenter', function () { b.style.background = 'var(--bg-hover,#261f36)'; });
                        b.addEventListener('mouseleave', function () { b.style.background = 'transparent'; });
                        b.addEventListener('click', function (e) { e.stopPropagation(); closePop(); it.fn(); });
                        const ic = document.createElement('i');
                        ic.className = 'fa-solid ' + (it.icon || 'fa-circle');
                        const sp = document.createElement('span');
                        sp.textContent = it.label;
                        b.appendChild(ic); b.appendChild(sp);
                        pop.appendChild(b);
                    });
                    document.body.appendChild(pop);
                    const r = ses.anchor.getBoundingClientRect();
                    const w = 182, h = pop.offsetHeight || 96;
                    let x = r.right - w + 34, y = r.bottom + 6;
                    if (x < 8) x = 8;
                    if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
                    if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 6);
                    pop.style.left = x + 'px'; pop.style.top = y + 'px';
                    setTimeout(function () {
                        document.addEventListener('click', outside, true);
                        document.addEventListener('keydown', esc, true);
                    }, 0);
                }, 0);
            }
            S.session.items.push(item);
        };

        function shell() {
            const ov = SCSOC.el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2500;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;');
            const box = SCSOC.el('div', 'width:min(460px,100%);background:var(--bg-card,#1a1625);border:1px solid var(--border-color,#2e2440);border-radius:14px;padding:18px;font-family:Inter,sans-serif;box-sizing:border-box;');
            ov.appendChild(box);
            let closed = false;
            const close = function () {
                if (closed) return;
                closed = true;
                if (ov.parentNode) ov.parentNode.removeChild(ov);
                document.removeEventListener('keydown', esc2, true);
            };
            const esc2 = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
            ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
            document.addEventListener('keydown', esc2, true);
            document.body.appendChild(ov);
            return { box: box, close: close };
        }
        function mkBtn(txt, kind) {
            const st = {
                sec: 'border:1px solid var(--border-color,#2e2440);background:transparent;color:var(--text-muted,#94a3b8);',
                pri: 'border:0;background:var(--purple-accent,#8b5cf6);color:#fff;',
                danger: 'border:0;background:#ef4444;color:#fff;'
            }[kind];
            const b = SCSOC.el('button', st + 'font:800 12px Inter,sans-serif;padding:8px 16px;border-radius:999px;cursor:pointer;');
            b.type = 'button'; b.textContent = txt;
            return b;
        }
        SCSOC.editTextModal = function (title, text, max, onSave) {
            const m = shell();
            const h = SCSOC.el('h3', 'margin:0 0 10px;color:var(--text-main,#f8fafc);font:800 15px Inter,sans-serif;');
            h.textContent = title;
            const ta = SCSOC.el('textarea', 'width:100%;box-sizing:border-box;min-height:130px;resize:vertical;background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:10px 12px;font:400 13px/1.55 Inter,sans-serif;outline:none;');
            ta.value = text || ''; ta.maxLength = max;
            const cnt = SCSOC.el('div', 'text-align:right;color:var(--text-muted,#94a3b8);font:600 10.5px Inter,sans-serif;margin:4px 0 12px;');
            const paint = function () { cnt.textContent = ta.value.length + ' / ' + max; };
            ta.addEventListener('input', paint); paint();
            const row = SCSOC.el('div', 'display:flex;justify-content:flex-end;gap:8px;');
            const c = mkBtn('Cancelar', 'sec'), ok = mkBtn('Guardar', 'pri');
            c.addEventListener('click', m.close);
            ok.addEventListener('click', function () {
                const t = ta.value.trim();
                if (!t) { SCSOC.toast('No puede quedar vacío.'); return; }
                m.close(); onSave(t);
            });
            row.appendChild(c); row.appendChild(ok);
            m.box.appendChild(h); m.box.appendChild(ta); m.box.appendChild(cnt); m.box.appendChild(row);
            setTimeout(function () { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
        };
        SCSOC.confirmModal = function (title, msg, onYes) {
            const m = shell();
            const h = SCSOC.el('h3', 'margin:0 0 8px;color:var(--text-main,#f8fafc);font:800 15px Inter,sans-serif;');
            h.textContent = title;
            const p = SCSOC.el('p', 'margin:0 0 14px;color:var(--text-muted,#94a3b8);font:500 12.5px/1.5 Inter,sans-serif;');
            p.textContent = msg;
            const row = SCSOC.el('div', 'display:flex;justify-content:flex-end;gap:8px;');
            const c = mkBtn('Cancelar', 'sec'), ok = mkBtn('Eliminar', 'danger');
            c.addEventListener('click', m.close);
            ok.addEventListener('click', function () { m.close(); onYes(); });
            row.appendChild(c); row.appendChild(ok);
            m.box.appendChild(h); m.box.appendChild(p); m.box.appendChild(row);
        };
    }

    /* ==== ofrecer "Eliminar" (autor y/o staff) ==== */
    function offer(ctx, data) {
        if (!data || !data.id) return;
        if (!firebase.auth().currentUser) return; /* visitantes: nada (el menú hace deny) */
        const isComment = !!ctx.comment;
        SCSOC.menuAdd(ctx, {
            label: 'Eliminar',
            icon: 'fa-trash-can',
            danger: true,
            fn: function () {
                SCSOC.requireLogin(function (me) {
                    const go = function () {
                        SCSOC.confirmModal('Eliminar ' + (isComment ? 'comentario' : 'respuesta'), 'Esto no se puede deshacer. ¿Seguro?', function () {
                            const ref = isComment
                                ? SCSOC.db().ref(SCSOC.CONFIG.COMMENTS).child(ctx.postId).child(data.id)
                                : SCSOC.db().ref(SCSOC.CONFIG.RESPONSES).child(ctx.commentId).child(data.id);
                            ref.remove().then(function () {
                                if (isComment) SCSOC.counters.bump('post', ctx.postId, 'comments', -1);
                                else SCSOC.counters.bump('comment', ctx.commentId, 'responses', -1);
                                SCSOC.toast('Eliminado ✓');
                            }).catch(function () { SCSOC.toast('No se pudo eliminar.'); });
                        });
                    };
                    /* ¿tu propio comentario/respuesta? -> libre */
                    if (data.authorUid === me.uid) { go(); return; }
                    /* ¿owner o staff? -> puede eliminar LO QUE SEA (regla #15) */
                    SCSOC.staff.role(function (r) {
                        if (r) go();
                        else SCSOC.toast('Solo el autor o el staff puede eliminar esto.');
                    });
                });
            }
        });
    }

    SCSOC.onHook('commentMenu', function (ctx) { offer(ctx, ctx.comment); });
    SCSOC.onHook('responseMenu', function (ctx) { offer(ctx, ctx.response); });

    /* calienta el cache de staff al iniciar sesión (para los menús ⋯) */
    window.addEventListener('load', function () {
        try { firebase.auth().onAuthStateChanged(function (u) { if (u) SCSOC.staff.role(function () {}); }); } catch (e) {}
    });

    console.log('[Stevscon] edit_comment/remove.js listo (v1) — autor borra lo suyo; owner/staff borran todo.');
})(window, document);