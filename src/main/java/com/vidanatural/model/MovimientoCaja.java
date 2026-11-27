package com.vidanatural.model;

import java.time.LocalDateTime;

public class MovimientoCaja {
    private int id;
    private int cajaId;
    private Integer ventaId;
    private int usuarioId;
    private TipoMovimientoCaja tipo;
    private String concepto;
    private double monto;
    private LocalDateTime fechaHora;

    public MovimientoCaja() {
        this.fechaHora = LocalDateTime.now();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getCajaId() { return cajaId; }
    public void setCajaId(int cajaId) { this.cajaId = cajaId; }

    public Integer getVentaId() { return ventaId; }
    public void setVentaId(Integer ventaId) { this.ventaId = ventaId; }

    public int getUsuarioId() { return usuarioId; }
    public void setUsuarioId(int usuarioId) { this.usuarioId = usuarioId; }

    public TipoMovimientoCaja getTipo() { return tipo; }
    public void setTipo(TipoMovimientoCaja tipo) { this.tipo = tipo; }

    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }

    public double getMonto() { return monto; }
    public void setMonto(double monto) { this.monto = monto; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
}
