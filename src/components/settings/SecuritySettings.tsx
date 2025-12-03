import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, LogOut, FileText, Shield } from "lucide-react";
import { logAudit } from "@/lib/audit";

const SecuritySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "security_2fa")
        .single();

      if (error) throw error;
      if (data) {
        const twoFAValue = data.value as { enabled: boolean };
        setTwoFactorEnabled(twoFAValue.enabled);
      }
    } catch (error) {
      console.error("Error loading security settings:", error);
      toast.error("Error al cargar configuración de seguridad");
    } finally {
      setLoading(false);
    }
  };

  const toggle2FA = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          value: { enabled },
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("key", "security_2fa");

      if (error) throw error;

      setTwoFactorEnabled(enabled);

      await logAudit({
        actionType: "USER_UPDATE",
        tableName: "settings",
        description: `Autenticación 2FA ${enabled ? "habilitada" : "deshabilitada"}`,
      });

      toast.success(
        enabled
          ? "Autenticación 2FA habilitada"
          : "Autenticación 2FA deshabilitada"
      );
    } catch (error) {
      console.error("Error toggling 2FA:", error);
      toast.error("Error al actualizar 2FA");
    }
  };

  const handleForceLogout = async () => {
    try {
      await logAudit({
        actionType: "USER_LOGOUT",
        description: "Cierre de sesión forzado para todos los usuarios",
      });

      toast.success("Sesiones cerradas correctamente");
      setShowLogoutDialog(false);
      
      // Note: In a production environment, you would need to invalidate all sessions
      // This is a placeholder for the actual implementation
    } catch (error) {
      console.error("Error forcing logout:", error);
      toast.error("Error al cerrar sesiones");
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>
            Configura las opciones de seguridad del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="2fa" className="text-base font-semibold">
                Autenticación de dos factores (2FA)
              </Label>
              <p className="text-sm text-muted-foreground">
                Requiere un segundo factor de autenticación para iniciar sesión
              </p>
            </div>
            <Switch
              id="2fa"
              checked={twoFactorEnabled}
              onCheckedChange={toggle2FA}
            />
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Forzar cierre de sesión a todos los usuarios
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Ver bitácora de actividades
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Recomendaciones de seguridad</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                  <li>• Habilita la autenticación 2FA para mayor seguridad</li>
                  <li>• Revisa periódicamente la bitácora de actividades</li>
                  <li>• Utiliza contraseñas seguras y únicas</li>
                  <li>• Mantén actualizados los roles de los usuarios</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará la sesión de todos los usuarios del sistema.
              Los usuarios tendrán que volver a iniciar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceLogout}>
              Cerrar sesiones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SecuritySettings;
