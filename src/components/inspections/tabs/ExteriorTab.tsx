import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, Plus, X, AlertTriangle, MapPin } from "lucide-react";
import { VehicleDiagram } from "../VehicleDiagram";
import { ChecklistSection } from "../ChecklistSection";
import type { DamageItem, CheckItem } from "../InspectionForm";

interface ExteriorTabProps {
  damages: DamageItem[];
  setDamages: (fn: (prev: DamageItem[]) => DamageItem[]) => void;
  checkItems: CheckItem[];
  setCheckItems: (fn: (prev: CheckItem[]) => CheckItem[]) => void;
  prevDamages: DamageItem[];
  vehicleInfo: any;
}

const EXTERIOR_ITEMS = [
  "Parabrisas delantero", "Parabrisas trasero", "Vidrios laterales",
  "Espejos laterales", "Faros delanteros", "Faros traseros",
  "Luces direccionales", "Bumper delantero", "Bumper trasero",
  "Capó", "Baúl/Maletero", "Puertas", "Llantas (4+repuesto)",
  "Rines", "Antena", "Plumillas limpiaparabrisas", "Emblemas",
  "Pintura general", "Molduras", "Tapas de gasolina"
];

const DAMAGE_TYPES = [
  { value: "rayon", label: "Rayón" },
  { value: "abolladura", label: "Abolladura" },
  { value: "rotura", label: "Rotura/Grieta" },
  { value: "faltante", label: "Pieza faltante" },
  { value: "oxido", label: "Óxido/Corrosión" },
  { value: "despintura", label: "Despintura" },
  { value: "otro", label: "Otro" },
];

export const ExteriorTab = ({ damages, setDamages, checkItems, setCheckItems, prevDamages, vehicleInfo }: ExteriorTabProps) => {
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedPos, setSelectedPos] = useState({ x: 50, y: 50 });
  const [newDamage, setNewDamage] = useState<Partial<DamageItem>>({
    tipo_dano: "rayon",
    severidad: "leve",
    descripcion: "",
  });

  const handleDiagramClick = (zone: string, x: number, y: number) => {
    setSelectedZone(zone);
    setSelectedPos({ x, y });
    setNewDamage({ tipo_dano: "rayon", severidad: "leve", descripcion: "" });
    setShowDamageDialog(true);
  };

  const addDamage = () => {
    if (!selectedZone || !newDamage.tipo_dano) return;
    const damage: DamageItem = {
      zona: selectedZone,
      posicion_x: selectedPos.x,
      posicion_y: selectedPos.y,
      tipo_dano: newDamage.tipo_dano!,
      severidad: newDamage.severidad || "leve",
      descripcion: newDamage.descripcion || "",
      es_nuevo: prevDamages.length > 0,
    };
    setDamages(prev => [...prev, damage]);
    setShowDamageDialog(false);
  };

  const removeDamage = (index: number) => {
    setDamages(prev => prev.filter((_, i) => i !== index));
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "grave": return "bg-red-500 text-white";
      case "moderado": return "bg-amber-500 text-white";
      default: return "bg-yellow-300 text-black";
    }
  };

  return (
    <div className="space-y-4">
      {/* Vehicle Diagram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            Diagrama de Daños — Haga clic en la zona afectada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleDiagram
            damages={damages}
            prevDamages={prevDamages}
            onZoneClick={handleDiagramClick}
          />
        </CardContent>
      </Card>

      {/* Registered Damages List */}
      {damages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Daños Registrados ({damages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {damages.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                  <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{d.zona.replace("_", " ")}</span>
                      <Badge variant="outline" className="text-xs capitalize">{d.tipo_dano}</Badge>
                      <Badge className={`text-xs ${severityColor(d.severidad)}`}>{d.severidad}</Badge>
                      {d.es_nuevo && <Badge className="bg-red-100 text-red-700 text-xs">NUEVO</Badge>}
                    </div>
                    {d.descripcion && <p className="text-xs text-muted-foreground mt-1">{d.descripcion}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeDamage(i)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous damages comparison (reception only) */}
      {prevDamages.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Daños Previos (Inspección de Entrega)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prevDamages.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border border-amber-200 rounded bg-white/60">
                  <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm capitalize">{d.zona.replace("_", " ")}</span>
                  <Badge variant="outline" className="text-xs capitalize">{d.tipo_dano}</Badge>
                  <Badge className={`text-xs ${severityColor(d.severidad)}`}>{d.severidad}</Badge>
                  {d.descripcion && <span className="text-xs text-muted-foreground">— {d.descripcion}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exterior Checklist */}
      <ChecklistSection
        title="Checklist Exterior"
        categoria="exterior"
        items={EXTERIOR_ITEMS}
        checkItems={checkItems}
        setCheckItems={setCheckItems}
      />

      {/* Damage Dialog */}
      <Dialog open={showDamageDialog} onOpenChange={setShowDamageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Registrar Daño — <span className="capitalize">{selectedZone.replace("_", " ")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Tipo de Daño *</Label>
              <Select
                value={newDamage.tipo_dano}
                onValueChange={(val) => setNewDamage(prev => ({ ...prev, tipo_dano: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severidad</Label>
              <Select
                value={newDamage.severidad}
                onValueChange={(val) => setNewDamage(prev => ({ ...prev, severidad: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={newDamage.descripcion || ""}
                onChange={(e) => setNewDamage(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Detalle del daño..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDamageDialog(false)}>Cancelar</Button>
              <Button onClick={addDamage}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Daño
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
