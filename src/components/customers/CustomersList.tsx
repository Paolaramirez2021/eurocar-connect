import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UserPlus, Eye, Edit, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Customer {
  id: string;
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  cedula_pasaporte: string;
  email: string | null;
  celular: string;
  estado: string;
  total_reservas: number;
  monto_total: number;
  created_at: string;
  alerta_cliente: string;
}

interface CustomersListProps {
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onNewCustomer: () => void;
}

export const CustomersList = ({ onSelectCustomer, onEditCustomer, onNewCustomer }: CustomersListProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, estadoFilter]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.nombres.toLowerCase().includes(term) ||
          customer.primer_apellido.toLowerCase().includes(term) ||
          customer.cedula_pasaporte.toLowerCase().includes(term) ||
          (customer.email && customer.email.toLowerCase().includes(term))
      );
    }

    // Filter by estado
    if (estadoFilter !== "todos") {
      filtered = filtered.filter((customer) => customer.estado === estadoFilter);
    }

    setFilteredCustomers(filtered);
  };

  const handleAlertaChange = async (customerId: string, newAlerta: string) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update({ alerta_cliente: newAlerta })
        .eq("id", customerId);

      if (error) throw error;

      toast.success(
        newAlerta === "positivo" 
          ? "Cliente marcado como positivo" 
          : newAlerta === "negativo"
          ? "Cliente marcado como negativo - No se le puede alquilar"
          : "Alerta removida del cliente"
      );
      loadCustomers();
    } catch (error) {
      console.error("Error updating customer alert:", error);
      toast.error("Error al actualizar alerta del cliente");
    }
  };

  const getAlertaBadge = (alerta: string) => {
    if (alerta === "positivo") {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Positivo
        </Badge>
      );
    } else if (alerta === "negativo") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Negativo
        </Badge>
      );
    }
    return null;
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      activo: "default",
      pendiente: "secondary",
      bloqueado: "destructive",
    };
    return <Badge variant={variants[estado] || "default"}>{estado}</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Cargando clientes...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cédula o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onNewCustomer}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead className="text-right">Reservas</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.nombres} {customer.primer_apellido} {customer.segundo_apellido}
                      </TableCell>
                      <TableCell>{customer.cedula_pasaporte}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{customer.celular}</div>
                          {customer.email && (
                            <div className="text-muted-foreground">{customer.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getEstadoBadge(customer.estado)}</TableCell>
                      <TableCell>{getAlertaBadge(customer.alerta_cliente)}</TableCell>
                      <TableCell className="text-right">{customer.total_reservas}</TableCell>
                      <TableCell className="text-right">
                        ${customer.monto_total.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectCustomer(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditCustomer(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleAlertaChange(customer.id, "positivo")}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Marcar como Positivo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAlertaChange(customer.id, "negativo")}
                              >
                                <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                Marcar como Negativo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAlertaChange(customer.id, "ninguna")}
                              >
                                Remover Alerta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Stats */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>Total: {filteredCustomers.length} clientes</div>
            <div>
              Activos: {filteredCustomers.filter((c) => c.estado === "activo").length}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};
