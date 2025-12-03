import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AlertsPanel() {
  const queryClient = useQueryClient();

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, vehicles(placa, marca, modelo)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const { data: maintenanceAlerts } = useQuery({
    queryKey: ['maintenance_alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts_maintenance_view')
        .select('*')
        .eq('estado', 'activa')
        .order('dias_restantes', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const { data: vehicleExpirations } = useQuery({
    queryKey: ['vehicle_expirations'],
    queryFn: async () => {
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, placa, marca, modelo, fecha_soat, fecha_tecnomecanica, fecha_impuestos')
        .or(`fecha_soat.lte.${sevenDaysFromNow.toISOString().split('T')[0]},fecha_tecnomecanica.lte.${sevenDaysFromNow.toISOString().split('T')[0]},fecha_impuestos.lte.${sevenDaysFromNow.toISOString().split('T')[0]}`)
        .or(`fecha_soat.gte.${today.toISOString().split('T')[0]},fecha_tecnomecanica.gte.${today.toISOString().split('T')[0]},fecha_impuestos.gte.${today.toISOString().split('T')[0]}`);
      
      if (error) throw error;
      
      // Format alerts
      const alerts = [];
      data?.forEach(vehicle => {
        if (vehicle.fecha_soat) {
          const daysLeft = Math.ceil((new Date(vehicle.fecha_soat).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft >= 0) {
            alerts.push({
              id: `soat-${vehicle.id}`,
              vehicle_id: vehicle.id,
              placa: vehicle.placa,
              marca: vehicle.marca,
              modelo: vehicle.modelo,
              tipo: 'SOAT por vencer',
              dias_restantes: daysLeft,
              descripcion: `SOAT del vehículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
            });
          }
        }
        if (vehicle.fecha_tecnomecanica) {
          const daysLeft = Math.ceil((new Date(vehicle.fecha_tecnomecanica).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft >= 0) {
            alerts.push({
              id: `tecno-${vehicle.id}`,
              vehicle_id: vehicle.id,
              placa: vehicle.placa,
              marca: vehicle.marca,
              modelo: vehicle.modelo,
              tipo: 'Tecnomecánica por vencer',
              dias_restantes: daysLeft,
              descripcion: `Tecnomecánica del vehículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
            });
          }
        }
        if (vehicle.fecha_impuestos) {
          const daysLeft = Math.ceil((new Date(vehicle.fecha_impuestos).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft >= 0) {
            alerts.push({
              id: `impuestos-${vehicle.id}`,
              vehicle_id: vehicle.id,
              placa: vehicle.placa,
              marca: vehicle.marca,
              modelo: vehicle.modelo,
              tipo: 'Impuestos por vencer',
              dias_restantes: daysLeft,
              descripcion: `Impuestos del vehículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) vencen en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
            });
          }
        }
      });
      
      return alerts.sort((a, b) => a.dias_restantes - b.dias_restantes);
    }
  });

  const { data: contractsEnding } = useQuery({
    queryKey: ['contracts_ending'],
    queryFn: async () => {
      const today = new Date();
      const todayDateOnly = today.toISOString().split('T')[0]; // Solo la fecha YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*, vehicles(placa, marca, modelo), customers(nombres, primer_apellido)')
        .eq('status', 'signed')
        .gte('end_date', `${todayDateOnly}T00:00:00`)
        .lt('end_date', `${todayDateOnly}T23:59:59`)
        .order('end_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: upcomingMaintenance } = useQuery({
    queryKey: ['upcoming_maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*, vehicles(placa, marca, modelo, kilometraje_actual)')
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      // Filter schedules that are due soon (within 7 days or 500km)
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      return data?.filter(schedule => {
        // Check date-based maintenance
        if (schedule.next_due_date) {
          const dueDate = new Date(schedule.next_due_date);
          if (dueDate <= sevenDaysFromNow && dueDate >= today) {
            return true;
          }
        }
        
        // Check km-based maintenance
        if (schedule.next_due_km && schedule.vehicles?.kilometraje_actual) {
          const kmLeft = schedule.next_due_km - schedule.vehicles.kilometraje_actual;
          if (kmLeft <= 500 && kmLeft >= 0) {
            return true;
          }
        }
        
        return false;
      }) || [];
    }
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.rpc('resolve_alert', {
        p_alert_id: alertId,
        p_descripcion: 'Alerta marcada como resuelta desde el dashboard'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alerta marcada como resuelta');
    },
    onError: (error) => {
      toast.error('Error al resolver alerta: ' + error.message);
    }
  });

  const resolveMaintenanceAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.rpc('mark_maintenance_alert_resolved', {
        p_alert_id: alertId,
        p_descripcion: 'Alerta de mantenimiento atendida desde el dashboard'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
      toast.success('Alerta de mantenimiento atendida');
    },
    onError: (error) => {
      toast.error('Error al atender alerta: ' + error.message);
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getAlertColor = (diasRestantes: number | null) => {
    if (!diasRestantes) return 'outline';
    if (diasRestantes <= 0) return 'destructive';
    if (diasRestantes <= 3) return 'default';
    if (diasRestantes <= 7) return 'secondary';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Alertas Activas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {/* Alertas Generales */}
            {alerts?.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getPriorityColor(alert.priority)}>
                      {alert.tipo}
                    </Badge>
                    {alert.vehicles && (
                      <span className="text-xs text-muted-foreground">
                        {alert.vehicles.placa}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{alert.mensaje}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveAlert.mutate(alert.id)}
                  disabled={resolveAlert.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Alertas de Mantenimiento */}
            {maintenanceAlerts?.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getAlertColor(alert.dias_restantes)}>
                      {alert.tipo_alerta}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.dias_restantes !== null && (
                        alert.dias_restantes <= 0 
                          ? `Vencido hace ${Math.abs(alert.dias_restantes)} días`
                          : `${alert.dias_restantes} días restantes`
                      )}
                    </span>
                  </div>
                  <p className="text-sm">{alert.descripcion}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveMaintenanceAlert.mutate(alert.id)}
                  disabled={resolveMaintenanceAlert.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Alertas de Vencimientos de Vehículos */}
            {vehicleExpirations?.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getAlertColor(alert.dias_restantes)}>
                      {alert.tipo}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.placa}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {alert.dias_restantes === 0 ? 'Hoy' : alert.dias_restantes === 1 ? 'Mañana' : `${alert.dias_restantes} días`}
                    </span>
                  </div>
                  <p className="text-sm">{alert.descripcion}</p>
                </div>
              </div>
            ))}

            {/* Mantenimientos Programados (próximos 7 días o 500km) */}
            {upcomingMaintenance?.map((schedule) => {
              let daysLeft = null;
              let kmLeft = null;
              let urgencyText = '';

              if (schedule.next_due_date) {
                daysLeft = Math.ceil((new Date(schedule.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                urgencyText = daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `${daysLeft} días`;
              }
              
              if (schedule.next_due_km && schedule.vehicles?.kilometraje_actual) {
                kmLeft = schedule.next_due_km - schedule.vehicles.kilometraje_actual;
                if (urgencyText) urgencyText += ' / ';
                urgencyText += `${kmLeft} km restantes`;
              }

              const urgency = daysLeft !== null ? daysLeft : (kmLeft !== null && kmLeft <= 100 ? 0 : 5);

              return (
                <div key={schedule.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getAlertColor(urgency)}>
                        Mantenimiento programado
                      </Badge>
                      {schedule.vehicles && (
                        <span className="text-xs text-muted-foreground">
                          {schedule.vehicles.placa}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {urgencyText}
                      </span>
                    </div>
                    <p className="text-sm">
                      {schedule.tipo}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Contratos Finalizando */}
            {contractsEnding?.map((contract) => {
              return (
                <div key={contract.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive">
                        Contrato Finaliza HOY
                      </Badge>
                      {contract.vehicles && (
                        <span className="text-xs text-muted-foreground">
                          {contract.vehicles.placa}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      Contrato {contract.contract_number} - {contract.customers?.nombres} {contract.customers?.primer_apellido}
                    </p>
                  </div>
                </div>
              );
            })}

            {(!alerts || alerts.length === 0) && 
             (!maintenanceAlerts || maintenanceAlerts.length === 0) && 
             (!vehicleExpirations || vehicleExpirations.length === 0) && 
             (!upcomingMaintenance || upcomingMaintenance.length === 0) && 
             (!contractsEnding || contractsEnding.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No hay alertas activas
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
