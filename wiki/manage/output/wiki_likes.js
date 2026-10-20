/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_likes.js (v1)
 * LIKES: corazones para el artículo y para CADA sub-página.
 *  - Un botón ♥ junto al autor/fecha/vistas del artículo.
 *  - Un botón ♥ pequeño en la cabecera de cada sub-página
 *    (normal, lista y galería) — se inyecta solo, sin tocar
 *    wiki_subs.js, y sobrevive a los re-pintados en vivo.
 *  - Un like por cuenta (se quita pulsando otra vez), en vivo
 *    para todos los que estén viendo la página.
 *  - Datos: wiki/likes/{artId}/users/{uid} = fecha
 *           wiki/likes/{artId}/subs/{subId}/users/{uid} = fecha
 *    (las rules solo dejan escribir TU propio uid — nadie borra
 *    likes ajenos).
 *  - Sin sesión: se ve el contador, pero al pulsar avisa que
 *    hay que iniciar sesión en Stevscon.com.
 *  - Animaciones: pop del corazón + lluvia de corazones al dar
 *    like. Tema claro y oscuro con variables del sitio.
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const db = function () { return firebase.database(); };
    const toast = function (m, k) { if (WK.toast) WK.toast(m, k); };

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function uid() { return (WK.system && WK.system.session && WK.system.session.uid) || ''; }
    function logged() { return !!(WK.system && WK.system.session && WK.system.session.user); }
    function fmtNum(n) { return Number(n || 0).toLocaleString('es'); }

    /* ==== CSS ==== */
    const CSS = `
    .wk-like{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border-color,#2e2440);background:var(--bg-hover,#261f36);color:var(--text-muted,#94a3b8);border-radius:999px;padding:4px 12px;font:700 12px Inter,sans-serif;cursor:pointer;transition:color .2s,border-color .2s,background .2s}
    .wk-like i{font-size:11.5px;transition:color .2s}
    .wk-like:hover{color:#f472b6;border-color:rgba(244,114,182,.55)}
    .wk-like:hover i{color:#f472b6}
    .wk-like.is-on{color:#f472b6;border-color:rgba(244,114,182,.55);background:rgba(244,114,182,.10)}
    .wk-like.is-on i{color:#f43f5e}
    .wk-like.pop i{animation:wkl-pop .45s ease}
    @keyframes wkl-pop{0%{transform:scale(1)}35%{transform:scale(1.5)}70%{transform:scale(.9)}100%{transform:scale(1)}}
    .wk-like-sm{padding:3px 10px;font-size:10.5px;margin-left:8px}
    .wk-like-sm i{font-size:10px}
    .wkl-fly{position:fixed;z-index:6000;pointer-events:none;color:#f43f5e;font-size:13px;animation:wkl-fly .8s ease forwards}
    @keyframes wkl-fly{to{transform:translateY(-36px);opacity:0}}
    `;
    if (!document.getElementById('wk-likes-style')) {
        const st = document.createElement('style');
        st.id = 'wk-likes-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ==== ESTADO: un listener por artículo sirve artículo + subs ==== */
    const state = { artId: null, snap: { users: {}, subs: {} }, ref: null, cb: null };

    function detach() {
        if (state.ref && state.cb) state.ref.off('value', state.cb);
        state.ref = null; state.cb = null; state.artId = null;
    }
    function listen(artId) {
        detach();
        state.artId = artId;
        state.snap = { users: {}, subs: {} };
        state.ref = db().ref('wiki/likes/' + artId);
        state.cb = function (s) {
            const v = s.val() || {};
            state.snap = { users: v.users || {}, subs: v.subs || {} };
            paintAll();
        };
        state.ref.on('value', state.cb, function () {});
    }

    /* ==== PINTAR ==== */
    function usersOf(subId) {
        if (subId) {
            const s = (state.snap.subs || {})[subId] || {};
            return s.users || {};
        }
        return state.snap.users || {};
    }
    function paintBtn(btn, subId) {
        const me = uid();
        const users = usersOf(subId);
        const sp = btn.querySelector('.wk-like-n');
        if (sp) sp.textContent = fmtNum(Object.keys(users).length);
        btn.classList.toggle('is-on', !!(me && users[me]));
    }
    function paintAll() {
        Array.prototype.forEach.call(document.querySelectorAll('.wk-like[data-wklike]'), function (b) {
            const k = b.getAttribute('data-wklike');
            if (!b.isConnected) return;
            paintBtn(b, k === 'art' ? null : k);
        });
    }

    /* ==== FIESTA: pop + corazones flotando ==== */
    function pop(btn) {
        btn.classList.remove('pop');
        void btn.offsetWidth; /* reinicia la animación */
        btn.classList.add('pop');
    }
    function burst(btn) {
        const r = btn.getBoundingClientRect();
        for (let i = 0; i < 3; i++) {
            const h = document.createElement('i');
            h.className = 'fa-solid fa-heart wkl-fly';
            h.style.left = (r.left + r.width / 2 + (Math.random() * 26 - 13)) + 'px';
            h.style.top = (r.top - 4) + 'px';
            h.style.animationDelay = (i * 0.07) + 's';
            document.body.appendChild(h);
            setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 950 + i * 70);
        }
    }

    /* ==== TOGGLE ARTÍCULO ==== */
    function toggleArt(btn) {
        if (!state.artId) return;
        const me = uid();
        if (!logged() || !me) return toast('Inicia sesión en Stevscon.com para dar ❤ a la wiki', 'info');
        const had = !!state.snap.users[me];
        if (had) delete state.snap.users[me]; else state.snap.users[me] = Date.now();
        paintAll();
        if (!had) { pop(btn); burst(btn); }
        const ref = db().ref('wiki/likes/' + state.artId + '/users/' + me);
        (had ? ref.remove() : ref.set(firebase.database.ServerValue.TIMESTAMP)).catch(function () {
            if (had) state.snap.users[me] = Date.now(); else delete state.snap.users[me];
            paintAll();
            toast('No se pudo guardar tu like', 'error');
        });
    }

    /* ==== TOGGLE SUB-PÁGINA ==== */
    function toggleSub(subId, btn) {
        if (!state.artId) return;
        const me = uid();
        if (!logged() || !me) return toast('Inicia sesión en Stevscon.com para dar ❤ a la wiki', 'info');
        if (!state.snap.subs) state.snap.subs = {};
        if (!state.snap.subs[subId] || !state.snap.subs[subId].users) {
            state.snap.subs[subId] = { users: state.snap.subs[subId] && state.snap.subs[subId].users || {} };
        }
        const users = state.snap.subs[subId].users;
        const had = !!users[me];
        if (had) delete users[me]; else users[me] = Date.now();
        paintAll();
        if (!had) { pop(btn); burst(btn); }
        const ref = db().ref('wiki/likes/' + state.artId + '/subs/' + subId + '/users/' + me);
        (had ? ref.remove() : ref.set(firebase.database.ServerValue.TIMESTAMP)).catch(function () {
            if (had) users[me] = Date.now(); else delete users[me];
            paintAll();
            toast('No se pudo guardar tu like', 'error');
        });
    }

    /* ==== BOTÓN ==== */
    function makeBtn(subId, small) {
        const b = el('button', 'wk-like' + (small ? ' wk-like-sm' : ''));
        b.type = 'button';
        b.title = 'Me gusta';
        b.setAttribute('aria-label', 'Me gusta');
        b.setAttribute('data-wklike', subId || 'art');
        const ic = document.createElement('i');
        ic.className = 'fa-solid fa-heart';
        b.appendChild(ic);
        b.appendChild(el('span', 'wk-like-n', '0'));
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (subId) toggleSub(subId, b); else toggleArt(b);
        });
        return b;
    }

    /* ==== INYECCIÓN EN SUB-PÁGINAS (sobrevive a re-pintados) ==== */
    let obs = null;
    function injectSubs() {
        if (!state.artId) return;
        Array.prototype.forEach.call(document.querySelectorAll('.wk-sub-top'), function (t) {
            if (!t.isConnected || t.querySelector('.wk-like')) return;
            const blk = t.closest('.wk-sub');
            const m = blk && /^wk-sub-(.+)$/.exec(blk.id || '');
            if (!m) return;
            const btn = makeBtn(m[1], true);
            if (!t.querySelector('.wk-sub-acts')) btn.style.marginLeft = 'auto';
            t.appendChild(btn);
            paintBtn(btn, m[1]);
        });
    }
    function startObserver() {
        if (obs) return;
        obs = new MutationObserver(function () { injectSubs(); });
        const m = document.getElementById('wk-main');
        if (m) obs.observe(m, { childList: true, subtree: true });
    }

    /* ==== GANCHO SEGURO EN renderArticle (el core NO se toca) ==== */
    function wrapCore() {
        if (!WK.core || typeof WK.core.renderArticle !== 'function') return false;
        if (WK.core.__likesWrapped) return true;
        WK.core.__likesWrapped = true;
        const orig = WK.core.renderArticle;
        WK.core.renderArticle = function (main, key) {
            detach();
            orig.call(WK.core, main, key);
            try {
                const hit = WK.core.resolveArticle(key);
                const art = main.querySelector('.wk-article');
                const meta = art && art.querySelector('.wk-art-meta');
                if (!hit || !meta) return;
                const btn = makeBtn(null, false);
                btn.style.marginLeft = 'auto';
                meta.appendChild(btn);
                listen(hit.id);
                startObserver();
                injectSubs();
                paintAll();
            } catch (e) { console.warn('[Wiki] likes:', e); }
        };
        return true;
    }

    /* Si cambia la sesión (login/logout), re-pinta los corazones */
    document.addEventListener('sc:wiki-auth', paintAll);

    function boot() {
        if (wrapCore()) console.log('[Stevscon] wiki_likes.js listo (v1) — likes en artículos y sub-páginas.');
    }
    if (WK.core && WK.core.renderArticle) boot();
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else setTimeout(boot, 0);
})(window, document);