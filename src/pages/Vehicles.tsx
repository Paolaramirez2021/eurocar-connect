import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  tipo_caja: string;
  combustible: string;
  capacidad_pasajeros: number;
  cilindraje: number;
  equipamiento: string;
  tarifa_dia_iva: number;
  kilometraje_dia: number;
  kilometraje_actual: number;
  kilometraje_proximo_mantenimiento: number | null;
  estado: string;
  observaciones: string | null;
  fecha_soat: string | null;
  fecha_tecnomecanica: string | null;
  fecha_impuestos: string | null;
}

export default function Vehicles() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModelo, setFilterModelo] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterCombustible, setFilterCombustible] = useState("all");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vehicles, filterModelo, filterEstado, filterCombustible]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("marca", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...vehicles];
    if (filterModelo) {
      filtered = filtered.filter((v) =>
        v.modelo.toLowerCase().includes(filterModelo.toLowerCase())
      );
    }
    if (filterEstado && filterEstado !== "all") {
      filtered = filtered.filter((v) => v.estado === filterEstado);
    }
    if (filterCombustible && filterCombustible !== "all") {
      filtered = filtered.filter((v) => v.combustible === filterCombustible);
    }
    setFilteredVehicles(filtered);
  };

  const handleSave = async (vehicle: Partial<Vehicle>) => {
    if (editingVehicle?.id) {
      // Remove id from the update object
      const { id, created_at, updated_at, ...updateData } = vehicle as any;
      const { error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", editingVehicle.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Éxito", description: "Vehículo actualizado correctamente" });
        fetchVehicles();
        setIsDialogOpen(false);
      }
    } else {
      // For insert, ensure all required fields are present
      const { error } = await supabase.from("vehicles").insert([vehicle as any]);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Éxito", description: "Vehículo creado correctamente" });
        fetchVehicles();
        setIsDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este vehículo?")) return;

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Vehículo eliminado correctamente" });
      fetchVehicles();
    }
  };

  const handleResetMaintenance = async (vehicle: Vehicle) => {
    const { error } = await supabase
      .from("vehicles")
      .update({
        kilometraje_proximo_mantenimiento: vehicle.kilometraje_actual + 10000,
      })
      .eq("id", vehicle.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Mantenimiento actualizado" });
      fetchVehicles();
    }
  };

  const needsMaintenance = (vehicle: Vehicle) => {
    if (!vehicle.kilometraje_proximo_mantenimiento) return false;
    return vehicle.kilometraje_actual >= vehicle.kilometraje_proximo_mantenimiento - 1000;
  };

  const soatExpiring = (vehicle: Vehicle) => {
    if (!vehicle.fecha_soat) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(vehicle.fecha_soat).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const uniqueModelos = Array.from(new Set(vehicles.map((v) => v.modelo)));
  const uniqueEstados = Array.from(new Set(vehicles.map((v) => v.estado)));
  const uniqueCombustibles = Array.from(new Set(vehicles.map((v) => v.combustible)));

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Vehículos</h1>
            <p className="text-muted-foreground mt-2">
              Administra la flota de vehículos disponibles
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingVehicle(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Vehículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? "Editar Vehículo" : "Nuevo Vehículo"}
                </DialogTitle>
              </DialogHeader>
              <VehicleForm
                vehicle={editingVehicle}
                onSave={handleSave}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                placeholder="Buscar por modelo..."
                value={filterModelo}
                onChange={(e) => setFilterModelo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueEstados.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Combustible</Label>
              <Select value={filterCombustible} onValueChange={setFilterCombustible}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueCombustibles.map((combustible) => (
                    <SelectItem key={combustible} value={combustible}>
                      {combustible}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Tipo Caja</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tarifa/Día</TableHead>
                  <TableHead>Kilometraje</TableHead>
                  <TableHead>Alertas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron vehículos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.placa}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{vehicle.marca}</div>
                          <div className="text-sm text-muted-foreground">{vehicle.modelo}</div>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.año}</TableCell>
                      <TableCell>{vehicle.tipo_caja}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vehicle.estado === "disponible"
                              ? "default"
                              : vehicle.estado === "rentado"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {vehicle.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${vehicle.tarifa_dia_iva?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {vehicle.kilometraje_actual?.toLocaleString()} km
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {needsMaintenance(vehicle) && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Mantenimiento
                            </Badge>
                          )}
                          {soatExpiring(vehicle) && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              SOAT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetMaintenance(vehicle)}
                            title="Actualizar mantenimiento"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingVehicle(vehicle);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(vehicle.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function VehicleForm({
  vehicle,
  onSave,
  onCancel,
}: {
  vehicle: Vehicle | null;
  onSave: (vehicle: Partial<Vehicle>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Vehicle>>(
    vehicle || {
      placa: "",
      marca: "",
      modelo: "",
      año: new Date().getFullYear(),
      tipo_caja: "Automatico",
      combustible: "Gasolina",
      capacidad_pasajeros: 5,
      cilindraje: 1600,
      equipamiento: "Full Equipo",
      tarifa_dia_iva: 0,
      kilometraje_dia: 200,
      kilometraje_actual: 0,
      estado: "disponible",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="placa">Placa *</Label>
          <Input
            id="placa"
            value={formData.placa}
            onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
            required
            disabled={!!vehicle}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marca">Marca *</Label>
          <Input
            id="marca"
            value={formData.marca}
            onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo *</Label>
          <Input
            id="modelo"
            value={formData.modelo}
            onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="año">Año *</Label>
          <Input
            id="año"
            type="number"
            value={formData.año}
            onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo_caja">Tipo de Caja *</Label>
          <Select
            value={formData.tipo_caja}
            onValueChange={(value) => setFormData({ ...formData, tipo_caja: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Automatico">Automático</SelectItem>
              <SelectItem value="Mecanica">Mecánica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="combustible">Combustible *</Label>
          <Select
            value={formData.combustible}
            onValueChange={(value) => setFormData({ ...formData, combustible: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Gasolina">Gasolina</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Electrico">Eléctrico</SelectItem>
              <SelectItem value="Hibrido">Híbrido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacidad_pasajeros">Pasajeros *</Label>
          <Input
            id="capacidad_pasajeros"
            type="number"
            value={formData.capacidad_pasajeros}
            onChange={(e) =>
              setFormData({ ...formData, capacidad_pasajeros: parseInt(e.target.value) })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cilindraje">Cilindraje</Label>
          <Input
            id="cilindraje"
            type="number"
            value={formData.cilindraje}
            onChange={(e) => setFormData({ ...formData, cilindraje: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tarifa_dia_iva">Tarifa por Día *</Label>
          <Input
            id="tarifa_dia_iva"
            type="number"
            value={formData.tarifa_dia_iva}
            onChange={(e) =>
              setFormData({ ...formData, tarifa_dia_iva: parseFloat(e.target.value) })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kilometraje_dia">Kilometraje por Día</Label>
          <Input
            id="kilometraje_dia"
            type="number"
            value={formData.kilometraje_dia}
            onChange={(e) =>
              setFormData({ ...formData, kilometraje_dia: parseInt(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kilometraje_actual">Kilometraje Actual *</Label>
          <Input
            id="kilometraje_actual"
            type="number"
            value={formData.kilometraje_actual}
            onChange={(e) =>
              setFormData({ ...formData, kilometraje_actual: parseInt(e.target.value) })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kilometraje_proximo_mantenimiento">Próximo Mantenimiento</Label>
          <Input
            id="kilometraje_proximo_mantenimiento"
            type="number"
            value={formData.kilometraje_proximo_mantenimiento || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                kilometraje_proximo_mantenimiento: parseInt(e.target.value) || null,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado *</Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="rentado">Rentado</SelectItem>
              <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_soat">Fecha SOAT</Label>
          <Input
            id="fecha_soat"
            type="date"
            value={formData.fecha_soat || ""}
            onChange={(e) => setFormData({ ...formData, fecha_soat: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_tecnomecanica">Fecha Tecnomecánica</Label>
          <Input
            id="fecha_tecnomecanica"
            type="date"
            value={formData.fecha_tecnomecanica || ""}
            onChange={(e) => setFormData({ ...formData, fecha_tecnomecanica: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_impuestos">Fecha Impuestos</Label>
          <Input
            id="fecha_impuestos"
            type="date"
            value={formData.fecha_impuestos || ""}
            onChange={(e) => setFormData({ ...formData, fecha_impuestos: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="equipamiento">Equipamiento</Label>
        <Input
          id="equipamiento"
          value={formData.equipamiento}
          onChange={(e) => setFormData({ ...formData, equipamiento: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Input
          id="observaciones"
          value={formData.observaciones || ""}
          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}
