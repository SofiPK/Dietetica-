-- ============================================================
--  DIETÉTICA VIDA NATURAL — Script de Base de Datos
--  Motor: MySQL 8.0
--  Charset: UTF-8
-- ============================================================

CREATE DATABASE IF NOT EXISTS vida_natural
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_spanish_ci;

USE vida_natural;

-- ============================================================
--  TABLA: usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS usuario (
    id              INT             NOT NULL AUTO_INCREMENT,
    nombre_usuario  VARCHAR(50)     NOT NULL,
    nombre          VARCHAR(100)    NOT NULL,
    apellido        VARCHAR(100)    NOT NULL,
    contrasena      VARCHAR(255)    NOT NULL,
    perfil          ENUM('ADMINISTRATIVO', 'GERENTE') NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_nombre_usuario (nombre_usuario)
);

-- ============================================================
--  TABLA: producto
-- ============================================================
CREATE TABLE IF NOT EXISTS producto (
    codigo          VARCHAR(20)     NOT NULL,
    descripcion     VARCHAR(200)    NOT NULL,
    categoria       ENUM(
                        'CEREAL',
                        'SEMILLA',
                        'FRUTO_SECO',
                        'LEGUMBRE',
                        'SUPLEMENTO',
                        'OTRO'
                    )               NOT NULL DEFAULT 'OTRO',
    precio_unitario DECIMAL(10,2)   NOT NULL,
    stock_actual    INT             NOT NULL DEFAULT 0,
    stock_minimo    INT             NOT NULL DEFAULT 0,
    activo          TINYINT(1)      NOT NULL DEFAULT 1,

    PRIMARY KEY (codigo),
    CONSTRAINT chk_precio       CHECK (precio_unitario >= 0),
    CONSTRAINT chk_stock_actual CHECK (stock_actual    >= 0),
    CONSTRAINT chk_stock_minimo CHECK (stock_minimo    >= 0)
);

-- ============================================================
--  TABLA: venta
-- ============================================================
CREATE TABLE IF NOT EXISTS venta (
    id              INT             NOT NULL AUTO_INCREMENT,
    fecha           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    importe_total   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    estado          ENUM('PENDIENTE', 'CONFIRMADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    usuario_id      INT             NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_venta_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

-- ============================================================
--  TABLA: detalle_venta
-- ============================================================
CREATE TABLE IF NOT EXISTS detalle_venta (
    id                  INT             NOT NULL AUTO_INCREMENT,
    venta_id            INT             NOT NULL,
    producto_codigo     VARCHAR(20)     NOT NULL,
    cantidad            INT             NOT NULL,
    subtotal            DECIMAL(10,2)   NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_detalle_venta
        FOREIGN KEY (venta_id)        REFERENCES venta(id),
    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (producto_codigo) REFERENCES producto(codigo),
    CONSTRAINT chk_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_subtotal CHECK (subtotal >= 0)
);

-- ============================================================
--  TABLA: cliente (promociones y fidelización)
-- ============================================================
CREATE TABLE IF NOT EXISTS cliente (
    id                  INT             NOT NULL AUTO_INCREMENT,
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    telefono            VARCHAR(50)     NOT NULL,
    email               VARCHAR(150),
    recibe_promociones  TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_registro      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ============================================================
--  TABLA: proveedor
-- ============================================================
CREATE TABLE IF NOT EXISTS proveedor (
    id                  INT             NOT NULL AUTO_INCREMENT,
    razon_social        VARCHAR(150)    NOT NULL,
    cuit                VARCHAR(20)     NOT NULL,
    rubro               VARCHAR(100)    NOT NULL,
    telefono            VARCHAR(50)     NOT NULL,
    email               VARCHAR(150),
    activo              TINYINT(1)      NOT NULL DEFAULT 1,

    PRIMARY KEY (id)
);

-- ============================================================
--  TABLA: caja_movimiento (tesorería, ingresos y egresos)
-- ============================================================
CREATE TABLE IF NOT EXISTS caja_movimiento (
    id                  INT             NOT NULL AUTO_INCREMENT,
    fecha               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo                ENUM(
                            'INGRESO_VENTA',
                            'INGRESO_MANUAL',
                            'EGRESO_PROVEEDOR',
                            'EGRESO_IMPUESTOS',
                            'EGRESO_GASTOS'
                        )               NOT NULL,
    concepto            VARCHAR(250)    NOT NULL,
    monto               DECIMAL(10,2)   NOT NULL,
    usuario_id          INT             NOT NULL,
    venta_id            INT             NULL,

    PRIMARY KEY (id),
    CONSTRAINT fk_caja_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    CONSTRAINT fk_caja_venta
        FOREIGN KEY (venta_id)   REFERENCES venta(id)
);

-- ============================================================
--  DATOS INICIALES
-- ============================================================

-- Usuarios por defecto (contraseña: "admin123" y "gerente123")
-- ⚠ En producción usar contraseñas hasheadas con BCrypt
INSERT INTO usuario (nombre_usuario, nombre, apellido, contrasena, perfil) VALUES
    ('admin01',  'Juan',  'García', 'admin123',   'ADMINISTRATIVO'),
    ('gerente',  'María', 'López',  'gerente123', 'GERENTE');

-- Productos de ejemplo
INSERT INTO producto (codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo) VALUES
    ('AV001', 'Avena arrollada 500g',       'CEREAL',    1200.00, 50, 10),
    ('QN001', 'Quinoa blanca 500g',         'CEREAL',    2500.00, 30,  5),
    ('AL001', 'Almendras crudas 250g',      'FRUTO_SECO',3800.00, 20,  5),
    ('LE001', 'Lentejas verdes 500g',       'LEGUMBRE',   950.00, 40, 10),
    ('CH001', 'Chía 250g',                  'SEMILLA',   1500.00, 35,  8),
    ('SP001', 'Spirulina en polvo 100g',    'SUPLEMENTO',4200.00, 15,  3);
