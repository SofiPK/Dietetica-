package com.vidanatural.model;

import java.time.LocalDateTime;

public class CajaMovimiento {
    private int id;
    private LocalDateTime fecha;
    private String tipo; // INGRESO_VENTA, INGRESO_MANUAL, EGRESO_PROVEEDOR, EGRESO_IMPUESTOS, EGRESO_GASTOS
    private String concepto;
    private double monto;
    private int usuarioId;
    private Integer ventaId;

    public CajaMovimiento() {
        this.fecha = LocalDateTime.now();
    }

    public CajaMovimiento(int id, LocalDateTime fecha, String tipo, String concepto, double monto, int usuarioId, Integer ventaId) {
        this.id = id;
        this.fecha = fecha;
        this.tipo = tipo;
        this.concepto = concepto;
        this.monto = monto;
        this.usuarioId = usuarioId;
        this.ventaId = ventaId;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }

    public double getMonto() { return monto; }
    public void setMonto(double monto) { this.monto = monto; }

    public int getUsuarioId() { return usuarioId; }
    public void setUsuarioId(int usuarioId) { this.usuarioId = usuarioId; }

    public Integer getVentaId() { return ventaId; }
    public void setVentaId(Integer ventaId) { this.ventaId = ventaId; }

    public boolean esIngreso() {
        return tipo != null && tipo.startsWith("INGRESO");
    }
}
