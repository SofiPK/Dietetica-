package com.vidanatural.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class Promocion {
    private int id;
    private String nombre;
    private TipoDescuento tipoDescuento;
    private double valor;
    private LocalDate vigenciaDesde;
    private LocalDate vigenciaHasta;
    private boolean activa;
    private List<String> productosCodigos;

    public Promocion() {
        this.activa = true;
        this.productosCodigos = new ArrayList<>();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public TipoDescuento getTipoDescuento() { return tipoDescuento; }
    public void setTipoDescuento(TipoDescuento tipoDescuento) { this.tipoDescuento = tipoDescuento; }

    public double getValor() { return valor; }
    public void setValor(double valor) { this.valor = valor; }

    public LocalDate getVigenciaDesde() { return vigenciaDesde; }
    public void setVigenciaDesde(LocalDate vigenciaDesde) { this.vigenciaDesde = vigenciaDesde; }

    public LocalDate getVigenciaHasta() { return vigenciaHasta; }
    public void setVigenciaHasta(LocalDate vigenciaHasta) { this.vigenciaHasta = vigenciaHasta; }

    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }

    public List<String> getProductosCodigos() { return productosCodigos; }
    public void setProductosCodigos(List<String> productosCodigos) { this.productosCodigos = productosCodigos; }

    public boolean estaVigenteEn(LocalDate fecha) {
        if (!activa || vigenciaDesde == null || vigenciaHasta == null) return false;
        return !fecha.isBefore(vigenciaDesde) && !fecha.isAfter(vigenciaHasta);
    }

    public double calcularDescuento(double precioUnitario, int cantidad) {
        double bruto = precioUnitario * cantidad;
        double desc = (tipoDescuento == TipoDescuento.PORCENTAJE)
                ? bruto * (valor / 100.0)
                : valor * cantidad;
        if (desc > bruto) desc = bruto;
        return Math.round(desc * 100.0) / 100.0;
    }
}
