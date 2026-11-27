package com.vidanatural.dao;

import com.vidanatural.model.Categoria;
import com.vidanatural.model.Producto;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ProductoDAO {

    /**
     * a) Registrar un nuevo producto.
     */
    public boolean registrar(Producto p) {
        String sql = "INSERT INTO producto (codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo, activo) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, p.getCodigo());
            stmt.setString(2, p.getDescripcion());
            stmt.setString(3, p.getCategoria().name());
            stmt.setDouble(4, p.getPrecioUnitario());
            stmt.setInt(5, p.getStockActual());
            stmt.setInt(6, p.getStockMinimo());
            stmt.setBoolean(7, p.isActivo());

            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al registrar producto: " + e.getMessage());
            return false;
        }
    }

    /**
     * b) Buscar un producto por su código.
     */
    public Producto buscarPorCodigo(String codigo) {
        String sql = "SELECT codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo, activo " +
                     "FROM producto WHERE codigo = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, codigo);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapearProducto(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error al buscar producto: " + e.getMessage());
        }
        return null;
    }

    /**
     * c) Mostrar todos los productos registrados.
     */
    public List<Producto> listarTodos() {
        List<Producto> lista = new ArrayList<>();
        String sql = "SELECT codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo, activo " +
                     "FROM producto ORDER BY descripcion ASC";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                lista.add(mapearProducto(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error al listar productos: " + e.getMessage());
        }
        return lista;
    }

    /**
     * d) Reporte de productos con stock actual <= stock mínimo.
     */
    public List<Producto> listarBajoStockMinimo() {
        List<Producto> lista = new ArrayList<>();
        String sql = "SELECT codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo, activo " +
                     "FROM producto WHERE stock_actual <= stock_minimo AND activo = 1 " +
                     "ORDER BY stock_actual ASC";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                lista.add(mapearProducto(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error al listar productos bajo stock: " + e.getMessage());
        }
        return lista;
    }

    /**
     * Modificar datos de un producto.
     */
    public boolean modificar(Producto p) {
        String sql = "UPDATE producto SET descripcion = ?, categoria = ?, precio_unitario = ?, " +
                     "stock_actual = ?, stock_minimo = ?, activo = ? WHERE codigo = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, p.getDescripcion());
            stmt.setString(2, p.getCategoria().name());
            stmt.setDouble(3, p.getPrecioUnitario());
            stmt.setInt(4, p.getStockActual());
            stmt.setInt(5, p.getStockMinimo());
            stmt.setBoolean(6, p.isActivo());
            stmt.setString(7, p.getCodigo());

            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al modificar producto: " + e.getMessage());
            return false;
        }
    }

    /**
     * Baja lógica de un producto: activo = 0.
     */
    public boolean darDeBaja(String codigo) {
        String sql = "UPDATE producto SET activo = 0 WHERE codigo = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, codigo);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al dar de baja producto: " + e.getMessage());
            return false;
        }
    }

    /**
     * Mapeo de fila ResultSet a entidad Producto.
     */
    private Producto mapearProducto(ResultSet rs) throws SQLException {
        return new Producto(
            rs.getString("codigo"),
            rs.getString("descripcion"),
            Categoria.valueOf(rs.getString("categoria")),
            rs.getDouble("precio_unitario"),
            rs.getInt("stock_actual"),
            rs.getInt("stock_minimo"),
            rs.getBoolean("activo")
        );
    }
}
