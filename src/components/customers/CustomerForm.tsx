import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface CustomerFormData {
  nombres: string;
  primer_apellido: string;
  segundo_apellido?: string;
  cedula_pasaporte: string;
  email?: string;
  celular: string;
  telefono?: string;
  direccion_residencia?: string;
  hotel_hospedaje?: string;
  hotel_numero_habitacion?: string;
  pais: string;
  ciudad?: string;
  fecha_nacimiento?: string;
  estado_civil?: string;
  licencia_numero?: string;
  licencia_ciudad_expedicion?: string;
  licencia_fecha_vencimiento?: string;
  empresa?: string;
  ocupacion?: string;
  direccion_oficina?: string;
  banco?: string;
  numero_tarjeta?: string;
  fecha_vencimiento_tarjeta?: string;
  cvv_tarjeta?: string;
  referencia_personal_nombre?: string;
  referencia_personal_telefono?: string;
  referencia_familiar_nombre?: string;
  referencia_familiar_telefono?: string;
  referencia_comercial_nombre?: string;
  referencia_comercial_telefono?: string;
  observaciones?: string;
  estado: string;
}

interface CustomerFormProps {
  customer?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CustomerForm = ({ customer, onSuccess, onCancel }: CustomerFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: customer || {
      pais: "Colombia",
      estado: "activo",
    },
  });

  useEffect(() => {
    if (customer) {
      Object.keys(customer).forEach((key) => {
        setValue(key as any, customer[key]);
      });
    }
  }, [customer, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe superar 5MB");
        return;
      }
      setDocumentFile(file);
    }
  };

  const uploadDocument = async (customerId: string): Promise<string | null> => {
    if (!documentFile) return null;

    setUploading(true);
    try {
      const fileExt = documentFile.name.split(".").pop();
      const fileName = `${customerId}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("customer-documents")
        .upload(filePath, documentFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Error al subir documento");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let fotoDocumentoUrl = customer?.foto_documento_url;

      if (customer) {
        // Update existing customer
        if (documentFile) {
          fotoDocumentoUrl = await uploadDocument(customer.id);
        }

        const { error } = await supabase
          .from("customers")
          .update({
            ...data,
            foto_documento_url: fotoDocumentoUrl,
          })
          .eq("id", customer.id);

        if (error) throw error;
        toast.success("Cliente actualizado exitosamente");
      } else {
        // Create new customer
        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert([{
            ...data,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        if (documentFile) {
          fotoDocumentoUrl = await uploadDocument(newCustomer.id);
          if (fotoDocumentoUrl) {
            await supabase
              .from("customers")
              .update({ foto_documento_url: fotoDocumentoUrl })
              .eq("id", newCustomer.id);
          }
        }

        toast.success("Cliente creado exitosamente");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast.error(error.message || "Error al guardar cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="contacto">Contacto</TabsTrigger>
            <TabsTrigger value="licencia">Licencia</TabsTrigger>
            <TabsTrigger value="laboral">Info. Bancaria</TabsTrigger>
            <TabsTrigger value="referencias">Referencias</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombres">Nombres *</Label>
                <Input id="nombres" {...register("nombres", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primer_apellido">Primer Apellido *</Label>
                <Input id="primer_apellido" {...register("primer_apellido", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segundo_apellido">Segundo Apellido</Label>
                <Input id="segundo_apellido" {...register("segundo_apellido")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedula_pasaporte">Cédula/Pasaporte *</Label>
                <Input id="cedula_pasaporte" {...register("cedula_pasaporte", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento">Fecha Nacimiento</Label>
                <Input id="fecha_nacimiento" type="date" {...register("fecha_nacimiento")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado_civil">Estado Civil</Label>
                <Select onValueChange={(value) => setValue("estado_civil", value)} value={watch("estado_civil") || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soltero">Soltero(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="union_libre">Unión Libre</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viudo">Viudo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select onValueChange={(value) => setValue("estado", value)} value={watch("estado") || "activo"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="foto_documento">Foto Documento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="foto_documento"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("foto_documento")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {documentFile ? documentFile.name : "Subir archivo"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacto" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="celular">Celular *</Label>
                <Input id="celular" {...register("celular", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...register("telefono")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pais">País</Label>
                <Input id="pais" {...register("pais")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" {...register("ciudad")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccion_residencia">Dirección</Label>
                <Textarea id="direccion_residencia" {...register("direccion_residencia")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel_hospedaje">Hotel donde se hospeda</Label>
                <Input id="hotel_hospedaje" {...register("hotel_hospedaje")} placeholder="Si no vive en la ciudad o país" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel_numero_habitacion">Número de habitación</Label>
                <Input id="hotel_numero_habitacion" {...register("hotel_numero_habitacion")} placeholder="Si aplica" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="licencia" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licencia_numero">Número Licencia</Label>
                <Input id="licencia_numero" {...register("licencia_numero")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licencia_ciudad_expedicion">Ciudad Expedición</Label>
                <Input id="licencia_ciudad_expedicion" {...register("licencia_ciudad_expedicion")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licencia_fecha_vencimiento">Fecha Vencimiento</Label>
                <Input id="licencia_fecha_vencimiento" type="date" {...register("licencia_fecha_vencimiento")} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="laboral" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Input id="banco" {...register("banco")} placeholder="Nombre del banco" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_tarjeta">Número de Tarjeta</Label>
                <Input id="numero_tarjeta" maxLength={16} {...register("numero_tarjeta")} placeholder="Últimos 4 dígitos o completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento_tarjeta">Fecha de Vencimiento</Label>
                <Input id="fecha_vencimiento_tarjeta" {...register("fecha_vencimiento_tarjeta")} placeholder="MM/AA" maxLength={5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv_tarjeta">CVV</Label>
                <Input id="cvv_tarjeta" type="password" maxLength={4} {...register("cvv_tarjeta")} placeholder="***" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="referencias" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Sección no requerida para este formulario</p>
            </div>
            {/* Campos ocultos para mantener compatibilidad */}
            <input type="hidden" {...register("referencia_personal_nombre")} />
            <input type="hidden" {...register("referencia_personal_telefono")} />
            <input type="hidden" {...register("referencia_familiar_nombre")} />
            <input type="hidden" {...register("referencia_familiar_telefono")} />
            <input type="hidden" {...register("referencia_comercial_nombre")} />
            <input type="hidden" {...register("referencia_comercial_telefono")} />
            <input type="hidden" {...register("observaciones")} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || uploading}>
            {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {customer ? "Actualizar" : "Crear"} Cliente
          </Button>
        </div>
      </form>
    </Card>
  );
};
