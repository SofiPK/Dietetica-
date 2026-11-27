# Vida Natural — Sistema de Gestión Comercial (ERP)

Aplicación web integral para la gestión comercial, operativa y administrativa de la dietética **Vida Natural**. Desarrollada con arquitectura cliente-servidor en **Java 17+ (HttpServer nativo + JDBC + MySQL)** y un frontend limpio en **HTML5, CSS3 y JavaScript Vanilla**.

---

## Características Principales

### 1. Autenticación, Perfiles y Seguridad
* **Control de Acceso Basado en Roles (RBAC):**
  * **`ADMINISTRATIVO`:** Operación diaria de mostrador (apertura/cierre de caja, movimientos manuales, registro de ventas, emisión de remitos, alta/edición/baja de productos, clientes y promociones).
  * **`GERENTE`:** Supervisión comercial y administrativa (reportes de recaudación, monitoreo de caja e historial de cierres, consulta en modo lectura de ventas/inventario/clientes/promociones y **administración integral de usuarios**).
* **Gestión de Usuarios (Exclusivo `GERENTE`):**
  * Alta de nuevos operadores administrativos o gerentes.
  * Modificación de nombre, apellido, perfil asignado y blanqueo opcional de contraseña.
  * Baja lógica y reactivación de cuentas (con protección para evitar que el gerente en sesión desactive su propia cuenta).
* **Autogestión de Contraseña (`ADMINISTRATIVO` y `GERENTE`):**
  * Modal **"Mi Contraseña"** accesible desde el menú superior de usuario, con datos identificatorios fijos de solo lectura (`Usuario`, `Nombre y Apellido`, `Perfil`) y validación de contraseña actual antes de actualizar la clave.

### 2. Control y Arqueo de Caja
* Apertura de turno con fondo inicial en efectivo y observaciones.
* Registro automático de ingresos por ventas abonadas en `EFECTIVO`.
* Registro de movimientos manuales (`INGRESO_MANUAL` y `EGRESO_MANUAL`).
* Cierre y arqueo de caja con cálculo automático de diferencias (sobrante, faltante o cuadre exacto) e historial completo de cierres.

### 3. Punto de Venta (POS) y Comprobantes
* Búsqueda rápida de productos por código o descripción con autocompletado y verificación de stock en tiempo real.
* Aplicación automática de promociones vigentes (porcentaje o monto fijo) por producto.
* Soporte para múltiples medios de pago (`EFECTIVO`, `TRANSFERENCIA`, `DEBITO_CREDITO`) y asignación opcional de cliente.
* Descuento transaccional de stock al confirmar la venta y generación de **Remito / Comprobante imprimible**.

### 4. Inventario, Clientes, Promociones y Reportes
* **Inventario de Productos:** CRUD completo con baja lógica, reactivación, ordenamiento dinámico por columnas y reporte dedicado de **Control de Stock Mínimo**.
* **Clientes:** Registro de clientes con DNI/CUIT, datos de contacto y suscripción a difusión de promociones.
* **Promociones:** Definición de descuentos por porcentaje o monto fijo con rango de fechas de vigencia y selección múltiple de productos.
* **Reporte de Recaudación (`GERENTE`):** KPIs por rango de fechas (total recaudado, cantidad de ventas, ticket promedio, ahorros por promociones), desglose por medio de pago y ranking Top 5 de productos más vendidos.

---

## Stack Tecnológico

* **Backend:** Java 17+ (`com.sun.net.httpserver.HttpServer`), JDBC (`mysql-connector-j`).
* **Base de Datos:** MySQL 8.0+.
* **Frontend:** HTML5, CSS3 (diseño responsivo y estilos de impresión para remitos), JavaScript ES6+ (sin frameworks externos).

---

## Estructura del Proyecto

```text
vida-natural/
├── src/
│   └── com/vidanatural/
│       ├── Main.java                  # Punto de entrada y servidor HTTP
│       ├── bd/
│       │   ├── ConexionBD.java        # Gestión de conexiones JDBC a MySQL
│       │   └── InicializadorBD.java   # Creación/migración de tablas y datos semilla
│       ├── dao/                       # Capa de acceso a datos (UsuarioDAO, ProductoDAO, VentaDAO, CajaDAO, ClienteDAO, PromocionDAO)
│       ├── modelo/                    # Entidades de dominio (Usuario, Producto, Venta, DetalleVenta, Caja, MovimientoCaja, Cliente, Promocion)
│       ├── servicio/                  # Lógica de negocio y validaciones transaccionales
│       └── web/                       # Controladores REST HTTP y servidor de archivos estáticos
├── web/
│   ├── index.html                     # Pantalla de Inicio de Sesión y Recuperación de Contraseña
│   ├── style.css                      # Hojas de estilo globales y reglas @media print
│   ├── login-bg.jfif                  # Imagen de fondo de pantalla de acceso
│   ├── pages/                         # Vistas HTML independientes por módulo
│   │   ├── ventas.html                # Punto de Venta (POS) y Remito imprimible
│   │   ├── historial-ventas.html      # Historial y búsqueda de ventas
│   │   ├── productos.html             # Inventario de productos
│   │   ├── stock-bajo.html            # Control de stock mínimo
│   │   ├── clientes.html              # Gestión de clientes
│   │   ├── promociones.html           # Gestión de promociones y descuentos
│   │   ├── caja.html                  # Control y arqueo de caja
│   │   ├── recaudacion.html           # Reporte de recaudación (Gerente)
│   │   └── usuarios.html              # Gestión de usuarios y perfiles (Gerente)
│   └── js/                            # Módulos JavaScript desacoplados
│       ├── api.js                     # Sesión e interceptor HTTP con headers de perfil
│       ├── layout.js                  # Header, barra lateral dinámica y cambio de contraseña
│       ├── login.js                   # Autenticación y flujo de recuperación de clave
│       ├── ventas.js                  # Lógica de carrito, promociones y remito
│       ├── historial-ventas.js        # Filtrado, ordenamiento y visualización de remitos
│       ├── productos.js               # CRUD de inventario y ordenamiento por columnas
│       ├── stock-bajo.js              # Listado de productos debajo del stock mínimo
│       ├── clientes.js                # CRUD de clientes y ordenamiento
│       ├── promociones.js             # CRUD de promociones y selección de productos
│       ├── caja.js                    # Apertura, movimientos manuales, arqueo e historial
│       ├── recaudacion.js             # KPIs, medios de pago y Top 5 de productos
│       └── usuarios.js                # Alta, edición y baja/reactivación de usuarios
├── README.md                          # Documentación general y guía de instalación
└── ARQUITECTURA.md                    # Documentación técnica de arquitectura y API REST
```

---

## Instalación y Puesta en Marcha

### 1. Requisitos Previos
* **JDK 17** o superior instalado.
* **MySQL Server 8.0** o superior en ejecución.
* Conector JDBC de MySQL (`mysql-connector-j`) incluido en el classpath del proyecto.

### 2. Configuración de Base de Datos
1. Crear la base de datos en MySQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS vida_natural CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Verificar las credenciales de conexión (`URL`, `USER`, `PASSWORD`) en `ConexionBD.java`.
3. Al iniciar la aplicación, `InicializadorBD` crea y migra automáticamente todas las tablas necesarias (incluyendo la columna `activo` en `usuario`) y carga los usuarios y productos iniciales si la base está vacía.

### 3. Ejecución
* Compilar y ejecutar la clase principal `com.vidanatural.Main`.
* Abrir en el navegador: **`http://localhost:8080`**

### 4. Credenciales de Acceso Iniciales

| Perfil | Usuario | Contraseña | Permisos Principales |
| :--- | :--- | :--- | :--- |
| **Administrativo** | `admin01` | `1234` | Caja, Ventas, Inventario, Clientes, Promociones, Mi Contraseña |
| **Gerente** | `gerente` | `1234` | Reportes, Auditoría de Caja/Ventas, Gestión de Usuarios, Mi Contraseña |