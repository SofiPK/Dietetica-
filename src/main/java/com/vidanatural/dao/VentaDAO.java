package com.vidanatural.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.vidanatural.model.DetalleVenta;
import com.vidanatural.model.EstadoVenta;
import com.vidanatural.model.MedioPago;
import com.vidanatural.model.Producto;
import com.vidanatural.model.Venta;

public class VentaDAO {

    /**
     * Registra una nueva venta con validación de caja abierta, descuento atómico de stock
     * e impacto automático en movimiento_caja cuando el medio de pago es EFECTIVO.
     */
    public boolean registrarVenta(Venta venta) throws Exception {
        String sqlCajaAbierta = "SELECT id FROM caja WHERE estado = 'ABIERTA' ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE";
        String sqlVenta = "INSERT INTO venta (fecha, importe_total, descuento_total, medio_pago, estado, usuario_id, cliente_id, caja_id) " +
                          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        String sqlDetalle = "INSERT INTO detalle_venta (venta_id, producto_codigo, promocion_id, cantidad, precio_unitario, descuento_aplicado, subtotal) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?)";
        String sqlCheckStock = "SELECT descripcion, stock_actual, activo FROM producto WHERE codigo = ? FOR UPDATE";
        String sqlDescontarStock = "UPDATE producto SET stock_actual = stock_actual - ? WHERE codigo = ?";
        String sqlMovCaja = "INSERT INTO movimiento_caja (caja_id, venta_id, usuario_id, tipo, concepto, monto, fecha_hora) " +
                            "VALUES (?, ?, ?, 'VENTA', ?, ?, ?)";

        Connection conn = null;
        try {
            conn = ConexionBD.getConexion();
            conn.setAutoCommit(false);

            // 1. VERIFICAR QUE EXISTA UNA CAJA ABIERTA
            int cajaId;
            try (PreparedStatement stmtCaja = conn.prepareStatement(sqlCajaAbierta);
                 ResultSet rsCaja = stmtCaja.executeQuery()) {
                if (!rsCaja.next()) {
                    throw new Exception("No hay una caja abierta. Abra la caja antes de registrar ventas.");
                }
                cajaId = rsCaja.getInt("id");
                venta.setCajaId(cajaId);
            }

            // 2. VALIDACIÓN PREVIA DE STOCK PARA CADA PRODUCTO
            for (DetalleVenta detalle : venta.getDetalles()) {
                try (PreparedStatement stmtCheck = conn.prepareStatement(sqlCheckStock)) {
                    stmtCheck.setString(1, detalle.getProductoCodigo());
                    try (ResultSet rs = stmtCheck.executeQuery()) {
                        if (!rs.next()) {
                            throw new Exception("El producto con código " + detalle.getProductoCodigo() + " no existe.");
                        }
                        if (!rs.getBoolean("activo")) {
                            throw new Exception("El producto '" + rs.getString("descripcion") + "' está dado de baja.");
                        }
                        int stockActual = rs.getInt("stock_actual");
                        if (stockActual < detalle.getCantidad()) {
                            throw new Exception("Stock insuficiente para '" + rs.getString("descripcion") +
                                                "'. Stock disponible: " + stockActual + ", solicitado: " + detalle.getCantidad());
                        }
                    }
                }
            }

            // 3. INSERTAR CABECERA DE VENTA
            int ventaId = 0;
            MedioPago medio = venta.getMedioPago() != null ? venta.getMedioPago() : MedioPago.EFECTIVO;
            try (PreparedStatement stmtVenta = conn.prepareStatement(sqlVenta, Statement.RETURN_GENERATED_KEYS)) {
                stmtVenta.setTimestamp(1, Timestamp.valueOf(venta.getFecha()));
                stmtVenta.setDouble(2, venta.getImporteTotal());
                stmtVenta.setDouble(3, venta.getDescuentoTotal());
                stmtVenta.setString(4, medio.name());
                stmtVenta.setString(5, EstadoVenta.CONFIRMADA.name());
                stmtVenta.setInt(6, venta.getUsuarioId());
                if (venta.getClienteId() != null) stmtVenta.setInt(7, venta.getClienteId());
                else stmtVenta.setNull(7, Types.INTEGER);
                stmtVenta.setInt(8, cajaId);

                stmtVenta.executeUpdate();
                try (ResultSet rsKeys = stmtVenta.getGeneratedKeys()) {
                    if (rsKeys.next()) {
                        ventaId = rsKeys.getInt(1);
                        venta.setId(ventaId);
                    }
                }
            }

            // 4. INSERTAR CADA DETALLE Y DESCONTAR STOCK
            try (PreparedStatement stmtDetalle = conn.prepareStatement(sqlDetalle);
                 PreparedStatement stmtStock = conn.prepareStatement(sqlDescontarStock)) {

                for (DetalleVenta d : venta.getDetalles()) {
                    stmtDetalle.setInt(1, ventaId);
                    stmtDetalle.setString(2, d.getProductoCodigo());
                    if (d.getPromocionId() != null) stmtDetalle.setInt(3, d.getPromocionId());
                    else stmtDetalle.setNull(3, Types.INTEGER);
                    stmtDetalle.setInt(4, d.getCantidad());
                    stmtDetalle.setDouble(5, d.getPrecioUnitario());
                    stmtDetalle.setDouble(6, d.getDescuentoAplicado());
                    stmtDetalle.setDouble(7, d.getSubtotal());
                    stmtDetalle.executeUpdate();

                    stmtStock.setInt(1, d.getCantidad());
                    stmtStock.setString(2, d.getProductoCodigo());
                    stmtStock.executeUpdate();
                }
            }

            // 5. SI EL PAGO FUE EN EFECTIVO, REGISTRAR INGRESO EN CAJA
            if (medio == MedioPago.EFECTIVO && venta.getImporteTotal() > 0) {
                try (PreparedStatement stmtMov = conn.prepareStatement(sqlMovCaja)) {
                    stmtMov.setInt(1, cajaId);
                    stmtMov.setInt(2, ventaId);
                    stmtMov.setInt(3, venta.getUsuarioId());
                    stmtMov.setString(4, "Venta #" + ventaId);
                    stmtMov.setDouble(5, venta.getImporteTotal());
                    stmtMov.setTimestamp(6, Timestamp.valueOf(venta.getFecha()));
                    stmtMov.executeUpdate();
                }
            }

            conn.commit();
            return true;

        } catch (Exception e) {
            if (conn != null) {
                try {
                    conn.rollback();
                } catch (SQLException ex) {
                    System.err.println("Error en rollback: " + ex.getMessage());
                }
            }
            throw e;
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException e) {
                    System.err.println("Error al cerrar conexión: " + e.getMessage());
                }
            }
        }
    }

    public double calcularRecaudado(LocalDate desde, LocalDate hasta) {
        StringBuilder sql = new StringBuilder(
            "SELECT COALESCE(SUM(importe_total), 0) AS total FROM venta WHERE estado = 'CONFIRMADA' "
        );
        if (desde != null) sql.append("AND DATE(fecha) >= ? ");
        if (hasta != null) sql.append("AND DATE(fecha) <= ? ");

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            int paramIndex = 1;
            if (desde != null) stmt.setDate(paramIndex++, java.sql.Date.valueOf(desde));
            if (hasta != null) stmt.setDate(paramIndex++, java.sql.Date.valueOf(hasta));

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) return Math.round(rs.getDouble("total") * 100.0) / 100.0;
            }
        } catch (SQLException e) {
            System.err.println("Error al calcular recaudación: " + e.getMessage());
        }
        return 0.0;
    }

    /**
     * Reporte gerencial completo: total recaudado, descuentos otorgados, cantidad de ventas,
     * desglose por medio de pago y ranking de productos más vendidos.
     */
    public Map<String, Object> obtenerReporteRecaudacion(LocalDate desde, LocalDate hasta) {
        Map<String, Object> reporte = new HashMap<>();
        String filtroFecha = "";
        if (desde != null) filtroFecha += " AND DATE(v.fecha) >= ? ";
        if (hasta != null) filtroFecha += " AND DATE(v.fecha) <= ? ";

        String sqlTotales = "SELECT COUNT(*) AS cantidad, COALESCE(SUM(v.importe_total), 0) AS total, " +
                            "COALESCE(SUM(v.descuento_total), 0) AS descuentos " +
                            "FROM venta v WHERE v.estado = 'CONFIRMADA' " + filtroFecha;

        String sqlMedios = "SELECT v.medio_pago, COUNT(*) AS cantidad, COALESCE(SUM(v.importe_total), 0) AS total " +
                           "FROM venta v WHERE v.estado = 'CONFIRMADA' " + filtroFecha +
                           " GROUP BY v.medio_pago";

        String sqlTopProd = "SELECT d.producto_codigo, p.descripcion, SUM(d.cantidad) AS unidades, SUM(d.subtotal) AS recaudado " +
                            "FROM detalle_venta d " +
                            "JOIN venta v ON d.venta_id = v.id " +
                            "JOIN producto p ON d.producto_codigo = p.codigo " +
                            "WHERE v.estado = 'CONFIRMADA' " + filtroFecha +
                            " GROUP BY d.producto_codigo, p.descripcion ORDER BY recaudado DESC LIMIT 5";

        try (Connection conn = ConexionBD.getConexion()) {
            // 1. Totales generales
            try (PreparedStatement stmt = conn.prepareStatement(sqlTotales)) {
                aplicarParametrosFecha(stmt, desde, hasta);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        int cant = rs.getInt("cantidad");
                        double total = Math.round(rs.getDouble("total") * 100.0) / 100.0;
                        double desc = Math.round(rs.getDouble("descuentos") * 100.0) / 100.0;
                        reporte.put("cantidadVentas", cant);
                        reporte.put("totalRecaudado", total);
                        reporte.put("totalDescuentos", desc);
                        reporte.put("ticketPromedio", cant > 0 ? Math.round((total / cant) * 100.0) / 100.0 : 0.0);
                    }
                }
            }

            // 2. Desglose por medio de pago
                ArrayList porMedioPago = new ArrayList();            try (PreparedStatement stmt = conn.prepareStatement(sqlMedios)) {
                aplicarParametrosFecha(stmt, desde, hasta);
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("medioPago", rs.getString("medio_pago"));
                        item.put("cantidad", rs.getInt("cantidad"));
                        item.put("total", Math.round(rs.getDouble("total") * 100.0) / 100.0);
                        porMedioPago.add(item);
                    }
                }
            }
            reporte.put("porMedioPago", porMedioPago);

            // 3. Top productos
            ArrayList topProductos = new ArrayList();
            try (PreparedStatement stmt = conn.prepareStatement(sqlTopProd)) {
                aplicarParametrosFecha(stmt, desde, hasta);
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> prod = new HashMap<>();
                        prod.put("codigo", rs.getString("producto_codigo"));
                        prod.put("descripcion", rs.getString("descripcion"));
                        prod.put("unidades", rs.getInt("unidades"));
                        prod.put("recaudado", Math.round(rs.getDouble("recaudado") * 100.0) / 100.0);
                        topProductos.add(prod);
                    }
                }
            }
            reporte.put("topProductos", topProductos);

        } catch (SQLException e) {
            System.err.println("Error al generar reporte de recaudación: " + e.getMessage());
        }
        return reporte;
    }

    private void aplicarParametrosFecha(PreparedStatement stmt, LocalDate desde, LocalDate hasta) throws SQLException {
        int idx = 1;
        if (desde != null) stmt.setDate(idx++, java.sql.Date.valueOf(desde));
        if (hasta != null) stmt.setDate(idx++, java.sql.Date.valueOf(hasta));
    }

    public List<Venta> listarVentas() {
        List<Venta> lista = new ArrayList<>();
        String sqlVentas = "SELECT v.id, v.fecha, v.importe_total, v.descuento_total, v.medio_pago, " +
                           "v.estado, v.usuario_id, v.cliente_id, v.caja_id " +
                           "FROM venta v ORDER BY v.fecha DESC";

        String sqlDetalles = "SELECT d.id, d.venta_id, d.producto_codigo, d.promocion_id, p.descripcion, " +
                             "d.cantidad, d.precio_unitario, d.descuento_aplicado, d.subtotal " +
                             "FROM detalle_venta d " +
                             "JOIN producto p ON d.producto_codigo = p.codigo " +
                             "WHERE d.venta_id = ?";

        try (Connection conn = ConexionBD.getConexion();
             PreparedStatement stmtV = conn.prepareStatement(sqlVentas);
             ResultSet rsV = stmtV.executeQuery()) {

            while (rsV.next()) {
                Venta v = new Venta(
                    rsV.getInt("id"),
                    rsV.getTimestamp("fecha").toLocalDateTime(),
                    rsV.getDouble("importe_total"),
                    EstadoVenta.valueOf(rsV.getString("estado")),
                    rsV.getInt("usuario_id")
                );
                v.setDescuentoTotal(rsV.getDouble("descuento_total"));
                String mp = rsV.getString("medio_pago");
                if (mp != null) v.setMedioPago(MedioPago.valueOf(mp));

                int clienteId = rsV.getInt("cliente_id");
                if (!rsV.wasNull()) v.setClienteId(clienteId);
                int cajaId = rsV.getInt("caja_id");
                if (!rsV.wasNull()) v.setCajaId(cajaId);

                try (PreparedStatement stmtD = conn.prepareStatement(sqlDetalles)) {
                    stmtD.setInt(1, v.getId());
                    try (ResultSet rsD = stmtD.executeQuery()) {
                        while (rsD.next()) {
                            DetalleVenta d = new DetalleVenta(
                                rsD.getInt("id"),
                                rsD.getInt("venta_id"),
                                rsD.getString("producto_codigo"),
                                rsD.getInt("cantidad"),
                                rsD.getDouble("subtotal")
                            );
                            int promoId = rsD.getInt("promocion_id");
                            if (!rsD.wasNull()) d.setPromocionId(promoId);
                            d.setPrecioUnitario(rsD.getDouble("precio_unitario"));
                            d.setDescuentoAplicado(rsD.getDouble("descuento_aplicado"));

                            Producto p = new Producto();
                            p.setCodigo(rsD.getString("producto_codigo"));
                            p.setDescripcion(rsD.getString("descripcion"));
                            p.setPrecioUnitario(rsD.getDouble("precio_unitario"));
                            d.setProducto(p);

                            v.getDetalles().add(d);
                        }
                    }
                }
                lista.add(v);
            }
        } catch (SQLException e) {
            System.err.println("Error al listar ventas: " + e.getMessage());
        }
        return lista;
    }
}
