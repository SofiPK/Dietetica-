/**
 * DIETÉTICA VIDA NATURAL — LÓGICA FRONTEND
 * Estilo ERP Comercial (Sin Emojis, Diseño Limpio)
 */

let usuarioActual = null;
let carritoActual = [];
let productoSeleccionadoParaVenta = null;
let listaProductosGlobal = [];
let listaVentasGlobal = [];
let listaClientesGlobal = [];
let editandoProductoCodigo = null;
let saldoActualCaja = 0;

// Interceptor global de fetch para enviar el perfil en cada petición API
const fetchOriginal = window.fetch;
window.fetch = function(url, options = {}) {
    if (typeof url === "string" && url.startsWith("/api/") && usuarioActual && usuarioActual.perfil) {
        options.headers = {
            ...(options.headers || {}),
            "X-User-Perfil": usuarioActual.perfil
        };
    }
    return fetchOriginal(url, options);
};

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const sesion = localStorage.getItem("vida_natural_user");
    if (sesion) {
        usuarioActual = JSON.parse(sesion);
        mostrarPanelPrincipal();
    }

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
    if (sidebar) sidebar.classList.toggle("collapsed");
}

function toggleUserMenu() {
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.style.display = menu.style.display === "none" ? "block" : "none";
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

    const nombreCompleto = `${usuarioActual.nombre} ${usuarioActual.apellido}`;
    document.getElementById("header-user-name").textContent = nombreCompleto;

    const badge = document.getElementById("header-user-badge");
    badge.textContent = usuarioActual.perfil;
    badge.className = `badge ${usuarioActual.perfil === "ADMINISTRATIVO" ? "badge-admin" : "badge-gerente"}`;

    const esAdmin = usuarioActual.perfil === "ADMINISTRATIVO";

    document.getElementById("nav-ventas").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-historial-ventas").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-productos").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-stock-bajo").style.display = "block";
    document.getElementById("nav-clientes").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-proveedores").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-caja").style.display = "block";
    document.getElementById("nav-recaudacion").style.display = esAdmin ? "block" : "none";

    if (esAdmin) {
        cambiarSeccion("ventas");
    } else {
        cambiarSeccion("stock-bajo");
    }
}

// ============================================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================================
function cambiarSeccion(seccion) {
    const esGerente = usuarioActual && usuarioActual.perfil === "GERENTE";
    const seccionesPermitidasGerente = ["stock-bajo", "caja"];

    if (esGerente && !seccionesPermitidasGerente.includes(seccion)) {
        seccion = "stock-bajo";
    }

    document.querySelectorAll(".seccion-view").forEach(s => s.style.display = "none");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const target = document.getElementById(`seccion-${seccion}`);
    const navBtn = document.getElementById(`nav-${seccion}`);
    if (target) target.style.display = "block";
    if (navBtn) navBtn.classList.add("active");

    if (seccion === "ventas") cargarDatalistProductosVenta();
    if (seccion === "productos") cargarProductos();
    if (seccion === "stock-bajo") cargarStockBajo();
    if (seccion === "historial-ventas") cargarHistorialVentasERP();
    if (seccion === "recaudacion") consultarRecaudacion();
    if (seccion === "clientes") cargarClientes();
    if (seccion === "proveedores") cargarProveedores();
    if (seccion === "caja") {
        const hoyStr = obtenerFechaHoyLocal();
        const inputFecha = document.getElementById("caja-filtro-fecha");
        if (inputFecha && !inputFecha.value) inputFecha.value = hoyStr;
        cargarCaja();
    }
}

function obtenerFechaHoyLocal() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

// ============================================================
// 2. MÓDULO DE VENTAS (ADMINISTRATIVO)
// ============================================================
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
    document.getElementById("venta-info-prod").style.display = "none";
}

async function buscarProductoParaVenta(silencioso = false) {
    const entrada = document.getElementById("venta-codigo").value.trim();
    const alerta = document.getElementById("venta-alerta");
    const infoBox = document.getElementById("venta-info-prod");

    alerta.style.display = "none";
    infoBox.style.display = "none";
    productoSeleccionadoParaVenta = null;

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

        productoSeleccionadoParaVenta = prod;
        document.getElementById("vip-desc").textContent = `${prod.codigo} - ${prod.descripcion}`;
        document.getElementById("vip-cat").textContent = prod.categoria;
        document.getElementById("vip-precio").textContent = prod.precioUnitario.toFixed(2);
        document.getElementById("vip-stock-min").textContent = `${prod.stockMinimo} u.`;
        
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

    const cantidadTotalRequerida = cantidadEnCarrito + cantidad;

    if (cantidadTotalRequerida > prod.stockActual) {
        mostrarAlertaVenta(
            `Stock insuficiente para '${prod.descripcion}'. Stock disponible: ${prod.stockActual} u. (En venta actual: ${cantidadEnCarrito} u.).`,
            "error"
        );
        return;
    }

    const subtotal = Math.round(cantidad * prod.precioUnitario * 100) / 100;

    const existente = carritoActual.find(item => item.codigo === prod.codigo);
    if (existente) {
        existente.cantidad += cantidad;
        existente.subtotal = Math.round(existente.cantidad * existente.precioUnitario * 100) / 100;
    } else {
        carritoActual.push({
            codigo: prod.codigo,
            descripcion: prod.descripcion,
            precioUnitario: prod.precioUnitario,
            cantidad: cantidad,
            subtotal: subtotal
        });
    }

    renderizarCarrito();

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
        mostrarAlertaVenta("Debe incorporar al menos un producto a la venta.", "error");
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
            alert("Venta registrada con éxito. Se descontaron las cantidades del stock y se asentó el ingreso en caja.");
            carritoActual = [];
            renderizarCarrito();
            document.getElementById("venta-info-prod").style.display = "none";
            document.getElementById("venta-alerta").style.display = "none";
            cargarDatalistProductosVenta();
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
// 3. HISTORIAL DE VENTAS Y REMITO (ADMINISTRATIVO)
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
                <td style="text-align: center;">${d.cantidad}</td>
                <td style="text-align: right; white-space: nowrap;">$ ${d.precioUnitario.toFixed(2)}</td>
                <td style="text-align: right; white-space: nowrap;"><strong>$ ${d.subtotal.toFixed(2)}</strong></td>
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
        let coincideTexto = true;
        if (txt) {
            const fechaStr = v.fecha ? v.fecha.toLowerCase() : "";
            const enDetalles = v.detalles && v.detalles.some(d => 
                (d.productoCodigo && d.productoCodigo.toLowerCase().includes(txt)) ||
                (d.descripcion && d.descripcion.toLowerCase().includes(txt))
            );
            coincideTexto = fechaStr.includes(txt) || enDetalles;
        }

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
// 4. INVENTARIO DE PRODUCTOS (ALTA, MODIFICACIÓN, BAJA Y REACTIVACIÓN)
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
            <td style="white-space: nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="editarProducto('${p.codigo}')">Modificar</button>
                ${p.activo 
                    ? `<button class="btn btn-outline-danger btn-sm" onclick="darBajaProducto('${p.codigo}')">Baja</button>` 
                    : `<button class="btn btn-success btn-sm" onclick="reactivarProducto('${p.codigo}')">Activar</button>`
                }
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
    if (!confirm(`¿Confirma la baja lógica del producto ${codigo}?`)) return;

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

async function reactivarProducto(codigo) {
    const p = listaProductosGlobal.find(item => item.codigo === codigo);
    if (!p) return;

    if (!confirm(`¿Desea reactivar el producto ${p.codigo} (${p.descripcion}) para que vuelva a estar disponible para la venta?`)) return;

    const payload = {
        codigo: p.codigo,
        descripcion: p.descripcion,
        categoria: p.categoria,
        precioUnitario: p.precioUnitario,
        stockActual: p.stockActual,
        stockMinimo: p.stockMinimo,
        activo: true
    };

    try {
        const res = await fetch("/api/productos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
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

// ============================================================
// 5. CONTROL DE STOCK MÍNIMO (GERENTE Y ADMINISTRATIVO)
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
// 6. REPORTE DE RECAUDACIÓN (ADMINISTRATIVO)
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
// 7. CLIENTES Y PROMOCIONES (ADMINISTRATIVO)
// ============================================================
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return regex.test(email);
}

async function cargarClientes() {
    try {
        const res = await fetch("/api/clientes");
        listaClientesGlobal = await res.json();
        renderizarTablaClientes(listaClientesGlobal);
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
    const telefono = document.getElementById("cli-telefono").value.trim();
    const email = document.getElementById("cli-email").value.trim();

    if (!/^[0-9]{7,15}$/.test(telefono)) {
        alert("El teléfono debe contener únicamente números (entre 7 y 15 dígitos).");
        return;
    }
    if (email && !validarEmail(email)) {
        alert("Ingrese un correo electrónico válido (ej: usuario@gmail.com).");
        return;
    }

    const payload = {
        nombre: document.getElementById("cli-nombre").value.trim(),
        apellido: document.getElementById("cli-apellido").value.trim(),
        telefono,
        email,
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
            alert(data.error || "No se pudo registrar el cliente.");
        }
    } catch (err) {
        alert("Error de conexión al registrar cliente.");
    }
}

// ============================================================
// 8. PROVEEDORES (ADMINISTRATIVO)
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
    const cuit = document.getElementById("prov-cuit").value.trim();
    const telefono = document.getElementById("prov-telefono").value.trim();
    const email = document.getElementById("prov-email").value.trim();

    if (!/^[0-9]{11}$/.test(cuit)) {
        alert("El CUIT debe contener exactamente 11 dígitos numéricos.");
        return;
    }
    if (!/^[0-9]{7,15}$/.test(telefono)) {
        alert("El teléfono debe contener únicamente números (entre 7 y 15 dígitos).");
        return;
    }
    if (!validarEmail(email)) {
        alert("Ingrese un correo electrónico válido (ej: ventas@gmail.com).");
        return;
    }

    const payload = {
        razonSocial: document.getElementById("prov-razon").value.trim(),
        cuit,
        rubro: document.getElementById("prov-rubro").value.trim(),
        telefono,
        email
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
            alert(data.error || "No se pudo guardar el proveedor.");
        }
    } catch (err) {
        alert("Error de conexión al guardar proveedor.");
    }
}

// ============================================================
// 9. CAJA DIARIA, COBROS A CLIENTES, CONTROL DE SALDO NO NEGATIVO Y CIERRE DIARIO
// ============================================================
async function cargarCaja() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const fechaSeleccionada = document.getElementById("caja-filtro-fecha").value || obtenerFechaHoyLocal();

    document.getElementById("caja-fecha-hoy").textContent = fechaSeleccionada;

    if (esAdmin) {
        document.getElementById("caja-titulo-vista").textContent = "Caja Diaria y Movimientos";
        document.getElementById("caja-subtitulo-vista").textContent = "Control diario de ingresos por ventas y cobros a clientes, egresos y cierre de jornada.";
        document.getElementById("caja-acciones-admin").style.display = "flex";
    } else {
        document.getElementById("caja-titulo-vista").textContent = "Caja Diaria y Movimientos (Gerencia)";
        document.getElementById("caja-subtitulo-vista").textContent = "Supervisión de arqueo diario, movimientos y cierres de caja.";
        document.getElementById("caja-acciones-admin").style.display = "none";
    }

    try {
        const resMovs = await fetch("/api/caja/movimientos");
        const todosMovs = await resMovs.json();

        // Filtramos por la fecha seleccionada para el arqueo diario
        const movsDelDia = todosMovs.filter(m => m.fecha && m.fecha.startsWith(fechaSeleccionada));

        // Saldo acumulado real en caja (para validar que nunca quede negativo)
        const resTotales = await fetch("/api/caja/totales");
        const totales = await resTotales.json();
        saldoActualCaja = Math.max(0, totales.saldo || 0);

        let ingresosDia = 0;
        let egresosDia = 0;
        let cierreDelDia = null;

        movsDelDia.forEach(m => {
            if (m.tipo === "CIERRE_CAJA_DIARIO") {
                cierreDelDia = m;
            } else if (m.tipo.startsWith("INGRESO")) {
                ingresosDia += m.monto;
            } else if (m.tipo.startsWith("EGRESO")) {
                egresosDia += m.monto;
            }
        });

        document.getElementById("caja-metric-ingresos").textContent = `$ ${ingresosDia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("caja-metric-egresos").textContent = `$ ${egresosDia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("caja-metric-saldo").textContent = `$ ${saldoActualCaja.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

        const estadoBadge = document.getElementById("caja-estado-badge");
        const cierreInfo = document.getElementById("caja-ultimo-cierre-info");

        if (cierreDelDia) {
            const horaCierre = cierreDelDia.fecha.replace("T", " ").substring(11, 16);
            estadoBadge.textContent = "CAJA CERRADA";
            estadoBadge.className = "badge badge-warning";
            cierreInfo.textContent = `Cierre diario realizado a las ${horaCierre} hs — ${cierreDelDia.concepto}`;
        } else {
            estadoBadge.textContent = "CAJA ABIERTA";
            estadoBadge.className = "badge badge-success";
            cierreInfo.textContent = "Jornada en curso — Pendiente de cierre diario al finalizar la atención.";
        }

        renderizarTablaCaja(movsDelDia);

    } catch (err) {
        console.error("Error al cargar datos de caja:", err);
    }
}

function renderizarTablaCaja(movs) {
    const tbody = document.getElementById("tbody-caja-movimientos");
    tbody.innerHTML = "";

    if (!movs || movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No se registran movimientos de caja en la fecha seleccionada.</td></tr>`;
        return;
    }

    movs.forEach(m => {
        const esCierre = m.tipo === "CIERRE_CAJA_DIARIO";
        const esIngreso = m.tipo.startsWith("INGRESO");
        const fechaFmt = m.fecha ? m.fecha.replace("T", " ").substring(0, 19) : "-";
        const tr = document.createElement("tr");

        let tipoLabel = m.tipo;
        let badgeClass = esIngreso ? "badge-success" : "badge-danger";
        if (m.tipo === "INGRESO_VENTA") tipoLabel = "Ingreso por Venta";
        if (m.tipo === "INGRESO_COBRO_CLIENTE") tipoLabel = "Cobro a Cliente";
        if (m.tipo === "INGRESO_APORTE_CAJA") tipoLabel = "Apertura / Refuerzo Caja";
        if (m.tipo === "EGRESO_PROVEEDOR") tipoLabel = "Pago a Proveedor";
        if (m.tipo === "EGRESO_IMPUESTOS") tipoLabel = "Pago de Impuestos/Servicios";
        if (m.tipo === "EGRESO_GASTOS") tipoLabel = "Gastos Operativos";
        if (esCierre) {
            tipoLabel = "Cierre Diario de Caja";
            badgeClass = "badge-warning";
        }

        const montoHtml = esCierre
            ? `<strong>Arqueo: $ ${m.monto.toFixed(2)}</strong>`
            : `<strong class="${esIngreso ? 'text-primary' : 'text-danger'}">${esIngreso ? '+' : '-'} $ ${m.monto.toFixed(2)}</strong>`;

        tr.innerHTML = `
            <td>${fechaFmt}</td>
            <td><span class="badge ${badgeClass}">${tipoLabel}</span></td>
            <td>${m.concepto}</td>
            <td class="text-right">${montoHtml}</td>
            <td>Usuario #${m.usuarioId}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function abrirModalIngresoCaja() {
    document.getElementById("form-ingreso-caja").reset();

    // Cargar clientes registrados para permitir asociar un cobro a un cliente
    try {
        const res = await fetch("/api/clientes");
        listaClientesGlobal = await res.json();
        const selectCli = document.getElementById("ingreso-cliente");
        selectCli.innerHTML = `<option value="">-- Sin cliente específico / Mostrador --</option>`;
        listaClientesGlobal.forEach(c => {
            const opt = document.createElement("option");
            opt.value = `${c.nombre} ${c.apellido}`;
            opt.textContent = `${c.nombre} ${c.apellido} (Tel: ${c.telefono})`;
            selectCli.appendChild(opt);
        });
    } catch (e) {
        console.error("No se pudieron cargar los clientes para el ingreso:", e);
    }

    document.getElementById("modal-ingreso-caja").style.display = "flex";
}

function cerrarModalIngresoCaja() {
    document.getElementById("modal-ingreso-caja").style.display = "none";
}

function autocompletarConceptoCliente() {
    const clienteNombre = document.getElementById("ingreso-cliente").value;
    const conceptoInput = document.getElementById("ingreso-concepto");
    if (clienteNombre) {
        conceptoInput.value = `Cobro / Pago recibido de cliente: ${clienteNombre}`;
    }
}

async function guardarIngresoCaja(e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById("ingreso-monto").value);
    if (isNaN(monto) || monto <= 0) {
        alert("El monto del ingreso debe ser mayor a $0,00.");
        return;
    }

    const payload = {
        tipo: document.getElementById("ingreso-tipo").value,
        concepto: document.getElementById("ingreso-concepto").value.trim(),
        monto: monto,
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
            alert("Ingreso registrado correctamente en la caja.");
            cerrarModalIngresoCaja();
            cargarCaja();
        } else {
            alert(data.error || "No se pudo registrar el ingreso.");
        }
    } catch (err) {
        alert("Error de conexión al registrar el ingreso.");
    }
}

function abrirModalEgresoCaja() {
    document.getElementById("form-egreso-caja").reset();
    document.getElementById("egreso-saldo-disponible").textContent = `$ ${saldoActualCaja.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById("egreso-monto").max = saldoActualCaja.toFixed(2);
    document.getElementById("modal-egreso-caja").style.display = "flex";
}

function cerrarModalEgresoCaja() {
    document.getElementById("modal-egreso-caja").style.display = "none";
}

async function guardarEgresoCaja(e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById("egreso-monto").value);

    if (isNaN(monto) || monto <= 0) {
        alert("El monto del egreso debe ser mayor a $0,00.");
        return;
    }

    // Regla de negocio: el saldo en caja NUNCA puede quedar negativo
    if (monto > saldoActualCaja) {
        alert(`Operación rechazada: fondos insuficientes en caja. El monto a egresar ($ ${monto.toFixed(2)}) supera el saldo disponible actual ($ ${saldoActualCaja.toFixed(2)}). La caja no puede quedar con saldo negativo.`);
        return;
    }

    const payload = {
        tipo: document.getElementById("egreso-tipo").value,
        concepto: document.getElementById("egreso-concepto").value.trim(),
        monto: monto,
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
            alert(data.error || "No se pudo registrar el egreso.");
        }
    } catch (err) {
        alert("Error de conexión al registrar egreso.");
    }
}

async function realizarCierreCajaDiario() {
    const fechaHoy = obtenerFechaHoyLocal();
    const confirmacion = confirm(
        `¿Confirma el CIERRE DIARIO DE CAJA correspondiente a la fecha ${fechaHoy}?

` +
        `Saldo declarado en arqueo: $ ${saldoActualCaja.toFixed(2)}
` +
        `Responsable: ${usuarioActual.nombre} ${usuarioActual.apellido}`
    );
    if (!confirmacion) return;

    const payload = {
        tipo: "CIERRE_CAJA_DIARIO",
        concepto: `Cierre diario de jornada (${fechaHoy}) — Arqueo confirmado: $ ${saldoActualCaja.toFixed(2)}`,
        monto: saldoActualCaja,
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
            alert("Cierre diario de caja asentado correctamente.");
            document.getElementById("caja-filtro-fecha").value = fechaHoy;
            cargarCaja();
        } else {
            alert(data.error || "No se pudo registrar el cierre diario de caja.");
        }
    } catch (err) {
        alert("Error de conexión al registrar el cierre diario.");
    }
}
