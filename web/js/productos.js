/**
 * DIETÉTICA VIDA NATURAL — INVENTARIO DE PRODUCTOS
 */

let listaProductosGlobal = [];
let editandoProductoCodigo = null;
let ordenProductosColumna = null;
let ordenProductosAsc = true;

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("productos")) return;
    cargarProductos();
});

async function cargarProductos() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const btnNuevo = document.getElementById("btn-nuevo-producto");
    if (btnNuevo) btnNuevo.style.display = esAdmin ? "inline-flex" : "none";

    try {
        const res = await fetch("/api/productos");
        listaProductosGlobal = await res.json();
        aplicarFiltroYOrdenProductos();
    } catch (err) {
        console.error("Error al cargar productos:", err);
    }
}

function ordenarProductosPor(columna) {
    if (ordenProductosColumna === columna) {
        ordenProductosAsc = !ordenProductosAsc;
    } else {
        ordenProductosColumna = columna;
        ordenProductosAsc = true;
    }
    actualizarIconosOrdenProductos();
    aplicarFiltroYOrdenProductos();
}

function limpiarOrdenProductos() {
    ordenProductosColumna = null;
    ordenProductosAsc = true;
    const inputFiltro = document.getElementById("filtro-productos");
    if (inputFiltro) inputFiltro.value = "";
    actualizarIconosOrdenProductos();
    aplicarFiltroYOrdenProductos();
}

function actualizarIconosOrdenProductos() {
    const columnas = ["codigo", "descripcion", "categoria", "precioUnitario", "stockActual", "stockMinimo", "activo"];
    columnas.forEach(col => {
        const btn = document.getElementById(`th-btn-${col}`);
        const icon = document.getElementById(`th-icon-${col}`);
        if (!btn || !icon) return;

        if (ordenProductosColumna === col) {
            btn.classList.add("active");
            icon.innerHTML = ordenProductosAsc ? "&#9650;" : "&#9660;";
        } else {
            btn.classList.remove("active");
            icon.innerHTML = "&#8693;";
        }
    });
}

function aplicarFiltroYOrdenProductos() {
    const txt = (document.getElementById("filtro-productos")?.value || "").toLowerCase().trim();
    let resultado = listaProductosGlobal.filter(p =>
        p.codigo.toLowerCase().includes(txt) ||
        p.descripcion.toLowerCase().includes(txt) ||
        p.categoria.toLowerCase().includes(txt)
    );

    if (ordenProductosColumna) {
        resultado = [...resultado].sort((a, b) => {
            let valA = a[ordenProductosColumna];
            let valB = b[ordenProductosColumna];

            if (typeof valA === "boolean") {
                valA = valA ? 1 : 0;
                valB = valB ? 1 : 0;
            } else if (typeof valA === "string") {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return ordenProductosAsc ? -1 : 1;
            if (valA > valB) return ordenProductosAsc ? 1 : -1;
            return 0;
        });
    }

    renderizarTablaProductos(resultado);
}

function renderizarTablaProductos(productos) {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const tbody = document.getElementById("tbody-productos");
    tbody.innerHTML = "";

    if (!productos || productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No hay productos registrados en el inventario.</td></tr>`;
        return;
    }

    productos.forEach(p => {
        const accionesHtml = esAdmin
            ? `<button class="btn btn-secondary btn-sm" onclick="editarProducto('${p.codigo}')">Modificar</button>
               ${p.activo 
                   ? `<button class="btn btn-outline-danger btn-sm" onclick="darBajaProducto('${p.codigo}')">Baja</button>` 
                   : `<button class="btn btn-success btn-sm" onclick="reactivarProducto('${p.codigo}')">Activar</button>`
               }`
            : `<span class="badge">Solo lectura</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${p.codigo}</code></td>
            <td>${p.descripcion}</td>
            <td><span class="badge">${p.categoria}</span></td>
            <td>$${p.precioUnitario.toFixed(2)}</td>
            <td><strong>${p.stockActual}</strong></td>
            <td>${p.stockMinimo}</td>
            <td>
                <span class="badge ${p.activo ? 'badge-success' : 'badge-danger'}">
                    ${p.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td style="white-space: nowrap;">${accionesHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarProductos() {
    aplicarFiltroYOrdenProductos();
}

function abrirModalProducto() {
    editandoProductoCodigo = null;
    document.getElementById("modal-titulo").textContent = "Registrar Nuevo Producto";
    document.getElementById("prod-codigo").disabled = false;
    document.getElementById("form-producto").reset();
    document.getElementById("modal-producto").style.display = "flex";
}

function cerrarModalProducto() {
    document.getElementById("modal-producto").style.display = "none";
}

function editarProducto(codigo) {
    const p = listaProductosGlobal.find(item => item.codigo === codigo);
    if (!p) return;

    editandoProductoCodigo = p.codigo;
    document.getElementById("modal-titulo").textContent = "Modificar Datos del Producto";
    document.getElementById("prod-codigo").value = p.codigo;
    document.getElementById("prod-codigo").disabled = true;
    document.getElementById("prod-desc").value = p.descripcion;
    document.getElementById("prod-cat").value = p.categoria;
    document.getElementById("prod-precio").value = p.precioUnitario;
    document.getElementById("prod-stock-act").value = p.stockActual;
    document.getElementById("prod-stock-min").value = p.stockMinimo;

    document.getElementById("modal-producto").style.display = "flex";
}

async function guardarProducto(e) {
    e.preventDefault();

    const prodExistente = editandoProductoCodigo
        ? listaProductosGlobal.find(item => item.codigo === editandoProductoCodigo)
        : null;

    const productoData = {
        codigo: document.getElementById("prod-codigo").value.trim().toUpperCase(),
        descripcion: document.getElementById("prod-desc").value.trim(),
        categoria: document.getElementById("prod-cat").value,
        precioUnitario: parseFloat(document.getElementById("prod-precio").value),
        stockActual: parseInt(document.getElementById("prod-stock-act").value, 10),
        stockMinimo: parseInt(document.getElementById("prod-stock-min").value, 10),
        activo: prodExistente ? prodExistente.activo : true
    };

    try {
        const res = await fetch("/api/productos", {
            method: editandoProductoCodigo ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productoData)
        });

        const data = await res.json();
        if (res.ok && data.exito) {
            alert(editandoProductoCodigo ? "Producto modificado con éxito." : "Producto registrado con éxito.");
            cerrarModalProducto();
            cargarProductos();
        } else {
            alert(data.error || "No se pudo guardar el producto.");
        }
    } catch (err) {
        alert("Error de conexión al guardar el producto.");
    }
}

async function darBajaProducto(codigo) {
    if (!confirm(`¿Confirma la baja lógica del producto ${codigo}?`)) return;

    try {
        const res = await fetch(`/api/productos?codigo=${encodeURIComponent(codigo)}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert("Baja lógica efectuada con éxito.");
            cargarProductos();
        } else {
            alert(data.error || "No se pudo procesar la baja.");
        }
    } catch (err) {
        alert("Error de conexión al dar de baja el producto.");
    }
}

async function reactivarProducto(codigo) {
    const p = listaProductosGlobal.find(item => item.codigo === codigo);
    if (!p) return;

    if (!confirm(`¿Desea reactivar el producto ${p.codigo} (${p.descripcion})?`)) return;

    try {
        const res = await fetch("/api/productos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...p, activo: true })
        });

        const data = await res.json();
        if (res.ok && data.exito) {
            alert("Producto reactivado con éxito.");
            cargarProductos();
        } else {
            alert(data.error || "No se pudo reactivar el producto.");
        }
    } catch (err) {
        alert("Error de conexión al reactivar el producto.");
    }
}
