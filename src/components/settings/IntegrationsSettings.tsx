import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { logAudit } from "@/lib/audit";

const IntegrationsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState({
    google_workspace: { enabled: false },
    gpt: { enabled: true },
    stripe: { enabled: false },
    mercadopago: { enabled: false },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "integrations")
        .single();

      if (error) throw error;
      if (data) {
        setIntegrations(data.value as any);
      }
    } catch (error) {
      console.error("Error loading integrations:", error);
      toast.error("Error al cargar integraciones");
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (key: string) => {
    try {
      const newIntegrations = {
        ...integrations,
        [key]: { enabled: !integrations[key as keyof typeof integrations].enabled },
      };

      const { error } = await supabase
        .from("settings")
        .update({
          value: newIntegrations,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("key", "integrations");

      if (error) throw error;

      setIntegrations(newIntegrations);

      await logAudit({
        actionType: "USER_UPDATE",
        tableName: "settings",
        description: `Integración ${key} ${newIntegrations[key as keyof typeof integrations].enabled ? "activada" : "desactivada"}`,
      });

      toast.success("Integración actualizada");
    } catch (error) {
      console.error("Error toggling integration:", error);
      toast.error("Error al actualizar integración");
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

  const integrationsList = [
    {
      key: "google_workspace",
      name: "Google Workspace",
      description: "Integración con Google Drive y Gmail para gestión de documentos y comunicaciones",
      enabled: integrations.google_workspace.enabled,
    },
    {
      key: "gpt",
      name: "GPT / IA",
      description: "Agentes GPT para ventas y marketing con acceso controlado a la base de datos",
      enabled: integrations.gpt.enabled,
    },
    {
      key: "stripe",
      name: "Stripe",
      description: "Pasarela de pago para procesar pagos con tarjeta de crédito",
      enabled: integrations.stripe.enabled,
    },
    {
      key: "mercadopago",
      name: "MercadoPago",
      description: "Pasarela de pago para América Latina",
      enabled: integrations.mercadopago.enabled,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integraciones</CardTitle>
        <CardDescription>
          Gestiona las conexiones con servicios externos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {integrationsList.map((integration) => (
            <div
              key={integration.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg space-y-3 sm:space-y-0"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{integration.name}</h4>
                  <Badge variant={integration.enabled ? "default" : "secondary"}>
                    {integration.enabled ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        No conectado
                      </span>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={integration.enabled ? "destructive" : "default"}
                  onClick={() => toggleIntegration(integration.key)}
                >
                  {integration.enabled ? "Desactivar" : "Activar"}
                </Button>
                {integration.key === "gpt" && (
                  <Button variant="outline" asChild>
                    <a href="/customers" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ver API
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Para configurar credenciales de integraciones, accede a la
            sección de Backend en el panel de Lovable Cloud.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationsSettings;
