/**
 * DIETÉTICA VIDA NATURAL — LAYOUT COMPARTIDO, NAVEGACIÓN Y CAMBIO DE CONTRASEÑA
 */

let navegacionEnCurso = false;

function inicializarLayout(seccionActiva) {
    usuarioActual = obtenerUsuarioSesion();
    if (!usuarioActual) {
        window.location.href = "../index.html";
        return false;
    }

    const esAdmin = usuarioActual.perfil === "ADMINISTRATIVO";
    const seccionesAdmin = ["ventas", "caja", "historial-ventas", "productos", "clientes", "promociones", "stock-bajo"];
    const seccionesGerente = ["caja", "historial-ventas", "productos", "clientes", "promociones", "stock-bajo", "recaudacion", "usuarios"];

    if (esAdmin && !seccionesAdmin.includes(seccionActiva)) {
        window.location.href = "ventas.html";
        return false;
    }
    if (!esAdmin && !seccionesGerente.includes(seccionActiva)) {
        window.location.href = "recaudacion.html";
        return false;
    }

    renderizarHeader();
    renderizarSidebar(seccionActiva, esAdmin);
    renderizarModalCambiarPassword();
    configurarNavegacionSinRecarga();

    if (!window._layoutClickListenerRegistrado) {
        window._layoutClickListenerRegistrado = true;
        document.addEventListener("click", (e) => {
            const menu = document.getElementById("user-dropdown-menu");
            const btn = document.querySelector(".user-dropdown-btn");
            if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
                menu.style.display = "none";
            }
        });
    }

    return true;
}

function renderizarHeader() {
    const header = document.getElementById("app-header");
    if (!header) return;

    const nombreCompleto = `${usuarioActual.nombre} ${usuarioActual.apellido}`;
    const badgeClass = usuarioActual.perfil === "ADMINISTRATIVO" ? "badge-admin" : "badge-gerente";

    header.className = "app-header";
    header.innerHTML = `
        <div class="header-left">
            <button id="btn-toggle-sidebar" class="btn-sidebar-toggle" onclick="toggleSidebar()">
                <span>Menú</span>
            </button>
            <div class="header-brand">
                <span class="header-brand-title">Vida Natural</span>
                <span class="header-brand-subtitle">Dietética Comercial</span>
            </div>
        </div>

        <div class="header-right">
            <div class="user-dropdown-wrapper">
                <button class="user-dropdown-btn" onclick="toggleUserMenu()">
                    <span id="header-user-name" class="user-name">${nombreCompleto}</span>
                    <span id="header-user-badge" class="badge ${badgeClass}">${usuarioActual.perfil}</span>
                    <span class="arrow-down">&#9662;</span>
                </button>
                <div id="user-dropdown-menu" class="user-dropdown-content" style="display:none;">
                    <button class="dropdown-item" onclick="abrirModalCambiarPassword()">Mi Contraseña</button>
                    <button class="dropdown-item text-danger" onclick="cerrarSesion()">Cerrar sesión</button>
                </div>
            </div>
        </div>
    `;
}

function renderizarSidebar(seccionActiva, esAdmin) {
    const sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;

    const navKeyActiva = (seccionActiva === "stock-bajo") ? "productos" : seccionActiva;

    const items = [
        { id: "ventas", label: "Registrar Venta", href: "ventas.html", visible: esAdmin },
        { id: "historial-ventas", label: "Historial de Ventas", href: "historial-ventas.html", visible: true },
        { id: "productos", label: "Inventario de Productos", href: "productos.html", visible: true },
        { id: "clientes", label: "Clientes", href: "clientes.html", visible: true },
        { id: "promociones", label: "Promociones y Descuentos", href: "promociones.html", visible: true },
        { id: "caja", label: "Caja", href: "caja.html", visible: true },
        { id: "recaudacion", label: "Reporte de Recaudación", href: "recaudacion.html", visible: !esAdmin },
        { id: "usuarios", label: "Gestión de Usuarios", href: "usuarios.html", visible: !esAdmin }
    ];

    sidebar.className = "sidebar";
    sidebar.innerHTML = `
        <nav class="sidebar-nav">
            ${items
                .filter(item => item.visible)
                .map(item => `
                    <a class="nav-item ${navKeyActiva === item.id ? "active" : ""}" id="nav-${item.id}" href="${item.href}" style="text-decoration:none; display:block;">
                        ${item.label}
                    </a>
                `)
                .join("")}
        </nav>
    `;
}

// ============================================================
// NAVEGACIÓN FLUIDA SIN PARPADEO DE HEADER NI SIDEBAR
// ============================================================
function configurarNavegacionSinRecarga() {
    if (window._spaNavRegistrada) return;
    window._spaNavRegistrada = true;

    document.addEventListener("click", (e) => {
        const link = e.target.closest("a.nav-item[href], .main-content a[href]");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("javascript:") || link.target === "_blank") {
            return;
        }
        if (href.includes("index.html")) return;

        e.preventDefault();
        cargarVistaEnContenedor(href, true);
    });

    window.addEventListener("popstate", () => {
        const archivo = window.location.pathname.split("/").pop();
        if (archivo && archivo.endsWith(".html") && archivo !== "index.html") {
            cargarVistaEnContenedor(archivo, false);
        }
    });
}

async function cargarVistaEnContenedor(url, actualizarHistorial = true) {
    if (navegacionEnCurso) return;

    const mainActual = document.querySelector(".main-content");
    if (!mainActual) {
        window.location.href = url;
        return;
    }

    navegacionEnCurso = true;

    try {
        // 1. Fundido de salida suave únicamente sobre el área central
        mainActual.style.transition = "opacity 0.12s ease";
        mainActual.style.opacity = "0";

        const [respuesta] = await Promise.all([
            fetch(url, { cache: "no-store" }),
            new Promise(resolve => setTimeout(resolve, 120))
        ]);

        if (!respuesta.ok) {
            window.location.href = url;
            return;
        }

        const htmlTexto = await respuesta.text();
        const parser = new DOMParser();
        const docNuevo = parser.parseFromString(htmlTexto, "text/html");
        const mainNuevo = docNuevo.querySelector(".main-content");

        if (!mainNuevo) {
            window.location.href = url;
            return;
        }

        // 2. Actualizar estado activo del menú lateral sin redibujar el sidebar
        const nombreArchivo = url.split("?")[0].split("/").pop().replace(".html", "");
        const navKey = (nombreArchivo === "stock-bajo") ? "productos" : nombreArchivo;
        document.querySelectorAll("#app-sidebar .nav-item").forEach(item => {
            item.classList.toggle("active", item.id === `nav-${navKey}`);
        });

        // 3. Reemplazar el contenido central y eliminar modales huérfanos de la vista anterior
        document.querySelectorAll("body > .modal-backdrop:not(#modal-cambiar-password)").forEach(m => m.remove());
        mainActual.innerHTML = mainNuevo.innerHTML;
        document.title = docNuevo.title || document.title;

        // Agregar los modales propios de la vista nueva (si están fuera de .main-content)
        docNuevo.querySelectorAll("body > .modal-backdrop:not(#modal-cambiar-password)").forEach(modal => {
            document.body.appendChild(modal.cloneNode(true));
        });

        if (actualizarHistorial) {
            window.history.pushState({}, "", url);
        }

        // 4. Cargar y ejecutar el script específico de la página destino (ej. js/productos.js)
        const scriptsPagina = Array.from(docNuevo.querySelectorAll("script")).filter(s => {
            const src = s.getAttribute("src") || "";
            return !src.endsWith("api.js") && !src.endsWith("layout.js");
        });

        for (const s of scriptsPagina) {
            const src = s.getAttribute("src");
            if (src) {
                await ejecutarScriptExterno(src);
            } else if (s.textContent.trim()) {
                const inline = document.createElement("script");
                inline.textContent = s.textContent;
                document.body.appendChild(inline);
                inline.remove();
            }
        }

        // Disparar DOMContentLoaded para módulos que inicializan dentro de ese evento
        document.dispatchEvent(new Event("DOMContentLoaded"));

        // 5. Fundido de entrada suave
        mainActual.scrollTop = 0;
        window.scrollTo(0, 0);
        requestAnimationFrame(() => {
            mainActual.style.transition = "opacity 0.18s ease";
            mainActual.style.opacity = "1";
        });
    } catch (err) {
        console.error("Error al navegar entre módulos:", err);
        window.location.href = url;
    } finally {
        navegacionEnCurso = false;
    }
}

function ejecutarScriptExterno(src) {
    return new Promise((resolve) => {
        const viejo = document.querySelector(`script[data-modulo-script="${src}"]`);
        if (viejo) viejo.remove();

        const script = document.createElement("script");
        script.src = `${src}?t=${Date.now()}`;
        script.setAttribute("data-modulo-script", src);
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.body.appendChild(script);
    });
}

function renderizarModalCambiarPassword() {
    if (document.getElementById("modal-cambiar-password")) return;

    const modalHtml = `
    <div id="modal-cambiar-password" class="modal-backdrop" style="display:none;">
        <div class="modal-card" style="max-width: 480px;">
            <header class="modal-header">
                <h3>Mi Cuenta — Cambiar Contraseña</h3>
                <button class="btn-close" onclick="cerrarModalCambiarPassword()">&times;</button>
            </header>
            <div id="modal-pass-alerta" class="alert" style="display:none;"></div>

            <div class="info-box" style="margin-bottom: 1rem; font-size: 0.88rem;">
                <div class="info-grid">
                    <div><strong>Usuario:</strong> <span id="mi-cuenta-username">-</span></div>
                    <div><strong>Perfil:</strong> <span id="mi-cuenta-perfil">-</span></div>
                    <div style="grid-column: span 2;"><strong>Nombre y Apellido:</strong> <span id="mi-cuenta-nombre">-</span></div>
                </div>
            </div>

            <form id="form-cambiar-password" onsubmit="guardarCambioContrasenaPropia(event)">
                <div class="form-group">
                    <label for="mi-pass-actual">Contraseña Actual</label>
                    <input type="password" id="mi-pass-actual" required placeholder="Ingrese su contraseña actual">
                </div>
                <div class="form-group">
                    <label for="mi-pass-nueva">Nueva Contraseña (mínimo 4 caracteres)</label>
                    <input type="password" id="mi-pass-nueva" minlength="4" required placeholder="Ingrese la nueva contraseña">
                </div>
                <div class="form-group">
                    <label for="mi-pass-confirmar">Confirmar Nueva Contraseña</label>
                    <input type="password" id="mi-pass-confirmar" minlength="4" required placeholder="Repita la nueva contraseña">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="cerrarModalCambiarPassword()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Actualizar Contraseña</button>
                </div>
            </form>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function toggleSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) sidebar.classList.toggle("collapsed");
}

function toggleUserMenu() {
    const menu = document.getElementById("user-dropdown-menu");
    if (menu) menu.style.display = menu.style.display === "none" ? "block" : "none";
}

function cerrarSesion() {
    localStorage.removeItem("vida_natural_user");
    usuarioActual = null;
    window.location.href = "../index.html";
}

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
