package com.vidanatural.service;

import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.Producto;

import java.util.List;

/**
 * Módulo de cálculo para Ventas (siguiendo las buenas prácticas vistas en el ERP).
 * Aísla toda la matemática y reglas numéricas de la venta para que sea 100% testeable.
 */
public class CalculadoraVenta {

    /**
     * Calcula el subtotal de un ítem: precioUnitario * cantidad
     */
    public double calcularSubtotal(Producto producto, int cantidad) {
        if (producto == null || cantidad <= 0) {
            return 0.0;
        }
        return Math.round(producto.getPrecioUnitario() * cantidad * 100.0) / 100.0;
    }

    /**
     * Calcula la suma total de todos los subtotales de la venta.
     */
    public double calcularTotal(List<DetalleVenta> detalles) {
        if (detalles == null || detalles.isEmpty()) {
            return 0.0;
        }
        double total = 0.0;
        for (DetalleVenta d : detalles) {
            total += d.getSubtotal();
        }
        return Math.round(total * 100.0) / 100.0;
    }
}
