/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_payments_manage.js (v1)
 * PAGOS (STAFF): editar los paneles de pago desde la pestaña Tienda.
 *  - mount() se pinta dentro del panel de admin (sub-pestaña Pagos de
 *    MC.storeManage). Reutiliza sus estilos .mcsa-*.
 *  - Escucha en vivo mc/payments/panels y mc/payments/settings; detach
 *    al re-montar. Toda escritura exige staffView() y además la firman
 *    las reglas de Firebase (mc/payments solo staff).
 *  - SIN método de pago: los paneles son informativos.
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const db = function () { return firebase.database(); };
    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

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

    const state = { settings: {}, panels: {}, refs: [] };
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

    function sortedPanels() {
        return Object.keys(state.panels).map(function (id) {
            return Object.assign({ id: id }, state.panels[id]);
        }).sort(function (a, b) {
            return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.title || '').localeCompare(String(b.title || ''));
        });
    }

    MC.paymentsManage = {
        mount: function (container) {
            if (!container) return;
            detach();
            repaint = null;
            container.textContent = '';
            if (!staffView()) {
                container.appendChild(el('p', 'mcsa-denied', 'Zona solo para staff.'));
                return;
            }

            container.appendChild(el('h3', 'mcsa-h3', 'Textos de la página'));

            const hero = document.createElement('input');
            hero.type = 'text';
            hero.maxLength = 120;
            hero.placeholder = 'Subtítulo corto de la página de Pagos';
            hero.value = String((state.settings && state.settings.hero) || '');

            const intro = document.createElement('textarea');
            intro.className = 'mcsa-input';
            intro.rows = 4;
            intro.maxLength = 2000;
            intro.placeholder = 'Texto breve de introducción (markdown permitido)...';
            intro.value = String((state.settings && state.settings.intro) || '');

            const form = el('div', 'mcsa-form');
            form.appendChild(field('HERO', hero));
            form.appendChild(field('INTRO', intro));

            const save = el('button', 'mcsa-btn pri');
            save.type = 'button';
            save.appendChild(fa('fa-floppy-disk'));
            save.appendChild(document.createTextNode(' Guardar textos'));
            save.addEventListener('click', function () {
                if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
                const heroVal = String(hero.value || '').trim();
                const introVal = String(intro.value || '');
                if (heroVal.length > 120) { toast('El subtítulo no puede pasar de 120 caracteres.', 'error'); return; }
                if (introVal.length > 2000) { toast('La introducción no puede pasar de 2000 caracteres.', 'error'); return; }
                save.disabled = true;
                db().ref('mc/payments/settings').update({
                    hero: heroVal, intro: introVal, updatedAt: Date.now(), by: uid()
                }).then(function () {
                    toast('Textos de Pagos guardados', 'ok');
                    save.disabled = false;
                }).catch(function (e) {
                    toast((e && e.message) || 'No se pudieron guardar los textos de Pagos.', 'error');
                    save.disabled = false;
                });
            });
            form.appendChild(save);
            container.appendChild(form);

            const head = el('div', 'mcsa-head');
            head.appendChild(el('h3', 'mcsa-h3', 'Paneles de pago'));
            const add = el('button', 'mcsa-btn pri');
            add.type = 'button';
            add.appendChild(fa('fa-plus'));
            add.appendChild(document.createTextNode(' Nuevo panel'));
            add.addEventListener('click', function () { openPanelModal(null); });
            head.appendChild(add);
            container.appendChild(head);

            const list = el('div', 'mcsa-list');
            container.appendChild(list);
            repaint = function () { paintPanelList(list); };
            paintPanelList(list);

            listen('mc/payments/settings', function (v) { state.settings = v || {}; fire(); });
            listen('mc/payments/panels', function (v) { state.panels = v || {}; fire(); });
        }
    };

    function paintPanelList(list) {
        list.textContent = '';
        const panels = sortedPanels();
        if (!panels.length) {
            list.appendChild(el('p', 'mcsa-hint', 'Todavía no hay paneles de pago. Crea el primero con "Nuevo panel".'));
            return;
        }
        panels.forEach(function (p) {
            const row = el('div', 'mcsa-row');
            const gro = el('div', 'mcsa-gro');
            const t = el('strong', null, p.title || 'Panel');
            if (!p.active) t.appendChild(el('span', 'mcsa-st mcsa-st-cancelled', 'OCULTO'));
            gro.appendChild(t);
            gro.appendChild(el('small', null, 'orden ' + (Number(p.order) || 0) + ' · ' + fmtDate(p.createdAt)));
            row.appendChild(gro);

            const ed = el('button', 'mcsa-btn');
            ed.type = 'button';
            ed.appendChild(fa('fa-pen-to-square'));
            ed.appendChild(document.createTextNode(' Editar'));
            ed.addEventListener('click', function () { openPanelModal(p.id); });
            row.appendChild(ed);

            const de = el('button', 'mcsa-btn danger');
            de.type = 'button';
            de.textContent = 'Borrar';
            armed(de, function () {
                db().ref('mc/payments/panels/' + p.id).remove().then(function () {
                    toast('Panel borrado', 'ok');
                }).catch(function (e) {
                    toast((e && e.message) || 'No se pudo borrar el panel.', 'error');
                });
            });
            row.appendChild(de);

            list.appendChild(row);
        });
    }

    function openPanelModal(id) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const p = id ? (state.panels[id] || {}) : {};
        openModal(function (panel) {
            const x = el('button', 'mcsa-x');
            x.type = 'button';
            x.appendChild(fa('fa-xmark'));
            x.addEventListener('click', closeModal);
            panel.appendChild(x);
            panel.appendChild(el('h3', null, id ? 'Editar panel' : 'Nuevo panel'));

            const icon = document.createElement('input');
            icon.type = 'text';
            icon.maxLength = 4;
            icon.placeholder = '💳';
            icon.value = p.icon || '';

            const title = document.createElement('input');
            title.type = 'text';
            title.maxLength = 80;
            title.placeholder = 'Título del panel';
            title.value = p.title || '';

            const body = document.createElement('textarea');
            body.maxLength = 5000;
            body.placeholder = 'Contenido del panel (markdown permitido)...';
            body.value = p.body || '';

            const active = document.createElement('input');
            active.type = 'checkbox';
            active.checked = p.active !== false;
            active.style.cssText = 'width:auto;margin-right:8px;transform:scale(1.3)';

            const order = document.createElement('input');
            order.type = 'number';
            order.value = p.order != null ? String(p.order) : '0';

            const imgPrev = document.createElement('img');
            imgPrev.className = 'mcsa-prev';
            imgPrev.alt = '';
            let imgVal = String(p.img || '');
            const paintPrev = function () {
                const src = safeUrl(imgVal);
                if (src) { imgPrev.src = src; imgPrev.style.display = 'block'; }
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
            form.appendChild(field('ICONO', icon));
            form.appendChild(field('TÍTULO', title));
            form.appendChild(field('CONTENIDO', body));
            form.appendChild(field('IMAGEN (HASTA 20MB, SE OPTIMIZA SOLA)', imgFile));
            form.appendChild(imgPrev);
            form.appendChild(imgClear);
            const r1 = el('div', 'mcsa-2');
            r1.appendChild(field('ORDEN', order));
            const actW = el('div');
            actW.appendChild(el('label', null, 'VISIBLE EN PAGOS'));
            const actRow = el('div');
            actRow.style.cssText = 'font:600 13px Inter,sans-serif;padding-top:8px';
            actRow.appendChild(active);
            actRow.appendChild(document.createTextNode(' Activo'));
            actW.appendChild(actRow);
            r1.appendChild(actW);
            form.appendChild(r1);

            const save = el('button', 'mcsa-btn pri');
            save.type = 'button';
            save.appendChild(fa('fa-floppy-disk'));
            save.appendChild(document.createTextNode(id ? ' Guardar cambios' : ' Crear panel'));
            save.addEventListener('click', function () {
                savePanel(id, {
                    icon: icon.value, title: title.value, body: body.value, img: imgVal,
                    active: active.checked, order: order.value
                }, save);
            });
            form.appendChild(save);
            panel.appendChild(form);
            paintPrev();
        });
    }

    function savePanel(id, data, btn) {
        if (!staffView()) { toast('Zona solo para staff.', 'error'); return; }
        const title = String(data.title || '').trim();
        if (!title) return toast('El panel necesita título.', 'error');
        if (title.length > 80) return toast('El título no puede pasar de 80 caracteres.', 'error');
        const body = String(data.body || '');
        if (!body.trim()) return toast('El panel necesita contenido.', 'error');
        if (body.length > 5000) return toast('El contenido no puede pasar de 5000 caracteres.', 'error');
        const icon = String(data.icon || '').trim();
        if (icon.length > 4) return toast('El icono no puede pasar de 4 caracteres.', 'error');
        const img = String(data.img || '');
        if (img.length > 9000000) return toast('La imagen pasa de 9MB incluso optimizada. Prueba con otra.', 'error');
        const order = Number(data.order);
        if (!isFinite(order) || order < 0 || order > 9999) return toast('El orden debe estar entre 0 y 9999.', 'error');

        const now = Date.now();
        const prev = id ? (state.panels[id] || {}) : {};
        const rec = {
            icon: icon,
            title: title,
            body: body,
            img: img,
            active: !!data.active,
            order: order,
            createdAt: Number(prev.createdAt) || now,
            updatedAt: now,
            by: uid()
        };
        btn.disabled = true;
        const ref = id ? db().ref('mc/payments/panels/' + id) : db().ref('mc/payments/panels').push();
        ref.set(rec).then(function () {
            toast(id ? 'Panel actualizado' : 'Panel creado', 'ok');
            closeModal();
        }).catch(function (e) {
            toast((e && e.message) || 'No se pudo guardar el panel.', 'error');
            btn.disabled = false;
        });
    }

    console.log('[Stevscon] mc_payments_manage.js listo (v1) — editor de paneles de pago.');
})(window, document);
