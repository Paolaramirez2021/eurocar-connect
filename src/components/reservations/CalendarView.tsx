import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UnifiedCalendar } from "./UnifiedCalendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
}

export const CalendarView = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, placa, marca, modelo")
      .order("placa");

    if (error) {
      console.error("Error loading vehicles:", error);
      return;
    }
    setVehicles(data || []);
    
    // Auto-select first vehicle if none selected
    if (data && data.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(data[0].id);
    }
  };


  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendario de Vehículos
              </CardTitle>
              <CardDescription>
                Vista unificada con reservas, mantenimiento y Pico y Placa
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm font-semibold min-w-[150px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeMonth(1)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Vehicle Selector */}
          <div className="flex items-center justify-center gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
            <label className="font-semibold text-sm">Seleccionar Vehículo:</label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Seleccione un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedVehicle ? (
            <UnifiedCalendar
              vehicleId={selectedVehicle.id}
              placa={selectedVehicle.placa}
              currentMonth={currentMonth}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Seleccione un vehículo para ver su calendario
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
