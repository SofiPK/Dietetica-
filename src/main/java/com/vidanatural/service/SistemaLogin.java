package com.vidanatural.service;

import com.vidanatural.dao.UsuarioDAO;
import com.vidanatural.model.Usuario;

public class SistemaLogin {
    private final UsuarioDAO usuarioDAO;

    public SistemaLogin() {
        this.usuarioDAO = new UsuarioDAO();
    }

    public Usuario autenticar(String nombreUsuario, String contrasena) throws Exception {
        if (nombreUsuario == null || contrasena == null) {
            return null;
        }
        return usuarioDAO.autenticar(nombreUsuario.trim(), contrasena.trim());
    }
}
