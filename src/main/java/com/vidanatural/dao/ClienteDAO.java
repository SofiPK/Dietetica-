package com.vidanatural.dao;

import com.vidanatural.model.Cliente;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ClienteDAO {

    public boolean registrar(Cliente c) {
        String sql = "INSERT INTO cliente (nombre, apellido, telefono, email, recibe_promociones) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, c.getNombre());
            stmt.setString(2, c.getApellido());
            stmt.setString(3, c.getTelefono());
            stmt.setString(4, c.getEmail());
            stmt.setBoolean(5, c.isRecibePromociones());

            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al registrar cliente: " + e.getMessage());
            return false;
        }
    }

    public List<Cliente> listarTodos() {
        List<Cliente> lista = new ArrayList<>();
        String sql = "SELECT id, nombre, apellido, telefono, email, recibe_promociones, fecha_registro FROM cliente ORDER BY nombre, apellido";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                lista.add(new Cliente(
                    rs.getInt("id"),
                    rs.getString("nombre"),
                    rs.getString("apellido"),
                    rs.getString("telefono"),
                    rs.getString("email"),
                    rs.getBoolean("recibe_promociones"),
                    rs.getTimestamp("fecha_registro").toLocalDateTime()
                ));
            }
        } catch (SQLException e) {
            System.err.println("Error al listar clientes: " + e.getMessage());
        }
        return lista;
    }
}
