package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import com.vidanatural.model.Perfil;
import com.vidanatural.model.Usuario;

public class UsuarioDAO {

    /**
     * Busca un usuario por nombre de usuario y valida sus credenciales.
     * @throws SQLException Si hay un problema de conexión con MySQL
     */
    public Usuario autenticar(String nombreUsuario, String contrasena) throws SQLException {
        String sql = "SELECT id, nombre_usuario, nombre, apellido, contrasena, perfil " +
                     "FROM usuario WHERE nombre_usuario = ? AND contrasena = ?";

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
                        Perfil.valueOf(rs.getString("perfil"))
                    );
                }
            }
        }
        return null;
    }
}
