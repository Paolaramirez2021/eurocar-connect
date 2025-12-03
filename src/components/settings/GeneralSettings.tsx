import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { logAudit } from "@/lib/audit";

const GeneralSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    company_name: "",
    company_description: "",
    timezone: "America/Bogota",
    base_city: "Bogotá",
    default_currency: "COP",
    iva_percentage: 19,
    min_reservation_days: 1,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", [
          "company_name",
          "company_description",
          "timezone",
          "base_city",
          "default_currency",
          "iva_percentage",
          "min_reservation_days",
        ]);

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach((item) => {
        const value = item.value as { value: any };
        settingsMap[item.key] = value.value;
      });

      setSettings((prev) => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: { value },
        updated_by: userData.user?.id,
      }));

      const { error } = await supabase
        .from("settings")
        .upsert(updates, { onConflict: "key" });

      if (error) throw error;

      await logAudit({
        actionType: "USER_UPDATE",
        tableName: "settings",
        description: "Configuración general actualizada",
        newData: settings,
      });

      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving settings:", error);
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
        <CardTitle>Preferencias Generales</CardTitle>
        <CardDescription>
          Configura la información básica de tu empresa y preferencias del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nombre de la empresa</Label>
            <Input
              id="company_name"
              value={settings.company_name}
              onChange={(e) =>
                setSettings({ ...settings, company_name: e.target.value })
              }
              placeholder="EuroCar Rental"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_city">Ciudad base</Label>
            <Input
              id="base_city"
              value={settings.base_city}
              onChange={(e) =>
                setSettings({ ...settings, base_city: e.target.value })
              }
              placeholder="Bogotá"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_description">Descripción</Label>
          <Textarea
            id="company_description"
            value={settings.company_description}
            onChange={(e) =>
              setSettings({ ...settings, company_description: e.target.value })
            }
            placeholder="Descripción de tu empresa"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select
              value={settings.timezone}
              onValueChange={(value) =>
                setSettings({ ...settings, timezone: value })
              }
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Bogota">América/Bogotá</SelectItem>
                <SelectItem value="America/New_York">América/Nueva York</SelectItem>
                <SelectItem value="America/Mexico_City">América/Ciudad de México</SelectItem>
                <SelectItem value="Europe/Madrid">Europa/Madrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_currency">Moneda por defecto</Label>
            <Select
              value={settings.default_currency}
              onValueChange={(value) =>
                setSettings({ ...settings, default_currency: value })
              }
            >
              <SelectTrigger id="default_currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COP">COP (Peso Colombiano)</SelectItem>
                <SelectItem value="USD">USD (Dólar)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                <SelectItem value="MXN">MXN (Peso Mexicano)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="iva_percentage">IVA (%)</Label>
            <Input
              id="iva_percentage"
              type="number"
              min="0"
              max="100"
              value={settings.iva_percentage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  iva_percentage: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_reservation_days">
              Límite mínimo de días para reservas
            </Label>
            <Input
              id="min_reservation_days"
              type="number"
              min="1"
              value={settings.min_reservation_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  min_reservation_days: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
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

export default GeneralSettings;
