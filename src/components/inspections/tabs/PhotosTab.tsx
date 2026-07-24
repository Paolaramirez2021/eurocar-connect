import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, X, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PhotoItem } from "../InspectionForm";

interface PhotosTabProps {
  photos: PhotoItem[];
  setPhotos: (fn: (prev: PhotoItem[]) => PhotoItem[]) => void;
  inspectionId?: string;
}

const PHOTO_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "dano", label: "Daño" },
  { value: "odometro", label: "Odómetro" },
  { value: "combustible", label: "Combustible" },
];

export const PhotosTab = ({ photos, setPhotos, inspectionId }: PhotosTabProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} supera 10MB`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const fileName = `inspection_${inspectionId || "draft"}_${Date.now()}_${i}.${ext}`;
        const filePath = `inspection-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("contracts")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Error subiendo ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from("contracts").getPublicUrl(filePath);

        const newPhoto: PhotoItem = {
          categoria: selectedCategory,
          url: urlData.publicUrl,
          descripcion: file.name,
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
      toast.success("Fotos subidas exitosamente");
    } catch (err) {
      toast.error("Error al subir fotos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Fotografías de la Inspección
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="photo-upload"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2 mb-2">
              {PHOTO_CATEGORIES.map(cat => (
                <Button
                  key={cat.value}
                  size="sm"
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="text-xs h-7"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
            <Camera className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Categoría: <strong>{PHOTO_CATEGORIES.find(c => c.value === selectedCategory)?.label}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Subir Fotos
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Máximo 10MB por archivo</p>
          </div>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border">
                <img
                  src={photo.url}
                  alt={photo.descripcion || "Foto inspección"}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-1 left-1">
                  <Badge className="text-[10px] bg-black/60 text-white">{photo.categoria}</Badge>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
                {photo.descripcion && (
                  <p className="text-[10px] text-muted-foreground p-1 truncate">{photo.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay fotos aún. Suba fotos del vehículo.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
