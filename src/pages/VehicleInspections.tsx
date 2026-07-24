import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { InspectionList } from "@/components/inspections/InspectionList";
import { InspectionForm } from "@/components/inspections/InspectionForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, Plus, Search, Car, ArrowLeftRight,
  FileCheck, History, AlertTriangle 
} from "lucide-react";

export default function VehicleInspections() {
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inspectionType, setInspectionType] = useState<"entrega" | "recepcion">("entrega");

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["inspection-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("id, tipo, estado");
      if (error) return { total: 0, entregas: 0, recepciones: 0, pendientes: 0 };
      const total = data?.length || 0;
      const entregas = data?.filter(i => i.tipo === "entrega").length || 0;
      const recepciones = data?.filter(i => i.tipo === "recepcion").length || 0;
      const pendientes = data?.filter(i => i.estado === "borrador").length || 0;
      return { total, entregas, recepciones, pendientes };
    },
  });

  const handleNewInspection = (type: "entrega" | "recepcion") => {
    setInspectionType(type);
    setEditingId(null);
    setView("new");
  };

  const handleEditInspection = (id: string) => {
    setEditingId(id);
    setView("edit");
  };

  const handleBack = () => {
    setView("list");
    setEditingId(null);
  };

  if (view === "new" || view === "edit") {
    return (
      <DashboardLayout user={session?.user ?? null}>
        <InspectionForm
          inspectionId={editingId}
          tipo={inspectionType}
          onBack={handleBack}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={session?.user ?? null}>
      <div className="space-y-6" data-testid="vehicle-inspections-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-primary" />
              Inspección Vehicular
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Control de entrega y recepción de vehículos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleNewInspection("entrega")}
              className="gap-2"
              data-testid="new-delivery-inspection-btn"
            >
              <Plus className="h-4 w-4" />
              Inspección de Entrega
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNewInspection("recepcion")}
              className="gap-2"
              data-testid="new-return-inspection-btn"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Inspección de Recepción
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
                </div>
                <FileCheck className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Entregas</p>
                  <p className="text-2xl font-bold mt-1">{stats?.entregas || 0}</p>
                </div>
                <Car className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recepciones</p>
                  <p className="text-2xl font-bold mt-1">{stats?.recepciones || 0}</p>
                </div>
                <ArrowLeftRight className="h-8 w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pendientes</p>
                  <p className="text-2xl font-bold mt-1">{stats?.pendientes || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <InspectionList
          onEdit={handleEditInspection}
          onNewEntrega={() => handleNewInspection("entrega")}
          onNewRecepcion={() => handleNewInspection("recepcion")}
        />
      </div>
    </DashboardLayout>
  );
}
