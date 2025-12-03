import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Clock, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  kilometraje_actual: number;
  fecha_soat: string | null;
  fecha_tecnomecanica: string | null;
  fecha_impuestos: string | null;
  ultimo_cambio_aceite_km: number | null;
  ultimo_cambio_llantas_km: number | null;
  ultimo_cambio_pastillas_km: number | null;
}

interface Alert {
  id: string;
  vehicle_id: string;
  tipo_alerta: string;
  descripcion: string;
  fecha_evento: string;
  dias_restantes: number;
  estado: string;
  vehicles?: {
    placa: string;
    marca: string;
    modelo: string;
  };
}

const AlertasMantenimiento = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActivas, setTotalActivas] = useState(0);
  const [totalVencidas, setTotalVencidas] = useState(0);
  const [proximasSieteDias, setProximasSieteDias] = useState(0);

  // Update dialog state
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [newDate, setNewDate] = useState<Date>();
  const [newKilometraje, setNewKilometraje] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      initializeAlerts();
    }
  }, [user]);

  const initializeAlerts = async () => {
    setLoading(true);
    try {
      // First update estados
      await supabase.rpc("update_alerts_estado");

      // Generate alerts
      await generateAlerts();

      // Load alerts
      await loadAlerts();
    } catch (error) {
      console.error("Error initializing alerts:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = async () => {
    try {
      // Get all vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*");

      if (vehiclesError) throw vehiclesError;

      if (!vehicles) return;

      for (const vehicle of vehicles) {
        // Check SOAT (12 months)
        if (vehicle.fecha_soat) {
          const soatDate = new Date(vehicle.fecha_soat);
          await createOrUpdateAlert(
            vehicle.id,
            "SOAT",
            `Vencimiento SOAT para ${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}`,
            soatDate
          );
        }

        // Check Tecnomecánica (12 months)
        if (vehicle.fecha_tecnomecanica) {
          const tecnoDate = new Date(vehicle.fecha_tecnomecanica);
          await createOrUpdateAlert(
            vehicle.id,
            "Tecnomecánica",
            `Vencimiento Tecnomecánica para ${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}`,
            tecnoDate
          );
        }

        // Check Impuestos
        if (vehicle.fecha_impuestos) {
          const impuestosDate = new Date(vehicle.fecha_impuestos);
          await createOrUpdateAlert(
            vehicle.id,
            "Impuestos",
            `Vencimiento Impuestos para ${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}`,
            impuestosDate
          );
        }

        // Check Cambio de Aceite (every 5,000 km)
        if (vehicle.ultimo_cambio_aceite_km !== null) {
          const nextChangeKm = vehicle.ultimo_cambio_aceite_km + 5000;
          if (vehicle.kilometraje_actual >= nextChangeKm - 500) {
            const daysEstimate = Math.ceil((nextChangeKm - vehicle.kilometraje_actual) / 50); // Assuming 50km per day
            const estimatedDate = new Date();
            estimatedDate.setDate(estimatedDate.getDate() + daysEstimate);
            
            await createOrUpdateAlert(
              vehicle.id,
              "Cambio de Aceite",
              `Cambio de aceite próximo para ${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa} (${vehicle.kilometraje_actual}/${nextChangeKm} km)`,
              estimatedDate
            );
          }
        }

        // Check Cambio de Llantas (every 40,000 km)
        if (vehicle.ultimo_cambio_llantas_km !== null) {
          const nextChangeKm = vehicle.ultimo_cambio_llantas_km + 40000;
          if (vehicle.kilometraje_actual >= nextChangeKm - 2000) {
            const daysEstimate = Math.ceil((nextChangeKm - vehicle.kilometraje_actual) / 50);
            const estimatedDate = new Date();
            estimatedDate.setDate(estimatedDate.getDate() + daysEstimate);
            
            await createOrUpdateAlert(
              vehicle.id,
              "Llantas",
              `Cambio de llantas próximo para ${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa} (${vehicle.kilometraje_actual}/${nextChangeKm} km)`,
              estimatedDate
            );
          }
        }

        // Check Cambio de Pastillas (every 20,000 km)
        if (vehicle.ultimo_cambio_pastillas_km !== null) {
          const nextChangeKm = vehicle.ultimo_cambio_pastillas_km + 20000;
          if (vehicle.kilometraje_actual >= nextChangeKm - 1000) {
            const daysEstimate = Math.ceil((nextChangeKm - vehicle.kilometraje_actual) / 50);
            const estimatedDate = new Date();
            estimatedDate.setDate(estimatedDate.getDate() + daysEstimate);
            
            await createOrUpdateAlert(
              vehicle.id,
              "Pastillas",
              `Cambio de pastillas próximo para ${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa} (${vehicle.kilometraje_actual}/${nextChangeKm} km)`,
              estimatedDate
            );
          }
        }
      }
    } catch (error) {
      console.error("Error generating alerts:", error);
    }
  };

  const createOrUpdateAlert = async (
    vehicleId: string,
    tipoAlerta: string,
    descripcion: string,
    fechaEvento: Date
  ) => {
    try {
      // Check if alert already exists and is active
      const { data: existingAlert } = await supabase
        .from("alerts_maintenance")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("tipo_alerta", tipoAlerta)
        .in("estado", ["activa", "vencida"])
        .maybeSingle();

      if (existingAlert) {
        // Update existing alert
        await supabase
          .from("alerts_maintenance")
          .update({
            descripcion,
            fecha_evento: format(fechaEvento, "yyyy-MM-dd"),
          })
          .eq("id", existingAlert.id);
      } else {
        // Create new alert
        await supabase.from("alerts_maintenance").insert({
          vehicle_id: vehicleId,
          tipo_alerta: tipoAlerta,
          descripcion,
          fecha_evento: format(fechaEvento, "yyyy-MM-dd"),
          estado: "activa",
        });
      }
    } catch (error) {
      console.error("Error creating/updating alert:", error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("alerts_maintenance")
        .select("*, vehicles(placa, marca, modelo)")
        .order("fecha_evento", { ascending: true });

      if (error) throw error;

      // Calculate dias_restantes manually
      const alertsWithDays = (data || []).map((alert) => {
        const fechaEvento = new Date(alert.fecha_evento);
        const today = new Date();
        const diffTime = fechaEvento.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...alert,
          dias_restantes: diffDays,
        };
      });

      // Sort by priority: vencida first, then by dias_restantes
      alertsWithDays.sort((a, b) => {
        if (a.estado === "vencida" && b.estado !== "vencida") return -1;
        if (a.estado !== "vencida" && b.estado === "vencida") return 1;
        if (a.estado === "atendida" && b.estado !== "atendida") return 1;
        if (a.estado !== "atendida" && b.estado === "atendida") return -1;
        return a.dias_restantes - b.dias_restantes;
      });

      setAlerts(alertsWithDays);

      // Calculate stats
      const activas = alertsWithDays.filter((a) => a.estado === "activa").length;
      const vencidas = alertsWithDays.filter((a) => a.estado === "vencida").length;
      const proximas = alertsWithDays.filter(
        (a) => a.estado === "activa" && a.dias_restantes > 0 && a.dias_restantes <= 7
      ).length;

      setTotalActivas(activas);
      setTotalVencidas(vencidas);
      setProximasSieteDias(proximas);
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  };

  const getPriorityColor = (diasRestantes: number, estado: string) => {
    if (estado === "atendida") return "text-muted-foreground";
    if (estado === "vencida" || diasRestantes <= 0) return "text-destructive";
    if (diasRestantes <= 7) return "text-orange-500";
    return "text-green-500";
  };

  const getPriorityBadge = (diasRestantes: number, estado: string) => {
    if (estado === "atendida") {
      return <Badge variant="secondary">Atendida</Badge>;
    }
    if (estado === "vencida" || diasRestantes <= 0) {
      return <Badge className="bg-red-500">🔴 Urgente</Badge>;
    }
    if (diasRestantes <= 7) {
      return <Badge className="bg-orange-500">🟠 Advertencia</Badge>;
    }
    return <Badge className="bg-green-500">🟢 Ok</Badge>;
  };

  const handleOpenUpdateDialog = (alert: Alert) => {
    setSelectedAlert(alert);
    setNewDate(undefined);
    setNewKilometraje("");
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateAlert = async () => {
    if (!selectedAlert) return;

    setUpdating(true);
    try {
      // Mark alert as atendida
      await supabase
        .from("alerts_maintenance")
        .update({ estado: "atendida" })
        .eq("id", selectedAlert.id);

      // Get vehicle data
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", selectedAlert.vehicle_id)
        .single();

      if (!vehicle) throw new Error("Vehicle not found");

      // Update vehicle based on alert type
      const updateData: Partial<Vehicle> = {};

      switch (selectedAlert.tipo_alerta) {
        case "SOAT":
          if (newDate) {
            updateData.fecha_soat = format(newDate, "yyyy-MM-dd");
          }
          break;
        case "Tecnomecánica":
          if (newDate) {
            updateData.fecha_tecnomecanica = format(newDate, "yyyy-MM-dd");
          }
          break;
        case "Impuestos":
          if (newDate) {
            updateData.fecha_impuestos = format(newDate, "yyyy-MM-dd");
          }
          break;
        case "Cambio de Aceite":
          if (newKilometraje) {
            updateData.ultimo_cambio_aceite_km = parseInt(newKilometraje);
          }
          break;
        case "Llantas":
          if (newKilometraje) {
            updateData.ultimo_cambio_llantas_km = parseInt(newKilometraje);
          }
          break;
        case "Pastillas":
          if (newKilometraje) {
            updateData.ultimo_cambio_pastillas_km = parseInt(newKilometraje);
          }
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("vehicles")
          .update(updateData)
          .eq("id", selectedAlert.vehicle_id);
      }

      // Log audit
      await logAudit({
        actionType: "MAINTENANCE_ALERT_RESOLVED",
        tableName: "alerts_maintenance",
        recordId: selectedAlert.id,
        description: `Alerta ${selectedAlert.tipo_alerta} atendida`,
      });

      toast({
        title: "Alerta actualizada",
        description: "La información del vehículo ha sido actualizada correctamente",
      });

      setIsUpdateDialogOpen(false);
      await initializeAlerts();
    } catch (error) {
      console.error("Error updating alert:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la alerta",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Alertas y Mantenimiento</h1>
            <p className="text-muted-foreground">
              Gestiona el mantenimiento preventivo de tu flota
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
              <Bell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActivas}</div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totalVencidas}</div>
              <p className="text-xs text-muted-foreground">
                Urgente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas (7 días)</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{proximasSieteDias}</div>
              <p className="text-xs text-muted-foreground">
                A punto de vencer
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Todas las Alertas</CardTitle>
            <CardDescription>
              Ordenadas por prioridad (urgentes primero)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Cargando alertas...</p>
            ) : alerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay alertas registradas
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Tipo de Alerta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha Evento</TableHead>
                    <TableHead>Días Restantes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow
                      key={alert.id}
                      className={cn(
                        alert.estado === "atendida" && "opacity-60"
                      )}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {alert.vehicles?.marca} {alert.vehicles?.modelo}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {alert.vehicles?.placa}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{alert.tipo_alerta}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm">{alert.descripcion}</p>
                      </TableCell>
                      <TableCell>
                        {format(new Date(alert.fecha_evento), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-semibold",
                            getPriorityColor(alert.dias_restantes, alert.estado)
                          )}
                        >
                          {alert.dias_restantes > 0
                            ? `${alert.dias_restantes} días`
                            : alert.dias_restantes === 0
                            ? "Hoy"
                            : `${Math.abs(alert.dias_restantes)} días vencido`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(alert.dias_restantes, alert.estado)}
                      </TableCell>
                      <TableCell>
                        {alert.estado !== "atendida" && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenUpdateDialog(alert)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Actualizar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Update Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Actualizar Alerta</DialogTitle>
              <DialogDescription>
                Actualiza la información del mantenimiento realizado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Alerta</Label>
                <p className="text-sm font-medium">{selectedAlert?.tipo_alerta}</p>
              </div>

              <div className="space-y-2">
                <Label>Vehículo</Label>
                <p className="text-sm">
                  {selectedAlert?.vehicles?.marca} {selectedAlert?.vehicles?.modelo} -{" "}
                  {selectedAlert?.vehicles?.placa}
                </p>
              </div>

              {selectedAlert &&
              ["SOAT", "Tecnomecánica", "Impuestos"].includes(
                selectedAlert.tipo_alerta
              ) ? (
                <div className="space-y-2">
                  <Label>Nueva Fecha de Vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDate ? format(newDate, "PPP") : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={setNewDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Nuevo Kilometraje del Cambio</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 45000"
                    value={newKilometraje}
                    onChange={(e) => setNewKilometraje(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateAlert} disabled={updating}>
                {updating ? "Actualizando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AlertasMantenimiento;