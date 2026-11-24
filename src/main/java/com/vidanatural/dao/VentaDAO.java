package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;

import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.EstadoVenta;
import com.vidanatural.model.Venta;

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
                    stmtDetalle.setInt(1, ventaId);
                    stmtDetalle.setString(2, d.getProductoCodigo());
                    stmtDetalle.setInt(3, d.getCantidad());
                    stmtDetalle.setDouble(4, d.getSubtotal());
                    stmtDetalle.executeUpdate();

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
            throw e;
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
}
