/**
 * DIETÉTICA VIDA NATURAL — PROMOCIONES Y DESCUENTOS
 */

let listaPromocionesGlobal = [];
let listaProductosGlobal = [];
let editandoPromoId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("promociones")) return;
    cargarPromociones();
});

async function cargarPromociones() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const btnNueva = document.getElementById("btn-nueva-promo");
    if (btnNueva) btnNueva.style.display = esAdmin ? "inline-flex" : "none";

    try {
        const [resPromos, resProds] = await Promise.all([
            fetch("/api/promociones"),
            fetch("/api/productos")
        ]);
        listaPromocionesGlobal = await resPromos.json();
        listaProductosGlobal = await resProds.json();
        renderizarTablaPromociones(listaPromocionesGlobal);
    } catch (err) {
        console.error("Error al cargar promociones:", err);
    }
}

function renderizarTablaPromociones(promos) {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const tbody = document.getElementById("tbody-promociones");
    tbody.innerHTML = "";

    if (!promos || promos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay promociones registradas.</td></tr>`;
        return;
    }

    const hoy = new Date().toISOString().substring(0, 10);

    promos.forEach(p => {
        const vigenteHoy = p.activa && p.vigenciaDesde <= hoy && p.vigenciaHasta >= hoy;
        const descuentoTxt = p.tipoDescuento === "PORCENTAJE" ? `${p.valor}% OFF` : `$${p.valor.toFixed(2)} OFF`;
        const codigosTxt = (p.productosCodigos || []).map(c => `<code>${c}</code>`).join(" ") || "-";

        const estadoBadge = vigenteHoy
            ? `<span class="badge badge-success">Vigente</span>`
            : (p.activa ? `<span class="badge badge-warning">Programada / Vencida</span>` : `<span class="badge badge-danger">Inactiva</span>`);

        const acciones = esAdmin
            ? `<button class="btn btn-secondary btn-sm" onclick="editarPromocion(${p.id})">Editar</button>
               ${p.activa ? `<button class="btn btn-outline-danger btn-sm" onclick="desactivarPromocion(${p.id})">Desactivar</button>` : ""}`
            : `<span class="badge">Solo lectura</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${p.nombre}</strong></td>
            <td><span class="badge badge-warning">${descuentoTxt}</span></td>
            <td>${p.vigenciaDesde} al ${p.vigenciaHasta}</td>
            <td>${codigosTxt}</td>
            <td>${estadoBadge}</td>
            <td style="white-space: nowrap;">${acciones}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarChecklistProductosPromo(codigosSeleccionados = []) {
    const cont = document.getElementById("promo-lista-productos");
    cont.innerHTML = "";
    const activos = listaProductosGlobal.filter(p => p.activo);

    if (activos.length === 0) {
        cont.innerHTML = `<span style="color:var(--text-secondary); font-size:0.85rem;">No hay productos activos disponibles.</span>`;
        return;
    }

    activos.forEach(p => {
        const checked = codigosSeleccionados.includes(p.codigo) ? "checked" : "";
        const label = document.createElement("label");
        label.className = "checklist-item";
        label.innerHTML = `
            <input type="checkbox" name="promo-prod-check" value="${p.codigo}" ${checked}>
            <span><code>${p.codigo}</code> — ${p.descripcion} ($${p.precioUnitario.toFixed(2)})</span>
        `;
        cont.appendChild(label);
    });
}

function abrirModalPromocion() {
    editandoPromoId = null;
    document.getElementById("modal-promo-titulo").textContent = "Nueva Promoción";
    document.getElementById("form-promocion").reset();
    const hoy = new Date().toISOString().substring(0, 10);
    document.getElementById("promo-desde").value = hoy;
    renderizarChecklistProductosPromo([]);
    document.getElementById("modal-promocion").style.display = "flex";
}

function cerrarModalPromocion() {
    document.getElementById("modal-promocion").style.display = "none";
}

function editarPromocion(id) {
    const p = listaPromocionesGlobal.find(item => item.id === id);
    if (!p) return;

    editandoPromoId = p.id;
    document.getElementById("modal-promo-titulo").textContent = "Modificar Promoción";
    document.getElementById("promo-nombre").value = p.nombre;
    document.getElementById("promo-tipo").value = p.tipoDescuento;
    document.getElementById("promo-valor").value = p.valor;
    document.getElementById("promo-desde").value = p.vigenciaDesde;
    document.getElementById("promo-hasta").value = p.vigenciaHasta;
    renderizarChecklistProductosPromo(p.productosCodigos || []);
    document.getElementById("modal-promocion").style.display = "flex";
}

async function guardarPromocion(e) {
    e.preventDefault();
    const seleccionados = Array.from(document.querySelectorAll('input[name="promo-prod-check"]:checked'))
        .map(cb => cb.value);

    if (seleccionados.length === 0) {
        alert("Seleccione al menos un producto para aplicar la promoción.");
        return;
    }

    const payload = {
        id: editandoPromoId,
        nombre: document.getElementById("promo-nombre").value.trim(),
        tipoDescuento: document.getElementById("promo-tipo").value,
        valor: parseFloat(document.getElementById("promo-valor").value),
        vigenciaDesde: document.getElementById("promo-desde").value,
        vigenciaHasta: document.getElementById("promo-hasta").value,
        activa: true,
        productosCodigos: seleccionados.join("|")
    };

    try {
        const res = await fetch("/api/promociones", {
            method: editandoPromoId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert(editandoPromoId ? "Promoción actualizada con éxito." : "Promoción creada con éxito.");
            cerrarModalPromocion();
            cargarPromociones();
        } else {
            alert(data.error || "No se pudo guardar la promoción.");
        }
    } catch (err) {
        alert("Error de conexión al guardar la promoción.");
    }
}

async function desactivarPromocion(id) {
    if (!confirm("¿Confirma desactivar esta promoción?")) return;
    try {
        const res = await fetch(`/api/promociones?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok && data.exito) {
            cargarPromociones();
        } else {
            alert(data.error || "No se pudo desactivar la promoción.");
        }
    } catch (err) {
        alert("Error de conexión al desactivar la promoción.");
    }
}
