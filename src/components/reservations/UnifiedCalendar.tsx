import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isPicoPlacaDay } from "@/lib/picoPlaca";
import { PicoPlacaModal } from "./PicoPlacaModal";
import { EventDetailsModal } from "./EventDetailsModal";
import { AlertTriangle, Wrench, Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  payment_status?: string;
}

interface Maintenance {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string | null;
  costo: number;
}

interface PicoPlacaPayment {
  fecha: string;
  pagado: boolean;
}

interface UnifiedCalendarProps {
  vehicleId: string;
  placa: string;
  currentMonth: Date;
}

export const UnifiedCalendar = ({ vehicleId, placa, currentMonth }: UnifiedCalendarProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [picoPlacaPayments, setPicoPlacaPayments] = useState<PicoPlacaPayment[]>([]);
  const [selectedPicoPlacaDate, setSelectedPicoPlacaDate] = useState<Date | null>(null);
  const [picoPlacaModalOpen, setPicoPlacaModalOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(() => {
    const saved = localStorage.getItem('unified-calendar-legend-open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Save legend state to localStorage whenever it changes
  const handleLegendToggle = (open: boolean) => {
    setLegendOpen(open);
    localStorage.setItem('unified-calendar-legend-open', JSON.stringify(open));
  };

  useEffect(() => {
    loadData();
    
    // Real-time subscriptions
    const reservationsChannel = supabase
      .channel('reservations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservations', filter: `vehicle_id=eq.${vehicleId}` },
        () => loadReservations()
      )
      .subscribe();

    const maintenanceChannel = supabase
      .channel('maintenance-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance', filter: `vehicle_id=eq.${vehicleId}` },
        () => loadMaintenances()
      )
      .subscribe();

    const picoPlacaChannel = supabase
      .channel('pico-placa-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pico_placa_payments', filter: `vehicle_id=eq.${vehicleId}` },
        () => loadPicoPlacaPayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(maintenanceChannel);
      supabase.removeChannel(picoPlacaChannel);
    };
  }, [vehicleId, currentMonth]);

  const loadData = async () => {
    await Promise.all([
      loadReservations(),
      loadMaintenances(),
      loadPicoPlacaPayments()
    ]);
  };

  const loadReservations = async () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Traer reservas con información de contrato si existe
    const { data: reservationsData, error: resError } = await supabase
      .from("reservations")
      .select("id, fecha_inicio, fecha_fin, estado, cliente_nombre, cliente_telefono, valor_total, price_total, notas, payment_status")
      .eq("vehicle_id", vehicleId)
      .in("estado", ["pending", "confirmed", "completed", "pending_no_payment", "pending_with_payment"])
      .gte("fecha_fin", startOfMonth.toISOString())
      .lte("fecha_inicio", endOfMonth.toISOString());

    if (resError) {
      console.error("Error loading reservations:", resError);
      toast.error("Error al cargar reservas");
      return;
    }

    // Buscar contratos asociados a estas reservas
    if (reservationsData && reservationsData.length > 0) {
      const reservationIds = reservationsData.map(r => r.id);
      const { data: contractsData } = await supabase
        .from("contracts")
        .select("id, reservation_id")
        .in("reservation_id", reservationIds);

      // Mapear contratos a reservas
      const reservationsWithContracts = reservationsData.map(reservation => ({
        ...reservation,
        contract_id: contractsData?.find(c => c.reservation_id === reservation.id)?.id || null
      }));

      setReservations(reservationsWithContracts);
    } else {
      setReservations([]);
    }
  };

  const loadMaintenances = async () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from("maintenance")
      .select("id, fecha, tipo, descripcion, costo")
      .eq("vehicle_id", vehicleId)
      .gte("fecha", startOfMonth.toISOString())
      .lte("fecha", endOfMonth.toISOString());

    if (error) {
      console.error("Error loading maintenance:", error);
      return;
    }

    setMaintenances(data || []);
  };

  const loadPicoPlacaPayments = async () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from("pico_placa_payments")
      .select("fecha, pagado")
      .eq("vehicle_id", vehicleId)
      .gte("fecha", startOfMonth.toISOString().split('T')[0])
      .lte("fecha", endOfMonth.toISOString().split('T')[0]);

    if (error) {
      console.error("Error loading pico placa payments:", error);
      return;
    }

    setPicoPlacaPayments(data || []);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  };

  const getReservationForDate = (date: Date): Reservation | undefined => {
    return reservations.find(reservation => {
      const inicio = new Date(reservation.fecha_inicio);
      const fin = new Date(reservation.fecha_fin);
      return date >= inicio && date <= fin;
    });
  };

  const getMaintenanceForDate = (date: Date): Maintenance | undefined => {
    return maintenances.find(maintenance => {
      const maintenanceDate = new Date(maintenance.fecha);
      return maintenanceDate.toDateString() === date.toDateString();
    });
  };

  const getPicoPlacaPayment = (date: Date) => {
    return picoPlacaPayments.find(payment => {
      const paymentDate = new Date(payment.fecha + 'T00:00:00');
      return paymentDate.toDateString() === date.toDateString();
    });
  };

  const handlePicoPlacaClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPicoPlacaDate(date);
    setPicoPlacaModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    const reservation = getReservationForDate(date);
    const maintenance = getMaintenanceForDate(date);
    
    // Solo abrir modal si hay eventos
    if (reservation || maintenance) {
      setSelectedDate(date);
      setEventModalOpen(true);
    }
  };

  const days = getDaysInMonth();
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <>
      <Card className="p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {days.map(day => {
            const reservation = getReservationForDate(day);
            const maintenance = getMaintenanceForDate(day);
            const picoPlaca = isPicoPlacaDay(day, placa);
            const picoPlacaPayment = getPicoPlacaPayment(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const hasEvents = reservation || maintenance;

            // Determinar el color y texto basado en el estado de la reserva
            let reservationColor = '';
            let reservationLabel = '';
            let reservationBadgeClass = '';
            
            if (reservation) {
              if (reservation.estado === 'confirmed' || reservation.contract_id) {
                // Confirmado con contrato = ROJO (Rentado)
                reservationColor = 'bg-red-500/10 border-red-500 hover:bg-red-500/20';
                reservationLabel = 'Rentado';
                reservationBadgeClass = 'bg-red-500 text-white';
              } else if (reservation.estado === 'pending_with_payment' || reservation.payment_status === 'paid') {
                // Reservado con pago = VERDE
                reservationColor = 'bg-green-400/10 border-green-400 hover:bg-green-400/20';
                reservationLabel = 'Reservado (Pagado)';
                reservationBadgeClass = 'bg-green-400 text-white';
              } else if (reservation.estado === 'pending_no_payment' || reservation.payment_status === 'pending') {
                // Reservado sin pago = AMARILLO/LIMA
                reservationColor = 'bg-lime-400/10 border-lime-400 hover:bg-lime-400/20';
                reservationLabel = 'Reservado (Sin pago)';
                reservationBadgeClass = 'bg-lime-400 text-white';
              } else {
                // Fallback para otros estados
                reservationColor = 'bg-success/10 border-success hover:bg-success/20';
                reservationLabel = 'Reserva';
                reservationBadgeClass = 'bg-success text-success-foreground';
              }
            }

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square p-2 rounded-lg border-2 transition-all relative
                  ${isToday ? 'border-primary' : 'border-border'}
                  ${reservation ? reservationColor : 'bg-card'}
                  ${maintenance ? 'bg-warning/10 border-warning hover:bg-warning/20' : ''}
                  ${hasEvents ? 'cursor-pointer' : ''}
                  ${!hasEvents ? 'hover:bg-accent/50' : ''}
                `}
              >
                <div className="text-sm font-medium">{day.getDate()}</div>
                
                <div className="flex flex-col gap-1 mt-1">
                  {reservation && (
                    <Badge className={`text-[10px] px-1 py-0 ${reservationBadgeClass}`}>
                      {reservationLabel}
                    </Badge>
                  )}
                  
                  {maintenance && (
                    <div className="flex items-center gap-1 text-warning">
                      <Wrench className="h-3 w-3" />
                    </div>
                  )}
                  
                  {picoPlaca && (
                    <button
                      onClick={(e) => handlePicoPlacaClick(day, e)}
                      className={`
                        flex items-center gap-1 text-xs rounded px-1 py-0.5 transition-colors
                        ${picoPlacaPayment?.pagado 
                          ? 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30' 
                          : 'bg-orange-500/20 text-orange-600 hover:bg-orange-500/30'
                        }
                      `}
                      title={picoPlacaPayment?.pagado ? "Pico y Placa Pagado" : "Restricción Pico y Placa - Click para registrar"}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {picoPlacaPayment?.pagado && <span>✓</span>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend - Colapsable */}
        <Collapsible open={legendOpen} onOpenChange={handleLegendToggle} className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Leyenda:</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {legendOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle leyenda</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/10 border-2 border-red-500" />
                <span className="text-sm">Rentado (confirmado)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-400/10 border-2 border-green-400" />
                <span className="text-sm">Reservado con pago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-lime-400/10 border-2 border-lime-400" />
                <span className="text-sm">Reservado sin pago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-warning/10 border-2 border-warning" />
                <span className="text-sm">Mantenimiento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-card border-2 border-border" />
                <span className="text-sm">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Pico y Placa</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {selectedPicoPlacaDate && (
        <PicoPlacaModal
          open={picoPlacaModalOpen}
          onOpenChange={setPicoPlacaModalOpen}
          vehicleId={vehicleId}
          placa={placa}
          fecha={selectedPicoPlacaDate}
          onSuccess={loadPicoPlacaPayments}
        />
      )}

      {selectedDate && (
        <EventDetailsModal
          open={eventModalOpen}
          onOpenChange={setEventModalOpen}
          reservation={getReservationForDate(selectedDate)}
          maintenance={getMaintenanceForDate(selectedDate)}
          date={selectedDate}
        />
      )}
    </>
  );
};
