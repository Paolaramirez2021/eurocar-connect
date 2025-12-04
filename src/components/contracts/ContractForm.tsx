import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureCanvas } from "./SignatureCanvas";
import { FingerprintCapture } from "./FingerprintCapture";
import { ContractPhotoCapture } from "./ContractPhotoCapture";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Loader2, Search } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import jsPDF from "jspdf";

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

interface ContractFormData {
  reservationId?: string;
  vehicleId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  termsAccepted: boolean;
}

const DEFAULT_TERMS = `TÉRMINOS Y CONDICIONES DEL CONTRATO DE ARRENDAMIENTO DE VEHÍCULO

1. El arrendatario se compromete a usar el vehículo de manera responsable y conforme a las leyes de tránsito vigentes.

2. El arrendatario es responsable de cualquier daño, multa o infracción generada durante el periodo de arrendamiento.

3. El vehículo debe ser devuelto en las mismas condiciones en que fue entregado, salvo desgaste normal por uso.

4. Queda prohibido subarrendar el vehículo o permitir que terceros lo conduzcan sin autorización expresa.

5. El arrendatario debe notificar inmediatamente cualquier accidente, avería o robo del vehículo.

6. El incumplimiento de cualquiera de estas cláusulas puede resultar en la terminación inmediata del contrato.

7. El arrendatario acepta que la firma digital y la huella capturada tienen validez como consentimiento expreso.

Al firmar este documento, el arrendatario declara haber leído y aceptado todos los términos y condiciones.`;

export const ContractForm = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchDocument, setSearchDocument] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [fingerprintDataUrl, setFingerprintDataUrl] = useState<string | null>(null);
  const [contractPhotoDataUrl, setContractPhotoDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOnline, saveOffline, pendingCount } = useOfflineSync();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ContractFormData>({
    defaultValues: {
      reservationId: "",
      vehicleId: "",
      customerId: "",
      startDate: "",
      endDate: "",
      totalAmount: 0,
      termsAccepted: false,
    }
  });

  const selectedVehicleId = watch("vehicleId");
  const selectedCustomerId = watch("customerId");
  const termsAccepted = watch("termsAccepted");

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

      // Load active reservations for this customer
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
      } else {
        toast.info("No hay reservas activas para este cliente");
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

  const generatePDF = async (contractData: any, contractNumber: string): Promise<string> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text("CONTRATO DE ARRENDAMIENTO", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Contrato No: ${contractNumber}`, pageWidth / 2, 30, { align: "center" });
    
    // Contract details
    let yPos = 45;
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
    
    // Signature
    if (signatureDataUrl) {
      yPos = doc.internal.pageSize.getHeight() - 60;
      doc.addImage(signatureDataUrl, "PNG", 20, yPos, 60, 20);
      doc.text("_________________________", 20, yPos + 25);
      doc.text("Firma del Cliente", 20, yPos + 30);
    }
    
    // Fingerprint
    if (fingerprintDataUrl) {
      const xPos = pageWidth - 80;
      yPos = doc.internal.pageSize.getHeight() - 60;
      doc.addImage(fingerprintDataUrl, "PNG", xPos, yPos, 30, 30);
      doc.text("Huella Digital", xPos, yPos + 35);
    }
    
    // Generate blob and return data URL
    const pdfBlob = doc.output("blob");
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(pdfBlob);
    });
  };

  const onSubmit = async (data: ContractFormData) => {
    if (!signatureDataUrl) {
      toast.error("Por favor firme el contrato");
      return;
    }

    if (!data.termsAccepted) {
      toast.error("Debe aceptar los términos y condiciones");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get vehicle info (from list or from selected reservation)
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

      const customer = selectedCustomer;

      if (!vehicle || !customer) {
        toast.error("Error: Vehículo o cliente no encontrado");
        return;
      }

      const contractId = crypto.randomUUID();
      const contractNumber = `CTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

      const contractData = {
        id: contractId,
        reservationId: data.reservationId,
        vehicleId: data.vehicleId,
        customerId: data.customerId,
        customerName: `${customer.nombres} ${customer.primer_apellido} ${customer.segundo_apellido || ''}`.trim(),
        customerDocument: customer.cedula_pasaporte,
        customerEmail: customer.email,
        customerPhone: customer.celular,
        startDate: data.startDate,
        endDate: data.endDate,
        totalAmount: data.totalAmount,
        signatureDataUrl: signatureDataUrl,
        fingerprintDataUrl: fingerprintDataUrl,
        termsText: DEFAULT_TERMS,
        termsAccepted: data.termsAccepted,
        signedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      if (!isOnline) {
        // Save offline
        await saveOffline(contractData);
        toast.success("Contrato guardado offline. Se sincronizará automáticamente.");
        resetForm();
        return;
      }

      // Upload signature to Supabase Storage
      const signatureResponse = await fetch(signatureDataUrl);
      const signatureBlob = await signatureResponse.blob();
      const signatureFilename = `signatures/${contractId}_signature_${Date.now()}.png`;
      
      const { data: signatureUpload, error: signatureError } = await supabase.storage
        .from("contracts")
        .upload(signatureFilename, signatureBlob);

      if (signatureError) throw signatureError;

      const { data: signatureUrl } = supabase.storage
        .from("contracts")
        .getPublicUrl(signatureUpload.path);

      // Upload contract photo
      const contractPhotoResponse = await fetch(contractPhotoDataUrl);
      const contractPhotoBlob = await contractPhotoResponse.blob();
      const contractPhotoFilename = `contract-photos/${contractId}_photo_${Date.now()}.png`;
      
      const { data: contractPhotoUpload, error: contractPhotoError } = await supabase.storage
        .from("contracts")
        .upload(contractPhotoFilename, contractPhotoBlob);

      if (contractPhotoError) throw contractPhotoError;

      const { data: contractPhotoUrl } = supabase.storage
        .from("contracts")
        .getPublicUrl(contractPhotoUpload.path);

      // Upload fingerprint if exists
      let fingerprintUrl: string | undefined;
      if (fingerprintDataUrl) {
        const fingerprintResponse = await fetch(fingerprintDataUrl);
        const fingerprintBlob = await fingerprintResponse.blob();
        const fingerprintFilename = `fingerprints/${contractId}_fingerprint_${Date.now()}.png`;
        
        const { data: fingerprintUpload, error: fingerprintError } = await supabase.storage
          .from("contracts")
          .upload(fingerprintFilename, fingerprintBlob);

        if (fingerprintError) throw fingerprintError;

        const { data: fingerprintUrlData } = supabase.storage
          .from("contracts")
          .getPublicUrl(fingerprintUpload.path);

        fingerprintUrl = fingerprintUrlData.publicUrl;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert contract
      const { error: insertError } = await supabase.from("contracts").insert([{
        contract_number: contractNumber,
        reservation_id: data.reservationId,
        vehicle_id: data.vehicleId,
        customer_id: data.customerId,
        customer_name: contractData.customerName,
        customer_document: contractData.customerDocument,
        customer_email: contractData.customerEmail,
        customer_phone: contractData.customerPhone,
        start_date: data.startDate,
        end_date: data.endDate,
        total_amount: data.totalAmount,
        signature_url: signatureUrl.publicUrl,
        fingerprint_url: fingerprintUrl,
        terms_text: DEFAULT_TERMS,
        terms_accepted: data.termsAccepted,
        signed_by: user?.id,
        user_agent: navigator.userAgent,
        status: "signed",
      }]);

      if (insertError) throw insertError;

      toast.success(`Contrato ${contractNumber} firmado exitosamente`);
      resetForm();

    } catch (error) {
      console.error("Error creating contract:", error);
      toast.error("Error al crear el contrato");
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
    setValue("termsAccepted", false);
    setSignatureDataUrl(null);
    setFingerprintDataUrl(null);
    setContractPhotoDataUrl(null);
    setSelectedCustomer(null);
    setSelectedReservation(null);
    setSearchDocument("");
    setReservations([]);
  };

  const isFormValid = selectedVehicleId && selectedCustomerId && watch("startDate") && 
                      watch("endDate") && watch("totalAmount") > 0 && 
                      signatureDataUrl && termsAccepted;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!isOnline && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Sin conexión - Los contratos se guardarán localmente y se sincronizarán automáticamente
            {pendingCount > 0 && ` (${pendingCount} pendiente${pendingCount > 1 ? 's' : ''})`}
          </p>
        </Card>
      )}

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
            <p className="text-sm text-muted-foreground">
              {selectedCustomer.cedula_pasaporte} • {selectedCustomer.celular}
            </p>
          </div>
        )}

        {reservations.length > 0 && (
          <div className="space-y-2 mb-4">
            <Label>Reservas Activas</Label>
            <Select onValueChange={loadReservationData}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una reserva para cargar datos" />
              </SelectTrigger>
              <SelectContent>
                {reservations.map((reservation) => (
                  <SelectItem key={reservation.id} value={reservation.id}>
                    {reservation.vehicles.marca} {reservation.vehicles.modelo} ({reservation.vehicles.placa}) - 
                    {new Date(reservation.fecha_inicio).toLocaleDateString()} a {new Date(reservation.fecha_fin).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Datos del Contrato
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerId">Cliente *</Label>
            <Select 
              value={watch("customerId") || ""} 
              onValueChange={(value) => setValue("customerId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.nombres} {customer.primer_apellido} - {customer.cedula_pasaporte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehículo *</Label>
            {selectedReservation ? (
              <div className="p-3 bg-muted rounded-lg border">
                <p className="font-medium">
                  {selectedReservation.vehicles.marca} {selectedReservation.vehicles.modelo}
                </p>
                <p className="text-sm text-muted-foreground">
                  Placa: {selectedReservation.vehicles.placa}
                </p>
              </div>
            ) : (
              <Select 
                value={watch("vehicleId") || ""} 
                onValueChange={(value) => setValue("vehicleId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.marca} {vehicle.modelo} - {vehicle.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha Inicio *</Label>
            <Input
              id="startDate"
              type="datetime-local"
              {...register("startDate", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha Fin *</Label>
            <Input
              id="endDate"
              type="datetime-local"
              {...register("endDate", { required: true })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="totalAmount">Valor Total (COP) *</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              {...register("totalAmount", { required: true, min: 0 })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Términos y Condiciones</h3>
        <ScrollArea className="h-64 w-full rounded-md border p-4 mb-4">
          <div className="text-sm whitespace-pre-line">
            {DEFAULT_TERMS}
          </div>
        </ScrollArea>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="termsAccepted"
            checked={termsAccepted}
            onCheckedChange={(checked) => setValue("termsAccepted", checked as boolean)}
          />
          <Label htmlFor="termsAccepted" className="cursor-pointer">
            Acepto los términos y condiciones del contrato *
          </Label>
        </div>
      </Card>

      <SignatureCanvas onSignatureChange={setSignatureDataUrl} />

      <ContractPhotoCapture onPhotoChange={setContractPhotoDataUrl} />

      <FingerprintCapture onFingerprintChange={setFingerprintDataUrl} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isFormValid || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5 mr-2" />
            Firmar y Guardar Contrato
          </>
        )}
      </Button>
    </form>
  );
};
