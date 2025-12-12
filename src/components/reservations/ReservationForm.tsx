import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar as CalendarIcon, AlertCircle, User, CreditCard, Briefcase, Users, FileText, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  estado: string;
  tarifa_dia_iva: number | null;
}

interface Customer {
  id?: string;
  primer_apellido: string;
  segundo_apellido: string;
  nombres: string;
  cedula_pasaporte: string;
  ciudad: string;
  fecha_nacimiento: Date | undefined;
  estado_civil: string;
  licencia_numero: string;
  licencia_ciudad_expedicion: string;
  licencia_fecha_vencimiento: Date | undefined;
  direccion_residencia: string;
  pais: string;
  telefono: string;
  celular: string;
  email: string;
  ocupacion: string;
  empresa: string;
  direccion_oficina: string;
  banco: string;
  numero_tarjeta: string;
  fecha_vencimiento_tarjeta: string;
  cvv_tarjeta: string;
  referencia_personal_nombre: string;
  referencia_personal_telefono: string;
  referencia_comercial_nombre: string;
  referencia_comercial_telefono: string;
  referencia_familiar_nombre: string;
  referencia_familiar_telefono: string;
  alerta_cliente?: string;
}

export const ReservationForm = () => {
  const queryClient = useQueryClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [priceTotal, setPriceTotal] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [descuentoValor, setDescuentoValor] = useState("");
  const [source, setSource] = useState<string>("web");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [diasAlquiler, setDiasAlquiler] = useState<number>(0);
  const [tarifaDiaria, setTarifaDiaria] = useState<number>(0); // Tarifa SIN IVA
  const [subtotal, setSubtotal] = useState<number>(0); // Días × Tarifa (sin IVA)
  const [iva, setIva] = useState<number>(0); // 19% del subtotal
  const [totalReserva, setTotalReserva] = useState<number>(0); // Subtotal + IVA
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [precioFinal, setPrecioFinal] = useState<number>(0);
  const [showBlockedCustomerDialog, setShowBlockedCustomerDialog] = useState(false);
  const [blockedCustomerName, setBlockedCustomerName] = useState("");
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [customer, setCustomer] = useState<Customer>({
    primer_apellido: "",
    segundo_apellido: "",
    nombres: "",
    cedula_pasaporte: "",
    ciudad: "",
    fecha_nacimiento: undefined,
    estado_civil: "",
    licencia_numero: "",
    licencia_ciudad_expedicion: "",
    licencia_fecha_vencimiento: undefined,
    direccion_residencia: "",
    pais: "Colombia",
    telefono: "",
    celular: "",
    email: "",
    ocupacion: "",
    empresa: "",
    direccion_oficina: "",
    banco: "",
    numero_tarjeta: "",
    fecha_vencimiento_tarjeta: "",
    cvv_tarjeta: "",
    referencia_personal_nombre: "",
    referencia_personal_telefono: "",
    referencia_comercial_nombre: "",
    referencia_comercial_telefono: "",
    referencia_familiar_nombre: "",
    referencia_familiar_telefono: "",
  });

  const { isAdmin } = useUserRole(currentUser);

  useEffect(() => {
    loadVehicles();
    loadUser();
    loadCustomers();
  }, []);

  // Cargar todos los clientes al inicio
  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("nombres");

      if (error) throw error;
      
      console.log('[Clientes] Cargados:', data?.length || 0);
      setAllCustomers(data || []);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  useEffect(() => {
    if (selectedVehicle && fechaInicio && fechaFin) {
      checkAvailability();
      calculatePrice();
    }
  }, [selectedVehicle, fechaInicio, fechaFin]);

  useEffect(() => {
    calculatePrice();
  }, [descuentoPorcentaje, descuentoValor, precioBase]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("placa");

    if (error) {
      console.error("Error loading vehicles:", error);
      return;
    }
    setVehicles(data || []);
  };

  const calculatePrice = () => {
    if (!selectedVehicle || !fechaInicio || !fechaFin) {
      setDiasAlquiler(0);
      setTarifaDiaria(0);
      setSubtotal(0);
      setIva(0);
      setTotalReserva(0);
      setPrecioBase(0);
      setPrecioFinal(0);
      setPriceTotal("");
      return;
    }

    // Validación: fecha fin debe ser mayor o igual a fecha inicio
    if (fechaFin < fechaInicio) {
      toast.error("La fecha de fin debe ser mayor o igual a la fecha de inicio");
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle || !vehicle.tarifa_dia_iva) {
      setDiasAlquiler(0);
      setTarifaDiaria(0);
      setSubtotal(0);
      setIva(0);
      setTotalReserva(0);
      return;
    }

    // ✅ CÁLCULO DE DÍAS: El día de devolución NO se cobra
    // Del 3 al 22 = 19 días de alquiler (el 22 devuelves el vehículo)
    const days = differenceInCalendarDays(fechaFin, fechaInicio);
    setDiasAlquiler(days);

    console.log('[Cálculo Reserva]', {
      fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
      fechaFin: format(fechaFin, 'yyyy-MM-dd'),
      diasACobrar: days,
      nota: 'El día de devolución no se cobra'
    });

    // ✅ CORRECCIÓN 2: Obtener tarifa SIN IVA
    // La BD tiene tarifa_dia_iva que YA es sin IVA
    const tarifaSinIva = vehicle.tarifa_dia_iva;
    setTarifaDiaria(tarifaSinIva);

    // ✅ CORRECCIÓN 3: Calcular subtotal (días × tarifa sin IVA)
    const subtotalCalculado = tarifaSinIva * days;
    setSubtotal(subtotalCalculado);

    // ✅ CORRECCIÓN 4: Calcular IVA (19% del subtotal)
    const ivaCalculado = Math.round(subtotalCalculado * 0.19);
    setIva(ivaCalculado);

    // ✅ CORRECCIÓN 5: Calcular total (subtotal + IVA)
    const totalCalculado = subtotalCalculado + ivaCalculado;
    setTotalReserva(totalCalculado);

    // Mantener compatibilidad con código existente
    setPrecioBase(totalCalculado);

    // Aplicar descuentos si existen
    let descuento = 0;
    if (descuentoValor) {
      descuento = parseFloat(descuentoValor);
    } else if (descuentoPorcentaje) {
      descuento = totalCalculado * (parseFloat(descuentoPorcentaje) / 100);
    }

    // Precio final después de descuento
    const final = Math.max(0, totalCalculado - descuento);
    setPrecioFinal(final);
    setPriceTotal(final.toString());

    console.log('[Desglose Financiero]', {
      dias: days,
      tarifaDiaria: tarifaSinIva,
      subtotal: subtotalCalculado,
      iva19: ivaCalculado,
      totalSinDescuento: totalCalculado,
      descuento: descuento,
      totalFinal: final
    });
  };

  const checkAvailability = async () => {
    if (!selectedVehicle || !fechaInicio || !fechaFin) return;

    try {
      const { data, error } = await supabase.rpc("check_reservation_availability", {
        p_vehicle_id: selectedVehicle,
        p_fecha_inicio: fechaInicio.toISOString(),
        p_fecha_fin: fechaFin.toISOString(),
      });

      if (error) throw error;
      setIsAvailable(data);
    } catch (error) {
      console.error("Error checking availability:", error);
      toast.error("Error al verificar disponibilidad");
    }
  };

  const createSecurityAlert = async (customerData: any, vehicleId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("alerts").insert({
        tipo: "security_attempt",
        mensaje: `Cliente bloqueado intentó hacer reserva: ${customerData.nombres} ${customerData.primer_apellido} (${customerData.cedula_pasaporte})`,
        recipients_roles: ["administrador", "socio_principal"],
        priority: "high",
        meta: {
          customer_id: customerData.id,
          customer_name: `${customerData.nombres} ${customerData.primer_apellido}`,
          cedula: customerData.cedula_pasaporte,
          celular: customerData.celular,
          email: customerData.email,
          vehicle_id: vehicleId,
          attempted_at: new Date().toISOString(),
          attempted_by_user: user?.id,
          source: "web_form"
        }
      });

      await logAudit({
        actionType: "SECURITY_ALERT_CREATED",
        tableName: "alerts",
        description: `Intento de reserva bloqueado - Cliente: ${customerData.nombres} ${customerData.primer_apellido}`
      });
    } catch (error) {
      console.error("Error creating security alert:", error);
    }
  };

  const searchCustomerByCedula = async () => {
    if (!customer.cedula_pasaporte) {
      toast.error("Ingrese la cédula o pasaporte para buscar");
      return;
    }

    setSearchingCustomer(true);
    try {
      // Normalize search value: remove spaces, trim, lowercase
      const searchValue = customer.cedula_pasaporte
        .trim()
        .replace(/\s+/g, '') // Remove all spaces
        .toLowerCase();
      
      if (!searchValue) {
        toast.info("Ingrese un número de cédula o pasaporte");
        return;
      }
      
      console.log('[Búsqueda Cliente] Valor de búsqueda normalizado:', searchValue);
      
      // Get all customers and search in frontend for better matching
      const { data: allCustomers, error } = await supabase
        .from("customers")
        .select("*");

      if (error) {
        console.error('[Búsqueda Cliente] Error:', error);
        throw error;
      }

      console.log('[Búsqueda Cliente] Total clientes en DB:', allCustomers?.length || 0);

      // Search with normalization (remove spaces, case insensitive)
      const data = allCustomers?.filter(c => {
        const normalizedCedula = c.cedula_pasaporte
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase();
        return normalizedCedula === searchValue;
      });

      console.log('[Búsqueda Cliente] Resultados encontrados:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[Búsqueda Cliente] Cliente encontrado:', {
          nombre: data[0].nombres,
          cedula: data[0].cedula_pasaporte
        });
      }

      if (data && data.length > 0) {
        const foundCustomer = data[0];
        
        // Check if customer has negative alert
        if (foundCustomer.alerta_cliente === "negativo") {
          setBlockedCustomerName(`${foundCustomer.nombres} ${foundCustomer.primer_apellido}`);
          setShowBlockedCustomerDialog(true);
          
          // Create security alert for admin
          await createSecurityAlert(foundCustomer, selectedVehicle);
          
          // Reset customer form
          setCustomer({
            primer_apellido: "",
            segundo_apellido: "",
            nombres: "",
            cedula_pasaporte: "",
            ciudad: "",
            fecha_nacimiento: undefined,
            estado_civil: "",
            licencia_numero: "",
            licencia_ciudad_expedicion: "",
            licencia_fecha_vencimiento: undefined,
            direccion_residencia: "",
            pais: "Colombia",
            telefono: "",
            celular: "",
            email: "",
            ocupacion: "",
            empresa: "",
            direccion_oficina: "",
            banco: "",
            numero_tarjeta: "",
            referencia_personal_nombre: "",
            referencia_personal_telefono: "",
            referencia_comercial_nombre: "",
            referencia_comercial_telefono: "",
            referencia_familiar_nombre: "",
            referencia_familiar_telefono: "",
          });
          return;
        }
        
        setCustomer({
          ...foundCustomer,
          fecha_nacimiento: foundCustomer.fecha_nacimiento ? new Date(foundCustomer.fecha_nacimiento) : undefined,
          licencia_fecha_vencimiento: foundCustomer.licencia_fecha_vencimiento ? new Date(foundCustomer.licencia_fecha_vencimiento) : undefined,
        });
        toast.success(`Cliente encontrado: ${foundCustomer.nombres} ${foundCustomer.primer_apellido}`);
      } else {
        console.log('[Búsqueda Cliente] No se encontraron resultados para:', searchValue);
        toast.info(`Cliente no encontrado con cédula/pasaporte: "${searchValue}". Complete los datos para crear un nuevo cliente.`);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      toast.error("Error al buscar cliente");
    } finally {
      setSearchingCustomer(false);
    }
  };

  const updateCustomer = (field: keyof Customer, value: any) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  // Búsqueda en tiempo real mientras escribe
  const searchCustomersRealtime = useCallback((searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setFilteredCustomers([]);
      setShowSuggestions(false);
      return;
    }

    const normalized = searchTerm.trim().replace(/\s+/g, '').toLowerCase();
    
    const matches = allCustomers.filter(c => {
      const normalizedCedula = c.cedula_pasaporte?.trim().replace(/\s+/g, '').toLowerCase() || '';
      const normalizedNombre = `${c.nombres} ${c.primer_apellido}`.toLowerCase();
      
      return normalizedCedula.includes(normalized) || normalizedNombre.includes(searchTerm.toLowerCase());
    }).slice(0, 5); // Mostrar max 5 sugerencias

    console.log('[Búsqueda Real Time] Encontrados:', matches.length);
    setFilteredCustomers(matches);
    setShowSuggestions(matches.length > 0);
  }, [allCustomers]);

  // Manejar cambio en el campo de cédula con búsqueda en tiempo real
  const handleCedulaChange = (value: string) => {
    updateCustomer("cedula_pasaporte", value);
    searchCustomersRealtime(value);
  };

  // Seleccionar cliente de las sugerencias
  const selectCustomer = (selectedCustomer: any) => {
    console.log('[Cliente Seleccionado]', selectedCustomer);
    
    // Check if customer has negative alert
    if (selectedCustomer.alerta_cliente === "negativo") {
      setBlockedCustomerName(`${selectedCustomer.nombres} ${selectedCustomer.primer_apellido}`);
      setShowBlockedCustomerDialog(true);
      createSecurityAlert(selectedCustomer, selectedVehicle);
      
      // Reset
      setCustomer({
        primer_apellido: "",
        segundo_apellido: "",
        nombres: "",
        cedula_pasaporte: "",
        ciudad: "",
        fecha_nacimiento: undefined,
        estado_civil: "",
        licencia_numero: "",
        licencia_ciudad_expedicion: "",
        licencia_fecha_vencimiento: undefined,
        direccion_residencia: "",
        pais: "Colombia",
        telefono: "",
        celular: "",
        email: "",
        ocupacion: "",
        empresa: "",
        direccion_oficina: "",
        banco: "",
        numero_tarjeta: "",
        referencia_personal_nombre: "",
        referencia_personal_telefono: "",
        referencia_comercial_nombre: "",
        referencia_comercial_telefono: "",
        referencia_familiar_nombre: "",
        referencia_familiar_telefono: "",
      });
      setShowSuggestions(false);
      return;
    }
    
    // Cargar datos del cliente seleccionado
    setCustomer({
      ...selectedCustomer,
      fecha_nacimiento: selectedCustomer.fecha_nacimiento ? new Date(selectedCustomer.fecha_nacimiento) : undefined,
      licencia_fecha_vencimiento: selectedCustomer.licencia_fecha_vencimiento ? new Date(selectedCustomer.licencia_fecha_vencimiento) : undefined,
    });
    
    setShowSuggestions(false);
    toast.success(`Cliente cargado: ${selectedCustomer.nombres} ${selectedCustomer.primer_apellido}`);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!selectedVehicle || !fechaInicio || !fechaFin) {
      toast.error("Complete los campos obligatorios de la reserva");
      return;
    }

    if (!customer.nombres || !customer.primer_apellido || !customer.cedula_pasaporte || !customer.celular) {
      toast.error("Complete los campos obligatorios del cliente (Nombres, Primer Apellido, Cédula, Celular)");
      return;
    }

    // Check if customer has negative alert before submitting
    if (customer.alerta_cliente === "negativo") {
      setBlockedCustomerName(`${customer.nombres} ${customer.primer_apellido}`);
      setShowBlockedCustomerDialog(true);
      
      // Create security alert for admin
      await createSecurityAlert(customer, selectedVehicle);
      
      return;
    }

    if (fechaFin <= fechaInicio) {
      toast.error("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    if (!isAvailable) {
      toast.error("El vehículo no está disponible en estas fechas");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Create or update customer
      let customerId = customer.id;
      
      const customerData = {
        ...customer,
        fecha_nacimiento: customer.fecha_nacimiento ? format(customer.fecha_nacimiento, 'yyyy-MM-dd') : null,
        licencia_fecha_vencimiento: customer.licencia_fecha_vencimiento ? format(customer.licencia_fecha_vencimiento, 'yyyy-MM-dd') : null,
        created_by: user.id,
      };

      delete customerData.id;

      if (customerId) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", customerId);

        if (updateError) throw updateError;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert(customerData)
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Calculate discount values
      let descuentoFinal = 0;
      let descuentoPorcFinal = 0;
      if (descuentoValor) {
        descuentoFinal = parseFloat(descuentoValor);
      } else if (descuentoPorcentaje) {
        descuentoPorcFinal = parseFloat(descuentoPorcentaje);
        descuentoFinal = totalReserva * (descuentoPorcFinal / 100);
      }

      // ✅ CORRECCIÓN 6: Guardar valores correctos en BD
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          vehicle_id: selectedVehicle,
          customer_id: customerId,
          cliente_nombre: `${customer.nombres} ${customer.primer_apellido} ${customer.segundo_apellido}`.trim(),
          cliente_contacto: customer.celular,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: "pending",
          // Valores fiscales correctos
          dias_totales: diasAlquiler, // Días reales (incluye día inicio)
          tarifa_diaria: tarifaDiaria, // Tarifa SIN IVA
          subtotal: subtotal, // Días × Tarifa (sin IVA)
          iva: iva, // 19% del subtotal
          valor_total: totalReserva, // Subtotal + IVA (antes de descuento)
          price_total: precioFinal, // Total después de descuento
          descuento: descuentoFinal,
          descuento_porcentaje: descuentoPorcFinal,
          // Mantener compatibilidad
          tarifa_dia_iva: vehicles.find(v => v.id === selectedVehicle)?.tarifa_dia_iva,
          created_by: user.id,
          source,
          notas,
        })
        .select()
        .single();

      console.log('[Reserva Guardada]', {
        id: reservation?.id,
        dias: diasAlquiler,
        tarifaDiaria,
        subtotal,
        iva,
        valorTotal: totalReserva,
        descuento: descuentoFinal,
        precioFinal
      });

      if (reservationError) throw reservationError;

      await logAudit({
        actionType: "RESERVATION_CREATE",
        tableName: "reservations",
        recordId: reservation.id,
        newData: { 
          vehicle_id: selectedVehicle,
          customer_id: customerId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        },
        description: `Reservación creada para ${customer.nombres} ${customer.primer_apellido}`
      });

      // ✅ INVALIDAR QUERIES INMEDIATAMENTE para refresh automático
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-data'] });

      toast.success("Reservación creada exitosamente", {
        description: `Reserva para ${customer.nombres} ${customer.primer_apellido}. Los datos se actualizarán automáticamente.`,
      });
      
      // Reset form
      setSelectedVehicle("");
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setPriceTotal("");
      setDescuentoPorcentaje("");
      setDescuentoValor("");
      setSource("web");
      setNotas("");
      setDiasAlquiler(0);
      setPrecioBase(0);
      setPrecioFinal(0);
      setCustomer({
        primer_apellido: "",
        segundo_apellido: "",
        nombres: "",
        cedula_pasaporte: "",
        ciudad: "",
        fecha_nacimiento: undefined,
        estado_civil: "",
        licencia_numero: "",
        licencia_ciudad_expedicion: "",
        licencia_fecha_vencimiento: undefined,
        direccion_residencia: "",
        pais: "Colombia",
        telefono: "",
        celular: "",
        email: "",
        ocupacion: "",
        empresa: "",
        direccion_oficina: "",
        banco: "",
        numero_tarjeta: "",
        referencia_personal_nombre: "",
        referencia_personal_telefono: "",
        referencia_comercial_nombre: "",
        referencia_comercial_telefono: "",
        referencia_familiar_nombre: "",
        referencia_familiar_telefono: "",
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("Error al crear la reservación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Nueva Reservación
        </CardTitle>
        <CardDescription>
          Crea una nueva reservación ingresando los datos del cliente y del alquiler
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAvailable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El vehículo no está disponible en las fechas seleccionadas.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="licencia" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Licencia</span>
            </TabsTrigger>
            <TabsTrigger value="laboral" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Info. Bancaria</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="financiero" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Financiero</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="referencias" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Referencias</span>
            </TabsTrigger>
          </TabsList>

          {/* Datos Personales */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="relative">
              <Label htmlFor="cedula">Cédula o Pasaporte * (Empieza a escribir)</Label>
              <Input
                id="cedula"
                value={customer.cedula_pasaporte}
                onChange={(e) => handleCedulaChange(e.target.value)}
                onFocus={() => customer.cedula_pasaporte.length >= 3 && setShowSuggestions(filteredCustomers.length > 0)}
                placeholder="Escribe cédula, pasaporte o nombre..."
                autoComplete="off"
              />
              
              {/* Sugerencias en tiempo real */}
              {showSuggestions && filteredCustomers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCustomers.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => selectCustomer(cust)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b last:border-b-0 flex flex-col"
                    >
                      <span className="font-medium text-sm">
                        {cust.nombres} {cust.primer_apellido} {cust.segundo_apellido}
                      </span>
                      <span className="text-xs text-gray-600">
                        CC/Pasaporte: {cust.cedula_pasaporte}
                      </span>
                      <span className="text-xs text-gray-500">
                        {cust.email || 'Sin email'} • {cust.celular}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              
              {customer.cedula_pasaporte.length >= 3 && !showSuggestions && (
                <p className="text-xs text-gray-500 mt-1">
                  {allCustomers.length > 0 ? 'No se encontraron coincidencias. Puedes crear un nuevo cliente.' : 'Cargando clientes...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombres">Nombres *</Label>
                <Input
                  id="nombres"
                  value={customer.nombres}
                  onChange={(e) => updateCustomer("nombres", e.target.value)}
                  placeholder="Juan Carlos"
                />
              </div>

              <div>
                <Label htmlFor="primer_apellido">Primer Apellido *</Label>
                <Input
                  id="primer_apellido"
                  value={customer.primer_apellido}
                  onChange={(e) => updateCustomer("primer_apellido", e.target.value)}
                  placeholder="Pérez"
                />
              </div>

              <div>
                <Label htmlFor="segundo_apellido">Segundo Apellido</Label>
                <Input
                  id="segundo_apellido"
                  value={customer.segundo_apellido}
                  onChange={(e) => updateCustomer("segundo_apellido", e.target.value)}
                  placeholder="García"
                />
              </div>

              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={customer.ciudad}
                  onChange={(e) => updateCustomer("ciudad", e.target.value)}
                  placeholder="Bogotá"
                />
              </div>

              <div>
                <Label>Fecha de Nacimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customer.fecha_nacimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customer.fecha_nacimiento ? format(customer.fecha_nacimiento, "PPP") : "Selecciona fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customer.fecha_nacimiento}
                      onSelect={(date) => updateCustomer("fecha_nacimiento", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="estado_civil">Estado Civil</Label>
                <Select value={customer.estado_civil} onValueChange={(value) => updateCustomer("estado_civil", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soltero">Soltero(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="union_libre">Unión Libre</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viudo">Viudo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="direccion">Dirección de Residencia</Label>
                <Input
                  id="direccion"
                  value={customer.direccion_residencia}
                  onChange={(e) => updateCustomer("direccion_residencia", e.target.value)}
                  placeholder="Calle 123 #45-67"
                />
              </div>

              <div>
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={customer.pais}
                  onChange={(e) => updateCustomer("pais", e.target.value)}
                  placeholder="Colombia"
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={customer.telefono}
                  onChange={(e) => updateCustomer("telefono", e.target.value)}
                  placeholder="601 234 5678"
                />
              </div>

              <div>
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  value={customer.celular}
                  onChange={(e) => updateCustomer("celular", e.target.value)}
                  placeholder="310 123 4567"
                />
              </div>

              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => updateCustomer("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
          </TabsContent>

          {/* Licencia */}
          <TabsContent value="licencia" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="licencia_numero">Número de Licencia</Label>
                <Input
                  id="licencia_numero"
                  value={customer.licencia_numero}
                  onChange={(e) => updateCustomer("licencia_numero", e.target.value)}
                  placeholder="12345678"
                />
              </div>

              <div>
                <Label htmlFor="licencia_ciudad">Ciudad de Expedición</Label>
                <Input
                  id="licencia_ciudad"
                  value={customer.licencia_ciudad_expedicion}
                  onChange={(e) => updateCustomer("licencia_ciudad_expedicion", e.target.value)}
                  placeholder="Bogotá"
                />
              </div>

              <div>
                <Label>Fecha de Vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customer.licencia_fecha_vencimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customer.licencia_fecha_vencimiento ? format(customer.licencia_fecha_vencimiento, "PPP") : "Selecciona fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customer.licencia_fecha_vencimiento}
                      onSelect={(date) => updateCustomer("licencia_fecha_vencimiento", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          {/* Información Bancaria */}
          <TabsContent value="laboral" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="banco">Banco</Label>
                <Input
                  id="banco"
                  value={customer.banco}
                  onChange={(e) => updateCustomer("banco", e.target.value)}
                  placeholder="Nombre del banco"
                />
              </div>

              <div>
                <Label htmlFor="numero_tarjeta">Número de Tarjeta</Label>
                <Input
                  id="numero_tarjeta"
                  value={customer.numero_tarjeta}
                  onChange={(e) => updateCustomer("numero_tarjeta", e.target.value)}
                  placeholder="Últimos 4 dígitos o completo"
                  maxLength={16}
                />
              </div>

              <div>
                <Label htmlFor="fecha_vencimiento_tarjeta">Fecha de Vencimiento</Label>
                <Input
                  id="fecha_vencimiento_tarjeta"
                  value={customer.fecha_vencimiento_tarjeta}
                  onChange={(e) => updateCustomer("fecha_vencimiento_tarjeta", e.target.value)}
                  placeholder="MM/AA"
                  maxLength={5}
                />
              </div>

              <div>
                <Label htmlFor="cvv_tarjeta">CVV</Label>
                <Input
                  id="cvv_tarjeta"
                  type="password"
                  value={customer.cvv_tarjeta}
                  onChange={(e) => updateCustomer("cvv_tarjeta", e.target.value)}
                  placeholder="***"
                  maxLength={4}
                />
              </div>
            </div>
          </TabsContent>

          {/* Financiero (solo admin) */}
          {isAdmin && (
            <TabsContent value="financiero" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  Esta información es confidencial y solo visible para administradores
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    value={customer.banco}
                    onChange={(e) => updateCustomer("banco", e.target.value)}
                    placeholder="Banco de Bogotá"
                  />
                </div>

                <div>
                  <Label htmlFor="numero_tarjeta">Número de Tarjeta</Label>
                  <Input
                    id="numero_tarjeta"
                    value={customer.numero_tarjeta}
                    onChange={(e) => updateCustomer("numero_tarjeta", e.target.value)}
                    placeholder="**** **** **** 1234"
                    type="password"
                  />
                </div>
              </div>
            </TabsContent>
          )}

          {/* Referencias - Oculto */}
          <TabsContent value="referencias" className="space-y-4 mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Sección no requerida para este formulario</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Datos de la Reserva */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="text-lg font-semibold">Datos de la Reserva</h3>
          
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehículo *</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Selecciona un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.placa} - {vehicle.marca} {vehicle.modelo} ({vehicle.estado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de Inicio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Fecha de Inicio *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 border-2 hover:border-blue-500 hover:bg-blue-50 transition-all",
                      !fechaInicio && "text-muted-foreground",
                      fechaInicio && "border-blue-300 bg-blue-50/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                    {fechaInicio ? (
                      <span className="font-medium">
                        {format(fechaInicio, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                      </span>
                    ) : (
                      <span>Selecciona fecha de inicio</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border-2" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicio}
                    onSelect={setFechaInicio}
                    initialFocus
                    locale={es}
                    className="rounded-md"
                    classNames={{
                      months: "space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-100 rounded-md",
                      day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
                      day_today: "bg-accent text-accent-foreground font-bold border-2 border-blue-400",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha de Fin */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-green-600" />
                Fecha de Fin *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 border-2 hover:border-green-500 hover:bg-green-50 transition-all",
                      !fechaFin && "text-muted-foreground",
                      fechaFin && "border-green-300 bg-green-50/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                    {fechaFin ? (
                      <span className="font-medium">
                        {format(fechaFin, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                      </span>
                    ) : (
                      <span>Selecciona fecha de fin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border-2" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={setFechaFin}
                    initialFocus
                    locale={es}
                    disabled={(date) => fechaInicio ? date < fechaInicio : false}
                    className="rounded-md"
                    classNames={{
                      months: "space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-green-100 rounded-md",
                      day_selected: "bg-green-600 text-white hover:bg-green-700 hover:text-white focus:bg-green-600 focus:text-white",
                      day_today: "bg-accent text-accent-foreground font-bold border-2 border-green-400",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50 line-through",
                    }}
                  />
                </PopoverContent>
              </Popover>
              {fechaInicio && fechaFin && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  ✓ {diasAlquiler} {diasAlquiler === 1 ? 'día' : 'días'} de alquiler
                </p>
              )}
            </div>
          </div>

          {/* Cálculo de Precio - Desglose Fiscal Correcto */}
          {diasAlquiler > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    📊 Desglose de Reserva
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Días de alquiler:</span>
                    <span className="font-semibold">{diasAlquiler} {diasAlquiler === 1 ? 'día' : 'días'}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Tarifa por día (sin IVA):</span>
                    <span className="font-semibold">
                      ${tarifaDiaria.toLocaleString('es-CO')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span>Subtotal (sin IVA):</span>
                    <span className="font-semibold">${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-orange-700 dark:text-orange-400">
                    <span className="flex items-center gap-1">
                      <span className="text-xs">+</span>
                      <span>Más impuesto IVA 19%</span>
                    </span>
                    <span className="font-semibold">${iva.toLocaleString('es-CO')}</span>
                  </div>
                  
                  <div className="flex justify-between border-t-2 pt-3 text-base">
                    <span className="font-bold text-blue-900 dark:text-blue-100">TOTAL RESERVA:</span>
                    <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                      ${totalReserva.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="descuento_porcentaje">Descuento (%)</Label>
              <Input
                id="descuento_porcentaje"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={descuentoPorcentaje}
                onChange={(e) => {
                  setDescuentoPorcentaje(e.target.value);
                  if (e.target.value) setDescuentoValor("");
                }}
                placeholder="0"
                disabled={!!descuentoValor}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descuento_valor">Descuento (Valor Fijo)</Label>
              <Input
                id="descuento_valor"
                type="number"
                step="0.01"
                min="0"
                value={descuentoValor}
                onChange={(e) => {
                  setDescuentoValor(e.target.value);
                  if (e.target.value) setDescuentoPorcentaje("");
                }}
                placeholder="0"
                disabled={!!descuentoPorcentaje}
              />
            </div>
          </div>

          {(descuentoPorcentaje || descuentoValor) && (
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Descuento aplicado:</span>
                    <span className="text-destructive font-semibold">
                      -${(precioBase - precioFinal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">TOTAL FINAL:</span>
                    <span className="font-bold text-primary text-lg">
                      ${precioFinal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Fuente</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="oficina">Oficina</SelectItem>
                  <SelectItem value="telefono">Teléfono</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Información adicional sobre la reservación"
              rows={3}
            />
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={loading || !isAvailable || !selectedVehicle || !fechaInicio || !fechaFin || !customer.nombres || !customer.primer_apellido || !customer.cedula_pasaporte || !customer.celular}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            "Crear Reservación"
          )}
        </Button>
      </CardContent>

      {/* Security Alert Dialog for Blocked Customers */}
      <AlertDialog open={showBlockedCustomerDialog} onOpenChange={setShowBlockedCustomerDialog}>
        <AlertDialogContent className="border-destructive">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-6 w-6" />
              <AlertDialogTitle className="text-destructive">
                ALERTA DE SEGURIDAD
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              <div className="space-y-2 mt-4">
                <p className="font-semibold text-foreground">
                  Cliente: {blockedCustomerName}
                </p>
                <p className="text-destructive font-medium">
                  ⚠️ NO SE PERMITE GENERAR RESERVAS
                </p>
                <p>
                  Este cliente tiene una alerta de seguridad activa y no está autorizado para alquilar vehículos.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Por favor, contacte al administrador para más información.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowBlockedCustomerDialog(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
