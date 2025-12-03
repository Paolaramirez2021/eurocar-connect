import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Bell, Plug, Users, Shield, Calendar, Car, CreditCard, FileText, Database } from "lucide-react";
import GeneralSettings from "@/components/settings/GeneralSettings";
import { ReservationsSettings } from "@/components/settings/ReservationsSettings";
import { PaymentsSettings } from "@/components/settings/PaymentsSettings";
import { ContractsSettings } from "@/components/settings/ContractsSettings";
import { VehiclesSettings } from "@/components/settings/VehiclesSettings";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";
import IntegrationsSettings from "@/components/settings/IntegrationsSettings";
import UsersRolesSettings from "@/components/settings/UsersRolesSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      
      // Si no hay usuario, redirigir a auth
      if (!user) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <SettingsIcon className="h-8 w-8 text-primary" />
              Configuración
            </h1>
            <p className="text-muted-foreground mt-1">
              Administra las opciones globales del sistema
            </p>
          </div>
          <Link to="/admin/export">
            <Button variant="outline" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Exportar BD
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-10 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contratos</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Vehículos</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Integraciones</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="reservations" className="mt-6">
            <ReservationsSettings />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentsSettings />
          </TabsContent>

          <TabsContent value="contracts" className="mt-6">
            <ContractsSettings />
          </TabsContent>

          <TabsContent value="vehicles" className="mt-6">
            <VehiclesSettings />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarSettings />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationsSettings />
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
            <IntegrationsSettings />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersRolesSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
