import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, User, CreditCard, XCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ReservationDetails {
  id: string;
  cliente_nombre: string;
  cliente_contacto: string;
  cliente_email: string | null;
  cliente_documento: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  payment_status: string;
  payment_date: string | null;
  payment_reference: string | null;
  valor_total: number | null;
  dias_totales: number | null;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  refund_status: string | null;
  refund_date: string | null;
  refund_reference: string | null;
  vehicles?: {
    placa: string;
    marca: string;
    modelo: string;
  };
}

interface ReservationDetailsModalProps {
  reservation: ReservationDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReservationDetailsModal = ({ reservation, open, onOpenChange }: ReservationDetailsModalProps) => {
  if (!reservation) return null;

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pendiente" },
      pending_no_payment: { variant: "outline", label: "Sin Pago" },
      pending_with_payment: { variant: "default", label: "Con Pago" },
      confirmed: { variant: "default", label: "Confirmada" },
      completed: { variant: "default", label: "Completada" },
      cancelled: { variant: "destructive", label: "Cancelada" },
    };
    
    const config = variants[estado] || { variant: "outline" as const, label: estado };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pendiente" },
      paid: { variant: "default", label: "Pagado" },
      refunded: { variant: "secondary", label: "Reembolsado" },
    };
    
    const config = variants[paymentStatus] || { variant: "outline" as const, label: paymentStatus };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRefundBadge = (refundStatus: string | null) => {
    if (!refundStatus) return null;
    
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Devolución Pendiente" },
      processing: { variant: "secondary", label: "Procesando Devolución" },
      completed: { variant: "default", label: "Devuelto" },
      failed: { variant: "destructive", label: "Devolución Fallida" },
    };
    
    const config = variants[refundStatus] || { variant: "outline" as const, label: refundStatus };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la Reserva</DialogTitle>
          <DialogDescription>
            Información completa de la reserva #{reservation.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cliente Info */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{reservation.cliente_nombre}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contacto:</span>
                <p className="font-medium">{reservation.cliente_contacto}</p>
              </div>
              {reservation.cliente_email && (
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{reservation.cliente_email}</p>
                </div>
              )}
              {reservation.cliente_documento && (
                <div>
                  <span className="text-muted-foreground">Documento:</span>
                  <p className="font-medium">{reservation.cliente_documento}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Vehicle and Dates */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Detalles de la Reserva
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Vehículo:</span>
                <p className="font-medium">
                  {reservation.vehicles?.marca} {reservation.vehicles?.modelo}
                </p>
                <p className="text-xs text-muted-foreground">{reservation.vehicles?.placa}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <div className="mt-1">{getEstadoBadge(reservation.estado)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Inicio:</span>
                <p className="font-medium">
                  {format(new Date(reservation.fecha_inicio), "PPP", { locale: es })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Fin:</span>
                <p className="font-medium">
                  {format(new Date(reservation.fecha_fin), "PPP", { locale: es })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Días Totales:</span>
                <p className="font-medium">{reservation.dias_totales || 0} días</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total:</span>
                <p className="font-medium text-lg">
                  ${reservation.valor_total?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Información de Pago
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Estado de Pago:</span>
                <div className="mt-1">{getPaymentBadge(reservation.payment_status)}</div>
              </div>
              {reservation.payment_date && (
                <div>
                  <span className="text-muted-foreground">Fecha de Pago:</span>
                  <p className="font-medium">
                    {format(new Date(reservation.payment_date), "PPP p", { locale: es })}
                  </p>
                </div>
              )}
              {reservation.payment_reference && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Referencia:</span>
                  <p className="font-medium font-mono text-xs">{reservation.payment_reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Info */}
          {(reservation.cancelled_at || reservation.refund_status) && (
            <>
              <Separator />
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  Historial de Cancelación
                </h3>
                <div className="space-y-3 text-sm">
                  {reservation.cancelled_at && (
                    <div>
                      <span className="text-muted-foreground">Fecha de Cancelación:</span>
                      <p className="font-medium">
                        {format(new Date(reservation.cancelled_at), "PPP p", { locale: es })}
                      </p>
                    </div>
                  )}
                  {reservation.cancellation_reason && (
                    <div>
                      <span className="text-muted-foreground">Motivo:</span>
                      <p className="font-medium bg-background p-3 rounded-md mt-1 border">
                        {reservation.cancellation_reason}
                      </p>
                    </div>
                  )}
                  {reservation.refund_status && (
                    <div>
                      <span className="text-muted-foreground">Estado de Devolución:</span>
                      <div className="mt-1">{getRefundBadge(reservation.refund_status)}</div>
                    </div>
                  )}
                  {reservation.refund_date && (
                    <div>
                      <span className="text-muted-foreground">Fecha de Devolución:</span>
                      <p className="font-medium">
                        {format(new Date(reservation.refund_date), "PPP p", { locale: es })}
                      </p>
                    </div>
                  )}
                  {reservation.refund_reference && (
                    <div>
                      <span className="text-muted-foreground">Referencia de Devolución:</span>
                      <p className="font-medium font-mono text-xs">{reservation.refund_reference}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Creada el {format(new Date(reservation.created_at), "PPP p", { locale: es })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
