package com.vidanatural.server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.vidanatural.model.*;
import com.vidanatural.service.GestorProductos;
import com.vidanatural.service.GestorVentas;
import com.vidanatural.service.SistemaLogin;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;

/**
 * Servidor Web embebido en Java puro usando com.sun.net.httpserver.
 * No requiere Tomcat ni servidores externos.
 */
public class ServidorWeb {

    private static final int PUERTO = 8080;
    private static final String CARPETA_WEB = "web";

    private final GestorProductos gestorProductos = new GestorProductos();
    private final GestorVentas gestorVentas = new GestorVentas();
    private final SistemaLogin sistemaLogin = new SistemaLogin();
    private final com.vidanatural.dao.ClienteDAO clienteDAO = new com.vidanatural.dao.ClienteDAO();
    private final com.vidanatural.dao.ProveedorDAO proveedorDAO = new com.vidanatural.dao.ProveedorDAO();
    private final com.vidanatural.dao.CajaDAO cajaDAO = new com.vidanatural.dao.CajaDAO();

    public void iniciar() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PUERTO), 0);

        // 1. Endpoints de la API REST
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/productos", new ProductosHandler());
        server.createContext("/api/productos/buscar", new BuscarProductoHandler());
        server.createContext("/api/productos/stock-bajo", new StockBajoHandler());
        server.createContext("/api/ventas", new VentasHandler());
        server.createContext("/api/ventas/recaudado", new RecaudadoHandler());

        // Nuevos Endpoints: Clientes, Proveedores y Caja
        server.createContext("/api/clientes", new ClientesHandler());
        server.createContext("/api/proveedores", new ProveedoresHandler());
        server.createContext("/api/caja/movimientos", new CajaMovimientosHandler());
        server.createContext("/api/caja/totales", new CajaTotalesHandler());
        server.createContext("/api/caja/egreso", new CajaEgresoHandler());

        // 2. Servir archivos estáticos del frontend (HTML, CSS, JS)
        server.createContext("/", new ArchivosEstaticosHandler());

        server.setExecutor(null); // Executor por defecto
        server.start();

        System.out.println("=================================================");
        System.out.println("🌱 DIETÉTICA VIDA NATURAL — SERVIDOR INICIADO");
        System.out.println("👉 Abrí tu navegador en: http://localhost:" + PUERTO);
        System.out.println("=================================================");
    }

    // ============================================================
    // HANDLERS DE LA API
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
                        "{\"id\":%d,\"nombreUsuario\":\"%s\",\"nombre\":\"%s\",\"apellido\":\"%s\",\"perfil\":\"%s\"}",
                        u.getId(), u.getNombreUsuario(), u.getNombre(), u.getApellido(), u.getPerfil().name()
                    );
                    responderJson(exchange, 200, resp);
                } else {
                    responderJson(exchange, 401, "{\"error\":\"Usuario o contraseña incorrectos\"}");
                }
            } catch (Exception e) {
                System.err.println("Error en login / MySQL: " + e.getMessage());
                e.printStackTrace();
                responderJson(exchange, 500, "{\"error\":\"Error de base de datos MySQL: " + escaparJson(e.getMessage()) + "\"}");
            }
        }
    }

    private class BuscarProductoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
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
                        responderJson(exchange, 400, "{\"error\":\"" + e.getMessage() + "\"}");
                    }
                    break;

                case "PUT":
                    try {
                        Producto editado = jsonAProducto(leerCuerpo(exchange));
                        boolean ok = gestorProductos.modificarProducto(editado);
                        responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                    } catch (Exception e) {
                        responderJson(exchange, 400, "{\"error\":\"" + e.getMessage() + "\"}");
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

    private class VentasHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
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
                try {
                    String body = leerCuerpo(exchange);
                    Venta venta = parseVentaJson(body);
                    boolean exito = gestorVentas.registrarVenta(venta);
                    responderJson(exchange, 200, String.format("{\"exito\":%b,\"ventaId\":%d}", exito, venta.getId()));
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
            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String desdeStr = query.get("desde");
            String hastaStr = query.get("hasta");

            LocalDate desde = (desdeStr != null && !desdeStr.isEmpty()) ? LocalDate.parse(desdeStr) : null;
            LocalDate hasta = (hastaStr != null && !hastaStr.isEmpty()) ? LocalDate.parse(hastaStr) : null;

            double total = gestorVentas.calcularRecaudado(desde, hasta);
            responderJson(exchange, 200, String.format(Locale.US, "{\"recaudado\":%.2f}", total));
        }
    }

    private class ClientesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod().toUpperCase();
            if ("GET".equals(method)) {
                List<com.vidanatural.model.Cliente> clientes = clienteDAO.listarTodos();
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < clientes.size(); i++) {
                    com.vidanatural.model.Cliente c = clientes.get(i);
                    sb.append(String.format(
                        "{\"id\":%d,\"nombre\":\"%s\",\"apellido\":\"%s\",\"telefono\":\"%s\",\"email\":\"%s\",\"recibePromociones\":%b,\"fechaRegistro\":\"%s\"}",
                        c.getId(), escaparJson(c.getNombre()), escaparJson(c.getApellido()),
                        escaparJson(c.getTelefono()), escaparJson(c.getEmail()), c.isRecibePromociones(), c.getFechaRegistro().toString()
                    ));
                    if (i < clientes.size() - 1) sb.append(",");
                }
                sb.append("]");
                responderJson(exchange, 200, sb.toString());
                return;
            }

            if ("POST".equals(method)) {
                String body = leerCuerpo(exchange);
                Map<String, String> m = parseSimpleJson(body);
                com.vidanatural.model.Cliente c = new com.vidanatural.model.Cliente();
                c.setNombre(m.get("nombre"));
                c.setApellido(m.get("apellido"));
                c.setTelefono(m.get("telefono"));
                c.setEmail(m.get("email"));
                c.setRecibePromociones(!"false".equalsIgnoreCase(m.get("recibePromociones")));
                boolean ok = clienteDAO.registrar(c);
                responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                return;
            }
            responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
        }
    }

    private class ProveedoresHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod().toUpperCase();
            if ("GET".equals(method)) {
                List<com.vidanatural.model.Proveedor> lista = proveedorDAO.listarTodos();
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < lista.size(); i++) {
                    com.vidanatural.model.Proveedor p = lista.get(i);
                    sb.append(String.format(
                        "{\"id\":%d,\"razonSocial\":\"%s\",\"cuit\":\"%s\",\"rubro\":\"%s\",\"telefono\":\"%s\",\"email\":\"%s\",\"activo\":%b}",
                        p.getId(), escaparJson(p.getRazonSocial()), escaparJson(p.getCuit()), escaparJson(p.getRubro()),
                        escaparJson(p.getTelefono()), escaparJson(p.getEmail()), p.isActivo()
                    ));
                    if (i < lista.size() - 1) sb.append(",");
                }
                sb.append("]");
                responderJson(exchange, 200, sb.toString());
                return;
            }

            if ("POST".equals(method)) {
                String body = leerCuerpo(exchange);
                Map<String, String> m = parseSimpleJson(body);
                com.vidanatural.model.Proveedor p = new com.vidanatural.model.Proveedor();
                p.setRazonSocial(m.get("razonSocial"));
                p.setCuit(m.get("cuit"));
                p.setRubro(m.get("rubro"));
                p.setTelefono(m.get("telefono"));
                p.setEmail(m.get("email"));
                p.setActivo(true);
                boolean ok = proveedorDAO.registrar(p);
                responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
                return;
            }
            responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
        }
    }

    private class CajaMovimientosHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String uIdStr = query.get("usuarioId");
            Integer uId = (uIdStr != null && !uIdStr.isEmpty()) ? Integer.parseInt(uIdStr) : null;

            List<com.vidanatural.model.CajaMovimiento> movs = cajaDAO.listarMovimientos(uId);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < movs.size(); i++) {
                com.vidanatural.model.CajaMovimiento m = movs.get(i);
                sb.append(String.format(Locale.US,
                    "{\"id\":%d,\"fecha\":\"%s\",\"tipo\":\"%s\",\"concepto\":\"%s\",\"monto\":%.2f,\"usuarioId\":%d,\"ventaId\":%s}",
                    m.getId(), m.getFecha().toString(), m.getTipo(), escaparJson(m.getConcepto()),
                    m.getMonto(), m.getUsuarioId(), m.getVentaId() != null ? m.getVentaId() : "null"
                ));
                if (i < movs.size() - 1) sb.append(",");
            }
            sb.append("]");
            responderJson(exchange, 200, sb.toString());
        }
    }

    private class CajaTotalesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());
            String uIdStr = query.get("usuarioId");
            Integer uId = (uIdStr != null && !uIdStr.isEmpty()) ? Integer.parseInt(uIdStr) : null;

            Map<String, Double> totales = cajaDAO.obtenerTotales(uId);
            String json = String.format(Locale.US,
                "{\"ingresos\":%.2f,\"egresos\":%.2f,\"saldo\":%.2f}",
                totales.getOrDefault("ingresos", 0.0),
                totales.getOrDefault("egresos", 0.0),
                totales.getOrDefault("saldo", 0.0)
            );
            responderJson(exchange, 200, json);
        }
    }

    private class CajaEgresoHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                responderJson(exchange, 405, "{\"error\":\"Método no permitido\"}");
                return;
            }
            String body = leerCuerpo(exchange);
            Map<String, String> m = parseSimpleJson(body);

            com.vidanatural.model.CajaMovimiento egreso = new com.vidanatural.model.CajaMovimiento();
            egreso.setTipo(m.getOrDefault("tipo", "EGRESO_GASTOS"));
            egreso.setConcepto(m.get("concepto"));
            egreso.setMonto(Double.parseDouble(m.get("monto")));
            egreso.setUsuarioId(Integer.parseInt(m.get("usuarioId")));

            boolean ok = cajaDAO.registrarMovimiento(egreso);
            responderJson(exchange, ok ? 200 : 400, "{\"exito\":" + ok + "}");
        }
    }

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

            byte[] bytes = Files.readAllBytes(archivo);
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    // ============================================================
    // UTILIDADES JSON Y HTTP
    // ============================================================
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

    private String productoAJson(Producto p) {
        return String.format(Locale.US,
            "{\"codigo\":\"%s\",\"descripcion\":\"%s\",\"categoria\":\"%s\",\"precioUnitario\":%.2f,\"stockActual\":%d,\"stockMinimo\":%d,\"activo\":%b}",
            escaparJson(p.getCodigo()), escaparJson(p.getDescripcion()), p.getCategoria().name(),
            p.getPrecioUnitario(), p.getStockActual(), p.getStockMinimo(), p.isActivo()
        );
    }

    private String ventaAJson(Venta v) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format(Locale.US,
            "{\"id\":%d,\"fecha\":\"%s\",\"importeTotal\":%.2f,\"estado\":\"%s\",\"usuarioId\":%d,\"detalles\":[",
            v.getId(), v.getFecha().toString(), v.getImporteTotal(), v.getEstado().name(), v.getUsuarioId()
        ));
        for (int i = 0; i < v.getDetalles().size(); i++) {
            DetalleVenta d = v.getDetalles().get(i);
            String desc = (d.getProducto() != null) ? d.getProducto().getDescripcion() : "";
            double precioU = (d.getProducto() != null) ? d.getProducto().getPrecioUnitario() : 0.0;
            sb.append(String.format(Locale.US,
                "{\"id\":%d,\"productoCodigo\":\"%s\",\"descripcion\":\"%s\",\"cantidad\":%d,\"precioUnitario\":%.2f,\"subtotal\":%.2f}",
                d.getId(), escaparJson(d.getProductoCodigo()), escaparJson(desc), d.getCantidad(), precioU, d.getSubtotal()
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

    private Venta parseVentaJson(String json) {
        Venta v = new Venta();
        // Parsear usuarioId
        int userIdx = json.indexOf("\"usuarioId\"");
        if (userIdx != -1) {
            String sub = json.substring(userIdx);
            String num = sub.replaceAll("[^0-9]", " ").trim().split("\\s+")[0];
            v.setUsuarioId(Integer.parseInt(num));
        }

        // Parsear detalles array
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
                    double subtotal = Double.parseDouble(m.get("subtotal"));
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
