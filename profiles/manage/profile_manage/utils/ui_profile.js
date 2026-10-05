/**
 * ====
 * STEVSCON.COM - profiles/manage/profile_manage/utils/ui_profile.js
 * PERFILES · UTIL · Presets morados + tarjeta de perfil estilo Discord.
 * En Firebase solo van IDs de preset o URLs: los degradados viven AQUÍ.
 * Todo se pinta con textContent y style: cero innerHTML, cero XSS.
 * ====
 */
(function (window, document) {
    'use strict';
    const SCp = window.StevsconProfiles = window.StevsconProfiles || {};
    SCp.ui = SCp.ui || {};

    SCp.presets = {
        avatar: [
            { id: 'g1', css: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
            { id: 'g2', css: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
            { id: 'g3', css: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
            { id: 'g4', css: 'linear-gradient(135deg,#1a1526,#7c3aed)' },
            { id: 'g5', css: 'linear-gradient(135deg,#6d28d9,#22d3ee)' },
            { id: 'g6', css: 'linear-gradient(135deg,#2e1065,#8b5cf6)' }
        ],
        banner: [
            { id: 'b1', css: 'linear-gradient(120deg,#1a1526,#4c1d95)' },
            { id: 'b2', css: 'linear-gradient(120deg,#2e1065,#7c3aed)' },
            { id: 'b3', css: 'linear-gradient(120deg,#0f0a18,#8b5cf6)' },
            { id: 'b4', css: 'linear-gradient(120deg,#4c1d95,#ec4899)' },
            { id: 'b5', css: 'linear-gradient(120deg,#111118,#6d28d9)' },
            { id: 'b6', css: 'linear-gradient(120deg,#2e1065,#a78bfa)' }
        ]
    };

    SCp.ui.presetCss = function (kind, id) {
        const list = SCp.presets[kind] || [];
        for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i].css;
        return list.length ? list[0].css : '#7c3aed';
    };

    // Avatar: imagen si hay URL; degradado + inicial si no.
    SCp.ui.avatarEl = function (data, px, letter) {
        const d = data || {};
        let el;
        if (d.avatarUrl) {
            el = document.createElement('img');
            el.src = d.avatarUrl;
            el.alt = 'Tu avatar';
            el.referrerPolicy = 'no-referrer';
            el.onerror = function () {
                const fbEl = SCp.ui.avatarEl({ avatarPreset: d.avatarPreset || 'g1' }, px, letter);
                if (el.parentNode) el.parentNode.replaceChild(fbEl, el);
            };
        } else {
            el = document.createElement('div');
            el.textContent = letter || 'S';
            el.style.cssText = 'color:#ffffff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(px * 0.44) + 'px;';
        }
        el.style.cssText += 'width:' + px + 'px;height:' + px + 'px;border-radius:50%;object-fit:cover;flex:none;background:' + (d.avatarUrl ? 'transparent' : SCp.ui.presetCss('avatar', d.avatarPreset)) + ';';
        return el;
    };

    // Banner: imagen si hay URL; degradado si no.
    SCp.ui.bannerEl = function (data, height) {
        const d = data || {};
        let el;
        if (d.bannerUrl) {
            el = document.createElement('img');
            el.src = d.bannerUrl;
            el.alt = 'Tu banner';
            el.referrerPolicy = 'no-referrer';
            el.onerror = function () {
                const fbEl = SCp.ui.bannerEl({ bannerPreset: d.bannerPreset || 'b1' }, height);
                if (el.parentNode) el.parentNode.replaceChild(fbEl, el);
            };
        } else {
            el = document.createElement('div');
        }
        el.style.cssText = 'width:100%;height:' + height + ';display:block;object-fit:cover;background:' + (d.bannerUrl ? 'transparent' : SCp.ui.presetCss('banner', d.bannerPreset)) + ';';
        return el;
    };

    function sectionLabel(text) {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.cssText = 'margin:14px 0 0;font-size:10.5px;font-weight:800;letter-spacing:.14em;color:#8f7fc0;';
        return p;
    }

    // Tarjeta completa: banner, avatar, nombre, @handler, ID, descripción,
    // miembro desde y género (abajo de TODO, como pediste).
    SCp.ui.renderProfileCard = function (container, data, authUser, opts) {
        const d = data || {};
        const options = opts || {};
        while (container.firstChild) container.removeChild(container.firstChild);

        const card = document.createElement('div');
        card.style.cssText = 'background:#1a1526;border:1px solid rgba(167,139,250,.35);border-radius:14px;overflow:hidden;color:#ede9fe;font-family:Inter,sans-serif;';

        const bannerWrap = document.createElement('div');
        bannerWrap.style.cssText = 'position:relative;';
        bannerWrap.appendChild(SCp.ui.bannerEl(d, '120px'));

        const inner = document.createElement('div');
        inner.style.cssText = 'padding:0 18px 18px;';

        const avatarRow = document.createElement('div');
        avatarRow.style.cssText = 'display:flex;align-items:flex-end;justify-content:space-between;margin-top:-38px;margin-bottom:10px;position:relative;z-index:2;';
        const letter = (d.username || d.handler || (authUser && authUser.email) || 'S').charAt(0).toUpperCase();
        const av = SCp.ui.avatarEl(d, 76, letter);
        av.style.border = '4px solid #1a1526';
        avatarRow.appendChild(av);
        if (options.actions) avatarRow.appendChild(options.actions);
        inner.appendChild(avatarRow);

        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
        const nameEl = document.createElement('h3');
        nameEl.textContent = d.username || 'Sin nombre';
        nameEl.style.cssText = 'margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.02em;';
        nameRow.appendChild(nameEl);
        if (d.rank && d.rank !== 'USER') {
            const badge = document.createElement('span');
            badge.textContent = d.rank;
            badge.style.cssText = 'padding:3px 10px;border-radius:999px;background:rgba(167,139,250,.16);border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font-size:10.5px;font-weight:800;letter-spacing:.14em;';
            nameRow.appendChild(badge);
        }
        inner.appendChild(nameRow);

        const handlerEl = document.createElement('p');
        handlerEl.textContent = (d.handler ? '@' + d.handler : (authUser && authUser.email) || '');
        handlerEl.style.cssText = 'margin:2px 0 0;font-size:13px;color:#a78bfa;font-weight:600;';
        inner.appendChild(handlerEl);

        if (d.userId) {
            const idRow = document.createElement('div');
            idRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:#8f7fc0;';
            const idLabel = document.createElement('span');
            idLabel.textContent = 'ID';
            idLabel.style.fontWeight = '700';
            const idVal = document.createElement('span');
            idVal.textContent = d.userId;
            idVal.style.cssText = 'color:#ede9fe;font-variant-numeric:tabular-nums;';
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.textContent = 'Copiar';
            copyBtn.style.cssText = 'background:none;border:0;color:#a78bfa;font-family:Inter,sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;padding:0;';
            copyBtn.addEventListener('click', function () {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(d.userId);
                }
                copyBtn.textContent = '¡Copiado!';
                setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 1200);
            });
            idRow.appendChild(idLabel);
            idRow.appendChild(idVal);
            idRow.appendChild(copyBtn);
            inner.appendChild(idRow);
        }

            inner.appendChild(sectionLabel('DESCRIPCIÓN'));
            const desc = document.createElement('p');
            desc.textContent = d.description || 'Sin descripción aún.';
            desc.style.cssText = 'margin:4px 0 0;font-size:13.5px;line-height:1.55;color:' + (d.description ? '#ede9fe' : '#8f7fc0') + ';white-space:pre-wrap;word-break:break-word;';
            if (window.StevsconFormats && d.description) StevsconFormats.paint(desc, d.description);
            inner.appendChild(desc);

        const divider = document.createElement('div');
        divider.style.cssText = 'margin-top:14px;border-top:1px solid rgba(167,139,250,.15);';
        inner.appendChild(divider);

        inner.appendChild(sectionLabel('MIEMBRO DESDE'));
        const since = document.createElement('p');
        since.textContent = SCp.age.memberSince(d, authUser);
        since.style.cssText = 'margin:4px 0 0;font-size:13.5px;color:#ede9fe;font-variant-numeric:tabular-nums;';
        inner.appendChild(since);

        // Género: abajo de todo (después de descripción, avatar y banner)
        inner.appendChild(sectionLabel('GÉNERO'));
        const gen = document.createElement('p');
        gen.textContent = d.gender || 'Sin especificar';
        gen.style.cssText = 'margin:4px 0 0;font-size:13.5px;color:' + (d.gender ? '#ede9fe' : '#8f7fc0') + ';';
        inner.appendChild(gen);

        card.appendChild(bannerWrap);
        card.appendChild(inner);
        container.appendChild(card);
    };
})(window, document);