import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { isWithinGeofence } from "@/lib/geofence";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimeClockCardProps {
  userId: string;
}

type TimeEntryType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

export const TimeClockCard = ({ userId }: TimeClockCardProps) => {
  const [loading, setLoading] = useState(false);
  const [lastEntry, setLastEntry] = useState<{ type: TimeEntryType; timestamp: string } | null>(null);
  const { getCurrentPosition, error: geoError } = useGeolocation();

  const handleTimeEntry = async (type: TimeEntryType) => {
    setLoading(true);
    try {
      // Get current position
      const position = await getCurrentPosition();
      
      // Validate geofence
      const geofenceResult = await isWithinGeofence(
        position.latitude,
        position.longitude
      );

      if (!geofenceResult.isValid) {
        toast.error("Ubicación no válida", {
          description: "Debes estar dentro de una zona autorizada para marcar entrada/salida",
        });
        setLoading(false);
        return;
      }

      // Create time entry
      const { error: insertError } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          type,
          latitude: Number(position.latitude),
          longitude: Number(position.longitude),
          method: "MANUAL",
        });

      if (insertError) throw insertError;

      // Log audit
      await logAudit({
        actionType: type,
        tableName: "time_entries",
        description: `Usuario marcó ${getTypeLabel(type)}${geofenceResult.zone ? ` en ${geofenceResult.zone.name}` : ""}`,
      });

      setLastEntry({ type, timestamp: new Date().toISOString() });

      toast.success("Registro exitoso", {
        description: `${getTypeLabel(type)} registrado correctamente${geofenceResult.zone ? ` en ${geofenceResult.zone.name}` : ""}`,
      });
    } catch (error) {
      console.error("Error creating time entry:", error);
      toast.error("Error al registrar", {
        description: "No se pudo registrar la entrada/salida",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: TimeEntryType): string => {
    const labels = {
      CLOCK_IN: "Entrada",
      CLOCK_OUT: "Salida",
      BREAK_START: "Inicio de descanso",
      BREAK_END: "Fin de descanso",
    };
    return labels[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Control de Asistencia
        </CardTitle>
        <CardDescription>
          Marca tu entrada, salida o descansos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {geoError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{geoError}</AlertDescription>
          </Alert>
        )}

        {lastEntry && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Último registro: {getTypeLabel(lastEntry.type)} -{" "}
              {new Date(lastEntry.timestamp).toLocaleTimeString("es-ES")}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleTimeEntry("CLOCK_IN")}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            Marcar Entrada
          </Button>
          <Button
            onClick={() => handleTimeEntry("CLOCK_OUT")}
            disabled={loading}
            className="w-full"
            variant="secondary"
          >
            Marcar Salida
          </Button>
          <Button
            onClick={() => handleTimeEntry("BREAK_START")}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            Inicio Descanso
          </Button>
          <Button
            onClick={() => handleTimeEntry("BREAK_END")}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            Fin Descanso
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Se validará tu ubicación automáticamente</span>
        </div>
      </CardContent>
    </Card>
  );
};
