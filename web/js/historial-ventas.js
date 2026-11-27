/**
 * DIETÉTICA VIDA NATURAL — HISTORIAL DE VENTAS Y REMITOS
 */

let listaVentasGlobal = [];
let ordenVentasColumna = null;
let ordenVentasAsc = true;

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("historial-ventas")) return;
    cargarHistorialVentasERP();
});

async function cargarHistorialVentasERP() {
    try {
        const res = await fetch("/api/ventas");
        listaVentasGlobal = await res.json();
        aplicarFiltroYOrdenVentas();
    } catch (err) {
        console.error("Error al cargar historial de ventas:", err);
    }
}

function ordenarVentasPor(columna) {
    if (ordenVentasColumna === columna) {
        ordenVentasAsc = !ordenVentasAsc;
    } else {
        ordenVentasColumna = columna;
        ordenVentasAsc = true;
    }
    actualizarIconosOrdenVentas();
    aplicarFiltroYOrdenVentas();
}

function actualizarIconosOrdenVentas() {
    const columnas = ["id", "fecha", "articulos", "medioPago", "descuentoTotal", "importeTotal", "estado"];
    columnas.forEach(col => {
        const btn = document.getElementById(`th-venta-btn-${col}`);
        const icon = document.getElementById(`th-venta-icon-${col}`);
        if (!btn || !icon) return;

        if (ordenVentasColumna === col) {
            btn.classList.add("active");
            icon.innerHTML = ordenVentasAsc ? "&#9650;" : "&#9660;";
        } else {
            btn.classList.remove("active");
            icon.innerHTML = "&#8693;";
        }
    });
}

function aplicarFiltroYOrdenVentas() {
    const txt = (document.getElementById("historial-buscar-texto")?.value || "").toLowerCase().trim();
    const desde = document.getElementById("historial-desde")?.value || "";
    const hasta = document.getElementById("historial-hasta")?.value || "";

    let resultado = listaVentasGlobal.filter(v => {
        let coincideTexto = true;
        if (txt) {
            coincideTexto = (v.detalles || []).some(d =>
                (d.productoCodigo && d.productoCodigo.toLowerCase().includes(txt)) ||
                (d.descripcion && d.descripcion.toLowerCase().includes(txt))
            ) || String(v.id).includes(txt) || (v.medioPago && v.medioPago.toLowerCase().includes(txt));
        }
        let coincideFecha = true;
        if (v.fecha) {
            const fechaVenta = v.fecha.substring(0, 10);
            if (desde && fechaVenta < desde) coincideFecha = false;
            if (hasta && fechaVenta > hasta) coincideFecha = false;
        }
        return coincideTexto && coincideFecha;
    });

    if (ordenVentasColumna) {
        resultado = [...resultado].sort((a, b) => {
            let valA;
            let valB;

            if (ordenVentasColumna === "articulos") {
                valA = (a.detalles || []).map(d => d.descripcion || d.productoCodigo || "").join(", ").toLowerCase();
                valB = (b.detalles || []).map(d => d.descripcion || d.productoCodigo || "").join(", ").toLowerCase();
            } else if (ordenVentasColumna === "descuentoTotal" || ordenVentasColumna === "importeTotal" || ordenVentasColumna === "id") {
                valA = Number(a[ordenVentasColumna] || 0);
                valB = Number(b[ordenVentasColumna] || 0);
            } else {
                valA = String(a[ordenVentasColumna] || "").toLowerCase();
                valB = String(b[ordenVentasColumna] || "").toLowerCase();
            }

            if (valA < valB) return ordenVentasAsc ? -1 : 1;
            if (valA > valB) return ordenVentasAsc ? 1 : -1;
            return 0;
        });
    }

    renderizarHistorialVentas(resultado);
}

function renderizarHistorialVentas(ventas) {
    const tbody = document.getElementById("tbody-historial-erp");
    tbody.innerHTML = "";

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No se encontraron ventas registradas.</td></tr>`;
        return;
    }

    ventas.forEach(v => {
        const fechaFmt = v.fecha ? v.fecha.replace("T", " ").substring(0, 19) : "-";
        const resumenItems = (v.detalles || [])
            .map(d => `<code>${d.productoCodigo}</code> ${d.descripcion} (x${d.cantidad})`)
            .join("<br>");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>#${v.id}</strong></td>
            <td>${fechaFmt}</td>
            <td>${resumenItems || "-"}</td>
            <td><span class="badge">${v.medioPago || "EFECTIVO"}</span></td>
            <td>${v.descuentoTotal > 0 ? `-$${v.descuentoTotal.toFixed(2)}` : "-"}</td>
            <td><strong>$${v.importeTotal.toFixed(2)}</strong></td>
            <td><span class="badge badge-success">${v.estado}</span></td>
            <td>
                <button type="button" class="btn btn-secondary btn-sm" onclick="verRemito(${v.id})">Ver Remito</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function verRemito(ventaId) {
    const venta = listaVentasGlobal.find(v => v.id === ventaId);
    if (!venta) {
        alert("No se encontró el detalle de la venta seleccionada.");
        return;
    }
    abrirModalRemitoDesdeObjeto(venta);
}

function abrirModalRemitoDesdeObjeto(venta) {
    const fechaFmt = venta.fecha ? venta.fecha.replace("T", " ").substring(0, 19) : "-";
    document.getElementById("remito-numero").textContent = `#${venta.id}`;
    document.getElementById("remito-fecha").textContent = fechaFmt;
    document.getElementById("remito-cliente").textContent = venta.clienteNombre || "Consumidor Final";
    document.getElementById("remito-medio-pago").textContent = venta.medioPago || "EFECTIVO";
    document.getElementById("remito-estado").textContent = venta.estado || "CONFIRMADA";
    document.getElementById("remito-operador").textContent = venta.operador || (usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellido}` : "-");

    const tbody = document.getElementById("remito-tbody-items");
    tbody.innerHTML = "";
    (venta.detalles || []).forEach(d => {
        const precioUnit = d.precioUnitario !== undefined
            ? d.precioUnitario
            : (d.cantidad > 0 ? d.subtotal / d.cantidad : 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${d.productoCodigo}</code></td>
            <td>${d.descripcion || "-"}</td>
            <td>${d.cantidad}</td>
            <td>$${precioUnit.toFixed(2)}</td>
            <td><strong>$${(d.subtotal || 0).toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    const filaDesc = document.getElementById("remito-fila-descuento");
    if (venta.descuentoTotal && venta.descuentoTotal > 0) {
        filaDesc.style.display = "block";
        document.getElementById("remito-descuento").textContent = `-$${venta.descuentoTotal.toFixed(2)}`;
    } else {
        filaDesc.style.display = "none";
    }

    document.getElementById("remito-total").textContent = `$${(venta.importeTotal || 0).toFixed(2)}`;
    document.getElementById("modal-remito").style.display = "flex";
}

function cerrarModalRemito() {
    document.getElementById("modal-remito").style.display = "none";
}

function imprimirRemito() {
    window.print();
}

function filtrarHistorialVentas() {
    aplicarFiltroYOrdenVentas();
}

function limpiarFiltrosHistorial() {
    ordenVentasColumna = null;
    ordenVentasAsc = true;
    document.getElementById("historial-buscar-texto").value = "";
    document.getElementById("historial-desde").value = "";
    document.getElementById("historial-hasta").value = "";
    actualizarIconosOrdenVentas();
    aplicarFiltroYOrdenVentas();
}
