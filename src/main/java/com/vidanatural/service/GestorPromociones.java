package com.vidanatural.service;

import java.time.LocalDate;
import java.util.List;

import com.vidanatural.dao.PromocionDAO;
import com.vidanatural.model.Promocion;
import com.vidanatural.model.TipoDescuento;

public class GestorPromociones {
    private final PromocionDAO promocionDAO = new PromocionDAO();

    public List<Promocion> listarTodas() {
        return promocionDAO.listarTodas();
    }

    public Promocion obtenerVigenteParaProducto(String productoCodigo) {
        if (productoCodigo == null || productoCodigo.isBlank()) return null;
        return promocionDAO.buscarVigenteParaProducto(productoCodigo.trim().toUpperCase(), LocalDate.now());
    }

    public Promocion crear(Promocion promo) throws Exception {
        validar(promo);
        promocionDAO.crear(promo);
        return promo;
    }

    public boolean actualizar(Promocion promo) throws Exception {
        if (promo.getId() <= 0) {
            throw new Exception("ID de promoción inválido.");
        }
        validar(promo);
        return promocionDAO.actualizar(promo);
    }

    public boolean cambiarEstado(int id, boolean activa) throws Exception {
        if (id <= 0) {
            throw new Exception("ID de promoción inválido.");
        }
        return promocionDAO.cambiarEstado(id, activa);
    }

    private void validar(Promocion p) throws Exception {
        if (p == null) throw new Exception("Datos de promoción requeridos.");
        if (p.getNombre() == null || p.getNombre().isBlank()) {
            throw new Exception("El nombre de la promoción es obligatorio.");
        }
        if (p.getTipoDescuento() == null) {
            throw new Exception("El tipo de descuento es obligatorio.");
        }
        if (p.getValor() <= 0) {
            throw new Exception("El valor del descuento debe ser mayor a 0.");
        }
        if (p.getTipoDescuento() == TipoDescuento.PORCENTAJE && p.getValor() > 100) {
            throw new Exception("El descuento porcentual no puede superar el 100%.");
        }
        if (p.getVigenciaDesde() == null || p.getVigenciaHasta() == null) {
            throw new Exception("Las fechas de vigencia son obligatorias.");
        }
        if (p.getVigenciaHasta().isBefore(p.getVigenciaDesde())) {
            throw new Exception("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
        if (p.getProductosCodigos() == null || p.getProductosCodigos().isEmpty()) {
            throw new Exception("Debe asociar al menos un producto a la promoción.");
        }
    }
}
