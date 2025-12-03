import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ReservationsSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeoutHours, setTimeoutHours] = useState("2");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRegenerateStatus, setAutoRegenerateStatus] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["reserva_timeout_hours", "notificaciones_reservas_habilitadas", "regenerar_estado_vehiculo"]);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.value as any;
        const actualValue = value?.value !== undefined ? value.value : value;
        
        if (setting.key === "reserva_timeout_hours") {
          setTimeoutHours(String(actualValue));
        } else if (setting.key === "notificaciones_reservas_habilitadas") {
          setNotificationsEnabled(actualValue === true);
        } else if (setting.key === "regenerar_estado_vehiculo") {
          setAutoRegenerateStatus(actualValue === true);
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "reserva_timeout_hours", value: { value: parseInt(timeoutHours) } },
        { key: "notificaciones_reservas_habilitadas", value: { value: notificationsEnabled } },
        { key: "regenerar_estado_vehiculo", value: { value: autoRegenerateStatus } },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("settings")
          .upsert(update, { onConflict: "key" });

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Reservas</CardTitle>
        <CardDescription>
          Administra cómo se gestionan las reservas en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timeout">Tiempo límite sin pago (horas)</Label>
          <Input
            id="timeout"
            type="number"
            min="1"
            max="48"
            value={timeoutHours}
            onChange={(e) => setTimeoutHours(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Si el cliente no paga en este tiempo, la reserva se liberará automáticamente
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notificaciones de reservas pendientes</Label>
            <p className="text-sm text-muted-foreground">
              Recibir alertas cuando hay reservas sin pago
            </p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Regenerar estado del vehículo automáticamente</Label>
            <p className="text-sm text-muted-foreground">
              Al liberar una reserva, el vehículo vuelve a estar disponible
            </p>
          </div>
          <Switch
            checked={autoRegenerateStatus}
            onCheckedChange={setAutoRegenerateStatus}
          />
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
};
