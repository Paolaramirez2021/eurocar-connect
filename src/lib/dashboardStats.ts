import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  vehiculosTotal: number;
  vehiculosDisponibles: number;
  alquileresActivos: number;
  mantenimientosPendientes: number;
  clientesActivos: number;
  ingresosDelMes: number;
}

/**
 * Obtiene estadísticas del dashboard desde Supabase
 * ÚNICA FUENTE DE VERDAD - NO usa valores por defecto excepto 0
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // 1. VEHÍCULOS TOTAL
    const { count: vehiculosTotal } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .neq('estado', 'eliminado');

    // 2. VEHÍCULOS DISPONIBLES
    const { count: vehiculosDisponibles } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'disponible');

    // 3. ALQUILERES ACTIVOS (confirmados, pendientes o con pago, no cancelados/expirados)
    const { count: alquileresActivos } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .not('estado', 'in', '("cancelled","cancelada","expired","expirada","completed","completada")')
      .gte('fecha_fin', new Date().toISOString());

    // 4. MANTENIMIENTOS PENDIENTES (últimos 30 días o sin completar)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: mantenimientosPendientes } = await supabase
      .from('maintenance')
      .select('id', { count: 'exact', head: true })
      .gte('fecha', thirtyDaysAgo.toISOString())
      .or('completado.is.null,completado.eq.false');

    // 5. CLIENTES ACTIVOS
    const { count: clientesActivos } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activo');

    // 6. INGRESOS DEL MES ACTUAL (todas las reservas activas, no canceladas)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const { data: reservasDelMes } = await supabase
      .from('reservations')
      .select('valor_total, price_total, descuento, estado')
      .not('estado', 'in', '("cancelled","cancelada","expired","expirada")')
      .gte('fecha_inicio', startOfMonth)
      .lte('fecha_inicio', endOfMonth);

    const ingresosDelMes = reservasDelMes?.reduce((sum, r) => {
      const base = (r.valor_total ?? r.price_total ?? 0) as number;
      const descuento = (r.descuento ?? 0) as number;
      return sum + (base - descuento);
    }, 0) ?? 0;

    // Log para desarrollo (se puede quitar en producción)
    console.log('[Dashboard Stats - Real Data]', {
      vehiculosTotal: vehiculosTotal ?? 0,
      vehiculosDisponibles: vehiculosDisponibles ?? 0,
      alquileresActivos: alquileresActivos ?? 0,
      mantenimientosPendientes: mantenimientosPendientes ?? 0,
      clientesActivos: clientesActivos ?? 0,
      ingresosDelMes,
      source: 'Supabase Direct Query',
      timestamp: new Date().toISOString()
    });

    return {
      vehiculosTotal: vehiculosTotal ?? 0,
      vehiculosDisponibles: vehiculosDisponibles ?? 0,
      alquileresActivos: alquileresActivos ?? 0,
      mantenimientosPendientes: mantenimientosPendientes ?? 0,
      clientesActivos: clientesActivos ?? 0,
      ingresosDelMes
    };
  } catch (error) {
    console.error('[Dashboard Stats Error]', error);
    // En caso de error, retornar todos los valores en 0
    return {
      vehiculosTotal: 0,
      vehiculosDisponibles: 0,
      alquileresActivos: 0,
      mantenimientosPendientes: 0,
      clientesActivos: 0,
      ingresosDelMes: 0
    };
  }
}
