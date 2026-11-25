package com.vidanatural.service;

import java.time.LocalDate;
import java.util.List;

import com.vidanatural.dao.CajaDAO;
import com.vidanatural.model.Caja;
import com.vidanatural.model.TipoMovimientoCaja;

public class GestorCaja {
    private final CajaDAO cajaDAO = new CajaDAO();

    public Caja obtenerCajaAbierta() {
        return cajaDAO.obtenerCajaAbierta();
    }

    public Caja abrirCaja(int usuarioId, double montoInicial, String observaciones) throws Exception {
        if (montoInicial < 0) {
            throw new Exception("El monto inicial de caja no puede ser negativo.");
        }
        return cajaDAO.abrirCaja(usuarioId, montoInicial, observaciones);
    }

    public Caja registrarMovimientoManual(int usuarioId, TipoMovimientoCaja tipo, String concepto, double monto) throws Exception {
        if (tipo != TipoMovimientoCaja.INGRESO_MANUAL && tipo != TipoMovimientoCaja.EGRESO_MANUAL) {
            throw new Exception("Tipo de movimiento manual inválido.");
        }
        if (concepto == null || concepto.isBlank()) {
            throw new Exception("El concepto del movimiento es obligatorio.");
        }
        if (monto <= 0) {
            throw new Exception("El monto del movimiento debe ser mayor a 0.");
        }

        Caja abierta = cajaDAO.obtenerCajaAbierta();
        if (abierta == null) {
            throw new Exception("No hay una caja abierta para registrar movimientos.");
        }
        if (tipo == TipoMovimientoCaja.EGRESO_MANUAL && monto > abierta.calcularSaldoActual()) {
            throw new Exception("Saldo insuficiente en caja para realizar el egreso.");
        }

        cajaDAO.registrarMovimiento(abierta.getId(), null, usuarioId, tipo, concepto.trim(), monto);
        return cajaDAO.obtenerCajaAbierta();
    }

    public Caja cerrarCaja(int usuarioCierreId, double montoFinalReal, String observaciones) throws Exception {
        if (montoFinalReal < 0) {
            throw new Exception("El monto real contado no puede ser negativo.");
        }
        return cajaDAO.cerrarCaja(usuarioCierreId, montoFinalReal, observaciones);
    }

    public List<Caja> listarHistorialCierres(LocalDate desde, LocalDate hasta) {
        return cajaDAO.listarHistorialCierres(desde, hasta);
    }
}
