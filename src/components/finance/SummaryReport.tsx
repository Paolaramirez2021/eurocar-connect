import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { eachDayOfInterval, format, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";
import { exportSummaryReportToCSV, exportSummaryReportToPDF } from "@/lib/reportExports";

interface SummaryReportProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface VehicleSummary {
  vehicleId: string;
  placa: string;
  marca: string;
  modelo: string;
  occupiedDays: number;
  availableDays: number;
  totalDays: number;
  occupancyRate: number;
  status: string;
}

export const SummaryReport = ({ dateRange }: SummaryReportProps) => {
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
    queryKey: ['reservations-summary', dateRange],
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
    queryKey: ['maintenance-summary', dateRange],
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

  const summaryData = useMemo<VehicleSummary[]>(() => {
    if (!vehicles || !reservations || !maintenance) return [];

    const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const totalDays = allDays.length;

    return vehicles.map(vehicle => {
      let occupiedDays = 0;
      let maintenanceDaysCount = 0;

      // Contar días ocupados
      allDays.forEach(day => {
        const hasReservation = reservations.some(res => {
          if (res.vehicle_id !== vehicle.id) return false;
          const resStart = new Date(res.fecha_inicio);
          const resEnd = new Date(res.fecha_fin);
          return isWithinInterval(day, { start: resStart, end: resEnd });
        });

        const hasMaintenance = maintenance.some(maint => {
          if (maint.vehicle_id !== vehicle.id) return false;
          const maintDate = new Date(maint.fecha);
          return format(maintDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });

        if (hasReservation) {
          occupiedDays++;
        } else if (hasMaintenance) {
          maintenanceDaysCount++;
        }
      });

      const totalOccupiedDays = occupiedDays + maintenanceDaysCount;
      const availableDays = totalDays - totalOccupiedDays;
      const occupancyRate = totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0;

      // Determinar estado
      let status = "Normal";
      if (maintenanceDaysCount > totalDays * 0.3) {
        status = "Mantenimiento prolongado";
      } else if (occupancyRate >= 70) {
        status = "Alta demanda";
      } else if (occupancyRate < 30) {
        status = "Baja demanda";
      }

      return {
        vehicleId: vehicle.id,
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        occupiedDays,
        availableDays,
        totalDays,
        occupancyRate,
        status
      };
    });
  }, [vehicles, reservations, maintenance, dateRange]);

  const isLoading = vehiclesLoading || reservationsLoading || maintenanceLoading;

  const handleExportCSV = () => {
    exportSummaryReportToCSV(summaryData, dateRange);
  };

  const handleExportPDF = () => {
    exportSummaryReportToPDF(summaryData, dateRange);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Alta demanda":
        return "bg-success text-success-foreground";
      case "Baja demanda":
        return "bg-orange-500 text-white";
      case "Mantenimiento prolongado":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-blue-500 text-white";
    }
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
              <TableHead className="text-center">Días Ocupados</TableHead>
              <TableHead className="text-center">Días Disponibles</TableHead>
              <TableHead className="text-center">Total Días</TableHead>
              <TableHead className="text-center">% Ocupación</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryData.map((vehicle) => (
              <TableRow key={vehicle.vehicleId}>
                <TableCell className="font-medium">{vehicle.placa}</TableCell>
                <TableCell>{vehicle.marca} {vehicle.modelo}</TableCell>
                <TableCell className="text-center font-semibold text-success">
                  {vehicle.occupiedDays}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {vehicle.availableDays}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {vehicle.totalDays}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success transition-all"
                        style={{ width: `${vehicle.occupancyRate}%` }}
                      />
                    </div>
                    <span className="font-semibold text-sm">
                      {vehicle.occupancyRate.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={getStatusColor(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {summaryData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay datos para el rango de fechas seleccionado
        </div>
      )}
    </div>
  );
};
