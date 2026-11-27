/**
 * DIETÉTICA VIDA NATURAL — CONTROL DE STOCK MÍNIMO
 */

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("stock-bajo")) return;
    cargarStockBajo();
});

async function cargarStockBajo() {
    try {
        const res = await fetch("/api/productos/stock-bajo");
        const productos = await res.json();
        const tbody = document.getElementById("tbody-stock-bajo");
        tbody.innerHTML = "";

        if (!productos || productos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:1.8rem; color:var(--text-secondary);">
                No se registran productos con existencias por debajo o igual al límite de stock mínimo.
            </td></tr>`;
            return;
        }

        productos.forEach(p => {
            const diferencia = p.stockMinimo - p.stockActual;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><code>${p.codigo}</code></td>
                <td>${p.descripcion}</td>
                <td><span class="badge">${p.categoria}</span></td>
                <td><strong class="text-danger">${p.stockActual} u.</strong></td>
                <td>${p.stockMinimo} u.</td>
                <td>${diferencia > 0 ? '+' + diferencia + ' u. faltantes' : 'Límite alcanzado'}</td>
                <td><span class="badge badge-danger">Reponer</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error al cargar stock crítico:", err);
    }
}
