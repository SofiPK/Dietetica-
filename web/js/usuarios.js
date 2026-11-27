/**
 * DIETÉTICA VIDA NATURAL — GESTIÓN DE USUARIOS Y PERFILES (SOLO GERENTE)
 */

let listaUsuariosGlobal = [];
let editandoUsuarioId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("usuarios")) return;
    cargarUsuarios();
});

async function cargarUsuarios() {
    try {
        const res = await fetch("/api/usuarios");
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
            listaUsuariosGlobal = data;
            renderizarTablaUsuarios(listaUsuariosGlobal);
        } else {
            mostrarAlertaUsuarios(data.error || "No se pudieron cargar los usuarios.", "error");
        }
    } catch (err) {
        mostrarAlertaUsuarios("Error de conexión al cargar usuarios.", "error");
    }
}

function filtrarUsuarios() {
    const txt = (document.getElementById("filtro-usuarios")?.value || "").toLowerCase().trim();
    const filtrados = listaUsuariosGlobal.filter(u =>
        (u.nombreUsuario && u.nombreUsuario.toLowerCase().includes(txt)) ||
        (u.nombre && u.nombre.toLowerCase().includes(txt)) ||
        (u.apellido && u.apellido.toLowerCase().includes(txt)) ||
        (u.perfil && u.perfil.toLowerCase().includes(txt))
    );
    renderizarTablaUsuarios(filtrados);
}

function renderizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById("tbody-usuarios");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay usuarios registrados.</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const esMismoUsuario = usuarioActual && u.id === usuarioActual.id;
        const badgePerfil = u.perfil === "GERENTE"
            ? `<span class="badge badge-gerente">GERENTE</span>`
            : `<span class="badge badge-admin">ADMINISTRATIVO</span>`;

        const botonEstado = esMismoUsuario
            ? `<span class="badge" title="No puedes desactivar tu propia cuenta">Sesión actual</span>`
            : (u.activo
                ? `<button type="button" class="btn btn-outline-danger btn-sm" onclick="cambiarEstadoUsuario(${u.id}, false)">Baja</button>`
                : `<button type="button" class="btn btn-success btn-sm" onclick="cambiarEstadoUsuario(${u.id}, true)">Activar</button>`);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${u.nombreUsuario}</code></td>
            <td><strong>${u.nombre} ${u.apellido}</strong></td>
            <td>${badgePerfil}</td>
            <td>
                <span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">
                    ${u.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td style="white-space: nowrap;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="editarUsuario(${u.id})">Editar</button>
                ${botonEstado}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalUsuario() {
    editandoUsuarioId = null;
    document.getElementById("modal-usuario-titulo").textContent = "Registrar Usuario";
    document.getElementById("modal-usuario-error").style.display = "none";
    document.getElementById("form-usuario").reset();

    const inputUser = document.getElementById("usr-username");
    inputUser.disabled = false;

    const inputPass = document.getElementById("usr-password");
    inputPass.required = true;
    inputPass.placeholder = "Ingrese contraseña";
    document.getElementById("usr-password-label").textContent = "Contraseña (mínimo 4 caracteres)";

    document.getElementById("modal-usuario").style.display = "flex";
}

function cerrarModalUsuario() {
    document.getElementById("modal-usuario").style.display = "none";
}

function editarUsuario(id) {
    const u = listaUsuariosGlobal.find(item => item.id === id);
    if (!u) return;

    editandoUsuarioId = u.id;
    document.getElementById("modal-usuario-titulo").textContent = "Modificar Usuario";
    document.getElementById("modal-usuario-error").style.display = "none";

    const inputUser = document.getElementById("usr-username");
    inputUser.value = u.nombreUsuario;
    inputUser.disabled = true;

    document.getElementById("usr-perfil").value = u.perfil;
    document.getElementById("usr-nombre").value = u.nombre;
    document.getElementById("usr-apellido").value = u.apellido;

    const inputPass = document.getElementById("usr-password");
    inputPass.value = "";
    inputPass.required = false;
    inputPass.placeholder = "Dejar vacío para mantener la actual";
    document.getElementById("usr-password-label").textContent = "Nueva Contraseña (opcional)";

    document.getElementById("modal-usuario").style.display = "flex";
}

async function guardarUsuario(e) {
    e.preventDefault();
    const errorBox = document.getElementById("modal-usuario-error");
    errorBox.style.display = "none";

    const existente = editandoUsuarioId ? listaUsuariosGlobal.find(item => item.id === editandoUsuarioId) : null;

    const payload = {
        id: editandoUsuarioId,
        nombreUsuario: document.getElementById("usr-username").value.trim(),
        nombre: document.getElementById("usr-nombre").value.trim(),
        apellido: document.getElementById("usr-apellido").value.trim(),
        perfil: document.getElementById("usr-perfil").value,
        contrasena: document.getElementById("usr-password").value,
        activo: existente ? existente.activo : true
    };

    try {
        const res = await fetch("/api/usuarios", {
            method: editandoUsuarioId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            cerrarModalUsuario();
            mostrarAlertaUsuarios(editandoUsuarioId ? "Usuario actualizado con éxito." : "Usuario registrado con éxito.", "success");
            cargarUsuarios();
        } else {
            errorBox.textContent = data.error || "No se pudo guardar el usuario.";
            errorBox.style.display = "block";
        }
    } catch (err) {
        errorBox.textContent = "Error de conexión al guardar el usuario.";
        errorBox.style.display = "block";
    }
}

async function cambiarEstadoUsuario(id, activar) {
    const u = listaUsuariosGlobal.find(item => item.id === id);
    if (!u) return;

    if (!confirm(`¿Confirma ${activar ? "reactivar" : "dar de baja"} al usuario '${u.nombreUsuario}' (${u.nombre} ${u.apellido})?`)) return;

    try {
        const res = await fetch(`/api/usuarios?id=${id}&activar=${activar}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok && data.exito) {
            mostrarAlertaUsuarios(activar ? "Usuario reactivado con éxito." : "Usuario dado de baja con éxito.", "success");
            cargarUsuarios();
        } else {
            mostrarAlertaUsuarios(data.error || "No se pudo actualizar el estado del usuario.", "error");
        }
    } catch (err) {
        mostrarAlertaUsuarios("Error de conexión al cambiar el estado del usuario.", "error");
    }
}

function mostrarAlertaUsuarios(mensaje, tipo) {
    const alerta = document.getElementById("usuarios-alerta");
    if (!alerta) return;
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo}`;
    alerta.style.display = "block";
}
