// Función auxiliar de protección para el botón de cierre
function getBotonCerrarSafe() {
    return typeof getBotonCerrarHomeHTML === 'function' ? getBotonCerrarHomeHTML() : '';
}

function getProfileView() {
    if (typeof sesionActual === 'undefined' || !sesionActual) {
        if (typeof cargarCategoria === 'function') {
            cargarCategoria('login');
        }
        return '';
    }

    // Preferir siempre la versión del perfil que está en la nube
    const userGlobal = typeof buscarUsuarioGlobal === 'function' ? buscarUsuarioGlobal(sesionActual.handle) : null;
    const user = userGlobal || sesionActual;
    if (userGlobal) sesionActual = userGlobal;

    const rawDesc = user.descripcion || "Sin descripción. ¡Añade una para que la comunidad te conozca!";
    const formattedDesc = typeof formatearTexto === 'function' ? formatearTexto(rawDesc) : rawDesc;

    const bannerStyle = user.banner ? `background-image: url('${user.banner}');` : '';
    const bday = user.cumpleanos || "No especificado";
    const age = user.edad || "No especificada";
    const gender = user.genero || "No especificado";

    const avatarContent = user.avatar 
        ? `<img src="${user.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
        : (user.nombre ? user.nombre.charAt(0).toUpperCase() : '?');

    const descLength = (user.descripcion || '').length;
    const botonCerrar = getBotonCerrarSafe();

    // Renderizado de insignias y verificado
    const verifiedIcon = typeof getVerifiedBadgeHTML === 'function' ? getVerifiedBadgeHTML(user) : '';
    const badgesContainer = typeof renderBadgesHTML === 'function' ? renderBadgesHTML(user) : '';

    return `
    <!-- VISTA DE LECTURA DEL PERFIL -->
    <div id="profile-read-view" class="profile-wrapper" style="position: relative;">
        <div class="profile-banner" style="${bannerStyle}">
            <div style="position: absolute; top: 15px; right: 15px; display: flex; gap: 10px; align-items: center; z-index: 10;">
                <button class="btn-personalizar" onclick="toggleEditProfile()" style="position: static;">
                    <i class="fa-solid fa-pen"></i> Personalizar
                </button>
                ${botonCerrar}
            </div>
        </div>
        
        <div class="profile-body">
            <div class="profile-avatar-large">${avatarContent}</div>
            
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
                <div class="profile-name" style="display: flex; align-items: center; gap: 6px;">
                    ${user.nombre || ''} ${verifiedIcon}
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px; flex-wrap: wrap;">
                <div class="profile-handle" style="margin-bottom: 0;">${user.handle || ''}</div>
                ${badgesContainer}
            </div>

            <div class="profile-section-title">Sobre mí</div>
            <div class="profile-desc-box">${formattedDesc}</div>

            <div class="profile-section-title">Información Adicional</div>
            <div class="info-grid">
                <div class="info-box"><div class="info-label">Cumpleaños</div><div class="info-value">${bday}</div></div>
                <div class="info-box"><div class="info-label">Edad</div><div class="info-value">${age}</div></div>
                <div class="info-box"><div class="info-label">Género</div><div class="info-value">${gender}</div></div>
            </div>

            <div class="profile-section-title">Privado / Cuenta</div>
            <div class="info-grid">
                <div class="info-box"><div class="info-label">Correo (Gmail)</div><div class="info-value">${user.gmail || 'No especificado'}</div></div>
                <div class="info-box"><div class="info-label">Contraseña</div><div class="info-value">••••••••••</div></div>
            </div>

            <div style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                <button class="btn btn-outline" style="color: var(--text-main);" onclick="if(typeof abrirModalMulticuentas === 'function') abrirModalMulticuentas()">
                    <i class="fa-solid fa-users"></i> Change account
                </button>
            </div>
        </div>
    </div>

    <!-- VISTA DE EDICIÓN DEL PERFIL -->
    <div id="profile-edit-view" class="profile-wrapper hidden" style="padding: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <h2 style="color: var(--purple-accent); display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-pen-to-square"></i> Personalizar Perfil
            </h2>
            <button class="btn btn-outline btn-sm" onclick="toggleEditProfile()">
                <i class="fa-solid fa-xmark"></i> Cancelar
            </button>
        </div>

        <div class="form-group">
            <label class="form-label">Nombre de usuario</label>
            <input type="text" id="edit-nombre" class="form-input" value="${user.nombre || ''}">
        </div>

        <!-- SELECCIÓN Y CÁRGA DE AVATAR -->
        <div class="form-group">
            <label class="form-label">Avatar (Imagen o GIF)</label>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="text" id="edit-avatar" class="form-input" value="${user.avatar || ''}" placeholder="URL o selecciona un archivo..." style="flex-grow: 1;">
                <label for="input-file-avatar" class="btn btn-outline" style="cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 10px 14px; margin: 0; white-space: nowrap;" title="Elegir imagen/GIF desde tu equipo">
                    <i class="fa-solid fa-image" style="color: var(--purple-accent); font-size: 1.1rem;"></i> Subir
                </label>
                <input type="file" id="input-file-avatar" accept="image/*,image/gif" style="display: none;" onchange="cargarImagenAvatar(event)">
            </div>
            <span id="avatar-file-status" style="font-size: 0.8rem; color: var(--purple-accent); font-style: italic; display: block; margin-top: 4px;"></span>
        </div>

        <!-- SELECCIÓN Y CÁRGA DE BANNER -->
        <div class="form-group">
            <label class="form-label">Banner (Imagen o GIF)</label>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="text" id="edit-banner" class="form-input" value="${user.banner || ''}" placeholder="URL o selecciona un archivo..." style="flex-grow: 1;">
                <label for="input-file-banner" class="btn btn-outline" style="cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 10px 14px; margin: 0; white-space: nowrap;" title="Elegir imagen/GIF desde tu equipo">
                    <i class="fa-solid fa-image" style="color: var(--purple-accent); font-size: 1.1rem;"></i> Subir
                </label>
                <input type="file" id="input-file-banner" accept="image/*,image/gif" style="display: none;" onchange="cargarImagenBanner(event)">
            </div>
            <span id="banner-file-status" style="font-size: 0.8rem; color: var(--purple-accent); font-style: italic; display: block; margin-top: 4px;"></span>
        </div>

        <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label">Descripción / Sobre mí</label>
                <span id="desc-counter" style="font-size: 0.8rem; color: var(--text-muted);">${descLength}/200</span>
            </div>
            <textarea id="edit-desc" class="form-input" rows="3" maxlength="200" oninput="actualizarContadorDesc(this)" style="resize: vertical;">${user.descripcion || ''}</textarea>
        </div>

        <div class="profile-section-title">Detalles Personales</div>
        <div class="info-grid">
            <div class="form-group">
                <label class="form-label">Cumpleaños</label>
                <input type="date" id="edit-bday" class="form-input" value="${user.cumpleanos || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Edad</label>
                <input type="number" id="edit-age" class="form-input" value="${user.edad || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Género</label>
                <input type="text" id="edit-gender" class="form-input" value="${user.genero || ''}" placeholder="Ej. Masculino / Femenino / Otro">
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 20px;">
            <button class="btn btn-outline" onclick="toggleEditProfile()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarPerfil()">
                <i class="fa-solid fa-floppy-disk"></i> Guardar Cambios
            </button>
        </div>
    </div>
    `;
}

// Cargar Avatar desde archivo local
function cargarImagenAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarInput = document.getElementById('edit-avatar');
            if (avatarInput) avatarInput.value = e.target.result;
            const statusLabel = document.getElementById('avatar-file-status');
            if (statusLabel) statusLabel.textContent = `📷 ${file.name}`;
        };
        reader.readAsDataURL(file);
    }
}

// Cargar Banner desde archivo local
function cargarImagenBanner(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const bannerInput = document.getElementById('edit-banner');
            if (bannerInput) bannerInput.value = e.target.result;
            const statusLabel = document.getElementById('banner-file-status');
            if (statusLabel) statusLabel.textContent = `📷 ${file.name}`;
        };
        reader.readAsDataURL(file);
    }
}

// Contador en tiempo real para la descripción
function actualizarContadorDesc(textarea) {
    const counter = document.getElementById('desc-counter');
    if (counter) {
        counter.textContent = `${textarea.value.length}/200`;
    }
}

// Alternar entre ver perfil y editar perfil
function toggleEditProfile() {
    const readView = document.getElementById('profile-read-view');
    const editView = document.getElementById('profile-edit-view');
    if (readView && editView) {
        readView.classList.toggle('hidden');
        editView.classList.toggle('hidden');
    }
}

// Guardar los datos actualizados con sincronización en la nube
function guardarPerfil() {
    if (typeof sesionActual === 'undefined' || !sesionActual) return;

    const nombreInput = document.getElementById('edit-nombre');
    const avatarInput = document.getElementById('edit-avatar');
    const bannerInput = document.getElementById('edit-banner');
    const descInput = document.getElementById('edit-desc');
    const bdayInput = document.getElementById('edit-bday');
    const ageInput = document.getElementById('edit-age');
    const genderInput = document.getElementById('edit-gender');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const avatar = avatarInput ? avatarInput.value.trim() : '';
    const banner = bannerInput ? bannerInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim().substring(0, 200) : '';
    const bday = bdayInput ? bdayInput.value : '';
    const age = ageInput ? ageInput.value : '';
    const gender = genderInput ? genderInput.value.trim() : '';

    if (!nombre) {
        alert("¡El nombre no puede estar vacío!");
        return;
    }

    sesionActual.nombre = nombre;
    sesionActual.avatar = avatar; 
    sesionActual.banner = banner;
    sesionActual.descripcion = desc;
    sesionActual.cumpleanos = bday;
    sesionActual.edad = age;
    sesionActual.genero = gender;

    // Guardado directo en la nube: el perfil se ve igual en todos los dispositivos
    if (typeof guardarUsuarioGlobal === 'function') {
        guardarUsuarioGlobal(sesionActual);
    }

    if (typeof guardarSesionLocal === 'function') {
        guardarSesionLocal(sesionActual);
    } else {
        localStorage.setItem('stevscon_sesion', JSON.stringify(sesionActual));
    }

    if (typeof sincronizarCuentaActual === 'function') sincronizarCuentaActual();

    if (typeof cargarCategoria === 'function') {
        cargarCategoria('profile');
    }
}

// Exportación explícita al ámbito global del navegador
window.getProfileView = getProfileView;
window.actualizarContadorDesc = actualizarContadorDesc;
window.toggleEditProfile = toggleEditProfile;
window.guardarPerfil = guardarPerfil;
window.cargarImagenAvatar = cargarImagenAvatar;
window.cargarImagenBanner = cargarImagenBanner;