import { useState, useEffect } from "react";
import { Loader2, ClipboardCheck, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Template {
  id: string;
  name: string;
  category: string;
}

interface TemplateItem {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  order_index: number;
}

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  kilometraje_actual: number;
}

interface ChecklistItemData {
  template_item_id: string;
  key: string;
  label: string;
  estado?: string;
  observaciones?: string;
  foto_url?: string;
}

export const ReturnChecklistForm = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [itemsData, setItemsData] = useState<Record<string, ChecklistItemData>>({});
  const [kmsDevolucion, setKmsDevolucion] = useState<number>(0);
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadVehicles();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateItems(selectedTemplate);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedVehicle) {
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      if (vehicle) {
        setKmsDevolucion(vehicle.kilometraje_actual);
      }
    }
  }, [selectedVehicle, vehicles]);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("category", "devolucion")
      .order("name");

    if (error) {
      console.error("Error loading templates:", error);
      return;
    }
    setTemplates(data || []);
  };

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("estado", "rentado")
      .order("placa");

    if (error) {
      console.error("Error loading vehicles:", error);
      return;
    }
    setVehicles(data || []);
  };

  const loadTemplateItems = async (templateId: string) => {
    const { data, error } = await supabase
      .from("checklist_template_items")
      .select("*")
      .eq("template_id", templateId)
      .order("order_index");

    if (error) {
      console.error("Error loading template items:", error);
      return;
    }

    setTemplateItems(data || []);
    
    // Initialize items data
    const initialData: Record<string, ChecklistItemData> = {};
    data?.forEach(item => {
      initialData[item.id] = {
        template_item_id: item.id,
        key: item.key,
        label: item.label,
        estado: item.type === "checkbox" ? "ok" : undefined
      };
    });
    setItemsData(initialData);
  };

  const updateItemData = (itemId: string, field: keyof ChecklistItemData, value: any) => {
    setItemsData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !selectedVehicle) {
      toast.error("Por favor selecciona una plantilla y un vehículo");
      return;
    }

    if (!kmsDevolucion || kmsDevolucion <= 0) {
      toast.error("Por favor ingresa el kilometraje de devolución");
      return;
    }

    // Validate required fields
    const requiredItems = templateItems.filter(item => item.required);
    const missingRequired = requiredItems.some(item => {
      const data = itemsData[item.id];
      return !data?.estado && item.type === "checkbox";
    });

    if (missingRequired) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Create checklist (this will trigger the update_vehicle_kms_on_devolucion function)
      const { data: checklist, error: checklistError } = await supabase
        .from("checklists")
        .insert({
          template_id: selectedTemplate,
          vehicle_id: selectedVehicle,
          type: "devolucion",
          completed_by: user.id,
          kms_registro: kmsDevolucion,
          observaciones_generales: observacionesGenerales,
          status: "completed"
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create checklist items
      const items = Object.values(itemsData).map(item => ({
        checklist_id: checklist.id,
        ...item
      }));

      const { error: itemsError } = await supabase
        .from("checklist_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Update vehicle status to available
      await supabase
        .from("vehicles")
        .update({ estado: "disponible" })
        .eq("id", selectedVehicle);

      // Log audit
      await logAudit({
        actionType: "CHECKLIST_RETURN",
        tableName: "checklists",
        recordId: checklist.id,
        newData: { 
          vehicle_id: selectedVehicle, 
          template_id: selectedTemplate,
          kms_devolucion: kmsDevolucion 
        },
        description: "Checklist de devolución completado"
      });

      toast.success("Checklist de devolución guardado. Kilometraje del vehículo actualizado.");
      
      // Reset form
      setSelectedTemplate("");
      setSelectedVehicle("");
      setTemplateItems([]);
      setItemsData({});
      setKmsDevolucion(0);
      setObservacionesGenerales("");
      
      // Reload vehicles to reflect updated status
      loadVehicles();
    } catch (error) {
      console.error("Error saving checklist:", error);
      toast.error("Error al guardar el checklist");
    } finally {
      setLoading(false);
    }
  };

  const renderItemInput = (item: TemplateItem) => {
    const data = itemsData[item.id];

    switch (item.type) {
      case "checkbox":
        return (
          <div className="space-y-2">
            <RadioGroup
              value={data?.estado || "ok"}
              onValueChange={(value) => updateItemData(item.id, "estado", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ok" id={`${item.id}-ok`} />
                <Label htmlFor={`${item.id}-ok`}>OK</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_ok" id={`${item.id}-not-ok`} />
                <Label htmlFor={`${item.id}-not-ok`}>No OK</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="na" id={`${item.id}-na`} />
                <Label htmlFor={`${item.id}-na`}>N/A</Label>
              </div>
            </RadioGroup>
            <Textarea
              placeholder="Observaciones (opcional)"
              value={data?.observaciones || ""}
              onChange={(e) => updateItemData(item.id, "observaciones", e.target.value)}
              className="mt-2"
            />
          </div>
        );

      case "text":
        return (
          <Textarea
            placeholder={`Ingresa ${item.label.toLowerCase()}`}
            value={data?.observaciones || ""}
            onChange={(e) => updateItemData(item.id, "observaciones", e.target.value)}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={`Ingresa ${item.label.toLowerCase()}`}
            value={data?.observaciones || ""}
            onChange={(e) => updateItemData(item.id, "observaciones", e.target.value)}
          />
        );

      case "photo":
        return (
          <div className="space-y-2">
            <Button variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Tomar Foto
            </Button>
            {data?.foto_url && (
              <img src={data.foto_url} alt={item.label} className="w-full rounded-md" />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Formulario de Devolución
        </CardTitle>
        <CardDescription>
          Completa el checklist de devolución del vehículo por el cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este formulario actualiza automáticamente el kilometraje actual del vehículo y cambia su estado a disponible.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehículo (Solo vehículos rentados)</Label>
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger id="vehicle">
              <SelectValue placeholder="Selecciona un vehículo" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa} - {vehicle.marca} {vehicle.modelo} ({vehicle.kilometraje_actual} km)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Plantilla de Checklist</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Selecciona una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVehicle && (
          <div className="space-y-2">
            <Label htmlFor="kms-devolucion">Kilometraje al Momento de Devolución *</Label>
            <Input
              id="kms-devolucion"
              type="number"
              value={kmsDevolucion}
              onChange={(e) => setKmsDevolucion(Number(e.target.value))}
              placeholder="Ingresa el kilometraje actual"
            />
            <p className="text-sm text-muted-foreground">
              Esto actualizará el kilometraje actual del vehículo en el sistema.
            </p>
          </div>
        )}

        {templateItems.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Items del Checklist</h3>
            {templateItems.map((item) => (
              <div key={item.id} className="space-y-2 p-4 border rounded-lg">
                <Label className="flex items-center gap-2">
                  {item.label}
                  {item.required && <span className="text-destructive">*</span>}
                </Label>
                {renderItemInput(item)}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="observaciones-generales">Observaciones Generales</Label>
          <Textarea
            id="observaciones-generales"
            value={observacionesGenerales}
            onChange={(e) => setObservacionesGenerales(e.target.value)}
            placeholder="Observaciones adicionales sobre la devolución"
            rows={4}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!selectedTemplate || !selectedVehicle || !kmsDevolucion || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Checklist de Devolución"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
