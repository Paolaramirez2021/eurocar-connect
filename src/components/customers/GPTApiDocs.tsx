import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code2, Key, Lock, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const GPTApiDocs = () => {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gpt-clientes`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Code2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Documentación API GPT</h2>
          <p className="text-sm text-muted-foreground">
            Integra tus agentes GPT con la base de datos de clientes
          </p>
        </div>
      </div>

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="auth">Autenticación</TabsTrigger>
          <TabsTrigger value="get">GET</TabsTrigger>
          <TabsTrigger value="post">POST</TabsTrigger>
          <TabsTrigger value="patch">PATCH</TabsTrigger>
        </TabsList>

        {/* Authentication */}
        <TabsContent value="auth" className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Lock className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Autenticación por API Key</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Todas las peticiones requieren el header <code className="bg-background px-1 py-0.5 rounded">x-gpt-api-key</code>
              </p>
              <div className="bg-background p-3 rounded border font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span>x-gpt-api-key: TU_GPT_API_KEY</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard("x-gpt-api-key")}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <Key className="h-3 w-3 inline mr-1" />
                La API key debe configurarse en Settings → Secrets como <code>GPT_API_KEY</code>
              </p>
            </div>
          </div>

          <div className="bg-background p-3 rounded border">
            <p className="text-sm font-medium mb-2">URL Base:</p>
            <div className="flex items-center justify-between">
              <code className="text-sm">{apiUrl}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(apiUrl)}
              >
                Copiar
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* GET */}
        <TabsContent value="get" className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">GET</Badge>
              <h3 className="font-semibold">Buscar Cliente</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Busca un cliente por correo electrónico o cédula
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Parámetros Query:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li><code>correo</code> - Email del cliente</li>
                  <li><code>cedula</code> - Cédula/Pasaporte del cliente</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Ejemplo cURL:</p>
                <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{`curl -X GET "${apiUrl}?correo=cliente@ejemplo.com" \\
  -H "x-gpt-api-key: TU_API_KEY"`}</pre>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Respuesta exitosa (200):</p>
                <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "success": true,
  "data": {
    "id": "uuid",
    "nombres": "Juan",
    "primer_apellido": "Pérez",
    "cedula_pasaporte": "1234567890",
    "email": "cliente@ejemplo.com",
    "celular": "+57 300 1234567",
    "estado": "activo",
    "total_reservas": 5,
    "monto_total": 2500000
  },
  "message": "Cliente encontrado"
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* POST */}
        <TabsContent value="post" className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge>POST</Badge>
              <h3 className="font-semibold">Crear Cliente</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Crea un nuevo cliente en la base de datos
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Campos Requeridos:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li><code>nombres</code> <Badge variant="destructive" className="ml-1">*</Badge></li>
                  <li><code>primer_apellido</code> <Badge variant="destructive" className="ml-1">*</Badge></li>
                  <li><code>cedula_pasaporte</code> <Badge variant="destructive" className="ml-1">*</Badge></li>
                  <li><code>celular</code> <Badge variant="destructive" className="ml-1">*</Badge></li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Campos Opcionales:</p>
                <div className="grid grid-cols-2 gap-2 text-sm ml-4">
                  <div>
                    <li><code>segundo_apellido</code></li>
                    <li><code>email</code></li>
                    <li><code>telefono</code></li>
                    <li><code>direccion_residencia</code></li>
                    <li><code>ciudad</code></li>
                    <li><code>pais</code></li>
                  </div>
                  <div>
                    <li><code>fecha_nacimiento</code></li>
                    <li><code>estado_civil</code></li>
                    <li><code>licencia_numero</code></li>
                    <li><code>empresa</code></li>
                    <li><code>ocupacion</code></li>
                    <li><code>fuente_gpt</code> (identificador GPT)</li>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Ejemplo cURL:</p>
                <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{`curl -X POST "${apiUrl}" \\
  -H "x-gpt-api-key: TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nombres": "María",
    "primer_apellido": "González",
    "cedula_pasaporte": "9876543210",
    "celular": "+57 310 9876543",
    "email": "maria@ejemplo.com",
    "ciudad": "Bogotá",
    "fuente_gpt": "GPT-Ventas-V1"
  }'`}</pre>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Respuesta exitosa (201):</p>
                <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "success": true,
  "data": {
    "id": "new-uuid",
    "nombres": "María",
    "primer_apellido": "González",
    ...
  },
  "message": "Cliente creado exitosamente"
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* PATCH */}
        <TabsContent value="patch" className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">PATCH</Badge>
              <h3 className="font-semibold">Actualizar Cliente</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Actualiza campos específicos de un cliente existente
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">URL:</p>
                <code className="text-sm">{apiUrl}/&#123;customer_id&#125;</code>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Ejemplo cURL:</p>
                <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{`curl -X PATCH "${apiUrl}/abc-123-def" \\
  -H "x-gpt-api-key: TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "estado": "bloqueado",
    "observaciones": "Cliente bloqueado por impago",
    "fuente_gpt": "GPT-Cobranza-V1"
  }'`}</pre>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Respuesta exitosa (200):</p>
                <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "success": true,
  "data": {
    "id": "abc-123-def",
    "estado": "bloqueado",
    ...
  },
  "message": "Cliente actualizado exitosamente"
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Responses */}
      <div className="mt-6 p-4 border rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <FileJson className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold">Códigos de Error</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span><Badge variant="destructive">401</Badge> Unauthorized</span>
            <span className="text-muted-foreground">API key inválida o ausente</span>
          </div>
          <div className="flex justify-between">
            <span><Badge variant="destructive">400</Badge> Bad Request</span>
            <span className="text-muted-foreground">Parámetros inválidos o faltantes</span>
          </div>
          <div className="flex justify-between">
            <span><Badge variant="destructive">404</Badge> Not Found</span>
            <span className="text-muted-foreground">Cliente no encontrado</span>
          </div>
          <div className="flex justify-between">
            <span><Badge variant="destructive">409</Badge> Conflict</span>
            <span className="text-muted-foreground">Cliente ya existe (cédula duplicada)</span>
          </div>
          <div className="flex justify-between">
            <span><Badge variant="destructive">500</Badge> Server Error</span>
            <span className="text-muted-foreground">Error interno del servidor</span>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="mt-6 p-4 bg-primary/5 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          Auditoría Automática
        </h3>
        <p className="text-sm text-muted-foreground">
          Todas las operaciones se registran automáticamente en la tabla <code>audit_log</code> con:
        </p>
        <ul className="text-sm mt-2 ml-4 space-y-1">
          <li>• Tipo de acción (GPT_CUSTOMER_QUERY, GPT_CUSTOMER_CREATE, GPT_CUSTOMER_UPDATE)</li>
          <li>• Timestamp de la operación</li>
          <li>• Datos anteriores y nuevos (para updates)</li>
          <li>• Identificador del GPT que realizó la acción (campo <code>fuente_gpt</code>)</li>
          <li>• Request ID único para trazabilidad</li>
        </ul>
      </div>
    </Card>
  );
};
