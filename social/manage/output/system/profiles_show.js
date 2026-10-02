/**
 * ====
 * STEVSCON.COM — social/manage/output/system/profiles_show.js (v3)
 * PANEL DE PERFIL del Social (por fin funcional):
 *  - Clic en cualquier avatar/nombre del Social (data-scsoc-profile)
 *    -> modal estilo Discord con TU tarjeta real de Profiles
 *       (StevsconProfiles.ui.renderProfileCard) + estado en vivo.
 *  - Si los files de Profiles no cargaron, usa tarjeta de respaldo propia.
 *  - Perfil ajeno: el badge de estado se neutraliza (NO cambia tu estado).
 *  - TU perfil: clic en el avatar -> panel de estado (como Discord).
 *  - Cierra con X, clic afuera o Escape (sin robarle el Escape al Social).
 *  - Cero innerHTML con datos de usuario: textContent siempre (anti-XSS).
 * ====
 */
(function (window, document) {
    'use strict';

    const SCSOC = window.SCSOC = window.SCSOC || {};
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCSOC.profiles = SCSOC.profiles || {};

    const STATUS_TXT = { online: 'En línea', inactive: 'Inactivo', busy: 'Ocupado', offline: 'Desconectado' };
    const STATUS_CLR = { online: '#22c55e', inactive: '#f59e0b', busy: '#ef4444', offline: '#6b7280' };

    let backdrop = null, modal = null, cardHost = null;
    let statusRow = null, statusDot = null, statusTxt = null;
    let currentUid = null, detach = null, escHandler = null, fixTimers = [];

    function db() { return firebase.database(); }

    function isSelf(uid) {
        const a = firebase.auth().currentUser;
        return !!(a && a.uid === uid);
    }

    /* ==== lectura de campos (tolerante a cómo guarde Profiles) ==== */
    function nameFor(d) { const p = d.profile || {}; return d.name || d.displayName || d.username || p.name || p.username || 'Usuario'; }
    function handlerFor(d) { const p = d.profile || {}; return String(d.handler || d.tag || p.handler || '').toLowerCase().replace(/^@/, ''); }
    function avatarUrlFor(d) {
        const p = d.profile || {};
        return String(d.avatarUrl || d.avatar || p.avatarUrl || p.avatar ||
            (d.media && (d.media.avatar || d.media.avatarUrl)) || '');
    }

    /* ==== estado en vivo (users/{uid}/status = {state,...}) ==== */
    function paintStatus(raw) {
        if (!statusRow) return;
        const st = raw && raw.status;
        const state = (st && typeof st === 'object') ? (st.state || '') : (typeof st === 'string' ? st : '');
        if (!STATUS_TXT[state]) { statusRow.style.display = 'none'; return; }
        statusRow.style.display = 'flex';
        statusDot.style.background = STATUS_CLR[state];
        statusTxt.textContent = STATUS_TXT[state];
    }

    /* ==== tarjeta de respaldo (si ui_profile.js no está) ==== */
    function label(txt) {
        const p = SCSOC.el('p', 'margin:14px 0 0;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#8f7fc0;');
        p.textContent = txt;
        return p;
    }

    function memberSinceTxt(d) {
        if (SCp.age && typeof SCp.age.memberSince === 'function') {
            return SCp.age.memberSince(d, isSelf(currentUid) ? firebase.auth().currentUser : null);
        }
        const v = d.createdAt || (d.metadata && d.metadata.createdAt) || null;
        if (!v) return '—';
        const dt = new Date(v);
        if (isNaN(dt.getTime())) return '—';
        return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear();
    }

    function bannerFor(d, height) {
        if (SCp.ui && typeof SCp.ui.bannerEl === 'function') return SCp.ui.bannerEl(d, height);
        const url = d.bannerUrl || '';
        if (url && /^(data:image|https?:\/\/)/i.test(url)) {
            const im = SCSOC.el('img', 'width:100%;height:' + height + ';display:block;object-fit:cover;');
            im.src = url; im.alt = 'Banner'; im.referrerPolicy = 'no-referrer';
            return im;
        }
        const css = (SCp.ui && typeof SCp.ui.presetCss === 'function')
            ? SCp.ui.presetCss('banner', d.bannerPreset)
            : 'linear-gradient(120deg,#1a1526,#4c1d95)';
        return SCSOC.el('div', 'width:100%;height:' + height + ';display:block;background:' + css + ';');
    }

    function avatarFor(d, px) {
        if (SCp.ui && typeof SCp.ui.avatarEl === 'function') {
            return SCp.ui.avatarEl({
                avatarUrl: avatarUrlFor(d),
                avatarPreset: d.avatarPreset || (d.profile && d.profile.avatarPreset) || 'g1'
            }, px, nameFor(d).charAt(0).toUpperCase());
        }
        return SCSOC.avatarEl({ _name: nameFor(d), _avatar: avatarUrlFor(d) }, px, '');
    }

    function fallbackCard(d) {
        const card = SCSOC.el('div', 'background:var(--bg-main,#14101f);border:1px solid rgba(167,139,250,.35);border-radius:14px;overflow:hidden;color:#ede9fe;');
        const bw = SCSOC.el('div', 'position:relative;');
        bw.appendChild(bannerFor(d, '110px'));
        card.appendChild(bw);

        const inner = SCSOC.el('div', 'padding:0 16px 16px;');
        const row = SCSOC.el('div', 'display:flex;align-items:flex-end;margin-top:-34px;margin-bottom:10px;position:relative;');
        const av = avatarFor(d, 72);
        av.style.border = '4px solid var(--bg-main,#14101f)';
        row.appendChild(av);
        inner.appendChild(row);

        const nm = SCSOC.el('h3', 'margin:0;font-size:19px;font-weight:800;color:#ede9fe;letter-spacing:-.02em;');
        nm.textContent = nameFor(d);
        inner.appendChild(nm);

        const hd = SCSOC.el('p', 'margin:2px 0 0;font-size:13px;color:#a78bfa;font-weight:600;');
        hd.textContent = handlerFor(d) ? '@' + handlerFor(d) : 'Sin handler aún';
        inner.appendChild(hd);

        if (d.userId) {
            const idRow = SCSOC.el('div', 'display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:#8f7fc0;');
            const l1 = SCSOC.el('span', 'font-weight:700;'); l1.textContent = 'ID';
            const v1 = SCSOC.el('span', 'color:#ede9fe;font-variant-numeric:tabular-nums;');
            v1.textContent = String(d.userId);
            idRow.appendChild(l1); idRow.appendChild(v1);
            inner.appendChild(idRow);
        }

        inner.appendChild(label('DESCRIPCIÓN'));
        const de = SCSOC.el('p', 'margin:4px 0 0;font-size:13.5px;line-height:1.55;color:' + (d.description ? '#ede9fe' : '#8f7fc0') + ';white-space:pre-wrap;word-break:break-word;');
        de.textContent = d.description || 'Sin descripción aún.';
        inner.appendChild(de);

        inner.appendChild(label('MIEMBRO DESDE'));
        const ms = SCSOC.el('p', 'margin:4px 0 0;font-size:13.5px;color:#ede9fe;font-variant-numeric:tabular-nums;');
        ms.textContent = memberSinceTxt(d);
        inner.appendChild(ms);

        inner.appendChild(label('GÉNERO'));
        const ge = SCSOC.el('p', 'margin:4px 0 0;font-size:13.5px;color:' + (d.gender ? '#ede9fe' : '#8f7fc0') + ';');
        ge.textContent = d.gender || 'Sin especificar';
        inner.appendChild(ge);

        card.appendChild(inner);
        cardHost.appendChild(card);
    }

    /* ==== badge de estado ajeno fuera (mostraría MI estado) ==== */
    function neutralizeForeign() {
        if (!cardHost) return;
        const wraps = cardHost.querySelectorAll('[data-sc-status-wrap]');
        for (let i = 0; i < wraps.length; i++) {
            const w = wraps[i];
            const b = w.querySelector('[data-sc-status-badge]');
            if (b && b.parentNode) b.parentNode.removeChild(b);
            w.style.pointerEvents = 'none';
            w.style.cursor = 'default';
            w.removeAttribute('title');
            w.removeAttribute('role');
            w.removeAttribute('aria-label');
        }
    }

    function paintCard(raw) {
        if (!cardHost) return;
        fixTimers.forEach(function (t) { clearTimeout(t); });
        fixTimers = [];
        while (cardHost.firstChild) cardHost.removeChild(cardHost.firstChild);

        if (!raw) {
            const p = SCSOC.el('p', 'color:#8f7fc0;font:600 13px Inter,sans-serif;text-align:center;padding:18px 0;');
            p.textContent = 'Cargando perfil...';
            cardHost.appendChild(p);
            return;
        }

        if (SCp.ui && typeof SCp.ui.renderProfileCard === 'function') {
            try {
                SCp.ui.renderProfileCard(cardHost, raw, isSelf(currentUid) ? firebase.auth().currentUser : null, {});
                if (!isSelf(currentUid)) {
                    neutralizeForeign();
                    fixTimers.push(setTimeout(neutralizeForeign, 250));
                    fixTimers.push(setTimeout(neutralizeForeign, 700));
                }
                return;
            } catch (e) {
                console.error('[SCSOC profiles_show] Falló la tarjeta de Profiles, uso respaldo:', e);
            }
        }
        fallbackCard(raw);
    }

    /* ==== ciclo de vida del modal ==== */
    function detachLive() {
        if (detach) { try { detach(); } catch (e) {} detach = null; }
    }

    function wireLive(uid) {
        detachLive();
        const ref = db().ref('users/' + uid);
        const h = ref.on('value', function (s) {
            const raw = s.val();
            paintStatus(raw);
            paintCard(raw);
        }, function (err) {
            console.error('[SCSOC profiles_show] No se pudo leer users/' + uid, err);
        });
        detach = function () { ref.off('value', h); };
    }

    function buildShell() {
        backdrop = SCSOC.el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:4500;background:rgba(5,4,10,.66);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Inter,sans-serif;');
        modal = SCSOC.el('div', 'width:440px;max-width:100%;max-height:86vh;overflow-y:auto;position:relative;background:var(--bg-card,#1a1526);border:1px solid rgba(167,139,250,.4);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.6);box-sizing:border-box;');

        const x = SCSOC.el('button', 'position:absolute;top:10px;right:10px;z-index:5;width:32px;height:32px;border-radius:50%;border:0;background:rgba(26,21,38,.85);color:#c4b5fd;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;');
        x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        x.addEventListener('click', function (e) { e.stopPropagation(); close(); });
        modal.appendChild(x);

        statusRow = SCSOC.el('div', 'display:none;align-items:center;gap:8px;padding:14px 18px 0;');
        statusDot = SCSOC.el('span', 'width:9px;height:9px;border-radius:50%;flex:none;');
        statusTxt = SCSOC.el('span', 'font:700 12px Inter,sans-serif;color:#c4b5fd;letter-spacing:.02em;');
        statusRow.appendChild(statusDot);
        statusRow.appendChild(statusTxt);
        modal.appendChild(statusRow);

        cardHost = SCSOC.el('div', 'padding:10px 14px 16px;');
        modal.appendChild(cardHost);

        backdrop.appendChild(modal);
        backdrop.addEventListener('click', function () { close(); });
        modal.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    function open(uid) {
        if (!uid) return;
        if (typeof firebase === 'undefined' || !firebase.database) return;
        if (backdrop && currentUid === uid) return;
        close();
        currentUid = uid;
        buildShell();
        document.body.appendChild(backdrop);
        wireLive(uid);
        try {
            backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
            modal.animate(
                [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
                { duration: 210, easing: 'cubic-bezier(.2,.8,.3,1.12)' }
            );
        } catch (e) {}
        escHandler = function (e) {
            if (!backdrop || e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            close();
        };
        document.addEventListener('keydown', escHandler, true);
    }

    function close() {
        fixTimers.forEach(function (t) { clearTimeout(t); });
        fixTimers = [];
        detachLive();
        if (escHandler) { document.removeEventListener('keydown', escHandler, true); escHandler = null; }
        const b = backdrop, m = modal;
        backdrop = null; modal = null; cardHost = null;
        statusRow = null; statusDot = null; statusTxt = null;
        currentUid = null;
        if (!b) return;
        try {
            b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-out' });
            if (m) m.animate(
                [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(10px) scale(.97)' }],
                { duration: 130, easing: 'ease-in' }
            );
        } catch (e) {}
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 140);
    }

    /* ==== API pública + clic en avatar/nombre del Social ==== */
    SCSOC.profiles.open = open;
    SCSOC.profiles.close = close;

    document.addEventListener('click', function (e) {
        const t = e.target && e.target.closest ? e.target.closest('[data-scsoc-profile]') : null;
        if (!t) return;
        e.stopPropagation();
        open(t.dataset.scsocProfile);
    });

    console.log('[Stevscon] profiles_show.js listo (v3) — panel de perfil del Social conectado a TU tarjeta de Profiles.');
})(window, document);