import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutList, Car, User, Gauge, Fuel, AlertTriangle,
  CheckCircle, XCircle, MinusCircle, ArrowUp, ArrowDown, FileDown
} from "lucide-react";
import type { InspectionData, DamageItem, CheckItem, PhotoItem, SignatureItem } from "../InspectionForm";

interface SummaryTabProps {
  data: InspectionData;
  vehicleInfo: any;
  customerInfo: any;
  damages: DamageItem[];
  checkItems: CheckItem[];
  photos: PhotoItem[];
  signatures: SignatureItem[];
  prevInspection: any | null;
  prevDamages: DamageItem[];
}

export const SummaryTab = ({
  data, vehicleInfo, customerInfo, damages, checkItems, photos, signatures,
  prevInspection, prevDamages
}: SummaryTabProps) => {
  const okCount = checkItems.filter(i => i.estado === "ok").length;
  const damagedCount = checkItems.filter(i => i.estado === "dañado").length;
  const missingCount = checkItems.filter(i => i.estado === "faltante").length;
  const totalItems = checkItems.length;

  const clientSig = signatures.find(s => s.tipo === "cliente");
  const inspSig = signatures.find(s => s.tipo === "inspector");

  const newDamages = damages.filter(d => d.es_nuevo);

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{okCount}</p>
            <p className="text-xs text-muted-foreground">Items OK</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{damagedCount}</p>
            <p className="text-xs text-muted-foreground">Dañados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3 text-center">
            <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{missingCount}</p>
            <p className="text-xs text-muted-foreground">Faltantes</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{damages.length}</p>
            <p className="text-xs text-muted-foreground">Daños en Diagrama</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle & Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {vehicleInfo ? (
              <>
                <p><strong>Placa:</strong> {vehicleInfo.placa}</p>
                <p><strong>Vehículo:</strong> {vehicleInfo.marca} {vehicleInfo.modelo} {vehicleInfo.ano || ""}</p>
                <p><strong>Color:</strong> {vehicleInfo.color}</p>
              </>
            ) : <p className="text-muted-foreground">No seleccionado</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {customerInfo ? (
              <>
                <p><strong>Nombre:</strong> {customerInfo.nombres} {customerInfo.primer_apellido}</p>
                <p><strong>Documento:</strong> {customerInfo.cedula_pasaporte}</p>
                {customerInfo.celular && <p><strong>Celular:</strong> {customerInfo.celular}</p>}
              </>
            ) : <p className="text-muted-foreground">No seleccionado</p>}
          </CardContent>
        </Card>
      </div>

      {/* Odometer & Fuel Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> Odómetro y Combustible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-sm">
              <p className="text-muted-foreground text-xs mb-1">Kilometraje</p>
              <p className="text-xl font-bold">{data.odometro_km?.toLocaleString()} km</p>
              {prevInspection && (
                <p className="text-xs text-muted-foreground mt-1">
                  Entrega: {prevInspection.odometro_km?.toLocaleString()} km
                  <Badge variant="outline" className="ml-2 text-xs">
                    <ArrowUp className="h-3 w-3 mr-0.5" />
                    +{(data.odometro_km - prevInspection.odometro_km).toLocaleString()} km
                  </Badge>
                </p>
              )}
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground text-xs mb-1">Combustible</p>
              <p className="text-xl font-bold">{data.nivel_combustible}%</p>
              {prevInspection && (
                <p className="text-xs text-muted-foreground mt-1">
                  Entrega: {prevInspection.nivel_combustible}%
                  {data.nivel_combustible !== prevInspection.nivel_combustible && (
                    <Badge
                      variant="outline"
                      className={`ml-2 text-xs ${data.nivel_combustible < prevInspection.nivel_combustible ? "text-red-600" : "text-green-600"}`}
                    >
                      {data.nivel_combustible < prevInspection.nivel_combustible ? (
                        <><ArrowDown className="h-3 w-3 mr-0.5" />{prevInspection.nivel_combustible - data.nivel_combustible}% menos</>
                      ) : (
                        <><ArrowUp className="h-3 w-3 mr-0.5" />{data.nivel_combustible - prevInspection.nivel_combustible}% más</>
                      )}
                    </Badge>
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Damages (Reception) */}
      {newDamages.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> Daños Nuevos Detectados ({newDamages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {newDamages.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-red-50 rounded">
                  <Badge className="bg-red-500 text-white text-xs">{d.severidad}</Badge>
                  <span className="capitalize">{d.zona.replace("_", " ")}</span>
                  <span className="text-muted-foreground">— {d.tipo_dano}</span>
                  {d.descripcion && <span className="text-xs text-muted-foreground ml-auto">{d.descripcion}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Summary by Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-primary" /> Resumen Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <p className="text-sm text-muted-foreground">No se han completado items del checklist.</p>
          ) : (
            <div className="space-y-2">
              {["exterior", "interior", "mecanica", "documentos", "seguridad"].map(cat => {
                const catItems = checkItems.filter(i => i.categoria === cat);
                if (catItems.length === 0) return null;
                const catOk = catItems.filter(i => i.estado === "ok").length;
                const catBad = catItems.filter(i => i.estado !== "ok" && i.estado !== "no_aplica").length;
                return (
                  <div key={cat} className="flex items-center justify-between text-sm border-b pb-1">
                    <span className="capitalize font-medium">{cat}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-green-600">{catOk} OK</Badge>
                      {catBad > 0 && <Badge variant="outline" className="text-xs text-red-600">{catBad} con novedad</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Count */}
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <span className="text-sm"><strong>Fotografías:</strong> {photos.length} archivos adjuntos</span>
          <span className="text-sm">
            <strong>Firmas:</strong>{" "}
            {clientSig ? <Badge className="bg-green-600 text-white text-xs mr-1">Cliente</Badge> : <Badge variant="outline" className="text-xs mr-1 text-muted-foreground">Cliente pendiente</Badge>}
            {inspSig ? <Badge className="bg-green-600 text-white text-xs">Inspector</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">Inspector pendiente</Badge>}
          </span>
        </CardContent>
      </Card>

      {/* General Observations */}
      {data.observaciones_generales && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground mb-1">Observaciones Generales</p>
            <p className="text-sm">{data.observaciones_generales}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
