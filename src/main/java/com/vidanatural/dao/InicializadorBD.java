package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
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

            // 2. Crear Tablas, Migrar Columnas e Insertar Datos
            try (Connection conn = DriverManager.getConnection(URL_DB, USUARIO, CONTRASENA);
                 Statement stmt = conn.createStatement()) {

                // 1. Tabla usuario
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

                // 2. Tabla producto
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

                // 3. Tabla cliente
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS cliente (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  dni_cuit VARCHAR(20) NULL," +
                    "  nombre VARCHAR(100) NOT NULL," +
                    "  apellido VARCHAR(100) NOT NULL," +
                    "  telefono VARCHAR(30) NULL," +
                    "  email VARCHAR(120) NULL," +
                    "  acepta_promociones TINYINT(1) NOT NULL DEFAULT 1," +
                    "  activo TINYINT(1) NOT NULL DEFAULT 1," +
                    "  fecha_alta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  PRIMARY KEY (id)," +
                    "  UNIQUE KEY uq_cliente_dni_cuit (dni_cuit)" +
                    ") ENGINE=InnoDB;"
                );

                // 4. Tabla promocion
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS promocion (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  nombre VARCHAR(100) NOT NULL," +
                    "  tipo_descuento ENUM('PORCENTAJE', 'MONTO_FIJO') NOT NULL," +
                    "  valor DECIMAL(10,2) NOT NULL," +
                    "  vigencia_desde DATE NOT NULL," +
                    "  vigencia_hasta DATE NOT NULL," +
                    "  activa TINYINT(1) NOT NULL DEFAULT 1," +
                    "  PRIMARY KEY (id)" +
                    ") ENGINE=InnoDB;"
                );

                // 5. Tabla promocion_producto (N:N)
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS promocion_producto (" +
                    "  promocion_id INT NOT NULL," +
                    "  producto_codigo VARCHAR(30) NOT NULL," +
                    "  PRIMARY KEY (promocion_id, producto_codigo)," +
                    "  FOREIGN KEY (promocion_id) REFERENCES promocion(id) ON DELETE CASCADE," +
                    "  FOREIGN KEY (producto_codigo) REFERENCES producto(codigo) ON DELETE CASCADE" +
                    ") ENGINE=InnoDB;"
                );

                // 6. Tabla caja
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS caja (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  usuario_apertura_id INT NOT NULL," +
                    "  usuario_cierre_id INT NULL," +
                    "  fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  fecha_cierre DATETIME NULL," +
                    "  monto_inicial DECIMAL(10,2) NOT NULL," +
                    "  monto_esperado DECIMAL(10,2) NULL," +
                    "  monto_final_real DECIMAL(10,2) NULL," +
                    "  diferencia DECIMAL(10,2) NULL," +
                    "  estado ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA'," +
                    "  observaciones VARCHAR(255) NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (usuario_apertura_id) REFERENCES usuario(id)," +
                    "  FOREIGN KEY (usuario_cierre_id) REFERENCES usuario(id)" +
                    ") ENGINE=InnoDB;"
                );

                // 7. Tabla venta
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS venta (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  importe_total DECIMAL(10,2) NOT NULL DEFAULT 0.00," +
                    "  descuento_total DECIMAL(10,2) NOT NULL DEFAULT 0.00," +
                    "  medio_pago ENUM('EFECTIVO', 'TRANSFERENCIA', 'DEBITO_CREDITO') NOT NULL DEFAULT 'EFECTIVO'," +
                    "  estado VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADA'," +
                    "  usuario_id INT NOT NULL," +
                    "  cliente_id INT NULL," +
                    "  caja_id INT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (usuario_id) REFERENCES usuario(id)," +
                    "  FOREIGN KEY (cliente_id) REFERENCES cliente(id)," +
                    "  FOREIGN KEY (caja_id) REFERENCES caja(id)" +
                    ") ENGINE=InnoDB;"
                );

                // Migración segura si la tabla 'venta' ya existía de una versión anterior
                agregarColumnaSiNoExiste(conn, "venta", "descuento_total", "DECIMAL(10,2) NOT NULL DEFAULT 0.00");
                agregarColumnaSiNoExiste(conn, "venta", "medio_pago", "ENUM('EFECTIVO', 'TRANSFERENCIA', 'DEBITO_CREDITO') NOT NULL DEFAULT 'EFECTIVO'");
                agregarColumnaSiNoExiste(conn, "venta", "cliente_id", "INT NULL");
                agregarColumnaSiNoExiste(conn, "venta", "caja_id", "INT NULL");

                // 8. Tabla detalle_venta
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS detalle_venta (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  venta_id INT NOT NULL," +
                    "  producto_codigo VARCHAR(30) NOT NULL," +
                    "  promocion_id INT NULL," +
                    "  cantidad INT NOT NULL," +
                    "  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00," +
                    "  descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00," +
                    "  subtotal DECIMAL(10,2) NOT NULL," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (venta_id) REFERENCES venta(id)," +
                    "  FOREIGN KEY (producto_codigo) REFERENCES producto(codigo)," +
                    "  FOREIGN KEY (promocion_id) REFERENCES promocion(id)" +
                    ") ENGINE=InnoDB;"
                );

                // Migración segura si la tabla 'detalle_venta' ya existía
                agregarColumnaSiNoExiste(conn, "detalle_venta", "promocion_id", "INT NULL");
                agregarColumnaSiNoExiste(conn, "detalle_venta", "precio_unitario", "DECIMAL(10,2) NOT NULL DEFAULT 0.00");
                agregarColumnaSiNoExiste(conn, "detalle_venta", "descuento_aplicado", "DECIMAL(10,2) NOT NULL DEFAULT 0.00");

                // 9. Tabla movimiento_caja
                stmt.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS movimiento_caja (" +
                    "  id INT NOT NULL AUTO_INCREMENT," +
                    "  caja_id INT NOT NULL," +
                    "  venta_id INT NULL," +
                    "  usuario_id INT NOT NULL," +
                    "  tipo ENUM('VENTA', 'INGRESO_MANUAL', 'EGRESO_MANUAL') NOT NULL," +
                    "  concepto VARCHAR(150) NOT NULL," +
                    "  monto DECIMAL(10,2) NOT NULL," +
                    "  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "  PRIMARY KEY (id)," +
                    "  FOREIGN KEY (caja_id) REFERENCES caja(id)," +
                    "  FOREIGN KEY (venta_id) REFERENCES venta(id)," +
                    "  FOREIGN KEY (usuario_id) REFERENCES usuario(id)" +
                    ") ENGINE=InnoDB;"
                );

                // ============================================================
                // DATOS INICIALES (MOCKS DE PRUEBA)
                // ============================================================
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

                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM cliente;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO cliente (dni_cuit, nombre, apellido, telefono, email, acepta_promociones, activo) VALUES " +
                            "('30123456', 'María', 'López', '2914112233', 'maria.lopez@email.com', 1, 1)," +
                            "('27987654', 'Carlos', 'Pérez', '2915445566', 'carlos.perez@email.com', 1, 1);"
                        );
                        System.out.println("Clientes de prueba cargados.");
                    }
                }

                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM promocion;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO promocion (nombre, tipo_descuento, valor, vigencia_desde, vigencia_hasta, activa) VALUES " +
                            "('Semana de Cereales 15% OFF', 'PORCENTAJE', 15.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1)," +
                            "('Bono Suplemento Proteico -$1500', 'MONTO_FIJO', 1500.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 1);"
                        );
                        stmt.executeUpdate(
                            "INSERT INTO promocion_producto (promocion_id, producto_codigo) VALUES " +
                            "(1, 'AV001'), (1, 'AV002'), (2, 'SU001');"
                        );
                        System.out.println("Promociones de prueba cargadas.");
                    }
                }

                try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM caja;")) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        stmt.executeUpdate(
                            "INSERT INTO caja (usuario_apertura_id, fecha_apertura, monto_inicial, estado, observaciones) VALUES " +
                            "(1, NOW(), 10000.00, 'ABIERTA', 'Caja inicial del turno');"
                        );
                        System.out.println("Caja inicial abierta.");
                    }
                }

                System.out.println("Base de datos 'vida_natural' verificada y lista.");
            }

        } catch (Exception e) {
            System.err.println("Advertencia al inicializar BD: " + e.getMessage());
        }
    }

    private static void agregarColumnaSiNoExiste(Connection conn, String tabla, String columna, String definicion) throws SQLException {
        DatabaseMetaData meta = conn.getMetaData();
        try (ResultSet rs = meta.getColumns("vida_natural", null, tabla, columna)) {
            if (!rs.next()) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.executeUpdate("ALTER TABLE " + tabla + " ADD COLUMN " + columna + " " + definicion + ";");
                }
            }
        }
    }
}
