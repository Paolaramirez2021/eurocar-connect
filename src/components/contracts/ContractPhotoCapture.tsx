import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";

interface ContractPhotoCaptureProps {
  onPhotoChange: (dataUrl: string | null) => void;
}

export const ContractPhotoCapture = ({ onPhotoChange }: ContractPhotoCaptureProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
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
          onPhotoChange(image.dataUrl);
          toast.success("Foto del contrato capturada");
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

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no debe superar 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      onPhotoChange(dataUrl);
      toast.success("Foto del contrato capturada");
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onPhotoChange(null);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Foto del Contrato *</h3>
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
          <div className="relative rounded-lg border-2 border-border overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Foto del contrato"
              className="w-full h-64 object-contain"
            />
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCameraCapture}
              disabled={isCapturing}
              className="flex-col h-auto py-6 px-8"
            >
              <Camera className="h-10 w-10 mb-2" />
              <span className="text-lg">Abrir Cámara</span>
            </Button>
            <p className="text-sm text-muted-foreground">
              Capture una foto del contrato físico firmado
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

        <p className="text-xs text-muted-foreground">
          * Esta foto es obligatoria como respaldo del contrato físico firmado.
        </p>
      </div>
    </Card>
  );
};
