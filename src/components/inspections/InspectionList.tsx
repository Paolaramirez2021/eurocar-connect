import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ClipboardCheck, Search, Eye, Car, Calendar, 
  User, Fuel, Gauge, ArrowRight
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface InspectionListProps {
  onEdit: (id: string) => void;
  onNewEntrega: () => void;
  onNewRecepcion: () => void;
}

export const InspectionList = ({ onEdit, onNewEntrega, onNewRecepcion }: InspectionListProps) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "entrega" | "recepcion">("all");

  const { data: inspections, isLoading } = useQuery({
    queryKey: ["inspections-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select(`
          *,
          vehicles(placa, marca, modelo, color, imagen_url),
          customers(nombres, primer_apellido, cedula_pasaporte),
          reservations(fecha_inicio, fecha_fin)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (inspections || []).filter((i: any) => {
    const matchesType = filterType === "all" || i.tipo === filterType;
    const matchesSearch =
      !search ||
      i.numero_inspeccion?.toLowerCase().includes(search.toLowerCase()) ||
      i.vehicles?.placa?.toLowerCase().includes(search.toLowerCase()) ||
      i.customers?.nombres?.toLowerCase().includes(search.toLowerCase()) ||
      i.customers?.primer_apellido?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "firmada":
        return <Badge className="bg-green-600 text-white">Firmada</Badge>;
      case "completada":
        return <Badge className="bg-blue-600 text-white">Completada</Badge>;
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Borrador</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === "entrega" ? (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Entrega</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">Recepción</Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando inspecciones...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Historial de Inspecciones</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="inspection-search-input"
              />
            </div>
            <div className="flex gap-1 border rounded-lg p-0.5">
              {(["all", "entrega", "recepcion"] as const).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? "default" : "ghost"}
                  onClick={() => setFilterType(type)}
                  className="text-xs h-7 px-3"
                >
                  {type === "all" ? "Todas" : type === "entrega" ? "Entregas" : "Recepciones"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No hay inspecciones</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Comienza creando una inspección de entrega o recepción
            </p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={onNewEntrega}>Nueva Entrega</Button>
              <Button size="sm" variant="outline" onClick={onNewRecepcion}>Nueva Recepción</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inspection: any) => (
              <div
                key={inspection.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => onEdit(inspection.id)}
                data-testid={`inspection-row-${inspection.id}`}
              >
                {/* Vehicle Image */}
                <div className="hidden sm:flex w-16 h-16 rounded-lg bg-muted items-center justify-center flex-shrink-0 overflow-hidden">
                  {inspection.vehicles?.imagen_url ? (
                    <img
                      src={inspection.vehicles.imagen_url}
                      alt={inspection.vehicles.placa}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Car className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm">{inspection.numero_inspeccion}</span>
                    {getTipoBadge(inspection.tipo)}
                    {getEstadoBadge(inspection.estado)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {inspection.vehicles?.placa} — {inspection.vehicles?.marca} {inspection.vehicles?.modelo}
                    </span>
                    {inspection.customers && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {inspection.customers.nombres} {inspection.customers.primer_apellido}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      {inspection.odometro_km?.toLocaleString()} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      {inspection.nivel_combustible}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(inspection.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
