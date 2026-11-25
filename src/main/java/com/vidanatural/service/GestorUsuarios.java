package com.vidanatural.service;

import java.sql.SQLException;
import java.util.List;

import com.vidanatural.dao.UsuarioDAO;
import com.vidanatural.model.Perfil;
import com.vidanatural.model.Usuario;

public class GestorUsuarios {

    private final UsuarioDAO usuarioDAO;

    public GestorUsuarios() {
        this.usuarioDAO = new UsuarioDAO();
    }

    public List<Usuario> listarTodos() throws SQLException {
        return usuarioDAO.listarTodos();
    }

    public Usuario crearUsuario(Usuario usuario) throws SQLException {
        if (usuario == null) {
            throw new IllegalArgumentException("Datos de usuario inválidos.");
        }
        if (usuario.getNombreUsuario() == null || usuario.getNombreUsuario().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de usuario es obligatorio.");
        }
        if (usuario.getNombre() == null || usuario.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre es obligatorio.");
        }
        if (usuario.getApellido() == null || usuario.getApellido().trim().isEmpty()) {
            throw new IllegalArgumentException("El apellido es obligatorio.");
        }
        if (usuario.getContrasena() == null || usuario.getContrasena().trim().length() < 4) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 4 caracteres.");
        }
        if (usuario.getPerfil() == null) {
            throw new IllegalArgumentException("Debe seleccionar un perfil válido.");
        }

        String usernameLimpio = usuario.getNombreUsuario().trim().toLowerCase();
        if (usuarioDAO.existeNombreUsuario(usernameLimpio, 0)) {
            throw new IllegalArgumentException("El nombre de usuario '" + usernameLimpio + "' ya está en uso.");
        }

        usuario.setNombreUsuario(usernameLimpio);
        usuario.setNombre(usuario.getNombre().trim());
        usuario.setApellido(usuario.getApellido().trim());
        usuario.setContrasena(usuario.getContrasena().trim());

        return usuarioDAO.crear(usuario);
    }

    public void actualizarUsuario(Usuario usuario, int idOperador) throws SQLException {
        if (usuario == null || usuario.getId() <= 0) {
            throw new IllegalArgumentException("ID de usuario inválido.");
        }
        Usuario existente = usuarioDAO.buscarPorId(usuario.getId());
        if (existente == null) {
            throw new IllegalArgumentException("El usuario no existe.");
        }
        if (usuario.getNombre() == null || usuario.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre es obligatorio.");
        }
        if (usuario.getApellido() == null || usuario.getApellido().trim().isEmpty()) {
            throw new IllegalArgumentException("El apellido es obligatorio.");
        }
        if (usuario.getPerfil() == null) {
            throw new IllegalArgumentException("Debe seleccionar un perfil válido.");
        }
        if (usuario.getContrasena() != null && !usuario.getContrasena().trim().isEmpty()
                && usuario.getContrasena().trim().length() < 4) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 4 caracteres.");
        }

        // Evitar que el gerente se desactive o se quite el rol de gerente a sí mismo
        if (usuario.getId() == idOperador) {
            if (!usuario.isActivo()) {
                throw new IllegalArgumentException("No puedes desactivar tu propio usuario.");
            }
            if (usuario.getPerfil() != Perfil.GERENTE) {
                throw new IllegalArgumentException("No puedes cambiar tu propio perfil de Gerente.");
            }
        }

        // Evitar dejar el sistema sin ningún Gerente activo
        if (existente.getPerfil() == Perfil.GERENTE && existente.isActivo()
                && (usuario.getPerfil() != Perfil.GERENTE || !usuario.isActivo())) {
            if (usuarioDAO.contarGerentesActivos() <= 1) {
                throw new IllegalArgumentException("Debe existir al menos un usuario Gerente activo en el sistema.");
            }
        }

        usuario.setNombre(usuario.getNombre().trim());
        usuario.setApellido(usuario.getApellido().trim());
        usuarioDAO.actualizar(usuario);
    }

    public void cambiarEstadoUsuario(int idObjetivo, boolean activo, int idOperador) throws SQLException {
        Usuario existente = usuarioDAO.buscarPorId(idObjetivo);
        if (existente == null) {
            throw new IllegalArgumentException("El usuario no existe.");
        }
        if (!activo && idObjetivo == idOperador) {
            throw new IllegalArgumentException("No puedes dar de baja tu propio usuario.");
        }
        if (!activo && existente.getPerfil() == Perfil.GERENTE && existente.isActivo()) {
            if (usuarioDAO.contarGerentesActivos() <= 1) {
                throw new IllegalArgumentException("No se puede dar de baja al único Gerente activo del sistema.");
            }
        }
        usuarioDAO.cambiarEstado(idObjetivo, activo);
    }

    public void cambiarContrasenaPropia(int idUsuario, String contrasenaActual, String contrasenaNueva) throws SQLException {
        if (idUsuario <= 0) {
            throw new IllegalArgumentException("Sesión de usuario no válida.");
        }
        if (contrasenaActual == null || contrasenaActual.trim().isEmpty()) {
            throw new IllegalArgumentException("Debe ingresar su contraseña actual.");
        }
        if (contrasenaNueva == null || contrasenaNueva.trim().length() < 4) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 4 caracteres.");
        }
        if (contrasenaActual.equals(contrasenaNueva)) {
            throw new IllegalArgumentException("La nueva contraseña debe ser diferente a la actual.");
        }

        boolean actualizada = usuarioDAO.cambiarContrasena(idUsuario, contrasenaActual, contrasenaNueva.trim());
        if (!actualizada) {
            throw new IllegalArgumentException("La contraseña actual ingresada es incorrecta.");
        }
    }
}
