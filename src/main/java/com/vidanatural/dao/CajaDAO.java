package com.vidanatural.dao;

import com.vidanatural.model.CajaMovimiento;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CajaDAO {

    public boolean registrarMovimiento(CajaMovimiento m) {
        String sql = "INSERT INTO caja_movimiento (tipo, concepto, monto, usuario_id, venta_id) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, m.getTipo());
            stmt.setString(2, m.getConcepto());
            stmt.setDouble(3, m.getMonto());
            stmt.setInt(4, m.getUsuarioId());
            if (m.getVentaId() != null && m.getVentaId() > 0) {
                stmt.setInt(5, m.getVentaId());
            } else {
                stmt.setNull(5, Types.INTEGER);
            }

            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al registrar movimiento de caja: " + e.getMessage());
            return false;
        }
    }

    public List<CajaMovimiento> listarMovimientos(Integer usuarioId) {
        List<CajaMovimiento> lista = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
            "SELECT id, fecha, tipo, concepto, monto, usuario_id, venta_id FROM caja_movimiento "
        );
        if (usuarioId != null) {
            sql.append("WHERE usuario_id = ? ");
        }
        sql.append("ORDER BY fecha DESC LIMIT 100");

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

            if (usuarioId != null) {
                stmt.setInt(1, usuarioId);
            }

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    int ventaId = rs.getInt("venta_id");
                    lista.add(new CajaMovimiento(
                        rs.getInt("id"),
                        rs.getTimestamp("fecha").toLocalDateTime(),
                        rs.getString("tipo"),
                        rs.getString("concepto"),
                        rs.getDouble("monto"),
                        rs.getInt("usuario_id"),
                        rs.wasNull() ? null : ventaId
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al listar movimientos de caja: " + e.getMessage());
        }
        return lista;
    }

    public Map<String, Double> obtenerTotales(Integer usuarioId) {
        Map<String, Double> resumen = new HashMap<>();
        StringBuilder sql = new StringBuilder(
            "SELECT " +
            "  COALESCE(SUM(CASE WHEN tipo LIKE 'INGRESO%' THEN monto ELSE 0 END), 0) AS ingresos, " +
            "  COALESCE(SUM(CASE WHEN tipo LIKE 'EGRESO%' THEN monto ELSE 0 END), 0) AS egresos " +
            "FROM caja_movimiento "
        );
        if (usuarioId != null) {
            sql.append("WHERE usuario_id = ?");
        }

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

            if (usuarioId != null) {
                stmt.setInt(1, usuarioId);
            }

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    double ing = Math.round(rs.getDouble("ingresos") * 100.0) / 100.0;
                    double egr = Math.round(rs.getDouble("egresos") * 100.0) / 100.0;
                    resumen.put("ingresos", ing);
                    resumen.put("egresos", egr);
                    resumen.put("saldo", Math.round((ing - egr) * 100.0) / 100.0);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al obtener totales de caja: " + e.getMessage());
        }
        return resumen;
    }
}
