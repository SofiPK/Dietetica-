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
                stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS vida_natural CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;");
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
                    ");"
                );

                // Tabla producto
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS producto (" +
                    "  codigo VARCHAR(20) NOT NULL," +
                    "  descripcion VARCHAR(200) NOT NULL," +
                    "  categoria ENUM('CEREAL','SEMILLA','FRUTO_SECO','LEGUMBRE','SUPLEMENTO','OTRO') NOT NULL DEFAULT 'OTRO'," +
                    "  precio_unitario DECIMAL(10,2) NOT NULL," +
                    "  stock_actual INT NOT NULL DEFAULT 0," +
                    "  stock_minimo INT NOT NULL DEFAULT 0," +
                    "  activo TINYINT(1) NOT NULL DEFAULT 1," +
                    "  PRIMARY KEY (codigo)" +
                    ");"
                );

                // Tabla venta
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS venta (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  importe_total DECIMAL(10,2) NOT NULL DEFAULT 0.00," +
                    "  estado ENUM('PENDIENTE', 'CONFIRMADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE'," +
                    "  usuario_id INT NOT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (usuario_id) REFERENCES usuario(id)" +
                    ");"
                );

                // Tabla detalle_venta
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS detalle_venta (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  venta_id INT NOT NULL," +
                    "  producto_codigo VARCHAR(20) NOT NULL," +
                    "  cantidad INT NOT NULL," +
                    "  subtotal DECIMAL(10,2) NOT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (venta_id) REFERENCES venta(id)," +
                    "  FOREIGN KEY (producto_codigo) REFERENCES producto(codigo)" +
                    ");"
                );

                // Tabla cliente (para promociones y fidelización)
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS cliente (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  nombre VARCHAR(100) NOT NULL," +
                    "  apellido VARCHAR(100) NOT NULL," +
                    "  telefono VARCHAR(50) NOT NULL," +
                    "  email VARCHAR(150)," +
                    "  recibe_promociones TINYINT(1) NOT NULL DEFAULT 1," +
                    "  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  PRIMARY KEY (id)" +
                    ");"
                );

                // Tabla proveedor
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS proveedor (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  razon_social VARCHAR(150) NOT NULL," +
                    "  cuit VARCHAR(20) NOT NULL," +
                    "  rubro VARCHAR(100) NOT NULL," +
                    "  telefono VARCHAR(50) NOT NULL," +
                    "  email VARCHAR(150)," +
                    "  activo TINYINT(1) NOT NULL DEFAULT 1," +
                    "  PRIMARY KEY (id)" +
                    ");"
                );

                // Tabla caja_movimiento (gestión de caja, ingresos por ventas y egresos por pagos)
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS caja_movimiento (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  tipo ENUM('INGRESO_VENTA', 'INGRESO_MANUAL', 'EGRESO_PROVEEDOR', 'EGRESO_IMPUESTOS', 'EGRESO_GASTOS') NOT NULL," +
                    "  concepto VARCHAR(250) NOT NULL," +
                    "  monto DECIMAL(10,2) NOT NULL," +
                    "  usuario_id INT NOT NULL," +
                    "  venta_id INT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (usuario_id) REFERENCES usuario(id)" +
                    ");"
                );

                // Insertar usuarios de prueba si no existen
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM usuario;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO usuario (nombre_usuario, nombre, apellido, contrasena, perfil) VALUES " +
                            "('admin01', 'Juan', 'García', 'admin123', 'ADMINISTRATIVO')," +
                            "('gerente', 'María', 'López', 'gerente123', 'GERENTE');"
                        );
                        System.out.println("✅ Usuarios de prueba creados.");
                    }
                }

                // Insertar productos de prueba si no existen
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM producto;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO producto (codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo) VALUES " +
                            "('AV001', 'Avena arrollada 500g', 'CEREAL', 1200.00, 50, 10)," +
                            "('QN001', 'Quinoa blanca 500g', 'CEREAL', 2500.00, 30, 5)," +
                            "('AL001', 'Almendras crudas 250g', 'FRUTO_SECO', 3800.00, 20, 5)," +
                            "('LE001', 'Lentejas verdes 500g', 'LEGUMBRE', 950.00, 40, 10)," +
                            "('CH001', 'Chía 250g', 'SEMILLA', 1500.00, 35, 8)," +
                            "('SP001', 'Spirulina en polvo 100g', 'SUPLEMENTO', 4200.00, 15, 3);"
                        );
                        System.out.println("✅ Productos de prueba cargados.");
                    }
                }

                // Insertar clientes de prueba si no existen
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM cliente;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO cliente (nombre, apellido, telefono, email, recibe_promociones) VALUES " +
                            "('Laura', 'Fernández', '11-4567-8901', 'laura.fernandez@gmail.com', 1)," +
                            "('Martín', 'Benítez', '11-8899-2233', 'mbenitez@hotmail.com', 1)," +
                            "('Lucía', 'Gómez', '11-3322-1144', 'lucia.gomez@gmail.com', 0);"
                        );
                        System.out.println("✅ Clientes de prueba creados.");
                    }
                }

                // Insertar proveedores de prueba si no existen
                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM proveedor;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO proveedor (razon_social, cuit, rubro, telefono, email, activo) VALUES " +
                            "('Distribuidora Cuyo S.A.', '30-71123456-8', 'FRUTOS SECOS Y SEMILLAS', '011-4899-1000', 'ventas@distribuidoracuyo.com.ar', 1)," +
                            "('Molinos del Sur S.R.L.', '30-65987412-3', 'CEREALES Y LEGUMBRES', '0291-455-8899', 'contacto@molinosdelsur.com.ar', 1);"
                        );
                        System.out.println("✅ Proveedores de prueba cargados.");
                    }
                }

                System.out.println("✅ Base de datos 'vida_natural' verificada y lista.");
            }

        } catch (Exception e) {
            System.err.println("Advertencia al inicializar BD: " + e.getMessage());
        }
    }
}
