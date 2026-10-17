/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_manage.js (v1)
 * MANAGE: PANEL DE STAFF (invisible para usuarios normales).
 * - FAB de edición (aparece solo si la sesión es staff/owner).
 * - Pestañas: Artículos (editar/destacar/publicar/borrar),
 *   Nueva página (con PLANTILLAS: Proyecto, Devlog, Easter egg,
 *   Guía, Libre) y Categorías (crear con icono/color, borrar).
 * * - Editor con subida de portada (hasta 20MB, se optimiza sola)..
 * TODO con textContent; innerHTML solo para esqueletos estáticos.
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const toast = function (m, k) { if (window.StevsconWiki && window.StevsconWiki.toast) window.StevsconWiki.toast(m, k); };
    const esc = function (s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const TEMPLATES = {
        libre: { label: 'Página libre', icon: '📖', title: '', body: '## Introducción\n\nEscribe aquí…' },
        proyecto: {
            label: 'Proyecto terminado', icon: '🚀',
            title: '', body: '## 🚀 Proyecto terminado\n\n**¿Qué es?**\n\nCuéntalo aquí.\n\n## Características\n\n- Primera característica\n- Segunda característica\n\n## ¿Cómo se usa?\n\nExplica lo básico.\n\n---\n\n*Publicado por el staff de Stevscon.*'
        },
        devlog: {
            label: 'Devlog', icon: '🛠',
            title: '', body: '## 🛠 Devlog\n\n**Fecha:**\n\n### En esta versión\n\n- Mejora 1\n- Arreglo 2\n\n### Lo siguiente\n\n- Plan 1\n- Plan 2\n\n> Comenta qué te parece en el Discord oficial.'
        },
        easter: {
            label: 'Easter egg', icon: '🥚',
            title: '', body: '## 🥚 Easter egg\n\n**Dónde se esconde:**\n\n**Cómo se encuentra:**\n\n**Recompensa o secreto:**\n\n> ¡Que no se te escape contarlo!'
        },
        guia: {
            label: 'Guía', icon: '🗺',
            title: '', body: '## 🗺 Guía\n\n### Paso 1\n\nExplica el primer paso.\n\n### Paso 2\n\nSigue construyendo.\n\n### Consejos\n\n- Consejo útil\n- Otro consejo'
        }
    };
    const TYPES = [
        ['libre', 'Página'], ['proyecto', 'Proyecto'], ['devlog', 'Devlog'],
        ['easter', 'Easter egg'], ['guia', 'Guía']
    ];

    /* ================= CSS DEL PANEL ================= */
    const CSS = `
    #wk-manage-fab{position:fixed;right:22px;bottom:22px;z-index:1500;width:56px;height:56px;border:0;border-radius:50%;
      background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;cursor:pointer;
      box-shadow:0 10px 30px var(--purple-glow,rgba(139,92,246,.4));font-size:19px;display:none;align-items:center;justify-content:center;
      transition:transform .2s cubic-bezier(.22,1,.36,1)}
    #wk-manage-fab:hover{transform:scale(1.08)}
    #wk-manage-fab.show{display:flex}
    .wk-ovl{position:fixed;inset:0;z-index:2000;background:rgba(6,4,11,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,sans-serif}
    .wk-panel{width:min(860px,96vw);max-height:92vh;overflow:auto;background:var(--bg-card,#16121f);border:1px solid var(--border-color,#2e2440);border-radius:18px;padding:20px 22px;color:var(--text-main,#f8fafc)}
    .wk-panel h2{margin:0 0 4px;font-size:19px;letter-spacing:-.01em}
    .wk-panel .wk-sub{margin:0 0 14px;color:var(--text-muted,#94a3b8);font-size:12.5px;font-weight:600}
    .wk-tabs{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}
    .wk-tab{border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:var(--text-muted,#94a3b8);
      border-radius:999px;padding:8px 16px;font:700 12.5px Inter,sans-serif;cursor:pointer}
    .wk-tab.is-on{background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));color:#fff;border-color:transparent}
    .wk-row{display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid var(--border-color,#2e2440);flex-wrap:wrap}
    .wk-row .wk-gro{flex:1;min-width:180px}
    .wk-row strong{display:block;font-size:14px}
    .wk-row small{color:var(--text-muted,#94a3b8);font-size:11.5px;font-weight:600}
    .wk-pill{display:inline-block;padding:2px 9px;border-radius:999px;font:800 9.5px Inter,sans-serif;letter-spacing:.1em;margin-left:8px;vertical-align:2px}
    .wk-pill.draft{background:rgba(245,158,11,.14);color:#f59e0b;border:1px solid rgba(245,158,11,.5)}
    .wk-pill.feat{background:rgba(139,92,246,.16);color:#a78bfa;border:1px solid rgba(139,92,246,.5)}
    .wk-btn{border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);
      border-radius:10px;padding:7px 12px;font:700 12px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
    .wk-btn:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6)}
    .wk-btn.pri{background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));border-color:transparent;color:#fff}
    .wk-btn.danger{border-color:rgba(239,68,68,.5);color:#f87171}
    .wk-btn.danger:hover{background:rgba(239,68,68,.12);color:#f87171}
    .wk-btn.danger.arm{background:#ef4444;color:#fff;border-color:#ef4444}
    .wk-form{display:grid;gap:12px}
    .wk-form label{display:block;font:800 10px Inter,sans-serif;letter-spacing:.12em;color:var(--text-muted,#94a3b8);margin:0 0 5px}
    .wk-form input[type=text],.wk-form input[type=number],.wk-form select,.wk-form textarea{
      width:100%;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;
      color:var(--text-main,#f8fafc);padding:10px 12px;font:600 13px Inter,sans-serif;outline:0;box-sizing:border-box}
    .wk-form input:focus,.wk-form select:focus,.wk-form textarea:focus{border-color:var(--purple-accent,#8b5cf6)}
    .wk-form textarea{min-height:130px;resize:vertical}
    .wk-form textarea.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;min-height:300px;line-height:1.6}
    .wk-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .wk-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .wk-cover-prev{max-height:150px;border-radius:12px;border:1px solid var(--border-color,#2e2440);display:block}
    .wk-hint{color:var(--text-muted,#94a3b8);font-size:11px;font-weight:600;margin-top:4px}
    .wk-close{position:sticky;top:0;float:right;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);
      color:var(--text-muted,#94a3b8);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:14px}
    .wk-close:hover{color:#f87171;border-color:rgba(239,68,68,.5)}
    @media(max-width:640px){.wk-2,.wk-3{grid-template-columns:1fr}}
    `;
    function injectStyles() {
        if (document.getElementById('wk-manage-style')) return;
        const st = document.createElement('style');
        st.id = 'wk-manage-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ================= HELPERS UI ================= */
    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function icon(name) { const i = document.createElement('i'); i.className = 'fa-solid ' + name; return i; }
    function field(labelTxt, input) {
        const w = el('div');
        w.appendChild(el('label', null, labelTxt));
        w.appendChild(input);
        return w;
    }
    function sel(opts, val) {
        const s = document.createElement('select');
        opts.forEach(function (o) {
            const op = el('option', null, o[1]);
            op.value = o[0];
            s.appendChild(op);
        });
        if (val) s.value = val;
        return s;
    }
    function closeOvl(ovl) { if (ovl && ovl.parentNode) ovl.parentNode.removeChild(ovl); }
    function armed(btn, fn) { /* botón de peligro en 2 pasos */
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

    /* ================= WIKI MANAGE ================= */
    WK.manage = {
        tab: 'arts',

        init: function () {
            injectStyles();
            const self = this;

            const fab = el('button');
            fab.type = 'button';
            fab.id = 'wk-manage-fab';
            fab.title = 'Panel de la Wiki (staff)';
            fab.setAttribute('aria-label', 'Panel de la Wiki');
            fab.appendChild(icon('fa-pen-to-square'));
            fab.addEventListener('click', function () { self.openPanel(); });
            document.body.appendChild(fab);

            document.addEventListener('sc:wiki-auth', function () {
                const staff = WK.system && WK.system.session && WK.system.session.isStaff;
                fab.classList.toggle('show', !!staff);
            });
        },

        /* ---------- PANEL PRINCIPAL ---------- */
        openPanel: function () {
            const self = this;
            if (document.getElementById('wk-panel-ovl')) return;
            const ovl = el('div', 'wk-ovl');
            ovl.id = 'wk-panel-ovl';

            const panel = el('div', 'wk-panel');
            panel.id = 'wk-panel';

            const close = el('button', 'wk-close');
            close.type = 'button';
            close.appendChild(icon('fa-xmark'));
            close.addEventListener('click', function () { closeOvl(ovl); });
            panel.appendChild(close);

            panel.appendChild(el('h2', null, 'Panel de la Wiki'));
            panel.appendChild(el('p', 'wk-sub', 'Crea categorías, escribe páginas y destaca lo más importante. Todo queda guardado con historial.'));

            const tabs = el('div', 'wk-tabs');
            const defs = [['arts', 'Artículos', 'fa-file-lines'], ['new', 'Nueva página', 'fa-plus'], ['cats', 'Categorías', 'fa-folder-tree']];
            const tabBtns = {};
            defs.forEach(function (d) {
                const b = el('button', 'wk-tab');
                b.type = 'button';
                b.appendChild(icon(d[2]));
                b.appendChild(document.createTextNode(' ' + d[1]));
                b.addEventListener('click', function () {
                    self.tab = d[0];
                    Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('is-on', k === d[0]); });
                    body.textContent = '';
                    if (d[0] === 'arts') self.renderArts(body);
                    else if (d[0] === 'new') self.openEditor(null, body);
                    else self.renderCats(body);
                });
                tabBtns[d[0]] = b;
                tabs.appendChild(b);
            });
            panel.appendChild(tabs);

            const body = el('div');
            panel.appendChild(body);
            ovl.appendChild(panel);
            ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
            document.body.appendChild(ovl);

            tabBtns[this.tab].classList.add('is-on');
            if (this.tab === 'new') this.openEditor(null, body);
            else if (this.tab === 'cats') this.renderCats(body);
            else this.renderArts(body);
        },

        /* ---------- TAB: ARTÍCULOS ---------- */
        renderArts: function (box) {
            const self = this;
            box.textContent = '';
            const arts = WK.core.arts || {};
            const ids = Object.keys(arts).sort(function (a, b) {
                return (arts[b].updatedAt || 0) - (arts[a].updatedAt || 0);
            });

            if (!ids.length) {
                box.appendChild(el('p', 'wk-sub', 'Todavía no hay páginas. Crea la primera en la pestaña "Nueva página".'));
                return;
            }

            ids.forEach(function (id) {
                const a = arts[id];
                const row = el('div', 'wk-row');

                const gro = el('div', 'wk-gro');
                const t = el('strong');
                t.textContent = a.title || 'Sin título';
                if (a.status === 'draft') t.appendChild(el('span', 'wk-pill draft', 'BORRADOR'));
                if (a.featured) t.appendChild(el('span', 'wk-pill feat', 'DESTACADA'));
                row.appendChild(gro);
                gro.appendChild(t);

                const cat = WK.core.catById(a.category);
                gro.appendChild(el('small', null, (cat ? cat.name : 'General') + ' · 👁 ' + Number(a.views || 0).toLocaleString('es')));

                const bEd = el('button', 'wk-btn');
                bEd.type = 'button';
                bEd.appendChild(icon('fa-pen-to-square'));
                bEd.appendChild(document.createTextNode(' Editar'));
                bEd.addEventListener('click', function () {
                    closeOvl(document.getElementById('wk-panel-ovl'));
                    self.openEditor(id);
                });
                row.appendChild(bEd);

                const bFe = el('button', 'wk-btn');
                bFe.type = 'button';
                bFe.appendChild(icon(a.featured ? 'fa-star' : 'fa-regular fa-star'));
                bFe.appendChild(document.createTextNode(a.featured ? ' Quitar' : ' Destacar'));
                bFe.addEventListener('click', function () {
                    WK.system.setFeatured(id, !a.featured)
                        .then(function () { toast(a.featured ? 'Quitada de destacados' : '¡Destacada en la portada!', 'ok'); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bFe);

                const bSt = el('button', 'wk-btn');
                bSt.type = 'button';
                const isDraft = a.status === 'draft';
                bSt.appendChild(icon(isDraft ? 'fa-upload' : 'fa-box-archive'));
                bSt.appendChild(document.createTextNode(isDraft ? ' Publicar' : ' A borrador'));
                bSt.addEventListener('click', function () {
                    WK.system.setStatus(id, isDraft ? 'published' : 'draft')
                        .then(function () { toast(isDraft ? 'Página publicada' : 'Página en borrador', 'ok'); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bSt);

                const bDe = el('button', 'wk-btn danger');
                bDe.type = 'button';
                bDe.textContent = 'Borrar';
                armed(bDe, function () {
                    WK.system.deleteArticle(id)
                        .then(function () { toast('Página borrada', 'ok'); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bDe);

                box.appendChild(row);
            });
        },

        /* ---------- TAB: CATEGORÍAS ---------- */
        renderCats: function (box) {
            const self = this;
            box.textContent = '';

            const form = el('div', 'wk-form');
            const name = document.createElement('input');
            name.type = 'text';
            name.placeholder = 'Ej: Proyectos, Devlogs, Secretos…';
            name.maxLength = 32;
            const ico = document.createElement('input');
            ico.type = 'text';
            ico.placeholder = '📁 (emoji)';
            ico.maxLength = 4;
            const color = document.createElement('input');
            color.type = 'color';
            color.value = '#8b5cf6';
            color.style.cssText = 'width:100%;height:42px;background:none;border:1px solid var(--border-color,#2e2440);border-radius:10px;cursor:pointer';

            const r = el('div', 'wk-3');
            r.appendChild(field('NOMBRE', name));
            r.appendChild(field('ICONO', ico));
            r.appendChild(field('COLOR', color));
            form.appendChild(r);

            const bAdd = el('button', 'wk-btn pri');
            bAdd.type = 'button';
            bAdd.appendChild(icon('fa-plus'));
            bAdd.appendChild(document.createTextNode(' Crear categoría'));
            bAdd.addEventListener('click', function () {
                WK.system.createCategory(name.value, ico.value, color.value)
                    .then(function () {
                        toast('Categoría creada', 'ok');
                        name.value = ''; ico.value = '';
                        self.renderCats(box);
                    })
                    .catch(function (e) { toast(e.message, 'error'); });
            });
            form.appendChild(bAdd);
            box.appendChild(form);

            box.appendChild(el('h2', null, 'Categorías existentes'));
            const cats = WK.core.sortedCats();
            if (!cats.length) {
                box.appendChild(el('p', 'wk-sub', 'Aún no hay categorías.'));
                return;
            }
            cats.forEach(function (c) {
                const row = el('div', 'wk-row');
                const gro = el('div', 'wk-gro');
                const t = el('strong', null, (c.icon || '📁') + ' ' + c.name);
                gro.appendChild(t);
                gro.appendChild(el('small', null, '/' + c.slug + ' · ' + WK.core.byCategory(c.id).length + ' páginas'));
                row.appendChild(gro);

                const bDe = el('button', 'wk-btn danger');
                bDe.type = 'button';
                bDe.textContent = 'Borrar';
                armed(bDe, function () {
                    WK.system.deleteCategory(c.id)
                        .then(function () { toast('Categoría borrada', 'ok'); self.renderCats(box); })
                        .catch(function (e) { toast(e.message, 'error'); });
                });
                row.appendChild(bDe);
                box.appendChild(row);
            });
        },

        /* ---------- EDITOR (nueva o existente) ---------- */
        openEditor: function (id, mount) {
            const self = this;
            let ovl = null;
            if (!mount) {
                ovl = el('div', 'wk-ovl');
                ovl.id = 'wk-editor-ovl';
                const panel = el('div', 'wk-panel');
                ovl.appendChild(panel);
                ovl.addEventListener('click', function (e) { if (e.target === ovl) closeOvl(ovl); });
                document.body.appendChild(ovl);
                mount = panel;
            }
            mount.textContent = '';
            mount.appendChild(el('h2', null, id ? 'Editar página' : 'Nueva página'));
            mount.appendChild(el('p', 'wk-sub', 'Se guarda con historial: cada edición queda registrada como en las wikis de verdad.'));

            if (ovl) {
                const close = el('button', 'wk-close');
                close.type = 'button';
                close.appendChild(icon('fa-xmark'));
                close.addEventListener('click', function () { closeOvl(ovl); });
                mount.appendChild(close);
            }

            const a = id ? (WK.core.arts[id] || {}) : null;

            /* Plantilla (solo para páginas nuevas) */
            const tpl = sel([['—', 'Elegir plantilla…']].concat(Object.keys(TEMPLATES).map(function (k) {
                return [k, TEMPLATES[k].icon + ' ' + TEMPLATES[k].label];
            })));
            const tplW = field('PLANTILLA (SOLO NUEVAS)', tpl);

            const title = document.createElement('input');
            title.type = 'text';
            title.maxLength = 120;
            title.placeholder = 'Título de la página';
            const catSel = sel([['', 'Elige categoría…']].concat(WK.core.sortedCats().map(function (c) {
                return [c.id, (c.icon || '') + ' ' + c.name];
            })));
            const typeSel = sel(TYPES, 'libre');
            const summary = document.createElement('textarea');
            summary.maxLength = 300;
            summary.placeholder = 'Resumen corto que se ve en las tarjetas (opcional)…';
            summary.style.minHeight = '60px';
            const tags = document.createElement('input');
            tags.type = 'text';
            tags.placeholder = 'separadas, por, comas';
            const cover = document.createElement('input');
            cover.type = 'text';
            cover.placeholder = 'Pega una URL https o sube una imagen…';
            const coverPrev = document.createElement('img');
            coverPrev.className = 'wk-cover-prev';
            coverPrev.style.display = 'none';
            const coverFile = document.createElement('input');
            coverFile.type = 'file';
            coverFile.accept = 'image/*';
            coverFile.style.cssText = 'color:var(--text-muted);font-size:12px';
            const body = document.createElement('textarea');
            body.className = 'mono';
            body.placeholder = 'Escribe con formato: ## títulos, **negrita**, - listas, `código`, [enlaces](https://…) y ![](imagen)…';
            const status = sel([['published', 'Publicado'], ['draft', 'Borrador']]);
            const feat = document.createElement('input');
            feat.type = 'checkbox';
            feat.style.cssText = 'width:auto;margin-right:8px;transform:scale(1.3)';

            const form = el('div', 'wk-form');
            if (!id) form.appendChild(tplW);
            form.appendChild(field('TÍTULO', title));

            const r1 = el('div', 'wk-2');
            r1.appendChild(field('CATEGORÍA', catSel));
            r1.appendChild(field('TIPO', typeSel));
            form.appendChild(r1);

            form.appendChild(field('RESUMEN', summary));
            form.appendChild(field('ETIQUETAS (MÁX 8)', tags));

            form.appendChild(field('PORTADA (URL O IMAGEN SUBIDA, HASTA 20MB)', cover));
            form.appendChild(coverPrev);
            form.appendChild(coverFile);
            form.appendChild(el('p', 'wk-hint', 'Puedes subir imágenes de hasta 20MB: se optimizan solas para que la wiki siga cargando rápido.'));

            form.appendChild(field('CUERPO (MARKDOWN SEGURO)', body));

            const r2 = el('div', 'wk-2');
            r2.appendChild(field('ESTADO', status));
            const featW = el('div');
            featW.appendChild(el('label', null, 'DESTACADA EN PORTADA'));
            const featRow = el('div');
            featRow.appendChild(feat);
            featRow.appendChild(document.createTextNode(' Mostrar en Destacados'));
            featRow.style.cssText = 'font:600 13px Inter,sans-serif;padding-top:8px';
            featW.appendChild(featRow);
            r2.appendChild(featW);
            form.appendChild(r2);

            /* Rellenar si es edición */
            if (a) {
                title.value = a.title || '';
                catSel.value = a.category || '';
                typeSel.value = a.type || 'libre';
                summary.value = a.summary || '';
                tags.value = a.tags || '';
                cover.value = a.cover || '';
                body.value = a.body || '';
                status.value = a.status === 'draft' ? 'draft' : 'published';
                feat.checked = !!a.featured;
                if (a.cover) { coverPrev.src = a.cover; coverPrev.style.display = 'block'; }
            }
            if (!catSel.value && WK.core.sortedCats().length) catSel.value = WK.core.sortedCats()[0].id;

            /* Plantilla -> rellena cuerpo/título nuevos */
            tpl.addEventListener('change', function () {
                const t = TEMPLATES[tpl.value];
                if (!t) return;
                if (!body.value.trim()) body.value = t.body;
                if (!title.value.trim() && t.label !== 'Página libre') title.value = '';
                typeSel.value = tpl.value;
            });

            /* Portada: previsualizar URL pegada */
            cover.addEventListener('change', function () {
                if (safeImg(cover.value)) { coverPrev.src = cover.value; coverPrev.style.display = 'block'; }
                else { coverPrev.style.display = 'none'; }
            });

            /* Subida local -> optimizador (hasta 20MB, canvas 1920px) */
            coverFile.addEventListener('change', function () {
                const f = coverFile.files && coverFile.files[0];
                if (!f) return;
                coverFile.disabled = true;
                const finish = function (dataURI, err) {
                    coverFile.disabled = false;
                    if (err) return toast(err, 'error');
                    cover.value = dataURI;
                    coverPrev.src = dataURI;
                    coverPrev.style.display = 'block';
                    toast('Imagen lista (' + Math.round(dataURI.length / 1024) + 'KB)', 'ok');
                };
                if (WK.system && typeof WK.system.shrinkImage === 'function') {
                    WK.system.shrinkImage(f, { maxDim: 1920, targetStr: 2000000 }, finish);
                } else {
                    shrink(f, finish);
                }
            });

            const bSave = el('button', 'wk-btn pri');
            bSave.type = 'button';
            bSave.appendChild(icon('fa-floppy-disk'));
            bSave.appendChild(document.createTextNode(id ? ' Guardar cambios' : ' Crear página'));
            bSave.addEventListener('click', function () {
                const data = {
                    title: title.value,
                    category: catSel.value,
                    type: typeSel.value,
                    summary: summary.value,
                    tags: tags.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
                    cover: cover.value.trim(),
                    body: body.value,
                    status: status.value,
                    featured: feat.checked
                };
                if (!data.category) return toast('Elige una categoría (crea una en la pestaña Categorías).', 'error');
                bSave.disabled = true;
                WK.system.saveArticle(data, id)
                    .then(function () {
                        toast(id ? 'Cambios guardados' : '¡Página creada!', 'ok');
                        closeOvl(ovl || document.getElementById('wk-panel-ovl'));
                        closeOvl(document.getElementById('wk-editor-ovl'));
                    })
                    .catch(function (e) { toast(e.message, 'error'); bSave.disabled = false; });
            });
            form.appendChild(bSave);
            mount.appendChild(form);
        }
    };

    function safeImg(u) {
        u = String(u || '').trim();
        return /^https:\/\//i.test(u) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(u) ? u : '';
    }

    /* Reescala una imagen a dataURI liviano (máx 900px de ancho) */
    /* Fallback: optimiza una imagen a dataURI liviano (si falta wiki_system v2) */
    function shrink(file, cb) {
        try {
            const fr = new FileReader();
            fr.onload = function () {
                const im = new Image();
                im.onload = function () {
                    const maxW = 1920;
                    const sc = Math.min(1, maxW / im.width);
                    const cv = document.createElement('canvas');
                    cv.width = Math.round(im.width * sc);
                    cv.height = Math.round(im.height * sc);
                    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                    let out = cv.toDataURL('image/jpeg', 0.9);
                    let q = 0.9;
                    while (out.length > 2000000 && q > 0.35) {
                        q -= 0.15;
                        out = cv.toDataURL('image/jpeg', q);
                    }
                    if (out.length > 2000000) return cb(null, 'La imagen es demasiado grande incluso reescalada.');
                    cb(out, null);
                };
                im.onerror = function () { cb(null, 'Ese archivo no parece una imagen válida.'); };
                im.src = String(fr.result);
            };
            fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
            fr.readAsDataURL(file);
        } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
    }

    /* ---- Init ---- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { WK.manage.init(); });
    } else {
        WK.manage.init();
    }

    console.log('[Stevscon] wiki_manage.js listo (v2) — panel de staff (portadas de hasta 20MB optimizadas).');
})(window, document);