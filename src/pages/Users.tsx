import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { UserForm } from "@/components/users/UserForm";
import { TimeClockCard } from "@/components/users/TimeClockCard";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Clock, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Users = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { profile, hasAnyRole } = useUserRole(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
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

  if (loading) {
    return null;
  }

  const canManageUsers = hasAnyRole(["socio_principal", "administrador"]);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UsersIcon className="h-8 w-8" />
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-2">
              Administra usuarios y controla asistencia
            </p>
          </div>
          {profile?.roles && profile.roles.length > 0 && (
            <div className="flex gap-2">
              {profile.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Tabs defaultValue="timeclock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeclock" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Control de Asistencia
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Gestión de Usuarios
              </TabsTrigger>
            )}
            {canManageUsers && (
              <TabsTrigger value="geofence" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Zonas Geográficas
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="timeclock" className="space-y-4">
            {user && <TimeClockCard userId={user.id} />}
            
            <Card>
              <CardHeader>
                <CardTitle>Mi Información</CardTitle>
                <CardDescription>
                  Datos de tu perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre completo</p>
                      <p className="text-base">
                        {profile.first_name && profile.last_name
                          ? `${profile.first_name} ${profile.last_name}`
                          : profile.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base">{profile.email}</p>
                    </div>
                    {profile.cedula && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cédula</p>
                        <p className="text-base">{profile.cedula}</p>
                      </div>
                    )}
                    {profile.phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                        <p className="text-base">{profile.phone}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageUsers && (
            <TabsContent value="manage" className="space-y-4">
              <Alert>
                <AlertDescription>
                  La gestión completa de usuarios estará disponible próximamente. 
                  Por ahora, los usuarios se crean mediante el registro.
                </AlertDescription>
              </Alert>
              {profile && (
                <UserForm
                  initialData={{
                    id: user?.id,
                    first_name: profile.first_name || "",
                    last_name: profile.last_name || "",
                    cedula: profile.cedula || "",
                    email: profile.email,
                    phone: profile.phone || "",
                    role: (profile.roles && profile.roles[0]) as any || "operativo",
                  }}
                />
              )}
            </TabsContent>
          )}

          {canManageUsers && (
            <TabsContent value="geofence" className="space-y-4">
              <Alert>
                <AlertDescription>
                  La configuración de zonas geográficas estará disponible próximamente.
                  Por ahora, todas las ubicaciones son válidas.
                </AlertDescription>
              </Alert>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Users;
