import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Fingerprint, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";

const SCANNER_URL = "http://localhost:5000";

interface FingerprintCaptureProps {
  onFingerprintChange: (dataUrl: string | null) => void;
}

export const FingerprintCapture = ({ onFingerprintChange }: FingerprintCaptureProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'scanner' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNative = Capacitor.isNativePlatform();

  const handleCameraCapture = async () => {
    setIsCapturing(true);
    
    try {
      if (isNative) {
        // Use Capacitor Camera for native apps
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          saveToGallery: false,
          correctOrientation: true,
        });

        if (image.dataUrl) {
          setPreview(image.dataUrl);
          onFingerprintChange(image.dataUrl);
          setCaptureMethod('camera');
          toast.success("Huella capturada con cámara");
        }
      } else {
        // Use HTML5 file input for web
        fileInputRef.current?.click();
      }
    } catch (error: any) {
      if (error.message !== "User cancelled photos app") {
        console.error("Error capturing photo:", error);
        toast.error("Error al capturar la foto");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor seleccione un archivo de imagen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      onFingerprintChange(dataUrl);
      setCaptureMethod('camera');
      toast.success("Huella capturada con cámara");
    };
    reader.readAsDataURL(file);
  };

  const [isScanning, setIsScanning] = useState(false);

  const handleScannerCapture = async () => {
    setIsScanning(true);
    try {
      // Llamar al servicio local del huellero DigitalPersona
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${SCANNER_URL}/capturar-huella`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error del servicio (${response.status})`);
      }

      const data = await response.json();

      if (!data.image) {
        throw new Error("No se recibió imagen del huellero");
      }

      // data.image puede venir como base64 puro o con prefijo data:image/png;base64,
      const dataUrl = data.image.startsWith("data:")
        ? data.image
        : `data:image/png;base64,${data.image}`;

      setPreview(dataUrl);
      onFingerprintChange(dataUrl);
      setCaptureMethod("scanner");
      toast.success("Huella capturada con huellero digital");
    } catch (error: any) {
      if (error.name === "AbortError") {
        toast.error("Tiempo de espera agotado. Asegúrese de colocar el dedo en el huellero.");
      } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        toast.error(
          "No se pudo conectar al huellero. Verifique que el servicio local esté ejecutándose en el puerto 5000."
        );
      } else {
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onFingerprintChange(null);
    setCaptureMethod(null);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Huella Digital (Opcional)</h3>
          </div>
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

        {preview ? (
          <div className="space-y-2">
            <div className="relative rounded-lg border-2 border-border overflow-hidden bg-muted">
              <img
                src={preview}
                alt="Huella capturada"
                className="w-full h-48 object-contain"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Capturado con: {captureMethod === 'camera' ? 'Cámara' : 'Huellero Digital'}
            </p>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleScannerCapture}
                disabled={isScanning}
                className="flex items-center justify-center gap-2 h-auto py-4"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Esperando huella... Coloque el dedo</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-6 w-6" />
                    <span>Usar Huellero Digital</span>
                  </>
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleCameraCapture}
                disabled={isCapturing}
                className="flex items-center justify-center gap-2 h-auto py-4"
              >
                <Camera className="h-6 w-6" />
                <span>Tomar Foto con Cámara</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use el huellero digital o capture una foto de la huella
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> La huella es opcional y se utiliza como respaldo visual adicional.
          </p>
          <p className="text-xs text-muted-foreground">
            El huellero digital requiere el servicio local ejecutándose (DigitalPersona 4500).
          </p>
        </div>
      </div>
    </Card>
  );
};
