import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, CreditCard, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface DocumentPhotoCaptureProps {
  documentType: "cedula" | "pasaporte" | "";
  onPhotosChange: (photos: { front: string | null; back: string | null }) => void;
}

export const DocumentPhotoCapture = ({ documentType, onPhotosChange }: DocumentPhotoCaptureProps) => {
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const needsBackPhoto = documentType === "cedula";

  const handleCapture = (side: "front" | "back") => {
    setCurrentSide(side);
    if (side === "front" && frontInputRef.current) {
      frontInputRef.current.click();
    } else if (side === "back" && backInputRef.current) {
      backInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor capture una imagen válida");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      if (side === "front") {
        setFrontPhoto(dataUrl);
        onPhotosChange({ front: dataUrl, back: backPhoto });
        toast.success("Foto frontal del documento capturada");
      } else {
        setBackPhoto(dataUrl);
        onPhotosChange({ front: frontPhoto, back: dataUrl });
        toast.success("Foto trasera del documento capturada");
      }
    };
    reader.readAsDataURL(file);

    // Limpiar input
    event.target.value = '';
  };

  const handleRemove = (side: "front" | "back") => {
    if (side === "front") {
      setFrontPhoto(null);
      onPhotosChange({ front: null, back: backPhoto });
    } else {
      setBackPhoto(null);
      onPhotosChange({ front: frontPhoto, back: null });
    }
  };

  if (!documentType) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground py-8">
          <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Seleccione el tipo de documento para capturar las fotos</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Foto del Documento ({documentType === "cedula" ? "Cédula - Ambos Lados" : "Pasaporte"})
          </h3>
        </div>

        <div className={`grid ${needsBackPhoto ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4`}>
          {/* Foto Frontal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {documentType === "cedula" ? "Lado Frontal" : "Página Principal"}
            </label>
            
            {frontPhoto ? (
              <div className="relative">
                <img
                  src={frontPhoto}
                  alt="Documento frontal"
                  className="w-full h-40 object-contain rounded-lg border bg-muted"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemove("front")}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => handleCapture("front")}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Retomar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCapture("front")}
                className="w-full h-40 flex-col border-dashed"
              >
                <Camera className="h-8 w-8 mb-2" />
                <span>Capturar {documentType === "cedula" ? "Frente" : "Pasaporte"}</span>
              </Button>
            )}
          </div>

          {/* Foto Trasera (solo para cédula) */}
          {needsBackPhoto && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Lado Trasero</label>
              
              {backPhoto ? (
                <div className="relative">
                  <img
                    src={backPhoto}
                    alt="Documento trasero"
                    className="w-full h-40 object-contain rounded-lg border bg-muted"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemove("back")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => handleCapture("back")}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Retomar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCapture("back")}
                  className="w-full h-40 flex-col border-dashed"
                  disabled={!frontPhoto}
                >
                  <Camera className="h-8 w-8 mb-2" />
                  <span>Capturar Reverso</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Inputs ocultos para captura */}
        <input
          ref={frontInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileChange(e, "front")}
          className="hidden"
        />
        <input
          ref={backInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileChange(e, "back")}
          className="hidden"
        />

        <p className="text-xs text-muted-foreground">
          * {documentType === "cedula" 
            ? "Capture ambos lados de la cédula de forma clara y legible."
            : "Capture la página principal del pasaporte con los datos visibles."}
        </p>

        {/* Indicador de progreso */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-3 h-3 rounded-full ${frontPhoto ? "bg-green-500" : "bg-gray-300"}`} />
          <span className={frontPhoto ? "text-green-600" : "text-muted-foreground"}>
            {documentType === "cedula" ? "Frente" : "Pasaporte"}
          </span>
          {needsBackPhoto && (
            <>
              <div className={`w-3 h-3 rounded-full ${backPhoto ? "bg-green-500" : "bg-gray-300"}`} />
              <span className={backPhoto ? "text-green-600" : "text-muted-foreground"}>Reverso</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
