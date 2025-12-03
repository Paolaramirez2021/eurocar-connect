import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Calendar, User } from "lucide-react";

export default function AuditLogPanel() {
  const { data: auditLogs } = useQuery({
    queryKey: ['audit_log_recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'RESERVATION_CREATE': 'Reserva Creada',
      'RESERVATION_UPDATE': 'Reserva Actualizada',
      'RESERVATION_FINALIZE': 'Reserva Finalizada',
      'RESERVATION_CANCEL': 'Reserva Cancelada',
      'MAINTENANCE_CREATE': 'Mantenimiento Creado',
      'MAINTENANCE_UPDATE': 'Mantenimiento Actualizado',
      'MAINTENANCE_ALERT_RESOLVED': 'Alerta Atendida',
      'ALERT_RESOLVED': 'Alerta Resuelta',
      'VEHICLE_CREATE': 'Vehículo Creado',
      'VEHICLE_UPDATE': 'Vehículo Actualizado',
      'USER_LOGIN': 'Inicio de Sesión',
      'USER_LOGOUT': 'Cierre de Sesión',
      'CLOCK_IN': 'Entrada Registrada',
      'CLOCK_OUT': 'Salida Registrada',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('CREATE')) return 'default';
    if (actionType.includes('UPDATE')) return 'secondary';
    if (actionType.includes('FINALIZE') || actionType.includes('RESOLVED')) return 'outline';
    if (actionType.includes('CANCEL') || actionType.includes('DELETE')) return 'destructive';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bitácora Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {auditLogs?.map((log) => (
              <div 
                key={log.id} 
                className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={getActionColor(log.action_type)}>
                    {getActionTypeLabel(log.action_type)}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </div>
                </div>
                
                {log.description && (
                  <p className="text-sm text-muted-foreground">{log.description}</p>
                )}
              </div>
            ))}
            
            {(!auditLogs || auditLogs.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No hay registros recientes
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
