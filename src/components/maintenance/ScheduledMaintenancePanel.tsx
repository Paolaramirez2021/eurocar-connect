import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle, Calendar, Gauge, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface Schedule {
  id: string;
  vehicle_id: string;
  tipo: string;
  last_change_km: number | null;
  next_due_km: number | null;
  last_change_date: string | null;
  next_due_date: string | null;
  interval_km: number | null;
  interval_days: number | null;
  is_active: boolean;
  vehicles: {
    placa: string;
    marca: string;
    modelo: string;
    kilometraje_actual: number;
  };
}

export const ScheduledMaintenancePanel = () => {
  const queryClient = useQueryClient();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: "",
    costo: "",
    kms: "",
    observaciones: ""
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['maintenance_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          vehicles (
            placa,
            marca,
            modelo,
            kilometraje_actual
          )
        `)
        .eq('is_active', true)
        .order('next_due_date');
      
      if (error) throw error;
      return data as Schedule[];
    }
  });

  const completeMaintenance = useMutation({
    mutationFn: async (scheduleId: string) => {
      const schedule = schedules?.find(s => s.id === scheduleId);
      if (!schedule) throw new Error("Schedule not found");

      // 1. Insert maintenance record
      const { error: maintenanceError } = await supabase
        .from('maintenance')
        .insert({
          vehicle_id: schedule.vehicle_id,
          tipo: schedule.tipo,
          descripcion: formData.descripcion || `Mantenimiento programado: ${schedule.tipo}`,
          fecha: new Date().toISOString(),
          costo: parseFloat(formData.costo) || 0,
          kms: formData.kms ? parseInt(formData.kms) : schedule.vehicles.kilometraje_actual
        });

      if (maintenanceError) throw maintenanceError;

      // 2. Update schedule with new dates/km
      const updates: any = {};
      
      if (schedule.interval_km && formData.kms) {
        updates.last_change_km = parseInt(formData.kms);
        updates.next_due_km = parseInt(formData.kms) + schedule.interval_km;
      }
      
      if (schedule.interval_days) {
        updates.last_change_date = new Date().toISOString();
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + schedule.interval_days);
        updates.next_due_date = nextDate.toISOString();
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('maintenance_schedules')
          .update(updates)
          .eq('id', scheduleId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success("Mantenimiento completado y próximo programado");
      setCompleteDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al completar mantenimiento: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      descripcion: "",
      costo: "",
      kms: "",
      observaciones: ""
    });
    setSelectedSchedule(null);
  };

  const handleCompleteClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      descripcion: `Mantenimiento programado: ${schedule.tipo}`,
      costo: "",
      kms: schedule.vehicles.kilometraje_actual.toString(),
      observaciones: ""
    });
    setCompleteDialogOpen(true);
  };

  const getUrgencyBadge = (schedule: Schedule) => {
    if (schedule.next_due_km && schedule.vehicles.kilometraje_actual) {
      const kmLeft = schedule.next_due_km - schedule.vehicles.kilometraje_actual;
      if (kmLeft <= 0) return <Badge variant="destructive">Vencido</Badge>;
      if (kmLeft <= 500) return <Badge className="bg-orange-600">Urgente</Badge>;
      if (kmLeft <= 1000) return <Badge className="bg-yellow-600">Próximo</Badge>;
    }

    if (schedule.next_due_date) {
      const daysLeft = differenceInDays(new Date(schedule.next_due_date), new Date());
      if (daysLeft <= 0) return <Badge variant="destructive">Vencido</Badge>;
      if (daysLeft <= 7) return <Badge className="bg-orange-600">Urgente</Badge>;
      if (daysLeft <= 30) return <Badge className="bg-yellow-600">Próximo</Badge>;
    }

    return <Badge variant="outline">Programado</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando mantenimientos programados...</div>;
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay mantenimientos programados</p>
            <p className="text-sm mt-2">Configure intervalos de mantenimiento en cada vehículo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{schedule.tipo}</span>
                    {getUrgencyBadge(schedule)}
                  </div>
                  <p className="text-sm font-normal text-muted-foreground">
                    {schedule.vehicles.placa} - {schedule.vehicles.marca} {schedule.vehicles.modelo}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCompleteClick(schedule)}
                  className="ml-4"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedule.next_due_km && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Gauge className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Próximo mantenimiento</p>
                      <p className="text-sm font-semibold">{schedule.next_due_km.toLocaleString()} km</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Actual: {schedule.vehicles.kilometraje_actual.toLocaleString()} km
                        {schedule.next_due_km - schedule.vehicles.kilometraje_actual > 0 && (
                          <span className="ml-1">
                            (Faltan {(schedule.next_due_km - schedule.vehicles.kilometraje_actual).toLocaleString()} km)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {schedule.next_due_date && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Fecha próximo mantenimiento</p>
                      <p className="text-sm font-semibold">
                        {format(new Date(schedule.next_due_date), "dd MMM yyyy", { locale: es })}
                      </p>
                      {differenceInDays(new Date(schedule.next_due_date), new Date()) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          En {differenceInDays(new Date(schedule.next_due_date), new Date())} días
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {schedule.last_change_date && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  Último mantenimiento: {format(new Date(schedule.last_change_date), "dd MMM yyyy", { locale: es })}
                  {schedule.last_change_km && ` a ${schedule.last_change_km.toLocaleString()} km`}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete Maintenance Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Completar Mantenimiento
            </DialogTitle>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{selectedSchedule.tipo}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSchedule.vehicles.placa} - {selectedSchedule.vehicles.marca} {selectedSchedule.vehicles.modelo}
                </p>
              </div>

              <div>
                <Label>Descripción del servicio</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles del mantenimiento realizado"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Costo ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Kilometraje actual</Label>
                  <Input
                    type="number"
                    value={formData.kms}
                    onChange={(e) => setFormData({ ...formData, kms: e.target.value })}
                    placeholder="Kilometraje"
                  />
                </div>
              </div>

              <div>
                <Label>Observaciones adicionales</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Notas, recomendaciones, próximas acciones..."
                  rows={2}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Al completar, se registrará el mantenimiento y se programará automáticamente el próximo según los intervalos configurados.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCompleteDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => completeMaintenance.mutate(selectedSchedule.id)}
                  disabled={!formData.costo || completeMaintenance.isPending}
                  className="flex-1"
                >
                  {completeMaintenance.isPending ? "Guardando..." : "Completar Mantenimiento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
