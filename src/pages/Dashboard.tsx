import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import AuditLogPanel from "@/components/dashboard/AuditLogPanel";
import { Car, Clock, DollarSign, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { logAudit } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboardStats";
import { useDashboardRealtime } from "@/hooks/useDashboardRealtime";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, loading: profileLoading } = useUserRole(user);

  // Habilitar actualización en tiempo real
  useDashboardRealtime();

  // Obtener estadísticas centralizadas
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000,
  });

  const vehicleStats = {
    total: dashboardStats?.vehiculosTotal ?? 0,
    disponibles: dashboardStats?.vehiculosDisponibles ?? 0
  };

  const rentalsThisMonth = dashboardStats?.alquileresActivos ?? 0;
  const monthlyIncome = dashboardStats?.ingresosDelMes ?? 0;
  const activeCustomers = dashboardStats?.clientesActivos ?? 0;

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Vehículos",
      value: vehicleStats?.total.toString() || "0",
      icon: Car,
      emoji: "🚗",
      colorScheme: "primary" as const,
      description: `${vehicleStats?.disponibles || 0} disponibles`,
      trend: "",
    },
    {
      title: "En Alquiler",
      value: rentalsThisMonth?.toString() || "0",
      icon: Clock,
      emoji: "⏰",
      colorScheme: "warning" as const,
      description: "Este mes",
      trend: "",
    },
    {
      title: "Ingresos del Mes",
      value: `$${monthlyIncome?.toLocaleString('es-CO') || "0"}`,
      icon: DollarSign,
      emoji: "💰",
      colorScheme: "success" as const,
      description: "COP",
      trend: "",
    },
    {
      title: "Clientes Activos",
      value: activeCustomers?.toString() || "0",
      icon: Users,
      emoji: "👥",
      colorScheme: "info" as const,
      description: "Con reservas activas",
      trend: "",
    },
  ];

  return (
    <DashboardLayout user={user}>
      <div className="space-y-5 sm:space-y-6 md:space-y-8">
        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Panel Principal</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="text-sm md:text-base text-muted-foreground">
              Bienvenido, {profile?.full_name || user?.email}
            </p>
            {profile?.roles && profile.roles.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {profile.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize text-xs">
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <StatsCards stats={statsData} />

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <AlertsPanel />
          <AuditLogPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;