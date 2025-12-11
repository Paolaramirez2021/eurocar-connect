import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { eachDayOfInterval, format, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";
import { exportDetailedReportToCSV, exportDetailedReportToPDF } from "@/lib/reportExports";

interface DetailedReportProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface VehicleReport {
  vehicleId: string;
  placa: string;
  marca: string;
  modelo: string;
  occupiedDays: string[];
  maintenanceDays: string[];
  availableDays: number;
  totalDays: number;
}

export const DetailedReport = ({ dateRange }: DetailedReportProps) => {
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
    queryKey: ['reservations-report', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .not('estado', 'in', '("cancelled","cancelada","expired","expirada")')
        .gte('fecha_fin', dateRange.from.toISOString())
        .lte('fecha_inicio', dateRange.to.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!dateRange.from && !!dateRange.to
  });

  const { data: maintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-report', dateRange],
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

  const reportData = useMemo<VehicleReport[]>(() => {
    if (!vehicles || !reservations || !maintenance) return [];

    const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return vehicles.map(vehicle => {
      const occupiedDays: string[] = [];
      const maintenanceDays: string[] = [];

      // Calcular días ocupados por reservas
      allDays.forEach(day => {
        const hasReservation = reservations.some(res => {
          if (res.vehicle_id !== vehicle.id) return false;
          const resStart = new Date(res.fecha_inicio);
          const resEnd = new Date(res.fecha_fin);
          return isWithinInterval(day, { start: resStart, end: resEnd });
        });

        if (hasReservation) {
          occupiedDays.push(format(day, 'dd/MM'));
        }
      });

      // Calcular días de mantenimiento
      allDays.forEach(day => {
        const hasMaintenance = maintenance.some(maint => {
          if (maint.vehicle_id !== vehicle.id) return false;
          const maintDate = new Date(maint.fecha);
          return format(maintDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });

        if (hasMaintenance && !occupiedDays.includes(format(day, 'dd/MM'))) {
          maintenanceDays.push(format(day, 'dd/MM'));
        }
      });

      const totalDays = allDays.length;
      const occupiedCount = occupiedDays.length + maintenanceDays.length;
      const availableDays = totalDays - occupiedCount;

      return {
        vehicleId: vehicle.id,
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        occupiedDays,
        maintenanceDays,
        availableDays,
        totalDays
      };
    });
  }, [vehicles, reservations, maintenance, dateRange]);

  const isLoading = vehiclesLoading || reservationsLoading || maintenanceLoading;

  const handleExportCSV = () => {
    exportDetailedReportToCSV(reportData, dateRange);
  };

  const handleExportPDF = () => {
    exportDetailedReportToPDF(reportData, dateRange);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end gap-2">
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
        <Button onClick={handleExportPDF} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead className="min-w-[250px]">Días Ocupados (Reservas)</TableHead>
              <TableHead className="min-w-[200px]">Días en Mantenimiento</TableHead>
              <TableHead className="text-center">Días Disponibles</TableHead>
              <TableHead className="text-center">Total Días</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.map((vehicle) => (
              <TableRow key={vehicle.vehicleId}>
                <TableCell className="font-medium">{vehicle.placa}</TableCell>
                <TableCell>{vehicle.marca} {vehicle.modelo}</TableCell>
                <TableCell>
                  {vehicle.occupiedDays.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {vehicle.occupiedDays.map((day, idx) => (
                        <Badge key={idx} className="bg-success text-success-foreground text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin reservas</span>
                  )}
                </TableCell>
                <TableCell>
                  {vehicle.maintenanceDays.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {vehicle.maintenanceDays.map((day, idx) => (
                        <Badge key={idx} className="bg-warning text-warning-foreground text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin mantenimiento</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {vehicle.availableDays}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {vehicle.totalDays}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {reportData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay datos para el rango de fechas seleccionado
        </div>
      )}
    </div>
  );
};
