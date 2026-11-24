package com.vidanatural.service;

import java.time.LocalDate;
import java.util.List;

import com.vidanatural.dao.VentaDAO;
import com.vidanatural.model.Venta;

public class GestorVentas {
    private final VentaDAO ventaDAO;
    private final CalculadoraVenta calculadora;

    public GestorVentas() {
        this.ventaDAO = new VentaDAO();
        this.calculadora = new CalculadoraVenta();
    }

    public boolean registrarVenta(Venta venta) throws Exception {
        if (venta == null || venta.getDetalles() == null || venta.getDetalles().isEmpty()) {
            throw new Exception("La venta debe contener al menos un producto.");
        }
        // Recalcular total con la calculadora para asegurar consistencia
        double total = calculadora.calcularTotal(venta.getDetalles());
        venta.setImporteTotal(total);

        return ventaDAO.registrarVenta(venta);
    }

    public double calcularRecaudado(LocalDate desde, LocalDate hasta) {
        return ventaDAO.calcularRecaudado(desde, hasta);
    }

    public List<Venta> listarVentas() {
        return ventaDAO.listarVentas();
    }

    public CalculadoraVenta getCalculadora() {
        return calculadora;
    }
}
