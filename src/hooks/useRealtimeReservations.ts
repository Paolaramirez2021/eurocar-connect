import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para actualización en tiempo real de reservas
 * Escucha INSERT, UPDATE, DELETE en la tabla reservations
 * e invalida automáticamente todas las queries relacionadas
 */
export function useRealtimeReservations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Suscribiendo a cambios en reservations...');

    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('[Realtime] Nueva reserva creada:', payload.new);
          
          // Invalidar todas las queries relacionadas con reservas
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-data'] });
          queryClient.invalidateQueries({ queryKey: ['finance-data'] });
          
          // Notificación visual
          toast.success('Nueva reserva creada', {
            description: 'Los datos se han actualizado automáticamente',
            duration: 2000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('[Realtime] Reserva actualizada:', {
            id: payload.new.id,
            estadoAnterior: payload.old?.estado,
            estadoNuevo: payload.new.estado
          });
          
          // Invalidar queries inmediatamente
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-data'] });
          
          // Si cambió el estado, mostrar notificación
          if (payload.old?.estado !== payload.new.estado) {
            toast.info('Estado de reserva actualizado', {
              description: `${payload.old?.estado} → ${payload.new.estado}`,
              duration: 2000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('[Realtime] Reserva eliminada:', payload.old);
          
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          
          toast.info('Reserva eliminada', {
            duration: 2000,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Suscrito a reservations');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Error en suscripción a reservations');
        }
      });

    return () => {
      console.log('[Realtime] Desuscribiendo de reservations...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
