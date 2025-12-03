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
import { FileText, Loader2, Search, Send, Mail, MessageSquare } from "lucide-react";
import jsPDF from "jspdf";
import { Checkbox } from "@/components/ui/checkbox";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
}

interface Customer {
  id: string;
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  cedula_pasaporte: string;
  email: string | null;
  celular: string;
}

interface Reservation {
  id: string;
  vehicle_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  price_total: number;
  estado: string;
  vehicles: {
    marca: string;
    modelo: string;
    placa: string;
  };
}

interface PreliminaryFormData {
  reservationId?: string;
  vehicleId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  sendVia: string;
  includeWhatsApp: boolean;
  includeEmail: boolean;
}

const DEFAULT_TERMS = `TÉRMINOS Y CONDICIONES DEL CONTRATO DE ARRENDAMIENTO DE VEHÍCULO

1. El arrendatario se compromete a usar el vehículo de manera responsable y conforme a las leyes de tránsito vigentes.

2. El arrendatario es responsable de cualquier daño, multa o infracción generada durante el periodo de arrendamiento.

3. El vehículo debe ser devuelto en las mismas condiciones en que fue entregado, salvo desgaste normal por uso.

4. Queda prohibido subarrendar el vehículo o permitir que terceros lo conduzcan sin autorización expresa.

5. El arrendatario debe notificar inmediatamente cualquier accidente, avería o robo del vehículo.

6. El incumplimiento de cualquiera de estas cláusulas puede resultar en la terminación inmediata del contrato.

Al aceptar este contrato preliminar, el arrendatario manifiesta su interés en formalizar el arrendamiento.`;

export const PreliminaryContractForm = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchDocument, setSearchDocument] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PreliminaryFormData>({
    defaultValues: {
      reservationId: "",
      vehicleId: "",
      customerId: "",
      startDate: "",
      endDate: "",
      totalAmount: 0,
      sendVia: "manual",
      includeWhatsApp: false,
      includeEmail: false,
    }
  });

  const selectedVehicleId = watch("vehicleId");
  const selectedCustomerId = watch("customerId");
  const sendVia = watch("sendVia");
  const includeWhatsApp = watch("includeWhatsApp");
  const includeEmail = watch("includeEmail");

  useEffect(() => {
    loadVehicles();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    }
  }, [selectedCustomerId, customers]);

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, placa, marca, modelo")
      .eq("estado", "disponible")
      .order("placa");

    if (error) {
      toast.error("Error al cargar vehículos");
      return;
    }

    setVehicles(data as Vehicle[] || []);
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, nombres, primer_apellido, segundo_apellido, cedula_pasaporte, email, celular")
      .order("nombres");

    if (error) {
      toast.error("Error al cargar clientes");
      return;
    }

    setCustomers(data || []);
  };

  const searchCustomerByDocument = async () => {
    if (!searchDocument.trim()) {
      toast.error("Ingrese un documento para buscar");
      return;
    }

    setIsSearching(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .ilike("cedula_pasaporte", searchDocument.trim())
        .single();

      if (customerError || !customer) {
        toast.error("Cliente no encontrado");
        setReservations([]);
        setSelectedCustomer(null);
        return;
      }

      setSelectedCustomer(customer);
      setValue("customerId", customer.id);
      toast.success(`Cliente encontrado: ${customer.nombres} ${customer.primer_apellido}`);

      // Load pending/confirmed reservations for this customer
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select(`
          id,
          vehicle_id,
          fecha_inicio,
          fecha_fin,
          price_total,
          estado,
          vehicles (
            marca,
            modelo,
            placa
          )
        `)
        .eq("customer_id", customer.id)
        .in("estado", ["confirmed", "pending"])
        .order("fecha_inicio", { ascending: false });

      if (reservationsError) {
        toast.error("Error al cargar reservas");
        return;
      }

      setReservations(reservationsData || []);
      
      if (reservationsData && reservationsData.length > 0) {
        toast.success(`Se encontraron ${reservationsData.length} reserva(s) activa(s)`);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      toast.error("Error al buscar cliente");
    } finally {
      setIsSearching(false);
    }
  };

  const loadReservationData = (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    setSelectedReservation(reservation);
    setValue("reservationId", reservation.id);
    setValue("vehicleId", reservation.vehicle_id);
    setValue("startDate", new Date(reservation.fecha_inicio).toISOString().slice(0, 16));
    setValue("endDate", new Date(reservation.fecha_fin).toISOString().slice(0, 16));
    setValue("totalAmount", reservation.price_total || 0);

    toast.success("Datos de la reserva cargados automáticamente");
  };

  const generatePreliminaryPDF = async (contractData: any, contractNumber: string): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text("CONTRATO PRELIMINAR DE ARRENDAMIENTO", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Contrato No: ${contractNumber}`, pageWidth / 2, 30, { align: "center" });
    doc.text("(Documento Preliminar - Sin Validez Legal hasta Firma)", pageWidth / 2, 37, { align: "center" });
    
    // Contract details
    let yPos = 50;
    doc.setFontSize(11);
    
    doc.text(`Cliente: ${contractData.customer_name}`, 20, yPos);
    yPos += 7;
    doc.text(`Documento: ${contractData.customer_document}`, 20, yPos);
    yPos += 7;
    doc.text(`Vehículo: ${contractData.vehicle_info}`, 20, yPos);
    yPos += 7;
    doc.text(`Periodo: ${new Date(contractData.start_date).toLocaleDateString()} - ${new Date(contractData.end_date).toLocaleDateString()}`, 20, yPos);
    yPos += 7;
    doc.text(`Valor Total: $${contractData.total_amount.toLocaleString()}`, 20, yPos);
    yPos += 15;
    
    // Terms
    doc.setFontSize(10);
    const terms = doc.splitTextToSize(DEFAULT_TERMS, pageWidth - 40);
    doc.text(terms, 20, yPos);
    
    yPos = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Este es un documento preliminar. Para formalizar el contrato, debe completar el proceso de firma.", 20, yPos, { maxWidth: pageWidth - 40 });
    
    return doc.output("blob");
  };

  const onSubmit = async (data: PreliminaryFormData) => {
    if (!selectedCustomer) {
      toast.error("Debe seleccionar un cliente");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get vehicle info
      let vehicle;
      if (selectedReservation) {
        vehicle = {
          id: selectedReservation.vehicle_id,
          placa: selectedReservation.vehicles.placa,
          marca: selectedReservation.vehicles.marca,
          modelo: selectedReservation.vehicles.modelo,
        };
      } else {
        vehicle = vehicles.find(v => v.id === data.vehicleId);
      }

      if (!vehicle) {
        toast.error("Error: Vehículo no encontrado");
        return;
      }

      const contractId = crypto.randomUUID();
      const contractNumber = `CTR-PRE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

      const customerName = `${selectedCustomer.nombres} ${selectedCustomer.primer_apellido} ${selectedCustomer.segundo_apellido || ''}`.trim();
      const vehicleInfo = `${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}`;

      const contractData = {
        customer_name: customerName,
        customer_document: selectedCustomer.cedula_pasaporte,
        vehicle_info: vehicleInfo,
        start_date: data.startDate,
        end_date: data.endDate,
        total_amount: data.totalAmount,
      };

      // Generate PDF
      const pdfBlob = await generatePreliminaryPDF(contractData, contractNumber);
      const pdfFilename = `preliminary/${contractId}_preliminary_${Date.now()}.pdf`;
      
      const { data: pdfUpload, error: pdfError } = await supabase.storage
        .from("contracts")
        .upload(pdfFilename, pdfBlob);

      if (pdfError) throw pdfError;

      const { data: pdfUrl } = supabase.storage
        .from("contracts")
        .getPublicUrl(pdfUpload.path);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert preliminary contract
      const { error: insertError } = await supabase.from("contracts").insert([{
        contract_number: contractNumber,
        contract_type: 'preliminary',
        preliminary_status: 'sent',
        reservation_id: data.reservationId || null,
        vehicle_id: data.vehicleId,
        customer_id: data.customerId,
        customer_name: customerName,
        customer_document: selectedCustomer.cedula_pasaporte,
        customer_email: selectedCustomer.email,
        customer_phone: selectedCustomer.celular,
        start_date: data.startDate,
        end_date: data.endDate,
        total_amount: data.totalAmount,
        terms_text: DEFAULT_TERMS,
        terms_accepted: false,
        signed_by: user?.id,
        status: "preliminary",
        pdf_url: pdfUrl.publicUrl,
        signature_url: '', // Required field but empty for preliminary
        sent_at: new Date().toISOString(),
        sent_via: data.sendVia,
        whatsapp_sent: data.includeWhatsApp,
        email_sent: data.includeEmail,
        is_locked: false, // Preliminary contracts can be edited
      }]);

      if (insertError) throw insertError;

      // Send via email if selected
      if (data.includeEmail && selectedCustomer.email) {
        await supabase.functions.invoke("send-contract-email", {
          body: {
            contractId: contractId,
            customerEmail: selectedCustomer.email,
            customerName: customerName,
            vehiclePlate: vehicle.placa,
            pdfUrl: pdfUrl.publicUrl,
          },
        });
      }

      // Show WhatsApp link if selected
      if (data.includeWhatsApp && selectedCustomer.celular) {
        const whatsappMessage = encodeURIComponent(
          `Hola ${customerName}, te enviamos el contrato preliminar de arrendamiento del vehículo ${vehicleInfo}. Puedes revisarlo aquí: ${pdfUrl.publicUrl}`
        );
        const whatsappUrl = `https://wa.me/${selectedCustomer.celular.replace(/\D/g, '')}?text=${whatsappMessage}`;
        window.open(whatsappUrl, '_blank');
      }

      toast.success(`Contrato preliminar ${contractNumber} creado exitosamente`);
      resetForm();

    } catch (error) {
      console.error("Error creating preliminary contract:", error);
      toast.error("Error al crear el contrato preliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setValue("vehicleId", "");
    setValue("customerId", "");
    setValue("startDate", "");
    setValue("endDate", "");
    setValue("totalAmount", 0);
    setValue("sendVia", "manual");
    setValue("includeWhatsApp", false);
    setValue("includeEmail", false);
    setSelectedCustomer(null);
    setSelectedReservation(null);
    setSearchDocument("");
    setReservations([]);
  };

  const isFormValid = selectedVehicleId && selectedCustomerId && watch("startDate") && 
                      watch("endDate") && watch("totalAmount") > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Buscar Cliente
        </h3>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Ingrese cédula o documento del cliente"
              value={searchDocument}
              onChange={(e) => setSearchDocument(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchCustomerByDocument()}
            />
          </div>
          <Button
            type="button"
            onClick={searchCustomerByDocument}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {selectedCustomer && (
          <div className="p-3 bg-muted rounded-lg mb-4">
            <p className="text-sm font-medium">
              {selectedCustomer.nombres} {selectedCustomer.primer_apellido} {selectedCustomer.segundo_apellido}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedCustomer.cedula_pasaporte} • {selectedCustomer.celular}
            </p>
            {selectedCustomer.email && (
              <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
            )}
          </div>
        )}

        {reservations.length > 0 && (
          <div className="space-y-2">
            <Label>Reservas Activas</Label>
            <Select onValueChange={loadReservationData}>
              <SelectTrigger>
                <SelectValue placeholder="Cargar datos desde reserva..." />
              </SelectTrigger>
              <SelectContent>
                {reservations.map((res) => (
                  <SelectItem key={res.id} value={res.id}>
                    {res.vehicles.marca} {res.vehicles.modelo} - {new Date(res.fecha_inicio).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Datos del Contrato</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehicleId">Vehículo *</Label>
            <Select onValueChange={(value) => setValue("vehicleId", value)} value={selectedVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.marca} {vehicle.modelo} - {vehicle.placa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="totalAmount">Valor Total *</Label>
            <Input
              id="totalAmount"
              type="number"
              {...register("totalAmount", { required: true, min: 0 })}
            />
          </div>

          <div>
            <Label htmlFor="startDate">Fecha Inicio *</Label>
            <Input
              id="startDate"
              type="datetime-local"
              {...register("startDate", { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="endDate">Fecha Fin *</Label>
            <Input
              id="endDate"
              type="datetime-local"
              {...register("endDate", { required: true })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Envío del Contrato
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="sendVia">Método de Envío</Label>
            <Select onValueChange={(value) => setValue("sendVia", value)} value={sendVia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (solo generar)</SelectItem>
                <SelectItem value="digital">Digital (Email/WhatsApp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sendVia === "digital" && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeEmail"
                  checked={includeEmail}
                  onCheckedChange={(checked) => setValue("includeEmail", checked as boolean)}
                  disabled={!selectedCustomer?.email}
                />
                <Label htmlFor="includeEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar por Email
                  {!selectedCustomer?.email && (
                    <span className="text-xs text-muted-foreground">(sin email registrado)</span>
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeWhatsApp"
                  checked={includeWhatsApp}
                  onCheckedChange={(checked) => setValue("includeWhatsApp", checked as boolean)}
                />
                <Label htmlFor="includeWhatsApp" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Enviar por WhatsApp
                </Label>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generando contrato...
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
