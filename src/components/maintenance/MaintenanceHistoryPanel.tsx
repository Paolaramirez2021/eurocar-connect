import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar, Gauge, DollarSign, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  costo: number;
  kms: number | null;
  completed: boolean;
  vehicles: {
    placa: string;
    marca: string;
    modelo: string;
  };
}

export const MaintenanceHistoryPanel = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, placa, marca, modelo')
        .order('placa');
      if (error) throw error;
      return data;
    }
  });

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['maintenance_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance')
        .select(`
          *,
          vehicles (
            placa,
            marca,
            modelo
          )
        `)
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      return data as MaintenanceRecord[];
    }
  });

  // Get unique maintenance types
  const maintenanceTypes = Array.from(
    new Set(maintenance?.map(m => m.tipo) || [])
  ).sort();

  // Filter maintenance records
  const filteredMaintenance = maintenance?.filter((record) => {
    const matchesVehicle = selectedVehicle === "all" || record.vehicle_id === selectedVehicle;
    const matchesType = selectedType === "all" || record.tipo === selectedType;
    const matchesSearch = !searchTerm || 
      record.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehicles.placa.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesVehicle && matchesType && matchesSearch;
  });

  // Calculate stats
  const totalCost = filteredMaintenance?.reduce((sum, m) => sum + m.costo, 0) || 0;
  const totalRecords = filteredMaintenance?.length || 0;

  // Group by vehicle for summary
  const vehicleSummary = filteredMaintenance?.reduce((acc, record) => {
    const vehicleId = record.vehicle_id;
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicle: record.vehicles,
        count: 0,
        totalCost: 0,
        lastMaintenance: record.fecha
      };
    }
    acc[vehicleId].count++;
    acc[vehicleId].totalCost += record.costo;
    return acc;
  }, {} as Record<string, any>);

  const getTypeColor = (tipo: string) => {
    const typeColors: Record<string, string> = {
      "Cambio de aceite": "bg-blue-600",
      "Cambio de llantas": "bg-purple-600",
      "Cambio de frenos": "bg-red-600",
      "SOAT": "bg-green-600",
      "Tecnomecánica": "bg-yellow-600",
      "Impuestos": "bg-orange-600",
    };
    return typeColors[tipo] || "bg-gray-600";
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando historial...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tipo, descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vehículo</label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vehículos</SelectItem>
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {maintenanceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Costo Total</p>
                <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/10 rounded-lg">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehículos</p>
                <p className="text-2xl font-bold">{Object.keys(vehicleSummary || {}).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Summary (if filtering by specific vehicle) */}
      {selectedVehicle !== "all" && vehicleSummary && vehicleSummary[selectedVehicle] && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Resumen del Vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Vehículo</p>
                <p className="font-medium">
                  {vehicleSummary[selectedVehicle].vehicle.placa}
                </p>
                <p className="text-sm text-muted-foreground">
                  {vehicleSummary[selectedVehicle].vehicle.marca} {vehicleSummary[selectedVehicle].vehicle.modelo}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mantenimientos</p>
                <p className="text-xl font-bold">{vehicleSummary[selectedVehicle].count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo Total</p>
                <p className="text-xl font-bold text-green-600">
                  ${vehicleSummary[selectedVehicle].totalCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Último Mantenimiento</p>
                <p className="text-sm font-medium">
                  {format(new Date(vehicleSummary[selectedVehicle].lastMaintenance), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Records */}
      <div className="grid gap-4">
        {filteredMaintenance && filteredMaintenance.length > 0 ? (
          filteredMaintenance.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="h-5 w-5 text-primary" />
                      <span className="text-lg">{record.tipo}</span>
                      <Badge className={getTypeColor(record.tipo)}>
                        {record.tipo}
                      </Badge>
                      {record.completed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Realizado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-normal text-muted-foreground">
                      {record.vehicles.placa} - {record.vehicles.marca} {record.vehicles.modelo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${record.costo.toLocaleString()}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {record.descripcion && (
                    <p className="text-sm">{record.descripcion}</p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="text-sm font-medium">
                          {format(new Date(record.fecha), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>

                    {record.kms && (
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Kilometraje</p>
                          <p className="text-sm font-medium">{record.kms.toLocaleString()} km</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Costo</p>
                        <p className="text-sm font-medium">${record.costo.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron registros de mantenimiento</p>
                <p className="text-sm mt-2">Ajusta los filtros o registra un nuevo mantenimiento</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
