import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Search, Download, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  estado: string;
  tarifa_dia_iva: number;
}

interface Reservation {
  id: string;
  cliente_nombre: string;
  cliente_documento: string;
  cliente_email: string;
  cliente_telefono: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  valor_total: number;
  estado: string;
  vehicle_id: string;
  vehicles?: {
    placa: string;
    marca: string;
    modelo: string;
  };
}

const GestionReservas = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const [activeTab, setActiveTab] = useState(reservationId ? "active" : "new");

  // Form state
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [diasTotales, setDiasTotales] = useState(0);
  const [tarifaDiaIva, setTarifaDiaIva] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Tables state
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [historicalReservations, setHistoricalReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
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

  useEffect(() => {
    if (user) {
      loadAvailableVehicles();
      loadReservations();
    }
  }, [user]);

  useEffect(() => {
    // Scroll a la reserva resaltada cuando se carga
    if (reservationId && (activeReservations.length > 0 || historicalReservations.length > 0)) {
      setTimeout(() => {
        const element = document.getElementById(`reservation-${reservationId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [reservationId, activeReservations, historicalReservations]);

  useEffect(() => {
    // Calculate dias_totales
    if (fechaInicio && fechaFin) {
      const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDiasTotales(diffDays);
    } else {
      setDiasTotales(0);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    // Calculate valor_total
    setValorTotal(tarifaDiaIva * diasTotales);
  }, [tarifaDiaIva, diasTotales]);

  useEffect(() => {
    // Auto-update tarifa_dia_iva when vehicle is selected
    if (selectedVehicleId) {
      const vehicle = availableVehicles.find((v) => v.id === selectedVehicleId);
      if (vehicle) {
        setTarifaDiaIva(vehicle.tarifa_dia_iva || 0);
      }
    }
  }, [selectedVehicleId, availableVehicles]);

  const loadAvailableVehicles = async () => {
    try {
      // Get vehicles that are disponible OR not in active reservations
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("estado", "disponible");

      if (vehiclesError) throw vehiclesError;
      setAvailableVehicles(vehicles || []);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos disponibles",
        variant: "destructive",
      });
    }
  };

  const loadReservations = async () => {
    try {
      // Load active reservations (pending and confirmed that haven't ended)
      const now = new Date().toISOString();
      const { data: active, error: activeError } = await supabase
        .from("reservations")
        .select("*, vehicles(placa, marca, modelo)")
        .in("estado", ["pending", "confirmed"])
        .gte("fecha_fin", now)
        .order("fecha_inicio", { ascending: true });

      if (activeError) throw activeError;
      setActiveReservations(active || []);

      // Load historical reservations (completed, cancelled, or ended)
      const { data: historical, error: historicalError } = await supabase
        .from("reservations")
        .select("*, vehicles(placa, marca, modelo)")
        .or(`estado.eq.completed,estado.eq.cancelled,and(estado.in.(pending,confirmed),fecha_fin.lt.${now})`)
        .order("fecha_fin", { ascending: false });

      if (historicalError) throw historicalError;
      setHistoricalReservations(historical || []);

      // Auto-finalize expired reservations
      await autoFinalizeExpiredReservations();
    } catch (error) {
      console.error("Error loading reservations:", error);
    }
  };

  const autoFinalizeExpiredReservations = async () => {
    try {
      const now = new Date().toISOString();
      
      // Find expired active reservations
      const { data: expired, error: expiredError } = await supabase
        .from("reservations")
        .select("id, vehicle_id")
        .in("estado", ["pending", "confirmed"])
        .lt("fecha_fin", now);

      if (expiredError) throw expiredError;

      if (expired && expired.length > 0) {
        // Update reservations to completed
        for (const reservation of expired) {
          await supabase
            .from("reservations")
            .update({ estado: "completed" })
            .eq("id", reservation.id);

          // Update vehicle back to disponible
          await supabase
            .from("vehicles")
            .update({ estado: "disponible" })
            .eq("id", reservation.vehicle_id);
        }

        // Reload reservations
        await loadReservations();
      }
    } catch (error) {
      console.error("Error auto-finalizing reservations:", error);
    }
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicleId || !fechaInicio || !fechaFin) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create reservation
      const { data: newReservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          vehicle_id: selectedVehicleId,
          cliente_nombre: clienteNombre,
          cliente_documento: clienteDocumento,
          cliente_email: clienteEmail,
          cliente_telefono: clienteTelefono,
          cliente_contacto: clienteTelefono,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          dias_totales: diasTotales,
          tarifa_dia_iva: tarifaDiaIva,
          valor_total: valorTotal,
          price_total: valorTotal,
          estado: "pending",
          created_by: user?.id,
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // Update vehicle status to en_alquiler
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ estado: "en_alquiler" })
        .eq("id", selectedVehicleId);

      if (vehicleError) throw vehicleError;

      // Log audit
      await logAudit({
        actionType: "RESERVATION_CREATE",
        tableName: "reservations",
        recordId: newReservation.id,
        newData: newReservation,
        description: "Nueva reserva creada",
      });

      toast({
        title: "¡Reserva creada exitosamente!",
        description: `Reserva para ${clienteNombre} ha sido registrada.`,
      });

      // Reset form
      setSelectedVehicleId("");
      setClienteNombre("");
      setClienteDocumento("");
      setClienteEmail("");
      setClienteTelefono("");
      setFechaInicio(undefined);
      setFechaFin(undefined);

      // Reload data
      await loadAvailableVehicles();
      await loadReservations();
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeReservation = async (reservationId: string, vehicleId: string) => {
    try {
      // Update reservation to completed
      const { error: reservationError } = await supabase
        .from("reservations")
        .update({ estado: "completed" })
        .eq("id", reservationId);

      if (reservationError) throw reservationError;

      // Update vehicle back to disponible
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ estado: "disponible" })
        .eq("id", vehicleId);

      if (vehicleError) throw vehicleError;

      // Log audit
      await logAudit({
        actionType: "RESERVATION_FINALIZE",
        tableName: "reservations",
        recordId: reservationId,
        description: "Reserva finalizada",
      });

      toast({
        title: "Reserva finalizada",
        description: "El vehículo ahora está disponible nuevamente",
      });

      // Reload data
      await loadAvailableVehicles();
      await loadReservations();
    } catch (error) {
      console.error("Error finalizing reservation:", error);
      toast({
        title: "Error",
        description: "No se pudo finalizar la reserva",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "disponible":
        return <Badge className="bg-green-500">Disponible</Badge>;
      case "en_alquiler":
        return <Badge className="bg-red-500">En Alquiler</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pendiente</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-500">Confirmada</Badge>;
      case "completed":
        return <Badge variant="secondary">Completada</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  const exportToCSV = () => {
    const csvData = historicalReservations.map((r) => ({
      Cliente: r.cliente_nombre,
      Documento: r.cliente_documento,
      Email: r.cliente_email,
      Teléfono: r.cliente_telefono,
      Vehículo: `${r.vehicles?.marca} ${r.vehicles?.modelo} - ${r.vehicles?.placa}`,
      FechaInicio: format(new Date(r.fecha_inicio), "dd/MM/yyyy"),
      FechaFin: format(new Date(r.fecha_fin), "dd/MM/yyyy"),
      Días: r.dias_totales,
      ValorTotal: r.valor_total,
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-reservas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const filteredHistoricalReservations = historicalReservations.filter((r) =>
    r.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vehicles?.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vehicles?.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Gestión de Reservas</h1>
              <p className="text-muted-foreground">
                Administra reservas de vehículos de manera eficiente
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </TabsTrigger>
            <TabsTrigger value="active">
              Reservas Activas ({activeReservations.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Nueva Reserva Form */}
          <TabsContent value="new" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Formulario de Nueva Reserva</CardTitle>
                <CardDescription>
                  Completa la información del cliente y selecciona el vehículo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReservation} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cliente_nombre">Nombre del Cliente *</Label>
                      <Input
                        id="cliente_nombre"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cliente_documento">Documento *</Label>
                      <Input
                        id="cliente_documento"
                        value={clienteDocumento}
                        onChange={(e) => setClienteDocumento(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cliente_email">Email</Label>
                      <Input
                        id="cliente_email"
                        type="email"
                        value={clienteEmail}
                        onChange={(e) => setClienteEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cliente_telefono">Teléfono *</Label>
                      <Input
                        id="cliente_telefono"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehiculo">Vehículo *</Label>
                      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un vehículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.marca} {vehicle.modelo} - {vehicle.placa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha Inicio *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !fechaInicio && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fechaInicio ? format(fechaInicio, "PPP") : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={fechaInicio}
                            onSelect={setFechaInicio}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha Fin *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !fechaFin && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fechaFin ? format(fechaFin, "PPP") : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={fechaFin}
                            onSelect={setFechaFin}
                            initialFocus
                            className="pointer-events-auto"
                            disabled={(date) => fechaInicio ? date < fechaInicio : false}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Días Totales</Label>
                      <Input value={diasTotales} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>Tarifa por Día (IVA Inc.)</Label>
                      <Input
                        value={tarifaDiaIva.toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                        })}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Total</Label>
                      <Input
                        value={valorTotal.toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                        })}
                        disabled
                        className="font-bold text-lg"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Creando..." : "Crear Reserva"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Reservations Table */}
          <TabsContent value="active" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Reservas Activas</CardTitle>
                <CardDescription>
                  Gestiona las reservas en curso
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeReservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay reservas activas en este momento
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeReservations.map((reservation) => (
                        <TableRow 
                          key={reservation.id}
                          id={`reservation-${reservation.id}`}
                          className={reservationId === reservation.id ? "bg-primary/10 border-l-4 border-l-primary" : ""}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{reservation.cliente_nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                {reservation.cliente_telefono}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reservation.vehicles?.marca} {reservation.vehicles?.modelo}
                            <br />
                            <span className="text-sm text-muted-foreground">
                              {reservation.vehicles?.placa}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(reservation.fecha_inicio), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(reservation.fecha_fin), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {(reservation.valor_total || 0).toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(reservation.estado)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleFinalizeReservation(reservation.id, reservation.vehicle_id)
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Finalizar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Reservations */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Historial de Reservas</CardTitle>
                    <CardDescription>
                      Consulta reservas finalizadas
                    </CardDescription>
                  </div>
                  <Button onClick={exportToCSV} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente o vehículo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {filteredHistoricalReservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No se encontraron reservas
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Fechas</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistoricalReservations.map((reservation) => (
                        <TableRow 
                          key={reservation.id}
                          id={`reservation-${reservation.id}`}
                          className={reservationId === reservation.id ? "bg-primary/10 border-l-4 border-l-primary" : ""}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{reservation.cliente_nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                {reservation.cliente_email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{reservation.cliente_documento}</TableCell>
                          <TableCell>
                            {reservation.vehicles?.marca} {reservation.vehicles?.modelo}
                            <br />
                            <span className="text-sm text-muted-foreground">
                              {reservation.vehicles?.placa}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Inicio: {format(new Date(reservation.fecha_inicio), "dd/MM/yyyy")}</p>
                              <p>Fin: {format(new Date(reservation.fecha_fin), "dd/MM/yyyy")}</p>
                            </div>
                          </TableCell>
                          <TableCell>{reservation.dias_totales}</TableCell>
                          <TableCell>
                            {(reservation.valor_total || 0).toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(reservation.estado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GestionReservas;