package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.vidanatural.model.Promocion;
import com.vidanatural.model.TipoDescuento;

public class PromocionDAO {

    public boolean crear(Promocion promo) throws SQLException {
        String sqlPromo = "INSERT INTO promocion (nombre, tipo_descuento, valor, vigencia_desde, vigencia_hasta, activa) " +
                          "VALUES (?, ?, ?, ?, ?, ?)";
        String sqlRel = "INSERT INTO promocion_producto (promocion_id, producto_codigo) VALUES (?, ?)";

        Connection conn = null;
        try {
            conn = ConexionBD.getConexion();
            conn.setAutoCommit(false);

            try (PreparedStatement stmt = conn.prepareStatement(sqlPromo, Statement.RETURN_GENERATED_KEYS)) {
                stmt.setString(1, promo.getNombre().trim());
                stmt.setString(2, promo.getTipoDescuento().name());
                stmt.setDouble(3, promo.getValor());
                stmt.setDate(4, Date.valueOf(promo.getVigenciaDesde()));
                stmt.setDate(5, Date.valueOf(promo.getVigenciaHasta()));
                stmt.setBoolean(6, promo.isActiva());
                stmt.executeUpdate();

                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) promo.setId(rs.getInt(1));
                }
            }

            if (promo.getProductosCodigos() != null && !promo.getProductosCodigos().isEmpty()) {
                try (PreparedStatement stmtRel = conn.prepareStatement(sqlRel)) {
                    for (String cod : promo.getProductosCodigos()) {
                        stmtRel.setInt(1, promo.getId());
                        stmtRel.setString(2, cod.trim().toUpperCase());
                        stmtRel.executeUpdate();
                    }
                }
            }

            conn.commit();
            return true;
        } catch (SQLException e) {
            if (conn != null) conn.rollback();
            throw e;
        } finally {
            if (conn != null) {
                conn.setAutoCommit(true);
                conn.close();
            }
        }
    }

    public boolean actualizar(Promocion promo) throws SQLException {
        String sqlPromo = "UPDATE promocion SET nombre = ?, tipo_descuento = ?, valor = ?, " +
                          "vigencia_desde = ?, vigencia_hasta = ?, activa = ? WHERE id = ?";
        String sqlDelRel = "DELETE FROM promocion_producto WHERE promocion_id = ?";
        String sqlInsRel = "INSERT INTO promocion_producto (promocion_id, producto_codigo) VALUES (?, ?)";

        Connection conn = null;
        try {
            conn = ConexionBD.getConexion();
            conn.setAutoCommit(false);

            try (PreparedStatement stmt = conn.prepareStatement(sqlPromo)) {
                stmt.setString(1, promo.getNombre().trim());
                stmt.setString(2, promo.getTipoDescuento().name());
                stmt.setDouble(3, promo.getValor());
                stmt.setDate(4, Date.valueOf(promo.getVigenciaDesde()));
                stmt.setDate(5, Date.valueOf(promo.getVigenciaHasta()));
                stmt.setBoolean(6, promo.isActiva());
                stmt.setInt(7, promo.getId());
                stmt.executeUpdate();
            }

            try (PreparedStatement stmtDel = conn.prepareStatement(sqlDelRel)) {
                stmtDel.setInt(1, promo.getId());
                stmtDel.executeUpdate();
            }

            if (promo.getProductosCodigos() != null && !promo.getProductosCodigos().isEmpty()) {
                try (PreparedStatement stmtIns = conn.prepareStatement(sqlInsRel)) {
                    for (String cod : promo.getProductosCodigos()) {
                        stmtIns.setInt(1, promo.getId());
                        stmtIns.setString(2, cod.trim().toUpperCase());
                        stmtIns.executeUpdate();
                    }
                }
            }

            conn.commit();
            return true;
        } catch (SQLException e) {
            if (conn != null) conn.rollback();
            throw e;
        } finally {
            if (conn != null) {
                conn.setAutoCommit(true);
                conn.close();
            }
        }
    }

    public boolean cambiarEstado(int id, boolean activa) throws SQLException {
        String sql = "UPDATE promocion SET activa = ? WHERE id = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setBoolean(1, activa);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        }
    }

    public List<Promocion> listarTodas() {
        List<Promocion> lista = new ArrayList<>();
        String sql = "SELECT * FROM promocion ORDER BY activa DESC, vigencia_hasta DESC, id DESC";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Promocion p = mapearPromocion(rs);
                p.setProductosCodigos(obtenerCodigosProductos(conn, p.getId()));
                lista.add(p);
            }
        } catch (SQLException e) {
            System.err.println("Error al listar promociones: " + e.getMessage());
        }
        return lista;
    }

    /**
     * Busca la promoción activa y vigente en la fecha indicada para un producto.
     */
    public Promocion buscarVigenteParaProducto(String productoCodigo, LocalDate fecha) {
        String sql = "SELECT p.* FROM promocion p " +
                     "JOIN promocion_producto pp ON p.id = pp.promocion_id " +
                     "WHERE pp.producto_codigo = ? AND p.activa = 1 " +
                     "AND ? BETWEEN p.vigencia_desde AND p.vigencia_hasta " +
                     "ORDER BY p.id DESC LIMIT 1";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, productoCodigo);
            stmt.setDate(2, Date.valueOf(fecha));
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    Promocion p = mapearPromocion(rs);
                    p.getProductosCodigos().add(productoCodigo);
                    return p;
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al buscar promoción vigente: " + e.getMessage());
        }
        return null;
    }

    private List<String> obtenerCodigosProductos(Connection conn, int promocionId) throws SQLException {
        List<String> codigos = new ArrayList<>();
        String sql = "SELECT producto_codigo FROM promocion_producto WHERE promocion_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, promocionId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) codigos.add(rs.getString("producto_codigo"));
            }
        }
        return codigos;
    }

    private Promocion mapearPromocion(ResultSet rs) throws SQLException {
        Promocion p = new Promocion();
        p.setId(rs.getInt("id"));
        p.setNombre(rs.getString("nombre"));
        p.setTipoDescuento(TipoDescuento.valueOf(rs.getString("tipo_descuento")));
        p.setValor(rs.getDouble("valor"));
        p.setVigenciaDesde(rs.getDate("vigencia_desde").toLocalDate());
        p.setVigenciaHasta(rs.getDate("vigencia_hasta").toLocalDate());
        p.setActiva(rs.getBoolean("activa"));
        return p;
    }
}
