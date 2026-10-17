/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/formats.js (v1)
 * FORMATS: motor de formato seguro estilo Discord para la wiki.
 * ESCAPE PRIMERO, formato DESPUÉS: el usuario NUNCA inyecta HTML.
 *
 * · FORMATOS DISCORD:
 *   **negrita**   *cursiva*   __subrayado__   ~~tachado~~
 *   `código`      ```bloque de código```      ||spoiler||
 *   # / ## / ### títulos   > cita   - lista   1. lista   ---
 *   [enlace](https://…)    ![](https://imagen)
 *
 * · NUEVOS:
 *   `código`#rrggbb -> caja de código con COLOR personalizado.
 *     El staff PULSA la caja en el artículo -> panel para elegir el
 *     color -> se guarda solo (con historial). También se puede
 *     escribir a mano en el editor: `texto`#ff0000
 *   ==texto== -> resaltado tipo marcador.
 *   Bloques ``` con etiqueta de lenguaje (```js, ```html…).
 *
 * Expone: StevsconWiki.formats.{md, safeUrl, enhance, openColorPanel,
 * tokenize} (alias window.StevsconFormats, listo para reutilizar en
 * posts y sub-posts a futuro). Sin dependencias: usa WK.system solo
 * si hay sesión de staff para guardar el color.
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const F = WK.formats = WK.formats || {};

    F.version = 1;

    /* El texto de `código` va aparte (placeholders) para que NUNCA
       se formatee por dentro y el índice coincida siempre al editar. */
    const PH = /\u0000(\d+)\u0000/g;
    const TOK = /`([^`\n]+)`(?:[ \t]?(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})))?(?![0-9a-fA-F])/g;

    const PRESETS = ['#fbbf24', '#f8fafc', '#000000', '#8b5cf6', '#22c55e',
                     '#60a5fa', '#f87171', '#f472b6', '#2dd4bf', '#94a3b8'];

    /* ==== HELPERS ==== */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* Solo https o imágenes base64 (mismo candado para portadas y cuerpo) */
    F.safeUrl = function (u) {
        u = String(u || '').trim();
        if (/^https:\/\//i.test(u)) return u;
        if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(u)) return u;
        return null;
    };

    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }

    /* ==== TOKENS `código` (con o sin #color) ====
       Recorre el texto línea por línea SALTANDO bloques ```, igual que
       el render: así la caja N del render es la caja N del source. */
    function tokenize(src) {
        const s = String(src == null ? '' : src);
        const out = [];
        let fence = false;
        let start = 0;
        while (start <= s.length) {
            const nl = s.indexOf('\n', start);
            const end = (nl === -1) ? s.length : nl;
            const line = s.slice(start, end);
            const t = line.trim();
            if (/^```/.test(t)) {
                fence = !fence;
            } else if (!fence) {
                TOK.lastIndex = 0;
                let m;
                while ((m = TOK.exec(line)) !== null) {
                    out.push({
                        text: m[1],
                        color: m[2] ? m[2].toLowerCase() : '',
                        start: start + m.index,
                        end: start + m.index + m[0].length
                    });
                }
            }
            if (nl === -1) break;
            start = nl + 1;
        }
        return out;
    }
    F.tokenize = tokenize;

    function expandHex(v) {
        v = String(v || '').trim();
        if (!v) return '';
        if (v.charAt(0) !== '#') v = '#' + v;
        const m = v.match(/^#([0-9a-fA-F]{3})$/);
        if (m) return '#' + m[1].charAt(0) + m[1].charAt(0) + m[1].charAt(1) +
                       m[1].charAt(1) + m[1].charAt(2) + m[1].charAt(2);
        return v.toLowerCase();
    }
    function hexOk(v) { return /^#[0-9a-fA-F]{6}$/.test(v); }

    /* ==== FORMATO RICO (segmento YA con placeholders, se escapa aquí) ==== */
    function rich(s) {
        let t = esc(s);
        t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>\$1</strong>');
        t = t.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '\$1<em>\$2</em>');
        t = t.replace(/__([^_\n]+)__/g, '<u>\$1</u>');
        t = t.replace(/~~([^~\n]+)~~/g, '<del>\$1</del>');
        t = t.replace(/==([^=\n]+)==/g, '<mark class="wk-mark">\$1</mark>');
        t = t.replace(/\|\|([^|\n]+)\|\|/g, '<span class="wk-spoiler" tabindex="0">\$1</span>');
        /* imágenes ANTES que enlaces */
        t = t.replace(/!$$([^$$]*)\]$$([^)\s]+)$$/g, function (m, alt, url) {
            const ok = F.safeUrl(url);
            return ok ? '<img src="' + ok + '" alt="' + alt + '" loading="lazy">' : m;
        });
        t = t.replace(/$$([^$$]+)\]$$([^)\s]+)$$/g, function (m, txt, url) {
            const ok = F.safeUrl(url);
            return ok ? '<a href="' + ok + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>' : m;
        });
        return t;
    }

    function codeHTML(tok, i) {
        const color = tok && tok.color ? tok.color : '';
        return '<code class="wk-code" data-wkci="' + i + '"' +
            (color ? ' data-wkcolor="' + esc(color) + '" style="color:' + esc(color) + '"' : '') +
            '>' + esc(tok ? tok.text : '') + '</code>';
    }

    /* ==== MD: bloque a bloque (títulos, listas, citas, fences…) ==== */
    F.md = function (src) {
        src = String(src == null ? '' : src);
        const tokens = tokenize(src);

        /* tokens -> placeholders (de atrás hacia adelante) */
        let s = src;
        for (let i = tokens.length - 1; i >= 0; i--) {
            s = s.slice(0, tokens[i].start) + '\u0000' + i + '\u0000' + s.slice(tokens[i].end);
        }

        const lines = s.split(/\r?\n/);
        let out = '', list = null, fence = null, buf = [];
        const closeList = function () { if (list) { out += '</' + list + '>'; list = null; } };
        const flushFence = function () {
            if (fence === null) return;
            out += '<pre class="wk-pre"' + (fence ? ' data-lang="' + esc(fence) + '"' : '') +
                '><code>' + esc(buf.join('\n')) + '</code></pre>';
            fence = null; buf = [];
        };

        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();
            if (/^```/.test(t)) {
                if (fence === null) { closeList(); fence = t.replace(/^```/, '').trim(); buf = []; }
                else flushFence();
                continue;
            }
            if (fence !== null) { buf.push(lines[i]); continue; }
            if (!t) { closeList(); continue; }
            if (t === '---') { closeList(); out += '<hr>'; continue; }
            if (t.indexOf('### ') === 0) { closeList(); out += '<h3>' + rich(t.slice(4)) + '</h3>'; continue; }
            if (t.indexOf('## ') === 0) { closeList(); out += '<h2>' + rich(t.slice(3)) + '</h2>'; continue; }
            if (t.indexOf('# ') === 0) { closeList(); out += '<h2>' + rich(t.slice(2)) + '</h2>'; continue; }
            if (t.indexOf('- ') === 0) {
                if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
                out += '<li>' + rich(t.slice(2)) + '</li>'; continue;
            }
            if (/^\d+\.\s/.test(t)) {
                if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; }
                out += '<li>' + rich(t.replace(/^\d+\.\s/, '')) + '</li>'; continue;
            }
            if (t.indexOf('> ') === 0) { closeList(); out += '<blockquote>' + rich(t.slice(2)) + '</blockquote>'; continue; }
            closeList();
            out += '<p>' + rich(t) + '</p>';
        }
        if (fence !== null) flushFence(); /* fence sin cerrar */
        closeList();

        /* placeholders -> cajas de código reales */
        out = out.replace(PH, function (m, i) { return codeHTML(tokens[Number(i)], Number(i)); });
        return out;
    };

    /* ==== CSS (cajas de código, spoilers, marcador, bloques y panel) ==== */
    const CSS = `
    code.wk-code.is-editable{cursor:pointer;transition:box-shadow .15s}
    code.wk-code.is-editable:hover{box-shadow:0 0 0 2px var(--purple-accent,#8b5cf6)}
    .wk-spoiler{background:var(--border-color,#2e2440);color:transparent;border-radius:6px;padding:0 6px;cursor:pointer;transition:background .2s,color .2s;user-select:none}
    .wk-spoiler.is-open{background:var(--bg-hover,#261f36);color:inherit}
    .wk-mark{background:rgba(245,158,11,.28);color:inherit;border-radius:4px;padding:0 4px}
    pre.wk-pre{position:relative;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:14px 16px;margin:12px 0;overflow:auto;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;color:var(--text-main,#f8fafc)}
    pre.wk-pre code{background:none;border:0;padding:0;color:inherit;font-family:inherit}
    pre.wk-pre[data-lang]:not([data-lang=""])::before{content:attr(data-lang);position:absolute;top:6px;right:10px;font:800 9px Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#94a3b8)}
    .wkfmt-ovl{position:fixed;inset:0;z-index:2100;background:rgba(6,4,11,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,sans-serif}
    .wkfmt-panel{width:min(380px,94vw);background:var(--bg-card,#16121f);border:1px solid var(--border-color,#2e2440);border-radius:16px;padding:18px;color:var(--text-main,#f8fafc);box-shadow:0 18px 50px rgba(0,0,0,.5)}
    .wkfmt-panel h3{margin:0 0 4px;font-size:16px}
    .wkfmt-sub{margin:0 0 12px;color:var(--text-muted,#94a3b8);font:600 11.5px Inter,sans-serif}
    .wkfmt-prevbox{display:flex;align-items:center;justify-content:center;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;padding:14px;margin-bottom:12px}
    .wkfmt-prevbox code{font-size:14px}
    .wkfmt-row{display:flex;gap:10px;align-items:center;margin-bottom:12px}
    .wkfmt-row input[type=color]{width:46px;height:38px;border:1px solid var(--border-color,#2e2440);border-radius:10px;background:none;cursor:pointer;padding:2px}
    .wkfmt-row input[type=text]{flex:1;background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:10px;color:var(--text-main,#f8fafc);padding:9px 12px;font:600 13px ui-monospace,Menlo,monospace;outline:0}
    .wkfmt-row input[type=text]:focus{border-color:var(--purple-accent,#8b5cf6)}
    .wkfmt-swatches{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin-bottom:14px}
    .wkfmt-sw{width:100%;height:22px;border-radius:6px;border:1px solid rgba(255,255,255,.14);cursor:pointer;padding:0;transition:transform .12s}
    .wkfmt-sw:hover{transform:scale(1.12)}
    .wkfmt-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    .wkfmt-btn{border:1px solid var(--border-color,#2e2440);background:var(--bg-main,#0d0b14);color:var(--text-main,#f8fafc);border-radius:10px;padding:8px 13px;font:700 12px Inter,sans-serif;cursor:pointer}
    .wkfmt-btn:hover{border-color:var(--purple-accent,#8b5cf6);color:var(--purple-accent,#8b5cf6)}
    .wkfmt-btn.pri{background:linear-gradient(135deg,var(--purple-accent,#8b5cf6),var(--purple-dark,#6d28d9));border-color:transparent;color:#fff}
    .wkfmt-btn.pri:hover{color:#fff}
    .wkfmt-btn.danger{border-color:rgba(239,68,68,.5);color:#f87171}
    .wkfmt-btn[disabled]{opacity:.55;cursor:wait}
    `;
    function injectStyles() {
        if (document.getElementById('wk-formats-style')) return;
        const st = document.createElement('style');
        st.id = 'wk-formats-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ==== PANEL DE COLOR (staff) ==== */
    function toast(m, k) {
        if (window.StevsconWiki && window.StevsconWiki.toast) window.StevsconWiki.toast(m, k);
    }

    function saveColor(art, tokIndex, hex) {
        const a = (art && art.a) || {};
        const src = String(a.body || '');
        const tok = tokenize(src)[tokIndex];
        if (!tok) return Promise.reject(new Error('No encontré ese código en el cuerpo (¿se editó mientras?).'));
        if (!WK.system || !WK.system.saveArticle) return Promise.reject(new Error('El sistema de la wiki no está disponible.'));
        const nb = src.slice(0, tok.start) + '`' + tok.text + '`' + (hex ? hex : '') + src.slice(tok.end);
        return WK.system.saveArticle({
            title: a.title || '',
            category: a.category || '',
            type: a.type || 'libre',
            summary: a.summary || '',
            tags: String(a.tags || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
            cover: a.cover || '',
            body: nb,
            status: a.status || 'published',
            featured: !!a.featured
        }, art.id);
    }

    F.openColorPanel = function (art, tokIndex, tok) {
        if (!tok || document.getElementById('wkfmt-ovl')) return;
        let hex = expandHex(tok.color || '#fbbf24');

        const ovl = el('div', 'wkfmt-ovl');
        ovl.id = 'wkfmt-ovl';
        const p = el('div', 'wkfmt-panel');

        let onKey = null;
        const close = function () {
            if (onKey) document.removeEventListener('keydown', onKey);
            if (ovl.parentNode) ovl.parentNode.removeChild(ovl);
        };

        p.appendChild(el('h3', null, 'Color del código'));
        p.appendChild(el('p', 'wkfmt-sub', 'Se guarda en la página como una edición más (queda en el historial).'));

        const prevBox = el('div', 'wkfmt-prevbox');
        const prev = el('code', 'wk-code');
        prev.textContent = tok.text;
        if (hexOk(hex)) prev.style.color = hex;
        prevBox.appendChild(prev);
        p.appendChild(prevBox);

        const row = el('div', 'wkfmt-row');
        const pick = document.createElement('input');
        pick.type = 'color';
        pick.value = hexOk(hex) ? hex : '#fbbf24';
        const txt = document.createElement('input');
        txt.type = 'text';
        txt.value = hexOk(hex) ? hex : '';
        txt.maxLength = 7;
        txt.spellcheck = false;
        txt.placeholder = '#000000';
        row.appendChild(pick);
        row.appendChild(txt);
        p.appendChild(row);

        function apply(v, from) {
            const h = expandHex(v);
            if (!hexOk(h)) {
                if (from === 'txt') txt.style.borderColor = 'rgba(239,68,68,.6)';
                return false;
            }
            hex = h;
            prev.style.color = h;
            txt.style.borderColor = '';
            if (from !== 'pick') pick.value = h;
            if (from !== 'txt') txt.value = h;
            return true;
        }
        pick.addEventListener('input', function () { apply(pick.value, 'pick'); });
        txt.addEventListener('input', function () { apply(txt.value, 'txt'); });

        const sw = el('div', 'wkfmt-swatches');
        PRESETS.forEach(function (c) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wkfmt-sw';
            b.title = c;
            b.style.background = c;
            b.addEventListener('click', function () { apply(c, 'sw'); });
            sw.appendChild(b);
        });
        p.appendChild(sw);

        const act = el('div', 'wkfmt-actions');
        const bDel = el('button', 'wkfmt-btn danger', 'Quitar color');
        bDel.type = 'button';
        const bCancel = el('button', 'wkfmt-btn', 'Cancelar');
        bCancel.type = 'button';
        const bSave = el('button', 'wkfmt-btn pri', 'Guardar');
        bSave.type = 'button';

        function save(hexVal) {
            bSave.disabled = true;
            bDel.disabled = true;
            saveColor(art, tokIndex, hexVal)
                .then(function () {
                    close();
                    toast(hexVal ? 'Color del código guardado' : 'Color quitado: la caja vuelve al ámbar', 'ok');
                })
                .catch(function (e) {
                    bSave.disabled = false;
                    bDel.disabled = false;
                    toast(e && e.message ? e.message : 'No se pudo guardar el color', 'error');
                });
        }

        bDel.addEventListener('click', function () { save(''); });
        bSave.addEventListener('click', function () { save(hex); });
        bCancel.addEventListener('click', close);

        act.appendChild(bDel);
        act.appendChild(bCancel);
        act.appendChild(bSave);
        p.appendChild(act);

        ovl.appendChild(p);
        ovl.addEventListener('click', function (e) { if (e.target === ovl) close(); });
        onKey = function (e) { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        document.body.appendChild(ovl);
        try { txt.focus(); txt.select(); } catch (e2) {}
    };

    /* ==== ENHANCE: interacción post-render (spoilers + color de código) ==== */
    F.enhance = function (root, art) {
        if (!root) return;
        /* Spoilers: clic o Enter para revelar — para TODOS */
        root.addEventListener('click', function (e) {
            const t = e.target;
            const sp = t && t.closest ? t.closest('.wk-spoiler') : null;
            if (sp) sp.classList.toggle('is-open');
        });
        root.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const t = e.target;
            const sp = t && t.closest ? t.closest('.wk-spoiler') : null;
            if (sp) { e.preventDefault(); sp.classList.toggle('is-open'); }
        });

        /* Color de las cajas `código`: solo STAFF (quien puede guardar) */
        try {
            const staff = !!(WK.system && WK.system.session && WK.system.session.isStaff);
            if (!staff || !art) return;
            const codes = root.querySelectorAll('code.wk-code');
            Array.prototype.forEach.call(codes, function (c) {
                c.classList.add('is-editable');
                c.title = 'Pulsa para elegir el color';
                c.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    const i = Number(c.getAttribute('data-wkci'));
                    const tok = tokenize(String((art.a && art.a.body) || ''))[i];
                    if (!tok) return;
                    F.openColorPanel(art, i, tok);
                });
            });
        } catch (e) { console.warn('[WikiFormats] enhance:', e && e.message); }
    };

    injectStyles();

    window.StevsconFormats = F; /* alias futuro (posts, sub-posts…) */
    console.log('[Stevscon] formats.js listo (v1) — motor de formato de la wiki.');
})(window, document);