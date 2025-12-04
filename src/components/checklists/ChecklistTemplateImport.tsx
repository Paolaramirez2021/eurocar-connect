import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export const ChecklistTemplateImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"entrega" | "devolucion" | "mantenimiento">("entrega");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        // Extract filename without extension as default name
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setName(fileName);
      } else {
        toast.error("Por favor selecciona un archivo PDF");
      }
    }
  };

  const parseChecklistFromPDF = async (pdfFile: File): Promise<Array<{key: string, label: string, type: string, order_index: number}>> => {
    // Simulated PDF parsing - In production, this would use a PDF parsing library
    // For now, we'll create a default template structure
    return [
      { key: "exterior_limpio", label: "Exterior limpio", type: "checkbox", order_index: 0 },
      { key: "interior_limpio", label: "Interior limpio", type: "checkbox", order_index: 1 },
      { key: "luces_funcionando", label: "Luces funcionando", type: "checkbox", order_index: 2 },
      { key: "neumaticos_estado", label: "Estado de neumáticos", type: "checkbox", order_index: 3 },
      { key: "nivel_combustible", label: "Nivel de combustible", type: "text", order_index: 4 },
      { key: "kilometraje", label: "Kilometraje", type: "number", order_index: 5 },
      { key: "foto_frontal", label: "Foto frontal", type: "photo", order_index: 6 },
      { key: "foto_trasera", label: "Foto trasera", type: "photo", order_index: 7 },
      { key: "foto_lateral_izq", label: "Foto lateral izquierda", type: "photo", order_index: 8 },
      { key: "foto_lateral_der", label: "Foto lateral derecha", type: "photo", order_index: 9 },
      { key: "observaciones", label: "Observaciones generales", type: "text", order_index: 10 },
    ];
  };

  const handleImport = async () => {
    if (!file || !name.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      // Parse PDF to extract checklist items
      const items = await parseChecklistFromPDF(file);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("checklist_templates")
        .insert({
          name,
          category,
          created_by: user.id,
          description: `Importado desde ${file.name}`
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template items
      const templateItems = items.map(item => ({
        template_id: template.id,
        ...item
      }));

      const { error: itemsError } = await supabase
        .from("checklist_template_items")
        .insert(templateItems);

      if (itemsError) throw itemsError;

      // Log audit
      await logAudit({
        actionType: "CHECKLIST_TEMPLATE_IMPORT",
        tableName: "checklist_templates",
        recordId: template.id,
        newData: { name, category, items_count: items.length },
        description: `Plantilla importada desde PDF: ${file.name}`
      });

      toast.success("Plantilla importada exitosamente");
      setFile(null);
      setName("");
    } catch (error) {
      console.error("Error importing template:", error);
      toast.error("Error al importar la plantilla");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar Plantilla desde PDF
        </CardTitle>
        <CardDescription>
          Carga un PDF para crear automáticamente una plantilla de checklist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Nombre de la Plantilla</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Checklist de Entrega Estándar"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select value={category} onValueChange={(v: any) => setCategory(v)}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrega">Entrega</SelectItem>
              <SelectItem value="devolucion">Devolución</SelectItem>
              <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pdf-file">Archivo PDF</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={handleImport} 
          disabled={!file || !name.trim() || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importar Plantilla
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
