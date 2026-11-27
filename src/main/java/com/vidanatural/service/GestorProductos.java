package com.vidanatural.service;

import com.vidanatural.dao.ProductoDAO;
import com.vidanatural.model.Producto;

import java.util.List;

public class GestorProductos {
    private final ProductoDAO productoDAO;

    public GestorProductos() {
        this.productoDAO = new ProductoDAO();
    }

    public boolean registrarProducto(Producto p) {
        if (p == null || p.getCodigo() == null || p.getCodigo().trim().isEmpty()) {
            return false;
        }
        return productoDAO.registrar(p);
    }

    public Producto buscarPorCodigo(String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            return null;
        }
        return productoDAO.buscarPorCodigo(codigo.trim());
    }

    public List<Producto> listarTodos() {
        return productoDAO.listarTodos();
    }

    public List<Producto> listarStockBajo() {
        return productoDAO.listarBajoStockMinimo();
    }

    public boolean modificarProducto(Producto p) {
        if (p == null || p.getCodigo() == null) {
            return false;
        }
        return productoDAO.modificar(p);
    }

    public boolean darDeBaja(String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            return false;
        }
        return productoDAO.darDeBaja(codigo.trim());
    }
}
