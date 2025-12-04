import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface PicoPlacaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  placa: string;
  fecha: Date;
  onSuccess?: () => void;
}

export const PicoPlacaModal = ({
  open,
  onOpenChange,
  vehicleId,
  placa,
  fecha,
  onSuccess
}: PicoPlacaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase.from("pico_placa_payments").insert({
        vehicle_id: vehicleId,
        fecha: fecha.toISOString().split('T')[0],
        pagado,
        monto: pagado && monto ? parseFloat(monto) : null,
        notas: notas || null,
        created_by: user.id
      });

      if (error) throw error;

      toast.success(pagado ? "Pago registrado exitosamente" : "Restricción registrada");
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setPagado(false);
      setMonto("");
      setNotas("");
    } catch (error) {
      console.error("Error registrando pico y placa:", error);
      toast.error("Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Restricción Pico y Placa
          </DialogTitle>
          <DialogDescription>
            {placa} - {fecha.toLocaleDateString('es-CO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!pagado ? "default" : "outline"}
              className="flex-1"
              onClick={() => setPagado(false)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              No Pagado
            </Button>
            <Button
              type="button"
              variant={pagado ? "default" : "outline"}
              className="flex-1"
              onClick={() => setPagado(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Pagado
            </Button>
          </div>

          {pagado && (
            <div className="space-y-2">
              <Label htmlFor="monto">Monto Pagado</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                placeholder="Ej: 50000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required={pagado}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Información adicional..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
