package com.vidanatural.service;

import java.util.List;

import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.Producto;
import com.vidanatural.model.Promocion;

/**
 * Módulo de cálculo para Ventas (siguiendo las buenas prácticas vistas en el ERP).
 * Aísla toda la matemática y reglas numéricas de la venta para que sea 100% testeable.
 */
public class CalculadoraVenta {

    /**
     * Calcula el subtotal bruto de un ítem sin promoción: precioUnitario * cantidad
     */
    public double calcularSubtotal(Producto producto, int cantidad) {
        if (producto == null || cantidad <= 0) {
            return 0.0;
        }
        return Math.round(producto.getPrecioUnitario() * cantidad * 100.0) / 100.0;
    }

    /**
     * Calcula el monto de descuento aplicable según una promoción vigente.
     */
    public double calcularDescuento(Producto producto, int cantidad, Promocion promocion) {
        if (producto == null || cantidad <= 0 || promocion == null) {
            return 0.0;
        }
        return promocion.calcularDescuento(producto.getPrecioUnitario(), cantidad);
    }

    /**
     * Calcula el subtotal neto de un ítem descontando la promoción si corresponde.
     */
    public double calcularSubtotalConPromocion(Producto producto, int cantidad, Promocion promocion) {
        if (producto == null || cantidad <= 0) {
            return 0.0;
        }
        double bruto = calcularSubtotal(producto, cantidad);
        double descuento = calcularDescuento(producto, cantidad, promocion);
        return Math.round((bruto - descuento) * 100.0) / 100.0;
    }

    /**
     * Calcula la suma total neta de todos los subtotales de la venta.
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

    /**
     * Calcula el ahorro total acumulado por promociones en toda la venta.
     */
    public double calcularDescuentoTotal(List<DetalleVenta> detalles) {
        if (detalles == null || detalles.isEmpty()) {
            return 0.0;
        }
        double desc = 0.0;
        for (DetalleVenta d : detalles) {
            desc += d.getDescuentoAplicado();
        }
        return Math.round(desc * 100.0) / 100.0;
    }
}
