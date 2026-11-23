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

    const badge = document.getElementById("header-user-badge");
    badge.textContent = usuarioActual.perfil;
    badge.className = `badge ${usuarioActual.perfil === "ADMINISTRATIVO" ? "badge-admin" : "badge-gerente"}`;

    // Configurar menú según rol
    const esAdmin = usuarioActual.perfil === "ADMINISTRATIVO";
    const esGerente = usuarioActual.perfil === "GERENTE";

    document.getElementById("nav-ventas").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-productos").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-historial-ventas").style.display = "block"; // Visible para ambos
    document.getElementById("nav-stock-bajo").style.display = (esGerente || esAdmin) ? "block" : "none";
    document.getElementById("nav-clientes").style.display = "block"; // Visible para ambos
    document.getElementById("nav-proveedores").style.display = esGerente ? "block" : "none"; // Proveedores en Gerencia
    document.getElementById("nav-caja").style.display = "block"; // Visible para ambos con vista diferenciada
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
    if (seccion === "clientes") cargarClientes();
    if (seccion === "proveedores") cargarProveedores();
    if (seccion === "caja") cargarCaja();
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
        
        const trPrincipal = document.createElement("tr");
        trPrincipal.id = `fila-venta-${v.id}`;
        trPrincipal.innerHTML = `
            <td><strong>${fechaFmt}</strong></td>
            <td>Usuario #${v.usuarioId}</td>
            <td><strong>$ ${v.importeTotal.toFixed(2)}</strong></td>
            <td><span class="badge badge-success">${v.estado}</span></td>
            <td class="text-center">
                <button class="btn btn-secondary btn-sm" onclick="abrirModalRemito(${v.id})">Ver Remito</button>
            </td>
        `;
        tbody.appendChild(trPrincipal);
    });
}

function abrirModalRemito(ventaId) {
    const v = listaVentasGlobal.find(item => item.id === ventaId);
    if (!v) return;

    // Número formateado tipo remito comercial (ej: 0001-00000023)
    const numeroFormateado = "0001-" + String(v.id).padStart(8, "0");
    const fechaFmt = v.fecha ? v.fecha.replace("T", " ").substring(0, 19) : "-";

    document.getElementById("remito-numero").textContent = numeroFormateado;
    document.getElementById("remito-fecha").textContent = fechaFmt;
    document.getElementById("remito-vendedor").textContent = usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellido}` : `Operador #${v.usuarioId}`;
    document.getElementById("remito-total").textContent = `$ ${v.importeTotal.toFixed(2)}`;

    const tbodyItems = document.getElementById("remito-tbody-items");
    tbodyItems.innerHTML = "";

    if (v.detalles && v.detalles.length > 0) {
        v.detalles.forEach(d => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><code>${d.productoCodigo}</code></td>
                <td>${d.descripcion || 'Artículo Natural'}</td>
                <td class="text-center">${d.cantidad}</td>
                <td class="text-right">$ ${d.precioUnitario.toFixed(2)}</td>
                <td class="text-right"><strong>$ ${d.subtotal.toFixed(2)}</strong></td>
            `;
            tbodyItems.appendChild(tr);
        });
    } else {
        tbodyItems.innerHTML = `<tr><td colspan="5" class="text-center">Venta sin desglose de artículos.</td></tr>`;
    }

    document.getElementById("modal-remito").style.display = "flex";
}

function cerrarModalRemito() {
    document.getElementById("modal-remito").style.display = "none";
}

function imprimirRemito() {
    window.print();
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

// ============================================================
// 7. CLIENTES Y PROMOCIONES
// ============================================================
async function cargarClientes() {
    try {
        const res = await fetch("/api/clientes");
        const clientes = await res.json();
        renderizarTablaClientes(clientes);
    } catch (err) {
        console.error("Error al cargar clientes:", err);
    }
}

function renderizarTablaClientes(clientes) {
    const tbody = document.getElementById("tbody-clientes");
    tbody.innerHTML = "";

    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay clientes registrados aún.</td></tr>`;
        return;
    }

    clientes.forEach(c => {
        const tr = document.createElement("tr");
        const fechaFmt = c.fechaRegistro ? c.fechaRegistro.replace("T", " ").substring(0, 10) : "-";
        tr.innerHTML = `
            <td><strong>${c.nombre} ${c.apellido}</strong></td>
            <td>${c.telefono}</td>
            <td>${c.email || '-'}</td>
            <td>
                <span class="badge ${c.recibePromociones ? 'badge-success' : 'badge-warning'}">
                    ${c.recibePromociones ? 'Adherido a Promos' : 'No recibe'}
                </span>
            </td>
            <td>${fechaFmt}</td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalCliente() {
    document.getElementById("form-cliente").reset();
    document.getElementById("cli-promociones").checked = true;
    document.getElementById("modal-cliente").style.display = "flex";
}

function cerrarModalCliente() {
    document.getElementById("modal-cliente").style.display = "none";
}

async function guardarCliente(e) {
    e.preventDefault();
    const payload = {
        nombre: document.getElementById("cli-nombre").value.trim(),
        apellido: document.getElementById("cli-apellido").value.trim(),
        telefono: document.getElementById("cli-telefono").value.trim(),
        email: document.getElementById("cli-email").value.trim(),
        recibePromociones: document.getElementById("cli-promociones").checked ? "true" : "false"
    };

    try {
        const res = await fetch("/api/clientes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert("Cliente registrado con éxito para campañas y promociones.");
            cerrarModalCliente();
            cargarClientes();
        } else {
            alert("No se pudo registrar el cliente.");
        }
    } catch (err) {
        alert("Error de conexión al registrar cliente.");
    }
}

// ============================================================
// 8. PROVEEDORES
// ============================================================
async function cargarProveedores() {
    try {
        const res = await fetch("/api/proveedores");
        const proveedores = await res.json();
        renderizarTablaProveedores(proveedores);
    } catch (err) {
        console.error("Error al cargar proveedores:", err);
    }
}

function renderizarTablaProveedores(proveedores) {
    const tbody = document.getElementById("tbody-proveedores");
    tbody.innerHTML = "";

    if (!proveedores || proveedores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay proveedores registrados.</td></tr>`;
        return;
    }

    proveedores.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${p.razonSocial}</strong></td>
            <td><code>${p.cuit}</code></td>
            <td><span class="badge">${p.rubro}</span></td>
            <td>${p.telefono}</td>
            <td>${p.email || '-'}</td>
            <td><span class="badge badge-success">Activo</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalProveedor() {
    document.getElementById("form-proveedor").reset();
    document.getElementById("modal-proveedor").style.display = "flex";
}

function cerrarModalProveedor() {
    document.getElementById("modal-proveedor").style.display = "none";
}

async function guardarProveedor(e) {
    e.preventDefault();
    const payload = {
        razonSocial: document.getElementById("prov-razon").value.trim(),
        cuit: document.getElementById("prov-cuit").value.trim(),
        rubro: document.getElementById("prov-rubro").value.trim(),
        telefono: document.getElementById("prov-telefono").value.trim(),
        email: document.getElementById("prov-email").value.trim()
    };

    try {
        const res = await fetch("/api/proveedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert("Proveedor guardado con éxito.");
            cerrarModalProveedor();
            cargarProveedores();
        } else {
            alert("No se pudo guardar el proveedor.");
        }
    } catch (err) {
        alert("Error de conexión al guardar proveedor.");
    }
}

// ============================================================
// 9. CAJA Y MOVIMIENTOS (EMPLEADO VS GERENTE / ADMIN)
// ============================================================
async function cargarCaja() {
    const esGerente = usuarioActual && usuarioActual.perfil === "GERENTE";

    // Configuración visual según perfil
    if (esGerente) {
        document.getElementById("caja-titulo-vista").textContent = "Caja General y Tesorería";
        document.getElementById("caja-subtitulo-vista").textContent = "Control integral de ingresos por ventas, egresos por pagos de impuestos y proveedores, y saldo neto.";
        document.getElementById("caja-acciones-admin").style.display = "block";
        document.getElementById("caja-card-egresos").style.display = "flex";
        document.getElementById("caja-label-saldo").textContent = "SALDO NETO EN CAJA";
    } else {
        document.getElementById("caja-titulo-vista").textContent = "Caja de Turno (Empleado)";
        document.getElementById("caja-subtitulo-vista").textContent = "Control de ventas e ingresos en efectivo registrados en tu turno.";
        document.getElementById("caja-acciones-admin").style.display = "none";
        document.getElementById("caja-card-egresos").style.display = "none";
        document.getElementById("caja-label-saldo").textContent = "TOTAL COBRADO EN TU TURNO";
    }

    // Consulta de totales y movimientos
    const uParam = esGerente ? "" : `?usuarioId=${usuarioActual.id}`;

    try {
        // 1. Totales
        const resTotales = await fetch(`/api/caja/totales${uParam}`);
        const totales = await resTotales.json();

        document.getElementById("caja-metric-ingresos").textContent = `$ ${(totales.ingresos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("caja-metric-egresos").textContent = `$ ${(totales.egresos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("caja-metric-saldo").textContent = `$ ${(totales.saldo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

        // 2. Movimientos
        const resMovs = await fetch(`/api/caja/movimientos${uParam}`);
        const movs = await resMovs.json();
        renderizarTablaCaja(movs);

    } catch (err) {
        console.error("Error al cargar datos de caja:", err);
    }
}

function renderizarTablaCaja(movs) {
    const tbody = document.getElementById("tbody-caja-movimientos");
    tbody.innerHTML = "";

    if (!movs || movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No se registran movimientos en la caja.</td></tr>`;
        return;
    }

    movs.forEach(m => {
        const esIngreso = m.tipo.startsWith("INGRESO");
        const fechaFmt = m.fecha ? m.fecha.replace("T", " ").substring(0, 19) : "-";
        const tr = document.createElement("tr");

        let tipoLabel = m.tipo;
        if (m.tipo === "INGRESO_VENTA") tipoLabel = "Ingreso por Venta";
        if (m.tipo === "EGRESO_PROVEEDOR") tipoLabel = "Pago a Proveedor";
        if (m.tipo === "EGRESO_IMPUESTOS") tipoLabel = "Pago de Impuestos/Servicios";
        if (m.tipo === "EGRESO_GASTOS") tipoLabel = "Gastos Operativos";

        tr.innerHTML = `
            <td>${fechaFmt}</td>
            <td><span class="badge ${esIngreso ? 'badge-success' : 'badge-danger'}">${tipoLabel}</span></td>
            <td>${m.concepto}</td>
            <td class="text-right"><strong class="${esIngreso ? 'text-primary' : 'text-danger'}">${esIngreso ? '+' : '-'} $ ${m.monto.toFixed(2)}</strong></td>
            <td>Usuario #${m.usuarioId}</td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalEgresoCaja() {
    document.getElementById("form-egreso-caja").reset();
    document.getElementById("modal-egreso-caja").style.display = "flex";
}

function cerrarModalEgresoCaja() {
    document.getElementById("modal-egreso-caja").style.display = "none";
}

async function guardarEgresoCaja(e) {
    e.preventDefault();
    const payload = {
        tipo: document.getElementById("egreso-tipo").value,
        concepto: document.getElementById("egreso-concepto").value.trim(),
        monto: parseFloat(document.getElementById("egreso-monto").value),
        usuarioId: String(usuarioActual.id)
    };

    try {
        const res = await fetch("/api/caja/egreso", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert("Egreso de caja registrado correctamente.");
            cerrarModalEgresoCaja();
            cargarCaja();
        } else {
            alert("No se pudo registrar el egreso.");
        }
    } catch (err) {
        alert("Error de conexión al registrar egreso.");
    }
}
