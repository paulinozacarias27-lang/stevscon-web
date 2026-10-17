/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_subs_system.js (v2)
 * SUBS (SYSTEM): ESCRITURA de sub-artículos. Nada de UI.
 *  v2 — schema ampliado:
 *    · normal  → { body, image, imgPos: 'lado' | 'abajo' }
 *    · lista   → { colsStr, rows: [{t, img, d, x, c}] }
 *      5 columnas con títulos personalizables (la 2 es IMAGEN),
 *      filas con imagen opcional. Hasta 15 filas.
 *    · galeria → { rows: [{img, t, d}] } hasta 15 imágenes.
 *  - Valida TODO antes de tocar Firebase.
 *  - Historial: sub-created / sub-edited / sub-deleted (via WK.system).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const db = function () { return firebase.database(); };

    const RE_HTTPS = new RegExp('^https://', 'i');
    const RE_DATAIMG = new RegExp('^data:image/[a-zA-Z0-9.+-]+;base64,', 'i');

    const LIMITS = {
        title: 120, body: 12000,
        rows: 15, rowT: 100, rowD: 160, rowC: 40, rowX: 2000,
        colN: 5, colT: 32,
        imgStr: 300000, galT: 100, galD: 300
    };

    function isStaff() {
        return !!(WK.system && WK.system.session && WK.system.session.isStaff);
    }
    function validImg(u) {
        u = String(u || '').trim();
        if (RE_HTTPS.test(u)) return u;
        if (RE_DATAIMG.test(u)) return u;
        return '';
    }
    function cleanTxt(s, max) {
        return String(s == null ? '' : s).trim().slice(0, max);
    }
    /* Solo guarda campos con contenido (limpio y liviano en RTDB) */
    function cleanRow(r) {
        r = r || {};
        const out = {};
        const t = cleanTxt(r.t, LIMITS.rowT);
        const img = validImg(r.img || r.image).slice(0, LIMITS.imgStr);
        const d = cleanTxt(r.d, LIMITS.rowD);
        const x = cleanTxt(r.x, LIMITS.rowX);
        const c = cleanTxt(r.c, LIMITS.rowC);
        if (t) out.t = t;
        if (img) out.img = img;
        if (d) out.d = d;
        if (x) out.x = x;
        if (c) out.c = c;
        return out;
    }
    function cleanGal(r) {
        r = r || {};
        const out = {};
        const img = validImg(r.img || r.src || r.image).slice(0, LIMITS.imgStr);
        const t = cleanTxt(r.t, LIMITS.galT);
        const d = cleanTxt(r.d, LIMITS.galD);
        if (img) out.img = img;
        if (t) out.t = t;
        if (d) out.d = d;
        return out;
    }
    function mapRows(rows, fn) {
        const out = [];
        const arr = Array.isArray(rows) ? rows : [];
        for (let i = 0; i < arr.length; i++) out.push(fn(arr[i]));
        return out;
    }

    WK.subsSystem = {
        LIMITS: LIMITS,
        validImg: validImg,

        /* Devuelve null si todo OK, o el texto del error */
        validate: function (d) {
            const L = LIMITS;
            if (!d) return 'No hay nada que guardar.';
            const title = cleanTxt(d.title, L.title + 1);
            if (!title) return 'El sub-artículo necesita un título.';
            if (title.length > L.title) return 'El título no puede pasar de ' + L.title + ' caracteres.';
            if (d.type !== 'normal' && d.type !== 'lista' && d.type !== 'galeria') return 'Tipo de sub-artículo desconocido.';

            if (d.type === 'normal') {
                if (!d.body || !String(d.body).trim()) return 'El texto del sub-artículo no puede estar vacío.';
                if (String(d.body).length > L.body) return 'El texto es demasiado largo (máx ' + L.body + ' caracteres).';
                if (d.image && String(d.image).length > L.imgStr) return 'La imagen pesa demasiado (máx 300KB).';
                if (d.image && !validImg(d.image)) return 'La imagen debe ser una URL https o una imagen válida.';
                if (d.imgPos !== 'lado' && d.imgPos !== 'abajo') return 'Posición de imagen desconocida.';
                return null;
            }

            const rows = Array.isArray(d.rows) ? d.rows : [];
            if (!rows.length) return d.type === 'lista' ? 'Añade al menos una fila a la lista.' : 'Añade al menos una imagen a la galería.';
            if (rows.length > L.rows) return 'Máximo ' + L.rows + ' filas.';

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i] || {};
                if (d.type === 'lista') {
                    const has = cleanTxt(r.t, 1) || validImg(r.img) || cleanTxt(r.d, 1) || cleanTxt(r.x, 1) || cleanTxt(r.c, 1);
                    if (!has) return 'La fila ' + (i + 1) + ' está vacía: rellénala o bórrala.';
                    if (cleanTxt(r.t, L.rowT + 1).length > L.rowT) return 'El título de la fila ' + (i + 1) + ' es demasiado largo.';
                    if (String(r.d || '').length > L.rowD) return 'El texto de la fila ' + (i + 1) + ' es demasiado largo.';
                    if (String(r.x || '').length > L.rowX) return 'Las notas de la fila ' + (i + 1) + ' son demasiado largas.';
                } else {
                    if (!validImg(r.img || r.src || r.image)) return 'La imagen ' + (i + 1) + ' de la galería falta o no es válida.';
                    if (String(r.d || '').length > L.galD) return 'La descripción de la imagen ' + (i + 1) + ' es demasiado larga.';
                }
            }
            return null;
        },

        /* Crea (subId vacío) o edita (subId dado). Promise con el subId */
        save: function (artId, data, subId) {
            if (!isStaff()) return Promise.reject(new Error('Solo el staff puede editar las sub-páginas.'));
            if (!artId) return Promise.reject(new Error('Falta el artículo padre.'));
            const err = this.validate(data);
            if (err) return Promise.reject(new Error(err));

            const now = firebase.database.ServerValue.TIMESTAMP;
            const ref = subId ? db().ref('wiki/subs/' + artId + '/' + subId) : db().ref('wiki/subs/' + artId).push();

            return ref.once('value').then(function (s) {
                const prev = s.val() || {};
                const rec = {
                    type: data.type,
                    title: String(data.title).trim(),
                    authorUid: prev.authorUid || (WK.system.session.uid || ''),
                    authorName: prev.authorName || (WK.system.session.name || 'Staff'),
                    createdAt: prev.createdAt || now,
                    updatedAt: now
                };
                if (data.type === 'normal') {
                    rec.body = String(data.body);
                    const im = validImg(data.image);
                    if (im) rec.image = im;
                    rec.imgPos = data.imgPos === 'lado' ? 'lado' : 'abajo';
                } else if (data.type === 'lista') {
                    const cols = Array.isArray(data.cols) ? data.cols : [];
                    const parts = [];
                    for (let i = 0; i < LIMITS.colN; i++) parts.push(cleanTxt(cols[i], LIMITS.colT));
                    const cs = parts.join('\n');
                    if (cs.replace(/\n/g, '')) rec.colsStr = cs;
                    rec.rows = mapRows(data.rows, cleanRow);
                } else {
                    rec.rows = mapRows(data.rows, cleanGal);
                }
                return ref.set(rec).then(function () {
                    try {
                        if (WK.system && WK.system.logHistory) {
                            WK.system.logHistory(artId, { action: subId ? 'sub-edited' : 'sub-created', title: rec.title });
                        }
                    } catch (e) {}
                    return ref.key;
                });
            });
        },

        remove: function (artId, subId) {
            if (!isStaff()) return Promise.reject(new Error('Solo el staff puede borrar.'));
            if (!artId || !subId) return Promise.reject(new Error('Falta qué sub-página borrar.'));
            const ref = db().ref('wiki/subs/' + artId + '/' + subId);
            return ref.once('value').then(function (s) {
                const a = s.val();
                if (!a) return;
                return ref.remove().then(function () {
                    try {
                        if (WK.system && WK.system.logHistory) {
                            WK.system.logHistory(artId, { action: 'sub-deleted', title: a.title || '' });
                        }
                    } catch (e) {}
                });
            });
        }
    };

    console.log('[Stevscon] wiki_subs_system.js listo (v2) — escritura de sub-artículos.');
})(window, document);