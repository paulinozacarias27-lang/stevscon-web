/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/mc_profiles.js (v1)
 * PANEL DE PERFIL de StevsMCross — AUTÓNOMO (no depende de SCSOC).
 *  - Clic en cualquier [data-scsoc-profile] (el autor de una página,
 *    o lo que pongamos a futuro) -> modal con el perfil COMPLETO:
 *    banner, avatar, nombre, verificado, rank, @handler, badges EN
 *    VIVO (badges_core.js), ID, descripción, miembro desde y género.
 *  - Estado en vivo: users/{uid}/status = { state }.
 *  - Todo EN VIVO: users/{uid} con on('value'), detach al cerrar.
 *  - Campos reales: username/handler (raíz) + profile/ (avatarUrl,
 *    bannerUrl, description, gender). Presets: usa StevsconProfiles
 *    .presets si está cargado; si no, gradiente verde por defecto.
 *  - textContent SIEMPRE para datos; innerHTML solo SVG/ICONOS
 *    estáticos (nunca datos de usuario). Cero XSS.
 *  - API: StevsconMC.profile.open(uid) / .close().
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    if (MC.profile && MC.profile._loaded) return;

    const STATUS_TXT = { online: 'En línea', inactive: 'Inactivo', busy: 'Ocupado', offline: 'Desconectado' };
    const STATUS_CLR = { online: '#22c55e', inactive: '#f59e0b', busy: '#ef4444', offline: '#6b7280' };
    const DEFAULT_BANNER = 'linear-gradient(120deg,#0f1a13,#14532d)';
    const DEFAULT_AVATAR = 'linear-gradient(135deg,#4ade80,#16a34a)';

    const VERIFIED_SVG =
        '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 1.8l2.7 2.3 3.5-.4 1.2 3.3 3.1 1.7-1.2 3.3 1.2 3.3-3.1 1.7-1.2 3.3-3.5-.4L12 22.2l-2.7-2.3-3.5.4-1.2-3.3-3.1-1.7 1.2-3.3-1.2-3.3 3.1-1.7 1.2-3.3 3.5.4z" fill="#38bdf8" stroke="#0369a1" stroke-width=".8"/>' +
        '<path d="m8.4 12.3 2.4 2.4 4.8-5" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    let backdrop = null, modal = null, cardHost = null;
    let statusRow = null, statusDot = null, statusTxt = null;
    let currentUid = null, detach = null, escHandler = null;

    function db() { return firebase.database(); }
    function el(tag, css) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        return e;
    }

    function flatten(raw) {
        if (!raw || typeof raw !== 'object') return {};
        const p = (raw.profile && typeof raw.profile === 'object') ? raw.profile : {};
        const out = {};
        let k;
        for (k in raw) {
            if (k === 'profile' || k === 'status' || k === 'settings') continue;
            if (raw[k] !== null && raw[k] !== undefined) out[k] = raw[k];
        }
        for (k in p) {
            if (p[k] !== null && p[k] !== undefined) out[k] = p[k];
        }
        return out;
    }

    function nameFor(d) { return d.name || d.displayName || d.username || 'Usuario'; }
    function handlerFor(d) { return String(d.handler || d.tag || d.handle || '').toLowerCase().replace(/^@/, ''); }
    function avatarUrlFor(d) {
        return String(d.avatarUrl || d.avatar || (d.media && (d.media.avatar || d.media.avatarUrl)) || '');
    }
    function verifiedFor(d) { return !!(d.verified || d.isVerified); }

    function presetCss(kind, id) {
        try {
            const arr = window.StevsconProfiles && window.StevsconProfiles.presets && window.StevsconProfiles.presets[kind];
            if (arr && arr.length) {
                for (let i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i].css;
            }
        } catch (e) {}
        return null;
    }

    function bannerEl(d, height) {
        const url = String(d.bannerUrl || '');
        if (url && /^(data:image|https?:\/\/)/i.test(url)) {
            const im = el('img', 'width:100%;height:' + height + ';display:block;object-fit:cover;');
            im.src = url; im.alt = 'Banner'; im.referrerPolicy = 'no-referrer';
            return im;
        }
        const div = el('div', 'width:100%;height:' + height + ';display:block;');
        div.style.background = presetCss('banner', d.bannerPreset) || DEFAULT_BANNER;
        return div;
    }

    function avatarEl(d, px) {
        const url = avatarUrlFor(d);
        if (url && /^(data:image|https?:\/\/)/i.test(url)) {
            const im = el('img', 'width:' + px + 'px;height:' + px + 'px;display:block;object-fit:cover;flex:none;');
            im.src = url; im.alt = '';
            return im;
        }
        const box = el('div', 'width:' + px + 'px;height:' + px + 'px;display:flex;align-items:center;justify-content:center;flex:none;color:#06210f;');
        box.style.background = presetCss('avatar', d.avatarPreset) || DEFAULT_AVATAR;
        box.style.font = '800 ' + Math.round(px * 0.42) + 'px Inter,sans-serif';
        box.textContent = (nameFor(d).charAt(0) || 'S').toUpperCase();
        return box;
    }

    function memberSinceTxt(d) {
        const v = d.createdAt || (d.metadata && d.metadata.createdAt) || null;
        if (!v) return '—';
        const dt = new Date(v);
        if (isNaN(dt.getTime())) return '—';
        return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear();
    }

    function label(txt) {
        const p = el('p', 'margin:14px 0 0;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:var(--text-muted,#94a3b8);');
        p.textContent = txt;
        return p;
    }

    function paintStatus(raw) {
        if (!statusRow) return;
        const st = raw && raw.status;
        const state = (st && typeof st === 'object') ? (st.state || '') : (typeof st === 'string' ? st : '');
        if (!STATUS_TXT[state]) { statusRow.style.display = 'none'; return; }
        statusRow.style.display = 'flex';
        statusDot.style.background = STATUS_CLR[state];
        statusTxt.textContent = STATUS_TXT[state];
    }

    function paintLoading() {
        if (!cardHost) return;
        while (cardHost.firstChild) cardHost.removeChild(cardHost.firstChild);
        const p = el('p', 'color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;text-align:center;padding:18px 0;');
        p.textContent = 'Cargando perfil...';
        cardHost.appendChild(p);
    }

    function paintCard(raw) {
        if (!cardHost) return;
        while (cardHost.firstChild) cardHost.removeChild(cardHost.firstChild);

        if (!raw || typeof raw !== 'object') {
            const p = el('p', 'color:var(--text-muted,#94a3b8);font:600 13px Inter,sans-serif;text-align:center;padding:18px 0;');
            p.textContent = 'Perfil no encontrado.';
            cardHost.appendChild(p);
            return;
        }
        const d = flatten(raw);

        const bw = el('div', 'position:relative;');
        bw.appendChild(bannerEl(d, '110px'));
        cardHost.appendChild(bw);

        const inner = el('div', 'padding:0 16px 16px;');

        const row = el('div', 'display:flex;align-items:flex-end;margin-top:-34px;margin-bottom:10px;position:relative;');
        const av = avatarEl(d, 72);
        av.style.border = '4px solid var(--bg-card,#111a13)';
        av.style.borderRadius = '50%';
        row.appendChild(av);
        inner.appendChild(row);

        const nameRow = el('div', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;');
        const nm = el('h3', 'margin:0;font-size:19px;font-weight:800;color:var(--text-main,#f8fafc);letter-spacing:-.02em;');
        nm.textContent = nameFor(d);
        nameRow.appendChild(nm);
        if (verifiedFor(d)) {
            const v = el('span', 'display:inline-flex;');
            v.title = 'Cuenta verificada';
            v.innerHTML = VERIFIED_SVG;
            nameRow.appendChild(v);
        }
        if (d.rank && d.rank !== 'USER') {
            const bg = el('span', 'padding:3px 10px;border-radius:999px;background:rgba(74,222,128,.16);border:1px solid rgba(74,222,128,.5);color:#bbf7d0;font-size:10.5px;font-weight:800;letter-spacing:.14em;');
            bg.textContent = String(d.rank);
            nameRow.appendChild(bg);
        }
        inner.appendChild(nameRow);

        const hd = el('p', 'margin:2px 0 0;font-size:13px;color:var(--mc-accent,#4ade80);font-weight:600;');
        hd.textContent = handlerFor(d) ? '@' + handlerFor(d) : 'Sin handler aún';
        inner.appendChild(hd);

        if (currentUid && window.StevsconBadges && typeof window.StevsconBadges.rowFor === 'function') {
            try { inner.appendChild(window.StevsconBadges.rowFor(currentUid)); } catch (e) {}
        }

        if (d.userId) {
            const idRow = el('div', 'display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--text-muted,#94a3b8);');
            const l1 = el('span', 'font-weight:700;'); l1.textContent = 'ID';
            const v1 = el('span', 'color:var(--text-main,#f8fafc);font-variant-numeric:tabular-nums;');
            v1.textContent = String(d.userId);
            idRow.appendChild(l1); idRow.appendChild(v1);
            inner.appendChild(idRow);
        }

        inner.appendChild(label('DESCRIPCIÓN'));
        const de = el('p', 'margin:4px 0 0;font-size:13.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:' + (d.description ? 'var(--text-main,#f8fafc)' : 'var(--text-muted,#94a3b8)') + ';');
        de.textContent = d.description || 'Sin descripción aún.';
        inner.appendChild(de);

        inner.appendChild(label('MIEMBRO DESDE'));
        const ms = el('p', 'margin:4px 0 0;font-size:13.5px;color:var(--text-main,#f8fafc);font-variant-numeric:tabular-nums;');
        ms.textContent = memberSinceTxt(d);
        inner.appendChild(ms);

        inner.appendChild(label('GÉNERO'));
        const ge = el('p', 'margin:4px 0 0;font-size:13.5px;color:' + (d.gender ? 'var(--text-main,#f8fafc)' : 'var(--text-muted,#94a3b8)') + ';');
        ge.textContent = d.gender || 'Sin especificar';
        inner.appendChild(ge);

        cardHost.appendChild(inner);
    }

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
            console.error('[MC profile] No se pudo leer users/' + uid, err);
        });
        detach = function () { ref.off('value', h); };
    }

    function buildShell() {
        backdrop = el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:4500;background:rgba(4,10,6,.66);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:Inter,sans-serif;');
        modal = el('div', 'width:440px;max-width:100%;max-height:86vh;overflow-y:auto;position:relative;background:var(--bg-card,#111a13);border:1px solid rgba(74,222,128,.4);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.6);box-sizing:border-box;');

        const x = el('button', 'position:absolute;top:10px;right:10px;z-index:5;width:32px;height:32px;border-radius:50%;border:0;background:rgba(17,26,19,.85);color:#bbf7d0;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;');
        x.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        x.addEventListener('click', function (e) { e.stopPropagation(); close(); });
        modal.appendChild(x);

        statusRow = el('div', 'display:none;align-items:center;gap:8px;padding:14px 18px 0;');
        statusDot = el('span', 'width:9px;height:9px;border-radius:50%;flex:none;');
        statusTxt = el('span', 'font:700 12px Inter,sans-serif;color:var(--mc-accent,#bbf7d0);letter-spacing:.02em;');
        statusRow.appendChild(statusDot);
        statusRow.appendChild(statusTxt);
        modal.appendChild(statusRow);

        cardHost = el('div', 'padding:10px 14px 16px;');
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
        paintLoading();
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

    document.addEventListener('click', function (e) {
        const t = e.target && e.target.closest ? e.target.closest('[data-scsoc-profile]') : null;
        if (!t) return;
        e.stopPropagation();
        const uid = t.dataset.scsocProfile;
        if (!uid) {
            if (MC.toast) MC.toast('Este autor no tiene perfil vinculado.', 'info');
            return;
        }
        open(uid);
    });

    MC.profile = { _loaded: true, open: open, close: close };

    console.log('[Stevscon] mc_profiles.js listo (v1) — panel de perfil completo dentro de StevsMCross.');
})(window, document);
