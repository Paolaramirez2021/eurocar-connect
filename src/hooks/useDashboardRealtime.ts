import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para actualización en tiempo real del dashboard
 * Escucha cambios en las tablas relevantes y actualiza automáticamente
 */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Función para invalidar cache y re-fetch
    const invalidateDashboardStats = () => {
      console.log('[Realtime] Cambio detectado - Actualizando dashboard...');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    // Crear canal de Supabase Realtime
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('[Realtime] Cambio en vehicles:', payload);
          invalidateDashboardStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('[Realtime] Cambio en reservations:', payload);
          invalidateDashboardStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance'
        },
        (payload) => {
          console.log('[Realtime] Cambio en maintenance:', payload);
          invalidateDashboardStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('[Realtime] Cambio en customers:', payload);
          invalidateDashboardStats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Suscrito a cambios del dashboard');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error en suscripción');
        }
      });

    // Cleanup: desuscribirse al desmontar
    return () => {
      console.log('[Realtime] Desuscribiendo...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
