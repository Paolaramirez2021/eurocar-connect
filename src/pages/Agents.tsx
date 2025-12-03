import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Copy, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_SCOPES = [
  { id: 'read_vehicles', label: 'Ver Vehículos' },
  { id: 'read_calendar', label: 'Ver Calendario' },
  { id: 'create_reservations', label: 'Crear Reservaciones' }
];

export default function Agents() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    scopes: [] as string[]
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createAgent = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Generate a random API key
      const apiKey = 'sk_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase.from('agents').insert({
        name: data.name,
        scopes: data.scopes,
        api_key: apiKey,
        created_by: session?.user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agente creado exitosamente');
      setIsDialogOpen(false);
      setFormData({ name: "", scopes: [] });
    },
    onError: (error) => {
      toast.error('Error al crear agente: ' + error.message);
    }
  });

  const toggleAgent = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('agents')
        .update({ active: !active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Estado del agente actualizado');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('API Key copiada al portapapeles');
  };

  return (
    <DashboardLayout user={session?.user || null}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Agentes API</h1>
            <p className="text-muted-foreground">Gestiona las credenciales de acceso para integraciones externas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Agente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Agente API</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: GPT Assistant"
                  />
                </div>
                <div>
                  <Label>Permisos</Label>
                  <div className="space-y-2 mt-2">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <div key={scope.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={formData.scopes.includes(scope.id)}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              scopes: checked
                                ? [...formData.scopes, scope.id]
                                : formData.scopes.filter(s => s !== scope.id)
                            });
                          }}
                        />
                        <Label className="font-normal">{scope.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={() => createAgent.mutate(formData)} 
                  className="w-full"
                  disabled={!formData.name || formData.scopes.length === 0}
                >
                  Crear Agente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {agents?.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{agent.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={agent.active ? "default" : "secondary"}>
                      {agent.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAgent.mutate({ id: agent.id, active: agent.active })}
                    >
                      {agent.active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">API Key</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                        {agent.api_key}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(agent.api_key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Permisos</Label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {agent.scopes.map((scope) => {
                        const scopeInfo = AVAILABLE_SCOPES.find(s => s.id === scope);
                        return (
                          <Badge key={scope} variant="outline">
                            {scopeInfo?.label || scope}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <code className="block p-3 bg-muted rounded">
                POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/gpt-availability
              </code>
              <p className="text-sm text-muted-foreground mt-2">
                Verifica disponibilidad de vehículos. Requiere permisos: read_vehicles o read_calendar
              </p>
            </div>
            <div>
              <code className="block p-3 bg-muted rounded">
                POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/gpt-reserve
              </code>
              <p className="text-sm text-muted-foreground mt-2">
                Crea una nueva reservación. Requiere permisos: create_reservations
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Incluye el header: <code className="bg-muted px-1">x-api-key: tu_api_key</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
