import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { shouldBeExpired, getStateConfig } from '@/config/states';

/**
 * Hook para manejar la expiración automática de reservas sin pago
 * 
 * Funcionalidad:
 * - Verifica reservas pendientes de pago cada minuto
 * - Marca como 'expired' las que pasaron las 2 horas
 * - Libera el vehículo asociado
 * - Notifica al usuario
 */
export function useReservationExpiration() {
  const queryClient = useQueryClient();

  const checkAndExpireReservations = useCallback(async () => {
    try {
      console.log('[Expiration] Verificando reservas pendientes de expirar...');

      // Obtener reservas pendientes sin pago
      const { data: pendingReservations, error: fetchError } = await supabase
        .from('reservations')
        .select('id, estado, payment_status, auto_cancel_at, created_at, vehicle_id, cliente_nombre')
        .in('estado', ['pending', 'pending_no_payment'])
        .eq('payment_status', 'pending');

      if (fetchError) {
        console.error('[Expiration] Error al obtener reservas:', fetchError);
        return;
      }

      if (!pendingReservations || pendingReservations.length === 0) {
        console.log('[Expiration] No hay reservas pendientes de verificar');
        return;
      }

      console.log(`[Expiration] Verificando ${pendingReservations.length} reservas pendientes`);

      // Verificar cada reserva
      for (const reservation of pendingReservations) {
        if (shouldBeExpired(reservation)) {
          console.log(`[Expiration] Expirando reserva ${reservation.id} de ${reservation.cliente_nombre}`);

          // Actualizar estado a 'expired'
          const { error: updateError } = await supabase
            .from('reservations')
            .update({
              estado: 'expired',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'Expiración automática por falta de pago (2 horas)',
            })
            .eq('id', reservation.id);

          if (updateError) {
            console.error(`[Expiration] Error al expirar reserva ${reservation.id}:`, updateError);
            continue;
          }

          // Liberar el vehículo
          if (reservation.vehicle_id) {
            await supabase
              .from('vehicles')
              .update({ estado: 'disponible' })
              .eq('id', reservation.vehicle_id);
          }

          // Mostrar notificación
          toast.warning('Reserva expirada', {
            description: `La reserva de ${reservation.cliente_nombre} ha expirado por falta de pago.`,
            duration: 5000,
          });

          console.log(`[Expiration] ✅ Reserva ${reservation.id} marcada como expirada`);
        }
      }

      // Invalidar queries para actualizar UI
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

    } catch (error) {
      console.error('[Expiration] Error en verificación de expiraciones:', error);
    }
  }, [queryClient]);

  useEffect(() => {
    // Ejecutar inmediatamente al montar
    checkAndExpireReservations();

    // Configurar intervalo para verificar cada minuto
    const intervalId = setInterval(checkAndExpireReservations, 60 * 1000);

    console.log('[Expiration] ✅ Sistema de expiración automática activado (verificación cada 60s)');

    return () => {
      clearInterval(intervalId);
      console.log('[Expiration] Sistema de expiración desactivado');
    };
  }, [checkAndExpireReservations]);
}

/**
 * Hook para usar en componentes que necesitan verificar expiración de una reserva específica
 */
export function useReservationExpirationStatus(reservation: {
  estado: string;
  payment_status?: string | null;
  auto_cancel_at?: string | null;
  created_at: string;
}) {
  const config = getStateConfig(reservation.estado);
  const isExpirable = config.hasAutoCancelTimer && reservation.payment_status !== 'paid';
  const isExpired = shouldBeExpired(reservation);
  
  return {
    isExpirable,
    isExpired,
    showTimer: isExpirable && !isExpired,
  };
}
