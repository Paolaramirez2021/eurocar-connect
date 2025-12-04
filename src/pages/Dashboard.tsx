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

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, loading: profileLoading } = useUserRole(user);

  // Fetch real dashboard stats
  const { data: vehicleStats } = useQuery({
    queryKey: ['dashboard-vehicle-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, estado');
      
      if (error) throw error;
      
      const total = data.length;
      const disponibles = data.filter(v => v.estado === 'disponible').length;
      
      return { total, disponibles };
    },
  });

  const { data: rentalsThisMonth } = useQuery({
    queryKey: ['dashboard-rentals-month'],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const { data, error } = await supabase
        .from('reservations')
        .select('id, vehicle_id')
        .in('estado', ['confirmed', 'pending'])
        .gte('fecha_inicio', startDate.toISOString())
        .lte('fecha_inicio', endDate.toISOString());
      
      if (error) throw error;
      
      // Count unique vehicles
      const uniqueVehicles = new Set(data.map(r => r.vehicle_id));
      return uniqueVehicles.size;
    },
  });

  const { data: monthlyIncome } = useQuery({
    queryKey: ['dashboard-monthly-income'],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const { data, error } = await supabase
        .from('reservations')
        .select('valor_total, price_total, descuento, estado, fecha_inicio')
        .in('estado', ['completed', 'confirmed', 'pending'])
        .gte('fecha_inicio', startDate)
        .lte('fecha_inicio', endDate);
      
      if (error) throw error;
      
      const total = data.reduce((sum, r) => {
        const base = (r.valor_total ?? r.price_total ?? 0) as number;
        const descuento = (r.descuento ?? 0) as number;
        return sum + (base - descuento);
      }, 0);
      
      return total;
    },
  });

  const { data: activeCustomers } = useQuery({
    queryKey: ['dashboard-active-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('customer_id')
        .in('estado', ['confirmed', 'pending'])
        .gte('fecha_fin', new Date().toISOString());
      
      if (error) throw error;
      
      // Count unique customers
      const uniqueCustomers = new Set(data.map(r => r.customer_id).filter(Boolean));
      return uniqueCustomers.size;
    },
  });

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