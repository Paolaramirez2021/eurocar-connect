import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const CalendarSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState({
    rentado: "#ef4444",
    reservado: "#22c55e",
    mantenimiento: "#f97316",
    disponible: "#ffffff",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "colores_calendario")
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        const value = data.value as any;
        const actualValue = value?.value !== undefined ? value.value : value;
        setColors(actualValue);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "colores_calendario", value: { value: colors } }, { onConflict: "key" });

      if (error) throw error;

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
        <CardTitle>Configuración del Calendario</CardTitle>
        <CardDescription>
          Personaliza los colores del calendario según el estado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rentado">Color: Rentado</Label>
            <div className="flex gap-2">
              <Input
                id="rentado"
                type="color"
                value={colors.rentado}
                onChange={(e) => setColors({ ...colors, rentado: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={colors.rentado}
                onChange={(e) => setColors({ ...colors, rentado: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservado">Color: Reservado</Label>
            <div className="flex gap-2">
              <Input
                id="reservado"
                type="color"
                value={colors.reservado}
                onChange={(e) => setColors({ ...colors, reservado: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={colors.reservado}
                onChange={(e) => setColors({ ...colors, reservado: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mantenimiento">Color: Mantenimiento</Label>
            <div className="flex gap-2">
              <Input
                id="mantenimiento"
                type="color"
                value={colors.mantenimiento}
                onChange={(e) => setColors({ ...colors, mantenimiento: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={colors.mantenimiento}
                onChange={(e) => setColors({ ...colors, mantenimiento: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="disponible">Color: Disponible</Label>
            <div className="flex gap-2">
              <Input
                id="disponible"
                type="color"
                value={colors.disponible}
                onChange={(e) => setColors({ ...colors, disponible: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={colors.disponible}
                onChange={(e) => setColors({ ...colors, disponible: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-3">Vista Previa</h4>
          <div className="flex gap-2">
            <div className="flex-1 h-12 rounded border flex items-center justify-center text-sm" style={{ backgroundColor: colors.rentado }}>
              Rentado
            </div>
            <div className="flex-1 h-12 rounded border flex items-center justify-center text-sm" style={{ backgroundColor: colors.reservado }}>
              Reservado
            </div>
            <div className="flex-1 h-12 rounded border flex items-center justify-center text-sm" style={{ backgroundColor: colors.mantenimiento }}>
              Mantenimiento
            </div>
            <div className="flex-1 h-12 rounded border flex items-center justify-center text-sm" style={{ backgroundColor: colors.disponible }}>
              Disponible
            </div>
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
};
