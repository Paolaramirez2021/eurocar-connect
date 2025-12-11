import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, CreditCard, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getStateConfig, normalizeState, type CancellationType } from "@/config/states";

interface Reservation {
  id: string;
  cliente_nombre: string;
  estado: string;
  payment_status: string;
  auto_cancel_at: string | null;
  created_at: string;
  vehicle_id?: string;
  cancellation_type?: CancellationType;
}

interface ReservationActionsProps {
  reservation: Reservation;
  onUpdate: () => void;
}

export const ReservationActions = ({ reservation, onUpdate }: ReservationActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const queryClient = useQueryClient();

  const normalizedEstado = normalizeState(reservation.estado);
  const stateConfig = getStateConfig(reservation.estado);

  // Función para invalidar todas las queries relacionadas
  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['reservations-finance'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  };

  /**
   * MARCAR COMO PAGADO
   */
  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      console.log('[Marcar como Pagado] Iniciando...', { id: reservation.id, estadoActual: reservation.estado });

      const { data, error } = await supabase
        .from("reservations")
        .update({
          estado: "con_pago",
          payment_status: "paid",
          payment_date: new Date().toISOString(),
          auto_cancel_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservation.id)
        .select();

      if (error) {
        console.error('[Marcar como Pagado] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar. Verifique permisos.');
      }

      console.log('[Marcar como Pagado] ✅ Actualizado:', data[0]);
      toast.success("Pago registrado", { description: "La reserva está lista para generar contrato." });
      invalidateAllQueries();
      onUpdate();
    } catch (error: any) {
      console.error("[Marcar como Pagado] Error:", error);
      toast.error("Error al registrar pago", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  /**
   * CANCELAR CON DEVOLUCIÓN
   */
  const handleCancelWithRefund = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Debe indicar el motivo de cancelación");
      return;
    }

    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      console.log('[Cancelar con Devolución] Iniciando...', { id: reservation.id });

      const updateData: any = {
        estado: "cancelada",
        payment_status: "refunded",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: cancellationReason,
        refund_status: "pending",
        updated_at: new Date().toISOString(),
      };

      // Intentar agregar cancellation_type (puede no existir)
      try {
        updateData.cancellation_type = "con_devolucion";
      } catch (e) {}

      const { data, error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", reservation.id)
        .select();

      if (error) {
        console.error('[Cancelar] Error Supabase:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[Cancelar] No se actualizó ningún registro');
        throw new Error('No se pudo cancelar. Verifique permisos.');
      }

      // Liberar vehículo
      if (reservation.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ estado: "disponible" })
          .eq("id", reservation.vehicle_id);
      }

      console.log('[Cancelar con Devolución] ✅', data[0]);
      toast.success("Reserva cancelada", { description: "Proceso de devolución iniciado." });
      invalidateAllQueries();
      setCancellationReason("");
      onUpdate();
    } catch (error: any) {
      console.error("Error cancelando:", error);
      toast.error("Error al cancelar", { description: error.message });
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
      
      console.log('[Cancelar sin Devolución] Iniciando...', { id: reservation.id });

      const updateData: any = {
        estado: "cancelada",
        payment_status: "paid", // Mantiene paid = sin devolución
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: cancellationReason,
        refund_status: null,
        updated_at: new Date().toISOString(),
      };

      // Intentar agregar cancellation_type (puede no existir)
      try {
        updateData.cancellation_type = "sin_devolucion";
      } catch (e) {}

      const { data, error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", reservation.id)
        .select();

      if (error) {
        console.error('[Cancelar] Error Supabase:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[Cancelar] No se actualizó ningún registro');
        throw new Error('No se pudo cancelar. Verifique permisos.');
      }

      // Liberar vehículo
      if (reservation.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ estado: "disponible" })
          .eq("id", reservation.vehicle_id);
      }

      console.log('[Cancelar sin Devolución] ✅', data[0]);
      toast.success("Reserva cancelada", { description: "Sin proceso de devolución." });
      invalidateAllQueries();
      setCancellationReason("");
      onUpdate();
    } catch (error: any) {
      console.error("Error cancelando:", error);
      toast.error("Error al cancelar", { description: error.message });
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
    
    return `${hours}h ${minutes}m`;
  };

  // Componente de diálogo de cancelación reutilizable
  const CancelDialog = ({ trigger, showRefundOptions = false }: { trigger: React.ReactNode; showRefundOptions?: boolean }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cancelará la reserva de {reservation.cliente_nombre} y liberará el vehículo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Motivo de cancelación *</label>
          <Textarea
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Ingrese el motivo..."
            className="w-full"
          />
        </div>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => setCancellationReason("")}>Cancelar</AlertDialogCancel>
          {showRefundOptions ? (
            <>
              <Button variant="outline" onClick={handleCancelWithoutRefund} disabled={loading}>
                Sin Devolución
              </Button>
              <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
                Con Devolución
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction onClick={handleCancelWithRefund} disabled={loading}>
              Confirmar Cancelación
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ============================================
  // RENDERIZADO POR ESTADO
  // ============================================

  // SIN PAGO o PENDIENTE
  if (normalizedEstado === "sin_pago" || normalizedEstado === "pendiente") {
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
        <CancelDialog 
          trigger={
            <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          }
        />
      </div>
    );
  }

  // CON PAGO
  if (normalizedEstado === "con_pago") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-green-600 text-center">✅ Pago confirmado</div>
        <CancelDialog 
          showRefundOptions={true}
          trigger={
            <Button variant="destructive" size="sm" className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Reserva
            </Button>
          }
        />
      </div>
    );
  }

  // CONTRATO GENERADO
  if (normalizedEstado === "contrato_generado") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-blue-600 text-center">
          <FileText className="h-4 w-4 inline mr-1" />
          Contrato pendiente de firma
        </div>
        <CancelDialog 
          showRefundOptions={true}
          trigger={
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          }
        />
      </div>
    );
  }

  // CONFIRMADO
  if (normalizedEstado === "confirmado") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-red-600 text-center">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          En alquiler activo
        </div>
        <CancelDialog 
          showRefundOptions={true}
          trigger={
            <Button variant="outline" size="sm" className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Reserva
            </Button>
          }
        />
      </div>
    );
  }

  // COMPLETADA
  if (normalizedEstado === "completada") {
    return (
      <div className="text-xs text-center text-muted-foreground">
        <CheckCircle className="h-4 w-4 mx-auto mb-1 text-slate-600" />
        Completada
      </div>
    );
  }

  // EXPIRADA
  if (normalizedEstado === "expirada") {
    return (
      <div className="text-xs text-center text-orange-600">
        <XCircle className="h-4 w-4 mx-auto mb-1" />
        Expirada
      </div>
    );
  }

  // CANCELADA
  if (normalizedEstado === "cancelada") {
    const label = reservation.cancellation_type === 'con_devolucion' 
      ? 'Cancelada (con devolución)' 
      : reservation.cancellation_type === 'sin_devolucion'
        ? 'Cancelada (sin devolución)'
        : 'Cancelada';
    return (
      <div className="text-xs text-center text-red-700">
        <XCircle className="h-4 w-4 mx-auto mb-1" />
        {label}
      </div>
    );
  }

  // DEFAULT
  return (
    <div className="text-xs text-center text-muted-foreground">
      {stateConfig.label}
    </div>
  );
};
