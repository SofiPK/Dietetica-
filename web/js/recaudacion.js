/**
 * DIETÉTICA VIDA NATURAL — REPORTE DE RECAUDACIÓN Y ESTADÍSTICAS (GERENTE)
 */

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("recaudacion")) return;
    consultarRecaudacion();
});

const ETIQUETAS_CATEGORIA = {
    CEREAL: "Cereales",
    SEMILLA: "Semillas",
    FRUTO_SECO: "Frutos Secos",
    LEGUMBRE: "Legumbres",
    SUPLEMENTO: "Suplementos",
    OTRO: "Otros"
};

async function consultarRecaudacion() {
    const desde = document.getElementById("fecha-desde").value;
    const hasta = document.getElementById("fecha-hasta").value;

    let url = "/api/ventas/recaudado";
    const params = [];
    if (desde) params.push(`desde=${desde}`);
    if (hasta) params.push(`hasta=${hasta}`);
    if (params.length > 0) url += "?" + params.join("&");

    try {
        const res = await fetch(url);
        const data = await res.json();

        const totalRecaudado = data.recaudado || 0;
        document.getElementById("kpi-monto-recaudado").textContent = `$ ${totalRecaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("kpi-cant-ventas").textContent = data.cantidadVentas || 0;
        document.getElementById("kpi-ticket-promedio").textContent = `$ ${(data.ticketPromedio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("kpi-total-descuentos").textContent = `$ ${(data.totalDescuentos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

        // 1. Gráfico de barras por categoría
        renderizarGraficoCategorias(data.porCategoria || [], totalRecaudado);

        // 2. Gráfico de evolución diaria
        renderizarGraficoEvolucion(data.evolucionDiaria || []);

        // 3. Tabla de medios de pago
        const tbodyMedios = document.getElementById("tbody-reporte-medios");
        tbodyMedios.innerHTML = "";
        const medios = data.porMedioPago || [];
        if (medios.length === 0) {
            tbodyMedios.innerHTML = `<tr><td colspan="3" class="text-center">Sin ventas registradas en el período.</td></tr>`;
        } else {
            medios.forEach(m => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><span class="badge badge-admin">${m.medioPago}</span></td>
                    <td>${m.cantidad}</td>
                    <td><strong>$${m.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                `;
                tbodyMedios.appendChild(tr);
            });
        }

        // 4. Tabla Top 5 productos
        const tbodyTop = document.getElementById("tbody-reporte-top");
        tbodyTop.innerHTML = "";
        const tops = data.topProductos || [];
        if (tops.length === 0) {
            tbodyTop.innerHTML = `<tr><td colspan="3" class="text-center">Sin productos vendidos en el período.</td></tr>`;
        } else {
            tops.forEach(t => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><code>${t.codigo}</code> ${t.descripcion}</td>
                    <td>${t.unidades} u.</td>
                    <td><strong>$${t.recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                `;
                tbodyTop.appendChild(tr);
            });
        }

        // 5. Tabla de productos sin rotación
        renderizarTablaSinRotacion(data.sinRotacion || []);

    } catch (err) {
        console.error("Error al consultar recaudación:", err);
    }
}

function renderizarGraficoCategorias(categorias, totalGeneral) {
    const contenedor = document.getElementById("chart-categorias");
    if (!contenedor) return;

    if (!categorias || categorias.length === 0 || totalGeneral <= 0) {
        contenedor.innerHTML = `<div class="text-center" style="color: var(--text-secondary); padding: 1.5rem;">Sin ventas por categoría en el período.</div>`;
        return;
    }

    const maxMonto = Math.max(...categorias.map(c => c.recaudado), 1);

    contenedor.innerHTML = categorias.map(c => {
        const nombreCat = ETIQUETAS_CATEGORIA[c.categoria] || c.categoria;
        const porcentajeTotal = ((c.recaudado / totalGeneral) * 100).toFixed(1);
        const anchoBarra = Math.max(4, Math.round((c.recaudado / maxMonto) * 100));

        return `
            <div class="bar-chart-item">
                <div class="bar-chart-header">
                    <span><strong>${nombreCat}</strong> <small style="color: var(--text-secondary);">(${c.unidades} u.)</small></span>
                    <span><strong>$${c.recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong> <small style="color: var(--primary);">(${porcentajeTotal}%)</small></span>
                </div>
                <div class="bar-chart-track">
                    <div class="bar-chart-fill" style="width: ${anchoBarra}%;"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderizarGraficoEvolucion(dias) {
    const contenedor = document.getElementById("chart-evolucion");
    if (!contenedor) return;

    if (!dias || dias.length === 0) {
        contenedor.innerHTML = `<div class="text-center" style="color: var(--text-secondary); padding: 1.5rem;">Sin actividad diaria registrada en el período.</div>`;
        return;
    }

    // Mostrar hasta los últimos 14 días con actividad para mantener legibilidad
    const visibles = dias.slice(-14);
    const maxTotal = Math.max(...visibles.map(d => d.total), 1);

    const columnasHtml = visibles.map(d => {
        const alturaPct = Math.max(8, Math.round((d.total / maxTotal) * 100));
        const partes = d.fecha.split("-");
        const fechaCorta = partes.length === 3 ? `${partes[2]}/${partes[1]}` : d.fecha;
        const montoFmt = `$${d.total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

        return `
            <div class="column-chart-col" title="${fechaCorta}: $${d.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${d.cantidad} ventas)">
                <span class="column-chart-value">${montoFmt}</span>
                <div class="column-chart-bar-area">
                    <div class="column-chart-bar" style="height: ${alturaPct}%;"></div>
                </div>
                <span class="column-chart-label">${fechaCorta}</span>
            </div>
        `;
    }).join("");

    contenedor.innerHTML = `<div class="column-chart-grid">${columnasHtml}</div>`;
}

function renderizarTablaSinRotacion(productos) {
    const tbody = document.getElementById("tbody-sin-rotacion");
    const badge = document.getElementById("badge-sin-rotacion");
    if (!tbody) return;

    if (badge) {
        badge.textContent = `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`;
        badge.className = `badge ${productos.length > 0 ? "badge-warning" : "badge-success"}`;
    }

    tbody.innerHTML = "";
    if (!productos || productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Todos los productos activos registraron ventas en el período.</td></tr>`;
        return;
    }

    productos.forEach(p => {
        const nombreCat = ETIQUETAS_CATEGORIA[p.categoria] || p.categoria;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${p.codigo}</code></td>
            <td>${p.descripcion}</td>
            <td><span class="badge">${nombreCat}</span></td>
            <td><strong>${p.stockActual} u.</strong></td>
            <td>$${p.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
        `;
        tbody.appendChild(tr);
    });
}

function limpiarFiltroRecaudacion() {
    document.getElementById("fecha-desde").value = "";
    document.getElementById("fecha-hasta").value = "";
    consultarRecaudacion();
}
