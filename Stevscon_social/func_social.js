// Variable global para rastrear el ID del comentario al que se responde e imagen adjunta temporal
const respuestasEnCurso = {};
let imagenPostTemporal = "";

// Guarda una publicación concreta en la nube (sin pisar las demás)
function persistirPost(post) {
    if (post && typeof guardarPost === 'function') {
        guardarPost(post);
    } else if (typeof guardarPosts === 'function') {
        guardarPosts();
    }
}

function initSocialLogic() {
    renderizarFeed();
    if (typeof actualizarNotificacionesGlobales === 'function') {
        actualizarNotificacionesGlobales();
    }
}

function manejarEnterPost(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        crearPost();
    }
}

function previewImagenPost(event) {
    const file = event.target.files[0];
    const label = document.getElementById('nombreImagenSeleccionada');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagenPostTemporal = e.target.result;
            if (label) label.textContent = `📷 ${file.name}`;
        };
        reader.readAsDataURL(file);
    } else {
        imagenPostTemporal = "";
        if (label) label.textContent = "";
    }
}

function renderizarFeed() {
    const feed = document.getElementById('feedContainer');
    if (!feed) return;

    // Deduplicación forzada por ID para evitar publicaciones repetidas por sincronización
    const postsUnicos = [];
    const idsVistos = new Set();
    if (Array.isArray(postsData)) {
        for (const p of postsData) {
            if (p && p.id && !idsVistos.has(p.id)) {
                idsVistos.add(p.id);
                postsUnicos.push(p);
            }
        }
        postsData = postsUnicos;
    }
    
    feed.innerHTML = '';
    const postsInvertidos = [...postsData].reverse();
    
    postsInvertidos.forEach(post => {
        feed.innerHTML += getPostHTML(post); 
    });
}

function crearPost() {
    if (typeof sesionActual === 'undefined' || !sesionActual) {
        alert("Debes iniciar sesión para publicar.");
        return;
    }
    
    if (sesionActual.rol !== 'admin' && sesionActual.rol !== 'owner') {
        alert("Permiso denegado: Solo los administradores o el propietario pueden crear publicaciones.");
        return;
    }

    const input = document.getElementById('nuevoPostTexto');
    const texto = input ? input.value.trim() : "";
    if (texto === "" && !imagenPostTemporal) return; 

    // Evitar envío doble rápido
    const btnPublicar = document.getElementById('btnPublicar');
    if (btnPublicar) btnPublicar.disabled = true;

    const nuevoPost = {
        id: Date.now(), 
        author: sesionActual.nombre,
        handle: sesionActual.handle || "",
        avatar: sesionActual.avatar || "", 
        rol: sesionActual.rol,
        verified: sesionActual.verified,
        date: Date.now(),
        content: texto,
        image: imagenPostTemporal || "",
        likedBy: [],
        comments: []
    };

    postsData.push(nuevoPost);
    persistirPost(nuevoPost);

    if (input) input.value = ''; 
    imagenPostTemporal = "";
    
    const inputImg = document.getElementById('inputImagenPost');
    if (inputImg) inputImg.value = '';
    const labelImg = document.getElementById('nombreImagenSeleccionada');
    if (labelImg) labelImg.textContent = '';

    renderizarFeed();

    if (btnPublicar) btnPublicar.disabled = false;
}

function editarPost(postId) {
    togglePostMenu(postId);
    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post) return;

    cerrarModalEditarPost();

    const modalHTML = `
    <div id="modal-editar-post" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="cerrarModalEditarPost(event)">
        <div class="card" style="width: 90%; max-width: 500px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.9); position: relative;" onclick="event.stopPropagation()">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-pen-to-square" style="color: var(--purple-accent);"></i> Editar Publicación
                </h3>
                <button onclick="cerrarModalEditarPost()" style="background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <textarea id="texto-editar-post" class="post-textarea" style="width: 100%; min-height: 120px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); padding: 12px; font-size: 1rem; resize: vertical; outline: none; font-family: inherit;">${post.content}</textarea>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                <button class="btn btn-outline" onclick="cerrarModalEditarPost()" style="padding: 8px 18px;">
                    Cancelar
                </button>
                <button class="btn btn-primary" onclick="guardarEdicionPost(${post.id})" style="padding: 8px 18px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Cambios
                </button>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const textarea = document.getElementById('texto-editar-post');
    if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

function guardarEdicionPost(postId) {
    const textarea = document.getElementById('texto-editar-post');
    if (!textarea) return;

    const nuevoTexto = textarea.value.trim();
    if (nuevoTexto === "") {
        alert("La publicación no puede quedar vacía.");
        return;
    }

    const post = postsData.find(p => String(p.id) === String(postId));
    if (post) {
        post.content = nuevoTexto;
        persistirPost(post);
        cerrarModalEditarPost();
        renderizarFeed();
    }
}

function cerrarModalEditarPost(event) {
    if (event && event.target.id !== 'modal-editar-post') return;
    const modal = document.getElementById('modal-editar-post');
    if (modal) modal.remove();
}

function borrarPost(postId) {
    togglePostMenu(postId);
    const confirmar = confirm("¿Estás seguro de que deseas eliminar esta publicación?");
    if (confirmar) {
        if (typeof eliminarPostGlobal === 'function') {
            eliminarPostGlobal(postId);
        } else {
            postsData = postsData.filter(p => p.id !== postId);
        }
        renderizarFeed(); 
    }
}

function toggleLike(postId) {
    if (typeof sesionActual === 'undefined' || !sesionActual) {
        alert("🔒 Inicia sesión para dar 'Me gusta'.");
        return;
    }

    // Comparación flexible: postId puede venir como número o string desde el onclick
    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post) return;

    if (!Array.isArray(post.likedBy)) {
        post.likedBy = [];
    }

    const userHandle = sesionActual.handle;
    const index = post.likedBy.indexOf(userHandle);

    if (index !== -1) {
        post.likedBy.splice(index, 1);
    } else {
        post.likedBy.push(userHandle);
    }

    persistirPost(post);
    renderizarFeed();
}

function toggleComments(postId) {
    const commentsArea = document.getElementById(`comments-area-${postId}`);
    if (commentsArea) commentsArea.classList.toggle('hidden');
}

function iniciarChatCon(handle) {
    const modal = document.getElementById('mini-perfil-social');
    if (modal) modal.remove();
    
    if (typeof cargarCategoria === 'function') {
        cargarCategoria('messengers');
    }
    setTimeout(() => {
        if (typeof abrirChat === 'function') {
            abrirChat(handle);
        }
    }, 100);
}

function irAlChatDesdeSocial(handle) {
    iniciarChatCon(handle);
}

// Visualizador de perfiles — busca en la nube (Firebase) para que funcione en cualquier dispositivo
async function abrirPerfilRapido(nombreAutor, avatarURL, rol, handleAutor) {
    const cleanAutor = nombreAutor ? nombreAutor.replace('@', '').trim().toLowerCase() : '';
    const cleanHandle = handleAutor ? handleAutor.replace('@', '').trim().toLowerCase() : cleanAutor;

    // Cerrar cualquier modal previo
    const modalPrevio = document.getElementById('mini-perfil-social');
    if (modalPrevio) modalPrevio.remove();

    // Mostrar modal de carga
    document.body.insertAdjacentHTML('beforeend', `
    <div id="mini-perfil-social" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="cerrarMiniPerfil(event)">
        <div class="card" style="width: 90%; max-width: 350px; padding: 40px; text-align: center; border-radius: 16px;" onclick="event.stopPropagation()">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--purple-accent);"></i>
            <p style="color: var(--text-muted); margin-top: 15px; font-size: 0.9rem;">Cargando perfil...</p>
        </div>
    </div>`);

    // Timeout de seguridad: si pasa 5s, quitar el modal de carga si sigue ahí
    const timeoutSeguridad = setTimeout(() => {
        const m = document.getElementById('mini-perfil-social');
        if (m) {
            const spinner = m.querySelector('.fa-spinner');
            if (spinner) m.remove();
        }
    }, 5000);

    try {
        let usuario = null;

        function buscarEnLista(lista) {
            if (!Array.isArray(lista)) return null;
            return lista.find(u => u && (
                (u.handle && u.handle.replace('@', '').trim().toLowerCase() === cleanHandle) ||
                (u.nombre && u.nombre.toLowerCase() === cleanAutor) ||
                (u.gmail && u.gmail.toLowerCase() === cleanAutor)
            )) || null;
        }

        // 1. Sesión activa
        const sesionLocal = (typeof sesionActual !== 'undefined' && sesionActual) ? sesionActual : null;
        if (sesionLocal && (
            (sesionLocal.handle && sesionLocal.handle.replace('@', '').trim().toLowerCase() === cleanHandle) ||
            (sesionLocal.nombre && sesionLocal.nombre.toLowerCase() === cleanAutor)
        )) {
            usuario = sesionLocal;
        }

        // 2. Caché global local
        if (!usuario && typeof obtenerUsuariosGlobales === 'function') {
            usuario = buscarEnLista(obtenerUsuariosGlobales());
        }

        // 3. Esperar sincronización de Firebase
        if (!usuario && typeof esperarSincronizacionGlobal === 'function') {
            await esperarSincronizacionGlobal(4000);
            if (typeof obtenerUsuariosGlobales === 'function') {
                usuario = buscarEnLista(obtenerUsuariosGlobales());
            }
        }

        // 4. Buscar directamente en Firebase por handle
        if (!usuario && typeof db !== 'undefined' && db) {
            try {
                const clave = typeof claveHandle === 'function' ? claveHandle(handleAutor || nombreAutor) : cleanHandle;
                const snapshot = await db.ref('accounts/' + clave).once('value');
                if (snapshot.val()) usuario = snapshot.val();
            } catch (e) { /* Firebase no listo */ }
        }

        // 5. Descargar todas las cuentas de Firebase
        if (!usuario && typeof db !== 'undefined' && db) {
            try {
                const snapshot = await db.ref('accounts').once('value');
                const data = snapshot.val();
                if (data) {
                    const lista = typeof normalizarLista === 'function' ? normalizarLista(data) : Object.values(data);
                    usuario = buscarEnLista(lista);
                }
            } catch (e) { /* sin conexión */ }
        }

        // 6. Fallback con los datos del parámetro
        if (!usuario) {
            usuario = {
                nombre: nombreAutor || "Usuario",
                handle: handleAutor || nombreAutor || "@usuario",
                avatar: avatarURL || "",
                banner: "",
                descripcion: "¡Hola! Estoy usando Stevscon.",
                rol: rol || "user"
            };
        }

        // Renderizar el modal real
        const targetHandle = usuario.handle ? usuario.handle : (handleAutor || nombreAutor);
        const displayHandle = targetHandle.startsWith('@') ? targetHandle.slice(1) : targetHandle;

        const finalAvatar = usuario.avatar || avatarURL || "";
        const avatarImg = (finalAvatar && finalAvatar !== "undefined" && finalAvatar !== "")
            ? `<img src="${finalAvatar}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:2.2rem; font-weight:bold; background:var(--bg-card); color: var(--purple-accent);">${(usuario.nombre || nombreAutor || '?').charAt(0).toUpperCase()}</div>`;

        const bannerStyle = usuario.banner
            ? `background-image: url('${usuario.banner}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, var(--purple-dark, #2b1842), var(--purple-accent, #8b5cf6));`;

        const userDescRaw = usuario.descripcion ? usuario.descripcion : "¡Hola! Estoy usando Stevscon.";
        const userDesc = typeof formatearTexto === 'function' ? formatearTexto(userDescRaw) : userDescRaw;

        const verifiedBadge = typeof getVerifiedBadgeHTML === 'function' ? getVerifiedBadgeHTML(usuario) : '';
        const badgesHTML = typeof renderBadgesHTML === 'function' ? renderBadgesHTML(usuario) : '';

        let infoExtraHTML = "";
        if (usuario.cumpleanos || usuario.genero || usuario.edad) {
            const items = [];
            if (usuario.cumpleanos) items.push(`<span><i class="fa-solid fa-cake-candles"></i> ${usuario.cumpleanos}</span>`);
            if (usuario.edad) items.push(`<span><i class="fa-solid fa-user-clock"></i> ${usuario.edad} años</span>`);
            if (usuario.genero) items.push(`<span><i class="fa-solid fa-venus-mars"></i> ${usuario.genero}</span>`);
            infoExtraHTML = `<div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 18px; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 8px;">${items.join(' <span style="opacity:0.3;">•</span> ')}</div>`;
        }

        const btnCerrar = typeof getBotonCerrarHomeHTML === 'function'
            ? getBotonCerrarHomeHTML()
            : `<button onclick="cerrarMiniPerfil()" style="background: rgba(0,0,0,0.5); border: none; color: white; border-radius: 50%; width: 28px; height: 28px; cursor: pointer;">✕</button>`;

        // Quitar el modal de carga antes de insertar el real
        const modalCarga = document.getElementById('mini-perfil-social');
        if (modalCarga) modalCarga.remove();

        document.body.insertAdjacentHTML('beforeend', `
        <div id="mini-perfil-social" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="cerrarMiniPerfil(event)">
            <div class="card" style="width: 90%; max-width: 350px; padding: 0; overflow: hidden; position: relative; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.9); cursor: default; border: 1px solid var(--border-color, rgba(255,255,255,0.1));" onclick="event.stopPropagation()">
                <div style="height: 110px; width: 100%; ${bannerStyle} position: relative;">
                    <div style="position: absolute; top: 10px; right: 10px; z-index: 10;">${btnCerrar}</div>
                </div>
                <div style="padding: 0 20px 25px; text-align: center; position: relative;">
                    <div style="width: 85px; height: 85px; margin: -42px auto 12px; border-radius: 50%; overflow: hidden; border: 4px solid var(--bg-card, #181528); background: var(--bg-main); box-shadow: 0 4px 12px rgba(0,0,0,0.5);">${avatarImg}</div>
                    <h3 style="margin: 0 0 4px 0; font-size: 1.3rem; display: flex; justify-content: center; align-items: center; gap: 6px; color: var(--text-main, #ffffff);">${usuario.nombre || nombreAutor} ${verifiedBadge}</h3>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                        <span style="color: var(--purple-accent); font-size: 0.9rem; font-weight: 600;">@${displayHandle}</span>
                        ${badgesHTML}
                    </div>
                    <div style="color: var(--text-main); font-size: 0.88rem; margin-bottom: 15px; line-height: 1.4; padding: 10px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); overflow-wrap: anywhere;">"${userDesc}"</div>
                    ${infoExtraHTML}
                    <button class="btn btn-primary" style="width: 100%; display: flex; justify-content: center; gap: 8px; align-items: center; padding: 12px; font-size: 0.95rem; border-radius: 10px; font-weight: 600; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);" onclick="iniciarChatCon('${displayHandle}')">
                        <i class="fa-solid fa-paper-plane"></i> Enviar Mensaje
                    </button>
                </div>
            </div>
        </div>`);
    } finally {
        // SIEMPRE quitar el modal de carga, incluso si hubo un error
        clearTimeout(timeoutSeguridad);
        const modalCarga = document.getElementById('mini-perfil-social');
        if (modalCarga) {
            const spinner = modalCarga.querySelector('.fa-spinner');
            if (spinner) modalCarga.remove();
        }
    }
}

function cerrarMiniPerfil(event) {
    if (event && event.target.id !== 'mini-perfil-social') return;
    const modal = document.getElementById('mini-perfil-social');
    if (modal) modal.remove();
}

function toggleRespuestasHilo(postId, commentId) {
    const thread = document.getElementById(`thread-replies-${postId}-${commentId}`);
    const arrow = document.getElementById(`arrow-replies-${postId}-${commentId}`);

    if (thread) {
        thread.classList.toggle('hidden');
        if (arrow) {
            arrow.className = thread.classList.contains('hidden') ? 'fa-solid fa-caret-down' : 'fa-solid fa-caret-up';
        }
    }
}

function toggleCommentMenu(postId, commentId) {
    const menu = document.getElementById(`comment-menu-${postId}-${commentId}`);
    if (menu) menu.classList.toggle('hidden');
}

function toggleReplyMenu(postId, commentId, replyId) {
    const menu = document.getElementById(`reply-menu-${postId}-${commentId}-${replyId}`);
    if (menu) menu.classList.toggle('hidden');
}

function prepararRespuestaComentario(postId, authorName, commentId) {
    const menu = document.getElementById(`comment-menu-${postId}-${commentId}`);
    if (menu) menu.classList.add('hidden');

    const input = document.getElementById(`input-comentario-${postId}`);
    if (input) {
        input.value = `@${authorName} `;
        input.focus();
        respuestasEnCurso[postId] = commentId;
    }

    const thread = document.getElementById(`thread-replies-${postId}-${commentId}`);
    if (thread && thread.classList.contains('hidden')) {
        toggleRespuestasHilo(postId, commentId);
    }
}

function agregarComentario(postId) {
    if (typeof sesionActual === 'undefined' || !sesionActual) {
        alert("🔒 Inicia sesión para comentar.");
        return;
    }

    const input = document.getElementById(`input-comentario-${postId}`);
    const texto = input ? input.value.trim() : "";
    if (texto === "") return;

    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post) return;

    if (!post.comments) post.comments = [];

    const parentCommentId = respuestasEnCurso[postId];

    if (parentCommentId !== undefined && parentCommentId !== null) {
        const parentComment = post.comments.find((c, idx) => String(c.id || idx) === String(parentCommentId));
        if (parentComment) {
            if (!parentComment.replies) parentComment.replies = [];
            parentComment.replies.push({
                id: Date.now(),
                author: sesionActual.nombre,
                handle: sesionActual.handle || "",
                text: texto,
                avatar: sesionActual.avatar || "",
                rol: sesionActual.rol,
                verified: sesionActual.verified,
                date: Date.now(),
                likedBy: []
            });
        }
        delete respuestasEnCurso[postId];
    } else {
        post.comments.push({
            id: Date.now(),
            author: sesionActual.nombre,
            handle: sesionActual.handle || "",
            text: texto,
            avatar: sesionActual.avatar || "",
            rol: sesionActual.rol,
            verified: sesionActual.verified,
            date: Date.now(),
            likedBy: [],
            replies: []
        });
    }

    persistirPost(post);
    renderizarFeed();
    
    const commentsArea = document.getElementById(`comments-area-${postId}`);
    if (commentsArea) commentsArea.classList.remove('hidden');

    if (parentCommentId !== undefined) {
        toggleRespuestasHilo(postId, parentCommentId);
    }
}

function toggleCommentLike(postId, commentId) {
    if (typeof sesionActual === 'undefined' || !sesionActual) {
        alert("🔒 Inicia sesión para dar 'Me gusta'.");
        return;
    }

    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => String(c.id || idx) === String(commentId));
    if (!comment) return;

    if (!Array.isArray(comment.likedBy)) {
        comment.likedBy = [];
    }

    const userHandle = sesionActual.handle;
    const index = comment.likedBy.indexOf(userHandle);

    if (index !== -1) {
        comment.likedBy.splice(index, 1);
    } else {
        comment.likedBy.push(userHandle);
    }

    persistirPost(post);
    renderizarFeed();

    const commentsArea = document.getElementById(`comments-area-${postId}`);
    if (commentsArea) commentsArea.classList.remove('hidden');
}

function toggleReplyLike(postId, commentId, replyId) {
    if (typeof sesionActual === 'undefined' || !sesionActual) {
        alert("🔒 Inicia sesión para dar 'Me gusta'.");
        return;
    }

    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => String(c.id || idx) === String(commentId));
    if (!comment || !comment.replies) return;

    const reply = comment.replies.find((r, idx) => String(r.id || idx) === String(replyId));
    if (!reply) return;

    if (!Array.isArray(reply.likedBy)) reply.likedBy = [];

    const userHandle = sesionActual.handle;
    const index = reply.likedBy.indexOf(userHandle);

    if (index !== -1) {
        reply.likedBy.splice(index, 1);
    } else {
        reply.likedBy.push(userHandle);
    }

    persistirPost(post);
    renderizarFeed();

    const commentsArea = document.getElementById(`comments-area-${postId}`);
    if (commentsArea) commentsArea.classList.remove('hidden');

    const thread = document.getElementById(`thread-replies-${postId}-${commentId}`);
    if (thread) thread.classList.remove('hidden');
}

function borrarComentario(postId, commentId) {
    toggleCommentMenu(postId, commentId);
    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    if (confirm("¿Estás seguro de que deseas eliminar este comentario?")) {
        post.comments = post.comments.filter((c, idx) => (c.id ? c.id !== commentId : idx !== commentId));
        persistirPost(post);
        renderizarFeed();
        
        const commentsArea = document.getElementById(`comments-area-${postId}`);
        if (commentsArea) commentsArea.classList.remove('hidden');
    }
}

function borrarRespuesta(postId, commentId, replyId) {
    toggleReplyMenu(postId, commentId, replyId);
    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => (String(c.id || idx) === String(commentId)));
    if (!comment || !comment.replies) return;

    if (confirm("¿Estás seguro de que deseas eliminar esta respuesta?")) {
        comment.replies = comment.replies.filter((r, idx) => (r.id ? r.id !== replyId : idx !== replyId));
        persistirPost(post);
        renderizarFeed();

        const commentsArea = document.getElementById(`comments-area-${postId}`);
        if (commentsArea) commentsArea.classList.remove('hidden');

        const thread = document.getElementById(`thread-replies-${postId}-${commentId}`);
        if (thread) thread.classList.remove('hidden');
    }
}

function editarComentario(postId, commentId) {
    toggleCommentMenu(postId, commentId);
    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => String(c.id || idx) === String(commentId));
    if (!comment) return;

    cerrarModalEditarComentario();

    const modalHTML = `
    <div id="modal-editar-comentario" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="cerrarModalEditarComentario(event)">
        <div class="card" style="width: 90%; max-width: 450px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.9); position: relative;" onclick="event.stopPropagation()">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-pen-to-square" style="color: var(--purple-accent);"></i> Editar Comentario
                </h3>
                <button onclick="cerrarModalEditarComentario()" style="background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <textarea id="texto-editar-comentario" class="post-textarea" style="width: 100%; min-height: 90px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); padding: 10px; font-size: 0.95rem; resize: vertical; outline: none; font-family: inherit;">${comment.text}</textarea>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                <button class="btn btn-outline" onclick="cerrarModalEditarComentario()" style="padding: 6px 14px; font-size: 0.85rem;">
                    Cancelar
                </button>
                <button class="btn btn-primary" onclick="guardarEdicionComentario(${post.id}, ${commentId})" style="padding: 6px 14px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar
                </button>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const textarea = document.getElementById('texto-editar-comentario');
    if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

function guardarEdicionComentario(postId, commentId) {
    const textarea = document.getElementById('texto-editar-comentario');
    if (!textarea) return;

    const nuevoTexto = textarea.value.trim();
    if (nuevoTexto === "") {
        alert("El comentario no puede estar vacío.");
        return;
    }

    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => String(c.id || idx) === String(commentId));
    if (comment) {
        comment.text = nuevoTexto;
        persistirPost(post);
        cerrarModalEditarComentario();
        renderizarFeed();

        const commentsArea = document.getElementById(`comments-area-${postId}`);
        if (commentsArea) commentsArea.classList.remove('hidden');
    }
}

function cerrarModalEditarComentario(event) {
    if (event && event.target.id !== 'modal-editar-comentario') return;
    const modal = document.getElementById('modal-editar-comentario');
    if (modal) modal.remove();
}

function editarRespuesta(postId, commentId, replyId) {
    toggleReplyMenu(postId, commentId, replyId);
    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => (String(c.id || idx) === String(commentId)));
    if (!comment || !comment.replies) return;

    const reply = comment.replies.find((r, idx) => (r.id ? r.id === replyId : idx === replyId));
    if (!reply) return;

    cerrarModalEditarRespuesta();

    const modalHTML = `
    <div id="modal-editar-respuesta" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;" onclick="cerrarModalEditarRespuesta(event)">
        <div class="card" style="width: 90%; max-width: 450px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.9); position: relative;" onclick="event.stopPropagation()">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-pen-to-square" style="color: var(--purple-accent);"></i> Editar Respuesta
                </h3>
                <button onclick="cerrarModalEditarRespuesta()" style="background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <textarea id="texto-editar-respuesta" class="post-textarea" style="width: 100%; min-height: 90px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); padding: 10px; font-size: 0.95rem; resize: vertical; outline: none; font-family: inherit;">${reply.text}</textarea>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                <button class="btn btn-outline" onclick="cerrarModalEditarRespuesta()" style="padding: 6px 14px; font-size: 0.85rem;">
                    Cancelar
                </button>
                <button class="btn btn-primary" onclick="guardarEdicionRespuesta(${post.id}, ${commentId}, ${replyId})" style="padding: 6px 14px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar
                </button>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const textarea = document.getElementById('texto-editar-respuesta');
    if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

function guardarEdicionRespuesta(postId, commentId, replyId) {
    const textarea = document.getElementById('texto-editar-respuesta');
    if (!textarea) return;

    const nuevoTexto = textarea.value.trim();
    if (nuevoTexto === "") {
        alert("La respuesta no puede estar vacía.");
        return;
    }

    const post = postsData.find(p => String(p.id) === String(postId));
    if (!post || !post.comments) return;

    const comment = post.comments.find((c, idx) => (String(c.id || idx) === String(commentId)));
    if (!comment || !comment.replies) return;

    const reply = comment.replies.find((r, idx) => (r.id ? r.id === replyId : idx === replyId));
    if (reply) {
        reply.text = nuevoTexto;
        persistirPost(post);
        cerrarModalEditarRespuesta();
        renderizarFeed();

        const commentsArea = document.getElementById(`comments-area-${postId}`);
        if (commentsArea) commentsArea.classList.remove('hidden');

        const thread = document.getElementById(`thread-replies-${postId}-${commentId}`);
        if (thread) thread.classList.remove('hidden');
    }
}

function cerrarModalEditarRespuesta(event) {
    if (event && event.target.id !== 'modal-editar-respuesta') return;
    const modal = document.getElementById('modal-editar-respuesta');
    if (modal) modal.remove();
}