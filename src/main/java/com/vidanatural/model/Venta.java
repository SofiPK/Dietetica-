package com.vidanatural.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Venta {
    private int id;
    private LocalDateTime fecha;
    private double importeTotal;
    private EstadoVenta estado;
    private int usuarioId;
    private List<DetalleVenta> detalles;

    public Venta() {
        this.fecha = LocalDateTime.now();
        this.estado = EstadoVenta.PENDIENTE;
        this.detalles = new ArrayList<>();
        this.importeTotal = 0.0;
    }

    public Venta(int id, LocalDateTime fecha, double importeTotal, EstadoVenta estado, int usuarioId) {
        this.id = id;
        this.fecha = fecha;
        this.importeTotal = importeTotal;
        this.estado = estado;
        this.usuarioId = usuarioId;
        this.detalles = new ArrayList<>();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public double getImporteTotal() { return importeTotal; }
    public void setImporteTotal(double importeTotal) { this.importeTotal = importeTotal; }

    public EstadoVenta getEstado() { return estado; }
    public void setEstado(EstadoVenta estado) { this.estado = estado; }

    public int getUsuarioId() { return usuarioId; }
    public void setUsuarioId(int usuarioId) { this.usuarioId = usuarioId; }

    public List<DetalleVenta> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleVenta> detalles) { this.detalles = detalles; }

    public void agregarDetalle(DetalleVenta detalle) {
        this.detalles.add(detalle);
        calcularTotal();
    }

    public double calcularTotal() {
        double total = 0.0;
        for (DetalleVenta d : detalles) {
            total += d.getSubtotal();
        }
        this.importeTotal = Math.round(total * 100.0) / 100.0;
        return this.importeTotal;
    }
}
