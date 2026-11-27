package com.vidanatural.server;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.vidanatural.model.Caja;
import com.vidanatural.model.Categoria;
import com.vidanatural.model.Cliente;
import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.MedioPago;
import com.vidanatural.model.MovimientoCaja;
import com.vidanatural.model.Perfil;
import com.vidanatural.model.Producto;
import com.vidanatural.model.Promocion;
import com.vidanatural.model.TipoDescuento;
import com.vidanatural.model.TipoMovimientoCaja;
import com.vidanatural.model.Usuario;
import com.vidanatural.model.Venta;
import com.vidanatural.service.GestorCaja;
import com.vidanatural.service.GestorClientes;
import com.vidanatural.service.GestorProductos;
import com.vidanatural.service.GestorPromociones;
import com.vidanatural.service.GestorUsuarios;
import com.vidanatural.service.GestorVentas;
import com.vidanatural.service.SistemaLogin;

/**
 * Servidor Web embebido en Java puro usando com.sun.net.httpserver.
 * No requiere Tomcat ni servidores externos.
 */
public class ServidorWeb {

    private static final int PUERTO = 8080;
    private static final String CARPETA_WEB = "web";

    private final GestorProductos gestorProductos = new GestorProductos();
    private final GestorVentas gestorVentas = new GestorVentas();
    private final GestorClientes gestorClientes = new GestorClientes();
    private final GestorPromociones gestorPromociones = new GestorPromociones();
    private final GestorCaja gestorCaja = new GestorCaja();
    private final GestorUsuarios gestorUsuarios = new GestorUsuarios();
    private final SistemaLogin sistemaLogin = new SistemaLogin();

    public void iniciar() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PUERTO), 0);

        // 1. Endpoints existentes
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/productos", new ProductosHandler());
        server.createContext("/api/productos/buscar", new BuscarProductoHandler());
        server.createContext("/api/productos/stock-bajo", new StockBajoHandler());
        server.createContext("/api/ventas", new VentasHandler());
        server.createContext("/api/ventas/recaudado", new RecaudadoHandler());

        // 2. Endpoints nuevos: Clientes, Promociones, Caja y Usuarios
        server.createContext("/api/clientes", new ClientesHandler());
        server.createContext("/api/clientes/buscar", new BuscarClienteHandler());
        server.createContext("/api/promociones", new PromocionesHandler());
        server.createContext("/api/promociones/vigente", new PromocionVigenteHandler());
        server.createContext("/api/caja/actual", new CajaActualHandler());
        server.createContext("/api/caja/abrir", new CajaAbrirHandler());
        server.createContext("/api/caja/movimiento", new CajaMovimientoHandler());
        server.createContext("/api/caja/cerrar", new CajaCerrarHandler());
        server.createContext("/api/caja/historial", new CajaHistorialHandler());
        server.createContext("/api/usuarios", new UsuariosHandler());
        server.createContext("/api/usuarios/cambiar-password", new CambiarPasswordHandler());

        // 3. Servir archivos estáticos del frontend (HTML, CSS, JS)
        server.createContext("/", new ArchivosEstaticosHandler());

        server.setExecutor(null);
        server.start();

        System.out.println("=================================================");
        System.out.println("DIETÉTICA VIDA NATURAL — SERVIDOR INICIADO");
        System.out.println("Abrí tu navegador en: http://localhost:" + PUERTO);
        System.out.println("=================================================");
    }

    // ============================================================
    // HANDLERS DE AUTENTICACIÓN Y USUARIOS
    // ============================================================

    private class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                return;
            }
            String body = leerCuerpo(exchange);
            Map<String, String> json = parseSimpleJson(body);
            String usuario = json.get("nombreUsuario");
            String clave = json.get("contrasena");

            try {
                Usuario u = sistemaLogin.autenticar(usuario, clave);
                if (u != null) {
                    String resp = String.format(
                        "{\"id\":%d,\"nombreUsuario\":\"%s\",\"nombre\":\"%s\",\"apellido\":\"%s\",\"perfil\":\"%s\",\"activo\":%b}",
                        u.getId(), escaparJson(u.getNombreUsuario()), escaparJson(u.getNombre()),
                        escaparJson(u.getApellido()), u.getPerfil().name(), u.isActivo()
                    );
                    responderJson(exchange, 200, resp);
                } else {
                    responderJson(exchange, 401, "{\"error\":\"Usuario o contraseña incorrectos, o cuenta desactivada\"}");
                }
            } catch (Exception e) {
                responderJson(exchange, 500, "{\"error\":\"Error de base de datos MySQL: " + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    private class UsuariosHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolGerente(exchange)) return;

            int idOperador = obtenerUserIdHeader(exchange);
            String metodo = exchange.getRequestMethod().toUpperCase();

            try {
                switch (metodo) {
                    case "GET":
                        List<Usuario> lista = gestorUsuarios.listarTodos();
                        StringBuilder sb = new StringBuilder("[");
                        for (int i = 0; i < lista.size(); i++) {
                            sb.append(usuarioAJson(lista.get(i)));
                            if (i < lista.size() - 1) sb.append(",");
                        }
                        sb.append("]");
                        responderJson(exchange, 200, sb.toString());
                        break;

                    case "POST":
                        Usuario nuevo = jsonAUsuario(leerCuerpo(exchange));
                        Usuario creado = gestorUsuarios.crearUsuario(nuevo);
                        responderJson(exchange, 200, "{\"exito\":true,\"usuario\":" + usuarioAJson(creado) + "}");
                        break;

                    case "PUT":
                        Usuario editado = jsonAUsuario(leerCuerpo(exchange));
                        gestorUsuarios.actualizarUsuario(editado, idOperador);
                        responderJson(exchange, 200, "{\"exito\":true}");
                        break;

                    case "DELETE":
                        Map<String, String> qDel = parseQuery(exchange.getRequestURI().getQuery());
                        int idObjetivo = Integer.parseInt(qDel.get("id"));
                        boolean activar = "true".equalsIgnoreCase(qDel.get("activar"));
                        gestorUsuarios.cambiarEstadoUsuario(idObjetivo, activar, idOperador);
                        responderJson(exchange, 200, "{\"exito\":true}");
                        break;

                    default:
                        responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                }
            } catch (IllegalArgumentException e) {
                responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
            } catch (Exception e) {
                responderJson(exchange, 500, "{\"error\":\"Error al procesar usuario: " + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    private class CambiarPasswordHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                return;
            }

            int idUsuario = obtenerUserIdHeader(exchange);
            if (idUsuario <= 0) {
                responderJson(exchange, 401, "{\"error\":\"Sesión inválida: vuelva a iniciar sesión\"}");
                return;
            }

            try {
                Map<String, String> body = parseSimpleJson(leerCuerpo(exchange));
                String actual = body.get("contrasenaActual");
                String nueva = body.get("contrasenaNueva");
                gestorUsuarios.cambiarContrasenaPropia(idUsuario, actual, nueva);
                responderJson(exchange, 200, "{\"exito\":true,\"mensaje\":\"Contraseña actualizada correctamente\"}");
            } catch (IllegalArgumentException e) {
                responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
            } catch (Exception e) {
                responderJson(exchange, 500, "{\"error\":\"Error al actualizar contraseña: " + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    // ============================================================
    // HANDLERS DE PRODUCTOS
    // ============================================================

    private class BuscarProductoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdmin(exchange)) return;

            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String codigo = query.get("codigo");
            Producto p = gestorProductos.buscarPorCodigo(codigo);
            if (p != null) {
                responderJson(exchange, 200, productoAJson(p));
            } else {
                responderJson(exchange, 404, "{\"error\":\"Producto no encontrado\"}");
            }
        }
    }

    private class ProductosHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdmin(exchange)) return;

            String metodo = exchange.getRequestMethod().toUpperCase();
            switch (metodo) {
                case "GET":
                    List<Producto> lista = gestorProductos.listarTodos();
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < lista.size(); i++) {
                        sb.append(productoAJson(lista.get(i)));
                        if (i < lista.size() - 1) sb.append(",");
                    }
                    sb.append("]");
                    responderJson(exchange, 200, sb.toString());
                    break;

                case "POST":
                    try {
                        Producto nuevo = jsonAProducto(leerCuerpo(exchange));
                        boolean ok = gestorProductos.registrarProducto(nuevo);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                case "PUT":
                    try {
                        Producto editado = jsonAProducto(leerCuerpo(exchange));
                        boolean ok = gestorProductos.modificarProducto(editado);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                case "DELETE":
                    Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
                    String codigo = query.get("codigo");
                    boolean bajaOk = gestorProductos.darDeBaja(codigo);
                    responderJson(exchange, bajaOk ? 200 : 400, "{\"exito\":" + bajaOk + "}");
                    break;

                default:
                    responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        }
    }

    private class StockBajoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            List<Producto> lista = gestorProductos.listarStockBajo();
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < lista.size(); i++) {
                sb.append(productoAJson(lista.get(i)));
                if (i < lista.size() - 1) sb.append(",");
            }
            sb.append("]");
            responderJson(exchange, 200, sb.toString());
        }
    }

    // ============================================================
    // HANDLERS DE VENTAS Y REPORTES DE RECAUDACIÓN
    // ============================================================

    private class VentasHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                List<Venta> ventas = gestorVentas.listarVentas();
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < ventas.size(); i++) {
                    sb.append(ventaAJson(ventas.get(i)));
                    if (i < ventas.size() - 1) sb.append(",");
                }
                sb.append("]");
                responderJson(exchange, 200, sb.toString());
                return;
            }

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                if (!verificarRolAdmin(exchange)) return;
                try {
                    String body = leerCuerpo(exchange);
                    Venta venta = parseVentaJson(body);
                    boolean exito = gestorVentas.registrarVenta(venta);
                    responderJson(exchange, 200, String.format(Locale.US,
                        "{\"exito\":%b,\"ventaId\":%d,\"importeTotal\":%.2f,\"descuentoTotal\":%.2f}",
                        exito, venta.getId(), venta.getImporteTotal(), venta.getDescuentoTotal()
                    ));
                } catch (Exception e) {
                    responderJson(exchange, 400, "{\"exito\":false,\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                }
                return;
            }

            responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
        }
    }

    private class RecaudadoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolGerente(exchange)) return;

            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String desdeStr = query.get("desde");
            String hastaStr = query.get("hasta");

            LocalDate desde = (desdeStr != null && !desdeStr.isEmpty()) ? LocalDate.parse(desdeStr) : null;
            LocalDate hasta = (hastaStr != null && !hastaStr.isEmpty()) ? LocalDate.parse(hastaStr) : null;

            Map<String, Object> rep = gestorVentas.obtenerReporteRecaudacion(desde, hasta);
            double total = rep.containsKey("totalRecaudado") ? (double) rep.get("totalRecaudado") : 0.0;
            double descuentos = rep.containsKey("totalDescuentos") ? (double) rep.get("totalDescuentos") : 0.0;
            int cantidad = rep.containsKey("cantidadVentas") ? (int) rep.get("cantidadVentas") : 0;
            double ticketProm = rep.containsKey("ticketPromedio") ? (double) rep.get("ticketPromedio") : 0.0;

            StringBuilder json = new StringBuilder();
            json.append(String.format(Locale.US,
                "{\"recaudado\":%.2f,\"totalRecaudado\":%.2f,\"totalDescuentos\":%.2f,\"cantidadVentas\":%d,\"ticketPromedio\":%.2f,",
                total, total, descuentos, cantidad, ticketProm
            ));

            // Desglose por medio de pago
            json.append("\"porMedioPago\":[");
            @SuppressWarnings("unchecked")
            List> medios = (List>) rep.getOrDefault("porMedioPago", new ArrayList<>());
            for (int i = 0; i < medios.size(); i++) {
                Map<String, Object> m = medios.get(i);
                json.append(String.format(Locale.US,
                    "{\"medioPago\":\"%s\",\"cantidad\":%d,\"total\":%.2f}",
                    m.get("medioPago"), (int) m.get("cantidad"), (double) m.get("total")
                ));
                if (i < medios.size() - 1) json.append(",");
            }
            json.append("],");

            // Top productos
            json.append("\"topProductos\":[");
            @SuppressWarnings("unchecked")
            List> tops = (List>) rep.getOrDefault("topProductos", new ArrayList<>());
            for (int i = 0; i < tops.size(); i++) {
                Map<String, Object> t = tops.get(i);
                json.append(String.format(Locale.US,
                    "{\"codigo\":\"%s\",\"descripcion\":\"%s\",\"unidades\":%d,\"recaudado\":%.2f}",
                    escaparJson((String) t.get("codigo")),
                    escaparJson((String) t.get("descripcion")),
                    (int) t.get("unidades"),
                    (double) t.get("recaudado")
                ));
                if (i < tops.size() - 1) json.append(",");
            }
            json.append("],");

            // Ventas por categoría
            json.append("\"porCategoria\":[");
            @SuppressWarnings("unchecked")
            List> categorias = (List>) rep.getOrDefault("porCategoria", new ArrayList<>());
            for (int i = 0; i < categorias.size(); i++) {
                Map<String, Object> c = categorias.get(i);
                json.append(String.format(Locale.US,
                    "{\"categoria\":\"%s\",\"unidades\":%d,\"recaudado\":%.2f}",
                    escaparJson((String) c.get("categoria")),
                    (int) c.get("unidades"),
                    (double) c.get("recaudado")
                ));
                if (i < categorias.size() - 1) json.append(",");
            }
            json.append("],");

            // Evolución diaria de ventas
            json.append("\"evolucionDiaria\":[");
            @SuppressWarnings("unchecked")
            List> evolucion = (List>) rep.getOrDefault("evolucionDiaria", new ArrayList<>());
            for (int i = 0; i < evolucion.size(); i++) {
                Map<String, Object> d = evolucion.get(i);
                json.append(String.format(Locale.US,
                    "{\"fecha\":\"%s\",\"cantidad\":%d,\"total\":%.2f}",
                    escaparJson((String) d.get("fecha")),
                    (int) d.get("cantidad"),
                    (double) d.get("total")
                ));
                if (i < evolucion.size() - 1) json.append(",");
            }
            json.append("],");

            // Productos activos sin rotación
            json.append("\"sinRotacion\":[");
            @SuppressWarnings("unchecked")
            List> sinRot = (List>) rep.getOrDefault("sinRotacion", new ArrayList<>());
            for (int i = 0; i < sinRot.size(); i++) {
                Map<String, Object> p = sinRot.get(i);
                json.append(String.format(Locale.US,
                    "{\"codigo\":\"%s\",\"descripcion\":\"%s\",\"categoria\":\"%s\",\"stockActual\":%d,\"precioUnitario\":%.2f}",
                    escaparJson((String) p.get("codigo")),
                    escaparJson((String) p.get("descripcion")),
                    escaparJson((String) p.get("categoria")),
                    (int) p.get("stockActual"),
                    (double) p.get("precioUnitario")
                ));
                if (i < sinRot.size() - 1) json.append(",");
            }
            json.append("]}");

            responderJson(exchange, 200, json.toString());
        }
    }

    // ============================================================
    // HANDLERS DE CLIENTES
    // ============================================================

    private class BuscarClienteHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String q = query.getOrDefault("q", "");
            List<Cliente> lista = gestorClientes.buscar(q);
            responderJson(exchange, 200, clientesAJson(lista));
        }
    }

    private class ClientesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            String metodo = exchange.getRequestMethod().toUpperCase();
            switch (metodo) {
                case "GET":
                    Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
                    boolean soloActivos = "true".equalsIgnoreCase(query.get("soloActivos"));
                    responderJson(exchange, 200, clientesAJson(gestorClientes.listar(soloActivos)));
                    break;

                case "POST":
                    if (!verificarRolAdmin(exchange)) return;
                    try {
                        Cliente nuevo = jsonACliente(leerCuerpo(exchange));
                        gestorClientes.registrar(nuevo);
                        responderJson(exchange, 200, "{\"exito\":true,\"cliente\":" + clienteAJson(nuevo) + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                case "PUT":
                    if (!verificarRolAdmin(exchange)) return;
                    try {
                        Cliente editado = jsonACliente(leerCuerpo(exchange));
                        boolean ok = gestorClientes.actualizar(editado);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                case "DELETE":
                    if (!verificarRolAdmin(exchange)) return;
                    try {
                        Map<String, String> qDel = parseQuery(exchange.getRequestURI().getQuery());
                        int id = Integer.parseInt(qDel.get("id"));
                        boolean ok = gestorClientes.cambiarEstado(id, false);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                default:
                    responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        }
    }

    // ============================================================
    // HANDLERS DE PROMOCIONES
    // ============================================================

    private class PromocionVigenteHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String codigo = query.get("codigo");
            Promocion p = gestorPromociones.obtenerVigenteParaProducto(codigo);
            if (p != null) {
                responderJson(exchange, 200, "{\"tienePromo\":true,\"promocion\":" + promocionAJson(p) + "}");
            } else {
                responderJson(exchange, 200, "{\"tienePromo\":false}");
            }
        }
    }

    private class PromocionesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            String metodo = exchange.getRequestMethod().toUpperCase();
            switch (metodo) {
                case "GET":
                    List<Promocion> lista = gestorPromociones.listarTodas();
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < lista.size(); i++) {
                        sb.append(promocionAJson(lista.get(i)));
                        if (i < lista.size() - 1) sb.append(",");
                    }
                    sb.append("]");
                    responderJson(exchange, 200, sb.toString());
                    break;

                case "POST":
                    if (!verificarRolAdmin(exchange)) return;
                    try {
                        Promocion nueva = jsonAPromocion(leerCuerpo(exchange));
                        gestorPromociones.crear(nueva);
                        responderJson(exchange, 200, "{\"exito\":true,\"promocion\":" + promocionAJson(nueva) + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                case "PUT":
                    if (!verificarRolAdmin(exchange)) return;
                    try {
                        Promocion editada = jsonAPromocion(leerCuerpo(exchange));
                        boolean ok = gestorPromociones.actualizar(editada);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                case "DELETE":
                    if (!verificarRolAdmin(exchange)) return;
                    try {
                        Map<String, String> qDel = parseQuery(exchange.getRequestURI().getQuery());
                        int id = Integer.parseInt(qDel.get("id"));
                        boolean ok = gestorPromociones.cambiarEstado(id, false);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
                    }
                    break;

                default:
                    responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
            }
        }
    }

    // ============================================================
    // HANDLERS DE CAJA
    // ============================================================

    private class CajaActualHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            Caja abierta = gestorCaja.obtenerCajaAbierta();
            if (abierta == null) {
                responderJson(exchange, 200, "{\"abierta\":false}");
            } else {
                responderJson(exchange, 200, "{\"abierta\":true,\"caja\":" + cajaAJson(abierta) + "}");
            }
        }
    }

    private class CajaAbrirHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdmin(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                return;
            }
            try {
                Map<String, String> m = parseSimpleJson(leerCuerpo(exchange));
                int usuarioId = Integer.parseInt(m.get("usuarioId"));
                double montoInicial = Double.parseDouble(m.get("montoInicial"));
                String obs = m.getOrDefault("observaciones", "Apertura de turno");
                Caja caja = gestorCaja.abrirCaja(usuarioId, montoInicial, obs);
                responderJson(exchange, 200, "{\"exito\":true,\"caja\":" + cajaAJson(caja) + "}");
            } catch (Exception e) {
                responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    private class CajaMovimientoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdmin(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                return;
            }
            try {
                Map<String, String> m = parseSimpleJson(leerCuerpo(exchange));
                int usuarioId = Integer.parseInt(m.get("usuarioId"));
                TipoMovimientoCaja tipo = TipoMovimientoCaja.valueOf(m.get("tipo").toUpperCase());
                String concepto = m.get("concepto");
                double monto = Double.parseDouble(m.get("monto"));
                Caja actualizada = gestorCaja.registrarMovimientoManual(usuarioId, tipo, concepto, monto);
                responderJson(exchange, 200, "{\"exito\":true,\"caja\":" + cajaAJson(actualizada) + "}");
            } catch (Exception e) {
                responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    private class CajaCerrarHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdmin(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                return;
            }
            try {
                Map<String, String> m = parseSimpleJson(leerCuerpo(exchange));
                int usuarioId = Integer.parseInt(m.get("usuarioId"));
                double montoReal = Double.parseDouble(m.get("montoFinalReal"));
                String obs = m.get("observaciones");
                Caja cerrada = gestorCaja.cerrarCaja(usuarioId, montoReal, obs);
                responderJson(exchange, 200, "{\"exito\":true,\"caja\":" + cajaAJson(cerrada) + "}");
            } catch (Exception e) {
                responderJson(exchange, 400, "{\"error\":\"" + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    private class CajaHistorialHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!verificarRolAdminOGerente(exchange)) return;

            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String desdeStr = query.get("desde");
            String hastaStr = query.get("hasta");
            LocalDate desde = (desdeStr != null && !desdeStr.isEmpty()) ? LocalDate.parse(desdeStr) : null;
            LocalDate hasta = (hastaStr != null && !hastaStr.isEmpty()) ? LocalDate.parse(hastaStr) : null;

            List<Caja> cierres = gestorCaja.listarHistorialCierres(desde, hasta);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < cierres.size(); i++) {
                sb.append(cajaAJson(cierres.get(i)));
                if (i < cierres.size() - 1) sb.append(",");
            }
            sb.append("]");
            responderJson(exchange, 200, sb.toString());
        }
    }

    // ============================================================
    // ARCHIVOS ESTÁTICOS
    // ============================================================

    private class ArchivosEstaticosHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if ("/".equals(path)) path = "/index.html";

            Path archivo = Paths.get(CARPETA_WEB, path.substring(1));
            if (!Files.exists(archivo) || Files.isDirectory(archivo)) {
                String resp = "404 - Archivo no encontrado";
                exchange.sendResponseHeaders(404, resp.length());
                try (OutputStream os = exchange.getResponseBody()) { os.write(resp.getBytes()); }
                return;
            }

            String contentType = "text/plain";
            if (path.endsWith(".html")) contentType = "text/html; charset=UTF-8";
            else if (path.endsWith(".css")) contentType = "text/css; charset=UTF-8";
            else if (path.endsWith(".js")) contentType = "application/javascript; charset=UTF-8";
            else if (path.endsWith(".jfif") || path.endsWith(".jpg") || path.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (path.endsWith(".png")) contentType = "image/png";

            byte[] bytes = Files.readAllBytes(archivo);
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    // ============================================================
    // UTILIDADES DE SEGURIDAD, SERIALIZACIÓN Y PARSEO JSON
    // ============================================================

    private int obtenerUserIdHeader(HttpExchange exchange) {
        String idHeader = exchange.getRequestHeaders().getFirst("X-User-Id");
        if (idHeader == null || idHeader.trim().isEmpty()) return 0;
        try {
            return Integer.parseInt(idHeader.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private boolean verificarRolAdmin(HttpExchange exchange) throws IOException {
        String perfil = exchange.getRequestHeaders().getFirst("X-User-Perfil");
        if (!"ADMINISTRATIVO".equalsIgnoreCase(perfil)) {
            responderJson(exchange, 403, "{\"error\":\"Acceso denegado: acción exclusiva del perfil Administrativo\"}");
            return false;
        }
        return true;
    }

    private boolean verificarRolGerente(HttpExchange exchange) throws IOException {
        String perfil = exchange.getRequestHeaders().getFirst("X-User-Perfil");
        if (!"GERENTE".equalsIgnoreCase(perfil)) {
            responderJson(exchange, 403, "{\"error\":\"Acceso denegado: acción exclusiva del perfil Gerente\"}");
            return false;
        }
        return true;
    }

    private boolean verificarRolAdminOGerente(HttpExchange exchange) throws IOException {
        String perfil = exchange.getRequestHeaders().getFirst("X-User-Perfil");
        if (!"ADMINISTRATIVO".equalsIgnoreCase(perfil) && !"GERENTE".equalsIgnoreCase(perfil)) {
            responderJson(exchange, 403, "{\"error\":\"Acceso denegado: requiere perfil Administrativo o Gerente\"}");
            return false;
        }
        return true;
    }

    private void responderJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String leerCuerpo(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[1024];
            int leidos;
            while ((leidos = is.read(buffer)) != -1) {
                bos.write(buffer, 0, leidos);
            }
            return bos.toString(StandardCharsets.UTF_8);
        }
    }

    private String usuarioAJson(Usuario u) {
        return String.format(Locale.US,
            "{\"id\":%d,\"nombreUsuario\":\"%s\",\"nombre\":\"%s\",\"apellido\":\"%s\",\"perfil\":\"%s\",\"activo\":%b}",
            u.getId(), escaparJson(u.getNombreUsuario()), escaparJson(u.getNombre()),
            escaparJson(u.getApellido()), u.getPerfil().name(), u.isActivo()
        );
    }

    private Usuario jsonAUsuario(String json) {
        Map<String, String> m = parseSimpleJson(json);
        Usuario u = new Usuario();
        if (m.containsKey("id") && !m.get("id").isEmpty() && !"null".equalsIgnoreCase(m.get("id"))) {
            u.setId(Integer.parseInt(m.get("id")));
        }
        u.setNombreUsuario(m.get("nombreUsuario"));
        u.setNombre(m.get("nombre"));
        u.setApellido(m.get("apellido"));
        u.setContrasena(m.get("contrasena"));
        if (m.containsKey("perfil") && !m.get("perfil").isEmpty()) {
            u.setPerfil(Perfil.valueOf(m.get("perfil").toUpperCase()));
        }
        u.setActivo(!"false".equalsIgnoreCase(m.get("activo")));
        return u;
    }

    private String productoAJson(Producto p) {
        return String.format(Locale.US,
            "{\"codigo\":\"%s\",\"descripcion\":\"%s\",\"categoria\":\"%s\",\"precioUnitario\":%.2f,\"stockActual\":%d,\"stockMinimo\":%d,\"activo\":%b}",
            escaparJson(p.getCodigo()), escaparJson(p.getDescripcion()), p.getCategoria().name(),
            p.getPrecioUnitario(), p.getStockActual(), p.getStockMinimo(), p.isActivo()
        );
    }

    private String clienteAJson(Cliente c) {
        return String.format(Locale.US,
            "{\"id\":%d,\"dniCuit\":\"%s\",\"nombre\":\"%s\",\"apellido\":\"%s\",\"telefono\":\"%s\",\"email\":\"%s\",\"aceptaPromociones\":%b,\"activo\":%b}",
            c.getId(), escaparJson(c.getDniCuit()), escaparJson(c.getNombre()), escaparJson(c.getApellido()),
            escaparJson(c.getTelefono()), escaparJson(c.getEmail()), c.isAceptaPromociones(), c.isActivo()
        );
    }

    private String clientesAJson(List<Cliente> lista) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < lista.size(); i++) {
            sb.append(clienteAJson(lista.get(i)));
            if (i < lista.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    private String promocionAJson(Promocion p) {
        StringBuilder cods = new StringBuilder("[");
        List<String> lista = p.getProductosCodigos();
        for (int i = 0; i < lista.size(); i++) {
            cods.append("\"").append(escaparJson(lista.get(i))).append("\"");
            if (i < lista.size() - 1) cods.append(",");
        }
        cods.append("]");

        return String.format(Locale.US,
            "{\"id\":%d,\"nombre\":\"%s\",\"tipoDescuento\":\"%s\",\"valor\":%.2f,\"vigenciaDesde\":\"%s\",\"vigenciaHasta\":\"%s\",\"activa\":%b,\"productosCodigos\":%s}",
            p.getId(), escaparJson(p.getNombre()), p.getTipoDescuento().name(), p.getValor(),
            p.getVigenciaDesde().toString(), p.getVigenciaHasta().toString(), p.isActiva(), cods.toString()
        );
    }

    private String cajaAJson(Caja c) {
        StringBuilder movs = new StringBuilder("[");
        List<MovimientoCaja> lista = c.getMovimientos();
        for (int i = 0; i < lista.size(); i++) {
            MovimientoCaja m = lista.get(i);
            movs.append(String.format(Locale.US,
                "{\"id\":%d,\"tipo\":\"%s\",\"concepto\":\"%s\",\"monto\":%.2f,\"fechaHora\":\"%s\",\"ventaId\":%s}",
                m.getId(), m.getTipo().name(), escaparJson(m.getConcepto()), m.getMonto(),
                m.getFechaHora() != null ? m.getFechaHora().toString() : "",
                m.getVentaId() != null ? m.getVentaId().toString() : "null"
            ));
            if (i < lista.size() - 1) movs.append(",");
        }
        movs.append("]");

        return String.format(Locale.US,
            "{\"id\":%d,\"usuarioAperturaId\":%d,\"usuarioCierreId\":%s,\"fechaApertura\":\"%s\",\"fechaCierre\":%s," +
            "\"montoInicial\":%.2f,\"saldoActual\":%.2f,\"montoEsperado\":%s,\"montoFinalReal\":%s,\"diferencia\":%s," +
            "\"estado\":\"%s\",\"observaciones\":\"%s\",\"movimientos\":%s}",
            c.getId(),
            c.getUsuarioAperturaId(),
            c.getUsuarioCierreId() != null ? c.getUsuarioCierreId().toString() : "null",
            c.getFechaApertura() != null ? c.getFechaApertura().toString() : "",
            c.getFechaCierre() != null ? "\"" + c.getFechaCierre().toString() + "\"" : "null",
            c.getMontoInicial(),
            c.calcularSaldoActual(),
            c.getMontoEsperado() != null ? String.format(Locale.US, "%.2f", c.getMontoEsperado()) : "null",
            c.getMontoFinalReal() != null ? String.format(Locale.US, "%.2f", c.getMontoFinalReal()) : "null",
            c.getDiferencia() != null ? String.format(Locale.US, "%.2f", c.getDiferencia()) : "null",
            c.getEstado().name(),
            escaparJson(c.getObservaciones()),
            movs.toString()
        );
    }

    private String ventaAJson(Venta v) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format(Locale.US,
            "{\"id\":%d,\"fecha\":\"%s\",\"importeTotal\":%.2f,\"descuentoTotal\":%.2f,\"medioPago\":\"%s\",\"estado\":\"%s\",\"usuarioId\":%d,\"clienteId\":%s,\"detalles\":[",
            v.getId(),
            v.getFecha().toString(),
            v.getImporteTotal(),
            v.getDescuentoTotal(),
            v.getMedioPago() != null ? v.getMedioPago().name() : "EFECTIVO",
            v.getEstado().name(),
            v.getUsuarioId(),
            v.getClienteId() != null ? v.getClienteId().toString() : "null"
        ));
        for (int i = 0; i < v.getDetalles().size(); i++) {
            DetalleVenta d = v.getDetalles().get(i);
            String desc = (d.getProducto() != null) ? d.getProducto().getDescripcion() : "";
            double precioU = d.getPrecioUnitario() > 0 ? d.getPrecioUnitario()
                    : ((d.getProducto() != null) ? d.getProducto().getPrecioUnitario() : 0.0);
            sb.append(String.format(Locale.US,
                "{\"id\":%d,\"productoCodigo\":\"%s\",\"descripcion\":\"%s\",\"cantidad\":%d,\"precioUnitario\":%.2f,\"descuentoAplicado\":%.2f,\"subtotal\":%.2f}",
                d.getId(), escaparJson(d.getProductoCodigo()), escaparJson(desc),
                d.getCantidad(), precioU, d.getDescuentoAplicado(), d.getSubtotal()
            ));
            if (i < v.getDetalles().size() - 1) sb.append(",");
        }
        sb.append("]}");
        return sb.toString();
    }

    private Producto jsonAProducto(String json) {
        Map<String, String> m = parseSimpleJson(json);
        Producto p = new Producto();
        p.setCodigo(m.get("codigo"));
        p.setDescripcion(m.get("descripcion"));
        p.setCategoria(Categoria.valueOf(m.get("categoria")));
        p.setPrecioUnitario(Double.parseDouble(m.get("precioUnitario")));
        p.setStockActual(Integer.parseInt(m.get("stockActual")));
        p.setStockMinimo(Integer.parseInt(m.get("stockMinimo")));
        p.setActivo(!"false".equalsIgnoreCase(m.get("activo")));
        return p;
    }

    private Cliente jsonACliente(String json) {
        Map<String, String> m = parseSimpleJson(json);
        Cliente c = new Cliente();
        if (m.containsKey("id") && !m.get("id").isEmpty() && !"null".equalsIgnoreCase(m.get("id"))) {
            c.setId(Integer.parseInt(m.get("id")));
        }
        c.setDniCuit(m.get("dniCuit"));
        c.setNombre(m.get("nombre"));
        c.setApellido(m.get("apellido"));
        c.setTelefono(m.get("telefono"));
        c.setEmail(m.get("email"));
        c.setAceptaPromociones(!"false".equalsIgnoreCase(m.get("aceptaPromociones")));
        c.setActivo(!"false".equalsIgnoreCase(m.get("activo")));
        return c;
    }

    private Promocion jsonAPromocion(String json) {
        Map<String, String> m = parseSimpleJson(json);
        Promocion p = new Promocion();
        if (m.containsKey("id") && !m.get("id").isEmpty() && !"null".equalsIgnoreCase(m.get("id"))) {
            p.setId(Integer.parseInt(m.get("id")));
        }
        p.setNombre(m.get("nombre"));
        p.setTipoDescuento(TipoDescuento.valueOf(m.get("tipoDescuento").toUpperCase()));
        p.setValor(Double.parseDouble(m.get("valor")));
        p.setVigenciaDesde(LocalDate.parse(m.get("vigenciaDesde")));
        p.setVigenciaHasta(LocalDate.parse(m.get("vigenciaHasta")));
        p.setActiva(!"false".equalsIgnoreCase(m.get("activa")));
        p.setProductosCodigos(extraerListaCodigos(json, m));
        return p;
    }

    private List<String> extraerListaCodigos(String rawJson, Map<String, String> parsed) {
        List<String> codigos = new ArrayList<>();
        int idx = rawJson.indexOf("\"productosCodigos\"");
        if (idx != -1) {
            int startArr = rawJson.indexOf("[", idx);
            int endArr = rawJson.indexOf("]", startArr);
            if (startArr != -1 && endArr != -1) {
                String contenido = rawJson.substring(startArr + 1, endArr).replace("\"", "");
                for (String c : contenido.split(",")) {
                    if (!c.trim().isEmpty()) codigos.add(c.trim().toUpperCase());
                }
                return codigos;
            }
        }
        String plano = parsed.get("productosCodigos");
        if (plano != null && !plano.isEmpty()) {
            for (String c : plano.split("\\|")) {
                if (!c.trim().isEmpty()) codigos.add(c.trim().toUpperCase());
            }
        }
        return codigos;
    }

    private Venta parseVentaJson(String json) {
        Venta v = new Venta();
        Map<String, String> cabecera = parseSimpleJson(json);

        if (cabecera.containsKey("usuarioId")) {
            v.setUsuarioId(Integer.parseInt(cabecera.get("usuarioId").replaceAll("[^0-9]", "")));
        }
        if (cabecera.containsKey("clienteId")) {
            String cid = cabecera.get("clienteId").replaceAll("[^0-9]", "");
            if (!cid.isEmpty()) v.setClienteId(Integer.parseInt(cid));
        }
        if (cabecera.containsKey("medioPago")) {
            String mp = cabecera.get("medioPago").trim().toUpperCase();
            if (!mp.isEmpty() && !"NULL".equals(mp)) {
                v.setMedioPago(MedioPago.valueOf(mp));
            }
        }

        int detIdx = json.indexOf("\"detalles\"");
        if (detIdx != -1) {
            int startArr = json.indexOf("[", detIdx);
            int endArr = json.indexOf("]", startArr);
            if (startArr != -1 && endArr != -1) {
                String arrayContent = json.substring(startArr + 1, endArr);
                String[] items = arrayContent.split("\\},\\{");
                for (String item : items) {
                    item = item.replace("{", "").replace("}", "");
                    Map<String, String> m = parseSimpleJson("{" + item + "}");
                    String codigo = m.get("productoCodigo");
                    int cant = Integer.parseInt(m.get("cantidad"));
                    double subtotal = m.containsKey("subtotal") ? Double.parseDouble(m.get("subtotal")) : 0.0;
                    v.agregarDetalle(new DetalleVenta(0, 0, codigo, cant, subtotal));
                }
            }
        }
        return v;
    }

    private Map<String, String> parseSimpleJson(String json) {
        Map<String, String> mapa = new HashMap<>();
        String limpio = json.trim().replaceAll("[{}\"]", "");
        String[] pares = limpio.split(",");
        for (String par : pares) {
            String[] kv = par.split(":", 2);
            if (kv.length == 2) {
                mapa.put(kv[0].trim(), kv[1].trim());
            }
        }
        return mapa;
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> result = new HashMap<>();
        if (query == null) return result;
        for (String param : query.split("&")) {
            String[] entry = param.split("=");
            if (entry.length > 1) {
                result.put(URLDecoder.decode(entry[0], StandardCharsets.UTF_8),
                           URLDecoder.decode(entry[1], StandardCharsets.UTF_8));
            }
        }
        return result;
    }

    private String escaparJson(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
