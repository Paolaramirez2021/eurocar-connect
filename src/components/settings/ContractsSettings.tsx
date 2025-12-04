import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ContractsSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [envioPrevio, setEnvioPrevio] = useState(true);
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
        .eq("key", "envio_contrato_previo")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const value = data.value as any;
        const actualValue = value?.value !== undefined ? value.value : value;
        setEnvioPrevio(actualValue === true);
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
        .upsert({ key: "envio_contrato_previo", value: { value: envioPrevio } }, { onConflict: "key" });

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
        <CardTitle>Configuración de Contratos</CardTitle>
        <CardDescription>
          Gestiona cómo se generan y envían los contratos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enviar contrato previo sin firma</Label>
            <p className="text-sm text-muted-foreground">
              Al completar datos y pago, se genera y envía el contrato al cliente para revisar antes de firmar
            </p>
          </div>
          <Switch
            checked={envioPrevio}
            onCheckedChange={setEnvioPrevio}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Flujo de Contrato Previo</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Cliente completa datos de la reserva</li>
            <li>Cliente realiza el pago</li>
            <li>Sistema genera contrato automáticamente</li>
            <li>Se envía por email/WhatsApp para revisión</li>
            <li>Cliente firma cuando esté conforme</li>
            <li>Contrato se confirma tras firma</li>
          </ol>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
};
