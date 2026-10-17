/**
 * ====
 * STEVSCON.WIKI — wiki/manage/output/wiki_system.js (v3)
 * SYSTEM: AUTENTICACIÓN y ESCRITURA. Nada de UI salvo validación.
 *  v3 — PERMISOS DUROS:
 *    · Solo el OWNER (steven23hd@gmail.com) y los ADMIN editan la
 *      Wiki. Los MOD y las cuentas sin rango quedan FUERA:
 *      session.isStaff ahora SOLO es true para owner/admin (antes
 *      cualquier entrada de social/staff — mods incluidos — contaba
 *      como staff, y por eso una multicuenta podía editar).
 *    · session.role = 'owner' | 'admin' | '' (útil a futuro).
 *    · Como TODOS los botones (FAB, Editar, sub-páginas) leen
 *      session.isStaff, se ocultan solos para quien no sea
 *      owner/admin — sin tocar wiki_core, wiki_subs ni manage.
 *  v2 — IMÁGENES GRANDES:
 *    · WK.system.shrinkImage(file, opts, cb): acepta archivos de
 *      hasta 20MB y los optimiza en canvas (1920px, JPEG 0.9). Si
 *      la imagen ya entra en el límite, se guarda ORIGINAL.
 * - Crea/edita/borra artículos con SLUG ÚNICO, HISTORIAL automático
 *   (wiki/history) y CONTADOR de páginas (wiki/counters).
 * ====
 */
(function (window, document) {
    'use strict';

    const WK = window.StevsconWiki = window.StevsconWiki || {};
    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const LIMITS = {
        title: 120, summary: 300, body: 20000, tags: 8, tagLen: 24, cover: 20000,
        catName: 32, catIcon: 4,
        imgFile: 20971500 /* 20MB de archivo fuente */
    };

    const db = function () { return firebase.database(); };
    const toast = function (m, k) { if (window.StevsconWiki && window.StevsconWiki.toast) window.StevsconWiki.toast(m, k); };

    function slugify(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'pagina';
    }

    /* ==== OPTIMIZADOR DE IMÁGENES (hasta 20MB de entrada) ====
     * cb(out, err): out = dataURI lista para guardar, err = mensaje.
     * - Archivo > imgFile → error claro.
     * - Si el base64 original ya cabe en targetStr → se usa tal cual
     *   (transparencia PNG y GIFs animados intactos).
     * - Si no: canvas a maxDim + JPEG q0.9 bajando hasta que quepa. */
    function shrinkImage(file, opts, cb) {
        const o = Object.assign({ maxDim: 1920, targetStr: 20000, fileMax: LIMITS.imgFile }, opts || {});
        if (typeof cb !== 'function') cb = opts;
        if (!file) return cb(null, 'No hay archivo.');
        if (file.size && file.size > o.fileMax) {
            return cb(null, 'Esa imagen pasa de ' + Math.round(o.fileMax / 1048576) + 'MB (pesa ' + (file.size / 1048576).toFixed(1) + 'MB).');
        }
        const fr = new FileReader();
        fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
        fr.onload = function () {
            const raw = String(fr.result || '');
            if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) return cb(null, 'Ese archivo no parece una imagen válida.');
            if (raw.length <= o.targetStr) return cb(raw, null); /* ya cabe: original intacto */

            const im = new Image();
            im.onerror = function () { cb(null, 'Ese archivo no parece una imagen válida.'); };
            im.onload = function () {
                try {
                    let dim = o.maxDim, q = 0.9, tries = 0;
                    const step = function () {
                        const sc = Math.min(1, dim / Math.max(im.width, im.height, 1));
                        const cv = document.createElement('canvas');
                        cv.width = Math.max(1, Math.round(im.width * sc));
                        cv.height = Math.max(1, Math.round(im.height * sc));
                        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                        let out = cv.toDataURL('image/jpeg', q);
                        while (out.length > o.targetStr && q > 0.35) {
                            q -= 0.15;
                            out = cv.toDataURL('image/jpeg', q);
                        }
                        if (out.length > o.targetStr && dim > 480 && tries < 4) {
                            tries++; dim = Math.round(dim * 0.7); q = 0.9;
                            return step();
                        }
                        if (out.length > o.targetStr) return cb(null, 'La imagen es demasiado grande incluso optimizada.');
                        cb(out, null);
                    };
                    step();
                } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
            };
            im.src = raw;
        };
        fr.readAsDataURL(file);
    }

    WK.system = {
        session: { user: null, isStaff: false, role: '', name: '', uid: '' },
        shrinkImage: shrinkImage,

        start: function () {
            if (this._started) return;
            this._started = true;
            const self = this;
            try {
                firebase.auth().onAuthStateChanged(function (user) {
                    if (!user) {
                        self.session = { user: null, isStaff: false, role: '', name: '', uid: '' };
                        document.dispatchEvent(new CustomEvent('sc:wiki-auth'));
                        return;
                    }
                    const email = String(user.email || '').toLowerCase();
                    const isOwner = email === OWNER_EMAIL;
                    self.session.user = user;
                    self.session.uid = user.uid;
                    self.session.role = isOwner ? 'owner' : '';
                    self.session.isStaff = isOwner; /* se confirma luego con social/staff */
                    self.session.name = email.split('@')[0] || 'Staff';

                    db().ref('users/' + user.uid).once('value').then(function (s) {
                        const u = s.val() || {};
                        if (u.username || u.handle) self.session.name = u.username || u.handle;
                        document.dispatchEvent(new CustomEvent('sc:wiki-auth'));
                    }).catch(function () {});

                    if (isOwner) { document.dispatchEvent(new CustomEvent('sc:wiki-auth')); return; }

                    /* v3: SOLO role 'admin' gana permisos de Wiki.
                     * El nodo de staff puede ser { role: 'admin' } o
                     * directamente el string 'admin' — se aceptan ambas
                     * formas. Un mod (o cualquier otra cosa) NO cuenta. */
                    db().ref('social/staff/' + user.uid).once('value').then(function (s) {
                        const node = s.val();
                        const role = (node && typeof node === 'object' && node.role)
                            ? String(node.role)
                            : (typeof node === 'string' ? node : '');
                        self.session.role = role === 'admin' ? 'admin' : '';
                        self.session.isStaff = role === 'admin';
                        document.dispatchEvent(new CustomEvent('sc:wiki-auth'));
                    }).catch(function () {
                        document.dispatchEvent(new CustomEvent('sc:wiki-auth'));
                    });
                });
            } catch (e) { console.warn('[Wiki] auth no disponible:', e && e.message); }
        },

        /* ==== VALIDACIONES ==== */
        validateArticle: function (d) {
            if (!d.title || d.title.length > LIMITS.title) return 'El título es obligatorio (máx ' + LIMITS.title + ' caracteres).';
            if (d.summary && d.summary.length > LIMITS.summary) return 'El resumen no puede pasar de ' + LIMITS.summary + ' caracteres.';
            if (!d.body || !d.body.trim()) return 'El cuerpo del artículo no puede estar vacío.';
            if (d.body.length > LIMITS.body) return 'El cuerpo es demasiado largo (máx ' + LIMITS.body + ' caracteres).';
            if (d.cover && d.cover.length > LIMITS.cover) return 'La portada quedó demasiado grande incluso optimizada. Prueba con otra imagen.';
            if (d.cover && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(d.cover) && !/^https:\/\//i.test(d.cover)) return 'La portada debe ser una imagen válida.';
            if (d.tags && d.tags.length > LIMITS.tags) return 'Máximo ' + LIMITS.tags + ' etiquetas.';
            if (!d.category) return 'Elige una categoría.';
            return null;
        },

        uniqueSlug: function (base, excludeId) {
            base = slugify(base);
            return db().ref('wiki/articles').once('value').then(function (s) {
                const arts = s.val() || {};
                const taken = {};
                Object.keys(arts).forEach(function (id) {
                    const a = arts[id];
                    if (a && a.slug) taken[String(a.slug).toLowerCase()] = id;
                });
                if (!taken[base] || taken[base] === excludeId) return base;
                let n = 2;
                while (taken[(base + '-' + n)] && taken[(base + '-' + n)] !== excludeId) n++;
                return base + '-' + n;
            });
        },

        logHistory: function (artId, entry) {
            entry.at = firebase.database.ServerValue.TIMESTAMP;
            entry.by = this.session.uid || 'system';
            entry.byName = this.session.name || 'Staff';
            return db().ref('wiki/history/' + artId).push(entry);
        },

        bumpCounter: function (delta) {
            db().ref('wiki/counters/articles').transaction(function (v) { return (v || 0) + delta; })
                .catch(function () {});
            db().ref('wiki/counters/edits').transaction(function (v) { return (v || 0) + 1; })
                .catch(function () {});
        },

        /* ==== ARTÍCULOS ==== */
        saveArticle: function (data, id) {
            const self = this;
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores pueden editar la Wiki.'));
            const err = this.validateArticle(data);
            if (err) return Promise.reject(new Error(err));

            return this.uniqueSlug(data.title, id).then(function (slug) {
                const now = firebase.database.ServerValue.TIMESTAMP;
                const ref = id ? db().ref('wiki/articles/' + id) : db().ref('wiki/articles').push();

                return (id ? ref.once('value') : Promise.resolve(null)).then(function (snap) {
                    const prev = snap && snap.val();
                    const rec = {
                        title: data.title.trim(),
                        slug: slug,
                        category: data.category,
                        type: data.type || 'libre',
                        summary: (data.summary || '').trim(),
                        cover: data.cover || '',
                        body: data.body,
                        tags: (data.tags || []).join(','),
                        status: data.status === 'draft' ? 'draft' : 'published',
                        featured: !!data.featured,
                        authorUid: (prev && prev.authorUid) || self.session.uid || '',
                        authorName: (prev && prev.authorName) || self.session.name || 'Staff',
                        createdAt: (prev && prev.createdAt) || now,
                        updatedAt: now,
                        views: (prev && prev.views) || 0
                    };

                    const wasPub = !!(prev && prev.status !== 'draft');
                    const isPub = rec.status !== 'draft';
                    return ref.set(rec).then(function () {
                        const logs = [];
                        if (!prev) {
                            logs.push(self.logHistory(ref.key, { action: 'created', title: rec.title }));
                        } else {
                            logs.push(self.logHistory(ref.key, {
                                action: 'edited', title: rec.title,
                                prev: { title: prev.title || '', summary: prev.summary || '', body: String(prev.body || '').slice(0, 20000) }
                            }));
                        }
                        if (!wasPub && isPub) logs.push(self.logHistory(ref.key, { action: 'published', title: rec.title }));
                        if (wasPub && !isPub) logs.push(self.logHistory(ref.key, { action: 'drafted', title: rec.title }));
                        if (!wasPub && isPub) self.bumpCounter(1);
                        if (wasPub && !isPub) self.bumpCounter(-1);
                        return Promise.all(logs).then(function () { return ref.key; });
                    });
                });
            });
        },

        deleteArticle: function (id) {
            const self = this;
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores pueden borrar.'));
            const ref = db().ref('wiki/articles/' + id);
            return ref.once('value').then(function (s) {
                const a = s.val();
                if (!a) return;
                return ref.remove().then(function () {
                    if (a.status !== 'draft') self.bumpCounter(-1);
                    self.logHistory(id, { action: 'deleted', title: a.title || '' }).catch(function () {});
                    return db().ref('wiki/history/' + id).remove().catch(function () {});
                });
            });
        },

        setStatus: function (id, status) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores.'));
            const ref = db().ref('wiki/articles/' + id);
            return ref.once('value').then(function (s) {
                const a = s.val();
                if (!a) return;
                const wasPub = a.status !== 'draft';
                const isPub = status !== 'draft';
                const up = { status: status, updatedAt: firebase.database.ServerValue.TIMESTAMP };
                if (isPub && !a.slug) up.slug = slugify(a.title);
                return ref.update(up).then(function () {
                    self.logHistory(id, { action: isPub ? 'published' : 'drafted', title: a.title || '' }).catch(function () {});
                    if (!wasPub && isPub) self.bumpCounter(1);
                    if (wasPub && !isPub) self.bumpCounter(-1);
                });
            });
        },

        setFeatured: function (id, val) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores.'));
            return db().ref('wiki/articles/' + id + '/featured').set(!!val);
        },

        bumpViews: function (id) {
            try {
                if (!this.session.user) return;
                const flag = 'wk_view_' + id;
                if (sessionStorage.getItem(flag)) return;
                sessionStorage.setItem(flag, '1');
                db().ref('wiki/articles/' + id + '/views').transaction(function (v) { return (v || 0) + 1; })
                    .catch(function () {});
            } catch (e) {}
        },

        /* ==== CATEGORÍAS ==== */
        createCategory: function (name, icon, color, order) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores pueden crear categorías.'));
            name = String(name || '').trim();
            if (!name) return Promise.reject(new Error('La categoría necesita nombre.'));
            if (name.length > LIMITS.catName) return Promise.reject(new Error('Nombre de categoría demasiado largo.'));
            icon = String(icon || '').trim().slice(0, LIMITS.catIcon);

            const slug = slugify(name);
            return db().ref('wiki/categories').once('value').then(function (s) {
                const cats = s.val() || {};
                let ok = true;
                Object.keys(cats).forEach(function (k) {
                    if (cats[k] && String(cats[k].slug).toLowerCase() === slug) ok = false;
                });
                if (!ok) return Promise.reject(new Error('Ya existe una categoría con ese nombre.'));
                return db().ref('wiki/categories').push({
                    name: name, slug: slug, icon: icon || '📁',
                    color: color || '#8b5cf6', order: Number(order) || 0,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            });
        },

        deleteCategory: function (id) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores.'));
            return db().ref('wiki/articles').once('value').then(function (s) {
                const arts = s.val() || {};
                let used = false;
                Object.keys(arts).forEach(function (k) {
                    if (arts[k] && arts[k].category === id) used = true;
                });
                if (used) return Promise.reject(new Error('No puedes borrar: hay artículos en esta categoría.'));
                return db().ref('wiki/categories/' + id).remove();
            });
        }
    };

    console.log('[Stevscon] wiki_system.js listo (v3) — permisos: solo Owner y Admins editan la Wiki.');
})(window, document);