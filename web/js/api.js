/**
 * DIETÉTICA VIDA NATURAL — CONFIGURACIÓN DE API Y SESIÓN
 */

let usuarioActual = null;

function obtenerUsuarioSesion() {
    const sesion = localStorage.getItem("vida_natural_user");
    if (!sesion) return null;
    try {
        usuarioActual = JSON.parse(sesion);
        return usuarioActual;
    } catch (e) {
        localStorage.removeItem("vida_natural_user");
        return null;
    }
}

// Interceptor global de fetch para enviar perfil e ID de usuario en cada petición API
const fetchOriginal = window.fetch;
window.fetch = function(url, options = {}) {
    const user = usuarioActual || obtenerUsuarioSesion();
    if (typeof url === "string" && url.startsWith("/api/") && user) {
        options.headers = {
            ...(options.headers || {}),
            ...(user.perfil ? { "X-User-Perfil": user.perfil } : {}),
            ...(user.id ? { "X-User-Id": String(user.id) } : {})
        };
    }
    return fetchOriginal(url, options);
};
