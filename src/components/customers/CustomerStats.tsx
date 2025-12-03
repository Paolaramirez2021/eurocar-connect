import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Calendar } from "lucide-react";

interface Stats {
  totalClientes: number;
  clientesActivos: number;
  promedioReservas: number;
  montoTotal: number;
}

export const CustomerStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0,
    clientesActivos: 0,
    promedioReservas: 0,
    montoTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("estado, total_reservas, monto_total");

      if (error) throw error;

      const totalClientes = data.length;
      const clientesActivos = data.filter((c) => c.estado === "activo").length;
      const totalReservas = data.reduce((sum, c) => sum + (c.total_reservas || 0), 0);
      const promedioReservas = totalClientes > 0 ? totalReservas / totalClientes : 0;
      const montoTotal = data.reduce((sum, c) => sum + (Number(c.monto_total) || 0), 0);

      setStats({
        totalClientes,
        clientesActivos,
        promedioReservas,
        montoTotal,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Clientes",
      value: stats.totalClientes,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Clientes Activos",
      value: stats.clientesActivos,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Promedio Reservas",
      value: stats.promedioReservas.toFixed(1),
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Valor Total Generado",
      value: `$${stats.montoTotal.toLocaleString("es-CO")}`,
      icon: DollarSign,
      color: "text-orange-600",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="h-16 animate-pulse bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
            </div>
            <stat.icon className={`h-10 w-10 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </div>
  );
};
