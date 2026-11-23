/**
 * DIETÉTICA VIDA NATURAL — LÓGICA FRONTEND
 * Estilo ERP Comercial (Sin Emojis, Diseño Limpio)
 */

let usuarioActual = null;
let carritoActual = [];
let productoSeleccionadoParaVenta = null;
let listaProductosGlobal = [];
let listaVentasGlobal = [];
let editandoProductoCodigo = null;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const sesion = localStorage.getItem("vida_natural_user");
    if (sesion) {
        usuarioActual = JSON.parse(sesion);
        mostrarPanelPrincipal();
    }

    // Cerrar dropdown de usuario si se hace clic afuera
    document.addEventListener("click", (e) => {
        const menu = document.getElementById("user-dropdown-menu");
        const btn = document.querySelector(".user-dropdown-btn");
        if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });
});

// ============================================================
// CONTROL DEL HEADER Y MENÚ
// ============================================================
function toggleSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) {
        sidebar.classList.toggle("collapsed");
    }
}

function toggleUserMenu() {
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    }
}

// ============================================================
// 1. AUTENTICACIÓN
// ============================================================
async function iniciarSesion(e) {
    e.preventDefault();
    const nombreUsuario = document.getElementById("usuario").value.trim();
    const contrasena = document.getElementById("contrasena").value.trim();
    const alertBox = document.getElementById("login-error");

    alertBox.style.display = "none";

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombreUsuario, contrasena })
        });

        const data = await res.json();
        if (res.ok && data.id) {
            usuarioActual = data;
            localStorage.setItem("vida_natural_user", JSON.stringify(usuarioActual));
            mostrarPanelPrincipal();
        } else {
            alertBox.textContent = data.error || "Credenciales incorrectas.";
            alertBox.style.display = "block";
        }
    } catch (err) {
        alertBox.textContent = "Error de conexión con el servidor Java.";
        alertBox.style.display = "block";
    }
}

function cerrarSesion() {
    localStorage.removeItem("vida_natural_user");
    usuarioActual = null;
    carritoActual = [];
    document.getElementById("vista-principal").style.display = "none";
    document.getElementById("vista-login").style.display = "flex";
    document.getElementById("usuario").value = "";
    document.getElementById("contrasena").value = "";
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.style.display = "none";
}

function mostrarPanelPrincipal() {
    document.getElementById("vista-login").style.display = "none";
    document.getElementById("vista-principal").style.display = "flex";

    // Datos en el header superior
    const nombreCompleto = `${usuarioActual.nombre} ${usuarioActual.apellido}`;
    document.getElementById("header-user-name").textContent = nombreCompleto;
    document.getElementById("dropdown-full-name").textContent = nombreCompleto;
    document.getElementById("dropdown-role").textContent = usuarioActual.perfil;

    const badge = document.getElementById("header-user-badge");
    badge.textContent = usuarioActual.perfil;
    badge.className = `badge ${usuarioActual.perfil === "ADMINISTRATIVO" ? "badge-admin" : "badge-gerente"}`;

    // Datos en la barra lateral
    document.getElementById("sidebar-user-display").textContent = nombreCompleto;
    document.getElementById("sidebar-role-display").textContent = usuarioActual.perfil;

    // Configurar menú según rol
    const esAdmin = usuarioActual.perfil === "ADMINISTRATIVO";
    const esGerente = usuarioActual.perfil === "GERENTE";

    document.getElementById("nav-ventas").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-productos").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-historial-ventas").style.display = "block"; // Visible para ambos
    document.getElementById("nav-stock-bajo").style.display = (esGerente || esAdmin) ? "block" : "none";
    document.getElementById("nav-recaudacion").style.display = esGerente ? "block" : "none";

    if (esAdmin) {
        cambiarSeccion("ventas");
    } else {
        cambiarSeccion("historial-ventas");
    }
}

// ============================================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================================
function cambiarSeccion(seccion) {
    document.querySelectorAll(".seccion-view").forEach(s => s.style.display = "none");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const target = document.getElementById(`seccion-${seccion}`);
    const navBtn = document.getElementById(`nav-${seccion}`);
    if (target) target.style.display = "block";
    if (navBtn) navBtn.classList.add("active");

    if (seccion === "productos") cargarProductos();
    if (seccion === "stock-bajo") cargarStockBajo();
    if (seccion === "historial-ventas") cargarHistorialVentasERP();
    if (seccion === "recaudacion") consultarRecaudacion();
}

// ============================================================
// 2. MÓDULO DE VENTAS (ADMINISTRATIVO)
// ============================================================
async function buscarProductoParaVenta() {
    const codigo = document.getElementById("venta-codigo").value.trim();
    const alerta = document.getElementById("venta-alerta");
    const infoBox = document.getElementById("venta-info-prod");

    alerta.style.display = "none";
    infoBox.style.display = "none";
    productoSeleccionadoParaVenta = null;

    if (!codigo) {
        mostrarAlertaVenta("Ingrese un código de producto.", "error");
        return;
    }

    try {
        const res = await fetch(`/api/productos/buscar?codigo=${encodeURIComponent(codigo)}`);
        if (!res.ok) {
            mostrarAlertaVenta("Producto no encontrado o código inexistente.", "error");
            return;
        }

        const prod = await res.json();
        if (!prod || !prod.activo) {
            mostrarAlertaVenta("El producto se encuentra dado de baja en el sistema.", "error");
            return;
        }

        productoSeleccionadoParaVenta = prod;
        document.getElementById("vip-desc").textContent = `${prod.codigo} - ${prod.descripcion}`;
        document.getElementById("vip-cat").textContent = prod.categoria;
        document.getElementById("vip-precio").textContent = prod.precioUnitario.toFixed(2);
        document.getElementById("vip-stock-min").textContent = `${prod.stockMinimo} u.`;
        
        const stockBadge = document.getElementById("vip-stock");
        stockBadge.textContent = `${prod.stockActual} u.`;
        stockBadge.className = `badge ${prod.stockActual > prod.stockMinimo ? 'badge-success' : 'badge-danger'}`;

        infoBox.style.display = "block";
        document.getElementById("venta-cantidad").focus();

    } catch (err) {
        mostrarAlertaVenta("Error de conexión al buscar el producto.", "error");
    }
}

function agregarItemVenta() {
    const alerta = document.getElementById("venta-alerta");
    alerta.style.display = "none";

    if (!productoSeleccionadoParaVenta) {
        mostrarAlertaVenta("Debe buscar y seleccionar un producto primero.", "error");
        return;
    }

    const cantidad = parseInt(document.getElementById("venta-cantidad").value, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarAlertaVenta("Ingrese una cantidad válida mayor a cero.", "error");
        return;
    }

    // Regla de Negocio: verificar stock antes de agregar a la venta
    const cantidadEnCarrito = carritoActual
        .filter(item => item.codigo === productoSeleccionadoParaVenta.codigo)
        .reduce((sum, item) => sum + item.cantidad, 0);

    const cantidadTotalRequerida = cantidadEnCarrito + cantidad;

    if (cantidadTotalRequerida > productoSeleccionadoParaVenta.stockActual) {
        mostrarAlertaVenta(
            `Stock insuficiente para '${productoSeleccionadoParaVenta.descripcion}'. Stock actual: ${productoSeleccionadoParaVenta.stockActual}. En venta actual: ${cantidadEnCarrito}.`,
            "error"
        );
        return;
    }

    // Calcular subtotal
    const subtotal = Math.round(cantidad * productoSeleccionadoParaVenta.precioUnitario * 100) / 100;

    carritoActual.push({
        codigo: productoSeleccionadoParaVenta.codigo,
        descripcion: productoSeleccionadoParaVenta.descripcion,
        precioUnitario: productoSeleccionadoParaVenta.precioUnitario,
        cantidad: cantidad,
        subtotal: subtotal
    });

    renderizarCarrito();

    // Resetear formulario de agregado
    document.getElementById("venta-codigo").value = "";
    document.getElementById("venta-cantidad").value = "1";
    document.getElementById("venta-info-prod").style.display = "none";
    productoSeleccionadoParaVenta = null;
    document.getElementById("venta-codigo").focus();
}

function renderizarCarrito() {
    const tbody = document.getElementById("tbody-carrito");
    tbody.innerHTML = "";

    if (carritoActual.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No hay productos agregados a la venta.</td></tr>`;
        document.getElementById("venta-total").textContent = "$0.00";
        return;
    }

    let total = 0;
    carritoActual.forEach((item, index) => {
        total += item.subtotal;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${item.codigo}</code></td>
            <td>${item.descripcion}</td>
            <td>$${item.precioUnitario.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td><strong>$${item.subtotal.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-outline-danger btn-sm" onclick="quitarItemCarrito(${index})">Quitar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("venta-total").textContent = `$${total.toFixed(2)}`;
}

function quitarItemCarrito(index) {
    carritoActual.splice(index, 1);
    renderizarCarrito();
}

async function confirmarVentaFinal() {
    if (carritoActual.length === 0) {
        mostrarAlertaVenta("El detalle de venta está vacío.", "error");
        return;
    }

    const payload = {
        usuarioId: usuarioActual.id,
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
            alert(`Venta registrada con éxito. Se descontaron las cantidades del stock.`);
            carritoActual = [];
            renderizarCarrito();
            document.getElementById("venta-info-prod").style.display = "none";
            document.getElementById("venta-alerta").style.display = "none";
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

// ============================================================
// 3. HISTORIAL DE VENTAS (ESTILO ERP CON ACORDEÓN)
// ============================================================
async function cargarHistorialVentasERP() {
    try {
        const res = await fetch("/api/ventas");
        listaVentasGlobal = await res.json();
        renderizarHistorialVentas(listaVentasGlobal);
    } catch (err) {
        console.error("Error al cargar ventas:", err);
    }
}

function renderizarHistorialVentas(ventas) {
    const tbody = document.getElementById("tbody-historial-erp");
    tbody.innerHTML = "";

    const totalVendido = ventas.reduce((sum, v) => sum + v.importeTotal, 0);
    document.getElementById("historial-ventas-contador").textContent = `${ventas.length} ventas`;
    document.getElementById("metric-total-vendido").textContent = `$ ${totalVendido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById("metric-cantidad-ventas").textContent = ventas.length;

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 2rem; color: var(--text-secondary);">No hay registros de ventas que coincidan con la búsqueda.</td></tr>`;
        return;
    }

    ventas.forEach(v => {
        const fechaFmt = v.fecha ? v.fecha.replace("T", " ").substring(0, 19) : "-";
        
        // Fila Principal
        const trPrincipal = document.createElement("tr");
        trPrincipal.id = `fila-venta-${v.id}`;
        trPrincipal.innerHTML = `
            <td><strong>${fechaFmt}</strong></td>
            <td>Usuario #${v.usuarioId}</td>
            <td><strong>$ ${v.importeTotal.toFixed(2)}</strong></td>
            <td><span class="badge badge-success">${v.estado}</span></td>
            <td class="text-center">
                <button class="btn-expand-sale" id="btn-expand-${v.id}" onclick="toggleDetalleVentaERP(${v.id})" title="Ver productos vendidos">+</button>
            </td>
        `;
        tbody.appendChild(trPrincipal);

        // Fila Desplegable del Acordeón (oculta por defecto)
        const trAcordeon = document.createElement("tr");
        trAcordeon.id = `acordeon-venta-${v.id}`;
        trAcordeon.className = "sale-accordion-row";
        trAcordeon.style.display = "none";

        const cantItems = v.detalles ? v.detalles.length : 0;
        let lineasHtml = "";

        if (v.detalles && v.detalles.length > 0) {
            v.detalles.forEach(d => {
                lineasHtml += `
                    <tr>
                        <td><code>${d.productoCodigo}</code></td>
                        <td>${d.descripcion || 'Producto'}</td>
                        <td>${d.cantidad}</td>
                        <td>$ ${d.precioUnitario.toFixed(2)}</td>
                        <td><strong>$ ${d.subtotal.toFixed(2)}</strong></td>
                    </tr>
                `;
            });
        } else {
            lineasHtml = `<tr><td colspan="5">No se detallaron artículos individuales.</td></tr>`;
        }

        trAcordeon.innerHTML = `
            <td colspan="5" style="padding: 0 1.5rem 1rem 1.5rem;">
                <div class="sale-accordion-box">
                    <h4>PRODUCTOS VENDIDOS (${cantItems})</h4>
                    <table class="table" style="background:#ffffff; border:1px solid var(--border-color);">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineasHtml}
                        </tbody>
                    </table>
                </div>
            </td>
        `;
        tbody.appendChild(trAcordeon);
    });
}

function toggleDetalleVentaERP(ventaId) {
    const filaAcordeon = document.getElementById(`acordeon-venta-${ventaId}`);
    const boton = document.getElementById(`btn-expand-${ventaId}`);

    if (filaAcordeon.style.display === "none") {
        filaAcordeon.style.display = "table-row";
        boton.textContent = "-";
        boton.classList.add("expanded");
    } else {
        filaAcordeon.style.display = "none";
        boton.textContent = "+";
        boton.classList.remove("expanded");
    }
}

function filtrarHistorialVentas() {
    const txt = document.getElementById("historial-buscar-texto").value.toLowerCase().trim();
    const desde = document.getElementById("historial-desde").value;
    const hasta = document.getElementById("historial-hasta").value;

    const filtradas = listaVentasGlobal.filter(v => {
        // Filtro texto
        let coincideTexto = true;
        if (txt) {
            const fechaStr = v.fecha ? v.fecha.toLowerCase() : "";
            const enDetalles = v.detalles && v.detalles.some(d => 
                (d.productoCodigo && d.productoCodigo.toLowerCase().includes(txt)) ||
                (d.descripcion && d.descripcion.toLowerCase().includes(txt))
            );
            coincideTexto = fechaStr.includes(txt) || enDetalles;
        }

        // Filtro fecha
        let coincideFecha = true;
        if (v.fecha) {
            const fechaVenta = v.fecha.substring(0, 10);
            if (desde && fechaVenta < desde) coincideFecha = false;
            if (hasta && fechaVenta > hasta) coincideFecha = false;
        }

        return coincideTexto && coincideFecha;
    });

    renderizarHistorialVentas(filtradas);
}

function limpiarFiltrosHistorial() {
    document.getElementById("historial-buscar-texto").value = "";
    document.getElementById("historial-desde").value = "";
    document.getElementById("historial-hasta").value = "";
    renderizarHistorialVentas(listaVentasGlobal);
}

// ============================================================
// 4. INVENTARIO DE PRODUCTOS (ADMINISTRATIVO)
// ============================================================
async function cargarProductos() {
    try {
        const res = await fetch("/api/productos");
        listaProductosGlobal = await res.json();
        renderizarTablaProductos(listaProductosGlobal);
    } catch (err) {
        console.error("Error al cargar productos:", err);
    }
}

function renderizarTablaProductos(productos) {
    const tbody = document.getElementById("tbody-productos");
    tbody.innerHTML = "";

    if (!productos || productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No hay productos registrados en el inventario.</td></tr>`;
        return;
    }

    productos.forEach(p => {
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
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editarProducto('${p.codigo}')">Modificar</button>
                ${p.activo ? `<button class="btn btn-outline-danger btn-sm" onclick="darBajaProducto('${p.codigo}')">Baja</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarProductos() {
    const txt = document.getElementById("filtro-productos").value.toLowerCase();
    const filtrados = listaProductosGlobal.filter(p => 
        p.codigo.toLowerCase().includes(txt) || p.descripcion.toLowerCase().includes(txt)
    );
    renderizarTablaProductos(filtrados);
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

    const productoData = {
        codigo: document.getElementById("prod-codigo").value.trim(),
        descripcion: document.getElementById("prod-desc").value.trim(),
        categoria: document.getElementById("prod-cat").value,
        precioUnitario: parseFloat(document.getElementById("prod-precio").value),
        stockActual: parseInt(document.getElementById("prod-stock-act").value, 10),
        stockMinimo: parseInt(document.getElementById("prod-stock-min").value, 10),
        activo: true
    };

    const url = "/api/productos";
    const method = editandoProductoCodigo ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
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
    if (!confirm(`¿Confirma la baja lógica del producto ${codigo}?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/productos?codigo=${encodeURIComponent(codigo)}`, {
            method: "DELETE"
        });

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

// ============================================================
// 5. CONTROL DE STOCK MÍNIMO (GERENTE Y ADMIN)
// ============================================================
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

// ============================================================
// 6. REPORTE DE RECAUDACIÓN (GERENTE)
// ============================================================
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
        document.getElementById("kpi-monto-recaudado").textContent = `$ ${(data.recaudado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    } catch (err) {
        console.error("Error al consultar recaudación:", err);
    }
}

function limpiarFiltroRecaudacion() {
    document.getElementById("fecha-desde").value = "";
    document.getElementById("fecha-hasta").value = "";
    consultarRecaudacion();
}
