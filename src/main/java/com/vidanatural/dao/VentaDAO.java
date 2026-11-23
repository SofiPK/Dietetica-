package com.vidanatural.dao;

import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.EstadoVenta;
import com.vidanatural.model.Venta;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class VentaDAO {

    /**
     * e) y f) Registrar una nueva venta con descuento atómico de stock (Transacción ACID).
     * Si no hay stock suficiente de algún producto, se cancela toda la operación y se lanza excepción.
     */
    public boolean registrarVenta(Venta venta) throws Exception {
        String sqlVenta = "INSERT INTO venta (fecha, importe_total, estado, usuario_id) VALUES (?, ?, ?, ?)";
        String sqlDetalle = "INSERT INTO detalle_venta (venta_id, producto_codigo, cantidad, subtotal) VALUES (?, ?, ?, ?)";
        String sqlCheckStock = "SELECT descripcion, stock_actual, activo FROM producto WHERE codigo = ? FOR UPDATE";
        String sqlDescontarStock = "UPDATE producto SET stock_actual = stock_actual - ? WHERE codigo = ?";

        Connection conn = null;
        try {
            conn = ConexionBD.getConexion();
            conn.setAutoCommit(false); // INICIO TRANSACCIÓN

            // 1. VALIDACIÓN PREVIA DE STOCK PARA CADA PRODUCTO
            for (DetalleVenta detalle : venta.getDetalles()) {
                try (PreparedStatement stmtCheck = conn.prepareStatement(sqlCheckStock)) {
                    stmtCheck.setString(1, detalle.getProductoCodigo());
                    try (ResultSet rs = stmtCheck.executeQuery()) {
                        if (!rs.next()) {
                            throw new Exception("El producto con código " + detalle.getProductoCodigo() + " no existe.");
                        }
                        boolean activo = rs.getBoolean("activo");
                        if (!activo) {
                            throw new Exception("El producto '" + rs.getString("descripcion") + "' está dado de baja.");
                        }
                        int stockActual = rs.getInt("stock_actual");
                        if (stockActual < detalle.getCantidad()) {
                            throw new Exception("Stock insuficiente para '" + rs.getString("descripcion") +
                                                "'. Stock disponible: " + stockActual + ", solicitado: " + detalle.getCantidad());
                        }
                    }
                }
            }

            // 2. INSERTAR CABECERA DE VENTA
            int ventaId = 0;
            try (PreparedStatement stmtVenta = conn.prepareStatement(sqlVenta, Statement.RETURN_GENERATED_KEYS)) {
                stmtVenta.setTimestamp(1, Timestamp.valueOf(venta.getFecha()));
                stmtVenta.setDouble(2, venta.getImporteTotal());
                stmtVenta.setString(3, EstadoVenta.CONFIRMADA.name());
                stmtVenta.setInt(4, venta.getUsuarioId());

                stmtVenta.executeUpdate();
                try (ResultSet rsKeys = stmtVenta.getGeneratedKeys()) {
                    if (rsKeys.next()) {
                        ventaId = rsKeys.getInt(1);
                        venta.setId(ventaId);
                    }
                }
            }

            // 3. INSERTAR CADA DETALLE Y DESCONTAR STOCK
            try (PreparedStatement stmtDetalle = conn.prepareStatement(sqlDetalle);
                 PreparedStatement stmtStock = conn.prepareStatement(sqlDescontarStock)) {

                for (DetalleVenta d : venta.getDetalles()) {
                    // Insert detalle
                    stmtDetalle.setInt(1, ventaId);
                    stmtDetalle.setString(2, d.getProductoCodigo());
                    stmtDetalle.setInt(3, d.getCantidad());
                    stmtDetalle.setDouble(4, d.getSubtotal());
                    stmtDetalle.executeUpdate();

                    // Descontar stock
                    stmtStock.setInt(1, d.getCantidad());
                    stmtStock.setString(2, d.getProductoCodigo());
                    stmtStock.executeUpdate();
                }
            }

            conn.commit(); // CONFIRMAR TRANSACCIÓN
            return true;

        } catch (Exception e) {
            if (conn != null) {
                try {
                    conn.rollback(); // DESHACER CAMBIOS EN CASO DE ERROR
                } catch (SQLException ex) {
                    System.err.println("Error en rollback: " + ex.getMessage());
                }
            }
            throw e; // Relanza para que el controlador/frontend reciba el mensaje exacto
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException e) {
                    System.err.println("Error al cerrar conexión: " + e.getMessage());
                }
            }
        }
    }

    /**
     * g) Mostrar lo recaudado (con filtro opcional de fechas para el perfil Gerente).
     */
    public double calcularRecaudado(LocalDate desde, LocalDate hasta) {
        StringBuilder sql = new StringBuilder(
            "SELECT COALESCE(SUM(importe_total), 0) AS total FROM venta WHERE estado = 'CONFIRMADA' "
        );

        if (desde != null) {
            sql.append("AND DATE(fecha) >= ? ");
        }
        if (hasta != null) {
            sql.append("AND DATE(fecha) <= ? ");
        }

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

            int paramIndex = 1;
            if (desde != null) {
                stmt.setDate(paramIndex++, java.sql.Date.valueOf(desde));
            }
            if (hasta != null) {
                stmt.setDate(paramIndex++, java.sql.Date.valueOf(hasta));
            }

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Math.round(rs.getDouble("total") * 100.0) / 100.0;
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al calcular recaudación: " + e.getMessage());
        }
        return 0.0;
    }

    /**
     * Listado histórico de ventas con sus productos detallados.
     */
    public List<Venta> listarVentas() {
        List<Venta> lista = new ArrayList<>();
        String sqlVentas = "SELECT v.id, v.fecha, v.importe_total, v.estado, v.usuario_id, " +
                           "CONCAT(u.nombre, ' ', u.apellido) AS nombre_usuario " +
                           "FROM venta v " +
                           "JOIN usuario u ON v.usuario_id = u.id " +
                           "ORDER BY v.fecha DESC";

        String sqlDetalles = "SELECT d.id, d.venta_id, d.producto_codigo, p.descripcion, d.cantidad, " +
                             "p.precio_unitario, d.subtotal " +
                             "FROM detalle_venta d " +
                             "JOIN producto p ON d.producto_codigo = p.codigo " +
                             "WHERE d.venta_id = ?";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmtV = conn.prepareStatement(sqlVentas);
             ResultSet rsV = stmtV.executeQuery()) {

            while (rsV.next()) {
                Venta v = new Venta(
                    rsV.getInt("id"),
                    rsV.getTimestamp("fecha").toLocalDateTime(),
                    rsV.getDouble("importe_total"),
                    EstadoVenta.valueOf(rsV.getString("estado")),
                    rsV.getInt("usuario_id")
                );

                // Cargar detalles de esta venta
                try (PreparedStatement stmtD = conn.prepareStatement(sqlDetalles)) {
                    stmtD.setInt(1, v.getId());
                    try (ResultSet rsD = stmtD.executeQuery()) {
                        while (rsD.next()) {
                            DetalleVenta d = new DetalleVenta(
                                rsD.getInt("id"),
                                rsD.getInt("venta_id"),
                                rsD.getString("producto_codigo"),
                                rsD.getInt("cantidad"),
                                rsD.getDouble("subtotal")
                            );
                            // Asignar producto con descripción y precio para el frontend
                            com.vidanatural.model.Producto p = new com.vidanatural.model.Producto();
                            p.setCodigo(rsD.getString("producto_codigo"));
                            p.setDescripcion(rsD.getString("descripcion"));
                            p.setPrecioUnitario(rsD.getDouble("precio_unitario"));
                            d.setProducto(p);

                            v.getDetalles().add(d);
                        }
                    }
                }

                lista.add(v);
            }
        } catch (SQLException e) {
            System.err.println("Error al listar ventas completas: " + e.getMessage());
        }
        return lista;
    }
}
