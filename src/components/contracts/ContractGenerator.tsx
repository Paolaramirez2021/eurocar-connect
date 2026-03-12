import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ContractTemplate } from './ContractTemplate';
import { SignatureCanvas } from './SignatureCanvas';
import { FingerprintCapture } from './FingerprintCapture';
import { ContractPhotoCapture } from './ContractPhotoCapture';
import { ContractService, ContractGenerationData } from '@/services/ContractService';
import { FileText, Download, Send, Check } from 'lucide-react';
import ReactToPrint from 'react-to-print';

interface ContractGeneratorProps {
  reservationData: any;
  onComplete?: (contractId: string) => void;
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({ 
  reservationData,
  onComplete 
}) => {
  const [step, setStep] = useState(1);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const contractRef = useRef<HTMLDivElement>(null);

  // Preparar datos del contrato desde la reserva
  const prepareContractData = (): ContractGenerationData => {
    const cliente = reservationData.customers || {};
    const vehiculo = reservationData.vehicles || {};
    
    const fechaInicio = new Date(reservationData.fecha_inicio);
    const fechaFin = new Date(reservationData.fecha_fin);
    const dias = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    
    const subtotal = reservationData.subtotal || (reservationData.valor_total / 1.19);
    const iva = reservationData.valor_total - subtotal;
    
    return {
      reservation_id: reservationData.id,
      cliente_nombre: cliente.nombre || '',
      cliente_documento: cliente.documento || '',
      cliente_licencia: cliente.licencia || '',
      cliente_direccion: cliente.direccion || '',
      cliente_telefono: cliente.telefono || '',
      cliente_ciudad: cliente.ciudad || 'BOGOTÁ',
      cliente_email: cliente.email || '',
      vehiculo_marca: `${vehiculo.marca} ${vehiculo.modelo}`,
      vehiculo_placa: vehiculo.placa || '',
      vehiculo_color: vehiculo.color || '',
      vehiculo_km_salida: vehiculo.kilometraje_actual || 0,
      fecha_inicio: fechaInicio.toLocaleDateString('es-CO'),
      fecha_fin: fechaFin.toLocaleDateString('es-CO'),
      dias_totales: dias,
      hora_inicio: '08:00 AM',
      hora_terminacion: '08:00 AM',
      tarifa_diaria: vehiculo.tarifa_dia_iva || 0,
      subtotal: Math.round(subtotal),
      descuento: reservationData.descuento || 0,
      iva: Math.round(iva),
      valor_total: reservationData.valor_total || 0,
      valor_reserva: reservationData.valor_anticipo || 0,
      forma_pago: reservationData.forma_pago || 'Efectivo',
      firma_cliente_base64: signatureData || undefined,
      huella_cliente_base64: fingerprintData || undefined,
      foto_cliente_base64: photoData || undefined,
      fecha_firma: new Date().toLocaleDateString('es-CO')
    };
  };

  const handleGenerateContract = async () => {
    if (!signatureData) {
      toast.error('Por favor firma el contrato');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Preparar datos del contrato
      const data = prepareContractData();
      
      console.log('[ContractGenerator] Procesando contrato...');
      
      // Procesar contrato (crear en BD y subir assets)
      const result = await ContractService.processContract(data);
      
      setContractData({
        ...data,
        firma_cliente_url: result.contract.firma_url,
        huella_cliente_url: result.contract.huella_url,
        foto_cliente_url: result.contract.foto_url,
        contrato_numero: result.contract.id.slice(0, 8).toUpperCase(),
        ip_address: result.contract.ip_address
      });
      
      toast.success('Contrato generado exitosamente');
      setStep(3); // Ir a vista previa
      
      if (onComplete) {
        onComplete(result.contract.id);
      }
      
    } catch (error: any) {
      console.error('[ContractGenerator] Error:', error);
      toast.error(`Error al generar contrato: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Por ahora, usar print to PDF del navegador
      window.print();
      toast.success('Descargando contrato...');
    } catch (error: any) {
      toast.error('Error al descargar PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!contractData) return;
    
    try {
      toast.info('Enviando contrato por email...');
      
      await ContractService.sendContractEmail(
        contractData.cliente_email,
        pdfUrl,
        contractData
      );
      
      toast.success('Contrato enviado exitosamente');
    } catch (error: any) {
      toast.error('Error al enviar email');
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm">Captura</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 mx-4">
          <div className={`h-full bg-primary transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm">Generar</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 mx-4">
          <div className={`h-full bg-primary transition-all ${step >= 3 ? 'w-full' : 'w-0'}`} />
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-sm">Finalizar</span>
        </div>
      </div>

      {/* Step 1: Captura de Firma, Huella y Foto */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Firma Digital</CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureCanvas onSignatureChange={setSignatureData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Huella Digital (Opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <FingerprintCapture onFingerprintChange={setFingerprintData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Foto del Cliente (Opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractPhotoCapture onPhotoChange={setPhotoData} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Vista Previa y Generación */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa del Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50 max-h-[600px] overflow-auto">
              <ContractTemplate 
                data={prepareContractData()} 
                forPDF={false}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Contrato Generado */}
      {step === 3 && contractData && (
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <Check className="mr-2" />
                Contrato Generado Exitosamente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <ReactToPrint
                  trigger={() => (
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </Button>
                  )}
                  content={() => contractRef.current}
                />
                <Button onClick={handleSendEmail} variant="outline">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar por Email
                </Button>
              </div>
            </CardContent>
          </Card>

          <div ref={contractRef} className="print:block">
            <ContractTemplate 
              data={contractData} 
              forPDF={true}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        {step > 1 && step < 3 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Atrás
          </Button>
        )}
        
        {step === 1 && (
          <Button 
            onClick={() => setStep(2)} 
            disabled={!signatureData}
            className="ml-auto"
          >
            Continuar
          </Button>
        )}
        
        {step === 2 && (
          <Button 
            onClick={handleGenerateContract} 
            disabled={isProcessing}
            className="ml-auto"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isProcessing ? 'Generando...' : 'Generar Contrato'}
          </Button>
        )}
      </div>
    </div>
  );
};
