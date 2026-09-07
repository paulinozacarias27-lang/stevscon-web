function getSocialLayoutHTML() {
    const haySesion = (typeof sesionActual !== 'undefined' && sesionActual);
    const esAdmin = haySesion && (sesionActual.rol === 'admin' || sesionActual.rol === 'owner');
    const nombreUsuario = haySesion ? sesionActual.nombre : 'Invitado';

    const userAvatar = (haySesion && sesionActual.avatar) 
        ? `<img src="${sesionActual.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
        : (haySesion ? sesionActual.nombre.charAt(0).toUpperCase() : '<i class="fa-solid fa-user"></i>');

    let creadorHTML = "";
    if (esAdmin) {
        creadorHTML = `
            <div class="post-creator card" style="display: flex; gap: 15px; border-left: 4px solid var(--purple-accent);">
                <div class="avatar" style="min-width: 45px;">${userAvatar}</div>
                <div style="flex-grow: 1;">
                    <textarea id="nuevoPostTexto" class="post-textarea" placeholder="Publicar anuncio oficial, ${nombreUsuario}..." style="background: rgba(0,0,0,0.2); border: 1px solid transparent;" onkeydown="manejarEnterPost(event)"></textarea>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                        <div style="color: var(--purple-accent); font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
                            <label for="inputImagenPost" style="cursor: pointer; display: flex; align-items: center; gap: 6px;" title="Adjuntar imagen o GIF desde tu equipo">
                                <i class="fa-solid fa-image"></i>
                            </label>
                            <input type="file" id="inputImagenPost" accept="image/*,image/gif" style="display: none;" onchange="previewImagenPost(event)">
                            <span id="nombreImagenSeleccionada" style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;"></span>
                        </div>
                        <button class="btn btn-primary" id="btnPublicar" onclick="crearPost()" style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-paper-plane"></i> Publicar
                        </button>
                    </div>
                </div>
            </div>`;
    } else {
        creadorHTML = `
            <div class="card" style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.9rem; background: rgba(13, 11, 20, 0.4);">
                <i class="fa-solid fa-lock" style="font-size: 1.5rem; margin-bottom: 10px; color: var(--purple-accent);"></i><br>
                El feed de publicaciones está reservado para anuncios de los Administradores.
            </div>`;
    }

    return `
    <div class="wiki-container">
        <!-- Menú Lateral -->
        <aside class="sidebar">
            <h3>Stevscon Social</h3>
            <ul class="sidebar-menu">
                <li class="active"><a href="#" onclick="cargarCategoria('social')"><i class="fa-solid fa-users"></i> Feed Oficial</a></li>
                <li><a href="#"><i class="fa-solid fa-fire"></i> Tendencias</a></li>
                <li><a href="#"><i class="fa-solid fa-bell"></i> Notificaciones</a></li>
            </ul>
        </aside>

        <!-- Contenido Central -->
        <section class="content">
            ${creadorHTML}
            <div id="feedContainer"></div>
        </section>
    </div>
    `;
}

// Devuelve el autor con los datos actuales de la nube (nombre, avatar, rol, verificado)
function datosAutorActualizados(entidad) {
    if (!entidad) return entidad;
    const global = typeof buscarUsuarioGlobal === 'function' ? buscarUsuarioGlobal(entidad.handle) : null;
    if (!global) return entidad;

    return {
        ...entidad,
        author: global.nombre || entidad.author,
        avatar: global.avatar || entidad.avatar,
        rol: global.rol || entidad.rol,
        verified: global.verified !== undefined ? global.verified : entidad.verified
    };
}

function getPostHTML(postOriginal) {
    const post = datosAutorActualizados(postOriginal);
    const avatarImgHTML = post.avatar && post.avatar !== "" 
        ? `<img src="${post.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
        : post.author.charAt(0).toUpperCase();

    const haySesion = (typeof sesionActual !== 'undefined' && sesionActual);
    const miHandle = haySesion ? sesionActual.handle : null;
    const estaLiked = Array.isArray(post.likedBy) && miHandle && post.likedBy.includes(miHandle);
    const totalLikes = Array.isArray(post.likedBy) ? post.likedBy.length : 0;

    const totalComentarios = (post.comments || []).reduce((acc, c) => {
        const numRespuestas = Array.isArray(c.replies) ? c.replies.length : 0;
        return acc + 1 + numRespuestas;
    }, 0);

    const usuarioPost = { verified: post.verified, rol: post.rol };
    const verifiedBadgePost = typeof getVerifiedBadgeHTML === 'function' ? getVerifiedBadgeHTML(usuarioPost) : '';

    const comentariosHTML = (post.comments || []).map((cOriginal, index) => {
        const c = datosAutorActualizados(cOriginal);
        const commentAvatar = c.avatar && c.avatar !== "" 
            ? `<img src="${c.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
            : c.author.charAt(0).toUpperCase();
            
        const textoFormateado = typeof formatearTexto === 'function' ? formatearTexto(c.text) : c.text;

        const cLikedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
        const cEstaLiked = miHandle && cLikedBy.includes(miHandle);
        const cTotalLikes = cLikedBy.length;
        const commentId = c.id || index;

        const esMiComentario = haySesion && (sesionActual.nombre === c.author || sesionActual.rol === 'admin' || sesionActual.rol === 'owner');
        const respuestas = c.replies || [];

        const cVerifiedBadge = typeof getVerifiedBadgeHTML === 'function' ? getVerifiedBadgeHTML(c) : '';

        const respuestasHTML = respuestas.map((rOriginal, rIndex) => {
            const r = datosAutorActualizados(rOriginal);
            const rAvatar = r.avatar && r.avatar !== "" 
                ? `<img src="${r.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
                : r.author.charAt(0).toUpperCase();

            const rTextoFormateado = typeof formatearTexto === 'function' ? formatearTexto(r.text) : r.text;
            const rLikedBy = Array.isArray(r.likedBy) ? r.likedBy : [];
            const rEstaLiked = miHandle && rLikedBy.includes(miHandle);
            const rTotalLikes = rLikedBy.length;
            const rId = r.id || rIndex;
            const esMiRespuesta = haySesion && (sesionActual.nombre === r.author || sesionActual.rol === 'admin' || sesionActual.rol === 'owner');

            const rVerifiedBadge = typeof getVerifiedBadgeHTML === 'function' ? getVerifiedBadgeHTML(r) : '';
            const rFecha = typeof formatearFechaPublicacion === 'function' ? formatearFechaPublicacion(r.date) : r.date;

            return `
            <div class="reply-item" style="display: flex; gap: 10px; padding: 6px 0; position: relative;">
                <div class="avatar" style="width: 26px; height: 26px; min-width: 26px; font-size: 0.7rem; cursor: pointer;" onclick="abrirPerfilRapido('${r.author}', '${r.avatar || ''}', '${r.rol || 'user'}', '${r.handle || ''}')">
                    ${rAvatar}
                </div>
                <div style="flex-grow: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: var(--purple-accent); font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="abrirPerfilRapido('${r.author}', '${r.avatar || ''}', '${r.rol || 'user'}', '${r.handle || ''}')">
                            @${r.author} ${rVerifiedBadge}
                        </strong>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${rFecha || ''}</span>
                    </div>
                    <div style="color: var(--text-main); font-size: 0.9rem; margin-top: 2px; overflow-wrap: anywhere;">${rTextoFormateado}</div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
                        <button class="interact-btn ${rEstaLiked ? 'liked' : ''}" onclick="toggleReplyLike(${post.id}, ${commentId}, ${rId})" style="background: transparent; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: ${rEstaLiked ? 'var(--purple-accent)' : 'var(--text-muted)'}; padding: 0;">
                            <i class="${rEstaLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                            <span>${rTotalLikes > 0 ? (typeof formatearContador === 'function' ? formatearContador(rTotalLikes) : rTotalLikes) : ''}</span>
                        </button>
                        <button onclick="prepararRespuestaComentario(${post.id}, '${r.author}', ${commentId})" style="background: transparent; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; font-weight: 600;">
                            Responder
                        </button>

                        <div style="position: relative; display: inline-block;">
                            <button onclick="toggleReplyMenu(${post.id}, ${commentId}, ${rId})" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 0 4px;">
                                <i class="fa-solid fa-ellipsis-vertical" style="font-size: 0.8rem;"></i>
                            </button>
                            <div id="reply-menu-${post.id}-${commentId}-${rId}" class="hidden card" style="position: absolute; right: 0; top: 18px; padding: 4px; width: 110px; z-index: 20; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.8); background: var(--bg-card, #181528);">
                                ${esMiRespuesta ? `
                                <button class="btn btn-outline btn-sm" onclick="editarRespuesta(${post.id}, ${commentId}, ${rId})" style="width: 100%; display: flex; align-items: center; gap: 6px; padding: 4px 6px; font-size: 0.75rem;">
                                    <i class="fa-solid fa-pen"></i> Editar
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="borrarRespuesta(${post.id}, ${commentId}, ${rId})" style="color: var(--danger, #ff4d4d); border-color: var(--danger, #ff4d4d); width: 100%; display: flex; align-items: center; gap: 6px; padding: 4px 6px; font-size: 0.75rem;">
                                    <i class="fa-solid fa-trash"></i> Eliminar
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        const cFecha = typeof formatearFechaPublicacion === 'function' ? formatearFechaPublicacion(c.date) : c.date;

        return `
        <div class="comment-item-yt" style="display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative;">
            <div class="avatar" style="width: 32px; height: 32px; min-width: 32px; font-size: 0.85rem; cursor: pointer;" onclick="abrirPerfilRapido('${c.author}', '${c.avatar || ''}', '${c.rol || 'user'}', '${c.handle || ''}')">
                ${commentAvatar}
            </div>
            
            <div style="flex-grow: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: var(--purple-accent); font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="abrirPerfilRapido('${c.author}', '${c.avatar || ''}', '${c.rol || 'user'}', '${c.handle || ''}')">
                            @${c.author} ${cVerifiedBadge}
                        </strong>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${cFecha || ''}</span>
                    </div>

                    <div style="position: relative;">
                        <button onclick="toggleCommentMenu(${post.id}, ${commentId})" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 2px 6px;">
                            <i class="fa-solid fa-ellipsis-vertical" style="font-size: 0.85rem;"></i>
                        </button>

                        <div id="comment-menu-${post.id}-${commentId}" class="hidden card" style="position: absolute; right: 0; top: 22px; padding: 6px; width: 120px; z-index: 20; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.8); background: var(--bg-card, #181528);">
                            ${esMiComentario ? `
                            <button class="btn btn-outline btn-sm" onclick="editarComentario(${post.id}, ${commentId})" style="width: 100%; display: flex; align-items: center; gap: 6px; padding: 4px 8px; font-size: 0.8rem;">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="borrarComentario(${post.id}, ${commentId})" style="color: var(--danger, #ff4d4d); border-color: var(--danger, #ff4d4d); width: 100%; display: flex; align-items: center; gap: 6px; padding: 4px 8px; font-size: 0.8rem;">
                                <i class="fa-solid fa-trash"></i> Eliminar
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div style="color: var(--text-main); font-size: 0.95rem; margin-top: 3px; overflow-wrap: anywhere;">${textoFormateado}</div>

                <div style="display: flex; align-items: center; gap: 14px; margin-top: 6px;">
                    <button class="interact-btn ${cEstaLiked ? 'liked' : ''}" onclick="toggleCommentLike(${post.id}, ${commentId})" style="background: transparent; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: ${cEstaLiked ? 'var(--purple-accent)' : 'var(--text-muted)'}; padding: 0;">
                        <i class="${cEstaLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        <span>${cTotalLikes > 0 ? (typeof formatearContador === 'function' ? formatearContador(cTotalLikes) : cTotalLikes) : ''}</span>
                    </button>

                    <button onclick="prepararRespuestaComentario(${post.id}, '${c.author}', ${commentId})" style="background: transparent; border: none; color: var(--text-muted); font-size: 0.85rem; cursor: pointer; font-weight: 600;">
                        Responder
                    </button>
                </div>

                ${respuestas.length > 0 ? `
                <div style="margin-top: 8px;">
                    <button onclick="toggleRespuestasHilo(${post.id}, ${commentId})" style="background: transparent; border: none; color: var(--purple-accent); font-size: 0.85rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 2px 0;">
                        <i class="fa-solid fa-caret-down" id="arrow-replies-${post.id}-${commentId}"></i>
                        <span>${typeof formatearContador === 'function' ? formatearContador(respuestas.length) : respuestas.length} ${respuestas.length === 1 ? 'respuesta' : 'respuestas'}</span>
                    </button>
                    
                    <div id="thread-replies-${post.id}-${commentId}" class="hidden" style="margin-top: 6px; padding-left: 12px; border-left: 2px solid var(--purple-accent);">
                        ${respuestasHTML}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>`;
    }).join('');

    const miAvatarSmall = (haySesion && sesionActual.avatar) 
        ? `<img src="${sesionActual.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
        : (haySesion ? sesionActual.nombre.charAt(0).toUpperCase() : '<i class="fa-solid fa-user-lock"></i>');

    const contenidoFormateado = typeof formatearTexto === 'function' ? formatearTexto(post.content) : post.content;
    const imagenPostHTML = post.image ? `<div style="margin-top: 12px; border-radius: 12px; overflow: hidden; max-height: 400px;"><img src="${post.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;"></div>` : '';
    const postFecha = typeof formatearFechaPublicacion === 'function' ? formatearFechaPublicacion(post.date) : post.date;

    return `
    <div class="post card" id="post-${post.id}">
        <div class="post-user-info" style="display: flex; align-items: center; position: relative;">
            <div class="avatar" style="background: linear-gradient(135deg, var(--purple-dark), var(--purple-accent)); color: white; cursor: pointer;" onclick="abrirPerfilRapido('${post.author}', '${post.avatar}', '${post.rol}', '${post.handle || ''}')">
                ${avatarImgHTML}
            </div>
            <div style="cursor: pointer;" onclick="abrirPerfilRapido('${post.author}', '${post.avatar}', '${post.rol}', '${post.handle || ''}')">
                <strong style="font-size: 1.1rem; display: inline-flex; align-items: center; gap: 5px;">
                    ${post.author} ${verifiedBadgePost}
                </strong>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 5px;">
                    <i class="fa-regular fa-clock"></i> ${postFecha}
                </div>
            </div>
            
            ${getPostOptionsMenu(post.id)}
        </div>
        
        <div class="post-text" style="font-size: 1.05rem;">
            ${contenidoFormateado}
            ${imagenPostHTML}
        </div>
        
        <div class="interaction-bar">
            <button class="interact-btn ${estaLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                <i class="${estaLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> <span>${typeof formatearContador === 'function' ? formatearContador(totalLikes) : totalLikes}</span>
            </button>
            <button class="interact-btn" onclick="toggleComments(${post.id})">
                <i class="fa-regular fa-comment"></i> ${typeof formatearContador === 'function' ? formatearContador(totalComentarios) : totalComentarios}
            </button>
        </div>

        <div class="comments-area hidden" id="comments-area-${post.id}">
            <div id="lista-comentarios-${post.id}" style="margin-bottom: 15px; display: flex; flex-direction: column;">
                ${comentariosHTML}
            </div>
            
            <div class="comment-box" style="align-items: center; gap: 10px;">
                <div class="avatar" style="width: 35px; height: 35px; font-size: 0.9rem; min-width: 35px;">
                    ${miAvatarSmall}
                </div>
                <input type="text" id="input-comentario-${post.id}" class="comment-input" placeholder="Escribe un comentario..." style="background: rgba(0,0,0,0.2);" onkeydown="if(event.key === 'Enter') agregarComentario(${post.id})">
                <button class="btn btn-primary btn-sm" onclick="agregarComentario(${post.id})" style="border-radius: 20px; padding: 8px 15px;">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>
    `;
}

function getPostOptionsMenu(postId) {
    const haySesion = (typeof sesionActual !== 'undefined' && sesionActual);
    const esAdminOwner = haySesion && (sesionActual.rol === 'admin' || sesionActual.rol === 'owner');
    
    if (!esAdminOwner) return '';

    return `
    <div style="position: absolute; right: 0; top: 0;">
        <button class="btn btn-outline btn-sm" onclick="togglePostMenu(${postId})" style="border: none; color: var(--text-muted); background: transparent;">
            <i class="fa-solid fa-ellipsis-vertical" style="font-size: 1.2rem;"></i>
        </button>
        <div id="post-menu-${postId}" class="hidden card" style="position: absolute; right: -10px; top: 35px; padding: 10px; width: 130px; z-index: 10; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">
            <button class="btn btn-outline btn-sm" onclick="editarPost(${postId})" style="width: 100%; display: flex; justify-content: center; gap: 5px;">
                <i class="fa-solid fa-pen"></i> Editar
            </button>
            <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger); width: 100%; display: flex; justify-content: center; gap: 5px;" onclick="borrarPost(${postId})">
                <i class="fa-solid fa-trash"></i> Borrar
            </button>
        </div>
    </div>
    `;
}

function togglePostMenu(postId) {
    const menu = document.getElementById(`post-menu-${postId}`);
    if (menu) {
        menu.classList.toggle('hidden');
    }
}