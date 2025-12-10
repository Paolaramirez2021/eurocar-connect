import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, CreditCard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Reservation {
  id: string;
  cliente_nombre: string;
  estado: string;
  payment_status: string;
  auto_cancel_at: string | null;
}

interface ReservationActionsProps {
  reservation: Reservation;
  onUpdate: () => void;
}

export const ReservationActions = ({ reservation, onUpdate }: ReservationActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const queryClient = useQueryClient();

  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      console.log('[Marcar como Pagado] Iniciando...', {
        reservationId: reservation.id,
        estadoActual: reservation.estado,
        paymentStatusActual: reservation.payment_status
      });

      const { data, error } = await supabase
        .from("reservations")
        .update({
          payment_status: "paid",
          payment_date: new Date().toISOString(),
          estado: "pending_with_payment",
          auto_cancel_at: null, // Remove auto-cancel since payment is confirmed
        })
        .eq("id", reservation.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      console.log('[Marcar como Pagado] ✅ Actualizado:', {
        reservationId: data.id,
        nuevoEstado: data.estado,
        nuevoPaymentStatus: data.payment_status,
        paymentDate: data.payment_date
      });

      toast.success("Pago registrado exitosamente", {
        description: "La reserva ahora está pendiente de contrato.",
      });
      
      // Invalidate queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
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

  const handleCancelWithRefund = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Debe indicar el motivo de cancelación");
      return;
    }

    setLoading(true);
    try {
      const { error: reservationError } = await supabase
        .from("reservations")
        .update({
          estado: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: (await supabase.auth.getUser()).data.user?.id,
          cancellation_reason: cancellationReason,
          refund_status: "pending",
        })
        .eq("id", reservation.id);

      if (reservationError) throw reservationError;

      // Update vehicle status to available
      const { data: reservationData } = await supabase
        .from("reservations")
        .select("vehicle_id")
        .eq("id", reservation.id)
        .single();

      if (reservationData) {
        await supabase
          .from("vehicles")
          .update({ estado: "disponible" })
          .eq("id", reservationData.vehicle_id);
      }

      toast.success("Reserva cancelada", {
        description: "El proceso de devolución ha sido iniciado.",
      });
      
      // Invalidate queries to refresh data immediately
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
    if (!reservation.auto_cancel_at) return null;
    
    const now = new Date();
    const cancelAt = new Date(reservation.auto_cancel_at);
    const diff = cancelAt.getTime() - now.getTime();
    
    if (diff <= 0) return "Expirado";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m restantes`;
  };

  // Actions for pending_no_payment OR old "pending" status without payment
  if (
    reservation.estado === "pending_no_payment" || 
    (reservation.estado === "pending" && reservation.payment_status === "pending") ||
    (reservation.estado === "pending" && !reservation.payment_status)
  ) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        {reservation.auto_cancel_at && (
          <div className="text-xs text-orange-600 font-medium">
            ⏱️ {getTimeRemaining()}
          </div>
        )}
        <Button onClick={handleMarkAsPaid} disabled={loading} size="sm" variant="default" className="w-full">
          <CreditCard className="mr-2 h-4 w-4" />
          Marcar como Pagado
        </Button>
      </div>
    );
  }

  // Actions for pending_with_payment OR paid status
  if (
    reservation.estado === "pending_with_payment" || 
    reservation.payment_status === "paid"
  ) {
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
                Esta acción cancelará la reserva de {reservation.cliente_nombre} e iniciará el proceso de devolución de dinero.
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
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
                Confirmar Cancelación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="text-xs text-green-600 text-center">
          ✅ Pago confirmado
        </div>
      </div>
    );
  }

  // For confirmed reservations - allow cancellation
  if (reservation.estado === "confirmed") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={loading} className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Reserva
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar reserva confirmada?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción cancelará la reserva de {reservation.cliente_nombre} y liberará los días del vehículo.
                {reservation.payment_status === "paid" && " Se iniciará el proceso de devolución de dinero."}
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
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
                Confirmar Cancelación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="text-xs text-green-600 text-center">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          Confirmada
        </div>
      </div>
    );
  }

  // For completed reservations
  if (reservation.estado === "completed") {
    return (
      <div className="text-xs text-center text-muted-foreground">
        <CheckCircle className="h-4 w-4 mx-auto mb-1 text-blue-600" />
        Completada
      </div>
    );
  }

  // For cancelled reservations
  if (reservation.estado === "cancelled") {
    return (
      <div className="text-xs text-center text-muted-foreground">
        <XCircle className="h-4 w-4 mx-auto mb-1 text-red-600" />
        Cancelada
      </div>
    );
  }

  // Default - show estado
  return (
    <div className="text-xs text-center text-muted-foreground">
      {reservation.estado}
    </div>
  );
};
