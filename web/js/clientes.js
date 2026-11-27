/**
 * DIETÉTICA VIDA NATURAL — GESTIÓN DE CLIENTES
 */

let listaClientesGlobal = [];
let editandoClienteId = null;
let ordenClientesColumna = null;
let ordenClientesAsc = true;

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("clientes")) return;
    cargarClientes();
});

async function cargarClientes() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const btnNuevo = document.getElementById("btn-nuevo-cliente");
    if (btnNuevo) btnNuevo.style.display = esAdmin ? "inline-flex" : "none";

    try {
        const res = await fetch("/api/clientes");
        listaClientesGlobal = await res.json();
        aplicarFiltroYOrdenClientes();
    } catch (err) {
        console.error("Error al cargar clientes:", err);
    }
}

function ordenarClientesPor(columna) {
    if (ordenClientesColumna === columna) {
        ordenClientesAsc = !ordenClientesAsc;
    } else {
        ordenClientesColumna = columna;
        ordenClientesAsc = true;
    }
    actualizarIconosOrdenClientes();
    aplicarFiltroYOrdenClientes();
}

function limpiarOrdenClientes() {
    ordenClientesColumna = null;
    ordenClientesAsc = true;
    const inputFiltro = document.getElementById("filtro-clientes");
    if (inputFiltro) inputFiltro.value = "";
    actualizarIconosOrdenClientes();
    aplicarFiltroYOrdenClientes();
}

function actualizarIconosOrdenClientes() {
    const columnas = ["dniCuit", "nombreApellido"];
    columnas.forEach(col => {
        const btn = document.getElementById(`th-cli-btn-${col}`);
        const icon = document.getElementById(`th-cli-icon-${col}`);
        if (!btn || !icon) return;

        if (ordenClientesColumna === col) {
            btn.classList.add("active");
            icon.innerHTML = ordenClientesAsc ? "&#9650;" : "&#9660;";
        } else {
            btn.classList.remove("active");
            icon.innerHTML = "&#8693;";
        }
    });
}

function aplicarFiltroYOrdenClientes() {
    const txt = (document.getElementById("filtro-clientes")?.value || "").toLowerCase().trim();
    let resultado = listaClientesGlobal.filter(c =>
        (c.dniCuit && c.dniCuit.toLowerCase().includes(txt)) ||
        (c.nombre && c.nombre.toLowerCase().includes(txt)) ||
        (c.apellido && c.apellido.toLowerCase().includes(txt)) ||
        (c.telefono && c.telefono.toLowerCase().includes(txt))
    );

    if (ordenClientesColumna) {
        resultado = [...resultado].sort((a, b) => {
            if (ordenClientesColumna === "dniCuit") {
                const numA = parseInt(String(a.dniCuit || "").replace(/\D/g, ""), 10);
                const numB = parseInt(String(b.dniCuit || "").replace(/\D/g, ""), 10);
                if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                    return ordenClientesAsc ? numA - numB : numB - numA;
                }
                const strA = String(a.dniCuit || "").toLowerCase();
                const strB = String(b.dniCuit || "").toLowerCase();
                return ordenClientesAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
            }

            if (ordenClientesColumna === "nombreApellido") {
                const nomA = `${a.nombre || ""} ${a.apellido || ""}`.trim().toLowerCase();
                const nomB = `${b.nombre || ""} ${b.apellido || ""}`.trim().toLowerCase();
                return ordenClientesAsc ? nomA.localeCompare(nomB, "es") : nomB.localeCompare(nomA, "es");
            }

            return 0;
        });
    }

    renderizarTablaClientes(resultado);
}

function renderizarTablaClientes(clientes) {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const tbody = document.getElementById("tbody-clientes");
    tbody.innerHTML = "";

    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No hay clientes registrados.</td></tr>`;
        return;
    }

    clientes.forEach(c => {
        const acciones = esAdmin
            ? `<button class="btn btn-secondary btn-sm" onclick="editarCliente(${c.id})">Editar</button>
               ${c.activo
                   ? `<button class="btn btn-outline-danger btn-sm" onclick="cambiarEstadoCliente(${c.id}, false)">Baja</button>`
                   : `<button class="btn btn-success btn-sm" onclick="cambiarEstadoCliente(${c.id}, true)">Activar</button>`
               }`
            : `<span class="badge">Solo lectura</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${c.dniCuit}</code></td>
            <td><strong>${c.nombre} ${c.apellido}</strong></td>
            <td>${c.telefono || "-"}</td>
            <td>${c.email || "-"}</td>
            <td><span class="badge ${c.aceptaPromociones ? 'badge-success' : ''}">${c.aceptaPromociones ? 'Suscripto' : 'No'}</span></td>
            <td><span class="badge ${c.activo ? 'badge-success' : 'badge-danger'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td style="white-space: nowrap;">${acciones}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarClientes() {
    aplicarFiltroYOrdenClientes();
}

function abrirModalCliente() {
    editandoClienteId = null;
    document.getElementById("modal-cliente-titulo").textContent = "Registrar Cliente";
    document.getElementById("form-cliente").reset();
    document.getElementById("cli-acepta-promos").checked = true;
    document.getElementById("modal-cliente").style.display = "flex";
}

function cerrarModalCliente() {
    document.getElementById("modal-cliente").style.display = "none";
}

function editarCliente(id) {
    const c = listaClientesGlobal.find(item => item.id === id);
    if (!c) return;

    editandoClienteId = c.id;
    document.getElementById("modal-cliente-titulo").textContent = "Modificar Cliente";
    document.getElementById("cli-dni").value = c.dniCuit;
    document.getElementById("cli-nombre").value = c.nombre;
    document.getElementById("cli-apellido").value = c.apellido;
    document.getElementById("cli-telefono").value = c.telefono || "";
    document.getElementById("cli-email").value = c.email || "";
    document.getElementById("cli-acepta-promos").checked = !!c.aceptaPromociones;
    document.getElementById("modal-cliente").style.display = "flex";
}

async function guardarCliente(e) {
    e.preventDefault();
    const existente = editandoClienteId ? listaClientesGlobal.find(item => item.id === editandoClienteId) : null;

    const payload = {
        id: editandoClienteId,
        dniCuit: document.getElementById("cli-dni").value.trim(),
        nombre: document.getElementById("cli-nombre").value.trim(),
        apellido: document.getElementById("cli-apellido").value.trim(),
        telefono: document.getElementById("cli-telefono").value.trim(),
        email: document.getElementById("cli-email").value.trim(),
        aceptaPromociones: document.getElementById("cli-acepta-promos").checked,
        activo: existente ? existente.activo : true
    };

    try {
        const res = await fetch("/api/clientes", {
            method: editandoClienteId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert(editandoClienteId ? "Cliente actualizado con éxito." : "Cliente registrado con éxito.");
            cerrarModalCliente();
            cargarClientes();
        } else {
            alert(data.error || "No se pudo guardar el cliente.");
        }
    } catch (err) {
        alert("Error de conexión al guardar el cliente.");
    }
}

async function cambiarEstadoCliente(id, activar) {
    const c = listaClientesGlobal.find(item => item.id === id);
    if (!c) return;
    if (!confirm(`¿Confirma ${activar ? "reactivar" : "dar de baja"} al cliente ${c.nombre} ${c.apellido}?`)) return;

    try {
        const res = activar
            ? await fetch("/api/clientes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...c, activo: true })
            })
            : await fetch(`/api/clientes?id=${id}`, { method: "DELETE" });

        const data = await res.json();
        if (res.ok && data.exito) {
            cargarClientes();
        } else {
            alert(data.error || "No se pudo actualizar el estado del cliente.");
        }
    } catch (err) {
        alert("Error de conexión al cambiar estado del cliente.");
    }
}
