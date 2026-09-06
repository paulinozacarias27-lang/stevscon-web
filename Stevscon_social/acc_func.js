// Abre el modal de cambiar cuenta
function abrirModalMulticuentas() {
    sincronizarCuentaActual(); // Asegurar datos frescos
    renderizarModalMulticuentas();
}

// Renderiza o re-renderiza el modal en pantalla
function renderizarModalMulticuentas() {
    cerrarModalMulticuentas(); // Limpia modal anterior si existe

    const cuentas = obtenerCuentasGuardadas();
    const handleActual = (typeof sesionActual !== 'undefined' && sesionActual) ? sesionActual.handle : null;

    let listaHTML = '';

    if (cuentas.length === 0) {
        listaHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No hay otras cuentas guardadas.</p>`;
    } else {
        listaHTML = cuentas.map(acc => {
            const esActiva = acc.handle === handleActual;
            const avatarContent = acc.avatar 
                ? `<img src="${acc.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` 
                : `<div style="font-weight:bold; color:var(--purple-accent);">${acc.nombre.charAt(0).toUpperCase()}</div>`;

            return `
            <div class="acc-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-main); border: 1px solid ${esActiva ? 'var(--purple-accent)' : 'var(--border-color)'}; border-radius: 8px; margin-bottom: 10px; position: relative;">
                
                <!-- Info de cuenta (Click para cambiar) -->
                <div style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex-grow: 1;" onclick="cambiarAEstaCuenta('${acc.handle}')">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1.5px solid var(--purple-accent);">
                        ${avatarContent}
                    </div>
                    <div>
                        <div style="font-weight: bold; font-size: 0.95rem; color: var(--text-main); text-align: left;">
                            ${acc.nombre} ${esActiva ? '<span style="font-size:0.7rem; background:var(--purple-accent); padding:2px 6px; border-radius:10px; margin-left:5px;">Activa</span>' : ''}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: left;">${acc.handle}</div>
                    </div>
                </div>

                <!-- Botón de 3 Puntos -->
                <div style="position: relative;">
                    <button class="btn-dots" onclick="event.stopPropagation(); toggleMenuAccOp('${acc.handle}')" style="background: transparent; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer; padding: 5px 8px; border-radius: 4px;">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                    <!-- Menú Desplegable -->
                    <div id="opMenu-${acc.handle.replace('@','')}" class="hidden" style="position: absolute; right: 0; top: 30px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; width: 120px; z-index: 1010; box-shadow: 0 4px 15px rgba(0,0,0,0.7); overflow: hidden;">
                        <button onclick="olvidarCuenta('${acc.handle}')" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: var(--text-main); font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-eye-slash"></i> Olvidar
                        </button>
                        <button onclick="eliminarCuentaCompletamente('${acc.handle}')" style="width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: var(--danger); font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--border-color);">
                            <i class="fa-solid fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>

            </div>`;
        }).join('');
    }

    const modalHTML = `
    <div id="modal-multicuentas" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.75); display:flex; justify-content:center; align-items:center; z-index:1000;" onclick="cerrarModalMulticuentas()">
        <div class="card" style="width: 90%; max-width: 400px; padding: 20px; position: relative;" onclick="event.stopPropagation()">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                <h3 style="margin:0; font-size: 1.2rem; color: var(--text-main); display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-users-gear" style="color:var(--purple-accent);"></i> Cambiar cuenta
                </h3>
                <button onclick="cerrarModalMulticuentas()" style="background:transparent; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer;">&times;</button>
            </div>

            <div style="max-height: 280px; overflow-y: auto; padding-right: 5px;">
                ${listaHTML}
            </div>

            <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <button class="btn btn-outline" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="cerrarModalMulticuentas(); cargarCategoria('login');">
                    <i class="fa-solid fa-user-plus"></i> Añadir otra cuenta
                </button>
            </div>

        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Cierra el modal de multicuentas
function cerrarModalMulticuentas() {
    const modal = document.getElementById('modal-multicuentas');
    if (modal) modal.remove();
}

// Alterna la visibilidad del menú desplegable de 3 puntos
function toggleMenuAccOp(handle) {
    const cleanId = handle.replace('@','');
    const menu = document.getElementById(`opMenu-${cleanId}`);
    
    // Cerrar otros menús abiertos
    document.querySelectorAll('[id^="opMenu-"]').forEach(el => {
        if (el !== menu) el.classList.add('hidden');
    });

    if (menu) menu.classList.toggle('hidden');
}

// Ocultar menús si se hace clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-dots')) {
        document.querySelectorAll('[id^="opMenu-"]').forEach(el => el.classList.add('hidden'));
    }
});