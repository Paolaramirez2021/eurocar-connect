import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const userFormSchema = z.object({
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  last_name: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres").max(100),
  cedula: z.string().min(6, "La cédula debe tener al menos 6 caracteres").max(20),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "El teléfono debe tener al menos 8 dígitos").max(20),
  role: z.enum(["socio_principal", "administrador", "comercial", "operativo"]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  onSuccess?: () => void;
  initialData?: Partial<UserFormValues> & { id?: string };
}

export const UserForm = ({ onSuccess, initialData }: UserFormProps) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData?.id;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData || {
      first_name: "",
      last_name: "",
      cedula: "",
      email: "",
      phone: "",
      role: "operativo",
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    setLoading(true);
    try {
      if (isEditing && initialData?.id) {
        // Update existing user
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            first_name: values.first_name,
            last_name: values.last_name,
            cedula: values.cedula,
            phone: values.phone,
            full_name: `${values.first_name} ${values.last_name}`,
          })
          .eq("id", initialData.id);

        if (updateError) throw updateError;

        await logAudit({
          actionType: "USER_UPDATE",
          tableName: "profiles",
          recordId: initialData.id,
          description: `Usuario actualizado: ${values.email}`,
        });

        toast.success("Usuario actualizado correctamente");
      } else {
        // For new users, they need to sign up first
        // This is a simplified version - in production, you'd want admin-controlled user creation
        toast.info("Funcionalidad de creación de usuarios", {
          description: "Los nuevos usuarios deben registrarse a través del formulario de registro",
        });
      }

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error("Error al guardar usuario", {
        description: error.message || "No se pudo guardar el usuario",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      socio_principal: "Socio Principal",
      administrador: "Administrador",
      comercial: "Comercial",
      operativo: "Operativo",
    };
    return labels[role] || role;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</CardTitle>
        <CardDescription>
          Complete la información del usuario
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez García" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cedula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="juan@example.com"
                        {...field}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+506 8888-8888" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="operativo">
                          {getRoleLabel("operativo")}
                        </SelectItem>
                        <SelectItem value="comercial">
                          {getRoleLabel("comercial")}
                        </SelectItem>
                        <SelectItem value="administrador">
                          {getRoleLabel("administrador")}
                        </SelectItem>
                        <SelectItem value="socio_principal">
                          {getRoleLabel("socio_principal")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? "Guardando..." : isEditing ? "Actualizar Usuario" : "Crear Usuario"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
