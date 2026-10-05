/**
 * ====
 * STEVSCON.COM — social/manage/output/advanced_system/format_text.js (v1)
 * FORMATOS DE TEXTO estilo Discord — a tono morado Stevscon.
 *  - Negrita **x** · Cursiva *x* o _x_ · Subrayado __x__ · Tachado ~~x~~
 *  - Negrita+Cursiva ***x*** · Spoiler ||x|| (click para revelar)
 *  - Código en línea `x` · Bloque de código ```lenguaje```
 *  - Citas > y >>> (multilínea) · Títulos # ## ###
 *  - Listas - / * (anidadas) y 1. numeradas · Links automáticos
 *  - Pings @handler resaltados (lo que ya hacía richText)
 *  - Escape con backslash: \* \_ \~ \` \| \# \> \\
 *
 * CÓMO SE CONECTA (sin editar NINGÚN otro file del Social):
 *  1) Reemplaza SCSOC.richText() -> posts, comentarios y respuestas
 *     (admin_post.js / comments.js / responses.js lo usan al pintar).
 *  2) Hook 'profilePanel' -> descripción del panel de perfil del Social.
 *  3) API window.StevsconFormats.render/paint -> para la página de
 *     Perfiles (solo descripción) con una línea en ui_profile.js.
 *
 * SEGURIDAD: 100% anti-XSS. Todo texto entra por createTextNode
 * (igual que textContent), JAMÁS innerHTML con datos de usuario.
 * ====
 */
(function (window, document) {
    'use strict';

    const FMT = window.StevsconFormats = { version: '1.0' };

    /* ==== ESTILOS (se inyectan solos — funciona en Social Y en Perfiles) ==== */
    const CSS = [
        '.scfmt{display:block;white-space:pre-wrap;word-break:break-word;font-family:inherit;color:inherit}',
        '.scfmt-b{font-weight:800}.scfmt-i{font-style:italic}',
        '.scfmt-u{text-decoration:underline}.scfmt-s{text-decoration:line-through}',
        '.scfmt-code{background:var(--bg-main,#0d0b14);border:1px solid var(--border-color,#2e2440);border-radius:6px;padding:1px 6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em;color:#c4b5fd;white-space:pre-wrap}',
        '.scfmt-prewrap{display:block;background:#0a0812;border:1px solid var(--border-color,#2e2440);border-radius:12px;padding:10px 12px;margin:6px 0;overflow-x:auto}',
        '.scfmt-lang{display:inline-block;margin-bottom:6px;font:700 9.5px Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd;background:rgba(139,92,246,.16);border:1px solid rgba(139,92,246,.4);border-radius:999px;padding:2px 9px}',
        '.scfmt-pre{margin:0;padding:0;background:transparent;border:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.55;color:#e2d9ff;white-space:pre}',
        '.scfmt-spoiler{background:#251d3a;color:transparent;border-radius:6px;padding:0 6px;cursor:pointer;transition:background .15s ease,color .15s ease}',
        '.scfmt-spoiler:hover{background:#2f2549}',
        '.scfmt-spoiler:not(.scfmt-open),.scfmt-spoiler:not(.scfmt-open) *{color:transparent!important;text-decoration:none!important}',
        '.scfmt-spoiler:not(.scfmt-open) .scfmt-code{background:transparent;border-color:transparent}',
        '.scfmt-spoiler.scfmt-open{background:rgba(139,92,246,.12);color:inherit;cursor:default}',
        '.scfmt-quote{display:block;border-left:3px solid var(--purple-accent,#8b5cf6);background:rgba(139,92,246,.07);border-radius:0 10px 10px 0;padding:5px 12px;margin:5px 0;color:#d6cdf1}',
        '.scfmt-h1,.scfmt-h2,.scfmt-h3{font-weight:800;line-height:1.25;margin:10px 0 4px;color:var(--text-main,#f8fafc)}',
        '.scfmt-h1{font-size:1.5em;padding-bottom:3px;border-bottom:1px solid var(--border-color,#2e2440)}',
        '.scfmt-h2{font-size:1.28em;padding-bottom:3px;border-bottom:1px solid var(--border-color,#2e2440)}',
        '.scfmt-h3{font-size:1.12em}',
        '.scfmt-ul{margin:4px 0;padding-left:22px;display:block}',
        '.scfmt-ul .scfmt-ul{margin:2px 0}',
        '.scfmt-ul li{padding:1px 0}',
        '.scfmt-ul li::marker{color:var(--purple-accent,#8b5cf6);font-weight:800}',
        '.scfmt-link{color:var(--purple-accent,#8b5cf6);font-weight:600;text-decoration:none}',
        '.scfmt-link:hover{text-decoration:underline}',
        '.scfmt-ping{background:rgba(139,92,246,.18);color:#c4b5fd;font-weight:700;border-radius:6px;padding:0 5px}'
    ].join('\n');

    (function injectStyles() {
        if (document.getElementById('scfmt-styles')) return;
        const st = document.createElement('style');
        st.id = 'scfmt-styles';
        st.textContent = CSS;
        document.head.appendChild(st);
    })();

    /* ==== ESCAPES: \* \_ \~ \` \| \# \> \\ (se vuelven char invisible) ==== */
    const ESC = { '*': '\uE001', '_': '\uE002', '~': '\uE003', '`': '\uE004', '|': '\uE005', '#': '\uE006', '>': '\uE007', '\\': '\uE008' };
    const UNESC = { '\uE001': '*', '\uE002': '_', '\uE003': '~', '\uE004': '`', '\uE005': '|', '\uE006': '#', '\uE007': '>', '\uE008': '\\' };
    function escapeSrc(s) { return s.replace(/\\([*_~`|>#\\])/g, function (_, c) { return ESC[c]; }); }
    function plain(s) { return s.replace(/[\uE001-\uE008]/g, function (c) { return UNESC[c] || c; }); }
    function txt(s) { return document.createTextNode(plain(s)); }

    /* ==== REGLAS INLINE (orden = prioridad al empate de posición) ==== */
    function underscoreOK(s, m) {
        const before = m.index > 0 ? s.charAt(m.index - 1) : '';
        const after = s.charAt(m.index + m[0].length) || '';
        return !/[\w_]/.test(before) && !/[\w_]/.test(after);
    }
    function pingOK(s, m) {
        const before = m.index > 0 ? s.charAt(m.index - 1) : '';
        return !/[\w@]/.test(before);
    }
    function trimUrl(u) { while (u && /[.,;:!?)\]}'"]$/.test(u)) u = u.slice(0, -1); return u; }

    const RULES = [
        { tag: 'code', cls: 'scfmt-code', re: /`([^`\n]+)`/g, pre: 1, post: 1, lit: true },
        { tag: 'span', cls: 'scfmt-spoiler', re: /\|\|([\s\S]+?)\|\|/g, pre: 2, post: 2 },
        { wrap: ['b', 'i'], re: /\*\*\*([\s\S]+?)\*\*\*/g, pre: 3, post: 3 },
        { wrap: ['b'], re: /\*\*([\s\S]+?)\*\*/g, pre: 2, post: 2 },
        { wrap: ['u'], re: /__([\s\S]+?)__/g, pre: 2, post: 2 },
        { wrap: ['s'], re: /~~([\s\S]+?)~~/g, pre: 2, post: 2 },
        { wrap: ['i'], re: /\*([^*\n]+)\*/g, pre: 1, post: 1 },
        { wrap: ['i'], re: /_([^_\n]+?)_/g, pre: 1, post: 1, check: underscoreOK },
        { tag: 'a', cls: 'scfmt-link', re: /https?:\/\/[^\s<]+/g, link: true, lit: true },
        { tag: 'span', cls: 'scfmt-ping', re: /@([a-z0-9_.-]{3,20})/gi, ping: true, lit: true, check: pingOK }
    ];

    function findNext(s, pos) {
        let best = null;
        for (let r = 0; r < RULES.length; r++) {
            const rule = RULES[r];
            rule.re.lastIndex = pos;
            let m;
            while ((m = rule.re.exec(s))) {
                if (!m[0].length) { rule.re.lastIndex++; continue; }
                if (rule.check && !rule.check(s, m)) continue;
                let start = m.index, end = start + m[0].length;
                let iS = start + (rule.pre || 0), iE = end - (rule.post || 0);
                if (rule.link) { const u = trimUrl(m[0]); end = start + u.length; iS = start; iE = end; }
                if (!best || start < best.start) best = { rule: rule, start: start, end: end, iS: iS, iE: iE };
                break;   /* primera coincidencia válida de esta regla */
            }
        }
        return best;
    }

    function hostFor(rule) {
        if (rule.wrap) {
            let root = null, host = null;
            for (let i = 0; i < rule.wrap.length; i++) {
                const e = document.createElement('span');
                e.className = 'scfmt-' + rule.wrap[i];
                if (host) host.appendChild(e); else root = e;
                host = e;
            }
            return { root: root, host: host };
        }
        const e = document.createElement(rule.tag || 'span');
        if (rule.cls) e.className = rule.cls;
        if (rule.ping) e.title = 'Mención';
        return { root: e, host: e };
    }

    function parseInline(s, parent) {
        if (!s) return;
        let pos = 0;
        while (pos < s.length) {
            const hit = findNext(s, pos);
            if (!hit) { parent.appendChild(txt(s.slice(pos))); break; }
            if (hit.start > pos) parent.appendChild(txt(s.slice(pos, hit.start)));
            const h = hostFor(hit.rule);
            if (hit.rule.link) {
                const url = s.slice(hit.iS, hit.iE);
                h.root.href = url;
                h.root.target = '_blank';
                h.root.rel = 'noopener noreferrer nofollow';
                h.host.appendChild(txt(url));
            } else if (hit.rule.lit) {
                h.host.appendChild(txt(s.slice(hit.iS, hit.iE)));
            } else {
                parseInline(s.slice(hit.iS, hit.iE), h.host);
            }
            parent.appendChild(h.root);
            pos = hit.end;
        }
    }

    /* ==== BLOQUES: títulos, citas, listas, código, párrafos ==== */
    function isBlockStart(l) {
        return /^\s*```/.test(l) || /^#{1,3}\s/.test(l) || /^>/.test(l) ||
               /^\s*(?:[-*]\s|\d+\.\s)/.test(l);
    }

    function codeBlock(code, lang) {
        const wrap = document.createElement('div');
        wrap.className = 'scfmt-prewrap';
        if (lang) {
            const l = document.createElement('span');
            l.className = 'scfmt-lang';
            l.textContent = lang;
            wrap.appendChild(l);
        }
        const pre = document.createElement('pre');
        pre.className = 'scfmt-pre';
        pre.textContent = plain(code);
        wrap.appendChild(pre);
        return wrap;
    }
    function quote(content) {
        const q = document.createElement('div');
        q.className = 'scfmt-quote';
        parseInline(content, q);
        return q;
    }
    function header(level, content) {
        const h = document.createElement('div');
        h.className = 'scfmt-h' + level;
        parseInline(content, h);
        return h;
    }
    function list(lines, i, indent0) {
        const ordered = /^\s*\d+\.\s/.test(lines[i]);
        const el = document.createElement(ordered ? 'ol' : 'ul');
        el.className = 'scfmt-ul';
        while (i < lines.length) {
            const m = lines[i].match(/^(\s*)(?:[-*]|\d+\.)\s+(.*)$/);
            if (!m) break;
            const ind = m[1].length;
            if (ind < indent0) break;
            if (ind > indent0 && el.lastElementChild) {
                const sub = list(lines, i, ind);
                el.lastElementChild.appendChild(sub.el);
                i = sub.i;
            } else {
                const li = document.createElement('li');
                parseInline(m[2], li);
                el.appendChild(li);
                i++;
            }
        }
        return { el: el, i: i };
    }

    function renderBlocks(s, root) {
        const lines = s.split('\n');
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            /* ``` bloque de código (con o sin lenguaje) ``` */
            const f = line.match(/^\s*```(.*)$/);
            if (f) {
                const lang = f[1].trim();
                const buf = [];
                i++;
                while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
                if (i < lines.length) i++;
                root.appendChild(codeBlock(buf.join('\n'), lang));
                continue;
            }
            /* # ## ### títulos */
            const h = line.match(/^(#{1,3})\s+(.+)$/);
            if (h) { root.appendChild(header(h[1].length, h[2])); i++; continue; }
            /* >>> cita multilínea (hasta el final) */
            if (/^>>>\s?/.test(line)) {
                const buf = [line.replace(/^>>>\s?/, '')];
                i++;
                while (i < lines.length) { buf.push(lines[i]); i++; }
                root.appendChild(quote(buf.join('\n')));
                continue;
            }
            /* > cita (agrupa líneas seguidas) */
            if (/^>\s?/.test(line)) {
                const buf = [];
                while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
                root.appendChild(quote(buf.join('\n')));
                continue;
            }
            /* listas (con anidación por espacios) */
            if (/^\s*(?:[-*]\s|\d+\.\s)/.test(line)) {
                const res = list(lines, i, line.match(/^\s*/)[0].length);
                root.appendChild(res.el);
                i = res.i;
                continue;
            }
            /* párrafo: líneas normales (los saltos se conservan) */
            const buf = [];
            while (i < lines.length && !isBlockStart(lines[i])) { buf.push(lines[i]); i++; }
            while (buf.length && !String(buf[buf.length - 1]).trim()) buf.pop();
            if (buf.length) {
                const p = document.createElement('div');
                parseInline(buf.join('\n'), p);
                root.appendChild(p);
            }
        }
    }

    /* ==== API PÚBLICA ==== */
    FMT.render = function (text) {
        const root = document.createElement('span');
        root.className = 'scfmt';
        try { renderBlocks(escapeSrc(String(text == null ? '' : text)), root); }
        catch (e) { console.error('[Stevscon] format_text:', e); root.textContent = String(text == null ? '' : text); }
        return root;
    };
    /* Pinta texto formateado dentro de un elemento (para Perfiles) */
    FMT.paint = function (el, text) {
        if (!el) return el;
        while (el.firstChild) el.removeChild(el.firstChild);
        el.appendChild(FMT.render(text));
        return el;
    };

    /* ==== INTEGRACIÓN 1 · SOCIAL: posts, comentarios y respuestas ====
     * Reemplaza SCSOC.richText — los files que pintan texto la llaman
     * en vivo, así que NO hay que editar admin_post/comments/responses. */
    if (window.SCSOC) {
        const SCSOC = window.SCSOC;
        const prev = SCSOC.richText;
        SCSOC.fmt = FMT;
        SCSOC.richText = function (text) {
            try { return FMT.render(text); }
            catch (e) {
                console.error('[Stevscon] format_text.js:', e);
                return prev ? prev(text) : document.createTextNode(String(text == null ? '' : text));
            }
        };

        /* ==== INTEGRACIÓN 2 · PANEL DE PERFIL DEL SOCIAL ====
         * La descripción de la tarjeta se pinta como texto plano;
         * aquí la re-formateamos DESPUÉS de cada repaint (el listener
         * de profiles_show se registró antes -> nosotros pintamos detrás). */
        let panelOff = null;
        if (typeof SCSOC.onHook === 'function') {
            SCSOC.onHook('profilePanel', function (uid, modal, cardHost) {
                if (panelOff) { try { panelOff(); } catch (e) {} panelOff = null; }
                if (!uid || !cardHost || typeof firebase === 'undefined') return;
                const ref = firebase.database().ref('users/' + uid);
                const h = ref.on('value', function (s) {
                    if (!cardHost.isConnected) { ref.off('value', h); return; }
                    const raw = s.val() || {};
                    const p = raw.profile || {};
                    const desc = String(p.description || raw.description || '');
                    if (desc) FMT.enhanceTree(cardHost, desc);
                }, function () {});
                panelOff = function () { ref.off('value', h); };
            });
        }
    }

    /* Busca hojas de texto EXACTAMENTE iguales a la descripción y las formatea */
    FMT.enhanceTree = function (host, desc) {
        const all = host.querySelectorAll('p, div, span');
        for (let i = 0; i < all.length; i++) {
            const el = all[i];
            if (el.dataset.scfmtDone) continue;
            if (el.firstElementChild) continue;              /* solo hojas */
            if (el.textContent !== desc) continue;
            el.dataset.scfmtDone = '1';
            FMT.paint(el, desc);
        }
    };

    /* ==== SPOILERS: un solo listener global (click para revelar) ==== */
    document.addEventListener('click', function (e) {
        const t = e.target && e.target.closest ? e.target.closest('.scfmt-spoiler') : null;
        if (t && !t.classList.contains('scfmt-open')) t.classList.add('scfmt-open');
    });

    console.log('[Stevscon] format_text.js listo (v1) — formatos Discord en posts, comentarios, respuestas y descripciones.');
})(window, document);