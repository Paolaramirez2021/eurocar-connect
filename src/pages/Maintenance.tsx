import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Wrench, Calendar, History, MoreVertical, Trash2, Eye, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScheduledMaintenancePanel } from "@/components/maintenance/ScheduledMaintenancePanel";
import { MaintenanceHistoryPanel } from "@/components/maintenance/MaintenanceHistoryPanel";
import { MaintenanceCalendar } from "@/components/maintenance/MaintenanceCalendar";

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    tipo: "",
    descripcion: "",
    fecha: new Date().toISOString().split('T')[0],
    costo: "",
    kms: ""
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('placa');
      if (error) throw error;
      return data;
    }
  });

  const { data: maintenance } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*, vehicles(placa, marca, modelo)')
        .eq('completed', false)
        .order('fecha', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const createMaintenance = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('maintenance').insert({
        vehicle_id: data.vehicle_id,
        tipo: data.tipo,
        descripcion: data.descripcion,
        fecha: data.fecha,
        costo: parseFloat(data.costo),
        kms: data.kms ? parseInt(data.kms) : null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['finance_items'] });
      toast.success('Mantenimiento registrado exitosamente');
      setIsDialogOpen(false);
      setFormData({
        vehicle_id: "",
        tipo: "",
        descripcion: "",
        fecha: new Date().toISOString().split('T')[0],
        costo: "",
        kms: ""
      });
    },
    onError: (error) => {
      toast.error('Error al registrar mantenimiento: ' + error.message);
    }
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success('Mantenimiento eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    }
  });

  const markAsCompleted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance')
        .update({ completed: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_history'] });
      toast.success('Mantenimiento marcado como realizado');
    },
    onError: (error) => {
      toast.error('Error al marcar como realizado: ' + error.message);
    }
  });

  return (
    <DashboardLayout user={session?.user || null}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              Mantenimiento
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestión completa de mantenimiento vehicular
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Mantenimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Mantenimiento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Vehículo</Label>
                  <Select value={formData.vehicle_id || ""} onValueChange={(value) => setFormData({...formData, vehicle_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.tipo || ""} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cambio de aceite">Cambio de aceite</SelectItem>
                      <SelectItem value="Cambio de llantas">Cambio de llantas</SelectItem>
                      <SelectItem value="Cambio de frenos">Cambio de frenos</SelectItem>
                      <SelectItem value="Cambio de pastillas">Cambio de pastillas</SelectItem>
                      <SelectItem value="Cambio de extintor">Cambio de extintor</SelectItem>
                      <SelectItem value="Cambio de batería">Cambio de batería</SelectItem>
                      <SelectItem value="SOAT">SOAT</SelectItem>
                      <SelectItem value="Tecnomecánica">Tecnomecánica</SelectItem>
                      <SelectItem value="Impuestos">Impuestos</SelectItem>
                      <SelectItem value="Reparación general">Reparación general</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Detalles del mantenimiento"
                  />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Costo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.costo}
                    onChange={(e) => setFormData({...formData, costo: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Kilometraje (opcional)</Label>
                  <Input
                    type="number"
                    value={formData.kms}
                    onChange={(e) => setFormData({...formData, kms: e.target.value})}
                    placeholder="Kilometraje al momento del mantenimiento"
                  />
                </div>
                <Button onClick={() => createMaintenance.mutate(formData)} className="w-full">
                  Registrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="scheduled" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Programados
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Recientes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="mt-6">
            <div className="space-y-6">
              <MaintenanceCalendar />
              <ScheduledMaintenancePanel />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <MaintenanceHistoryPanel />
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="grid gap-4">
              {maintenance && maintenance.length > 0 ? (
                maintenance.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            {item.tipo}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.vehicles?.placa} - {item.vehicles?.marca} {item.vehicles?.modelo}
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">${item.costo?.toLocaleString()}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => toast.info('Funcionalidad de ver detalles próximamente')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm('¿Marcar este mantenimiento como realizado? Se moverá al historial.')) {
                                    markAsCompleted.mutate(item.id);
                                  }
                                }}
                                className="text-primary"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Marcar como realizado
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm('¿Está seguro de eliminar este mantenimiento?')) {
                                    deleteMaintenance.mutate(item.id);
                                  }
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {item.descripcion && (
                        <p className="text-sm mb-3">{item.descripcion}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha</p>
                          <p className="text-sm font-medium">
                            {new Date(item.fecha).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        {item.kms && (
                          <div>
                            <p className="text-xs text-muted-foreground">Kilometraje</p>
                            <p className="text-sm font-medium">{item.kms?.toLocaleString()} km</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay mantenimientos registrados</p>
                      <p className="text-sm mt-2">Registra el primer mantenimiento usando el botón superior</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
