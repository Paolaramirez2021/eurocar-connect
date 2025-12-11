import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { shouldBeExpired, normalizeState } from '@/config/states';

/**
 * Hook para manejar la expiración automática de reservas sin pago
 * 
 * Funcionalidad:
 * - Verifica reservas con estado 'reservado_sin_pago' cada minuto
 * - Marca como 'expirada' las que pasaron las 2 horas
 * - Libera el vehículo asociado
 * - Notifica al usuario
 */
export function useReservationExpiration() {
  const queryClient = useQueryClient();

  const checkAndExpireReservations = useCallback(async () => {
    try {
      console.log('[Expiration] Verificando reservas pendientes de expirar...');

      // Obtener reservas sin pago (incluye estados legacy)
      const { data: pendingReservations, error: fetchError } = await supabase
        .from('reservations')
        .select('id, estado, payment_status, auto_cancel_at, created_at, vehicle_id, cliente_nombre')
        .in('estado', [
          'reservado_sin_pago',
          // Estados legacy que también deben verificarse
          'pending',
          'pending_no_payment'
        ])
        .neq('payment_status', 'paid');  // Solo las que no tienen pago

      if (fetchError) {
        console.error('[Expiration] Error al obtener reservas:', fetchError);
        return;
      }

      if (!pendingReservations || pendingReservations.length === 0) {
        console.log('[Expiration] No hay reservas pendientes de verificar');
        return;
      }

      console.log(`[Expiration] Verificando ${pendingReservations.length} reservas pendientes`);

      let expiredCount = 0;

      // Verificar cada reserva
      for (const reservation of pendingReservations) {
        if (shouldBeExpired(reservation)) {
          console.log(`[Expiration] Expirando reserva ${reservation.id} de ${reservation.cliente_nombre}`);

          // Actualizar estado a 'expirada'
          const { error: updateError } = await supabase
            .from('reservations')
            .update({
              estado: 'expirada',  // NUEVO ESTADO UNIFICADO
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'Expiración automática por falta de pago (2 horas)',
              updated_at: new Date().toISOString(),
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

          expiredCount++;
          console.log(`[Expiration] ✅ Reserva ${reservation.id} marcada como expirada`);
        }
      }

      // Mostrar notificación solo si hubo expiraciones
      if (expiredCount > 0) {
        toast.warning(`${expiredCount} reserva(s) expirada(s)`, {
          description: 'Las reservas sin pago después de 2 horas han sido marcadas como expiradas.',
          duration: 5000,
        });

        // Invalidar queries para actualizar UI
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }

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
 * Hook para verificar si una reserva específica está expirada
 */
export function useReservationExpirationStatus(reservation: {
  estado: string;
  auto_cancel_at?: string | null;
  created_at: string;
}) {
  const normalized = normalizeState(reservation.estado);
  const isExpirable = normalized === 'reservado_sin_pago';
  const isExpired = shouldBeExpired(reservation);
  
  return {
    isExpirable,
    isExpired,
    showTimer: isExpirable && !isExpired,
  };
}
