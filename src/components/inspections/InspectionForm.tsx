import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, FileCheck, CheckCircle,
  Info, Car, Armchair, Wrench, FileText, Camera, PenTool, LayoutList
} from "lucide-react";
import { InfoTab } from "./tabs/InfoTab";
import { ExteriorTab } from "./tabs/ExteriorTab";
import { InteriorTab } from "./tabs/InteriorTab";
import { MechanicaTab } from "./tabs/MechanicaTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { PhotosTab } from "./tabs/PhotosTab";
import { SignaturesTab } from "./tabs/SignaturesTab";
import { SummaryTab } from "./tabs/SummaryTab";

interface InspectionFormProps {
  inspectionId?: string | null;
  tipo: "entrega" | "recepcion";
  onBack: () => void;
}

export interface InspectionData {
  id?: string;
  reservation_id: string;
  vehicle_id: string;
  customer_id: string;
  tipo: "entrega" | "recepcion";
  entrega_inspection_id?: string;
  odometro_km: number;
  nivel_combustible: number;
  estado_general: string;
  observaciones_generales: string;
  estado: string;
  inspector_nombre: string;
  numero_inspeccion?: string;
}

export interface DamageItem {
  id?: string;
  zona: string;
  posicion_x: number;
  posicion_y: number;
  tipo_dano: string;
  severidad: string;
  descripcion: string;
  es_nuevo?: boolean;
}

export interface CheckItem {
  id?: string;
  categoria: string;
  nombre: string;
  estado: string;
  observaciones: string;
}

export interface PhotoItem {
  id?: string;
  categoria: string;
  url: string;
  descripcion: string;
  damage_id?: string;
}

export interface SignatureItem {
  id?: string;
  tipo: string;
  nombre_firmante: string;
  documento_firmante: string;
  firma_data: string;
}

export const InspectionForm = ({ inspectionId, tipo, onBack }: InspectionFormProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");
  const [saving, setSaving] = useState(false);

  // Core inspection data
  const [data, setData] = useState<InspectionData>({
    reservation_id: "",
    vehicle_id: "",
    customer_id: "",
    tipo,
    odometro_km: 0,
    nivel_combustible: 100,
    estado_general: "bueno",
    observaciones_generales: "",
    estado: "borrador",
    inspector_nombre: "",
  });

  // Sub-data
  const [damages, setDamages] = useState<DamageItem[]>([]);
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);

  // Previous inspection (for reception comparison)
  const [prevInspection, setPrevInspection] = useState<any>(null);
  const [prevDamages, setPrevDamages] = useState<DamageItem[]>([]);

  // Vehicle & Customer info
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  // Load vehicles
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-inspection"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, placa, marca, modelo, color, imagen_url, ano")
        .order("placa");
      return data || [];
    },
  });

  // Load reservations (active ones)
  const { data: reservations } = useQuery({
    queryKey: ["reservations-inspection"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select(`
          id, vehicle_id, customer_id, cliente_nombre, fecha_inicio, fecha_fin, estado,
          vehicles(placa, marca, modelo, color, imagen_url, ano),
          customers(id, nombres, primer_apellido, cedula_pasaporte, celular)
        `)
        .in("estado", ["confirmed", "Confirmed", "pending", "Pending", "pending_with_payment"])
        .order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  // Load existing inspection for editing
  useEffect(() => {
    if (inspectionId) {
      loadInspection(inspectionId);
    }
  }, [inspectionId]);

  // When reservation is selected, auto-load vehicle + customer
  useEffect(() => {
    if (data.reservation_id && reservations) {
      const res = reservations.find((r: any) => r.id === data.reservation_id);
      if (res) {
        setData(prev => ({
          ...prev,
          vehicle_id: res.vehicle_id,
          customer_id: res.customer_id || res.customers?.id || "",
        }));
        setVehicleInfo(res.vehicles);
        setCustomerInfo(res.customers);

        // For reception, load the last delivery inspection
        if (tipo === "recepcion") {
          loadPreviousEntrega(res.id);
        }
      }
    }
  }, [data.reservation_id, reservations]);

  const loadPreviousEntrega = async (reservationId: string) => {
    const { data: prev } = await supabase
      .from("vehicle_inspections")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("tipo", "entrega")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (prev) {
      setPrevInspection(prev);
      setData(d => ({ ...d, entrega_inspection_id: prev.id }));

      // Load previous damages for comparison
      const { data: prevDmg } = await supabase
        .from("inspection_damages")
        .select("*")
        .eq("inspection_id", prev.id);
      setPrevDamages(prevDmg || []);
    }
  };

  const loadInspection = async (id: string) => {
    const { data: insp, error } = await supabase
      .from("vehicle_inspections")
      .select(`
        *,
        vehicles(placa, marca, modelo, color, imagen_url, ano),
        customers(id, nombres, primer_apellido, cedula_pasaporte, celular)
      `)
      .eq("id", id)
      .single();

    if (error || !insp) {
      toast.error("No se pudo cargar la inspección");
      return;
    }

    setData({
      id: insp.id,
      reservation_id: insp.reservation_id || "",
      vehicle_id: insp.vehicle_id,
      customer_id: insp.customer_id || "",
      tipo: insp.tipo,
      entrega_inspection_id: insp.entrega_inspection_id || undefined,
      odometro_km: insp.odometro_km || 0,
      nivel_combustible: insp.nivel_combustible || 100,
      estado_general: insp.estado_general || "bueno",
      observaciones_generales: insp.observaciones_generales || "",
      estado: insp.estado || "borrador",
      inspector_nombre: insp.inspector_nombre || "",
      numero_inspeccion: insp.numero_inspeccion || "",
    });
    setVehicleInfo(insp.vehicles);
    setCustomerInfo(insp.customers);

    // Load sub-data
    const [itemsRes, damagesRes, photosRes, sigsRes] = await Promise.all([
      supabase.from("inspection_items").select("*").eq("inspection_id", id),
      supabase.from("inspection_damages").select("*").eq("inspection_id", id),
      supabase.from("inspection_photos").select("*").eq("inspection_id", id),
      supabase.from("inspection_signatures").select("*").eq("inspection_id", id),
    ]);

    setCheckItems(itemsRes.data || []);
    setDamages(damagesRes.data || []);
    setPhotos(photosRes.data || []);
    setSignatures(sigsRes.data || []);

    // Load previous inspection if this is a reception
    if (insp.tipo === "recepcion" && insp.entrega_inspection_id) {
      const { data: prev } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("id", insp.entrega_inspection_id)
        .single();
      if (prev) {
        setPrevInspection(prev);
        const { data: prevDmg } = await supabase
          .from("inspection_damages")
          .select("*")
          .eq("inspection_id", prev.id);
        setPrevDamages(prevDmg || []);
      }
    }
  };

  const handleSave = async () => {
    if (!data.vehicle_id) {
      toast.error("Seleccione una reserva y vehículo");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const inspectionPayload = {
        reservation_id: data.reservation_id || null,
        vehicle_id: data.vehicle_id,
        customer_id: data.customer_id || null,
        tipo: data.tipo,
        entrega_inspection_id: data.entrega_inspection_id || null,
        odometro_km: data.odometro_km,
        nivel_combustible: data.nivel_combustible,
        estado_general: data.estado_general,
        observaciones_generales: data.observaciones_generales,
        estado: data.estado,
        inspector_nombre: data.inspector_nombre,
        created_by: userData?.user?.id || null,
        updated_at: new Date().toISOString(),
      };

      let inspId = data.id;

      if (data.id) {
        const { error } = await supabase
          .from("vehicle_inspections")
          .update(inspectionPayload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: newInsp, error } = await supabase
          .from("vehicle_inspections")
          .insert([inspectionPayload])
          .select()
          .single();
        if (error) throw error;
        inspId = newInsp.id;
        setData(prev => ({ ...prev, id: newInsp.id, numero_inspeccion: newInsp.numero_inspeccion }));
      }

      // Save check items
      if (inspId && checkItems.length > 0) {
        await supabase.from("inspection_items").delete().eq("inspection_id", inspId);
        const itemsToInsert = checkItems.map(item => ({
          inspection_id: inspId,
          categoria: item.categoria,
          nombre: item.nombre,
          estado: item.estado,
          observaciones: item.observaciones || null,
        }));
        await supabase.from("inspection_items").insert(itemsToInsert);
      }

      // Save damages
      if (inspId && damages.length > 0) {
        await supabase.from("inspection_damages").delete().eq("inspection_id", inspId);
        const damagesToInsert = damages.map(d => ({
          inspection_id: inspId,
          zona: d.zona,
          posicion_x: d.posicion_x,
          posicion_y: d.posicion_y,
          tipo_dano: d.tipo_dano,
          severidad: d.severidad,
          descripcion: d.descripcion || null,
          es_nuevo: d.es_nuevo || false,
        }));
        await supabase.from("inspection_damages").insert(damagesToInsert);
      }

      // Save signatures
      if (inspId && signatures.length > 0) {
        await supabase.from("inspection_signatures").delete().eq("inspection_id", inspId);
        const sigsToInsert = signatures.map(s => ({
          inspection_id: inspId,
          tipo: s.tipo,
          nombre_firmante: s.nombre_firmante,
          documento_firmante: s.documento_firmante || null,
          firma_data: s.firma_data,
        }));
        await supabase.from("inspection_signatures").insert(sigsToInsert);
      }

      queryClient.invalidateQueries({ queryKey: ["inspections-list"] });
      queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });
      toast.success("Inspección guardada exitosamente");
    } catch (err: any) {
      console.error("Error guardando inspección:", err);
      toast.error(err.message || "Error al guardar inspección");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setData(prev => ({ ...prev, estado: "completada" }));
    setTimeout(() => handleSave(), 100);
  };

  const tabItems = [
    { value: "info", label: "Información", icon: Info },
    { value: "exterior", label: "Exterior", icon: Car },
    { value: "interior", label: "Interior", icon: Armchair },
    { value: "mecanica", label: "Mecánica", icon: Wrench },
    { value: "documentos", label: "Documentos", icon: FileText },
    { value: "fotos", label: "Fotos", icon: Camera },
    { value: "firmas", label: "Firmas", icon: PenTool },
    { value: "resumen", label: "Resumen", icon: LayoutList },
  ];

  return (
    <div className="space-y-4" data-testid="inspection-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {data.numero_inspeccion && (
                <span className="font-mono text-primary">{data.numero_inspeccion}</span>
              )}
              Inspección de {tipo === "entrega" ? "Entrega" : "Recepción"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {vehicleInfo ? `${vehicleInfo.marca} ${vehicleInfo.modelo} — ${vehicleInfo.placa}` : "Seleccione una reserva"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving} data-testid="save-inspection-btn">
            <Save className="h-4 w-4 mr-2" />
            Guardar Borrador
          </Button>
          <Button onClick={handleComplete} disabled={saving} data-testid="complete-inspection-btn">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completar
          </Button>
        </div>
      </div>

      {/* Vehicle preview card */}
      {vehicleInfo && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 flex items-center gap-4">
            <div className="w-32 h-24 bg-muted flex-shrink-0 overflow-hidden">
              {vehicleInfo.imagen_url ? (
                <img src={vehicleInfo.imagen_url} alt={vehicleInfo.placa} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">{vehicleInfo.placa}</span>
                <Badge variant="outline">{vehicleInfo.color}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {vehicleInfo.marca} {vehicleInfo.modelo} {vehicleInfo.ano || ""}
              </p>
            </div>
            {customerInfo && (
              <div className="pr-4 text-right text-sm">
                <p className="font-medium">{customerInfo.nombres} {customerInfo.primer_apellido}</p>
                <p className="text-muted-foreground">Doc: {customerInfo.cedula_pasaporte}</p>
                {customerInfo.celular && <p className="text-muted-foreground">Cel: {customerInfo.celular}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 h-auto">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col gap-1 py-2 text-xs">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <InfoTab
            data={data}
            setData={setData}
            reservations={reservations || []}
            vehicles={vehicles || []}
            prevInspection={prevInspection}
          />
        </TabsContent>

        <TabsContent value="exterior" className="mt-4">
          <ExteriorTab
            damages={damages}
            setDamages={setDamages}
            checkItems={checkItems.filter(i => i.categoria === "exterior")}
            setCheckItems={setCheckItems}
            prevDamages={tipo === "recepcion" ? prevDamages : []}
            vehicleInfo={vehicleInfo}
          />
        </TabsContent>

        <TabsContent value="interior" className="mt-4">
          <InteriorTab
            checkItems={checkItems}
            setCheckItems={setCheckItems}
          />
        </TabsContent>

        <TabsContent value="mecanica" className="mt-4">
          <MechanicaTab
            checkItems={checkItems}
            setCheckItems={setCheckItems}
          />
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <DocumentsTab
            checkItems={checkItems}
            setCheckItems={setCheckItems}
          />
        </TabsContent>

        <TabsContent value="fotos" className="mt-4">
          <PhotosTab
            photos={photos}
            setPhotos={setPhotos}
            inspectionId={data.id}
          />
        </TabsContent>

        <TabsContent value="firmas" className="mt-4">
          <SignaturesTab
            signatures={signatures}
            setSignatures={setSignatures}
            customerName={customerInfo ? `${customerInfo.nombres} ${customerInfo.primer_apellido}` : ""}
            customerDoc={customerInfo?.cedula_pasaporte || ""}
            inspectorName={data.inspector_nombre}
          />
        </TabsContent>

        <TabsContent value="resumen" className="mt-4">
          <SummaryTab
            data={data}
            vehicleInfo={vehicleInfo}
            customerInfo={customerInfo}
            damages={damages}
            checkItems={checkItems}
            photos={photos}
            signatures={signatures}
            prevInspection={prevInspection}
            prevDamages={prevDamages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
