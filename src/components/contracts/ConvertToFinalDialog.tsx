import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignatureCanvas } from "./SignatureCanvas";
import { FingerprintCapture } from "./FingerprintCapture";
import { ContractPhotoCapture } from "./ContractPhotoCapture";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileSignature, ArrowRight } from "lucide-react";
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

const DEFAULT_TERMS = `TÉRMINOS Y CONDICIONES DEL CONTRATO DE ARRENDAMIENTO DE VEHÍCULO

1. El arrendatario se compromete a usar el vehículo de manera responsable y conforme a las leyes de tránsito vigentes.

2. El arrendatario es responsable de cualquier daño, multa o infracción generada durante el periodo de arrendamiento.

3. El vehículo debe ser devuelto en las mismas condiciones en que fue entregado, salvo desgaste normal por uso.

4. Queda prohibido subarrendar el vehículo o permitir que terceros lo conduzcan sin autorización expresa.

5. El arrendatario debe notificar inmediatamente cualquier accidente, avería o robo del vehículo.

6. El incumplimiento de cualquiera de estas cláusulas puede resultar en la terminación inmediata del contrato.

7. El arrendatario acepta que la firma digital y la huella capturada tienen validez como consentimiento expreso.

Al firmar este documento, el arrendatario declara haber leído y aceptado todos los términos y condiciones.`;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!preliminaryContract) return null;

  const handleConvert = async () => {
    if (!signatureDataUrl) {
      toast.error("Por favor firme el contrato");
      return;
    }

    if (!termsAccepted) {
      toast.error("Debe aceptar los términos y condiciones");
      return;
    }

    if (!contractPhotoDataUrl) {
      toast.error("Debe capturar una foto del contrato");
      return;
    }

    setIsSubmitting(true);

    try {
      const contractId = crypto.randomUUID();
      const contractNumber = `CTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

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

      // Upload contract photo
      const contractPhotoResponse = await fetch(contractPhotoDataUrl);
      const contractPhotoBlob = await contractPhotoResponse.blob();
      const contractPhotoFilename = `contract-photos/${contractId}_photo_${Date.now()}.png`;
      
      const { data: contractPhotoUpload, error: contractPhotoError } = await supabase.storage
        .from("contracts")
        .upload(contractPhotoFilename, contractPhotoBlob);

      if (contractPhotoError) throw contractPhotoError;

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

      // Insert final contract
      const { error: insertError } = await supabase.from("contracts").insert([{
        contract_number: contractNumber,
        contract_type: 'final',
        reservation_id: preliminaryContract.reservation_id,
        vehicle_id: preliminaryContract.vehicle_id,
        customer_id: preliminaryContract.customer_id,
        customer_name: preliminaryContract.customer_name,
        customer_document: preliminaryContract.customer_document,
        customer_email: preliminaryContract.customer_email,
        customer_phone: preliminaryContract.customer_phone,
        start_date: preliminaryContract.start_date,
        end_date: preliminaryContract.end_date,
        total_amount: preliminaryContract.total_amount,
        signature_url: signatureUrl.publicUrl,
        fingerprint_url: fingerprintUrl,
        terms_text: DEFAULT_TERMS,
        terms_accepted: termsAccepted,
        signed_by: user?.id,
        user_agent: navigator.userAgent,
        status: "signed",
        is_locked: true,
      }]);

      if (insertError) throw insertError;

      // Update preliminary contract status (mark as converted)
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ 
          status: 'converted'
        } as any)
        .eq("id", preliminaryContract.id);

      if (updateError) {
        console.error("Error updating preliminary contract:", updateError);
        // Don't fail the whole operation if this fails
      }

      toast.success(`Contrato final ${contractNumber} creado exitosamente`);
      
      // Send email with final contract
      if (preliminaryContract.customer_email) {
        try {
          await supabase.functions.invoke("send-contract-email", {
            body: {
              contractId: contractId,
              customerEmail: preliminaryContract.customer_email,
              customerName: preliminaryContract.customer_name,
              vehiclePlate: vehicleInfo.split('-')[1]?.trim(),
              pdfUrl: signatureUrl.publicUrl,
            },
          });
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
      toast.error("Error al convertir el contrato");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSignatureDataUrl(null);
    setFingerprintDataUrl(null);
    setContractPhotoDataUrl(null);
    setTermsAccepted(false);
  };

  const isFormValid = signatureDataUrl && termsAccepted && contractPhotoDataUrl;

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
            <Label className="text-base font-semibold mb-3 block">Términos y Condiciones</Label>
            <div className="h-48 overflow-y-auto p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {DEFAULT_TERMS}
            </div>
            <div className="flex items-start space-x-2 mt-4">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                He leído y acepto los términos y condiciones del contrato
              </Label>
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
