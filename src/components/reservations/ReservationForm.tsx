import { useState, useEffect } from "react";
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
import { format } from "date-fns";
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
  referencia_personal_nombre: string;
  referencia_personal_telefono: string;
  referencia_comercial_nombre: string;
  referencia_comercial_telefono: string;
  referencia_familiar_nombre: string;
  referencia_familiar_telefono: string;
  alerta_cliente?: string;
}

export const ReservationForm = () => {
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
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [precioFinal, setPrecioFinal] = useState<number>(0);
  const [showBlockedCustomerDialog, setShowBlockedCustomerDialog] = useState(false);
  const [blockedCustomerName, setBlockedCustomerName] = useState("");
  
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
  }, []);

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
      setPrecioBase(0);
      setPrecioFinal(0);
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle || !vehicle.tarifa_dia_iva) {
      setPrecioBase(0);
      setPrecioFinal(0);
      return;
    }

    // Calculate days
    const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDiasAlquiler(days);

    // Calculate base price
    const base = vehicle.tarifa_dia_iva * days;
    setPrecioBase(base);

    // Calculate discount
    let descuento = 0;
    if (descuentoValor) {
      descuento = parseFloat(descuentoValor);
    } else if (descuentoPorcentaje) {
      descuento = base * (parseFloat(descuentoPorcentaje) / 100);
    }

    // Calculate final price
    const final = Math.max(0, base - descuento);
    setPrecioFinal(final);
    setPriceTotal(final.toString());
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
      // Trim whitespace and search
      const searchValue = customer.cedula_pasaporte.trim();
      
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .ilike("cedula_pasaporte", searchValue);

      if (error) throw error;

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
        toast.info("Cliente no encontrado. Complete los datos para crear un nuevo cliente.");
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
        descuentoFinal = precioBase * (descuentoPorcFinal / 100);
      }

      // Create reservation
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
          price_total: priceTotal ? parseFloat(priceTotal) : null,
          descuento: descuentoFinal,
          descuento_porcentaje: descuentoPorcFinal,
          dias_totales: diasAlquiler,
          tarifa_dia_iva: vehicles.find(v => v.id === selectedVehicle)?.tarifa_dia_iva,
          valor_total: precioBase,
          created_by: user.id,
          source,
          notas,
        })
        .select()
        .single();

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

      toast.success("Reservación creada exitosamente");
      
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
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Laboral</span>
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
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="cedula">Cédula o Pasaporte *</Label>
                <Input
                  id="cedula"
                  value={customer.cedula_pasaporte}
                  onChange={(e) => updateCustomer("cedula_pasaporte", e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <Button
                onClick={searchCustomerByCedula}
                disabled={searchingCustomer || !customer.cedula_pasaporte}
                className="mt-auto"
                variant="outline"
              >
                {searchingCustomer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
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

          {/* Laboral */}
          <TabsContent value="laboral" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ocupacion">Ocupación</Label>
                <Input
                  id="ocupacion"
                  value={customer.ocupacion}
                  onChange={(e) => updateCustomer("ocupacion", e.target.value)}
                  placeholder="Ingeniero"
                />
              </div>

              <div>
                <Label htmlFor="empresa">Empresa donde Trabaja</Label>
                <Input
                  id="empresa"
                  value={customer.empresa}
                  onChange={(e) => updateCustomer("empresa", e.target.value)}
                  placeholder="Empresa ABC S.A."
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="direccion_oficina">Dirección de Oficina</Label>
                <Input
                  id="direccion_oficina"
                  value={customer.direccion_oficina}
                  onChange={(e) => updateCustomer("direccion_oficina", e.target.value)}
                  placeholder="Calle 100 #20-30"
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

          {/* Referencias */}
          <TabsContent value="referencias" className="space-y-4 mt-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Referencia Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ref_personal_nombre">Nombre</Label>
                    <Input
                      id="ref_personal_nombre"
                      value={customer.referencia_personal_nombre}
                      onChange={(e) => updateCustomer("referencia_personal_nombre", e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ref_personal_telefono">Teléfono</Label>
                    <Input
                      id="ref_personal_telefono"
                      value={customer.referencia_personal_telefono}
                      onChange={(e) => updateCustomer("referencia_personal_telefono", e.target.value)}
                      placeholder="310 123 4567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Referencia Comercial</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ref_comercial_nombre">Nombre</Label>
                    <Input
                      id="ref_comercial_nombre"
                      value={customer.referencia_comercial_nombre}
                      onChange={(e) => updateCustomer("referencia_comercial_nombre", e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ref_comercial_telefono">Teléfono</Label>
                    <Input
                      id="ref_comercial_telefono"
                      value={customer.referencia_comercial_telefono}
                      onChange={(e) => updateCustomer("referencia_comercial_telefono", e.target.value)}
                      placeholder="310 123 4567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Referencia Familiar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ref_familiar_nombre">Nombre</Label>
                    <Input
                      id="ref_familiar_nombre"
                      value={customer.referencia_familiar_nombre}
                      onChange={(e) => updateCustomer("referencia_familiar_nombre", e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ref_familiar_telefono">Teléfono</Label>
                    <Input
                      id="ref_familiar_telefono"
                      value={customer.referencia_familiar_telefono}
                      onChange={(e) => updateCustomer("referencia_familiar_telefono", e.target.value)}
                      placeholder="310 123 4567"
                    />
                  </div>
                </div>
              </div>
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
            <div className="space-y-2">
              <Label>Fecha de Inicio *</Label>
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
                    {fechaInicio ? format(fechaInicio, "PPP") : "Selecciona fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaInicio}
                    onSelect={setFechaInicio}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Fin *</Label>
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
                    {fechaFin ? format(fechaFin, "PPP") : "Selecciona fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={setFechaFin}
                    initialFocus
                    disabled={(date) => fechaInicio ? date < fechaInicio : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cálculo de Precio */}
          {diasAlquiler > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Días de alquiler:</span>
                    <span className="font-semibold">{diasAlquiler} días</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tarifa por día (IVA incluido):</span>
                    <span className="font-semibold">
                      ${vehicles.find(v => v.id === selectedVehicle)?.tarifa_dia_iva?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-semibold">${precioBase.toLocaleString()}</span>
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
