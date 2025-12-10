import { useRealtimeReservations } from './useRealtimeReservations';
import { useRealtimeVehicles } from './useRealtimeVehicles';
import { useRealtimeContracts } from './useRealtimeContracts';
import { useRealtimeCustomers } from './useRealtimeCustomers';

/**
 * Hook maestro que habilita sincronización en tiempo real
 * para TODAS las tablas críticas de la aplicación.
 * 
 * Usar en componentes principales (Layout, Dashboard, etc.)
 * para garantizar que toda la app esté sincronizada.
 */
export function useRealtimeSync() {
  useRealtimeReservations();
  useRealtimeVehicles();
  useRealtimeContracts();
  useRealtimeCustomers();
  
  console.log('[Realtime Sync] Sistema de sincronización activo');
}
