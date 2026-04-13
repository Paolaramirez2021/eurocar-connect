import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2, Search, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { generateContractHTML, ContractData } from "@/utils/contractTemplate";
import { getApiUrl } from "@/utils/apiUrl";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  color?: string;
}

interface Customer {
  id: string;
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  tipo_documento: string | null;
  cedula_pasaporte: string;
  email: string | null;
  celular: string;
  direccion?: string;
  ciudad?: string;
  licencia_conduccion?: string;
}

interface Reservation {
  id: string;
  vehicle_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  price_total: number;
  valor_total: number;
  estado: string;
  vehicles: {
    marca: string;
    modelo: string;
    placa: string;
    color?: string;
    tarifa_dia_iva?: number;
  };
}

// Formulario con TODOS los campos del contrato
interface ContractFormData {
  // Tipo de contrato y número
  contractType: 'facturacion' | 'efectivo';
  contractNumber: string;
  
  // Reserva
  reservationId?: string;
  
  // Datos del Cliente (Arrendatario)
  customerId: string;
  customerName: string;
  customerDocumentType: string;
  customerDocument: string;
  customerLicense: string;
  customerLicenseExpiry: string;
  customerAddress: string;
  customerPhone: string;
  customerCity: string;
  customerEmail: string;
  
  // Vehículo
  vehicleId: string;
  vehicleBrand: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleKmOut: string;
  servicioViajar: string;
  terminoContrato: string;
  kmAdicional: string;
  
  // Duración
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  serviceType: string;
  
  // Valores
  dailyRate: number;
  additionalValue: number;
  discount: number;
  depositAmount: number;
  deducible: string;
  paymentMethod: string;
  totalAmount: number;
  
  // Opciones de envío
  sendVia: string;
  includeWhatsApp: boolean;
  includeEmail: boolean;

  // Conductores adicionales
  conductor2Nombre: string;
  conductor2TipoDoc: string;
  conductor2Documento: string;
  conductor2Licencia: string;
  conductor2LicenciaVencimiento: string;
  conductor3Nombre: string;
  conductor3TipoDoc: string;
  conductor3Documento: string;
  conductor3Licencia: string;
  conductor3LicenciaVencimiento: string;
}

export const PreliminaryContractForm = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchDocument, setSearchDocument] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextFacturacionNumber, setNextFacturacionNumber] = useState(100);
  const [nextEfectivoNumber, setNextEfectivoNumber] = useState(1);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<ContractFormData>({
    defaultValues: {
      contractType: 'facturacion',
      contractNumber: '',
      reservationId: "",
      customerId: "",
      customerName: "",
      customerDocumentType: "cedula",
      customerDocument: "",
      customerLicense: "",
      customerLicenseExpiry: "",
      customerAddress: "",
      customerPhone: "",
      customerCity: "",
      customerEmail: "",
      vehicleId: "",
      vehicleBrand: "",
      vehiclePlate: "",
      vehicleColor: "",
      vehicleKmOut: "",
      servicioViajar: "",
      terminoContrato: "",
      kmAdicional: "",
      startDate: "",
      startTime: "08:00",
      endDate: "",
      endTime: "08:00",
      serviceType: "Turismo",
      dailyRate: 0,
      additionalValue: 0,
      discount: 0,
      depositAmount: 0,
      deducible: "",
      paymentMethod: "",
      totalAmount: 0,
      sendVia: "manual",
      includeWhatsApp: false,
      includeEmail: false,
      conductor2Nombre: "",
      conductor2TipoDoc: "C.C.",
      conductor2Documento: "",
      conductor2Licencia: "",
      conductor2LicenciaVencimiento: "",
      conductor3Nombre: "",
      conductor3TipoDoc: "C.C.",
      conductor3Documento: "",
      conductor3Licencia: "",
      conductor3LicenciaVencimiento: "",
    }
  });

  const watchedValues = watch();

  // Cargar los últimos números de contrato
  useEffect(() => {
    loadNextContractNumbers();
    loadVehicles();
  }, []);

  // Actualizar el número de contrato cuando cambia el tipo
  useEffect(() => {
    if (!loadingNumbers) {
      if (watchedValues.contractType === 'facturacion') {
        setValue('contractNumber', `EUROCAR-${nextFacturacionNumber}`);
      } else {
        setValue('contractNumber', String(nextEfectivoNumber).padStart(3, '0'));
      }
    }
  }, [watchedValues.contractType, nextFacturacionNumber, nextEfectivoNumber, loadingNumbers]);

  const loadNextContractNumbers = async () => {
    setLoadingNumbers(true);
    try {
      // Buscar el último contrato con prefijo EUROCAR-
      const { data: facturacionContracts } = await supabase
        .from("contracts")
        .select("contract_number")
        .like("contract_number", "EUROCAR-%")
        .order("created_at", { ascending: false })
        .limit(100);

      let maxFacturacion = 99; // Empezar desde 100
      if (facturacionContracts && facturacionContracts.length > 0) {
        facturacionContracts.forEach(c => {
          const match = c.contract_number.match(/EUROCAR-(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num > maxFacturacion) maxFacturacion = num;
          }
        });
      }
      setNextFacturacionNumber(maxFacturacion + 1);

      // Buscar el último contrato sin prefijo (solo números)
      const { data: efectivoContracts } = await supabase
        .from("contracts")
        .select("contract_number")
        .not("contract_number", "like", "EUROCAR-%")
        .not("contract_number", "like", "CTR-%")
        .order("created_at", { ascending: false })
        .limit(100);

      let maxEfectivo = 0;
      if (efectivoContracts && efectivoContracts.length > 0) {
        efectivoContracts.forEach(c => {
          // Solo números (001, 002, etc)
          const num = parseInt(c.contract_number);
          if (!isNaN(num) && num > maxEfectivo) maxEfectivo = num;
        });
      }
      setNextEfectivoNumber(maxEfectivo + 1);

      // Establecer el número inicial
      setValue('contractNumber', `EUROCAR-${maxFacturacion + 1}`);
      
    } catch (error) {
      console.error("Error loading contract numbers:", error);
      setValue('contractNumber', 'EUROCAR-100');
    } finally {
      setLoadingNumbers(false);
    }
  };

  // Calcular valores automáticamente
  useEffect(() => {
    const startDate = watchedValues.startDate ? new Date(watchedValues.startDate) : null;
    const endDate = watchedValues.endDate ? new Date(watchedValues.endDate) : null;
    
    if (startDate && endDate && watchedValues.dailyRate > 0) {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const subtotal = (watchedValues.dailyRate * days) + watchedValues.additionalValue - watchedValues.discount;
      setValue("totalAmount", subtotal);
    }
  }, [watchedValues.startDate, watchedValues.endDate, watchedValues.dailyRate, watchedValues.additionalValue, watchedValues.discount]);

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, placa, marca, modelo, color")
      .order("placa");

    if (!error && data) {
      setVehicles(data as Vehicle[]);
    }
  };

  const searchCustomerByDocument = async () => {
    if (!searchDocument.trim()) {
      toast.error("Ingrese un documento o nombre para buscar");
      return;
    }

    setIsSearching(true);
    try {
      const query = searchDocument.trim();
      
      // Buscar por documento o por nombre
      const { data: customers, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .or(`cedula_pasaporte.ilike.%${query}%,nombres.ilike.%${query}%,primer_apellido.ilike.%${query}%`)
        .limit(10);

      if (customerError || !customers || customers.length === 0) {
        toast.error("Cliente no encontrado");
        setReservations([]);
        setSelectedCustomer(null);
        return;
      }

      // Si hay un solo resultado, usarlo directamente
      // Si hay varios, usar el primero (el más relevante)
      const customer = customers.length === 1 ? customers[0] : customers[0];
      
      if (customers.length > 1) {
        toast.info(`Se encontraron ${customers.length} clientes. Mostrando: ${customers[0].nombres} ${customers[0].primer_apellido} - ${customers[0].cedula_pasaporte}`);
      }

      setSelectedCustomer(customer);
      
      // Llenar datos del cliente
      setValue("customerId", customer.id);
      setValue("customerName", `${customer.nombres} ${customer.primer_apellido} ${customer.segundo_apellido || ''}`.trim());
      setValue("customerDocumentType", customer.tipo_documento || 'cedula');
      setValue("customerDocument", customer.cedula_pasaporte);
      setValue("customerPhone", customer.celular || '');
      setValue("customerEmail", customer.email || '');
      setValue("customerAddress", customer.direccion_residencia || customer.direccion || '');
      setValue("customerCity", customer.ciudad || '');
      setValue("customerLicense", customer.licencia_numero || customer.licencia_conduccion || '');
      // Formatear fecha de vencimiento de licencia
      if (customer.licencia_fecha_vencimiento) {
        const fechaVenc = new Date(customer.licencia_fecha_vencimiento);
        setValue("customerLicenseExpiry", fechaVenc.toLocaleDateString('es-CO'));
      } else {
        setValue("customerLicenseExpiry", '');
      }
      
      toast.success(`Cliente encontrado: ${customer.nombres} ${customer.primer_apellido}`);

      // Buscar reservas activas
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select(`
          id,
          vehicle_id,
          fecha_inicio,
          fecha_fin,
          price_total,
          valor_total,
          estado,
          vehicles (
            marca,
            modelo,
            placa,
            color,
            tarifa_dia_iva
          )
        `)
        .eq("customer_id", customer.id)
        .in("estado", ["confirmed", "pending", "pending_with_payment", "pending_no_payment"])
        .order("fecha_inicio", { ascending: false });

      if (reservationsError) {
        toast.error("Error al cargar reservas");
        return;
      }

      setReservations(reservationsData || []);
      
      if (reservationsData && reservationsData.length > 0) {
        toast.success(`Se encontraron ${reservationsData.length} reserva(s) activa(s)`);
        
        // Cargar automáticamente la primera reserva
        const res = reservationsData[0];
        loadReservationData(res);
      } else {
        toast.warning("Este cliente no tiene reservas activas. Complete los datos manualmente.");
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      toast.error("Error al buscar cliente");
    } finally {
      setIsSearching(false);
    }
  };

  const loadReservationData = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    
    const startDate = new Date(reservation.fecha_inicio);
    const endDate = new Date(reservation.fecha_fin);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    // Usar tarifa_dia_iva del vehículo (sin IVA)
    const dailyRate = reservation.vehicles.tarifa_dia_iva || 0;
    const totalAmount = dailyRate * days;

    setValue("reservationId", reservation.id);
    setValue("vehicleId", reservation.vehicle_id);
    setValue("vehicleBrand", `${reservation.vehicles.marca} ${reservation.vehicles.modelo}`);
    setValue("vehiclePlate", reservation.vehicles.placa);
    setValue("vehicleColor", reservation.vehicles.color || '');
    setValue("startDate", startDate.toISOString().slice(0, 10));
    setValue("startTime", startDate.toISOString().slice(11, 16) || "08:00");
    setValue("endDate", endDate.toISOString().slice(0, 10));
    setValue("endTime", endDate.toISOString().slice(11, 16) || "08:00");
    setValue("dailyRate", Math.round(dailyRate));
    setValue("totalAmount", totalAmount);
  };

  const generatePreliminaryPDF = async (data: ContractFormData, contractNumber: string): Promise<Blob> => {
    const startDate = new Date(`${data.startDate}T${data.startTime}`);
    const endDate = new Date(`${data.endDate}T${data.endTime}`);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    const valorDias = data.dailyRate * days;
    const subtotal = valorDias + data.additionalValue;
    const totalConDescuento = subtotal - data.discount;
    // IVA solo aplica al valor de días menos descuento (valor adicional es exento)
    const baseIva = Math.max(0, valorDias - data.discount);
    const iva = Math.round(baseIva * 0.19);
    const total = totalConDescuento + iva;

    const templateData: ContractData = {
      cliente_nombre: data.customerName,
      cliente_tipo_documento: data.customerDocumentType,
      cliente_documento: data.customerDocument,
      cliente_licencia: data.customerLicense,
      cliente_licencia_vencimiento: data.customerLicenseExpiry,
      cliente_direccion: data.customerAddress,
      cliente_telefono: data.customerPhone,
      cliente_ciudad: data.customerCity,
      cliente_email: data.customerEmail,
      vehiculo_marca: data.vehicleBrand,
      vehiculo_placa: data.vehiclePlate,
      vehiculo_color: data.vehicleColor,
      vehiculo_km_salida: data.vehicleKmOut,
      servicio_viajar: data.servicioViajar,
      termino_contrato: data.terminoContrato,
      km_adicional: data.kmAdicional,
      fecha_inicio: format(startDate, "dd/MM/yyyy", { locale: es }),
      hora_inicio: data.startTime,
      fecha_fin: format(endDate, "dd/MM/yyyy", { locale: es }),
      hora_fin: data.endTime,
      dias: days,
      servicio: data.serviceType,
      valor_dia: data.dailyRate,
      valor_dias: valorDias,
      valor_adicional: data.additionalValue,
      subtotal: subtotal,
      descuento: data.discount,
      total_contrato: totalConDescuento,
      iva: iva,
      total: total,
      valor_reserva: data.depositAmount,
      forma_pago: data.paymentMethod,
      numero_contrato: contractNumber,
      fecha_contrato: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }),
      deducible: data.deducible || "No especificado",
      es_preliminar: true,
      conductor2_nombre: data.conductor2Nombre || '',
      conductor2_tipo_doc: data.conductor2TipoDoc || '',
      conductor2_documento: data.conductor2Documento || '',
      conductor2_licencia: data.conductor2Licencia || '',
      conductor2_licencia_vencimiento: data.conductor2LicenciaVencimiento || '',
      conductor3_nombre: data.conductor3Nombre || '',
      conductor3_tipo_doc: data.conductor3TipoDoc || '',
      conductor3_documento: data.conductor3Documento || '',
      conductor3_licencia: data.conductor3Licencia || '',
      conductor3_licencia_vencimiento: data.conductor3LicenciaVencimiento || '',
    };

    const html = generateContractHTML(templateData);
    console.log('[generatePreliminaryPDF] HTML generado, longitud:', html.length);

    try {
      const response = await fetch(getApiUrl('/api/generate-pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: html,
          options: {
            format: 'Letter',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
          }
        })
      });

      console.log('[generatePreliminaryPDF] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generatePreliminaryPDF] Error response:', errorText);
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.pdf_base64) {
        throw new Error('No se recibió el PDF del servidor');
      }
      
      console.log('[generatePreliminaryPDF] PDF base64 recibido, longitud:', result.pdf_base64.length);
      
      const byteCharacters = atob(result.pdf_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      
    } catch (error: any) {
      console.error('[generatePreliminaryPDF] Error completo:', error);
      const errorMsg = error.message || 'Error desconocido al generar PDF';
      toast.error(`Error generando PDF: ${errorMsg}`);
      throw error;
    }
  };

  const onSubmit = async (data: ContractFormData) => {
    if (!data.customerName || !data.vehiclePlate) {
      toast.error("Complete los datos del cliente y vehículo");
      return;
    }

    if (!data.contractNumber) {
      toast.error("El número de contrato es requerido");
      return;
    }

    setIsSubmitting(true);
    try {
      const contractId = crypto.randomUUID();
      // Usar el número de contrato del formulario
      const contractNumber = data.contractNumber;

      // Generar PDF
      const pdfBlob = await generatePreliminaryPDF(data, contractNumber);
      const pdfFilename = `preliminary/${contractId}_preliminary_${Date.now()}.pdf`;
      
      const { data: pdfUpload, error: pdfError } = await supabase.storage
        .from("contracts")
        .upload(pdfFilename, pdfBlob);

      if (pdfError) {
        throw new Error(`Error al subir PDF: ${pdfError.message}`);
      }

      const { data: pdfUrl } = supabase.storage
        .from("contracts")
        .getPublicUrl(pdfUpload.path);

      const { data: { user } } = await supabase.auth.getUser();

      // Guardar contrato
      const { error: insertError } = await supabase.from("contracts").insert([{
        contract_number: contractNumber,
        reservation_id: data.reservationId || null,
        vehicle_id: data.vehicleId || null,
        customer_id: data.customerId,
        customer_name: data.customerName,
        customer_document: data.customerDocument,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        start_date: `${data.startDate}T${data.startTime}`,
        end_date: `${data.endDate}T${data.endTime}`,
        total_amount: data.totalAmount,
        servicio_viajar: data.servicioViajar || null,
        termino_contrato: data.terminoContrato || null,
        km_adicional: data.kmAdicional || null,
        conductor2_nombre: data.conductor2Nombre || null,
        conductor2_tipo_doc: data.conductor2TipoDoc || null,
        conductor2_documento: data.conductor2Documento || null,
        conductor2_licencia: data.conductor2Licencia || null,
        conductor2_licencia_vencimiento: data.conductor2LicenciaVencimiento || null,
        conductor3_nombre: data.conductor3Nombre || null,
        conductor3_tipo_doc: data.conductor3TipoDoc || null,
        conductor3_documento: data.conductor3Documento || null,
        conductor3_licencia: data.conductor3Licencia || null,
        conductor3_licencia_vencimiento: data.conductor3LicenciaVencimiento || null,
        terms_text: "Acepto los términos y condiciones del contrato de arrendamiento de vehículo automotor de EUROCAR RENTAL SAS según las cláusulas establecidas en www.eurocarental.com",
        terms_accepted: false,
        signed_by: user?.id,
        status: "preliminary",
        pdf_url: pdfUrl.publicUrl,
        signature_url: '',
      }]);

      if (insertError) {
        throw new Error(`Error al guardar contrato: ${insertError.message}`);
      }

      // Enviar email si corresponde
      if (data.includeEmail && data.customerEmail) {
        try {
          await fetch(getApiUrl('/api/send-contract-email'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: [data.customerEmail],
              contract_pdf_url: pdfUrl.publicUrl,
              contract_data: {
                cliente_nombre: data.customerName,
                vehiculo_marca: data.vehicleBrand,
                vehiculo_placa: data.vehiclePlate,
                fecha_inicio: data.startDate,
                fecha_fin: data.endDate,
                valor_total: data.totalAmount
              }
            })
          });
          toast.success("Email enviado al cliente");
        } catch (e) {
          toast.warning("Contrato guardado pero no se pudo enviar el email");
        }
      }

      toast.success(`Contrato preliminar ${contractNumber} creado exitosamente`);
      
      // Reset form
      window.location.reload();

    } catch (error: any) {
      console.error("[onSubmit] Error completo:", error);
      const errorMsg = error.message || "Error al crear el contrato";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular días y totales para mostrar
  const calculateDays = () => {
    if (!watchedValues.startDate || !watchedValues.endDate) return 0;
    const start = new Date(watchedValues.startDate);
    const end = new Date(watchedValues.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  };

  const days = calculateDays();
  const valorDias = watchedValues.dailyRate * days;
  const subtotal = valorDias + watchedValues.additionalValue;
  const totalConDescuento = subtotal - watchedValues.discount;
  // IVA solo aplica al valor de días menos descuento (valor adicional es exento)
  const baseIva = Math.max(0, valorDias - watchedValues.discount);
  const iva = Math.round(baseIva * 0.19);
  const totalFinal = totalConDescuento + iva;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Número de Contrato */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-4 text-blue-700">Número de Contrato</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Contrato *</Label>
            <Select 
              value={watchedValues.contractType} 
              onValueChange={(v: 'facturacion' | 'efectivo') => setValue("contractType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facturacion">Con Prefijo (EUROCAR-XXX)</SelectItem>
                <SelectItem value="efectivo">Sin Prefijo (001, 002...)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Número de Contrato *</Label>
            <Input 
              {...register("contractNumber", { required: true })}
              className="font-bold text-lg bg-white"
              readOnly
            />
            {loadingNumbers && <p className="text-sm text-gray-500 mt-1">Cargando siguiente número...</p>}
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          {watchedValues.contractType === 'facturacion' 
            ? `Siguiente contrato con prefijo: EUROCAR-${nextFacturacionNumber}`
            : `Siguiente contrato sin prefijo: ${String(nextEfectivoNumber).padStart(3, '0')}`
          }
        </div>
      </Card>

      {/* Buscar Cliente */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Cliente
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nombre, apellido o cédula"
            value={searchDocument}
            onChange={(e) => setSearchDocument(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchCustomerByDocument())}
            className="flex-1"
          />
          <Button type="button" onClick={searchCustomerByDocument} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        
        {reservations.length > 1 && (
          <div className="mt-4">
            <Label>Seleccionar Reserva</Label>
            <Select onValueChange={(id) => {
              const res = reservations.find(r => r.id === id);
              if (res) loadReservationData(res);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una reserva" />
              </SelectTrigger>
              <SelectContent>
                {reservations.map((res) => (
                  <SelectItem key={res.id} value={res.id}>
                    {res.vehicles.marca} {res.vehicles.modelo} ({res.vehicles.placa}) - {format(new Date(res.fecha_inicio), "dd/MM/yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      {/* 1. IDENTIFICACIÓN DE LAS PARTES */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">1. IDENTIFICACIÓN DE LAS PARTES</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EL ARRENDATARIO */}
          <div className="space-y-4">
            <h4 className="font-semibold bg-blue-600 text-white px-3 py-1">EL ARRENDATARIO</h4>
            
            <div>
              <Label>Nombre / Razón Social *</Label>
              <Input {...register("customerName", { required: true })} placeholder="Nombre completo" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo Documento</Label>
                <Select 
                  onValueChange={(value) => setValue("customerDocumentType", value)} 
                  value={watchedValues.customerDocumentType || "cedula"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cedula">Cédula</SelectItem>
                    <SelectItem value="cedula_extranjeria">C. Extranjería</SelectItem>
                    <SelectItem value="pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="pep">PEP</SelectItem>
                    <SelectItem value="ppt">PPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>No. Documento *</Label>
                <Input {...register("customerDocument", { required: true })} placeholder="Número" />
              </div>
              <div>
                <Label>No. Licencia</Label>
                <Input {...register("customerLicense")} placeholder="Licencia" />
              </div>
            </div>
            
            <div>
              <Label>Dirección</Label>
              <Input {...register("customerAddress")} placeholder="Dirección completa" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teléfono *</Label>
                <Input {...register("customerPhone", { required: true })} placeholder="Celular" />
              </div>
              <div>
                <Label>Ciudad / País</Label>
                <Input {...register("customerCity")} placeholder="Ciudad" />
              </div>
            </div>
            
            <div>
              <Label>Correo Electrónico</Label>
              <Input {...register("customerEmail")} type="email" placeholder="email@ejemplo.com" />
            </div>
          </div>

          {/* EL ARRENDADOR */}
          <div className="space-y-4">
            <h4 className="font-semibold bg-blue-600 text-white px-3 py-1">EL ARRENDADOR</h4>
            <div className="bg-gray-100 p-4 rounded text-sm">
              <p className="font-bold">EUROCAR RENTAL SAS</p>
              <p>NIT: 900269555</p>
              <p>AV CALLE 26 69C-03 LOCAL 105</p>
              <p>BOGOTÁ - COLOMBIA</p>
              <p>Tel: 320 834 1163 - 313 209 4156</p>
              <p>jennygomez@eurocarental.com</p>
            </div>
          </div>
        </div>
      </Card>

      {/* CONDUCTORES AUTORIZADOS */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">CONDUCTORES AUTORIZADOS</h3>
        
        {/* Conductor 1 - Auto del cliente */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-2">Conductor 1 (Arrendatario - automático)</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={watch("customerName")} disabled className="bg-gray-100 text-sm" />
            </div>
            <div>
              <Label className="text-xs">No. Documento</Label>
              <Input value={`${watch("customerDocumentType")?.toUpperCase() || ''} ${watch("customerDocument")}`} disabled className="bg-gray-100 text-sm" />
            </div>
            <div>
              <Label className="text-xs">N. Licencia</Label>
              <Input value={watch("customerLicense")} disabled className="bg-gray-100 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Vencimiento</Label>
              <Input value={watch("customerLicenseExpiry")} disabled className="bg-gray-100 text-sm" />
            </div>
          </div>
        </div>

        {/* Conductor 2 */}
        <div className="mb-4 p-3 border rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-2">Conductor 2 (Opcional)</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input {...register("conductor2Nombre")} placeholder="Nombre completo" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Tipo Doc</Label>
              <Select onValueChange={(val) => setValue("conductor2TipoDoc", val)} defaultValue="C.C.">
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C.C.">C.C.</SelectItem>
                  <SelectItem value="C.E.">C.E.</SelectItem>
                  <SelectItem value="PAS">Pasaporte</SelectItem>
                  <SelectItem value="PEP">PEP</SelectItem>
                  <SelectItem value="PPT">PPT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">No. Documento</Label>
              <Input {...register("conductor2Documento")} placeholder="Número" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">N. Licencia</Label>
              <Input {...register("conductor2Licencia")} placeholder="Licencia" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Vencimiento</Label>
              <Input type="date" {...register("conductor2LicenciaVencimiento")} className="text-sm" />
            </div>
          </div>
        </div>

        {/* Conductor 3 */}
        <div className="p-3 border rounded-lg">
          <p className="text-sm font-medium text-gray-500 mb-2">Conductor 3 (Opcional)</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input {...register("conductor3Nombre")} placeholder="Nombre completo" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Tipo Doc</Label>
              <Select onValueChange={(val) => setValue("conductor3TipoDoc", val)} defaultValue="C.C.">
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C.C.">C.C.</SelectItem>
                  <SelectItem value="C.E.">C.E.</SelectItem>
                  <SelectItem value="PAS">Pasaporte</SelectItem>
                  <SelectItem value="PEP">PEP</SelectItem>
                  <SelectItem value="PPT">PPT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">No. Documento</Label>
              <Input {...register("conductor3Documento")} placeholder="Número" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">N. Licencia</Label>
              <Input {...register("conductor3Licencia")} placeholder="Licencia" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Vencimiento</Label>
              <Input type="date" {...register("conductor3LicenciaVencimiento")} className="text-sm" />
            </div>
          </div>
        </div>
      </Card>

      {/* 2. VEHÍCULO */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">2. VEHÍCULO</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Marca / Modelo *</Label>
            <Input {...register("vehicleBrand", { required: true })} placeholder="Ej: Toyota Corolla" />
          </div>
          <div>
            <Label>Placa *</Label>
            <Input {...register("vehiclePlate", { required: true })} placeholder="ABC123" />
          </div>
          <div>
            <Label>Color</Label>
            <Input {...register("vehicleColor")} placeholder="Color del vehículo" />
          </div>
          <div>
            <Label>KM Salida</Label>
            <Input {...register("vehicleKmOut")} placeholder="Kilometraje actual" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <Label>Servicio a Viajar</Label>
            <div className="flex gap-2">
              <Select onValueChange={(val) => {
                const current = watch("servicioViajar");
                const parts = current ? current.split("/") : ["", ""];
                setValue("servicioViajar", `${val}/${parts[1] || ""}`);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ciudad origen" />
                </SelectTrigger>
                <SelectContent>
                  {["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales", "Ibagué", "Villavicencio", "Santa Marta", "Neiva", "Armenia", "Pasto", "Cúcuta", "Tunja", "Popayán", "Montería", "Valledupar", "Sincelejo", "Florencia", "Yopal", "Leticia", "Riohacha", "Quibdó", "Mocoa", "Arauca", "San Andrés", "Mitú", "Puerto Carreño", "Inírida", "Sogamoso", "Duitama", "Zipaquirá", "Girardot", "Fusagasugá", "Facatativá", "Chía", "Soacha", "Melgar"].map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(val) => {
                const current = watch("servicioViajar");
                const parts = current ? current.split("/") : ["", ""];
                setValue("servicioViajar", `${parts[0] || ""}/${val}`);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Ciudad destino" />
                </SelectTrigger>
                <SelectContent>
                  {["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales", "Ibagué", "Villavicencio", "Santa Marta", "Neiva", "Armenia", "Pasto", "Cúcuta", "Tunja", "Popayán", "Montería", "Valledupar", "Sincelejo", "Florencia", "Yopal", "Leticia", "Riohacha", "Quibdó", "Mocoa", "Arauca", "San Andrés", "Mitú", "Puerto Carreño", "Inírida", "Sogamoso", "Duitama", "Zipaquirá", "Girardot", "Fusagasugá", "Facatativá", "Chía", "Soacha", "Melgar"].map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {watch("servicioViajar") && watch("servicioViajar") !== "/" && (
              <p className="text-xs text-muted-foreground mt-1">{watch("servicioViajar")}</p>
            )}
          </div>
          <div>
            <Label>Término Contrato</Label>
            <Input {...register("terminoContrato")} placeholder="Ej: 2 días/400km" />
            <p className="text-xs text-muted-foreground mt-1">Días / Kilómetros permitidos</p>
          </div>
          <div>
            <Label>Kilómetro Adicional ($)</Label>
            <Input {...register("kmAdicional")} placeholder="Ej: 500" />
            <p className="text-xs text-muted-foreground mt-1">Valor por KM adicional</p>
          </div>
        </div>
        
        {vehicles.length > 0 && !selectedReservation && (
          <div className="mt-4">
            <Label>O seleccionar vehículo disponible:</Label>
            <Select onValueChange={(id) => {
              const v = vehicles.find(v => v.id === id);
              if (v) {
                setValue("vehicleId", v.id);
                setValue("vehicleBrand", `${v.marca} ${v.modelo}`);
                setValue("vehiclePlate", v.placa);
                setValue("vehicleColor", v.color || '');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.marca} {v.modelo} - {v.placa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      {/* 3. DURACIÓN DEL CONTRATO */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">3. DURACIÓN DEL CONTRATO</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label>Fecha Inicio *</Label>
            <Input {...register("startDate", { required: true })} type="date" />
          </div>
          <div>
            <Label>Hora Inicio</Label>
            <Input {...register("startTime")} type="time" />
          </div>
          <div>
            <Label>Fecha Fin *</Label>
            <Input {...register("endDate", { required: true })} type="date" />
          </div>
          <div>
            <Label>Hora Fin</Label>
            <Input {...register("endTime")} type="time" />
          </div>
          <div>
            <Label>Tipo Servicio</Label>
            <Select value={watchedValues.serviceType} onValueChange={(v) => setValue("serviceType", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Turismo">Turismo</SelectItem>
                <SelectItem value="Empresarial">Empresarial</SelectItem>
                <SelectItem value="Aeropuerto">Aeropuerto</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {days > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <span className="font-semibold">Total días: {days}</span>
          </div>
        )}
      </Card>

      {/* 4. VALOR DEL CONTRATO */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">4. VALOR DEL CONTRATO</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Día *</Label>
                <Input 
                  {...register("dailyRate", { valueAsNumber: true })} 
                  type="number" 
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Valor Adicional</Label>
                <Input 
                  {...register("additionalValue", { valueAsNumber: true })} 
                  type="number" 
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Descuento</Label>
                <Input 
                  {...register("discount", { valueAsNumber: true })} 
                  type="number" 
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Valor Reserva/Anticipo</Label>
                <Input 
                  {...register("depositAmount", { valueAsNumber: true })} 
                  type="number" 
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <Label>Forma de Pago</Label>
              <Select value={watchedValues.paymentMethod} onValueChange={(v) => setValue("paymentMethod", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione forma de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta Crédito">Tarjeta Crédito</SelectItem>
                  <SelectItem value="Tarjeta Débito">Tarjeta Débito</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Nequi">Nequi</SelectItem>
                  <SelectItem value="Daviplata">Daviplata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Deducible del Seguro</Label>
              <Input 
                {...register("deducible")} 
                placeholder="Ej: $3.000.000 COP"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor mínimo del deducible del seguro (20% no cubierto)
              </p>
            </div>
          </div>

          {/* Resumen de valores */}
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <h4 className="font-semibold mb-3">RESUMEN</h4>
            <div className="flex justify-between">
              <span>Valor día:</span>
              <span>${watchedValues.dailyRate.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor {days} días:</span>
              <span>${valorDias.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor adicional:</span>
              <span>${watchedValues.additionalValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Descuento:</span>
              <span>-${watchedValues.discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Total contrato:</span>
              <span>${totalConDescuento.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA 19%:</span>
              <span>${Math.round(iva).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 bg-blue-600 text-white px-2 -mx-2">
              <span>TOTAL:</span>
              <span>${Math.round(totalFinal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-600 mt-2">
              <span>Reserva recibida:</span>
              <span>${watchedValues.depositAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Saldo pendiente:</span>
              <span>${Math.round(totalFinal - watchedValues.depositAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Opciones de envío */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Opciones de Envío</h3>
        
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeEmail"
              checked={watchedValues.includeEmail}
              onCheckedChange={(checked) => setValue("includeEmail", !!checked)}
            />
            <Label htmlFor="includeEmail">Enviar por Email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeWhatsApp"
              checked={watchedValues.includeWhatsApp}
              onCheckedChange={(checked) => setValue("includeWhatsApp", !!checked)}
            />
            <Label htmlFor="includeWhatsApp">Enviar por WhatsApp</Label>
          </div>
        </div>
      </Card>

      {/* Botón Generar */}
      <Button 
        type="submit" 
        className="w-full py-6 text-lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generando Contrato...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-5 w-5" />
            Generar Contrato Preliminar
          </>
        )}
      </Button>
    </form>
  );
};

export default PreliminaryContractForm;
