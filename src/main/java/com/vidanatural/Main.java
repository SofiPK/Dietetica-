package com.vidanatural;

import com.vidanatural.server.ServidorWeb;

public class Main {
    public static void main(String[] args) {
        try {
            ServidorWeb servidor = new ServidorWeb();
            servidor.iniciar();
        } catch (Exception e) {
            System.err.println("Error al iniciar el sistema: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
