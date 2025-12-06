import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HistorialContratos = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarContratos();
  }, []);

  const cargarContratos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("contracts")
        .select(`
          *,
          customers (nombre_completo, cedula_pasaporte),
          vehicles (marca, modelo, placa)
        `)
        .order("created_at", { ascending: false });

      if (filtroTipo !== "todos") {
        query = query.eq("tipo", filtroTipo);
      }

      if (filtroEstado !== "todos") {
        query = query.eq("status", filtroEstado);
      }

      const { data, error } = await query;

      if (error) throw error;

      let resultados = data || [];

      if (busqueda) {
        resultados = resultados.filter(c => 
          c.customer_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.customer_document?.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.vehicles?.placa?.toLowerCase().includes(busqueda.toLowerCase())
        );
      }

      setContratos(resultados);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarContratos();
  }, [filtroTipo, filtroEstado, busqueda]);

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pending: { label: "Pendiente", variant: "secondary" as const },
      pendiente: { label: "Pendiente", variant: "secondary" as const },
      signed: { label: "Firmado", variant: "default" as const },
      firmado: { label: "Firmado", variant: "default" as const },
      entregado: { label: "Entregado", variant: "outline" as const },
      finalizado: { label: "Finalizado", variant: "outline" as const },
    };
    return badges[estado] || badges.pending;
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === "preliminar" 
      ? { label: "Preliminar", variant: "secondary" as const }
      : { label: "Final", variant: "default" as const };
  };

  const handleDescargar = async (contrato: any) => {
    toast.info("Regenerando PDF del contrato...");
    // Aquí iría la lógica para regenerar el PDF desde los datos guardados
    // Por ahora mostramos un mensaje
  };

  const handleCambiarEstado = async (contratoId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ status: nuevoEstado })
        .eq("id", contratoId);

      if (error) throw error;

      toast.success("Estado actualizado");
      cargarContratos();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar estado");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o placa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="preliminar">Preliminar</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="firmado">Firmado</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando contratos...</div>
      ) : contratos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No se encontraron contratos</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Firma/Huella/Foto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.map((contrato) => {
                const estadoBadge = getEstadoBadge(contrato.estado);
                const tipoBadge = getTipoBadge(contrato.tipo);
                
                return (
                  <TableRow key={contrato.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(contrato.created_at).toLocaleDateString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{contrato.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{contrato.customer_document}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contrato.vehicles?.marca} {contrato.vehicles?.modelo}
                      <div className="text-sm text-muted-foreground">{contrato.vehicles?.placa}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tipoBadge.variant}>{tipoBadge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={contrato.status} 
                        onValueChange={(value) => handleCambiarEstado(contrato.id, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue>
                            <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="signed">Firmado</SelectItem>
                          <SelectItem value="entregado">Entregado</SelectItem>
                          <SelectItem value="finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {contrato.tiene_firma && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Firma</span>}
                        {contrato.tiene_huella && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">✓ Huella</span>}
                        {contrato.tiene_foto && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">✓ Foto</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={() => handleDescargar(contrato)} 
                        variant="ghost" 
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-muted-foreground text-center">
        Total: {contratos.length} contrato(s)
      </div>
    </div>
  );
};

export default HistorialContratos;
