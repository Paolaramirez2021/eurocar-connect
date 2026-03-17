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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!preliminaryContract) return null;

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

    setIsSubmitting(true);

    try {
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Actualizar el contrato existente (cambiar de preliminary a signed)
      // Nota: Solo usamos campos que existen en la tabla contracts
      const updateData: Record<string, any> = {
        signature_url: signatureUrl.publicUrl,
        terms_accepted: true,
        signed_by: user?.id,
        user_agent: navigator.userAgent,
        status: "signed",
      };

      // Agregar huella si existe
      if (fingerprintUrl) {
        updateData.fingerprint_url = fingerprintUrl;
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
          const response = await fetch('/api/send-contract-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: [preliminaryContract.customer_email],
              contract_pdf_url: preliminaryContract.pdf_url,
              contract_data: {
                cliente_nombre: preliminaryContract.customer_name,
                vehiculo_marca: vehicleInfo,
                vehiculo_placa: vehicleInfo.split('-')[1]?.trim() || '',
                fecha_inicio: format(new Date(preliminaryContract.start_date), "dd/MM/yyyy", { locale: es }),
                fecha_fin: format(new Date(preliminaryContract.end_date), "dd/MM/yyyy", { locale: es }),
                dias_totales: Math.ceil((new Date(preliminaryContract.end_date).getTime() - new Date(preliminaryContract.start_date).getTime()) / (1000 * 60 * 60 * 24)),
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

    } catch (error) {
      console.error("Error converting to final contract:", error);
      toast.error("Error al firmar el contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSignatureDataUrl(null);
    setFingerprintDataUrl(null);
    setContractPhotoDataUrl(null);
    setTermsAccepted(false);
    setPrivacyAccepted(false);
  };

  const isFormValid = signatureDataUrl && termsAccepted && privacyAccepted && contractPhotoDataUrl;

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
            <h4 className="font-semibold mb-4">Foto del Contrato *</h4>
            <ContractPhotoCapture onPhotoChange={setContractPhotoDataUrl} />
            {contractPhotoDataUrl && (
              <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">✓ Foto capturada</p>
              </div>
            )}
          </Card>

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
