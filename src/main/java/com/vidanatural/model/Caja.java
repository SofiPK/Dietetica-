package com.vidanatural.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Caja {
    private int id;
    private int usuarioAperturaId;
    private Integer usuarioCierreId;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private double montoInicial;
    private Double montoEsperado;
    private Double montoFinalReal;
    private Double diferencia;
    private EstadoCaja estado;
    private String observaciones;
    private List<MovimientoCaja> movimientos;

    public Caja() {
        this.estado = EstadoCaja.ABIERTA;
        this.fechaApertura = LocalDateTime.now();
        this.movimientos = new ArrayList<>();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getUsuarioAperturaId() { return usuarioAperturaId; }
    public void setUsuarioAperturaId(int usuarioAperturaId) { this.usuarioAperturaId = usuarioAperturaId; }

    public Integer getUsuarioCierreId() { return usuarioCierreId; }
    public void setUsuarioCierreId(Integer usuarioCierreId) { this.usuarioCierreId = usuarioCierreId; }

    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }

    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }

    public double getMontoInicial() { return montoInicial; }
    public void setMontoInicial(double montoInicial) { this.montoInicial = montoInicial; }

    public Double getMontoEsperado() { return montoEsperado; }
    public void setMontoEsperado(Double montoEsperado) { this.montoEsperado = montoEsperado; }

    public Double getMontoFinalReal() { return montoFinalReal; }
    public void setMontoFinalReal(Double montoFinalReal) { this.montoFinalReal = montoFinalReal; }

    public Double getDiferencia() { return diferencia; }
    public void setDiferencia(Double diferencia) { this.diferencia = diferencia; }

    public EstadoCaja getEstado() { return estado; }
    public void setEstado(EstadoCaja estado) { this.estado = estado; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public List<MovimientoCaja> getMovimientos() { return movimientos; }
    public void setMovimientos(List<MovimientoCaja> movimientos) { this.movimientos = movimientos; }

    public double calcularSaldoActual() {
        double saldo = montoInicial;
        for (MovimientoCaja m : movimientos) {
            if (m.getTipo() == TipoMovimientoCaja.EGRESO_MANUAL) {
                saldo -= m.getMonto();
            } else {
                saldo += m.getMonto();
            }
        }
        return Math.round(saldo * 100.0) / 100.0;
    }
}
