package com.vidanatural.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.vidanatural.dao.ProductoDAO;
import com.vidanatural.dao.VentaDAO;
import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.Producto;
import com.vidanatural.model.Promocion;
import com.vidanatural.model.Venta;

public class GestorVentas {
    private final VentaDAO ventaDAO = new VentaDAO();
    private final ProductoDAO productoDAO = new ProductoDAO();
    private final GestorPromociones gestorPromociones = new GestorPromociones();
    private final CalculadoraVenta calculadora = new CalculadoraVenta();

    public boolean registrarVenta(Venta venta) throws Exception {
        if (venta == null || venta.getDetalles() == null || venta.getDetalles().isEmpty()) {
            throw new Exception("La venta debe contener al menos un producto.");
        }

        for (DetalleVenta d : venta.getDetalles()) {
            Producto prod = productoDAO.buscarPorCodigo(d.getProductoCodigo());
            if (prod == null) {
                throw new Exception("El producto " + d.getProductoCodigo() + " no existe.");
            }
            if (d.getCantidad() <= 0) {
                throw new Exception("La cantidad debe ser mayor a 0 para " + prod.getDescripcion());
            }

            Promocion promo = gestorPromociones.obtenerVigenteParaProducto(prod.getCodigo());
            d.setProducto(prod);
            d.aplicarPromocion(promo, prod.getPrecioUnitario());
        }

        venta.setImporteTotal(calculadora.calcularTotal(venta.getDetalles()));
        venta.setDescuentoTotal(calculadora.calcularDescuentoTotal(venta.getDetalles()));

        return ventaDAO.registrarVenta(venta);
    }

    public double calcularRecaudado(LocalDate desde, LocalDate hasta) {
        return ventaDAO.calcularRecaudado(desde, hasta);
    }

    public Map<String, Object> obtenerReporteRecaudacion(LocalDate desde, LocalDate hasta) {
        return ventaDAO.obtenerReporteRecaudacion(desde, hasta);
    }

    public List<Venta> listarVentas() {
        return ventaDAO.listarVentas();
    }
}
