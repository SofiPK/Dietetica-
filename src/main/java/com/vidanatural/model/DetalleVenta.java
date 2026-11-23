package com.vidanatural.model;

public class DetalleVenta {
    private int id;
    private int ventaId;
    private String productoCodigo;
    private Producto producto; // Referencia opcional para interfaz/reportes
    private int cantidad;
    private double subtotal;

    public DetalleVenta() {}

    public DetalleVenta(String productoCodigo, int cantidad, double precioUnitario) {
        this.productoCodigo = productoCodigo;
        this.cantidad = cantidad;
        this.subtotal = Math.round(cantidad * precioUnitario * 100.0) / 100.0;
    }

    public DetalleVenta(int id, int ventaId, String productoCodigo, int cantidad, double subtotal) {
        this.id = id;
        this.ventaId = ventaId;
        this.productoCodigo = productoCodigo;
        this.cantidad = cantidad;
        this.subtotal = subtotal;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getVentaId() { return ventaId; }
    public void setVentaId(int ventaId) { this.ventaId = ventaId; }

    public String getProductoCodigo() { return productoCodigo; }
    public void setProductoCodigo(String productoCodigo) { this.productoCodigo = productoCodigo; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }

    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }

    public double calcularSubtotal(double precioUnitario) {
        this.subtotal = Math.round(this.cantidad * precioUnitario * 100.0) / 100.0;
        return this.subtotal;
    }
}
