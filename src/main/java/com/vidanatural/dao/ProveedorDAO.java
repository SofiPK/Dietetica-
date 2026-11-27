package com.vidanatural.dao;

import com.vidanatural.model.Proveedor;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ProveedorDAO {

    public boolean registrar(Proveedor p) {
        String sql = "INSERT INTO proveedor (razon_social, cuit, rubro, telefono, email, activo) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, p.getRazonSocial());
            stmt.setString(2, p.getCuit());
            stmt.setString(3, p.getRubro());
            stmt.setString(4, p.getTelefono());
            stmt.setString(5, p.getEmail());
            stmt.setBoolean(6, p.isActivo());

            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al registrar proveedor: " + e.getMessage());
            return false;
        }
    }

    public List<Proveedor> listarTodos() {
        List<Proveedor> lista = new ArrayList<>();
        String sql = "SELECT id, razon_social, cuit, rubro, telefono, email, activo FROM proveedor ORDER BY razon_social";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                lista.add(new Proveedor(
                    rs.getInt("id"),
                    rs.getString("razon_social"),
                    rs.getString("cuit"),
                    rs.getString("rubro"),
                    rs.getString("telefono"),
                    rs.getString("email"),
                    rs.getBoolean("activo")
                ));
            }
        } catch (SQLException e) {
            System.err.println("Error al listar proveedores: " + e.getMessage());
        }
        return lista;
    }
}
