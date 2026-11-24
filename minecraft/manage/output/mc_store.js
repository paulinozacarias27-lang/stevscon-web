/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_store.js (v2)
 * TIENDA (PÚBLICO): catálogo, detalle, checkout y "Mis compras".
 *  - Escucha en vivo mc/store/items, mc/store/settings,
 *    mc/store/stock y mc/store/myOrders/{uid}; detach al re-pintar.
 *  - Comprar exige cuenta: sin sesión solo se avisa con un toast.
 *  - El pedido se crea con update() multipath en mc/store/orders y en
 *    mc/store/myOrders/{uid} con estado 'pending'.
 *  - Los códigos los asigna el staff al marcar el pedido como pagado:
 *    aquí solo se muestran y se copian. Nunca se publica la IP.
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const db = function () { return firebase.database(); };
    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    const STATUS = {
        pending: ['PENDIENTE', 'mcs-st-pending'],
        paid: ['PAGADA', 'mcs-st-paid'],
        redeemed: ['CANJEADA', 'mcs-st-redeemed'],
        cancelled: ['CANCELADA', 'mcs-st-cancelled']
    };

    function toast(m, k) { if (MC.toast) MC.toast(m, k); }
    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function fa(name) {
        const i = document.createElement('i');
        i.className = 'fa-solid ' + name;
        return i;
    }
    function money(n, cur) {
        const v = Number(n || 0);
        const s = v.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        return cur ? s + ' ' + cur : s;
    }
    function fmtDate(ts) {
        const n = Number(ts);
        if (!n) return '—';
        try {
            return new Date(n).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return '—'; }
    }
    function safeUrl(u) {
        if (MC.formats && typeof MC.formats.safeUrl === 'function') {
            try { return MC.formats.safeUrl(u) || ''; } catch (e) {}
        }
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function renderMd(src) {
        if (MC.formats && typeof MC.formats.md === 'function') {
            try { return MC.formats.md(src); } catch (e) {}
        }
        return String(src || '').split(/\r?\n/).filter(function (l) { return l.trim(); })
            .map(function (l) {
                return '<p>' + l.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
            }).join('');
    }
    function enhance(box) {
        if (MC.formats && typeof MC.formats.enhance === 'function') {
            try { MC.formats.enhance(box); } catch (e) {}
        }
    }
    function copyText(txt) {
        const ok = function () { toast('Código copiado', 'ok'); };
        const bad = function () { toast('No se pudo copiar: selecciona el código a mano.', 'error'); };
        const legacy = function () {
            try {
                const ta = document.createElement('textarea');
                ta.value = txt;
                ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
                document.body.appendChild(ta);
                ta.select();
                const done = document.execCommand('copy');
                document.body.removeChild(ta);
                done ? ok() : bad();
            } catch (e) { bad(); }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(ok).catch(legacy);
            return;
        }
        legacy();
    }
    function buyerName() {
        const s = (MC.system && MC.system.session) || {};
        const u = s.user || {};
        const n = s.name || u.displayName || (u.email ? String(u.email).split('@')[0] : '') || 'Miembro';
        return String(n).slice(0, 60);
    }

    const CSS = `
    .mcs-hero{position:relative;overflow:hidden;border-radius:0;padding:34px 26px;margin:0 0 22px;
      background:var(--bg-card,#181c14);border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4)}
    .mcs-hero h1{margin:0;font:400 clamp(14px,2.4vw,18px) var(--px-font),monospace;line-height:1.6;letter-spacing:.02em;color:var(--text-main,#eef4e6);text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcs-hero-sub{margin:10px 0 0;color:var(--text-muted,#98a28c);font:600 13.5px var(--ui-font),sans-serif;line-height:1.6}
    .mcs-sec{margin:0 0 26px}
    .mcs-sec h2{margin:0 0 12px;font:400 12px var(--px-font),monospace;line-height:1.6;color:var(--text-main,#eef4e6);display:flex;align-items:center;gap:8px;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
    .mcs-card{display:flex;flex-direction:column;background:var(--bg-card,#181c14);border:3px solid #000;
      border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);overflow:hidden;cursor:pointer;transition:transform .12s steps(2,end)}
    .mcs-card:hover{transform:translate(-2px,-2px);box-shadow:0 0 0 2px var(--mc-accent,#7fdc3a),7px 7px 0 rgba(0,0,0,.4)}
    .mcs-card-media{height:140px;background:rgba(127,220,58,.06);display:flex;align-items:center;justify-content:center;overflow:hidden}
    .mcs-card-media img{width:100%;height:100%;object-fit:cover;display:block}
    .mcs-ph{font-size:34px;color:var(--mc-accent,#7fdc3a);opacity:.75}
    .mcs-card-body{display:flex;flex-direction:column;gap:8px;padding:14px 14px 16px;flex:1}
    .mcs-card-name{margin:0;font:700 14.5px var(--ui-font),sans-serif;color:var(--text-main,#eef4e6);line-height:1.6}
    .mcs-card-desc{margin:0;color:var(--text-muted,#98a28c);font:600 12px var(--ui-font),sans-serif;line-height:1.6;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .mcs-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:auto}
    .mcs-price{font:400 12px var(--px-font),monospace;color:var(--gold,#f4c542);letter-spacing:.02em;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcs-stock{font:700 9.5px var(--ui-font),sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:0;
      background:rgba(127,220,58,.14);color:var(--mc-accent,#7fdc3a);border:2px solid #000;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcs-stock.out{background:rgba(255,85,69,.08);color:var(--redstone,#ff5545);border-color:#000}
    .mcs-buy{border:3px solid #000;border-radius:0;padding:9px 12px;background:var(--mc-dark,#4a8f1d);color:#eaf7dd;
      font:700 12.5px var(--ui-font),sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcs-buy:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mcs-buy:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mcs-buy.is-off{background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);border:3px solid #000;cursor:not-allowed;box-shadow:none}
    .mcs-empty{text-align:center;padding:34px 16px;border:3px dashed var(--border-color,#2f3626);border-radius:0;color:var(--text-muted,#98a28c);background:var(--bg-card,#181c14)}
    .mcs-empty i{font-size:26px;color:var(--mc-accent,#7fdc3a);display:block;margin:0 0 10px}
    .mcs-empty p{margin:6px 0 0;font:600 12.5px var(--ui-font),sans-serif;line-height:1.6}
    .mcs-order{background:var(--bg-card,#181c14);border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);padding:13px 15px;margin:0 0 10px}
    .mcs-order-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .mcs-order-name{font:700 13.5px var(--ui-font),sans-serif;color:var(--text-main,#eef4e6);flex:1;min-width:140px}
    .mcs-order-meta{color:var(--text-muted,#98a28c);font:600 11.5px var(--ui-font),sans-serif}
    .mcs-st{font:700 9.5px var(--ui-font),sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:0;border:2px solid #000;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcs-st-pending{background:rgba(244,197,66,.14);color:var(--gold,#f4c542);border-color:#000}
    .mcs-st-paid{background:rgba(127,220,58,.16);color:var(--mc-accent,#7fdc3a);border-color:#000}
    .mcs-st-redeemed{background:rgba(127,220,58,.16);color:var(--mc-accent,#7fdc3a);border-color:#000}
    .mcs-st-cancelled{background:rgba(255,85,69,.08);color:var(--redstone,#ff5545);border-color:#000}
    .mcs-code{margin:11px 0 0;padding:12px 13px;border-radius:0;background:#0b0d09;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626)}
    .mcs-code-label{display:block;font:700 9.5px var(--ui-font),sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--mc-accent,#7fdc3a);margin:0 0 7px}
    .mcs-code-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .mcs-code-val{flex:1;min-width:150px;font:700 17px ui-monospace,Menlo,monospace;letter-spacing:.06em;color:var(--mc-accent,#7fdc3a);word-break:break-all}
    .mcs-copy{border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--mc-accent,#7fdc3a);border-radius:0;padding:7px 11px;
      font:700 11.5px var(--ui-font),sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcs-copy:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mcs-copy:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mcs-code-note{margin:8px 0 0;color:var(--text-muted,#98a28c);font:600 11.5px var(--ui-font),sans-serif;line-height:1.6}
    .mcs-ovl{position:fixed;inset:0;z-index:2000;background:rgba(10,12,8,.85);display:flex;
      align-items:center;justify-content:center;padding:16px;font-family:var(--ui-font),sans-serif}
    .mcs-modal{width:min(560px,96vw);max-height:92vh;overflow:auto;background:var(--bg-card,#181c14);
      border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);padding:20px 22px;color:var(--text-main,#eef4e6)}
    .mcs-modal h3{margin:0 0 8px;font:400 13px var(--px-font),monospace;line-height:1.6;letter-spacing:.02em;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcs-modal-img{width:100%;max-height:220px;object-fit:cover;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);display:block;margin:0 0 12px}
    .mcs-modal-price{font:400 13px var(--px-font),monospace;color:var(--gold,#f4c542);margin:0 0 12px;line-height:1.6;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcs-md{color:var(--text-main,#eef4e6);font:600 13px var(--ui-font),sans-serif;line-height:1.7;margin:0 0 14px}
    .mcs-md p{margin:0 0 8px}
    .mcs-md ul,.mcs-md ol{margin:0 0 8px;padding-left:20px}
    .mcs-md code{background:#0b0d09;color:var(--mc-accent,#7fdc3a);padding:1px 5px;border-radius:0;border:2px solid #000;font-family:ui-monospace,Menlo,monospace}
    .mcs-md a{color:var(--mc-accent,#7fdc3a)}
    .mcs-sum{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;
      padding:11px 13px;border-radius:0;background:#0b0d09;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);margin:0 0 14px}
    .mcs-sum-name{font:700 13.5px var(--ui-font),sans-serif}
    .mcs-x{float:right;background:var(--bg-hover,#232a1b);border:3px solid #000;color:var(--text-muted,#98a28c);
      width:34px;height:34px;border-radius:0;cursor:pointer;font-size:14px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcs-x:hover{color:var(--redstone,#ff5545);border-color:#000}
    .mcs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
    .mcs-actions .mcs-buy{flex:1;min-width:150px}
    .mcs-cancel{border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-main,#eef4e6);
      border-radius:0;padding:9px 14px;font:700 12.5px var(--ui-font),sans-serif;cursor:pointer;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcs-cancel:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mcs-cancel:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    @media(max-width:520px){.mcs-grid{grid-template-columns:1fr}}
    `;
    function injectStyles() {
        if (document.getElementById('mc-store-style')) return;
        const st = document.createElement('style');
        st.id = 'mc-store-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    const state = { items: {}, stock: {}, settings: {}, orders: {}, uid: '', refs: [] };

    function detach() {
        state.refs.forEach(function (r) {
            try { r.ref.off('value', r.cb); } catch (e) {}
        });
        state.refs = [];
    }
    function listen(path, cb) {
        const ref = db().ref(path);
        const fn = function (s) { cb(s.val()); };
        ref.on('value', fn, function () {});
        state.refs.push({ ref: ref, cb: fn });
    }

    let ovl = null;
    function closeModal() {
        if (!ovl) return;
        document.removeEventListener('keydown', ovl._key);
        if (ovl.parentNode) ovl.parentNode.removeChild(ovl);
        ovl = null;
    }
    function openModal(build) {
        closeModal();
        ovl = el('div', 'mcs-ovl');
        const panel = el('div', 'mcs-modal');
        ovl.appendChild(panel);
        ovl.addEventListener('click', function (e) { if (e.target === ovl) closeModal(); });
        ovl._key = function (e) { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', ovl._key);
        document.body.appendChild(ovl);
        build(panel);
    }

    function stockOf(itemId) {
        const v = state.stock[itemId];
        if (v === undefined || v === null) return null;
        return Number(v);
    }
    function activeItems() {
        return Object.keys(state.items).map(function (id) {
            return Object.assign({ id: id }, state.items[id]);
        }).filter(function (it) { return it && it.active === true; })
            .sort(function (a, b) {
                return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || ''));
            });
    }

    MC.store = {
        render: function (main) {
            if (!main) return;
            detach();
            injectStyles();

            const user = (MC.system && MC.system.session && MC.system.session.user) || null;
            state.uid = user ? user.uid : '';
            state.items = {}; state.stock = {}; state.settings = {}; state.orders = {};

            const hero = el('section', 'mcs-hero');
            hero.appendChild(el('h1', null, 'Tienda StevsMCross'));
            hero.appendChild(el('p', 'mcs-hero-sub', 'Paga, recibe tu código y canjéalo en el server.'));
            main.appendChild(hero);

            const sec = el('section', 'mcs-sec');
            const h2 = el('h2');
            h2.appendChild(fa('fa-store'));
            h2.appendChild(document.createTextNode(' Artículos'));
            sec.appendChild(h2);
            const grid = el('div', 'mcs-grid');
            sec.appendChild(grid);
            main.appendChild(sec);

            let mineList = null;
            if (state.uid) {
                const mine = el('section', 'mcs-sec');
                const mh = el('h2');
                mh.appendChild(fa('fa-receipt'));
                mh.appendChild(document.createTextNode(' Mis compras'));
                mine.appendChild(mh);
                mineList = el('div');
                mine.appendChild(mineList);
                main.appendChild(mine);
            }

            const paintGrid = function () {
                grid.textContent = '';
                const list = activeItems();
                if (!list.length) {
                    const box = el('div', 'mcs-empty');
                    box.appendChild(fa('fa-cube'));
                    box.appendChild(el('p', null, 'La tienda está vacía por ahora. Vuelve pronto.'));
                    grid.appendChild(box);
                    return;
                }
                list.forEach(function (it) { grid.appendChild(card(it)); });
            };

            const paintMine = function () {
                if (!mineList) return;
                mineList.textContent = '';
                const ids = Object.keys(state.orders).sort(function (a, b) {
                    return (Number(state.orders[b].createdAt) || 0) - (Number(state.orders[a].createdAt) || 0);
                });
                if (!ids.length) {
                    mineList.appendChild(el('p', 'mcs-order-meta', 'Todavía no tienes compras. Cuando envíes un pedido aparecerá aquí con su código.'));
                    return;
                }
                ids.forEach(function (id) { mineList.appendChild(orderRow(state.orders[id])); });
            };

            listen('mc/store/items', function (v) { state.items = v || {}; paintGrid(); });
            listen('mc/store/stock', function (v) { state.stock = v || {}; paintGrid(); });
            listen('mc/store/settings', function (v) { state.settings = v || {}; });
            if (state.uid) listen('mc/store/myOrders/' + state.uid, function (v) { state.orders = v || {}; paintMine(); });

            paintGrid();
            paintMine();
        },

        openDetail: function (itemId) {
            const it = state.items[itemId];
            if (!it) return;
            const n = stockOf(itemId);
            openModal(function (panel) {
                const x = el('button', 'mcs-x');
                x.type = 'button';
                x.appendChild(fa('fa-xmark'));
                x.addEventListener('click', closeModal);
                panel.appendChild(x);

                const src = safeUrl(it.img || '');
                if (src) {
                    const im = document.createElement('img');
                    im.className = 'mcs-modal-img';
                    im.alt = '';
                    im.src = src;
                    panel.appendChild(im);
                }
                panel.appendChild(el('h3', null, it.name || 'Artículo'));
                panel.appendChild(el('p', 'mcs-modal-price', money(it.price, it.currency)));

                const md = el('div', 'mcs-md');
                md.innerHTML = renderMd(it.desc || '');
                panel.appendChild(md);
                enhance(md);

                const acts = el('div', 'mcs-actions');
                const buy = el('button', 'mcs-buy');
                buy.type = 'button';
                buy.appendChild(fa('fa-bag-shopping'));
                buy.appendChild(document.createTextNode(n !== null && n <= 0 ? ' Agotado' : ' Comprar'));
                if (n !== null && n <= 0) { buy.disabled = true; buy.classList.add('is-off'); }
                buy.addEventListener('click', function () { MC.store.openCheckout(itemId); });
                acts.appendChild(buy);

                const cancel = el('button', 'mcs-cancel');
                cancel.type = 'button';
                cancel.textContent = 'Cerrar';
                cancel.addEventListener('click', closeModal);
                acts.appendChild(cancel);
                panel.appendChild(acts);
            });
        },

        openCheckout: function (itemId) {
            const it = state.items[itemId];
            if (!it) return;
            const user = (MC.system && MC.system.session && MC.system.session.user) || null;
            if (!user) {
                toast('Necesitas una cuenta para comprar. Crea una o inicia sesión.', 'error');
                return;
            }
            openModal(function (panel) {
                const x = el('button', 'mcs-x');
                x.type = 'button';
                x.appendChild(fa('fa-xmark'));
                x.addEventListener('click', closeModal);
                panel.appendChild(x);

                panel.appendChild(el('h3', null, 'Confirmar pedido'));

                const sum = el('div', 'mcs-sum');
                sum.appendChild(el('span', 'mcs-sum-name', it.name || 'Artículo'));
                sum.appendChild(el('span', 'mcs-price', money(it.price, it.currency)));
                panel.appendChild(sum);

                const info = String((state.settings && state.settings.info) || '').trim();
                const md = el('div', 'mcs-md');
                if (info) {
                    md.innerHTML = renderMd(info);
                    enhance(md);
                } else {
                    md.appendChild(el('p', null, 'El staff todavía no configuró las instrucciones de pago.'));
                }
                panel.appendChild(md);

                const acts = el('div', 'mcs-actions');
                const send = el('button', 'mcs-buy');
                send.type = 'button';
                send.appendChild(fa('fa-paper-plane'));
                send.appendChild(document.createTextNode(' Enviar pedido'));
                send.addEventListener('click', function () { sendOrder(itemId, send); });
                acts.appendChild(send);

                const cancel = el('button', 'mcs-cancel');
                cancel.type = 'button';
                cancel.textContent = 'Cancelar';
                cancel.addEventListener('click', closeModal);
                acts.appendChild(cancel);
                panel.appendChild(acts);
            });
        }
    };

    function card(it) {
        const c = el('article', 'mcs-card');
        c.addEventListener('click', function () { MC.store.openDetail(it.id); });

        const media = el('div', 'mcs-card-media');
        const src = safeUrl(it.img || '');
        if (src) {
            const im = document.createElement('img');
            im.alt = '';
            im.loading = 'lazy';
            im.src = src;
            media.appendChild(im);
        } else {
            const ph = el('span', 'mcs-ph');
            ph.appendChild(fa('fa-cube'));
            media.appendChild(ph);
        }
        c.appendChild(media);

        const body = el('div', 'mcs-card-body');
        body.appendChild(el('h3', 'mcs-card-name', it.name || 'Artículo'));
        if (it.desc) body.appendChild(el('p', 'mcs-card-desc', it.desc));

        const foot = el('div', 'mcs-card-foot');
        foot.appendChild(el('span', 'mcs-price', money(it.price, it.currency)));
        const n = stockOf(it.id);
        if (n !== null) {
            foot.appendChild(el('span', 'mcs-stock' + (n <= 0 ? ' out' : ''), n <= 0 ? 'AGOTADO' : n + ' en stock'));
        }
        body.appendChild(foot);

        const buy = el('button', 'mcs-buy');
        buy.type = 'button';
        buy.appendChild(fa('fa-bag-shopping'));
        buy.appendChild(document.createTextNode(' Comprar'));
        if (n !== null && n <= 0) { buy.disabled = true; buy.classList.add('is-off'); }
        buy.addEventListener('click', function (e) {
            e.stopPropagation();
            MC.store.openDetail(it.id);
        });
        body.appendChild(buy);

        c.appendChild(body);
        return c;
    }

    function orderRow(o) {
        const wrap = el('div', 'mcs-order');
        const top = el('div', 'mcs-order-top');
        top.appendChild(el('span', 'mcs-order-name', o.itemName || 'Artículo'));
        top.appendChild(el('span', 'mcs-order-meta', money(o.price, o.currency)));
        top.appendChild(el('span', 'mcs-order-meta', '· ' + fmtDate(o.createdAt)));
        const st = STATUS[o.status] || STATUS.pending;
        top.appendChild(el('span', 'mcs-st ' + st[1], st[0]));
        wrap.appendChild(top);

        if (o.code) {
            const box = el('div', 'mcs-code');
            box.appendChild(el('span', 'mcs-code-label', 'TU CÓDIGO'));
            const row = el('div', 'mcs-code-row');
            row.appendChild(el('code', 'mcs-code-val', o.code));
            const cp = el('button', 'mcs-copy');
            cp.type = 'button';
            cp.appendChild(fa('fa-copy'));
            cp.appendChild(document.createTextNode(' Copiar'));
            cp.addEventListener('click', function () { copyText(String(o.code)); });
            row.appendChild(cp);
            box.appendChild(row);
            box.appendChild(el('p', 'mcs-code-note', 'Canjea este código en el server con el comando del plugin.'));
            wrap.appendChild(box);
        }
        return wrap;
    }

    function sendOrder(itemId, btn) {
        const it = state.items[itemId];
        const user = (MC.system && MC.system.session && MC.system.session.user) || null;
        if (!it || !user) {
            toast('Necesitas una cuenta para comprar. Crea una o inicia sesión.', 'error');
            return;
        }
        btn.disabled = true;

        const orderId = db().ref('mc/store/orders').push().key;
        const rec = {
            itemId: itemId,
            itemName: it.name || 'Artículo',
            price: Number(it.price || 0),
            currency: String(it.currency || ''),
            buyerUid: user.uid,
            buyerName: buyerName(),
            status: 'pending',
            createdAt: Date.now()
        };
        const up = {};
        up['mc/store/orders/' + orderId] = rec;
        up['mc/store/myOrders/' + user.uid + '/' + orderId] = rec;

        db().ref().update(up).then(function () {
            toast('Pedido enviado. Un admin lo revisará y recibirás tu código aquí.', 'ok');
            closeModal();
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudo enviar el pedido.', 'error');
            btn.disabled = false;
        });
    }

    console.log('[Stevscon] mc_store.js listo (v2) — tienda con códigos canjeables.');
})(window, document);
