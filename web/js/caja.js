/**
 * DIETÉTICA VIDA NATURAL — MÓDULO DE CAJA (APERTURA, MOVIMIENTOS Y CIERRE)
 */

let cajaActualGlobal = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!inicializarLayout("caja")) return;
    cargarModuloCaja();
});

async function verificarEstadoCajaGlobal() {
    try {
        const res = await fetch("/api/caja/actual");
        const data = await res.json();
        cajaActualGlobal = data.abierta ? data.caja : null;
        return data;
    } catch (err) {
        console.error("Error al consultar estado de caja:", err);
        return { abierta: false };
    }
}

async function cargarModuloCaja() {
    const esAdmin = usuarioActual && usuarioActual.perfil === "ADMINISTRATIVO";
    const data = await verificarEstadoCajaGlobal();

    const panelCerrada = document.getElementById("panel-caja-cerrada");
    const panelAbierta = document.getElementById("panel-caja-abierta");
    const opsAdmin = document.getElementById("caja-operaciones-admin");
    const avisoGerenteCerrada = document.getElementById("caja-cerrada-gerente-aviso");

    if (data.abierta && data.caja) {
        const c = data.caja;
        panelCerrada.style.display = "none";
        if (avisoGerenteCerrada) avisoGerenteCerrada.style.display = "none";
        panelAbierta.style.display = "block";
        if (opsAdmin) opsAdmin.style.display = esAdmin ? "grid" : "none";

        document.getElementById("caja-stat-inicial").textContent = `$${c.montoInicial.toFixed(2)}`;
        document.getElementById("caja-stat-actual").textContent = `$${c.saldoActual.toFixed(2)}`;
        document.getElementById("caja-stat-fecha").textContent = c.fechaApertura ? c.fechaApertura.replace("T", " ").substring(0, 16) : "-";

        actualizarVistaDiferenciaCierre();
        renderizarMovimientosCaja(c.movimientos || []);
    } else {
        panelAbierta.style.display = "none";
        panelCerrada.style.display = esAdmin ? "block" : "none";
        if (avisoGerenteCerrada) avisoGerenteCerrada.style.display = esAdmin ? "none" : "block";
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
