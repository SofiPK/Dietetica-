package com.vidanatural.model;

import java.time.LocalDateTime;

public class Cliente {
    private int id;
    private String dniCuit;
    private String nombre;
    private String apellido;
    private String telefono;
    private String email;
    private boolean aceptaPromociones;
    private boolean activo;
    private LocalDateTime fechaAlta;

    public Cliente() {
        this.aceptaPromociones = true;
        this.activo = true;
        this.fechaAlta = LocalDateTime.now();
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getDniCuit() { return dniCuit; }
    public void setDniCuit(String dniCuit) { this.dniCuit = dniCuit; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isAceptaPromociones() { return aceptaPromociones; }
    public void setAceptaPromociones(boolean aceptaPromociones) { this.aceptaPromociones = aceptaPromociones; }

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaAlta() { return fechaAlta; }
    public void setFechaAlta(LocalDateTime fechaAlta) { this.fechaAlta = fechaAlta; }

    public String getNombreCompleto() {
        return (nombre != null ? nombre : "") + " " + (apellido != null ? apellido : "");
    }
}
