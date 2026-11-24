package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Se asegura de que la base de datos 'vida_natural', sus tablas y datos iniciales existan.
 * Se ejecuta automáticamente al arrancar la aplicación para evitar errores manuales.
 */
public class InicializadorBD {

    private static final String URL_BASE = "jdbc:mysql://localhost:3306/?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String URL_DB = "jdbc:mysql://localhost:3306/vida_natural?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String USUARIO = "root";
    private static final String CONTRASENA = "12345678";

    public static void inicializar() {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");

            // 1. Crear Base de Datos si no existe
            try (Connection conn = DriverManager.getConnection(URL_BASE, USUARIO, CONTRASENA);
                 Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS vida_natural CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
            }

            // 2. Crear Tablas e Insertar Datos
            try (Connection conn = DriverManager.getConnection(URL_DB, USUARIO, CONTRASENA);
                 Statement stmt = conn.createStatement()) {

                // Tabla usuario
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS usuario (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  nombre_usuario VARCHAR(50) NOT NULL," +
                    "  nombre VARCHAR(100) NOT NULL," +
                    "  apellido VARCHAR(100) NOT NULL," +
                    "  contrasena VARCHAR(255) NOT NULL," +
                    "  perfil ENUM('ADMINISTRATIVO', 'GERENTE') NOT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  UNIQUE KEY uq_nombre_usuario (nombre_usuario)" +
                    ") ENGINE=InnoDB;"
                );

                // Tabla producto
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS producto (" +
                    "  codigo VARCHAR(30) NOT NULL," +
                    "  descripcion VARCHAR(200) NOT NULL," +
                    "  categoria VARCHAR(40) NOT NULL DEFAULT 'OTRO'," +
                    "  precio_unitario DECIMAL(10,2) NOT NULL," +
                    "  stock_actual INT NOT NULL DEFAULT 0," +
                    "  stock_minimo INT NOT NULL DEFAULT 0," +
                    "  activo TINYINT(1) NOT NULL DEFAULT 1," +
                    "  PRIMARY KEY (codigo)" +
                    ") ENGINE=InnoDB;"
                );

                // Tabla venta
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS venta (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  importe_total DECIMAL(10,2) NOT NULL DEFAULT 0.00," +
                    "  estado VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADA'," +
                    "  usuario_id INT NOT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (usuario_id) REFERENCES usuario(id)" +
                    ") ENGINE=InnoDB;"
                );

                // Tabla detalle_venta
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS detalle_venta (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  venta_id INT NOT NULL," +
                    "  producto_codigo VARCHAR(30) NOT NULL," +
                    "  cantidad INT NOT NULL," +
                    "  subtotal DECIMAL(10,2) NOT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (venta_id) REFERENCES venta(id)," +
                    "  FOREIGN KEY (producto_codigo) REFERENCES producto(codigo)" +
                    ") ENGINE=InnoDB;"
                );

                // Insertar usuarios de prueba si no existen
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM usuario;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO usuario (nombre_usuario, nombre, apellido, contrasena, perfil) VALUES " +
                            "('admin01', 'Juan', 'García', 'admin123', 'ADMINISTRATIVO')," +
                            "('gerente', 'Laura', 'Fernández', 'gerente123', 'GERENTE');"
                        );
                        System.out.println("Usuarios de prueba creados.");
                    }
                }

                // Insertar productos de prueba si no existen
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM producto;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO producto (codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo, activo) VALUES " +
                            "('AV001', 'Avena arrollada tradicional 500g', 'CEREAL', 1200.00, 45, 10, 1)," +
                            "('AV002', 'Avena instantánea orgánica 500g', 'CEREAL', 1450.00, 8, 12, 1)," +
                            "('SE001', 'Semillas de chía x 250g', 'SEMILLA', 1800.00, 30, 8, 1)," +
                            "('SE002', 'Semillas de lino dorado x 250g', 'SEMILLA', 1350.00, 5, 10, 1)," +
                            "('FS001', 'Nueces mariposa extra light x 250g', 'FRUTO_SECO', 3900.00, 22, 6, 1)," +
                            "('FS002', 'Almendras non parell x 250g', 'FRUTO_SECO', 4500.00, 4, 8, 1)," +
                            "('LE001', 'Lentejas turcas x 500g', 'LEGUMBRE', 1600.00, 35, 10, 1)," +
                            "('SU001', 'Proteína vegetal arveja y arroz 500g', 'SUPLEMENTO', 12500.00, 12, 5, 1);"
                        );
                        System.out.println("Productos de prueba cargados.");
                    }
                }

                System.out.println("Base de datos 'vida_natural' verificada y lista.");
            }

        } catch (Exception e) {
            System.err.println("Advertencia al inicializar BD: " + e.getMessage());
        }
    }
}
