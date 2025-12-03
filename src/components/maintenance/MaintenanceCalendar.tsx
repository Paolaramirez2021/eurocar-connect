import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Gauge } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Schedule {
  id: string;
  vehicle_id: string;
  tipo: string;
  next_due_km: number | null;
  next_due_date: string | null;
  source: 'schedule' | 'maintenance';
  vehicles: {
    placa: string;
    marca: string;
    modelo: string;
    kilometraje_actual: number;
  };
}

export const MaintenanceCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['maintenance_schedules_calendar'],
    queryFn: async () => {
      console.log('📅 Cargando mantenimientos programados para calendario...');
      
      // Fetch scheduled maintenance
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          vehicles (
            placa,
            marca,
            modelo,
            kilometraje_actual
          )
        `)
        .eq('is_active', true)
        .not('next_due_date', 'is', null);
      
      if (schedulesError) {
        console.error('❌ Error cargando schedules:', schedulesError);
        throw schedulesError;
      }

      // Fetch future maintenance records
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance')
        .select(`
          id,
          vehicle_id,
          tipo,
          fecha,
          completed,
          vehicles (
            placa,
            marca,
            modelo,
            kilometraje_actual
          )
        `)
        .eq('completed', false)
        .gte('fecha', new Date().toISOString());
      
      if (maintenanceError) {
        console.error('❌ Error cargando maintenance:', maintenanceError);
        throw maintenanceError;
      }

      // Combine both sources
      const scheduledItems: Schedule[] = (schedulesData || []).map(s => ({
        id: s.id,
        vehicle_id: s.vehicle_id,
        tipo: s.tipo,
        next_due_km: s.next_due_km,
        next_due_date: s.next_due_date,
        source: 'schedule' as const,
        vehicles: s.vehicles
      }));

      const maintenanceItems: Schedule[] = (maintenanceData || []).map(m => ({
        id: m.id,
        vehicle_id: m.vehicle_id,
        tipo: m.tipo,
        next_due_km: null,
        next_due_date: m.fecha,
        source: 'maintenance' as const,
        vehicles: m.vehicles
      }));

      const combined = [...scheduledItems, ...maintenanceItems];
      
      console.log('✅ Datos cargados:', {
        schedules: scheduledItems.length,
        maintenance: maintenanceItems.length,
        total: combined.length
      });
      console.log('📊 Items:', combined);
      
      return combined;
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSchedulesForDay = (day: Date) => {
    return schedules?.filter(schedule => 
      schedule.next_due_date && isSameDay(new Date(schedule.next_due_date), day)
    ) || [];
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Cargando calendario...</div>
        </CardContent>
      </Card>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendario de Mantenimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground font-medium mb-2">No hay mantenimientos programados con fechas</p>
            <p className="text-sm text-muted-foreground mb-4">
              Para que aparezcan en el calendario, los mantenimientos deben tener una fecha programada (next_due_date).
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
              <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">¿Cómo agregar mantenimientos al calendario?</p>
              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Ve a la página de <strong>Vehículos</strong></li>
                <li>Edita un vehículo y configura los <strong>intervalos de mantenimiento</strong></li>
                <li>Los mantenimientos programados con fecha aparecerán automáticamente aquí</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendario de Mantenimientos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Days of week header */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {daysInMonth.map(day => {
            const schedulesForDay = getSchedulesForDay(day);
            const hasSchedules = schedulesForDay.length > 0;
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`
                  min-h-[80px] p-2 border rounded-lg
                  ${!isSameMonth(day, currentMonth) ? 'opacity-40' : ''}
                  ${isCurrentDay ? 'bg-primary/10 border-primary' : 'bg-card'}
                  ${hasSchedules ? 'border-orange-500/50' : ''}
                `}
              >
                <div className="text-xs font-semibold mb-1">
                  {format(day, 'd')}
                </div>
                
                {hasSchedules && (
                  <div className="space-y-1">
                      {schedulesForDay.map(schedule => {
                        const daysUntil = Math.ceil(
                          (new Date(schedule.next_due_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const isUrgent = daysUntil <= 3;

                        return (
                          <div
                            key={schedule.id}
                            className={`text-[10px] p-1 rounded truncate ${
                              isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                            }`}
                            title={`${schedule.tipo} - ${schedule.vehicles.placa}${schedule.source === 'maintenance' ? ' (Registrado)' : ' (Programado)'}`}
                          >
                            <div className="font-medium truncate">{schedule.tipo}</div>
                            <div className="truncate">{schedule.vehicles.placa}</div>
                            {schedule.source === 'maintenance' && (
                              <div className="text-[8px] bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1 rounded mt-0.5">
                                Registrado
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary"></div>
            <span className="text-muted-foreground">Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-destructive/10 border border-destructive"></div>
            <span className="text-muted-foreground">Urgente (3 días o menos)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-orange-500/50"></div>
            <span className="text-muted-foreground">Mantenimiento programado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500"></div>
            <span className="text-muted-foreground">Mantenimiento registrado</span>
          </div>
        </div>

        {/* KM-based maintenance notice */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Gauge className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Sobre el calendario</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Programados periódicos:</strong> Mantenimientos configurados en cada vehículo con intervalos</li>
                <li><strong>Registrados:</strong> Mantenimientos que has registrado con fecha futura</li>
                <li><strong>Por kilometraje:</strong> No aparecen en calendario, revisa la lista de programados</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};