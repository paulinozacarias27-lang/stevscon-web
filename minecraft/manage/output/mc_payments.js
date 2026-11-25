/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_payments.js (v1)
 * PAGOS (PÚBLICO): paneles informativos de pago, editados por el staff en Tienda.
 *  - Ruta #pagos. Chip "Pagos" junto a Inicio; vive junto a la Tienda.
 *  - Escucha en vivo mc/payments/panels, mc/payments/settings y
 *    mc/store/settings (instrucciones de pago compartidas con la Tienda);
 *    detach al re-pintar.
 *  - SIN método de pago: solo paneles informativos. Nada de formularios
 *    ni datos de cobro. Las escrituras son solo para el staff (reglas).
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

    const CSS = `
    .mcp-hero{position:relative;overflow:hidden;border-radius:0;padding:34px 26px;margin:0 0 22px;
      background:var(--bg-card,#181c14);border:3px solid #000;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4)}
    .mcp-hero h1{margin:0;font:400 clamp(14px,2.4vw,18px) var(--px-font),monospace;line-height:1.6;letter-spacing:.02em;color:var(--text-main,#eef4e6);text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcp-hero-sub{margin:10px 0 0;color:var(--text-muted,#98a28c);font:600 13.5px var(--ui-font),sans-serif;line-height:1.6}
    .mcp-sec{margin:0 0 26px}
    .mcp-sec h2{margin:0 0 12px;font:400 12px var(--px-font),monospace;line-height:1.6;color:var(--text-main,#eef4e6);display:flex;align-items:center;gap:8px;text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .mcp-panel{display:flex;flex-direction:column;background:var(--bg-card,#181c14);border:3px solid #000;
      border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626),5px 5px 0 rgba(0,0,0,.4);overflow:hidden;cursor:default}
    .mcp-panel-head{display:flex;align-items:center;gap:10px;padding:13px 14px 0}
    .mcp-panel-icon{font-size:22px;width:42px;height:42px;display:grid;place-items:center;background:rgba(127,220,58,.08);border:3px solid #000;border-radius:0;flex:0 0 auto}
    .mcp-panel-title{margin:0;font:400 13px var(--px-font),monospace;line-height:1.6;color:var(--text-main,#eef4e6);text-shadow:2px 2px 0 rgba(0,0,0,.6)}
    .mcp-panel-body{padding:0 14px 16px}
    .mcp-panel-img{width:100%;max-height:200px;object-fit:cover;display:block;border:3px solid #000;border-radius:0;margin:12px 0 0}
    .mcp-empty{text-align:center;padding:34px 16px;border:3px dashed var(--border-color,#2f3626);border-radius:0;color:var(--text-muted,#98a28c);background:var(--bg-card,#181c14);margin:0}
    .mcp-empty i{font-size:26px;color:var(--mc-accent,#7fdc3a);display:block;margin:0 0 10px}
    .mcp-empty p{margin:6px 0 0;font:600 12.5px var(--ui-font),sans-serif;line-height:1.6}
    .mcp-cta{border:3px solid #000;border-radius:0;padding:9px 12px;background:var(--mc-dark,#4a8f1d);color:#eaf7dd;
      font:700 12.5px var(--ui-font),sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;
      box-shadow:inset 2px 2px 0 rgba(255,255,255,.3),inset -2px -2px 0 rgba(0,0,0,.4)}
    .mcp-cta:hover{background:var(--mc-accent,#7fdc3a);color:#16300a}
    .mcp-cta:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.3),inset 2px 2px 0 rgba(0,0,0,.4)}
    .mcp-info{background:#0b0d09;border:3px solid #000;border-radius:0;box-shadow:0 0 0 2px var(--border-color,#2f3626);padding:13px 15px;margin:0 0 14px}
    .mcp-md{color:var(--text-main,#eef4e6);font:600 13px var(--ui-font),sans-serif;line-height:1.7;margin:0}
    .mcp-md p{margin:0 0 8px}
    .mcp-md ul,.mcp-md ol{margin:0 0 8px;padding-left:20px}
    .mcp-md code{background:#0b0d09;color:var(--mc-accent,#7fdc3a);padding:1px 5px;border-radius:0;border:2px solid #000;font-family:ui-monospace,Menlo,monospace}
    .mcp-md a{color:var(--mc-accent,#7fdc3a)}
    .mcp-panel-body.mcp-md{margin:10px 0 0}
    @media(max-width:520px){.mcp-grid{grid-template-columns:1fr}}
    `;
    function injectStyles() {
        if (document.getElementById('mc-payments-style')) return;
        const st = document.createElement('style');
        st.id = 'mc-payments-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    const state = { settings: {}, panels: {}, storeInfo: '', refs: [] };

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

    function activePanels() {
        return Object.keys(state.panels).map(function (id) {
            return Object.assign({ id: id }, state.panels[id]);
        }).filter(function (p) { return p && p.active === true; })
            .sort(function (a, b) {
                return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.title || '').localeCompare(String(b.title || ''));
            });
    }

    MC.payments = {
        render: function (main) {
            if (!main) return;
            detach();
            injectStyles();

            state.settings = {}; state.panels = {}; state.storeInfo = '';

            const hero = el('section', 'mcp-hero');
            hero.appendChild(el('h1', null, 'Pagos de StevsMCross'));
            hero.appendChild(el('p', 'mcp-hero-sub', String(state.settings.hero || '').trim() || 'Aquí encontrarás toda la información sobre cómo comprar en la Tienda de StevsMCross: paneles publicados por el staff y tus compras. Todavía sin método de pago automático: el staff revisa y entrega cada pedido.'));
            main.appendChild(hero);

            const introSec = el('section', 'mcp-sec');
            const introH2 = el('h2');
            introH2.appendChild(fa('fa-circle-info'));
            introH2.appendChild(document.createTextNode(' Sobre los pagos'));
            introSec.appendChild(introH2);
            const introBox = el('div', 'mcp-md');
            introSec.appendChild(introBox);
            main.appendChild(introSec);

            const panelsSec = el('section', 'mcp-sec');
            const panelsH2 = el('h2');
            panelsH2.appendChild(fa('fa-layer-group'));
            panelsH2.appendChild(document.createTextNode(' Paneles de pago'));
            panelsSec.appendChild(panelsH2);
            const grid = el('div', 'mcp-grid');
            panelsSec.appendChild(grid);
            main.appendChild(panelsSec);

            const infoSec = el('section', 'mcp-sec');
            const infoH2 = el('h2');
            infoH2.appendChild(fa('fa-receipt'));
            infoH2.appendChild(document.createTextNode(' Instrucciones de pago'));
            infoSec.appendChild(infoH2);
            const infoBox = el('div', 'mcp-info');
            infoSec.appendChild(infoBox);
            const cta = el('button', 'mcp-cta');
            cta.type = 'button';
            cta.appendChild(fa('fa-store'));
            cta.appendChild(document.createTextNode(' Ir a la Tienda'));
            cta.addEventListener('click', function () {
                location.hash = '#c/tienda';
                if (MC.route) MC.route();
            });
            infoSec.appendChild(cta);
            main.appendChild(infoSec);

            const paintIntro = function () {
                const heroSub = hero.querySelector('.mcp-hero-sub');
                if (heroSub) heroSub.textContent = String(state.settings.hero || '').trim() || 'Aquí encontrarás toda la información sobre cómo comprar en la Tienda de StevsMCross: paneles publicados por el staff y tus compras. Todavía sin método de pago automático: el staff revisa y entrega cada pedido.';
                introBox.textContent = '';
                const intro = String(state.settings.intro || '').trim();
                introSec.style.display = intro ? '' : 'none';
                if (!intro) return;
                introBox.innerHTML = renderMd(intro);
                enhance(introBox);
            };

            const paintPanels = function () {
                grid.textContent = '';
                const list = activePanels();
                if (!list.length) {
                    const box = el('div', 'mcp-empty');
                    box.appendChild(fa('fa-hand-holding-dollar'));
                    box.appendChild(el('p', null, 'El staff todavía no publicó paneles de pago.'));
                    grid.appendChild(box);
                    return;
                }
                list.forEach(function (p) { grid.appendChild(panelCard(p)); });
            };

            const paintInfo = function () {
                infoBox.textContent = '';
                const info = String(state.storeInfo || '').trim();
                if (!info) {
                    infoBox.appendChild(el('p', 'mcp-empty', 'El staff todavía no configuró las instrucciones de pago. Revisa la Tienda cuando haya novedades.'));
                    return;
                }
                const md = el('div', 'mcp-md');
                md.innerHTML = renderMd(info);
                infoBox.appendChild(md);
                enhance(md);
            };

            const repaintAll = function () {
                try { paintIntro(); } catch (e) {}
                try { paintPanels(); } catch (e) {}
                try { paintInfo(); } catch (e) {}
            };

            listen('mc/payments/settings', function (v) { state.settings = v || {}; repaintAll(); });
            listen('mc/payments/panels', function (v) { state.panels = v || {}; repaintAll(); });
            listen('mc/store/settings', function (v) { state.storeInfo = String((v && v.info) || ''); repaintAll(); });

            repaintAll();
        }
    };

    function panelCard(p) {
        const card = el('article', 'mcp-panel');

        const head = el('div', 'mcp-panel-head');
        head.appendChild(el('span', 'mcp-panel-icon', String(p.icon || '').trim() || '💳'));
        head.appendChild(el('h3', 'mcp-panel-title', p.title || 'Panel'));
        card.appendChild(head);

        const src = safeUrl(p.img || '');
        if (src) {
            const im = document.createElement('img');
            im.className = 'mcp-panel-img';
            im.loading = 'lazy';
            im.alt = '';
            im.src = src;
            card.appendChild(im);
        }

        const md = el('div', 'mcp-md mcp-panel-body');
        md.innerHTML = renderMd(p.body || '');
        card.appendChild(md);
        enhance(md);

        return card;
    }

    console.log('[Stevscon] mc_payments.js listo (v1) — paneles de pago informativos.');
})(window, document);
