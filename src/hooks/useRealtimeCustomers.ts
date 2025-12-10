import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para actualización en tiempo real de clientes
 */
export function useRealtimeCustomers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Suscribiendo a cambios en customers...');

    const channel = supabase
      .channel('customers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('[Realtime] Cambio en customers:', payload);
          
          // Invalidar queries de clientes
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Suscrito a customers');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
