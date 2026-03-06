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
import { Plus, Wrench, Calendar, History, MoreVertical, Trash2, Eye, CheckCircle2, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScheduledMaintenancePanel } from "@/components/maintenance/ScheduledMaintenancePanel";
import { MaintenanceHistoryPanel } from "@/components/maintenance/MaintenanceHistoryPanel";
import { MaintenanceCalendar } from "@/components/maintenance/MaintenanceCalendar";

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    tipo: "",
    descripcion: "",
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
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
      console.log('[Query] Cargando mantenimientos...');
      const { data, error } = await supabase
        .from('maintenance')
        .select('*, vehicles(placa, marca, modelo)')
        .eq('completed', false)
        .order('fecha', { ascending: false })
        .limit(10);
      if (error) throw error;
      console.log('[Query] Mantenimientos cargados:', data?.length);
      return data;
    },
    staleTime: 0, // Datos siempre frescos
    gcTime: 0, // No guardar en cache
  });

  const createMaintenance = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Crear fechas a mediodía para evitar problemas de timezone
      const fechaInicioStr = `${data.fecha_inicio}T12:00:00`;
      const fechaFinStr = `${data.fecha_fin}T12:00:00`;
      
      const { error } = await supabase.from('maintenance').insert({
        vehicle_id: data.vehicle_id,
        tipo: data.tipo,
        descripcion: data.descripcion,
        fecha: fechaInicioStr,
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr,
        costo: parseFloat(data.costo),
        kms: data.kms ? parseInt(data.kms) : null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_schedules_calendar'] });
      queryClient.invalidateQueries({ queryKey: ['finance_items'] });
      toast.success('Mantenimiento registrado exitosamente');
      setIsDialogOpen(false);
      setEditingMaintenance(null);
      setFormData({
        vehicle_id: "",
        tipo: "",
        descripcion: "",
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        costo: "",
        kms: ""
      });
    },
    onError: (error) => {
      toast.error('Error al registrar mantenimiento: ' + error.message);
    }
  });

  const updateMaintenance = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      console.log('[Update] ===== INICIO ACTUALIZACIÓN =====');
      console.log('[Update] ID:', id);
      console.log('[Update] Data recibida:', data);
      
      const fechaInicioStr = `${data.fecha_inicio}T12:00:00`;
      const fechaFinStr = `${data.fecha_fin}T12:00:00`;
      
      const updateData = {
        vehicle_id: data.vehicle_id,
        tipo: data.tipo,
        descripcion: data.descripcion,
        fecha: fechaInicioStr,
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr,
        costo: parseFloat(data.costo),
        kms: data.kms ? parseInt(data.kms) : null
      };
      
      console.log('[Update] Datos procesados para UPDATE:', updateData);
      console.log('[Update] Costo parseado:', parseFloat(data.costo));
      
      const { data: result, error } = await supabase
        .from('maintenance')
        .update(updateData)
        .eq('id', id)
        .select('*');
      
      console.log('[Update] Respuesta de Supabase:');
      console.log('[Update] - Result:', result);
      console.log('[Update] - Error:', error);
      
      if (error) {
        console.error('[Update] ❌ ERROR DETECTADO:', error);
        throw error;
      }
      
      if (!result || result.length === 0) {
        console.error('[Update] ❌ No se actualizó ningún registro');
        throw new Error('No se encontró el registro para actualizar');
      }
      
      console.log('[Update] ✅ Actualización exitosa en BD:', result[0]);
      console.log('[Update] ===== FIN ACTUALIZACIÓN =====');
      return result[0];
    },
    onSuccess: async () => {
      console.log('[Update] onSuccess - Invalidando queries');
      
      // Invalidar y refrescar INMEDIATAMENTE
      await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      await queryClient.refetchQueries({ queryKey: ['maintenance'] });
      
      // Invalidar otros queries relacionados
      queryClient.invalidateQueries({ queryKey: ['maintenance_schedules_calendar'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_history'] });
      queryClient.invalidateQueries({ queryKey: ['finance_items'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-report'] });
      
      toast.success('Mantenimiento actualizado exitosamente');
      setIsDialogOpen(false);
      setEditingMaintenance(null);
      setFormData({
        vehicle_id: "",
        tipo: "",
        descripcion: "",
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        costo: "",
        kms: ""
      });
      
      console.log('[Update] UI actualizada');
    },
    onError: (error) => {
      console.error('[Update] ===== ERROR EN ACTUALIZACIÓN =====');
      console.error('[Update] Error completo:', error);
      console.error('[Update] Error message:', error.message);
      console.error('[Update] Error stack:', error.stack);
      toast.error('Error al actualizar mantenimiento: ' + error.message);
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

  const handleEdit = (item: any) => {
    console.log('[handleEdit] Item a editar:', item);
    setEditingMaintenance(item);
    
    const formDataToEdit = {
      vehicle_id: item.vehicle_id,
      tipo: item.tipo,
      descripcion: item.descripcion || "",
      fecha_inicio: new Date(item.fecha_inicio || item.fecha).toISOString().split('T')[0],
      fecha_fin: new Date(item.fecha_fin || item.fecha).toISOString().split('T')[0],
      costo: item.costo?.toString() || "",
      kms: item.kms?.toString() || ""
    };
    
    console.log('[handleEdit] Form data cargado:', formDataToEdit);
    setFormData(formDataToEdit);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // Validar que hay datos
    if (!formData.vehicle_id || !formData.tipo || !formData.costo) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (editingMaintenance) {
      console.log('[handleSave] Actualizando mantenimiento:', editingMaintenance.id);
      updateMaintenance.mutate({ id: editingMaintenance.id, data: formData });
    } else {
      console.log('[handleSave] Creando nuevo mantenimiento');
      createMaintenance.mutate(formData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingMaintenance(null);
      setFormData({
        vehicle_id: "",
        tipo: "",
        descripcion: "",
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        costo: "",
        kms: ""
      });
    }
  };

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
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Mantenimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMaintenance ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'}
                </DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Fecha Fin</Label>
                    <Input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                      min={formData.fecha_inicio}
                    />
                  </div>
                </div>
                <div>
                  <Label>Costo {editingMaintenance && '(Puedes actualizar con el valor real)'}</Label>
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
                <Button 
                  onClick={handleSave} 
                  className="w-full"
                  disabled={createMaintenance.isPending || updateMaintenance.isPending}
                >
                  {editingMaintenance ? 'Actualizar' : 'Registrar'}
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
                                onClick={() => handleEdit(item)}
                                data-testid={`edit-maintenance-${item.id}`}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
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
