DROP DATABASE IF EXISTS vida_natural;

CREATE DATABASE vida_natural
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE vida_natural;

-- ============================================================
-- 1. TABLA: usuario
-- ============================================================
CREATE TABLE usuario (
    id              INT             NOT NULL AUTO_INCREMENT,
    nombre_usuario  VARCHAR(50)     NOT NULL,
    nombre          VARCHAR(100)    NOT NULL,
    apellido        VARCHAR(100)    NOT NULL,
    contrasena      VARCHAR(255)    NOT NULL,
    perfil          ENUM('ADMINISTRATIVO', 'GERENTE') NOT NULL,
    activo          TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_nombre_usuario (nombre_usuario)
) ENGINE=InnoDB;

-- ============================================================
-- 2. TABLA: producto
-- ============================================================
CREATE TABLE producto (
    codigo          VARCHAR(30)     NOT NULL,
    descripcion     VARCHAR(200)    NOT NULL,
    categoria       VARCHAR(40)     NOT NULL DEFAULT 'OTRO',
    precio_unitario DECIMAL(10,2)   NOT NULL,
    stock_actual    INT             NOT NULL DEFAULT 0,
    stock_minimo    INT             NOT NULL DEFAULT 0,
    activo          TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (codigo),
    CONSTRAINT chk_precio       CHECK (precio_unitario >= 0),
    CONSTRAINT chk_stock_actual CHECK (stock_actual    >= 0),
    CONSTRAINT chk_stock_minimo CHECK (stock_minimo    >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 3. TABLA: cliente (Módulo Clientes)
-- ============================================================
CREATE TABLE cliente (
    id                  INT             NOT NULL AUTO_INCREMENT,
    dni_cuit            VARCHAR(20)     NULL,
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    telefono            VARCHAR(30)     NULL,
    email               VARCHAR(120)    NULL,
    acepta_promociones  TINYINT(1)      NOT NULL DEFAULT 1,
    activo              TINYINT(1)      NOT NULL DEFAULT 1,
    fecha_alta          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cliente_dni_cuit (dni_cuit)
) ENGINE=InnoDB;

-- ============================================================
-- 4. TABLA: promocion (Módulo Promociones)
-- ============================================================
CREATE TABLE promocion (
    id              INT             NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(100)    NOT NULL,
    tipo_descuento  ENUM('PORCENTAJE', 'MONTO_FIJO') NOT NULL,
    valor           DECIMAL(10,2)   NOT NULL,
    vigencia_desde  DATE            NOT NULL,
    vigencia_hasta  DATE            NOT NULL,
    activa          TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT chk_promo_valor  CHECK (valor > 0),
    CONSTRAINT chk_promo_fechas CHECK (vigencia_hasta >= vigencia_desde)
) ENGINE=InnoDB;

-- ============================================================
-- 5. TABLA: promocion_producto (Relación N:N Promoción - Producto)
-- ============================================================
CREATE TABLE promocion_producto (
    promocion_id    INT             NOT NULL,
    producto_codigo VARCHAR(30)     NOT NULL,
    PRIMARY KEY (promocion_id, producto_codigo),
    FOREIGN KEY (promocion_id)    REFERENCES promocion(id)    ON DELETE CASCADE,
    FOREIGN KEY (producto_codigo) REFERENCES producto(codigo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. TABLA: caja (Módulo Caja - Apertura y Cierre)
-- ============================================================
CREATE TABLE caja (
    id                  INT             NOT NULL AUTO_INCREMENT,
    usuario_apertura_id INT             NOT NULL,
    usuario_cierre_id   INT             NULL,
    fecha_apertura      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre        DATETIME        NULL,
    monto_inicial       DECIMAL(10,2)   NOT NULL,
    monto_esperado      DECIMAL(10,2)   NULL,
    monto_final_real    DECIMAL(10,2)   NULL,
    diferencia          DECIMAL(10,2)   NULL,
    estado              ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
    observaciones       VARCHAR(255)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_caja_inicial CHECK (monto_inicial >= 0),
    FOREIGN KEY (usuario_apertura_id) REFERENCES usuario(id),
    FOREIGN KEY (usuario_cierre_id)   REFERENCES usuario(id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. TABLA: venta (Ampliada con cliente, caja y medio de pago)
-- ============================================================
CREATE TABLE venta (
    id                  INT             NOT NULL AUTO_INCREMENT,
    fecha               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    importe_total       DECIMAL(10,2)   NOT NULL,
    descuento_total     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    medio_pago          ENUM('EFECTIVO', 'TRANSFERENCIA', 'DEBITO_CREDITO') NOT NULL DEFAULT 'EFECTIVO',
    estado              VARCHAR(30)     NOT NULL DEFAULT 'CONFIRMADA',
    usuario_id          INT             NOT NULL,
    cliente_id          INT             NULL,
    caja_id             INT             NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (cliente_id) REFERENCES cliente(id),
    FOREIGN KEY (caja_id)    REFERENCES caja(id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. TABLA: detalle_venta (Ampliada con precio histórico y promo)
-- ============================================================
CREATE TABLE detalle_venta (
    id                  INT             NOT NULL AUTO_INCREMENT,
    venta_id            INT             NOT NULL,
    producto_codigo     VARCHAR(30)     NOT NULL,
    promocion_id        INT             NULL,
    cantidad            INT             NOT NULL,
    precio_unitario     DECIMAL(10,2)   NOT NULL,
    descuento_aplicado  DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    subtotal            DECIMAL(10,2)   NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (venta_id)        REFERENCES venta(id),
    FOREIGN KEY (producto_codigo) REFERENCES producto(codigo),
    FOREIGN KEY (promocion_id)    REFERENCES promocion(id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. TABLA: movimiento_caja (Módulo Caja - Ingresos y Egresos)
-- ============================================================
CREATE TABLE movimiento_caja (
    id              INT             NOT NULL AUTO_INCREMENT,
    caja_id         INT             NOT NULL,
    venta_id        INT             NULL,
    usuario_id      INT             NOT NULL,
    tipo            ENUM('VENTA', 'INGRESO_MANUAL', 'EGRESO_MANUAL') NOT NULL,
    concepto        VARCHAR(150)    NOT NULL,
    monto           DECIMAL(10,2)   NOT NULL,
    fecha_hora      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_mov_monto CHECK (monto > 0),
    FOREIGN KEY (caja_id)    REFERENCES caja(id),
    FOREIGN KEY (venta_id)   REFERENCES venta(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB;

-- ============================================================
-- DATOS INICIALES (MOCKS DE PRUEBA)
-- ============================================================
INSERT INTO usuario (nombre_usuario, nombre, apellido, contrasena, perfil) VALUES
('admin01', 'Juan', 'García', 'admin123', 'ADMINISTRATIVO'),
('gerente', 'Laura', 'Fernández', 'gerente123', 'GERENTE');

INSERT INTO producto (codigo, descripcion, categoria, precio_unitario, stock_actual, stock_minimo, activo) VALUES
('AV001', 'Avena arrollada tradicional 500g', 'CEREAL', 1200.00, 45, 10, 1),
('AV002', 'Avena instantánea orgánica 500g', 'CEREAL', 1450.00, 8, 12, 1),
('SE001', 'Semillas de chía x 250g', 'SEMILLA', 1800.00, 30, 8, 1),
('SE002', 'Semillas de lino dorado x 250g', 'SEMILLA', 1350.00, 5, 10, 1),
('FS001', 'Nueces mariposa extra light x 250g', 'FRUTO_SECO', 3900.00, 22, 6, 1),
('FS002', 'Almendras non parell x 250g', 'FRUTO_SECO', 4500.00, 4, 8, 1),
('LE001', 'Lentejas turcas x 500g', 'LEGUMBRE', 1600.00, 35, 10, 1),
('SU001', 'Proteína vegetal arveja y arroz 500g', 'SUPLEMENTO', 12500.00, 12, 5, 1);

INSERT INTO cliente (dni_cuit, nombre, apellido, telefono, email, acepta_promociones, activo) VALUES
('30123456', 'María', 'López', '2914112233', 'maria.lopez@email.com', 1, 1),
('27987654', 'Carlos', 'Pérez', '2915445566', 'carlos.perez@email.com', 1, 1);

INSERT INTO promocion (nombre, tipo_descuento, valor, vigencia_desde, vigencia_hasta, activa) VALUES
('Semana de Cereales 15% OFF', 'PORCENTAJE', 15.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1),
('Bono Suplemento Proteico -$1500', 'MONTO_FIJO', 1500.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 1);

INSERT INTO promocion_producto (promocion_id, producto_codigo) VALUES
(1, 'AV001'),
(1, 'AV002'),
(2, 'SU001');

INSERT INTO caja (usuario_apertura_id, fecha_apertura, monto_inicial, estado, observaciones) VALUES
(1, NOW(), 10000.00, 'ABIERTA', 'Caja inicial del turno');

INSERT INTO venta (fecha, importe_total, descuento_total, medio_pago, estado, usuario_id, cliente_id, caja_id) VALUES
(NOW(), 4920.00, 180.00, 'EFECTIVO', 'CONFIRMADA', 1, 1, 1);

INSERT INTO detalle_venta (venta_id, producto_codigo, promocion_id, cantidad, precio_unitario, descuento_aplicado, subtotal) VALUES
(1, 'AV001', 1, 1, 1200.00, 180.00, 1020.00),
(1, 'FS001', NULL, 1, 3900.00, 0.00, 3900.00);

INSERT INTO movimiento_caja (caja_id, venta_id, usuario_id, tipo, concepto, monto, fecha_hora) VALUES
(1, 1, 1, 'VENTA', 'Venta #1 - María López', 4920.00, NOW());