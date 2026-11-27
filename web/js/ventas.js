/**
 * DIETÉTICA VIDA NATURAL — MÓDULO DE REGISTRAR VENTA
 */

let carritoActual = [];
let productoSeleccionadoParaVenta = null;
let promoSeleccionadaParaVenta = null;
let listaProductosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("ventas")) return;
    verificarEstadoCajaEnVenta();
    cargarDatalistProductosVenta();
    cargarSelectorClientesVenta();
});

async function verificarEstadoCajaEnVenta() {
    try {
        const res = await fetch("/api/caja/actual");
        const data = await res.json();

        const bannerCerrada = document.getElementById("venta-caja-cerrada-banner");
        if (bannerCerrada) {
            bannerCerrada.style.display = data.abierta ? "none" : "block";
        }
        return data;
    } catch (err) {
        console.error("Error al consultar estado de caja:", err);
        return { abierta: false };
    }
}

async function cargarSelectorClientesVenta() {
    try {
        const res = await fetch("/api/clientes?soloActivos=true");
        const clientes = await res.json();
        const select = document.getElementById("venta-cliente");
        if (!select) return;

        select.innerHTML = `<option value="">Consumidor Final (Sin asignar)</option>`;
        clientes.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.nombre} ${c.apellido} (DNI: ${c.dniCuit})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Error al cargar clientes en venta:", err);
    }
}

async function cargarDatalistProductosVenta() {
    try {
        const res = await fetch("/api/productos");
        listaProductosGlobal = await res.json();
        const datalist = document.getElementById("datalist-productos-venta");
        if (!datalist) return;

        datalist.innerHTML = "";
        listaProductosGlobal
            .filter(p => p.activo)
            .forEach(p => {
                const option = document.createElement("option");
                option.value = p.codigo;
                option.textContent = `${p.descripcion} — $${p.precioUnitario.toFixed(2)} (Stock: ${p.stockActual} u.)`;
                datalist.appendChild(option);
            });
    } catch (err) {
        console.error("Error al cargar sugerencias de productos:", err);
    }
}

function seleccionarDesdeDatalistVenta() {
    limpiarSeleccionProductoVenta();
    const valor = document.getElementById("venta-codigo").value.trim().toUpperCase();
    const coincidenciaExacta = listaProductosGlobal.find(p => p.activo && p.codigo.toUpperCase() === valor);
    if (coincidenciaExacta) {
        buscarProductoParaVenta(true);
    }
}

function limpiarSeleccionProductoVenta() {
    productoSeleccionadoParaVenta = null;
    promoSeleccionadaParaVenta = null;
    document.getElementById("venta-info-prod").style.display = "none";
}

function calcularPrecioConPromo(precioUnitario, promo) {
    if (!promo) return { precioFinal: precioUnitario, descuentoUnitario: 0 };
    let desc = promo.tipoDescuento === "PORCENTAJE"
        ? precioUnitario * (promo.valor / 100.0)
        : promo.valor;
    if (desc > precioUnitario) desc = precioUnitario;
    desc = Math.round(desc * 100) / 100;
    const final = Math.round((precioUnitario - desc) * 100) / 100;
    return { precioFinal: final, descuentoUnitario: desc };
}

async function buscarProductoParaVenta(silencioso = false) {
    const entrada = document.getElementById("venta-codigo").value.trim();
    const alerta = document.getElementById("venta-alerta");
    const infoBox = document.getElementById("venta-info-prod");

    alerta.style.display = "none";
    infoBox.style.display = "none";
    productoSeleccionadoParaVenta = null;
    promoSeleccionadaParaVenta = null;

    if (!entrada) {
        mostrarAlertaVenta("Ingrese un código o nombre de producto.", "error");
        return null;
    }

    let codigoBuscar = entrada.toUpperCase();
    const porNombre = listaProductosGlobal.find(
        p => p.activo && p.descripcion.toLowerCase().includes(entrada.toLowerCase())
    );
    if (!listaProductosGlobal.some(p => p.codigo.toUpperCase() === codigoBuscar) && porNombre) {
        codigoBuscar = porNombre.codigo;
        document.getElementById("venta-codigo").value = codigoBuscar;
    }

    try {
        const res = await fetch(`/api/productos/buscar?codigo=${encodeURIComponent(codigoBuscar)}`);
        if (!res.ok) {
            mostrarAlertaVenta(`Producto '${entrada}' no encontrado o código inexistente.`, "error");
            return null;
        }

        const prod = await res.json();
        if (!prod || !prod.activo) {
            mostrarAlertaVenta("El producto se encuentra dado de baja en el sistema.", "error");
            return null;
        }

        let promo = null;
        try {
            const resPromo = await fetch(`/api/promociones/vigente?codigo=${encodeURIComponent(prod.codigo)}`);
            if (resPromo.ok) {
                const dataPromo = await resPromo.json();
                if (dataPromo.tienePromo) promo = dataPromo.promocion;
            }
        } catch (e) {}

        productoSeleccionadoParaVenta = prod;
        promoSeleccionadaParaVenta = promo;

        const { precioFinal } = calcularPrecioConPromo(prod.precioUnitario, promo);

        document.getElementById("vip-desc").textContent = `${prod.codigo} - ${prod.descripcion}`;
        document.getElementById("vip-cat").textContent = prod.categoria;
        document.getElementById("vip-precio").textContent = prod.precioUnitario.toFixed(2);
        document.getElementById("vip-precio-final").textContent = precioFinal.toFixed(2);

        const promoBadge = document.getElementById("vip-promo-badge");
        if (promo) {
            const etiqueta = promo.tipoDescuento === "PORCENTAJE" ? `${promo.valor}% OFF` : `-$${promo.valor.toFixed(2)}`;
            promoBadge.textContent = `${promo.nombre} (${etiqueta})`;
            promoBadge.style.display = "inline-block";
        } else {
            promoBadge.style.display = "none";
        }

        const stockBadge = document.getElementById("vip-stock");
        stockBadge.textContent = `${prod.stockActual} u.`;
        stockBadge.className = `badge ${prod.stockActual > prod.stockMinimo ? 'badge-success' : 'badge-danger'}`;

        infoBox.style.display = "block";
        if (!silencioso) {
            document.getElementById("venta-cantidad").focus();
        }
        return prod;

    } catch (err) {
        mostrarAlertaVenta("Error de conexión al buscar el producto.", "error");
        return null;
    }
}

async function agregarItemVenta() {
    const alerta = document.getElementById("venta-alerta");
    alerta.style.display = "none";

    let prod = productoSeleccionadoParaVenta;
    const codigoInput = document.getElementById("venta-codigo").value.trim().toUpperCase();

    if (!prod || prod.codigo.toUpperCase() !== codigoInput) {
        prod = await buscarProductoParaVenta(true);
        if (!prod) return;
    }

    const cantidad = parseInt(document.getElementById("venta-cantidad").value, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarAlertaVenta("Ingrese una cantidad válida mayor a cero.", "error");
        return;
    }

    const cantidadEnCarrito = carritoActual
        .filter(item => item.codigo === prod.codigo)
        .reduce((sum, item) => sum + item.cantidad, 0);

    if (cantidadEnCarrito + cantidad > prod.stockActual) {
        mostrarAlertaVenta(
            `Stock insuficiente para '${prod.descripcion}'. Disponible: ${prod.stockActual} u. (En carrito: ${cantidadEnCarrito} u.).`,
            "error"
        );
        return;
    }

    const { precioFinal, descuentoUnitario } = calcularPrecioConPromo(prod.precioUnitario, promoSeleccionadaParaVenta);

    const existente = carritoActual.find(item => item.codigo === prod.codigo);
    if (existente) {
        existente.cantidad += cantidad;
        existente.descuentoAplicado = Math.round(existente.cantidad * descuentoUnitario * 100) / 100;
        existente.subtotal = Math.round(existente.cantidad * precioFinal * 100) / 100;
    } else {
        carritoActual.push({
            codigo: prod.codigo,
            descripcion: prod.descripcion,
            precioUnitario: prod.precioUnitario,
            cantidad: cantidad,
            descuentoAplicado: Math.round(cantidad * descuentoUnitario * 100) / 100,
            subtotal: Math.round(cantidad * precioFinal * 100) / 100,
            promoNombre: promoSeleccionadaParaVenta ? promoSeleccionadaParaVenta.nombre : null
        });
    }

    renderizarCarrito();

    document.getElementById("venta-codigo").value = "";
    document.getElementById("venta-cantidad").value = "1";
    document.getElementById("venta-info-prod").style.display = "none";
    productoSeleccionadoParaVenta = null;
    promoSeleccionadaParaVenta = null;
    document.getElementById("venta-codigo").focus();
}

function renderizarCarrito() {
    const tbody = document.getElementById("tbody-carrito");
    tbody.innerHTML = "";

    if (carritoActual.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No hay productos agregados a la venta.</td></tr>`;
        document.getElementById("venta-total").textContent = "$0.00";
        document.getElementById("venta-resumen-descuento").style.display = "none";
        return;
    }

    let total = 0;
    let totalDescuento = 0;
    carritoActual.forEach((item, index) => {
        total += item.subtotal;
        totalDescuento += item.descuentoAplicado || 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${item.codigo}</code></td>
            <td>
                ${item.descripcion}
                ${item.promoNombre ? `<br><span class="badge badge-warning">${item.promoNombre}</span>` : ""}
            </td>
            <td>$${item.precioUnitario.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td>${item.descuentoAplicado > 0 ? `<span style="color:var(--warning); font-weight:600;">-$${item.descuentoAplicado.toFixed(2)}</span>` : "-"}</td>
            <td><strong>$${item.subtotal.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-outline-danger btn-sm" onclick="quitarItemCarrito(${index})">Quitar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const resumenDto = document.getElementById("venta-resumen-descuento");
    if (totalDescuento > 0) {
        resumenDto.style.display = "flex";
        document.getElementById("venta-descuento-total").textContent = `-$${totalDescuento.toFixed(2)}`;
    } else {
        resumenDto.style.display = "none";
    }

    document.getElementById("venta-total").textContent = `$${total.toFixed(2)}`;
}

function quitarItemCarrito(index) {
    carritoActual.splice(index, 1);
    renderizarCarrito();
}

async function confirmarVentaFinal() {
    if (carritoActual.length === 0) {
        mostrarAlertaVenta("Debe incorporar al menos un producto a la venta.", "error");
        return;
    }

    const clienteSelect = document.getElementById("venta-cliente");
    const clienteVal = clienteSelect.value;
    const clienteTexto = clienteVal ? clienteSelect.options[clienteSelect.selectedIndex].text : "Consumidor Final";
    const medioPago = document.getElementById("venta-medio-pago").value;

    const itemsSnapshot = carritoActual.map(item => ({ ...item }));
    const descuentoSnapshot = carritoActual.reduce((s, i) => s + (i.descuentoAplicado || 0), 0);

    const payload = {
        usuarioId: usuarioActual.id,
        clienteId: clienteVal ? parseInt(clienteVal, 10) : null,
        medioPago: medioPago,
        detalles: carritoActual.map(item => ({
            productoCodigo: item.codigo,
            cantidad: item.cantidad,
            subtotal: item.subtotal
        }))
    };

    try {
        const res = await fetch("/api/ventas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.exito) {
            const totalCobrado = data.importeTotal !== undefined ? data.importeTotal : itemsSnapshot.reduce((s, i) => s + i.subtotal, 0);

            const ventaParaRemito = {
                id: data.ventaId || "-",
                fecha: new Date().toISOString(),
                clienteNombre: clienteTexto,
                medioPago: medioPago,
                descuentoTotal: descuentoSnapshot,
                importeTotal: totalCobrado,
                estado: "CONFIRMADA",
                operador: `${usuarioActual.nombre} ${usuarioActual.apellido}`,
                detalles: itemsSnapshot.map(i => ({
                    productoCodigo: i.codigo,
                    descripcion: i.descripcion,
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario,
                    subtotal: i.subtotal
                }))
            };

            carritoActual = [];
            renderizarCarrito();
            document.getElementById("venta-cliente").value = "";
            document.getElementById("venta-info-prod").style.display = "none";
            document.getElementById("venta-alerta").style.display = "none";
            cargarDatalistProductosVenta();
            verificarEstadoCajaEnVenta();

            abrirModalRemitoDesdeObjeto(ventaParaRemito);
        } else {
            mostrarAlertaVenta(data.error || "No se pudo registrar la venta.", "error");
        }
    } catch (err) {
        mostrarAlertaVenta("Error de conexión al registrar la venta.", "error");
    }
}

function mostrarAlertaVenta(mensaje, tipo) {
    const alerta = document.getElementById("venta-alerta");
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo}`;
    alerta.style.display = "block";
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
