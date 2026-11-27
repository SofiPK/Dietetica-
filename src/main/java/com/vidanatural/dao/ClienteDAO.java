package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

import com.vidanatural.model.Cliente;

public class ClienteDAO {

    public boolean crear(Cliente cliente) throws SQLException {
        String sql = "INSERT INTO cliente (dni_cuit, nombre, apellido, telefono, email, acepta_promociones, activo) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            if (cliente.getDniCuit() == null || cliente.getDniCuit().isBlank()) {
                stmt.setNull(1, Types.VARCHAR);
            } else {
                stmt.setString(1, cliente.getDniCuit().trim());
            }
            stmt.setString(2, cliente.getNombre().trim());
            stmt.setString(3, cliente.getApellido().trim());
            stmt.setString(4, cliente.getTelefono());
            stmt.setString(5, cliente.getEmail());
            stmt.setBoolean(6, cliente.isAceptaPromociones());
            stmt.setBoolean(7, cliente.isActivo());

            int filas = stmt.executeUpdate();
            if (filas > 0) {
                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) cliente.setId(rs.getInt(1));
                }
                return true;
            }
            return false;
        }
    }

    public boolean actualizar(Cliente cliente) throws SQLException {
        String sql = "UPDATE cliente SET dni_cuit = ?, nombre = ?, apellido = ?, telefono = ?, email = ?, " +
                     "acepta_promociones = ?, activo = ? WHERE id = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (cliente.getDniCuit() == null || cliente.getDniCuit().isBlank()) {
                stmt.setNull(1, Types.VARCHAR);
            } else {
                stmt.setString(1, cliente.getDniCuit().trim());
            }
            stmt.setString(2, cliente.getNombre().trim());
            stmt.setString(3, cliente.getApellido().trim());
            stmt.setString(4, cliente.getTelefono());
            stmt.setString(5, cliente.getEmail());
            stmt.setBoolean(6, cliente.isAceptaPromociones());
            stmt.setBoolean(7, cliente.isActivo());
            stmt.setInt(8, cliente.getId());
            return stmt.executeUpdate() > 0;
        }
    }

    public boolean cambiarEstado(int id, boolean activo) throws SQLException {
        String sql = "UPDATE cliente SET activo = ? WHERE id = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setBoolean(1, activo);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        }
    }

    public Cliente buscarPorId(int id) {
        String sql = "SELECT * FROM cliente WHERE id = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) return mapearCliente(rs);
            }
        } catch (SQLException e) {
            System.err.println("Error al buscar cliente: " + e.getMessage());
        }
        return null;
    }

    public List<Cliente> listarTodos(boolean soloActivos) {
        List<Cliente> lista = new ArrayList<>();
        String sql = soloActivos
                ? "SELECT * FROM cliente WHERE activo = 1 ORDER BY apellido, nombre"
                : "SELECT * FROM cliente ORDER BY activo DESC, apellido, nombre";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) lista.add(mapearCliente(rs));
        } catch (SQLException e) {
            System.err.println("Error al listar clientes: " + e.getMessage());
        }
        return lista;
    }

    public List<Cliente> buscar(String termino) {
        List<Cliente> lista = new ArrayList<>();
        String sql = "SELECT * FROM cliente WHERE activo = 1 AND " +
                     "(nombre LIKE ? OR apellido LIKE ? OR dni_cuit LIKE ? OR email LIKE ?) " +
                     "ORDER BY apellido, nombre";
        String patron = "%" + termino.trim() + "%";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, patron);
            stmt.setString(2, patron);
            stmt.setString(3, patron);
            stmt.setString(4, patron);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) lista.add(mapearCliente(rs));
            }
        } catch (SQLException e) {
            System.err.println("Error al buscar clientes: " + e.getMessage());
        }
        return lista;
    }

    private Cliente mapearCliente(ResultSet rs) throws SQLException {
        Cliente c = new Cliente();
        c.setId(rs.getInt("id"));
        c.setDniCuit(rs.getString("dni_cuit"));
        c.setNombre(rs.getString("nombre"));
        c.setApellido(rs.getString("apellido"));
        c.setTelefono(rs.getString("telefono"));
        c.setEmail(rs.getString("email"));
        c.setAceptaPromociones(rs.getBoolean("acepta_promociones"));
        c.setActivo(rs.getBoolean("activo"));
        Timestamp ts = rs.getTimestamp("fecha_alta");
        if (ts != null) c.setFechaAlta(ts.toLocalDateTime());
        return c;
    }
}
