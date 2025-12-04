import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const VehiclesSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [festivosNoPicoPlaca, setFestivosNoPicoPlaca] = useState(true);
  const [ciudad, setCiudad] = useState("Bogotá");
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
        .in("key", ["festivos_no_pico_y_placa", "ciudad_pico_placa"]);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.value as any;
        const actualValue = value?.value !== undefined ? value.value : value;
        
        if (setting.key === "festivos_no_pico_y_placa") {
          setFestivosNoPicoPlaca(actualValue === true);
        } else if (setting.key === "ciudad_pico_placa") {
          setCiudad(String(actualValue));
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "festivos_no_pico_y_placa", value: { value: festivosNoPicoPlaca } },
        { key: "ciudad_pico_placa", value: { value: ciudad } },
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
        <CardTitle>Configuración de Vehículos</CardTitle>
        <CardDescription>
          Ajustes relacionados con pico y placa y gestión de vehículos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ciudad">Ciudad para pico y placa</Label>
          <Input
            id="ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Bogotá"
          />
          <p className="text-sm text-muted-foreground">
            Define la ciudad que se usará para calcular restricciones
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Festivos NO generan restricción de pico y placa</Label>
            <p className="text-sm text-muted-foreground">
              En días festivos colombianos no aplica pico y placa
            </p>
          </div>
          <Switch
            checked={festivosNoPicoPlaca}
            onCheckedChange={setFestivosNoPicoPlaca}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Calendario Colombiano</h4>
          <p className="text-sm text-muted-foreground">
            El sistema utiliza el calendario de festivos colombianos oficial para determinar
            días sin restricción de pico y placa.
          </p>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
};
