/**
 * DIETÉTICA VIDA NATURAL — LÓGICA FRONTEND
 * Estilo ERP Comercial (Sin Emojis, Diseño Limpio)
 */

let usuarioActual = null;
let carritoActual = [];
let productoSeleccionadoParaVenta = null;
let promoSeleccionadaParaVenta = null;
let listaProductosGlobal = [];
let listaVentasGlobal = [];
let listaClientesGlobal = [];
let listaPromocionesGlobal = [];
let listaUsuariosGlobal = [];
let cajaActualGlobal = null;
let editandoProductoCodigo = null;
let editandoClienteId = null;
let editandoPromoId = null;
let editandoUsuarioId = null;
let ordenProductosColumna = null;
let ordenProductosAsc = true;
let ordenVentasColumna = null;
let ordenVentasAsc = true;
let ordenClientesColumna = null;
let ordenClientesAsc = true;
let seccionActual = null;
let transicionSeccionTimer = null;

// Interceptor global de fetch para enviar perfil e ID de usuario en cada petición API
const fetchOriginal = window.fetch;
window.fetch = function(url, options = {}) {
    if (typeof url === "string" && url.startsWith("/api/") && usuarioActual) {
        options.headers = {
            ...(options.headers || {}),
            ...(usuarioActual.perfil ? { "X-User-Perfil": usuarioActual.perfil } : {}),
            ...(usuarioActual.id ? { "X-User-Id": String(usuarioActual.id) } : {})
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
// 1. AUTENTICACIÓN Y RECUPERACIÓN DE CONTRASEÑA
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

const CODIGO_RECUPERACION_MOCK = "482910";

function mostrarPasoRecuperacion(paso) {
    const pasos = ["ingreso", "correo", "codigo", "nueva-clave"];
    pasos.forEach(p => {
        const el = document.getElementById(`login-paso-${p}`);
        if (el) el.style.display = (p === paso) ? "block" : "none";
    });

    ["login-error", "login-exito", "recup-correo-error", "recup-codigo-error", "recup-clave-error"].forEach(id => {
        const alerta = document.getElementById(id);
        if (alerta) alerta.style.display = "none";
    });

    if (paso === "correo") {
        document.getElementById("form-recup-correo").reset();
        document.getElementById("recup-email").focus();
    } else if (paso === "codigo") {
        document.getElementById("form-recup-codigo").reset();
        document.getElementById("recup-codigo").focus();
    } else if (paso === "nueva-clave") {
        document.getElementById("form-recup-clave").reset();
        document.getElementById("recup-nueva-pass").focus();
    }
}

function enviarCodigoRecuperacion(e) {
    e.preventDefault();
    const email = document.getElementById("recup-email").value.trim();
    const errorBox = document.getElementById("recup-correo-error");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        errorBox.textContent = "Ingrese un formato de correo electrónico válido.";
        errorBox.style.display = "block";
        return;
    }

    document.getElementById("recup-email-mostrado").textContent = email;
    mostrarPasoRecuperacion("codigo");
}

function verificarCodigoRecuperacion(e) {
    e.preventDefault();
    const codigoIngresado = document.getElementById("recup-codigo").value.trim();
    const errorBox = document.getElementById("recup-codigo-error");

    if (codigoIngresado !== CODIGO_RECUPERACION_MOCK) {
        errorBox.textContent = "El código ingresado es incorrecto. Verifique el código de prueba.";
        errorBox.style.display = "block";
        return;
    }

    mostrarPasoRecuperacion("nueva-clave");
}

function confirmarNuevaContrasena(e) {
    e.preventDefault();
    const nueva = document.getElementById("recup-nueva-pass").value;
    const confirmar = document.getElementById("recup-confirmar-pass").value;
    const errorBox = document.getElementById("recup-clave-error");

    if (nueva.length < 6) {
        errorBox.textContent = "La contraseña debe tener al menos 6 caracteres.";
        errorBox.style.display = "block";
        return;
    }

    if (nueva !== confirmar) {
        errorBox.textContent = "Las contraseñas no coinciden.";
        errorBox.style.display = "block";
        return;
    }

    mostrarPasoRecuperacion("ingreso");
    const exitoBox = document.getElementById("login-exito");
    exitoBox.textContent = "Contraseña actualizada correctamente (simulación). Ya puede iniciar sesión.";
    exitoBox.style.display = "block";
    document.getElementById("usuario").focus();
}

function cerrarSesion() {
    localStorage.removeItem("vida_natural_user");
    usuarioActual = null;
    carritoActual = [];
    seccionActual = null;
    if (transicionSeccionTimer) {
        clearTimeout(transicionSeccionTimer);
        transicionSeccionTimer = null;
    }

    const vistaPrincipal = document.getElementById("vista-principal");
    const vistaLogin = document.getElementById("vista-login");
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.style.display = "none";

    vistaPrincipal.style.transition = "opacity 0.14s ease";
    vistaPrincipal.style.opacity = "0";

    setTimeout(() => {
        vistaPrincipal.style.display = "none";
        vistaPrincipal.style.opacity = "1";
        vistaLogin.style.opacity = "0";
        vistaLogin.style.display = "flex";
        requestAnimationFrame(() => {
            vistaLogin.style.transition = "opacity 0.18s ease";
            vistaLogin.style.opacity = "1";
        });
        document.getElementById("usuario").value = "";
        document.getElementById("contrasena").value = "";
    }, 140);
}

function mostrarPanelPrincipal() {
    const vistaLogin = document.getElementById("vista-login");
    const vistaPrincipal = document.getElementById("vista-principal");

    vistaLogin.style.display = "none";
    vistaPrincipal.style.opacity = "0";
    vistaPrincipal.style.display = "flex";
    requestAnimationFrame(() => {
        vistaPrincipal.style.transition = "opacity 0.2s ease";
        vistaPrincipal.style.opacity = "1";
    });

    const nombreCompleto = `${usuarioActual.nombre} ${usuarioActual.apellido}`;
    document.getElementById("header-user-name").textContent = nombreCompleto;

    const badge = document.getElementById("header-user-badge");
    badge.textContent = usuarioActual.perfil;
    badge.className = `badge ${usuarioActual.perfil === "ADMINISTRATIVO" ? "badge-admin" : "badge-gerente"}`;

    const esAdmin = usuarioActual.perfil === "ADMINISTRATIVO";

    document.getElementById("nav-ventas").style.display = esAdmin ? "block" : "none";
    document.getElementById("nav-caja").style.display = "block";
    document.getElementById("nav-historial-ventas").style.display = "block";
    document.getElementById("nav-productos").style.display = "block";
    document.getElementById("nav-clientes").style.display = "block";
    document.getElementById("nav-promociones").style.display = "block";
    document.getElementById("nav-recaudacion").style.display = esAdmin ? "none" : "block";
    const navUsuarios = document.getElementById("nav-usuarios");
    if (navUsuarios) navUsuarios.style.display = esAdmin ? "none" : "block";

    verificarEstadoCajaGlobal();

    if (esAdmin) {
        cambiarSeccion("ventas", true);
    } else {
        cambiarSeccion("recaudacion", true);
    }
}

// ============================================================
// NAVEGACIÓN ENTRE SECCIONES (CON TRANSICIÓN SUAVE)
// ============================================================
function cambiarSeccion(seccion, inmediato = false) {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const seccionesAdmin = ["ventas", "caja", "historial-ventas", "productos", "clientes", "promociones", "stock-bajo"];
    const seccionesGerente = ["caja", "historial-ventas", "productos", "clientes", "promociones", "stock-bajo", "recaudacion", "usuarios"];

    if (esAdmin && !seccionesAdmin.includes(seccion)) {
        seccion = "ventas";
    } else if (!esAdmin && !seccionesGerente.includes(seccion)) {
        seccion = "recaudacion";
    }

    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const navKey = (seccion === "stock-bajo") ? "productos" : seccion;
    const navBtn = document.getElementById(`nav-${navKey}`);
    if (navBtn) navBtn.classList.add("active");

    const target = document.getElementById(`seccion-${seccion}`);
    const actualEl = seccionActual ? document.getElementById(`seccion-${seccionActual}`) : null;

    if (transicionSeccionTimer) {
        clearTimeout(transicionSeccionTimer);
        transicionSeccionTimer = null;
    }

    const activarDestino = () => {
        document.querySelectorAll(".seccion-view").forEach(s => {
            s.style.display = "none";
            s.style.opacity = "";
            s.style.transition = "";
        });

        if (target) {
            target.style.animation = "none";
            target.style.display = "block";
            void target.offsetWidth; // Reinicia el keyframe fadeInModulo
            target.style.animation = "";
        }

        seccionActual = seccion;
        cargarDatosDeSeccion(seccion);
    };

    if (!inmediato && actualEl && actualEl !== target && actualEl.style.display !== "none") {
        actualEl.style.transition = "opacity 0.11s ease";
        actualEl.style.opacity = "0";
        transicionSeccionTimer = setTimeout(() => {
            transicionSeccionTimer = null;
            activarDestino();
        }, 110);
    } else {
        activarDestino();
    }
}

function cargarDatosDeSeccion(seccion) {
    if (seccion === "ventas") {
        verificarEstadoCajaGlobal();
        cargarDatalistProductosVenta();
        cargarSelectorClientesVenta();
    }
    if (seccion === "caja") cargarModuloCaja();
    if (seccion === "historial-ventas") cargarHistorialVentasERP();
    if (seccion === "productos") cargarProductos();
    if (seccion === "clientes") cargarClientes();
    if (seccion === "promociones") cargarPromociones();
    if (seccion === "stock-bajo") cargarStockBajo();
    if (seccion === "recaudacion") consultarRecaudacion();
    if (seccion === "usuarios") cargarUsuarios();
}

// ============================================================
// 2. MÓDULO DE CAJA (APERTURA, MOVIMIENTOS Y CIERRE)
// ============================================================
async function verificarEstadoCajaGlobal() {
    try {
        const res = await fetch("/api/caja/actual");
        const data = await res.json();
        cajaActualGlobal = data.abierta ? data.caja : null;

        const avisoVenta = document.getElementById("venta-caja-aviso");
        const bannerCerrada = document.getElementById("venta-caja-cerrada-banner");
        if (avisoVenta && bannerCerrada) {
            if (data.abierta) {
                avisoVenta.textContent = `Caja #${data.caja.id} Abierta ($${data.caja.saldoActual.toFixed(2)})`;
                avisoVenta.className = "badge badge-success";
                bannerCerrada.style.display = "none";
            } else {
                avisoVenta.textContent = "Caja Cerrada";
                avisoVenta.className = "badge badge-danger";
                bannerCerrada.style.display = "block";
            }
        }
        return data;
    } catch (err) {
        console.error("Error al consultar estado de caja:", err);
        return { abierta: false };
    }
}

async function cargarModuloCaja() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const data = await verificarEstadoCajaGlobal();

    const badge = document.getElementById("caja-badge-principal");
    const panelCerrada = document.getElementById("panel-caja-cerrada");
    const panelAbierta = document.getElementById("panel-caja-abierta");
    const opsAdmin = document.getElementById("caja-operaciones-admin");

    if (data.abierta && data.caja) {
        const c = data.caja;
        badge.textContent = `Caja #${c.id} ABIERTA`;
        badge.className = "badge badge-success";
        panelCerrada.style.display = "none";
        panelAbierta.style.display = "block";
        if (opsAdmin) opsAdmin.style.display = esAdmin ? "grid" : "none";

        document.getElementById("caja-stat-inicial").textContent = `$${c.montoInicial.toFixed(2)}`;
        document.getElementById("caja-stat-actual").textContent = `$${c.saldoActual.toFixed(2)}`;
        document.getElementById("caja-stat-fecha").textContent = c.fechaApertura ? c.fechaApertura.replace("T", " ").substring(0, 16) : "-";

        actualizarVistaDiferenciaCierre();
        renderizarMovimientosCaja(c.movimientos || []);
    } else {
        badge.textContent = "CAJA CERRADA";
        badge.className = "badge badge-danger";
        panelAbierta.style.display = "none";
        panelCerrada.style.display = esAdmin ? "block" : "none";
    }

    cargarHistorialCierresCaja();
}

function renderizarMovimientosCaja(movimientos) {
    const tbody = document.getElementById("tbody-movimientos-caja");
    tbody.innerHTML = "";

    if (!movimientos || movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Aún no hay movimientos registrados en esta caja.</td></tr>`;
        return;
    }

    movimientos.forEach(m => {
        const esEgreso = m.tipo === "EGRESO_MANUAL";
        const hora = m.fechaHora ? m.fechaHora.replace("T", " ").substring(11, 19) : "-";
        const badgeTipo = m.tipo === "VENTA"
            ? `<span class="badge badge-success">Venta</span>`
            : (esEgreso ? `<span class="badge badge-danger">Egreso Manual</span>` : `<span class="badge badge-admin">Ingreso Manual</span>`);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${hora}</td>
            <td>${badgeTipo}</td>
            <td>${m.concepto}</td>
            <td><strong class="${esEgreso ? 'text-danger' : 'text-primary'}">${esEgreso ? '-' : '+'}$${m.monto.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarVistaDiferenciaCierre() {
    if (!cajaActualGlobal) return;
    const input = document.getElementById("caja-monto-real");
    const span = document.getElementById("caja-diff-valor");
    if (!input || !span) return;

    const real = parseFloat(input.value);
    if (isNaN(real)) {
        span.textContent = "$0.00 (Ingrese monto contado)";
        return;
    }
    const diff = Math.round((real - cajaActualGlobal.saldoActual) * 100) / 100;
    if (diff === 0) {
        span.innerHTML = `<span class="badge badge-success">$0.00 (Cuadre exacto)</span>`;
    } else if (diff > 0) {
        span.innerHTML = `<span class="badge badge-warning">+$${diff.toFixed(2)} (Sobrante)</span>`;
    } else {
        span.innerHTML = `<span class="badge badge-danger">-$${Math.abs(diff).toFixed(2)} (Faltante)</span>`;
    }
}

async function abrirCajaTurno(e) {
    e.preventDefault();
    const montoInicial = parseFloat(document.getElementById("caja-monto-inicial").value);
    const observaciones = document.getElementById("caja-obs-apertura").value.trim();

    try {
        const res = await fetch("/api/caja/abrir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioActual.id, montoInicial, observaciones })
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            document.getElementById("form-abrir-caja").reset();
            mostrarAlertaCaja("Caja abierta correctamente.", "success");
            cargarModuloCaja();
        } else {
            mostrarAlertaCaja(data.error || "No se pudo abrir la caja.", "error");
        }
    } catch (err) {
        mostrarAlertaCaja("Error de conexión al abrir la caja.", "error");
    }
}

async function registrarMovimientoCaja(e) {
    e.preventDefault();
    const tipo = document.getElementById("mov-tipo").value;
    const monto = parseFloat(document.getElementById("mov-monto").value);
    const concepto = document.getElementById("mov-concepto").value.trim();

    try {
        const res = await fetch("/api/caja/movimiento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioActual.id, tipo, concepto, monto })
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            document.getElementById("form-movimiento-caja").reset();
            mostrarAlertaCaja("Movimiento registrado en caja.", "success");
            cargarModuloCaja();
        } else {
            mostrarAlertaCaja(data.error || "No se pudo registrar el movimiento.", "error");
        }
    } catch (err) {
        mostrarAlertaCaja("Error de conexión al registrar movimiento.", "error");
    }
}

async function cerrarCajaTurno(e) {
    e.preventDefault();
    const montoFinalReal = parseFloat(document.getElementById("caja-monto-real").value);
    const observaciones = document.getElementById("caja-obs-cierre").value.trim();

    if (!confirm("¿Confirma el cierre de caja con el arqueo ingresado? Esta acción no se puede deshacer.")) return;

    try {
        const res = await fetch("/api/caja/cerrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioActual.id, montoFinalReal, observaciones })
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            document.getElementById("form-cerrar-caja").reset();
            const diff = data.caja.diferencia || 0;
            mostrarAlertaCaja(`Caja cerrada con éxito. Diferencia de arqueo: $${diff.toFixed(2)}.`, "success");
            cargarModuloCaja();
        } else {
            mostrarAlertaCaja(data.error || "No se pudo cerrar la caja.", "error");
        }
    } catch (err) {
        mostrarAlertaCaja("Error de conexión al cerrar la caja.", "error");
    }
}

async function cargarHistorialCierresCaja() {
    try {
        const res = await fetch("/api/caja/historial");
        const cierres = await res.json();
        const tbody = document.getElementById("tbody-historial-cajas");
        tbody.innerHTML = "";

        if (!cierres || cierres.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center">No hay cierres de caja registrados.</td></tr>`;
            return;
        }

        cierres.forEach(c => {
            const diff = c.diferencia || 0;
            const badgeDiff = diff === 0
                ? `<span class="badge badge-success">$0.00</span>`
                : `<span class="badge ${diff > 0 ? 'badge-warning' : 'badge-danger'}">${diff > 0 ? '+' : ''}$${diff.toFixed(2)}</span>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>#${c.id}</strong></td>
                <td>${c.fechaApertura ? c.fechaApertura.replace("T", " ").substring(0, 16) : "-"}</td>
                <td>${c.fechaCierre ? c.fechaCierre.replace("T", " ").substring(0, 16) : "-"}</td>
                <td>$${c.montoInicial.toFixed(2)}</td>
                <td>$${(c.montoEsperado || 0).toFixed(2)}</td>
                <td><strong>$${(c.montoFinalReal || 0).toFixed(2)}</strong></td>
                <td>${badgeDiff}</td>
                <td>${c.observaciones || "-"}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error al cargar historial de cajas:", err);
    }
}

function mostrarAlertaCaja(mensaje, tipo) {
    const alerta = document.getElementById("caja-alerta");
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo}`;
    alerta.style.display = "block";
}

// ============================================================
// 3. MÓDULO DE VENTAS (CON CLIENTE, MEDIO DE PAGO Y PROMOCIONES)
// ============================================================
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
        } catch (e) { /* Si falla consulta de promo, continúa con precio normal */ }

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
            verificarEstadoCajaGlobal();

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

// ============================================================
// HISTORIAL DE VENTAS (CON BOTONES DE FILTRO / ORDEN) Y REMITO
// ============================================================
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

// ============================================================
// 4. INVENTARIO DE PRODUCTOS (CON BOTONES DE FILTRO / ORDEN)
// ============================================================
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

// ============================================================
// 5. MÓDULO DE CLIENTES (CON ORDEN POR DNI Y NOMBRE/APELLIDO)
// ============================================================
async function cargarClientes() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const btnNuevo = document.getElementById("btn-nuevo-cliente");
    if (btnNuevo) btnNuevo.style.display = esAdmin ? "inline-flex" : "none";

    try {
        const res = await fetch("/api/clientes");
        listaClientesGlobal = await res.json();
        aplicarFiltroYOrdenClientes();
    } catch (err) {
        console.error("Error al cargar clientes:", err);
    }
}

function ordenarClientesPor(columna) {
    if (ordenClientesColumna === columna) {
        ordenClientesAsc = !ordenClientesAsc;
    } else {
        ordenClientesColumna = columna;
        ordenClientesAsc = true;
    }
    actualizarIconosOrdenClientes();
    aplicarFiltroYOrdenClientes();
}

function limpiarOrdenClientes() {
    ordenClientesColumna = null;
    ordenClientesAsc = true;
    const inputFiltro = document.getElementById("filtro-clientes");
    if (inputFiltro) inputFiltro.value = "";
    actualizarIconosOrdenClientes();
    aplicarFiltroYOrdenClientes();
}

function actualizarIconosOrdenClientes() {
    const columnas = ["dniCuit", "nombreApellido"];
    columnas.forEach(col => {
        const btn = document.getElementById(`th-cli-btn-${col}`);
        const icon = document.getElementById(`th-cli-icon-${col}`);
        if (!btn || !icon) return;

        if (ordenClientesColumna === col) {
            btn.classList.add("active");
            icon.innerHTML = ordenClientesAsc ? "&#9650;" : "&#9660;";
        } else {
            btn.classList.remove("active");
            icon.innerHTML = "&#8693;";
        }
    });
}

function aplicarFiltroYOrdenClientes() {
    const txt = (document.getElementById("filtro-clientes")?.value || "").toLowerCase().trim();
    let resultado = listaClientesGlobal.filter(c =>
        (c.dniCuit && c.dniCuit.toLowerCase().includes(txt)) ||
        (c.nombre && c.nombre.toLowerCase().includes(txt)) ||
        (c.apellido && c.apellido.toLowerCase().includes(txt)) ||
        (c.telefono && c.telefono.toLowerCase().includes(txt))
    );

    if (ordenClientesColumna) {
        resultado = [...resultado].sort((a, b) => {
            if (ordenClientesColumna === "dniCuit") {
                const numA = parseInt(String(a.dniCuit || "").replace(/\D/g, ""), 10);
                const numB = parseInt(String(b.dniCuit || "").replace(/\D/g, ""), 10);
                if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                    return ordenClientesAsc ? numA - numB : numB - numA;
                }
                const strA = String(a.dniCuit || "").toLowerCase();
                const strB = String(b.dniCuit || "").toLowerCase();
                return ordenClientesAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
            }

            if (ordenClientesColumna === "nombreApellido") {
                const nomA = `${a.nombre || ""} ${a.apellido || ""}`.trim().toLowerCase();
                const nomB = `${b.nombre || ""} ${b.apellido || ""}`.trim().toLowerCase();
                return ordenClientesAsc ? nomA.localeCompare(nomB, "es") : nomB.localeCompare(nomA, "es");
            }

            return 0;
        });
    }

    renderizarTablaClientes(resultado);
}

function renderizarTablaClientes(clientes) {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const tbody = document.getElementById("tbody-clientes");
    tbody.innerHTML = "";

    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No hay clientes registrados.</td></tr>`;
        return;
    }

    clientes.forEach(c => {
        const acciones = esAdmin
            ? `<button class="btn btn-secondary btn-sm" onclick="editarCliente(${c.id})">Editar</button>
               ${c.activo
                   ? `<button class="btn btn-outline-danger btn-sm" onclick="cambiarEstadoCliente(${c.id}, false)">Baja</button>`
                   : `<button class="btn btn-success btn-sm" onclick="cambiarEstadoCliente(${c.id}, true)">Activar</button>`
               }`
            : `<span class="badge">Solo lectura</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${c.dniCuit}</code></td>
            <td><strong>${c.nombre} ${c.apellido}</strong></td>
            <td>${c.telefono || "-"}</td>
            <td>${c.email || "-"}</td>
            <td><span class="badge ${c.aceptaPromociones ? 'badge-success' : ''}">${c.aceptaPromociones ? 'Suscripto' : 'No'}</span></td>
            <td><span class="badge ${c.activo ? 'badge-success' : 'badge-danger'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td style="white-space: nowrap;">${acciones}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarClientes() {
    aplicarFiltroYOrdenClientes();
}

function abrirModalCliente() {
    editandoClienteId = null;
    document.getElementById("modal-cliente-titulo").textContent = "Registrar Cliente";
    document.getElementById("form-cliente").reset();
    document.getElementById("cli-acepta-promos").checked = true;
    document.getElementById("modal-cliente").style.display = "flex";
}

function cerrarModalCliente() {
    document.getElementById("modal-cliente").style.display = "none";
}

function editarCliente(id) {
    const c = listaClientesGlobal.find(item => item.id === id);
    if (!c) return;

    editandoClienteId = c.id;
    document.getElementById("modal-cliente-titulo").textContent = "Modificar Cliente";
    document.getElementById("cli-dni").value = c.dniCuit;
    document.getElementById("cli-nombre").value = c.nombre;
    document.getElementById("cli-apellido").value = c.apellido;
    document.getElementById("cli-telefono").value = c.telefono || "";
    document.getElementById("cli-email").value = c.email || "";
    document.getElementById("cli-acepta-promos").checked = !!c.aceptaPromociones;
    document.getElementById("modal-cliente").style.display = "flex";
}

async function guardarCliente(e) {
    e.preventDefault();
    const existente = editandoClienteId ? listaClientesGlobal.find(item => item.id === editandoClienteId) : null;

    const payload = {
        id: editandoClienteId,
        dniCuit: document.getElementById("cli-dni").value.trim(),
        nombre: document.getElementById("cli-nombre").value.trim(),
        apellido: document.getElementById("cli-apellido").value.trim(),
        telefono: document.getElementById("cli-telefono").value.trim(),
        email: document.getElementById("cli-email").value.trim(),
        aceptaPromociones: document.getElementById("cli-acepta-promos").checked,
        activo: existente ? existente.activo : true
    };

    try {
        const res = await fetch("/api/clientes", {
            method: editandoClienteId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            alert(editandoClienteId ? "Cliente actualizado con éxito." : "Cliente registrado con éxito.");
            cerrarModalCliente();
            cargarClientes();
        } else {
            alert(data.error || "No se pudo guardar el cliente.");
        }
    } catch (err) {
        alert("Error de conexión al guardar el cliente.");
    }
}

async function cambiarEstadoCliente(id, activar) {
    const c = listaClientesGlobal.find(item => item.id === id);
    if (!c) return;
    if (!confirm(`¿Confirma ${activar ? "reactivar" : "dar de baja"} al cliente ${c.nombre} ${c.apellido}?`)) return;

    try {
        const res = activar
            ? await fetch("/api/clientes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...c, activo: true })
            })
            : await fetch(`/api/clientes?id=${id}`, { method: "DELETE" });

        const data = await res.json();
        if (res.ok && data.exito) {
            cargarClientes();
        } else {
            alert(data.error || "No se pudo actualizar el estado del cliente.");
        }
    } catch (err) {
        alert("Error de conexión al cambiar estado del cliente.");
    }
}

// ============================================================
// 6. MÓDULO DE PROMOCIONES
// ============================================================
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

// ============================================================
// 7. CONTROL DE STOCK MÍNIMO
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
// 8. REPORTE DE RECAUDACIÓN AMPLIADO (GERENTE)
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
        document.getElementById("kpi-cant-ventas").textContent = data.cantidadVentas || 0;
        document.getElementById("kpi-ticket-promedio").textContent = `$ ${(data.ticketPromedio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        document.getElementById("kpi-total-descuentos").textContent = `$ ${(data.totalDescuentos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

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
// 9. GESTIÓN DE USUARIOS (SOLO GERENTE) Y MI CONTRASEÑA
// ============================================================
async function cargarUsuarios() {
    try {
        const res = await fetch("/api/usuarios");
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
            listaUsuariosGlobal = data;
            renderizarTablaUsuarios(listaUsuariosGlobal);
        } else {
            mostrarAlertaUsuarios(data.error || "No se pudieron cargar los usuarios.", "error");
        }
    } catch (err) {
        mostrarAlertaUsuarios("Error de conexión al cargar usuarios.", "error");
    }
}

function filtrarUsuarios() {
    const txt = (document.getElementById("filtro-usuarios")?.value || "").toLowerCase().trim();
    const filtrados = listaUsuariosGlobal.filter(u =>
        (u.nombreUsuario && u.nombreUsuario.toLowerCase().includes(txt)) ||
        (u.nombre && u.nombre.toLowerCase().includes(txt)) ||
        (u.apellido && u.apellido.toLowerCase().includes(txt)) ||
        (u.perfil && u.perfil.toLowerCase().includes(txt))
    );
    renderizarTablaUsuarios(filtrados);
}

function renderizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById("tbody-usuarios");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay usuarios registrados.</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const esMismoUsuario = usuarioActual && u.id === usuarioActual.id;
        const badgePerfil = u.perfil === "GERENTE"
            ? `<span class="badge badge-gerente">GERENTE</span>`
            : `<span class="badge badge-admin">ADMINISTRATIVO</span>`;

        const botonEstado = esMismoUsuario
            ? `<span class="badge" title="No puedes desactivar tu propia cuenta">Sesión actual</span>`
            : (u.activo
                ? `<button type="button" class="btn btn-outline-danger btn-sm" onclick="cambiarEstadoUsuario(${u.id}, false)">Baja</button>`
                : `<button type="button" class="btn btn-success btn-sm" onclick="cambiarEstadoUsuario(${u.id}, true)">Activar</button>`);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${u.nombreUsuario}</code></td>
            <td><strong>${u.nombre} ${u.apellido}</strong></td>
            <td>${badgePerfil}</td>
            <td>
                <span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">
                    ${u.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td style="white-space: nowrap;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="editarUsuario(${u.id})">Editar</button>
                ${botonEstado}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalUsuario() {
    editandoUsuarioId = null;
    document.getElementById("modal-usuario-titulo").textContent = "Registrar Usuario";
    document.getElementById("modal-usuario-error").style.display = "none";
    document.getElementById("form-usuario").reset();

    const inputUser = document.getElementById("usr-username");
    inputUser.disabled = false;

    const inputPass = document.getElementById("usr-password");
    inputPass.required = true;
    inputPass.placeholder = "Ingrese contraseña";
    document.getElementById("usr-password-label").textContent = "Contraseña (mínimo 4 caracteres)";

    document.getElementById("modal-usuario").style.display = "flex";
}

function cerrarModalUsuario() {
    document.getElementById("modal-usuario").style.display = "none";
}

function editarUsuario(id) {
    const u = listaUsuariosGlobal.find(item => item.id === id);
    if (!u) return;

    editandoUsuarioId = u.id;
    document.getElementById("modal-usuario-titulo").textContent = "Modificar Usuario";
    document.getElementById("modal-usuario-error").style.display = "none";

    const inputUser = document.getElementById("usr-username");
    inputUser.value = u.nombreUsuario;
    inputUser.disabled = true;

    document.getElementById("usr-perfil").value = u.perfil;
    document.getElementById("usr-nombre").value = u.nombre;
    document.getElementById("usr-apellido").value = u.apellido;

    const inputPass = document.getElementById("usr-password");
    inputPass.value = "";
    inputPass.required = false;
    inputPass.placeholder = "Dejar vacío para mantener la actual";
    document.getElementById("usr-password-label").textContent = "Nueva Contraseña (opcional)";

    document.getElementById("modal-usuario").style.display = "flex";
}

async function guardarUsuario(e) {
    e.preventDefault();
    const errorBox = document.getElementById("modal-usuario-error");
    errorBox.style.display = "none";

    const existente = editandoUsuarioId ? listaUsuariosGlobal.find(item => item.id === editandoUsuarioId) : null;

    const payload = {
        id: editandoUsuarioId,
        nombreUsuario: document.getElementById("usr-username").value.trim(),
        nombre: document.getElementById("usr-nombre").value.trim(),
        apellido: document.getElementById("usr-apellido").value.trim(),
        perfil: document.getElementById("usr-perfil").value,
        contrasena: document.getElementById("usr-password").value,
        activo: existente ? existente.activo : true
    };

    try {
        const res = await fetch("/api/usuarios", {
            method: editandoUsuarioId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.exito) {
            cerrarModalUsuario();
            mostrarAlertaUsuarios(editandoUsuarioId ? "Usuario actualizado con éxito." : "Usuario registrado con éxito.", "success");
            cargarUsuarios();
        } else {
            errorBox.textContent = data.error || "No se pudo guardar el usuario.";
            errorBox.style.display = "block";
        }
    } catch (err) {
        errorBox.textContent = "Error de conexión al guardar el usuario.";
        errorBox.style.display = "block";
    }
}

async function cambiarEstadoUsuario(id, activar) {
    const u = listaUsuariosGlobal.find(item => item.id === id);
    if (!u) return;

    if (!confirm(`¿Confirma ${activar ? "reactivar" : "dar de baja"} al usuario '${u.nombreUsuario}' (${u.nombre} ${u.apellido})?`)) return;

    try {
        const res = await fetch(`/api/usuarios?id=${id}&activar=${activar}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok && data.exito) {
            mostrarAlertaUsuarios(activar ? "Usuario reactivado con éxito." : "Usuario dado de baja con éxito.", "success");
            cargarUsuarios();
        } else {
            mostrarAlertaUsuarios(data.error || "No se pudo actualizar el estado del usuario.", "error");
        }
    } catch (err) {
        mostrarAlertaUsuarios("Error de conexión al cambiar el estado del usuario.", "error");
    }
}

function mostrarAlertaUsuarios(mensaje, tipo) {
    const alerta = document.getElementById("usuarios-alerta");
    if (!alerta) return;
    alerta.textContent = mensaje;
    alerta.className = `alert alert-${tipo}`;
    alerta.style.display = "block";
}

// ============================================================
// AUTOGESTIÓN DE CONTRASEÑA PROPIA (AMBOS PERFILES)
// ============================================================
function abrirModalCambiarPassword() {
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.style.display = "none";

    if (!usuarioActual) return;

    document.getElementById("mi-cuenta-username").textContent = usuarioActual.nombreUsuario || "-";
    document.getElementById("mi-cuenta-perfil").textContent = usuarioActual.perfil || "-";
    document.getElementById("mi-cuenta-nombre").textContent = `${usuarioActual.nombre} ${usuarioActual.apellido}`;

    const alerta = document.getElementById("modal-pass-alerta");
    alerta.style.display = "none";
    document.getElementById("form-cambiar-password").reset();
    document.getElementById("modal-cambiar-password").style.display = "flex";
}

function cerrarModalCambiarPassword() {
    document.getElementById("modal-cambiar-password").style.display = "none";
}

async function guardarCambioContrasenaPropia(e) {
    e.preventDefault();
    const alerta = document.getElementById("modal-pass-alerta");
    alerta.style.display = "none";

    const actual = document.getElementById("mi-pass-actual").value;
    const nueva = document.getElementById("mi-pass-nueva").value;
    const confirmar = document.getElementById("mi-pass-confirmar").value;

    if (nueva.length < 4) {
        alerta.textContent = "La nueva contraseña debe tener al menos 4 caracteres.";
        alerta.className = "alert alert-error";
        alerta.style.display = "block";
        return;
    }

    if (nueva !== confirmar) {
        alerta.textContent = "La confirmación no coincide con la nueva contraseña.";
        alerta.className = "alert alert-error";
        alerta.style.display = "block";
        return;
    }

    try {
        const res = await fetch("/api/usuarios/cambiar-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contrasenaActual: actual,
                contrasenaNueva: nueva
            })
        });
        const data = await res.json();

        if (res.ok && data.exito) {
            document.getElementById("form-cambiar-password").reset();
            alerta.textContent = "Contraseña actualizada correctamente.";
            alerta.className = "alert alert-success";
            alerta.style.display = "block";
            setTimeout(() => cerrarModalCambiarPassword(), 1200);
        } else {
            alerta.textContent = data.error || "No se pudo actualizar la contraseña.";
            alerta.className = "alert alert-error";
            alerta.style.display = "block";
        }
    } catch (err) {
        alerta.textContent = "Error de conexión al actualizar la contraseña.";
        alerta.className = "alert alert-error";
        alerta.style.display = "block";
    }
}
