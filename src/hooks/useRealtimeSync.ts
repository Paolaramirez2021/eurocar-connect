import { useRealtimeReservations } from './useRealtimeReservations';
import { useRealtimeVehicles } from './useRealtimeVehicles';
import { useRealtimeContracts } from './useRealtimeContracts';
import { useRealtimeCustomers } from './useRealtimeCustomers';
import { useReservationExpiration } from './useReservationExpiration';

/**
 * Hook maestro que habilita sincronización en tiempo real
 * para TODAS las tablas críticas de la aplicación.
 * 
 * Usar en componentes principales (Layout, Dashboard, etc.)
 * para garantizar que toda la app esté sincronizada.
 * 
 * También incluye el sistema de expiración automática de reservas.
 */
export function useRealtimeSync() {
  useRealtimeReservations();
  useRealtimeVehicles();
  useRealtimeContracts();
  useRealtimeCustomers();
  useReservationExpiration(); // Sistema de expiración automática
  
  console.log('[Realtime Sync] Sistema de sincronización activo (incluye expiración automática)');
}
