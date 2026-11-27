package com.vidanatural.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Venta {
    private int id;
    private LocalDateTime fecha;
    private double importeTotal;
    private double descuentoTotal;
    private MedioPago medioPago;
    private EstadoVenta estado;
    private int usuarioId;
    private Integer clienteId; // Nullable: null = Consumidor Final sin registrar
    private Integer cajaId;    // Nullable: caja en la que se registró
    private List<DetalleVenta> detalles;

    public Venta() {
        this.fecha = LocalDateTime.now();
        this.estado = EstadoVenta.PENDIENTE;
        this.medioPago = MedioPago.EFECTIVO;
        this.detalles = new ArrayList<>();
        this.importeTotal = 0.0;
        this.descuentoTotal = 0.0;
    }

    public Venta(int id, LocalDateTime fecha, double importeTotal, EstadoVenta estado, int usuarioId) {
        this();
        this.id = id;
        this.fecha = fecha;
        this.importeTotal = importeTotal;
        this.estado = estado;
        this.usuarioId = usuarioId;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public double getImporteTotal() { return importeTotal; }
    public void setImporteTotal(double importeTotal) { this.importeTotal = importeTotal; }

    public double getDescuentoTotal() { return descuentoTotal; }
    public void setDescuentoTotal(double descuentoTotal) { this.descuentoTotal = descuentoTotal; }

    public MedioPago getMedioPago() { return medioPago; }
    public void setMedioPago(MedioPago medioPago) { this.medioPago = medioPago; }

    public EstadoVenta getEstado() { return estado; }
    public void setEstado(EstadoVenta estado) { this.estado = estado; }

    public int getUsuarioId() { return usuarioId; }
    public void setUsuarioId(int usuarioId) { this.usuarioId = usuarioId; }

    public Integer getClienteId() { return clienteId; }
    public void setClienteId(Integer clienteId) { this.clienteId = clienteId; }

    public Integer getCajaId() { return cajaId; }
    public void setCajaId(Integer cajaId) { this.cajaId = cajaId; }

    public List<DetalleVenta> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleVenta> detalles) { this.detalles = detalles; }

    public void agregarDetalle(DetalleVenta detalle) {
        this.detalles.add(detalle);
        calcularTotal();
    }

    public double calcularTotal() {
        double total = 0.0;
        double descTotal = 0.0;
        for (DetalleVenta d : detalles) {
            total += d.getSubtotal();
            descTotal += d.getDescuentoAplicado();
        }
        this.importeTotal = Math.round(total * 100.0) / 100.0;
        this.descuentoTotal = Math.round(descTotal * 100.0) / 100.0;
        return this.importeTotal;
    }
}
