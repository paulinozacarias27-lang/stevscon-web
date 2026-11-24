/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_likes.js (v2)
 * LIKES: corazones para la página y para CADA sub-página.
 *  - Un botón ♥ junto al autor/fecha/vistas de la página.
 *  - Un botón ♥ pequeño en la cabecera de cada sub-página
 *    (normal, lista y galería) — se inyecta solo, sin tocar
 *    mc_subs.js, y sobrevive a los re-pintados en vivo.
 *  - Un like por cuenta (se quita pulsando otra vez), en vivo
 *    para todos los que estén viendo la página.
 *  - Datos: mc/likes/{pageId}/users/{uid} = fecha
 *           mc/likes/{pageId}/subs/{subId}/users/{uid} = fecha
 *    (las rules solo dejan escribir TU propio uid — nadie borra
 *    likes ajenos).
 *  - Sin sesión: se ve el contador, pero al pulsar avisa que
 *    hay que iniciar sesión en Stevscon.com.
 *  - Animaciones: pop del corazón + lluvia de corazones al dar
 *    like. Tema claro y oscuro con variables del sitio.
 * v2 — RESTYLE BLOQUE: misma función, identidad visual Minecraft (píxeles, bisel, sombras duras, sin blur).
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const db = function () { return firebase.database(); };
    const toast = function (m, k) { if (MC.toast) MC.toast(m, k); };

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }
    function uid() { return (MC.system && MC.system.session && MC.system.session.uid) || ''; }
    function logged() { return !!(MC.system && MC.system.session && MC.system.session.user); }
    function fmtNum(n) { return Number(n || 0).toLocaleString('es'); }

    const CSS = `
    .mc-like{display:inline-flex;align-items:center;gap:7px;border:3px solid #000;background:var(--bg-hover,#232a1b);box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.45),3px 3px 0 rgba(0,0,0,.4);color:var(--text-muted,#98a28c);border-radius:0;padding:4px 12px;font:700 12px var(--ui-font,'Pixelify Sans',sans-serif);letter-spacing:.04em;cursor:pointer;transition:color .12s,background .12s,box-shadow .12s}
    .mc-like i{font-size:11.5px;color:#6b7280;transition:color .2s}
    .mc-like:hover{color:var(--text-main,#eef4e6);background:var(--bg-card,#181c14);box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.45),3px 3px 0 var(--redstone,#ff5545)}
    .mc-like:hover i{color:var(--redstone,#ff5545)}
    .mc-like.is-on{color:var(--redstone,#ff5545);background:rgba(255,85,69,.08);box-shadow:inset 2px 2px 0 rgba(255,255,255,.12),inset -2px -2px 0 rgba(0,0,0,.45),3px 3px 0 rgba(0,0,0,.4)}
    .mc-like.is-on i{color:var(--redstone,#ff5545)}
    .mc-like:active{transform:translate(2px,2px);box-shadow:inset -2px -2px 0 rgba(255,255,255,.1),inset 2px 2px 0 rgba(0,0,0,.45)}
    .mc-like.pop i{animation:mcl-pop .45s steps(4)}
    @keyframes mcl-pop{0%{transform:scale(1)}35%{transform:scale(1.5)}70%{transform:scale(.9)}100%{transform:scale(1)}}
    .mc-like-sm{padding:3px 10px;font-size:10.5px;margin-left:8px}
    .mc-like-sm i{font-size:10px}
    .mcl-fly{position:fixed;z-index:6000;pointer-events:none;color:var(--redstone,#ff5545);font-size:13px;text-shadow:2px 2px 0 rgba(0,0,0,.45);animation:mcl-fly .8s steps(6) forwards}
    @keyframes mcl-fly{to{transform:translateY(-36px);opacity:0}}
    `;
    if (!document.getElementById('mc-likes-style')) {
        const st = document.createElement('style');
        st.id = 'mc-likes-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    const state = { artId: null, snap: { users: {}, subs: {} }, ref: null, cb: null };

    function detach() {
        if (state.ref && state.cb) state.ref.off('value', state.cb);
        state.ref = null; state.cb = null; state.artId = null;
    }
    function listen(artId) {
        detach();
        state.artId = artId;
        state.snap = { users: {}, subs: {} };
        state.ref = db().ref('mc/likes/' + artId);
        state.cb = function (s) {
            const v = s.val() || {};
            state.snap = { users: v.users || {}, subs: v.subs || {} };
            paintAll();
        };
        state.ref.on('value', state.cb, function () {});
    }

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
        const sp = btn.querySelector('.mc-like-n');
        if (sp) sp.textContent = fmtNum(Object.keys(users).length);
        btn.classList.toggle('is-on', !!(me && users[me]));
    }
    function paintAll() {
        Array.prototype.forEach.call(document.querySelectorAll('.mc-like[data-mclike]'), function (b) {
            const k = b.getAttribute('data-mclike');
            if (!b.isConnected) return;
            paintBtn(b, k === 'art' ? null : k);
        });
    }

    function pop(btn) {
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
    }
    function burst(btn) {
        const r = btn.getBoundingClientRect();
        for (let i = 0; i < 3; i++) {
            const h = document.createElement('i');
            h.className = 'fa-solid fa-heart mcl-fly';
            h.style.left = (r.left + r.width / 2 + (Math.random() * 26 - 13)) + 'px';
            h.style.top = (r.top - 4) + 'px';
            h.style.animationDelay = (i * 0.07) + 's';
            document.body.appendChild(h);
            setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 950 + i * 70);
        }
    }

    function toggleArt(btn) {
        if (!state.artId) return;
        const me = uid();
        if (!logged() || !me) return toast('Inicia sesión en Stevscon.com para dar ❤ a StevsMCross', 'info');
        const had = !!state.snap.users[me];
        if (had) delete state.snap.users[me]; else state.snap.users[me] = Date.now();
        paintAll();
        if (!had) { pop(btn); burst(btn); }
        const ref = db().ref('mc/likes/' + state.artId + '/users/' + me);
        (had ? ref.remove() : ref.set(firebase.database.ServerValue.TIMESTAMP)).catch(function () {
            if (had) state.snap.users[me] = Date.now(); else delete state.snap.users[me];
            paintAll();
            toast('No se pudo guardar tu like', 'error');
        });
    }

    function toggleSub(subId, btn) {
        if (!state.artId) return;
        const me = uid();
        if (!logged() || !me) return toast('Inicia sesión en Stevscon.com para dar ❤ a StevsMCross', 'info');
        if (!state.snap.subs) state.snap.subs = {};
        if (!state.snap.subs[subId] || !state.snap.subs[subId].users) {
            state.snap.subs[subId] = { users: state.snap.subs[subId] && state.snap.subs[subId].users || {} };
        }
        const users = state.snap.subs[subId].users;
        const had = !!users[me];
        if (had) delete users[me]; else users[me] = Date.now();
        paintAll();
        if (!had) { pop(btn); burst(btn); }
        const ref = db().ref('mc/likes/' + state.artId + '/subs/' + subId + '/users/' + me);
        (had ? ref.remove() : ref.set(firebase.database.ServerValue.TIMESTAMP)).catch(function () {
            if (had) users[me] = Date.now(); else delete users[me];
            paintAll();
            toast('No se pudo guardar tu like', 'error');
        });
    }

    function makeBtn(subId, small) {
        const b = el('button', 'mc-like' + (small ? ' mc-like-sm' : ''));
        b.type = 'button';
        b.title = 'Me gusta';
        b.setAttribute('aria-label', 'Me gusta');
        b.setAttribute('data-mclike', subId || 'art');
        const ic = document.createElement('i');
        ic.className = 'fa-solid fa-heart';
        b.appendChild(ic);
        b.appendChild(el('span', 'mc-like-n', '0'));
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (subId) toggleSub(subId, b); else toggleArt(b);
        });
        return b;
    }

    let obs = null;
    function injectSubs() {
        if (!state.artId) return;
        Array.prototype.forEach.call(document.querySelectorAll('.mc-sub-top'), function (t) {
            if (!t.isConnected || t.querySelector('.mc-like')) return;
            const blk = t.closest('.mc-sub');
            const m = blk && /^mc-sub-(.+)$/.exec(blk.id || '');
            if (!m) return;
            const btn = makeBtn(m[1], true);
            if (!t.querySelector('.mc-sub-acts')) btn.style.marginLeft = 'auto';
            t.appendChild(btn);
            paintBtn(btn, m[1]);
        });
    }
    function startObserver() {
        if (obs) return;
        obs = new MutationObserver(function () { injectSubs(); });
        const m = document.getElementById('mc-main');
        if (m) obs.observe(m, { childList: true, subtree: true });
    }

    function wrapCore() {
        if (!MC.core || typeof MC.core.renderArticle !== 'function') return false;
        if (MC.core.__likesWrapped) return true;
        MC.core.__likesWrapped = true;
        const orig = MC.core.renderArticle;
        MC.core.renderArticle = function (main, key) {
            detach();
            orig.call(MC.core, main, key);
            try {
                const hit = MC.core.resolveArticle(key);
                const art = main.querySelector('.mc-article');
                const meta = art && art.querySelector('.mc-art-meta');
                if (!hit || !meta) return;
                const btn = makeBtn(null, false);
                btn.style.marginLeft = 'auto';
                meta.appendChild(btn);
                listen(hit.id);
                startObserver();
                injectSubs();
                paintAll();
            } catch (e) { console.warn('[StevsMCross] likes:', e); }
        };
        return true;
    }

    document.addEventListener('sc:mc-auth', paintAll);

    function boot() {
        if (wrapCore()) console.log('[Stevscon] mc_likes.js listo (v2) — likes en páginas y sub-páginas.');
    }
    if (MC.core && MC.core.renderArticle) boot();
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else setTimeout(boot, 0);
})(window, document);
