package com.vidanatural.model;

import java.time.LocalDateTime;

public class Cliente {
    private int id;
    private String nombre;
    private String apellido;
    private String telefono;
    private String email;
    private boolean recibePromociones;
    private LocalDateTime fechaRegistro;

    public Cliente() {
        this.recibePromociones = true;
        this.fechaRegistro = LocalDateTime.now();
    }

    public Cliente(int id, String nombre, String apellido, String telefono, String email, boolean recibePromociones, LocalDateTime fechaRegistro) {
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.telefono = telefono;
        this.email = email;
        this.recibePromociones = recibePromociones;
        this.fechaRegistro = fechaRegistro;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isRecibePromociones() { return recibePromociones; }
    public void setRecibePromociones(boolean recibePromociones) { this.recibePromociones = recibePromociones; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
