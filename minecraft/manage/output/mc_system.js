/**
 * ====
 * STEVSCON.MCROSS — minecraft/manage/output/mc_system.js (v1)
 * SYSTEM: AUTENTICACIÓN y ESCRITURA. Nada de UI salvo validación.
 *  - Permisos duros: solo el OWNER (steven23hd@gmail.com) y los
 *    ADMIN escriben StevsMCross. session.isStaff SOLO es true para
 *    owner/admin. session.role = 'owner' | 'admin' | ''.
 *  - shrinkImage: acepta cualquier imagen hasta 20MB y NUNCA falla
 *    por tamaño: escalera de tamaños (1920→64px) x calidades
 *    (0.9→0.35) hasta que SIEMPRE converge bajo 9MB. Los GIFs se
 *    guardan originales (animados) si caben bajo el techo.
 *  - ÚNICO error posible: que el multimedia sea un VIDEO.
 *  - saveArticle guarda páginas con portada y lo usa mc_formats para
 *    los códigos de color; historial en mc/history y contadores.
 *  - Dispara sc:mc-auth al cambiar la sesión.
 * ====
 */
(function (window, document) {
    'use strict';

    const MC = window.StevsconMC = window.StevsconMC || {};
    const OWNER_EMAIL = 'steven23hd@gmail.com';
    const LIMITS = {
        title: 120, summary: 300, body: 20000, tags: 8, tagLen: 24,
        cover: 9000000,
        catName: 32, catIcon: 4,
        imgFile: 20971500
    };
    const VIDEO_MSG = 'Eso es un video: solo se permiten imágenes (hasta 20MB). Los GIFs sí cuentan como imágenes.';

    const db = function () { return firebase.database(); };
    const toast = function (m, k) { if (window.StevsconMC && window.StevsconMC.toast) window.StevsconMC.toast(m, k); };

    function slugify(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'pagina';
    }

    function shrinkImage(file, opts, cb) {
        const o = Object.assign({
            maxDim: 1920,
            targetStr: 2000000,
            hardStr: 9000000,
            fileMax: LIMITS.imgFile
        }, opts || {});
        if (typeof cb !== 'function') cb = opts;
        if (!file) return cb(null, 'No hay archivo.');
        if (file.type && /^video\//i.test(file.type)) return cb(null, VIDEO_MSG);
        if (file.size && file.size > o.fileMax) {
            return cb(null, 'Esa imagen pasa de ' + Math.round(o.fileMax / 1048576) + 'MB (pesa ' + (file.size / 1048576).toFixed(1) + 'MB). Ese es el único límite.');
        }
        const fr = new FileReader();
        fr.onerror = function () { cb(null, 'No se pudo leer la imagen.'); };
        fr.onload = function () {
            const raw = String(fr.result || '');
            if (/^data:video\//i.test(raw)) return cb(null, VIDEO_MSG);
            if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) return cb(null, 'Ese archivo no es una imagen válida (solo imágenes; los GIFs sí valen).');
            if (raw.length <= o.targetStr) return cb(raw, null);
            const isGif = /^data:image\/gif;base64,/i.test(raw);

            const im = new Image();
            im.onerror = function () { cb(null, 'Ese archivo no es una imagen válida.'); };
            im.onload = function () {
                try {
                    if (isGif && raw.length <= o.hardStr) return cb(raw, null);

                    const Qs = [0.9, 0.75, 0.6, 0.45, 0.35];
                    let best = null;
                    for (let dim = o.maxDim; dim >= 64; dim = Math.round(dim * 0.7)) {
                        const sc = Math.min(1, dim / Math.max(im.width, im.height, 1));
                        const cv = document.createElement('canvas');
                        cv.width = Math.max(1, Math.round(im.width * sc));
                        cv.height = Math.max(1, Math.round(im.height * sc));
                        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                        for (let qi = 0; qi < Qs.length; qi++) {
                            const out = cv.toDataURL('image/jpeg', Qs[qi]);
                            if (out.length <= o.targetStr) return cb(out, null);
                            if (out.length <= o.hardStr) { best = out; break; }
                        }
                        if (best) break;
                    }
                    if (best) {
                        if (isGif) toast('Ese GIF era gigante: se guardó como imagen fija para que StevsMCross pudiera almacenarlo.', 'ok');
                        return cb(best, null);
                    }
                    cb(null, 'No se pudo procesar la imagen (caso extremo). Prueba con otra.');
                } catch (e) { cb(null, 'No se pudo procesar la imagen.'); }
            };
            im.src = raw;
        };
        fr.readAsDataURL(file);
    }

    MC.system = {
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
                        document.dispatchEvent(new CustomEvent('sc:mc-auth'));
                        return;
                    }
                    const email = String(user.email || '').toLowerCase();
                    const isOwner = email === OWNER_EMAIL;
                    self.session.user = user;
                    self.session.uid = user.uid;
                    self.session.role = isOwner ? 'owner' : '';
                    self.session.isStaff = isOwner;
                    self.session.name = email.split('@')[0] || 'Staff';

                    db().ref('users/' + user.uid).once('value').then(function (s) {
                        const u = s.val() || {};
                        if (u.username || u.handle) self.session.name = u.username || u.handle;
                        document.dispatchEvent(new CustomEvent('sc:mc-auth'));
                    }).catch(function () {});

                    if (isOwner) { document.dispatchEvent(new CustomEvent('sc:mc-auth')); return; }

                    db().ref('social/staff/' + user.uid).once('value').then(function (s) {
                        const node = s.val();
                        const role = (node && typeof node === 'object' && node.role)
                            ? String(node.role)
                            : (typeof node === 'string' ? node : '');
                        self.session.role = role === 'admin' ? 'admin' : '';
                        self.session.isStaff = role === 'admin';
                        document.dispatchEvent(new CustomEvent('sc:mc-auth'));
                    }).catch(function () {
                        document.dispatchEvent(new CustomEvent('sc:mc-auth'));
                    });
                });
            } catch (e) { console.warn('[StevsMCross] auth no disponible:', e && e.message); }
        },

        validateArticle: function (d) {
            if (!d.title || d.title.length > LIMITS.title) return 'El título es obligatorio (máx ' + LIMITS.title + ' caracteres).';
            if (d.summary && d.summary.length > LIMITS.summary) return 'El resumen no puede pasar de ' + LIMITS.summary + ' caracteres.';
            if (!d.body || !d.body.trim()) return 'El cuerpo del artículo no puede estar vacío.';
            if (d.body.length > LIMITS.body) return 'El cuerpo es demasiado largo (máx ' + LIMITS.body + ' caracteres).';
            if (d.cover && /^data:video\//i.test(d.cover)) return 'La portada no puede ser un video: solo imágenes (los GIFs sí valen).';
            if (d.cover && d.cover.length > LIMITS.cover) return 'La portada pasa de 9MB incluso optimizada. Prueba con otra imagen.';
            if (d.cover && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(d.cover) && !/^https:\/\//i.test(d.cover)) return 'La portada debe ser una imagen válida.';
            if (d.tags && d.tags.length > LIMITS.tags) return 'Máximo ' + LIMITS.tags + ' etiquetas.';
            if (!d.category) return 'Elige una categoría.';
            return null;
        },

        uniqueSlug: function (base, excludeId) {
            base = slugify(base);
            return db().ref('mc/pages').once('value').then(function (s) {
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
            return db().ref('mc/history/' + artId).push(entry);
        },

        bumpCounter: function (delta) {
            db().ref('mc/counters/articles').transaction(function (v) { return (v || 0) + delta; })
                .catch(function () {});
            db().ref('mc/counters/edits').transaction(function (v) { return (v || 0) + 1; })
                .catch(function () {});
        },

        saveArticle: function (data, id) {
            const self = this;
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores pueden editar StevsMCross.'));
            const err = this.validateArticle(data);
            if (err) return Promise.reject(new Error(err));

            return this.uniqueSlug(data.title, id).then(function (slug) {
                const now = firebase.database.ServerValue.TIMESTAMP;
                const ref = id ? db().ref('mc/pages/' + id) : db().ref('mc/pages').push();

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
            const ref = db().ref('mc/pages/' + id);
            return ref.once('value').then(function (s) {
                const a = s.val();
                if (!a) return;
                return ref.remove().then(function () {
                    if (a.status !== 'draft') self.bumpCounter(-1);
                    self.logHistory(id, { action: 'deleted', title: a.title || '' }).catch(function () {});
                    return db().ref('mc/history/' + id).remove().catch(function () {});
                });
            });
        },

        setStatus: function (id, status) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores.'));
            const ref = db().ref('mc/pages/' + id);
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
            return db().ref('mc/pages/' + id + '/featured').set(!!val);
        },

        bumpViews: function (id) {
            try {
                if (!this.session.user) return;
                const flag = 'mc_view_' + id;
                if (sessionStorage.getItem(flag)) return;
                sessionStorage.setItem(flag, '1');
                db().ref('mc/pages/' + id + '/views').transaction(function (v) { return (v || 0) + 1; })
                    .catch(function () {});
            } catch (e) {}
        },

        createCategory: function (name, icon, color, order) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores pueden crear categorías.'));
            name = String(name || '').trim();
            if (!name) return Promise.reject(new Error('La categoría necesita nombre.'));
            if (name.length > LIMITS.catName) return Promise.reject(new Error('Nombre de categoría demasiado largo.'));
            icon = String(icon || '').trim().slice(0, LIMITS.catIcon);

            const slug = slugify(name);
            return db().ref('mc/categories').once('value').then(function (s) {
                const cats = s.val() || {};
                let ok = true;
                Object.keys(cats).forEach(function (k) {
                    if (cats[k] && String(cats[k].slug).toLowerCase() === slug) ok = false;
                });
                if (!ok) return Promise.reject(new Error('Ya existe una categoría con ese nombre.'));
                return db().ref('mc/categories').push({
                    name: name, slug: slug, icon: icon || '📁',
                    color: color || '#8b5cf6', order: Number(order) || 0,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            });
        },

        deleteCategory: function (id) {
            if (!this.session.isStaff) return Promise.reject(new Error('Solo el Owner y los Administradores.'));
            return db().ref('mc/pages').once('value').then(function (s) {
                const arts = s.val() || {};
                let used = false;
                Object.keys(arts).forEach(function (k) {
                    if (arts[k] && arts[k].category === id) used = true;
                });
                if (used) return Promise.reject(new Error('No puedes borrar: hay artículos en esta categoría.'));
                return db().ref('mc/categories/' + id).remove();
            });
        }
    };

    console.log('[Stevscon] mc_system.js listo (v1) — cualquier imagen hasta 20MB, cero errores de tamaño (solo se rechazan videos).');
})(window, document);