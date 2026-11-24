/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_store_manage.js (v3)
 * TIENDA (STAFF): artículos, códigos, pedidos y ajustes.
 *  - mount() se pinta dentro del panel de admin y de la pestaña Tienda.
 *  - Escucha en vivo mc/store/items, codes, orders, stock y settings;
 *    detach al re-montar.
 *  - Códigos: se pegan uno por línea, se guardan como 'available' y el
 *    stock se recalcula solo tras cada operación.
 *  - Pedidos: 'Marcar pagado' asigna el primer código disponible del
 *    item con update() multipath (codes + orders + myOrders).
 *  - Nunca se publica la IP del servidor.
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * v3 — PUENTE PLUGIN: tipo/cantidad por artículo, carga del código al server (curl/codes.yml) y estado entregado.
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const db = function () { return firebase.database(); };
    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    const TABS = [
        ['items', 'Artículos', 'fa-box'],
        ['codes', 'Códigos', 'fa-key'],
        ['orders', 'Pedidos', 'fa-receipt'],
        ['settings', 'Ajustes', 'fa-sliders']
    ];
    const STATUS = {
        pending: ['PENDIENTE', 'mcsa-st-pending'],
        paid: ['PAGADA', 'mcsa-st-paid'],
        delivered: ['Listo para canjear', 'mcsa-st-paid'],
        redeemed: ['CANJEADA', 'mcsa-st-redeemed'],
        cancelled: ['CANCELADA', 'mcsa-st-cancelled']
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
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function staffView() {
        if (MC.core && typeof MC.core.staffView === 'function') return MC.core.staffView();
        return !!(MC.system && MC.system.session && MC.system.session.isStaff);
    }
    function uid() {
        return (MC.system && MC.system.session && MC.system.session.uid) || '';
    }

    const CSS = `
    .mcsa-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}
    .mcsa-tab{border:2px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-muted,#98a28c);
      border-radius:0;padding:8px 15px;font:700 12.5px var(--ui-font),sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcsa-tab:hover{color:var(--text-main,#eef4e6)}
    .mcsa-tab.is-on{background:rgba(127,220,58,.12);color:var(--mc-accent,#7fdc3a);border-color:var(--mc-accent,#7fdc3a)}
    .mcsa-h3{margin:0 0 10px;font:400 12px var(--px-font),monospace;line-height:1.6;color:var(--text-main,#eef4e6);display:flex;align-items:center;gap:8px;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcsa-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 12px}
    .mcsa-head .mcsa-h3{margin:0}
    .mcsa-list{margin:12px 0 0}
    .mcsa-row{display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:2px solid var(--border-color,#2f3626);flex-wrap:wrap}
    .mcsa-gro{flex:1;min-width:170px}
    .mcsa-gro strong{display:block;font:700 13.5px var(--ui-font),sans-serif;color:var(--text-main,#eef4e6)}
    .mcsa-gro small{color:var(--text-muted,#98a28c);font:600 11.5px var(--ui-font),sans-serif}
    .mcsa-code{font:700 13px ui-monospace,Menlo,monospace;letter-spacing:.05em;color:var(--mc-accent,#7fdc3a);word-break:break-all}
    .mcsa-btn{border:3px solid #000;background:var(--bg-hover,#232a1b);color:var(--text-main,#eef4e6);
      border-radius:0;padding:7px 12px;font:700 12px var(--ui-font),sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcsa-btn:hover{border-color:var(--mc-accent,#7fdc3a);color:var(--mc-accent,#7fdc3a)}
    .mcsa-btn:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mcsa-btn.pri{background:var(--mc-dark,#4a8f1d);border-color:#000;color:#eaf7dd}
    .mcsa-btn.pri:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mcsa-btn.danger{background:var(--redstone,#ff5545);border-color:#000;color:#fff}
    .mcsa-btn.danger:hover{background:#c23225;color:#fff}
    .mcsa-btn.danger.arm{background:#c23225;color:#fff;border-color:#000}
    .mcsa-btn:disabled{opacity:.55;cursor:not-allowed}
    .mcsa-st{font:700 9.5px var(--ui-font),sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:0;border:2px solid #000;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.14),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcsa-st-pending{background:rgba(244,197,66,.14);color:var(--gold,#f4c542);border-color:#000}
    .mcsa-st-paid{background:rgba(127,220,58,.16);color:var(--mc-accent,#7fdc3a);border-color:#000}
    .mcsa-st-redeemed{background:rgba(127,220,58,.16);color:var(--mc-accent,#7fdc3a);border-color:#000}
    .mcsa-st-cancelled{background:rgba(255,85,69,.08);color:var(--redstone,#ff5545);border-color:#000}
    .mcsa-hint{color:var(--text-muted,#98a28c);font:600 11.5px var(--ui-font),sans-serif;margin:6px 0 10px;line-height:1.6}
    .mcsa-denied{color:var(--text-muted,#98a28c);font:700 13px var(--ui-font),sans-serif;padding:18px 0}
    .mcsa-input{width:100%;background:#0b0d09;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);
      color:var(--text-main,#eef4e6);padding:10px 12px;font:600 13px var(--ui-font),sans-serif;outline:0;box-sizing:border-box;margin:0 0 10px}
    .mcsa-input:focus{border-color:#000;box-shadow:0 0 0 2px var(--gold,#f4c542)}
    .mcsa-mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;resize:vertical}
    .mcsa-form{display:grid;gap:12px}
    .mcsa-form label{display:block;font:700 10px var(--ui-font),sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#98a28c);margin:0 0 5px}
    .mcsa-form input[type=text],.mcsa-form input[type=number],.mcsa-form input[type=password],.mcsa-form select,.mcsa-form textarea{
      width:100%;background:#0b0d09;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);
      color:var(--text-main,#eef4e6);padding:10px 12px;font:600 13px var(--ui-font),sans-serif;outline:0;box-sizing:border-box}
    .mcsa-form input:focus,.mcsa-form select:focus,.mcsa-form textarea:focus{border-color:#000;box-shadow:0 0 0 2px var(--gold,#f4c542)}
    .mcsa-form textarea{min-height:110px;resize:vertical;line-height:1.6}
    .mcsa-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .mcsa-prev{max-height:130px;border-radius:0;border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626);display:block;margin:0 0 8px}
    .mcsa-ovl{position:fixed;inset:0;z-index:2100;background:rgba(10,12,8,.85);display:flex;
      align-items:center;justify-content:center;padding:16px;font-family:var(--ui-font),sans-serif}
    .mcsa-modal{width:min(620px,96vw);max-height:92vh;overflow:auto;background:var(--bg-card,#181c14);
      border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);padding:20px 22px;color:var(--text-main,#eef4e6)}
    .mcsa-modal h3{margin:0 0 12px;font:400 13px var(--px-font),monospace;line-height:1.6;letter-spacing:.02em;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcsa-x{float:right;background:var(--bg-hover,#232a1b);border:3px solid #000;color:var(--text-muted,#98a28c);
      width:34px;height:34px;border-radius:0;cursor:pointer;font-size:14px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcsa-x:hover{color:var(--redstone,#ff5545);border-color:#000}
    @media(max-width:640px){.mcsa-2{grid-template-columns:1fr}}
    `;
    function injectStyles() {
        if (document.getElementById('mc-store-manage-style')) return;
        const st = document.createElement('style');
        st.id = 'mc-store-manage-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    const state = { items: {}, codes: {}, orders: {}, stock: {}, settings: {}, selItem: '', refs: [] };
    let repaint = null;

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
    function fire() {
        if (typeof repaint !== 'function') return;
        try { repaint(); } catch (e) {}
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
        ovl = el('div', 'mcsa-ovl');
        const panel = el('div', 'mcsa-modal');
        ovl.appendChild(panel);
        ovl.addEventListener('click', function (e) { if (e.target === ovl) closeModal(); });
        ovl._key = function (e) { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', ovl._key);
        document.body.appendChild(ovl);
        build(panel);
    }
    function armed(btn, fn) {
        let armedSt = false;
        btn.addEventListener('click', function () {
            if (!armedSt) {
                armedSt = true;
                btn.classList.add('arm');
                btn.textContent = '¿Seguro?';
                setTimeout(function () {
                    armedSt = false;
                    btn.classList.remove('arm');
                    btn.textContent = 'Borrar';
                }, 2600);
                return;
            }
            fn();
        });
    }
    function field(labelTxt, input) {
        const w = el('div');
        w.appendChild(el('label', null, labelTxt));
        w.appendChild(input);
        return w;
    }

    function sortedItems() {
        return Object.keys(state.items).map(function (id) {
            return Object.assign({ id: id }, state.items[id]);
        }).sort(function (a, b) {
            return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || ''));
        });
    }

    function recalcStock(itemId) {
        if (!itemId) return Promise.resolve();
        return db().ref('mc/store/codes').once('value').then(function (s) {
            const all = s.val() || {};
            let n = 0;
            Object.keys(all).forEach(function (k) {
                const c = all[k];
                if (c && c.itemId === itemId && c.status === 'available') n++;
            });
            return db().ref('mc/store/stock/' + itemId).set(n);
        }).catch(function () {});
    }

    MC.storeManage = {
        tab: 'items',

        mount: function (container) {
            if (!container) return;
            detach();
            repaint = null;
            container.textContent = '';
            if (!staffView()) {
                container.appendChild(el('p', 'mcsa-denied', 'Zona solo para staff.'));
                return;
            }
            injectStyles();

            const self = this;
            const tabs = el('div', 'mcsa-tabs');
            const body = el('div', 'mcsa-body');
            const btns = {};
            const paint = function (key) {
                self.tab = key;
                Object.keys(btns).forEach(function (k) { btns[k].classList.toggle('is-on', k === key); });
                body.textContent = '';
                repaint = null;
                if (key === 'items') paintItems(body);
                else if (key === 'codes') paintCodes(body);
                else if (key === 'orders') paintOrders(body);
                else paintSettings(body);
            };
            TABS.forEach(function (t) {
                const b = el('button', 'mcsa-tab');
                b.type = 'button';
                b.appendChild(fa(t[2]));
                b.appendChild(document.createTextNode(' ' + t[1]));
                b.addEventListener('click', function () { paint(t[0]); });
                btns[t[0]] = b;
                tabs.appendChild(b);
            });
            container.appendChild(tabs);
            container.appendChild(body);
            paint(this.tab);

            listen('mc/store/items', function (v) { state.items = v || {}; fire(); });
            listen('mc/store/codes', function (v) { state.codes = v || {}; fire(); });
            listen('mc/store/orders', function (v) { state.orders = v || {}; fire(); });
            listen('mc/store/stock', function (v) { state.stock = v || {}; fire(); });
            listen('mc/store/settings', function (v) { state.settings = v || {}; fire(); });
        }
    };

    function paintItems(box) {
        const head = el('div', 'mcsa-head');
        head.appendChild(el('h3', 'mcsa-h3', 'Artículos'));
        const add = el('button', 'mcsa-btn pri');
        add.type = 'button';
        add.appendChild(fa('fa-plus'));
        add.appendChild(document.createTextNode(' Nuevo artículo'));
        add.addEventListener('click', function () { openItemModal(null); });
        head.appendChild(add);
        box.appendChild(head);

        const list = el('div', 'mcsa-list');
        box.appendChild(list);
        repaint = function () { paintItemsList(list); };
        paintItemsList(list);
    }

    function paintItemsList(list) {
        list.textContent = '';
        const items = sortedItems();
        if (!items.length) {
            list.appendChild(el('p', 'mcsa-hint', 'Todavía no hay artículos. Crea el primero con "Nuevo artículo".'));
            return;
        }
        items.forEach(function (it) {
            const row = el('div', 'mcsa-row');
            const gro = el('div', 'mcsa-gro');
            const t = el('strong', null, it.name || 'Artículo');
            if (!it.active) t.appendChild(el('span', 'mcsa-st mcsa-st-cancelled', 'OCULTO'));
            gro.appendChild(t);
            const st = state.stock[it.id];
            const stockTxt = (st === undefined || st === null) ? 'sin stock calculado' : (Number(st) + ' disponibles');
            gro.appendChild(el('small', null, money(it.price, it.currency) + ' · ' + stockTxt + ' · orden ' + (Number(it.order) || 0) + ' · ' + (String(it.tipo || '').toUpperCase() === 'RUBBIES' ? 'RUBBIES' : 'BOTELLAS') + ' x' + (Number(it.cantidad) || 1)));
            row.appendChild(gro);

            const ed = el('button', 'mcsa-btn');
            ed.type = 'button';
            ed.appendChild(fa('fa-pen-to-square'));
            ed.appendChild(document.createTextNode(' Editar'));
            ed.addEventListener('click', function () { openItemModal(it.id); });
            row.appendChild(ed);

            const de = el('button', 'mcsa-btn danger');
            de.type = 'button';
            de.textContent = 'Borrar';
            armed(de, function () {
                db().ref('mc/store/items/' + it.id).remove().then(function () {
                    toast('Artículo borrado', 'ok');
                }).catch(function (e) {
                    toast((e && e.message) || 'No se pudo borrar el artículo.', 'error');
                });
            });
            row.appendChild(de);

            list.appendChild(row);
        });
    }

    function openItemModal(id) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const it = id ? (state.items[id] || {}) : {};
        openModal(function (panel) {
            const x = el('button', 'mcsa-x');
            x.type = 'button';
            x.appendChild(fa('fa-xmark'));
            x.addEventListener('click', closeModal);
            panel.appendChild(x);
            panel.appendChild(el('h3', null, id ? 'Editar artículo' : 'Nuevo artículo'));

            const name = document.createElement('input');
            name.type = 'text';
            name.maxLength = 80;
            name.placeholder = 'Nombre del artículo';
            name.value = it.name || '';

            const price = document.createElement('input');
            price.type = 'number';
            price.min = '0';
            price.max = '1000000';
            price.step = '0.01';
            price.value = it.price != null ? String(it.price) : '0';

            const currency = document.createElement('input');
            currency.type = 'text';
            currency.maxLength = 8;
            currency.placeholder = 'USD';
            currency.value = it.currency || '';

            const order = document.createElement('input');
            order.type = 'number';
            order.value = it.order != null ? String(it.order) : '0';

            const tipo = document.createElement('select');
            [['BOTELLAS', 'BOTELLAS'], ['RUBBIES', 'RUBBIES']].forEach(function (o) {
                const op = document.createElement('option');
                op.value = o[0];
                op.textContent = o[1];
                tipo.appendChild(op);
            });
            tipo.value = String(it.tipo || '').toUpperCase() === 'RUBBIES' ? 'RUBBIES' : 'BOTELLAS';

            const cantidad = document.createElement('input');
            cantidad.type = 'number';
            cantidad.min = '1';
            cantidad.max = '1000000';
            cantidad.step = '1';
            cantidad.value = it.cantidad != null ? String(it.cantidad) : '1';

            const desc = document.createElement('textarea');
            desc.maxLength = 500;
            desc.placeholder = 'Descripción corta (markdown permitido)...';
            desc.value = it.desc || '';

            const active = document.createElement('input');
            active.type = 'checkbox';
            active.checked = it.active !== false;
            active.style.cssText = 'width:auto;margin-right:8px;transform:scale(1.3)';

            const imgPrev = document.createElement('img');
            imgPrev.className = 'mcsa-prev';
            imgPrev.alt = '';
            let imgVal = String(it.img || '');
            const paintPrev = function () {
                if (imgVal) { imgPrev.src = imgVal; imgPrev.style.display = 'block'; }
                else { imgPrev.removeAttribute('src'); imgPrev.style.display = 'none'; }
            };

            const imgFile = document.createElement('input');
            imgFile.type = 'file';
            imgFile.accept = 'image/*';
            imgFile.style.cssText = 'color:var(--text-muted);font-size:12px;margin:0 0 8px;display:block';
            imgFile.addEventListener('change', function () {
                const f = imgFile.files && imgFile.files[0];
                if (!f) return;
                imgFile.disabled = true;
                const finish = function (dataURI, err) {
                    imgFile.disabled = false;
                    if (err) return toast(err, 'error');
                    imgVal = dataURI;
                    paintPrev();
                    toast('Imagen lista (' + Math.round(dataURI.length / 1024) + 'KB)', 'ok');
                };
                if (MC.system && typeof MC.system.shrinkImage === 'function') {
                    MC.system.shrinkImage(f, { maxDim: 1920, targetStr: 2000000, hardStr: 9000000 }, finish);
                } else {
                    finish(null, 'Falta mc_system.js: no se puede optimizar la imagen.');
                }
            });

            const imgClear = el('button', 'mcsa-btn danger');
            imgClear.type = 'button';
            imgClear.textContent = 'Quitar imagen';
            imgClear.addEventListener('click', function () {
                imgVal = '';
                imgFile.value = '';
                paintPrev();
            });

            const form = el('div', 'mcsa-form');
            form.appendChild(field('NOMBRE', name));
            const r1 = el('div', 'mcsa-2');
            r1.appendChild(field('PRECIO', price));
            r1.appendChild(field('MONEDA', currency));
            form.appendChild(r1);
            form.appendChild(field('DESCRIPCIÓN', desc));
            form.appendChild(field('IMAGEN (HASTA 20MB, SE OPTIMIZA SOLA)', imgFile));
            form.appendChild(imgPrev);
            form.appendChild(imgClear);
            const r2 = el('div', 'mcsa-2');
            r2.appendChild(field('ORDEN', order));
            const actW = el('div');
            actW.appendChild(el('label', null, 'VISIBLE EN LA TIENDA'));
            const actRow = el('div');
            actRow.style.cssText = 'font:600 13px Inter,sans-serif;padding-top:8px';
            actRow.appendChild(active);
            actRow.appendChild(document.createTextNode(' Activo'));
            actW.appendChild(actRow);
            r2.appendChild(actW);
            form.appendChild(r2);
            const r3 = el('div', 'mcsa-2');
            r3.appendChild(field('ENTREGA EN EL JUEGO', tipo));
            r3.appendChild(field('CANTIDAD (PLUGIN)', cantidad));
            form.appendChild(r3);

            const save = el('button', 'mcsa-btn pri');
            save.type = 'button';
            save.appendChild(fa('fa-floppy-disk'));
            save.appendChild(document.createTextNode(id ? ' Guardar cambios' : ' Crear artículo'));
            save.addEventListener('click', function () {
                saveItem(id, {
                    name: name.value, desc: desc.value, img: imgVal,
                    price: price.value, currency: currency.value,
                    active: active.checked, order: order.value,
                    tipo: tipo.value, cantidad: cantidad.value
                }, save);
            });
            form.appendChild(save);
            panel.appendChild(form);
            paintPrev();
        });
    }

    function saveItem(id, data, btn) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const name = String(data.name || '').trim();
        if (!name) return toast('El artículo necesita nombre.', 'error');
        if (name.length > 80) return toast('El nombre no puede pasar de 80 caracteres.', 'error');
        const desc = String(data.desc || '');
        if (desc.length > 500) return toast('La descripción no puede pasar de 500 caracteres.', 'error');
        const price = Number(data.price);
        if (!isFinite(price) || price < 0 || price > 1000000) return toast('El precio debe estar entre 0 y 1000000.', 'error');
        const currency = String(data.currency || '').trim();
        if (currency.length > 8) return toast('La moneda no puede pasar de 8 caracteres.', 'error');
        const img = String(data.img || '');
        if (img.length > 9000000) return toast('La imagen pasa de 9MB incluso optimizada. Prueba con otra.', 'error');
        const tipo = String(data.tipo || '').trim().toUpperCase() === 'RUBBIES' ? 'RUBBIES' : 'BOTELLAS';
        const cantidad = Math.floor(Number(data.cantidad));
        if (!isFinite(cantidad) || cantidad < 1 || cantidad > 1000000) return toast('La cantidad debe estar entre 1 y 1000000.', 'error');

        const now = Date.now();
        const prev = id ? (state.items[id] || {}) : {};
        const rec = {
            name: name,
            desc: desc,
            img: img,
            price: price,
            currency: currency,
            active: !!data.active,
            order: Number(data.order) || 0,
            tipo: tipo,
            cantidad: cantidad,
            createdAt: Number(prev.createdAt) || now,
            updatedAt: now,
            by: uid()
        };
        btn.disabled = true;
        const ref = id ? db().ref('mc/store/items/' + id) : db().ref('mc/store/items').push();
        ref.set(rec).then(function () {
            toast(id ? 'Artículo actualizado' : 'Artículo creado', 'ok');
            closeModal();
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudo guardar el artículo.', 'error');
            btn.disabled = false;
        });
    }

    function paintCodes(box) {
        box.appendChild(el('h3', 'mcsa-h3', 'Códigos'));
        const items = sortedItems();
        if (!items.length) {
            box.appendChild(el('p', 'mcsa-hint', 'Crea primero un artículo en la pestaña Artículos.'));
            repaint = null;
            return;
        }

        const sel = el('select', 'mcsa-input');
        items.forEach(function (it) {
            const op = document.createElement('option');
            op.value = it.id;
            op.textContent = (it.name || 'Artículo') + (it.active ? '' : ' (oculto)');
            sel.appendChild(op);
        });
        if (!state.selItem || !items.some(function (i) { return i.id === state.selItem; })) state.selItem = items[0].id;
        sel.value = state.selItem;
        box.appendChild(sel);

        const ta = el('textarea', 'mcsa-input mcsa-mono');
        ta.rows = 6;
        ta.placeholder = 'Pega los códigos, uno por línea';
        box.appendChild(ta);

        const list = el('div', 'mcsa-list');
        sel.addEventListener('change', function () {
            state.selItem = sel.value;
            paintCodesList(list);
        });

        const add = el('button', 'mcsa-btn pri');
        add.type = 'button';
        add.appendChild(fa('fa-plus'));
        add.appendChild(document.createTextNode(' Añadir'));
        add.addEventListener('click', function () { addCodes(state.selItem, ta.value, add, ta); });
        box.appendChild(add);

        box.appendChild(list);
        repaint = function () { paintCodesList(list); };
        paintCodesList(list);
    }

    function paintCodesList(list) {
        list.textContent = '';
        const itemId = state.selItem;
        const rows = Object.keys(state.codes).map(function (k) {
            return Object.assign({ id: k }, state.codes[k]);
        }).filter(function (c) { return c && c.itemId === itemId; })
            .sort(function (a, b) { return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0); });

        if (!rows.length) {
            list.appendChild(el('p', 'mcsa-hint', 'Este artículo todavía no tiene códigos.'));
            return;
        }
        rows.forEach(function (c) { list.appendChild(codeRow(c)); });
    }

    function codeRow(c) {
        const row = el('div', 'mcsa-row');
        const gro = el('div', 'mcsa-gro');
        gro.appendChild(el('strong', 'mcsa-code', c.code || '—'));
        const who = c.assignedName ? ' · ' + c.assignedName : '';
        gro.appendChild(el('small', null, (c.status || 'available') + who + ' · ' + fmtDate(c.createdAt)));
        row.appendChild(gro);

        const st = STATUS[c.status] || ['DISPONIBLE', 'mcsa-st-paid'];
        row.appendChild(el('span', 'mcsa-st ' + st[1], st[0]));

        if (c.status !== 'available') {
            const lib = el('button', 'mcsa-btn');
            lib.type = 'button';
            lib.appendChild(fa('fa-rotate-left'));
            lib.appendChild(document.createTextNode(' Liberar'));
            lib.addEventListener('click', function () {
                lib.disabled = true;
                db().ref('mc/store/codes/' + c.id).update({
                    status: 'available', order: null, assignedTo: null,
                    assignedName: null, soldAt: null, redeemedAt: null
                }).then(function () {
                    toast('Código liberado', 'ok');
                    recalcStock(c.itemId);
                }).catch(function (e) {
                    toast((e && e.message) || 'No se pudo liberar el código.', 'error');
                    lib.disabled = false;
                });
            });
            row.appendChild(lib);
        }

        if (c.status !== 'redeemed') {
            const red = el('button', 'mcsa-btn');
            red.type = 'button';
            red.appendChild(fa('fa-check'));
            red.appendChild(document.createTextNode(' Canjeado'));
            red.addEventListener('click', function () {
                red.disabled = true;
                db().ref('mc/store/codes/' + c.id).update({
                    status: 'redeemed', redeemedAt: Date.now()
                }).then(function () {
                    toast('Código marcado como canjeado', 'ok');
                    recalcStock(c.itemId);
                }).catch(function (e) {
                    toast((e && e.message) || 'No se pudo marcar el código.', 'error');
                    red.disabled = false;
                });
            });
            row.appendChild(red);
        }

        const de = el('button', 'mcsa-btn danger');
        de.type = 'button';
        de.textContent = 'Borrar';
        armed(de, function () {
            db().ref('mc/store/codes/' + c.id).remove().then(function () {
                toast('Código borrado', 'ok');
                recalcStock(c.itemId);
            }).catch(function (e) {
                toast((e && e.message) || 'No se pudo borrar el código.', 'error');
            });
        });
        row.appendChild(de);
        return row;
    }

    function addCodes(itemId, text, btn, ta) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        if (!itemId) { toast('Elige un artículo.', 'error'); return; }
        const lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim().toUpperCase(); }).filter(Boolean);
        if (!lines.length) { toast('Pega al menos un código.', 'error'); return; }
        const RE_CODE = /^[A-Z0-9-]{4,32}$/;
        const rejected = lines.filter(function (l) { return !RE_CODE.test(l); });
        const valid = lines.filter(function (l) { return RE_CODE.test(l); });
        if (!valid.length) { toast(rejected.length + ' código(s) rechazados: formato válido A-Z 0-9 - (4-32)', 'error'); return; }

        const existing = {};
        Object.keys(state.codes).forEach(function (k) {
            const c = state.codes[k];
            if (c && c.itemId === itemId && c.code) existing[String(c.code)] = true;
        });
        const seen = {};
        const fresh = valid.filter(function (l) {
            if (existing[l] || seen[l]) return false;
            seen[l] = true;
            return true;
        });
        if (!fresh.length) {
            if (rejected.length) toast(rejected.length + ' código(s) rechazados: formato válido A-Z 0-9 - (4-32)', 'error');
            else toast('Esos códigos ya estaban en el inventario.', 'error');
            return;
        }

        const now = Date.now();
        const up = {};
        fresh.forEach(function (code) {
            const key = db().ref('mc/store/codes').push().key;
            up['mc/store/codes/' + key] = {
                code: code, itemId: itemId, status: 'available', createdAt: now
            };
        });
        btn.disabled = true;
        db().ref().update(up).then(function () {
            toast(fresh.length + (fresh.length === 1 ? ' código añadido' : ' códigos añadidos'), 'ok');
            if (rejected.length) toast(rejected.length + ' código(s) rechazados: formato válido A-Z 0-9 (4-32)', 'error');
            ta.value = '';
            btn.disabled = false;
            recalcStock(itemId);
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudieron añadir los códigos.', 'error');
            btn.disabled = false;
        });
    }

    function paintOrders(box) {
        box.appendChild(el('h3', 'mcsa-h3', 'Pedidos'));
        const list = el('div', 'mcsa-list');
        box.appendChild(list);
        repaint = function () { paintOrdersList(list); };
        paintOrdersList(list);
    }

    function paintOrdersList(list) {
        list.textContent = '';
        const ids = Object.keys(state.orders).sort(function (a, b) {
            return (Number(state.orders[b].createdAt) || 0) - (Number(state.orders[a].createdAt) || 0);
        });
        if (!ids.length) {
            list.appendChild(el('p', 'mcsa-hint', 'Todavía no hay pedidos.'));
            return;
        }
        ids.forEach(function (id) { list.appendChild(orderRow(id, state.orders[id])); });
    }

    function orderRow(orderId, o) {
        const row = el('div', 'mcsa-row');
        const gro = el('div', 'mcsa-gro');
        gro.appendChild(el('strong', null, (o.buyerName || 'Miembro') + ' · ' + (o.itemName || 'Artículo')));
        const codeTxt = o.code ? ' · código ' + o.code : '';
        gro.appendChild(el('small', null, money(o.price, o.currency) + ' · ' + fmtDate(o.createdAt) + codeTxt));
        row.appendChild(gro);

        const st = STATUS[o.status] || STATUS.pending;
        row.appendChild(el('span', 'mcsa-st ' + st[1], st[0]));

        if (o.status === 'pending') {
            const pay = el('button', 'mcsa-btn pri');
            pay.type = 'button';
            pay.appendChild(fa('fa-money-bill-wave'));
            pay.appendChild(document.createTextNode(' Marcar pagado'));
            pay.addEventListener('click', function () { markPaid(orderId, pay); });
            row.appendChild(pay);

            const cancel = el('button', 'mcsa-btn danger');
            cancel.type = 'button';
            cancel.textContent = 'Cancelar';
            armed(cancel, function () { setOrderStatus(orderId, 'cancelled', cancel); });
            row.appendChild(cancel);
        } else if (o.status === 'paid') {
            const bridge = el('button', 'mcsa-btn pri');
            bridge.type = 'button';
            bridge.appendChild(fa('fa-server'));
            bridge.appendChild(document.createTextNode(' Cargar al server'));
            bridge.addEventListener('click', function () { openBridgeModal(orderId); });
            row.appendChild(bridge);

            const red = el('button', 'mcsa-btn');
            red.type = 'button';
            red.appendChild(fa('fa-check'));
            red.appendChild(document.createTextNode(' Marcar canjeado'));
            red.addEventListener('click', function () { setOrderStatus(orderId, 'redeemed', red); });
            row.appendChild(red);
        } else if (o.status === 'delivered') {
            const red = el('button', 'mcsa-btn');
            red.type = 'button';
            red.appendChild(fa('fa-check'));
            red.appendChild(document.createTextNode(' Marcar canjeado'));
            red.addEventListener('click', function () { setOrderStatus(orderId, 'redeemed', red); });
            row.appendChild(red);
        }
        return row;
    }

    function pluginTarget(itemId) {
        const it = state.items[itemId] || {};
        const tipo = String(it.tipo || '').trim().toUpperCase() === 'RUBBIES' ? 'RUBBIES' : 'BOTELLAS';
        const n = Math.floor(Number(it.cantidad));
        return { tipo: tipo, cantidad: (isFinite(n) && n >= 1 && n <= 1000000) ? n : 1 };
    }

    function openBridgeModal(orderId) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const o = state.orders[orderId];
        if (!o) return;
        const tgt = pluginTarget(o.itemId);
        const code = String(o.code || '');
        openModal(function (panel) {
            const x = el('button', 'mcsa-x');
            x.type = 'button';
            x.appendChild(fa('fa-xmark'));
            x.addEventListener('click', closeModal);
            panel.appendChild(x);
            panel.appendChild(el('h3', null, 'Cargar código al server'));

            const form = el('div', 'mcsa-form');
            form.appendChild(el('p', 'mcsa-hint', 'CÓDIGO: ' + (code || '—') + ' · ENTREGA: ' + tgt.tipo + ' x' + tgt.cantidad + ' · COMPRADOR: ' + (o.buyerName || 'Miembro')));

            const token = document.createElement('input');
            token.type = 'password';
            token.autocomplete = 'off';
            token.placeholder = 'Bearer token del plugin';
            try { token.value = window.localStorage.getItem('stevsxp_api_token') || ''; } catch (e) {}
            form.appendChild(field('TOKEN DEL PLUGIN (solo en este navegador)', token));

            const cmd = el('pre', 'mcsa-input mcsa-mono');
            const yml = el('pre', 'mcsa-input mcsa-mono');
            const paint = function () {
                const tk = String(token.value || '').trim() || '<TU_TOKEN>';
                cmd.textContent = 'curl -s -X POST -H "Authorization: Bearer ' + tk + '" --data "codigo=' + code +
                    '&tipo=' + tgt.tipo + '&cantidad=' + tgt.cantidad + '" http://localhost:8080/codigo';
                yml.textContent = 'codigos:\n  "' + code + '":\n    tipo: ' + tgt.tipo + '\n    cantidad: ' + tgt.cantidad;
            };
            token.addEventListener('input', function () {
                try { window.localStorage.setItem('stevsxp_api_token', String(token.value || '')); } catch (e) {}
                paint();
            });
            paint();

            form.appendChild(cmd);
            form.appendChild(el('p', 'mcsa-hint', 'Ejecuta el comando EN LA MÁQUINA DEL SERVER DE MINECRAFT (el plugin responde OK, YA_EXISTE o MAL_PEDIDO). Si prefieres, pega esto en plugins/StevsXP/codes.yml y reinicia:'));
            form.appendChild(yml);

            const done = el('button', 'mcsa-btn pri');
            done.type = 'button';
            done.appendChild(fa('fa-check'));
            done.appendChild(document.createTextNode(' Cargado en el server ✓'));
            done.addEventListener('click', function () { markDelivered(orderId, done); });
            form.appendChild(done);

            const cancel = el('button', 'mcsa-btn');
            cancel.type = 'button';
            cancel.textContent = 'Cancelar';
            cancel.addEventListener('click', closeModal);
            form.appendChild(cancel);
            panel.appendChild(form);
        });
    }

    function markDelivered(orderId, btn) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const o = state.orders[orderId];
        if (!o) return;
        const now = Date.now();
        const up = {};
        up['mc/store/orders/' + orderId + '/status'] = 'delivered';
        up['mc/store/orders/' + orderId + '/deliveredAt'] = now;
        up['mc/store/orders/' + orderId + '/deliveredBy'] = uid();
        up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/status'] = 'delivered';
        up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/deliveredAt'] = now;
        up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/deliveredBy'] = uid();
        if (o.codeId) up['mc/store/codes/' + o.codeId + '/status'] = 'delivered';

        btn.disabled = true;
        db().ref().update(up).then(function () {
            closeModal();
            toast('Código cargado. El jugador ya puede canjearlo', 'ok');
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudo marcar el pedido como entregado.', 'error');
            btn.disabled = false;
        });
    }

    function markPaid(orderId, btn) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const o = state.orders[orderId];
        if (!o || o.status !== 'pending') return;
        btn.disabled = true;

        db().ref('mc/store/codes').once('value').then(function (s) {
            const all = s.val() || {};
            const avail = Object.keys(all).filter(function (k) {
                const c = all[k];
                return c && c.itemId === o.itemId && c.status === 'available';
            }).map(function (k) {
                return { id: k, code: all[k].code, createdAt: Number(all[k].createdAt) || 0 };
            }).sort(function (a, b) { return a.createdAt - b.createdAt; });

            if (!avail.length) {
                toast('No hay códigos disponibles para este item. Añade códigos primero.', 'error');
                btn.disabled = false;
                return;
            }

            const pick = avail[0];
            const now = Date.now();
            const up = {};
            up['mc/store/codes/' + pick.id] = {
                code: pick.code, itemId: o.itemId, status: 'sold',
                order: orderId, assignedTo: o.buyerUid || '', assignedName: o.buyerName || '',
                createdAt: Number(all[pick.id].createdAt) || now, soldAt: now
            };
            up['mc/store/orders/' + orderId + '/status'] = 'paid';
            up['mc/store/orders/' + orderId + '/code'] = pick.code;
            up['mc/store/orders/' + orderId + '/codeId'] = pick.id;
            up['mc/store/orders/' + orderId + '/paidAt'] = now;
            up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/status'] = 'paid';
            up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/code'] = pick.code;
            up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/codeId'] = pick.id;
            up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/paidAt'] = now;

            return db().ref().update(up).then(function () {
                toast('Pedido pagado y código asignado', 'ok');
                recalcStock(o.itemId);
            });
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudo marcar el pedido como pagado.', 'error');
            btn.disabled = false;
        });
    }

    function setOrderStatus(orderId, status, btn) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const o = state.orders[orderId];
        if (!o) return;
        if (status === 'redeemed' && o.status !== 'paid' && o.status !== 'delivered') return;
        if (status === 'cancelled' && o.status !== 'pending') return;

        const now = Date.now();
        const up = {};
        up['mc/store/orders/' + orderId + '/status'] = status;
        up['mc/store/myOrders/' + o.buyerUid + '/' + orderId + '/status'] = status;
        if (status === 'redeemed' && o.codeId) {
            up['mc/store/codes/' + o.codeId + '/status'] = 'redeemed';
            up['mc/store/codes/' + o.codeId + '/redeemedAt'] = now;
        }

        btn.disabled = true;
        db().ref().update(up).then(function () {
            toast(status === 'redeemed' ? 'Pedido marcado como canjeado' : 'Pedido cancelado', 'ok');
            if (status === 'redeemed') recalcStock(o.itemId);
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudo actualizar el pedido.', 'error');
            btn.disabled = false;
        });
    }

    function paintSettings(box) {
        box.appendChild(el('h3', 'mcsa-h3', 'Ajustes'));
        box.appendChild(el('p', 'mcsa-hint', 'Instrucciones de pago que ve el usuario en el checkout (markdown permitido).'));

        const ta = el('textarea', 'mcsa-input mcsa-mono');
        ta.rows = 8;
        ta.maxLength = 5000;
        ta.value = String((state.settings && state.settings.info) || '');
        box.appendChild(ta);

        const save = el('button', 'mcsa-btn pri');
        save.type = 'button';
        save.appendChild(fa('fa-floppy-disk'));
        save.appendChild(document.createTextNode(' Guardar'));
        save.addEventListener('click', function () {
            if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
            const info = String(ta.value || '');
            if (info.length > 5000) { toast('Las instrucciones no pueden pasar de 5000 caracteres.', 'error'); return; }
            save.disabled = true;
            db().ref('mc/store/settings').update({ info: info, updatedAt: Date.now() }).then(function () {
                toast('Ajustes guardados', 'ok');
                save.disabled = false;
            }).catch(function (e) {
                toast((e && e.message) || 'No se pudieron guardar los ajustes.', 'error');
                save.disabled = false;
            });
        });
        box.appendChild(save);

        repaint = function () {
            if (document.activeElement === ta) return;
            ta.value = String((state.settings && state.settings.info) || '');
        };
    }

    console.log('[Stevscon] mc_store_manage.js listo (v3) — artículos, códigos, pedidos y ajustes.');
})(window, document);
