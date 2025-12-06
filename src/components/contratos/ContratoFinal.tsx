import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, Save, Camera, Fingerprint, PenTool } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';
import { generarContratoFinalPDF } from "@/lib/contratoGenerator";
import { useFingerprint } from "@/hooks/useFingerprint";

const ContratoFinal = () => {
  const [reservas, setReservas] = useState([]);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [firma, setFirma] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  
  const sigCanvas = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Hook para captura de huella digital
  const { 
    isReaderAvailable, 
    isCapturing, 
    fingerprintImage, 
    captureFingerprint, 
    clearFingerprint 
  } = useFingerprint();

  useEffect(() => {
    cargarReservas();
    return () => {
      // Limpiar stream de cámara al desmontar
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const cargarReservas = async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        customers (*),
        vehicles (*)
      `)
      .eq("status", "confirmed")
      .order("fecha_inicio", { ascending: false });
    
    if (error) {
      toast.error("Error al cargar reservas");
      return;
    }
    setReservas(data || []);
  };

  const limpiarFirma = () => {
    sigCanvas.current?.clear();
    setFirma(null);
  };

  const guardarFirma = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Por favor firme primero");
      return;
    }
    const dataURL = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    setFirma(dataURL);
    toast.success("Firma capturada");
  };

  const iniciarCamara = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      toast.success("Cámara iniciada");
    } catch (error) {
      toast.error("Error al acceder a la cámara");
      console.error(error);
    }
  };

  const capturarFoto = () => {
    if (!videoRef.current || !stream) {
      toast.error("Inicia la cámara primero");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      setFoto(dataURL);
      
      // Detener stream
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      
      toast.success("Foto capturada");
    }
  };

  const handleGenerarPDF = async () => {
    if (!reservaSeleccionada) {
      toast.error("Selecciona una reserva");
      return;
    }

    if (!firma) {
      toast.error("Se requiere la firma del cliente");
      return;
    }

    if (!foto) {
      toast.error("Se requiere la foto del cliente");
      return;
    }

    setLoading(true);
    try {
      const diasDiff = Math.ceil((new Date(reservaSeleccionada.fecha_fin).getTime() - new Date(reservaSeleccionada.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
      
      const contratoData = {
        cliente: reservaSeleccionada.customers,
        vehiculo: reservaSeleccionada.vehicles,
        fecha_inicio: reservaSeleccionada.fecha_inicio,
        fecha_fin: reservaSeleccionada.fecha_fin,
        hora_inicio: reservaSeleccionada.hora_inicio || "08:00",
        hora_fin: reservaSeleccionada.hora_fin || "18:00",
        valor_dia: reservaSeleccionada.valor_dia || "150000",
        dias: diasDiff.toString(),
        km_incluidos: "300",
        valor_km_adicional: "2000",
        deposito_tarjeta: reservaSeleccionada.deposito || "500000",
        valor_seguro: reservaSeleccionada.valor_seguro || "50000",
        observaciones: reservaSeleccionada.observaciones || "",
        tipo: "final" as const,
        firma,
        huella: fingerprintImage,
        foto
      };

      const pdfBlob = await generarContratoFinalPDF(contratoData);
      
      // Generar número de contrato único
      const numeroContrato = `EC-${Date.now().toString().slice(-8)}`;
      
      // Calcular valor total
      const valorDia = parseFloat(contratoData.valor_dia) || 0;
      const seguro = parseFloat(contratoData.valor_seguro) || 0;
      const subtotal = valorDia * diasDiff;
      const iva = subtotal * 0.19;
      const total = subtotal + iva + seguro;

      // Guardar en Supabase
      const { data: contratoGuardado, error } = await supabase
        .from("contracts")
        .insert({
          contract_number: numeroContrato,
          customer_id: reservaSeleccionada.customer_id,
          vehicle_id: reservaSeleccionada.vehiculo_id,
          reservation_id: reservaSeleccionada.id,
          customer_name: reservaSeleccionada.customers?.nombre_completo || '',
          customer_document: reservaSeleccionada.customers?.cedula_pasaporte || '',
          customer_email: reservaSeleccionada.customers?.email || '',
          customer_phone: reservaSeleccionada.customers?.celular || '',
          start_date: reservaSeleccionada.fecha_inicio,
          end_date: reservaSeleccionada.fecha_fin,
          total_amount: total,
          terms_text: 'Términos y condiciones aceptados',
          terms_accepted: true,
          signature_url: firma,
          fingerprint_url: fingerprintImage || '',
          foto_url: foto,
          status: 'signed',
          tipo: "final",
          datos_contrato: contratoData,
          tiene_firma: true,
          tiene_huella: !!fingerprintImage,
          tiene_foto: true
        })
        .select()
        .single();

      if (error) throw error;

      // Descargar PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_final_${numeroContrato}.pdf`;
      link.click();

      toast.success("Contrato final generado y guardado exitosamente");
      
      // Limpiar formulario
      limpiarFirma();
      clearFingerprint();
      setFoto(null);
      setReservaSeleccionada(null);
      
    } catch (error) {
      console.error(error);
      toast.error("Error al generar contrato final");
    } finally {
      setLoading(false);
    }
  };

  const handleCapturarHuella = async () => {
    await captureFingerprint();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="reserva">Seleccionar Reserva Confirmada</Label>
        <Select 
          value={reservaSeleccionada?.id} 
          onValueChange={(value) => {
            const reserva = reservas.find(r => r.id === value);
            setReservaSeleccionada(reserva);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar reserva" />
          </SelectTrigger>
          <SelectContent>
            {reservas.map(reserva => (
              <SelectItem key={reserva.id} value={reserva.id}>
                {reserva.customers?.nombre_completo} - {reserva.vehicles?.placa} ({reserva.fecha_inicio})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reservaSeleccionada && (
        <>
          <Card className="p-4 bg-muted">
            <h3 className="font-semibold mb-2">Datos de la Reserva</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Cliente: {reservaSeleccionada.customers?.nombre_completo}</div>
              <div>Vehículo: {reservaSeleccionada.vehicles?.marca} {reservaSeleccionada.vehicles?.modelo}</div>
              <div>Desde: {reservaSeleccionada.fecha_inicio}</div>
              <div>Hasta: {reservaSeleccionada.fecha_fin}</div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Firma Digital */}
            <Card className="p-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Firma Digital
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      width: 400,
                      height: 200,
                      className: 'signature-canvas w-full'
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={guardarFirma} variant="outline" size="sm">
                    Guardar Firma
                  </Button>
                  <Button onClick={limpiarFirma} variant="ghost" size="sm">
                    Limpiar
                  </Button>
                </div>
                {firma && (
                  <div className="text-sm text-green-600">✓ Firma capturada</div>
                )}
              </div>
            </Card>

            {/* Huella Digital */}
            <Card className="p-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Huella Digital
                  {!isReaderAvailable && (
                    <span className="text-xs text-orange-600 ml-2">⚠️ Lector no detectado</span>
                  )}
                </Label>
                <div className="h-[200px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  {fingerprintImage ? (
                    <img src={fingerprintImage} alt="Huella" className="max-h-full" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Fingerprint className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Presiona "Capturar Huella"</p>
                      {!isReaderAvailable && (
                        <p className="text-xs text-orange-600 mt-2">
                          Conecta el lector DigitalPersona
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCapturarHuella} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    disabled={!isReaderAvailable || isCapturing}
                  >
                    {isCapturing ? 'Capturando...' : 'Capturar Huella'}
                  </Button>
                  {fingerprintImage && (
                    <Button 
                      onClick={clearFingerprint} 
                      variant="ghost" 
                      size="sm"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                {fingerprintImage && (
                  <div className="text-sm text-green-600">✓ Huella capturada</div>
                )}
                {!isReaderAvailable && (
                  <div className="text-xs text-muted-foreground p-2 bg-orange-50 rounded border border-orange-200">
                    <strong>Nota:</strong> Asegúrate de que el lector DigitalPersona U.are.U 4500 esté conectado 
                    y el DigitalPersona Client esté instalado en esta computadora.
                  </div>
                )}
              </div>
            </Card>

            {/* Fotografía */}
            <Card className="p-4 md:col-span-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Fotografía del Cliente
                </Label>
                
                {!foto && stream && (
                  <div className="space-y-2">
                    <video 
                      ref={videoRef}
                      autoPlay
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                    <Button onClick={capturarFoto} className="w-full max-w-md mx-auto block">
                      <Camera className="mr-2 h-4 w-4" />
                      Capturar Foto
                    </Button>
                  </div>
                )}

                {!foto && !stream && (
                  <div className="h-[300px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm mb-4">Captura la foto del cliente</p>
                      <Button onClick={iniciarCamara}>
                        Iniciar Cámara
                      </Button>
                    </div>
                  </div>
                )}

                {foto && (
                  <div className="space-y-2">
                    <img src={foto} alt="Cliente" className="w-full max-w-md mx-auto rounded-lg border" />
                    <Button onClick={() => setFoto(null)} variant="ghost" size="sm" className="w-full">
                      Tomar Nueva Foto
                    </Button>
                    <div className="text-sm text-green-600 text-center">✓ Foto capturada</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={handleGenerarPDF} 
              disabled={loading || !firma || !foto} 
              size="lg"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {loading ? 'Generando...' : 'Generar Contrato Final'}
            </Button>
          </div>
          {fingerprintImage && (
            <div className="text-sm text-blue-600 text-center">
              ℹ️ Huella digital capturada y será incluida en el contrato
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContratoFinal;
