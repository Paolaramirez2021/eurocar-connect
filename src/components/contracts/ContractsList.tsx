import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Mail, Search, Filter, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ConvertToFinalDialog } from "./ConvertToFinalDialog";

interface Contract {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  customer_id: string;
  vehicle_id: string;
  signed_at: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  terms_text: string;
  reservation_id: string | null;
  status: string;
  pdf_url: string;
  was_offline: boolean;
  synced_at: string;
  contract_type?: string;
  preliminary_status?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  annulled_at?: string | null;
  annulled_by?: string | null;
  annulment_reason?: string | null;
  related_final_contract_id?: string | null;
}

interface ContractsListProps {
  highlightedContractId?: string;
}

export const ContractsList = ({ highlightedContractId }: ContractsListProps) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedPreliminary, setSelectedPreliminary] = useState<Contract | null>(null);

  useEffect(() => {
    loadContracts();
    loadVehicles();
  }, []);

  useEffect(() => {
    // Scroll al contrato resaltado cuando se carga
    if (highlightedContractId && contracts.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`contract-${highlightedContractId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightedContractId, contracts]);

  const loadVehicles = async () => {
    const { data } = await supabase.from("vehicles").select("id, placa, marca, modelo");
    if (data) setVehicles(data);
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("signed_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error loading contracts:", error);
      toast.error("Error al cargar contratos");
    } finally {
      setLoading(false);
    }
  };

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle ? `${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}` : "N/A";
  };

  const handleConvertToFinal = (contract: Contract) => {
    setSelectedPreliminary(contract);
    setConvertDialogOpen(true);
  };

  const handleConversionSuccess = () => {
    loadContracts();
    toast.success("Contrato convertido exitosamente");
  };

  const handleResendEmail = async (contract: Contract) => {
    try {
      const vehicle = vehicles.find((v) => v.id === contract.vehicle_id);
      await supabase.functions.invoke("send-contract-email", {
        body: {
          contractId: contract.id,
          customerEmail: contract.customer_email,
          customerName: contract.customer_name,
          vehiclePlate: vehicle?.placa,
          pdfUrl: contract.pdf_url,
        },
      });
      toast.success("Correo reenviado exitosamente");
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error("Error al reenviar correo");
    }
  };

  const handleDownload = (pdfUrl: string) => {
    window.open(pdfUrl, "_blank");
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "preliminary") {
      matchesStatus = contract.contract_type === "preliminary";
    } else {
      matchesStatus = contract.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (contract: Contract) => {
    // Preliminary contracts
    if (contract.contract_type === 'preliminary') {
      if (contract.annulled_at) {
        return <Badge variant="destructive">Anulado</Badge>;
      }
      switch (contract.preliminary_status) {
        case 'sent':
          return <Badge variant="outline">Enviado</Badge>;
        case 'viewed':
          return <Badge variant="secondary">Visto</Badge>;
        case 'accepted':
          return <Badge className="bg-green-600">Aceptado</Badge>;
        case 'converted':
          return <Badge className="bg-blue-600">Convertido</Badge>;
        default:
          return <Badge variant="outline">Preliminar</Badge>;
      }
    }
    
    // Final contracts
    if (contract.was_offline && !contract.synced_at) {
      return <Badge variant="outline">Pendiente Sync</Badge>;
    }
    if (contract.status === "signed") {
      return <Badge variant="default">Firmado</Badge>;
    }
    return <Badge variant="secondary">{contract.status}</Badge>;
  };

  return (
    <>
      <ConvertToFinalDialog
        preliminaryContract={selectedPreliminary}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        onSuccess={handleConversionSuccess}
        vehicleInfo={selectedPreliminary ? getVehicleInfo(selectedPreliminary.vehicle_id) : ""}
      />
      
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o número de contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="preliminary">Preliminares</SelectItem>
            <SelectItem value="signed">Firmados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Fecha Firma</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando contratos...
                </TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron contratos
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract) => (
                <TableRow 
                  key={contract.id}
                  id={`contract-${contract.id}`}
                  className={highlightedContractId === contract.id ? "bg-primary/10 border-l-4 border-l-primary" : ""}
                >
                  <TableCell className="font-medium">{contract.contract_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{contract.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{contract.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getVehicleInfo(contract.vehicle_id)}</TableCell>
                  <TableCell>
                    {format(new Date(contract.signed_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>{getStatusBadge(contract)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {contract.contract_type === 'preliminary' && 
                       contract.preliminary_status === 'accepted' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleConvertToFinal(contract)}
                          title="Convertir a contrato final"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Convertir
                        </Button>
                      )}
                      {contract.pdf_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(contract.pdf_url)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {contract.customer_email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendEmail(contract)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
};
