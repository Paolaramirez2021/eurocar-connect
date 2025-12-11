import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, CreditCard, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getStateConfig, normalizeState } from "@/config/states";

interface Reservation {
  id: string;
  cliente_nombre: string;
  estado: string;
  payment_status: string;
  auto_cancel_at: string | null;
  created_at: string;
}

interface ReservationActionsProps {
  reservation: Reservation;
  onUpdate: () => void;
}

export const ReservationActions = ({ reservation, onUpdate }: ReservationActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const queryClient = useQueryClient();

  // Normalizar estado para manejar legacy
  const normalizedEstado = normalizeState(reservation.estado);
  const stateConfig = getStateConfig(reservation.estado);

  /**
   * MARCAR COMO PAGADO
   * Actualiza AMBOS campos: estado Y payment_status
   */
  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      console.log('[Marcar como Pagado] Iniciando...', {
        reservationId: reservation.id,
        estadoActual: reservation.estado,
        paymentStatusActual: reservation.payment_status
      });

      const { error } = await supabase
        .from("reservations")
        .update({
          // UNIFICADO: Actualizar AMBOS campos
          estado: "reservado_con_pago",      // Nuevo estado unificado
          payment_status: "paid",             // Status de pago
          payment_date: new Date().toISOString(),
          auto_cancel_at: null,               // Eliminar auto-cancelación
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.id);

      if (error) throw error;

      console.log('[Marcar como Pagado] ✅ Actualizado:', {
        reservationId: reservation.id,
        nuevoEstado: 'reservado_con_pago',
        nuevoPaymentStatus: 'paid'
      });

      toast.success("Pago registrado exitosamente", {
        description: "La reserva ahora está lista para generar contrato.",
      });
      
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['reservations-finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      onUpdate();
    } catch (error: any) {
      console.error("[Marcar como Pagado] ❌ Error:", error);
      toast.error("Error al registrar pago", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * CANCELAR CON DEVOLUCIÓN
   * Marca estado = cancelada, payment_status = refunded (si había pago)
   */
  const handleCancelWithRefund = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Debe indicar el motivo de cancelación");
      return;
    }

    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const hadPayment = reservation.payment_status === 'paid';

      const { error: reservationError } = await supabase
        .from("reservations")
        .update({
          estado: "cancelada",                                    // Estado unificado
          payment_status: hadPayment ? "refunded" : "pending",    // Marcar devolución si había pago
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          cancellation_reason: cancellationReason,
          refund_status: hadPayment ? "pending" : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.id);

      if (reservationError) throw reservationError;

      // Liberar el vehículo
      const { data: reservationData } = await supabase
        .from("reservations")
        .select("vehicle_id")
        .eq("id", reservation.id)
        .single();

      if (reservationData?.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ estado: "disponible" })
          .eq("id", reservationData.vehicle_id);
      }

      toast.success("Reserva cancelada", {
        description: hadPayment 
          ? "El proceso de devolución ha sido iniciado."
          : "La reserva ha sido cancelada.",
      });
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      onUpdate();
    } catch (error: any) {
      console.error("Error cancelling reservation:", error);
      toast.error("Error al cancelar reserva", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * CANCELAR SIN DEVOLUCIÓN
   */
  const handleCancelWithoutRefund = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Debe indicar el motivo de cancelación");
      return;
    }

    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from("reservations")
        .update({
          estado: "cancelada",
          payment_status: "paid",  // Mantener paid = sin devolución
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          cancellation_reason: cancellationReason,
          refund_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.id);

      if (error) throw error;

      // Liberar el vehículo
      const { data: reservationData } = await supabase
        .from("reservations")
        .select("vehicle_id")
        .eq("id", reservation.id)
        .single();

      if (reservationData?.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ estado: "disponible" })
          .eq("id", reservationData.vehicle_id);
      }

      toast.success("Reserva cancelada", {
        description: "La reserva ha sido cancelada sin devolución.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      onUpdate();
    } catch (error: any) {
      console.error("Error cancelling reservation:", error);
      toast.error("Error al cancelar reserva", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!stateConfig.hasAutoCancelTimer) return null;
    
    const now = new Date();
    let cancelAt: Date;
    
    if (reservation.auto_cancel_at) {
      cancelAt = new Date(reservation.auto_cancel_at);
    } else {
      cancelAt = new Date(new Date(reservation.created_at).getTime() + (2 * 60 * 60 * 1000));
    }
    
    const diff = cancelAt.getTime() - now.getTime();
    
    if (diff <= 0) return "Expirado";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m restantes`;
  };

  // ============================================
  // RENDERIZADO BASADO EN ESTADO UNIFICADO
  // ============================================

  // RESERVADO SIN PAGO - Mostrar botón de marcar como pagado
  if (normalizedEstado === "reservado_sin_pago") {
    const timeRemaining = getTimeRemaining();
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        {timeRemaining && (
          <div className={`text-xs font-medium ${timeRemaining === "Expirado" ? "text-red-600" : "text-orange-600"}`}>
            ⏱️ {timeRemaining}
          </div>
        )}
        <Button onClick={handleMarkAsPaid} disabled={loading} size="sm" variant="default" className="w-full">
          <CreditCard className="mr-2 h-4 w-4" />
          Marcar como Pagado
        </Button>
      </div>
    );
  }

  // RESERVADO CON PAGO - Puede cancelar con/sin devolución
  if (normalizedEstado === "reservado_con_pago") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={loading} className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar con Devolución
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar reserva con devolución?</AlertDialogTitle>
              <AlertDialogDescription>
                Se cancelará la reserva de {reservation.cliente_nombre} y se iniciará el proceso de devolución de dinero.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Motivo de cancelación</label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ingrese el motivo de la cancelación..."
                className="w-full"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancellationReason("")}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
                Confirmar Cancelación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="text-xs text-green-600 text-center">
          ✅ Pago confirmado - Listo para contrato
        </div>
      </div>
    );
  }

  // PENDIENTE DE CONTRATO
  if (normalizedEstado === "pendiente_contrato") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-blue-600 text-center">
          <FileText className="h-4 w-4 inline mr-1" />
          Contrato pendiente de firma
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading} className="w-full text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta reserva tiene un contrato pendiente de firma. ¿Desea cancelar con o sin devolución?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Motivo de cancelación</label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ingrese el motivo de la cancelación..."
                className="w-full"
              />
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setCancellationReason("")}>Mantener Reserva</AlertDialogCancel>
              <Button variant="outline" onClick={handleCancelWithoutRefund} disabled={loading}>
                Sin Devolución
              </Button>
              <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
                Con Devolución
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // CONFIRMADO (contrato firmado, en uso)
  if (normalizedEstado === "confirmado") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-red-600 text-center">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          En alquiler activo
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading} className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Reserva
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar reserva confirmada?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta reserva tiene un contrato firmado. La cancelación liberará el vehículo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Motivo de cancelación</label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ingrese el motivo de la cancelación..."
                className="w-full"
              />
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setCancellationReason("")}>Mantener</AlertDialogCancel>
              <Button variant="outline" onClick={handleCancelWithoutRefund} disabled={loading}>
                Sin Devolución
              </Button>
              <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
                Con Devolución
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // COMPLETADA
  if (normalizedEstado === "completada") {
    return (
      <div className="text-xs text-center text-muted-foreground">
        <CheckCircle className="h-4 w-4 mx-auto mb-1 text-blue-600" />
        Completada
      </div>
    );
  }

  // EXPIRADA
  if (normalizedEstado === "expirada") {
    return (
      <div className="text-xs text-center text-red-600">
        <XCircle className="h-4 w-4 mx-auto mb-1" />
        Expirada por falta de pago
      </div>
    );
  }

  // CANCELADA
  if (normalizedEstado === "cancelada") {
    return (
      <div className="text-xs text-center text-muted-foreground">
        <XCircle className="h-4 w-4 mx-auto mb-1 text-red-600" />
        {reservation.payment_status === 'refunded' ? 'Cancelada (con devolución)' : 'Cancelada'}
      </div>
    );
  }

  // DEFAULT - mostrar estado actual
  return (
    <div className="text-xs text-center text-muted-foreground">
      {stateConfig.label}
    </div>
  );
};
