import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para actualización en tiempo real de vehículos
 */
export function useRealtimeVehicles() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Suscribiendo a cambios en vehicles...');

    const channel = supabase
      .channel('vehicles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('[Realtime] Cambio en vehicles:', payload);
          
          // Invalidar queries inmediatamente
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
          
          if (payload.eventType === 'INSERT') {
            toast.success('Nuevo vehículo añadido', { duration: 2000 });
          } else if (payload.eventType === 'UPDATE') {
            // Si cambió el estado del vehículo
            if (payload.old?.estado !== payload.new.estado) {
              toast.info(`Vehículo ${payload.new.placa}: ${payload.new.estado}`, {
                duration: 2000
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Suscrito a vehicles');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
