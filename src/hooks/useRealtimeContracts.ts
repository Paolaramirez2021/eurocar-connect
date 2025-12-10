import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para actualización en tiempo real de contratos
 */
export function useRealtimeContracts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Suscribiendo a cambios en contracts...');

    const channel = supabase
      .channel('contracts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts'
        },
        (payload) => {
          console.log('[Realtime] Cambio en contracts:', payload);
          
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: ['contracts'] });
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          
          if (payload.eventType === 'INSERT') {
            toast.success('Nuevo contrato generado', {
              description: 'Contrato creado exitosamente',
              duration: 2000
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Suscrito a contracts');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
