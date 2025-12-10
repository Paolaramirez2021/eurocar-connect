import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ChevronDown, ChevronUp, User, Calendar, Phone, Mail, Wrench, DollarSign } from "lucide-react";
import { eachDayOfInterval, format, isWithinInterval, getDaysInMonth, startOfMonth, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { isColombianHoliday } from "@/lib/colombianHolidays";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CalendarAvailabilityReportProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface DayStatus {
  date: Date;
  status: 'rented' | 'reserved_paid' | 'reserved_no_payment' | 'maintenance' | 'available';
  isPicoPlaca?: boolean;
  isHoliday?: boolean;
  reservationId?: string;
  maintenanceId?: string;
}

interface VehicleCalendar {
  vehicleId: string;
  placa: string;
  marca: string;
  modelo: string;
  days: DayStatus[];
  totalAvailable: number;
  totalOccupied: number;
  totalMaintenance: number;
}

export const CalendarAvailabilityReport = ({ dateRange }: CalendarAvailabilityReportProps) => {
  const [legendOpen, setLegendOpen] = useState(() => {
    const saved = localStorage.getItem('calendar-legend-open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [selectedDay, setSelectedDay] = useState<{
    vehicle: { placa: string; marca: string; modelo: string };
    day: DayStatus;
  } | null>(null);

  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Save legend state to localStorage whenever it changes
  const handleLegendToggle = (open: boolean) => {
    setLegendOpen(open);
    localStorage.setItem('calendar-legend-open', JSON.stringify(open));
  };

  const handleDayClick = async (vehicle: VehicleCalendar, day: DayStatus) => {
    if (day.status === 'available') return;
    
    setSelectedDay({ vehicle, day });
    setLoadingDetails(true);
    
    try {
      if (day.status === 'rented' || day.status === 'reserved_paid' || day.status === 'reserved_no_payment') {
        // Load reservation and contract details
        const { data: reservation, error: resError } = await supabase
          .from('reservations')
          .select(`
            *,
            contracts (
              contract_number,
              signature_url,
              pdf_url,
              customer_name,
              customer_document,
              customer_email,
              customer_phone
            )
          `)
          .eq('id', day.reservationId!)
          .single();

        if (resError) throw resError;
        setDayDetails(reservation);
      } else if (day.status === 'maintenance') {
        // Load maintenance details
        const { data: maintenance, error: maintError } = await supabase
          .from('maintenance')
          .select('*')
          .eq('id', day.maintenanceId!)
          .single();

        if (maintError) throw maintError;
        setDayDetails(maintenance);
      }
    } catch (error) {
      console.error('Error loading day details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('placa');
      if (error) throw error;
      return data;
    }
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations-calendar', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .in('estado', ['confirmed', 'pending', 'completed'])
        .gte('fecha_fin', dateRange.from.toISOString())
        .lte('fecha_inicio', dateRange.to.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!dateRange.from && !!dateRange.to
  });

  const { data: maintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-calendar', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .gte('fecha', dateRange.from.toISOString())
        .lte('fecha', dateRange.to.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!dateRange.from && !!dateRange.to
  });

  const calendarData = useMemo<VehicleCalendar[]>(() => {
    if (!vehicles || !reservations || !maintenance) return [];

    console.log('[Calendario] Generando datos:', {
      vehiculos: vehicles?.length,
      reservas: reservations?.length,
      mantenimientos: maintenance?.length,
      rangoDesde: format(dateRange.from, 'yyyy-MM-dd'),
      rangoHasta: format(dateRange.to, 'yyyy-MM-dd')
    });

    const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return vehicles.map(vehicle => {
      const days: DayStatus[] = allDays.map(day => {
        // Check for reservations
        const reservation = reservations.find(res => {
          if (res.vehicle_id !== vehicle.id) return false;
          const resStart = new Date(res.fecha_inicio);
          const resEnd = new Date(res.fecha_fin);
          const matches = isWithinInterval(day, { start: resStart, end: resEnd });
          
          if (matches) {
            console.log('[Calendario] Reserva encontrada:', {
              vehiculo: vehicle.placa,
              dia: format(day, 'yyyy-MM-dd'),
              reservaInicio: format(resStart, 'yyyy-MM-dd'),
              reservaFin: format(resEnd, 'yyyy-MM-dd'),
              estado: res.estado
            });
          }
          
          return matches;
        });

        // Check for maintenance
        const maintenanceItem = maintenance.find(maint => {
          if (maint.vehicle_id !== vehicle.id) return false;
          const maintDate = new Date(maint.fecha);
          return format(maintDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });

        // Determine status based on estado values
        let status: DayStatus['status'] = 'available';
        let reservationId: string | undefined;
        let maintenanceId: string | undefined;

        if (maintenanceItem) {
          status = 'maintenance';
          maintenanceId = maintenanceItem.id;
        } else if (reservation) {
          reservationId = reservation.id;
          const estado = reservation.estado?.toLowerCase() || '';
          
          // Estados que indican que está rentado/ocupado (rojo)
          if (estado === 'confirmed' || estado === 'completed' || estado === 'active') {
            status = 'rented';
          } 
          // Reservado con pago (verde)
          else if (estado === 'pending_with_payment' || estado === 'reserved_paid') {
            status = 'reserved_paid';
          } 
          // Reservado sin pago (amarillo/lima)
          else if (estado === 'pending_no_payment' || estado === 'reserved_no_payment') {
            status = 'reserved_no_payment';
          }
          // Cualquier otro estado de reserva activa (pending genérico)
          else if (estado === 'pending' || estado.includes('reserv')) {
            status = 'reserved_no_payment'; // Por defecto pendiente sin pago
          }
        }

        // Check if it's a Colombian holiday
        const isHoliday = isColombianHoliday(day);

        return {
          date: day,
          status,
          isHoliday,
          reservationId,
          maintenanceId
        };
      });

      // Calculate totals - group both reserved types as occupied
      const totalOccupied = days.filter(d => d.status === 'rented').length;
      const totalReserved = days.filter(d => d.status === 'reserved_paid' || d.status === 'reserved_no_payment').length;
      const totalMaintenance = days.filter(d => d.status === 'maintenance').length;
      const totalAvailable = days.filter(d => d.status === 'available').length;

      return {
        vehicleId: vehicle.id,
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        days,
        totalAvailable,
        totalOccupied: totalOccupied + totalReserved,
        totalMaintenance
      };
    });
  }, [vehicles, reservations, maintenance, dateRange]);

  const isLoading = vehiclesLoading || reservationsLoading || maintenanceLoading;

  const getDayStatusColor = (status: DayStatus['status']) => {
    switch (status) {
      case 'rented':
        return 'bg-red-500 hover:bg-red-600';
      case 'reserved_paid':
        return 'bg-green-400 hover:bg-green-500';
      case 'reserved_no_payment':
        return 'bg-lime-400 hover:bg-lime-500';
      case 'maintenance':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-white border border-border hover:bg-muted/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get all unique days in the range
  const allDays = calendarData.length > 0 ? calendarData[0].days : [];

  return (
    <div className="space-y-4 mt-4">
      {/* Leyenda colapsable */}
      <Collapsible open={legendOpen} onOpenChange={handleLegendToggle}>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="font-semibold text-sm">Leyenda:</div>
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
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-b-lg text-xs sm:text-sm border-t">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded" />
              <span>Rentado (confirmado)</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded" />
              <span>Reservado con pago</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-lime-400 rounded" />
              <span>Reservado sin pago (2h)</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded" />
              <span>Mantenimiento</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white border border-border rounded" />
              <span>Disponible</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Wrapper con scroll horizontal mejorado */}
      <div className="rounded-md border overflow-x-auto w-full max-w-full">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 bg-background border-r w-[60px] text-xs p-1">
                Placa
              </TableHead>
              <TableHead className="sticky left-[60px] z-20 bg-background border-r w-[90px] text-xs p-1">
                Vehículo
              </TableHead>
              {allDays.map((day, idx) => (
                <TableHead 
                  key={idx} 
                  className={cn(
                    "text-center w-[28px] p-0 text-[10px]",
                    day.isHoliday && "bg-blue-50 dark:bg-blue-950"
                  )}
                  title={day.isHoliday ? `${format(day.date, 'd')} - Festivo` : format(day.date, 'd')}
                >
                  <div className="py-1">{format(day.date, 'd')}</div>
                </TableHead>
              ))}
              <TableHead className="text-center w-[60px] border-l text-xs p-1">
                Disp.
              </TableHead>
              <TableHead className="text-center w-[60px] border-l text-xs p-1">
                Ocup.
              </TableHead>
              <TableHead className="text-center w-[60px] border-l text-xs p-1">
                Mant.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calendarData.map((vehicle) => (
              <TableRow key={vehicle.vehicleId}>
                <TableCell className="sticky left-0 z-10 bg-background border-r font-medium text-xs p-1">
                  {vehicle.placa}
                </TableCell>
                <TableCell className="sticky left-[60px] z-10 bg-background border-r text-xs p-1">
                  <div className="truncate max-w-[90px]" title={`${vehicle.marca} ${vehicle.modelo}`}>
                    {vehicle.marca} {vehicle.modelo}
                  </div>
                </TableCell>
                {vehicle.days.map((day, idx) => (
                  <TableCell 
                    key={idx} 
                    className={cn(
                      "p-0",
                      day.isHoliday && "bg-blue-50/50 dark:bg-blue-950/50"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-7 h-7 rounded flex items-center justify-center transition-colors m-auto",
                        getDayStatusColor(day.status),
                        day.status !== 'available' && "cursor-pointer"
                      )}
                      onClick={() => handleDayClick(vehicle, day)}
                      title={`${format(day.date, 'd MMM', { locale: es })} - ${
                        day.status === 'rented' ? 'Rentado' :
                        day.status === 'reserved_paid' ? 'Reservado con pago' :
                        day.status === 'reserved_no_payment' ? 'Reservado sin pago (2h)' :
                        day.status === 'maintenance' ? 'Mantenimiento' :
                        'Disponible'
                      }${day.isHoliday ? ' (Festivo)' : ''}${day.status !== 'available' ? ' - Click para más detalles' : ''}`}
                    />
                  </TableCell>
                ))}
                <TableCell className="text-center font-semibold text-xs border-l p-1">
                  {vehicle.totalAvailable}
                </TableCell>
                <TableCell className="text-center font-semibold text-xs text-red-600 dark:text-red-400 border-l p-1">
                  {vehicle.totalOccupied}
                </TableCell>
                <TableCell className="text-center font-semibold text-xs text-orange-600 dark:text-orange-400 border-l p-1">
                  {vehicle.totalMaintenance}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {calendarData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hay datos para el rango de fechas seleccionado
        </div>
      )}

      {/* Nota sobre festivos y scroll */}
      <div className="space-y-2">
        {allDays.some(d => d.isHoliday) && (
          <div className="text-xs text-muted-foreground italic p-3 bg-blue-50/50 dark:bg-blue-950/50 rounded">
            * Los días con fondo azul son festivos colombianos. En estos días no aplica pico y placa.
          </div>
        )}
        <div className="text-xs text-muted-foreground italic p-3 bg-muted/30 rounded flex items-center gap-2">
          <span>💡</span>
          <span>Desliza horizontalmente para ver todos los días del mes. Haz clic en los cuadritos de color para ver detalles.</span>
        </div>
      </div>

      {/* Modal de detalles del día */}
      <Dialog open={!!selectedDay} onOpenChange={() => { setSelectedDay(null); setDayDetails(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalles del {selectedDay && format(selectedDay.day.date, "d 'de' MMMM, yyyy", { locale: es })}
            </DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedDay && dayDetails ? (
            <div className="space-y-6">
              {/* Información del vehículo */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Vehículo</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-lg font-medium">
                    {selectedDay.vehicle.marca} {selectedDay.vehicle.modelo}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Placa: <span className="font-mono font-semibold">{selectedDay.vehicle.placa}</span>
                  </p>
                </div>
              </div>

              <Separator />

              {/* Detalles según el estado */}
              {(selectedDay.day.status === 'rented' || selectedDay.day.status === 'reserved_paid' || selectedDay.day.status === 'reserved_no_payment') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Información de Reserva</h3>
                    <Badge variant={
                      selectedDay.day.status === 'rented' ? 'destructive' :
                      selectedDay.day.status === 'reserved_paid' ? 'default' :
                      'secondary'
                    }>
                      {selectedDay.day.status === 'rented' ? 'Rentado (Confirmado)' :
                       selectedDay.day.status === 'reserved_paid' ? 'Reservado con Pago' :
                       'Reservado sin Pago'}
                    </Badge>
                  </div>

                  {/* Datos del cliente */}
                  {dayDetails.contracts && dayDetails.contracts.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <User className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">Cliente</p>
                          <p className="text-base font-semibold">{dayDetails.contracts[0].customer_name}</p>
                          {dayDetails.contracts[0].customer_document && (
                            <p className="text-sm text-muted-foreground">
                              Documento: {dayDetails.contracts[0].customer_document}
                            </p>
                          )}
                        </div>
                      </div>

                      {dayDetails.contracts[0].customer_phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-muted-foreground">Teléfono</p>
                            <p className="text-base">{dayDetails.contracts[0].customer_phone}</p>
                          </div>
                        </div>
                      )}

                      {dayDetails.contracts[0].customer_email && (
                        <div className="flex items-start gap-2">
                          <Mail className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-muted-foreground">Email</p>
                            <p className="text-base">{dayDetails.contracts[0].customer_email}</p>
                          </div>
                        </div>
                      )}

                      {dayDetails.contracts[0].contract_number && (
                        <div className="pt-2 border-t">
                          <p className="font-medium text-sm text-muted-foreground">Número de Contrato</p>
                          <p className="text-base font-mono font-semibold">{dayDetails.contracts[0].contract_number}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fechas y duración */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">Fecha Inicio</p>
                        <p className="text-base font-semibold">
                          {format(new Date(dayDetails.fecha_inicio), "d 'de' MMM, yyyy", { locale: es })}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">Fecha Fin</p>
                        <p className="text-base font-semibold">
                          {format(new Date(dayDetails.fecha_fin), "d 'de' MMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="font-medium text-sm text-muted-foreground">Días de Alquiler</p>
                      <p className="text-2xl font-bold text-primary">
                        {differenceInDays(new Date(dayDetails.fecha_fin), new Date(dayDetails.fecha_inicio))} días
                      </p>
                    </div>
                  </div>

                  {/* Información financiera */}
                  {dayDetails.price_total && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">Valor Total</p>
                          <p className="text-2xl font-bold text-primary">
                            ${dayDetails.price_total.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {dayDetails.notas && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm text-muted-foreground mb-1">Notas</p>
                      <p className="text-sm">{dayDetails.notas}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Detalles de mantenimiento */}
              {selectedDay.day.status === 'maintenance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-orange-500" />
                      Mantenimiento
                    </h3>
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
                      En Mantenimiento
                    </Badge>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Tipo de Mantenimiento</p>
                      <p className="text-lg font-semibold">{dayDetails.tipo}</p>
                    </div>

                    {dayDetails.descripcion && (
                      <div className="pt-2 border-t">
                        <p className="font-medium text-sm text-muted-foreground">Descripción</p>
                        <p className="text-base">{dayDetails.descripcion}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <p className="font-medium text-sm text-muted-foreground">Fecha</p>
                      <p className="text-base font-semibold">
                        {format(new Date(dayDetails.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>

                    {dayDetails.costo && (
                      <div className="pt-2 border-t">
                        <p className="font-medium text-sm text-muted-foreground">Costo</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          ${dayDetails.costo.toLocaleString('es-CO')}
                        </p>
                      </div>
                    )}

                    {dayDetails.kms && (
                      <div className="pt-2 border-t">
                        <p className="font-medium text-sm text-muted-foreground">Kilometraje</p>
                        <p className="text-base font-semibold">
                          {dayDetails.kms.toLocaleString('es-CO')} km
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron detalles para este día
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};