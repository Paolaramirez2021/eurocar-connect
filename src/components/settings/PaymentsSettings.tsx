import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const PaymentsSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagoObligatorio, setPagoObligatorio] = useState(true);
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
        .eq("key", "pago_obligatorio")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const value = data.value as any;
        const actualValue = value?.value !== undefined ? value.value : value;
        setPagoObligatorio(actualValue === true);
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
        .upsert({ key: "pago_obligatorio", value: { value: pagoObligatorio } }, { onConflict: "key" });

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
        <CardTitle>Configuración de Pagos</CardTitle>
        <CardDescription>
          Gestiona las políticas de pago y cancelación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Pago obligatorio para confirmar reserva</Label>
            <p className="text-sm text-muted-foreground">
              El cliente debe pagar para que la reserva sea confirmada
            </p>
          </div>
          <Switch
            checked={pagoObligatorio}
            onCheckedChange={setPagoObligatorio}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Política de Reembolso</h4>
          <p className="text-sm text-muted-foreground">
            Los comerciales pueden cancelar reservas con pago pero SIN contrato firmado.
          </p>
          <p className="text-sm text-muted-foreground">
            Al cancelar, se libera el vehículo y las fechas en el calendario de inmediato.
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
