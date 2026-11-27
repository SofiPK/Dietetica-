/**
 * DIETÉTICA VIDA NATURAL — AUTENTICACIÓN Y RECUPERACIÓN DE CONTRASEÑA
 */

document.addEventListener("DOMContentLoaded", () => {
    const user = obtenerUsuarioSesion();
    if (user) {
        redirigirSegunPerfil(user);
    }
});

function redirigirSegunPerfil(user) {
    if (user.perfil === "ADMINISTRATIVO") {
        window.location.href = "pages/ventas.html";
    } else {
        window.location.href = "pages/recaudacion.html";
    }
}

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
            redirigirSegunPerfil(usuarioActual);
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
