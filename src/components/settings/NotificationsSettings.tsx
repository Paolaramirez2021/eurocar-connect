import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { logAudit } from "@/lib/audit";

const NotificationsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState({
    maintenance: true,
    soat: true,
    tecnomecanica: true,
    impuestos: true,
    reservations: true,
    contracts: true,
    employee_clock: true,
  });
  const [notificationMethods, setNotificationMethods] = useState({
    internal: true,
    email: true,
    push: false,
  });
  const [frequency, setFrequency] = useState("12h");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["notifications_enabled", "notification_methods", "notification_frequency"]);

      if (error) throw error;

      data?.forEach((item) => {
        if (item.key === "notifications_enabled") {
          setNotificationsEnabled(item.value as any);
        } else if (item.key === "notification_methods") {
          setNotificationMethods(item.value as any);
        } else if (item.key === "notification_frequency") {
          const freqValue = item.value as { value: string };
          setFrequency(freqValue.value);
        }
      });
    } catch (error) {
      console.error("Error loading notifications settings:", error);
      toast.error("Error al cargar configuración de notificaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const updates = [
        { key: "notifications_enabled", value: notificationsEnabled },
        { key: "notification_methods", value: notificationMethods },
        { key: "notification_frequency", value: { value: frequency } },
      ].map((item) => ({
        ...item,
        updated_by: userData.user?.id,
      }));

      const { error } = await supabase
        .from("settings")
        .upsert(updates, { onConflict: "key" });

      if (error) throw error;

      await logAudit({
        actionType: "USER_UPDATE",
        tableName: "settings",
        description: "Configuración de notificaciones actualizada",
      });

      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving notifications settings:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones y Alertas</CardTitle>
        <CardDescription>
          Configura qué notificaciones deseas recibir y cómo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Tipos de alertas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(notificationsEnabled).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setNotificationsEnabled({
                      ...notificationsEnabled,
                      [key]: checked as boolean,
                    })
                  }
                />
                <Label htmlFor={key} className="cursor-pointer">
                  {key === "maintenance" && "Mantenimiento"}
                  {key === "soat" && "SOAT próximo a vencer"}
                  {key === "tecnomecanica" && "Tecnomecánica próxima"}
                  {key === "impuestos" && "Impuestos próximos"}
                  {key === "reservations" && "Reservas próximas"}
                  {key === "contracts" && "Contratos pendientes"}
                  {key === "employee_clock" && "Entradas de empleados"}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Métodos de envío</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal"
                checked={notificationMethods.internal}
                onCheckedChange={(checked) =>
                  setNotificationMethods({
                    ...notificationMethods,
                    internal: checked as boolean,
                  })
                }
              />
              <Label htmlFor="internal" className="cursor-pointer">
                Notificación interna (campanita)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email"
                checked={notificationMethods.email}
                onCheckedChange={(checked) =>
                  setNotificationMethods({
                    ...notificationMethods,
                    email: checked as boolean,
                  })
                }
              />
              <Label htmlFor="email" className="cursor-pointer">
                Correo electrónico
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="push"
                checked={notificationMethods.push}
                onCheckedChange={(checked) =>
                  setNotificationMethods({
                    ...notificationMethods,
                    push: checked as boolean,
                  })
                }
              />
              <Label htmlFor="push" className="cursor-pointer">
                Notificación push (próximamente)
              </Label>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="frequency">Frecuencia de chequeo</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger id="frequency" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6h">Cada 6 horas</SelectItem>
              <SelectItem value="12h">Cada 12 horas</SelectItem>
              <SelectItem value="24h">Cada 24 horas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsSettings;
