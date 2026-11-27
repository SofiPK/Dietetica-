package com.vidanatural.service;

import java.util.List;

import com.vidanatural.dao.ClienteDAO;
import com.vidanatural.model.Cliente;

public class GestorClientes {
    private final ClienteDAO clienteDAO = new ClienteDAO();

    public List<Cliente> listar(boolean soloActivos) {
        return clienteDAO.listarTodos(soloActivos);
    }

    public List<Cliente> buscar(String termino) {
        if (termino == null || termino.isBlank()) {
            return clienteDAO.listarTodos(true);
        }
        return clienteDAO.buscar(termino);
    }

    public Cliente buscarPorId(int id) {
        return clienteDAO.buscarPorId(id);
    }

    public Cliente registrar(Cliente cliente) throws Exception {
        validar(cliente);
        clienteDAO.crear(cliente);
        return cliente;
    }

    public boolean actualizar(Cliente cliente) throws Exception {
        if (cliente.getId() <= 0) {
            throw new Exception("ID de cliente inválido.");
        }
        validar(cliente);
        return clienteDAO.actualizar(cliente);
    }

    public boolean cambiarEstado(int id, boolean activo) throws Exception {
        if (id <= 0) {
            throw new Exception("ID de cliente inválido.");
        }
        return clienteDAO.cambiarEstado(id, activo);
    }

    private void validar(Cliente c) throws Exception {
        if (c == null) throw new Exception("Datos de cliente requeridos.");
        if (c.getNombre() == null || c.getNombre().isBlank()) {
            throw new Exception("El nombre del cliente es obligatorio.");
        }
        if (c.getApellido() == null || c.getApellido().isBlank()) {
            throw new Exception("El apellido del cliente es obligatorio.");
        }
    }
}
