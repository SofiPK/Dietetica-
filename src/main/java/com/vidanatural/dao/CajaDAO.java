package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.vidanatural.model.Caja;
import com.vidanatural.model.EstadoCaja;
import com.vidanatural.model.MovimientoCaja;
import com.vidanatural.model.TipoMovimientoCaja;

public class CajaDAO {

    public Caja obtenerCajaAbierta() {
        String sql = "SELECT * FROM caja WHERE estado = 'ABIERTA' ORDER BY fecha_apertura DESC LIMIT 1";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                Caja c = mapearCaja(rs);
                c.setMovimientos(listarMovimientos(conn, c.getId()));
                return c;
            }
        } catch (SQLException e) {
            System.err.println("Error al obtener caja abierta: " + e.getMessage());
        }
        return null;
    }

    public Caja abrirCaja(int usuarioId, double montoInicial, String observaciones) throws Exception {
        if (obtenerCajaAbierta() != null) {
            throw new Exception("Ya existe una caja abierta. Debe cerrarla antes de abrir una nueva.");
        }
        String sql = "INSERT INTO caja (usuario_apertura_id, fecha_apertura, monto_inicial, estado, observaciones) " +
                     "VALUES (?, NOW(), ?, 'ABIERTA', ?)";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, usuarioId);
            stmt.setDouble(2, montoInicial);
            stmt.setString(3, observaciones);
            stmt.executeUpdate();
            return obtenerCajaAbierta();
        }
    }

    public boolean registrarMovimiento(int cajaId, Integer ventaId, int usuarioId, TipoMovimientoCaja tipo, String concepto, double monto) throws SQLException {
        String sql = "INSERT INTO movimiento_caja (caja_id, venta_id, usuario_id, tipo, concepto, monto, fecha_hora) " +
                     "VALUES (?, ?, ?, ?, ?, ?, NOW())";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, cajaId);
            if (ventaId != null) stmt.setInt(2, ventaId);
            else stmt.setNull(2, Types.INTEGER);
            stmt.setInt(3, usuarioId);
            stmt.setString(4, tipo.name());
            stmt.setString(5, concepto);
            stmt.setDouble(6, monto);
            return stmt.executeUpdate() > 0;
        }
    }

    public Caja cerrarCaja(int usuarioCierreId, double montoFinalReal, String observaciones) throws Exception {
        Caja abierta = obtenerCajaAbierta();
        if (abierta == null) {
            throw new Exception("No hay ninguna caja abierta para cerrar.");
        }

        double esperado = abierta.calcularSaldoActual();
        double diferencia = Math.round((montoFinalReal - esperado) * 100.0) / 100.0;

        String sql = "UPDATE caja SET usuario_cierre_id = ?, fecha_cierre = NOW(), monto_esperado = ?, " +
                     "monto_final_real = ?, diferencia = ?, estado = 'CERRADA', observaciones = ? WHERE id = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, usuarioCierreId);
            stmt.setDouble(2, esperado);
            stmt.setDouble(3, montoFinalReal);
            stmt.setDouble(4, diferencia);
            stmt.setString(5, observaciones != null ? observaciones : abierta.getObservaciones());
            stmt.setInt(6, abierta.getId());
            stmt.executeUpdate();
        }

        abierta.setUsuarioCierreId(usuarioCierreId);
        abierta.setMontoEsperado(esperado);
        abierta.setMontoFinalReal(montoFinalReal);
        abierta.setDiferencia(diferencia);
        abierta.setEstado(EstadoCaja.CERRADA);
        return abierta;
    }

    public List<Caja> listarHistorialCierres(LocalDate desde, LocalDate hasta) {
        List<Caja> lista = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT * FROM caja WHERE estado = 'CERRADA' ");
        if (desde != null) sql.append("AND DATE(fecha_cierre) >= ? ");
        if (hasta != null) sql.append("AND DATE(fecha_cierre) <= ? ");
        sql.append("ORDER BY fecha_cierre DESC");

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            int idx = 1;
            if (desde != null) stmt.setDate(idx++, Date.valueOf(desde));
            if (hasta != null) stmt.setDate(idx++, Date.valueOf(hasta));

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Caja c = mapearCaja(rs);
                    c.setMovimientos(listarMovimientos(conn, c.getId()));
                    lista.add(c);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al listar historial de caja: " + e.getMessage());
        }
        return lista;
    }

    private List<MovimientoCaja> listarMovimientos(Connection conn, int cajaId) throws SQLException {
        List<MovimientoCaja> movs = new ArrayList<>();
        String sql = "SELECT * FROM movimiento_caja WHERE caja_id = ? ORDER BY fecha_hora DESC, id DESC";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, cajaId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    MovimientoCaja m = new MovimientoCaja();
                    m.setId(rs.getInt("id"));
                    m.setCajaId(rs.getInt("caja_id"));
                    int vId = rs.getInt("venta_id");
                    if (!rs.wasNull()) m.setVentaId(vId);
                    m.setUsuarioId(rs.getInt("usuario_id"));
                    m.setTipo(TipoMovimientoCaja.valueOf(rs.getString("tipo")));
                    m.setConcepto(rs.getString("concepto"));
                    m.setMonto(rs.getDouble("monto"));
                    Timestamp ts = rs.getTimestamp("fecha_hora");
                    if (ts != null) m.setFechaHora(ts.toLocalDateTime());
                    movs.add(m);
                }
            }
        }
        return movs;
    }

    private Caja mapearCaja(ResultSet rs) throws SQLException {
        Caja c = new Caja();
        c.setId(rs.getInt("id"));
        c.setUsuarioAperturaId(rs.getInt("usuario_apertura_id"));
        int cierreId = rs.getInt("usuario_cierre_id");
        if (!rs.wasNull()) c.setUsuarioCierreId(cierreId);

        Timestamp ap = rs.getTimestamp("fecha_apertura");
        if (ap != null) c.setFechaApertura(ap.toLocalDateTime());
        Timestamp ci = rs.getTimestamp("fecha_cierre");
        if (ci != null) c.setFechaCierre(ci.toLocalDateTime());

        c.setMontoInicial(rs.getDouble("monto_inicial"));
        double esp = rs.getDouble("monto_esperado");
        if (!rs.wasNull()) c.setMontoEsperado(esp);
        double real = rs.getDouble("monto_final_real");
        if (!rs.wasNull()) c.setMontoFinalReal(real);
        double dif = rs.getDouble("diferencia");
        if (!rs.wasNull()) c.setDiferencia(dif);

        c.setEstado(EstadoCaja.valueOf(rs.getString("estado")));
        c.setObservaciones(rs.getString("observaciones"));
        return c;
    }
}
