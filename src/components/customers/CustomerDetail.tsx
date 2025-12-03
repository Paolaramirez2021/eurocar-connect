import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, MapPin, FileText, Calendar, Upload, Download, Eye, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
  onEdit: () => void;
}

export const CustomerDetail = ({ customerId, onBack, onEdit }: CustomerDetailProps) => {
  const [customer, setCustomer] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Load reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*, vehicles(placa, marca, modelo)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);

      // Load contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select("*, vehicles(placa, marca, modelo)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (contractsError) throw contractsError;
      setContracts(contractsData || []);
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("El archivo no debe superar 10MB");
        return;
      }
      setDocumentFile(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!documentFile) {
      toast.error("Selecciona un archivo primero");
      return;
    }

    setUploading(true);
    try {
      const fileExt = documentFile.name.split(".").pop();
      const fileName = `${customerId}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-documents")
        .upload(filePath, documentFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(filePath);

      // Update customer with new document URL
      const { error: updateError } = await supabase
        .from("customers")
        .update({ foto_documento_url: urlData.publicUrl })
        .eq("id", customerId);

      if (updateError) throw updateError;

      toast.success("Documento actualizado exitosamente");
      setShowUploadDialog(false);
      setDocumentFile(null);
      loadCustomerData(); // Reload data
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Error al subir documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!customer?.foto_documento_url) return;
    
    if (!confirm("¿Está seguro de eliminar el documento actual?")) return;

    try {
      // Extract file path from URL
      const url = new URL(customer.foto_documento_url);
      const filePath = url.pathname.split('/customer-documents/')[1];

      if (filePath) {
        await supabase.storage
          .from("customer-documents")
          .remove([`documents/${filePath}`]);
      }

      // Update customer
      const { error } = await supabase
        .from("customers")
        .update({ foto_documento_url: null })
        .eq("id", customerId);

      if (error) throw error;

      toast.success("Documento eliminado");
      loadCustomerData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Error al eliminar documento");
    }
  };

  const handleViewDocument = () => {
    if (customer?.foto_documento_url) {
      window.open(customer.foto_documento_url, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Cargando información del cliente...</p>
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Cliente no encontrado</p>
      </Card>
    );
  }

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      activo: "default",
      pendiente: "secondary",
      bloqueado: "destructive",
    };
    return <Badge variant={variants[estado] || "default"}>{estado}</Badge>;
  };

  const getReservationBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      confirmed: "default",
      pending: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[estado] || "default"}>{estado}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={onEdit}>Editar Cliente</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold">
                  {customer.nombres} {customer.primer_apellido} {customer.segundo_apellido}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {customer.cedula_pasaporte}
                </p>
              </div>
              {getEstadoBadge(customer.estado)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.celular}</span>
              </div>
              {customer.ciudad && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.ciudad}, {customer.pais}</span>
                </div>
              )}
              {customer.licencia_numero && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Licencia: {customer.licencia_numero}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4 bg-primary/5">
              <p className="text-sm text-muted-foreground">Total Reservas</p>
              <p className="text-2xl font-bold">{customer.total_reservas}</p>
            </Card>
            <Card className="p-4 bg-primary/5">
              <p className="text-sm text-muted-foreground">Monto Total</p>
              <p className="text-2xl font-bold">
                ${customer.monto_total.toLocaleString("es-CO")}
              </p>
            </Card>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="reservations" className="w-full">
        <TabsList>
          <TabsTrigger value="reservations">
            Reservas ({reservations.length})
          </TabsTrigger>
          <TabsTrigger value="contracts">
            Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="info">
            Información Completa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay reservas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        {reservation.vehicles?.marca} {reservation.vehicles?.modelo}
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {reservation.vehicles?.placa}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reservation.fecha_inicio), "dd/MM/yyyy", { locale: es })} -{" "}
                          {format(new Date(reservation.fecha_fin), "dd/MM/yyyy", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>{getReservationBadge(reservation.estado)}</TableCell>
                      <TableCell className="text-right">
                        {reservation.price_total
                          ? `$${reservation.price_total.toLocaleString("es-CO")}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato #</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay contratos firmados
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.contract_number}
                      </TableCell>
                      <TableCell>
                        {contract.vehicles?.marca} {contract.vehicles?.modelo}
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {contract.vehicles?.placa}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(contract.signed_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        ${contract.total_amount.toLocaleString("es-CO")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-6">
            <div className="space-y-8">
              {/* Documentos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Documentos</h3>
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        {customer.foto_documento_url ? "Actualizar" : "Subir"} Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subir Documento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Documento (Cédula, Pasaporte o Licencia)</Label>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                          />
                          <p className="text-xs text-muted-foreground">
                            Formatos: JPG, PNG, PDF. Máximo 10MB
                          </p>
                        </div>
                        {documentFile && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Archivo seleccionado:</p>
                            <p className="text-sm text-muted-foreground">{documentFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowUploadDialog(false);
                              setDocumentFile(null);
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleUploadDocument}
                            disabled={!documentFile || uploading}
                            className="flex-1"
                          >
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Subir
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {customer.foto_documento_url ? (
                  <Card className="p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">Documento de Identidad</p>
                          <p className="text-xs text-muted-foreground">
                            Cédula, Pasaporte o Licencia
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewDocument}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = customer.foto_documento_url;
                            a.download = `documento_${customer.cedula_pasaporte}`;
                            a.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteDocument}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No hay documentos subidos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sube la cédula, pasaporte o licencia del cliente
                    </p>
                  </Card>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Información Personal</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Fecha Nacimiento</dt>
                    <dd>{customer.fecha_nacimiento || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Estado Civil</dt>
                    <dd>{customer.estado_civil || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Dirección</dt>
                    <dd>{customer.direccion_residencia || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Información Laboral</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Empresa</dt>
                    <dd>{customer.empresa || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ocupación</dt>
                    <dd>{customer.ocupacion || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Dirección Oficina</dt>
                    <dd>{customer.direccion_oficina || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Información Financiera</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Banco</dt>
                    <dd>{customer.banco || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tarjeta</dt>
                    <dd>{customer.numero_tarjeta ? `**** ${customer.numero_tarjeta}` : "-"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Licencia de Conducción</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Número</dt>
                    <dd>{customer.licencia_numero || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ciudad Expedición</dt>
                    <dd>{customer.licencia_ciudad_expedicion || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Vencimiento</dt>
                    <dd>{customer.licencia_fecha_vencimiento || "-"}</dd>
                  </div>
                </dl>
              </div>

              {customer.observaciones && (
                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-3">Observaciones</h3>
                  <p className="text-sm text-muted-foreground">{customer.observaciones}</p>
                </div>
              )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
