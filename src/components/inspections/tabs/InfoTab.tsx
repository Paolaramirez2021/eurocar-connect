import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Info, Fuel, Gauge, ArrowDown, ArrowUp, AlertTriangle } from "lucide-react";
import type { InspectionData } from "../InspectionForm";

interface InfoTabProps {
  data: InspectionData;
  setData: (fn: (prev: InspectionData) => InspectionData) => void;
  reservations: any[];
  vehicles: any[];
  prevInspection: any | null;
}

const fuelColors = (level: number) => {
  if (level >= 75) return "bg-green-500";
  if (level >= 50) return "bg-lime-500";
  if (level >= 25) return "bg-yellow-500";
  return "bg-red-500";
};

export const InfoTab = ({ data, setData, reservations, vehicles, prevInspection }: InfoTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Reservation Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Datos de la Reserva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Reserva Asociada *</Label>
            <Select
              value={data.reservation_id}
              onValueChange={(val) => setData(prev => ({ ...prev, reservation_id: val }))}
            >
              <SelectTrigger data-testid="select-reservation">
                <SelectValue placeholder="Seleccionar reserva..." />
              </SelectTrigger>
              <SelectContent>
                {reservations.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.vehicles?.placa} — {r.cliente_nombre} ({r.estado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inspector / Responsable</Label>
            <Input
              value={data.inspector_nombre}
              onChange={(e) => setData(prev => ({ ...prev, inspector_nombre: e.target.value }))}
              placeholder="Nombre del inspector"
              data-testid="inspector-name-input"
            />
          </div>

          <div className="space-y-2">
            <Label>Estado General del Vehículo</Label>
            <Select
              value={data.estado_general}
              onValueChange={(val) => setData(prev => ({ ...prev, estado_general: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excelente">Excelente</SelectItem>
                <SelectItem value="bueno">Bueno</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="malo">Malo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observaciones Generales</Label>
            <Textarea
              value={data.observaciones_generales}
              onChange={(e) => setData(prev => ({ ...prev, observaciones_generales: e.target.value }))}
              placeholder="Notas adicionales sobre el estado del vehículo..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Odometer & Fuel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Odómetro y Combustible
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Kilometraje (km)
            </Label>
            <Input
              type="number"
              value={data.odometro_km || ""}
              onChange={(e) => setData(prev => ({ ...prev, odometro_km: parseInt(e.target.value) || 0 }))}
              placeholder="Ej: 45230"
              data-testid="odometer-input"
            />
            {prevInspection && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <AlertTriangle className="h-3 w-3" />
                Entrega: {prevInspection.odometro_km?.toLocaleString()} km
                {data.odometro_km > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    +{(data.odometro_km - prevInspection.odometro_km).toLocaleString()} km recorridos
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Nivel de Combustible: {data.nivel_combustible}%
            </Label>
            <div className="px-1">
              <Slider
                value={[data.nivel_combustible]}
                onValueChange={(val) => setData(prev => ({ ...prev, nivel_combustible: val[0] }))}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fuelColors(data.nivel_combustible)}`}
                  style={{ width: `${data.nivel_combustible}%` }}
                />
              </div>
              <span className="text-sm font-mono font-bold w-12 text-right">{data.nivel_combustible}%</span>
            </div>
            {prevInspection && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <AlertTriangle className="h-3 w-3" />
                Entrega: {prevInspection.nivel_combustible}%
                {data.nivel_combustible !== prevInspection.nivel_combustible && (
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs ${data.nivel_combustible < prevInspection.nivel_combustible ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}`}
                  >
                    {data.nivel_combustible < prevInspection.nivel_combustible ? (
                      <><ArrowDown className="h-3 w-3 mr-1" />{prevInspection.nivel_combustible - data.nivel_combustible}% menos</>
                    ) : (
                      <><ArrowUp className="h-3 w-3 mr-1" />{data.nivel_combustible - prevInspection.nivel_combustible}% más</>
                    )}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
