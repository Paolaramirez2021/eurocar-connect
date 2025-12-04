import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Phone, DollarSign, FileText, Wrench, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Reservation {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  valor_total: number | null;
  price_total: number | null;
  notas: string | null;
  contract_id?: string | null;
}

interface Maintenance {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string | null;
  costo: number;
}

interface EventDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation;
  maintenance?: Maintenance;
  date: Date;
}

export const EventDetailsModal = ({
  open,
  onOpenChange,
  reservation,
  maintenance,
  date
}: EventDetailsModalProps) => {
  const navigate = useNavigate();

  const hasMultipleEvents = reservation && maintenance;
  const hasContract = reservation?.contract_id != null;
  const isConfirmed = hasContract || reservation?.estado === 'confirmed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Eventos del {format(date, "d 'de' MMMM", { locale: es })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Reserva o Contrato */}
          {reservation && (
            <div className={`p-4 rounded-lg border ${hasContract ? 'bg-blue-50 border-blue-200' : 'bg-success/5 border-success/20'}`}>
              <div className="flex items-center justify-between mb-3">
                <Badge className={hasContract ? "bg-blue-600 text-white" : "bg-success text-success-foreground"}>
                  {hasContract ? "Contrato" : "Reserva"}
                </Badge>
                <Badge variant="outline">
                  {hasContract ? 'Confirmado' : (reservation.estado === 'confirmed' ? 'Confirmada' : 'Pendiente')}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{reservation.cliente_nombre}</p>
                  </div>
                </div>

                {reservation.cliente_telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{reservation.cliente_telefono}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>
                    {format(new Date(reservation.fecha_inicio), "d MMM", { locale: es })} - {format(new Date(reservation.fecha_fin), "d MMM yyyy", { locale: es })}
                  </p>
                </div>

                {(reservation.valor_total || reservation.price_total) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold">
                      ${(reservation.valor_total || reservation.price_total || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                )}

                {reservation.notas && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-muted-foreground text-xs">{reservation.notas}</p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  if (hasContract) {
                    // Navegar a contratos con el ID del contrato
                    navigate(`/contracts?contractId=${reservation.contract_id}`);
                  } else {
                    // Navegar a reservas con el ID de la reserva
                    navigate(`/gestion-reservas?reservationId=${reservation.id}`);
                  }
                  onOpenChange(false);
                }}
                className="w-full mt-4"
                variant="outline"
              >
                {hasContract ? "Ver contrato" : "Ver reserva completa"}
              </Button>
            </div>
          )}

          {/* Separador si hay ambos */}
          {hasMultipleEvents && <Separator />}

          {/* Mantenimiento */}
          {maintenance && (
            <div className="p-4 rounded-lg border bg-warning/5 border-warning/20">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-warning text-warning-foreground">
                  Mantenimiento
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{maintenance.tipo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>{format(new Date(maintenance.fecha), "d 'de' MMMM yyyy", { locale: es })}</p>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold">
                    ${maintenance.costo.toLocaleString('es-CO')}
                  </p>
                </div>

                {maintenance.descripcion && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-muted-foreground text-xs">{maintenance.descripcion}</p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  navigate('/maintenance');
                  onOpenChange(false);
                }}
                className="w-full mt-4"
                variant="outline"
              >
                Ver ficha de mantenimiento
              </Button>
            </div>
          )}

          {/* Mensaje si no hay eventos */}
          {!reservation && !maintenance && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay eventos para este día</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
