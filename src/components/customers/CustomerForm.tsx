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
import { Upload, Loader2, Eye, EyeOff } from "lucide-react";

interface CustomerFormData {
  nombres: string;
  primer_apellido: string;
  segundo_apellido?: string;
  tipo_documento: string;
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
  const [docFrenteFile, setDocFrenteFile] = useState<File | null>(null);
  const [docReversoFile, setDocReversoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  
  // Preparar defaultValues con datos del cliente si existe
  const getDefaultValues = (): CustomerFormData => {
    if (customer) {
      return {
        nombres: customer.nombres || "",
        primer_apellido: customer.primer_apellido || "",
        segundo_apellido: customer.segundo_apellido || "",
        tipo_documento: customer.tipo_documento || "cedula",
        cedula_pasaporte: customer.cedula_pasaporte || "",
        email: customer.email || "",
        celular: customer.celular || "",
        telefono: customer.telefono || "",
        direccion_residencia: customer.direccion_residencia || "",
        hotel_hospedaje: customer.hotel_hospedaje || "",
        hotel_numero_habitacion: customer.hotel_numero_habitacion || "",
        pais: customer.pais || "Colombia",
        ciudad: customer.ciudad || "",
        fecha_nacimiento: customer.fecha_nacimiento || "",
        estado_civil: customer.estado_civil || "",
        licencia_numero: customer.licencia_numero || "",
        licencia_ciudad_expedicion: customer.licencia_ciudad_expedicion || "",
        licencia_fecha_vencimiento: customer.licencia_fecha_vencimiento || "",
        empresa: customer.empresa || "",
        ocupacion: customer.ocupacion || "",
        direccion_oficina: customer.direccion_oficina || "",
        banco: customer.banco || "",
        numero_tarjeta: customer.numero_tarjeta || "",
        fecha_vencimiento_tarjeta: customer.fecha_vencimiento_tarjeta || "",
        cvv_tarjeta: customer.cvv_tarjeta || "",
        referencia_personal_nombre: customer.referencia_personal_nombre || "",
        referencia_personal_telefono: customer.referencia_personal_telefono || "",
        referencia_familiar_nombre: customer.referencia_familiar_nombre || "",
        referencia_familiar_telefono: customer.referencia_familiar_telefono || "",
        referencia_comercial_nombre: customer.referencia_comercial_nombre || "",
        referencia_comercial_telefono: customer.referencia_comercial_telefono || "",
        observaciones: customer.observaciones || "",
        estado: customer.estado || "activo",
      };
    }
    return {
      nombres: "",
      primer_apellido: "",
      segundo_apellido: "",
      tipo_documento: "cedula",
      cedula_pasaporte: "",
      email: "",
      celular: "",
      telefono: "",
      direccion_residencia: "",
      hotel_hospedaje: "",
      hotel_numero_habitacion: "",
      pais: "Colombia",
      ciudad: "",
      fecha_nacimiento: "",
      estado_civil: "",
      licencia_numero: "",
      licencia_ciudad_expedicion: "",
      licencia_fecha_vencimiento: "",
      empresa: "",
      ocupacion: "",
      direccion_oficina: "",
      banco: "",
      numero_tarjeta: "",
      fecha_vencimiento_tarjeta: "",
      cvv_tarjeta: "",
      referencia_personal_nombre: "",
      referencia_personal_telefono: "",
      referencia_familiar_nombre: "",
      referencia_familiar_telefono: "",
      referencia_comercial_nombre: "",
      referencia_comercial_telefono: "",
      observaciones: "",
      estado: "activo",
    };
  };

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: getDefaultValues(),
    mode: "onBlur", // Validar al salir del campo
  });

  // Debug: Log errores de validación
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('[CustomerForm] Errores de validación:', errors);
    }
  }, [errors]);

  // Cargar datos del cliente cuando cambia (para edición)
  useEffect(() => {
    if (customer) {
      console.log('[CustomerForm] Cargando datos del cliente:', customer.id);
      reset(getDefaultValues());
    }
  }, [customer, reset]);

  const handleFrenteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe superar 5MB");
        return;
      }
      setDocFrenteFile(file);
    }
  };

  const handleReversoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe superar 5MB");
        return;
      }
      setDocReversoFile(file);
    }
  };

  const uploadSingleFile = async (file: File, customerId: string, suffix: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `customer_${customerId}_${suffix}_${Date.now()}.${fileExt}`;
      const filePath = `customer-docs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contracts")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error(`Error uploading ${suffix}:`, error);
      return null;
    }
  };

  const uploadDocuments = async (customerId: string): Promise<{ frente: string | null; reverso: string | null }> => {
    setUploading(true);
    try {
      let frenteUrl: string | null = null;
      let reversoUrl: string | null = null;

      if (docFrenteFile) {
        frenteUrl = await uploadSingleFile(docFrenteFile, customerId, "frente");
      }
      if (docReversoFile) {
        reversoUrl = await uploadSingleFile(docReversoFile, customerId, "reverso");
      }

      return { frente: frenteUrl, reverso: reversoUrl };
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Error al subir documentos");
      return { frente: null, reverso: null };
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    console.log('[CustomerForm] Iniciando submit...', { isUpdate: !!customer, customerId: customer?.id });
    console.log('[CustomerForm] Datos a guardar:', data);
    
    // Validación adicional para actualización
    if (customer && !customer.id) {
      console.error('[CustomerForm] Error: customer existe pero no tiene ID');
      toast.error("Error: No se puede identificar el cliente a actualizar");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuario no autenticado");
        throw new Error("Usuario no autenticado");
      }
      
      let docFrenteUrl = customer?.documento_frente_url || null;
      let docReversoUrl = customer?.documento_reverso_url || null;

      if (customer && customer.id) {
        // Update existing customer
        console.log('[CustomerForm] Actualizando cliente existente:', customer.id);
        
        if (docFrenteFile || docReversoFile) {
          const uploaded = await uploadDocuments(customer.id);
          if (uploaded.frente) docFrenteUrl = uploaded.frente;
          if (uploaded.reverso) docReversoUrl = uploaded.reverso;
        }

        // Preparar datos para actualización
        const updateData = {
          nombres: data.nombres,
          primer_apellido: data.primer_apellido,
          segundo_apellido: data.segundo_apellido || null,
          tipo_documento: data.tipo_documento,
          cedula_pasaporte: data.cedula_pasaporte,
          email: data.email || null,
          celular: data.celular,
          telefono: data.telefono || null,
          direccion_residencia: data.direccion_residencia || null,
          hotel_hospedaje: data.hotel_hospedaje || null,
          hotel_numero_habitacion: data.hotel_numero_habitacion || null,
          pais: data.pais || "Colombia",
          ciudad: data.ciudad || null,
          fecha_nacimiento: data.fecha_nacimiento || null,
          estado_civil: data.estado_civil || null,
          licencia_numero: data.licencia_numero || null,
          licencia_ciudad_expedicion: data.licencia_ciudad_expedicion || null,
          licencia_fecha_vencimiento: data.licencia_fecha_vencimiento || null,
          empresa: data.empresa || null,
          ocupacion: data.ocupacion || null,
          direccion_oficina: data.direccion_oficina || null,
          banco: data.banco || null,
          numero_tarjeta: data.numero_tarjeta || null,
          fecha_vencimiento_tarjeta: data.fecha_vencimiento_tarjeta || null,
          cvv_tarjeta: data.cvv_tarjeta || null,
          referencia_personal_nombre: data.referencia_personal_nombre || null,
          referencia_personal_telefono: data.referencia_personal_telefono || null,
          referencia_familiar_nombre: data.referencia_familiar_nombre || null,
          referencia_familiar_telefono: data.referencia_familiar_telefono || null,
          referencia_comercial_nombre: data.referencia_comercial_nombre || null,
          referencia_comercial_telefono: data.referencia_comercial_telefono || null,
          observaciones: data.observaciones || null,
          estado: data.estado,
          documento_frente_url: docFrenteUrl,
          documento_reverso_url: docReversoUrl,
        };

        console.log('[CustomerForm] Ejecutando UPDATE con ID:', customer.id);
        console.log('[CustomerForm] Datos de actualización:', updateData);

        const { error, data: updatedData, count } = await supabase
          .from("customers")
          .update(updateData)
          .eq("id", customer.id)
          .select();

        console.log('[CustomerForm] Respuesta de Supabase:', { error, updatedData, count });

        if (error) {
          console.error('[CustomerForm] Error de Supabase al actualizar:', error);
          toast.error(`Error al actualizar: ${error.message}`);
          throw error;
        }
        
        if (!updatedData || updatedData.length === 0) {
          console.warn('[CustomerForm] UPDATE ejecutado pero no se retornaron datos');
        }
        
        console.log('[CustomerForm] Cliente actualizado exitosamente:', updatedData);
        toast.success("Cliente actualizado exitosamente");
      } else {
        // Create new customer
        console.log('[CustomerForm] Creando nuevo cliente...');
        
        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert([{
            ...data,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (insertError) {
          console.error('[CustomerForm] Error de Supabase al crear:', insertError);
          throw insertError;
        }

        console.log('[CustomerForm] Cliente creado:', newCustomer.id);

        if (docFrenteFile || docReversoFile) {
          const uploaded = await uploadDocuments(newCustomer.id);
          const updateFields: any = {};
          if (uploaded.frente) updateFields.documento_frente_url = uploaded.frente;
          if (uploaded.reverso) updateFields.documento_reverso_url = uploaded.reverso;
          
          if (Object.keys(updateFields).length > 0) {
            await supabase
              .from("customers")
              .update(updateFields)
              .eq("id", newCustomer.id);
          }
        }

        toast.success("Cliente creado exitosamente");
      }

      onSuccess();
    } catch (error: any) {
      console.error("[CustomerForm] Error al guardar cliente:", error);
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
                <Input 
                  id="nombres" 
                  {...register("nombres", { required: "Nombres es obligatorio" })} 
                  className={errors.nombres ? "border-red-500" : ""}
                />
                {errors.nombres && <span className="text-xs text-red-500">{errors.nombres.message}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="primer_apellido">Primer Apellido *</Label>
                <Input 
                  id="primer_apellido" 
                  {...register("primer_apellido", { required: "Primer apellido es obligatorio" })} 
                  className={errors.primer_apellido ? "border-red-500" : ""}
                />
                {errors.primer_apellido && <span className="text-xs text-red-500">{errors.primer_apellido.message}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="segundo_apellido">Segundo Apellido</Label>
                <Input id="segundo_apellido" {...register("segundo_apellido")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
                <Select 
                  onValueChange={(value) => setValue("tipo_documento", value)} 
                  value={watch("tipo_documento") || "cedula"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cedula">Cédula de Ciudadanía</SelectItem>
                    <SelectItem value="cedula_extranjeria">Cédula de Extranjería</SelectItem>
                    <SelectItem value="pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="pep">PEP (Permiso Especial de Permanencia)</SelectItem>
                    <SelectItem value="ppt">PPT (Permiso por Protección Temporal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedula_pasaporte">Número de Documento *</Label>
                <Input 
                  id="cedula_pasaporte" 
                  {...register("cedula_pasaporte", { required: "Número de documento es obligatorio" })} 
                  className={errors.cedula_pasaporte ? "border-red-500" : ""}
                />
                {errors.cedula_pasaporte && <span className="text-xs text-red-500">{errors.cedula_pasaporte.message}</span>}
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
              <div className="space-y-2 col-span-2">
                <Label>Foto Documento</Label>
                {(watch("tipo_documento") === "pasaporte") ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="doc_frente"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFrenteChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("doc_frente")?.click()}
                      data-testid="upload-doc-frente"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {docFrenteFile ? docFrenteFile.name : "Subir Pasaporte"}
                    </Button>
                    {customer?.documento_frente_url && !docFrenteFile && (
                      <span className="text-xs text-green-600">Documento cargado</span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="doc_frente"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFrenteChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("doc_frente")?.click()}
                        data-testid="upload-doc-frente"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {docFrenteFile ? docFrenteFile.name : "Frente"}
                      </Button>
                      {customer?.documento_frente_url && !docFrenteFile && (
                        <span className="text-xs text-green-600">Cargado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="doc_reverso"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleReversoChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("doc_reverso")?.click()}
                        data-testid="upload-doc-reverso"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {docReversoFile ? docReversoFile.name : "Reverso"}
                      </Button>
                      {customer?.documento_reverso_url && !docReversoFile && (
                        <span className="text-xs text-green-600">Cargado</span>
                      )}
                    </div>
                  </div>
                )}
                {uploading && <p className="text-xs text-muted-foreground">Subiendo documentos...</p>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacto" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="celular">Celular *</Label>
                <Input 
                  id="celular" 
                  {...register("celular", { required: "Celular es obligatorio" })} 
                  className={errors.celular ? "border-red-500" : ""}
                />
                {errors.celular && <span className="text-xs text-red-500">{errors.celular.message}</span>}
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
                <div className="relative">
                  <Input id="cvv_tarjeta" type={showCvv ? "text" : "password"} maxLength={4} {...register("cvv_tarjeta")} placeholder="***" className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowCvv(!showCvv)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="toggle-cvv-visibility"
                  >
                    {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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

        <div className="flex flex-col gap-2 pt-4 border-t">
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              <div className="font-semibold flex items-center gap-2">
                <span>⚠️</span> Por favor complete los campos obligatorios:
              </div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {errors.nombres && <li>Nombres</li>}
                {errors.primer_apellido && <li>Primer Apellido</li>}
                {errors.cedula_pasaporte && <li>Número de Documento</li>}
                {errors.celular && <li>Celular</li>}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || uploading}
              data-testid="customer-form-submit-btn"
            >
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {customer ? "Actualizar Cliente" : "Crear Cliente"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};
