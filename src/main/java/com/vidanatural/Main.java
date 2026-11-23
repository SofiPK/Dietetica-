package com.vidanatural;

import com.vidanatural.dao.InicializadorBD;
import com.vidanatural.server.ServidorWeb;

public class Main {
    public static void main(String[] args) {
        try {
            // Se asegura de crear la base de datos, tablas y datos iniciales automáticamente
            InicializadorBD.inicializar();

            // Inicia el servidor web
            ServidorWeb servidor = new ServidorWeb();
            servidor.iniciar();
        } catch (Exception e) {
            System.err.println("Error al iniciar el sistema: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
