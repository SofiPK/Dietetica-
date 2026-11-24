# Dietética Vida Natural — Sistema de Gestión Comercial

Sistema web de administración, control de inventario y punto de venta para la dietética **"Vida Natural"**, desarrollado como proyecto final de carrera.

El sistema sustituye las planillas y registros manuales por una solución integral que automatiza el control de existencias, previene quiebres de stock mediante alertas de stock mínimo, garantiza la integridad del stock mediante transacciones atómicas y proporciona reportes de recaudación e histórico de ventas detallado con control estricto de permisos por rol.

---

## Tecnologías Utilizadas

* **Lenguaje Backend:** Java 17 / 21 (Java SE)
* **Servidor Web:** `com.sun.net.httpserver` (Servidor HTTP nativo en Java, sin necesidad de contenedores externos)
* **Base de Datos:** MySQL 8.0 (Relacional, motor InnoDB con soporte de transacciones ACID)
* **Conector de Base de Datos:** MySQL Connector/J 8.3.0 (JDBC)
* **Gestor de Dependencias:** Apache Maven (`pom.xml`)
* **Frontend:** HTML5, CSS3 (diseño comercial tipo ERP) y JavaScript nativo (`Fetch API`)

---

## Perfiles de Usuario y Control de Permisos (RBAC)

El sistema implementa una separación estricta de vistas y responsabilidades entre sus dos perfiles operativos:

### 1. Perfil Administrativo (Operación Diaria y Mostrador)
* **Registro de Ventas (Punto de Venta):**
  * Búsqueda de productos por código identificador.
  * Verificación en tiempo real de existencia y stock suficiente antes de incorporar el producto al carrito.
  * Cálculo automático de subtotales por producto (`precio unitario × cantidad`) y total general a pagar.
  * Descuento automático y atómico del stock disponible al confirmar la venta, generando automáticamente el movimiento de ingreso en caja.
* **Gestión de Productos (ABM):**
  * Alta de nuevos productos (código, descripción, categoría, precio unitario, stock actual y stock mínimo).
  * Consulta general y filtrado en tiempo real por código o descripción.
  * Modificación de precios, existencias y datos del producto.
  * Baja lógica del producto (marcado como inactivo para preservar la integridad histórica).
* **Clientes y Promociones:**
  * Alta y consulta de clientes con teléfono (WhatsApp), correo electrónico y estado de adhesión a promociones.
* **Caja de Turno:**
  * Visualización del dinero cobrado y desglose de ventas correspondientes a su turno.

### 2. Perfil Gerente (Control, Auditoría y Tesorería)
## Perfiles de Usuario y Control de Permisos (RBAC)

El sistema implementa control de acceso basado en roles (RBAC) validado tanto en la interfaz web como en los endpoints de la API REST:

### 1. Perfil Administrativo (Gestión Integral)
Cuenta con acceso completo a todas las funcionalidades operativas y administrativas del comercio:
* **Registro de Ventas (Punto de Venta):** Búsqueda de productos por código, validación en tiempo real de stock suficiente, cálculo automático de subtotales/total y descuento atómico de existencias.
* **Historial de Ventas:** Consulta de operaciones realizadas, filtros por fecha o producto y emisión de comprobante/remito.
* **Inventario de Productos (ABM):** Alta de nuevos productos, consulta, modificación de precios/stock y baja lógica.
* **Control de Stock Mínimo:** Monitoreo de artículos con existencias iguales o inferiores al límite mínimo.
* **Clientes y Promociones:** Registro y gestión de clientes adheridos a promociones.
* **Proveedores:** Alta y consulta de distribuidores mayoristas por rubro.
* **Caja y Movimientos:** Visualización de ingresos por ventas, registro de egresos y control de saldo.
* **Reporte de Recaudación:** Cálculo del total facturado con filtrado por rango de fechas.

### 2. Perfil Gerente (Control Crítico y Caja)
Cuenta con acceso focalizado en el control de reposición y arqueo financiero:
* **Control de Stock Mínimo:** Consulta exclusiva de productos cuyo stock actual es inferior o igual al límite mínimo permitido para planificar compras.
* **Caja y Movimientos:** Visualización de ingresos, registro de egresos (proveedores, impuestos, gastos operativos) y consulta del saldo neto en caja.
---

## Modelo de Datos y Arquitectura

### Modelo Entidad-Relación (MER)

```mermaid
erDiagram
    USUARIO {
        int id PK
        string nombre_usuario UK
        string nombre
        string apellido
        string contrasena
        string perfil
    }

    PRODUCTO {
        string codigo PK
        string descripcion
        string categoria
        float precio_unitario
        int stock_actual
        int stock_minimo
        boolean activo
    }

    VENTA {
        int id PK
        datetime fecha
        float importe_total
        string estado
        int usuario_id FK
    }

    DETALLE_VENTA {
        int id PK
        int venta_id FK
        string producto_codigo FK
        int cantidad
        float subtotal
    }

    CLIENTE {
        int id PK
        string nombre
        string apellido
        string telefono
        string email
        boolean recibe_promociones
        datetime fecha_registro
    }

    PROVEEDOR {
        int id PK
        string razon_social
        string cuit
        string rubro
        string telefono
        string email
        boolean activo
    }

    CAJA_MOVIMIENTO {
        int id PK
        datetime fecha
        string tipo
        string concepto
        float monto
        int usuario_id FK
        int venta_id FK
    }

    USUARIO ||--o{ VENTA : "registra"
    VENTA ||--|{ DETALLE_VENTA : "contiene"
    PRODUCTO ||--o{ DETALLE_VENTA : "aparece en"
    USUARIO ||--o{ CAJA_MOVIMIENTO : "opera"
    VENTA ||--o| CAJA_MOVIMIENTO : "genera"

## Usuarios y Credenciales de Demostración

| Rol | Nombre de Usuario | Contraseña | Vistas Habilitadas |
| :--- | :--- | :--- | :--- |
| **Administrativo** | `admin01` | `admin123` | Acceso total (Ventas, Historial, Productos, Stock Mínimo, Clientes, Proveedores, Caja y Recaudación). |
| **Gerente** | `gerente` | `gerente123` | Control de Stock Mínimo y Caja / Movimientos. |