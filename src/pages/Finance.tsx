import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { ReportsTab } from "@/components/finance/ReportsTab";
import { shouldIncludeInRevenue, REVENUE_STATES, INACTIVE_STATES } from "@/config/states";

export default function Finance() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('placa');
      if (error) throw error;
      return data;
    }
  });

  // Obtener reservas de los últimos 6 meses
  // Solo estados que generan ingresos reales
  const { data: reservations } = useQuery({
    queryKey: ['reservations-finance', selectedVehicleId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      let query = supabase
        .from('reservations')
        .select('*')
        .gte('fecha_inicio', sixMonthsAgo.toISOString())
        // Estados UNIFICADOS que generan ingresos
        .in('estado', [
          'reservado_con_pago',     // Pagado
          'pendiente_contrato',     // Contrato pendiente (ya pagado)
          'confirmado',             // En alquiler activo
          'completada',             // Finalizada
          // Estados legacy (para compatibilidad)
          'completed',
          'confirmed', 
          'pending_with_payment'
        ]);
      
      if (selectedVehicleId !== "all") {
        query = query.eq('vehicle_id', selectedVehicleId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Obtener gastos de mantenimiento de los últimos 6 meses
  const { data: maintenance } = useQuery({
    queryKey: ['maintenance-finance', selectedVehicleId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      let query = supabase
        .from('maintenance')
        .select('*')
        .gte('fecha', sixMonthsAgo.toISOString());
      
      if (selectedVehicleId !== "all") {
        query = query.eq('vehicle_id', selectedVehicleId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Calcular ingresos diarios del mes seleccionado
  const dailyIncomeData = useMemo(() => {
    if (!reservations) return [];

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Calcular ingresos de ese día (reservas activas ese día)
      const dailyIncome = reservations.reduce((sum, reservation) => {
        const resStart = new Date(reservation.fecha_inicio);
        const resEnd = new Date(reservation.fecha_fin);
        
        // Si la reserva está activa ese día
        if (day >= resStart && day <= resEnd) {
          // Calcular tarifa diaria
          const totalDays = differenceInDays(resEnd, resStart) || 1;
          const dailyRate = (reservation.price_total || reservation.valor_total || 0) / totalDays;
          return sum + dailyRate;
        }
        return sum;
      }, 0);

      return {
        date: dayStr,
        day: format(day, 'd', { locale: es }),
        income: Math.round(dailyIncome)
      };
    });
  }, [reservations, selectedMonth]);

  // Calcular datos de los últimos 6 meses
  const last6MonthsData = useMemo(() => {
    if (!reservations || !maintenance) return [];

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Filtrar reservas del mes
      const monthReservations = reservations.filter(r => {
        const resDate = new Date(r.fecha_inicio);
        return (resDate >= monthStart && resDate <= monthEnd) && 
               (r.estado === 'completed' || r.estado === 'confirmed' || r.estado === 'pending');
      });

      // Calcular ingresos brutos del mes
      const monthIngresosBrutos = monthReservations.reduce(
        (sum, r) => sum + (r.valor_total || r.price_total || 0), 
        0
      );

      // Calcular descuentos del mes
      const monthDescuentos = monthReservations.reduce(
        (sum, r) => sum + (r.descuento || 0), 
        0
      );

      // Calcular ingresos netos del mes
      const monthIngresosNetos = monthIngresosBrutos - monthDescuentos;

      // Calcular gastos del mes (mantenimiento)
      const monthExpenses = maintenance
        .filter(m => {
          const mainDate = new Date(m.fecha);
          return mainDate >= monthStart && mainDate <= monthEnd;
        })
        .reduce((sum, m) => sum + Number(m.costo), 0);

      months.push({
        month: format(monthDate, 'MMM yyyy', { locale: es }),
        ingresosBrutos: Math.round(monthIngresosBrutos),
        descuentos: Math.round(monthDescuentos),
        ingresosNetos: Math.round(monthIngresosNetos),
        gastos: Math.round(monthExpenses),
        utilidad: Math.round(monthIngresosNetos - monthExpenses)
      });
    }

    return months;
  }, [reservations, maintenance]);

  // Calcular estadísticas generales
  const stats = useMemo(() => {
    if (!reservations || !maintenance) {
      return { 
        ingresosBrutos: 0, 
        descuentos: 0,
        ingresosNetos: 0,
        gastos: 0, 
        totalNeto: 0 
      };
    }

    const reservacionesValidas = reservations.filter(
      r => r.estado === 'completed' || r.estado === 'confirmed' || r.estado === 'pending'
    );

    const ingresosBrutos = reservacionesValidas.reduce(
      (sum, r) => sum + (r.valor_total || r.price_total || 0), 
      0
    );

    const descuentos = reservacionesValidas.reduce(
      (sum, r) => sum + (r.descuento || 0), 
      0
    );

    const ingresosNetos = ingresosBrutos - descuentos;

    const gastos = maintenance.reduce(
      (sum, m) => sum + Number(m.costo), 
      0
    );

    return {
      ingresosBrutos,
      descuentos,
      ingresosNetos,
      gastos,
      totalNeto: ingresosNetos - gastos
    };
  }, [reservations, maintenance]);

  // Calcular estadísticas del mes actual
  const currentMonthStats = useMemo(() => {
    const monthTotal = dailyIncomeData.reduce((sum, day) => sum + day.income, 0);
    const avgPerDay = monthTotal / dailyIncomeData.length;
    
    return {
      total: monthTotal,
      avgPerDay: avgPerDay,
      daysActive: dailyIncomeData.filter(d => d.income > 0).length
    };
  }, [dailyIncomeData]);

  return (
    <DashboardLayout user={session?.user || null}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard Financiero</h1>
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por vehículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vehículos</SelectItem>
              {vehicles?.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">
              <DollarSign className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Informes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">

        {/* Estadísticas Generales (últimos 6 meses) */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Brutos</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${stats.ingresosBrutos.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sin descuentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Descuentos</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${stats.descuentos.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Promociones aplicadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Netos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${stats.ingresosNetos.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Brutos - Descuentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${stats.gastos.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mantenimiento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Total Neto Card */}
        <Card className="bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">UTILIDAD NETA TOTAL</CardTitle>
            <DollarSign className={`h-6 w-6 ${stats.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${stats.totalNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.totalNeto.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Ingresos Netos (${stats.ingresosNetos.toLocaleString()}) - Gastos (${stats.gastos.toLocaleString()})
            </p>
          </CardContent>
        </Card>

        {/* Gráfica de Últimos 6 Meses */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución Financiera - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last6MonthsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ingresosBrutos" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Ingresos Brutos"
                />
                <Line 
                  type="monotone" 
                  dataKey="descuentos" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name="Descuentos"
                />
                <Line 
                  type="monotone" 
                  dataKey="ingresosNetos" 
                  stroke="#16a34a" 
                  strokeWidth={2}
                  name="Ingresos Netos"
                />
                <Line 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  name="Gastos"
                />
                <Line 
                  type="monotone" 
                  dataKey="utilidad" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name="Utilidad Neta"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ingresos Diarios del Mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ingresos por Día - {format(selectedMonth, 'MMMM yyyy', { locale: es })}</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Select 
                value={format(selectedMonth, 'yyyy-MM')} 
                onValueChange={(value) => setSelectedMonth(new Date(value + '-01'))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => {
                    const month = subMonths(new Date(), i);
                    return (
                      <SelectItem key={i} value={format(month, 'yyyy-MM')}>
                        {format(month, 'MMMM yyyy', { locale: es })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total del Mes</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${currentMonthStats.total.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Promedio por Día</div>
                  <div className="text-2xl font-bold">
                    ${Math.round(currentMonthStats.avgPerDay).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Días con Alquileres</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {currentMonthStats.daysActive}
                  </div>
                </CardContent>
              </Card>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  labelFormatter={(label) => `Día ${label}`}
                />
                <Bar dataKey="income" fill="#16a34a" name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabla de Comparación Mensual */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativa Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {last6MonthsData.map((month, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="font-medium">{month.month}</div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Ing. Brutos</div>
                      <div className="font-semibold text-blue-600">
                        ${month.ingresosBrutos.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Descuentos</div>
                      <div className="font-semibold text-orange-600">
                        ${month.descuentos.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Ing. Netos</div>
                      <div className="font-semibold text-green-600">
                        ${month.ingresosNetos.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Gastos</div>
                      <div className="font-semibold text-red-600">
                        ${month.gastos.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Utilidad</div>
                      <div className={`font-bold ${month.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${month.utilidad.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6 mt-6">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
