import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Filter, Clock, CheckCircle2, XCircle, CalendarDays, Info, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ReservationActions } from "./ReservationActions";
import { ReservationDetailsModal } from "./ReservationDetailsModal";
import { useRealtimeReservations } from "@/hooks/useRealtimeReservations";
import { useReservationExpiration } from "@/hooks/useReservationExpiration";
import { getStateConfig, getTimeUntilExpiration, normalizeState } from "@/config/states";

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

  // Edit reservation state
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editVehicleId, setEditVehicleId] = useState("");
  const [editClienteNombre, setEditClienteNombre] = useState("");
  const [editClienteDocumento, setEditClienteDocumento] = useState("");
  const [editClienteEmail, setEditClienteEmail] = useState("");
  const [editClienteTelefono, setEditClienteTelefono] = useState("");
  const [editFechaInicio, setEditFechaInicio] = useState("");
  const [editFechaFin, setEditFechaFin] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);

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

  // Load vehicles for edit dropdown
  useEffect(() => {
    supabase.from("vehicles").select("id, placa, marca, modelo, estado").order("placa")
      .then(({ data }) => setAllVehicles(data || []));
  }, []);

  const openEditReservation = (res: Reservation) => {
    setEditingReservation(res);
    setEditVehicleId(res.vehicle_id);
    setEditClienteNombre(res.cliente_nombre);
    setEditClienteDocumento(res.cliente_documento || "");
    setEditClienteEmail(res.cliente_email || "");
    setEditClienteTelefono(res.cliente_contacto || "");
    setEditFechaInicio(String(res.fecha_inicio).substring(0, 10));
    setEditFechaFin(String(res.fecha_fin).substring(0, 10));
  };

  const handleSaveEdit = async () => {
    if (!editingReservation) return;
    setEditSaving(true);
    try {
      const oldVehicleId = editingReservation.vehicle_id;
      const vehicleChanged = oldVehicleId !== editVehicleId;

      const { error } = await supabase.from("reservations").update({
        vehicle_id: editVehicleId,
        cliente_nombre: editClienteNombre,
        cliente_documento: editClienteDocumento,
        cliente_email: editClienteEmail,
        cliente_contacto: editClienteTelefono,
        fecha_inicio: editFechaInicio,
        fecha_fin: editFechaFin,
      }).eq("id", editingReservation.id);

      if (error) throw error;

      if (vehicleChanged) {
        await supabase.from("vehicles").update({ estado: "disponible" }).eq("id", oldVehicleId);
        await supabase.from("vehicles").update({ estado: "reservado" }).eq("id", editVehicleId);
      }

      toast.success("Reserva actualizada correctamente");
      setEditingReservation(null);
      loadReservations();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al actualizar: " + (error.message || ""));
    } finally {
      setEditSaving(false);
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

  const getStatusBadge = (reservation: Reservation) => {
    // Usar estado + payment_status para determinar la configuración
    const config = getStateConfig(reservation.estado, reservation.payment_status);
    const normalized = normalizeState(reservation.estado);
    
    // Para canceladas, mostrar etiqueta específica basada en payment_status
    if (normalized === 'cancelled') {
      const label = reservation.payment_status === 'refunded' 
        ? 'Cancelada (con devolución)' 
        : reservation.payment_status === 'paid'
          ? 'Cancelada (sin devolución)'
          : 'Cancelada';
      return <Badge className={config.badgeClass}>{label}</Badge>;
    }
    
    return <Badge className={config.badgeClass}>{config.label}</Badge>;
  };

  const getTimeRemaining = (reservation: { estado: string; payment_status?: string; auto_cancel_at: string | null; created_at: string }) => {
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
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="sin_pago">Sin pago (2h)</SelectItem>
                <SelectItem value="con_pago">Con pago</SelectItem>
                <SelectItem value="contrato_generado">Contrato generado</SelectItem>
                <SelectItem value="confirmado">Confirmadas</SelectItem>
                <SelectItem value="completada">Completadas</SelectItem>
                <SelectItem value="expirada">Expiradas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
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
                      {getStatusBadge(reservation)}
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditReservation(reservation)}
                          className="h-8 w-8 p-0"
                          title="Editar reserva"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setDetailsModalOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="Ver detalles"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Modal Editar Reserva */}
      {editingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setEditingReservation(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold">Editar Reserva</h3>
              <button onClick={() => setEditingReservation(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Vehículo</label>
                <select value={editVehicleId} onChange={(e) => setEditVehicleId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
                  {allVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo} ({v.estado})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Nombre Cliente</label>
                  <input type="text" value={editClienteNombre} onChange={(e) => setEditClienteNombre(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Documento</label>
                  <input type="text" value={editClienteDocumento} onChange={(e) => setEditClienteDocumento(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Email</label>
                  <input type="email" value={editClienteEmail} onChange={(e) => setEditClienteEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Teléfono</label>
                  <input type="text" value={editClienteTelefono} onChange={(e) => setEditClienteTelefono(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Fecha Inicio</label>
                  <input type="date" value={editFechaInicio} onChange={(e) => setEditFechaInicio(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Fecha Fin</label>
                  <input type="date" value={editFechaFin} onChange={(e) => setEditFechaFin(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              {editVehicleId !== editingReservation.vehicle_id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                  <strong>Cambio de vehículo:</strong> {editingReservation.vehicles?.placa} será liberado y el nuevo será reservado automáticamente.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button type="button" onClick={() => setEditingReservation(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleSaveEdit} disabled={editSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{editSaving ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
