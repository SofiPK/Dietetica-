package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import com.vidanatural.model.Perfil;
import com.vidanatural.model.Usuario;

public class UsuarioDAO {

    /**
     * Busca un usuario activo por nombre de usuario y valida sus credenciales.
     */
    public Usuario autenticar(String nombreUsuario, String contrasena) throws SQLException {
        String sql = "SELECT id, nombre_usuario, nombre, apellido, contrasena, perfil, activo " +
                     "FROM usuario WHERE nombre_usuario = ? AND contrasena = ? AND activo = 1";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, nombreUsuario);
            stmt.setString(2, contrasena);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Usuario(
                        rs.getInt("id"),
                        rs.getString("nombre_usuario"),
                        rs.getString("nombre"),
                        rs.getString("apellido"),
                        rs.getString("contrasena"),
                        Perfil.valueOf(rs.getString("perfil")),
                        rs.getBoolean("activo")
                    );
                }
            }
        }
        return null;
    }

    /**
     * Lista todos los usuarios ordenados por apellido y nombre (sin incluir la contraseña).
     */
    public List<Usuario> listarTodos() throws SQLException {
        List<Usuario> lista = new ArrayList<>();
        String sql = "SELECT id, nombre_usuario, nombre, apellido, perfil, activo " +
                     "FROM usuario ORDER BY apellido ASC, nombre ASC";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                lista.add(new Usuario(
                    rs.getInt("id"),
                    rs.getString("nombre_usuario"),
                    rs.getString("nombre"),
                    rs.getString("apellido"),
                    null,
                    Perfil.valueOf(rs.getString("perfil")),
                    rs.getBoolean("activo")
                ));
            }
        }
        return lista;
    }

    /**
     * Busca un usuario por su ID.
     */
    public Usuario buscarPorId(int id) throws SQLException {
        String sql = "SELECT id, nombre_usuario, nombre, apellido, perfil, activo " +
                     "FROM usuario WHERE id = ?";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Usuario(
                        rs.getInt("id"),
                        rs.getString("nombre_usuario"),
                        rs.getString("nombre"),
                        rs.getString("apellido"),
                        null,
                        Perfil.valueOf(rs.getString("perfil")),
                        rs.getBoolean("activo")
                    );
                }
            }
        }
        return null;
    }

    /**
     * Verifica si ya existe un nombre_usuario (excluyendo un ID dado en caso de edición).
     */
    public boolean existeNombreUsuario(String nombreUsuario, int idExcluir) throws SQLException {
        String sql = "SELECT COUNT(*) FROM usuario WHERE nombre_usuario = ? AND id <> ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, nombreUsuario);
            stmt.setInt(2, idExcluir);

            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    /**
     * Cuenta cuántos usuarios con perfil GERENTE están activos.
     */
    public int contarGerentesActivos() throws SQLException {
        String sql = "SELECT COUNT(*) FROM usuario WHERE perfil = 'GERENTE' AND activo = 1";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    /**
     * Inserta un nuevo usuario activo en la base de datos.
     */
    public Usuario crear(Usuario usuario) throws SQLException {
        String sql = "INSERT INTO usuario (nombre_usuario, nombre, apellido, contrasena, perfil, activo) " +
                     "VALUES (?, ?, ?, ?, ?, 1)";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setString(1, usuario.getNombreUsuario());
            stmt.setString(2, usuario.getNombre());
            stmt.setString(3, usuario.getApellido());
            stmt.setString(4, usuario.getContrasena());
            stmt.setString(5, usuario.getPerfil().name());
            stmt.executeUpdate();

            try (ResultSet keys = stmt.getGeneratedKeys()) {
                if (keys.next()) {
                    usuario.setId(keys.getInt(1));
                }
            }
            usuario.setActivo(true);
            usuario.setContrasena(null);
            return usuario;
        }
    }

    /**
     * Actualiza los datos de un usuario. Si se envía una nueva contraseña no vacía, también la actualiza.
     */
    public boolean actualizar(Usuario usuario) throws SQLException {
        boolean cambiarClave = usuario.getContrasena() != null && !usuario.getContrasena().trim().isEmpty();
        String sql = cambiarClave
            ? "UPDATE usuario SET nombre = ?, apellido = ?, perfil = ?, activo = ?, contrasena = ? WHERE id = ?"
            : "UPDATE usuario SET nombre = ?, apellido = ?, perfil = ?, activo = ? WHERE id = ?";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, usuario.getNombre());
            stmt.setString(2, usuario.getApellido());
            stmt.setString(3, usuario.getPerfil().name());
            stmt.setBoolean(4, usuario.isActivo());

            if (cambiarClave) {
                stmt.setString(5, usuario.getContrasena().trim());
                stmt.setInt(6, usuario.getId());
            } else {
                stmt.setInt(5, usuario.getId());
            }

            return stmt.executeUpdate() > 0;
        }
    }

    /**
     * Realiza la baja lógica o reactivación de un usuario.
     */
    public boolean cambiarEstado(int id, boolean activo) throws SQLException {
        String sql = "UPDATE usuario SET activo = ? WHERE id = ?";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setBoolean(1, activo);
            stmt.setInt(2, id);
            return stmt.executeUpdate() > 0;
        }
    }

    /**
     * Permite a un usuario cambiar su propia contraseña verificando primero su contraseña actual.
     */
    public boolean cambiarContrasena(int id, String contrasenaActual, String contrasenaNueva) throws SQLException {
        String sql = "UPDATE usuario SET contrasena = ? WHERE id = ? AND contrasena = ? AND activo = 1";
        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, contrasenaNueva);
            stmt.setInt(2, id);
            stmt.setString(3, contrasenaActual);
            return stmt.executeUpdate() > 0;
        }
    }
}
