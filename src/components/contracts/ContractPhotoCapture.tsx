import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Video } from "lucide-react";
import { toast } from "sonner";

interface ContractPhotoCaptureProps {
  onPhotoChange: (dataUrl: string | null) => void;
}

export const ContractPhotoCapture = ({ onPhotoChange }: ContractPhotoCaptureProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detectar si es un dispositivo móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Limpiar stream cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Manejar captura desde input file (móviles)
  const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor capture una imagen válida");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      onPhotoChange(dataUrl);
      toast.success("Foto del cliente capturada");
    };
    reader.readAsDataURL(file);
    
    // Limpiar el input para permitir recapturar
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    // En dispositivos móviles, usar el input nativo con capture="user"
    // Esto fuerza la apertura de la cámara directamente
    if (isMobile && fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }

    // En desktop, usar MediaDevices API
    setIsCapturing(true);
    
    try {
      // Solicitar acceso a la cámara
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Cámara frontal para selfie
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
    } catch (error: any) {
      console.error("Error al acceder a la cámara:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Permiso de cámara denegado. Por favor habilite el acceso a la cámara en su navegador.");
      } else if (error.name === "NotFoundError") {
        toast.error("No se encontró ninguna cámara en este dispositivo.");
      } else {
        // Fallback: usar input file si MediaDevices falla
        if (fileInputRef.current) {
          toast.info("Usando cámara nativa del dispositivo...");
          fileInputRef.current.click();
        } else {
          toast.error("Error al abrir la cámara: " + error.message);
        }
      }
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Configurar canvas con el tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir a dataURL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Detener la cámara
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setPreview(dataUrl);
    onPhotoChange(dataUrl);
    setIsCapturing(false);
    toast.success("Foto del cliente capturada");
  };

  const cancelCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const handleRemove = () => {
    setPreview(null);
    onPhotoChange(null);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Foto del Cliente</h3>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>

        {/* Canvas oculto para capturar la foto */}
        <canvas ref={canvasRef} className="hidden" />

        {preview ? (
          <div className="relative rounded-lg border-2 border-border overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Foto del cliente"
              className="w-full h-64 object-contain"
            />
          </div>
        ) : isCapturing && stream ? (
          <div className="space-y-4">
            <div className="relative rounded-lg border-2 border-primary overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                onClick={capturePhoto}
                className="bg-green-600 hover:bg-green-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelCapture}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              disabled={isCapturing}
              className="flex-col h-auto py-6 px-8"
            >
              <Video className="h-10 w-10 mb-2" />
              <span className="text-lg">Abrir Cámara</span>
            </Button>
            <p className="text-sm text-muted-foreground">
              Se abrirá la cámara para tomar una foto del cliente
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          * Foto obligatoria del cliente para verificación de identidad.
        </p>
      </div>
    </Card>
  );
};
