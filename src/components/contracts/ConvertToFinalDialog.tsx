import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignatureCanvas } from "./SignatureCanvas";
import { FingerprintCapture } from "./FingerprintCapture";
import { ContractPhotoCapture } from "./ContractPhotoCapture";
import { DocumentPhotoCapture } from "./DocumentPhotoCapture";
import { LegalDocumentsModal, TERMINOS_CONDICIONES } from "./LegalDocumentsModal";
import { generateContractHTML, ContractData } from "@/utils/contractTemplate";
import { getApiUrl } from "@/utils/apiUrl";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileSignature, ArrowRight, FileText, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PreliminaryContract {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_document: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  terms_text: string;
  reservation_id: string | null;
  pdf_url: string;
  servicio_viajar?: string;
  termino_contrato?: string;
  km_adicional?: string;
  vehiculo_km_salida?: string;
  conductor2_nombre?: string;
  conductor2_tipo_doc?: string;
  conductor2_documento?: string;
  conductor2_licencia?: string;
  conductor2_licencia_vencimiento?: string;
  conductor3_nombre?: string;
  conductor3_tipo_doc?: string;
  conductor3_documento?: string;
  conductor3_licencia?: string;
  conductor3_licencia_vencimiento?: string;
}

interface ConvertToFinalDialogProps {
  preliminaryContract: PreliminaryContract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vehicleInfo: string;
}

const DEFAULT_TERMS = TERMINOS_CONDICIONES;

export const ConvertToFinalDialog = ({ 
  preliminaryContract, 
  open, 
  onOpenChange, 
  onSuccess,
  vehicleInfo 
}: ConvertToFinalDialogProps) => {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [fingerprintDataUrl, setFingerprintDataUrl] = useState<string | null>(null);
  const [contractPhotoDataUrl, setContractPhotoDataUrl] = useState<string | null>(null);
  const [documentPhotos, setDocumentPhotos] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDocFront, setCustomerDocFront] = useState<string | null>(null);
  const [customerDocBack, setCustomerDocBack] = useState<string | null>(null);

  if (!preliminaryContract) return null;

  // Load customer document URLs
  const loadCustomerDocs = async () => {
    if (!preliminaryContract?.customer_id) return;
    try {
      const { data } = await supabase
        .from("customers")
        .select("documento_frente_url, documento_reverso_url, tipo_documento")
        .eq("id", preliminaryContract.customer_id)
        .single();
      if (data) {
        const getSignedUrl = async (publicUrl: string): Promise<string | null> => {
          if (!publicUrl) return null;
          const parts = publicUrl.split('/contracts/');
          if (parts.length < 2) return publicUrl;
          const filePath = decodeURIComponent(parts[parts.length - 1]);
          const { data: signed, error } = await supabase.storage.from("contracts").createSignedUrl(filePath, 3600);
          return error ? publicUrl : signed.signedUrl;
        };
        // Load BOTH URLs before setting state
        const frontUrl = data.documento_frente_url ? await getSignedUrl(data.documento_frente_url) : null;
        const backUrl = data.documento_reverso_url ? await getSignedUrl(data.documento_reverso_url) : null;
        // Set both at once to avoid partial render
        setCustomerDocFront(frontUrl);
        setCustomerDocBack(backUrl);
      }
    } catch (e) {
      console.error("Error loading customer docs:", e);
    }
  };

  // Trigger load when dialog opens
  if (open && !customerDocFront && !customerDocBack) {
    loadCustomerDocs();
  }

  if (!preliminaryContract) return null;

  // Detectar tipo de documento basado en el número de documento
  const getDocumentType = (): "cedula" | "pasaporte" | "" => {
    const doc = preliminaryContract.customer_document || "";
    // Si tiene más de 10 caracteres o contiene letras, es pasaporte
    if (doc.length > 10 || /[a-zA-Z]/.test(doc)) {
      return "pasaporte";
    }
    // Si es numérico y menor a 11 dígitos, es cédula
    if (/^\d+$/.test(doc) && doc.length <= 10) {
      return "cedula";
    }
    return "cedula"; // Por defecto asumir cédula
  };

  const documentType = getDocumentType();
  const needsBackPhoto = documentType === "cedula";

  const handleConvert = async () => {
    if (!signatureDataUrl) {
      toast.error("Por favor firme el contrato");
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      toast.error("Debe aceptar los términos y condiciones y la política de datos");
      return;
    }

    if (!contractPhotoDataUrl) {
      toast.error("Debe capturar una foto del cliente");
      return;
    }

    if (!documentPhotos.front) {
      toast.error("Debe capturar la foto del documento de identidad");
      return;
    }

    if (needsBackPhoto && !documentPhotos.back) {
      toast.error("Debe capturar ambos lados de la cédula");
      return;
    }

    setIsSubmitting(true);

    try {
      // Helper: convert URL to base64 data URL (needed for Puppeteer rendering)
      const urlToBase64 = async (url: string): Promise<string> => {
        if (url.startsWith('data:')) return url;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          return url;
        }
      };

      // Convert document photos to base64 if they are URLs
      const docFrenteBase64 = documentPhotos.front ? await urlToBase64(documentPhotos.front) : null;
      const docReversoBase64 = documentPhotos.back ? await urlToBase64(documentPhotos.back) : null;

      // Usar el mismo ID del contrato preliminar
      const contractId = preliminaryContract.id;
      // Mantener el mismo número de contrato
      const contractNumber = preliminaryContract.contract_number;

      // Upload signature
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

      // Upload contract photo (foto del cliente)
      const contractPhotoResponse = await fetch(contractPhotoDataUrl);
      const contractPhotoBlob = await contractPhotoResponse.blob();
      const contractPhotoFilename = `photos/${contractId}_photo_${Date.now()}.png`;
      
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

      // Upload document front photo (skip if already a Supabase URL)
      let documentFrontUrl: string | undefined;
      if (documentPhotos.front) {
        if (documentPhotos.front.startsWith('data:')) {
          // New capture - upload to storage
          const docFrontResponse = await fetch(documentPhotos.front);
          const docFrontBlob = await docFrontResponse.blob();
          const docFrontFilename = `documents/${contractId}_doc_front_${Date.now()}.png`;
          const { data: docFrontUpload, error: docFrontError } = await supabase.storage
            .from("contracts")
            .upload(docFrontFilename, docFrontBlob);
          if (docFrontError) throw docFrontError;
          const { data: docFrontUrlData } = supabase.storage
            .from("contracts")
            .getPublicUrl(docFrontUpload.path);
          documentFrontUrl = docFrontUrlData.publicUrl;
        } else {
          // Already a URL from customer record - reuse it
          documentFrontUrl = documentPhotos.front;
        }
      }

      // Upload document back photo (skip if already a Supabase URL)
      let documentBackUrl: string | undefined;
      if (documentPhotos.back && needsBackPhoto) {
        if (documentPhotos.back.startsWith('data:')) {
          const docBackResponse = await fetch(documentPhotos.back);
          const docBackBlob = await docBackResponse.blob();
          const docBackFilename = `documents/${contractId}_doc_back_${Date.now()}.png`;
          const { data: docBackUpload, error: docBackError } = await supabase.storage
            .from("contracts")
            .upload(docBackFilename, docBackBlob);
          if (docBackError) throw docBackError;
          const { data: docBackUrlData } = supabase.storage
            .from("contracts")
            .getPublicUrl(docBackUpload.path);
          documentBackUrl = docBackUrlData.publicUrl;
        } else {
          documentBackUrl = documentPhotos.back;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Obtener datos del vehículo y cliente para regenerar el PDF
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("brand, model, plate, color")
        .eq("id", preliminaryContract.vehicle_id)
        .single();

      const { data: customerData } = await supabase
        .from("customers")
        .select("license_number, license_expiry, address, city, tipo_documento")
        .eq("id", preliminaryContract.customer_id)
        .single();

      // Calcular días
      const startDate = new Date(preliminaryContract.start_date);
      const endDate = new Date(preliminaryContract.end_date);
      const dias = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Generar PDF final con firma y fotos
      const templateData: ContractData = {
        cliente_nombre: preliminaryContract.customer_name,
        cliente_tipo_documento: customerData?.tipo_documento || 'cedula',
        cliente_documento: preliminaryContract.customer_document,
        cliente_licencia: customerData?.license_number || 'N/A',
        cliente_licencia_vencimiento: customerData?.license_expiry || 'N/A',
        cliente_direccion: customerData?.address || 'N/A',
        cliente_telefono: preliminaryContract.customer_phone || 'N/A',
        cliente_ciudad: customerData?.city || 'Colombia',
        cliente_email: preliminaryContract.customer_email || 'N/A',
        vehiculo_marca: vehicleData ? `${vehicleData.brand} ${vehicleData.model}` : vehicleInfo,
        vehiculo_placa: vehicleData?.plate || '',
        vehiculo_color: vehicleData?.color || 'N/A',
        vehiculo_km_salida: 'N/A',
        fecha_inicio: format(startDate, "dd/MM/yyyy", { locale: es }),
        hora_inicio: format(startDate, "HH:mm", { locale: es }),
        fecha_fin: format(endDate, "dd/MM/yyyy", { locale: es }),
        hora_fin: format(endDate, "HH:mm", { locale: es }),
        dias: dias,
        servicio: 'Turismo',
        valor_dia: Math.round(preliminaryContract.total_amount / dias),
        valor_dias: preliminaryContract.total_amount,
        valor_adicional: 0,
        subtotal: preliminaryContract.total_amount,
        descuento: 0,
        total_contrato: preliminaryContract.total_amount,
        iva: Math.round(preliminaryContract.total_amount * 0.19),
        total: Math.round(preliminaryContract.total_amount * 1.19),
        valor_reserva: 0,
        forma_pago: 'N/A',
        numero_contrato: contractNumber,
        fecha_contrato: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }),
        deducible: 'Según póliza',
        // Nuevas casillas del contrato
        servicio_viajar: preliminaryContract.servicio_viajar || '',
        termino_contrato: preliminaryContract.termino_contrato || '',
        km_adicional: preliminaryContract.km_adicional || '',
        vehiculo_km_salida: preliminaryContract.vehiculo_km_salida || 'N/A',
        conductor2_nombre: preliminaryContract.conductor2_nombre || '',
        conductor2_tipo_doc: preliminaryContract.conductor2_tipo_doc || '',
        conductor2_documento: preliminaryContract.conductor2_documento || '',
        conductor2_licencia: preliminaryContract.conductor2_licencia || '',
        conductor2_licencia_vencimiento: preliminaryContract.conductor2_licencia_vencimiento || '',
        conductor3_nombre: preliminaryContract.conductor3_nombre || '',
        conductor3_tipo_doc: preliminaryContract.conductor3_tipo_doc || '',
        conductor3_documento: preliminaryContract.conductor3_documento || '',
        conductor3_licencia: preliminaryContract.conductor3_licencia || '',
        conductor3_licencia_vencimiento: preliminaryContract.conductor3_licencia_vencimiento || '',
        // Campos del contrato firmado - usar base64 para el PDF
        es_preliminar: false,
        firma_base64: signatureDataUrl || undefined,
        huella_base64: fingerprintDataUrl || undefined,
        foto_cliente_base64: contractPhotoDataUrl || undefined,
        documento_frente_base64: docFrenteBase64 || undefined,
        documento_reverso_base64: docReversoBase64 || undefined,
        // También guardar URLs para referencia
        firma_url: signatureUrl.publicUrl,
        huella_url: fingerprintUrl,
        foto_cliente_url: contractPhotoUrl.publicUrl,
        documento_frente_url: documentFrontUrl,
        documento_reverso_url: documentBackUrl,
      };

      console.log("[ConvertToFinal] Generando PDF final con datos:", templateData);

      // Generar HTML del contrato final
      const html = generateContractHTML(templateData);

      // Llamar al backend para generar el PDF
      const pdfResponse = await fetch(getApiUrl('/api/generate-pdf'), {
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

      if (!pdfResponse.ok) {
        throw new Error('Error al generar PDF final');
      }

      const pdfResult = await pdfResponse.json();
      
      if (!pdfResult.pdf_base64) {
        throw new Error('No se recibió el PDF del servidor');
      }

      // Convertir base64 a blob
      const byteCharacters = atob(pdfResult.pdf_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

      // Subir PDF final
      const pdfFilename = `final/${contractId}_final_${Date.now()}.pdf`;
      const { data: pdfUpload, error: pdfUploadError } = await supabase.storage
        .from("contracts")
        .upload(pdfFilename, pdfBlob);

      if (pdfUploadError) {
        throw new Error(`Error al subir PDF: ${pdfUploadError.message}`);
      }

      const { data: finalPdfUrl } = supabase.storage
        .from("contracts")
        .getPublicUrl(pdfUpload.path);

      console.log("[ConvertToFinal] PDF final subido:", finalPdfUrl.publicUrl);

      // Actualizar el contrato existente (cambiar de preliminary a signed)
      const updateData: Record<string, any> = {
        signature_url: signatureUrl.publicUrl,
        photo_url: contractPhotoUrl.publicUrl,
        pdf_url: finalPdfUrl.publicUrl, // Nueva URL del PDF final
        terms_accepted: true,
        signed_by: user?.id,
        user_agent: navigator.userAgent,
        status: "signed",
        is_locked: false,
      };

      // Agregar campos opcionales
      if (fingerprintUrl) {
        updateData.fingerprint_url = fingerprintUrl;
      }
      if (documentFrontUrl) {
        updateData.document_front_url = documentFrontUrl;
      }
      if (documentBackUrl) {
        updateData.document_back_url = documentBackUrl;
      }

      console.log("[ConvertToFinal] Actualizando contrato:", contractId, updateData);

      const { error: updateError, data: updatedContract } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", contractId)
        .select();

      if (updateError) {
        console.error("Error actualizando contrato:", updateError);
        throw new Error(`Error al actualizar contrato: ${updateError.message}`);
      }

      console.log("[ConvertToFinal] Contrato actualizado:", updatedContract);

      toast.success(`Contrato ${contractNumber} firmado exitosamente`);
      
      // Send email with final contract using FastAPI backend
      if (preliminaryContract.customer_email) {
        try {
          const response = await fetch(getApiUrl('/api/send-contract-email'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: [preliminaryContract.customer_email],
              contract_pdf_url: finalPdfUrl.publicUrl, // Usar el nuevo PDF final
              contract_data: {
                cliente_nombre: preliminaryContract.customer_name,
                vehiculo_marca: vehicleInfo,
                vehiculo_placa: vehicleData?.plate || '',
                fecha_inicio: format(startDate, "dd/MM/yyyy", { locale: es }),
                fecha_fin: format(endDate, "dd/MM/yyyy", { locale: es }),
                dias_totales: dias,
                valor_total: preliminaryContract.total_amount,
                fecha_firma: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
              }
            })
          });
          
          if (response.ok) {
            toast.success("Contrato enviado por email al cliente");
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // No fallar si el email falla
        }
      }

      onSuccess();
      onOpenChange(false);
      resetForm();

    } catch (error: any) {
      console.error("Error converting to final contract:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error(`Error al firmar: ${error?.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSignatureDataUrl(null);
    setFingerprintDataUrl(null);
    setContractPhotoDataUrl(null);
    setDocumentPhotos({ front: null, back: null });
    setTermsAccepted(false);
    setPrivacyAccepted(false);
  };

  const isFormValid = signatureDataUrl && termsAccepted && privacyAccepted && 
                      contractPhotoDataUrl && documentPhotos.front && 
                      (needsBackPhoto ? documentPhotos.back : true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Convertir a Contrato Final
          </DialogTitle>
          <DialogDescription>
            Complete la firma digital para generar el contrato final
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Info */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              Datos del Contrato Preliminar
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">No. Preliminar:</span>
                <p className="font-medium">{preliminaryContract.contract_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{preliminaryContract.customer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Documento:</span>
                <p className="font-medium">{preliminaryContract.customer_document}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vehículo:</span>
                <p className="font-medium">{vehicleInfo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Periodo:</span>
                <p className="font-medium">
                  {format(new Date(preliminaryContract.start_date), "dd MMM yyyy", { locale: es })} - {format(new Date(preliminaryContract.end_date), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total:</span>
                <p className="font-medium">${preliminaryContract.total_amount.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {/* Signature Section */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Firma del Cliente *</h4>
            <SignatureCanvas onSignatureChange={setSignatureDataUrl} />
            {signatureDataUrl && (
              <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">✓ Firma capturada</p>
              </div>
            )}
          </Card>

          {/* Fingerprint Section */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Huella Digital (Opcional)</h4>
            <FingerprintCapture onFingerprintChange={setFingerprintDataUrl} />
            {fingerprintDataUrl && (
              <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">✓ Huella capturada</p>
              </div>
            )}
          </Card>

          {/* Contract Photo */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Foto del Cliente *</h4>
            <ContractPhotoCapture onPhotoChange={setContractPhotoDataUrl} />
            {contractPhotoDataUrl && (
              <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">✓ Foto del cliente capturada</p>
              </div>
            )}
          </Card>

          {/* Document Photo */}
          <DocumentPhotoCapture 
            documentType={documentType}
            onPhotosChange={setDocumentPhotos}
            initialFrontUrl={customerDocFront}
            initialBackUrl={customerDocBack}
          />

          {/* Terms */}
          <Card className="p-6">
            <Label className="text-base font-semibold mb-3 block">Documentos Legales</Label>
            
            <div className="space-y-4">
              {/* Términos y Condiciones */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <LegalDocumentsModal 
                      type="terms"
                      trigger={
                        <button type="button" className="text-primary hover:underline font-medium text-left">
                          Términos y Condiciones
                        </button>
                      }
                    />
                  </div>
                  <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    He leído y acepto los términos y condiciones del contrato de arrendamiento *
                  </Label>
                </div>
              </div>

              {/* Política de Tratamiento de Datos */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <LegalDocumentsModal 
                      type="privacy"
                      trigger={
                        <button type="button" className="text-primary hover:underline font-medium text-left">
                          Política de Tratamiento de Datos Personales
                        </button>
                      }
                    />
                  </div>
                  <Label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">
                    Autorizo el tratamiento de mis datos personales según la política de EUROCAR RENTAL SAS *
                  </Label>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvert}
              disabled={!isFormValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando contrato final...
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Generar Contrato Final
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
