import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Filter, Clock, CheckCircle2, XCircle, CalendarDays, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ReservationActions } from "./ReservationActions";
import { ReservationDetailsModal } from "./ReservationDetailsModal";
import { useRealtimeReservations } from "@/hooks/useRealtimeReservations";
import { useReservationExpiration } from "@/hooks/useReservationExpiration";
import { getStateConfig, getTimeUntilExpiration, RESERVATION_STATES, type ReservationStatus } from "@/config/states";

interface Reservation {
  id: string;
  vehicle_id: string;
  cliente_nombre: string;
  cliente_contacto: string;
  cliente_documento: string | null;
  cliente_email: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  payment_status: string;
  payment_date: string | null;
  payment_reference: string | null;
  valor_total: number | null;
  dias_totales: number | null;
  auto_cancel_at: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  refund_status: string | null;
  refund_date: string | null;
  refund_reference: string | null;
  vehicles?: {
    placa: string;
    marca: string;
    modelo: string;
  };
}

export const ReservationsManagementPanel = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Habilitar actualización en tiempo real
  useRealtimeReservations();
  
  // Habilitar expiración automática de reservas sin pago
  useReservationExpiration();

  useEffect(() => {
    loadReservations();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('reservations-management')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservations' },
        () => loadReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterReservations();
  }, [reservations, searchTerm, statusFilter]);

  const loadReservations = async () => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          vehicles:vehicle_id (
            placa,
            marca,
            modelo
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReservations(data || []);
    } catch (error: any) {
      console.error("Error loading reservations:", error);
      toast.error("Error al cargar reservas", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReservations = () => {
    let filtered = [...reservations];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.estado === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.cliente_nombre.toLowerCase().includes(term) ||
        r.cliente_contacto.toLowerCase().includes(term) ||
        r.cliente_documento?.toLowerCase().includes(term) ||
        r.vehicles?.placa.toLowerCase().includes(term)
      );
    }

    setFilteredReservations(filtered);
  };

  const getStatusBadge = (estado: string, paymentStatus: string) => {
    // Usar configuración centralizada
    const config = getStateConfig(estado);
    
    // Caso especial: si tiene pago confirmado pero estado es pending, mostrar como pending_with_payment
    if (paymentStatus === 'paid' && (estado === 'pending' || estado === 'pending_no_payment')) {
      const paidConfig = getStateConfig('pending_with_payment');
      return <Badge className={paidConfig.badgeClass}>{paidConfig.label}</Badge>;
    }
    
    return <Badge className={config.badgeClass}>{config.label}</Badge>;
  };

  const getTimeRemaining = (reservation: { estado: string; payment_status: string; auto_cancel_at: string | null; created_at: string }) => {
    const timeInfo = getTimeUntilExpiration(reservation);
    
    if (!timeInfo) return null;
    
    if (timeInfo.isExpired) {
      return <span className="text-red-600 font-semibold">⏰ Expirado</span>;
    }
    
    return (
      <span className={timeInfo.isUrgent ? "text-red-600 font-semibold" : "text-orange-600 font-medium"}>
        ⏱️ {timeInfo.hours}h {timeInfo.minutes}m
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus: string, paymentDate: string | null) => {
    if (paymentStatus === "paid") {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs">
            Pagado {paymentDate && `(${format(new Date(paymentDate), "dd/MM/yy HH:mm")})`}
          </span>
        </div>
      );
    }
    if (paymentStatus === "refunded") {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <XCircle className="h-4 w-4" />
          <span className="text-xs">Devuelto</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-orange-600">
        <Clock className="h-4 w-4" />
        <span className="text-xs">Pendiente</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Gestión de Reservas
        </CardTitle>
        <CardDescription>
          Visualiza y gestiona todas las reservas con filtros por estado y acciones de pago/cancelación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, documento, contacto o placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending_no_payment">Sin pago (2h)</SelectItem>
                <SelectItem value="pending_with_payment">Con pago</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredReservations.length} de {reservations.length} reservas
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tiempo restante</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron reservas
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{reservation.cliente_nombre}</div>
                        <div className="text-xs text-muted-foreground">{reservation.cliente_contacto}</div>
                        {reservation.cliente_documento && (
                          <div className="text-xs text-muted-foreground">Doc: {reservation.cliente_documento}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{reservation.vehicles?.placa}</div>
                        <div className="text-xs text-muted-foreground">
                          {reservation.vehicles?.marca} {reservation.vehicles?.modelo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>
                          {format(new Date(reservation.fecha_inicio), "dd/MMM/yy", { locale: es })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          hasta {format(new Date(reservation.fecha_fin), "dd/MMM/yy", { locale: es })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({reservation.dias_totales} días)
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(reservation.estado, reservation.payment_status)}
                    </TableCell>
                    <TableCell>
                      {getPaymentBadge(reservation.payment_status, reservation.payment_date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${reservation.valor_total?.toLocaleString('es-CO') || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTimeRemaining(reservation)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ReservationActions
                        reservation={reservation}
                        onUpdate={loadReservations}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setDetailsModalOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ReservationDetailsModal
        reservation={selectedReservation}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </Card>
  );
};
