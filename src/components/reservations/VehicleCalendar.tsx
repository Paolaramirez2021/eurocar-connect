import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { isPicoPlacaDay, getPicoPlacaInfo } from "@/lib/picoPlaca";
import { AlertCircle } from "lucide-react";

interface Reservation {
  id: string;
  cliente_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

interface VehicleCalendarProps {
  vehicleId: string;
  placa: string;
  marca: string;
  modelo: string;
  currentMonth: Date;
}

export const VehicleCalendar = ({ vehicleId, placa, marca, modelo, currentMonth }: VehicleCalendarProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    loadReservations();
    
    // Setup realtime subscription
    const channel = supabase
      .channel(`reservations-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `vehicle_id=eq.${vehicleId}`
        },
        () => {
          loadReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId, currentMonth]);

  const loadReservations = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .in("estado", ["pending", "confirmed"])
      .gte("fecha_inicio", start.toISOString())
      .lte("fecha_fin", end.toISOString());

    if (error) {
      console.error("Error loading reservations:", error);
      return;
    }
    setReservations(data || []);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const isReserved = (day: Date) => {
    return reservations.some((reservation) => {
      const start = parseISO(reservation.fecha_inicio);
      const end = parseISO(reservation.fecha_fin);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const hasPicoPlaca = (day: Date) => {
    return isPicoPlacaDay(day, placa);
  };

  // Get day of week for each calendar cell (0 = Monday in our display)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startDayOfWeek = getDay(firstDayOfMonth);
  // Adjust: getDay returns 0=Sunday, we want 0=Monday
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <span className="font-bold">{placa}</span>
            <span className="text-sm text-muted-foreground ml-2">
              {marca} {modelo}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            Pico y Placa: {getPicoPlacaInfo(placa)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, idx) => (
            <div key={idx} className="text-center font-semibold text-xs p-1">
              {day}
            </div>
          ))}
          
          {/* Empty cells for offset */}
          {Array.from({ length: offset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}
          
          {days.map((day, idx) => {
            const reserved = isReserved(day);
            const picoPlaca = hasPicoPlaca(day);
            const hasConflict = reserved && picoPlaca;
            
            return (
              <div
                key={idx}
                className={`
                  aspect-square border rounded-md p-1 flex flex-col items-center justify-center text-xs
                  ${reserved ? 'bg-green-500/20 border-green-500' : 'bg-background'}
                  ${hasConflict ? 'border-red-500 border-2' : ''}
                  transition-colors hover:bg-accent/50
                `}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {hasConflict && (
                  <span className="text-red-500 text-lg leading-none" title="Pico y Placa">
                    🚫
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded" />
            <span>Reservado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-background border rounded" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span>Pico y Placa</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
