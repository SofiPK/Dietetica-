package com.vidanatural.model;

public class Producto {
    private String codigo;
    private String descripcion;
    private Categoria categoria;
    private double precioUnitario;
    private int stockActual;
    private int stockMinimo;
    private boolean activo;

    public Producto() {
        this.activo = true;
    }

    public Producto(String codigo, String descripcion, Categoria categoria, double precioUnitario, int stockActual, int stockMinimo, boolean activo) {
        this.codigo = codigo;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.precioUnitario = precioUnitario;
        this.stockActual = stockActual;
        this.stockMinimo = stockMinimo;
        this.activo = activo;
    }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }

    public double getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(double precioUnitario) { this.precioUnitario = precioUnitario; }

    public int getStockActual() { return stockActual; }
    public void setStockActual(int stockActual) { this.stockActual = stockActual; }

    public int getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(int stockMinimo) { this.stockMinimo = stockMinimo; }

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

    /**
     * Regla de Negocio: Verifica si hay stock disponible para vender la cantidad solicitada.
     */
    public boolean tieneStockSuficiente(int cantidad) {
        return this.stockActual >= cantidad;
    }

    /**
     * Descuenta del stock la cantidad vendida.
     */
    public void descontarStock(int cantidad) {
        this.stockActual -= cantidad;
    }

    /**
     * Reingresa stock (por ejemplo en cancelaciones).
     */
    public void incrementarStock(int cantidad) {
        this.stockActual += cantidad;
    }

    /**
     * Regla de Negocio (Requerimiento d / Gerente):
     * Verifica si el stock actual es inferior o igual al mínimo permitido.
     */
    public boolean estaBajoStockMinimo() {
        return this.stockActual <= this.stockMinimo;
    }
}
