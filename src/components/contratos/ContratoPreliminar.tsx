import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, Send, Search } from "lucide-react";
import { generarContratoPreliminarPDF } from "@/lib/contratoGenerator";

const ContratoPreliminar = () => {
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_id: "",
    vehiculo_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    hora_inicio: "08:00",
    hora_fin: "18:00",
    valor_dia: "",
    dias: "",
    km_incluidos: "300",
    valor_km_adicional: "2000",
    deposito_tarjeta: "",
    valor_seguro: "",
    observaciones: ""
  });

  useEffect(() => {
    cargarClientes();
    cargarVehiculos();
  }, []);

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("nombre_completo");
    
    if (error) {
      toast.error("Error al cargar clientes");
      return;
    }
    setClientes(data || []);
  };

  const cargarVehiculos = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("estado", "disponible")
      .order("marca");
    
    if (error) {
      toast.error("Error al cargar vehículos");
      return;
    }
    setVehiculos(data || []);
  };

  const calcularDias = () => {
    if (formData.fecha_inicio && formData.fecha_fin) {
      const inicio = new Date(formData.fecha_inicio);
      const fin = new Date(formData.fecha_fin);
      const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
      setFormData(prev => ({ ...prev, dias: dias.toString() }));
    }
  };

  useEffect(() => {
    calcularDias();
  }, [formData.fecha_inicio, formData.fecha_fin]);

  const handleGenerarPDF = async () => {
    if (!formData.cliente_id || !formData.vehiculo_id) {
      toast.error("Selecciona cliente y vehículo");
      return;
    }

    setLoading(true);
    try {
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      const vehiculo = vehiculos.find(v => v.id === formData.vehiculo_id);

      const contratoData = {
        ...formData,
        cliente,
        vehiculo,
        tipo: "preliminar" as const
      };

      const pdfBlob = await generarContratoPreliminarPDF(contratoData);
      
      // Generar número de contrato único
      const numeroContrato = `EC-PREL-${Date.now().toString().slice(-8)}`;
      
      const total = calcularTotal();

      // Guardar en Supabase con el esquema correcto
      const { data: contratoGuardado, error } = await supabase
        .from("contracts")
        .insert({
          contract_number: numeroContrato,
          customer_id: formData.cliente_id,
          vehicle_id: formData.vehiculo_id,
          customer_name: cliente?.nombre_completo || '',
          customer_document: cliente?.cedula_pasaporte || '',
          customer_email: cliente?.email || '',
          customer_phone: cliente?.celular || '',
          start_date: formData.fecha_inicio,
          end_date: formData.fecha_fin,
          total_amount: total,
          terms_text: 'Contrato preliminar - Pendiente de firma',
          terms_accepted: false,
          signature_url: '',
          status: 'pending',
          tipo: "preliminar",
          datos_contrato: contratoData,
          tiene_firma: false,
          tiene_huella: false,
          tiene_foto: false
        })
        .select()
        .single();

      if (error) throw error;

      // Descargar PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_preliminar_${numeroContrato}.pdf`;
      link.click();

      toast.success("Contrato preliminar generado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al generar contrato");
    } finally {
      setLoading(false);
    }
  };

  const calcularTotal = () => {
    const dias = parseInt(formData.dias) || 0;
    const valorDia = parseFloat(formData.valor_dia) || 0;
    const seguro = parseFloat(formData.valor_seguro) || 0;
    return dias * valorDia + seguro;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Select value={formData.cliente_id} onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(cliente => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nombre_completo} - {cliente.cedula_pasaporte}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehiculo">Vehículo</Label>
          <Select value={formData.vehiculo_id} onValueChange={(value) => setFormData(prev => ({ ...prev, vehiculo_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar vehículo" />
            </SelectTrigger>
            <SelectContent>
              {vehiculos.map(vehiculo => (
                <SelectItem key={vehiculo.id} value={vehiculo.id}>
                  {vehiculo.marca} {vehiculo.modelo} - {vehiculo.placa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
          <Input
            type="date"
            value={formData.fecha_inicio}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_fin">Fecha de Fin</Label>
          <Input
            type="date"
            value={formData.fecha_fin}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dias">Días</Label>
          <Input
            type="number"
            value={formData.dias}
            readOnly
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_dia">Valor por Día (COP)</Label>
          <Input
            type="number"
            value={formData.valor_dia}
            onChange={(e) => setFormData(prev => ({ ...prev, valor_dia: e.target.value }))}
            placeholder="150000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="km_incluidos">Kilómetros Incluidos</Label>
          <Input
            type="number"
            value={formData.km_incluidos}
            onChange={(e) => setFormData(prev => ({ ...prev, km_incluidos: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_seguro">Valor Seguro (COP)</Label>
          <Input
            type="number"
            value={formData.valor_seguro}
            onChange={(e) => setFormData(prev => ({ ...prev, valor_seguro: e.target.value }))}
            placeholder="50000"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-lg font-semibold">
          Total: ${calcularTotal().toLocaleString('es-CO')} COP
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerarPDF} disabled={loading}>
            <FileDown className="mr-2 h-4 w-4" />
            Generar PDF
          </Button>
          <Button variant="outline" disabled>
            <Send className="mr-2 h-4 w-4" />
            Enviar WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContratoPreliminar;
