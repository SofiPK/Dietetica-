package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Gestiona la conexión a la base de datos MySQL 'vida_natural'.
 */
public class ConexionBD {
    // Parámetros de conexión local
    private static final String URL = "jdbc:mysql://localhost:3306/vida_natural?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String USUARIO = "root";
    
    // Contraseña real obtenida de MySQL Workbench
    private static final String CONTRASENA = "12345678"; 

    /**
     * Obtiene una nueva conexión a la base de datos.
     * @return Connection objeto de conexión activo
     * @throws SQLException Si falla la conexión
     */
    public static Connection getConexion() throws SQLException {
        try {
            // Carga dinámica del driver de MySQL
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("Error: Driver MySQL no encontrado en el classpath.");
        }
        return DriverManager.getConnection(URL, USUARIO, CONTRASENA);
    }
}
