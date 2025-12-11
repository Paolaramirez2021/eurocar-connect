import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { shouldBeExpired, normalizeState } from '@/config/states';

/**
 * Hook para manejar la expiración automática de reservas sin pago (2 horas)
 * Usa estados nativos de Supabase para compatibilidad con triggers
 */
export function useReservationExpiration() {
  const queryClient = useQueryClient();

  const checkAndExpireReservations = useCallback(async () => {
    try {
      console.log('[Expiration] Verificando reservas...');

      // Obtener reservas pending sin pago
      const { data: pendingReservations, error: fetchError } = await supabase
        .from('reservations')
        .select('id, estado, payment_status, auto_cancel_at, created_at, vehicle_id, cliente_nombre')
        .eq('estado', 'pending')
        .neq('payment_status', 'paid');

      if (fetchError) {
        console.error('[Expiration] Error:', fetchError);
        return;
      }

      if (!pendingReservations || pendingReservations.length === 0) {
        console.log('[Expiration] No hay reservas pendientes sin pago');
        return;
      }

      console.log(`[Expiration] Verificando ${pendingReservations.length} reservas`);

      let expiredCount = 0;

      for (const reservation of pendingReservations) {
        if (shouldBeExpired(reservation)) {
          console.log(`[Expiration] Expirando: ${reservation.id} - ${reservation.cliente_nombre}`);

          // Usar 'expired' como estado nativo de BD
          const { data, error: updateError } = await supabase
            .from('reservations')
            .update({
              estado: 'expired',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'Expiración automática por falta de pago (2 horas)',
              updated_at: new Date().toISOString(),
            })
            .eq('id', reservation.id)
            .select();

          if (updateError) {
            console.error(`[Expiration] Error expirando ${reservation.id}:`, updateError);
            continue;
          }

          // Liberar vehículo
          if (reservation.vehicle_id) {
            await supabase
              .from('vehicles')
              .update({ estado: 'disponible' })
              .eq('id', reservation.vehicle_id);
          }

          expiredCount++;
          console.log(`[Expiration] ✅ Reserva ${reservation.id} expirada`);
        }
      }

      if (expiredCount > 0) {
        toast.warning(`${expiredCount} reserva(s) expirada(s)`, {
          description: 'Reservas sin pago después de 2 horas han sido marcadas como expiradas.',
          duration: 5000,
        });

        // Invalidar queries
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }

    } catch (error) {
      console.error('[Expiration] Error general:', error);
    }
  }, [queryClient]);

  useEffect(() => {
    // Ejecutar inmediatamente
    checkAndExpireReservations();

    // Verificar cada minuto
    const intervalId = setInterval(checkAndExpireReservations, 60 * 1000);

    console.log('[Expiration] ✅ Sistema de expiración activo (cada 60s)');

    return () => {
      clearInterval(intervalId);
    };
  }, [checkAndExpireReservations]);
}

export function useReservationExpirationStatus(reservation: {
  estado: string;
  payment_status?: string;
  auto_cancel_at?: string | null;
  created_at: string;
}) {
  const normalized = normalizeState(reservation.estado);
  const isPaid = reservation.payment_status === 'paid';
  const isExpirable = normalized === 'pending' && !isPaid;
  const isExpired = shouldBeExpired(reservation);
  
  return {
    isExpirable,
    isExpired,
    showTimer: isExpirable && !isExpired,
  };
}
