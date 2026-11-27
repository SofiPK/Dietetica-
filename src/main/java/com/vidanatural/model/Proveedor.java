package com.vidanatural.model;

public class Proveedor {
    private int id;
    private String razonSocial;
    private String cuit;
    private String rubro;
    private String telefono;
    private String email;
    private boolean activo;

    public Proveedor() {
        this.activo = true;
    }

    public Proveedor(int id, String razonSocial, String cuit, String rubro, String telefono, String email, boolean activo) {
        this.id = id;
        this.razonSocial = razonSocial;
        this.cuit = cuit;
        this.rubro = rubro;
        this.telefono = telefono;
        this.email = email;
        this.activo = activo;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }

    public String getCuit() { return cuit; }
    public void setCuit(String cuit) { this.cuit = cuit; }

    public String getRubro() { return rubro; }
    public void setRubro(String rubro) { this.rubro = rubro; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
}
