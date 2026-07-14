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
  vehicle_id?: string;
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
  const isPaid = reservation.payment_status === 'paid' || 
                 reservation.estado === 'pending_with_payment' ||
                 reservation.estado === 'con_pago';
  const stateConfig = getStateConfig(reservation.estado, reservation.payment_status);

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
   * Actualiza el estado a 'pending_with_payment' para compatibilidad con BD existente
   */
  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      console.log('[Marcar como Pagado] Iniciando...', { id: reservation.id, estadoActual: reservation.estado });

      const { data, error } = await supabase
        .from("reservations")
        .update({
          estado: "pending_with_payment",  // Estado que indica pagado en la BD
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
        estado: "cancelled",  // Usar estado de BD nativo
        payment_status: "refunded",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: cancellationReason,
        refund_status: "pending",
        updated_at: new Date().toISOString(),
      };

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
        estado: "cancelled",  // Usar estado de BD nativo
        payment_status: "paid", // Mantiene paid = sin devolución
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: cancellationReason,
        refund_status: null,
        updated_at: new Date().toISOString(),
      };

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

  // Estado del diálogo de cancelación controlado manualmente
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelShowRefund, setCancelShowRefund] = useState(false);

  const openCancelDialog = (showRefund: boolean) => {
    setCancellationReason("");
    setCancelShowRefund(showRefund);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    setCancelDialogOpen(false);
    setCancellationReason("");
  };

  // Diálogo de cancelación controlado - renderizado una sola vez al final del componente
  const cancelDialogJsx = cancelDialogOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) closeCancelDialog(); }}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">¿Cancelar reserva?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Esta acción cancelará la reserva de {reservation.cliente_nombre} y liberará el vehículo.
        </p>
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Motivo de cancelación *</label>
          <textarea
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Ingrese el motivo..."
            className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeCancelDialog} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          {cancelShowRefund ? (
            <>
              <button type="button" onClick={async () => { await handleCancelWithoutRefund(); closeCancelDialog(); }} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                {loading ? 'Procesando...' : 'Sin Devolución'}
              </button>
              <button type="button" onClick={async () => { await handleCancelWithRefund(); closeCancelDialog(); }} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Procesando...' : 'Con Devolución'}
              </button>
            </>
          ) : (
            <button type="button" onClick={async () => { await handleCancelWithRefund(); closeCancelDialog(); }} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Procesando...' : 'Confirmar Cancelación'}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  // ============================================
  // RENDERIZADO POR ESTADO - Usando estados nativos de BD
  // ============================================

  // PENDING SIN PAGO (estado='pending' y payment_status='pending')
  if (normalizedEstado === "pending" && !isPaid) {
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
        <Button variant="ghost" size="sm" className="w-full text-red-600 hover:text-red-700" onClick={() => openCancelDialog(false)}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        {cancelDialogJsx}
      </div>
    );
  }

  // PENDING CON PAGO (estado='pending' y payment_status='paid')
  if (normalizedEstado === "pending" && isPaid) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-green-600 text-center">✅ Pago confirmado</div>
        <Button variant="destructive" size="sm" className="w-full" onClick={() => openCancelDialog(true)}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar Reserva
        </Button>
        {cancelDialogJsx}
      </div>
    );
  }

  // CONFIRMED (contrato firmado, vehículo en uso)
  if (normalizedEstado === "confirmed") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="text-xs text-red-600 text-center">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          En alquiler activo
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => openCancelDialog(true)}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar Reserva
        </Button>
        {cancelDialogJsx}
      </div>
    );
  }

  // COMPLETED
  if (normalizedEstado === "completed") {
    return (
      <div className="text-xs text-center text-muted-foreground">
        <CheckCircle className="h-4 w-4 mx-auto mb-1 text-slate-600" />
        Completada
      </div>
    );
  }

  // EXPIRED
  if (normalizedEstado === "expired") {
    return (
      <div className="text-xs text-center text-orange-600">
        <XCircle className="h-4 w-4 mx-auto mb-1" />
        Expirada
      </div>
    );
  }

  // CANCELLED
  if (normalizedEstado === "cancelled") {
    const label = reservation.payment_status === 'refunded' 
      ? 'Cancelada (con devolución)' 
      : reservation.payment_status === 'paid'
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
      {cancelDialogJsx}
    </div>
  );
};
