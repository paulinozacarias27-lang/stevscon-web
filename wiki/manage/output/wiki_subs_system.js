/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_subs_system.js (v1)
 * SUBS (SYSTEM): ESCRITURA de sub-artículos. Nada de UI.
 * - Guarda/actualiza/borra en wiki/subs/{articleId}/{subId}.
 * - 3 tipos: normal (texto+formatos+imagen), lista (changelog),
 *   galeria (imágenes con título y descripción).
 * - Valida TODO antes de tocar Firebase (límites, tipos, imágenes).
 * - Registra cada cambio en el Historial del artículo vía
 *   WK.system.logHistory (misma barra de historial de siempre).
 * ==== 
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const db = function () { return firebase.database(); };

    const LIMITS = {
        title: 120, body: 12000, rows: 12,
        rowTitle: 100, rowDate: 40, rowChip: 24, rowText: 2000,
        imgStr: 30000, col: 24
    };

    function validImg(u) {
        u = String(u || '').trim();
        return (/^https:\/\//i.test(u) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(u)) ? u : '';
    }

    WK.subsSystem = {
        LIMITS: LIMITS,

        validate: function (d) {
            const L = LIMITS;
            if (!d || !d.title || !d.title.trim()) return 'El sub-artículo necesita un título.';
            if (d.title.length > L.title) return 'El título no puede pasar de ' + L.title + ' caracteres.';
            if (d.type !== 'normal' && d.type !== 'lista' && d.type !== 'galeria') return 'Tipo de sub-artículo desconocido.';

            if (d.type === 'normal') {
                if (!d.body || !d.body.trim()) return 'El texto del sub-artículo no puede estar vacío.';
                if (d.body.length > L.body) return 'El texto es demasiado largo (máx ' + L.body + ' caracteres).';
                if (d.image && String(d.image).length > L.imgStr) return 'La imagen pesa demasiado (sube una más ligera).';
                if (d.image && !validImg(d.image)) return 'La imagen debe ser una URL https o una imagen válida.';
                return null;
            }

            const rows = Array.isArray(d.rows) ? d.rows : [];
            if (!rows.length) return d.type === 'lista' ? 'Añade al menos una fila a la lista.' : 'Añade al menos una imagen a la galería.';
            if (rows.length > L.rows) return 'Máximo ' + L.rows + ' filas.';

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i] || {};
                if (d.type === 'lista') {
                    if (!r.t || !String(r.t).trim()) return 'La fila ' + (i + 1) + ' necesita título.';
                    if (String(r.t).length > L.rowTitle) return 'El título de la fila ' + (i + 1) + ' es demasiado largo.';
                    if (String(r.d || '').length > L.rowDate) return 'La fecha de la fila ' + (i + 1) + ' es demasiado larga.';
                    if (String(r.x || '').length > L.rowChip) return 'La etiqueta de la fila ' + (i + 1) + ' es demasiado larga.';
                    if (String(r.n || '').length > L.rowText) return 'Las notas de la fila ' + (i + 1) + ' son demasiado largas.';
                } else {
                    const im = validImg(r.i || '');
                    if (!im && !String(r.t || '').trim()) return 'La imagen ' + (i + 1) + ' necesita imagen o título.';
                    if (String(r.i || '').length > L.imgStr) return 'La imagen ' + (i + 1) + ' pesa demasiado.';
                    if (String(r.i || '') && !im) return 'La imagen ' + (i + 1) + ' debe ser una URL https o una imagen válida.';
                    if (String(r.t || '').length > L.rowTitle) return 'El título de la imagen ' + (i + 1) + ' es demasiado largo.';
                    if (String(r.n || '').length > L.rowText) return 'La descripción de la imagen ' + (i + 1) + ' es demasiado larga.';
                }
            }
            if (d.type === 'lista' && Array.isArray(d.cols)) {
                for (let j = 0; j < d.cols.length; j++) {
                    if (String(d.cols[j] || '').length > L.col) return 'El nombre de columna es demasiado largo.';
                }
            }
            return null;
        },

        save: function (articleId, data, subId) {
            if (!articleId) return Promise.reject(new Error('Falta el artículo padre.'));
            if (!WK.system.session.isStaff) return Promise.reject(new Error('Solo el staff puede editar las sub-páginas.'));
            const err = this.validate(data);
            if (err) return Promise.reject(new Error(err));

            const clean = {
                type: data.type,
                title: data.title.trim(),
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };

            if (data.type === 'normal') {
                clean.body = data.body;
                clean.image = validImg(data.image || '');
                clean.imagePos = data.imagePos === 'side' ? 'side' : 'below';
            } else if (data.type === 'lista') {
                clean.cols = (data.cols || []).map(function (c) { return String(c || '').trim().slice(0, LIMITS.col); });
                clean.rows = (data.rows || []).map(function (r) {
                    return {
                        t: String(r.t || '').trim().slice(0, LIMITS.rowTitle),
                        d: String(r.d || '').trim().slice(0, LIMITS.rowDate),
                        x: String(r.x || '').trim().slice(0, LIMITS.rowChip),
                        n: String(r.n || '').slice(0, LIMITS.rowText)
                    };
                });
            } else {
                clean.rows = (data.rows || []).map(function (r) {
                    return {
                        i: validImg(r.i || ''),
                        t: String(r.t || '').trim().slice(0, LIMITS.rowTitle),
                        n: String(r.n || '').slice(0, LIMITS.rowText)
                    };
                });
            }

            const ref = subId ? db().ref('wiki/subs/' + articleId + '/' + subId)
                              : db().ref('wiki/subs/' + articleId).push();
            return (subId ? ref.once('value') : Promise.resolve(null)).then(function (s) {
                const prev = s && s.val();
                clean.authorUid = (prev && prev.authorUid) || (WK.system.session.uid || '');
                clean.authorName = (prev && prev.authorName) || (WK.system.session.name || 'Staff');
                clean.createdAt = (prev && prev.createdAt) || firebase.database.ServerValue.TIMESTAMP;
                clean.order = (prev && prev.order) || firebase.database.ServerValue.TIMESTAMP;
                return ref.set(clean).then(function () {
                    if (WK.system.logHistory) {
                        WK.system.logHistory(articleId, {
                            action: subId ? 'sub-edited' : 'sub-created',
                            title: clean.title
                        }).catch(function () {});
                    }
                    return ref.key;
                });
            });
        },

        del: function (articleId, subId) {
            if (!WK.system.session.isStaff) return Promise.reject(new Error('Solo el staff.'));
            const ref = db().ref('wiki/subs/' + articleId + '/' + subId);
            return ref.once('value').then(function (s) {
                const a = s.val();
                return ref.remove().then(function () {
                    if (a && WK.system.logHistory) {
                        WK.system.logHistory(articleId, { action: 'sub-deleted', title: a.title || '' }).catch(function () {});
                    }
                });
            });
        }
    };

    console.log('[Stevscon] wiki_subs_system.js listo (v1) — escritura de sub-artículos.');
})(window, document);