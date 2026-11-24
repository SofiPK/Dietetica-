/**
 * DIETÉTICA VIDA NATURAL — LÓGICA FRONTEND
 * Estilo ERP Comercial (Sin Emojis, Diseño Limpio)
 */

let usuarioActual = null;
let carritoActual = [];
let productoSeleccionadoParaVenta = null;
let listaProductosGlobal = [];
let editandoProductoCodigo = null;

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

    // Administrativo: Registrar Venta e Inventario de Productos
    // Gerente: Control de Stock Mínimo y Reporte de Recaudación
    document.getElementById("nav-ventas").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-productos").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-stock-bajo").style.display = esAdmin ? "none" : "block";
    document.getElementById("nav-recaudacion").style.display = esAdmin ? "none" : "block";

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
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const seccionesAdmin = ["ventas", "productos"];
    const seccionesGerente = ["stock-bajo", "recaudacion"];

    if (esAdmin && !seccionesAdmin.includes(seccion)) {
        seccion = "ventas";
    } else if (!esAdmin && !seccionesGerente.includes(seccion)) {
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
    if (seccion === "recaudacion") consultarRecaudacion();
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

    const totalVenta = carritoActual.reduce((sum, item) => sum + item.subtotal, 0);

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
            alert(`Venta registrada con éxito por un total de $${totalVenta.toFixed(2)}. Se descontaron las cantidades del stock.`);
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
// 3. INVENTARIO DE PRODUCTOS (ALTA, MODIFICACIÓN, BAJA Y REACTIVACIÓN)
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
// 4. CONTROL DE STOCK MÍNIMO (GERENTE)
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
// 5. REPORTE DE RECAUDACIÓN (GERENTE)
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
